import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Plus, Trash2, MousePointer, ChevronDown, ChevronUp } from 'lucide-react';
import type { TextLayer } from './useImageCanvas';

const FONTS = [
  'Arial',
  'Georgia',
  'Impact',
  'Courier New',
  'Trebuchet MS',
  'Verdana',
  'Times New Roman',
];

interface TextOverlayProps {
  textLayers: TextLayer[];
  canvasWidth: number;
  canvasHeight: number;
  onAdd: (layer: Omit<TextLayer, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<TextLayer>) => void;
  onRemove: (id: string) => void;
  isPlacingText: boolean;
  onStartPlacing: (config: Omit<TextLayer, 'id'>) => void;
  onCancelPlacing: () => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
}

export default function TextOverlay({
  textLayers,
  canvasWidth,
  canvasHeight,
  onAdd,
  onUpdate,
  onRemove,
  isPlacingText,
  onStartPlacing,
  onCancelPlacing,
  selectedLayerId,
  onSelectLayer,
}: TextOverlayProps) {
  const [text, setText] = useState('Your Text');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [color, setColor] = useState('#ffffff');
  const [outline, setOutline] = useState(false);

  // Background color state
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  // Shadow state (detailed)
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(6);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);

  // Collapsible sections
  const [bgOpen, setBgOpen] = useState(false);
  const [shadowOpen, setShadowOpen] = useState(false);

  const buildLayer = (x: number, y: number): Omit<TextLayer, 'id'> => ({
    text,
    x,
    y,
    rotation: 0,
    fontSize,
    fontFamily,
    color,
    shadow: shadowEnabled,
    outline,
    backgroundEnabled,
    backgroundColor,
    shadowEnabled,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
  });

  const handleAddCenter = () => {
    if (!text.trim()) return;
    onAdd(buildLayer(canvasWidth / 2, canvasHeight / 2));
  };

  const handleStartPlacing = () => {
    if (!text.trim()) return;
    onStartPlacing(buildLayer(0, 0));
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Text Overlay</p>

      <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
        {/* Text Content */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Text Content</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text..."
            className="h-8 text-sm"
          />
        </div>

        {/* Font & Color */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Font</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map(f => (
                  <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Text Color</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-8 rounded-md border border-border cursor-pointer bg-transparent"
            />
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Font Size</span>
            <span className="font-mono">{fontSize}px</span>
          </div>
          <Slider min={12} max={200} step={2} value={[fontSize]} onValueChange={([v]) => setFontSize(v)} />
        </div>

        {/* Outline toggle */}
        <div className="flex items-center gap-2">
          <Switch checked={outline} onCheckedChange={setOutline} id="text-outline" />
          <Label htmlFor="text-outline" className="text-xs cursor-pointer">Outline</Label>
        </div>

        {/* ── Text Background Color Section ── */}
        <div className="rounded-md border border-border/40 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 bg-secondary/40 hover:bg-secondary/70 transition-colors"
            onClick={() => setBgOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={backgroundEnabled}
                onCheckedChange={(val) => { setBackgroundEnabled(val); setBgOpen(val || bgOpen); }}
                id="text-bg-enabled"
                onClick={(e) => e.stopPropagation()}
              />
              <Label htmlFor="text-bg-enabled" className="text-xs font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>
                Text Background
              </Label>
              {backgroundEnabled && (
                <span
                  className="inline-block w-4 h-4 rounded border border-border/60 flex-shrink-0"
                  style={{ backgroundColor }}
                />
              )}
            </div>
            {bgOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {bgOpen && (
            <div className="px-3 py-2 space-y-2 bg-background/30">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-8 rounded-md border border-border cursor-pointer bg-transparent flex-shrink-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{backgroundColor}</span>
                  <span
                    className="flex-1 h-8 rounded-md border border-border/40"
                    style={{ backgroundColor }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Text Shadow Section ── */}
        <div className="rounded-md border border-border/40 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 bg-secondary/40 hover:bg-secondary/70 transition-colors"
            onClick={() => setShadowOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={shadowEnabled}
                onCheckedChange={(val) => { setShadowEnabled(val); setShadowOpen(val || shadowOpen); }}
                id="text-shadow-enabled"
                onClick={(e) => e.stopPropagation()}
              />
              <Label htmlFor="text-shadow-enabled" className="text-xs font-medium cursor-pointer" onClick={(e) => e.stopPropagation()}>
                Text Shadow
              </Label>
              {shadowEnabled && (
                <span
                  className="text-[10px] text-muted-foreground font-mono"
                  style={{
                    textShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`,
                  }}
                >
                  Aa
                </span>
              )}
            </div>
            {shadowOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {shadowOpen && (
            <div className="px-3 py-2 space-y-3 bg-background/30">
              {/* Shadow Color */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Shadow Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shadowColor}
                    onChange={(e) => setShadowColor(e.target.value)}
                    className="w-10 h-8 rounded-md border border-border cursor-pointer bg-transparent flex-shrink-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{shadowColor}</span>
                  <span
                    className="flex-1 h-8 rounded-md border border-border/40"
                    style={{ backgroundColor: shadowColor }}
                  />
                </div>
              </div>

              {/* Blur Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Blur Radius</span>
                  <span className="font-mono">{shadowBlur}px</span>
                </div>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[shadowBlur]}
                  onValueChange={([v]) => setShadowBlur(v)}
                />
              </div>

              {/* Horizontal Offset */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Horizontal Offset</span>
                  <span className="font-mono">{shadowOffsetX}px</span>
                </div>
                <Slider
                  min={-10}
                  max={10}
                  step={1}
                  value={[shadowOffsetX]}
                  onValueChange={([v]) => setShadowOffsetX(v)}
                />
              </div>

              {/* Vertical Offset */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vertical Offset</span>
                  <span className="font-mono">{shadowOffsetY}px</span>
                </div>
                <Slider
                  min={-10}
                  max={10}
                  step={1}
                  value={[shadowOffsetY]}
                  onValueChange={([v]) => setShadowOffsetY(v)}
                />
              </div>

              {/* Live preview */}
              <div className="rounded-md bg-secondary/60 border border-border/30 p-2 text-center">
                <span
                  className="text-sm font-medium"
                  style={{
                    color,
                    textShadow: shadowEnabled
                      ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
                      : 'none',
                  }}
                >
                  Preview Text
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Click-to-place button */}
        <Button
          size="sm"
          variant={isPlacingText ? 'default' : 'outline'}
          className="w-full gap-2"
          onClick={isPlacingText ? onCancelPlacing : handleStartPlacing}
          disabled={!text.trim()}
        >
          <MousePointer className="w-3.5 h-3.5" />
          {isPlacingText ? 'Placing… (click image)' : 'Click to Place on Canvas'}
        </Button>

        {isPlacingText && (
          <p className="text-xs text-primary text-center animate-pulse">
            👆 Click anywhere on the image to place your text
          </p>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddCenter}
          className="w-full gap-2 text-muted-foreground"
          disabled={!text.trim()}
        >
          <Plus className="w-3.5 h-3.5" />
          Add to Center
        </Button>
      </div>

      {/* Active Layers */}
      {textLayers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Active Layers ({textLayers.length})</p>
          {textLayers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                selectedLayerId === layer.id
                  ? 'bg-primary/10 border-primary/40'
                  : 'bg-secondary/30 border-border/30 hover:bg-secondary/50'
              }`}
              onClick={() => onSelectLayer(selectedLayerId === layer.id ? null : layer.id)}
            >
              <Type className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs truncate block" style={{ fontFamily: layer.fontFamily, color: layer.color }}>
                  {layer.text}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {layer.x.toFixed(0)}, {layer.y.toFixed(0)} · {layer.rotation}°
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); onRemove(layer.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
