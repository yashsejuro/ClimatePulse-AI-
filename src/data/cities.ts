import type { CityId, CityWeather } from '../types/index.ts';

export interface CityConfig {
  id: CityId;
  name: string;
  state: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
}

export const CITIES: Record<CityId, CityConfig> = {
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    center: [12.9250, 77.6400],
    zoom: 13
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    center: [19.0550, 72.8450],
    zoom: 13
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi',
    state: 'NCR',
    center: [28.6150, 77.2400],
    zoom: 13
  },
  chennai: {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    center: [12.9750, 80.2100],
    zoom: 13
  }
};

export const CITY_LIST: CityConfig[] = [
  CITIES.bengaluru,
  CITIES.mumbai,
  CITIES.delhi,
  CITIES.chennai
];
