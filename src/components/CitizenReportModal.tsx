import React, { useState } from 'react';
import { X, Camera, Upload, CheckCircle2, AlertTriangle, Sparkles, MapPin } from 'lucide-react';
import { CityId } from '../types';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: CityId;
  defaultLocation: [number, number];
  onSubmitReport: (data: {
    city: CityId;
    location: [number, number];
    address: string;
    imageBase64?: string;
    waterDepthCm: number;
    userNotes: string;
  }) => Promise<void>;
}

// Curated realistic sample flood hazard scenarios for instant testing
const SAMPLE_PHOTOS = [
  {
    id: 'sample-underpass',
    title: 'Submerged Underpass Bowl',
    depthCm: 48,
    indicators: ['Submerged tire rims', 'Standing water across 3 lanes', 'Barricades placed'],
    notes: 'Underpass basin filled with 1.5 ft water. Two cars stranded with stalled engines.',
    previewGradient: 'from-blue-900 to-slate-900'
  },
  {
    id: 'sample-lake-overflow',
    title: 'Lake Outflow / Service Road Inundation',
    depthCm: 35,
    indicators: ['Rippling surface water', 'Sidewalk curb submerged', 'Severe slow crawling'],
    notes: 'Lake catchment overflow over service lanes. Water depth reaching car bumpers.',
    previewGradient: 'from-cyan-900 to-slate-900'
  },
  {
    id: 'sample-street-ponding',
    title: 'Arterial Road Storm Ponding',
    depthCm: 22,
    indicators: ['Surface water ponding', 'Reduced lane capacity', 'Hydroplaning risk'],
    notes: 'Drainage choked near signal junction. Outer two lanes underwater.',
    previewGradient: 'from-teal-900 to-slate-900'
  }
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  city,
  defaultLocation,
  onSubmitReport
}) => {
  const [address, setAddress] = useState('Outer Ring Road underpass');
  const [waterDepthCm, setWaterDepthCm] = useState(42);
  const [userNotes, setUserNotes] = useState('Significant standing water with multiple stalled sedans.');
  const [selectedSample, setSelectedSample] = useState(SAMPLE_PHOTOS[0].id);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    confidence: number;
    indicators: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setSelectedSample('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    try {
      // Simulate quick AI vision scan animation
      await new Promise((r) => setTimeout(r, 800));

      const sample = SAMPLE_PHOTOS.find((s) => s.id === selectedSample);
      const chosenDepth = sample ? sample.depthCm : waterDepthCm;
      const chosenNotes = sample ? sample.notes : userNotes;

      await onSubmitReport({
        city,
        location: [defaultLocation[0] + 0.002, defaultLocation[1] + 0.002],
        address: address || 'Reported Waterlogged Sector',
        imageBase64: imagePreview || undefined,
        waterDepthCm: chosenDepth,
        userNotes: chosenNotes
      });

      setIsAnalyzing(false);
      onClose();
    } catch {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Report Waterlogging Hazard</h3>
            <p className="text-xs text-slate-400">
              AI evaluates flood depth and injects confirmed hazards directly into navigation routes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sample Photo Selector or Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              1. Provide Ground Photo Evidence
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {SAMPLE_PHOTOS.map((sample) => (
                <button
                  type="button"
                  key={sample.id}
                  onClick={() => {
                    setSelectedSample(sample.id);
                    setWaterDepthCm(sample.depthCm);
                    setUserNotes(sample.notes);
                    setImagePreview(null);
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    selectedSample === sample.id
                      ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className={`h-12 rounded mb-1.5 bg-gradient-to-br ${sample.previewGradient} flex items-center justify-center text-lg`}>
                    🌊
                  </div>
                  <div className="font-semibold text-white truncate text-[11px]">{sample.title}</div>
                  <div className="text-[10px] text-purple-300 font-mono">{sample.depthCm} cm deep</div>
                </button>
              ))}
            </div>

            {/* Upload real photo */}
            <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-700 rounded-lg hover:border-slate-500 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <Upload className="w-4 h-4" />
              <span>Or upload your own camera photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            {imagePreview && (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Custom photo loaded successfully</span>
              </div>
            )}
          </div>

          {/* Location / Landmark */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Location / Street Name</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Silk Board Junction underpass"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Water Depth Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-300">3. Estimated Water Depth</span>
              <span className="font-mono font-bold text-purple-400">{waterDepthCm} cm</span>
            </div>
            <input
              type="range"
              min="10"
              max="75"
              step="5"
              value={waterDepthCm}
              onChange={(e) => setWaterDepthCm(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10cm (Splashes)</span>
              <span>25cm (Knee Deep)</span>
              <span>45cm+ (Engine Submerged)</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              4. Observations
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={2}
              placeholder="Details on traffic, submerged vehicles, open drains..."
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* AI Verification Badge */}
          <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-800/40 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Multimodal AI Verification System</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Reports are verified for reflective surface ponding, submerged wheel lines, and curb depth. Verified reports dynamically update active navigation paths in real time.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Running AI Vision Verification...</span>
              </>
            ) : (
              <>
                <span>Submit & Inject into Routing Engine</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
