import React from 'react';
import { Paintbrush, Eraser, RotateCcw, Scissors } from 'lucide-react';
import type { BrushState } from './useBackgroundRemover';

interface BrushToolPanelProps {
  brushState: BrushState;
  onBrushStateChange: (updates: Partial<BrushState>) => void;
  onUndo: () => void;
  hasMaskStrokes?: boolean;
  onManualErase?: () => void;
}

const BRUSH_SIZES = [
  { label: 'S', value: 10 },
  { label: 'M', value: 20 },
  { label: 'L', value: 40 },
];

export default function BrushToolPanel({
  brushState,
  onBrushStateChange,
  onUndo,
  hasMaskStrokes = false,
  onManualErase,
}: BrushToolPanelProps) {
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          Brush Tool
        </h3>
        <button
          onClick={() => onBrushStateChange({ active: !brushState.active })}
          className={`tool-btn text-xs px-3 py-1.5 flex items-center gap-1.5 transition-all ${
            brushState.active
              ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-300'
              : 'text-foreground/70'
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" />
          {brushState.active ? 'Active' : 'Activate'}
        </button>
      </div>

      {brushState.active && (
        <>
          {/* Brush Size */}
          <div className="space-y-2">
            <label className="text-xs text-foreground/60 uppercase tracking-wider">
              Brush Size
            </label>
            <div className="flex gap-2">
              {BRUSH_SIZES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onBrushStateChange({ size: value })}
                  className={`tool-btn flex-1 text-xs py-1.5 transition-all ${
                    brushState.size === value
                      ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-300'
                      : 'text-foreground/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Paint / Erase Mode Toggle */}
          <div className="space-y-2">
            <label className="text-xs text-foreground/60 uppercase tracking-wider">
              Brush Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onBrushStateChange({ mode: 'paint' })}
                className={`tool-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5 transition-all ${
                  brushState.mode === 'paint'
                    ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-300'
                    : 'text-foreground/70'
                }`}
              >
                <Paintbrush className="w-3 h-3" />
                Paint
              </button>
              <button
                onClick={() => onBrushStateChange({ mode: 'erase' })}
                className={`tool-btn flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5 transition-all ${
                  brushState.mode === 'erase'
                    ? 'bg-orange-500/30 border-orange-400/60 text-orange-300'
                    : 'text-foreground/70'
                }`}
              >
                <Eraser className="w-3 h-3" />
                Unpaint
              </button>
            </div>
          </div>

          {/* Undo */}
          <button
            onClick={onUndo}
            className="tool-btn w-full text-xs py-1.5 flex items-center justify-center gap-1.5 text-foreground/70 hover:text-foreground/90 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Brush Strokes
          </button>
        </>
      )}

      {/* Erase Selected Area — shown when there are painted strokes */}
      {hasMaskStrokes && onManualErase && (
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={onManualErase}
            className="tool-btn w-full py-2.5 flex items-center justify-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/35 border-cyan-500/40 text-cyan-300 hover:text-cyan-200 font-semibold text-sm transition-all"
          >
            <Scissors className="w-4 h-4" />
            Erase Selected Area
          </button>
          <p className="text-xs text-foreground/40 text-center mt-1.5">
            Removes the painted region from the image
          </p>
        </div>
      )}
    </div>
  );
}
