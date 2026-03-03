import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: string, quality: number) => string | null;
}

export default function ExportDialog({
  open,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState("jpeg");
  const [quality, setQuality] = useState(92);

  const handleDownload = () => {
    const dataUrl = onExport(format, quality);
    if (!dataUrl) {
      toast.error("No image to export");
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `edited-image.${format === "jpeg" ? "jpg" : format}`;
    link.click();
    toast.success("Image exported successfully!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup
              value={format}
              onValueChange={setFormat}
              className="flex gap-4"
            >
              {["jpeg", "png", "webp"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`fmt-${f}`} />
                  <Label
                    htmlFor={`fmt-${f}`}
                    className="text-sm uppercase cursor-pointer"
                  >
                    {f === "jpeg" ? "JPG" : f.toUpperCase()}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {format !== "png" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Quality</Label>
                <span className="font-mono text-muted-foreground">
                  {quality}%
                </span>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
              />
              <p className="text-xs text-muted-foreground">
                {quality >= 90
                  ? "High quality"
                  : quality >= 70
                    ? "Medium quality"
                    : "Low quality (smaller file)"}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
