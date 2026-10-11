import React from 'react';
import { ShieldCheck, MapPin, Compass, Crosshair, Loader2 } from 'lucide-react';
import { CityId } from '../types';
import { CITIES } from '../data/cities';

interface NavbarProps {
  currentCity: CityId;
  onSelectCity: (city: CityId) => void;
  onOpenReportModal: () => void;
  onOpenHero?: () => void;
  onLocateUser?: () => void;
  isLocating?: boolean;
  onResetData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCity,
  onSelectCity,
  onOpenReportModal,
  onOpenHero,
  onLocateUser,
  isLocating = false
}) => {
  return (
    <header className="w-full bg-white border-b border-gray-200 z-30 select-none">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-gray-900 leading-tight">
              ClimatePulse
            </span>
            <span className="text-[11px] text-gray-500 font-normal leading-tight">
              Flood-aware navigation
            </span>
          </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Guide / About Button */}
          {onOpenHero && (
            <button
              type="button"
              onClick={onOpenHero}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs text-gray-700 font-medium transition-colors cursor-pointer"
              title="Overview & Demo Corridors"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Guide & Demo</span>
            </button>
          )}

          {/* Quick GPS Locate */}
          {onLocateUser && (
            <button
              type="button"
              onClick={onLocateUser}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs text-gray-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="Detect live GPS location"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden md:inline">{isLocating ? 'Locating...' : 'My Location'}</span>
            </button>
          )}

          {/* Small Secondary City Selector */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs transition-colors">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              id="city-selector"
              value={currentCity}
              onChange={(e) => {
                const selected = e.target.value as CityId;
                console.log(`[CITY SELECTOR] Selected stable city ID: "${selected}"`);
                onSelectCity(selected);
              }}
              className="bg-transparent text-gray-700 font-medium text-xs focus:outline-none cursor-pointer pr-1"
              aria-label="Select City"
            >
              {(Object.keys(CITIES) as CityId[]).map((cityId) => (
                <option key={cityId} value={cityId}>
                  {CITIES[cityId].name}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Navbar Action: Report Flood */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            Report flood
          </button>
        </div>
      </div>
    </header>
  );
};
