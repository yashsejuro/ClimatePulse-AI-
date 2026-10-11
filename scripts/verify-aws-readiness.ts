import { handler as lambdaHandler } from '../src/server/lambda';
import { getHazardRepository } from '../src/server/repositories/hazardRepository';
import { getReportRepository } from '../src/server/repositories/reportRepository';
import { getBedrockService } from '../src/server/services/bedrockService';

async function runVerification() {
  console.log('====================================================');
  console.log('CLIMATEPULSE AI — AWS DEPLOYMENT & READINESS VERIFY');
  console.log('====================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalChecks++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedChecks++;
    } else {
      console.error(`[FAIL] ${testName}`, details || '');
    }
  }

  // ----------------------------------------------------
  // TEST 1: OPTIONS CORS Preflight
  // ----------------------------------------------------
  console.log('\n--- 1. API Gateway CORS & Entry Point ---');
  const corsEvent = {
    httpMethod: 'OPTIONS',
    path: '/api/route',
    headers: {}
  };
  const corsRes = await lambdaHandler(corsEvent);
  assert(corsRes.statusCode === 204, 'CORS preflight returns HTTP 204');
  assert(corsRes.headers['Access-Control-Allow-Origin'] === '*', 'CORS allows all origins');

  // ----------------------------------------------------
  // TEST 2: GET /api/hazards
  // ----------------------------------------------------
  console.log('\n--- 2. Hazards Handler & Repository ---');
  const getHazardsEvent = {
    httpMethod: 'GET',
    path: '/api/hazards',
    queryStringParameters: { city: 'bengaluru' }
  };
  const hazardsRes = await lambdaHandler(getHazardsEvent);
  assert(hazardsRes.statusCode === 200, 'GET /api/hazards returns HTTP 200');
  const hazardsData = JSON.parse(hazardsRes.body);
  assert(Array.isArray(hazardsData) && hazardsData.length >= 3, 'Bengaluru has monitored flood hazards', `Count: ${hazardsData.length}`);

  const hazardRepo = getHazardRepository();
  assert(typeof hazardRepo.getActiveHazards === 'function', 'HazardRepository interface contract verified');
  console.log(`      Hazard storage mode: ${hazardRepo.isUsingDynamoDB() ? 'AWS DynamoDB' : 'InMemory with Seed Hotspots'}`);

  // ----------------------------------------------------
  // TEST 3: POST /api/route (Core Deterministic CRI Engine)
  // ----------------------------------------------------
  console.log('\n--- 3. Route Calculation & Deterministic Risk Engine ---');
  const routeEvent = {
    httpMethod: 'POST',
    path: '/api/route',
    body: JSON.stringify({
      city: 'bengaluru',
      origin: [12.9345, 77.6266], // Koramangala
      destination: [12.8452, 77.6602], // Electronic City
      vehicleId: 'sedan',
      vehicleClearanceCm: 16,
      scenarioId: 'bengaluru-silkboard'
    })
  };
  const routeRes = await lambdaHandler(routeEvent);
  assert(routeRes.statusCode === 200, 'POST /api/route returns HTTP 200 for Bengaluru');
  const routeData = JSON.parse(routeRes.body);

  assert(routeData.fastest && routeData.safe, 'Dual route options calculated (Fastest vs Safe)');
  assert(routeData.fastest.riskScore >= 65, 'Fastest route risk reflects severe flood (>65)', `Score: ${routeData.fastest.riskScore}`);
  assert(routeData.safe.riskScore < 30, 'Safe bypass route risk is low (<30)', `Score: ${routeData.safe.riskScore}`);
  assert(routeData.avoidedHazardsCount >= 1, 'Safe route avoided hazardous flood chokepoints', `Avoided: ${routeData.avoidedHazardsCount}`);
  assert(routeData.timeDeltaMinutes > 0, 'Explicit time trade-off delta present', `Delta: +${routeData.timeDeltaMinutes} min`);

  // ----------------------------------------------------
  // TEST 3B: Chennai Route Calculation (P0 Fix Verification)
  // ----------------------------------------------------
  console.log('\n--- 3B. Chennai Corridor Verification ---');
  const chennaiRouteEvent = {
    httpMethod: 'POST',
    path: '/api/route',
    body: JSON.stringify({
      city: 'chennai',
      origin: [13.0125, 80.2225], // Little Mount / Guindy Corridor
      destination: [12.9350, 80.2150], // Pallikaranai via Velachery
      vehicleId: 'sedan',
      vehicleClearanceCm: 16,
      scenarioId: 'chennai-velachery'
    })
  };
  const chennaiRouteRes = await lambdaHandler(chennaiRouteEvent);
  assert(chennaiRouteRes.statusCode === 200, 'POST /api/route returns HTTP 200 for Chennai');
  const chennaiData = JSON.parse(chennaiRouteRes.body);
  assert(chennaiData.fastest.riskScore >= 60, 'Chennai fastest route flags Velachery lake flood', `Score: ${chennaiData.fastest.riskScore}`);
  assert(chennaiData.safe.riskScore < 30, 'Chennai safe route bypasses flood zone', `Score: ${chennaiData.safe.riskScore}`);
  assert(chennaiData.avoidedHazardsCount >= 1, 'Chennai safe route avoids Velachery chokepoint', `Avoided: ${chennaiData.avoidedHazardsCount}`);

  // ----------------------------------------------------
  // TEST 3C: Custom Map Pinning / Dynamic Routing (P0 Fix Verification)
  // ----------------------------------------------------
  console.log('\n--- 3C. Custom Dynamic Routing (Unpinned Scenario) ---');
  const customRouteEvent = {
    httpMethod: 'POST',
    path: '/api/route',
    body: JSON.stringify({
      city: 'bengaluru',
      origin: [12.9345, 77.6266],
      destination: [12.9716, 77.5946], // Custom pinned point in Central Bangalore
      vehicleId: 'suv',
      // Notice: scenarioId is omitted! Custom routing must take over!
    })
  };
  const customRouteRes = await lambdaHandler(customRouteEvent);
  assert(customRouteRes.statusCode === 200, 'POST /api/route calculates custom pinned coordinates dynamically');
  const customData = JSON.parse(customRouteRes.body);
  assert(customData.fastest.coordinates.length > 2, 'Custom route coordinates generated dynamically');

  // ----------------------------------------------------
  // TEST 4: POST /api/report (Citizen Submission & AI Validation)
  // ----------------------------------------------------
  console.log('\n--- 4. Citizen Flood Reporting & Bedrock Service ---');
  const bedrockService = getBedrockService();
  const testDepth = 48;
  const validation = await bedrockService.validateFloodImage(undefined, testDepth, 'Test deep ponding near underpass');
  assert(validation.isFlooded === true, 'Flood validation recognizes standing water hazard');
  assert(validation.estimatedSeverity === 'CRITICAL', 'Depth of 48cm correctly tagged as CRITICAL severity');
  assert(
    validation.analysisSource === 'BEDROCK_AI' || validation.analysisSource === 'FALLBACK_HEURISTIC',
    `Analysis source is strictly tagged without false claims: ${validation.analysisSource}`
  );

  const reportEvent = {
    httpMethod: 'POST',
    path: '/api/report',
    body: JSON.stringify({
      city: 'bengaluru',
      location: [12.9200, 77.6300],
      address: 'Test Waterlogged Street',
      waterDepthCm: 45,
      userNotes: 'Water reaches above curb stones'
    })
  };
  const reportRes = await lambdaHandler(reportEvent);
  assert(reportRes.statusCode === 200, 'POST /api/report returns HTTP 200');
  const reportData = JSON.parse(reportRes.body);
  assert(reportData.success === true, 'Report submission acknowledged successfully');
  assert(Boolean(reportData.hazard?.id), 'New hazard dynamically generated from verified report');

  // Verify persistence in repository
  const reportRepo = getReportRepository();
  const reportsList = await reportRepo.getReports('bengaluru');
  assert(reportsList.length > 0, 'Report persisted in repository', `Total reports: ${reportsList.length}`);

  // ----------------------------------------------------
  // TEST 5: POST /api/ai-briefing
  // ----------------------------------------------------
  console.log('\n--- 5. Driver Safety Briefing ---');
  const briefingEvent = {
    httpMethod: 'POST',
    path: '/api/ai-briefing',
    body: JSON.stringify({
      fastestHazards: [
        { name: 'Silk Board Underpass', waterDepthCm: 48, severity: 'CRITICAL' }
      ],
      timeDelta: 6,
      distanceDelta: 2.3,
      vehicleName: 'Sedan (16cm clearance)'
    })
  };
  const briefingRes = await lambdaHandler(briefingEvent);
  assert(briefingRes.statusCode === 200, 'POST /api/ai-briefing returns HTTP 200');
  const briefingData = JSON.parse(briefingRes.body);
  assert(typeof briefingData.briefing === 'string' && briefingData.briefing.length > 20, 'Safety briefing returned meaningful explanation');
  assert(
    briefingData.briefingSource === 'BEDROCK_AI' || briefingData.briefingSource === 'DETERMINISTIC_RULES' || briefingData.briefingSource === 'GEMINI_AI',
    `Briefing source is accurately tagged: ${briefingData.briefingSource}`
  );

  // ----------------------------------------------------
  // TEST 6: GET /api/weather
  // ----------------------------------------------------
  console.log('\n--- 6. Weather Adapter & Radar ---');
  const weatherEvent = {
    httpMethod: 'GET',
    path: '/api/weather',
    queryStringParameters: { city: 'bengaluru' }
  };
  const weatherRes = await lambdaHandler(weatherEvent);
  assert(weatherRes.statusCode === 200, 'GET /api/weather returns HTTP 200');
  const weatherData = JSON.parse(weatherRes.body);
  assert(weatherData.rainfallMmPerHour > 0, 'Rainfall intensity available', `${weatherData.rainfallMmPerHour} mm/h`);

  // ----------------------------------------------------
  // TEST 7: GET /api/status (AWS Serverless Status & Demonstrability)
  // ----------------------------------------------------
  console.log('\n--- 7. AWS Serverless Architecture Status ---');
  const statusEvent = {
    httpMethod: 'GET',
    path: '/api/status',
    headers: {}
  };
  const statusRes = await lambdaHandler(statusEvent);
  assert(statusRes.statusCode === 200, 'GET /api/status returns HTTP 200');
  const statusData = JSON.parse(statusRes.body);
  assert(statusData.deploymentStatus === 'DEPLOYMENT_READY_PROTOTYPE', 'Deployment status is DEPLOYMENT_READY_PROTOTYPE');
  assert(statusData.liveDeploymentVerified === false, 'Transparent non-live status confirmed (no false deployment claims)');
  assert(statusData.services.lambda.status === 'IMPLEMENTED', 'Lambda handler is IMPLEMENTED');
  assert(statusData.services.dynamodb.status === 'LOCAL_FALLBACK_ONLY' || statusData.services.dynamodb.status === 'IMPLEMENTED', 'DynamoDB status verified');
  assert(statusData.services.bedrock.status === 'LOCAL_FALLBACK_ONLY' || statusData.services.bedrock.status === 'IMPLEMENTED', 'Bedrock status verified');
  assert(statusData.services.sam.status === 'IMPLEMENTED', 'AWS SAM is DEFINED/IMPLEMENTED');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${totalChecks - passedChecks}`);
  console.log('====================================================\n');

  if (passedChecks === totalChecks) {
    console.log('SUCCESS: All Lambda handlers, API Gateway routes, repositories, and fallback engines are verified and operational.\n');
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
