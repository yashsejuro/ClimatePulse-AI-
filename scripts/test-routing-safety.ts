import { calculateDualRoutes, detectHazardIntersections } from '../src/services/routingService';
import { INITIAL_HAZARDS, VEHICLE_PROFILES } from '../src/data/seedHazards';

async function runTestSuite() {
  console.log('====================================================');
  console.log('CLIMATEPULSE ROUTING SAFETY INVARIANT TEST SUITE');
  console.log('====================================================\n');

  // ---------------- TEST 1: Marathahalli Underpass (32 cm flood) ----------------
  console.log('▶ TEST 1: Marathahalli Corridor (Reproduce User Bug Scenario)');
  const originMarathahalli: [number, number] = [12.9345, 77.6266]; // Koramangala
  const destMarathahalli: [number, number] = [12.9560, 77.7150]; // East of Marathahalli underpass
  const marathahalliHazard = INITIAL_HAZARDS.find((h) => h.id === 'blr-marathahalli')!;

  const res1 = await calculateDualRoutes(
    originMarathahalli,
    destMarathahalli,
    INITIAL_HAZARDS,
    VEHICLE_PROFILES[0],
    34
  );

  console.log(`  Fastest Route: ${res1.fastest.distanceKm} km, ${res1.fastest.durationMinutes} min`);
  console.log(`  Fastest Hazards: ${res1.fastest.hazardsIntersected.map((h) => `${h.name} (${h.waterDepthCm}cm)`).join(', ') || 'None'}`);

  // Assertion 1a: Fastest route MUST intersect Marathahalli
  const fastestHitsMarathahalli = res1.fastest.hazardsIntersected.some(
    (h) => h.hazardId === marathahalliHazard.id
  );
  if (!fastestHitsMarathahalli) {
    throw new Error('TEST 1 FAILED: Expected fastest route to intersect Marathahalli underpass');
  }
  console.log('  ✔ Fastest route correctly crosses the hazard');

  // Assertion 1b: Safe route MUST exist and MUST NOT intersect Marathahalli
  if (!res1.safeRouteFound || !res1.safe) {
    throw new Error('TEST 1 FAILED: Expected a safe bypass route to be found');
  }

  // Segment-by-segment geometric verification of the actual safe route polyline
  const verifiedSafeHazards1 = detectHazardIntersections(res1.safe.coordinates, INITIAL_HAZARDS);
  const safeHitsMarathahalli = verifiedSafeHazards1.some(
    (h) => h.hazardId === marathahalliHazard.id
  );

  if (safeHitsMarathahalli) {
    throw new Error('CRITICAL INVARIANT VIOLATION: Safe route polyline intersects Marathahalli underpass!');
  }

  if (verifiedSafeHazards1.length !== 0) {
    throw new Error(`TEST 1 FAILED: Expected 0 hazards on safe bypass, found: ${verifiedSafeHazards1.map((h) => h.name).join(', ')}`);
  }

  console.log(`  Safe Route: ${res1.safe.distanceKm} km, ${res1.safe.durationMinutes} min (+${res1.timeDeltaMinutes} min detour)`);
  console.log('  Safe Hazards: NONE (0 intersections)');
  console.log('  ✔ PASS: Safe route physically and mathematically avoids Marathahalli hazard!\n');

  // ---------------- TEST 2: Silk Board Underpass (48 cm flood) ----------------
  console.log('▶ TEST 2: Silk Board Corridor (Koramangala to Electronic City)');
  const originSilkBoard: [number, number] = [12.9345, 77.6266];
  const destSilkBoard: [number, number] = [12.8452, 77.6602];
  const silkBoardHazard = INITIAL_HAZARDS.find((h) => h.id === 'blr-silk-board')!;

  const res2 = await calculateDualRoutes(
    originSilkBoard,
    destSilkBoard,
    INITIAL_HAZARDS,
    VEHICLE_PROFILES[0],
    34
  );

  const fastestHitsSilkBoard = res2.fastest.hazardsIntersected.some(
    (h) => h.hazardId === silkBoardHazard.id
  );
  if (!fastestHitsSilkBoard) {
    throw new Error('TEST 2 FAILED: Expected fastest route to intersect Silk Board underpass');
  }

  if (!res2.safeRouteFound || !res2.safe) {
    throw new Error('TEST 2 FAILED: Expected a safe bypass route to be found');
  }

  const verifiedSafeHazards2 = detectHazardIntersections(res2.safe.coordinates, INITIAL_HAZARDS);
  const safeHitsSilkBoard = verifiedSafeHazards2.some((h) => h.hazardId === silkBoardHazard.id);

  if (safeHitsSilkBoard) {
    throw new Error('CRITICAL INVARIANT VIOLATION: Safe route polyline intersects Silk Board underpass!');
  }

  console.log(`  Fastest Hazards: ${res2.fastest.hazardsIntersected.map((h) => `${h.name} (${h.waterDepthCm}cm)`).join(', ')}`);
  console.log(`  Safe Route: ${res2.safe.distanceKm} km, ${res2.safe.durationMinutes} min`);
  console.log('  Safe Hazards: NONE (0 intersections)');
  console.log('  ✔ PASS: Safe route physically avoids Silk Board underpass!\n');

  // ---------------- TEST 3: Impossible Destination (Directly in 32 cm flood bowl) ----------------
  console.log('▶ TEST 3: Destination Inside Flood Zone (Invariant Refusal to Fake Safe Route)');
  const originInside: [number, number] = [12.9345, 77.6266];
  const destInside: [number, number] = [12.9554, 77.7011]; // Directly in center of Marathahalli underpass

  const res3 = await calculateDualRoutes(
    originInside,
    destInside,
    INITIAL_HAZARDS,
    VEHICLE_PROFILES[0],
    34
  );

  if (res3.safeRouteFound || res3.safe !== null) {
    throw new Error('CRITICAL INVARIANT VIOLATION: Routing engine returned a safe route for a destination inside a flood zone!');
  }

  console.log('  ✔ Refusal verified: safeRouteFound === false');
  console.log('  ✔ Safe route is null (no fake polyline rendered)');
  console.log(`  ✔ Explanation: "${res3.noSafeRouteReason}"\n`);

  console.log('====================================================');
  console.log('ALL ROUTING SAFETY INVARIANTS VERIFIED SUCCESSFULLY');
  console.log('====================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ FATAL INVARIANT FAILURE:\n', err.message);
  process.exit(1);
});
