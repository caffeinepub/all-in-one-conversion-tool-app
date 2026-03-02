import type { TextConfig } from './usePassportPhoto';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextCustomizationPanelProps {
  textConfig: TextConfig;
  onUpdate: (config: Partial<TextConfig>) => void;
}

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'];

export function TextCustomizationPanel({ textConfig, onUpdate }: TextCustomizationPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="text-enabled"
          checked={textConfig.enabled}
          onCheckedChange={v => onUpdate({ enabled: v })}
        />
        <Label htmlFor="text-enabled" className="cursor-pointer">Enable text overlay</Label>
      </div>

      {textConfig.enabled && (
        <div className="space-y-3 pl-1">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Text</Label>
            <Input
              value={textConfig.content}
              onChange={e => onUpdate({ content: e.target.value })}
              placeholder="Enter overlay text…"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Font Family</Label>
            <Select value={textConfig.fontFamily} onValueChange={v => onUpdate({ fontFamily: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Font Size: {textConfig.fontSize}px
            </Label>
            <Slider
              min={8}
              max={48}
              step={1}
              value={[textConfig.fontSize]}
              onValueChange={([v]) => onUpdate({ fontSize: v })}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Color:</Label>
            <input
              type="color"
              value={textConfig.color}
              onChange={e => onUpdate({ color: e.target.value })}
              className="h-8 w-12 rounded border border-border cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={textConfig.bold ? 'default' : 'outline'}
              size="icon"
              onClick={() => onUpdate({ bold: !textConfig.bold })}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={textConfig.italic ? 'default' : 'outline'}
              size="icon"
              onClick={() => onUpdate({ italic: !textConfig.italic })}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <div className="flex gap-1 ml-2">
              {(['left', 'center', 'right'] as const).map(alignVal => (
                <Button
                  key={alignVal}
                  variant={textConfig.align === alignVal ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => onUpdate({ align: alignVal })}
                  title={`Align ${alignVal}`}
                >
                  {alignVal === 'left' ? <AlignLeft className="h-4 w-4" /> :
                   alignVal === 'center' ? <AlignCenter className="h-4 w-4" /> :
                   <AlignRight className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextCustomizationPanel;
