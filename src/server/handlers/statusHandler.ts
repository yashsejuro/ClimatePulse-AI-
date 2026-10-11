import { getHazardRepository } from '../repositories/hazardRepository';
import { getReportRepository } from '../repositories/reportRepository';
import { APIGatewayEvent, APIGatewayResponse } from '../types/api';

export interface AwsServiceStatus {
  status: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'LOCAL_FALLBACK_ONLY' | 'NOT_IMPLEMENTED' | 'DEPLOYED_VERIFIED';
  mode: string;
  details: string;
}

export interface SystemStatusResponse {
  app: string;
  tagline: string;
  architecture: string;
  deploymentStatus: 'DEPLOYMENT_READY_PROTOTYPE' | 'LIVE_DEPLOYED';
  liveDeploymentVerified: boolean;
  timestamp: string;
  services: {
    lambda: AwsServiceStatus;
    apiGateway: AwsServiceStatus;
    dynamodb: AwsServiceStatus;
    bedrock: AwsServiceStatus;
    cloudwatch: AwsServiceStatus;
    sam: AwsServiceStatus;
  };
}

export async function handleGetStatus(): Promise<{ statusCode: number; data: SystemStatusResponse }> {
  const hazardRepo = getHazardRepository();
  const reportRepo = getReportRepository();

  const usingDynamoDB = hazardRepo.isUsingDynamoDB() && reportRepo.isUsingDynamoDB();
  const hasAwsCreds = Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  const status: SystemStatusResponse = {
    app: 'ClimatePulse AI',
    tagline: 'Fastest isn\'t always safest',
    architecture: 'AWS Serverless Architecture (SAM / Lambda / API Gateway / DynamoDB / Bedrock)',
    deploymentStatus: 'DEPLOYMENT_READY_PROTOTYPE',
    liveDeploymentVerified: false,
    timestamp: new Date().toISOString(),
    services: {
      lambda: {
        status: 'IMPLEMENTED',
        mode: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'AWS Lambda Runtime' : 'Universal Handler (Node.js 22 / Express Proxy)',
        details: 'Executes route calculation, spatial hazard filtering, and report processing serverlessly.'
      },
      apiGateway: {
        status: 'IMPLEMENTED',
        mode: 'HTTP API v2 Contract Active',
        details: 'Public REST layer with CORS configuration routing to serverless handler.'
      },
      dynamodb: {
        status: usingDynamoDB ? 'IMPLEMENTED' : 'LOCAL_FALLBACK_ONLY',
        mode: usingDynamoDB ? 'AWS DynamoDB Tables Active' : 'InMemoryHazardRepository Active (DynamoDB Code Ready)',
        details: 'Stores active flood hazard registry and crowd-sourced citizen reports without raster bloat.'
      },
      bedrock: {
        status: hasAwsCreds ? 'IMPLEMENTED' : 'LOCAL_FALLBACK_ONLY',
        mode: hasAwsCreds ? `AWS Bedrock (${process.env.BEDROCK_MODEL_ID || 'claude-3-haiku'})` : 'Fallback Multimodal Heuristic Active (Bedrock SDK Ready)',
        details: 'Foundation models strictly isolated to citizen photo verification and natural-language safety briefings.'
      },
      cloudwatch: {
        status: 'IMPLEMENTED',
        mode: 'Structured JSON Logging Active',
        details: 'Emits structured events (ROUTE_REQUEST, SAFE_ROUTE_VALIDATION, etc.) with automated secret redaction.'
      },
      sam: {
        status: 'IMPLEMENTED',
        mode: 'template.yaml Configured',
        details: 'Reproducible AWS SAM specification with least-privilege IAM policies and pay-per-request billing.'
      }
    }
  };

  return {
    statusCode: 200,
    data: status
  };
}

export async function statusLambdaHandler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const result = await handleGetStatus();
  return {
    statusCode: result.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(result.data)
  };
}
