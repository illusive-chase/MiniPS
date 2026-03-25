interface WandPanelProps {
  tolerance: number;
  onToleranceChange: (value: number) => void;
}

export default function WandPanel({ tolerance, onToleranceChange }: WandPanelProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-gray-300">
        Tolerance
        <input
          type="range"
          min={0}
          max={255}
          step={1}
          value={tolerance}
          onChange={(e) => onToleranceChange(Number(e.target.value))}
          className="w-32"
        />
        <span className="w-8 text-right tabular-nums text-gray-200">{tolerance}</span>
      </label>
      <div className="w-px h-6 bg-gray-600" />
      <span className="text-xs text-gray-400">Click on the image to remove similar pixels</span>
    </div>
  );
}
