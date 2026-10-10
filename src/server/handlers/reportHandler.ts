import { APIGatewayEvent, APIGatewayResponse, ReportRequestBody } from '../types/api';
import { getBedrockService } from '../services/bedrockService';
import { getHazardRepository } from '../repositories/hazardRepository';
import { getReportRepository } from '../repositories/reportRepository';
import { CitizenReport, HazardZone } from '../../types';

export async function handleGetReports(cityId?: string) {
  const reportRepo = getReportRepository();
  const reports = await reportRepo.getReports(cityId);
  return {
    statusCode: 200,
    data: reports
  };
}

export async function handleCreateReport(body: ReportRequestBody) {
  const {
    city = 'bengaluru',
    location,
    address = 'Reported Location',
    imageBase64,
    userNotes = '',
    waterDepthCm = 35
  } = body;

  if (!location || !Array.isArray(location) || location.length !== 2) {
    return {
      statusCode: 400,
      data: { error: 'Valid GPS coordinates [lat, lon] are required' }
    };
  }

  const bedrockService = getBedrockService();
  const hazardRepo = getHazardRepository();
  const reportRepo = getReportRepository();

  // Validate image with Bedrock (or deterministic heuristic fallback)
  const validation = await bedrockService.validateFloodImage(
    imageBase64,
    Number(waterDepthCm) || 35,
    userNotes
  );

  const reportId = `report-${Date.now()}`;
  const newReport: CitizenReport = {
    id: reportId,
    city,
    location: [location[0], location[1]],
    address,
    imageUrl: imageBase64 ? imageBase64.slice(0, 500) + '...' : undefined,
    detectedFloodIndicators: validation.indicators,
    estimatedDepth: validation.estimatedDepthCategory,
    waterDepthCm: validation.estimatedWaterDepthCm,
    bedrockConfidenceScore: validation.confidence,
    status: 'VERIFIED',
    submittedAt: new Date().toISOString(),
    userNotes: userNotes || `${validation.analysisSource.replace('_', ' ')} verified waterlogging report.`
  };

  // Persist report
  await reportRepo.createReport(newReport);

  // Inject hazard into active routing registry
  const newHazard: HazardZone = {
    id: `hazard-citizen-${Date.now()}`,
    city,
    name: address.length > 5 ? address : `Citizen Reported Hazard (${validation.estimatedWaterDepthCm} cm)`,
    roadName: address,
    center: [location[0], location[1]],
    radiusMeters: Math.min(500, Math.max(250, validation.estimatedWaterDepthCm * 8)),
    severity: validation.estimatedSeverity,
    waterDepthCm: validation.estimatedWaterDepthCm,
    rainfallIntensityMmPerHour: 35,
    riskWeight: validation.estimatedSeverity === 'CRITICAL' ? 0.95 : 0.75,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: 'Just now',
    notes: `Citizen Report (${validation.analysisSource.replace('_', ' ')} verified with ${validation.confidence}% confidence). ${userNotes}`
  };

  await hazardRepo.addHazard(newHazard);
  const allHazards = await hazardRepo.getActiveHazards(city);

  return {
    statusCode: 200,
    data: {
      success: true,
      report: newReport,
      hazard: newHazard,
      validation,
      totalActiveHazards: allHazards.length
    }
  };
}

/**
 * AWS Lambda Handler for reports
 */
export async function reportLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    if (event.httpMethod === 'GET') {
      const cityId = event.queryStringParameters?.city || event.queryStringParameters?.cityId;
      const res = await handleGetReports(cityId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(res.data)
      };
    }

    const body: ReportRequestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const res = await handleCreateReport(body);

    return {
      statusCode: res.statusCode,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(res.data)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Failed to process report' })
    };
  }
}
