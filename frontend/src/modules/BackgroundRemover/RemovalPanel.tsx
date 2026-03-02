import { Wand2, Loader2 } from 'lucide-react';
import type { OutputMode } from './useBackgroundRemover';

interface RemovalPanelProps {
  outputMode: OutputMode;
  bgColor: string;
  isProcessing: boolean;
  hasImage: boolean;
  onOutputModeChange: (mode: OutputMode) => void;
  onBgColorChange: (color: string) => void;
  onRemoveBackground: () => void;
  onAutoDetect: () => void;
}

export default function RemovalPanel({
  outputMode,
  bgColor,
  isProcessing,
  hasImage,
  onOutputModeChange,
  onBgColorChange,
  onRemoveBackground,
  onAutoDetect,
}: RemovalPanelProps) {
  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Background Removal</h3>

      {/* Auto Detect */}
      <button
        onClick={onAutoDetect}
        disabled={!hasImage || isProcessing}
        className="tool-btn w-full justify-center bg-primary/10 hover:bg-primary hover:text-primary-foreground border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wand2 className="w-4 h-4" />
        Auto Detect Background
      </button>

      {/* Output Mode */}
      <div>
        <label className="section-title">Output Background</label>
        <div className="flex gap-2">
          <button
            onClick={() => onOutputModeChange('transparent')}
            className={`tool-btn flex-1 justify-center text-xs ${outputMode === 'transparent' ? 'tool-btn-active' : ''}`}
          >
            Transparent
          </button>
          <button
            onClick={() => onOutputModeChange('color')}
            className={`tool-btn flex-1 justify-center text-xs ${outputMode === 'color' ? 'tool-btn-active' : ''}`}
          >
            Custom Color
          </button>
        </div>
      </div>

      {/* Color Picker */}
      {outputMode === 'color' && (
        <div className="animate-fade-in">
          <label className="section-title">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={e => onBgColorChange(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <span className="text-xs text-muted-foreground font-mono">{bgColor}</span>
            <div className="flex gap-1 ml-auto">
              {['#ffffff', '#000000', '#0000ff', '#00ff00', '#ff0000'].map(c => (
                <button
                  key={c}
                  onClick={() => onBgColorChange(c)}
                  className="w-5 h-5 rounded border border-border/50 flex-shrink-0"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Remove Background Button */}
      <button
        onClick={onRemoveBackground}
        disabled={!hasImage || isProcessing}
        className="tool-btn w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wand2 className="w-4 h-4" />
        )}
        {isProcessing ? 'Processing...' : 'Remove Background'}
      </button>
    </div>
  );
}
