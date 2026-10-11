import type { CityId, HazardZone, CitizenReport, RouteComparisonResponse, CityWeather } from '../../types/index.ts';

export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}

export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface RouteRequestBody {
  origin: [number, number];
  destination: [number, number];
  vehicleId?: string;
  scenarioId?: string;
  city?: CityId;
  vehicleClearanceCm?: number;
}

export interface ReportRequestBody {
  city?: CityId;
  location: [number, number];
  address?: string;
  imageBase64?: string;
  userNotes?: string;
  waterDepthCm?: number;
}

export interface BriefingRequestBody {
  fastestHazards: Array<{
    hazardId: string;
    name: string;
    severity: string;
    waterDepthCm: number;
  }>;
  timeDelta?: number;
  distanceDelta?: number;
  vehicleName?: string;
}

export interface BedrockValidationResult {
  isFlooded: boolean;
  confidence: number; // 0 - 100
  estimatedSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  estimatedWaterDepthCm: number;
  estimatedDepthCategory: 'SPLASH' | 'ANKLE_DEEP' | 'KNEE_DEEP' | 'VEHICLE_SUBMERGED';
  indicators: string[];
  reasoning: string;
  recommendedAction: string;
  analysisSource: 'GEMINI_AI' | 'BEDROCK_AI' | 'FALLBACK_HEURISTIC';
}

export interface BedrockBriefingResult {
  briefing: string;
  briefingSource: 'GEMINI_AI' | 'BEDROCK_AI' | 'DETERMINISTIC_RULES';
}
