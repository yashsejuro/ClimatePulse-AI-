import React from 'react';
import { X, AlertTriangle, Droplets, CloudRain, ShieldCheck } from 'lucide-react';
import { HazardZone } from '../types';

interface HazardsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: HazardZone[];
  cityName: string;
}

export const HazardsListModal: React.FC<HazardsListModalProps> = ({
  isOpen,
  onClose,
  hazards,
  cityName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-xl p-6 text-gray-900 max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Active Flood Hazards &mdash; {cityName}</h3>
            <p className="text-xs text-gray-500">
              Live registry of monitored submerged underpasses, lake spillways, and storm basins.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {hazards.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No active flood hazards recorded in this region.
            </div>
          ) : (
            hazards.map((hz) => {
              const isCritical = hz.severity === 'CRITICAL';
              return (
                <div
                  key={hz.id}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    isCritical
                      ? 'bg-red-50/40 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        <span>{hz.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                            isCritical
                              ? 'bg-red-100 text-red-700'
                              : hz.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {hz.severity}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{hz.roadName}</div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-red-700 justify-end">
                        <Droplets className="w-3.5 h-3.5" />
                        <span>{hz.waterDepthCm} cm</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{hz.reportedAt}</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 mb-2">
                    {hz.notes}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5 text-gray-400" />
                      <span>{hz.rainfallIntensityMmPerHour} mm/h precipitation</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        Verified ({hz.source === 'OFFICIAL_SENSOR' ? 'Hydrological Survey' : hz.source === 'CITIZEN_REPORT' ? 'Citizen Report' : 'Satellite Nowcast'})
                      </span>
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
