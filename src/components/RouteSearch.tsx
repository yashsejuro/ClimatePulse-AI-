import React from 'react';
import { Navigation, ArrowUpDown, Car, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Preset Scenarios Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monsoon Corridors (Presets)</span>
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">Click to Test</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scenarios.map((sc) => {
            const isSelected = activeScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{sc.title}</span>
                  {isSelected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{sc.tagline}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
          </div>
          <input
            type="text"
            value={originText}
            onChange={(e) => onChangeOrigin(e.target.value)}
            placeholder="Starting Point (or click on map)"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></span>
          </div>
          <input
            type="text"
            value={destinationText}
            onChange={(e) => onChangeDestination(e.target.value)}
            placeholder="Destination (or click on map)"
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Vehicle Clearance Profile */}
      <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vehicle Ground Clearance</span>
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            {currentVehicleProfile.clearanceCm} cm clearance
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {VEHICLE_PROFILES.map((vp) => (
            <button
              key={vp.id}
              onClick={() => onSelectVehicle(vp.id)}
              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold border transition-all text-center ${
                selectedVehicle === vp.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {vp.id === 'twowheeler' ? 'Bike' : vp.id === 'sedan' ? 'Sedan' : vp.id === 'suv' ? 'SUV' : 'Bus/Heavy'}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          {currentVehicleProfile.description}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={onCalculate}
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            <span>Evaluating Flood Corridors...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 stroke-[2.5]" />
            <span>Evaluate Climate Routes</span>
          </>
        )}
      </button>
    </div>
  );
};
