import { useRef, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  displayWidth: number;
  displayHeight: number;
  onApply: (rect: CropRect) => void;
  onCancel: () => void;
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' | 'move';

export default function CropOverlay({
  canvasWidth,
  canvasHeight,
  displayWidth,
  displayHeight,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    startBox: CropRect;
  } | null>(null);

  const initW = Math.round(canvasWidth * 0.8);
  const initH = Math.round(canvasHeight * 0.8);
  const initX = Math.round((canvasWidth - initW) / 2);
  const initY = Math.round((canvasHeight - initH) / 2);

  const [cropBox, setCropBox] = useState<CropRect>({ x: initX, y: initY, w: initW, h: initH });

  const scaleX = displayWidth / canvasWidth;
  const scaleY = displayHeight / canvasHeight;

  const toDisplay = useCallback((v: number, axis: 'x' | 'y') => axis === 'x' ? v * scaleX : v * scaleY, [scaleX, scaleY]);
  const toCanvas = useCallback((v: number, axis: 'x' | 'y') => axis === 'x' ? v / scaleX : v / scaleY, [scaleX, scaleY]);

  const dx = toDisplay(cropBox.x, 'x');
  const dy = toDisplay(cropBox.y, 'y');
  const dw = toDisplay(cropBox.w, 'x');
  const dh = toDisplay(cropBox.h, 'y');

  const getHandle = useCallback((clientX: number, clientY: number): HandleType | null => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const hs = 14;

    if (Math.abs(mx - dx) < hs && Math.abs(my - dy) < hs) return 'tl';
    if (Math.abs(mx - (dx + dw)) < hs && Math.abs(my - dy) < hs) return 'tr';
    if (Math.abs(mx - dx) < hs && Math.abs(my - (dy + dh)) < hs) return 'bl';
    if (Math.abs(mx - (dx + dw)) < hs && Math.abs(my - (dy + dh)) < hs) return 'br';
    if (Math.abs(mx - (dx + dw / 2)) < hs && Math.abs(my - dy) < hs) return 'tm';
    if (Math.abs(mx - (dx + dw / 2)) < hs && Math.abs(my - (dy + dh)) < hs) return 'bm';
    if (Math.abs(mx - dx) < hs && Math.abs(my - (dy + dh / 2)) < hs) return 'ml';
    if (Math.abs(mx - (dx + dw)) < hs && Math.abs(my - (dy + dh / 2)) < hs) return 'mr';
    if (mx > dx && mx < dx + dw && my > dy && my < dy + dh) return 'move';
    return null;
  }, [dx, dy, dw, dh]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const handle = getHandle(e.clientX, e.clientY);
    if (!handle) return;
    e.preventDefault();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      handle,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startBox: { ...cropBox },
    };
  }, [getHandle, cropBox]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ddx = toCanvas(mx - dragRef.current.startX, 'x');
    const ddy = toCanvas(my - dragRef.current.startY, 'y');
    const sb = dragRef.current.startBox;
    let { x, y, w, h } = sb;
    const minSize = 20;

    switch (dragRef.current.handle) {
      case 'move':
        x = Math.max(0, Math.min(canvasWidth - w, sb.x + ddx));
        y = Math.max(0, Math.min(canvasHeight - h, sb.y + ddy));
        break;
      case 'tl':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + ddx));
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + ddy));
        w = sb.x + sb.w - x;
        h = sb.y + sb.h - y;
        break;
      case 'tr':
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + ddy));
        w = Math.max(minSize, Math.min(canvasWidth - sb.x, sb.w + ddx));
        h = sb.y + sb.h - y;
        break;
      case 'bl':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + ddx));
        w = sb.x + sb.w - x;
        h = Math.max(minSize, Math.min(canvasHeight - sb.y, sb.h + ddy));
        break;
      case 'br':
        w = Math.max(minSize, Math.min(canvasWidth - sb.x, sb.w + ddx));
        h = Math.max(minSize, Math.min(canvasHeight - sb.y, sb.h + ddy));
        break;
      case 'tm':
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + ddy));
        h = sb.y + sb.h - y;
        break;
      case 'bm':
        h = Math.max(minSize, Math.min(canvasHeight - sb.y, sb.h + ddy));
        break;
      case 'ml':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + ddx));
        w = sb.x + sb.w - x;
        break;
      case 'mr':
        w = Math.max(minSize, Math.min(canvasWidth - sb.x, sb.w + ddx));
        break;
    }

    setCropBox({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  }, [canvasWidth, canvasHeight, toCanvas]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getCursor = (handle: HandleType): string => {
    if (handle === 'move') return 'move';
    if (handle === 'tl' || handle === 'br') return 'nwse-resize';
    if (handle === 'tr' || handle === 'bl') return 'nesw-resize';
    if (handle === 'tm' || handle === 'bm') return 'ns-resize';
    return 'ew-resize';
  };

  const handles: { id: HandleType; cx: number; cy: number }[] = [
    { id: 'tl', cx: dx, cy: dy },
    { id: 'tr', cx: dx + dw, cy: dy },
    { id: 'bl', cx: dx, cy: dy + dh },
    { id: 'br', cx: dx + dw, cy: dy + dh },
    { id: 'tm', cx: dx + dw / 2, cy: dy },
    { id: 'bm', cx: dx + dw / 2, cy: dy + dh },
    { id: 'ml', cx: dx, cy: dy + dh / 2 },
    { id: 'mr', cx: dx + dw, cy: dy + dh / 2 },
  ];

  // Clamp button position so it stays within the overlay
  const btnTop = Math.min(dy + dh + 12, displayHeight - 48);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ userSelect: 'none', cursor: 'crosshair', zIndex: 10 }}
      onMouseDown={handleMouseDown}
    >
      {/* Dark overlay outside crop box */}
      <svg
        width={displayWidth}
        height={displayHeight}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'block' }}
      >
        <defs>
          <mask id="ie-crop-mask">
            <rect width={displayWidth} height={displayHeight} fill="white" />
            <rect x={dx} y={dy} width={dw} height={dh} fill="black" />
          </mask>
        </defs>
        <rect
          width={displayWidth}
          height={displayHeight}
          fill="rgba(0,0,0,0.55)"
          mask="url(#ie-crop-mask)"
        />
        <rect x={dx} y={dy} width={dw} height={dh} fill="none" stroke="white" strokeWidth={1.5} />
        {/* Rule of thirds */}
        <line x1={dx + dw / 3} y1={dy} x2={dx + dw / 3} y2={dy + dh} stroke="rgba(255,255,255,0.35)" strokeWidth={0.75} />
        <line x1={dx + (2 * dw) / 3} y1={dy} x2={dx + (2 * dw) / 3} y2={dy + dh} stroke="rgba(255,255,255,0.35)" strokeWidth={0.75} />
        <line x1={dx} y1={dy + dh / 3} x2={dx + dw} y2={dy + dh / 3} stroke="rgba(255,255,255,0.35)" strokeWidth={0.75} />
        <line x1={dx} y1={dy + (2 * dh) / 3} x2={dx + dw} y2={dy + (2 * dh) / 3} stroke="rgba(255,255,255,0.35)" strokeWidth={0.75} />
      </svg>

      {/* Drag handles */}
      {handles.map(h => (
        <div
          key={h.id}
          className="absolute w-3.5 h-3.5 bg-white border-2 border-primary rounded-sm shadow-lg"
          style={{
            left: h.cx - 7,
            top: h.cy - 7,
            cursor: getCursor(h.id),
            zIndex: 12,
          }}
        />
      ))}

      {/* Size indicator */}
      {dy > 24 && (
        <div
          className="absolute pointer-events-none"
          style={{ left: dx + dw / 2, top: dy - 26, transform: 'translateX(-50%)', zIndex: 12 }}
        >
          <span className="text-xs text-white bg-black/70 px-2 py-0.5 rounded font-mono whitespace-nowrap">
            {cropBox.w} × {cropBox.h}
          </span>
        </div>
      )}

      {/* Apply / Cancel buttons */}
      <div
        className="absolute flex gap-2 pointer-events-auto"
        style={{
          left: dx + dw / 2,
          top: btnTop,
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}
      >
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 h-8 text-xs shadow-lg"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs shadow-lg"
          onClick={(e) => { e.stopPropagation(); onApply(cropBox); }}
        >
          <Check className="w-3.5 h-3.5" />
          Apply Crop
        </Button>
      </div>
    </div>
  );
}
