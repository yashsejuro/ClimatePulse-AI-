import { APIGatewayEvent, APIGatewayResponse } from '../types/api';
import { getHazardRepository } from '../repositories/hazardRepository';

export async function handleGetHazards(cityId?: string) {
  const hazardRepo = getHazardRepository();
  const hazards = await hazardRepo.getActiveHazards(cityId);
  return {
    statusCode: 200,
    data: hazards
  };
}

export async function handleResetHazards() {
  const hazardRepo = getHazardRepository();
  await hazardRepo.resetHazards();
  const hazards = await hazardRepo.getActiveHazards();
  return {
    statusCode: 200,
    data: { success: true, count: hazards.length }
  };
}

/**
 * AWS Lambda Handler for GET /hazards and POST /reset-hazards
 */
export async function hazardsLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const cityId = event.queryStringParameters?.city || event.queryStringParameters?.cityId;

    if (event.httpMethod === 'POST' && event.path.includes('/reset')) {
      const res = await handleResetHazards();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(res.data)
      };
    }

    const res = await handleGetHazards(cityId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(res.data)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Failed to retrieve hazards' })
    };
  }
}
