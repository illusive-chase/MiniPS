import { useState, useEffect, useCallback } from 'react';

interface ResizePanelProps {
  currentWidth: number;
  currentHeight: number;
  onApply: (width: number, height: number) => void;
  onCancel: () => void;
}

export default function ResizePanel({
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
}: ResizePanelProps) {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspectRatio] = useState(currentWidth / currentHeight);

  // Re-sync if the source dimensions change while the panel is open
  useEffect(() => {
    setWidth(currentWidth);
    setHeight(currentHeight);
  }, [currentWidth, currentHeight]);

  const handleWidthChange = useCallback(
    (val: number) => {
      const clamped = Math.max(1, Math.round(val));
      setWidth(clamped);
      if (lockAspect) {
        setHeight(Math.max(1, Math.round(clamped / aspectRatio)));
      }
    },
    [lockAspect, aspectRatio],
  );

  const handleHeightChange = useCallback(
    (val: number) => {
      const clamped = Math.max(1, Math.round(val));
      setHeight(clamped);
      if (lockAspect) {
        setWidth(Math.max(1, Math.round(clamped * aspectRatio)));
      }
    },
    [lockAspect, aspectRatio],
  );

  const handleApply = useCallback(() => {
    if (width > 0 && height > 0) {
      onApply(width, height);
    }
  }, [width, height, onApply]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
      {/* Width */}
      <label className="flex items-center gap-1.5 text-sm text-gray-300">
        W
        <input
          type="number"
          min={1}
          value={width}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm rounded bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500"
        />
      </label>

      {/* Lock aspect ratio toggle */}
      <button
        onClick={() => setLockAspect((prev) => !prev)}
        title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          lockAspect
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        {lockAspect ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M14.5 1A4.5 4.5 0 0010 5.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1.5V5.5a3 3 0 116 0v2.75a.75.75 0 001.5 0V5.5A4.5 4.5 0 0014.5 1z" />
          </svg>
        )}
      </button>

      {/* Height */}
      <label className="flex items-center gap-1.5 text-sm text-gray-300">
        H
        <input
          type="number"
          min={1}
          value={height}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm rounded bg-gray-700 border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500"
        />
      </label>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Apply */}
      <button
        onClick={handleApply}
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
