import { CityId } from '../types';
import { CITIES } from '../data/cities';

export interface UserLocationResult {
  coords: [number, number]; // [lat, lng]
  name: string;
  city?: CityId;
  accuracyMeters?: number;
}

/**
 * Calculates straight line distance in kilometers between two coordinates
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Matches coordinates to the nearest supported city if within ~80km
 */
export function matchNearestCity(coords: [number, number]): CityId | undefined {
  const [lat, lon] = coords;
  let nearestCity: CityId | undefined = undefined;
  let minDistance = 80; // km threshold for metro proximity

  for (const [id, config] of Object.entries(CITIES)) {
    const dist = getDistanceKm(lat, lon, config.center[0], config.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = id as CityId;
    }
  }

  return nearestCity;
}

/**
 * Asynchronously retrieves the user's current GPS position via the Browser Geolocation API
 * and performs reverse-geocoding via OpenStreetMap Nominatim.
 */
export async function detectCurrentUserLocation(): Promise<UserLocationResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or environment');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const coords: [number, number] = [lat, lon];
        const matchedCity = matchNearestCity(coords);

        // Reverse geocode to get a human-friendly address name
        let addressName = `My Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

        try {
          const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
          const res = await fetch(revUrl, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'ClimatePulse-App/1.0'
            },
            signal: AbortSignal.timeout(3500)
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const a = data.address;
              const subArea = a.neighbourhood || a.suburb || a.residential || a.road || a.commercial;
              const cityArea = a.city || a.town || a.village || a.county || a.state_district;
              if (subArea && cityArea) {
                addressName = `${subArea}, ${cityArea}`;
              } else if (subArea) {
                addressName = `${subArea}`;
              } else if (cityArea) {
                addressName = `${cityArea}`;
              } else if (data.display_name) {
                addressName = data.display_name.split(',').slice(0, 2).join(', ').trim();
              }
            }
          }
        } catch (err) {
          console.warn('[GEOLOCATION] Reverse geocode timed out or failed, using coordinate label', err);
        }

        resolve({
          coords,
          name: addressName,
          city: matchedCity,
          accuracyMeters: accuracy
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or pick a point on the map.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again or select a location.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}
