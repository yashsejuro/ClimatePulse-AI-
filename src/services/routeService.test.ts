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

  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('\nAll routeService safety invariant tests passed successfully!');
}

runRouteServiceTests().catch((err) => {
  console.error('routeService.test.ts failed:', err);
  process.exit(1);
});
