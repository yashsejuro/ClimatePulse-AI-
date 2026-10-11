import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LandingHeroPage } from './components/LandingHeroPage';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';
import { CityId } from './types';
import { ShieldCheck, Compass } from 'lucide-react';

// Lazy-load the heavy Dashboard component (Leaflet map, geojson layers, hazard telemetry)
// to significantly reduce the initial bundle size of the landing page
const Dashboard = lazy(() => import('./components/Dashboard'));

// Prefetch helper to pre-warm the Dashboard chunk in background on user interaction/hover
const handlePrefetchDashboard = () => {
  void import('./components/Dashboard');
};

/**
 * Refined loading fallback matching ClimatePulse design system
 * Displays an animated radar beacon, telemetry progress bar, and layout skeletons
 */
function DashboardLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 animate-fade-in">
      {/* Top Navbar Skeleton */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-950 text-sm tracking-tight">ClimatePulse</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Live
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Flood-aware safe navigation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse hidden sm:block" />
          <div className="h-8 w-24 bg-emerald-50 rounded-lg border border-emerald-200 animate-pulse" />
        </div>
      </header>

      {/* Main Skeleton Layout with Radar Centerpiece */}
      <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Control Card Skeleton */}
        <aside className="w-full lg:w-96 p-4 sm:p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-14 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-2.5">
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2.5">
            <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-gray-200 rounded animate-pulse" />
          </div>
        </aside>

        {/* Center Canvas with Radar Focus */}
        <section className="flex-1 relative bg-slate-100/70 flex flex-col items-center justify-center p-6 min-h-[460px]">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          <div className="relative z-10 max-w-sm w-full bg-white/95 backdrop-blur-sm p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-md text-center space-y-4">
            <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
              <div className="relative w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
                <Compass className="w-6 h-6 animate-spin text-emerald-600" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-gray-950 tracking-tight">
                Loading Navigation Dashboard
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Initializing GIS map layers, flood hazard polygons, and dual-route engine...
              </p>
            </div>

            {/* Smooth animated progress line */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full animate-indeterminate-bar" />
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Calibrating safe corridor geometries</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p.startsWith('/dashboard') || h.includes('dashboard')) {
        return 'dashboard';
      }
    }
    return 'landing';
  });

  const [dashboardConfig, setDashboardConfig] = useState<{
    city?: CityId;
    scenarioId?: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const c = params.get('city') as CityId | null;
      const s = params.get('scenario') || undefined;
      return {
        city: c && ['bengaluru', 'mumbai', 'delhi', 'chennai'].includes(c) ? c : undefined,
        scenarioId: s
      };
    }
    return {};
  });

  const [isAwsModalOpen, setIsAwsModalOpen] = useState(false);

  // Synchronize browser history / back / forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p.startsWith('/dashboard') || h.includes('dashboard')) {
        const params = new URLSearchParams(window.location.search);
        const c = params.get('city') as CityId | null;
        const s = params.get('scenario') || undefined;
        setDashboardConfig({
          city: c && ['bengaluru', 'mumbai', 'delhi', 'chennai'].includes(c) ? c : undefined,
          scenarioId: s
        });
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigateToDashboard = (city?: CityId, scenarioId?: string) => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (scenarioId) params.set('scenario', scenarioId);
    const searchStr = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `/dashboard${searchStr}`;

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', newUrl);
      } catch (e) {
        console.warn('[Routing] pushState error:', e);
      }
    }
    setDashboardConfig({ city, scenarioId });
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToHome = () => {
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', '/');
      } catch (e) {
        console.warn('[Routing] pushState error:', e);
      }
    }
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 transition-opacity duration-200 ease-out">
        {currentView === 'landing' ? (
          <div key="landing" className="animate-fade-in">
            <LandingHeroPage
              onNavigateToDashboard={handleNavigateToDashboard}
              onOpenAwsArchitecture={() => setIsAwsModalOpen(true)}
              onPrefetchDashboard={handlePrefetchDashboard}
            />
          </div>
        ) : (
          <div key="dashboard" className="animate-fade-in">
            <Suspense fallback={<DashboardLoadingFallback />}>
              <Dashboard
                onNavigateHome={handleNavigateToHome}
                onOpenAwsModal={() => setIsAwsModalOpen(true)}
                initialCity={dashboardConfig.city}
                initialScenarioId={dashboardConfig.scenarioId}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Global AWS Architecture Modal */}
      <AwsArchitectureModal
        isOpen={isAwsModalOpen}
        onClose={() => setIsAwsModalOpen(false)}
      />
    </>
  );
}
