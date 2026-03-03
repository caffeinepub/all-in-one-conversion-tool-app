import { Button } from "@/components/ui/button";
import { Crop, Scissors } from "lucide-react";
import type { ImageState } from "./useImageCanvas";

interface CropToolProps {
  originalWidth: number;
  originalHeight: number;
  onUpdate: (updates: Partial<ImageState>) => void;
  onStartInteractiveCrop: () => void;
  isCropActive: boolean;
}

const PRESETS = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "3:2", ratio: 3 / 2 },
];

export default function CropTool({
  originalWidth,
  originalHeight,
  onUpdate,
  onStartInteractiveCrop,
  isCropActive,
}: CropToolProps) {
  const applyPreset = (ratio: number | null) => {
    if (ratio === null) {
      onUpdate({ cropRect: null });
      return;
    }
    let w = originalWidth;
    let h = originalHeight;
    if (w / h > ratio) {
      w = Math.round(h * ratio);
    } else {
      h = Math.round(w / ratio);
    }
    const x = Math.round((originalWidth - w) / 2);
    const y = Math.round((originalHeight - h) / 2);
    onUpdate({ cropRect: { x, y, w, h } });
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Crop</p>

      {/* Interactive Crop Button */}
      <Button
        variant={isCropActive ? "default" : "outline"}
        size="sm"
        className="w-full gap-2 font-semibold"
        onClick={onStartInteractiveCrop}
        disabled={isCropActive}
      >
        <Scissors className="w-4 h-4" />
        {isCropActive ? "Adjust Crop on Canvas…" : "Start Interactive Crop"}
      </Button>

      {isCropActive && (
        <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary text-center">
          Drag the handles on the canvas to adjust the crop region, then click{" "}
          <strong>Apply Crop</strong>.
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Quick Aspect Ratio Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.ratio)}
              className="text-xs px-3"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-muted-foreground"
        onClick={() => onUpdate({ cropRect: null })}
      >
        <Crop className="w-3.5 h-3.5" />
        Reset Crop
      </Button>
    </div>
  );
}
