import React from 'react';
import { X, AlertTriangle, Droplets, CloudRain, ShieldCheck } from 'lucide-react';
import { HazardZone } from '../types';

interface HazardsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: HazardZone[];
  cityName: string;
  onZoomToHazard?: (hazard: HazardZone) => void;
}

export const HazardsListModal: React.FC<HazardsListModalProps> = ({
  isOpen,
  onClose,
  hazards,
  cityName,
  onZoomToHazard
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Active Flood Corridors &mdash; {cityName}</h3>
            <p className="text-xs text-slate-400">
              Live database of monitored submerged underpasses, lake spillways, and storm basins.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {hazards.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No active flood hazards detected in this region.
            </div>
          ) : (
            hazards.map((hz) => {
              const isCritical = hz.severity === 'CRITICAL';
              return (
                <div
                  key={hz.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-red-950/40 border-red-800/60'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{hz.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-600 text-white'
                              : hz.severity === 'HIGH'
                              ? 'bg-amber-600 text-white'
                              : 'bg-yellow-600 text-slate-950'
                          }`}
                        >
                          {hz.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{hz.roadName}</div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-extrabold text-red-400 justify-end">
                        <Droplets className="w-4 h-4" />
                        <span>{hz.waterDepthCm} cm</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{hz.reportedAt}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 mb-2">
                    {hz.notes}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                      <span>{hz.rainfallIntensityMmPerHour} mm/h precipitation</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified ({hz.source === 'OFFICIAL_SENSOR' ? 'CIVIC FLOOD RECORD' : hz.source.replace('_', ' ')})</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
