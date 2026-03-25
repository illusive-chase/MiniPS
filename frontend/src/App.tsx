import { useState, useRef, useCallback, useEffect } from 'react';
import Canvas from './components/Canvas';
import type { CanvasHandle, ToolMode } from './components/Canvas';
import ResizePanel from './components/ResizePanel';
import WandPanel from './components/WandPanel';
import FillPanel from './components/FillPanel';
import {
  openImage,
  getExportUrl,
  getSessionInfo,
  undo as apiUndo,
  redo as apiRedo,
  cropImage,
  resizeImage,
  magicWand,
  rectErase,
  alphaRepaint,
} from './api/client';

const TOOLS: { id: ToolMode; label: string }[] = [
  { id: 'crop', label: 'Crop' },
  { id: 'resize', label: 'Resize' },
  { id: 'wand', label: 'Wand' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
  { id: 'ai-edit', label: 'AI Edit' },
  { id: 'upscale', label: 'Upscale' },
];

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('none');
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [wandTolerance, setWandTolerance] = useState(32);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSessionInfo = useCallback(async (sid: string) => {
    try {
      const info = await getSessionInfo(sid);
      setCanUndo(info.can_undo);
      setCanRedo(info.can_redo);
    } catch {}
  }, []);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const info = await openImage(file);
      setSessionId(info.session_id);
      setImageSize({ width: info.width, height: info.height });
      setActiveTool('none');
      setCanUndo(false);
      setCanRedo(false);
      await refreshSessionInfo(info.session_id);
    } catch (err) {
      console.error('Failed to open image:', err);
    } finally {
      setLoading(false);
      // Reset file input so the same file can be re-opened
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [refreshSessionInfo]);

  const handleSave = useCallback(() => {
    if (!sessionId) return;
    const url = getExportUrl(sessionId, 'png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [sessionId]);

  const handleUndo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const size = await apiUndo(sessionId);
      setImageSize({ width: size.width, height: size.height });
      canvasRef.current?.refreshImage();
      await refreshSessionInfo(sessionId);
    } catch (err) {
      console.error('Undo failed:', err);
    }
  }, [sessionId, refreshSessionInfo]);

  const handleRedo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const size = await apiRedo(sessionId);
      setImageSize({ width: size.width, height: size.height });
      canvasRef.current?.refreshImage();
      await refreshSessionInfo(sessionId);
    } catch (err) {
      console.error('Redo failed:', err);
    }
  }, [sessionId, refreshSessionInfo]);

  const handleCropSelect = useCallback(
    async (x: number, y: number, w: number, h: number) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const size = await cropImage(sessionId, x, y, w, h);
        setImageSize({ width: size.width, height: size.height });
        canvasRef.current?.refreshImage();
        await refreshSessionInfo(sessionId);
      } catch (err) {
        console.error('Crop failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, refreshSessionInfo]
  );

  const handleWandClick = useCallback(
    async (x: number, y: number) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const size = await magicWand(sessionId, x, y, wandTolerance);
        setImageSize({ width: size.width, height: size.height });
        canvasRef.current?.refreshImage();
        await refreshSessionInfo(sessionId);
      } catch (err) {
        console.error('Wand failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, wandTolerance, refreshSessionInfo]
  );

  const handleEraserSelect = useCallback(
    async (x: number, y: number, w: number, h: number) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const size = await rectErase(sessionId, x, y, w, h);
        setImageSize({ width: size.width, height: size.height });
        canvasRef.current?.refreshImage();
        await refreshSessionInfo(sessionId);
      } catch (err) {
        console.error('Erase failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, refreshSessionInfo]
  );

  const handleFillApply = useCallback(
    async (color: string) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const size = await alphaRepaint(sessionId, color);
        setImageSize({ width: size.width, height: size.height });
        canvasRef.current?.refreshImage();
        await refreshSessionInfo(sessionId);
        setActiveTool('none');
      } catch (err) {
        console.error('Fill failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, refreshSessionInfo]
  );

  const handleFillCancel = useCallback(() => {
    setActiveTool('none');
  }, []);

  const handleToolClick = useCallback((toolId: ToolMode) => {
    setActiveTool((prev) => (prev === toolId ? 'none' : toolId));
  }, []);

  const handleResizeApply = useCallback(
    async (width: number, height: number) => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const size = await resizeImage(sessionId, width, height);
        setImageSize({ width: size.width, height: size.height });
        canvasRef.current?.refreshImage();
        await refreshSessionInfo(sessionId);
        setActiveTool('none');
      } catch (err) {
        console.error('Resize failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, refreshSessionInfo],
  );

  const handleResizeCancel = useCallback(() => {
    setActiveTool('none');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <button
          onClick={handleOpen}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Open
        </button>
        <button
          onClick={handleSave}
          disabled={!sessionId || loading}
          className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Save
        </button>
        <div className="w-px h-6 bg-gray-600 mx-1" />
        <button
          onClick={handleUndo}
          disabled={!sessionId || loading || !canUndo}
          className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!sessionId || loading || !canRedo}
          className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Redo
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Canvas area with floating panels */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Canvas
          ref={canvasRef}
          sessionId={sessionId}
          tool={activeTool}
          onZoomChange={setZoom}
          onCropSelect={handleCropSelect}
          onWandClick={handleWandClick}
          onEraserSelect={handleEraserSelect}
        />

        {/* Resize panel (floating above bottom toolbar) */}
        {activeTool === 'resize' && imageSize && (
          <ResizePanel
            currentWidth={imageSize.width}
            currentHeight={imageSize.height}
            onApply={handleResizeApply}
            onCancel={handleResizeCancel}
          />
        )}

        {/* Wand panel */}
        {activeTool === 'wand' && (
          <WandPanel tolerance={wandTolerance} onToleranceChange={setWandTolerance} />
        )}

        {/* Fill panel */}
        {activeTool === 'fill' && (
          <FillPanel onApply={handleFillApply} onCancel={handleFillCancel} />
        )}
      </div>

      {/* Bottom tool bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border-t border-gray-700 shrink-0 flex-wrap">
        {TOOLS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleToolClick(id)}
            disabled={!sessionId}
            className={`px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50 ${
              activeTool === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
