import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Maximize2 } from 'lucide-react';

interface ResizeToolProps {
  originalWidth: number;
  originalHeight: number;
  onResize: (width: number, height: number) => void;
}

export default function ResizeTool({ originalWidth, originalHeight, onResize }: ResizeToolProps) {
  const [width, setWidth] = useState(originalWidth.toString());
  const [height, setHeight] = useState(originalHeight.toString());
  const [lockAspect, setLockAspect] = useState(true);

  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (lockAspect && originalWidth > 0) {
      const ratio = originalHeight / originalWidth;
      setHeight(Math.round(Number(val) * ratio).toString());
    }
  };

  const handleHeightChange = (val: string) => {
    setHeight(val);
    if (lockAspect && originalHeight > 0) {
      const ratio = originalWidth / originalHeight;
      setWidth(Math.round(Number(val) * ratio).toString());
    }
  };

  const handleApply = () => {
    const w = parseInt(width);
    const h = parseInt(height);
    if (w > 0 && h > 0) onResize(w, h);
  };

  return (
    <div className="space-y-3">
      <p className="section-title">Resize</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Width (px)</Label>
          <Input
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Height (px)</Label>
          <Input
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={lockAspect} onCheckedChange={setLockAspect} id="lock-aspect" />
        <Label htmlFor="lock-aspect" className="text-xs text-muted-foreground cursor-pointer">
          Lock aspect ratio
        </Label>
      </div>
      <Button size="sm" onClick={handleApply} className="w-full gap-2">
        <Maximize2 className="w-3.5 h-3.5" />
        Apply Resize
      </Button>
    </div>
  );
}
