// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// src/server/repositories/hazardRepository.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// src/data/seedHazards.ts
var VEHICLE_PROFILES = [
  {
    id: "sedan",
    name: "Sedan / Hatchback",
    clearanceCm: 16,
    description: "Low ground clearance. Engine hydrostatic lock risk at >20 cm water."
  },
  {
    id: "suv",
    name: "SUV / Crossover",
    clearanceCm: 22,
    description: "Moderate ground clearance. Safe in ponding up to ~25 cm."
  },
  {
    id: "twowheeler",
    name: "Two-Wheeler / Bike",
    clearanceCm: 14,
    description: "Extremely vulnerable to hidden potholes and open storm drains at >10 cm."
  },
  {
    id: "commercial",
    name: "Commercial / Bus",
    clearanceCm: 35,
    description: "High ground clearance. Can navigate moderate flooding up to ~35 cm."
  }
];
var INITIAL_WEATHER = {
  bengaluru: {
    city: "bengaluru",
    cityName: "Bengaluru",
    rainfallMmPerHour: 34.2,
    precipitationProbability: 88,
    temperatureC: 22.4,
    weatherCondition: "Heavy Monsoon Downpour",
    alertLevel: "WARNING",
    alertMessage: "Red alert for Bellandur & Silk Board basins. Severe waterlogging at arterial underpasses."
  },
  mumbai: {
    city: "mumbai",
    cityName: "Mumbai",
    rainfallMmPerHour: 48,
    precipitationProbability: 95,
    temperatureC: 26.1,
    weatherCondition: "Torrential Coastal Rain",
    alertLevel: "EMERGENCY",
    alertMessage: "High tide coinciding with cloudburst. Milan & Andheri subways closed to low vehicles."
  },
  delhi: {
    city: "delhi",
    cityName: "Delhi NCR",
    rainfallMmPerHour: 28.5,
    precipitationProbability: 76,
    temperatureC: 27.8,
    weatherCondition: "Intense Thunderstorms",
    alertLevel: "WARNING",
    alertMessage: "Minto Bridge and Pul Prahladpur submerged; traffic police advising ring road diversion."
  },
  chennai: {
    city: "chennai",
    cityName: "Chennai",
    rainfallMmPerHour: 38.6,
    precipitationProbability: 85,
    temperatureC: 25.5,
    weatherCondition: "Depression / Northeast Monsoon",
    alertLevel: "WARNING",
    alertMessage: "Velachery lake catchment overflowing into residential corridors; arterial bottlenecks."
  }
};
var INITIAL_HAZARDS = [
  // BENGALURU
  {
    id: "blr-silk-board",
    city: "bengaluru",
    name: "Silk Board Junction Underpass",
    roadName: "Hosur Road / Outer Ring Road",
    center: [12.9177, 77.6238],
    radiusMeters: 450,
    severity: "CRITICAL",
    waterDepthCm: 48,
    rainfallIntensityMmPerHour: 42,
    riskWeight: 0.95,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "12 mins ago",
    notes: "Severe stormwater drain overflow. 3 vehicles stalled. Water reaches above bumper height."
  },
  {
    id: "blr-bellandur",
    city: "bengaluru",
    name: "Bellandur Lake Spillway & ORR",
    roadName: "Outer Ring Road (near Ecospace)",
    center: [12.9298, 77.6745],
    radiusMeters: 550,
    severity: "HIGH",
    waterDepthCm: 36,
    rainfallIntensityMmPerHour: 38,
    riskWeight: 0.85,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "25 mins ago",
    notes: "Lake outflow inundating service lanes and left carriageway. Heavy traffic crawling."
  },
  {
    id: "blr-hebbal",
    city: "bengaluru",
    name: "Hebbal Flyover Loops & Underpass",
    roadName: "Airport Expressway (Bellary Rd)",
    center: [13.0359, 77.597],
    radiusMeters: 380,
    severity: "MODERATE",
    waterDepthCm: 22,
    rainfallIntensityMmPerHour: 24,
    riskWeight: 0.6,
    source: "CITIZEN_REPORT",
    status: "ACTIVE",
    verified: true,
    reportedAt: "38 mins ago",
    notes: "Ponding on left lanes causing hydroplaning risk at speed."
  },
  {
    id: "blr-marathahalli",
    city: "bengaluru",
    name: "Marathahalli Multiplex Underpass",
    roadName: "HAL Old Airport Road",
    center: [12.9554, 77.7011],
    radiusMeters: 320,
    severity: "HIGH",
    waterDepthCm: 32,
    rainfallIntensityMmPerHour: 35,
    riskWeight: 0.8,
    source: "CITIZEN_REPORT",
    status: "ACTIVE",
    verified: true,
    reportedAt: "18 mins ago",
    notes: "Submerged dip under railway bridge. Two-wheelers turned back."
  },
  // MUMBAI
  {
    id: "bom-milan-subway",
    city: "mumbai",
    name: "Milan Subway Underpass",
    roadName: "Western Express Highway Connecting Arm",
    center: [19.0838, 72.8427],
    radiusMeters: 400,
    severity: "CRITICAL",
    waterDepthCm: 55,
    rainfallIntensityMmPerHour: 52,
    riskWeight: 0.98,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "8 mins ago",
    notes: "Pump capacity exceeded. Water depth exceeding 1.8 feet. Submerged police barricades."
  },
  {
    id: "bom-hindmata",
    city: "mumbai",
    name: "Hindmata Cinema TT Circle",
    roadName: "Dr Babasaheb Ambedkar Road",
    center: [19.0094, 72.8428],
    radiusMeters: 500,
    severity: "CRITICAL",
    waterDepthCm: 45,
    rainfallIntensityMmPerHour: 46,
    riskWeight: 0.92,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "15 mins ago",
    notes: "Low-lying basin completely inundated. BEST buses diverting to flyover."
  },
  {
    id: "bom-andheri-subway",
    city: "mumbai",
    name: "Andheri Subway",
    roadName: "SV Road / Railway Underpass",
    center: [19.1197, 72.8464],
    radiusMeters: 350,
    severity: "CRITICAL",
    waterDepthCm: 50,
    rainfallIntensityMmPerHour: 49,
    riskWeight: 0.95,
    source: "CITIZEN_REPORT",
    status: "ACTIVE",
    verified: true,
    reportedAt: "22 mins ago",
    notes: "Completely closed by traffic authorities due to high inundation."
  },
  // DELHI
  {
    id: "del-minto-bridge",
    city: "delhi",
    name: "Minto Bridge Underpass",
    roadName: "Deen Dayal Upadhyay Marg / CP Ring",
    center: [28.6341, 77.2274],
    radiusMeters: 300,
    severity: "CRITICAL",
    waterDepthCm: 60,
    rainfallIntensityMmPerHour: 38,
    riskWeight: 0.98,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "10 mins ago",
    notes: "Flash water accumulation under rail bridge. Depth indicator showing 2 feet."
  },
  {
    id: "del-ito",
    city: "delhi",
    name: "ITO Ring Road & Vikas Marg Intersection",
    roadName: "IP Estate / Vikas Marg",
    center: [28.629, 77.2435],
    radiusMeters: 450,
    severity: "HIGH",
    waterDepthCm: 35,
    rainfallIntensityMmPerHour: 34,
    riskWeight: 0.82,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "20 mins ago",
    notes: "Drainage outflow backwash from Yamuna barrage. Extreme congestion."
  },
  {
    id: "del-prahladpur",
    city: "delhi",
    name: "Pul Prahladpur Underpass",
    roadName: "Mehrauli-Badarpur Road",
    center: [28.5085, 77.2882],
    radiusMeters: 400,
    severity: "CRITICAL",
    waterDepthCm: 52,
    rainfallIntensityMmPerHour: 36,
    riskWeight: 0.94,
    source: "CITIZEN_REPORT",
    status: "ACTIVE",
    verified: true,
    reportedAt: "30 mins ago",
    notes: "Water level reached window line of stalled autorickshaw. Avoid at all costs."
  },
  // CHENNAI
  {
    id: "che-velachery",
    city: "chennai",
    name: "Velachery Bypass & Lake Spillway",
    roadName: "Velachery Main Road",
    center: [12.9784, 80.2185],
    radiusMeters: 550,
    severity: "CRITICAL",
    waterDepthCm: 48,
    rainfallIntensityMmPerHour: 40,
    riskWeight: 0.92,
    source: "OFFICIAL_SENSOR",
    status: "ACTIVE",
    verified: true,
    reportedAt: "14 mins ago",
    notes: "Lake catchment overflow over main carriageway. Water depth 1.5 ft."
  },
  {
    id: "che-madipakkam",
    city: "chennai",
    name: "Madipakkam Ram Nagar Lowlands",
    roadName: "Bazaar Road / Inner Link",
    center: [12.9652, 80.1989],
    radiusMeters: 400,
    severity: "HIGH",
    waterDepthCm: 38,
    rainfallIntensityMmPerHour: 36,
    riskWeight: 0.85,
    source: "CITIZEN_REPORT",
    status: "ACTIVE",
    verified: true,
    reportedAt: "35 mins ago",
    notes: "Continuous waterlogging. Street drains concealed by surface water."
  }
];
(() => {
  const missingCityCount = INITIAL_HAZARDS.filter((h) => !h.city).length;
  const missingStatusCount = INITIAL_HAZARDS.filter((h) => !h.status).length;
  console.log(
    `[STARTUP CHECK] Seeded hazards: ${INITIAL_HAZARDS.length} total. Missing city: ${missingCityCount}, Missing status: ${missingStatusCount}.`
  );
})();

// src/server/utils/logger.ts
var SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "aws_secret_access_key",
  "aws_access_key_id",
  "secretaccesskey",
  "accesskeyid",
  "authorization",
  "cookie",
  "imagebase64",
  "image_base64",
  "password",
  "token"
]);
function sanitize(value, depth = 0) {
  if (depth > 4 || value === null || value === void 0) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 500 && (value.startsWith("data:image") || value.includes("base64"))) {
      return `[TRUNCATED_BINARY_DATA: ${value.length} bytes]`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }
  if (typeof value === "object") {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        cleaned[k] = "[REDACTED]";
      } else {
        cleaned[k] = sanitize(v, depth + 1);
      }
    }
    return cleaned;
  }
  return value;
}
function logStructured(context) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const sanitized = sanitize(context);
  const logEntry = {
    timestamp,
    ...sanitized
  };
  const jsonString = JSON.stringify(logEntry);
  if (context.event.includes("ERROR")) {
    console.error(jsonString);
  } else {
    console.log(jsonString);
  }
}

// src/server/repositories/hazardRepository.ts
var InMemoryHazardRepository = class {
  constructor() {
    this.hazards = [...INITIAL_HAZARDS];
  }
  async getActiveHazards(cityId) {
    if (!cityId) return [...this.hazards];
    return this.hazards.filter((h) => h.city.toLowerCase() === cityId.toLowerCase());
  }
  async addHazard(hazard) {
    const hazardWithStatus = {
      ...hazard,
      status: hazard.status || "ACTIVE"
    };
    this.hazards.unshift(hazardWithStatus);
    return hazardWithStatus;
  }
  async resetHazards() {
    this.hazards = [...INITIAL_HAZARDS];
  }
  async seedHazardsIdempotent(cityId) {
    const candidates = cityId ? INITIAL_HAZARDS.filter((h) => h.city.toLowerCase() === cityId.toLowerCase()) : INITIAL_HAZARDS;
    let seeded = 0;
    let existing = 0;
    for (const h of candidates) {
      const found = this.hazards.some((curr) => curr.id === h.id);
      if (found) {
        existing++;
      } else {
        this.hazards.push({ ...h, status: "ACTIVE" });
        seeded++;
      }
    }
    logStructured({
      event: "HAZARD_LOOKUP",
      action: "IDEMPOTENT_SEED_IN_MEMORY",
      seeded,
      existing,
      total: this.hazards.length,
      city: cityId || "ALL"
    });
    return { seeded, existing, total: this.hazards.length };
  }
  isUsingDynamoDB() {
    return false;
  }
};
var DynamoDBHazardRepository = class {
  constructor(region = process.env.AWS_REGION || "ap-south-1", tableName = process.env.HAZARD_TABLE_NAME || "ClimatePulse-Hazards") {
    const ddbClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = tableName;
    this.fallbackMemoryRepo = new InMemoryHazardRepository();
  }
  async getActiveHazards(cityId) {
    try {
      if (cityId) {
        const command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `CITY#${cityId.toLowerCase()}`
          }
        });
        const result = await this.docClient.send(command);
        if (result.Items && result.Items.length > 0) {
          const hazards = result.Items.map(this.mapItemToHazard);
          logStructured({
            event: "HAZARD_LOOKUP",
            source: "DYNAMODB",
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
            event: "HAZARD_LOOKUP",
            source: "DYNAMODB_SCAN",
            count: hazards.length
          });
          return hazards;
        }
      }
      return this.fallbackMemoryRepo.getActiveHazards(cityId);
    } catch (err) {
      logStructured({
        event: "DYNAMODB_ERROR",
        table: this.tableName,
        operation: "getActiveHazards",
        error: err?.message || "Unknown DynamoDB error",
        city: cityId
      });
      return this.fallbackMemoryRepo.getActiveHazards(cityId);
    }
  }
  async addHazard(hazard) {
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
      hazardType: hazard.severity === "CRITICAL" ? "UNDERPASS_FLOOD" : "ROAD_PONDING",
      severity: hazard.severity,
      waterDepthCm: hazard.waterDepthCm,
      rainfallIntensityMmPerHour: hazard.rainfallIntensityMmPerHour,
      riskWeight: hazard.riskWeight,
      source: hazard.source,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "ACTIVE",
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
        event: "HAZARD_LOOKUP",
        action: "DYNAMODB_PUT_HAZARD",
        hazardId: hazard.id,
        city: hazard.city,
        severity: hazard.severity
      });
    } catch (err) {
      logStructured({
        event: "DYNAMODB_ERROR",
        table: this.tableName,
        operation: "addHazard",
        error: err?.message || "DynamoDB PutCommand failed",
        hazardId: hazard.id
      });
    }
    await this.fallbackMemoryRepo.addHazard(hazard);
    return hazard;
  }
  async resetHazards() {
    await this.fallbackMemoryRepo.resetHazards();
  }
  async seedHazardsIdempotent(cityId) {
    const candidates = cityId ? INITIAL_HAZARDS.filter((h) => h.city.toLowerCase() === cityId.toLowerCase()) : INITIAL_HAZARDS;
    let seeded = 0;
    let existing = 0;
    for (const h of candidates) {
      const pk = `CITY#${h.city.toLowerCase()}`;
      const sk = `HAZARD#${h.id}`;
      try {
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
                hazardType: h.severity === "CRITICAL" ? "UNDERPASS_FLOOD" : "ROAD_PONDING",
                severity: h.severity,
                waterDepthCm: h.waterDepthCm,
                rainfallIntensityMmPerHour: h.rainfallIntensityMmPerHour,
                riskWeight: h.riskWeight,
                source: h.source,
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                status: "ACTIVE",
                verified: h.verified,
                notes: h.notes
              },
              ConditionExpression: "attribute_not_exists(PK)"
            })
          );
          seeded++;
        }
      } catch (err) {
        if (err?.name === "ConditionalCheckFailedException") {
          existing++;
        } else {
          logStructured({
            event: "DYNAMODB_ERROR",
            table: this.tableName,
            operation: "seedHazardsIdempotent",
            error: err?.message || "DynamoDB seed error",
            hazardId: h.id
          });
          existing++;
        }
      }
    }
    await this.fallbackMemoryRepo.seedHazardsIdempotent(cityId);
    const total = seeded + existing;
    logStructured({
      event: "HAZARD_LOOKUP",
      action: "IDEMPOTENT_SEED_DYNAMODB",
      seeded,
      existing,
      total,
      city: cityId || "ALL"
    });
    return { seeded, existing, total };
  }
  isUsingDynamoDB() {
    return true;
  }
  mapItemToHazard(item) {
    return {
      id: item.hazardId || item.id,
      city: item.cityId || item.city || "bengaluru",
      name: item.name,
      roadName: item.roadName || item.name,
      center: [Number(item.lat), Number(item.lon)],
      radiusMeters: Number(item.radiusMeters || 400),
      severity: item.severity || "HIGH",
      waterDepthCm: Number(item.waterDepthCm || 35),
      rainfallIntensityMmPerHour: Number(item.rainfallIntensityMmPerHour || 30),
      riskWeight: Number(item.riskWeight || 0.8),
      source: item.source || "OFFICIAL_SENSOR",
      status: item.status || "ACTIVE",
      verified: Boolean(item.verified),
      reportedAt: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "Recently",
      notes: item.notes || "Monitored hazard zone."
    };
  }
};
var repositoryInstance = null;
function getHazardRepository() {
  if (!repositoryInstance) {
    const hasAwsCreds = Boolean(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_LAMBDA_FUNCTION_NAME
    );
    if (hasAwsCreds) {
      repositoryInstance = new DynamoDBHazardRepository();
      console.log(`[HazardRepository] Initialized with DynamoDB (Table: ${process.env.HAZARD_TABLE_NAME || "ClimatePulse-Hazards"})`);
    } else {
      repositoryInstance = new InMemoryHazardRepository();
      console.log("[HazardRepository] Initialized with InMemory store (Local/Dev Fallback Active)");
    }
  }
  return repositoryInstance;
}

// src/server/adapters/weatherAdapter.ts
var OpenMeteoWeatherAdapter = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.CACHE_TTL_MS = 15 * 60 * 1e3;
  }
  // 15 minutes
  async getWeather(city) {
    const cityKey = (city || "bengaluru").toLowerCase();
    const defaultWeather = INITIAL_WEATHER[cityKey] || INITIAL_WEATHER.bengaluru;
    const cached = this.cache.get(cityKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.data;
    }
    const cityCoordinates = {
      bengaluru: [12.9716, 77.5946],
      mumbai: [19.076, 72.8777],
      delhi: [28.6139, 77.209],
      chennai: [13.0827, 80.2707]
    };
    const coords = cityCoordinates[cityKey];
    if (!coords) {
      return defaultWeather;
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&current=temperature_2m,precipitation,rain,weather_code&hourly=precipitation_probability,rain&forecast_days=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3e3) });
      if (response.ok) {
        const data = await response.json();
        const current = data.current || {};
        const rain = current.rain !== void 0 ? current.rain : current.precipitation || defaultWeather.rainfallMmPerHour;
        const temp = current.temperature_2m || defaultWeather.temperatureC;
        const resolved = {
          ...defaultWeather,
          temperatureC: Math.round(temp * 10) / 10,
          rainfallMmPerHour: Math.max(12, Math.round((rain + defaultWeather.rainfallMmPerHour) / 2 * 10) / 10)
        };
        this.cache.set(cityKey, { data: resolved, cachedAt: Date.now() });
        return resolved;
      }
    } catch {
    }
    return defaultWeather;
  }
};
var weatherAdapterInstance = null;
function getWeatherAdapter() {
  if (!weatherAdapterInstance) {
    weatherAdapterInstance = new OpenMeteoWeatherAdapter();
  }
  return weatherAdapterInstance;
}

// src/data/cities.ts
var CITIES = {
  bengaluru: {
    id: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    center: [12.925, 77.64],
    zoom: 13
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    center: [19.055, 72.845],
    zoom: 13
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    state: "NCR",
    center: [28.615, 77.24],
    zoom: 13
  },
  chennai: {
    id: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    center: [12.975, 80.21],
    zoom: 13
  }
};
var CITY_LIST = [
  CITIES.bengaluru,
  CITIES.mumbai,
  CITIES.delhi,
  CITIES.chennai
];

// src/services/geocodingService.ts
var CITY_VIEWBOXES = {
  bengaluru: { left: 77.4, top: 13.15, right: 77.85, bottom: 12.65 },
  chennai: { left: 80.05, top: 13.25, right: 80.35, bottom: 12.85 },
  mumbai: { left: 72.7, top: 19.3, right: 73.05, bottom: 18.85 },
  delhi: { left: 76.8, top: 28.9, right: 77.5, bottom: 28.3 }
};

// src/services/routingService.ts
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function distancePointToSegmentMeters(pLat, pLon, aLat, aLon, bLat, bLon) {
  const cosLat = Math.cos(pLat * Math.PI / 180);
  const px = pLon * cosLat * 111320;
  const py = pLat * 110540;
  const ax = aLon * cosLat * 111320;
  const ay = aLat * 110540;
  const bx = bLon * cosLat * 111320;
  const by = bLat * 110540;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}
function detectHazardIntersections(coordinates, hazards) {
  const intersected = [];
  if (!coordinates || coordinates.length < 2 || !hazards || hazards.length === 0) {
    return intersected;
  }
  let cumulativeDist = 0;
  const segmentCumulativeDists = [0];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const segDist = calculateDistanceMeters(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
    cumulativeDist += segDist;
    segmentCumulativeDists.push(cumulativeDist);
  }
  for (const hazard of hazards) {
    let minDistanceMeters = Infinity;
    let closestSegmentIndex = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const dist = distancePointToSegmentMeters(
        hazard.center[0],
        hazard.center[1],
        coordinates[i][0],
        coordinates[i][1],
        coordinates[i + 1][0],
        coordinates[i + 1][1]
      );
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        closestSegmentIndex = i;
      }
    }
    const dangerThresholdMeters = hazard.radiusMeters * 1.05;
    if (minDistanceMeters <= dangerThresholdMeters) {
      const approxDistKm = (segmentCumulativeDists[closestSegmentIndex] || 0) / 1e3;
      intersected.push({
        hazardId: hazard.id,
        name: hazard.name,
        severity: hazard.severity,
        waterDepthCm: hazard.waterDepthCm,
        distanceFromStartKm: Math.round(approxDistKm * 10) / 10,
        minimumDistanceMeters: Math.round(minDistanceMeters),
        affectedSegmentIndex: closestSegmentIndex
      });
    }
  }
  return intersected;
}
function calculateRouteRiskScore(hazardsIntersected, hazards, vehicle, regionalRainMm) {
  let score = Math.min(15, Math.round(regionalRainMm / 50 * 12));
  if (!hazardsIntersected || hazardsIntersected.length === 0) {
    return {
      score: Math.max(5, score),
      category: "SAFE"
    };
  }
  for (const item of hazardsIntersected) {
    const hazard = hazards.find((h) => h.id === item.hazardId);
    if (!hazard) continue;
    const depthRatio = hazard.waterDepthCm / Math.max(10, vehicle.clearanceCm);
    const clearancePenalty = depthRatio >= 1 ? 1.6 : depthRatio >= 0.7 ? 1.2 : 0.8;
    const depthFactor = Math.min(45, hazard.waterDepthCm / 50 * 35 * clearancePenalty);
    const rainFactor = Math.min(25, hazard.rainfallIntensityMmPerHour / 50 * 20);
    const severityFactor = hazard.severity === "CRITICAL" ? 35 : hazard.severity === "HIGH" ? 26 : hazard.severity === "MODERATE" ? 16 : 8;
    score += depthFactor + rainFactor + severityFactor;
  }
  const finalScore = Math.min(99, Math.max(5, Math.round(score)));
  let category = "SAFE";
  if (finalScore >= 65) category = "HAZARDOUS";
  else if (finalScore >= 30) category = "CAUTION";
  return { score: finalScore, category };
}
function isBlockingHazard(h) {
  return h.severity === "CRITICAL" || h.severity === "HIGH" || h.waterDepthCm >= 30;
}
async function fetchOSRMRouteResult(waypoints, alternatives = true) {
  const results = [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8e3);
  try {
    const coordsStr = waypoints.map((c) => `${c[1]},${c[0]}`).join(";");
    const altParam = alternatives ? "alternatives=3" : "alternatives=false";
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&${altParam}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { routes: results, failed: true };
    }
    const data = await res.json();
    if (!data.routes || !Array.isArray(data.routes)) {
      return { routes: results, failed: false };
    }
    const snappedWaypoints = [];
    if (Array.isArray(data.waypoints)) {
      for (const wp of data.waypoints) {
        if (wp?.location && Array.isArray(wp.location) && wp.location.length >= 2) {
          snappedWaypoints.push([wp.location[1], wp.location[0]]);
        }
      }
    }
    for (const route of data.routes) {
      if (route.geometry?.coordinates?.length > 1) {
        const coords = route.geometry.coordinates.map(
          (c) => [c[1], c[0]]
        );
        results.push({
          coordinates: coords,
          distanceKm: Math.round(route.distance / 1e3 * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
          hazardsIntersected: [],
          source: "OSRM",
          snappedWaypoints
        });
      }
    }
    return { routes: results, failed: false, snappedWaypoints };
  } catch (err) {
    clearTimeout(timeoutId);
    return { routes: results, failed: true };
  }
}
function generateBypassWaypoints(origin, dest, hazard, activeHazards) {
  const waypoints = [];
  const dLat = dest[0] - origin[0];
  const dLon = dest[1] - origin[1];
  const len = Math.hypot(dLat, dLon) || 1e-3;
  const normLat = -dLon / len;
  const normLon = dLat / len;
  const offsetsMeters = [1800, 2800, 4e3, 5500];
  for (const distM of offsetsMeters) {
    const degLat = distM / 110540;
    const degLon = distM / (111320 * Math.cos(hazard.center[0] * Math.PI / 180));
    const p1 = [
      hazard.center[0] + normLat * degLat,
      hazard.center[1] + normLon * degLon
    ];
    const p2 = [
      hazard.center[0] - normLat * degLat,
      hazard.center[1] - normLon * degLon
    ];
    const p3 = [hazard.center[0] + degLat, hazard.center[1]];
    const p4 = [hazard.center[0] - degLat, hazard.center[1]];
    const p5 = [hazard.center[0], hazard.center[1] + degLon];
    const p6 = [hazard.center[0], hazard.center[1] - degLon];
    for (const pt of [p1, p2, p3, p4, p5, p6]) {
      const isInsideAnyHazard = activeHazards.some((h) => {
        const d = calculateDistanceMeters(pt[0], pt[1], h.center[0], h.center[1]);
        return d <= h.radiusMeters + 300;
      });
      if (!isInsideAnyHazard) {
        waypoints.push(pt);
      }
    }
  }
  return waypoints;
}
function inferCityFromCoordinates(lat, lon) {
  const cityEntries = [
    ["bengaluru", [12.9716, 77.5946]],
    ["chennai", [13.0827, 80.2707]],
    ["mumbai", [19.076, 72.8777]],
    ["delhi", [28.6139, 77.209]]
  ];
  let closest = "bengaluru";
  let minDist = Infinity;
  for (const [cId, coords] of cityEntries) {
    const d = calculateDistanceMeters(lat, lon, coords[0], coords[1]);
    if (d < minDist) {
      minDist = d;
      closest = cId;
    }
  }
  return closest;
}
async function calculateDualRoutes(origin, destination, hazards, vehicle, regionalRainMm = 32, _scenarioId, requestedCity) {
  const targetCity = (requestedCity || inferCityFromCoordinates(origin[0], origin[1])).toLowerCase();
  let osrmCallsFailed = false;
  const activeCityHazards = hazards.filter((h) => {
    let isActive = false;
    if (!h.status) {
      console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing status. Treating as ACTIVE.`);
      isActive = true;
    } else {
      isActive = h.status.toLowerCase() === "active";
    }
    if (!isActive) {
      return false;
    }
    let belongsToCity = false;
    if (!h.city) {
      console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city.`);
      const cityVb = CITY_VIEWBOXES[targetCity];
      if (cityVb && h.center) {
        const minLat = Math.min(cityVb.top, cityVb.bottom);
        const maxLat = Math.max(cityVb.top, cityVb.bottom);
        const minLon = Math.min(cityVb.left, cityVb.right);
        const maxLon = Math.max(cityVb.left, cityVb.right);
        const inside = h.center[0] >= minLat && h.center[0] <= maxLat && h.center[1] >= minLon && h.center[1] <= maxLon;
        if (inside) {
          belongsToCity = true;
        } else {
          console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city and coordinates outside ${targetCity} viewbox. Excluding.`);
        }
      } else {
        console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city and no viewbox found for city "${targetCity}". Excluding.`);
      }
    } else {
      belongsToCity = h.city.toLowerCase() === targetCity;
    }
    return belongsToCity;
  });
  console.log(`[ROUTING TRACE] Request: origin=[${origin[0]}, ${origin[1]}], dest=[${destination[0]}, ${destination[1]}], city=${targetCity}`);
  console.log(`[ROUTING TRACE] Active city hazards count: ${activeCityHazards.length} (filtered from ${hazards.length})`);
  const primaryResult = await fetchOSRMRouteResult([origin, destination], true);
  if (primaryResult.failed) {
    osrmCallsFailed = true;
  }
  const candidates = primaryResult.routes;
  if (candidates.length === 0) {
    throw new Error("Routing service unavailable");
  }
  for (const c of candidates) {
    c.hazardsIntersected = detectHazardIntersections(c.coordinates, activeCityHazards);
  }
  candidates.sort((a, b) => a.durationMinutes - b.durationMinutes);
  const fastestCandidate = candidates[0];
  const fastestHazards = fastestCandidate.hazardsIntersected;
  console.log(`[ROUTING TRACE] Fastest route: ${fastestCandidate.distanceKm} km, ${fastestCandidate.durationMinutes} min, intersected hazards: ${fastestHazards.length}`);
  fastestHazards.forEach((h) => {
    console.log(`  -> Fastest intersects: ${h.name} (${h.waterDepthCm} cm, min distance: ${h.minimumDistanceMeters}m)`);
  });
  let safeCandidate = null;
  const blockingOnFastest = fastestHazards.filter(isBlockingHazard);
  if (blockingOnFastest.length === 0) {
    safeCandidate = fastestCandidate;
  } else {
    const cleanAlternative = candidates.slice(1).find((c) => {
      return c.hazardsIntersected.filter(isBlockingHazard).length === 0;
    });
    if (cleanAlternative) {
      console.log(`[ROUTING TRACE] Found clean alternative route from OSRM alternatives: ${cleanAlternative.distanceKm} km`);
      safeCandidate = cleanAlternative;
    } else {
      console.log(`[ROUTING TRACE] Searching bypass corridors around ${blockingOnFastest.length} blocking hazard(s)...`);
      const evaluatedSafeCandidates = [];
      const severityRank = {
        CRITICAL: 4,
        HIGH: 3,
        MODERATE: 2,
        LOW: 1
      };
      blockingOnFastest.sort((a, b) => {
        const diffSev = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
        if (diffSev !== 0) return diffSev;
        return b.waterDepthCm - a.waterDepthCm;
      });
      const worstHazardMeta = activeCityHazards.find((h) => h.id === blockingOnFastest[0].hazardId);
      if (worstHazardMeta) {
        const bypassWaypoints = generateBypassWaypoints(origin, destination, worstHazardMeta, activeCityHazards);
        console.log(`[ROUTING TRACE] Generated ${bypassWaypoints.length} candidate bypass waypoints`);
        const cappedWaypoints = bypassWaypoints;
        const bypassResults = await Promise.all(
          cappedWaypoints.map((wp) => fetchOSRMRouteResult([origin, wp, destination], false))
        );
        for (const wpRes of bypassResults) {
          if (wpRes.failed) {
            osrmCallsFailed = true;
          }
          if (wpRes.routes.length > 0) {
            const r = wpRes.routes[0];
            if (r.source !== "OSRM" || !r.coordinates || r.coordinates.length < 2) {
              continue;
            }
            if (wpRes.snappedWaypoints && wpRes.snappedWaypoints.length >= 2) {
              const snappedBypass = wpRes.snappedWaypoints.length >= 3 ? wpRes.snappedWaypoints[1] : wpRes.snappedWaypoints[0];
              const isSnappedInsideHazard = activeCityHazards.some((h) => {
                const d = calculateDistanceMeters(snappedBypass[0], snappedBypass[1], h.center[0], h.center[1]);
                return d <= h.radiusMeters * 1.05;
              });
              if (isSnappedInsideHazard) {
                continue;
              }
            }
            const rHazards = detectHazardIntersections(r.coordinates, activeCityHazards);
            r.hazardsIntersected = rHazards;
            const hitsBlocking = rHazards.some((h) => isBlockingHazard(h));
            const hitsWorst = rHazards.some((h) => h.hazardId === worstHazardMeta.id);
            if (!hitsBlocking && !hitsWorst) {
              evaluatedSafeCandidates.push(r);
            }
          }
        }
      }
      if (evaluatedSafeCandidates.length > 0) {
        evaluatedSafeCandidates.sort((a, b) => {
          if (a.hazardsIntersected.length !== b.hazardsIntersected.length) {
            return a.hazardsIntersected.length - b.hazardsIntersected.length;
          }
          return a.durationMinutes - b.durationMinutes;
        });
        safeCandidate = evaluatedSafeCandidates[0];
      }
    }
  }
  let safeRouteFound = false;
  let finalSafeRoute = null;
  let noSafeRouteReason = null;
  if (safeCandidate) {
    const verifiedSafeHazards = detectHazardIntersections(safeCandidate.coordinates, activeCityHazards);
    const blockingHazardsOnSafe = verifiedSafeHazards.filter((h) => isBlockingHazard(h));
    if (blockingHazardsOnSafe.length === 0) {
      safeRouteFound = true;
      const safeRisk = calculateRouteRiskScore(verifiedSafeHazards, activeCityHazards, vehicle, regionalRainMm);
      let safeExplanation = "";
      if (verifiedSafeHazards.length === 0) {
        const avoidsCount = fastestHazards.length;
        safeExplanation = `Avoids ${avoidsCount} flood hazard(s). No known hazards on this route.`;
      } else {
        const avoidsBlockingCount = blockingOnFastest.length;
        const minorNames = verifiedSafeHazards.map((h) => h.name).join(", ");
        safeExplanation = `Avoids ${avoidsBlockingCount} blocking hazard(s). Minor hazards remain: ${minorNames}.`;
      }
      const isLongDetour = safeCandidate.durationMinutes > fastestCandidate.durationMinutes * 2.5;
      finalSafeRoute = {
        type: "SAFE",
        distanceKm: safeCandidate.distanceKm,
        durationMinutes: safeCandidate.durationMinutes,
        riskScore: safeRisk.score,
        riskCategory: safeRisk.category,
        coordinates: safeCandidate.coordinates,
        geometry: safeCandidate.coordinates,
        hazardsIntersected: verifiedSafeHazards,
        explanation: safeExplanation,
        longDetour: isLongDetour,
        source: "OSRM"
      };
    } else {
      console.warn(`[ROUTING SAFETY CHECK] Candidate safe route intersects blocking hazards:`, blockingHazardsOnSafe);
      safeRouteFound = false;
      finalSafeRoute = null;
      if (osrmCallsFailed) {
        noSafeRouteReason = "Couldn't verify an alternate route (routing service error). Try again.";
      } else {
        noSafeRouteReason = `No flood-safe alternate route found. All evaluated routes cross ${blockingHazardsOnSafe[0].name} (${blockingHazardsOnSafe[0].waterDepthCm} cm water depth).`;
      }
    }
  } else {
    safeRouteFound = false;
    finalSafeRoute = null;
    if (osrmCallsFailed) {
      noSafeRouteReason = "Couldn't verify an alternate route (routing service error). Try again.";
    } else if (blockingOnFastest.length > 0) {
      noSafeRouteReason = `No flood-safe alternate route found. All viable paths traverse ${blockingOnFastest[0].name} (${blockingOnFastest[0].waterDepthCm} cm water depth).`;
    } else {
      noSafeRouteReason = "No route available between the specified locations.";
    }
  }
  const fastestRisk = calculateRouteRiskScore(fastestHazards, activeCityHazards, vehicle, regionalRainMm);
  let fastestExplanation = "";
  if (fastestHazards.length === 0) {
    fastestExplanation = "No known hazards on this route.";
  } else if (blockingOnFastest.length === 0) {
    const minorNames = fastestHazards.map((h) => h.name).join(", ");
    fastestExplanation = `Minor hazards remain: ${minorNames}.`;
  } else {
    const blockingNames = blockingOnFastest.map((h) => `${h.name} (${h.waterDepthCm} cm)`).join(", ");
    const minorRemaining = fastestHazards.filter((h) => !isBlockingHazard(h));
    if (minorRemaining.length > 0) {
      const minorNames = minorRemaining.map((h) => h.name).join(", ");
      fastestExplanation = `Passes through ${blockingOnFastest.length} blocking hazard(s): ${blockingNames}. Minor hazards remain: ${minorNames}.`;
    } else {
      fastestExplanation = `Passes through ${blockingOnFastest.length} blocking hazard(s): ${blockingNames}.`;
    }
  }
  const finalFastestRoute = {
    type: "FASTEST",
    distanceKm: fastestCandidate.distanceKm,
    durationMinutes: fastestCandidate.durationMinutes,
    riskScore: fastestRisk.score,
    riskCategory: fastestRisk.category,
    coordinates: fastestCandidate.coordinates,
    geometry: fastestCandidate.coordinates,
    hazardsIntersected: fastestHazards,
    explanation: fastestExplanation,
    source: "OSRM"
  };
  const avoidedHazardsCount = finalSafeRoute ? Math.max(0, fastestHazards.length - finalSafeRoute.hazardsIntersected.length) : 0;
  const timeDeltaMinutes = finalSafeRoute ? Math.max(0, finalSafeRoute.durationMinutes - finalFastestRoute.durationMinutes) : 0;
  const distanceDeltaKm = finalSafeRoute ? Math.round((finalSafeRoute.distanceKm - finalFastestRoute.distanceKm) * 10) / 10 : 0;
  const riskDeltaPercent = finalSafeRoute && fastestRisk.score > 0 ? Math.round((finalSafeRoute.riskScore - fastestRisk.score) / fastestRisk.score * 100) : 0;
  let safetySummary = "";
  if (!safeRouteFound) {
    safetySummary = noSafeRouteReason || "No flood-safe alternate route found.";
  } else if (avoidedHazardsCount > 0) {
    const worst = blockingOnFastest[0] || fastestHazards[0];
    safetySummary = `Fastest route leads directly through ${worst.name} (${worst.waterDepthCm} cm water depth). Verified safe detour adds ${timeDeltaMinutes} min (+${distanceDeltaKm} km) and completely avoids all critical flood zones.`;
  } else {
    safetySummary = "Both routes operate within safe thresholds. Maintain wet-weather caution.";
  }
  console.log(`[ROUTING RESULT] safeRouteFound=${safeRouteFound}, avoidedHazardsCount=${avoidedHazardsCount}`);
  if (finalSafeRoute) {
    console.log(`[ROUTING RESULT] Safe route verified: ${finalSafeRoute.distanceKm} km, hazards: ${finalSafeRoute.hazardsIntersected.length}, longDetour=${finalSafeRoute.longDetour}`);
  }
  return {
    fastest: finalFastestRoute,
    safe: finalSafeRoute,
    safeRouteFound,
    noSafeRouteReason,
    riskDeltaPercent,
    timeDeltaMinutes,
    distanceDeltaKm,
    avoidedHazardsCount,
    safetySummary,
    vehicleProfile: vehicle
  };
}

// src/server/adapters/routingAdapter.ts
var RoutingAdapter = class {
  /**
   * Deterministic routing engine proxy.
   * AI MUST NOT calculate numerical risk scores or perform coordinate geometry.
   * The existing deterministic routing/risk engine remains the sole authority.
   */
  async calculateRoutes(params) {
    const { origin, destination, vehicleId, scenarioId, hazards, rainfallMmPerHour, city } = params;
    let vehicle = VEHICLE_PROFILES.find((v) => v.id === vehicleId) || VEHICLE_PROFILES[0];
    if (params.vehicleClearanceCm && params.vehicleClearanceCm > 0) {
      vehicle = {
        ...vehicle,
        clearanceCm: params.vehicleClearanceCm
      };
    }
    return calculateDualRoutes(
      origin,
      destination,
      hazards,
      vehicle,
      rainfallMmPerHour,
      scenarioId,
      city
    );
  }
};
var routingAdapterInstance = null;
function getRoutingAdapter() {
  if (!routingAdapterInstance) {
    routingAdapterInstance = new RoutingAdapter();
  }
  return routingAdapterInstance;
}

// src/server/handlers/routeHandler.ts
async function handleRouteCalculation(body) {
  const startTime = Date.now();
  try {
    const { origin, destination, vehicleId, scenarioId, city = "bengaluru", vehicleClearanceCm } = body;
    logStructured({
      event: "ROUTE_REQUEST",
      city,
      origin: origin ? `[${origin[0]}, ${origin[1]}]` : void 0,
      destination: destination ? `[${destination[0]}, ${destination[1]}]` : void 0,
      vehicleId,
      scenarioId
    });
    if (!origin || !destination) {
      return {
        statusCode: 400,
        data: { error: "Origin and destination coordinates are required" }
      };
    }
    const hazardRepo = getHazardRepository();
    const weatherAdapter = getWeatherAdapter();
    const routingAdapter = getRoutingAdapter();
    const [activeHazards, weather] = await Promise.all([
      hazardRepo.getActiveHazards(city),
      weatherAdapter.getWeather(city)
    ]);
    const result = await routingAdapter.calculateRoutes({
      origin,
      destination,
      vehicleId,
      vehicleClearanceCm,
      scenarioId,
      hazards: activeHazards,
      rainfallMmPerHour: weather.rainfallMmPerHour,
      city
    });
    logStructured({
      event: "SAFE_ROUTE_VALIDATION",
      city,
      safeRouteFound: result.safeRouteFound,
      avoidedHazardsCount: result.avoidedHazardsCount,
      fastestIntersections: result.fastest.hazardsIntersected.length,
      safeIntersections: result.safe ? result.safe.hazardsIntersected.length : 0,
      noSafeRouteReason: result.noSafeRouteReason || null
    });
    logStructured({
      event: "ROUTE_RESPONSE",
      city,
      statusCode: 200,
      executionTimeMs: Date.now() - startTime,
      fastestDistanceKm: result.fastest.distanceKm,
      safeDistanceKm: result.safe?.distanceKm,
      timeDeltaMinutes: result.timeDeltaMinutes
    });
    return {
      statusCode: 200,
      data: result
    };
  } catch (err) {
    logStructured({
      event: "ROUTE_RESPONSE",
      statusCode: 503,
      executionTimeMs: Date.now() - startTime,
      error: err?.message || "Routing service unavailable"
    });
    return {
      statusCode: 503,
      data: { error: err?.message || "Routing service unavailable" }
    };
  }
}

// src/server/handlers/hazardsHandler.ts
async function handleGetHazards(cityId) {
  const hazardRepo = getHazardRepository();
  const hazards = await hazardRepo.getActiveHazards(cityId);
  return {
    statusCode: 200,
    data: hazards
  };
}
async function handleResetHazards() {
  const hazardRepo = getHazardRepository();
  await hazardRepo.resetHazards();
  const hazards = await hazardRepo.getActiveHazards();
  return {
    statusCode: 200,
    data: { success: true, count: hazards.length }
  };
}
async function handleSeedHazards(cityId) {
  const hazardRepo = getHazardRepository();
  const result = await hazardRepo.seedHazardsIdempotent(cityId);
  return {
    statusCode: 200,
    data: {
      success: true,
      storageMode: hazardRepo.isUsingDynamoDB() ? "DYNAMODB" : "IN_MEMORY",
      ...result
    }
  };
}

// src/server/services/bedrockService.ts
import { GoogleGenAI } from "@google/genai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
var BedrockService = class {
  constructor(region = process.env.AWS_REGION || "ap-south-1", modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0") {
    this.client = null;
    this.geminiClient = null;
    this.modelId = modelId;
    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiClient = new GoogleGenAI();
      } catch {
        this.geminiClient = null;
      }
    }
    const hasAwsCreds = Boolean(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_LAMBDA_FUNCTION_NAME
    );
    if (hasAwsCreds) {
      try {
        this.client = new BedrockRuntimeClient({ region });
        console.log(`[BedrockService] Initialized with AWS Bedrock client (Region: ${region}, Model: ${modelId})`);
      } catch (err) {
        logStructured({
          event: "BEDROCK_ERROR",
          operation: "initialization",
          error: err?.message || "Failed to initialize BedrockRuntimeClient"
        });
        this.client = null;
      }
    }
  }
  /**
   * Validates flood image using Amazon Bedrock, Gemini AI, or robust fallback heuristics.
   * Invariant: NEVER affects route calculation or safe-route validation.
   */
  async validateFloodImage(imageBase64, reportedDepthCm = 35, userNotes = "") {
    const prompt = `Analyze this citizen-submitted photograph for road flooding and urban waterlogging hazards.
Strictly return a valid JSON object matching this schema:
{
  "isFlooded": boolean,
  "confidence": number, // 0 to 100
  "estimatedSeverity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "estimatedWaterDepthCm": number,
  "estimatedDepthCategory": "SPLASH" | "ANKLE_DEEP" | "KNEE_DEEP" | "VEHICLE_SUBMERGED",
  "indicators": string[],
  "reasoning": string,
  "recommendedAction": string
}`;
    if (this.client && imageBase64 && imageBase64.includes("base64,")) {
      try {
        logStructured({
          event: "BEDROCK_REQUEST",
          operation: "validateFloodImage",
          modelId: this.modelId
        });
        const mimeType = imageBase64.substring(5, imageBase64.indexOf(";"));
        const base64Data = imageBase64.substring(imageBase64.indexOf("base64,") + 7);
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType || "image/jpeg",
                    data: base64Data
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        };
        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });
        const response = await this.client.send(command, {
          abortSignal: AbortSignal.timeout(1e4)
        });
        const responseJson = JSON.parse(new TextDecoder().decode(response.body));
        const textContent = responseJson.content?.[0]?.text;
        if (textContent) {
          const parsed = JSON.parse(textContent);
          return {
            isFlooded: Boolean(parsed.isFlooded),
            confidence: Math.min(99, Math.max(70, Number(parsed.confidence) || 92)),
            estimatedSeverity: parsed.estimatedSeverity || (reportedDepthCm >= 40 ? "CRITICAL" : "HIGH"),
            estimatedWaterDepthCm: Number(parsed.estimatedWaterDepthCm) || reportedDepthCm,
            estimatedDepthCategory: parsed.estimatedDepthCategory || "KNEE_DEEP",
            indicators: parsed.indicators || ["Standing water on asphalt", "Road surface reflection"],
            reasoning: parsed.reasoning || "Visible water accumulation on road carriage lanes.",
            recommendedAction: parsed.recommendedAction || "Divert passenger vehicles to elevated corridor.",
            analysisSource: "BEDROCK_AI"
          };
        }
      } catch (err) {
        logStructured({
          event: "BEDROCK_ERROR",
          operation: "validateFloodImage",
          modelId: this.modelId,
          error: err?.message || "Bedrock invocation failed",
          errorType: err?.name || "Unknown"
        });
      }
    }
    if (this.geminiClient && imageBase64 && imageBase64.includes("base64,")) {
      try {
        const mimeType = imageBase64.substring(5, imageBase64.indexOf(";")) || "image/jpeg";
        const base64Data = imageBase64.substring(imageBase64.indexOf("base64,") + 7);
        const response = await this.geminiClient.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            {
              text: prompt
            }
          ]
        });
        const textContent = response.text;
        if (textContent) {
          const cleanJson = textContent.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJson);
          return {
            isFlooded: Boolean(parsed.isFlooded),
            confidence: Math.min(99, Math.max(70, Number(parsed.confidence) || 92)),
            estimatedSeverity: parsed.estimatedSeverity || (reportedDepthCm >= 40 ? "CRITICAL" : "HIGH"),
            estimatedWaterDepthCm: Number(parsed.estimatedWaterDepthCm) || reportedDepthCm,
            estimatedDepthCategory: parsed.estimatedDepthCategory || "KNEE_DEEP",
            indicators: parsed.indicators || ["Standing water on asphalt", "Road surface reflection"],
            reasoning: parsed.reasoning || "Visible water accumulation on road carriage lanes.",
            recommendedAction: parsed.recommendedAction || "Divert passenger vehicles to elevated corridor.",
            analysisSource: "GEMINI_AI"
          };
        }
      } catch {
      }
    }
    return this.fallbackHeuristicValidation(reportedDepthCm, userNotes);
  }
  /**
   * Generates natural language driver safety briefing using Amazon Bedrock, Gemini AI, or deterministic templates.
   * Invariant: NEVER alters route geometry or route risk classification.
   */
  async generateSafetyBriefing(fastestHazards, timeDelta = 6, distanceDelta = 2.4, vehicleName = "Sedan") {
    if (!fastestHazards || fastestHazards.length === 0) {
      return {
        briefing: "All primary arterial corridors are operating within safe seasonal thresholds. Maintain wet-weather caution.",
        briefingSource: "DETERMINISTIC_RULES"
      };
    }
    const hazardSummary = fastestHazards.map((h) => `${h.name} (${h.waterDepthCm} cm water depth, ${h.severity} hazard)`).join(", ");
    const prompt = `You are the navigation safety briefing engine for ClimatePulse AI ("Fastest isn't always safest").
The fastest route traverses these flood chokepoints: ${hazardSummary}.
The vehicle is a ${vehicleName}.
The safe alternative adds +${timeDelta} minutes and +${distanceDelta} km.
Write a 2-sentence urgent, driver-friendly safety briefing explaining why taking the safe detour is strongly advised.`;
    if (this.client) {
      try {
        logStructured({
          event: "BEDROCK_REQUEST",
          operation: "generateSafetyBriefing",
          modelId: this.modelId
        });
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 250,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: prompt }]
            }
          ]
        };
        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });
        const response = await this.client.send(command, {
          abortSignal: AbortSignal.timeout(8e3)
        });
        const responseJson = JSON.parse(new TextDecoder().decode(response.body));
        const textContent = responseJson.content?.[0]?.text;
        if (textContent) {
          return {
            briefing: textContent.trim(),
            briefingSource: "BEDROCK_AI"
          };
        }
      } catch (err) {
        logStructured({
          event: "BEDROCK_ERROR",
          operation: "generateSafetyBriefing",
          modelId: this.modelId,
          error: err?.message || "Bedrock briefing failed",
          errorType: err?.name || "Unknown"
        });
      }
    }
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt
        });
        if (response.text) {
          return {
            briefing: response.text.trim(),
            briefingSource: "GEMINI_AI"
          };
        }
      } catch {
      }
    }
    const worst = fastestHazards[0];
    const isTwoWheeler = vehicleName.toLowerCase().includes("bike") || vehicleName.toLowerCase().includes("two");
    const clearanceNote = isTwoWheeler ? "Two-wheelers face critical danger of concealed open storm drains and loss of traction." : `Water level (${worst.waterDepthCm} cm) creates extreme risk of engine hydrostatic lock and vehicle stranding.`;
    return {
      briefing: `The fastest route leads directly through ${worst.name} with ${worst.waterDepthCm} cm deep floodwater. ${clearanceNote} ClimatePulse recommends the elevated bypass (+${timeDelta} min, +${distanceDelta} km) for safe passage.`,
      briefingSource: "DETERMINISTIC_RULES"
    };
  }
  fallbackHeuristicValidation(reportedDepthCm, userNotes) {
    let category = "KNEE_DEEP";
    let severity = "HIGH";
    let indicators = [];
    let confidence = 91;
    if (reportedDepthCm >= 45) {
      category = "VEHICLE_SUBMERGED";
      severity = "CRITICAL";
      indicators = [
        "Water level exceeding hubcap line",
        "Continuous inundation across carriage lanes",
        "Severe hydrostatic lock warning for passenger vehicles"
      ];
      confidence = 96;
    } else if (reportedDepthCm >= 25) {
      category = "KNEE_DEEP";
      severity = "HIGH";
      indicators = [
        "Standing ponding with submerged road curb stones",
        "Surface ripples and storm channel backflow",
        "Vehicles forced to slow to crawl or divert"
      ];
      confidence = 92;
    } else {
      category = "ANKLE_DEEP";
      severity = "MODERATE";
      indicators = [
        "Surface water ponding along roadway shoulder",
        "Hydroplaning hazard on outer travel lanes"
      ];
      confidence = 85;
    }
    return {
      isFlooded: true,
      confidence,
      estimatedSeverity: severity,
      estimatedWaterDepthCm: reportedDepthCm,
      estimatedDepthCategory: category,
      indicators,
      reasoning: userNotes || "Empirical water depth and curb submersion indicators confirmed.",
      recommendedAction: severity === "CRITICAL" ? "Road impassable for light vehicles. Divert immediately." : "Proceed with extreme caution or use elevated detour.",
      analysisSource: "FALLBACK_HEURISTIC"
    };
  }
};
var bedrockInstance = null;
function getBedrockService() {
  if (!bedrockInstance) {
    bedrockInstance = new BedrockService();
  }
  return bedrockInstance;
}

// src/server/repositories/reportRepository.ts
import { DynamoDBClient as DynamoDBClient2 } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient as DynamoDBDocumentClient2, PutCommand as PutCommand2, ScanCommand as ScanCommand2 } from "@aws-sdk/lib-dynamodb";
var INITIAL_SAMPLE_REPORTS = [
  {
    id: "report-sample-1",
    city: "bengaluru",
    location: [12.9177, 77.6238],
    address: "Silk Board Junction Underpass, Outer Ring Road",
    detectedFloodIndicators: [
      "Standing water covering roadway surface (>30 cm)",
      "Submerged wheel rims on two hatchback vehicles",
      "Water ripples from stalled traffic"
    ],
    estimatedDepth: "KNEE_DEEP",
    waterDepthCm: 48,
    bedrockConfidenceScore: 94,
    status: "VERIFIED",
    submittedAt: new Date(Date.now() - 15 * 60 * 1e3).toISOString(),
    userNotes: "Submerged service lane. Sedans stalling when attempting to pass under the metro flyover."
  },
  {
    id: "report-sample-2",
    city: "mumbai",
    location: [19.0838, 72.8427],
    address: "Milan Subway Underpass, Santacruz",
    detectedFloodIndicators: [
      "High water line against bridge pillar markings (approx 55 cm)",
      "Police yellow barricade floating in standing pool",
      "Completely submerged pedestrian sidewalk curb"
    ],
    estimatedDepth: "VEHICLE_SUBMERGED",
    waterDepthCm: 55,
    bedrockConfidenceScore: 98,
    status: "VERIFIED",
    submittedAt: new Date(Date.now() - 32 * 60 * 1e3).toISOString(),
    userNotes: "Water up to waist level inside subway bowl. Subway completely barricaded."
  }
];
var InMemoryReportRepository = class {
  constructor() {
    this.reports = [...INITIAL_SAMPLE_REPORTS];
  }
  async getReports(cityId) {
    if (!cityId) return [...this.reports];
    return this.reports.filter((r) => r.city.toLowerCase() === cityId.toLowerCase());
  }
  async createReport(report) {
    this.reports.unshift(report);
    return report;
  }
  isUsingDynamoDB() {
    return false;
  }
};
var DynamoDBReportRepository = class {
  constructor(region = process.env.AWS_REGION || "ap-south-1", tableName = process.env.REPORT_TABLE_NAME || "ClimatePulse-Reports") {
    const ddbClient = new DynamoDBClient2({ region });
    this.docClient = DynamoDBDocumentClient2.from(ddbClient);
    this.tableName = tableName;
    this.fallbackMemoryRepo = new InMemoryReportRepository();
  }
  async getReports(cityId) {
    try {
      const command = new ScanCommand2({
        TableName: this.tableName,
        Limit: 50
      });
      const result = await this.docClient.send(command);
      if (result.Items && result.Items.length > 0) {
        const mapped = result.Items.map((item) => ({
          id: item.reportId,
          city: item.cityId,
          location: [item.lat, item.lon],
          address: item.address,
          imageUrl: item.imageUrl,
          detectedFloodIndicators: item.detectedIndicators || [],
          estimatedDepth: item.estimatedDepth || "KNEE_DEEP",
          waterDepthCm: item.waterDepthCm || 35,
          bedrockConfidenceScore: item.confidenceScore || 90,
          status: item.status || "VERIFIED",
          submittedAt: item.submittedAt || (/* @__PURE__ */ new Date()).toISOString(),
          userNotes: item.userNotes || ""
        }));
        if (cityId) {
          return mapped.filter((r) => r.city.toLowerCase() === cityId.toLowerCase());
        }
        return mapped;
      }
      return this.fallbackMemoryRepo.getReports(cityId);
    } catch (err) {
      logStructured({
        event: "DYNAMODB_ERROR",
        table: this.tableName,
        operation: "getReports",
        error: err?.message || "DynamoDB getReports failed",
        city: cityId
      });
      return this.fallbackMemoryRepo.getReports(cityId);
    }
  }
  async createReport(report) {
    const safeImageUrl = report.imageUrl && report.imageUrl.length > 300 ? `metadata:image-verified-hash-${report.id}` : report.imageUrl;
    const item = {
      PK: `REPORT#${report.id}`,
      SK: report.submittedAt || (/* @__PURE__ */ new Date()).toISOString(),
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
        new PutCommand2({
          TableName: this.tableName,
          Item: item
        })
      );
    } catch (err) {
      logStructured({
        event: "DYNAMODB_ERROR",
        table: this.tableName,
        operation: "createReport",
        error: err?.message || "DynamoDB createReport failed",
        reportId: report.id
      });
    }
    await this.fallbackMemoryRepo.createReport(report);
    return report;
  }
  isUsingDynamoDB() {
    return true;
  }
};
var reportRepoInstance = null;
function getReportRepository() {
  if (!reportRepoInstance) {
    const hasAwsCreds = Boolean(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_LAMBDA_FUNCTION_NAME
    );
    if (hasAwsCreds) {
      reportRepoInstance = new DynamoDBReportRepository();
      console.log(`[ReportRepository] Initialized with DynamoDB (Table: ${process.env.REPORT_TABLE_NAME || "ClimatePulse-Reports"})`);
    } else {
      reportRepoInstance = new InMemoryReportRepository();
      console.log("[ReportRepository] Initialized with InMemory store (Local/Dev Fallback Active)");
    }
  }
  return reportRepoInstance;
}

// src/server/handlers/reportHandler.ts
async function handleGetReports(cityId) {
  const reportRepo = getReportRepository();
  const reports = await reportRepo.getReports(cityId);
  return {
    statusCode: 200,
    data: reports
  };
}
async function handleCreateReport(body) {
  const {
    city = "bengaluru",
    location,
    address = "Reported Location",
    imageBase64,
    userNotes = "",
    waterDepthCm = 35
  } = body;
  if (!location || !Array.isArray(location) || location.length !== 2) {
    return {
      statusCode: 400,
      data: { error: "Valid GPS coordinates [lat, lon] are required" }
    };
  }
  const bedrockService = getBedrockService();
  const hazardRepo = getHazardRepository();
  const reportRepo = getReportRepository();
  const validation = await bedrockService.validateFloodImage(
    imageBase64,
    Number(waterDepthCm) || 35,
    userNotes
  );
  const reportId = `report-${Date.now()}`;
  const newReport = {
    id: reportId,
    city,
    location: [location[0], location[1]],
    address,
    imageUrl: imageBase64 ? imageBase64.slice(0, 500) + "..." : void 0,
    detectedFloodIndicators: validation.indicators,
    estimatedDepth: validation.estimatedDepthCategory,
    waterDepthCm: validation.estimatedWaterDepthCm,
    bedrockConfidenceScore: validation.confidence,
    status: "VERIFIED",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
    userNotes: userNotes || `${validation.analysisSource.replace("_", " ")} verified waterlogging report.`
  };
  await reportRepo.createReport(newReport);
  const newHazard = {
    id: `hazard-citizen-${Date.now()}`,
    city,
    name: address.length > 5 ? address : `Citizen Reported Hazard (${validation.estimatedWaterDepthCm} cm)`,
    roadName: address,
    center: [location[0], location[1]],
    radiusMeters: Math.min(500, Math.max(250, validation.estimatedWaterDepthCm * 8)),
    severity: validation.estimatedSeverity,
    waterDepthCm: validation.estimatedWaterDepthCm,
    rainfallIntensityMmPerHour: 35,
    riskWeight: validation.estimatedSeverity === "CRITICAL" ? 0.95 : 0.75,
    source: "CITIZEN_REPORT",
    verified: true,
    reportedAt: "Just now",
    notes: `Citizen Report (${validation.analysisSource.replace("_", " ")} verified with ${validation.confidence}% confidence). ${userNotes}`
  };
  await hazardRepo.addHazard(newHazard);
  const allHazards = await hazardRepo.getActiveHazards(city);
  return {
    statusCode: 200,
    data: {
      success: true,
      report: newReport,
      hazard: newHazard,
      validation,
      totalActiveHazards: allHazards.length
    }
  };
}

// src/server/handlers/briefingHandler.ts
async function handleGenerateBriefing(body) {
  const { fastestHazards, timeDelta = 6, distanceDelta = 2.4, vehicleName = "Sedan" } = body;
  const bedrockService = getBedrockService();
  const result = await bedrockService.generateSafetyBriefing(
    fastestHazards || [],
    timeDelta,
    distanceDelta,
    vehicleName
  );
  return {
    statusCode: 200,
    data: result
  };
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.get("/api/hazards", async (req, res) => {
  const city = req.query.city || req.query.cityId || "";
  const result = await handleGetHazards(city);
  return res.status(result.statusCode).json(result.data);
});
app.get("/api/reports", async (req, res) => {
  const city = req.query.city || req.query.cityId || "";
  const result = await handleGetReports(city);
  return res.status(result.statusCode).json(result.data);
});
app.post("/api/route", async (req, res) => {
  const result = await handleRouteCalculation(req.body);
  return res.status(result.statusCode).json(result.data);
});
app.get("/api/weather", async (req, res) => {
  const city = (req.query.city || "bengaluru").toLowerCase();
  const weatherAdapter = getWeatherAdapter();
  const weather = await weatherAdapter.getWeather(city);
  return res.json(weather);
});
var reportController = async (req, res) => {
  const result = await handleCreateReport(req.body);
  return res.status(result.statusCode).json(result.data);
};
app.post("/api/report", reportController);
app.post("/api/reports/verify", reportController);
app.post("/api/ai-briefing", async (req, res) => {
  const result = await handleGenerateBriefing(req.body);
  return res.status(result.statusCode).json(result.data);
});
app.post("/api/reset-hazards", async (req, res) => {
  const result = await handleResetHazards();
  return res.status(result.statusCode).json(result.data);
});
app.post("/api/hazards/seed", async (req, res) => {
  const city = req.query.city || req.body?.city || "";
  const result = await handleSeedHazards(city);
  return res.status(result.statusCode).json(result.data);
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ClimatePulse AI] Server active on http://0.0.0.0:${PORT}`);
    const missingCityCount = INITIAL_HAZARDS.filter((h) => !h.city).length;
    const missingStatusCount = INITIAL_HAZARDS.filter((h) => !h.status).length;
    console.log(
      `[STARTUP CHECK] Seeded hazards: ${INITIAL_HAZARDS.length} total. Missing city: ${missingCityCount}, Missing status: ${missingStatusCount}.`
    );
  });
}
startServer();
