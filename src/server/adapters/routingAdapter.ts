import { HazardZone, RouteComparisonResponse, VehicleProfile } from '../../types';
import { calculateDualRoutes } from '../../services/routingService';
import { VEHICLE_PROFILES } from '../../data/seedHazards';

export interface RouteCalculationParams {
  origin: [number, number];
  destination: [number, number];
  vehicleId?: string;
  vehicleClearanceCm?: number;
  scenarioId?: string;
  hazards: HazardZone[];
  rainfallMmPerHour: number;
  city?: string;
}

export class RoutingAdapter {
  /**
   * Deterministic routing engine proxy.
   * AI MUST NOT calculate numerical risk scores or perform coordinate geometry.
   * The existing deterministic routing/risk engine remains the sole authority.
   */
  async calculateRoutes(params: RouteCalculationParams): Promise<RouteComparisonResponse> {
    const { origin, destination, vehicleId, scenarioId, hazards, rainfallMmPerHour, city } = params;

    let vehicle: VehicleProfile =
      VEHICLE_PROFILES.find((v) => v.id === vehicleId) || VEHICLE_PROFILES[0];

    // If custom clearance provided
    if (params.vehicleClearanceCm && params.vehicleClearanceCm > 0) {
      vehicle = {
        ...vehicle,
        clearanceCm: params.vehicleClearanceCm
      };
    }

    return calculateDualRoutes(
      origin,
      destination,
      hazards,
      vehicle,
      rainfallMmPerHour,
      scenarioId,
      city
    );
  }
}

let routingAdapterInstance: RoutingAdapter | null = null;

export function getRoutingAdapter(): RoutingAdapter {
  if (!routingAdapterInstance) {
    routingAdapterInstance = new RoutingAdapter();
  }
  return routingAdapterInstance;
}
