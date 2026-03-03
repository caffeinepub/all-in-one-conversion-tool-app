import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  CameraOff,
  Contrast,
  Download,
  FileImage,
  FlipHorizontal,
  ScanLine,
  Search,
  Settings,
  Sun,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

// ── Sub-component: LiveCameraWindow ──────────────────────────────────────────

interface LiveCameraWindowProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  captureCount: number;
}

function LiveCameraWindow({
  onCapture,
  onClose,
  captureCount,
}: LiveCameraWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [flashEffect, setFlashEffect] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setIsStarting(true);
      setCameraError(null);

      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err.name === "NotAllowedError") {
            setCameraError(
              "Camera access denied. To use the scanner, please allow camera access:\n• On mobile: go to Settings → Browser → Camera and set to Allow\n• On desktop: click the camera icon in your browser's address bar and allow access, then refresh.",
            );
          } else if (err.name === "NotFoundError") {
            setCameraError("No camera found on this device.");
          } else if (err.name === "OverconstrainedError") {
            // Fallback: try without ideal facingMode constraint
            try {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
              if (!cancelled) {
                streamRef.current = fallbackStream;
                if (videoRef.current) {
                  videoRef.current.srcObject = fallbackStream;
                  await videoRef.current.play();
                }
              } else {
                for (const track of fallbackStream.getTracks()) track.stop();
              }
            } catch (fallbackErr: any) {
              setCameraError(
                `Could not start camera: ${fallbackErr.message || fallbackErr.name}`,
              );
            }
          } else {
            setCameraError(
              `Could not start camera: ${err.message || err.name}`,
            );
          }
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Flash effect
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    onCapture(dataUrl);
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="flex flex-col w-full max-w-2xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-teal-400" />
            <span className="font-semibold text-sm">Document Scanner</span>
            {captureCount > 0 && (
              <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">
                {captureCount} page{captureCount !== 1 ? "s" : ""} captured
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Flip camera toggle */}
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) =>
                  prev === "user" ? "environment" : "user",
                )
              }
              data-ocid="camera_window.flip_button"
              className="flex items-center gap-1.5 text-zinc-300 hover:text-teal-400 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700 text-xs"
              title={`Switch to ${facingMode === "user" ? "rear" : "front"} camera`}
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">
                {facingMode === "user" ? "Rear Cam" : "Front Cam"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              data-ocid="camera_window.close_button"
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-700"
              title="Close camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera view */}
        <div className="relative bg-black" style={{ minHeight: 320 }}>
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <div className="w-8 h-8 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
              <span className="text-sm text-zinc-400">Starting camera...</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center overflow-auto">
              <CameraOff className="w-12 h-12 text-zinc-500 shrink-0" />
              <div className="max-w-sm">
                <p className="text-white font-semibold text-sm mb-2">
                  Please allow camera access
                </p>
                <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">
                  {cameraError}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) =>
                    prev === "user" ? "environment" : "user",
                  )
                }
                className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 text-xs border border-teal-600/40 px-3 py-1.5 rounded-lg hover:bg-teal-600/10 transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                Try other camera
              </button>
            </div>
          )}

          {/* Flash overlay */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-10 pointer-events-none opacity-80 animate-fade-out" />
          )}

          <video
            ref={videoRef}
            className={`w-full object-contain ${isStarting || cameraError ? "invisible" : "visible"}`}
            autoPlay
            playsInline
            muted
            style={{ maxHeight: "60vh" }}
          />

          {/* Document guide overlay */}
          {!isStarting && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 border-teal-400/60 rounded-lg"
                style={{
                  width: "80%",
                  height: "85%",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
                }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="text-white/70 text-xs bg-black/50 px-2 py-1 rounded">
                  {facingMode === "user"
                    ? "Front camera active — align document"
                    : "Align document within frame"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 bg-zinc-800">
          <p className="text-xs text-zinc-400 text-center sm:text-left">
            Position the document within the frame, then tap{" "}
            <strong className="text-white">Scan & Capture</strong>
          </p>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleCapture}
              disabled={!!isStarting || !!cameraError}
              data-ocid="camera_window.capture_button"
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0 px-6"
              size="lg"
            >
              <Camera className="w-5 h-5" />
              Scan &amp; Capture
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              data-ocid="camera_window.done_button"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PDFScanner() {
  // File input for "Choose from Files"
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Camera input fallback for devices that don't support getUserMedia
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Add more camera input
  const addMoreCameraInputRef = useRef<HTMLInputElement>(null);

  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("scanned-document");
  const [showCameraWindow, setShowCameraWindow] = useState(false); // user must click to open

  const selectedPage =
    scannedPages.find((p) => p.id === selectedPageId) ?? null;

  // ── File / image processing ────────────────────────────────────────────────

  const processImageDataUrl = useCallback((dataUrl: string) => {
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
  }, []);

  const processImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        processImageDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [processImageDataUrl],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      for (const file of files) processImageFile(file);
      e.target.value = "";
    },
    [processImageFile],
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      for (const file of files) processImageFile(file);
      e.target.value = "";
    },
    [processImageFile],
  );

  // Called by LiveCameraWindow when user clicks "Scan & Capture"
  const handleLiveCapture = useCallback(
    (dataUrl: string) => {
      processImageDataUrl(dataUrl);
    },
    [processImageDataUrl],
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

      {/* Live camera window */}
      {showCameraWindow && (
        <LiveCameraWindow
          onCapture={handleLiveCapture}
          onClose={() => setShowCameraWindow(false)}
          captureCount={scannedPages.length}
        />
      )}

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

        {/* Camera permission info card */}
        <div className="w-full max-w-sm rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-teal-500/15 shrink-0 mt-0.5">
              <Camera className="w-4 h-4 text-teal-500" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                Camera Access Required
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The scanner uses your device camera to capture document images.
                When prompted, tap <strong>Allow</strong> to grant access. Front
                camera is used by default — you can switch to rear camera inside
                the scanner.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pl-9">
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>
              If access was previously denied, go to your browser settings to
              re-enable camera permission.
            </span>
          </div>
        </div>

        {/* Hidden file input — gallery only, no capture attribute */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden camera fallback input — for devices without getUserMedia support */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            onClick={() => setShowCameraWindow(true)}
            data-ocid="pdf_scanner.open_camera_button"
            className="flex items-center justify-center gap-2 flex-1 bg-teal-600 hover:bg-teal-700 text-white border-0"
            size="lg"
          >
            <Camera className="w-5 h-5" />
            Open Camera Scanner
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            data-ocid="pdf_scanner.upload_button"
            className="flex items-center justify-center gap-2 flex-1"
            size="lg"
          >
            <Upload className="w-4 h-4" />
            Choose from Files
          </Button>
        </div>

        {/* Google Lens button */}
        <div className="w-full max-w-sm">
          <button
            type="button"
            data-ocid="pdf_scanner.google_lens_button"
            onClick={() => {
              const isAndroid = /Android/i.test(navigator.userAgent);
              const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

              if (isAndroid) {
                // Try to open Google Lens app via Android intent
                const intentUrl =
                  "intent://lens.google.com/search?ep=gsbubb&re=df&p=1#Intent;scheme=https;package=com.google.ar.lens;action=android.intent.action.VIEW;end;";
                const fallbackTimer = setTimeout(() => {
                  // Fallback: open in a popup window
                  window.open(
                    "https://lens.google.com",
                    "GoogleLens",
                    "width=500,height=700,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes",
                  );
                }, 2000);
                window.location.href = intentUrl;
                window.addEventListener(
                  "blur",
                  () => clearTimeout(fallbackTimer),
                  { once: true },
                );
              } else if (isIOS) {
                // Try iOS Google Lens app
                const iosUrl = "googlelens://";
                const fallbackTimer = setTimeout(() => {
                  window.open(
                    "https://lens.google.com",
                    "GoogleLens",
                    "width=500,height=700,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes",
                  );
                }, 2000);
                window.location.href = iosUrl;
                window.addEventListener(
                  "blur",
                  () => clearTimeout(fallbackTimer),
                  { once: true },
                );
              } else {
                // Desktop: open as popup window
                window.open(
                  "https://lens.google.com",
                  "GoogleLens",
                  "width=600,height=800,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes",
                );
              }
            }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-blue-500/40 bg-blue-500/8 hover:bg-blue-500/15 transition-colors px-4 py-3 text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            {/* Google Lens coloured icon */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                fill="#4285F4"
              />
              <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" fill="white" />
              <circle cx="12" cy="12" r="2.5" fill="#4285F4" />
              <line
                x1="12"
                y1="7"
                x2="12"
                y2="2"
                stroke="#EA4335"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="17"
                y1="12"
                x2="22"
                y2="12"
                stroke="#FBBC04"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="17"
                x2="12"
                y2="22"
                stroke="#34A853"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="7"
                y1="12"
                x2="2"
                y2="12"
                stroke="#EA4335"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Scan with Google Lens
          </button>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            On mobile: tries to open the Google Lens app directly. If not
            installed, opens Google Lens in a popup window with camera and
            gallery access. On desktop: opens Google Lens in a popup window —
            you can use your camera or upload a photo.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tap <strong>Open Camera Scanner</strong> to scan documents one by one.
          Each capture is added as a new page.
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
                  data-ocid={`pdf_scanner.page.item.${idx + 1}`}
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

            {/* Add more camera fallback input — capture attribute intentionally kept for camera-only fallback */}
            <input
              ref={addMoreCameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleCameraCapture}
            />

            {/* Add more buttons */}
            <div className="flex flex-col gap-1.5">
              <Button
                variant="default"
                size="sm"
                data-ocid="pdf_scanner.scan_next_button"
                className="flex items-center gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white border-0 w-full"
                onClick={() => setShowCameraWindow(true)}
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
                data-ocid="pdf_scanner.filename_input"
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={convertToPDF}
                disabled={isConverting || scannedPages.length === 0}
                data-ocid="pdf_scanner.convert_button"
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
                  data-ocid="pdf_scanner.download_button"
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
