import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Play,
  Pause,
  Square,
  Car,
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  CityId,
  PresetScenario,
  RouteComparisonResponse,
  VehicleType,
  VehicleProfile
} from '../types';
import { VEHICLE_PROFILES } from '../data/seedHazards';
import { searchPlaceSuggestions, PlaceResult } from '../services/geocodingService';

interface NavigationCardProps {
  city: CityId;
  scenarios: PresetScenario[];
  originText: string;
  destinationText: string;
  onChangeOrigin: (val: string) => void;
  onChangeDestination: (val: string) => void;
  onSelectOriginPlace: (place: PlaceResult) => void;
  onSelectDestinationPlace: (place: PlaceResult) => void;
  onSelectScenario: (scenario: PresetScenario) => void;
  onSearchRoute: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  comparison: RouteComparisonResponse | null;
  selectedRouteType: 'SAFE' | 'FASTEST';
  onSelectRouteType: (type: 'SAFE' | 'FASTEST') => void;
  selectedVehicle: VehicleType;
  onSelectVehicle: (vehicle: VehicleType) => void;
  // Controlled Simulation Props
  simulationMode: boolean;
  isSimPlaying: boolean;
  simulationStep: number;
  totalSteps: number;
  onEnterSimulation: () => void;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onStopSimulation: () => void;
  aiBriefing?: string | null;
  onNewSearch: () => void;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({
  city,
  scenarios,
  originText,
  destinationText,
  onChangeOrigin,
  onChangeDestination,
  onSelectOriginPlace,
  onSelectDestinationPlace,
  onSelectScenario,
  onSearchRoute,
  isLoading,
  errorMessage,
  comparison,
  selectedRouteType,
  onSelectRouteType,
  selectedVehicle,
  onSelectVehicle,
  simulationMode,
  isSimPlaying,
  simulationStep,
  totalSteps,
  onEnterSimulation,
  onStartSimulation,
  onPauseSimulation,
  onStopSimulation,
  aiBriefing,
  onNewSearch
}) => {
  // Autocomplete UI state
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceResult[]>([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Update suggestions on typing
  useEffect(() => {
    setOriginSuggestions(searchPlaceSuggestions(originText, city));
  }, [originText, city]);

  useEffect(() => {
    setDestSuggestions(searchPlaceSuggestions(destinationText, city));
  }, [destinationText, city]);

  const currentVehicle: VehicleProfile =
    VEHICLE_PROFILES.find((v) => v.id === selectedVehicle) || VEHICLE_PROFILES[0];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/90 overflow-hidden flex flex-col transition-all duration-200">
      {/* ---------------- STATE 1: SEARCH INPUTS (Before route search or when editing) ---------------- */}
      {!comparison || isLoading ? (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  CP
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900 leading-tight">
                    ClimatePulse
                  </h1>
                  <p className="text-xs text-gray-500 font-normal">
                    Flood-aware navigation
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Safe Routing
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2 italic font-medium">
              "Fastest isn't always safest."
            </p>
          </div>

          {/* Error Message banner if geocoding or routing fails */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{errorMessage}</div>
                <div className="text-[11px] text-red-600 mt-0.5">
                  Please enter a valid landmark or city (e.g. Bengaluru, Electronic City, Whitefield, Mumbai, Delhi, Chennai, Hubballi).
                </div>
              </div>
            </div>
          )}

          {/* Location Inputs with Autocomplete */}
          <div className="space-y-2 relative">
            {/* Origin Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></div>
              </div>
              <input
                ref={originInputRef}
                type="text"
                placeholder="From where?"
                value={originText}
                onChange={(e) => {
                  onChangeOrigin(e.target.value);
                  setShowOriginSuggestions(true);
                }}
                onFocus={() => setShowOriginSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowOriginSuggestions(false);
                    setShowDestSuggestions(false);
                    onSearchRoute();
                  }
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium transition-colors"
              />
              {originText && (
                <button
                  type="button"
                  onClick={() => onChangeOrigin('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              )}

              {/* Origin Autocomplete Dropdown */}
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {originSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectOriginPlace(place);
                        setShowOriginSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {place.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {place.detail}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50"></div>
              </div>
              <input
                ref={destInputRef}
                type="text"
                placeholder="Where to?"
                value={destinationText}
                onChange={(e) => {
                  onChangeDestination(e.target.value);
                  setShowDestSuggestions(true);
                }}
                onFocus={() => setShowDestSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowOriginSuggestions(false);
                    setShowDestSuggestions(false);
                    onSearchRoute();
                  }
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm text-gray-900 placeholder-gray-400 font-medium transition-colors"
              />
              {destinationText && (
                <button
                  type="button"
                  onClick={() => onChangeDestination('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              )}

              {/* Destination Autocomplete Dropdown */}
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {destSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectDestinationPlace(place);
                        setShowDestSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {place.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {place.detail}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => {
              setShowOriginSuggestions(false);
              setShowDestSuggestions(false);
              onSearchRoute();
            }}
            disabled={isLoading || !originText || !destinationText}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Calculating Safe Route...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Find safer route</span>
              </>
            )}
          </button>

          {/* Quick Popular Demonstration Corridors */}
          {scenarios.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Demo flood corridors:</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onSelectScenario(sc)}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors text-xs group cursor-pointer"
                  >
                    <div className="font-semibold text-gray-800 group-hover:text-emerald-900 flex items-center justify-between">
                      <span>{sc.title}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      {sc.tagline}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtle Secondary Vehicle Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowVehiclePicker(!showVehiclePicker)}
              className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Car className="w-3 h-3" />
                <span>
                  Vehicle: <span className="font-semibold text-gray-700">{currentVehicle.name}</span> ({currentVehicle.clearanceCm}cm clearance)
                </span>
              </div>
              {showVehiclePicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showVehiclePicker && (
              <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                {VEHICLE_PROFILES.map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => {
                      onSelectVehicle(vp.id);
                      setShowVehiclePicker(false);
                    }}
                    className={`p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      selectedVehicle === vp.id
                        ? 'bg-emerald-700 text-white font-semibold'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <div className="font-semibold">{vp.name}</div>
                    <div className={`text-[10px] ${selectedVehicle === vp.id ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {vp.clearanceCm} cm clearance
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---------------- STATE 2: ROUTE EVALUATION & RESULTS ---------------- */
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Header with Origin -> Destination */}
          <div className="flex items-start justify-between pb-3 border-b border-gray-100">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <span>Route comparison</span>
                <span>•</span>
                <span>{currentVehicle.name}</span>
              </div>
              <div className="text-sm font-bold text-gray-900 truncate mt-0.5">
                {originText} <span className="text-gray-400 font-normal">→</span> {destinationText}
              </div>
            </div>
            <button
              type="button"
              onClick={onNewSearch}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 cursor-pointer pt-0.5"
            >
              Modify
            </button>
          </div>

          {/* ROUTE CARDS: SAFE VS FASTEST */}
          <div className="space-y-2.5">
            {/* OPTION 1: CLIMATE-SAFE ROUTE (RECOMMENDED) */}
            <div
              onClick={() => onSelectRouteType('SAFE')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                selectedRouteType === 'SAFE'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Safe Route
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      RECOMMENDED
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-gray-900">
                      {comparison.safe.durationMinutes} min
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {comparison.safe.distanceKm} km
                    </span>
                    {comparison.timeDeltaMinutes > 0 && (
                      <span className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                        +{comparison.timeDeltaMinutes} min detour
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Status explanation */}
              <div className="mt-2 text-xs text-gray-600 font-normal leading-relaxed">
                {comparison.avoidedHazardsCount > 0 ? (
                  <span className="text-emerald-800 font-medium">
                    🛡️ Avoids {comparison.avoidedHazardsCount} active flood hazard{comparison.avoidedHazardsCount > 1 ? 's' : ''}.
                  </span>
                ) : (
                  <span>Optimal dry asphalt path with low risk.</span>
                )}
                {' '}{comparison.safe.explanation}
              </div>
            </div>

            {/* OPTION 2: FASTEST ROUTE (HAZARDOUS) */}
            <div
              onClick={() => onSelectRouteType('FASTEST')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                selectedRouteType === 'FASTEST'
                  ? 'border-red-500 bg-red-50/40 shadow-xs ring-1 ring-red-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Fastest Route
                    </span>
                    {comparison.fastest.hazardsIntersected.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        FLOOD DANGER
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-gray-900">
                      {comparison.fastest.durationMinutes} min
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {comparison.fastest.distanceKm} km
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">
                      (Direct Path)
                    </span>
                  </div>
                </div>

                {comparison.fastest.hazardsIntersected.length > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Hazards encountered on fastest */}
              {comparison.fastest.hazardsIntersected.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {comparison.fastest.hazardsIntersected.map((hz, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-medium text-red-800 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>
                        ⚠️ Crosses {hz.name} ({hz.waterDepthCm} cm water depth)
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Risk of hydrostatic lock for {currentVehicle.name} (ground clearance {currentVehicle.clearanceCm} cm).
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Direct path has no major submerged choke points.
                </p>
              )}
            </div>
          </div>

          {/* AI / Safety Briefing Summary */}
          {(aiBriefing || comparison.safetySummary) && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed">
              <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Routing Recommendation</span>
              </div>
              <p>{aiBriefing || comparison.safetySummary}</p>
            </div>
          )}

          {/* Simulation Controls Panel (Clear User Control: Start, Pause, Resume, Stop) */}
          {simulationMode ? (
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <Car className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    Simulating {selectedRouteType === 'SAFE' ? 'Safe Route' : 'Fastest Route'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-600 font-mono">
                  {simulationStep + 1} / {Math.max(1, totalSteps)} pts
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-200"
                  style={{
                    width: `${totalSteps > 0 ? ((simulationStep + 1) / totalSteps) * 100 : 0}%`
                  }}
                />
              </div>

              {/* Explicit Simulation Action Buttons: [ Start / Resume ] [ Pause ] [ Stop ] */}
              <div className="flex items-center gap-1.5 pt-1">
                {!isSimPlaying ? (
                  <button
                    type="button"
                    onClick={onStartSimulation}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{simulationStep > 0 ? 'Resume' : 'Start'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPauseSimulation}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onStopSimulation}
                  className="py-1.5 px-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3" />
                  <span>Exit Simulation</span>
                </button>
              </div>
            </div>
          ) : (
            /* Bottom Actions */
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onEnterSimulation}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Drive</span>
              </button>

              <button
                type="button"
                onClick={onNewSearch}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
              >
                New Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
