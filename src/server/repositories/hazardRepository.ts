import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { HazardZone, CityId } from '../../types/index.ts';
import { INITIAL_HAZARDS } from '../../data/seedHazards.ts';
import { logStructured } from '../utils/logger.ts';

export interface HazardRepository {
  getActiveHazards(cityId?: string): Promise<HazardZone[]>;
  addHazard(hazard: HazardZone): Promise<HazardZone>;
  resetHazards(): Promise<void>;
  seedHazardsIdempotent(cityId?: string): Promise<{ seeded: number; existing: number; total: number }>;
  isUsingDynamoDB(): boolean;
}

export class InMemoryHazardRepository implements HazardRepository {
  private hazards: HazardZone[] = [...INITIAL_HAZARDS];

  async getActiveHazards(cityId?: string): Promise<HazardZone[]> {
    if (!cityId) return [...this.hazards];
    return this.hazards.filter((h) => h.city.toLowerCase() === cityId.toLowerCase());
  }

  async addHazard(hazard: HazardZone): Promise<HazardZone> {
    const hazardWithStatus: HazardZone = {
      ...hazard,
      status: hazard.status || 'ACTIVE'
    };
    this.hazards.unshift(hazardWithStatus);
    return hazardWithStatus;
  }

  async resetHazards(): Promise<void> {
    this.hazards = [...INITIAL_HAZARDS];
  }

  async seedHazardsIdempotent(cityId?: string): Promise<{ seeded: number; existing: number; total: number }> {
    const candidates = cityId
      ? INITIAL_HAZARDS.filter((h) => h.city.toLowerCase() === cityId.toLowerCase())
      : INITIAL_HAZARDS;

    let seeded = 0;
    let existing = 0;

    for (const h of candidates) {
      const found = this.hazards.some((curr) => curr.id === h.id);
      if (found) {
        existing++;
      } else {
        this.hazards.push({ ...h, status: 'ACTIVE' });
        seeded++;
      }
    }

    logStructured({
      event: 'HAZARD_LOOKUP',
      action: 'IDEMPOTENT_SEED_IN_MEMORY',
      seeded,
      existing,
      total: this.hazards.length,
      city: cityId || 'ALL'
    });

    return { seeded, existing, total: this.hazards.length };
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
          const hazards = result.Items.map(this.mapItemToHazard);
          logStructured({
            event: 'HAZARD_LOOKUP',
            source: 'DYNAMODB',
            city: cityId,
            count: hazards.length
          });
          return hazards;
        }
      } else {
        const command = new ScanCommand({
          TableName: this.tableName,
          Limit: 100
        });
        const result = await this.docClient.send(command);
        if (result.Items && result.Items.length > 0) {
          const hazards = result.Items.map(this.mapItemToHazard);
          logStructured({
            event: 'HAZARD_LOOKUP',
            source: 'DYNAMODB_SCAN',
            count: hazards.length
          });
          return hazards;
        }
      }
      // If table has no items for this partition, fallback to memory
      return this.fallbackMemoryRepo.getActiveHazards(cityId);
    } catch (err: any) {
      logStructured({
        event: 'DYNAMODB_ERROR',
        table: this.tableName,
        operation: 'getActiveHazards',
        error: err?.message || 'Unknown DynamoDB error',
        city: cityId
      });
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
      logStructured({
        event: 'HAZARD_LOOKUP',
        action: 'DYNAMODB_PUT_HAZARD',
        hazardId: hazard.id,
        city: hazard.city,
        severity: hazard.severity
      });
    } catch (err: any) {
      logStructured({
        event: 'DYNAMODB_ERROR',
        table: this.tableName,
        operation: 'addHazard',
        error: err?.message || 'DynamoDB PutCommand failed',
        hazardId: hazard.id
      });
    }

    await this.fallbackMemoryRepo.addHazard(hazard);
    return hazard;
  }

  async resetHazards(): Promise<void> {
    await this.fallbackMemoryRepo.resetHazards();
  }

  async seedHazardsIdempotent(cityId?: string): Promise<{ seeded: number; existing: number; total: number }> {
    const candidates = cityId
      ? INITIAL_HAZARDS.filter((h) => h.city.toLowerCase() === cityId.toLowerCase())
      : INITIAL_HAZARDS;

    let seeded = 0;
    let existing = 0;

    for (const h of candidates) {
      const pk = `CITY#${h.city.toLowerCase()}`;
      const sk = `HAZARD#${h.id}`;

      try {
        // Idempotency check: see if item already exists in DynamoDB
        const getResult = await this.docClient.send(
          new GetCommand({
            TableName: this.tableName,
            Key: { PK: pk, SK: sk }
          })
        );

        if (getResult.Item) {
          existing++;
        } else {
          await this.docClient.send(
            new PutCommand({
              TableName: this.tableName,
              Item: {
                PK: pk,
                SK: sk,
                hazardId: h.id,
                cityId: h.city,
                name: h.name,
                roadName: h.roadName,
                lat: h.center[0],
                lon: h.center[1],
                radiusMeters: h.radiusMeters,
                hazardType: h.severity === 'CRITICAL' ? 'UNDERPASS_FLOOD' : 'ROAD_PONDING',
                severity: h.severity,
                waterDepthCm: h.waterDepthCm,
                rainfallIntensityMmPerHour: h.rainfallIntensityMmPerHour,
                riskWeight: h.riskWeight,
                source: h.source,
                timestamp: new Date().toISOString(),
                status: 'ACTIVE',
                verified: h.verified,
                notes: h.notes
              },
              ConditionExpression: 'attribute_not_exists(PK)'
            })
          );
          seeded++;
        }
      } catch (err: any) {
        if (err?.name === 'ConditionalCheckFailedException') {
          existing++;
        } else {
          logStructured({
            event: 'DYNAMODB_ERROR',
            table: this.tableName,
            operation: 'seedHazardsIdempotent',
            error: err?.message || 'DynamoDB seed error',
            hazardId: h.id
          });
          // Fall back to memory seeding for this record
          existing++;
        }
      }
    }

    // Keep memory fallback in sync
    await this.fallbackMemoryRepo.seedHazardsIdempotent(cityId);

    const total = seeded + existing;
    logStructured({
      event: 'HAZARD_LOOKUP',
      action: 'IDEMPOTENT_SEED_DYNAMODB',
      seeded,
      existing,
      total,
      city: cityId || 'ALL'
    });

    return { seeded, existing, total };
  }

  isUsingDynamoDB(): boolean {
    return true;
  }

  private mapItemToHazard(item: any): HazardZone {
    return {
      id: item.hazardId || item.id,
      city: (item.cityId || item.city || 'bengaluru') as CityId,
      name: item.name,
      roadName: item.roadName || item.name,
      center: [Number(item.lat), Number(item.lon)],
      radiusMeters: Number(item.radiusMeters || 400),
      severity: item.severity || 'HIGH',
      waterDepthCm: Number(item.waterDepthCm || 35),
      rainfallIntensityMmPerHour: Number(item.rainfallIntensityMmPerHour || 30),
      riskWeight: Number(item.riskWeight || 0.8),
      source: item.source || 'OFFICIAL_SENSOR',
      status: item.status || 'ACTIVE',
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
      console.log(`[HazardRepository] Initialized with DynamoDB (Table: ${process.env.HAZARD_TABLE_NAME || 'ClimatePulse-Hazards'})`);
    } else {
      repositoryInstance = new InMemoryHazardRepository();
      console.log('[HazardRepository] Initialized with InMemory store (Local/Dev Fallback Active)');
    }
  }
  return repositoryInstance;
}

