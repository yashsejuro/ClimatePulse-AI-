import assert from 'node:assert';
import {
  calculateDualRoutes,
  detectHazardIntersections,
  calculateDistanceMeters,
  isBlockingHazard
} from './routingService';
import { HazardZone, VehicleProfile } from '../types';

const testVehicle: VehicleProfile = {
  id: 'sedan',
  name: 'Standard Sedan',
  clearanceCm: 16,
  description: 'Standard passenger sedan'
};

/**
 * Calculates Euclidean/Haversine minimum distance in meters between a point and a line segment
 */
function pointToSegmentDistanceMeters(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return calculateDistanceMeters(px, py, ax, ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return calculateDistanceMeters(px, py, projX, projY);
}

async function runRouteServiceTests() {
  console.log('--- Running Route Service Safety Invariant Tests ---');

  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: safeRoute.geometry MUST NOT intersect any CRITICAL or HIGH severity hazards
    // -------------------------------------------------------------------------
    console.log(
      'Test 1: Asserting safeRoute.geometry does not intersect CRITICAL or HIGH severity hazards...'
    );

    const origin: [number, number] = [12.9100, 77.6100];
    const destination: [number, number] = [12.9350, 77.6400];

    // Critical and High flood hazards located along the primary corridor
    const criticalHazard: HazardZone = {
      id: 'hazard-critical-silk-board',
      city: 'bengaluru',
      name: 'Silk Board Underpass Inundation',
      roadName: 'Hosur Road Underpass',
      center: [12.9177, 77.6238],
      radiusMeters: 450,
      severity: 'CRITICAL',
      waterDepthCm: 50,
      rainfallIntensityMmPerHour: 45,
      riskWeight: 0.95,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '10 mins ago',
      notes: 'Submerged underpass with 50 cm standing water'
    };

    const highHazard: HazardZone = {
      id: 'hazard-high-bellandur',
      city: 'bengaluru',
      name: 'Bellandur Lake Spillway Overflow',
      roadName: 'Outer Ring Road Link',
      center: [12.9250, 77.6320],
      radiusMeters: 400,
      severity: 'HIGH',
      waterDepthCm: 35,
      rainfallIntensityMmPerHour: 35,
      riskWeight: 0.85,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '15 mins ago',
      notes: 'Roadway waterlogged at 35 cm'
    };

    const hazards: HazardZone[] = [criticalHazard, highHazard];

    // Direct route that pierces straight through both CRITICAL and HIGH hazards
    const fastestPolyline: [number, number][] = [
      [12.9100, 77.6100],
      [12.9177, 77.6238], // intersects criticalHazard directly at center
      [12.9250, 77.6320], // intersects highHazard directly at center
      [12.9350, 77.6400]
    ];

    // Detour route that safely skirts 1.8km east, completely outside all hazard radii
    const safeBypassPolyline: [number, number][] = [
      [12.9100, 77.6100],
      [12.9120, 77.6350],
      [12.9220, 77.6450],
      [12.9350, 77.6400]
    ];

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();

      // Return fastest polyline for initial origin -> destination query
      if (!urlStr.includes(';') || (urlStr.match(/;/g) || []).length === 1) {
        return new Response(
          JSON.stringify({
            routes: [
              {
                distance: 4200,
                duration: 540,
                geometry: {
                  coordinates: fastestPolyline.map(([lat, lon]) => [lon, lat])
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Bypass waypoint queries (3 waypoints): return safe detour
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 5800,
              duration: 720,
              geometry: {
                coordinates: safeBypassPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const routeResult = await calculateDualRoutes(
      origin,
      destination,
      hazards,
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    // 1. Assert safe route was discovered
    assert.strictEqual(
      routeResult.safeRouteFound,
      true,
      'Expected a verified safe route to be found when bypass corridor is available'
    );
    assert.notStrictEqual(
      routeResult.safe,
      null,
      'Expected safeRoute object to not be null'
    );

    const safeRoute = routeResult.safe!;

    // 2. Validate that safeRoute.geometry exists and matches polyline
    const safeGeometry = safeRoute.geometry || safeRoute.coordinates;
    assert.ok(
      Array.isArray(safeGeometry) && safeGeometry.length >= 2,
      'safeRoute.geometry must be an array of coordinates with at least 2 points'
    );

    // 3. Primary assertion: verify safeRoute.geometry intersects NO CRITICAL or HIGH hazards
    const intersectionsOnGeometry = detectHazardIntersections(safeGeometry, hazards);
    const criticalOrHighIntersected = intersectionsOnGeometry.filter(
      (h) => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );

    assert.strictEqual(
      criticalOrHighIntersected.length,
      0,
      `safeRoute.geometry MUST NOT intersect any hazards flagged with CRITICAL or HIGH severity. ` +
        `Found: ${criticalOrHighIntersected.map((h) => `${h.name} (${h.severity})`).join(', ')}`
    );

    // 4. Invariant assertion on the returned safeRoute.hazardsIntersected property
    const reportedBlockingHazards = safeRoute.hazardsIntersected.filter(
      (h) => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );
    assert.strictEqual(
      reportedBlockingHazards.length,
      0,
      'safeRoute.hazardsIntersected must not report any CRITICAL or HIGH hazards'
    );

    // 5. Explicit physical distance assertion: every segment of safeRoute.geometry must remain outside hazard radius
    for (const hazard of hazards.filter((h) => h.severity === 'CRITICAL' || h.severity === 'HIGH')) {
      for (let i = 0; i < safeGeometry.length - 1; i++) {
        const segDist = pointToSegmentDistanceMeters(
          hazard.center[0],
          hazard.center[1],
          safeGeometry[i][0],
          safeGeometry[i][1],
          safeGeometry[i + 1][0],
          safeGeometry[i + 1][1]
        );

        assert.ok(
          segDist > hazard.radiusMeters * 1.05,
          `Segment ${i} of safeRoute.geometry passed within ${segDist.toFixed(1)}m of ${hazard.severity} hazard "${hazard.name}" (buffer threshold: ${(hazard.radiusMeters * 1.05).toFixed(1)}m)`
        );
      }
    }

    console.log('✓ Test 1 passed: safeRoute.geometry physically clears all CRITICAL and HIGH severity hazards.');

    // -------------------------------------------------------------------------
    // TEST 2: Minor LOW hazards may remain, but CRITICAL & HIGH are strictly avoided
    // -------------------------------------------------------------------------
    console.log(
      'Test 2: Verifying safeRoute.geometry avoids CRITICAL & HIGH hazards even when minor LOW hazard remains...'
    );

    const lowHazard: HazardZone = {
      id: 'hazard-low-puddle',
      city: 'bengaluru',
      name: 'Minor Curbside Puddle',
      roadName: 'Detour Secondary Lane',
      center: [12.9220, 77.6450], // on the detour path
      radiusMeters: 100,
      severity: 'LOW',
      waterDepthCm: 10,
      rainfallIntensityMmPerHour: 10,
      riskWeight: 0.1,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '5 mins ago',
      notes: 'Shallow puddle 10 cm'
    };

    const mixedHazards = [criticalHazard, highHazard, lowHazard];

    const mixedResult = await calculateDualRoutes(
      origin,
      destination,
      mixedHazards,
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(mixedResult.safeRouteFound, true);
    assert.notStrictEqual(mixedResult.safe, null);

    const mixedSafeRoute = mixedResult.safe!;
    const mixedGeometry = mixedSafeRoute.geometry || mixedSafeRoute.coordinates;

    const mixedIntersections = detectHazardIntersections(mixedGeometry, mixedHazards);
    const mixedSevereHazards = mixedIntersections.filter(
      (h) => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );

    assert.strictEqual(
      mixedSevereHazards.length,
      0,
      'safeRoute.geometry MUST NOT intersect CRITICAL or HIGH severity hazards even in mixed hazard environments'
    );

    console.log('✓ Test 2 passed: safeRoute.geometry filtered all CRITICAL and HIGH hazards cleanly.');

    // -------------------------------------------------------------------------
    // TEST 3: Candidate route intersecting a HIGH hazard is rejected (safeRoute = null)
    // -------------------------------------------------------------------------
    console.log(
      'Test 3: Confirming that any alternate route intersecting a HIGH hazard is REJECTED (safeRoute=null)...'
    );

    // Bypass route also clips the HIGH hazard
    const blockedBypassPolyline: [number, number][] = [
      [12.9100, 77.6100],
      [12.9250, 77.6320], // clips high hazard
      [12.9350, 77.6400]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 5000,
              duration: 600,
              geometry: {
                coordinates: blockedBypassPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const blockedResult = await calculateDualRoutes(
      origin,
      destination,
      [criticalHazard, highHazard],
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(
      blockedResult.safeRouteFound,
      false,
      'safeRouteFound MUST be false when every alternate intersects a HIGH hazard'
    );
    assert.strictEqual(
      blockedResult.safe,
      null,
      'safeRoute MUST be null when no route avoids CRITICAL and HIGH hazards'
    );

    console.log('✓ Test 3 passed: alternate route intersecting HIGH hazard is strictly rejected.');

    // -------------------------------------------------------------------------
    // TEST 4: Destination inside a hazard zone MUST return safeRouteFound = false
    // -------------------------------------------------------------------------
    console.log(
      'Test 4: Asserting that when destination is inside a hazard zone, safeRouteFound MUST return false...'
    );

    const testOrigin: [number, number] = [12.9000, 77.6000];
    const destinationInsideHazard: [number, number] = [12.9300, 77.6300];

    const hazardAtDestination: HazardZone = {
      id: 'hazard-submerged-destination',
      city: 'bengaluru',
      name: 'Submerged Terminal & Parking Complex',
      roadName: 'Terminal Access Ring',
      center: [12.9300, 77.6300], // Destination is at the center of the hazard
      radiusMeters: 600,
      severity: 'CRITICAL',
      waterDepthCm: 55,
      rainfallIntensityMmPerHour: 50,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '2 mins ago',
      notes: 'Destination zone completely submerged under 55 cm water'
    };

    // Any route to destination will end inside the hazard zone
    const routeToSubmergedDest: [number, number][] = [
      [12.9000, 77.6000],
      [12.9150, 77.6150],
      [12.9300, 77.6300]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 5500,
              duration: 700,
              geometry: {
                coordinates: routeToSubmergedDest.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const destInsideResult = await calculateDualRoutes(
      testOrigin,
      destinationInsideHazard,
      [hazardAtDestination],
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    // Primary assertion required by user request:
    assert.strictEqual(
      destInsideResult.safeRouteFound,
      false,
      'safeRouteFound MUST return false when destination is inside a hazard zone'
    );

    // Secondary assertion: safe route must be null
    assert.strictEqual(
      destInsideResult.safe,
      null,
      'safeRoute MUST be null when destination is inside a hazard zone'
    );

    // Also assert reason communicates that no safe route is possible
    assert.ok(
      destInsideResult.noSafeRouteReason && destInsideResult.noSafeRouteReason.length > 0,
      'Expected an informative noSafeRouteReason when destination is inside a hazard zone'
    );

    console.log('✓ Test 4 passed: safeRouteFound strictly returned false when destination is inside a hazard zone.');

    // -------------------------------------------------------------------------
    // TEST 5: Explicitly assert safeRoute.geometry does not intersect any
    // hazard defined as CRITICAL or HIGH severity in the mock hazard data
    // -------------------------------------------------------------------------
    console.log(
      'Test 5: Explicitly asserting safeRoute.geometry does not intersect any hazard defined as CRITICAL or HIGH severity in mock hazard data...'
    );
    {
      const mockHazardData: HazardZone[] = [
      {
        id: 'mock-critical-1',
        city: 'bengaluru',
        name: 'Mock Critical Underpass Flood',
        roadName: 'Central Expressway',
        center: [12.9200, 77.6200],
        radiusMeters: 500,
        severity: 'CRITICAL',
        waterDepthCm: 55,
        rainfallIntensityMmPerHour: 50,
        riskWeight: 0.95,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '5 mins ago',
        notes: 'Critical flooding on central expressway'
      },
      {
        id: 'mock-high-1',
        city: 'bengaluru',
        name: 'Mock High Lowland Waterlogging',
        roadName: 'Lake Ring Road',
        center: [12.9280, 77.6280],
        radiusMeters: 450,
        severity: 'HIGH',
        waterDepthCm: 35,
        rainfallIntensityMmPerHour: 40,
        riskWeight: 0.85,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '12 mins ago',
        notes: 'High water depth across multiple lanes'
      },
      {
        id: 'mock-critical-2',
        city: 'bengaluru',
        name: 'Mock Critical Storm Drain Overflow',
        roadName: 'Metro Pillar Corridor',
        center: [12.9240, 77.6240],
        radiusMeters: 400,
        severity: 'CRITICAL',
        waterDepthCm: 48,
        rainfallIntensityMmPerHour: 45,
        riskWeight: 0.95,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '8 mins ago',
        notes: 'Overflown drainage with 48 cm water'
      },
      {
        id: 'mock-high-2',
        city: 'bengaluru',
        name: 'Mock High Flyover Dip Submersion',
        roadName: 'Flyover Service Ramp',
        center: [12.9160, 77.6160],
        radiusMeters: 350,
        severity: 'HIGH',
        waterDepthCm: 32,
        rainfallIntensityMmPerHour: 30,
        riskWeight: 0.80,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '15 mins ago',
        notes: 'High water depth on access ramp'
      },
      {
        id: 'mock-low-1',
        city: 'bengaluru',
        name: 'Mock Low Puddle',
        roadName: 'Bypass Residential Alley',
        center: [12.9120, 77.6400],
        radiusMeters: 100,
        severity: 'LOW',
        waterDepthCm: 10,
        rainfallIntensityMmPerHour: 10,
        riskWeight: 0.10,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '20 mins ago',
        notes: 'Minor surface puddle'
      }
    ];

    const test5Origin: [number, number] = [12.9100, 77.6100];
    const test5Dest: [number, number] = [12.9350, 77.6400];

    // Direct path traversing through the mock CRITICAL & HIGH hazard cluster
    const directClusterPolyline: [number, number][] = [
      [12.9100, 77.6100],
      [12.9160, 77.6160], // intersects mock-high-2
      [12.9200, 77.6200], // intersects mock-critical-1
      [12.9240, 77.6240], // intersects mock-critical-2
      [12.9280, 77.6280], // intersects mock-high-1
      [12.9350, 77.6400]
    ];

    // Detour path routing completely clear of all CRITICAL and HIGH hazards
    const safeDetourPolyline: [number, number][] = [
      [12.9100, 77.6100],
      [12.9110, 77.6380],
      [12.9120, 77.6400], // touches mock-low-1 (LOW severity) but avoids all CRITICAL/HIGH
      [12.9250, 77.6500],
      [12.9350, 77.6400]
    ];

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (!urlStr.includes(';') || (urlStr.match(/;/g) || []).length === 1) {
        return new Response(
          JSON.stringify({
            routes: [
              {
                distance: 4000,
                duration: 500,
                geometry: {
                  coordinates: directClusterPolyline.map(([lat, lon]) => [lon, lat])
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 6200,
              duration: 750,
              geometry: {
                coordinates: safeDetourPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const clusterResult = await calculateDualRoutes(
      test5Origin,
      test5Dest,
      mockHazardData,
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(
      clusterResult.safeRouteFound,
      true,
      'Expected safeRouteFound=true when a safe bypass corridor exists'
    );
    assert.notStrictEqual(
      clusterResult.safe,
      null,
      'Expected safeRoute to not be null'
    );

    const safeRoute = clusterResult.safe!;

    // Explicitly assert that safeRoute.geometry is defined and populated
    assert.ok(
      safeRoute.geometry && safeRoute.geometry.length > 0,
      'safeRoute.geometry must be defined and non-empty'
    );

    // Filter mock hazard data for hazards flagged as CRITICAL or HIGH severity
    const criticalOrHighHazards = mockHazardData.filter(
      (h) => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );
    assert.strictEqual(
      criticalOrHighHazards.length,
      4,
      'mock hazard data must contain exactly 4 CRITICAL or HIGH hazards'
    );

    // Explicitly assert that safeRoute.geometry does not intersect any hazard defined as CRITICAL or HIGH severity
    const detectedIntersectionsOnSafeGeometry = detectHazardIntersections(
      safeRoute.geometry,
      criticalOrHighHazards
    );

    assert.strictEqual(
      detectedIntersectionsOnSafeGeometry.length,
      0,
      `safeRoute.geometry must not intersect any hazard defined as CRITICAL or HIGH severity in the mock hazard data. Intersected: ${detectedIntersectionsOnSafeGeometry
        .map((h) => `${h.name} (${h.severity})`)
        .join(', ')}`
    );

    // Verify individually for each CRITICAL or HIGH hazard in mock hazard data
    for (const hazard of criticalOrHighHazards) {
      const hazardIntersections = detectHazardIntersections(safeRoute.geometry, [hazard]);
      assert.strictEqual(
        hazardIntersections.length,
        0,
        `safeRoute.geometry intersects hazard "${hazard.name}" defined as ${hazard.severity} severity in mock hazard data`
      );
    }

    // Explicitly verify safeRoute.hazardsIntersected contains no CRITICAL or HIGH hazards
    const blockingInSafeRouteReport = safeRoute.hazardsIntersected.filter(
      (h) => h.severity === 'CRITICAL' || h.severity === 'HIGH'
    );
    assert.strictEqual(
      blockingInSafeRouteReport.length,
      0,
      'safeRoute.hazardsIntersected must not contain any CRITICAL or HIGH hazards'
    );

      console.log(
        '✓ Test 5 passed: explicitly asserted that safeRoute.geometry does not intersect any hazard defined as CRITICAL or HIGH severity in the mock hazard data.'
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Safe route strictly uses real OSRM road geometry & verifies bypass waypoints
    // -------------------------------------------------------------------------
    console.log(
      'Test 6: Verifying safe route strictly uses real OSRM road geometry and road-network verified bypass waypoints...'
    );
    {
      const origin: [number, number] = [12.9100, 77.6100];
      const destination: [number, number] = [12.9350, 77.6400];

      const singleCriticalHazard: HazardZone = {
        id: 'hazard-road-net-test',
        city: 'bengaluru',
        name: 'Critical Underpass Waterlog',
        roadName: 'Main Ring Road',
        center: [12.9200, 77.6200],
        radiusMeters: 400,
        severity: 'CRITICAL',
        waterDepthCm: 50,
        rainfallIntensityMmPerHour: 45,
        riskWeight: 0.95,
        source: 'OFFICIAL_SENSOR',
        status: 'active',
        verified: true,
        reportedAt: '10 mins ago',
        notes: 'Underpass flooded'
      };

      const realOsrmRoadPolyline: [number, number][] = [
        [12.9100, 77.6100],
        [12.9115, 77.6350],
        [12.9240, 77.6480],
        [12.9350, 77.6400]
      ];

      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        // Primary route: direct through hazard
        if (!urlStr.includes(';') || (urlStr.match(/;/g) || []).length === 1) {
          return new Response(
            JSON.stringify({
              routes: [
                {
                  distance: 3800,
                  duration: 480,
                  geometry: {
                    coordinates: [
                      [77.6100, 12.9100],
                      [77.6200, 12.9200], // through hazard
                      [77.6400, 12.9350]
                    ]
                  }
                }
              ],
              waypoints: [
                { location: [77.6100, 12.9100], name: 'Start St' },
                { location: [77.6400, 12.9350], name: 'Dest St' }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Bypass route via road network
        return new Response(
          JSON.stringify({
            routes: [
              {
                distance: 5900,
                duration: 720,
                geometry: {
                  coordinates: realOsrmRoadPolyline.map(([lat, lon]) => [lon, lat])
                }
              }
            ],
            waypoints: [
              { location: [77.6100, 12.9100], name: 'Origin Road' },
              { location: [77.6350, 12.9115], name: 'Bypass Road 27th Main' }, // Snapped on road network outside hazard
              { location: [77.6400, 12.9350], name: 'Dest Avenue' }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      const res = await calculateDualRoutes(
        origin,
        destination,
        [singleCriticalHazard],
        testVehicle,
        32,
        undefined,
        'bengaluru'
      );

      assert.strictEqual(res.safeRouteFound, true, 'Safe route must be found');
      assert.notStrictEqual(res.safe, null, 'Safe route must not be null');

      // Assert safe route source is strictly real OSRM road geometry
      assert.strictEqual(
        res.safe!.source,
        'OSRM',
        'safeRoute.source must strictly be "OSRM" (real road network)'
      );
      assert.strictEqual(
        res.fastest.source,
        'OSRM',
        'fastest.source must strictly be "OSRM"'
      );

      // Assert that safeRoute geometry exactly matches the real OSRM road coordinates
      assert.deepStrictEqual(
        res.safe!.coordinates,
        realOsrmRoadPolyline,
        'safeRoute.coordinates must strictly be the real OSRM road geometry'
      );
      assert.deepStrictEqual(
        res.safe!.geometry,
        realOsrmRoadPolyline,
        'safeRoute.geometry must strictly match real OSRM road geometry without synthetic points'
      );

      console.log(
        '✓ Test 6 passed: safe route strictly verified to use real OSRM road-network geometry.'
      );
    }

  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('\nAll routeService safety invariant tests passed successfully!');
}

runRouteServiceTests().catch((err) => {
  console.error('routeService.test.ts failed:', err);
  process.exit(1);
});
