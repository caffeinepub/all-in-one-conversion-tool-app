import { useRef, useCallback, useEffect } from 'react';
import type { TextLayer } from './useImageCanvas';

interface TextLayerOverlayProps {
  textLayers: TextLayer[];
  canvasWidth: number;
  canvasHeight: number;
  displayWidth: number;
  displayHeight: number;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<TextLayer>) => void;
}

type DragMode = 'move' | 'rotate';

export default function TextLayerOverlay({
  textLayers,
  canvasWidth,
  canvasHeight,
  displayWidth,
  displayHeight,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
}: TextLayerOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    layerId: string;
    startClientX: number;
    startClientY: number;
    startLayerX: number;
    startLayerY: number;
    startRotation: number;
    centerClientX: number;
    centerClientY: number;
  } | null>(null);

  const scaleX = displayWidth / canvasWidth;
  const scaleY = displayHeight / canvasHeight;

  const handleLayerMouseDown = useCallback((
    e: React.MouseEvent,
    layer: TextLayer,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectLayer(layer.id);

    const overlayRect = overlayRef.current?.getBoundingClientRect();
    if (!overlayRect) return;

    const centerClientX = overlayRect.left + layer.x * scaleX;
    const centerClientY = overlayRect.top + layer.y * scaleY;

    dragRef.current = {
      mode,
      layerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startRotation: layer.rotation,
      centerClientX,
      centerClientY,
    };
  }, [onSelectLayer, scaleX, scaleY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const { mode, layerId, startClientX, startClientY, startLayerX, startLayerY, startRotation, centerClientX, centerClientY } = dragRef.current;

    if (mode === 'move') {
      const dx = (e.clientX - startClientX) / scaleX;
      const dy = (e.clientY - startClientY) / scaleY;
      const newX = Math.max(0, Math.min(canvasWidth, startLayerX + dx));
      const newY = Math.max(0, Math.min(canvasHeight, startLayerY + dy));
      onUpdateLayer(layerId, { x: Math.round(newX), y: Math.round(newY) });
    } else if (mode === 'rotate') {
      const angle = Math.atan2(e.clientY - centerClientY, e.clientX - centerClientX);
      const startAngle = Math.atan2(startClientY - centerClientY, startClientX - centerClientX);
      const delta = ((angle - startAngle) * 180) / Math.PI;
      const newRotation = Math.round(startRotation + delta);
      onUpdateLayer(layerId, { rotation: newRotation });
    }
  }, [scaleX, scaleY, canvasWidth, canvasHeight, onUpdateLayer]);

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

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none"
      style={{ userSelect: 'none' }}
    >
      {textLayers.map((layer) => {
        const lx = layer.x * scaleX;
        const ly = layer.y * scaleY;
        const isSelected = layer.id === selectedLayerId;
        const displayFontSize = layer.fontSize * Math.min(scaleX, scaleY);
        const approxCharW = displayFontSize * 0.6;
        const boxW = Math.max(60, layer.text.length * approxCharW);
        const boxH = displayFontSize * 1.5;

        return (
          <div
            key={layer.id}
            className="absolute pointer-events-auto"
            style={{
              left: lx,
              top: ly,
              transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
              cursor: 'move',
              zIndex: isSelected ? 11 : 10,
            }}
            onMouseDown={(e) => handleLayerMouseDown(e, layer, 'move')}
          >
            {/* Rotation handle stem */}
            {isSelected && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: -20,
                  width: 1,
                  height: 20,
                  background: 'rgba(255,255,255,0.7)',
                  transform: 'translateX(-50%)',
                }}
              />
            )}

            {/* Rotation handle */}
            {isSelected && (
              <div
                className="absolute w-5 h-5 bg-primary border-2 border-white rounded-full shadow-md flex items-center justify-center"
                style={{
                  left: '50%',
                  top: -40,
                  transform: 'translateX(-50%)',
                  cursor: 'grab',
                  zIndex: 13,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleLayerMouseDown(e, layer, 'rotate');
                }}
                title="Rotate text"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1.5A3.5 3.5 0 1 1 1.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1.5 2.5V5H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {/* Bounding box */}
            <div
              className={`relative border-2 rounded-sm transition-colors ${
                isSelected
                  ? 'border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.4)]'
                  : 'border-white/40 hover:border-white/70'
              }`}
              style={{ width: boxW, height: boxH }}
            >
              {/* Corner handles (selected only) */}
              {isSelected && (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-sm shadow" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-sm shadow" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-sm shadow" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-sm shadow" />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
