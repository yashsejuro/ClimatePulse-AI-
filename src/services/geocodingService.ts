import { CityId } from '../types';
import { CITIES } from '../data/cities';

export interface PlaceResult {
  name: string;
  detail: string;
  coords: [number, number];
}

const CITY_LANDMARKS: Record<CityId, PlaceResult[]> = {
  bengaluru: [
    { name: 'Bengaluru', detail: 'City Center, Bengaluru Urban', coords: [12.9716, 77.5946] },
    { name: 'Koramangala 4th Block', detail: 'Sony World Signal, Bengaluru', coords: [12.9345, 77.6266] },
    { name: 'Electronic City Phase 1', detail: 'Toll Plaza / Wipro Gate, Bengaluru', coords: [12.8452, 77.6602] },
    { name: 'Silk Board Junction', detail: 'Hosur Rd / Outer Ring Rd Underpass', coords: [12.9177, 77.6238] },
    { name: 'Whitefield ITPL', detail: 'International Tech Park, Bengaluru', coords: [12.9863, 77.7377] },
    { name: 'Hosur', detail: 'Hosur Town / Border Corridor', coords: [12.7409, 77.8253] },
    { name: 'HSR Layout Sector 2', detail: '27th Main Road, Bengaluru', coords: [12.9121, 77.6446] },
    { name: 'Prestige Tech Park', detail: 'Marathahalli - Sarjapur Outer Ring Rd', coords: [12.9366, 77.6918] },
    { name: 'Bellandur Lake Spillway', detail: 'Ecospace, Outer Ring Road', coords: [12.9298, 77.6745] },
    { name: 'Indiranagar 100ft Road', detail: '12th Main Junction, Bengaluru', coords: [12.9719, 77.6412] },
    { name: 'MG Road Metro Station', detail: 'Brigade Road Junction, Bengaluru', coords: [12.9756, 77.6097] },
    { name: 'Marathahalli Bridge', detail: 'HAL Airport Road / ORR', coords: [12.9591, 77.6974] },
    { name: 'Hebbal Flyover', detail: 'Airport Expressway / Bellary Rd', coords: [13.0359, 77.5970] },
    { name: 'BTM Layout 2nd Stage', detail: 'Udupi Garden Signal, Bengaluru', coords: [12.9166, 77.6101] },
    { name: 'Jayanagar 4th Block', detail: 'Complex & Bus Station, Bengaluru', coords: [12.9308, 77.5838] },
    { name: 'JP Nagar 6th Phase', detail: 'Ring Road Junction, Bengaluru', coords: [12.9063, 77.5857] },
    { name: 'Majestic KSR Railway Station', detail: 'City Railway Station, Bengaluru', coords: [12.9781, 77.5695] },
    { name: 'Sarjapur Road Wipro', detail: 'Kaikondrahalli, Bengaluru', coords: [12.9140, 77.6580] },
    { name: 'Hubballi', detail: 'Hubballi Urban, Karnataka', coords: [15.3647, 75.1240] },
    { name: 'Kempegowda Airport (BLR)', detail: 'Devanahalli, Bengaluru', coords: [13.1986, 77.7066] }
  ],
  chennai: [
    { name: 'Chennai', detail: 'City Center, Chennai', coords: [13.0827, 80.2707] },
    { name: 'Guindy Industrial Estate', detail: 'Kathipara Junction, Chennai', coords: [13.0067, 80.2025] },
    { name: 'OMR Thoraipakkam', detail: 'Rajiv Gandhi Salai IT Corridor', coords: [12.9382, 80.2335] },
    { name: 'Velachery Lake Bypass', detail: 'Velachery Main Road, Chennai', coords: [12.9784, 80.2185] },
    { name: 'Alandur Metro Station', detail: 'Asarkhana / GST Road, Chennai', coords: [13.0034, 80.1982] },
    { name: 'Medavakkam Junction', detail: 'Koot Road / Perumbakkam Link', coords: [12.9208, 80.1915] },
    { name: 'Madipakkam Ram Nagar', detail: 'Bazaar Road Lowlands, Chennai', coords: [12.9652, 80.1989] },
    { name: 'Chennai Central Railway Station', detail: 'Puratchi Thalaivar Dr. MGR Central', coords: [13.0827, 80.2707] },
    { name: 'T. Nagar Panagal Park', detail: 'G.N. Chetty Road, Chennai', coords: [13.0418, 80.2341] },
    { name: 'Adyar Signal', detail: 'Sardar Patel Road / LB Road', coords: [13.0012, 80.2565] },
    { name: 'Marina Beach Light House', detail: 'Kamarajar Promenade, Chennai', coords: [13.0400, 80.2800] },
    { name: 'Anna Nagar Roundtana', detail: '2nd Avenue, Chennai', coords: [13.0850, 80.2101] },
    { name: 'Sholinganallur Junction', detail: 'OMR / ECR Link Road', coords: [12.9010, 80.2279] },
    { name: 'Chennai Airport (MAA)', detail: 'Meenambakkam, Chennai', coords: [12.9941, 80.1709] }
  ],
  mumbai: [
    { name: 'Mumbai', detail: 'City Center, Mumbai', coords: [19.0760, 72.8777] },
    { name: 'Santacruz West', detail: 'Linking Road, Mumbai', coords: [19.0831, 72.8340] },
    { name: 'Dadar TT Circle', detail: 'Dr. Babasaheb Ambedkar Rd, Mumbai', coords: [19.0178, 72.8478] },
    { name: 'Milan Subway Underpass', detail: 'SV Road / Railway Submerged Track', coords: [19.0838, 72.8427] },
    { name: 'Bandra Kurla Complex (BKC)', detail: 'G Block / MMRDA Grounds', coords: [19.0657, 72.8687] },
    { name: 'Bandra West Bandstand', detail: 'Hill Road / Carter Road, Mumbai', coords: [19.0596, 72.8295] },
    { name: 'Andheri Subway', detail: 'SV Road, Andheri West', coords: [19.1197, 72.8464] },
    { name: 'Hindmata Cinema TT', detail: 'Parel Lowlands, Mumbai', coords: [19.0094, 72.8428] },
    { name: 'Colaba Causeway', detail: 'Gateway of India, South Mumbai', coords: [18.9067, 72.8147] },
    { name: 'Lower Parel High Street Phoenix', detail: 'Senapati Bapat Marg', coords: [18.9953, 72.8306] },
    { name: 'Mumbai Airport T2 (BOM)', detail: 'Sahar / Western Express Hwy', coords: [19.0896, 72.8656] }
  ],
  delhi: [
    { name: 'Delhi', detail: 'National Capital Territory', coords: [28.6139, 77.2090] },
    { name: 'Connaught Place Inner Circle', detail: 'Rajiv Chowk, New Delhi', coords: [28.6328, 77.2197] },
    { name: 'Noida Sector 18 Mall', detail: 'Atta Market / Wave Mall, Noida', coords: [28.5708, 77.3261] },
    { name: 'Minto Bridge Underpass', detail: 'Deen Dayal Upadhyay Marg Submerged Point', coords: [28.6341, 77.2274] },
    { name: 'ITO Ring Road', detail: 'Vikas Marg / Yamuna Flood Basin', coords: [28.6290, 77.2435] },
    { name: 'Pul Prahladpur Underpass', detail: 'Mehrauli-Badarpur Road', coords: [28.5085, 77.2882] },
    { name: 'India Gate', detail: 'Kartavya Path, New Delhi', coords: [28.6129, 77.2295] },
    { name: 'Gurgaon Cyber City', detail: 'DLF Phase 2 / NH-48', coords: [28.4950, 77.0895] },
    { name: 'Hauz Khas Village', detail: 'Deer Park / Aurobindo Marg', coords: [28.5494, 77.2001] },
    { name: 'Akshardham Temple Complex', detail: 'NH-24 / Mayur Vihar Link', coords: [28.6127, 77.2773] },
    { name: 'Delhi Airport T3 (DEL)', detail: 'IGI Airport Road', coords: [28.5562, 77.1000] }
  ]
};

export const CITY_VIEWBOXES: Record<CityId, { left: number; top: number; right: number; bottom: number }> = {
  bengaluru: { left: 77.40, top: 13.15, right: 77.85, bottom: 12.65 },
  chennai: { left: 80.05, top: 13.25, right: 80.35, bottom: 12.85 },
  mumbai: { left: 72.70, top: 19.30, right: 73.05, bottom: 18.85 },
  delhi: { left: 76.80, top: 28.90, right: 77.50, bottom: 28.30 }
};

/**
 * Parses coordinate string format e.g. "Pinned Location (12.9345, 77.6266)" or "12.9345, 77.6266"
 */
export function parseCoordinates(text: string): [number, number] | null {
  const match = text.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return [lat, lon];
    }
  }
  return null;
}

/**
 * Returns instant autocomplete search suggestions for places in the active city
 */
export function searchPlaceSuggestions(query: string, city: CityId): PlaceResult[] {
  if (!query || query.trim().length === 0) {
    return (CITY_LANDMARKS[city] || []).slice(0, 5);
  }

  const q = query.toLowerCase().trim();
  const landmarks = CITY_LANDMARKS[city] || [];

  const matched = landmarks.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q)
  );

  return matched.slice(0, 5);
}

/**
 * Resolves a text location to coordinates.
 * Priority:
 * 1. Explicit lat, lon in string
 * 2. Exact match in active city landmarks
 * 3. Exact match across all Indian city landmarks
 * 4. Substring match in active city landmarks
 * 5. Substring match across all Indian city landmarks
 * 6. Live OpenStreetMap Nominatim with proper headers
 * 
 * If location cannot be found, throws an Error with a clear message:
 * "Could not find location: <query>".
 */
export async function resolveLocation(
  query: string,
  city: CityId
): Promise<{ name: string; coords: [number, number] }> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Please enter a location');
  }

  // 1. Check coordinates
  const parsed = parseCoordinates(trimmed);
  if (parsed) {
    console.log(`[GEOCODE] Parsed explicit coordinates: [${parsed[0]}, ${parsed[1]}] for "${trimmed}"`);
    return { name: trimmed, coords: parsed };
  }

  const q = trimmed.toLowerCase();

  // 2. Exact match in active city landmarks only
  const cityLandmarks = CITY_LANDMARKS[city] || [];
  const activeExact = cityLandmarks.find(
    (l) => l.name.toLowerCase() === q || l.detail.toLowerCase() === q
  );
  if (activeExact) {
    console.log(`[GEOCODE] Exact active city match: ${activeExact.name} [${activeExact.coords}] for "${trimmed}"`);
    return { name: activeExact.name, coords: activeExact.coords };
  }

  // 3. Substring match in active city landmarks only (drop substring matching below 4 characters)
  if (q.length >= 4) {
    const activePartial = cityLandmarks.find(
      (l) => l.name.toLowerCase().includes(q) || q.includes(l.name.toLowerCase())
    );
    if (activePartial) {
      console.log(`[GEOCODE] Partial active city match: ${activePartial.name} [${activePartial.coords}] for "${trimmed}"`);
      return { name: activePartial.name, coords: activePartial.coords };
    }
  }

  // 4. Live OpenStreetMap Nominatim geocoder with countrycodes=in and bounded viewbox for selected city
  try {
    const cityConfig = CITIES[city] || CITIES.bengaluru;
    const vb = CITY_VIEWBOXES[city] || CITY_VIEWBOXES.bengaluru;
    const searchQuery = `${trimmed}, ${cityConfig.name}`;
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      searchQuery
    )}&countrycodes=in&viewbox=${vb.left},${vb.top},${vb.right},${vb.bottom}&bounded=1&limit=1`;

    const res = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ClimatePulse-App/1.0'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const resolvedName = data[0].display_name
            ? data[0].display_name.split(',')[0]
            : trimmed;
          console.log(`[GEOCODE] Nominatim found: ${resolvedName} [${lat}, ${lon}] for "${trimmed}"`);
          return {
            name: resolvedName,
            coords: [lat, lon]
          };
        }
      }
    }
  } catch (err) {
    console.warn('[GEOCODE] Nominatim query error:', err);
  }

  // If geocoding fails completely: THROW AN ERROR, DO NOT SILENTLY DEFAULT
  console.error(`[GEOCODE] Failed to resolve: "${trimmed}"`);
  throw new Error(`Could not find location: ${trimmed}`);
}
