import React from 'react';
import {
  ShieldCheck,
  Compass,
  MapPin,
  Waves,
  Car,
  AlertTriangle,
  ArrowRight,
  X,
  Crosshair,
  Sparkles,
  Cloud
} from 'lucide-react';
import { CityId, PresetScenario } from '../types';
import { CITIES } from '../data/cities';

interface HeroLandingProps {
  isOpen: boolean;
  onClose: () => void;
  onUseCurrentLocation: () => void;
  onSelectScenario: (scenario: PresetScenario) => void;
  scenarios: PresetScenario[];
  currentCity: CityId;
  onSelectCity: (city: CityId) => void;
  isDetectingLocation?: boolean;
  onOpenAwsArchitecture?: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  isOpen,
  onClose,
  onUseCurrentLocation,
  onSelectScenario,
  scenarios,
  currentCity,
  onSelectCity,
  isDetectingLocation = false,
  onOpenAwsArchitecture
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden my-auto text-gray-900">
        {/* Top Accent & Dismiss Button */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close welcome screen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Header & Mission */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 text-emerald-700">
                <Waves className="w-3.5 h-3.5" />
              </span>
              <span>Monsoon & Extreme Weather Navigation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-950">
              ClimatePulse AI
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
              Standard GPS navigation directs drivers straight into drowned underpasses and stalled waterlogging.
              ClimatePulse monitors active water depth, monsoonal ponding, and vehicle clearance to route you safely around flood blockades.
            </p>
          </div>

          {/* Primary Quick Start CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Detect My Location */}
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isDetectingLocation}
              className="flex items-start gap-3.5 p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                {isDetectingLocation ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Crosshair className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>Use My Live Location</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-emerald-800/90 mt-0.5 leading-snug">
                  Detects your current street & city coordinates to route from your doorstep.
                </p>
              </div>
            </button>

            {/* 2. Jump to Interactive Map */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-700 shrink-0 group-hover:bg-gray-200 transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-950 flex items-center gap-1.5">
                  <span>Explore Map & Custom Corridors</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                  Search any locality or city across India, or click anywhere on the live map.
                </p>
              </div>
            </button>
          </div>

          {/* Core Safety Capabilities - Unboxed Anti-Slop Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <Waves className="w-3.5 h-3.5 text-blue-600" />
                <span>Water Depth Logic</span>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Road sectors with &gt;20 cm water block sedans; &gt;14 cm blocks bikes. Detours bypass submerged basins.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vehicle Profiles</span>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Calibrated ground clearance thresholds for Two-Wheelers, Sedans, SUVs, and Heavy Commuters.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>Nationwide Support</span>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Curated flood data for major metros + live OpenStreetMap routing across all Indian towns and states.
              </p>
            </div>
          </div>

          {/* Curated Demo Corridors */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Featured Flood Scenarios
              </div>
              {/* City Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-xs">
                {(Object.keys(CITIES) as CityId[]).map((cId) => (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => onSelectCity(cId)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      currentCity === cId
                        ? 'bg-white text-gray-950 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {CITIES[cId].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    onSelectScenario(sc);
                    onClose();
                  }}
                  className="p-3 text-left rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-emerald-50/40 hover:border-emerald-500 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">
                      {sc.title}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {sc.tagline}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <span>{sc.origin.name}</span>
                    <span aria-hidden="true">→</span>
                    <span>{sc.destination.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer note with AWS Architecture Link */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>Powered by OpenStreetMap OSRM & Crowd-Sensed Hydrology</span>
              {onOpenAwsArchitecture && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAwsArchitecture();
                  }}
                  className="text-blue-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>AWS Architecture</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer text-right"
            >
              Continue to map →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
