import { useRef, useCallback, useEffect, useState } from 'react';

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CropOverlayProps {
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
  cropBox: CropBox;
  onCropChange: (box: CropBox) => void;
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' | 'move' | null;

export default function CropOverlay({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  cropBox,
  onCropChange,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    startBox: CropBox;
  } | null>(null);

  // Scale factor: canvas coords to display coords
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  const toDisplay = (v: number, axis: 'x' | 'y') =>
    axis === 'x' ? v * scaleX : v * scaleY;
  const toImage = (v: number, axis: 'x' | 'y') =>
    axis === 'x' ? v / scaleX : v / scaleY;

  const dx = toDisplay(cropBox.x, 'x');
  const dy = toDisplay(cropBox.y, 'y');
  const dw = toDisplay(cropBox.w, 'x');
  const dh = toDisplay(cropBox.h, 'y');

  const getHandle = useCallback((e: React.MouseEvent | React.TouchEvent): HandleType => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const hs = 12; // handle size

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
    const handle = getHandle(e);
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
    const dx2 = toImage(mx - dragRef.current.startX, 'x');
    const dy2 = toImage(my - dragRef.current.startY, 'y');
    const sb = dragRef.current.startBox;
    let { x, y, w, h } = sb;
    const minSize = 20;

    switch (dragRef.current.handle) {
      case 'move':
        x = Math.max(0, Math.min(imageWidth - w, sb.x + dx2));
        y = Math.max(0, Math.min(imageHeight - h, sb.y + dy2));
        break;
      case 'tl':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + dx2));
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + dy2));
        w = sb.x + sb.w - x;
        h = sb.y + sb.h - y;
        break;
      case 'tr':
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + dy2));
        w = Math.max(minSize, Math.min(imageWidth - sb.x, sb.w + dx2));
        h = sb.y + sb.h - y;
        break;
      case 'bl':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + dx2));
        w = sb.x + sb.w - x;
        h = Math.max(minSize, Math.min(imageHeight - sb.y, sb.h + dy2));
        break;
      case 'br':
        w = Math.max(minSize, Math.min(imageWidth - sb.x, sb.w + dx2));
        h = Math.max(minSize, Math.min(imageHeight - sb.y, sb.h + dy2));
        break;
      case 'tm':
        y = Math.max(0, Math.min(sb.y + sb.h - minSize, sb.y + dy2));
        h = sb.y + sb.h - y;
        break;
      case 'bm':
        h = Math.max(minSize, Math.min(imageHeight - sb.y, sb.h + dy2));
        break;
      case 'ml':
        x = Math.max(0, Math.min(sb.x + sb.w - minSize, sb.x + dx2));
        w = sb.x + sb.w - x;
        break;
      case 'mr':
        w = Math.max(minSize, Math.min(imageWidth - sb.x, sb.w + dx2));
        break;
    }

    onCropChange({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  }, [imageWidth, imageHeight, onCropChange, toImage]);

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

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair"
      onMouseDown={handleMouseDown}
      style={{ userSelect: 'none' }}
    >
      {/* Dark overlay outside crop box */}
      <svg width={containerWidth} height={containerHeight} className="absolute inset-0 pointer-events-none">
        <defs>
          <mask id="crop-mask">
            <rect width={containerWidth} height={containerHeight} fill="white" />
            <rect x={dx} y={dy} width={dw} height={dh} fill="black" />
          </mask>
        </defs>
        <rect
          width={containerWidth}
          height={containerHeight}
          fill="rgba(0,0,0,0.5)"
          mask="url(#crop-mask)"
        />
        {/* Crop border */}
        <rect x={dx} y={dy} width={dw} height={dh} fill="none" stroke="white" strokeWidth={1.5} />
        {/* Rule of thirds */}
        <line x1={dx + dw / 3} y1={dy} x2={dx + dw / 3} y2={dy + dh} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
        <line x1={dx + (2 * dw) / 3} y1={dy} x2={dx + (2 * dw) / 3} y2={dy + dh} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
        <line x1={dx} y1={dy + dh / 3} x2={dx + dw} y2={dy + dh / 3} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
        <line x1={dx} y1={dy + (2 * dh) / 3} x2={dx + dw} y2={dy + (2 * dh) / 3} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
      </svg>

      {/* Handles */}
      {handles.map(h => (
        <div
          key={h.id}
          className="absolute w-3 h-3 bg-white border-2 border-primary rounded-sm shadow-md"
          style={{
            left: h.cx - 6,
            top: h.cy - 6,
            cursor: h.id === 'move' ? 'move' :
              ['tl', 'br'].includes(h.id!) ? 'nwse-resize' :
              ['tr', 'bl'].includes(h.id!) ? 'nesw-resize' :
              ['tm', 'bm'].includes(h.id!) ? 'ns-resize' : 'ew-resize',
          }}
        />
      ))}
    </div>
  );
}
