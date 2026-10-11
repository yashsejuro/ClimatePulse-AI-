import type { CityId, CityWeather } from '../../types/index.ts';
import { INITIAL_WEATHER } from '../../data/seedHazards.ts';

export interface WeatherProvider {
  getWeather(city: CityId, coords?: [number, number], locationName?: string): Promise<CityWeather>;
  getPrecipitationGrid(city: CityId, coords?: [number, number]): Promise<any>;
}

export class OpenMeteoWeatherAdapter implements WeatherProvider {
  private cache = new Map<string, { data: CityWeather; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  async getWeather(city: CityId, customCoords?: [number, number], locationName?: string): Promise<CityWeather> {
    const cityKey = (city || 'bengaluru').toLowerCase() as CityId;
    const defaultWeather = INITIAL_WEATHER[cityKey] || INITIAL_WEATHER.bengaluru;

    const cacheKey = customCoords ? `${cityKey}_${customCoords[0]}_${customCoords[1]}` : cityKey;
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const cityCoordinates: Record<string, [number, number]> = {
      bengaluru: [12.9716, 77.5946],
      mumbai: [19.0760, 72.8777],
      delhi: [28.6139, 77.2090],
      chennai: [13.0827, 80.2707]
    };

    const coords = customCoords || cityCoordinates[cityKey];
    if (!coords) {
      return defaultWeather;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&current=temperature_2m,precipitation,rain,weather_code&hourly=precipitation_probability,rain&forecast_days=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        const current = data.current || {};
        const rain = current.rain !== undefined ? current.rain : current.precipitation || defaultWeather.rainfallMmPerHour;
        const temp = current.temperature_2m || defaultWeather.temperatureC;

        const resolved: CityWeather = {
          ...defaultWeather,
          cityName: locationName || defaultWeather.cityName,
          temperatureC: Math.round(temp * 10) / 10,
          rainfallMmPerHour: Math.max(12, Math.round((rain + defaultWeather.rainfallMmPerHour) / 2 * 10) / 10)
        };

        this.cache.set(cacheKey, { data: resolved, cachedAt: Date.now() });
        return resolved;
      }
    } catch {
      // Fallback
    }

    return defaultWeather;
  }

  async getPrecipitationGrid(city: CityId, coords?: [number, number]): Promise<any> {
    const weather = await this.getWeather(city, coords);
    return {
      city,
      rainfallMmPerHour: weather.rainfallMmPerHour,
      gridPoints: []
    };
  }
}

let weatherAdapterInstance: WeatherProvider | null = null;

export function getWeatherAdapter(): WeatherProvider {
  if (!weatherAdapterInstance) {
    weatherAdapterInstance = new OpenMeteoWeatherAdapter();
  }
  return weatherAdapterInstance;
}
