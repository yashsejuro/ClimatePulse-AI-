import assert from 'node:assert';
import { calculateDualRoutes, isBlockingHazard } from '../src/services/routingService';
import { resolveLocation, CITY_VIEWBOXES } from '../src/services/geocodingService';
import { HazardZone, VehicleProfile, CityId } from '../src/types';
import { CITIES } from '../src/data/cities';

const testVehicle: VehicleProfile = {
  id: 'sedan',
  name: 'Standard Sedan',
  clearanceCm: 16,
  description: 'Standard passenger sedan'
};

async function runTests() {
  console.log('--- Running Routing Engine Tests ---');

  // Test 1: Helper isBlockingHazard verification
  console.log('Testing isBlockingHazard logic...');
  assert.strictEqual(
    isBlockingHazard({ severity: 'HIGH', waterDepthCm: 20 }),
    true,
    'HIGH severity hazard at 20 cm MUST be considered a blocking hazard'
  );
  assert.strictEqual(
    isBlockingHazard({ severity: 'CRITICAL', waterDepthCm: 15 }),
    true,
    'CRITICAL severity hazard MUST be considered a blocking hazard regardless of depth'
  );
  assert.strictEqual(
    isBlockingHazard({ severity: 'MODERATE', waterDepthCm: 32 }),
    true,
    'MODERATE hazard with depth >= 30 cm MUST be considered a blocking hazard'
  );
  assert.strictEqual(
    isBlockingHazard({ severity: 'MODERATE', waterDepthCm: 20 }),
    false,
    'MODERATE hazard with depth < 30 cm is not blocking'
  );
  assert.strictEqual(
    isBlockingHazard({ severity: 'LOW', waterDepthCm: 10 }),
    false,
    'LOW hazard at 10 cm is not blocking'
  );
  console.log('✓ isBlockingHazard unit test passed.');

  // Test 2: OSRM failure never yields safeRouteFound=true
  console.log('Testing: OSRM failure never yields safeRouteFound=true...');
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response('Gateway Timeout', { status: 504 });
    }) as any;

    let threwExpectedError = false;
    try {
      const res = await calculateDualRoutes(
        [12.9716, 77.5946],
        [12.8399, 77.677],
        [],
        testVehicle
      );
      assert.strictEqual(res.safeRouteFound, false);
      assert.strictEqual(res.safe, null);
    } catch (err: any) {
      threwExpectedError = true;
      assert.match(
        err.message,
        /Routing service unavailable/,
        'Error must state "Routing service unavailable"'
      );
    }
    assert.strictEqual(threwExpectedError, true, 'OSRM failure must reject without drawing synthetic routes');
    console.log('✓ OSRM failure never yields safeRouteFound=true test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 3: HIGH hazards at 20 cm block the safe route
  console.log('Testing: HIGH hazards at 20 cm block the safe route...');
  try {
    const mockRouteCoords: [number, number][] = [
      [12.90, 77.60],
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('alternatives=false')) {
        return new Response(JSON.stringify({ routes: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 5000,
              duration: 600,
              geometry: {
                coordinates: mockRouteCoords.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const highHazard20cm: HazardZone = {
      id: 'hazard-high-20',
      city: 'bengaluru',
      name: 'Flooded Junction',
      roadName: 'Main Arterial',
      center: [12.915, 77.615],
      radiusMeters: 400,
      severity: 'HIGH',
      waterDepthCm: 20,
      rainfallIntensityMmPerHour: 35,
      riskWeight: 0.8,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '10 mins ago',
      notes: 'Flooded road section'
    };

    const res = await calculateDualRoutes(
      [12.90, 77.60],
      [12.93, 77.63],
      [highHazard20cm],
      testVehicle
    );

    assert.strictEqual(res.safeRouteFound, false, 'safeRouteFound must be false when route crosses HIGH hazard at 20 cm');
    assert.strictEqual(res.safe, null, 'safe route must be null when all paths cross HIGH hazard at 20 cm');
    assert(res.noSafeRouteReason && res.noSafeRouteReason.length > 0, 'noSafeRouteReason must be provided');
    console.log('✓ HIGH hazards at 20 cm block the safe route test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 4: Destination inside a hazard gives safeRoute=null
  console.log('Testing: destination inside a hazard gives safeRoute=null...');
  try {
    const destCoords: [number, number] = [12.9300, 77.6300];
    const hazardAtDest: HazardZone = {
      id: 'hazard-dest-submerged',
      city: 'bengaluru',
      name: 'Submerged Destination Terminal',
      roadName: 'Terminal Approach',
      center: [12.9301, 77.6301],
      radiusMeters: 300,
      severity: 'CRITICAL',
      waterDepthCm: 45,
      rainfallIntensityMmPerHour: 50,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '5 mins ago',
      notes: 'Submerged terminal area'
    };

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 6000,
              duration: 700,
              geometry: {
                coordinates: [
                  [77.60, 12.90],
                  [77.62, 12.92],
                  [77.6300, 12.9300]
                ]
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const res = await calculateDualRoutes(
      [12.90, 77.60],
      destCoords,
      [hazardAtDest],
      testVehicle
    );

    assert.strictEqual(res.safeRouteFound, false, 'Destination inside a hazard MUST result in safeRouteFound=false');
    assert.strictEqual(res.safe, null, 'Destination inside a hazard MUST result in safeRoute=null');
    console.log('✓ destination inside a hazard gives safeRoute=null test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 5 (FIX 2): A fastest route crossing only a LOW, 10 cm hazard must return safeRouteFound=true and same geometry
  console.log('Testing: fastest route crossing only a LOW 10 cm hazard returns safeRouteFound=true with same geometry...');
  try {
    const mockPolyline: [number, number][] = [
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 4000,
              duration: 480,
              geometry: {
                coordinates: mockPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const lowHazard10cm: HazardZone = {
      id: 'hazard-low-10',
      city: 'bengaluru',
      name: 'Minor Puddle',
      roadName: 'Side Street',
      center: [12.92, 77.62],
      radiusMeters: 200,
      severity: 'LOW',
      waterDepthCm: 10,
      rainfallIntensityMmPerHour: 10,
      riskWeight: 0.1,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '2 mins ago',
      notes: 'Shallow puddle'
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [lowHazard10cm],
      testVehicle
    );

    assert.strictEqual(res.safeRouteFound, true, 'safeRouteFound must be true for non-blocking LOW hazard');
    assert.notStrictEqual(res.safe, null, 'safe route must not be null');
    assert.deepStrictEqual(res.safe?.coordinates, res.fastest.coordinates, 'safe route must have exact same geometry as fastest route');
    assert.match(res.safe!.explanation, /Minor hazards remain: Minor Puddle/, 'safe explanation must note remaining minor hazard');
    assert.match(res.fastest.explanation, /Minor hazards remain: Minor Puddle/, 'fastest explanation must note remaining minor hazard');
    console.log('✓ LOW 10 cm hazard safe route geometry test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 6 (FIX 5): Chennai hazard must not affect Bengaluru route, and resolved hazard must not affect any route
  console.log('Testing: Chennai hazard does not affect Bengaluru route & resolved hazard does not affect route...');
  try {
    const blrPolyline: [number, number][] = [
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 4000,
              duration: 480,
              geometry: {
                coordinates: blrPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const chennaiHazard: HazardZone = {
      id: 'hazard-chennai-submerged',
      city: 'chennai',
      name: 'Chennai Velachery Submerged Road',
      roadName: 'Velachery Main Rd',
      center: [12.92, 77.62], // positioned at BLR coordinates to prove filtering works!
      radiusMeters: 500,
      severity: 'CRITICAL',
      waterDepthCm: 50,
      rainfallIntensityMmPerHour: 60,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '1 min ago',
      notes: 'Submerged Chennai road'
    };

    const resolvedBengaluruHazard: HazardZone = {
      id: 'hazard-blr-resolved',
      city: 'bengaluru',
      name: 'Resolved Bellandur Road',
      roadName: 'Outer Ring Rd',
      center: [12.92, 77.62], // directly on BLR path but status is resolved!
      radiusMeters: 500,
      severity: 'CRITICAL',
      waterDepthCm: 60,
      rainfallIntensityMmPerHour: 60,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'resolved',
      verified: true,
      reportedAt: '1 hour ago',
      notes: 'Water drained out and cleared'
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [chennaiHazard, resolvedBengaluruHazard],
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(
      res.fastest.hazardsIntersected.length,
      0,
      'Chennai hazard and resolved Bengaluru hazard must be filtered out before intersection check'
    );
    assert.strictEqual(res.safeRouteFound, true, 'Bengaluru route should be safe because neither hazard is active in Bengaluru');
    assert.strictEqual(res.safe?.explanation, 'Avoids 0 flood hazard(s). No known hazards on this route.');
    assert.strictEqual(res.fastest.explanation, 'No known hazards on this route.');
    console.log('✓ City and active status filtering test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 7 (FIX 7): Stable city IDs from CITIES object
  console.log('Testing: city selector sets currentCity to stable city IDs...');
  const expectedCityIds: CityId[] = ['bengaluru', 'mumbai', 'delhi', 'chennai'];
  const actualKeys = Object.keys(CITIES) as CityId[];
  assert.deepStrictEqual(
    actualKeys.sort(),
    expectedCityIds.sort(),
    'CITIES object must contain exact stable city IDs'
  );

  let currentCity: CityId = 'bengaluru';
  function simulateCitySelection(newCity: CityId) {
    console.log(`[CITY SELECTOR TEST] Selected ID: ${newCity}`);
    assert(newCity in CITIES, `City ID "${newCity}" must exist in CITIES`);
    currentCity = newCity;
    return currentCity;
  }

  for (const cityId of expectedCityIds) {
    const selected = simulateCitySelection(cityId);
    assert.strictEqual(selected, cityId, `Clicking ${cityId} must set currentCity to exactly ${cityId}`);
  }
  console.log('✓ City selector stable ID verification passed.');

  // Test 8 (Item 6): Bypass call fails -> error state "Couldn't verify an alternate route (routing service error). Try again." (not no-safe-route)
  console.log('Testing: bypass call failure yields error state, not no-safe-route...');
  try {
    const mockPrimaryCoords: [number, number][] = [
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString();
      // Primary call succeeds
      if (urlStr.includes('alternatives=3')) {
        return new Response(
          JSON.stringify({
            routes: [
              {
                distance: 5000,
                duration: 600,
                geometry: {
                  coordinates: mockPrimaryCoords.map(([lat, lon]) => [lon, lat])
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Bypass calls fail with 502 / network error
      return new Response('Bad Gateway', { status: 502 });
    }) as any;

    const blockingHazard: HazardZone = {
      id: 'hazard-blocking-bypass-fail',
      city: 'bengaluru',
      name: 'Submerged Underpass',
      roadName: 'Main Arterial',
      center: [12.92, 77.62],
      radiusMeters: 400,
      severity: 'CRITICAL',
      waterDepthCm: 50,
      rainfallIntensityMmPerHour: 45,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '3 mins ago',
      notes: 'Flooded underpass'
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [blockingHazard],
      testVehicle
    );

    assert.strictEqual(res.safeRouteFound, false, 'safeRouteFound must be false when bypass fails');
    assert.strictEqual(res.safe, null, 'safe route must be null when bypass fails');
    assert.strictEqual(
      res.noSafeRouteReason,
      "Couldn't verify an alternate route (routing service error). Try again.",
      'Must return specific routing service error message when bypass calls fail'
    );
    assert.strictEqual(
      res.safetySummary,
      "Couldn't verify an alternate route (routing service error). Try again."
    );
    console.log('✓ Bypass call failure error state test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 9 (Item 5): longDetour flag set when safe route duration > 2.5x fastest
  console.log('Testing: longDetour flag set when safe duration > 2.5x fastest...');
  try {
    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString();
      // Primary call returns fast route hitting hazard
      if (urlStr.includes('alternatives=3')) {
        return new Response(
          JSON.stringify({
            routes: [
              {
                distance: 4000,
                duration: 10 * 60, // 10 minutes
                geometry: {
                  coordinates: [[77.61, 12.91], [77.62, 12.92], [77.63, 12.93]]
                }
              }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Bypass returns safe route that takes 30 minutes (> 2.5 * 10 = 25 min)
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 18000,
              duration: 30 * 60, // 30 minutes
              geometry: {
                coordinates: [[77.50, 12.91], [77.50, 13.05], [77.63, 12.93]]
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const blockingHazard: HazardZone = {
      id: 'hazard-blocking-long-detour',
      city: 'bengaluru',
      name: 'Flooded Highway',
      roadName: 'Expressway',
      center: [12.92, 77.62],
      radiusMeters: 400,
      severity: 'CRITICAL',
      waterDepthCm: 50,
      rainfallIntensityMmPerHour: 45,
      riskWeight: 1.0,
      source: 'OFFICIAL_SENSOR',
      status: 'active',
      verified: true,
      reportedAt: '1 min ago',
      notes: 'Flooded highway'
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [blockingHazard],
      testVehicle
    );

    assert.strictEqual(res.safeRouteFound, true, 'Safe detour was found');
    assert.strictEqual(res.safe?.longDetour, true, 'longDetour must be true when safe duration > 2.5x fastest');
    console.log('✓ longDetour flag verification passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 10: Hazard with missing status must be treated as ACTIVE
  console.log('Testing: hazard with missing status treated as ACTIVE...');
  try {
    const mockPolyline: [number, number][] = [
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 4000,
              duration: 480,
              geometry: {
                coordinates: mockPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const hazardNoStatus: any = {
      id: 'hazard-no-status',
      city: 'bengaluru',
      name: 'Unspecified Status Submerged Dip',
      roadName: 'Main Link',
      center: [12.92, 77.62],
      radiusMeters: 400,
      severity: 'CRITICAL',
      waterDepthCm: 45,
      rainfallIntensityMmPerHour: 40,
      riskWeight: 0.9,
      source: 'OFFICIAL_SENSOR',
      verified: true
      // status is omitted!
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [hazardNoStatus],
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(
      res.fastest.hazardsIntersected.length,
      1,
      'Hazard lacking status must be treated as ACTIVE and intersect fastest route'
    );
    console.log('✓ Missing status treated as ACTIVE test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 11: Hazard with missing city: inside viewbox is included, outside viewbox is excluded
  console.log('Testing: hazard with missing city inside viewbox vs outside viewbox...');
  try {
    const mockPolyline: [number, number][] = [
      [12.91, 77.61],
      [12.92, 77.62],
      [12.93, 77.63]
    ];

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          routes: [
            {
              distance: 4000,
              duration: 480,
              geometry: {
                coordinates: mockPolyline.map(([lat, lon]) => [lon, lat])
              }
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    // Inside bengaluru viewbox (top: 13.15, bottom: 12.65, left: 77.40, right: 77.85)
    const hazardNoCityInsideVb: any = {
      id: 'hazard-no-city-inside',
      name: 'Inside BLR Viewbox Hazard',
      center: [12.92, 77.62], // inside viewbox and on route
      radiusMeters: 400,
      severity: 'CRITICAL',
      waterDepthCm: 40,
      status: 'active',
      source: 'OFFICIAL_SENSOR',
      verified: true
      // city omitted!
    };

    // Outside bengaluru viewbox (e.g. lat 15.0, lon 75.0)
    const hazardNoCityOutsideVb: any = {
      id: 'hazard-no-city-outside',
      name: 'Outside Viewbox Hazard',
      center: [15.00, 75.00], // far outside viewbox
      radiusMeters: 400,
      severity: 'CRITICAL',
      waterDepthCm: 50,
      status: 'active',
      source: 'OFFICIAL_SENSOR',
      verified: true
      // city omitted!
    };

    const res = await calculateDualRoutes(
      [12.91, 77.61],
      [12.93, 77.63],
      [hazardNoCityInsideVb, hazardNoCityOutsideVb],
      testVehicle,
      32,
      undefined,
      'bengaluru'
    );

    assert.strictEqual(
      res.fastest.hazardsIntersected.length,
      1,
      'Only the hazard inside the city viewbox should be included'
    );
    assert.strictEqual(
      res.fastest.hazardsIntersected[0].hazardId,
      'hazard-no-city-inside',
      'The included hazard must be the one inside the viewbox'
    );
    console.log('✓ Missing city viewbox filtering test passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Test 12: Hosur resolves within extended Bengaluru viewbox (south edge 12.65)
  console.log('Testing: Hosur geocoding resolves within extended viewbox...');
  const hosurResult = await resolveLocation('Hosur', 'bengaluru');
  assert.ok(hosurResult.coords, 'Hosur should resolve coordinates');
  assert.strictEqual(
    CITY_VIEWBOXES.bengaluru.bottom,
    12.65,
    'Bengaluru viewbox south edge must be 12.65'
  );
  assert.ok(
    hosurResult.coords[0] >= CITY_VIEWBOXES.bengaluru.bottom,
    `Hosur latitude (${hosurResult.coords[0]}) must be >= bengaluru bottom viewbox (${CITY_VIEWBOXES.bengaluru.bottom})`
  );
  console.log(`✓ Hosur resolved to [${hosurResult.coords[0]}, ${hosurResult.coords[1]}] within extended viewbox.`);

  console.log('\nAll routing tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
