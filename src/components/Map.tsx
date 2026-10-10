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
  origin: { name: string; coords: [number, number] } | null;
  destination: { name: string; coords: [number, number] } | null;
  onMapClick?: (coords: [number, number]) => void;
  simulationPosition?: [number, number] | null;
  showHazards: boolean;
  mapTileTheme: 'dark' | 'streets';
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
  showHazards,
  mapTileTheme
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    mapInstanceRef.current = map;

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

    const tileUrl =
      mapTileTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tile = L.tileLayer(tileUrl, {
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
      maxZoom: 19
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
      const color = isCritical ? '#ef4444' : hazard.severity === 'HIGH' ? '#f97316' : '#eab308';

      // Outer Danger Perimeter
      const circle = L.circle(hazard.center, {
        radius: hazard.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 2,
        dashArray: isCritical ? '6, 6' : undefined
      });

      // Marker Icon with depth badge
      const iconHtml = `
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <span class="absolute w-8 h-8 rounded-full ${isCritical ? 'bg-red-500/30' : 'bg-amber-500/30'} animate-ping"></span>
          <div class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border border-white/20 text-xs font-semibold text-white ${
            isCritical ? 'bg-red-600' : 'bg-amber-600'
          }">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>${hazard.waterDepthCm} cm</span>
          </div>
        </div>
      `;

      const marker = L.marker(hazard.center, {
        icon: L.divIcon({
          html: iconHtml,
          className: 'hazard-custom-icon',
          iconSize: [80, 30],
          iconAnchor: [40, 15]
        })
      });

      const popupHtml = `
        <div class="p-3 text-slate-100 max-w-xs">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isCritical ? 'bg-red-950 text-red-300 border border-red-700/50' : 'bg-amber-950 text-amber-300 border border-amber-700/50'
            }">${hazard.severity} HAZARD</span>
            <span class="text-xs text-slate-400 font-mono">${hazard.waterDepthCm} cm deep</span>
          </div>
          <div class="font-bold text-sm text-white mb-0.5">${hazard.name}</div>
          <div class="text-xs text-slate-300 mb-2">${hazard.roadName}</div>
          <div class="text-xs text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800 mb-2">
            ${hazard.notes}
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span>🌧️ Rain: ${hazard.rainfallIntensityMmPerHour} mm/h</span>
            <span class="text-emerald-400 font-medium">✓ Sensor Verified</span>
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
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full shadow-md bg-purple-600 border border-purple-300/40 text-[11px] font-medium text-white">
            <span>📷</span>
            <span>${report.bedrockConfidenceScore}% AI</span>
          </div>
        </div>
      `;

      const repMarker = L.marker(report.location, {
        icon: L.divIcon({
          html: reportHtml,
          className: 'citizen-marker',
          iconSize: [70, 24],
          iconAnchor: [35, 12]
        })
      });

      const popupHtml = `
        <div class="p-3 text-slate-100 max-w-xs">
          <div class="flex items-center justify-between mb-1.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
              CITIZEN REPORT
            </span>
            <span class="text-xs text-emerald-400 font-semibold">${report.bedrockConfidenceScore}% Verified</span>
          </div>
          <div class="font-bold text-sm text-white mb-1">${report.address}</div>
          <div class="text-xs text-slate-300 mb-2">${report.userNotes}</div>
          <div class="text-[11px] text-slate-400 bg-slate-900 p-2 rounded mb-2 border border-slate-800 space-y-1">
            <div class="text-purple-300 font-semibold">AI Vision Indicators:</div>
            ${report.detectedFloodIndicators.map((ind) => `<div>• ${ind}</div>`).join('')}
          </div>
          <div class="text-[10px] text-slate-500">Estimated Depth: ${report.waterDepthCm} cm (${report.estimatedDepth})</div>
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

    // 1. Draw Fastest Route
    if (fastestRoute && fastestRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'FASTEST';
      const hasHazards = fastestRoute.hazardsIntersected.length > 0;
      const strokeColor = hasHazards ? '#ef4444' : '#64748b';

      // Route Outer Glow / Casing
      const casing = L.polyline(fastestRoute.coordinates, {
        color: '#000000',
        weight: isSelected ? 8 : 5,
        opacity: 0.6
      });

      // Main Polyline
      const polyline = L.polyline(fastestRoute.coordinates, {
        color: strokeColor,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.6,
        dashArray: hasHazards ? '8, 8' : undefined
      });

      polyline.on('click', () => onSelectRouteType('FASTEST'));
      casing.on('click', () => onSelectRouteType('FASTEST'));

      layerGroup.addLayer(casing);
      layerGroup.addLayer(polyline);

      fastestRoute.coordinates.forEach((c) => boundsPoints.push(c));
    }

    // 2. Draw Safe Route (Bright Emerald / Cyan)
    if (safeRoute && safeRoute.coordinates.length > 0) {
      const isSelected = selectedRouteType === 'SAFE';

      // Glow casing
      const casing = L.polyline(safeRoute.coordinates, {
        color: isSelected ? '#064e3b' : '#022c22',
        weight: isSelected ? 9 : 6,
        opacity: 0.8
      });

      // Main polyline
      const polyline = L.polyline(safeRoute.coordinates, {
        color: '#10b981',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1.0 : 0.75
      });

      polyline.on('click', () => onSelectRouteType('SAFE'));
      casing.on('click', () => onSelectRouteType('SAFE'));

      layerGroup.addLayer(casing);
      layerGroup.addLayer(polyline);

      safeRoute.coordinates.forEach((c) => boundsPoints.push(c));
    }

    // Fit map bounds to encompass both routes smoothly
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true });
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
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 shadow-xl border-2 border-white text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>
          </div>
        </div>
      `;

      const marker = L.marker(origin.coords, {
        icon: L.divIcon({
          html: originHtml,
          className: 'origin-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      }).bindTooltip(`<b>Start:</b> ${origin.name}`, { direction: 'top', offset: [0, -14] });

      layerGroup.addLayer(marker);
    }

    if (destination) {
      const destHtml = `
        <div class="flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 shadow-xl border-2 border-white text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
        </div>
      `;

      const marker = L.marker(destination.coords, {
        icon: L.divIcon({
          html: destHtml,
          className: 'dest-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      }).bindTooltip(`<b>Destination:</b> ${destination.name}`, { direction: 'top', offset: [0, -14] });

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
          <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
            <div class="w-6 h-6 rounded-full bg-emerald-400 border-2 border-white shadow-lg flex items-center justify-center text-slate-900 font-bold text-xs animate-bounce">
              🚘
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
    <div className="relative w-full h-full min-h-[380px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-800 shadow-2xl text-xs text-slate-200">
        <div className="font-semibold text-slate-100 flex items-center gap-2 pb-1.5 border-b border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Live Cartographic Layer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1.5 rounded-full bg-emerald-500"></span>
          <span>ClimatePulse Safe Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1.5 rounded-full bg-red-500 border border-dashed border-red-300"></span>
          <span>Standard Fastest (Compromised)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600/40 border border-red-500"></span>
          <span>Active Inundation Hazard</span>
        </div>
      </div>
    </div>
  );
};
