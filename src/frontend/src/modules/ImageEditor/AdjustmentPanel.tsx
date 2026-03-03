import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
import type { ImageState } from "./useImageCanvas";

interface AdjustmentPanelProps {
  imageState: ImageState;
  onUpdate: (updates: Partial<ImageState>) => void;
}

export default function AdjustmentPanel({
  imageState,
  onUpdate,
}: AdjustmentPanelProps) {
  const sliders = [
    { key: "brightness" as const, label: "Brightness", min: -100, max: 100 },
    { key: "contrast" as const, label: "Contrast", min: -100, max: 100 },
    { key: "saturation" as const, label: "Saturation", min: -100, max: 100 },
  ];

  const handleReset = () => {
    onUpdate({ brightness: 0, contrast: 0, saturation: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="section-title">Adjustments</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-6 text-xs px-2"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      {sliders.map(({ key, label, min, max }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-foreground">
              {imageState[key] > 0 ? "+" : ""}
              {imageState[key]}
            </span>
          </div>
          <Slider
            min={min}
            max={max}
            step={1}
            value={[imageState[key]]}
            onValueChange={([val]) => onUpdate({ [key]: val })}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}
