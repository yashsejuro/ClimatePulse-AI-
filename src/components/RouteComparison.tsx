import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  Info
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header & Trade-off Delta */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-gray-900">Route Evaluation</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              {riskDeltaPercent}% lower risk
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Trade-off: <strong className="text-gray-900">+{timeDeltaMinutes} min</strong> (+{distanceDeltaKm} km) to avoid{' '}
            <strong className="text-red-600">{avoidedHazardsCount} flooded zone{avoidedHazardsCount > 1 ? 's' : ''}</strong>
          </p>
        </div>

        {/* Route Preview / Simulation Trigger */}
        <button
          onClick={onToggleSimulation}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulating
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isSimulating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Simulation</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Route</span>
            </>
          )}
        </button>
      </div>

      {/* Side-by-Side Route Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SAFE ROUTE CARD */}
        <div
          onClick={() => onSelectRouteType('SAFE')}
          className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
            selectedRouteType === 'SAFE'
              ? 'bg-emerald-50/40 border-2 border-emerald-600 shadow-xs'
              : 'bg-gray-50/60 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Safe Corridor</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-700 text-white">
              RECOMMENDED
            </span>
          </div>

          {safe ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold text-gray-900">{safe.durationMinutes}</span>
                  <span className="text-xs text-gray-500 ml-1">min</span>
                  <span className="text-xs text-gray-400 ml-1.5">({safe.distanceKm} km)</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 font-medium uppercase">Risk Score</div>
                  <div className="text-sm font-bold text-emerald-700">{safe.riskScore} / 100</div>
                </div>
              </div>

              {/* Risk Progress Bar */}
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.max(8, safe.riskScore)}%` }}
                />
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Passable for your clearance</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  <span>Bypasses low-lying bottlenecks</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-amber-800 py-3">
              No flood-safe alternate route available.
            </div>
          )}
        </div>

        {/* FASTEST ROUTE CARD */}
        <div
          onClick={() => onSelectRouteType('FASTEST')}
          className={`relative p-3.5 rounded-xl border transition-colors cursor-pointer ${
            selectedRouteType === 'FASTEST'
              ? 'bg-red-50/40 border-2 border-red-500 shadow-xs'
              : 'bg-gray-50/60 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Standard Fastest</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white">
              {fastest.riskCategory}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-gray-900">{fastest.durationMinutes}</span>
              <span className="text-xs text-gray-500 ml-1">min</span>
              <span className="text-xs text-gray-400 ml-1.5">({fastest.distanceKm} km)</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500 font-medium uppercase">Risk Score</div>
              <div className="text-sm font-bold text-red-700">{fastest.riskScore} / 100</div>
            </div>
          </div>

          {/* Risk Progress Bar */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${Math.max(10, fastest.riskScore)}%` }}
            />
          </div>

          {/* Hazards Intersected List */}
          <div className="space-y-1 text-xs">
            {fastest.hazardsIntersected.length > 0 ? (
              fastest.hazardsIntersected.map((hz) => (
                <div key={hz.hazardId} className="flex items-start gap-1.5 text-red-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1 shrink-0"></span>
                  <span>
                    <strong>{hz.name}:</strong> {hz.waterDepthCm} cm water depth
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">Standard route with no verified flood hazards</div>
            )}
          </div>
        </div>
      </div>

      {/* Route Advisory Note */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
          <Info className="w-3.5 h-3.5 text-gray-600" />
          <span>Route Advisory</span>
        </div>
        {isLoadingBriefing ? (
          <div className="flex items-center gap-2 text-gray-500 py-0.5">
            <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
            <span>Checking latest road alerts...</span>
          </div>
        ) : (
          <p className="leading-relaxed">
            {aiBriefing || comparison.safetySummary}
          </p>
        )}
      </div>
    </div>
  );
};
