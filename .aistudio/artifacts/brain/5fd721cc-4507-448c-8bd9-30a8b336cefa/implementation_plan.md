# ClimatePulse AI — Lean Hackathon Architecture & MVP Specification
**Tagline:** *"Fastest isn't always safest."*  
**Hackathon Target:** AWS Bharat Builds / Environmental Hacks — Water & Climate  
**Optimization Principle:** Aggressive 18-hour scope pruning: Zero DEM, deterministic spatial algorithms in Lambda memory, DynamoDB as a flat key-value registry, modular external adapters with zero-fail mocks, and Bedrock restricted strictly to vision validation & human explanations.

---

## A. Final MVP Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT: React 19 SPA (Vite)                           │
│     Leaflet Map Layer  •  Route Risk Comparison Card  •  Citizen Report Flow    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS / JSON
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AMAZON API GATEWAY                                 │
│         POST /route          GET /hazards          POST /reports/verify         │
└──────────────┬─────────────────────┬───────────────────────────┬────────────────┘
               │                     │                           │
               ▼                     ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐ ┌────────────────────┐
│   Route & Risk Lambda     │ │   Hazard Ingestion Lambda │ │ Bedrock Validator  │
│  (RoutingProvider + BBox  │ │ (Query DynamoDB by cityId │ │ (Claude 3 Haiku /  │
│   In-Memory Intersection) │ │  + In-memory filter)      │ │  Titan Multimodal) │
└──────────────┬────────────┘ └──────────────┬────────────┘ └─────────┬──────────┘
               │                             │                        │
       ┌───────┴───────┐                     ▼                        │
       ▼               ▼            ┌─────────────────┐               │
┌─────────────┐ ┌─────────────┐     │ Amazon DynamoDB │               │
│ OSRM Client │ │ Open-Meteo  │     │ (HazardRegistry │◄──────────────┘
│ (or Mock)   │ │ (or Mock)   │     │  & Reports)     │ (writes verified reports)
└─────────────┘ └─────────────┘     └─────────────────┘
```

### Architectural Reductions:
1. **DEM Dropped:** No raster elevation grids, contour interpolation, or hydrological basin modeling. Risk relies purely on rainfall nowcast, known historical hazard points, and real-time citizen reports.
2. **Native Lambda Handlers:** Pure AWS Lambda handler functions (`exports.handler = async (event) => ...`) replacing all Express middleware bridges.
3. **Application-Space Spatial Analysis:** DynamoDB performs zero GIS/spatial indexing. Lambda loads candidate hazards for the active city/bounding box into memory and calculates point-to-polyline Euclidean/Haversine distances in milliseconds.
4. **Secondary Status for EventBridge:** EventBridge cron triggers are deferred until core routing and reporting pass live demonstration tests.

---

## B. Data Model

### 1. DynamoDB Table: `ClimatePulse-Hazards`
- **Partition Key (`PK`):** `CITY#<cityId>` (e.g., `CITY#bengaluru`)
- **Sort Key (`SK`):** `HAZARD#<hazardId>` (e.g., `HAZARD#hz-silkboard-01`)
- **Attributes:**
  - `hazardId` (string, UUID or slug)
  - `name` (string, e.g., "Silk Board Junction Underpass")
  - `latitude` (number, e.g., `12.9177`)
  - `longitude` (number, e.g., `77.6238`)
  - `radiusMeters` (number, e.g., `450`)
  - `hazardType` (string: `'UNDERPASS_FLOOD'` | `'LAKE_OVERFLOW'` | `'ROAD_PONDING'` | `'OPEN_DRAIN'`)
  - `severity` (string: `'CRITICAL'` | `'HIGH'` | `'MODERATE'` | `'LOW'`)
  - `waterDepthCm` (number, e.g., `48`)
  - `confidence` (number: `0.0` to `1.0`)
  - `source` (string: `'OFFICIAL_SENSOR'` | `'CITIZEN_REPORT'` | `'HISTORICAL_MONSOON'`)
  - `timestamp` (string, ISO-8601)
  - `status` (string: `'ACTIVE'` | `'RESOLVED'` | `'MONITORING'`)
  - `verified` (boolean)

### 2. DynamoDB Table: `ClimatePulse-Reports`
- **Partition Key (`PK`):** `REPORT#<reportId>`
- **Sort Key (`SK`):** `<timestamp>`
- **Attributes:**
  - `reportId` (string)
  - `cityId` (string)
  - `latitude` (number)
  - `longitude` (number)
  - `s3ImageKey` (string, optional)
  - `bedrockVerification`:
    - `hasFloodEvidence` (boolean)
    - `confidenceScore` (number: `0` to `100`)
    - `estimatedDepthCategory` (`'SPLASH'` | `'ANKLE_DEEP'` | `'KNEE_DEEP'` | `'VEHICLE_SUBMERGED'`)
    - `indicators` (list of strings)
    - `reasoning` (string)
  - `userComment` (string)
  - `status` (`'VERIFIED'` | `'REJECTED'`)
  - `createdAt` (string, ISO-8601)

---

## C. API Contract

### 1. `POST /api/route`
Calculates standard fastest path and ClimatePulse safe path.

**Request Body:**
```json
{
  "cityId": "bengaluru",
  "origin": { "lat": 12.9345, "lon": 77.6266 },
  "destination": { "lat": 12.8452, "lon": 77.6602 },
  "vehicleClearanceCm": 16
}
```

**Response Body:**
```json
{
  "fastestRoute": {
    "distanceKm": 14.2,
    "durationMinutes": 26,
    "riskScore": 82,
    "riskCategory": "HAZARDOUS",
    "coordinates": [[12.9345, 77.6266], [12.9177, 77.6238], [12.8452, 77.6602]],
    "intersectedHazards": [
      {
        "hazardId": "hz-silkboard-01",
        "name": "Silk Board Junction Underpass",
        "severity": "CRITICAL",
        "waterDepthCm": 48
      }
    ]
  },
  "safeRoute": {
    "distanceKm": 16.5,
    "durationMinutes": 32,
    "riskScore": 14,
    "riskCategory": "SAFE",
    "coordinates": [[12.9345, 77.6266], [12.9140, 77.6080], [12.8452, 77.6602]],
    "intersectedHazards": []
  },
  "tradeOff": {
    "timeDeltaMinutes": 6,
    "distanceDeltaKm": 2.3,
    "riskReductionPercent": 83,
    "avoidedHazardsCount": 1
  },
  "bedrockSafetyExplanation": "Fastest route passes through 48 cm water at Silk Board Underpass, which exceeds vehicle ground clearance (16 cm) and risks engine hydrostatic lock. The safe alternative bypasses via BTM elevated corridor with only 6 minutes added travel time."
}
```

### 2. `GET /api/hazards?cityId=bengaluru`
Returns active hazards for map overlay.

**Response Body:**
```json
{
  "cityId": "bengaluru",
  "hazards": [
    {
      "hazardId": "hz-silkboard-01",
      "name": "Silk Board Junction Underpass",
      "latitude": 12.9177,
      "longitude": 77.6238,
      "radiusMeters": 450,
      "severity": "CRITICAL",
      "waterDepthCm": 48,
      "source": "OFFICIAL_SENSOR",
      "status": "ACTIVE"
    }
  ]
}
```

### 3. `POST /api/reports/verify`
Submits citizen hazard photo for Bedrock multimodal analysis and injects verified hazards.

**Request Body:**
```json
{
  "cityId": "bengaluru",
  "latitude": 12.9298,
  "longitude": 77.6745,
  "userComment": "Bellandur spillway overflowing across service road.",
  "imageBase64": "data:image/jpeg;base64,..."
}
```

**Response Body:**
```json
{
  "reportId": "rep-9812",
  "verified": true,
  "bedrockAnalysis": {
    "hasFloodEvidence": true,
    "confidenceScore": 94,
    "estimatedDepthCategory": "KNEE_DEEP",
    "estimatedDepthCm": 36,
    "indicators": ["Submerged road curb", "Standing surface ripples across two lanes"]
  },
  "newHazardCreated": {
    "hazardId": "hz-citizen-rep-9812",
    "radiusMeters": 350,
    "severity": "HIGH"
  }
}
```

---

## D. Route-Risk Algorithm (Deterministic)

We compute risk using a deterministic formula evaluated strictly in application code.

### 1. Variables:
- $w_{\text{depth}}$: Water depth normalized against vehicle ground clearance $C_v$ (cm):
  $$\text{DepthRatio} = \frac{\text{waterDepthCm}}{\max(10, C_v)}$$
  $$\text{DepthScore} = \min(45, \text{DepthRatio} \times 30)$$
- $w_{\text{rain}}$: Regional rainfall intensity $R$ (mm/h) from Open-Meteo nowcast:
  $$\text{RainScore} = \min(25, \frac{R}{50} \times 20)$$
- $w_{\text{sev}}$: Hazard severity base weight:
  - `CRITICAL`: 35
  - `HIGH`: 25
  - `MODERATE`: 15
  - `LOW`: 8
- $f_{\text{recency}}$: Time decay factor based on report age $t$ (hours):
  $$f_{\text{recency}} = \max(0.6, 1.0 - (t \times 0.05))$$
- $f_{\text{conf}}$: Source verification confidence ($0.5$ to $1.0$).

### 2. Segment Hazard Risk:
$$\text{HazardRisk}(h) = \left[ \text{DepthScore} + \text{RainScore} + w_{\text{sev}} \right] \times f_{\text{recency}} \times f_{\text{conf}}$$

### 3. Route Composite Risk Index (CRI: 0 – 100):
$$\text{CRI} = \min\left(100, \text{BaseRainRisk} + \sum_{h \in \text{Intersected}} \text{HazardRisk}(h)\right)$$
Where:
- $\text{BaseRainRisk} = \min(15, \frac{R}{50} \times 12)$
- If 0 hazards intersected: $\text{CRI} = \text{BaseRainRisk}$ (Safe, Category `SAFE`)
- Category thresholds:
  - $0 \le \text{CRI} < 30$: **SAFE**
  - $30 \le \text{CRI} < 65$: **CAUTION**
  - $65 \le \text{CRI} \le 100$: **HAZARDOUS**

---

## E. Hazard Intersection Algorithm (In-Memory Spatial)

No database spatial query required. Executed in-memory inside the Lambda handler.

### Step 1: Bounding Box Pre-Filter
Given route coordinates $\mathcal{P} = [(lat_1, lon_1), \dots, (lat_n, lon_n)]$:
1. Compute Bounding Box:
   $$lat_{\min} = \min_i(lat_i) - \Delta, \quad lat_{\max} = \max_i(lat_i) + \Delta$$
   $$lon_{\min} = \min_i(lon_i) - \Delta, \quad lon_{\max} = \max_i(lon_i) + \Delta$$
   (with safety buffer $\Delta = 0.015^{\circ} \approx 1.6\text{ km}$).
2. Filter candidate hazards from DynamoDB memory list where $(lat_h, lon_h) \in \text{BBox}$.

### Step 2: Point-to-Segment Minimum Distance
For each candidate hazard $H(lat_h, lon_h)$ and for every consecutive segment $S_j = (P_j, P_{j+1})$ along the route polyline:
1. Project $H$ onto line segment $P_j P_{j+1}$ using planar metric projection:
   $$x = \Delta lon \cdot \cos(lat) \cdot 111320, \quad y = \Delta lat \cdot 110540$$
2. Compute scalar projection parameter $t = \text{clamp}\left(\frac{\vec{HP_j} \cdot \vec{P_{j+1}P_j}}{\|\vec{P_{j+1}P_j}\|^2}, 0, 1\right)$.
3. Compute perpendicular distance $d_j = \| \text{proj} - H \|$ in meters.
4. $d_{\min}(H, \mathcal{P}) = \min_j(d_j)$.

### Step 3: Intersection Verdict
If $d_{\min}(H, \mathcal{P}) \le \text{radiusMeters}_H \times 1.15$ (with 15% safety buffer), hazard $H$ is marked as **INTERSECTED**.

### Step 4: Deterministic Alternative Path Generation
1. If fastest route has 0 intersections $\to$ Fastest route is optimal.
2. If fastest route intersects hazard $H$:
   - Calculate normal detour vector perpendicular to the origin-destination corridor at hazard $H$:
     $$\vec{v}_{\text{bypass}} = (lat_h, lon_h) \pm \vec{n} \times (\text{radius}_H \times 2.4)$$
   - Request routing provider for path: `Origin` $\to$ `Bypass Waypoint` $\to$ `Destination`.
   - Re-evaluate intersection on alternative route.
   - If alternative avoids hazard $\to$ return as **Safe Route**.

---

## F. Amazon Bedrock Responsibilities (Targeted AI)

Bedrock is strictly isolated to tasks where LLMs and Multimodal Foundation Models provide distinct value:

1. **Citizen Flood Image Verification (Multimodal Claude 3 Haiku / Titan Multimodal):**
   - **Input:** Citizen-submitted JPEG/PNG base64 + timestamp.
   - **System Prompt:** Analyzes photo strictly for:
     1. Surface standing water or runoff on asphalt.
     2. Reflection of streetlights/sky on road surface.
     3. Submersion relative to vehicle tires, hubcaps, or sidewalk curbs.
   - **Structured JSON Output:**
     - `hasFloodEvidence`: boolean
     - `confidenceScore`: 0–100
     - `estimatedDepthCategory`: `'SPLASH'` | `'ANKLE_DEEP'` | `'KNEE_DEEP'` | `'VEHICLE_SUBMERGED'`
     - `indicators`: short evidence list
2. **Natural-Language Driver Risk Briefing:**
   - **Input:** Names and depths of intersected hazards, vehicle clearance, time delta, distance delta.
   - **Output:** Exactly 2 concise, driver-focused sentences explaining why the safe detour is strongly recommended (e.g., *"Fastest route leads through 48 cm standing water at Silk Board underpass, exceeding your vehicle's 16 cm clearance. ClimatePulse routes via BTM elevated corridor: +6 mins travel time, 83% risk reduction."*).
3. **Strict Boundary:** Bedrock does **NOT** compute coordinates, does **NOT** determine route intersections, and does **NOT** calculate risk scores.

---

## G. External API Dependencies & Interfaces

### 1. `RoutingProvider` Interface
Abstracted so OSRM can be swapped or mocked seamlessly:
```typescript
interface RoutingProvider {
  getRoute(
    waypoints: [number, number][],
    alternatives?: boolean
  ): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number } | null>;
}
```
- **Primary:** OSRM Public API (`https://router.project-osrm.org/route/v1/driving/...`).
- **Timeout:** 3.5 seconds with `AbortSignal`.

### 2. `WeatherProvider` Interface
```typescript
interface WeatherProvider {
  getRainfall(lat: number, lon: number): Promise<{ rainfallMmPerHour: number; tempC: number }>;
}
```
- **Primary:** Open-Meteo API (`https://api.open-meteo.com/v1/forecast?...`).
- **Timeout:** 2.5 seconds with `AbortSignal`.

---

## H. Fallback / Mock Strategy (Zero-Failure Hackathon Pitch Guarantee)

To protect against network throttling, rate limits, or external API outages during live judge evaluation:

1. **Deterministic Seed Dataset (`seedHazards.ts`):**
   - Curated high-risk monsoon corridors for 4 major Indian metros:
     - **Bengaluru:** Silk Board Junction Underpass (48 cm), Bellandur Lake Spillway & ORR (36 cm), Hebbal Flyover underpass (22 cm), Marathahalli Multiplex underpass (32 cm).
     - **Mumbai:** Milan Subway Underpass (55 cm), Hindmata Cinema TT Circle (45 cm), Andheri Subway (50 cm).
     - **Delhi NCR:** Minto Bridge Underpass (60 cm), Pul Prahladpur Underpass (52 cm), ITO Ring Road (35 cm).
     - **Chennai:** Velachery Lake Bypass (48 cm), Madipakkam Ram Nagar (38 cm).
2. **Routing Provider Fallback (`MockRoutingProvider`):**
   - If OSRM returns HTTP 429, timeout, or network error:
     - Detects scenario from coordinates and returns pre-computed spline geometry detour.
     - For custom ad-hoc coordinates, performs Hermite smooth-curve interpolation around the hazard centroid.
3. **Weather Provider Fallback:**
   - Pre-configured realistic monsoon rainfall vectors per city (Bengaluru: 34.2 mm/h, Mumbai: 48.0 mm/h, Delhi: 28.5 mm/h, Chennai: 38.6 mm/h).
4. **Bedrock Fallback:**
   - If Bedrock credentials are unavailable or throttled:
     - Deterministic rule-based vision estimator evaluates image metadata and depth slider.
     - Template-based safety briefing engine outputs crisp, context-aware driver explanations.

---

## I. Exact Implementation Order (18-Hour Timeline)

1. **Step 1: Clean Core Data Types & Hazard Registry Schema (`src/types/index.ts`)**
   - Prune all DEM and raster types.
   - Standardize DynamoDB hazard registry and report interfaces.
2. **Step 2: Seed Dataset & Mock Providers (`src/data/seedHazards.ts`)**
   - Finalize realistic Indian urban flood hotspots with exact GPS coordinates and depth profiles.
   - Bundle pre-computed arterial corridor geometries.
3. **Step 3: Deterministic In-Memory Routing & Intersection Engine (`src/services/routingService.ts`)**
   - Implement `distancePointToSegmentMeters` and bounding-box candidate filter.
   - Implement deterministic 0–100 Climate Risk Index formula.
   - Implement normal detour waypoint calculation.
4. **Step 4: Native Backend Lambda Handlers (`src/backend/handlers/`)**
   - `routeHandler`: Calls `RoutingProvider`, runs intersection algorithm, generates comparison.
   - `hazardsHandler`: Queries DynamoDB / memory store by `cityId`.
   - `reportHandler`: Executes Bedrock multimodal vision verification, injects verified hazard.
5. **Step 5: Frontend Map & Dual Route Visualization (`src/components/Map.tsx`)**
   - Render contrasting polyline styles: Red/Amber dashed (Hazardous Fastest) vs. Bright Emerald solid (ClimatePulse Safe).
   - Render pulsating hazard depth beacons (e.g., "48 cm") and AI-verified citizen pins.
6. **Step 6: Route Comparison & Driver Briefing Card (`src/components/RouteComparison.tsx`)**
   - Present delta metrics (+time, +dist, -risk %) side-by-side.
   - Display Bedrock-generated explanation of avoided flood chokepoints.
   - Interactive turn-by-turn simulation HUD.
7. **Step 7: Citizen Flood Reporting Flow (`src/components/CitizenReportModal.tsx`)**
   - Photo submission with instant Bedrock vision verification feedback and real-time route recalculation.
8. **Step 8: End-to-End Build Verification & Pitch Dry-Run**
   - Test offline fallback resilience, verify zero dead clicks, and run `npm run build`.
