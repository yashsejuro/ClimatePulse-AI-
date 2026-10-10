import { CityId, CityWeather } from '../../types';
import { INITIAL_WEATHER } from '../../data/seedHazards';

export interface WeatherProvider {
  getWeather(city: CityId): Promise<CityWeather>;
}

export class OpenMeteoWeatherAdapter implements WeatherProvider {
  private cache = new Map<string, { data: CityWeather; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  async getWeather(city: CityId): Promise<CityWeather> {
    const cityKey = (city || 'bengaluru').toLowerCase() as CityId;
    const defaultWeather = INITIAL_WEATHER[cityKey] || INITIAL_WEATHER.bengaluru;

    // Check cache
    const cached = this.cache.get(cityKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const cityCoordinates: Record<string, [number, number]> = {
      bengaluru: [12.9716, 77.5946],
      mumbai: [19.0760, 72.8777],
      delhi: [28.6139, 77.2090],
      chennai: [13.0827, 80.2707]
    };

    const coords = cityCoordinates[cityKey];
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
          temperatureC: Math.round(temp * 10) / 10,
          rainfallMmPerHour: Math.max(12, Math.round((rain + defaultWeather.rainfallMmPerHour) / 2 * 10) / 10)
        };

        this.cache.set(cityKey, { data: resolved, cachedAt: Date.now() });
        return resolved;
      }
    } catch {
      // Fallback
    }

    return defaultWeather;
  }
}

let weatherAdapterInstance: WeatherProvider | null = null;

export function getWeatherAdapter(): WeatherProvider {
  if (!weatherAdapterInstance) {
    weatherAdapterInstance = new OpenMeteoWeatherAdapter();
  }
  return weatherAdapterInstance;
}
