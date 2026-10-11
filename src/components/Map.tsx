import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Plus, Minus, Navigation as NavIcon, Eye, EyeOff, Layers } from 'lucide-react';
import { HazardZone, CitizenReport, RouteOption } from '../types';

interface MapProps {
  center: [number, number];
  zoom: number;
  hazards: HazardZone[];
  citizenReports: CitizenReport[];
  fastestRoute: RouteOption | null;
  safeRoute: RouteOption | null;
  selectedRouteType: 'FASTEST' | 'SAFE';
  onSelectRouteType: (type: 'FASTEST' | 'SAFE') => void;
  origin?: { name: string; coords: [number, number] };
  destination?: { name: string; coords: [number, number] };
  onMapClick?: (coords: [number, number]) => void;
  showHazards?: boolean;
  onToggleHazards?: () => void;
  mapTileTheme?: 'dark' | 'streets';
  onToggleTheme?: () => void;
}

export const Map: React.FC<MapProps> = ({
  center,
  zoom,
  hazards,
  citizenReports,
  fastestRoute,
  safeRoute,
  selectedRouteType,
  onSelectRouteType,
  origin,
  destination,
  onMapClick,
  showHazards = true,
  onToggleHazards,
  mapTileTheme = 'streets',
  onToggleTheme
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false, // Using clean custom controls
      attributionControl: false
    });

    mapInstanceRef.current = map;

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      });
    }

    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const streetTileUrl =
      'https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    const darkTileUrl =
      'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    const isDark = mapTileTheme === 'dark';
    const tileUrl = isDark ? darkTileUrl : streetTileUrl;

    const tile = L.tileLayer(tileUrl, {
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tile;
  }, [mapTileTheme]);

  // Center update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center[0], center[1], zoom]);

  // Hazards & Citizen Markers
  useEffect(() => {
    const layerGroup = hazardsLayerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!showHazards) return;

    hazards.forEach((hazard) => {
      const isCritical = hazard.severity === 'CRITICAL';
      const color = isCritical ? '#dc2626' : '#ea580c';

      // Perimeter circle
      const circle = L.circle(hazard.center, {
        radius: hazard.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: isCritical ? '4, 4' : undefined
      });

      // Subtle hazard pill marker
      const iconHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded shadow-sm border ${
            isCritical ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-800'
          } text-[11px] font-semibold">
            <span>⚠</span>
            <span>${hazard.waterDepthCm} cm</span>
          </div>
        </div>
      `;

      const marker = L.marker(hazard.center, {
        icon: L.divIcon({
          html: iconHtml,
          className: 'hazard-marker',
          iconSize: [60, 22],
          iconAnchor: [30, 11]
        })
      });

      const popupHtml = `
        <div class="p-2.5 text-gray-900 max-w-xs font-sans text-xs">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
            }">${hazard.severity} RISK</span>
            <span class="text-gray-500 font-medium">${hazard.waterDepthCm} cm water depth</span>
          </div>
          <div class="font-bold text-xs text-gray-900 mb-0.5">${hazard.name}</div>
          <div class="text-[11px] text-gray-500 mb-1">${hazard.roadName}</div>
          <div class="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-200">
            ${hazard.notes}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      circle.bindPopup(popupHtml);

      layerGroup.addLayer(circle);
      layerGroup.addLayer(marker);
    });

    citizenReports.forEach((report) => {
      const reportHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded shadow-sm bg-white border border-gray-300 text-[10px] font-medium text-gray-800">
            <span>💧</span>
            <span>${report.waterDepthCm} cm</span>
          </div>
        </div>
      `;

      const repMarker = L.marker(report.location, {
        icon: L.divIcon({
          html: reportHtml,
          className: 'citizen-marker',
          iconSize: [54, 20],
          iconAnchor: [27, 10]
        })
      });

      const popupHtml = `
        <div class="p-2.5 text-gray-900 max-w-xs font-sans text-xs">
          <div class="font-bold text-xs text-gray-900 mb-0.5">${report.address}</div>
          <div class="text-[11px] text-gray-600">${report.userNotes || 'Citizen reported waterlogging.'}</div>
          <div class="text-[10px] text-gray-400 mt-1">Water depth: ${report.waterDepthCm} cm</div>
        </div>
      `;

      repMarker.bindPopup(popupHtml);
      layerGroup.addLayer(repMarker);
    });
  }, [hazards, citizenReports, showHazards]);

  // Routes & Fit Bounds
  useEffect(() => {
    const layerGroup = routesLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // 1. Fastest Route (Red)
    if (fastestRoute && fastestRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'FASTEST';

      const casing = L.polyline(fastestRoute.coordinates, {
        color: '#ffffff',
        weight: isSelected ? 7 : 5,
        opacity: 0.95
      });

      const polyline = L.polyline(fastestRoute.coordinates, {
        color: '#dc2626',
        weight: isSelected ? 5 : 3.5,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: '6, 6'
      });

      polyline.on('click', () => onSelectRouteType('FASTEST'));
      casing.on('click', () => onSelectRouteType('FASTEST'));

      layerGroup.addLayer(casing);
      layerGroup.addLayer(polyline);

      fastestRoute.coordinates.forEach((c) => boundsPoints.push(c));
    }

    // 2. Safer Route (Emerald Green)
    if (safeRoute && safeRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'SAFE';

      const casing = L.polyline(safeRoute.coordinates, {
        color: '#ffffff',
        weight: isSelected ? 8 : 6,
        opacity: 0.95
      });

      const polyline = L.polyline(safeRoute.coordinates, {
        color: '#059669',
        weight: isSelected ? 5.5 : 4,
        opacity: isSelected ? 1.0 : 0.8
      });

      polyline.on('click', () => onSelectRouteType('SAFE'));
      casing.on('click', () => onSelectRouteType('SAFE'));

      layerGroup.addLayer(casing);
      layerGroup.addLayer(polyline);

      safeRoute.coordinates.forEach((c) => boundsPoints.push(c));
    }

    // Auto-fit to routes with left padding to accommodate floating panel on desktop
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, {
        paddingTopLeft: [window.innerWidth > 640 ? 420 : 40, 40],
        paddingBottomRight: [40, 40],
        maxZoom: 14,
        animate: true
      });
    }
  }, [fastestRoute, safeRoute, selectedRouteType]);

  // Origin & Destination Markers
  useEffect(() => {
    const layerGroup = markersLayerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    if (origin && origin.coords) {
      const originHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 shadow-md border-2 border-white text-white font-bold text-[11px]">
            A
          </div>
        </div>
      `;

      const marker = L.marker(origin.coords, {
        icon: L.divIcon({
          html: originHtml,
          className: 'origin-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });

      layerGroup.addLayer(marker);
    }

    if (destination && destination.coords) {
      const destHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 shadow-md border-2 border-white text-white font-bold text-[11px]">
            B
          </div>
        </div>
      `;

      const marker = L.marker(destination.coords, {
        icon: L.divIcon({
          html: destHtml,
          className: 'dest-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });

      layerGroup.addLayer(marker);
    }
  }, [origin, destination]);

  // Zoom and Recenter handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (origin && origin.coords) {
      mapInstanceRef.current?.flyTo(origin.coords, 14, { duration: 0.8 });
    } else {
      mapInstanceRef.current?.flyTo(center, zoom, { duration: 0.8 });
    }
  };

  return (
    <div id="map" className="relative w-full h-full overflow-hidden bg-gray-100 select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Minimal Map Controls (Top-Right / Bottom-Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        {/* Recenter */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          title="Recenter location"
          aria-label="Recenter location"
        >
          <NavIcon className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Flood Hazards */}
        {onToggleHazards && (
          <button
            type="button"
            onClick={onToggleHazards}
            className={`w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-colors cursor-pointer ${
              showHazards ? 'text-emerald-700 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'
            }`}
            title="Toggle flood hazards"
            aria-label="Toggle flood hazards"
          >
            {showHazards ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Toggle Basemap Style */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            title="Toggle map style"
            aria-label="Toggle map style"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden mt-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="h-px bg-gray-100 w-full" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimal Legend in Bottom-Right */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center gap-3 bg-white/95 px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs text-[11px] text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-emerald-600"></span>
          <span className="font-medium text-gray-800">Safer route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-red-600"></span>
          <span className="font-medium text-gray-800">Fastest (Flooded)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-100 border border-red-500"></span>
          <span>Flood zone</span>
        </div>
      </div>
    </div>
  );
};
