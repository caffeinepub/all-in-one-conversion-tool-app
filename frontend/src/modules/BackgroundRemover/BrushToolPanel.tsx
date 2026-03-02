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

const BRUSH_SIZES = [
  { label: 'S', value: 10 },
  { label: 'M', value: 25 },
  { label: 'L', value: 50 },
];

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
  return (
    <div
      className="flex flex-col gap-3"
      // Prevent any touch events from bubbling up and causing scroll/layout shifts
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

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Size:</span>
            <div className="flex gap-1">
              {BRUSH_SIZES.map((s) => (
                <Button
                  key={s.label}
                  variant={brushSize === s.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onBrushSizeChange(s.value)}
                  className="w-9 text-xs"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Undo / Clear */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onUndo} className="text-xs">
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={onClear} className="text-xs text-destructive hover:text-destructive">
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
