import { Paintbrush, Eraser, Undo2 } from 'lucide-react';
import type { BrushState, BrushMode } from './useBackgroundRemover';

const BRUSH_SIZES = [
  { label: 'S', size: 10 },
  { label: 'M', size: 25 },
  { label: 'L', size: 50 },
];

interface BrushToolPanelProps {
  brushState: BrushState;
  onUpdate: (updates: Partial<BrushState>) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export default function BrushToolPanel({ brushState, onUpdate, onUndo, canUndo }: BrushToolPanelProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Brush Tool</h3>
        </div>
        <button
          onClick={() => onUpdate({ active: !brushState.active })}
          className={`tool-btn text-xs px-3 py-1.5 ${brushState.active ? 'tool-btn-active' : ''}`}
        >
          {brushState.active ? 'Active' : 'Activate'}
        </button>
      </div>

      {/* Brush Size */}
      <div>
        <label className="section-title">Brush Size</label>
        <div className="flex gap-2">
          {BRUSH_SIZES.map(({ label, size }) => (
            <button
              key={size}
              onClick={() => onUpdate({ size })}
              className={`tool-btn flex-1 justify-center ${brushState.size === size ? 'tool-btn-active' : ''}`}
            >
              <span className="font-bold">{label}</span>
              <span className="text-xs opacity-70">{size}px</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="section-title">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ mode: 'paint' })}
            className={`tool-btn flex-1 justify-center ${brushState.mode === 'paint' ? 'tool-btn-active' : ''}`}
          >
            <Paintbrush className="w-4 h-4" />
            Paint
          </button>
          <button
            onClick={() => onUpdate({ mode: 'erase' })}
            className={`tool-btn flex-1 justify-center ${brushState.mode === 'erase' ? 'tool-btn-active' : ''}`}
          >
            <Eraser className="w-4 h-4" />
            Erase
          </button>
        </div>
      </div>

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="tool-btn w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Undo2 className="w-4 h-4" />
        Undo Last Stroke
      </button>

      {brushState.active && (
        <p className="text-xs text-muted-foreground text-center animate-fade-in">
          {brushState.mode === 'paint'
            ? '🔴 Paint over background areas to mark them'
            : '⬜ Erase previously marked areas'}
        </p>
      )}
    </div>
  );
}
