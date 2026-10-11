import { routeLambdaHandler } from './handlers/routeHandler';
import { hazardsLambdaHandler } from './handlers/hazardsHandler';
import { reportLambdaHandler } from './handlers/reportHandler';
import { briefingLambdaHandler } from './handlers/briefingHandler';
import { statusLambdaHandler } from './handlers/statusHandler';
import { getWeatherAdapter } from './adapters/weatherAdapter';
import { APIGatewayEvent, APIGatewayResponse } from './types/api';
import { CityId } from '../types';

/**
 * Universal AWS Lambda Handler (supports both API Gateway REST v1 and HTTP API v2)
 */
export async function handler(event: any): Promise<APIGatewayResponse> {
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
  const path = event.path || event.rawPath || '/';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: ''
    };
  }

  const normalizedEvent: APIGatewayEvent = {
    httpMethod: method,
    path,
    queryStringParameters: event.queryStringParameters || null,
    body: typeof event.body === 'string' ? event.body : JSON.stringify(event.body || {}),
    headers: event.headers || {}
  };

  try {
    // Route matching
    if (path.includes('/api/route') && method === 'POST') {
      return await routeLambdaHandler(normalizedEvent);
    }

    if (path.includes('/api/hazards') || path.includes('/api/reset-hazards')) {
      return await hazardsLambdaHandler(normalizedEvent);
    }

    if (path.includes('/api/report') || path.includes('/api/reports')) {
      return await reportLambdaHandler(normalizedEvent);
    }

    if (path.includes('/api/ai-briefing') && method === 'POST') {
      return await briefingLambdaHandler(normalizedEvent);
    }

    if ((path.includes('/api/status') || path.includes('/api/aws-status')) && method === 'GET') {
      return await statusLambdaHandler(normalizedEvent);
    }

    if (path.includes('/api/weather/precipitation-grid') && method === 'GET') {
      const city = ((event.queryStringParameters?.city || 'bengaluru') as string).toLowerCase() as CityId;
      const latStr = event.queryStringParameters?.lat;
      const lonStr = event.queryStringParameters?.lon || event.queryStringParameters?.lng;

      let coords: [number, number] | undefined = undefined;
      if (latStr && lonStr) {
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (!isNaN(lat) && !isNaN(lon)) {
          coords = [lat, lon];
        }
      }

      const weatherAdapter = getWeatherAdapter();
      const grid = await weatherAdapter.getPrecipitationGrid(city, coords);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(grid)
      };
    }

    if (path.includes('/api/weather') && method === 'GET') {
      const city = ((event.queryStringParameters?.city || 'bengaluru') as string).toLowerCase() as CityId;
      const latStr = event.queryStringParameters?.lat;
      const lonStr = event.queryStringParameters?.lon || event.queryStringParameters?.lng;
      const locationName = event.queryStringParameters?.locationName;

      let coords: [number, number] | undefined = undefined;
      if (latStr && lonStr) {
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (!isNaN(lat) && !isNaN(lon)) {
          coords = [lat, lon];
        }
      }

      const weatherAdapter = getWeatherAdapter();
      const weather = await weatherAdapter.getWeather(city, coords, locationName);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(weather)
      };
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: `Route not found: ${method} ${path}` })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err?.message || 'Internal server error' })
    };
  }
}
