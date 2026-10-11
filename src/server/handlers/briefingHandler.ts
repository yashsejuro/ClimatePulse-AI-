import { APIGatewayEvent, APIGatewayResponse, BriefingRequestBody } from '../types/api.ts';
import { getBedrockService } from '../services/bedrockService.ts';

export async function handleGenerateBriefing(body: BriefingRequestBody) {
  const { fastestHazards, timeDelta = 6, distanceDelta = 2.4, vehicleName = 'Sedan' } = body;

  const bedrockService = getBedrockService();
  const result = await bedrockService.generateSafetyBriefing(
    fastestHazards || [],
    timeDelta,
    distanceDelta,
    vehicleName
  );

  return {
    statusCode: 200,
    data: result
  };
}

/**
 * AWS Lambda Handler for safety briefing
 */
export async function briefingLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const body: BriefingRequestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const res = await handleGenerateBriefing(body);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(res.data)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Failed to generate briefing' })
    };
  }
}
