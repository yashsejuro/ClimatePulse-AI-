import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { NavigationCard } from './components/NavigationCard';
import { CitizenReportModal } from './components/CitizenReportModal';
import { HazardsListModal } from './components/HazardsListModal';
import {
  CityId,
  HazardZone,
  CitizenReport,
  RouteComparisonResponse,
  PresetScenario,
  VehicleType,
  CityWeather
} from './types';
import {
  INITIAL_HAZARDS,
  INITIAL_WEATHER,
  PRESET_SCENARIOS,
  CITY_CENTERS,
  VEHICLE_PROFILES
} from './data/seedHazards';
import { calculateDualRoutes } from './services/routingService';
import { resolveLocation, PlaceResult } from './services/geocodingService';
import { Layers, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [currentCity, setCurrentCity] = useState<CityId>('bengaluru');
  const [weather, setWeather] = useState<CityWeather>(INITIAL_WEATHER.bengaluru);
  const [hazards, setHazards] = useState<HazardZone[]>(INITIAL_HAZARDS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);

  // Scenario & Input State
  const cityScenarios = PRESET_SCENARIOS.filter((s) => s.city === currentCity);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    cityScenarios[0]?.id || null
  );

  const initialPreset = cityScenarios[0] || PRESET_SCENARIOS[0];
  const [originText, setOriginText] = useState(initialPreset.origin.name);
  const [destinationText, setDestinationText] = useState(initialPreset.destination.name);
  const [originCoords, setOriginCoords] = useState<[number, number]>(initialPreset.origin.coords);
  const [destCoords, setDestCoords] = useState<[number, number]>(initialPreset.destination.coords);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('sedan');

  // Evaluation & Route State
  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'FASTEST' | 'SAFE'>('SAFE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const [simulationPosition, setSimulationPosition] = useState<[number, number] | null>(null);
  const simulationTimerRef = useRef<any>(null);

  // UI Modals & Map controls
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHazardsListOpen, setIsHazardsListOpen] = useState(false);
  const [showHazards, setShowHazards] = useState(true);
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'streets'>('streets');

  // Load weather, hazards and scenarios when city changes
  useEffect(() => {
    const defaultW = INITIAL_WEATHER[currentCity] || INITIAL_WEATHER.bengaluru;
    setWeather(defaultW);

    const filteredScenarios = PRESET_SCENARIOS.filter((s) => s.city === currentCity);
    const newScenario = filteredScenarios[0] || null;

    if (newScenario) {
      setActiveScenarioId(newScenario.id);
      setOriginText(newScenario.origin.name);
      setDestinationText(newScenario.destination.name);
      setOriginCoords(newScenario.origin.coords);
      setDestCoords(newScenario.destination.coords);
    } else {
      setActiveScenarioId(null);
    }

    // Fetch from backend API with fallback
    fetch(`/api/weather?city=${currentCity}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rainfallMmPerHour) setWeather(data);
      })
      .catch(() => {});

    fetch(`/api/hazards?city=${currentCity}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHazards(data);
        }
      })
      .catch(() => {});

    fetch(`/api/reports?city=${currentCity}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCitizenReports(data);
      })
      .catch(() => {});
  }, [currentCity]);

  // Recalculate routes whenever coords, vehicle, hazards, or scenario changes
  const runRouteCalculation = async (override?: {
    origin?: [number, number];
    dest?: [number, number];
    scenarioId?: string;
  }) => {
    setIsLoading(true);
    setIsSimulating(false);
    setSimulationPosition(null);

    const origin = override?.origin || originCoords;
    const dest = override?.dest || destCoords;
    const scenarioId = override?.scenarioId !== undefined ? override.scenarioId : (activeScenarioId || undefined);

    const vehicle = VEHICLE_PROFILES.find((v) => v.id === selectedVehicle) || VEHICLE_PROFILES[0];

    try {
      // 1. Dual-source execution: Try backend route API first
      let result: RouteComparisonResponse | null = null;
      try {
        const response = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination: dest,
            vehicleId: selectedVehicle,
            scenarioId,
            city: currentCity
          })
        });
        if (response.ok) {
          result = await response.json();
        }
      } catch {
        // Fall back to client calculation
      }

      // 2. Client-side fallback if server is unreachable
      if (!result) {
        result = await calculateDualRoutes(
          origin,
          dest,
          hazards,
          vehicle,
          weather.rainfallMmPerHour,
          scenarioId
        );
      }

      setComparison(result);
      setSelectedRouteType('SAFE');

      // 3. Request safety briefing
      if (result.fastest.hazardsIntersected.length > 0) {
        setIsLoadingBriefing(true);
        fetch('/api/ai-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fastestHazards: result.fastest.hazardsIntersected,
            timeDelta: result.timeDeltaMinutes,
            distanceDelta: result.distanceDeltaKm,
            vehicleName: vehicle.name
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.briefing) setAiBriefing(data.briefing);
          })
          .catch(() => {
            setAiBriefing(result.safetySummary);
          })
          .finally(() => setIsLoadingBriefing(false));
      } else {
        setAiBriefing(result.safetySummary);
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial calculation once scenario / city is set
  useEffect(() => {
    runRouteCalculation();
  }, [currentCity, selectedVehicle]);

  // Primary user action: Find Safer Route with real Location Resolution / Geocoding
  const handleSearchRoute = async () => {
    setIsLoading(true);
    let resolvedOriginCoords = originCoords;
    let resolvedDestCoords = destCoords;

    try {
      // Trace: FROM INPUT -> LOCATION RESOLUTION -> COORDINATES -> POST /api/route
      const [resolvedOrigin, resolvedDest] = await Promise.all([
        resolveLocation(originText, currentCity),
        resolveLocation(destinationText, currentCity)
      ]);

      resolvedOriginCoords = resolvedOrigin.coords;
      resolvedDestCoords = resolvedDest.coords;

      setOriginCoords(resolvedOriginCoords);
      setDestCoords(resolvedDestCoords);
    } catch (err) {
      console.warn('Geocoding resolution fallback to existing coordinates', err);
    }

    runRouteCalculation({
      origin: resolvedOriginCoords,
      dest: resolvedDestCoords,
      scenarioId: activeScenarioId || undefined
    });
  };

  // Handle Scenario Selection (1-click demo corridors)
  const handleSelectScenario = (scenario: PresetScenario) => {
    setActiveScenarioId(scenario.id);
    setOriginText(scenario.origin.name);
    setDestinationText(scenario.destination.name);
    setOriginCoords(scenario.origin.coords);
    setDestCoords(scenario.destination.coords);
    runRouteCalculation({
      origin: scenario.origin.coords,
      dest: scenario.destination.coords,
      scenarioId: scenario.id
    });
  };

  // Handle Autocomplete Place Selection
  const handleSelectOriginPlace = (place: PlaceResult) => {
    setActiveScenarioId(null);
    setOriginText(place.name);
    setOriginCoords(place.coords);
  };

  const handleSelectDestinationPlace = (place: PlaceResult) => {
    setActiveScenarioId(null);
    setDestinationText(place.name);
    setDestCoords(place.coords);
  };

  // Handle Map Click to set custom point
  const handleMapClick = (coords: [number, number]) => {
    setActiveScenarioId(null);
    setDestCoords(coords);
    setDestinationText(`Pinned Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
    runRouteCalculation({
      origin: originCoords,
      dest: coords,
      scenarioId: undefined
    });
  };

  // Handle text input changes
  const handleChangeOrigin = (val: string) => {
    setActiveScenarioId(null);
    setOriginText(val);
  };

  const handleChangeDestination = (val: string) => {
    setActiveScenarioId(null);
    setDestinationText(val);
  };

  // Reset search / back to inputs
  const handleNewSearch = () => {
    setComparison(null);
    setIsSimulating(false);
  };

  // Drive Simulation Loop
  useEffect(() => {
    if (!isSimulating || !comparison) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setSimulationPosition(null);
      return;
    }

    const routeCoords =
      selectedRouteType === 'SAFE'
        ? comparison.safe.coordinates
        : comparison.fastest.coordinates;

    if (routeCoords.length === 0) return;

    let index = 0;
    setSimulationIndex(0);
    setSimulationPosition(routeCoords[0]);

    simulationTimerRef.current = setInterval(() => {
      index += 1;
      if (index >= routeCoords.length) {
        setIsSimulating(false);
        setSimulationPosition(null);
        clearInterval(simulationTimerRef.current);
      } else {
        setSimulationIndex(index);
        setSimulationPosition(routeCoords[index]);
      }
    }, 280);

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating, selectedRouteType]);

  // Handle Citizen Report Submission with live validation feedback
  const handleSubmitReport = async (reportData: {
    city: CityId;
    location: [number, number];
    address: string;
    imageBase64?: string;
    waterDepthCm: number;
    userNotes: string;
  }) => {
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      let responseData: any = null;

      if (response.ok) {
        responseData = await response.json();
        if (responseData.hazard) {
          setHazards((prev) => [responseData.hazard, ...prev]);
        }
        if (responseData.report) {
          setCitizenReports((prev) => [responseData.report, ...prev]);
        }
      } else {
        // Fallback local injection
        const newHazard: HazardZone = {
          id: `hazard-local-${Date.now()}`,
          city: reportData.city,
          name: reportData.address,
          roadName: reportData.address,
          center: reportData.location,
          radiusMeters: Math.min(500, Math.max(250, reportData.waterDepthCm * 8)),
          severity: reportData.waterDepthCm >= 40 ? 'CRITICAL' : 'HIGH',
          waterDepthCm: reportData.waterDepthCm,
          rainfallIntensityMmPerHour: 34,
          riskWeight: 0.9,
          source: 'CITIZEN_REPORT',
          verified: true,
          reportedAt: 'Just now',
          notes: reportData.userNotes
        };
        setHazards((prev) => [newHazard, ...prev]);

        responseData = {
          success: true,
          validation: {
            isFlooded: true,
            confidence: 89,
            estimatedSeverity: newHazard.severity,
            estimatedWaterDepthCm: reportData.waterDepthCm,
            indicators: ['Surface ponding reported by citizen submission'],
            analysisSource: 'FALLBACK_HEURISTIC'
          }
        };
      }

      // Recalculate routes factoring in new hazard
      setTimeout(() => {
        runRouteCalculation();
      }, 250);

      return responseData;
    } catch {
      runRouteCalculation();
      return {
        success: true,
        validation: {
          isFlooded: true,
          confidence: 85,
          estimatedSeverity: 'HIGH',
          estimatedWaterDepthCm: reportData.waterDepthCm,
          indicators: ['Citizen verified ponding record'],
          analysisSource: 'FALLBACK_HEURISTIC'
        }
      };
    }
  };

  // Reset to initial seed data
  const handleResetData = async () => {
    setHazards(INITIAL_HAZARDS);
    try {
      await fetch('/api/reset-hazards', { method: 'POST' });
    } catch {}
    runRouteCalculation();
  };

  const cityMeta = CITY_CENTERS[currentCity] || CITY_CENTERS.bengaluru;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Slim Top Navbar */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={setCurrentCity}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetData={handleResetData}
      />

      {/* Main Map Canvas Area (Full Viewport Height) */}
      <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* Full-bleed interactive Map */}
        <Map
          center={cityMeta.center}
          zoom={cityMeta.zoom}
          hazards={hazards.filter((h) => h.city === currentCity)}
          citizenReports={citizenReports.filter((r) => r.city === currentCity)}
          fastestRoute={comparison?.fastest || null}
          safeRoute={comparison?.safe || null}
          selectedRouteType={selectedRouteType}
          onSelectRouteType={setSelectedRouteType}
          origin={{ name: originText, coords: originCoords }}
          destination={{ name: destinationText, coords: destCoords }}
          onMapClick={handleMapClick}
          simulationPosition={simulationPosition}
          showHazards={showHazards}
          mapTileTheme={mapTileTheme}
        />

        {/* Floating Navigation Card (Google/Apple Maps style on left) */}
        <div className="absolute top-4 left-4 z-20 w-96 sm:w-[410px] max-w-[calc(100vw-32px)]">
          <NavigationCard
            city={currentCity}
            scenarios={cityScenarios}
            originText={originText}
            destinationText={destinationText}
            onChangeOrigin={handleChangeOrigin}
            onChangeDestination={handleChangeDestination}
            onSelectOriginPlace={handleSelectOriginPlace}
            onSelectDestinationPlace={handleSelectDestinationPlace}
            onSelectScenario={handleSelectScenario}
            onSearchRoute={handleSearchRoute}
            isLoading={isLoading}
            comparison={comparison}
            selectedRouteType={selectedRouteType}
            onSelectRouteType={setSelectedRouteType}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating((s) => !s)}
            aiBriefing={aiBriefing}
            onNewSearch={handleNewSearch}
          />
        </div>

        {/* Floating Map Controls on Top-Right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Toggle Flood Hazards */}
          <button
            onClick={() => setShowHazards((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold shadow-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showHazards
                ? 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                : 'bg-gray-100 text-gray-500 border-gray-300'
            }`}
            title="Toggle visibility of flood hazard danger zones"
          >
            {showHazards ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Flood Hazards</span>
          </button>

          {/* Map Tile Theme Toggle */}
          <button
            onClick={() => setMapTileTheme((t) => (t === 'dark' ? 'streets' : 'dark'))}
            className="px-3 py-2 rounded-xl bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 shadow-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Toggle Street Map vs Satellite Dark"
          >
            <Layers className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline">{mapTileTheme === 'dark' ? 'Streets' : 'Dark'}</span>
          </button>
        </div>

        {/* Drive Simulation Floating Active HUD */}
        {isSimulating && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 bg-white/95 border border-gray-300 shadow-xl px-4 py-2.5 rounded-full flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-gray-900 font-semibold">
                Simulating {selectedRouteType === 'SAFE' ? 'Safe Route' : 'Fastest Route'}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">
                Step {simulationIndex + 1} of{' '}
                {(selectedRouteType === 'SAFE'
                  ? comparison?.safe.coordinates.length
                  : comparison?.fastest.coordinates.length) || 0}
              </span>
            </div>
            <button
              onClick={() => setIsSimulating(false)}
              className="px-2.5 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-800 font-semibold cursor-pointer text-[11px]"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Citizen Hazard Reporting Modal */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        city={currentCity}
        defaultLocation={originCoords}
        onSubmitReport={handleSubmitReport}
      />

      {/* Monitored Hazards Modal */}
      <HazardsListModal
        isOpen={isHazardsListOpen}
        onClose={() => setIsHazardsListOpen(false)}
        hazards={hazards.filter((h) => h.city === currentCity)}
        cityName={cityMeta.name}
      />
    </div>
  );
}
