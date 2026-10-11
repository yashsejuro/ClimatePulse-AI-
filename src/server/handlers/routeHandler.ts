import { APIGatewayEvent, APIGatewayResponse, RouteRequestBody } from '../types/api';
import { getHazardRepository } from '../repositories/hazardRepository';
import { getWeatherAdapter } from '../adapters/weatherAdapter';
import { getRoutingAdapter } from '../adapters/routingAdapter';
import { CityId } from '../../types';
import { logStructured } from '../utils/logger';

export async function handleRouteCalculation(body: RouteRequestBody) {
  const startTime = Date.now();
  try {
    const { origin, destination, vehicleId, scenarioId, city = 'bengaluru', vehicleClearanceCm } = body;

    logStructured({
      event: 'ROUTE_REQUEST',
      city,
      origin: origin ? `[${origin[0]}, ${origin[1]}]` : undefined,
      destination: destination ? `[${destination[0]}, ${destination[1]}]` : undefined,
      vehicleId,
      scenarioId
    });

    if (!origin || !destination) {
      return {
        statusCode: 400,
        data: { error: 'Origin and destination coordinates are required' }
      };
    }

    const hazardRepo = getHazardRepository();
    const weatherAdapter = getWeatherAdapter();
    const routingAdapter = getRoutingAdapter();

    const [activeHazards, weather] = await Promise.all([
      hazardRepo.getActiveHazards(city),
      weatherAdapter.getWeather(city as CityId)
    ]);

    const result = await routingAdapter.calculateRoutes({
      origin,
      destination,
      vehicleId,
      vehicleClearanceCm,
      scenarioId,
      hazards: activeHazards,
      rainfallMmPerHour: weather.rainfallMmPerHour,
      city
    });

    logStructured({
      event: 'SAFE_ROUTE_VALIDATION',
      city,
      safeRouteFound: result.safeRouteFound,
      avoidedHazardsCount: result.avoidedHazardsCount,
      fastestIntersections: result.fastest.hazardsIntersected.length,
      safeIntersections: result.safe ? result.safe.hazardsIntersected.length : 0,
      noSafeRouteReason: result.noSafeRouteReason || null
    });

    logStructured({
      event: 'ROUTE_RESPONSE',
      city,
      statusCode: 200,
      executionTimeMs: Date.now() - startTime,
      fastestDistanceKm: result.fastest.distanceKm,
      safeDistanceKm: result.safe?.distanceKm,
      timeDeltaMinutes: result.timeDeltaMinutes
    });

    return {
      statusCode: 200,
      data: result
    };
  } catch (err: any) {
    logStructured({
      event: 'ROUTE_RESPONSE',
      statusCode: 503,
      executionTimeMs: Date.now() - startTime,
      error: err?.message || 'Routing service unavailable'
    });

    return {
      statusCode: 503,
      data: { error: err?.message || 'Routing service unavailable' }
    };
  }
}

/**
 * AWS Lambda Handler signature
 */
export async function routeLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  try {
    const body: RouteRequestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const res = await handleRouteCalculation(body);

    return {
      statusCode: res.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(res.data)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Route calculation failed' })
    };
  }
}
