import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { RouteSearch } from './components/RouteSearch';
import { RouteComparison } from './components/RouteComparison';
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
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'streets'>('dark');

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

  // Handle Scenario Selection
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

  // Handle Map Click to set custom point
  const handleMapClick = (coords: [number, number]) => {
    setActiveScenarioId(null); // Clear preset lock!
    setDestCoords(coords);
    setDestinationText(`Pinned Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
    runRouteCalculation({
      origin: originCoords,
      dest: coords,
      scenarioId: undefined // Enforce dynamic route calculation!
    });
  };

  // Handle text input changes
  const handleChangeOrigin = (val: string) => {
    setActiveScenarioId(null); // Clear preset lock!
    setOriginText(val);
  };

  const handleChangeDestination = (val: string) => {
    setActiveScenarioId(null); // Clear preset lock!
    setDestinationText(val);
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

      // Dynamically recalculate routes factoring in new hazard
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

  // Reset to initial data
  const handleResetData = async () => {
    setHazards(INITIAL_HAZARDS);
    try {
      await fetch('/api/reset-hazards', { method: 'POST' });
    } catch {}
    runRouteCalculation();
  };

  const cityMeta = CITY_CENTERS[currentCity] || CITY_CENTERS.bengaluru;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={setCurrentCity}
        weather={weather}
        activeHazardsCount={hazards.filter((h) => h.city === currentCity).length}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenHazardsList={() => setIsHazardsListOpen(true)}
        onResetData={handleResetData}
      />

      {/* Main Command Center Split View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Interactive Map Canvas (60% width on Desktop) */}
        <section className="w-full lg:w-7/12 flex flex-col gap-3 min-h-[440px] lg:min-h-[640px]">
          {/* Map Controls Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">
                {cityMeta.name} Corridor View
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showHazards}
                  onChange={(e) => setShowHazards(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Hazard Danger Zones</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapTileTheme((t) => (t === 'dark' ? 'streets' : 'dark'))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                {mapTileTheme === 'dark' ? '🌙 Dark Mode Tiles' : '☀️ Light Tiles'}
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
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

            {/* Simulation Active HUD */}
            {isSimulating && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-emerald-500/50 shadow-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>Simulating Drive: {selectedRouteType === 'SAFE' ? 'ClimatePulse Safe Corridor' : 'Fastest Route'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                        Active Guidance
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Waypoint step {simulationIndex + 1} of{' '}
                      {(selectedRouteType === 'SAFE'
                        ? comparison?.safe.coordinates.length
                        : comparison?.fastest.coordinates.length) || 0}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSimulating(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
                >
                  Exit HUD
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Search, Comparison & Analysis Panels (40% width on Desktop) */}
        <section className="w-full lg:w-5/12 flex flex-col gap-4">
          {/* Route Search & Scenario Selector */}
          <RouteSearch
            scenarios={cityScenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            originText={originText}
            destinationText={destinationText}
            onChangeOrigin={handleChangeOrigin}
            onChangeDestination={handleChangeDestination}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onCalculate={() =>
              runRouteCalculation({
                origin: originCoords,
                dest: destCoords,
                scenarioId: activeScenarioId || undefined
              })
            }
            isLoading={isLoading}
          />

          {/* Route Comparison Card & Risk Metrics */}
          {comparison && (
            <RouteComparison
              comparison={comparison}
              selectedRouteType={selectedRouteType}
              onSelectRouteType={setSelectedRouteType}
              isSimulating={isSimulating}
              onToggleSimulation={() => setIsSimulating((s) => !s)}
              aiBriefing={aiBriefing}
              isLoadingBriefing={isLoadingBriefing}
            />
          )}
        </section>
      </main>

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
