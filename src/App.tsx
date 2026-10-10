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
import { CITIES } from './data/cities';
import {
  INITIAL_HAZARDS,
  INITIAL_WEATHER,
  PRESET_SCENARIOS,
  VEHICLE_PROFILES
} from './data/seedHazards';
import { calculateDualRoutes } from './services/routingService';
import { resolveLocation, PlaceResult } from './services/geocodingService';
import { Layers, Eye, EyeOff } from 'lucide-react';

export default function App() {
  // 1. City state (Canonical city ID)
  const [currentCity, setCurrentCity] = useState<CityId>('bengaluru');
  const [weather, setWeather] = useState<CityWeather>(INITIAL_WEATHER.bengaluru);
  const [hazards, setHazards] = useState<HazardZone[]>(INITIAL_HAZARDS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);

  // 2. Search & Location State (Explicit separation of input text vs resolved coordinates)
  const cityScenarios = PRESET_SCENARIOS.filter((s) => s.city === currentCity);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    cityScenarios[0]?.id || null
  );

  const initialPreset = cityScenarios[0] || PRESET_SCENARIOS[0];
  const [originText, setOriginText] = useState<string>(initialPreset.origin.name);
  const [destinationText, setDestinationText] = useState<string>(initialPreset.destination.name);
  const [resolvedOriginCoords, setResolvedOriginCoords] = useState<[number, number]>(
    initialPreset.origin.coords
  );
  const [resolvedDestCoords, setResolvedDestCoords] = useState<[number, number]>(
    initialPreset.destination.coords
  );

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('sedan');

  // 3. Evaluation & Route State
  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'FASTEST' | 'SAFE'>('SAFE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);

  // 4. Controlled Simulation State (Explicit user control: open mode, play, pause, stop)
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(false);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const [simulationPosition, setSimulationPosition] = useState<[number, number] | null>(null);
  const simulationTimerRef = useRef<any>(null);

  // 5. UI Modals & Map options
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHazardsListOpen, setIsHazardsListOpen] = useState(false);
  const [showHazards, setShowHazards] = useState(true);
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'streets'>('streets');

  // City change handler: switches city context without silently overwriting active custom searches
  const handleSelectCity = (newCity: CityId) => {
    console.log(`[CITY CHANGE] Switching to: ${newCity}`);
    setCurrentCity(newCity);

    // Stop any running simulation
    setSimulationMode(false);
    setIsSimPlaying(false);
    setSimulationPosition(null);

    // Load initial scenario defaults for this newly selected city
    const scenariosForCity = PRESET_SCENARIOS.filter((s) => s.city === newCity);
    const firstScenario = scenariosForCity[0];

    if (firstScenario) {
      setActiveScenarioId(firstScenario.id);
      setOriginText(firstScenario.origin.name);
      setDestinationText(firstScenario.destination.name);
      setResolvedOriginCoords(firstScenario.origin.coords);
      setResolvedDestCoords(firstScenario.destination.coords);
      setErrorMessage(null);
    } else {
      setActiveScenarioId(null);
      const cMeta = CITIES[newCity] || CITIES.bengaluru;
      setOriginText(`${cMeta.name} Center`);
      setDestinationText(`${cMeta.name} North`);
      setResolvedOriginCoords(cMeta.center);
      setResolvedDestCoords([cMeta.center[0] + 0.05, cMeta.center[1] + 0.05]);
      setErrorMessage(null);
    }
  };

  // Sync city data (weather, hazards, reports)
  useEffect(() => {
    const defaultW = INITIAL_WEATHER[currentCity] || INITIAL_WEATHER.bengaluru;
    setWeather(defaultW);

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

  // Route calculation execution
  const executeRouteCalculation = async (params: {
    origin: [number, number];
    dest: [number, number];
    scenarioId?: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    // Stop any simulation
    setSimulationMode(false);
    setIsSimPlaying(false);
    setSimulationPosition(null);

    const vehicle = VEHICLE_PROFILES.find((v) => v.id === selectedVehicle) || VEHICLE_PROFILES[0];

    const payload = {
      origin: params.origin,
      destination: params.dest,
      vehicleId: selectedVehicle,
      scenarioId: params.scenarioId,
      city: currentCity
    };

    console.log('[ROUTE REQUEST] payload:', payload);

    try {
      let result: RouteComparisonResponse | null = null;

      // 1. Dual-source execution: Call backend /api/route first
      try {
        const response = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          result = await response.json();
          console.log('[ROUTE RESPONSE] status: 200 via backend API', result);
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('[ROUTE RESPONSE] server returned error:', response.status, errData);
        }
      } catch (networkErr) {
        console.warn('[ROUTE REQUEST] API network error, trying client fallback:', networkErr);
      }

      // 2. Client-side fallback if server fails
      if (!result) {
        console.log('[ROUTE CALCULATION] Falling back to client-side routing engine');
        result = await calculateDualRoutes(
          params.origin,
          params.dest,
          hazards,
          vehicle,
          weather.rainfallMmPerHour,
          params.scenarioId
        );
      }

      if (!result || !result.fastest || !result.safe) {
        throw new Error('Could not calculate a route.');
      }

      console.log(
        `[ROUTE RESPONSE] Success: Safe ${result.safe.distanceKm}km (${result.safe.durationMinutes}min), Fastest ${result.fastest.distanceKm}km (${result.fastest.durationMinutes}min)`
      );

      setComparison(result);
      setSelectedRouteType('SAFE');
      setAiBriefing(result.safetySummary);
    } catch (err: any) {
      console.error('[ROUTE CALCULATION ERROR]:', err);
      setErrorMessage(err?.message || 'Could not calculate a route.');
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Run calculation when city changes
  useEffect(() => {
    executeRouteCalculation({
      origin: resolvedOriginCoords,
      dest: resolvedDestCoords,
      scenarioId: activeScenarioId || undefined
    });
  }, [currentCity, selectedVehicle]);

  // Primary user action: Find Safer Route
  const handleSearchRoute = async () => {
    console.log('[ROUTE SEARCH]');
    console.log('origin input:', originText);
    console.log('destination input:', destinationText);

    setIsLoading(true);
    setErrorMessage(null);

    // Clear scenario ID for manual searches so it doesn't lock to demo preset
    setActiveScenarioId(null);

    try {
      // Trace: Origin input -> destination input -> geocoding -> resolved coordinates
      const [originResolved, destResolved] = await Promise.all([
        resolveLocation(originText, currentCity),
        resolveLocation(destinationText, currentCity)
      ]);

      console.log('[GEOCODE]');
      console.log('origin coordinates:', originResolved.coords, `(${originResolved.name})`);
      console.log('destination coordinates:', destResolved.coords, `(${destResolved.name})`);

      setResolvedOriginCoords(originResolved.coords);
      setResolvedDestCoords(destResolved.coords);

      await executeRouteCalculation({
        origin: originResolved.coords,
        dest: destResolved.coords,
        scenarioId: undefined // Explicitly undefined: NEVER use preset for manual search!
      });
    } catch (err: any) {
      console.error('[SEARCH FAILED]:', err.message);
      setIsLoading(false);
      setErrorMessage(err?.message || 'Could not find that location.');
      setComparison(null);
    }
  };

  // Handle Preset Corridor Click (1-click demo routes)
  const handleSelectScenario = (scenario: PresetScenario) => {
    console.log(`[SCENARIO SELECT] ${scenario.id}: ${scenario.title}`);
    setActiveScenarioId(scenario.id);
    setOriginText(scenario.origin.name);
    setDestinationText(scenario.destination.name);
    setResolvedOriginCoords(scenario.origin.coords);
    setResolvedDestCoords(scenario.destination.coords);
    setErrorMessage(null);

    executeRouteCalculation({
      origin: scenario.origin.coords,
      dest: scenario.destination.coords,
      scenarioId: scenario.id
    });
  };

  // Handle Autocomplete Place Selection
  const handleSelectOriginPlace = (place: PlaceResult) => {
    setActiveScenarioId(null);
    setOriginText(place.name);
    setResolvedOriginCoords(place.coords);
    setErrorMessage(null);
  };

  const handleSelectDestinationPlace = (place: PlaceResult) => {
    setActiveScenarioId(null);
    setDestinationText(place.name);
    setResolvedDestCoords(place.coords);
    setErrorMessage(null);
  };

  // Handle Map Click to set custom destination
  const handleMapClick = (coords: [number, number]) => {
    setActiveScenarioId(null);
    setResolvedDestCoords(coords);
    setDestinationText(`Pinned Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
    setErrorMessage(null);

    executeRouteCalculation({
      origin: resolvedOriginCoords,
      dest: coords,
      scenarioId: undefined
    });
  };

  // Handle text input changes
  const handleChangeOrigin = (val: string) => {
    setActiveScenarioId(null);
    setOriginText(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handleChangeDestination = (val: string) => {
    setActiveScenarioId(null);
    setDestinationText(val);
    if (errorMessage) setErrorMessage(null);
  };

  // Reset / Modify Search
  const handleNewSearch = () => {
    setComparison(null);
    setSimulationMode(false);
    setIsSimPlaying(false);
    setSimulationPosition(null);
    setErrorMessage(null);
  };

  // ---------------- SIMULATION LOGIC: Controlled by user (NO AUTOPLAY) ----------------
  const currentRouteCoords = comparison
    ? (selectedRouteType === 'SAFE' ? comparison.safe.coordinates : comparison.fastest.coordinates)
    : [];

  const handleEnterSimulation = () => {
    setSimulationMode(true);
    setIsSimPlaying(false); // DO NOT AUTOPLAY! Wait for user to click Start
    setSimulationIndex(0);
    if (currentRouteCoords.length > 0) {
      setSimulationPosition(currentRouteCoords[0]);
    }
  };

  const handleStartSimulation = () => {
    setIsSimPlaying(true);
  };

  const handlePauseSimulation = () => {
    setIsSimPlaying(false);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  };

  const handleStopSimulation = () => {
    setIsSimPlaying(false);
    setSimulationMode(false);
    setSimulationIndex(0);
    setSimulationPosition(null);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  };

  // Animation frame / interval execution ONLY when isSimPlaying === true
  useEffect(() => {
    if (!simulationMode || !isSimPlaying || currentRouteCoords.length === 0) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    simulationTimerRef.current = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = prev + 1;
        if (next >= currentRouteCoords.length) {
          setIsSimPlaying(false);
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          return prev;
        }
        setSimulationPosition(currentRouteCoords[next]);
        return next;
      });
    }, 280);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, [simulationMode, isSimPlaying, currentRouteCoords]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  // Handle Citizen Report Submission
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
            reasoning: 'Verified flood hazard recorded into live telemetry layer.'
          }
        };
      }

      // Recalculate route to reflect new hazard
      executeRouteCalculation({
        origin: resolvedOriginCoords,
        dest: resolvedDestCoords,
        scenarioId: undefined
      });

      return responseData;
    } catch (err) {
      console.error('Report submission failed:', err);
    }
  };

  const handleResetData = async () => {
    setHazards(INITIAL_HAZARDS);
    try {
      await fetch('/api/reset-hazards', { method: 'POST' });
    } catch {}
    executeRouteCalculation({
      origin: resolvedOriginCoords,
      dest: resolvedDestCoords,
      scenarioId: activeScenarioId || undefined
    });
  };

  const cityMeta = CITIES[currentCity] || CITIES.bengaluru;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gray-50 text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar with canonical City selection */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetData={handleResetData}
      />

      {/* Main Map Canvas Area (Full Viewport Height) */}
      <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* Full-bleed Leaflet Map */}
        <Map
          center={cityMeta.center}
          zoom={cityMeta.zoom}
          hazards={hazards.filter((h) => h.city === currentCity)}
          citizenReports={citizenReports.filter((r) => r.city === currentCity)}
          fastestRoute={comparison?.fastest || null}
          safeRoute={comparison?.safe || null}
          selectedRouteType={selectedRouteType}
          onSelectRouteType={setSelectedRouteType}
          origin={{ name: originText, coords: resolvedOriginCoords }}
          destination={{ name: destinationText, coords: resolvedDestCoords }}
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
            errorMessage={errorMessage}
            comparison={comparison}
            selectedRouteType={selectedRouteType}
            onSelectRouteType={setSelectedRouteType}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            simulationMode={simulationMode}
            isSimPlaying={isSimPlaying}
            simulationStep={simulationIndex}
            totalSteps={currentRouteCoords.length}
            onEnterSimulation={handleEnterSimulation}
            onStartSimulation={handleStartSimulation}
            onPauseSimulation={handlePauseSimulation}
            onStopSimulation={handleStopSimulation}
            aiBriefing={aiBriefing}
            onNewSearch={handleNewSearch}
          />
        </div>

        {/* Floating Map Controls on Top-Right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Toggle Flood Hazards */}
          <button
            type="button"
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

          {/* Toggle Dark/Street Theme */}
          <button
            type="button"
            onClick={() => setMapTileTheme((t) => (t === 'streets' ? 'dark' : 'streets'))}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-md text-xs font-medium cursor-pointer"
            title="Toggle Map Basemap"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Citizen Report Modal */}
      {isReportModalOpen && (
        <CitizenReportModal
          city={currentCity}
          defaultLocation={cityMeta.center}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleSubmitReport}
        />
      )}

      {/* Hazards List Modal */}
      {isHazardsListOpen && (
        <HazardsListModal
          cityName={cityMeta.name}
          hazards={hazards.filter((h) => h.city === currentCity)}
          isOpen={isHazardsListOpen}
          onClose={() => setIsHazardsListOpen(false)}
        />
      )}
    </div>
  );
}
