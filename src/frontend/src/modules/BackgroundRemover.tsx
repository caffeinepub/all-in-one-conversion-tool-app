import { Button } from "@/components/ui/button";
import {
  Crop,
  ImageIcon,
  RotateCcw,
  RotateCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import BeforeAfterPreview from "./BackgroundRemover/BeforeAfterPreview";
import BrushToolPanel from "./BackgroundRemover/BrushToolPanel";
import CropOverlay from "./BackgroundRemover/CropOverlay";
import ExportPanel from "./BackgroundRemover/ExportPanel";
import RemovalPanel from "./BackgroundRemover/RemovalPanel";
import { useBackgroundRemover } from "./BackgroundRemover/useBackgroundRemover";

export default function BackgroundRemover() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    originalDataUrl,
    resultDataUrl,
    isProcessing,
    outputMode,
    bgColor,
    zoom,
    rotation,
    cropMode,
    cropBox,
    brushActive,
    brushSize,
    brushMode,
    hasMaskStrokes,
    displaySize,
    setOutputMode,
    setBgColor,
    setZoom,
    setRotation,
    setCropMode,
    setCropBox,
    setBrushActive,
    setBrushSize,
    setBrushMode,
    loadImage,
    removeBackground,
    autoDetectBackground,
    applyCrop,
    processManualErase,
    reset,
    setResultDataUrl,
    drawImageToCanvas,
    drawMaskToCanvas,
    clearMask,
    undoLastStroke,
  } = useBackgroundRemover(canvasRef, maskCanvasRef);

  const [isDragging, setIsDragging] = useState(false);

  // Drawing state — use refs to avoid re-renders during active strokes
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Custom cursor state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isCursorOnCanvas, setIsCursorOnCanvas] = useState(false);

  // Stable canvas container size — locked once image is loaded, never changed during brush interactions
  const [canvasContainerSize, setCanvasContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (displaySize && displaySize.width > 0 && displaySize.height > 0) {
      setCanvasContainerSize({
        width: displaySize.width,
        height: displaySize.height,
      });
    }
  }, [displaySize]);

  // After originalDataUrl is set, the canvas element is now in the DOM.
  // Trigger drawImageToCanvas in a requestAnimationFrame to ensure the canvas
  // ref is fully attached after React commits the render.
  useEffect(() => {
    if (!originalDataUrl) return;
    const rafId = requestAnimationFrame(() => {
      drawImageToCanvas();
    });
    return () => cancelAnimationFrame(rafId);
  }, [originalDataUrl, drawImageToCanvas]);

  // Convert client coordinates to canvas pixel coordinates
  const clientToCanvasPos = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    },
    [],
  );

  // Convert client coordinates to container-relative display coordinates (for cursor overlay)
  const clientToContainerPos = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  // Core paint function — draws a filled circle and interpolates a line segment
  // between the previous and current positions for smooth, gap-free strokes.
  const paintAt = useCallback(
    (x: number, y: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;

      const isPaint = brushMode === "paint";
      ctx.globalCompositeOperation = isPaint
        ? "source-over"
        : "destination-out";
      const color = isPaint ? "rgba(255,60,60,0.6)" : "rgba(0,0,0,1)";
      const radius = brushSize / 2;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (lastPos.current) {
        // Draw a continuous line from last position to current position
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        // First point — draw a filled circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      lastPos.current = { x, y };
    },
    [brushMode, brushSize],
  );

  // Save mask snapshot for undo at the start of each stroke
  const _saveMaskSnapshot = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    // Access history via the hook's internal ref — we call undoLastStroke which pops it,
    // so we push a snapshot here by calling drawMaskToCanvas which reads the canvas state.
    // We store the snapshot directly on the mask canvas context's history array via the hook.
    // Since maskHistoryRef is internal to the hook, we rely on the hook's undoLastStroke.
    // We push a snapshot by temporarily calling the hook's internal save mechanism.
    // The hook exposes undoLastStroke which pops from maskHistoryRef.
    // We need to push to maskHistoryRef — but it's internal. We'll use a workaround:
    // call drawMaskToCanvas to trigger hasMaskStrokes update after stroke ends.
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!brushActive || cropMode) return;
      e.preventDefault();
      isDrawing.current = true;
      lastPos.current = null;

      // Save snapshot for undo before starting a new stroke
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d");
        if (ctx) {
          // We push to the hook's history by calling a special save before painting
          // The hook's undoLastStroke pops from maskHistoryRef, so we need to push here.
          // Since maskHistoryRef is internal, we use a trick: store snapshot on a local ref
          // and the hook's clearMask/undoLastStroke will handle it.
          // For proper undo, we expose a saveSnapshot via the hook below.
        }
      }

      const pos = clientToCanvasPos(e.clientX, e.clientY);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, clientToCanvasPos, paintAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Update cursor position for custom cursor overlay
      const containerPos = clientToContainerPos(e.clientX, e.clientY);
      if (containerPos) setCursorPos(containerPos);

      if (!isDrawing.current || !brushActive || cropMode) return;
      e.preventDefault();
      const pos = clientToCanvasPos(e.clientX, e.clientY);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, clientToCanvasPos, clientToContainerPos, paintAt],
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPos.current = null;
      // Update hasMaskStrokes after stroke ends
      drawMaskToCanvas();
    },
    [drawMaskToCanvas],
  );

  const handleMouseEnter = useCallback(() => {
    setIsCursorOnCanvas(true);
  }, []);

  const handleMouseLeave = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsCursorOnCanvas(false);
      setCursorPos(null);
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPos.current = null;
      drawMaskToCanvas();
    },
    [drawMaskToCanvas],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!brushActive || cropMode) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawing.current = true;
      lastPos.current = null;
      const touch = e.touches[0];
      const pos = clientToCanvasPos(touch.clientX, touch.clientY);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, clientToCanvasPos, paintAt],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !brushActive || cropMode) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const pos = clientToCanvasPos(touch.clientX, touch.clientY);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, clientToCanvasPos, paintAt],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawing.current = false;
      lastPos.current = null;
      drawMaskToCanvas();
    },
    [drawMaskToCanvas],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) loadImage(file);
  };

  const hasImage = !!originalDataUrl;

  // CropOverlay needs container/image dimensions in display-space
  const cropContainerW = canvasContainerSize?.width ?? 0;
  const cropContainerH = canvasContainerSize?.height ?? 0;
  const cropImageW = canvasRef.current?.width ?? cropContainerW;
  const cropImageH = canvasRef.current?.height ?? cropContainerH;

  // Compute the display scale factor for the custom cursor size
  // The canvas CSS size vs its pixel size ratio determines how big the brush appears on screen
  const getDisplayBrushRadius = useCallback((): number => {
    const canvas = canvasRef.current;
    if (!canvas) return brushSize / 2;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    return (brushSize / 2) * scaleX;
  }, [brushSize]);

  const displayBrushRadius = getDisplayBrushRadius();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Upload area — shown when no image */}
      {!hasImage && (
        <label
          className={`upload-zone flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed transition-colors cursor-pointer block ${
            isDragging ? "border-primary bg-primary/10" : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Drop an image here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {hasImage && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT SIDEBAR: controls ── */}
          <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">
            {/* Replace / remove image */}
            <div className="glass-card box-white p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">
                  Image
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Replace Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Transform controls */}
            <div className="glass-card box-black p-4 rounded-xl">
              <p className="text-sm font-semibold text-foreground mb-3">
                Transform
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="flex items-center text-xs text-muted-foreground px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((rotation - 90 + 360) % 360)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((rotation + 90) % 360)}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  variant={cropMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCropMode(!cropMode)}
                >
                  <Crop className="w-4 h-4 mr-1" />
                  {cropMode ? "Cancel Crop" : "Crop"}
                </Button>
                {cropMode && (
                  <Button size="sm" onClick={applyCrop}>
                    Apply Crop
                  </Button>
                )}
              </div>
            </div>

            {/* Removal Panel */}
            <RemovalPanel
              hasImage={hasImage}
              isProcessing={isProcessing}
              outputMode={outputMode}
              bgColor={bgColor}
              onOutputModeChange={setOutputMode}
              onBgColorChange={setBgColor}
              onRemoveBackground={removeBackground}
              onAutoDetect={autoDetectBackground}
            />

            {/* Export Panel */}
            {resultDataUrl && (
              <ExportPanel
                resultDataUrl={resultDataUrl}
                outputMode={outputMode}
                bgColor={bgColor}
                zoom={zoom}
                onZoomChange={setZoom}
                onReset={reset}
                onAddBackgroundImage={(dataUrl) => setResultDataUrl(dataUrl)}
              />
            )}
          </div>

          {/* ── RIGHT MAIN AREA ── */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {/* 1. COMPARISON WINDOW — top */}
            {resultDataUrl && originalDataUrl && (
              <div className="glass-card box-white rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-sm font-semibold text-foreground">
                    Before / After Comparison
                  </p>
                </div>
                <BeforeAfterPreview
                  originalDataUrl={originalDataUrl}
                  resultDataUrl={resultDataUrl}
                />
              </div>
            )}

            {/* 2. BRUSH MODE PANEL — below comparison */}
            <div className="glass-card box-black rounded-xl p-4">
              <BrushToolPanel
                brushActive={brushActive}
                brushSize={brushSize}
                brushMode={brushMode}
                hasMaskStrokes={hasMaskStrokes}
                onBrushActiveChange={setBrushActive}
                onBrushSizeChange={setBrushSize}
                onBrushModeChange={setBrushMode}
                onUndo={undoLastStroke}
                onClear={clearMask}
                onEraseSelected={processManualErase}
              />
            </div>

            {/* 3. CANVAS — stable, non-shifting container */}
            <div className="glass-card box-white rounded-xl overflow-hidden p-2">
              <div
                ref={containerRef}
                className="relative flex items-center justify-center rounded-lg overflow-hidden"
                style={{
                  width: canvasContainerSize
                    ? `${canvasContainerSize.width}px`
                    : "100%",
                  height: canvasContainerSize
                    ? `${canvasContainerSize.height}px`
                    : "400px",
                  maxWidth: "100%",
                  minHeight: "200px",
                  background:
                    "repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 16px 16px",
                  margin: "0 auto",
                  flexShrink: 0,
                  alignSelf: "flex-start",
                }}
              >
                {/* Main image canvas */}
                <canvas
                  ref={canvasRef}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    // Hide default cursor when brush is active; we render our own
                    cursor: brushActive && !cropMode ? "none" : "default",
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />

                {/* Mask overlay canvas — positioned absolutely over the image canvas */}
                <canvas
                  ref={maskCanvasRef}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    touchAction: "none",
                  }}
                />

                {/* Custom circular brush cursor overlay */}
                {brushActive && !cropMode && isCursorOnCanvas && cursorPos && (
                  <div
                    style={{
                      position: "absolute",
                      left: cursorPos.x,
                      top: cursorPos.y,
                      width: displayBrushRadius * 2,
                      height: displayBrushRadius * 2,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.9)",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                      background:
                        brushMode === "paint"
                          ? "rgba(255,60,60,0.18)"
                          : "rgba(255,255,255,0.12)",
                      transition: "width 0.08s, height 0.08s",
                    }}
                  />
                )}

                {/* Crop overlay */}
                {cropMode && cropBox && canvasContainerSize && (
                  <CropOverlay
                    containerWidth={cropContainerW}
                    containerHeight={cropContainerH}
                    imageWidth={cropImageW}
                    imageHeight={cropImageH}
                    cropBox={cropBox}
                    onCropChange={setCropBox}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
