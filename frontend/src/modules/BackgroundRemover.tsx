import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Upload, ImageIcon, RotateCcw, RotateCw, ZoomIn, ZoomOut, Crop, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackgroundRemover } from './BackgroundRemover/useBackgroundRemover';
import RemovalPanel from './BackgroundRemover/RemovalPanel';
import BrushToolPanel from './BackgroundRemover/BrushToolPanel';
import BeforeAfterPreview from './BackgroundRemover/BeforeAfterPreview';
import ExportPanel from './BackgroundRemover/ExportPanel';
import CropOverlay from './BackgroundRemover/CropOverlay';

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
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Stable canvas container size — locked once image is loaded, never changed during brush interactions
  const [canvasContainerSize, setCanvasContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (displaySize && displaySize.width > 0 && displaySize.height > 0) {
      setCanvasContainerSize({ width: displaySize.width, height: displaySize.height });
    }
  }, [displaySize]);

  // After originalDataUrl is set, the canvas element is now in the DOM.
  // Trigger drawImageToCanvas in a requestAnimationFrame to ensure the canvas
  // ref is fully attached after React commits the render.
  useEffect(() => {
    if (!originalDataUrl) return;

    // Use requestAnimationFrame to ensure the canvas DOM element is mounted
    // before we attempt to draw. This fixes the blank preview on first upload.
    const rafId = requestAnimationFrame(() => {
      drawImageToCanvas();
    });

    return () => cancelAnimationFrame(rafId);
  }, [originalDataUrl, drawImageToCanvas]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const getTouchCanvasPos = useCallback((touch: React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const paintAt = useCallback(
    (x: number, y: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;
      ctx.globalCompositeOperation = brushMode === 'paint' ? 'source-over' : 'destination-out';
      ctx.fillStyle = brushMode === 'paint' ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      if (lastPos.current) {
        ctx.beginPath();
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = brushMode === 'paint' ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,0,1)';
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      lastPos.current = { x, y };
      drawMaskToCanvas();
    },
    [brushMode, brushSize, drawMaskToCanvas]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!brushActive || cropMode) return;
      e.preventDefault();
      isDrawing.current = true;
      const pos = getCanvasPos(e);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, getCanvasPos, paintAt]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !brushActive || cropMode) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, getCanvasPos, paintAt]
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPos.current = null;
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!brushActive || cropMode) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawing.current = true;
      const touch = e.touches[0];
      const pos = getTouchCanvasPos(touch);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, getTouchCanvasPos, paintAt]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !brushActive || cropMode) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const pos = getTouchCanvasPos(touch);
      if (pos) paintAt(pos.x, pos.y);
    },
    [brushActive, cropMode, getTouchCanvasPos, paintAt]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawing.current = false;
      lastPos.current = null;
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  };

  const hasImage = !!originalDataUrl;

  // CropOverlay needs container/image dimensions in display-space
  const cropContainerW = canvasContainerSize?.width ?? 0;
  const cropContainerH = canvasContainerSize?.height ?? 0;
  const cropImageW = canvasRef.current?.width ?? cropContainerW;
  const cropImageH = canvasRef.current?.height ?? cropContainerH;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Upload area — shown when no image */}
      {!hasImage && (
        <div
          className={`upload-zone flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Drop an image here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {hasImage && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── LEFT SIDEBAR: controls ── */}
          <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">
            {/* Replace / remove image */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Image</span>
                <Button variant="ghost" size="sm" onClick={reset} className="text-destructive hover:text-destructive">
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Transform controls */}
            <div className="glass-card p-4 rounded-xl">
              <p className="text-sm font-semibold text-foreground mb-3">Transform</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="flex items-center text-xs text-muted-foreground px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(4, zoom + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRotation((rotation - 90 + 360) % 360)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRotation((rotation + 90) % 360)}>
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  variant={cropMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCropMode(!cropMode)}
                >
                  <Crop className="w-4 h-4 mr-1" />
                  {cropMode ? 'Cancel Crop' : 'Crop'}
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
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-sm font-semibold text-foreground">Before / After Comparison</p>
                </div>
                <BeforeAfterPreview
                  originalDataUrl={originalDataUrl}
                  resultDataUrl={resultDataUrl}
                />
              </div>
            )}

            {/* 2. BRUSH MODE PANEL — below comparison */}
            <div className="glass-card rounded-xl p-4">
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
            <div className="glass-card rounded-xl overflow-hidden p-2">
              <div
                ref={containerRef}
                className="relative flex items-center justify-center rounded-lg overflow-hidden"
                style={{
                  // Lock the container to the image's display size to prevent layout reflow
                  // during brush interactions. Width/height are set once on image load.
                  width: canvasContainerSize ? `${canvasContainerSize.width}px` : '100%',
                  height: canvasContainerSize ? `${canvasContainerSize.height}px` : '400px',
                  maxWidth: '100%',
                  minHeight: '200px',
                  background: 'repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 16px 16px',
                  margin: '0 auto',
                  // Critical: prevent flex/grid from resizing this container
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                }}
              >
                {/* Main image canvas */}
                <canvas
                  ref={canvasRef}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    cursor: brushActive && !cropMode ? 'crosshair' : 'default',
                    // Prevent touch scrolling on the canvas element itself
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />

                {/* Mask overlay canvas — positioned absolutely over the image canvas */}
                <canvas
                  ref={maskCanvasRef}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    touchAction: 'none',
                  }}
                />

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
