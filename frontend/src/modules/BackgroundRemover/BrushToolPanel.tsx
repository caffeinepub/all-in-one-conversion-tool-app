import React from 'react';
import { Button } from '@/components/ui/button';
import { Paintbrush, Eraser, Undo2, Trash2, Scissors } from 'lucide-react';

interface BrushToolPanelProps {
  brushActive: boolean;
  brushSize: number;
  brushMode: 'paint' | 'erase';
  hasMaskStrokes: boolean;
  onBrushActiveChange: (active: boolean) => void;
  onBrushSizeChange: (size: number) => void;
  onBrushModeChange: (mode: 'paint' | 'erase') => void;
  onUndo: () => void;
  onClear: () => void;
  onEraseSelected: () => void;
}

export default function BrushToolPanel({
  brushActive,
  brushSize,
  brushMode,
  hasMaskStrokes,
  onBrushActiveChange,
  onBrushSizeChange,
  onBrushModeChange,
  onUndo,
  onClear,
  onEraseSelected,
}: BrushToolPanelProps) {
  // Preview circle diameter capped at 48px for display
  const previewDiameter = Math.min(brushSize, 48);

  return (
    <div
      className="flex flex-col gap-3"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Brush Mode / Paint Areas</p>
        <Button
          variant={brushActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => onBrushActiveChange(!brushActive)}
          className={brushActive ? 'bg-primary text-primary-foreground' : ''}
        >
          <Paintbrush className="w-4 h-4 mr-1" />
          {brushActive ? 'Active' : 'Activate'}
        </Button>
      </div>

      {brushActive && (
        <div className="flex flex-col gap-3 pt-1">
          {/* Paint / Erase mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Mode:</span>
            <div className="flex gap-1">
              <Button
                variant={brushMode === 'paint' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onBrushModeChange('paint')}
                className="text-xs"
              >
                <Paintbrush className="w-3 h-3 mr-1" />
                Paint
              </Button>
              <Button
                variant={brushMode === 'erase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onBrushModeChange('erase')}
                className="text-xs"
              >
                <Eraser className="w-3 h-3 mr-1" />
                Unpaint
              </Button>
            </div>
          </div>

          {/* Brush thickness slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Thickness:</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">{brushSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Brush preview circle */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 52, height: 52 }}
              >
                <div
                  style={{
                    width: previewDiameter,
                    height: previewDiameter,
                    borderRadius: '50%',
                    background: brushMode === 'paint' ? 'rgba(255,60,60,0.55)' : 'rgba(100,100,100,0.35)',
                    border: '1.5px solid rgba(255,60,60,0.8)',
                    transition: 'width 0.1s, height 0.1s',
                  }}
                />
              </div>
              <input
                type="range"
                min={4}
                max={100}
                step={1}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="flex-1 h-2 rounded-full accent-primary cursor-pointer"
                style={{ accentColor: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Undo / Clear */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onUndo} className="text-xs">
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Erase Selected Area — prominent CTA when strokes exist */}
      {hasMaskStrokes && (
        <Button
          size="sm"
          onClick={onEraseSelected}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-1"
        >
          <Scissors className="w-4 h-4 mr-2" />
          Erase Selected Area
        </Button>
      )}
    </div>
  );
}
