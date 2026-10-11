import { APIGatewayEvent, APIGatewayResponse } from '../types/api.ts';
import { getHazardRepository } from '../repositories/hazardRepository.ts';

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

export async function handleSeedHazards(cityId?: string) {
  const hazardRepo = getHazardRepository();
  const result = await hazardRepo.seedHazardsIdempotent(cityId);
  return {
    statusCode: 200,
    data: {
      success: true,
      storageMode: hazardRepo.isUsingDynamoDB() ? 'DYNAMODB' : 'IN_MEMORY',
      ...result
    }
  };
}

/**
 * AWS Lambda Handler for GET /hazards, POST /reset-hazards, and POST /hazards/seed
 */
export async function hazardsLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const cityId = event.queryStringParameters?.city || event.queryStringParameters?.cityId;

    if (event.httpMethod === 'POST' && event.path.includes('/seed')) {
      const res = await handleSeedHazards(cityId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(res.data)
      };
    }

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
