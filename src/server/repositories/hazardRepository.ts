import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { HazardZone } from '../../types';
import { INITIAL_HAZARDS } from '../../data/seedHazards';

export interface HazardRepository {
  getActiveHazards(cityId?: string): Promise<HazardZone[]>;
  addHazard(hazard: HazardZone): Promise<HazardZone>;
  resetHazards(): Promise<void>;
  isUsingDynamoDB(): boolean;
}

export class InMemoryHazardRepository implements HazardRepository {
  private hazards: HazardZone[] = [...INITIAL_HAZARDS];

  async getActiveHazards(cityId?: string): Promise<HazardZone[]> {
    if (!cityId) return [...this.hazards];
    return this.hazards.filter((h) => h.city.toLowerCase() === cityId.toLowerCase());
  }

  async addHazard(hazard: HazardZone): Promise<HazardZone> {
    this.hazards.unshift(hazard);
    return hazard;
  }

  async resetHazards(): Promise<void> {
    this.hazards = [...INITIAL_HAZARDS];
  }

  isUsingDynamoDB(): boolean {
    return false;
  }
}

export class DynamoDBHazardRepository implements HazardRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private fallbackMemoryRepo: InMemoryHazardRepository;

  constructor(region = process.env.AWS_REGION || 'ap-south-1', tableName = process.env.HAZARD_TABLE_NAME || 'ClimatePulse-Hazards') {
    const ddbClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = tableName;
    this.fallbackMemoryRepo = new InMemoryHazardRepository();
  }

  async getActiveHazards(cityId?: string): Promise<HazardZone[]> {
    try {
      if (cityId) {
        const command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `CITY#${cityId.toLowerCase()}`
          }
        });
        const result = await this.docClient.send(command);
        if (result.Items && result.Items.length > 0) {
          return result.Items.map(this.mapItemToHazard);
        }
      } else {
        const command = new ScanCommand({
          TableName: this.tableName,
          Limit: 100
        });
        const result = await this.docClient.send(command);
        if (result.Items && result.Items.length > 0) {
          return result.Items.map(this.mapItemToHazard);
        }
      }
      // If table is empty or newly created, return fallback memory data
      return this.fallbackMemoryRepo.getActiveHazards(cityId);
    } catch {
      // Graceful fallback to memory on AWS error or missing table permissions
      return this.fallbackMemoryRepo.getActiveHazards(cityId);
    }
  }

  async addHazard(hazard: HazardZone): Promise<HazardZone> {
    const item = {
      PK: `CITY#${hazard.city.toLowerCase()}`,
      SK: `HAZARD#${hazard.id}`,
      hazardId: hazard.id,
      cityId: hazard.city,
      name: hazard.name,
      roadName: hazard.roadName,
      lat: hazard.center[0],
      lon: hazard.center[1],
      radiusMeters: hazard.radiusMeters,
      hazardType: hazard.severity === 'CRITICAL' ? 'UNDERPASS_FLOOD' : 'ROAD_PONDING',
      severity: hazard.severity,
      waterDepthCm: hazard.waterDepthCm,
      rainfallIntensityMmPerHour: hazard.rainfallIntensityMmPerHour,
      riskWeight: hazard.riskWeight,
      source: hazard.source,
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      verified: hazard.verified,
      notes: hazard.notes
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item
        })
      );
    } catch {
      // In case DynamoDB write fails, keep in fallback memory
    }

    await this.fallbackMemoryRepo.addHazard(hazard);
    return hazard;
  }

  async resetHazards(): Promise<void> {
    await this.fallbackMemoryRepo.resetHazards();
  }

  isUsingDynamoDB(): boolean {
    return true;
  }

  private mapItemToHazard(item: any): HazardZone {
    return {
      id: item.hazardId || item.id,
      city: item.cityId || item.city,
      name: item.name,
      roadName: item.roadName || item.name,
      center: [Number(item.lat), Number(item.lon)],
      radiusMeters: Number(item.radiusMeters || 400),
      severity: item.severity || 'HIGH',
      waterDepthCm: Number(item.waterDepthCm || 35),
      rainfallIntensityMmPerHour: Number(item.rainfallIntensityMmPerHour || 30),
      riskWeight: Number(item.riskWeight || 0.8),
      source: item.source || 'OFFICIAL_SENSOR',
      verified: Boolean(item.verified),
      reportedAt: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recently',
      notes: item.notes || 'Monitored hazard zone.'
    };
  }
}

// Global Singleton Repository
let repositoryInstance: HazardRepository | null = null;

export function getHazardRepository(): HazardRepository {
  if (!repositoryInstance) {
    const hasAwsCreds = Boolean(
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
    );

    if (hasAwsCreds) {
      repositoryInstance = new DynamoDBHazardRepository();
    } else {
      repositoryInstance = new InMemoryHazardRepository();
    }
  }
  return repositoryInstance;
}
