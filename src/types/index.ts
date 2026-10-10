export type CityId = 'bengaluru' | 'mumbai' | 'delhi' | 'chennai';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type WaterDepthLevel = 'SPLASH' | 'ANKLE_DEEP' | 'KNEE_DEEP' | 'VEHICLE_SUBMERGED';

export type VehicleType = 'sedan' | 'suv' | 'twowheeler' | 'commercial';

export interface VehicleProfile {
  id: VehicleType;
  name: string;
  clearanceCm: number;
  description: string;
}

export interface HazardZone {
  id: string;
  city: CityId;
  name: string;
  roadName: string;
  center: [number, number]; // [lat, lng]
  radiusMeters: number;
  severity: SeverityLevel;
  waterDepthCm: number;
  rainfallIntensityMmPerHour: number;
  riskWeight: number; // 0.0 to 1.0
  source: 'OFFICIAL_SENSOR' | 'CITIZEN_REPORT' | 'SATELLITE_NOWCAST';
  verified: boolean;
  reportedAt: string;
  notes: string;
}

export interface IntersectedHazard {
  hazardId: string;
  name: string;
  severity: SeverityLevel;
  waterDepthCm: number;
  distanceFromStartKm: number;
}

export interface RouteOption {
  type: 'FASTEST' | 'SAFE';
  distanceKm: number;
  durationMinutes: number;
  riskScore: number; // 0 - 100
  riskCategory: 'SAFE' | 'CAUTION' | 'HAZARDOUS';
  coordinates: [number, number][]; // [lat, lng]
  hazardsIntersected: IntersectedHazard[];
  explanation: string;
  roadNames: string[];
}

export interface RouteComparisonResponse {
  fastest: RouteOption;
  safe: RouteOption;
  riskDeltaPercent: number; // e.g. -75%
  timeDeltaMinutes: number; // e.g. +6
  distanceDeltaKm: number; // e.g. +2.4
  avoidedHazardsCount: number;
  safetySummary: string;
  vehicleProfile: VehicleProfile;
}

export interface CitizenReport {
  id: string;
  city: CityId;
  location: [number, number];
  address: string;
  imageUrl?: string;
  detectedFloodIndicators: string[];
  estimatedDepth: WaterDepthLevel;
  waterDepthCm: number;
  bedrockConfidenceScore: number; // 0 - 100
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  submittedAt: string;
  userNotes: string;
}

export interface CityWeather {
  city: CityId;
  cityName: string;
  rainfallMmPerHour: number;
  precipitationProbability: number;
  temperatureC: number;
  weatherCondition: string;
  alertLevel: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'EMERGENCY';
  alertMessage: string;
}

export interface PresetScenario {
  id: string;
  city: CityId;
  title: string;
  tagline: string;
  hazardHotspot: string;
  origin: {
    name: string;
    coords: [number, number]; // [lat, lng]
  };
  destination: {
    name: string;
    coords: [number, number]; // [lat, lng]
  };
  context: string;
}
