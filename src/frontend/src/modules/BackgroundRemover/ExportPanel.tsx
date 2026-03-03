import { dataUrlToBlob, downloadAsZip } from "@/lib/jszip";
import {
  Archive,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { OutputMode } from "./useBackgroundRemover";

interface ExportPanelProps {
  resultDataUrl: string | null;
  outputMode: OutputMode;
  bgColor: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  onAddBackgroundImage: (dataUrl: string) => void;
}

export default function ExportPanel({
  resultDataUrl,
  outputMode,
  bgColor,
  zoom,
  onZoomChange,
  onReset,
  onAddBackgroundImage,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpg">("png");

  const handleDownload = useCallback(async () => {
    if (!resultDataUrl) {
      toast.error("No result to download. Remove background first.");
      return;
    }
    setIsExporting(true);
    try {
      if (exportFormat === "png") {
        const a = document.createElement("a");
        a.href = resultDataUrl;
        a.download = "background-removed.png";
        a.click();
        toast.success("Downloaded as PNG!");
      } else {
        const img = new window.Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = resultDataUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = outputMode === "color" ? bgColor : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const a = document.createElement("a");
        a.href = jpgDataUrl;
        a.download = "background-removed.jpg";
        a.click();
        toast.success("Downloaded as JPG!");
      }
    } catch {
      toast.error("Download failed");
    } finally {
      setIsExporting(false);
    }
  }, [resultDataUrl, exportFormat, outputMode, bgColor]);

  const handleDownloadZip = useCallback(async () => {
    if (!resultDataUrl) {
      toast.error("No result to download. Remove background first.");
      return;
    }
    setIsZipping(true);
    try {
      let blob: Blob;
      let filename: string;

      if (exportFormat === "png") {
        blob = dataUrlToBlob(resultDataUrl);
        filename = "background-removed.png";
      } else {
        const img = new window.Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = resultDataUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = outputMode === "color" ? bgColor : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        blob = dataUrlToBlob(jpgDataUrl);
        filename = "background-removed.jpg";
      }

      await downloadAsZip([{ filename, data: blob }], "background-removed.zip");
      toast.success("Downloaded as ZIP!");
    } catch {
      toast.error("ZIP download failed");
    } finally {
      setIsZipping(false);
    }
  }, [resultDataUrl, exportFormat, outputMode, bgColor]);

  const handleAddBgImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        onAddBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [onAddBackgroundImage]);

  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Export &amp; Tools
      </h3>

      {/* Zoom Controls */}
      <div>
        <p className="section-title">Zoom: {Math.round(zoom * 100)}%</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(zoom - 0.25)}
            className="tool-btn w-9 h-9 p-0 justify-center flex-shrink-0"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={25}
            max={400}
            value={Math.round(zoom * 100)}
            onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
            className="flex-1 accent-primary"
          />
          <button
            type="button"
            onClick={() => onZoomChange(zoom + 0.25)}
            className="tool-btn w-9 h-9 p-0 justify-center flex-shrink-0"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Background Image */}
      <button
        type="button"
        onClick={handleAddBgImage}
        disabled={!resultDataUrl}
        className="tool-btn w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ImagePlus className="w-4 h-4" />
        Add Background Image
      </button>

      {/* Export Format */}
      <div>
        <p className="section-title">Download Format</p>
        <div className="flex gap-2">
          {(["png", "jpg"] as const).map((fmt) => (
            <button
              type="button"
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`tool-btn flex-1 justify-center uppercase text-xs font-bold ${exportFormat === fmt ? "tool-btn-active" : ""}`}
            >
              {fmt}
            </button>
          ))}
        </div>
        {exportFormat === "png" && (
          <p className="text-xs text-muted-foreground mt-1">
            PNG preserves transparency
          </p>
        )}
      </div>

      {/* Download */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!resultDataUrl || isExporting}
        className="tool-btn w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isExporting ? "Downloading..." : "Download Result"}
      </button>

      {/* Download as ZIP */}
      <button
        type="button"
        onClick={handleDownloadZip}
        disabled={!resultDataUrl || isZipping}
        className="tool-btn w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isZipping ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
        {isZipping ? "Creating ZIP..." : "Download as ZIP"}
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="tool-btn w-full justify-center text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <RotateCcw className="w-4 h-4" />
        Reset All
      </button>
    </div>
  );
}
