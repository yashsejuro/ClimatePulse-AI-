import React, { useState, useEffect } from 'react';
import { LandingHeroPage } from './components/LandingHeroPage';
import { Dashboard } from './components/Dashboard';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';
import { CityId } from './types';

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
      {currentView === 'landing' ? (
        <LandingHeroPage
          onNavigateToDashboard={handleNavigateToDashboard}
          onOpenAwsArchitecture={() => setIsAwsModalOpen(true)}
        />
      ) : (
        <Dashboard
          onNavigateHome={handleNavigateToHome}
          onOpenAwsModal={() => setIsAwsModalOpen(true)}
          initialCity={dashboardConfig.city}
          initialScenarioId={dashboardConfig.scenarioId}
        />
      )}

      {/* Global AWS Architecture Modal */}
      <AwsArchitectureModal
        isOpen={isAwsModalOpen}
        onClose={() => setIsAwsModalOpen(false)}
      />
    </>
  );
}
