# ClimatePulse AI — Architectural Blueprint & MVP Execution Plan
**Tagline:** *"Fastest isn't always safest."*  
**Hackathon Track:** AWS Bharat Builds Tour / Environmental Hacks — Heat & Water  
**Time Horizon:** ~19 Hours Remaining to Final Submission

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Key Hackathon Alignment:**
> To guarantee a flawless live demo and judge evaluation within 19 hours, we adopt a **Deterministic Routing & Risk Engine** with **Dual-Source Fallback**. 
> - **External APIs:** OSRM (Open Source Routing Machine) + Open-Meteo Rain API for real-time live data.
> - **Zero-Failure Fallback:** Curated high-risk monsoon corridors (Bengaluru Silk Board/Bellandur, Mumbai Hindmata/Milan Subway, Chennai Velachery) with active flood hazard zones so that if external networks or rate limits choke during the live pitch, the app gracefully demonstrates full dynamic recalculation without failing.
> - **AWS Footprint:** AWS Lambda + API Gateway contract with DynamoDB persistence and Amazon Bedrock (or multimodal fallback) for vision verification of citizen hazard reports.

---

## 1. Final MVP Definition

ClimatePulse AI delivers an environmental safety layer over conventional navigation:

1. **Dual Route Calculation:**
   - **Fastest Route (Standard Baseline):** Optimizes strictly for distance/traffic, which often directs vehicles straight through submerged underpasses, low-lying storm channels, or waterlogged arterial roads.
   - **Safe Route (ClimatePulse):** Actively avoids detected waterlogging zones, high-intensity precipitation basins, and citizen-verified flood hazards by dynamically penalizing hazardous segments and calculating waypoints around hazard polygons.
2. **Comparative Risk & Cost Metrics:**
   - **Composite Risk Score (0–100):** Visual breakdown comparing Fastest Route risk (e.g., 78% High Risk) vs. ClimatePulse Route risk (e.g., 18% Low Risk).
   - **Trade-off Clarity:** Explicit delta display (e.g., `+4.2 km`, `+7 min`, `Avoided 3 severe waterlogging hotspots`).
3. **Interactive Hazard Layer:**
   - Visualizing active flood polygons, rainfall intensity heatmaps, and citizen report markers with depth estimates (e.g., "1.5 ft waterlogging reported at Minto Bridge").
4. **Secondary Feature: Citizen Hazard Reporting & AI Vision Verification:**
   - Users submit a waterlogging photo with location tag.
   - AI evaluates visible flood indicators (submerged curbs, tire water levels, standing water reflections), assigns a verification confidence score (0–100%), and if confirmed, immediately injects the hazard into the routing engine.

---

## 2. Recommended Technology Stack

| Layer | Technology | Rationale & Trade-offs |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Instant dev reload, strong type safety, robust ecosystem. |
| **Styling** | Tailwind CSS v4 + Lucide Icons | Tactical, high-contrast cartographic aesthetic with zero bloat. |
| **Map Rendering** | Leaflet.js (`leaflet`, `@types/leaflet`) | Lightweight, rock-solid performance, zero API key required, crisp CartoDB dark/light tiles. |
| **Fullstack Backend** | Node.js / Express (`server.ts`) mirroring AWS Lambda | Bridges the dev environment and AWS Lambda serverless handler (`aws-serverless-express` compatible). |
| **Routing Engine** | OSRM Public API + Custom Multi-Waypoint Path Avoidance | Free, zero API key, returns full GeoJSON coordinates; backed by pre-computed offline graph corridors. |
| **Weather & Rainfall** | Open-Meteo API | Free, open meteorological API providing real-time mm/h precipitation with no API key requirement. |
| **Cloud & AWS** | AWS Lambda / API Gateway / DynamoDB / Bedrock | Serverless architecture meeting AWS Bharat hackathon criteria. |
| **AI Vision & Reasoner**| Amazon Bedrock (Claude 3 Haiku / Titan Vision) + Server-side proxy | Fast multimodal validation of flood images and natural-language risk summary. |

---

## 3. Minimal AWS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT (React SPA)                              │
│         Leaflet Map  •  Route Comparison Card  •  Hazard Report Modal       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AMAZON API GATEWAY                                │
│               REST API Routes: /api/route, /api/hazards, /api/report         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Lambda Proxy Event
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               AWS LAMBDA                                    │
│                 (ClimatePulse Core Engine / Express Adapter)                │
│                                                                             │
│   ┌────────────────────┐   ┌────────────────────┐   ┌───────────────────┐   │
│   │   Routing Engine   │   │  Risk Evaluation   │   │  Hazard Registry  │   │
│   │   (OSRM + BBox)    │   │  (Rainfall + DEM)  │   │   (CRUD & Spatial)│   │
│   └─────────┬──────────┘   └─────────┬──────────┘   └─────────┬─────────┘   │
└─────────────┼────────────────────────┼────────────────────────┼─────────────┘
              │                        │                        │
     ┌────────┴────────┐      ┌────────┴────────┐      ┌────────┴────────┐
     │  Open-Meteo &   │      │ Amazon Bedrock  │      │ Amazon DynamoDB │
     │  OSRM Services  │      │ (Vision & Risk) │      │ (Hazards & Logs)│
     └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### AWS Ingestion & Scheduling (Minimal Hackathon Scope):
- **EventBridge Rule (Cron):** Triggers `IngestWeatherHazardLambda` hourly to query regional weather alerts.
- **DynamoDB Tables:**
  - `ClimatePulse-Hazards`: Partition key `cityId`, Sort key `hazardId`. Stores GeoJSON polygons, severity level, source (Sensor / Citizen / Meteorological).
  - `ClimatePulse-Reports`: Stores raw submissions and Bedrock analysis verdicts.

---

## 4. Frontend Architecture & Component Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ App.tsx (Root State: origin, destination, routes, activeHazards, selectedTab)│
├──────────────────────────────────────────────────────────────────────────────┤
│ ├── Navbar (Logo, City Selector: Bengaluru / Mumbai / Delhi, Live Storm Alert)│
│ ├── Main Viewport (Split Layout: 60% Map Canvas | 40% Drawer / Side Panel)   │
│ │   ├── MapContainer (Leaflet Engine)                                        │
│ │   │   ├── RoutePolyline (Fastest - Red/Dashed when compromised)            │
│ │   │   ├── RoutePolyline (Safe Alternative - Bright Emerald/Teal Solid)     │
│ │   │   ├── HazardPolygons (Waterlogging heat circles / danger zones)        │
│ │   │   └── CitizenReportMarkers (Pulsing orange pin with popup photos)      │
│ │   └── ControlPanel (Collapsible on Mobile)                                 │
│ │       ├── RouteInputWidget (Origin/Destination inputs, Quick Pre-sets)     │
│ │       ├── RouteComparisonCard (Fastest vs Safe: Time, Distance, Risk Score)│
│ │       ├── ClimateRiskAuditCard (Why safer? Inundation depths, rain rates)  │
│ │       └── QuickReportTrigger ("Report Waterlogging" FAB button)            │
│ └── Modals                                                                   │
│     ├── CitizenReportModal (Photo upload, preview, GPS pin, Bedrock verdict) │
│     └── HazardDetailsModal (Depth, historical flood recurrence, live camera) │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Backend Architecture & Express-to-Lambda Bridge

The local dev environment runs Express (`server.ts`) which exports the exact handler pattern required by `serverless-http` / AWS Lambda:

1. `server.ts` mounts:
   - `POST /api/route`: Takes `{ origin: [lat, lon], destination: [lat, lon], mode: 'driving' }`.
   - `GET /api/hazards`: Returns active hazard bounding boxes, rainfall intensity, and citizen reports in the current bounding box.
   - `POST /api/report`: Accepts multipart/base64 image, lat, lon, user comment. Calls Bedrock for vision validation; persists to DynamoDB/memory store.
   - `GET /api/weather`: Proxies Open-Meteo precipitation data with 15-minute server-side caching to avoid rate limits.

---

## 6. Data Model

### A. Hazard Entity (`HazardZone`)
```typescript
interface HazardZone {
  id: string;
  city: 'bengaluru' | 'mumbai' | 'delhi' | 'chennai';
  name: string; // e.g., "Silk Board Junction Underpass"
  center: [number, number]; // [lat, lon]
  radiusMeters: number; // e.g., 400
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  waterDepthCm: number; // e.g., 45
  rainfallIntensityMmPerHour: number; // e.g., 38.5
  riskWeight: number; // 0.0 to 1.0 multiplier
  source: 'OFFICIAL_SENSOR' | 'CITIZEN_REPORT' | 'SATELLITE_NOWCAST';
  verified: boolean;
  reportedAt: string; // ISO-8601
  polygonGeoJSON?: GeoJSON.Polygon;
}
```

### B. Route Comparison Entity (`RouteComparisonResponse`)
```typescript
interface RouteOption {
  type: 'FASTEST' | 'SAFE';
  distanceKm: number;
  durationMinutes: number;
  riskScore: number; // 0 - 100
  riskCategory: 'SAFE' | 'CAUTION' | 'HAZARDOUS';
  coordinates: [number, number][]; // GeoJSON polyline [lat, lon]
  hazardsIntersected: {
    hazardId: string;
    name: string;
    severity: string;
    waterDepthCm: number;
  }[];
  explanation: string;
}

interface RouteComparisonResponse {
  fastest: RouteOption;
  safe: RouteOption;
  riskDeltaPercent: number; // e.g., -68%
  timeDeltaMinutes: number; // e.g., +6
  summary: string;
}
```

### C. Citizen Report Entity (`CitizenReport`)
```typescript
interface CitizenReport {
  id: string;
  location: [number, number];
  address: string;
  imageBase64?: string;
  imageUrl?: string;
  detectedFloodIndicators: string[];
  estimatedDepth: 'ANESTHETIC' | 'ANKLE_DEEP' | 'KNEE_DEEP' | 'VEHICLE_SUBMERGED';
  bedrockConfidenceScore: number; // 0 - 100
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  submittedAt: string;
}
```

---

## 7. API Endpoints

| Method | Endpoint | Description | Free/Dev Tier | Hackathon Fallback |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/route` | Returns both Fastest & Safe routes with hazard intersections and risk scores | OSRM Public (`router.project-osrm.org`) | Local path graph with waypoint diversion |
| `GET` | `/api/hazards` | Returns all active flood zones & citizen reports for current city/bbox | Internal Server Memory / DynamoDB | Seeded realistic monsoon datasets for major Indian metros |
| `POST` | `/api/report` | Uploads citizen photo + GPS; calls Bedrock vision check | AWS Bedrock API | Heuristic color/water pattern detector + structured prompt validation |
| `GET` | `/api/weather` | Current rainfall rate (mm/h) and precipitation probability | Open-Meteo free API (No key required) | Realistic cached storm vectors |

---

## 8. Routing Strategy: How We Find the Safe Route

A major challenge in hackathons is calculating a genuinely safer path without hosting a 20GB custom OSRM server:

1. **Step 1 (Fastest Route Query):** Query OSRM standard `/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson&alternatives=true`.
2. **Step 2 (Intersection Detection):**
   - We calculate the line-segment to circle-polygon distance between the polyline coordinates and all known `HazardZone` centers.
   - If distance $\le$ hazard radius, an intersection is flagged and hazard severity is accumulated into the route's risk score.
3. **Step 3 (Safe Alternative Generation):**
   - *Attempt A:* Check OSRM alternative routes returned by the `alternatives=true` flag. Evaluate which alternative has zero or minimal hazard intersections.
   - *Attempt B (Dynamic Avoidance Waypointing):* If all direct routes cross the hazard, calculate a diversion waypoint perpendicular to the hazard centroid outside its danger radius. Query OSRM with `origin → bypassWaypoint → destination`.
   - *Attempt C (Offline Geometric Fallback):* In case OSRM is unreachable or throttled, construct high-fidelity spline paths that detour the arterial danger corridor.

---

## 9. Climate Risk Scoring Strategy (Deterministic)

We do **NOT** use non-deterministic LLMs for risk calculation. We use a transparent, defensible formula:

$$\text{Segment Risk} = \sum_{h \in \text{Hazards}} \left[ \left( \frac{\text{Depth}_{\text{cm}}}{100} \times 0.4 \right) + \left( \frac{\text{Rainfall}_{\text{mm/h}}}{50} \times 0.3 \right) + \left( \text{SeverityWeight}_h \times 0.3 \right) \right] \times \text{ExposureLengthFactor}$$

- Normalizes to a **0–100 Climate Risk Index (CRI)**:
  - `0 – 25`: **Low Risk (Green)** — Minimal surface ponding, passable by all vehicles.
  - `26 – 60`: **Moderate Risk (Amber)** — 10–25 cm waterlogging, pass with extreme caution.
  - `61 – 100`: **Severe Hazard (Red)** — Inundation $\ge 30$ cm, high risk of engine hydrostatic lock and vehicle stranding.

---

## 10. AI / Amazon Bedrock Integration Strategy

Where AI adds real, genuine value in under 19 hours:

1. **Multimodal Flood Verification (Amazon Bedrock / Claude 3 Haiku / Titan Multimodal):**
   - **Input:** Citizen-uploaded mobile photo + user description.
   - **Prompt:** Analyzes image strictly for:
     1. Standing or rushing water covering road asphalt.
     2. Reflection of streetlights/sky indicating water pooling.
     3. Submersion relative to vehicle wheels, curbs, or sidewalks.
   - **Output:** JSON schema:
     ```json
     {
       "hasFloodEvidence": true,
       "confidenceScore": 92,
       "estimatedDepth": "KNEE_DEEP",
       "reasoning": "Visible water level reaches midway up the hubcaps of parked vehicles with active ripples."
     }
     ```
2. **Natural-Language Safety Briefing:**
   - Summarizes the route difference in 2 concise sentences for driver safety (e.g., *"Fastest route leads through 40 cm standing water near Bellandur lake channel. ClimatePulse diverts via Inner Ring Road: +5 mins travel time, 72% less flood exposure."*).

---

## 11. What Should ExplicitLY NOT Be Built (19-Hour Cut List)

- ❌ **No User Login / Signup / OAuth:** Waste of judging time; anonymous session works instantly.
- ❌ **No Turn-by-Turn GPS Voice Navigation:** Leaflet overview with step list is sufficient and far more reliable.
- ❌ **No Complex Machine Learning Training Pipelines:** All flood zones use empirical depth + rainfall nowcasts.
- ❌ **No Satellite Raster Processing Servers:** Pre-calculate or fetch live weather vectors directly.
- ❌ **No Native Mobile App Builds:** A mobile-first, responsive web viewport is 100% accessible on any judge's device or desktop.

---

## 12. Major Technical Risks & Mitigation

| Technical Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| OSRM Public API rate limiting or downtime | Medium | Critical | Pre-bundle a local waypoint routing engine and 3 canonical demo city corridors (Bengaluru, Mumbai, Delhi) with zero network dependency. |
| AWS Bedrock credentials delay or quota limits | Low | High | Implement a robust mock/fallback analyzer with deterministic computer vision heuristics if API keys are missing. |
| Complex map coordinate lag on Leaflet | Low | Medium | Simplify polyline GeoJSON (Douglas-Peucker algorithm or 500-point cap) to maintain 60 FPS rendering. |
| Overcomplicating the UI | Medium | High | Keep the main screen map-first: route drawer slides up smoothly; risk comparison is immediately visible. |

---

## 13. Realistic 19-Hour Implementation Schedule

- **Hour 0 – 3:** Backend core & routing engine (OSRM integration + dynamic hazard avoidance + risk scoring).
- **Hour 3 – 7:** Leaflet map interface, responsive layout, route polylines & hazard polygon rendering.
- **Hour 7 – 10:** Route comparison card, metrics delta (+time, -risk), and visual explanation panel.
- **Hour 10 – 14:** Citizen hazard reporting modal with image upload & Bedrock vision verification.
- **Hour 14 – 17:** Polish UI, curated Indian monsoon hotspot presets (Silk Board, Milan Subway, Minto Bridge), responsive testing.
- **Hour 17 – 19:** Final testing, demo pitch script preparation, backup deployment verification.

---

## BUILD ORDER

1. **Step 1: Core Data Models & Seed Data (`src/types/index.ts`, `src/data/seedHazards.ts`)**
   - Define TypeScript interfaces for hazards, routes, citizen reports, and weather.
   - Seed realistic high-risk flood zones for Bengaluru, Mumbai, and Delhi (with exact GPS coordinates, depth, and rainfall intensity).

2. **Step 2: Server Routing & Risk Calculation Engine (`server.ts` & `src/services/routingService.ts`)**
   - Implement OSRM routing client with alternative detection.
   - Implement hazard intersection detection and the deterministic 0–100 Climate Risk formula.
   - Implement dynamic waypoint diversion for the safe alternative route.

3. **Step 3: Map Canvas & Leaflet Setup (`src/components/Map.tsx`)**
   - Install Leaflet dependencies.
   - Implement high-contrast map rendering with custom styled markers (Origin, Destination, Hazard Zones, Citizen Reports).
   - Render contrasting polyline strokes (Hazardous Fastest vs. Emerald Safe Route).

4. **Step 4: Route Input & Preset Corridors (`src/components/RouteSearch.tsx`)**
   - Provide clean origin/destination inputs with instant one-click preset test scenarios (e.g. *"Bengaluru: Koramangala to Whitefield via Silk Board"*).

5. **Step 5: Route Comparison & Climate Risk Audit Card (`src/components/RouteComparison.tsx`)**
   - Display side-by-side time delta, distance delta, risk reduction percentage, and breakdown of avoided flood zones.

6. **Step 6: Citizen Hazard Reporting Flow (`src/components/CitizenReportModal.tsx`)**
   - Photo submission modal with simulated or live Bedrock vision evaluation, confidence badge, and instant map marker addition.

7. **Step 7: Weather & Rain Radar Layer (`src/components/WeatherBar.tsx`)**
   - Real-time Open-Meteo precipitation banner with active rain intensity indicators.

8. **Step 8: Final Polish, Mobile Responsiveness & Build Verification**
   - Verify complete build with `npm run build` / `compile_applet`.
   - Ensure instant 60 FPS transitions and zero dead clicks.
