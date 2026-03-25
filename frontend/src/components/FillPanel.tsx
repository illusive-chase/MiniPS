import { useState } from 'react';

interface FillPanelProps {
  onApply: (color: string) => void;
  onCancel: () => void;
}

export default function FillPanel({ onApply, onCancel }: FillPanelProps) {
  const [color, setColor] = useState('#ffffff');

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-gray-300">
        Fill color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
        />
      </label>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Apply */}
      <button
        onClick={() => onApply(color)}
        className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        Apply
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
