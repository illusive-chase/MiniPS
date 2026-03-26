import { useState, useRef, useEffect } from 'react';

interface AiEditPanelProps {
  onApply: (prompt: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export default function AiEditPanel({ onApply, onCancel, loading, error }: AiEditPanelProps) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prompt.trim() && !loading) {
      onApply(prompt.trim());
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-xl shadow-lg px-5 py-4 flex flex-col gap-3 min-w-[480px]">
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the edit (e.g. 'remove background', 'make it warmer')"
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-base rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600" />

        {/* Apply */}
        <button
          onClick={() => prompt.trim() && onApply(prompt.trim())}
          disabled={!prompt.trim() || loading}
          className="px-5 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Processing...' : 'Apply'}
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
    </div>
  );
}
