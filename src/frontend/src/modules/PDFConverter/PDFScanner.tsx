import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  Contrast,
  Download,
  FileImage,
  ScanLine,
  Sun,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ScannedPage {
  id: string;
  dataUrl: string;
  brightness: number;
  contrast: number;
  darkenText: boolean;
  cropRect: CropRect | null;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragHandle {
  corner: "tl" | "tr" | "bl" | "br";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyAdjustments(
  src: HTMLImageElement,
  brightness: number,
  contrast: number,
  darkenText: boolean,
  cropRect: CropRect | null,
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let sx = 0;
  let sy = 0;
  let sw = src.naturalWidth;
  let sh = src.naturalHeight;
  if (cropRect) {
    sx = cropRect.x;
    sy = cropRect.y;
    sw = cropRect.w;
    sh = cropRect.h;
  }

  canvas.width = sw;
  canvas.height = sh;

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.filter = "none";

  if (darkenText) {
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < 128) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      } else {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

function detectEdges(img: HTMLImageElement): CropRect {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  const threshold = 240;
  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(W, maxX + pad);
  maxY = Math.min(H, maxY + pad);

  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: W, h: H };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ── Sub-component: CropOverlay ───────────────────────────────────────────────

interface CropOverlayProps {
  imageUrl: string;
  initialCrop: CropRect | null;
  onApply: (rect: CropRect) => void;
  onCancel: () => void;
}

function CropOverlay({
  imageUrl,
  initialCrop,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [displaySize, setDisplaySize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const dragging = useRef<{
    handle: DragHandle["corner"];
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  const initCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const dw = img.clientWidth;
    const dh = img.clientHeight;
    setNaturalSize({ w: nw, h: nh });
    setDisplaySize({ w: dw, h: dh });
    if (initialCrop) {
      setCrop(initialCrop);
    } else {
      setCrop({ x: 0, y: 0, w: nw, h: nh });
    }
  }, [initialCrop]);

  const toDisplay = (v: number, axis: "x" | "y") => {
    if (!naturalSize || !displaySize) return v;
    return axis === "x"
      ? (v / naturalSize.w) * displaySize.w
      : (v / naturalSize.h) * displaySize.h;
  };

  const toNatural = (v: number, axis: "x" | "y") => {
    if (!naturalSize || !displaySize) return v;
    return axis === "x"
      ? (v / displaySize.w) * naturalSize.w
      : (v / displaySize.h) * naturalSize.h;
  };

  const onMouseDown = (e: React.MouseEvent, corner: DragHandle["corner"]) => {
    e.preventDefault();
    if (!crop) return;
    dragging.current = {
      handle: corner,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent, corner: DragHandle["corner"]) => {
    e.preventDefault();
    if (!crop) return;
    const t = e.touches[0];
    dragging.current = {
      handle: corner,
      startX: t.clientX,
      startY: t.clientY,
      startCrop: { ...crop },
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  const applyDrag = (clientX: number, clientY: number) => {
    if (!dragging.current || !naturalSize || !displaySize || !crop) return;
    const { handle, startX, startY, startCrop } = dragging.current;
    const dx = toNatural(clientX - startX, "x");
    const dy = toNatural(clientY - startY, "y");
    let { x, y, w, h } = startCrop;
    const minSize = 20;

    if (handle === "tl") {
      const nx = Math.min(x + w - minSize, x + dx);
      const ny = Math.min(y + h - minSize, y + dy);
      w = w - (nx - x);
      h = h - (ny - y);
      x = nx;
      y = ny;
    } else if (handle === "tr") {
      const nw = Math.max(minSize, w + dx);
      const ny = Math.min(y + h - minSize, y + dy);
      h = h - (ny - y);
      y = ny;
      w = nw;
    } else if (handle === "bl") {
      const nx = Math.min(x + w - minSize, x + dx);
      w = w - (nx - x);
      x = nx;
      h = Math.max(minSize, h + dy);
    } else {
      w = Math.max(minSize, w + dx);
      h = Math.max(minSize, h + dy);
    }

    x = Math.max(0, Math.min(naturalSize.w - minSize, x));
    y = Math.max(0, Math.min(naturalSize.h - minSize, y));
    w = Math.min(naturalSize.w - x, w);
    h = Math.min(naturalSize.h - y, h);

    setCrop({ x, y, w, h });
  };

  const onMouseMove = (e: MouseEvent) => applyDrag(e.clientX, e.clientY);
  const onMouseUp = () => {
    dragging.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    applyDrag(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = () => {
    dragging.current = null;
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  };

  const handles: DragHandle["corner"][] = ["tl", "tr", "bl", "br"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex flex-col items-center gap-4 p-4 max-w-2xl w-full">
        <p className="text-white text-sm">Drag corners to adjust crop</p>
        <div ref={containerRef} className="relative inline-block">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="crop"
            className="max-w-full max-h-[70vh] object-contain"
            onLoad={initCrop}
            draggable={false}
          />
          {crop && displaySize && naturalSize && (
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none" }}
              aria-hidden="true"
            >
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={toDisplay(crop.x, "x")}
                    y={toDisplay(crop.y, "y")}
                    width={toDisplay(crop.w, "x")}
                    height={toDisplay(crop.h, "y")}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.5)"
                mask="url(#crop-mask)"
              />
              <rect
                x={toDisplay(crop.x, "x")}
                y={toDisplay(crop.y, "y")}
                width={toDisplay(crop.w, "x")}
                height={toDisplay(crop.h, "y")}
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          )}
          {crop &&
            displaySize &&
            naturalSize &&
            handles.map((corner) => {
              const cx = corner.includes("r")
                ? toDisplay(crop.x + crop.w, "x")
                : toDisplay(crop.x, "x");
              const cy = corner.includes("b")
                ? toDisplay(crop.y + crop.h, "y")
                : toDisplay(crop.y, "y");
              return (
                <div
                  key={corner}
                  className="absolute w-5 h-5 bg-white border-2 border-primary rounded-sm cursor-pointer z-10"
                  style={{ left: cx - 10, top: cy - 10, touchAction: "none" }}
                  onMouseDown={(e) => onMouseDown(e, corner)}
                  onTouchStart={(e) => onTouchStart(e, corner)}
                />
              );
            })}
        </div>
        <div className="flex gap-3">
          <Button onClick={() => crop && onApply(crop)} size="sm">
            Apply Crop
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PDFScanner() {
  // File input for "Choose from Files" — no capture attribute, supports multiple files + PDFs
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Separate camera input — capture="environment" triggers native camera on mobile
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Camera input for "Add More via Camera" in the thumbnail panel
  const addMoreCameraInputRef = useRef<HTMLInputElement>(null);

  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("scanned-document");

  const selectedPage =
    scannedPages.find((p) => p.id === selectedPageId) ?? null;

  // ── File / image processing ────────────────────────────────────────────────

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const crop = detectEdges(img);
        const id = `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setScannedPages((prev) => [
          ...prev,
          {
            id,
            dataUrl,
            brightness: 100,
            contrast: 100,
            darkenText: false,
            cropRect: crop,
          },
        ]);
        setSelectedPageId(id);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      for (const file of files) processImageFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [processImageFile],
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      // Camera captures one image at a time; process it
      for (const file of files) processImageFile(file);
      // Reset so the same shot can be retaken
      e.target.value = "";
    },
    [processImageFile],
  );

  // ── Page adjustments ───────────────────────────────────────────────────────

  const updatePage = (id: string, patch: Partial<ScannedPage>) => {
    setScannedPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  const removePage = (id: string) => {
    setScannedPages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedPageId === id) setSelectedPageId(next[0]?.id ?? null);
      return next;
    });
  };

  // ── Crop ───────────────────────────────────────────────────────────────────

  const applyCrop = (rect: CropRect) => {
    if (!cropTarget) return;
    updatePage(cropTarget, { cropRect: rect });
    setCropTarget(null);
  };

  // ── Convert to PDF ─────────────────────────────────────────────────────────

  const convertToPDF = useCallback(async () => {
    if (!scannedPages.length) return;
    setIsConverting(true);
    setPdfBlob(null);

    try {
      const pdfLibUrl =
        "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
      if (!(window as any).PDFLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = pdfLibUrl;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load pdf-lib"));
          document.head.appendChild(s);
        });
      }

      const { PDFDocument } = (window as any).PDFLib;
      const pdfDoc = await PDFDocument.create();

      for (const page of scannedPages) {
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = page.dataUrl;
        });
        const adjusted = applyAdjustments(
          img,
          page.brightness,
          page.contrast,
          page.darkenText,
          page.cropRect,
        );

        const base64 = adjusted.split(",")[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const embeddedImg = await pdfDoc.embedJpg(bytes);

        const { width, height } = embeddedImg.scale(1);
        const pdfPage = pdfDoc.addPage([width, height]);
        pdfPage.drawImage(embeddedImg, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.slice(0).buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      setPdfBlob(blob);
    } catch (err) {
      console.error("PDF conversion error:", err);
    } finally {
      setIsConverting(false);
    }
  }, [scannedPages]);

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "scanned-document"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Crop overlay */}
      {cropTarget &&
        (() => {
          const page = scannedPages.find((p) => p.id === cropTarget);
          if (!page) return null;
          return (
            <CropOverlay
              imageUrl={page.dataUrl}
              initialCrop={page.cropRect}
              onApply={applyCrop}
              onCancel={() => setCropTarget(null)}
            />
          );
        })()}

      {/* Upload area */}
      <div className="glass-card p-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-primary">
          <ScanLine className="w-6 h-6" />
          <h2 className="text-lg font-semibold">PDF Scanner</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Use your device camera to scan documents one by one, or import images
          from files.
        </p>

        {/* Hidden file input — no capture, supports multiple files + PDFs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden camera input — capture="environment" opens native camera on mobile */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        {/* Two-button layout: Camera (primary) + Choose from Files (secondary) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          {/* Camera button — primary action, teal/cyan accent */}
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0"
            size="lg"
          >
            <Camera className="w-5 h-5" />
            Scan with Camera
          </Button>

          {/* Choose from Files button — secondary action */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center justify-center gap-2 flex-1"
            size="lg"
          >
            <Upload className="w-4 h-4" />
            Choose from Files
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tap <strong>Scan with Camera</strong> to capture documents one by one.
          Each photo is added as a new page.
        </p>
      </div>

      {/* Pages list + adjustment panel */}
      {scannedPages.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Thumbnails */}
          <div className="glass-card p-4 flex flex-col gap-3 lg:w-48 shrink-0">
            <p className="text-sm font-medium text-muted-foreground">
              Pages ({scannedPages.length})
            </p>
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
              {scannedPages.map((page, idx) => (
                <div
                  key={page.id}
                  className={`relative shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedPageId === page.id
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  style={{ width: 80, height: 100 }}
                  onClick={() => setSelectedPageId(page.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedPageId(page.id);
                  }}
                  role="tab"
                  tabIndex={0}
                  aria-selected={selectedPageId === page.id}
                >
                  <img
                    src={page.dataUrl}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1">
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePage(page.id);
                    }}
                    title="Remove page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add more — camera input for "Add More via Camera" */}
            <input
              ref={addMoreCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />

            {/* Add more buttons */}
            <div className="flex flex-col gap-1.5">
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white border-0 w-full"
                onClick={() => addMoreCameraInputRef.current?.click()}
              >
                <Camera className="w-3 h-3" />
                Scan Next Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-xs w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileImage className="w-3 h-3" />
                Add from Files
              </Button>
            </div>
          </div>

          {/* Adjustment panel */}
          {selectedPage && (
            <div className="glass-card p-4 flex flex-col gap-4 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Page{" "}
                  {scannedPages.findIndex((p) => p.id === selectedPage.id) + 1}{" "}
                  Adjustments
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setCropTarget(selectedPage.id)}
                >
                  Edit Crop
                </Button>
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                <img
                  src={selectedPage.dataUrl}
                  alt="Preview"
                  className="max-h-48 max-w-full object-contain rounded-lg border border-border"
                  style={{
                    filter: `brightness(${selectedPage.brightness}%) contrast(${selectedPage.contrast}%)`,
                  }}
                />
              </div>

              {/* Brightness */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Label className="text-xs text-muted-foreground w-20 shrink-0">
                    Brightness {selectedPage.brightness}%
                  </Label>
                  <Slider
                    min={50}
                    max={200}
                    step={1}
                    value={[selectedPage.brightness]}
                    onValueChange={([v]) =>
                      updatePage(selectedPage.id, { brightness: v })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Contrast className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Label className="text-xs text-muted-foreground w-20 shrink-0">
                    Contrast {selectedPage.contrast}%
                  </Label>
                  <Slider
                    min={50}
                    max={300}
                    step={1}
                    value={[selectedPage.contrast]}
                    onValueChange={([v]) =>
                      updatePage(selectedPage.id, { contrast: v })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Darken text */}
              <div className="flex items-center gap-3">
                <Type className="w-4 h-4 text-muted-foreground shrink-0" />
                <Label className="text-xs text-muted-foreground flex-1">
                  Darken Text (B&W)
                </Label>
                <Switch
                  checked={selectedPage.darkenText}
                  onCheckedChange={(v) =>
                    updatePage(selectedPage.id, { darkenText: v })
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Convert & Download */}
      {scannedPages.length > 0 && (
        <div className="glass-card p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label
                htmlFor="scanner-filename"
                className="text-xs text-muted-foreground font-medium"
              >
                Output filename
              </label>
              <input
                id="scanner-filename"
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="scanned-document"
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={convertToPDF}
                disabled={isConverting || scannedPages.length === 0}
                className="flex items-center gap-2"
              >
                {isConverting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Converting…
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    Convert to PDF
                  </>
                )}
              </Button>
              {pdfBlob && (
                <Button
                  onClick={downloadPDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>

          {pdfBlob && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              PDF ready — {(pdfBlob.size / 1024).toFixed(1)} KB ·{" "}
              {scannedPages.length} page{scannedPages.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
