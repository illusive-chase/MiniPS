interface WandPanelProps {
  tolerance: number;
  onToleranceChange: (value: number) => void;
}

export default function WandPanel({ tolerance, onToleranceChange }: WandPanelProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-xl shadow-lg px-5 py-4 flex items-center gap-4">
      <label className="flex items-center gap-2 text-base text-gray-300">
        Tolerance
        <input
          type="range"
          min={0}
          max={255}
          step={1}
          value={tolerance}
          onChange={(e) => onToleranceChange(Number(e.target.value))}
          className="w-40"
        />
        <span className="w-10 text-right tabular-nums text-gray-200">{tolerance}</span>
      </label>
      <div className="w-px h-8 bg-gray-600" />
      <span className="text-sm text-gray-400">Click on the image to remove similar pixels</span>
    </div>
  );
}
