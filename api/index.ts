import type { IncomingMessage, ServerResponse } from 'http';
import { handleRouteCalculation } from '../src/server/handlers/routeHandler';
import { handleGetHazards, handleResetHazards, handleSeedHazards } from '../src/server/handlers/hazardsHandler';
import { handleGetReports, handleCreateReport } from '../src/server/handlers/reportHandler';
import { handleGenerateBriefing } from '../src/server/handlers/briefingHandler';
import { handleGetStatus } from '../src/server/handlers/statusHandler';
import { getWeatherAdapter } from '../src/server/adapters/weatherAdapter';
import { CityId } from '../src/types';

// Helper to parse JSON body from incoming HTTP request
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const method = (req.method || 'GET').toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.end();
  }

  // Parse path & query params
  const fullUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = fullUrl.pathname;
  const searchParams = fullUrl.searchParams;

  try {
    // 1. GET /api/hazards
    if (pathname.endsWith('/hazards') && method === 'GET') {
      const city = searchParams.get('city') || searchParams.get('cityId') || '';
      const result = await handleGetHazards(city);
      return sendJson(res, result.statusCode, result.data);
    }

    // 2. GET /api/reports
    if (pathname.endsWith('/reports') && method === 'GET') {
      const city = searchParams.get('city') || searchParams.get('cityId') || '';
      const result = await handleGetReports(city);
      return sendJson(res, result.statusCode, result.data);
    }

    // 3. POST /api/route
    if (pathname.endsWith('/route') && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleRouteCalculation(body);
      return sendJson(res, result.statusCode, result.data);
    }

    // 4. POST /api/report & POST /api/reports/verify
    if ((pathname.endsWith('/report') || pathname.endsWith('/reports/verify')) && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleCreateReport(body);
      return sendJson(res, result.statusCode, result.data);
    }

    // 5. POST /api/ai-briefing
    if (pathname.endsWith('/ai-briefing') && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await handleGenerateBriefing(body);
      return sendJson(res, result.statusCode, result.data);
    }

    // 6. GET /api/status & GET /api/aws-status
    if ((pathname.endsWith('/status') || pathname.endsWith('/aws-status')) && method === 'GET') {
      const result = await handleGetStatus();
      return sendJson(res, result.statusCode, result.data);
    }

    // 7. GET /api/weather/precipitation-grid
    if (pathname.endsWith('/precipitation-grid') && method === 'GET') {
      const city = (searchParams.get('city') || 'bengaluru').toLowerCase() as CityId;
      const latStr = searchParams.get('lat');
      const lonStr = searchParams.get('lon') || searchParams.get('lng');

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
      return sendJson(res, 200, grid);
    }

    // 8. GET /api/weather
    if (pathname.endsWith('/weather') && method === 'GET') {
      const city = (searchParams.get('city') || 'bengaluru').toLowerCase() as CityId;
      const latStr = searchParams.get('lat');
      const lonStr = searchParams.get('lon') || searchParams.get('lng');
      const locationName = searchParams.get('locationName') || undefined;

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
      return sendJson(res, 200, weather);
    }

    // 9. POST /api/reset-hazards
    if (pathname.endsWith('/reset-hazards') && method === 'POST') {
      const result = await handleResetHazards();
      return sendJson(res, result.statusCode, result.data);
    }

    // 10. POST /api/hazards/seed
    if (pathname.endsWith('/hazards/seed') && method === 'POST') {
      const body = await parseJsonBody(req);
      const city = searchParams.get('city') || body?.city || '';
      const result = await handleSeedHazards(city);
      return sendJson(res, result.statusCode, result.data);
    }

    // 404 for unknown /api/* endpoints
    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Internal server error' });
  }
}
