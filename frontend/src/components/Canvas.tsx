import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { getImageUrl } from '../api/client';

export type ToolMode = 'none' | 'crop' | 'resize' | 'wand' | 'eraser' | 'fill' | 'ai-edit' | 'upscale';

export interface CanvasHandle {
  refreshImage(): void;
}

interface CanvasProps {
  sessionId: string | null;
  tool: ToolMode;
  onZoomChange?: (zoom: number) => void;
  onCropSelect?: (x: number, y: number, w: number, h: number) => void;
  onWandClick?: (x: number, y: number) => void;
  onEraserSelect?: (x: number, y: number, w: number, h: number) => void;
}

interface DragRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const CHECKER_SIZE = 16;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

function createCheckerPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = CHECKER_SIZE * 2;
  patternCanvas.height = CHECKER_SIZE * 2;
  const pctx = patternCanvas.getContext('2d')!;
  pctx.fillStyle = '#3a3a3a';
  pctx.fillRect(0, 0, CHECKER_SIZE * 2, CHECKER_SIZE * 2);
  pctx.fillStyle = '#2a2a2a';
  pctx.fillRect(0, 0, CHECKER_SIZE, CHECKER_SIZE);
  pctx.fillRect(CHECKER_SIZE, CHECKER_SIZE, CHECKER_SIZE, CHECKER_SIZE);
  return ctx.createPattern(patternCanvas, 'repeat');
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { sessionId, tool, onZoomChange, onCropSelect, onWandClick, onEraserSelect },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // View state
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [, setZoom] = useState(1);

  // Interaction state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  // Drag rectangle state (shared by crop and eraser tools)
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const isDraggingRef = useRef(false);

  // Stable refs for props/callbacks so effects & listeners don't cascade
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const onCropSelectRef = useRef(onCropSelect);
  onCropSelectRef.current = onCropSelect;
  const onEraserSelectRef = useRef(onEraserSelect);
  onEraserSelectRef.current = onEraserSelect;
  const dragRectRef = useRef(dragRect);
  dragRectRef.current = dragRect;

  // Track which sessionId we last loaded to avoid zoom reset on re-renders
  const loadedSessionRef = useRef<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const img = imageRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const z = zoomRef.current;
    const pan = panRef.current;

    // Image dimensions in screen space
    const imgW = img.naturalWidth * z;
    const imgH = img.naturalHeight * z;

    // Center the image
    const cx = rect.width / 2 + pan.x;
    const cy = rect.height / 2 + pan.y;
    const drawX = cx - imgW / 2;
    const drawY = cy - imgH / 2;

    // Draw checkerboard behind the image
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, drawY, imgW, imgH);
    ctx.clip();
    const pattern = createCheckerPattern(ctx);
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(drawX, drawY, imgW, imgH);
    }
    ctx.restore();

    // Draw the image
    ctx.drawImage(img, drawX, drawY, imgW, imgH);

    const currentTool = toolRef.current;
    const currentDragRect = dragRectRef.current;

    // Draw crop overlay if active
    if (currentDragRect && currentTool === 'crop') {
      const rx = Math.min(currentDragRect.startX, currentDragRect.endX);
      const ry = Math.min(currentDragRect.startY, currentDragRect.endY);
      const rw = Math.abs(currentDragRect.endX - currentDragRect.startX);
      const rh = Math.abs(currentDragRect.endY - currentDragRect.startY);

      // Dim the area outside the crop
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(drawX, drawY, imgW, imgH);
      ctx.clearRect(rx, ry, rw, rh);
      // Redraw the image in the crop area
      ctx.drawImage(img, drawX, drawY, imgW, imgH);
      ctx.restore();

      // Draw crop border
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);

      // Semi-transparent fill
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // Draw eraser overlay if active
    if (currentDragRect && currentTool === 'eraser') {
      const rx = Math.min(currentDragRect.startX, currentDragRect.endX);
      const ry = Math.min(currentDragRect.startY, currentDragRect.endY);
      const rw = Math.abs(currentDragRect.endX - currentDragRect.startX);
      const rh = Math.abs(currentDragRect.endY - currentDragRect.startY);

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);

      // Reddish semi-transparent fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.restore();
    }
  }, []); // No deps — reads everything from refs

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
  }, [draw]); // draw is now stable, so requestDraw is stable too

  // Load image only when sessionId actually changes
  useEffect(() => {
    if (sessionId === loadedSessionRef.current) return;
    loadedSessionRef.current = sessionId;

    if (!sessionId) {
      imageRef.current = null;
      requestDraw();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;

      // Auto-fit zoom for the new image
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const fitZoom = Math.min(
          (rect.width - 40) / img.naturalWidth,
          (rect.height - 40) / img.naturalHeight,
          1
        );
        zoomRef.current = fitZoom;
        panRef.current = { x: 0, y: 0 };
        setZoom(fitZoom);
        onZoomChangeRef.current?.(fitZoom);
      }

      requestDraw();
    };
    img.src = getImageUrl(sessionId);
  }, [sessionId, requestDraw]);

  // Expose refreshImage — reloads image data without touching zoom/pan
  useImperativeHandle(
    ref,
    () => ({
      refreshImage() {
        if (!sessionId) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageRef.current = img;
          requestDraw();
        };
        img.src = getImageUrl(sessionId);
      },
    }),
    [sessionId, requestDraw]
  );

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => requestDraw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [requestDraw]);

  // Space key tracking for pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept Space when user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceDownRef.current = true;
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        setSpaceDown(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Convert screen coords to image coords
  const screenToImage = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const z = zoomRef.current;
    const pan = panRef.current;
    const img = imageRef.current;

    const cx = rect.width / 2 + pan.x;
    const cy = rect.height / 2 + pan.y;
    const drawX = cx - (img.naturalWidth * z) / 2;
    const drawY = cy - (img.naturalHeight * z) / 2;

    return {
      x: (screenX - rect.left - drawX) / z,
      y: (screenY - rect.top - drawY) / z,
    };
  }, []);

  // ── Document-level drag handlers (attached on mousedown, removed on mouseup) ──

  const onDocMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanningRef.current) {
        panRef.current = {
          x: panOriginRef.current.x + (e.clientX - panStartRef.current.x),
          y: panOriginRef.current.y + (e.clientY - panStartRef.current.y),
        };
        requestDraw();
        return;
      }

      if (isDraggingRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDragRect((prev) =>
          prev
            ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top }
            : null
        );
        requestDraw();
      }
    },
    [requestDraw]
  );

  const onDocMouseUp = useCallback(
    (_e: MouseEvent) => {
      // Always clean up document listeners
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);

      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
        return;
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        const dr = dragRectRef.current;
        if (dr) {
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (canvasRect) {
            const p1 = screenToImage(
              dr.startX + canvasRect.left,
              dr.startY + canvasRect.top
            );
            const p2 = screenToImage(
              dr.endX + canvasRect.left,
              dr.endY + canvasRect.top
            );
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);

            if (w > 1 && h > 1) {
              const currentTool = toolRef.current;
              if (currentTool === 'crop' && onCropSelectRef.current) {
                onCropSelectRef.current(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
              } else if (currentTool === 'eraser' && onEraserSelectRef.current) {
                onEraserSelectRef.current(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
              }
            }
          }
          setDragRect(null);
          requestDraw();
        }
      }
    },
    [onDocMouseMove, screenToImage, requestDraw]
  );

  // ── Canvas mousedown — starts drag and attaches document listeners ──

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Right-click, space+left-click, or left-click with no tool = pan
      if (
        e.button === 2 ||
        (e.button === 0 && spaceDownRef.current) ||
        (e.button === 0 && tool === 'none')
      ) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panOriginRef.current = { ...panRef.current };
        document.addEventListener('mousemove', onDocMouseMove);
        document.addEventListener('mouseup', onDocMouseUp);
        return;
      }

      // Left click with crop or eraser tool = start drag rectangle
      if (e.button === 0 && (tool === 'crop' || tool === 'eraser') && sessionId) {
        isDraggingRef.current = true;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        setDragRect({ startX: sx, startY: sy, endX: sx, endY: sy });
        document.addEventListener('mousemove', onDocMouseMove);
        document.addEventListener('mouseup', onDocMouseUp);
        return;
      }

      // Left click with wand tool = single click action
      if (e.button === 0 && tool === 'wand' && sessionId && onWandClick) {
        const imgCoords = screenToImage(e.clientX, e.clientY);
        onWandClick(Math.round(imgCoords.x), Math.round(imgCoords.y));
      }
    },
    [tool, sessionId, onWandClick, screenToImage, onDocMouseMove, onDocMouseUp]
  );

  // Zoom-to-cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = zoomRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * delta));
      const scale = newZoom / oldZoom;

      // Adjust pan so the point under the cursor stays fixed
      const pan = panRef.current;
      const cxOff = mouseX - rect.width / 2;
      const cyOff = mouseY - rect.height / 2;
      panRef.current = {
        x: cxOff - scale * (cxOff - pan.x),
        y: cyOff - scale * (cyOff - pan.y),
      };

      zoomRef.current = newZoom;
      setZoom(newZoom);
      onZoomChangeRef.current?.(newZoom);
      requestDraw();
    },
    [requestDraw]
  );

  // Compute cursor based on state
  const getCursor = (): string => {
    if (isPanning) return 'grabbing';
    if (spaceDown) return 'grab';
    if (tool === 'crop' || tool === 'wand' || tool === 'eraser') return 'crosshair';
    if (tool === 'none' && sessionId) return 'grab';
    return 'default';
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#1a1a1a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: getCursor() }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
});

export default Canvas;
