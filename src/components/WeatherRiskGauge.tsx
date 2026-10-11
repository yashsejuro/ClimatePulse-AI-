import React, { useState } from 'react';
import {
  CloudRain,
  Droplets,
  Wind,
  Thermometer,
  RefreshCw,
  Info,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { CityWeather } from '../types';

interface WeatherRiskGaugeProps {
  weather: CityWeather;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
  className?: string;
}

export const WeatherRiskGauge: React.FC<WeatherRiskGaugeProps> = ({
  weather,
  onRefresh,
  isRefreshing = false,
  compact = false,
  className = ''
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const rainIntensity = weather.rainfallMmPerHour;
  const isHighRain = rainIntensity >= 25;
  const isModerateRain = rainIntensity >= 10 && rainIntensity < 25;

  // Visual severity color mapping
  const severityBadge = isHighRain
    ? {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Torrential / Cloudburst',
        icon: AlertTriangle
      }
    : isModerateRain
    ? {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Heavy Monsoon Rain',
        icon: CloudRain
      }
    : {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Light / Normal Rain',
        icon: CheckCircle2
      };

  // Base climate risk calculation formula from routingService.ts:
  // score = Math.min(15, Math.round((regionalRainMm / 50) * 12))
  const baseRiskScoreAdded = Math.min(15, Math.round((rainIntensity / 50) * 12));

  if (compact) {
    return (
      <div className={`p-2.5 rounded-lg border border-gray-200 bg-white text-xs ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${severityBadge.dot} animate-pulse`} />
            <CloudRain className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold text-gray-900">{rainIntensity} mm/h</span>
            <span className="text-gray-500">· {weather.weatherCondition}</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer disabled:opacity-50"
              title="Refresh real-time weather"
              aria-label="Refresh real-time weather"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs text-xs space-y-3 ${className}`}>
      {/* Header: Location & Live Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${severityBadge.dot} animate-pulse`} />
            <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
              Real-Time Hydro-Meteorology
            </span>
            <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded font-medium border border-sky-200/60">
              Live API
            </span>
          </div>
          <div className="text-xs text-gray-600 font-medium">
            Near {weather.locationName || weather.cityName}
            {weather.coords && (
              <span className="text-[10px] text-gray-400 ml-1">
                ({weather.coords[0].toFixed(2)}°, {weather.coords[1].toFixed(2)}°)
              </span>
            )}
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[11px] text-gray-600 font-medium cursor-pointer transition-colors disabled:opacity-50"
            title="Fetch real-time weather at selected location"
            aria-label="Fetch real-time weather at selected location"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}
      </div>

      {/* Main Metric: Rainfall Intensity */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                {rainIntensity}
              </span>
              <span className="text-xs font-semibold text-gray-500">mm/h</span>
            </div>
            <div className="text-[11px] text-gray-600 font-medium">
              {weather.weatherCondition}
            </div>
          </div>
        </div>

        <div className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 ${severityBadge.bg}`}>
          <span>{severityBadge.label}</span>
        </div>
      </div>

      {/* Meteorological Micro-Data Grid */}
      <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600">
        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 border border-gray-100">
          <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-400">Temp</div>
            <div className="font-semibold text-gray-800">{weather.temperatureC}°C</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 border border-gray-100">
          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-400">Precip Prob</div>
            <div className="font-semibold text-gray-800">{weather.precipitationProbability}%</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-gray-50 border border-gray-100">
          <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <div>
            <div className="text-[10px] text-gray-400">Wind</div>
            <div className="font-semibold text-gray-800">{weather.windSpeedKmh ?? 14} km/h</div>
          </div>
        </div>
      </div>

      {/* Climate Risk Connection */}
      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-emerald-950 space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold flex items-center gap-1 text-emerald-900">
            <Zap className="w-3 h-3 text-emerald-700" />
            Informing Climate Risk Index (CRI)
          </span>
          <span className="font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
            +{baseRiskScoreAdded} Base CRI
          </span>
        </div>
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          Real-time precipitation informs hydrological runoff and road submersion thresholds along both routes.
        </p>
      </div>

      {/* Provider attribution footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5 border-t border-gray-100">
        <span>Provider: {weather.source || 'Open-Meteo High-Resolution Grid'}</span>
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          aria-expanded={showExplanation}
          aria-controls="cri-explanation"
          className="text-gray-500 hover:text-gray-700 underline flex items-center gap-0.5 cursor-pointer"
        >
          <Info className="w-2.5 h-2.5" />
          {showExplanation ? 'Hide info' : 'How rain affects CRI'}
        </button>
      </div>

      {showExplanation && (
        <div id="cri-explanation" className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px] text-gray-700 space-y-1">
          <div className="font-semibold text-gray-900">Deterministic Risk Formula:</div>
          <div className="font-mono text-[10px] text-gray-600 bg-white p-1 rounded border border-gray-200">
            Base Risk = min(15, round((Rainfall mm/h ÷ 50) × 12))
          </div>
          <p className="text-gray-600">
            When rainfall exceeds 25 mm/h, low-lying underpasses and bridge approaches rapidly accumulate standing water, penalizing vehicles with clearance under 20 cm.
          </p>
        </div>
      )}
    </div>
  );
};
