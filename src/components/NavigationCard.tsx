import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  MapPin,
  X,
  ChevronLeft,
  AlertOctagon,
  Crosshair,
  Loader2
} from 'lucide-react';
import {
  CityId,
  PresetScenario,
  RouteComparisonResponse,
  VehicleType
} from '../types';
import { searchPlaceSuggestions, fetchPlaceSuggestions, PlaceResult } from '../services/geocodingService';

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
  onNewSearch: () => void;
  selectedVehicle?: VehicleType;
  onSelectVehicle?: (vehicle: VehicleType) => void;
  onDetectLocation?: () => void;
  isDetectingLocation?: boolean;
  onSimulateHazardOnRoute?: () => void;
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
  onNewSearch,
  onDetectLocation,
  isDetectingLocation = false,
  onSimulateHazardOnRoute
}) => {
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceResult[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Live debounced suggestions for origin
  useEffect(() => {
    let isCancelled = false;
    setOriginSuggestions(searchPlaceSuggestions(originText, city));

    const timer = setTimeout(async () => {
      if (originText.trim().length >= 2) {
        setIsSearchingOrigin(true);
        try {
          const res = await fetchPlaceSuggestions(originText, city);
          if (!isCancelled) {
            setOriginSuggestions(res);
          }
        } finally {
          if (!isCancelled) setIsSearchingOrigin(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [originText, city]);

  // Live debounced suggestions for destination
  useEffect(() => {
    let isCancelled = false;
    setDestSuggestions(searchPlaceSuggestions(destinationText, city));

    const timer = setTimeout(async () => {
      if (destinationText.trim().length >= 2) {
        setIsSearchingDest(true);
        try {
          const res = await fetchPlaceSuggestions(destinationText, city);
          if (!isCancelled) {
            setDestSuggestions(res);
          }
        } finally {
          if (!isCancelled) setIsSearchingDest(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [destinationText, city]);

  const handleSwap = () => {
    const tempOrigin = originText;
    onChangeOrigin(destinationText);
    onChangeDestination(tempOrigin);
  };

  // ---------------- SCREEN 1: COMPACT FLOATING SEARCH PANEL ----------------
  if (!comparison) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden text-gray-900 select-none">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">
              ClimatePulse
            </h1>
            <p className="text-xs text-gray-500 font-normal">
              Flood-aware navigation
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Location Inputs */}
          <div className="space-y-2.5 relative">
            {/* From Input */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  From
                </label>
                {onDetectLocation && (
                  <button
                    type="button"
                    onClick={onDetectLocation}
                    disabled={isDetectingLocation}
                    title="Use live GPS location"
                    className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer transition-colors"
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    ) : (
                      <Crosshair className="w-3 h-3" />
                    )}
                    <span>{isDetectingLocation ? 'Locating...' : 'Locate Me'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                </div>
                <input
                  ref={originInputRef}
                  type="text"
                  placeholder="Starting point (e.g. Koramangala or My Location)"
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
                  className="w-full pl-8 pr-14 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs text-gray-900 font-medium transition-colors"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  {isSearchingOrigin && (
                    <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                  {originText ? (
                    <button
                      type="button"
                      onClick={() => onChangeOrigin('')}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      aria-label="Clear origin"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : onDetectLocation ? (
                    <button
                      type="button"
                      onClick={onDetectLocation}
                      disabled={isDetectingLocation}
                      title="Detect current location"
                      className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Suggestions */}
              {showOriginSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {onDetectLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        onDetectLocation();
                        setShowOriginSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 bg-emerald-50/60 hover:bg-emerald-100/70 flex items-center gap-2 transition-colors cursor-pointer text-emerald-900"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Use Current GPS Location</div>
                        <div className="text-[10px] text-emerald-700/80">Detect doorstep coordinates</div>
                      </div>
                    </button>
                  )}
                  {originSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectOriginPlace(place);
                        setShowOriginSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {place.name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {place.detail}
                        </div>
                      </div>
                    </button>
                  ))}
                  {originSuggestions.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">
                      Type an area, road, or city name
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* To Input with Swap */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  To
                </label>
                <button
                  type="button"
                  onClick={handleSwap}
                  title="Swap locations"
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Swap</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                </div>
                <input
                  ref={destInputRef}
                  type="text"
                  placeholder="Destination (e.g. Electronic City or Powai)"
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
                  className="w-full pl-8 pr-14 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs text-gray-900 font-medium transition-colors"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  {isSearchingDest && (
                    <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                  {destinationText && (
                    <button
                      type="button"
                      onClick={() => onChangeDestination('')}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      aria-label="Clear destination"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {showDestSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {destSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectDestinationPlace(place);
                        setShowDestSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {place.name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {place.detail}
                        </div>
                      </div>
                    </button>
                  ))}
                  {destSuggestions.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">
                      Type any destination, area, or landmark
                    </div>
                  )}
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
            disabled={isLoading || !originText.trim() || !destinationText.trim()}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking flood hazards...</span>
              </>
            ) : (
              <span>Find safer route</span>
            )}
          </button>

          {/* Core Principle */}
          <div className="text-center">
            <span className="text-[11px] text-gray-500 italic">
              "Fastest isn't always safest."
            </span>
          </div>

          {/* Popular Corridors */}
          {scenarios.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider mb-1.5">
                Popular corridors
              </div>
              <div className="flex flex-col gap-1">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onSelectScenario(sc)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-xs text-gray-700 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-gray-800 group-hover:text-emerald-700">
                      {sc.title}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- SCREEN 2: COMPACT FLOATING ROUTE COMPARISON PANEL ----------------
  const primaryHazard = comparison.fastest.hazardsIntersected[0];
  const hazardName = primaryHazard ? primaryHazard.name : 'Flooded road sector';
  const hazardDepth = primaryHazard ? primaryHazard.waterDepthCm : 48;
  const hasSafeRoute = comparison.safeRouteFound && comparison.safe !== null;
  const safeRoute = comparison.safe;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden text-gray-900 select-none">
      <div className="p-4 sm:p-5 space-y-4">
        {/* Header / Edit Route Action */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <button
            type="button"
            onClick={onNewSearch}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
            <span>Edit route</span>
          </button>
          <div className="text-[11px] text-gray-400 font-medium truncate max-w-[180px]">
            {originText} → {destinationText}
          </div>
        </div>

        {isNavigating && safeRoute ? (
          /* Active Navigation State */
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Navigating via Safer Route</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Route avoids {hazardName} ({hazardDepth} cm standing water). Following verified dry corridor.
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-emerald-200/60">
              <span>{safeRoute.durationMinutes} min remaining</span>
              <span>{safeRoute.distanceKm} km</span>
            </div>
            <button
              type="button"
              onClick={() => setIsNavigating(false)}
              className="w-full py-1.5 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors cursor-pointer"
            >
              End navigation
            </button>
          </div>
        ) : (
          /* Comparison or No-Safe-Route View */
          <>
            {hasSafeRoute && safeRoute ? (
              /* 1. SAFER ROUTE CARD (When a verified safe alternate route exists) */
              <div
                onClick={() => onSelectRouteType('SAFE')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedRouteType === 'SAFE'
                    ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    SAFER ROUTE
                  </span>
                  <div className="flex items-center gap-1.5">
                    {safeRoute.longDetour && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                        Long detour
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-gray-900">
                    {safeRoute.durationMinutes} min
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    · {safeRoute.distanceKm} km
                  </span>
                </div>

                <div className="text-xs text-emerald-800 font-medium mt-1">
                  Low flood risk
                </div>

                <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">
                    +{comparison.timeDeltaMinutes} min
                  </span>
                  <span>·</span>
                  <span>
                    Avoids {comparison.avoidedHazardsCount} flooded road{comparison.avoidedHazardsCount === 1 ? '' : 's'}
                  </span>
                </div>

                {selectedRouteType === 'SAFE' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavigating(true);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Use safer route
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* 1b. NO SAFE ALTERNATE ROUTE WARNING (When all corridors cross flood hazards) */
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>No flood-safe alternate route found</span>
                </div>
                <p className="text-xs text-gray-700 leading-snug">
                  All viable corridors between these points cross active flood hazards. No flood-free bypass could be safely verified.
                </p>
                <div className="text-[11px] text-amber-900 font-medium pt-1">
                  Advice: Postpone travel until flood waters recede.
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* 2. FASTEST ROUTE CARD */}
            <div
              onClick={() => onSelectRouteType('FASTEST')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedRouteType === 'FASTEST'
                  ? 'border-red-500 bg-red-50/30 ring-1 ring-red-500'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  FASTEST ROUTE
                </span>
                {comparison.fastest.hazardsIntersected.length > 0 && (
                  <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                    High flood risk
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-gray-900">
                  {comparison.fastest.durationMinutes} min
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  · {comparison.fastest.distanceKm} km
                </span>
              </div>

              {comparison.fastest.hazardsIntersected.length > 0 ? (
                <div className="mt-2 text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{hazardName}</span>
                  </div>
                  <div className="text-red-700 font-semibold text-xs">
                    {hazardDepth} cm water depth
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Direct path enters submerged section ({primaryHazard?.minimumDistanceMeters ?? 0}m from center).
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">
                  Direct path has no major submerged choke points.
                </div>
              )}
            </div>

            {/* Core Question Prompt */}
            {hasSafeRoute && comparison.fastest.hazardsIntersected.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-700 leading-snug">
                  Is saving{' '}
                  <strong className="text-gray-900">
                    {comparison.timeDeltaMinutes} minutes
                  </strong>{' '}
                  worth driving through{' '}
                  <strong className="text-red-700">{hazardDepth} cm</strong> of flood water?
                </p>
              </div>
            )}

            {/* Test Simulation Button */}
            {onSimulateHazardOnRoute && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onSimulateHazardOnRoute}
                  className="w-full py-2 px-3 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100/80 active:bg-red-200 text-red-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Simulate a newly reported flash flood hazard along the active route"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Simulate Hazard on Active Route (Test Alert)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
