# ClimatePulse AI 🌧️🚗

### Fastest isn't always safest.

ClimatePulse AI is a climate-aware navigation platform that helps drivers make safer routing decisions during urban flooding.

Instead of simply recommending the fastest route, ClimatePulse compares the fastest available route with a safer alternative by analyzing registered flood hazards along potential routes.

The system highlights the additional travel time required to reduce flood exposure, allowing users to make informed decisions before driving.

---

## 🚨 Problem

Urban flooding can turn roads, underpasses, and low-lying corridors into dangerous driving zones within a short period of time.

Traditional navigation systems primarily optimize for:

- Travel time
- Distance
- Traffic

But during extreme weather, the fastest route may not be the safest route.

A driver may save a few minutes while unknowingly entering a flooded underpass.

**ClimatePulse addresses this gap by adding climate hazard awareness to route decisions.**

---

## 💡 Solution

ClimatePulse provides a simple comparison between:

🔴 **Fastest Route**  
The route optimized primarily for travel time and distance.

🟢 **Safer Route**  
An alternative route evaluated against registered flood hazards.

The user can immediately see:

- Travel time
- Distance
- Flood risk
- Detected hazards
- Additional travel time
- Flooded roads avoided

### Example

| Route | Time | Distance | Risk |
|---|---:|---:|---|
| Fastest | 25 min | 17.9 km | 🔴 High |
| Safer | 31 min | 22.1 km | 🟢 Low |

**Trade-off: +6 minutes to avoid a flooded road.**

---

## ✨ Key Features

### 🗺️ Flood-Aware Routing

Compares multiple route options and evaluates their exposure to known flood hazards.

### ⚠️ Hazard Detection

Registered hazards contain information such as:

- Location
- Flood severity
- Water depth
- Hazard type
- Status

### 🛣️ Safe Route Validation

Routes are geometrically checked against hazard zones.

A route intersecting critical/high-severity flood zones can be rejected instead of being incorrectly labelled as safe.

### 📊 Risk Scoring

ClimatePulse calculates a deterministic risk score based on hazard exposure and severity.

Risk categories:

- 🟢 SAFE
- 🟡 CAUTION
- 🔴 HAZARDOUS

### 📸 Citizen Flood Reports

Users can submit flood observations.

The system is designed to use AI-assisted validation for submitted flood imagery before incorporating reports into the hazard workflow.

### 🤖 AI-Assisted Analysis

Amazon Bedrock is used for:

- Flood-photo validation
- Human-readable safety explanations

AI is **not** responsible for route geometry or core risk calculations. Those components remain deterministic and verifiable.

### ☁️ AWS Serverless Architecture

ClimatePulse is designed around a serverless AWS architecture using:

- **Amazon API Gateway** — API layer
- **AWS Lambda** — backend processing
- **Amazon DynamoDB** — hazard and citizen-report storage
- **Amazon Bedrock** — AI-powered image validation and safety explanations
- **Amazon CloudWatch** — structured logging
- **AWS SAM** — infrastructure as code

The prototype also supports local fallbacks so the application remains usable when cloud credentials are unavailable.

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │   ClimatePulse Web   │
                    │   React + Leaflet     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    API Gateway       │
                    │      HTTP API        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     AWS Lambda       │
                    │                      │
                    │ Route & Risk Engine  │
                    │ Hazard Processing    │
                    │ Report Processing    │
                    └──────┬───────┬───────┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                 ▼
     ┌─────────────────┐              ┌─────────────────┐
     │   DynamoDB      │              │ Amazon Bedrock  │
     │                 │              │                 │
     │ Hazards         │              │ Image Validation│
     │ Citizen Reports │              │ Safety Briefing │
     └─────────────────┘              └─────────────────┘

                           │
                           ▼
                  ┌─────────────────┐
                  │  CloudWatch     │
                  │ Structured Logs │
                  └─────────────────┘
