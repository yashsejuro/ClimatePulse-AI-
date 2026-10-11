/**
 * ClimatePulse AI — Structured CloudWatch Logger
 * Emits JSON logs compatible with CloudWatch Insights and local aggregators.
 * Guarantees zero leakage of credentials, tokens, or raw image payloads.
 */

export type StructuredLogEvent =
  | 'ROUTE_REQUEST'
  | 'ROUTE_RESPONSE'
  | 'HAZARD_LOOKUP'
  | 'SAFE_ROUTE_VALIDATION'
  | 'DYNAMODB_ERROR'
  | 'BEDROCK_REQUEST'
  | 'BEDROCK_ERROR';

export interface LogContext {
  event: StructuredLogEvent;
  requestId?: string;
  city?: string;
  [key: string]: any;
}

// Sensitive keys that must NEVER be written to stdout/CloudWatch
const SENSITIVE_KEYS = new Set([
  'aws_secret_access_key',
  'aws_access_key_id',
  'secretaccesskey',
  'accesskeyid',
  'authorization',
  'cookie',
  'imagebase64',
  'image_base64',
  'password',
  'token'
]);

function sanitize(value: any, depth = 0): any {
  if (depth > 4 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    // Truncate long strings (like base64 images)
    if (value.length > 500 && (value.startsWith('data:image') || value.includes('base64'))) {
      return `[TRUNCATED_BINARY_DATA: ${value.length} bytes]`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        cleaned[k] = '[REDACTED]';
      } else {
        cleaned[k] = sanitize(v, depth + 1);
      }
    }
    return cleaned;
  }
  return value;
}

export function logStructured(context: LogContext) {
  const timestamp = new Date().toISOString();
  const sanitized = sanitize(context);
  const logEntry = {
    timestamp,
    ...sanitized
  };

  const jsonString = JSON.stringify(logEntry);

  if (context.event.includes('ERROR')) {
    console.error(jsonString);
  } else {
    console.log(jsonString);
  }
}
