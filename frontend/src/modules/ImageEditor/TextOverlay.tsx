import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Plus, Trash2, MousePointer } from 'lucide-react';
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
  const [shadow, setShadow] = useState(true);
  const [outline, setOutline] = useState(false);

  const buildLayer = (x: number, y: number): Omit<TextLayer, 'id'> => ({
    text,
    x,
    y,
    rotation: 0,
    fontSize,
    fontFamily,
    color,
    shadow,
    outline,
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
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Text Content</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text..."
            className="h-8 text-sm"
          />
        </div>

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
            <Label className="text-xs text-muted-foreground">Color</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-8 rounded-md border border-border cursor-pointer bg-transparent"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Font Size</span>
            <span className="font-mono">{fontSize}px</span>
          </div>
          <Slider min={12} max={200} step={2} value={[fontSize]} onValueChange={([v]) => setFontSize(v)} />
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={shadow} onCheckedChange={setShadow} id="text-shadow" />
            <Label htmlFor="text-shadow" className="text-xs cursor-pointer">Shadow</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={outline} onCheckedChange={setOutline} id="text-outline" />
            <Label htmlFor="text-outline" className="text-xs cursor-pointer">Outline</Label>
          </div>
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
