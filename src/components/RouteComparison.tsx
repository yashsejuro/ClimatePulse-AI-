import React from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Clock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RouteComparisonResponse } from '../types';

interface RouteComparisonProps {
  comparison: RouteComparisonResponse;
  selectedRouteType: 'FASTEST' | 'SAFE';
  onSelectRouteType: (type: 'FASTEST' | 'SAFE') => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  aiBriefing: string | null;
  isLoadingBriefing: boolean;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  comparison,
  selectedRouteType,
  onSelectRouteType,
  isSimulating,
  onToggleSimulation,
  aiBriefing,
  isLoadingBriefing
}) => {
  const { fastest, safe, riskDeltaPercent, timeDeltaMinutes, distanceDeltaKm, avoidedHazardsCount } =
    comparison;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Trade-off Delta Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <span>Route Evaluation</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
              {riskDeltaPercent}% Risk Reduction
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Trade-off: <strong className="text-emerald-400">+{timeDeltaMinutes} min</strong> (+{distanceDeltaKm} km) to avoid{' '}
            <strong className="text-red-400">{avoidedHazardsCount} submerged choke point{avoidedHazardsCount > 1 ? 's' : ''}</strong>
          </p>
        </div>

        {/* Navigation Simulation Trigger */}
        <button
          onClick={onToggleSimulation}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
            isSimulating
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
          }`}
        >
          {isSimulating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Drive</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Drive</span>
            </>
          )}
        </button>
      </div>

      {/* Side-by-Side Route Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SAFE ROUTE CARD (ClimatePulse) */}
        <div
          onClick={() => onSelectRouteType('SAFE')}
          className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedRouteType === 'SAFE'
              ? 'bg-gradient-to-b from-emerald-950/70 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ClimatePulse (Recommended)</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-emerald-500 text-slate-950">
              SAFE
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-2xl font-black text-white">{safe.durationMinutes}</span>
              <span className="text-xs text-slate-400 ml-1">mins</span>
              <span className="text-xs text-slate-500 ml-2">({safe.distanceKm} km)</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Climate Risk Index</div>
              <div className="text-sm font-black text-emerald-400">{safe.riskScore} / 100</div>
            </div>
          </div>

          {/* Risk Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(8, safe.riskScore)}%` }}
            />
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-start gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
              <span>Elevated & well-drained corridor</span>
            </div>
            <div className="flex items-start gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
              <span>Zero impassable water depths</span>
            </div>
          </div>
        </div>

        {/* FASTEST ROUTE CARD (Standard Baseline) */}
        <div
          onClick={() => onSelectRouteType('FASTEST')}
          className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedRouteType === 'FASTEST'
              ? 'bg-gradient-to-b from-red-950/60 to-slate-900 border-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-950/50'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span>Standard Fastest (Unsafe)</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wide bg-red-600 text-white">
              {fastest.riskCategory}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-2xl font-black text-white">{fastest.durationMinutes}</span>
              <span className="text-xs text-slate-400 ml-1">mins</span>
              <span className="text-xs text-slate-500 ml-2">({fastest.distanceKm} km)</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Climate Risk Index</div>
              <div className="text-sm font-black text-red-400">{fastest.riskScore} / 100</div>
            </div>
          </div>

          {/* Risk Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(10, fastest.riskScore)}%` }}
            />
          </div>

          {/* Hazards Intersected List */}
          <div className="space-y-1.5 text-xs">
            {fastest.hazardsIntersected.length > 0 ? (
              fastest.hazardsIntersected.map((hz) => (
                <div key={hz.hazardId} className="flex items-start gap-1.5 text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                  <span>
                    <strong>{hz.name}:</strong> {hz.waterDepthCm} cm waterlogging (Severe stall risk)
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-400">Standard arterial without active flood triggers</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Safety Briefing Callout */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-900/40 text-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
            Climate-Aware Route Safety Briefing
          </span>
        </div>
        {isLoadingBriefing ? (
          <div className="flex items-center gap-2 text-slate-400 py-1">
            <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
            <span>Synthesizing hazard telemetry...</span>
          </div>
        ) : (
          <p className="text-slate-200 leading-relaxed font-sans">
            {aiBriefing || comparison.safetySummary}
          </p>
        )}
      </div>
    </div>
  );
};
