import React from 'react';
import { ShieldAlert, CloudRain, AlertTriangle, Camera, RefreshCw } from 'lucide-react';
import { CityId, CityWeather } from '../types';

interface NavbarProps {
  currentCity: CityId;
  onSelectCity: (city: CityId) => void;
  weather: CityWeather;
  activeHazardsCount: number;
  onOpenReportModal: () => void;
  onOpenHazardsList: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCity,
  onSelectCity,
  weather,
  activeHazardsCount,
  onOpenReportModal,
  onOpenHazardsList,
  onResetData
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">ClimatePulse AI</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE RADAR
              </span>
            </div>
            <p className="text-xs text-slate-400 italic hidden md:block">
              &ldquo;Fastest isn&apos;t always safest&rdquo; &bull; Flood-Aware Urban Navigation
            </p>
          </div>
        </div>

        {/* City Selector & Weather Status */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            {(['bengaluru', 'mumbai', 'delhi', 'chennai'] as CityId[]).map((city) => (
              <button
                key={city}
                onClick={() => onSelectCity(city)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                  currentCity === city
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {city === 'delhi' ? 'Delhi NCR' : city}
              </button>
            ))}
          </div>

          {/* Weather Alert Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
            <CloudRain className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              {weather.rainfallMmPerHour} mm/h Rain
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                weather.alertLevel === 'EMERGENCY'
                  ? 'bg-red-500 text-white'
                  : weather.alertLevel === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {weather.alertLevel}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHazardsList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-700/50 text-red-200 text-xs font-semibold transition-all"
              title="View all monitored flood zones in this city"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{activeHazardsCount} Hazards</span>
            </button>

            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Report Flood</span>
            </button>

            <button
              onClick={onResetData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Reset sample data and hazards"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
