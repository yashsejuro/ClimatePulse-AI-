import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { NavigationCard } from './components/NavigationCard';
import { CitizenReportModal } from './components/CitizenReportModal';
import { HeroLanding } from './components/HeroLanding';
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
import { detectCurrentUserLocation } from './services/locationService';

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
  const [customMapCenter, setCustomMapCenter] = useState<[number, number] | null>(null);

  // 3. Evaluation & Route State (Screen 2 is active when comparison !== null)
  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'FASTEST' | 'SAFE'>('SAFE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Map & Modals State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHeroOpen, setIsHeroOpen] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationToast, setLocationToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showHazards, setShowHazards] = useState(true);
  const [mapTileTheme, setMapTileTheme] = useState<'dark' | 'streets'>('streets');

  // Handle live user GPS location detection
  const handleDetectUserLocation = async () => {
    setIsDetectingLocation(true);
    setLocationToast({ message: 'Accessing GPS coordinates...', type: 'info' });
    try {
      const result = await detectCurrentUserLocation();
      latestRequestIdRef.current++;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsLoading(false);

      setOriginText(result.name);
      setResolvedOriginCoords(result.coords);
      setCustomMapCenter(result.coords);
      setActiveScenarioId(null);
      setComparison(null);
      setErrorMessage(null);

      // If coordinates are in proximity to another supported city, select that city
      if (result.city && result.city !== currentCity) {
        console.log(`[GEOLOCATION] Auto-switched to city: ${result.city}`);
        setCurrentCity(result.city);
      }

      setIsHeroOpen(false);
      setLocationToast({ message: `Location set: ${result.name}`, type: 'success' });
      setTimeout(() => setLocationToast(null), 4000);
    } catch (err: any) {
      console.warn('[GEOLOCATION] Detection error:', err);
      setLocationToast({
        message: err?.message || 'Could not access GPS. Please type an area name.',
        type: 'error'
      });
      setTimeout(() => setLocationToast(null), 5000);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // City change handler
  const handleSelectCity = (newCity: CityId) => {
    console.log(`[handleSelectCity] Setting currentCity to stable id: "${newCity}"`);
    latestRequestIdRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setCurrentCity(newCity);
    setCustomMapCenter(null);
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
    setCustomMapCenter(place.coords);
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
    setCustomMapCenter(place.coords);
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
  const activeCenter = customMapCenter || cityMeta.center;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-white text-gray-900 font-sans select-none">
      {/* Toast Notification Banner */}
      {locationToast && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 border flex items-center gap-2"
          style={{
            backgroundColor:
              locationToast.type === 'error'
                ? '#fef2f2'
                : locationToast.type === 'success'
                ? '#f0fdf4'
                : '#f8fafc',
            color:
              locationToast.type === 'error'
                ? '#991b1b'
                : locationToast.type === 'success'
                ? '#166534'
                : '#1e293b',
            borderColor:
              locationToast.type === 'error'
                ? '#fecaca'
                : locationToast.type === 'success'
                ? '#bbf7d0'
                : '#e2e8f0'
          }}
        >
          <span>{locationToast.message}</span>
        </div>
      )}

      {/* Simple Clean Navbar */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenHero={() => setIsHeroOpen(true)}
        onLocateUser={handleDetectUserLocation}
        isLocating={isDetectingLocation}
      />

      {/* Main Map Canvas Area */}
      <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* Full Interactive Background Map */}
        <Map
          center={activeCenter}
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
          onLocateMe={handleDetectUserLocation}
          isLocating={isDetectingLocation}
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
            onDetectLocation={handleDetectUserLocation}
            isDetectingLocation={isDetectingLocation}
          />
        </div>
      </div>

      {/* Hero Welcome / First-Time Guide Screen */}
      <HeroLanding
        isOpen={isHeroOpen}
        onClose={() => setIsHeroOpen(false)}
        onUseCurrentLocation={handleDetectUserLocation}
        onSelectScenario={handleSelectScenario}
        scenarios={cityScenarios}
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
        isDetectingLocation={isDetectingLocation}
      />

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
