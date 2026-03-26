import { useState } from 'react';

interface FillPanelProps {
  onApply: (color: string) => void;
  onCancel: () => void;
}

export default function FillPanel({ onApply, onCancel }: FillPanelProps) {
  const [color, setColor] = useState('#ffffff');

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-xl shadow-lg px-5 py-4 flex items-center gap-4">
      <label className="flex items-center gap-2 text-base text-gray-300">
        Fill color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-600 bg-transparent cursor-pointer"
        />
      </label>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600" />

      {/* Apply */}
      <button
        onClick={() => onApply(color)}
        className="px-5 py-2 text-base rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        Apply
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="px-5 py-2 text-base rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
