import { HazardZone, PresetScenario, VehicleProfile, CityWeather } from '../types';

export const VEHICLE_PROFILES: VehicleProfile[] = [
  {
    id: 'sedan',
    name: 'Sedan / Hatchback',
    clearanceCm: 16,
    description: 'Low ground clearance. Engine hydrostatic lock risk at >20 cm water.'
  },
  {
    id: 'suv',
    name: 'SUV / Crossover',
    clearanceCm: 22,
    description: 'Moderate ground clearance. Safe in ponding up to ~25 cm.'
  },
  {
    id: 'twowheeler',
    name: 'Two-Wheeler / Bike',
    clearanceCm: 14,
    description: 'Extremely vulnerable to hidden potholes and open storm drains at >10 cm.'
  },
  {
    id: 'commercial',
    name: 'Commercial / Bus',
    clearanceCm: 35,
    description: 'High ground clearance. Can navigate moderate flooding up to ~35 cm.'
  }
];

export const INITIAL_WEATHER: Record<string, CityWeather> = {
  bengaluru: {
    city: 'bengaluru',
    cityName: 'Bengaluru',
    rainfallMmPerHour: 34.2,
    precipitationProbability: 88,
    temperatureC: 22.4,
    weatherCondition: 'Heavy Monsoon Downpour',
    alertLevel: 'WARNING',
    alertMessage: 'Red alert for Bellandur & Silk Board basins. Severe waterlogging at arterial underpasses.'
  },
  mumbai: {
    city: 'mumbai',
    cityName: 'Mumbai',
    rainfallMmPerHour: 48.0,
    precipitationProbability: 95,
    temperatureC: 26.1,
    weatherCondition: 'Torrential Coastal Rain',
    alertLevel: 'EMERGENCY',
    alertMessage: 'High tide coinciding with cloudburst. Milan & Andheri subways closed to low vehicles.'
  },
  delhi: {
    city: 'delhi',
    cityName: 'Delhi NCR',
    rainfallMmPerHour: 28.5,
    precipitationProbability: 76,
    temperatureC: 27.8,
    weatherCondition: 'Intense Thunderstorms',
    alertLevel: 'WARNING',
    alertMessage: 'Minto Bridge and Pul Prahladpur submerged; traffic police advising ring road diversion.'
  },
  chennai: {
    city: 'chennai',
    cityName: 'Chennai',
    rainfallMmPerHour: 38.6,
    precipitationProbability: 85,
    temperatureC: 25.5,
    weatherCondition: 'Depression / Northeast Monsoon',
    alertLevel: 'WARNING',
    alertMessage: 'Velachery lake catchment overflowing into residential corridors; arterial bottlenecks.'
  }
};

export const INITIAL_HAZARDS: HazardZone[] = [
  // BENGALURU
  {
    id: 'blr-silk-board',
    city: 'bengaluru',
    name: 'Silk Board Junction Underpass',
    roadName: 'Hosur Road / Outer Ring Road',
    center: [12.9177, 77.6238],
    radiusMeters: 450,
    severity: 'CRITICAL',
    waterDepthCm: 48,
    rainfallIntensityMmPerHour: 42,
    riskWeight: 0.95,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '12 mins ago',
    notes: 'Severe stormwater drain overflow. 3 vehicles stalled. Water reaches above bumper height.'
  },
  {
    id: 'blr-bellandur',
    city: 'bengaluru',
    name: 'Bellandur Lake Spillway & ORR',
    roadName: 'Outer Ring Road (near Ecospace)',
    center: [12.9298, 77.6745],
    radiusMeters: 550,
    severity: 'HIGH',
    waterDepthCm: 36,
    rainfallIntensityMmPerHour: 38,
    riskWeight: 0.85,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '25 mins ago',
    notes: 'Lake outflow inundating service lanes and left carriageway. Heavy traffic crawling.'
  },
  {
    id: 'blr-hebbal',
    city: 'bengaluru',
    name: 'Hebbal Flyover Loops & Underpass',
    roadName: 'Airport Expressway (Bellary Rd)',
    center: [13.0359, 77.5970],
    radiusMeters: 380,
    severity: 'MODERATE',
    waterDepthCm: 22,
    rainfallIntensityMmPerHour: 24,
    riskWeight: 0.60,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: '38 mins ago',
    notes: 'Ponding on left lanes causing hydroplaning risk at speed.'
  },
  {
    id: 'blr-marathahalli',
    city: 'bengaluru',
    name: 'Marathahalli Multiplex Underpass',
    roadName: 'HAL Old Airport Road',
    center: [12.9554, 77.7011],
    radiusMeters: 320,
    severity: 'HIGH',
    waterDepthCm: 32,
    rainfallIntensityMmPerHour: 35,
    riskWeight: 0.80,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: '18 mins ago',
    notes: 'Submerged dip under railway bridge. Two-wheelers turned back.'
  },

  // MUMBAI
  {
    id: 'bom-milan-subway',
    city: 'mumbai',
    name: 'Milan Subway Underpass',
    roadName: 'Western Express Highway Connecting Arm',
    center: [19.0838, 72.8427],
    radiusMeters: 400,
    severity: 'CRITICAL',
    waterDepthCm: 55,
    rainfallIntensityMmPerHour: 52,
    riskWeight: 0.98,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '8 mins ago',
    notes: 'Pump capacity exceeded. Water depth exceeding 1.8 feet. Submerged police barricades.'
  },
  {
    id: 'bom-hindmata',
    city: 'mumbai',
    name: 'Hindmata Cinema TT Circle',
    roadName: 'Dr Babasaheb Ambedkar Road',
    center: [19.0094, 72.8428],
    radiusMeters: 500,
    severity: 'CRITICAL',
    waterDepthCm: 45,
    rainfallIntensityMmPerHour: 46,
    riskWeight: 0.92,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '15 mins ago',
    notes: 'Low-lying basin completely inundated. BEST buses diverting to flyover.'
  },
  {
    id: 'bom-andheri-subway',
    city: 'mumbai',
    name: 'Andheri Subway',
    roadName: 'SV Road / Railway Underpass',
    center: [19.1197, 72.8464],
    radiusMeters: 350,
    severity: 'CRITICAL',
    waterDepthCm: 50,
    rainfallIntensityMmPerHour: 49,
    riskWeight: 0.95,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: '22 mins ago',
    notes: 'Completely closed by traffic authorities due to high inundation.'
  },

  // DELHI
  {
    id: 'del-minto-bridge',
    city: 'delhi',
    name: 'Minto Bridge Underpass',
    roadName: 'Deen Dayal Upadhyay Marg / CP Ring',
    center: [28.6341, 77.2274],
    radiusMeters: 300,
    severity: 'CRITICAL',
    waterDepthCm: 60,
    rainfallIntensityMmPerHour: 38,
    riskWeight: 0.98,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '10 mins ago',
    notes: 'Flash water accumulation under rail bridge. Depth indicator showing 2 feet.'
  },
  {
    id: 'del-ito',
    city: 'delhi',
    name: 'ITO Ring Road & Vikas Marg Intersection',
    roadName: 'IP Estate / Vikas Marg',
    center: [28.6290, 77.2435],
    radiusMeters: 450,
    severity: 'HIGH',
    waterDepthCm: 35,
    rainfallIntensityMmPerHour: 34,
    riskWeight: 0.82,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '20 mins ago',
    notes: 'Drainage outflow backwash from Yamuna barrage. Extreme congestion.'
  },
  {
    id: 'del-prahladpur',
    city: 'delhi',
    name: 'Pul Prahladpur Underpass',
    roadName: 'Mehrauli-Badarpur Road',
    center: [28.5085, 77.2882],
    radiusMeters: 400,
    severity: 'CRITICAL',
    waterDepthCm: 52,
    rainfallIntensityMmPerHour: 36,
    riskWeight: 0.94,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: '30 mins ago',
    notes: 'Water level reached window line of stalled autorickshaw. Avoid at all costs.'
  },

  // CHENNAI
  {
    id: 'che-velachery',
    city: 'chennai',
    name: 'Velachery Bypass & Lake Spillway',
    roadName: 'Velachery Main Road',
    center: [12.9784, 80.2185],
    radiusMeters: 550,
    severity: 'CRITICAL',
    waterDepthCm: 48,
    rainfallIntensityMmPerHour: 40,
    riskWeight: 0.92,
    source: 'OFFICIAL_SENSOR',
    verified: true,
    reportedAt: '14 mins ago',
    notes: 'Lake catchment overflow over main carriageway. Water depth 1.5 ft.'
  },
  {
    id: 'che-madipakkam',
    city: 'chennai',
    name: 'Madipakkam Ram Nagar Lowlands',
    roadName: 'Bazaar Road / Inner Link',
    center: [12.9652, 80.1989],
    radiusMeters: 400,
    severity: 'HIGH',
    waterDepthCm: 38,
    rainfallIntensityMmPerHour: 36,
    riskWeight: 0.85,
    source: 'CITIZEN_REPORT',
    verified: true,
    reportedAt: '35 mins ago',
    notes: 'Continuous waterlogging. Street drains concealed by surface water.'
  }
];

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'bengaluru-silkboard',
    city: 'bengaluru',
    title: 'Koramangala to Electronic City',
    tagline: 'Avoids 48 cm flooded Silk Board underpass via BTM / Hosur Elevated Bypass',
    hazardHotspot: 'Silk Board Junction Underpass',
    origin: {
      name: 'Koramangala 4th Block',
      coords: [12.9345, 77.6266]
    },
    destination: {
      name: 'Electronic City Phase 1',
      coords: [12.8452, 77.6602]
    },
    context: 'Standard navigation routes commuters straight through Silk Board underpass where 48 cm water has submerged 3 vehicles. ClimatePulse diverts to safe elevated corridor.'
  },
  {
    id: 'bengaluru-orr-techpark',
    city: 'bengaluru',
    title: 'HSR Layout to Prestige Tech Park',
    tagline: 'Avoids Bellandur lake overflow & Ecospace waterlogging via Sarjapur Link',
    hazardHotspot: 'Bellandur Lake Spillway & ORR',
    origin: {
      name: 'HSR Layout Sector 2',
      coords: [12.9121, 77.6446]
    },
    destination: {
      name: 'Prestige Tech Park (Marathahalli ORR)',
      coords: [12.9366, 77.6918]
    },
    context: 'Outer Ring Road between Bellandur and Ecospace is severely waterlogged. Safe route routes via Sarjapur Road and Doddakannelli bypass.'
  },
  {
    id: 'mumbai-santacruz-dadar',
    city: 'mumbai',
    title: 'Santacruz to Dadar TT',
    tagline: 'Avoids 55 cm submerged Milan Subway via Western Express Flyover',
    hazardHotspot: 'Milan Subway Underpass',
    origin: {
      name: 'Santacruz West (Linking Rd)',
      coords: [19.0831, 72.8340]
    },
    destination: {
      name: 'Dadar TT Circle',
      coords: [19.0178, 72.8478]
    },
    context: 'Google Maps directs drivers into Milan Subway to shave 4 minutes, but the subway is inundated with 1.8 feet of water. ClimatePulse enforces flyover bypass.'
  },
  {
    id: 'delhi-cp-noida',
    city: 'delhi',
    title: 'Connaught Place to Noida Sec 18',
    tagline: 'Avoids 60 cm drowning hazard at Minto Bridge via Barakhamba & Pragati Maidan',
    hazardHotspot: 'Minto Bridge Underpass',
    origin: {
      name: 'Connaught Place (Inner Circle)',
      coords: [28.6328, 77.2197]
    },
    destination: {
      name: 'Noida Sector 18 Mall',
      coords: [28.5708, 77.3261]
    },
    context: 'Minto Bridge underpass has a notorious 2-foot water bowl during heavy downpours. Safe route routes cleanly along Barakhamba road and DND Flyway.'
  },
  {
    id: 'chennai-velachery',
    city: 'chennai',
    title: 'Guindy to OMR Thoraipakkam',
    tagline: 'Avoids 48 cm flooded Velachery Lake spillway via Madhya Kailash OMR bypass',
    hazardHotspot: 'Velachery Bypass & Lake Spillway',
    origin: {
      name: 'Guindy Industrial Estate',
      coords: [13.0067, 80.2025]
    },
    destination: {
      name: 'OMR Thoraipakkam IT Corridor',
      coords: [12.9382, 80.2335]
    },
    context: 'Standard navigation directs drivers along Velachery Main Road where the lake overflow has submerged 1.5 ft of the road. ClimatePulse diverts traffic via Madhya Kailash and the elevated Rajiv Gandhi Salai (OMR).'
  },
  {
    id: 'chennai-madipakkam',
    city: 'chennai',
    title: 'Alandur to Medavakkam Junction',
    tagline: 'Avoids 38 cm concealed storm drains in Madipakkam via Radial Road bypass',
    hazardHotspot: 'Madipakkam Ram Nagar Lowlands',
    origin: {
      name: 'Alandur Metro / Mount',
      coords: [13.0034, 80.1982]
    },
    destination: {
      name: 'Medavakkam Koot Road',
      coords: [12.9208, 80.1915]
    },
    context: 'Direct path leads through Madipakkam bazaar lowlands with continuous waterlogging. Safe route diverts along the elevated Pallavaram-Thoraipakkam Radial Road.'
  }
];

export const CITY_CENTERS: Record<string, { name: string; center: [number, number]; zoom: number }> = {
  bengaluru: {
    name: 'Bengaluru',
    center: [12.9250, 77.6400],
    zoom: 13
  },
  mumbai: {
    name: 'Mumbai',
    center: [19.0550, 72.8450],
    zoom: 13
  },
  delhi: {
    name: 'Delhi NCR',
    center: [28.6150, 77.2400],
    zoom: 13
  },
  chennai: {
    name: 'Chennai',
    center: [12.9750, 80.2100],
    zoom: 13
  }
};
