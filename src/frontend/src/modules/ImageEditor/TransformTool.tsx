import { Button } from "@/components/ui/button";
import { FlipHorizontal, FlipVertical, RotateCw } from "lucide-react";
import type { ImageState } from "./useImageCanvas";

interface TransformToolProps {
  imageState: ImageState;
  onUpdate: (updates: Partial<ImageState>) => void;
}

export default function TransformTool({
  imageState,
  onUpdate,
}: TransformToolProps) {
  const handleRotate = (deg: number) => {
    onUpdate({ rotation: (imageState.rotation + deg) % 360 });
  };

  return (
    <div className="space-y-3">
      <p className="section-title">Transform</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRotate(90)}
          className="gap-2"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Rotate 90°
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRotate(180)}
          className="gap-2"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Rotate 180°
        </Button>
        <Button
          variant={imageState.flipH ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ flipH: !imageState.flipH })}
          className="gap-2"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          Flip H
        </Button>
        <Button
          variant={imageState.flipV ? "default" : "outline"}
          size="sm"
          onClick={() => onUpdate({ flipV: !imageState.flipV })}
          className="gap-2"
        >
          <FlipVertical className="w-3.5 h-3.5" />
          Flip V
        </Button>
      </div>
    </div>
  );
}
