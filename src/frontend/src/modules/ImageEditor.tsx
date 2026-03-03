import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { dataUrlToBlob, downloadAsZip } from "@/lib/jszip";
import {
  Archive,
  Crop,
  Download,
  Loader2,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AdjustmentPanel from "./ImageEditor/AdjustmentPanel";
import CropOverlay from "./ImageEditor/CropOverlay";
import CropTool from "./ImageEditor/CropTool";
import ExportDialog from "./ImageEditor/ExportDialog";
import FilterPresets from "./ImageEditor/FilterPresets";
import ImageUploadPanel from "./ImageEditor/ImageUploadPanel";
import ResizeTool from "./ImageEditor/ResizeTool";
import TextLayerOverlay from "./ImageEditor/TextLayerOverlay";
import TextOverlay from "./ImageEditor/TextOverlay";
import TransformTool from "./ImageEditor/TransformTool";
import { useImageCanvas } from "./ImageEditor/useImageCanvas";
import type { TextLayer } from "./ImageEditor/useImageCanvas";

export default function ImageEditor() {
  const {
    canvasRef,
    originalImage,
    imageState,
    textLayers,
    loadImage,
    updateState,
    renderCanvas,
    exportImage,
    addTextLayer,
    updateTextLayer,
    removeTextLayer,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useImageCanvas();

  const [showExport, setShowExport] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activePanel, setActivePanel] = useState<string>("adjust");
  const [isZipping, setIsZipping] = useState(false);

  // Crop overlay state
  const [isCropActive, setIsCropActive] = useState(false);

  // Text placement state
  const [isPlacingText, setIsPlacingText] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const pendingTextRef = useRef<Omit<TextLayer, "id"> | null>(null);

  // Track canvas display dimensions for overlay positioning
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  // biome-ignore lint/correctness/useExhaustiveDependencies: renderCanvas is a stable useCallback
  useEffect(() => {
    if (originalImage) {
      renderCanvas();
    }
  }, [originalImage, imageState, textLayers, renderCanvas]);

  // Measure canvas display size after render
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally triggers on image state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () =>
      setDisplaySize({
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
      });
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    update();
    return () => observer.disconnect();
  }, [canvasRef, originalImage, imageState]);

  const handleResize = (width: number, height: number) => {
    if (!originalImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, width, height);
      const newImg = new window.Image();
      newImg.onload = () => loadImage(newImg.src);
      newImg.src = tempCanvas.toDataURL();
    }
    toast.success(`Resized to ${width}×${height}px`);
  };

  const handleDownloadZip = async () => {
    const dataUrl = exportImage("jpeg", 92);
    if (!dataUrl) {
      toast.error("No image to export");
      return;
    }
    setIsZipping(true);
    try {
      const blob = dataUrlToBlob(dataUrl);
      await downloadAsZip(
        [{ filename: "edited-image.jpg", data: blob }],
        "edited-image.zip",
      );
      toast.success("Downloaded as ZIP!");
    } catch {
      toast.error("Failed to create ZIP");
    } finally {
      setIsZipping(false);
    }
  };

  const handleCropButtonClick = () => {
    const next = activePanel === "crop" ? "adjust" : "crop";
    setActivePanel(next);
    if (next !== "crop") setIsCropActive(false);
  };

  const handleStartInteractiveCrop = useCallback(() => {
    setIsCropActive(true);
  }, []);

  const handleApplyCrop = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = rect.w;
      tempCanvas.height = rect.h;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          rect.x,
          rect.y,
          rect.w,
          rect.h,
          0,
          0,
          rect.w,
          rect.h,
        );
        const newSrc = tempCanvas.toDataURL();
        loadImage(newSrc);
      }
      setIsCropActive(false);
      toast.success(`Cropped to ${rect.w}×${rect.h}px`);
    },
    [canvasRef, loadImage],
  );

  const handleCancelCrop = useCallback(() => {
    setIsCropActive(false);
  }, []);

  // Text placement: canvas click handler
  const handleCanvasAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacingText || !pendingTextRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      addTextLayer({ ...pendingTextRef.current, x, y });
      setIsPlacingText(false);
      pendingTextRef.current = null;
      toast.success("Text placed on canvas!");
    },
    [isPlacingText, canvasRef, addTextLayer],
  );

  const handleStartPlacing = useCallback((config: Omit<TextLayer, "id">) => {
    pendingTextRef.current = config;
    setIsPlacingText(true);
  }, []);

  const handleCancelPlacing = useCallback(() => {
    setIsPlacingText(false);
    pendingTextRef.current = null;
  }, []);

  const panels = [
    { id: "adjust", label: "Adjust" },
    { id: "transform", label: "Transform" },
    { id: "resize", label: "Resize" },
    { id: "crop", label: "Crop" },
    { id: "filters", label: "Filters" },
    { id: "text", label: "Text" },
  ];

  const canvasWidth = canvasRef.current?.width ?? 800;
  const canvasHeight = canvasRef.current?.height ?? 600;
  const showTextOverlay =
    activePanel === "text" &&
    textLayers.length > 0 &&
    !isPlacingText &&
    !isCropActive;

  return (
    <div className="animate-slide-up">
      {!originalImage ? (
        <div className="max-w-lg mx-auto py-8">
          <ImageUploadPanel onImageLoad={loadImage} />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Canvas Area */}
          <div className="flex-1 min-w-0">
            <div className="glass-card p-4 space-y-3">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-8 w-8"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-8 w-8"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="h-8 w-8"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                  className="h-8 w-8"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(zoom * 100)}%
                </span>
                <Separator orientation="vertical" className="h-6" />
                <button
                  type="button"
                  onClick={handleCropButtonClick}
                  className={`tool-btn${activePanel === "crop" ? " tool-btn-active" : ""}`}
                  title="Crop image"
                >
                  <Crop className="w-4 h-4" />
                  <span>Crop</span>
                </button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    loadImage("");
                  }}
                  className="text-destructive hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowExport(true)}
                  className="gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </div>

              {/* Canvas + Overlays container */}
              <div
                className="overflow-auto rounded-lg bg-[#111] flex items-center justify-center"
                style={{ minHeight: 300, maxHeight: 500 }}
              >
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center",
                    transition: "transform 0.2s",
                    position: "relative",
                    display: "inline-block",
                    lineHeight: 0,
                  }}
                >
                  {/* Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="max-w-full block"
                    style={{ imageRendering: "pixelated" }}
                  />

                  {/* Interactive Crop Overlay */}
                  {isCropActive &&
                    displaySize.width > 0 &&
                    displaySize.height > 0 && (
                      <CropOverlay
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        displayWidth={displaySize.width}
                        displayHeight={displaySize.height}
                        onApply={handleApplyCrop}
                        onCancel={handleCancelCrop}
                      />
                    )}

                  {/* Text placement click catcher */}
                  {isPlacingText && (
                    <div
                      className="absolute inset-0"
                      style={{ cursor: "crosshair", zIndex: 15 }}
                      onClick={handleCanvasAreaClick}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const syntheticEvent = {
                            clientX: 0,
                            clientY: 0,
                            currentTarget: e.currentTarget,
                          } as unknown as React.MouseEvent<HTMLDivElement>;
                          handleCanvasAreaClick(syntheticEvent);
                        }
                      }}
                      aria-label="Click to place text"
                    />
                  )}

                  {/* Text Layer Overlay (drag/rotate handles) */}
                  {showTextOverlay && (
                    <TextLayerOverlay
                      textLayers={textLayers}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      displayWidth={displaySize.width}
                      displayHeight={displaySize.height}
                      selectedLayerId={selectedLayerId}
                      onSelectLayer={setSelectedLayerId}
                      onUpdateLayer={updateTextLayer}
                    />
                  )}
                </div>
              </div>

              {/* Text placement hint bar */}
              {isPlacingText && (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-primary/10 border border-primary/30">
                  <span className="text-xs text-primary font-medium animate-pulse">
                    👆 Click on the image to place your text
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={handleCancelPlacing}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {originalImage && (
                <p className="text-xs text-muted-foreground text-center">
                  {originalImage.width} × {originalImage.height}px
                </p>
              )}

              {/* Download Buttons */}
              <div className="pt-1 flex gap-2">
                <Button
                  size="default"
                  className="flex-1 gap-2 font-semibold"
                  onClick={() => setShowExport(true)}
                >
                  <Download className="w-4 h-4" />
                  Download Edited Image
                </Button>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-2"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                >
                  {isZipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  {isZipping ? "Zipping..." : "Download as ZIP"}
                </Button>
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="glass-card overflow-hidden">
              {/* Panel Tabs */}
              <div className="flex overflow-x-auto scrollbar-thin border-b border-border/50">
                {panels.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setActivePanel(p.id);
                      if (p.id !== "crop") setIsCropActive(false);
                      if (p.id !== "text") {
                        setIsPlacingText(false);
                        pendingTextRef.current = null;
                      }
                    }}
                    className={`
                      flex-shrink-0 px-3 py-2.5 text-xs font-medium transition-colors
                      ${
                        activePanel === p.id
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <ScrollArea className="h-[400px]">
                <div className="p-4">
                  {activePanel === "adjust" && (
                    <AdjustmentPanel
                      imageState={imageState}
                      onUpdate={updateState}
                    />
                  )}
                  {activePanel === "transform" && (
                    <TransformTool
                      imageState={imageState}
                      onUpdate={updateState}
                    />
                  )}
                  {activePanel === "resize" && (
                    <ResizeTool
                      originalWidth={originalImage?.width ?? 0}
                      originalHeight={originalImage?.height ?? 0}
                      onResize={handleResize}
                    />
                  )}
                  {activePanel === "crop" && (
                    <CropTool
                      originalWidth={originalImage?.width ?? 0}
                      originalHeight={originalImage?.height ?? 0}
                      onUpdate={updateState}
                      onStartInteractiveCrop={handleStartInteractiveCrop}
                      isCropActive={isCropActive}
                    />
                  )}
                  {activePanel === "filters" && (
                    <FilterPresets
                      currentFilter={imageState.filter ?? null}
                      onUpdate={updateState}
                    />
                  )}
                  {activePanel === "text" && (
                    <TextOverlay
                      textLayers={textLayers}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      onAdd={addTextLayer}
                      onUpdate={updateTextLayer}
                      onRemove={removeTextLayer}
                      isPlacingText={isPlacingText}
                      onStartPlacing={handleStartPlacing}
                      onCancelPlacing={handleCancelPlacing}
                      selectedLayerId={selectedLayerId}
                      onSelectLayer={setSelectedLayerId}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Upload new image */}
            <div className="mt-4">
              <ImageUploadPanel onImageLoad={loadImage} />
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportDialog
          open={showExport}
          onClose={() => setShowExport(false)}
          onExport={exportImage}
        />
      )}
    </div>
  );
}
