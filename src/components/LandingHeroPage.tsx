import React, { useState } from 'react';
import {
  ShieldCheck,
  Cloud,
  ArrowRight,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Menu,
  X,
  Droplets,
  Car,
  Compass,
  AlertCircle,
  Database,
  Server,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { CityId } from '../types';

interface CorridorPreviewData {
  cityId: CityId;
  scenarioId: string;
  cityName: string;
  corridorTitle: string;
  originName: string;
  destName: string;
  hazardName: string;
  waterDepthCm: number;
  fastestMin: number;
  fastestKm: number;
  safeMin: number;
  safeKm: number;
  deltaMin: number;
  fastestWarning: string;
  safeBypass: string;
}

const PREVIEW_CORRIDORS: CorridorPreviewData[] = [
  {
    cityId: 'bengaluru',
    scenarioId: 'bengaluru-silkboard',
    cityName: 'Bengaluru',
    corridorTitle: 'Silk Board Underpass Corridor',
    originName: 'Koramangala 4th Block',
    destName: 'Electronic City Phase 1',
    hazardName: 'Silk Board Junction Underpass',
    waterDepthCm: 48,
    fastestMin: 25,
    fastestKm: 12.7,
    safeMin: 30,
    safeKm: 15.4,
    deltaMin: 5,
    fastestWarning: 'Severe stormwater drain overflow (~48 cm). 3 vehicles stalled. Exceeds sedan intake limit.',
    safeBypass: 'Diverts via BTM 2nd Stage & Hosur Elevated Expressway bypass. Zero flooded roads.'
  },
  {
    cityId: 'mumbai',
    scenarioId: 'mumbai-santacruz-dadar',
    cityName: 'Mumbai',
    corridorTitle: 'Milan Subway Coastal Corridor',
    originName: 'Santacruz West (Linking Rd)',
    destName: 'Dadar TT Circle',
    hazardName: 'Milan Subway Underpass',
    waterDepthCm: 55,
    fastestMin: 22,
    fastestKm: 11.4,
    safeMin: 27,
    safeKm: 14.2,
    deltaMin: 5,
    fastestWarning: 'Subway water depth 55 cm (1.8 ft). Submerged police barricades. Severe hydrostatic engine lock risk.',
    safeBypass: 'Enforces Western Express Flyover arm bypass. Completely avoids low-lying subway dip.'
  },
  {
    cityId: 'delhi',
    scenarioId: 'delhi-cp-noida',
    cityName: 'Delhi NCR',
    corridorTitle: 'Minto Bridge Inundation Corridor',
    originName: 'Connaught Place (Inner Circle)',
    destName: 'Noida Sector 18',
    hazardName: 'Minto Bridge Underpass',
    waterDepthCm: 60,
    fastestMin: 26,
    fastestKm: 16.5,
    safeMin: 32,
    safeKm: 19.8,
    deltaMin: 6,
    fastestWarning: 'Historic 60 cm water bowl under railway bridge. Water reached window line of stalled autorickshaw.',
    safeBypass: 'Routes safely along Barakhamba Road and DND Flyway. Elevates above Yamuna overflow backwash.'
  },
  {
    cityId: 'chennai',
    scenarioId: 'chennai-velachery',
    cityName: 'Chennai',
    corridorTitle: 'Velachery Lake Catchment Corridor',
    originName: 'Guindy Industrial Estate',
    destName: 'OMR Thoraipakkam',
    hazardName: 'Velachery Bypass & Lake Spillway',
    waterDepthCm: 48,
    fastestMin: 24,
    fastestKm: 11.2,
    safeMin: 29,
    safeKm: 14.7,
    deltaMin: 5,
    fastestWarning: 'Velachery lake catchment overflowing onto main road. Deep standing water concealing open storm gutters.',
    safeBypass: 'Re-routes via Madhya Kailash and Rajiv Gandhi Salai (OMR) elevated link. Road clearance confirmed.'
  }
];

interface LandingHeroPageProps {
  onNavigateToDashboard: (city?: CityId, scenarioId?: string) => void;
  onOpenAwsArchitecture: () => void;
}

export const LandingHeroPage: React.FC<LandingHeroPageProps> = ({
  onNavigateToDashboard,
  onOpenAwsArchitecture
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCorridorIndex, setSelectedCorridorIndex] = useState(0);
  const [activeRoutePreview, setActiveRoutePreview] = useState<'FASTEST' | 'SAFE'>('SAFE');

  const activeCorridor = PREVIEW_CORRIDORS[selectedCorridorIndex];

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* ---------------------------------------------------- */}
      {/* NAVBAR */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xs border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Left */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-gray-950 leading-tight">
                ClimatePulse
              </span>
              <span className="text-[11px] text-gray-500 font-normal leading-tight">
                Flood-aware navigation
              </span>
            </div>
          </div>

          {/* Desktop Nav Right */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-gray-600">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-gray-950 transition-colors cursor-pointer"
            >
              How it works
            </a>
            <a
              href="#vehicle-clearance"
              onClick={(e) => scrollToSection(e, 'vehicle-clearance')}
              className="hover:text-gray-950 transition-colors cursor-pointer"
            >
              Vehicle clearance
            </a>
            <a
              href="#why-climatepulse"
              onClick={(e) => scrollToSection(e, 'why-climatepulse')}
              className="hover:text-gray-950 transition-colors cursor-pointer"
            >
              Why not Google Maps?
            </a>
            <button
              type="button"
              onClick={onOpenAwsArchitecture}
              className="flex items-center gap-1.5 hover:text-gray-950 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>AWS Architecture</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToDashboard()}
              className="text-gray-700 hover:text-gray-950 transition-colors cursor-pointer"
            >
              Open Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigateToDashboard()}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              Find a safer route
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToDashboard()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-xs"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-gray-200 bg-white px-4 py-3 space-y-2 text-xs font-medium">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="block py-1.5 text-gray-700 hover:text-gray-950"
            >
              How it works
            </a>
            <a
              href="#vehicle-clearance"
              onClick={(e) => scrollToSection(e, 'vehicle-clearance')}
              className="block py-1.5 text-gray-700 hover:text-gray-950"
            >
              Vehicle clearance &amp; physics
            </a>
            <a
              href="#why-climatepulse"
              onClick={(e) => scrollToSection(e, 'why-climatepulse')}
              className="block py-1.5 text-gray-700 hover:text-gray-950"
            >
              Why traditional GPS fails
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAwsArchitecture();
              }}
              className="flex items-center gap-2 py-1.5 text-gray-700 hover:text-gray-950 w-full text-left cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>AWS Architecture</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateToDashboard();
              }}
              className="block w-full text-left py-1.5 text-emerald-700 font-semibold cursor-pointer"
            >
              Open Dashboard &rarr;
            </button>
          </div>
        )}
      </header>

      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Subtle Category Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50/80 text-gray-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Monsoon & Extreme Weather Navigation</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-950 leading-[1.12]">
            Fastest isn't always safest.
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Climate-aware navigation that helps you avoid flooded roads and make safer decisions before you drive.
          </p>

          {/* Primary Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToDashboard()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm sm:text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Find a safer route</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm sm:text-base transition-colors flex items-center justify-center cursor-pointer"
            >
              See how it works
            </a>
          </div>

          {/* Civic context note */}
          <p className="text-[11px] text-gray-500 pt-1">
            Real surveyed underpass sensors &bull; Verified citizen flood reports &bull; Zero login required
          </p>
        </div>

        {/* -------------------------------------------------- */}
        {/* 2. HERO PRODUCT PREVIEW (Interactive & 1-Click Launch) */}
        {/* -------------------------------------------------- */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            {/* 1-Click City Corridor Selector Tabs */}
            <div className="p-3 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">
                  Corridor:
                </span>
                {PREVIEW_CORRIDORS.map((corridor, idx) => {
                  const isActive = idx === selectedCorridorIndex;
                  return (
                    <button
                      key={corridor.scenarioId}
                      type="button"
                      onClick={() => setSelectedCorridorIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-gray-950 font-semibold shadow-xs border border-gray-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      <span>{corridor.cityName}</span>
                      <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
                        {corridor.waterDepthCm}cm
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Route Spotlight Toggle */}
              <div className="flex items-center gap-1 bg-gray-200/70 p-0.5 rounded-lg text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveRoutePreview('FASTEST')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                    activeRoutePreview === 'FASTEST'
                      ? 'bg-white text-red-700 shadow-xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Fastest (Flooded)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoutePreview('SAFE')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                    activeRoutePreview === 'SAFE'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Safer Alternative
                </button>
              </div>
            </div>

            {/* Visual Schematic Diagram (Bypass Geometry Illustration) */}
            <div className="p-4 sm:p-5 bg-slate-950 text-white border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {activeCorridor.corridorTitle}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {activeCorridor.originName} &rarr; {activeCorridor.destName}
                </div>
              </div>

              {/* Simplified Schematic Track */}
              <div className="relative py-3 px-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono overflow-x-auto">
                {/* Origin */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                  <span className="text-slate-300 font-bold text-[11px]">START</span>
                </div>

                {/* Trajectory visualization */}
                <div className="flex-1 mx-4 sm:mx-8 relative py-3 flex items-center justify-center min-w-[200px]">
                  {/* Direct Fastest Line (Red Dashed) */}
                  <div
                    className={`absolute inset-x-0 h-0.5 border-t-2 border-dashed transition-all ${
                      activeRoutePreview === 'FASTEST'
                        ? 'border-red-500 opacity-100'
                        : 'border-red-500/40 opacity-40'
                    }`}
                  />

                  {/* Hazard Zone Bubble (Center) */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="px-3 py-1 rounded-full bg-red-950/90 border border-red-600 text-red-200 text-[10px] font-bold flex items-center gap-1 shadow-md">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                      <span>{activeCorridor.hazardName}</span>
                      <span className="text-red-400 bg-red-900/60 px-1.5 py-0.2 rounded font-mono">
                        {activeCorridor.waterDepthCm} cm
                      </span>
                    </div>
                  </div>

                  {/* Safe Bypass Arc (Emerald Solid) */}
                  <div
                    className={`absolute inset-x-0 -top-2.5 h-6 rounded-t-full border-t-2 border-l-2 border-r-2 transition-all ${
                      activeRoutePreview === 'SAFE'
                        ? 'border-emerald-400 opacity-100 shadow-sm'
                        : 'border-emerald-600/30 opacity-30'
                    }`}
                  />
                  <div
                    className={`absolute -top-5 text-[9px] font-bold text-emerald-400 tracking-wider transition-opacity ${
                      activeRoutePreview === 'SAFE' ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    ELEVATED DRY BYPASS (+{activeCorridor.deltaMin} MIN)
                  </div>
                </div>

                {/* Destination */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-300 font-bold text-[11px]">DEST</span>
                  <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
                </div>
              </div>
            </div>

            {/* Comparison Cards Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/30">
              {/* Card 1: Fastest Route (Flooded) */}
              <div
                className={`p-4 sm:p-5 rounded-xl border transition-all space-y-3 relative ${
                  activeRoutePreview === 'FASTEST'
                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-500/40 shadow-xs'
                    : 'border-red-200 bg-white opacity-85'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      FASTEST ROUTE
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>High flood risk</span>
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-gray-950 font-mono">
                    {activeCorridor.fastestMin}{' '}
                    <span className="text-sm font-normal text-gray-500 font-sans">min</span>
                  </span>
                  <span className="text-sm text-gray-500 font-medium font-mono">
                    {activeCorridor.fastestKm} km
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-100 text-xs text-red-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>Crosses {activeCorridor.hazardName}</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-normal">
                    {activeCorridor.fastestWarning}
                  </p>
                </div>
              </div>

              {/* Card 2: Safer Route (Recommended) */}
              <div
                className={`p-4 sm:p-5 rounded-xl border transition-all space-y-3 relative shadow-xs ${
                  activeRoutePreview === 'SAFE'
                    ? 'border-2 border-emerald-600 bg-white ring-2 ring-emerald-600/10'
                    : 'border-emerald-300 bg-white opacity-85'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                      SAFER ROUTE
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Low flood risk</span>
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-gray-950 font-mono">
                    {activeCorridor.safeMin}{' '}
                    <span className="text-sm font-normal text-gray-500 font-sans">min</span>
                  </span>
                  <span className="text-sm text-gray-500 font-medium font-mono">
                    {activeCorridor.safeKm} km
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Dry Corridor Verified</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-normal">
                    {activeCorridor.safeBypass}
                  </p>
                </div>
              </div>
            </div>

            {/* Trade-off Summary Footer + 1-Click Launch Button */}
            <div className="px-4 py-3.5 bg-white border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 text-gray-700 font-medium">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold">
                  <Clock className="w-3 h-3 text-amber-700" />
                  <span>+{activeCorridor.deltaMin} min</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>Avoids {activeCorridor.hazardName}</span>
                </span>
                <span className="text-gray-500 text-[11px] hidden lg:inline">
                  &bull; Is saving {activeCorridor.deltaMin} minutes worth {activeCorridor.waterDepthCm} cm of water?
                </span>
              </div>

              {/* Primary 1-Click Corridor Launch Button */}
              <button
                type="button"
                onClick={() =>
                  onNavigateToDashboard(activeCorridor.cityId, activeCorridor.scenarioId)
                }
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <span>Test in Live Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. HOW IT WORKS */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            HOW IT WORKS
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Three steps to a safer drive
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Traditional GPS calculates travel time. ClimatePulse computes hydrological safety before you depart.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-xs">
            <div className="text-2xl font-black font-mono text-emerald-600">
              01
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-950">
                Enter your destination
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Type any address, click on the map, use live GPS location, or pick a high-risk monsoon corridor.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-xs">
            <div className="text-2xl font-black font-mono text-emerald-600">
              02
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-950">
                ClimatePulse checks nearby hazards
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Real-time surveyed underpasses and verified citizen waterlogging reports are intersected with road geometry.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-xs">
            <div className="text-2xl font-black font-mono text-emerald-600">
              03
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-950">
                Compare the fastest route with a safer alternative
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Review travel time trade-offs (+minutes) against water depth to make a rational, safety-first choice.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. VEHICLE GROUND CLEARANCE & HYDROLOGICAL PHYSICS */}
      {/* ---------------------------------------------------- */}
      <section
        id="vehicle-clearance"
        className="py-16 sm:py-20 bg-gray-50/60 border-t border-b border-gray-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              THE PHYSICS OF MONSOON ROADS
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Why water depth matters: vehicle clearance thresholds
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Water is non-compressible. If standing water reaches an engine's air intake, hydrostatic lock shatters internal cylinders in less than a second. ClimatePulse matches risk to your vehicle profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sedan / Hatchback */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-950">Sedan / Hatchback</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                  16 cm clearance
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Air intake is typically positioned near the front bumper grill (~20&ndash;25 cm). Standing water above 20 cm causes instantaneous engine drowning.
              </p>
              <div className="text-[10px] text-red-700 font-semibold bg-red-50 p-2 rounded border border-red-100">
                Critical risk at &gt;20 cm ponding
              </div>
            </div>

            {/* Two-Wheeler / Bike */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-950">Two-Wheeler / Scooter</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                  14 cm clearance
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Extremely vulnerable to concealed potholes, missing manhole covers, and loss of gyroscopic stability in standing water.
              </p>
              <div className="text-[10px] text-red-700 font-semibold bg-red-50 p-2 rounded border border-red-100">
                Severe danger at &gt;10 cm water
              </div>
            </div>

            {/* SUV / Crossover */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-950">SUV / Crossover</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  22 cm clearance
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Safe in shallow surface pooling, but deceptive underpass bowls (35&ndash;50 cm) will drown electronic ECUs and exhaust tailpipes.
              </p>
              <div className="text-[10px] text-amber-800 font-semibold bg-amber-50 p-2 rounded border border-amber-100">
                Vulnerable in low underpass dips
              </div>
            </div>

            {/* Commercial / Bus */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-950">Commercial / Bus</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  35 cm clearance
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Heavy chassis and high air intake allows navigating moderate inundation, but severe currents create buoyant lateral drift risks.
              </p>
              <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-100">
                Highest clearance tolerance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. WHY TRADITIONAL GPS FAILS (Side-by-Side Matrix) */}
      {/* ---------------------------------------------------- */}
      <section id="why-climatepulse" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            THE PARADIGM SHIFT
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Why traditional navigation fails in sudden monsoons
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Navigation algorithms were designed for fair-weather traffic speed, not urban hydrology.
          </p>
        </div>

        {/* Comparison Matrix Table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 py-3.5 px-4 sm:px-6">
            <div className="col-span-4 sm:col-span-3 uppercase tracking-wider text-[11px] text-gray-500">
              Navigation Aspect
            </div>
            <div className="col-span-4 sm:col-span-4 text-red-700 font-bold flex items-center gap-1.5">
              <span>Traditional GPS Apps</span>
            </div>
            <div className="col-span-4 sm:col-span-5 text-emerald-800 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ClimatePulse AI</span>
            </div>
          </div>

          <div className="divide-y divide-gray-200 text-xs bg-white">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-4 px-4 sm:px-6 items-start gap-2">
              <div className="col-span-4 sm:col-span-3 font-semibold text-gray-900">
                Core Optimization Goal
              </div>
              <div className="col-span-4 sm:col-span-4 text-gray-600 pr-2">
                Minimizes travel time and congestion delay only. Assumes all roads are completely dry.
              </div>
              <div className="col-span-4 sm:col-span-5 text-emerald-950 font-medium pl-1">
                Optimizes for <strong>hydrological safety first</strong>, ensuring routes remain above floodwater lines.
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-4 px-4 sm:px-6 items-start gap-2 bg-gray-50/40">
              <div className="col-span-4 sm:col-span-3 font-semibold text-gray-900">
                Flooded Underpass Behavior
              </div>
              <div className="col-span-4 sm:col-span-4 text-red-800 pr-2">
                Sees an empty submerged road as "fast-flowing green traffic" and routes cars straight in.
              </div>
              <div className="col-span-4 sm:col-span-5 text-emerald-950 font-medium pl-1">
                Detects surveyed underpasses and verified citizen waterlogging reports, blocking flooded segments.
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-4 px-4 sm:px-6 items-start gap-2">
              <div className="col-span-4 sm:col-span-3 font-semibold text-gray-900">
                Decision Metric &amp; Transparency
              </div>
              <div className="col-span-4 sm:col-span-4 text-gray-600 pr-2">
                Displays a single ETA without indicating whether the route passes through extreme water.
              </div>
              <div className="col-span-4 sm:col-span-5 text-emerald-950 font-medium pl-1">
                Provides an explicit time trade-off: <em>"+5 min detour to avoid 48 cm standing water"</em>.
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-12 py-4 px-4 sm:px-6 items-start gap-2 bg-gray-50/40">
              <div className="col-span-4 sm:col-span-3 font-semibold text-gray-900">
                Vehicle Clearance Awareness
              </div>
              <div className="col-span-4 sm:col-span-4 text-gray-600 pr-2">
                Gives identical route guidance to a low-clearance hatchback and an elevated bus.
              </div>
              <div className="col-span-4 sm:col-span-5 text-emerald-950 font-medium pl-1">
                Calculates risk tailored to vehicle clearance (sedan 16cm vs. SUV 22cm vs. two-wheeler 14cm).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. CIVIC & TECHNICAL ARCHITECTURE BADGES */}
      {/* ---------------------------------------------------- */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              BUILT ON OPEN CIVIC INFRASTRUCTURE &amp; AWS SERVERLESS
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* OpenStreetMap */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="font-bold text-xs text-gray-950 flex items-center justify-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                <span>OpenStreetMap &amp; OSRM</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Real-world drivable road geometry and turn-by-turn routing calculations.
              </p>
            </div>

            {/* Open-Meteo & OpenWeatherMap */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="font-bold text-xs text-gray-950 flex items-center justify-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                <span>Open-Meteo &amp; OWM Weather APIs</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Live precipitation rates (mm/h), real-time rainfall intensity, and hydro-meteorology informing CRI.
              </p>
            </div>

            {/* Municipal Basins */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="font-bold text-xs text-gray-950 flex items-center justify-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-600" />
                <span>Surveyed Flood Basins</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Underpasses cataloged from BBMP, BMC, MCD, and GCC civic records.
              </p>
            </div>

            {/* AWS SAM / Lambda */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="font-bold text-xs text-gray-950 flex items-center justify-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-orange-600" />
                <span>AWS Serverless SAM</span>
              </div>
              <p className="text-[11px] text-gray-500">
                API Gateway, Node.js 22 Lambda, DynamoDB, and Bedrock vision validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. BOTTOM CALL TO ACTION */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-gray-50/70 border-t border-gray-200">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Ready to choose the safer road?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Experience climate-aware navigation across Bengaluru, Mumbai, Delhi, and Chennai.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToDashboard()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm sm:text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open ClimatePulse Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenAwsArchitecture}
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>AWS Architecture Details</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FOOTER */}
      {/* ---------------------------------------------------- */}
      <footer className="w-full py-8 border-t border-gray-200 bg-white text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-gray-900">ClimatePulse AI</span>
            <span>&bull;</span>
            <span>"Fastest isn't always safest"</span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            <span>AWS Bharat Builds Tour &bull; Heat &amp; Water Track</span>
            <button
              type="button"
              onClick={onOpenAwsArchitecture}
              className="hover:text-gray-900 underline cursor-pointer"
            >
              Architecture &amp; Audit
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
