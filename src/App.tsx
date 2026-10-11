import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { NavigationCard } from './components/NavigationCard';
import { CitizenReportModal } from './components/CitizenReportModal';
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
import { resolveLocation, PlaceResult } from './services/geocodingService';

export default function App() {
  const latestRequestIdRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // 1. City state
  const [currentCity, setCurrentCity] = useState<CityId>('bengaluru');
  const [weather, setWeather] = useState<CityWeather>(INITIAL_WEATHER.bengaluru);
  const [hazards, setHazards] = useState<HazardZone[]>(INITIAL_HAZARDS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);

  // 2. Search & Location State (Screen 1 vs Screen 2)
  const cityScenarios = PRESET_SCENARIOS.filter((s) => s.city === currentCity);
  const initialPreset = cityScenarios[0] || PRESET_SCENARIOS[0];

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    initialPreset?.id || null
  );
  const [originText, setOriginText] = useState<string>(initialPreset?.origin.name || 'Bengaluru');
  const [destinationText, setDestinationText] = useState<string>(
    initialPreset?.destination.name || 'Electronic City'
  );
  const [resolvedOriginCoords, setResolvedOriginCoords] = useState<[number, number]>(
    initialPreset?.origin.coords || [12.9716, 77.5946]
  );
  const [resolvedDestCoords, setResolvedDestCoords] = useState<[number, number]>(
    initialPreset?.destination.coords || [12.8399, 77.677]
  );
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('sedan');

  // 3. Evaluation & Route State (Screen 2 is active when comparison !== null)
  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'FASTEST' | 'SAFE'>('SAFE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Map & Modals State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showHazards, setShowHazards] = useState(true);
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'streets'>('streets');

  // City change handler
  const handleSelectCity = (newCity: CityId) => {
    console.log(`[handleSelectCity] Setting currentCity to stable id: "${newCity}"`);
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setCurrentCity(newCity);
    setComparison(null); // Return to Screen 1 on city switch
    setSelectedRouteType('SAFE');

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
      setOriginText('');
      setDestinationText('');
      setComparison(null);
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
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    const payload = {
      origin: params.origin,
      destination: params.dest,
      vehicleId: selectedVehicle,
      scenarioId: params.scenarioId,
      city: currentCity
    };

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Routing service unavailable');
      }

      if (!data || !data.fastest) {
        throw new Error('Routing service unavailable');
      }

      // Ignore responses from stale or aborted requests
      if (requestId !== latestRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      setComparison(data);
      setSelectedRouteType(data.safeRouteFound && data.safe ? 'SAFE' : 'FASTEST');
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError' || requestId !== latestRequestIdRef.current) {
        return;
      }
      setErrorMessage(err?.message || 'Routing service unavailable');
      setComparison(null);
      setSelectedRouteType('SAFE');
    } finally {
      if (abortControllerRef.current === controller || requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Primary user action: Find Safer Route
  const handleSearchRoute = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(true);
    setErrorMessage(null);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setActiveScenarioId(null);

    try {
      const [originResolved, destResolved] = await Promise.all([
        resolveLocation(originText, currentCity),
        resolveLocation(destinationText, currentCity)
      ]);

      // After resolving, set the input text to the resolved name
      setOriginText(originResolved.name);
      setDestinationText(destResolved.name);
      setResolvedOriginCoords(originResolved.coords);
      setResolvedDestCoords(destResolved.coords);

      await executeRouteCalculation({
        origin: originResolved.coords,
        dest: destResolved.coords,
        scenarioId: undefined
      });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || `Could not find location: ${originText}`);
      setComparison(null);
      setSelectedRouteType('SAFE');
    }
  };

  // Handle Preset Corridor Click (1-click demo corridors)
  const handleSelectScenario = (scenario: PresetScenario) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(scenario.id);
    setOriginText(scenario.origin.name);
    setDestinationText(scenario.destination.name);
    setResolvedOriginCoords(scenario.origin.coords);
    setResolvedDestCoords(scenario.destination.coords);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setErrorMessage(null);

    executeRouteCalculation({
      origin: scenario.origin.coords,
      dest: scenario.destination.coords,
      scenarioId: scenario.id
    });
  };

  // Autocomplete selection
  const handleSelectOriginPlace = (place: PlaceResult) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(null);
    setOriginText(place.name);
    setResolvedOriginCoords(place.coords);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setErrorMessage(null);
  };

  const handleSelectDestinationPlace = (place: PlaceResult) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(null);
    setDestinationText(place.name);
    setResolvedDestCoords(place.coords);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setErrorMessage(null);
  };

  // Map Click to set custom destination
  const handleMapClick = (coords: [number, number]) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(null);
    setResolvedDestCoords(coords);
    setDestinationText(`Pinned Point (${coords[0].toFixed(3)}, ${coords[1].toFixed(3)})`);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setErrorMessage(null);

    executeRouteCalculation({
      origin: resolvedOriginCoords,
      dest: coords,
      scenarioId: undefined
    });
  };

  // Text inputs
  const handleChangeOrigin = (val: string) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(null);
    setOriginText(val);
    setComparison(null);
    setSelectedRouteType('SAFE');
    if (errorMessage) setErrorMessage(null);
  };

  const handleChangeDestination = (val: string) => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setActiveScenarioId(null);
    setDestinationText(val);
    setComparison(null);
    setSelectedRouteType('SAFE');
    if (errorMessage) setErrorMessage(null);
  };

  // Reset / Edit Search
  const handleNewSearch = () => {
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setComparison(null);
    setSelectedRouteType('SAFE');
    setErrorMessage(null);
  };

  // Citizen report submission
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
        responseData = { success: true };
      }

      // If comparison is active, refresh route to immediately reflect the new hazard
      if (comparison) {
        executeRouteCalculation({
          origin: resolvedOriginCoords,
          dest: resolvedDestCoords,
          scenarioId: undefined
        });
      }

      return responseData;
    } catch (err) {
      console.error('Report submission failed:', err);
    }
  };

  const cityMeta = CITIES[currentCity] || CITIES.bengaluru;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-white text-gray-900 font-sans select-none">
      {/* Simple Clean Navbar */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Main Map Canvas Area */}
      <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* Full Interactive Background Map */}
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
          showHazards={showHazards}
          onToggleHazards={() => setShowHazards((prev) => !prev)}
          mapTileTheme={mapTileTheme}
          onToggleTheme={() => setMapTileTheme((t) => (t === 'streets' ? 'dark' : 'streets'))}
        />

        {/* Compact Floating Navigation Panel (Desktop: Floating card; Mobile: Bottom sheet) */}
        <div className="absolute top-4 left-4 z-20 w-[360px] sm:w-[380px] max-w-[calc(100vw-32px)] max-sm:fixed max-sm:top-auto max-sm:bottom-4 max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:z-30">
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
            onNewSearch={handleNewSearch}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
          />
        </div>
      </div>

      {/* Simple Citizen Report Modal */}
      {isReportModalOpen && (
        <CitizenReportModal
          city={currentCity}
          defaultLocation={cityMeta.center}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleSubmitReport}
        />
      )}
    </div>
  );
}
