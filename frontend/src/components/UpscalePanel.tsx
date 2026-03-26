import { useState } from 'react';

interface UpscalePanelProps {
  onApply: (scale: 2 | 4) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export default function UpscalePanel({ onApply, onCancel, loading, error }: UpscalePanelProps) {
  const [scale, setScale] = useState<2 | 4>(2);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-xl shadow-lg px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="text-base text-gray-300">Scale</span>

        {/* 2x toggle */}
        <button
          onClick={() => setScale(2)}
          disabled={loading}
          className={`px-5 py-2 text-base rounded-lg transition-colors disabled:opacity-50 ${
            scale === 2
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          2x
        </button>

        {/* 4x toggle */}
        <button
          onClick={() => setScale(4)}
          disabled={loading}
          className={`px-5 py-2 text-base rounded-lg transition-colors disabled:opacity-50 ${
            scale === 4
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          4x
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600" />

        {/* Apply */}
        <button
          onClick={() => onApply(scale)}
          disabled={loading}
          className="px-5 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Upscaling...' : 'Upscale'}
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2 text-base rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 max-h-24 overflow-y-auto">
          {error}
        </div>
      )}

      {/* Info text */}
      {!error && !loading && (
        <span className="text-sm text-gray-500">
          Requires Real-ESRGAN model files in the models/ directory
        </span>
      )}
    </div>
  );
}
