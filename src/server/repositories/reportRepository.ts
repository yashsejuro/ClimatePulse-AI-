import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CitizenReport } from '../../types';
import { logStructured } from '../utils/logger';

export interface ReportRepository {
  getReports(cityId?: string): Promise<CitizenReport[]>;
  createReport(report: CitizenReport): Promise<CitizenReport>;
  isUsingDynamoDB(): boolean;
}

const INITIAL_SAMPLE_REPORTS: CitizenReport[] = [
  {
    id: 'report-sample-1',
    city: 'bengaluru',
    location: [12.9177, 77.6238],
    address: 'Silk Board Junction Underpass, Outer Ring Road',
    detectedFloodIndicators: [
      'Standing water covering roadway surface (>30 cm)',
      'Submerged wheel rims on two hatchback vehicles',
      'Water ripples from stalled traffic'
    ],
    estimatedDepth: 'KNEE_DEEP',
    waterDepthCm: 48,
    bedrockConfidenceScore: 94,
    status: 'VERIFIED',
    submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    userNotes: 'Submerged service lane. Sedans stalling when attempting to pass under the metro flyover.'
  },
  {
    id: 'report-sample-2',
    city: 'mumbai',
    location: [19.0838, 72.8427],
    address: 'Milan Subway Underpass, Santacruz',
    detectedFloodIndicators: [
      'High water line against bridge pillar markings (approx 55 cm)',
      'Police yellow barricade floating in standing pool',
      'Completely submerged pedestrian sidewalk curb'
    ],
    estimatedDepth: 'VEHICLE_SUBMERGED',
    waterDepthCm: 55,
    bedrockConfidenceScore: 98,
    status: 'VERIFIED',
    submittedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    userNotes: 'Water up to waist level inside subway bowl. Subway completely barricaded.'
  }
];

export class InMemoryReportRepository implements ReportRepository {
  private reports: CitizenReport[] = [...INITIAL_SAMPLE_REPORTS];

  async getReports(cityId?: string): Promise<CitizenReport[]> {
    if (!cityId) return [...this.reports];
    return this.reports.filter((r) => r.city.toLowerCase() === cityId.toLowerCase());
  }

  async createReport(report: CitizenReport): Promise<CitizenReport> {
    this.reports.unshift(report);
    return report;
  }

  isUsingDynamoDB(): boolean {
    return false;
  }
}

export class DynamoDBReportRepository implements ReportRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private fallbackMemoryRepo: InMemoryReportRepository;

  constructor(region = process.env.AWS_REGION || 'ap-south-1', tableName = process.env.REPORT_TABLE_NAME || 'ClimatePulse-Reports') {
    const ddbClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = tableName;
    this.fallbackMemoryRepo = new InMemoryReportRepository();
  }

  async getReports(cityId?: string): Promise<CitizenReport[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: 50
      });
      const result = await this.docClient.send(command);
      if (result.Items && result.Items.length > 0) {
        const mapped = result.Items.map((item) => ({
          id: item.reportId,
          city: item.cityId,
          location: [item.lat, item.lon] as [number, number],
          address: item.address,
          imageUrl: item.imageUrl,
          detectedFloodIndicators: item.detectedIndicators || [],
          estimatedDepth: item.estimatedDepth || 'KNEE_DEEP',
          waterDepthCm: item.waterDepthCm || 35,
          bedrockConfidenceScore: item.confidenceScore || 90,
          status: item.status || 'VERIFIED',
          submittedAt: item.submittedAt || new Date().toISOString(),
          userNotes: item.userNotes || ''
        }));
        if (cityId) {
          return mapped.filter((r) => r.city.toLowerCase() === cityId.toLowerCase());
        }
        return mapped;
      }
      return this.fallbackMemoryRepo.getReports(cityId);
    } catch (err: any) {
      logStructured({
        event: 'DYNAMODB_ERROR',
        table: this.tableName,
        operation: 'getReports',
        error: err?.message || 'DynamoDB getReports failed',
        city: cityId
      });
      return this.fallbackMemoryRepo.getReports(cityId);
    }
  }

  async createReport(report: CitizenReport): Promise<CitizenReport> {
    // Sanitize image URL to prevent storing massive base64 in DynamoDB
    const safeImageUrl = report.imageUrl && report.imageUrl.length > 300
      ? `metadata:image-verified-hash-${report.id}`
      : report.imageUrl;

    const item = {
      PK: `REPORT#${report.id}`,
      SK: report.submittedAt || new Date().toISOString(),
      reportId: report.id,
      cityId: report.city,
      address: report.address,
      lat: report.location[0],
      lon: report.location[1],
      imageUrl: safeImageUrl,
      waterDepthCm: report.waterDepthCm,
      estimatedDepth: report.estimatedDepth,
      detectedIndicators: report.detectedFloodIndicators,
      confidenceScore: report.bedrockConfidenceScore,
      status: report.status,
      submittedAt: report.submittedAt,
      userNotes: report.userNotes
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item
        })
      );
    } catch (err: any) {
      logStructured({
        event: 'DYNAMODB_ERROR',
        table: this.tableName,
        operation: 'createReport',
        error: err?.message || 'DynamoDB createReport failed',
        reportId: report.id
      });
    }

    await this.fallbackMemoryRepo.createReport(report);
    return report;
  }

  isUsingDynamoDB(): boolean {
    return true;
  }
}

let reportRepoInstance: ReportRepository | null = null;

export function getReportRepository(): ReportRepository {
  if (!reportRepoInstance) {
    const hasAwsCreds = Boolean(
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
    );

    if (hasAwsCreds) {
      reportRepoInstance = new DynamoDBReportRepository();
      console.log(`[ReportRepository] Initialized with DynamoDB (Table: ${process.env.REPORT_TABLE_NAME || 'ClimatePulse-Reports'})`);
    } else {
      reportRepoInstance = new InMemoryReportRepository();
      console.log('[ReportRepository] Initialized with InMemory store (Local/Dev Fallback Active)');
    }
  }
  return reportRepoInstance;
}
