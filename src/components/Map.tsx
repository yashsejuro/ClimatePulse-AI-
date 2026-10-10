import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
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
  simulationPosition?: [number, number] | null;
  showHazards?: boolean;
  mapTileTheme?: 'dark' | 'streets';
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
  simulationPosition,
  showHazards = true,
  mapTileTheme = 'streets'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups to efficiently redraw layers without recreating the map
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true
    });

    mapInstanceRef.current = map;

    // Attach click listener for custom point selection
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    // Create persistent layer groups
    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer Theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const darkTileUrl =
      'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const lightTileUrl =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

    const tileUrl = mapTileTheme === 'dark' ? darkTileUrl : lightTileUrl;

    const tile = L.tileLayer(tileUrl, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    }).addTo(map);

    tileLayerRef.current = tile;
  }, [mapTileTheme]);

  // Update Center when city changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center[0], center[1], zoom]);

  // Render Hazard Polygons and Citizen Markers
  useEffect(() => {
    const layerGroup = hazardsLayerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    if (!showHazards) return;

    hazards.forEach((hazard) => {
      const isCritical = hazard.severity === 'CRITICAL';
      const color = isCritical ? '#dc2626' : hazard.severity === 'HIGH' ? '#ea580c' : '#ca8a04';

      // Flood perimeter circle
      const circle = L.circle(hazard.center, {
        radius: hazard.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 1.5,
        dashArray: isCritical ? '4, 4' : undefined
      });

      // Clean pill badge for hazard
      const iconHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-md shadow-sm border ${
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
          className: 'hazard-custom-icon',
          iconSize: [64, 24],
          iconAnchor: [32, 12]
        })
      });

      const popupHtml = `
        <div class="p-3 text-gray-900 max-w-xs font-sans text-xs">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
            }">${hazard.severity} RISK</span>
            <span class="text-gray-500 font-medium">${hazard.waterDepthCm} cm water depth</span>
          </div>
          <div class="font-bold text-sm text-gray-900 mb-0.5">${hazard.name}</div>
          <div class="text-gray-600 mb-1.5">${hazard.roadName}</div>
          <div class="text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 mb-2">
            ${hazard.notes}
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200">
            <span>Rain: ${hazard.rainfallIntensityMmPerHour} mm/h</span>
            <span class="text-emerald-700 font-medium">Active Zone</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      circle.bindPopup(popupHtml);

      layerGroup.addLayer(circle);
      layerGroup.addLayer(marker);
    });

    // Add Citizen Report Markers
    citizenReports.forEach((report) => {
      const reportHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-md shadow-sm bg-white border border-gray-300 text-[11px] font-medium text-gray-800">
            <span>📷</span>
            <span>${report.waterDepthCm} cm</span>
          </div>
        </div>
      `;

      const repMarker = L.marker(report.location, {
        icon: L.divIcon({
          html: reportHtml,
          className: 'citizen-marker',
          iconSize: [60, 22],
          iconAnchor: [30, 11]
        })
      });

      const popupHtml = `
        <div class="p-3 text-gray-900 max-w-xs font-sans text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
              CITIZEN REPORT
            </span>
            <span class="text-emerald-700 font-semibold">${report.bedrockConfidenceScore}% verified</span>
          </div>
          <div class="font-bold text-sm text-gray-900 mb-1">${report.address}</div>
          <div class="text-gray-600 mb-1.5">${report.userNotes}</div>
          <div class="text-[11px] text-gray-500 bg-gray-50 p-2 rounded mb-2 border border-gray-200">
            ${report.detectedFloodIndicators.map((ind) => `<div>• ${ind}</div>`).join('')}
          </div>
          <div class="text-[10px] text-gray-400">Recorded Depth: ${report.waterDepthCm} cm</div>
        </div>
      `;

      repMarker.bindPopup(popupHtml);
      layerGroup.addLayer(repMarker);
    });
  }, [hazards, citizenReports, showHazards]);

  // Render Routes and Fit Bounds
  useEffect(() => {
    const layerGroup = routesLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // 1. Draw Fastest Route (Warning red/gray)
    if (fastestRoute && fastestRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'FASTEST';
      const hasHazards = fastestRoute.hazardsIntersected.length > 0;
      const strokeColor = hasHazards ? '#dc2626' : '#64748b';

      // White casing for clear road contrast
      const casing = L.polyline(fastestRoute.coordinates, {
        color: '#ffffff',
        weight: isSelected ? 7 : 5,
        opacity: 0.9
      });

      const polyline = L.polyline(fastestRoute.coordinates, {
        color: strokeColor,
        weight: isSelected ? 5 : 3.5,
        opacity: isSelected ? 0.95 : 0.6,
        dashArray: hasHazards ? '6, 6' : undefined
      });

      polyline.on('click', () => onSelectRouteType('FASTEST'));
      casing.on('click', () => onSelectRouteType('FASTEST'));

      layerGroup.addLayer(casing);
      layerGroup.addLayer(polyline);

      fastestRoute.coordinates.forEach((c: [number, number]) => boundsPoints.push(c));
    }

    // 2. Draw Safe Route (Solid restrained emerald green)
    if (safeRoute && safeRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'SAFE';

      // White casing for clean look
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

      safeRoute.coordinates.forEach((c: [number, number]) => boundsPoints.push(c));
    }

    // Fit map bounds to encompass both routes smoothly
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  }, [fastestRoute, safeRoute, selectedRouteType]);

  // Render Origin and Destination Pins
  useEffect(() => {
    const layerGroup = markersLayerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    if (origin) {
      const originHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700 shadow-md border-2 border-white text-white font-bold text-xs">
            A
          </div>
        </div>
      `;

      const marker = L.marker(origin.coords, {
        icon: L.divIcon({
          html: originHtml,
          className: 'origin-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      }).bindTooltip(`<b>Start:</b> ${origin.name}`, { direction: 'top', offset: [0, -12] });

      layerGroup.addLayer(marker);
    }

    if (destination) {
      const destHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-blue-700 shadow-md border-2 border-white text-white font-bold text-xs">
            B
          </div>
        </div>
      `;

      const marker = L.marker(destination.coords, {
        icon: L.divIcon({
          html: destHtml,
          className: 'dest-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      }).bindTooltip(`<b>Destination:</b> ${destination.name}`, { direction: 'top', offset: [0, -12] });

      layerGroup.addLayer(marker);
    }
  }, [origin, destination]);

  // Handle Simulation Moving Vehicle Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (simulationPosition) {
      if (!simMarkerRef.current) {
        const vehicleHtml = `
          <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
            <div class="w-7 h-7 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-xs">
              🚗
            </div>
          </div>
        `;
        simMarkerRef.current = L.marker(simulationPosition, {
          icon: L.divIcon({
            html: vehicleHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).addTo(map);
      } else {
        simMarkerRef.current.setLatLng(simulationPosition);
      }
    } else if (simMarkerRef.current) {
      map.removeLayer(simMarkerRef.current);
      simMarkerRef.current = null;
    }
  }, [simulationPosition]);

  return (
    <div className="relative w-full h-full min-h-[380px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Clean Map Legend */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 bg-white/95 px-3 py-2.5 rounded-xl border border-gray-200 shadow-md text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1.5 rounded-full bg-emerald-600"></span>
          <span className="font-medium text-emerald-950">Safe Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1.5 rounded-full bg-red-600"></span>
          <span className="font-medium text-gray-800">Fastest (Flooded)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-500"></span>
          <span className="text-gray-600">Flood Hazard Zone</span>
        </div>
      </div>
    </div>
  );
};
