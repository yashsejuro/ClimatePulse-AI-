import React from 'react';
import { Navigation, Car, ShieldCheck } from 'lucide-react';
import { PresetScenario, VehicleProfile, VehicleType } from '../types';
import { VEHICLE_PROFILES } from '../data/seedHazards';

interface RouteSearchProps {
  scenarios: PresetScenario[];
  activeScenarioId?: string | null;
  onSelectScenario: (scenario: PresetScenario) => void;
  originText: string;
  destinationText: string;
  onChangeOrigin: (val: string) => void;
  onChangeDestination: (val: string) => void;
  selectedVehicle: VehicleType;
  onSelectVehicle: (type: VehicleType) => void;
  onCalculate: () => void;
  isLoading: boolean;
}

export const RouteSearch: React.FC<RouteSearchProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  originText,
  destinationText,
  onChangeOrigin,
  onChangeDestination,
  selectedVehicle,
  onSelectVehicle,
  onCalculate,
  isLoading
}) => {
  const currentVehicleProfile: VehicleProfile =
    VEHICLE_PROFILES.find((v) => v.id === selectedVehicle) || VEHICLE_PROFILES[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      {/* Preset Corridors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Preset Corridors
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Quick Select</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scenarios.map((sc) => {
            const isSelected = activeScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc)}
                className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-semibold text-gray-900 flex items-center justify-between">
                  <span>{sc.title}</span>
                  {isSelected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                </div>
                <div className="text-[11px] text-gray-500 truncate mt-0.5">{sc.tagline}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          </div>
          <input
            type="text"
            value={originText}
            onChange={(e) => onChangeOrigin(e.target.value)}
            placeholder="Origin (or click on map)"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          </div>
          <input
            type="text"
            value={destinationText}
            onChange={(e) => onChangeDestination(e.target.value)}
            placeholder="Destination (or click on map)"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
        </div>
      </div>

      {/* Vehicle Clearance Profile */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-gray-500" />
            <span>Vehicle Ground Clearance</span>
          </span>
          <span className="font-semibold text-emerald-700">
            {currentVehicleProfile.clearanceCm} cm
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {VEHICLE_PROFILES.map((vp) => (
            <button
              key={vp.id}
              onClick={() => onSelectVehicle(vp.id)}
              className={`py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors text-center cursor-pointer ${
                selectedVehicle === vp.id
                  ? 'bg-white text-emerald-800 border-emerald-600 font-semibold shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {vp.id === 'twowheeler' ? 'Bike' : vp.id === 'sedan' ? 'Sedan' : vp.id === 'suv' ? 'SUV' : 'Bus/Heavy'}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-gray-500 leading-tight">
          {currentVehicleProfile.description}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={onCalculate}
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Calculating Safe Routes...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            <span>Find Safe Route</span>
          </>
        )}
      </button>
    </div>
  );
};
