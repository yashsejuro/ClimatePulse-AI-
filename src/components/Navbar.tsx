import React from 'react';
import { ShieldCheck, Camera, RotateCcw } from 'lucide-react';
import { CityId } from '../types';

interface NavbarProps {
  currentCity: CityId;
  onSelectCity: (city: CityId) => void;
  onOpenReportModal: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCity,
  onSelectCity,
  onOpenReportModal,
  onResetData
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & Product Principle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-700 text-white shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-base tracking-tight text-gray-900">
              ClimatePulse
            </span>
            <span className="hidden md:inline-block text-xs text-gray-500 font-normal">
              Flood-Aware Navigation
            </span>
          </div>
        </div>

        {/* City Selector and Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* City Selector Segmented Pills */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            {(['bengaluru', 'chennai', 'mumbai', 'delhi'] as CityId[]).map((city) => (
              <button
                key={city}
                onClick={() => onSelectCity(city)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors capitalize cursor-pointer ${
                  currentCity === city
                    ? 'bg-white text-emerald-800 font-semibold shadow-xs border border-gray-200/60'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {city === 'delhi' ? 'Delhi' : city}
              </button>
            ))}
          </div>

          {/* Report Flood Action Button */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Flood</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetData}
            title="Reset hazards to initial seed"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
