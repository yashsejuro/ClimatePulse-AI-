# ClimatePulse AI — AWS Deployment Guide (SAM)

This guide documents deploying the serverless AWS backend (API Gateway + Lambda + DynamoDB + Amazon Bedrock) for **ClimatePulse AI**.

---

## 1. Architecture Overview

```
React SPA (Frontend on S3/CloudFront/Local)
       │
       ▼ HTTPS / JSON
Amazon API Gateway (HTTP API v2)
       │
       ▼
AWS Lambda (ClimatePulseFunction - Node.js 22)
       ├── Amazon DynamoDB (ClimatePulse-Hazards & ClimatePulse-Reports)
       ├── Amazon Bedrock (Claude 3 Haiku / Multimodal Vision)
       └── In-Memory Deterministic Risk & Spatial Engine
```

---

## 2. Prerequisites

1. **AWS CLI** configured (`aws configure` with an IAM user or role).
2. **AWS SAM CLI** installed (`sam --version`).
3. **Bedrock Model Access:** Ensure model `anthropic.claude-3-haiku-20240307-v1:0` is enabled in your target region (`us-east-1` or `ap-south-1`) via the AWS Bedrock Console.

---

## 3. Fast Deployment (2 Commands)

From the project root:

```bash
# 1. Build the SAM application
sam build

# 2. Deploy to your AWS account
sam deploy --guided
```

During `sam deploy --guided`, accept the defaults:
- **Stack Name:** `climatepulse-ai`
- **AWS Region:** `ap-south-1` (or `us-east-1`)
- **Confirm changes before deploy:** `Y`
- **Allow SAM CLI to create IAM roles:** `Y`

SAM will output:
```
Key: ApiEndpoint
Value: https://xxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

---

## 4. Connecting the Frontend to the Deployed AWS API

In your frontend environment or `.env.production`:
```bash
VITE_API_BASE_URL=https://xxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

---

## 5. Local Development & Fallback Guarantee

If AWS credentials are not configured, the entire application seamlessly falls back to:
- **Hazard Storage:** `InMemoryHazardRepository` pre-seeded with 11 surveyed high-risk monsoon flood hotspots (Bengaluru, Mumbai, Delhi, Chennai).
- **Flood Vision & Briefings:** Deterministic vehicle-clearance-aware heuristics (explicitly tagged as `FALLBACK_HEURISTIC` and `DETERMINISTIC_RULES`).
- **Map Cartography:** Clean OpenStreetMap tiles with dark-mode filter (zero API key watermarks).
