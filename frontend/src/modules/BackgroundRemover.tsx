import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, RotateCw, RotateCcw, ZoomIn, ZoomOut, Crop, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBackgroundRemover } from './BackgroundRemover/useBackgroundRemover';
import BrushToolPanel from './BackgroundRemover/BrushToolPanel';
import RemovalPanel from './BackgroundRemover/RemovalPanel';
import BeforeAfterPreview from './BackgroundRemover/BeforeAfterPreview';
import ExportPanel from './BackgroundRemover/ExportPanel';
import CropOverlay from './BackgroundRemover/CropOverlay';

export default function BackgroundRemover() {
  const {
    state,
    imageCanvasRef,
    maskCanvasRef,
    loadImage,
    updateBrushState,
    updateOutputMode,
    updateBgColor,
    updateZoom,
    updateRotation,
    updateCropBox,
    saveMaskSnapshot,
    undoLastStroke,
    removeBackground,
    autoDetectBackground,
    processManualErase,
    applyCrop,
    reset,
    setResultDataUrl,
  } = useBackgroundRemover();

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [showCrop, setShowCrop] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  // Draw image on canvas when image/rotation changes
  const drawImageOnCanvas = useCallback((img: HTMLImageElement, rotation: number = 0) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newW = Math.round(img.width * cos + img.height * sin);
    const newH = Math.round(img.width * sin + img.height * cos);

    canvas.width = newW;
    canvas.height = newH;

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = newW;
      maskCanvas.height = newH;
      const mCtx = maskCanvas.getContext('2d')!;
      mCtx.clearRect(0, 0, newW, newH);
    }

    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const container = containerRef.current;
    if (container) {
      const maxW = container.clientWidth;
      const maxH = 400;
      const scale = Math.min(maxW / newW, maxH / newH, 1);
      setDisplaySize({ w: Math.round(newW * scale), h: Math.round(newH * scale) });
    }
  }, [imageCanvasRef, maskCanvasRef]);

  useEffect(() => {
    if (state.imageDataUrl) {
      const img = new window.Image();
      img.onload = () => drawImageOnCanvas(img, state.rotation);
      img.src = state.imageDataUrl;
    }
  }, [state.imageDataUrl, state.rotation, drawImageOnCanvas]);

  const handleFileUpload = useCallback((file: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        loadImage(img, dataUrl);
        setShowCrop(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  }, [handleFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // Canvas coordinate helper
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [maskCanvasRef]);

  // Draw brush stroke on mask canvas
  const drawBrush = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (state.brushState.mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
    }
    ctx.lineWidth = state.brushState.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (prevX !== undefined && prevY !== undefined) {
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
    }
    ctx.stroke();
    ctx.restore();
  }, [maskCanvasRef, state.brushState.mode, state.brushState.size]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.brushState.active || showCrop) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    drawBrush(pos.x, pos.y);
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !state.brushState.active || showCrop) return;
    const pos = getCanvasPos(e);
    const last = lastPosRef.current;
    drawBrush(pos.x, pos.y, last?.x, last?.y);
    lastPosRef.current = pos;
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      saveMaskSnapshot();
    }
  }, [saveMaskSnapshot]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      saveMaskSnapshot();
    }
  }, [saveMaskSnapshot]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!state.brushState.active || showCrop) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    drawBrush(pos.x, pos.y);
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !state.brushState.active || showCrop) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const last = lastPosRef.current;
    drawBrush(pos.x, pos.y, last?.x, last?.y);
    lastPosRef.current = pos;
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleRemoveBackground = useCallback(() => {
    removeBackground();
    toast.success('Background removed!');
  }, [removeBackground]);

  const handleAutoDetect = useCallback(() => {
    autoDetectBackground();
    toast.success('Background auto-detected! Review and click Remove Background.');
  }, [autoDetectBackground]);

  const handleManualErase = useCallback(() => {
    processManualErase();
    toast.success('Selected area erased!');
  }, [processManualErase]);

  const handleApplyCrop = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    if (!imageCanvas || !state.cropBox) return;
    const croppedImg = applyCrop(imageCanvas, state.cropBox);
    croppedImg.onload = () => {
      loadImage(croppedImg, croppedImg.src);
      setShowCrop(false);
      updateCropBox(null);
      toast.success('Crop applied!');
    };
  }, [applyCrop, state.cropBox, loadImage, updateCropBox, imageCanvasRef]);

  const handleReset = useCallback(() => {
    reset(maskCanvasRef.current);
    setShowCrop(false);
    toast.info('Reset to original');
  }, [reset, maskCanvasRef]);

  const handleAddBackgroundImage = useCallback((bgDataUrl: string) => {
    if (!state.resultDataUrl) {
      toast.error('Remove background first');
      return;
    }
    const bgImg = new window.Image();
    bgImg.onload = () => {
      const fgImg = new window.Image();
      fgImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = fgImg.width;
        canvas.height = fgImg.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(fgImg, 0, 0);
        setResultDataUrl(canvas.toDataURL('image/png'));
        toast.success('Background image added!');
      };
      fgImg.src = state.resultDataUrl!;
    };
    bgImg.src = bgDataUrl;
  }, [state.resultDataUrl, setResultDataUrl]);

  const handleRotate = useCallback((dir: 'cw' | 'ccw') => {
    const newRotation = state.rotation + (dir === 'cw' ? 90 : -90);
    updateRotation(((newRotation % 360) + 360) % 360);
  }, [state.rotation, updateRotation]);

  const handleToggleCrop = useCallback(() => {
    if (!showCrop && imageCanvasRef.current) {
      const canvas = imageCanvasRef.current;
      const margin = Math.min(canvas.width, canvas.height) * 0.1;
      updateCropBox({
        x: Math.round(margin),
        y: Math.round(margin),
        w: Math.round(canvas.width - margin * 2),
        h: Math.round(canvas.height - margin * 2),
      });
    }
    setShowCrop(v => !v);
  }, [showCrop, updateCropBox, imageCanvasRef]);

  const hasImage = !!state.imageDataUrl;

  const cursorStyle = state.brushState.active && !showCrop
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${state.brushState.size}' height='${state.brushState.size}'%3E%3Ccircle cx='${state.brushState.size / 2}' cy='${state.brushState.size / 2}' r='${state.brushState.size / 2 - 1}' fill='none' stroke='red' stroke-width='2'/%3E%3C/svg%3E") ${state.brushState.size / 2} ${state.brushState.size / 2}, crosshair`
    : 'default';

  const canvasW = imageCanvasRef.current?.width ?? 1;
  const canvasH = imageCanvasRef.current?.height ?? 1;

  return (
    <div className="animate-slide-up max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Background Remover</h2>
        <p className="text-muted-foreground text-sm">
          Paint over areas then click Erase, or use auto-detection
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <ScrollArea className="h-auto lg:h-[calc(100vh-220px)]">
            <div className="space-y-4 pr-1">
              {/* Upload */}
              <div className="glass-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Upload Image</h3>
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {hasImage ? 'Click to change image' : 'Browse Photo'}
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP</p>
                  </div>
                </div>
              </div>

              {/* Transform Controls */}
              {hasImage && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Transform</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleRotate('ccw')} className="tool-btn flex-1 justify-center">
                      <RotateCcw className="w-4 h-4" />
                      CCW
                    </button>
                    <button onClick={() => handleRotate('cw')} className="tool-btn flex-1 justify-center">
                      <RotateCw className="w-4 h-4" />
                      CW
                    </button>
                  </div>

                  <div>
                    <label className="section-title">Zoom: {Math.round(state.zoom * 100)}%</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateZoom(state.zoom - 0.25)} className="tool-btn p-1.5">
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <input
                        type="range"
                        min={25}
                        max={400}
                        value={Math.round(state.zoom * 100)}
                        onChange={e => updateZoom(Number(e.target.value) / 100)}
                        className="flex-1 accent-primary"
                      />
                      <button onClick={() => updateZoom(state.zoom + 0.25)} className="tool-btn p-1.5">
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleCrop}
                    className={`tool-btn w-full justify-center ${showCrop ? 'tool-btn-active' : ''}`}
                  >
                    <Crop className="w-4 h-4" />
                    {showCrop ? 'Cancel Crop' : 'Crop Image'}
                  </button>

                  {showCrop && (
                    <div className="flex gap-2 animate-fade-in">
                      <button
                        onClick={handleApplyCrop}
                        className="tool-btn flex-1 justify-center bg-primary text-primary-foreground border-primary"
                      >
                        <Check className="w-4 h-4" />
                        Apply
                      </button>
                      <button
                        onClick={() => { setShowCrop(false); updateCropBox(null); }}
                        className="tool-btn flex-1 justify-center"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Brush Tool */}
              <BrushToolPanel
                brushState={state.brushState}
                onBrushStateChange={updateBrushState}
                onUndo={undoLastStroke}
                hasMaskStrokes={state.hasMaskStrokes}
                onManualErase={handleManualErase}
              />

              {/* Removal Panel */}
              <RemovalPanel
                outputMode={state.outputMode}
                bgColor={state.bgColor}
                isProcessing={state.isProcessing}
                hasImage={hasImage}
                onOutputModeChange={updateOutputMode}
                onBgColorChange={updateBgColor}
                onRemoveBackground={handleRemoveBackground}
                onAutoDetect={handleAutoDetect}
              />

              {/* Export Panel */}
              <ExportPanel
                resultDataUrl={state.resultDataUrl}
                outputMode={state.outputMode}
                bgColor={state.bgColor}
                zoom={state.zoom}
                onZoomChange={updateZoom}
                onReset={handleReset}
                onAddBackgroundImage={handleAddBackgroundImage}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: Canvas */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {showCrop
                  ? 'Crop Mode'
                  : state.brushState.active
                  ? 'Brush Mode — Paint areas to erase'
                  : 'Canvas Preview'}
              </h3>
              {hasImage && (
                <span className="text-xs text-muted-foreground">
                  {imageCanvasRef.current?.width ?? 0}×{imageCanvasRef.current?.height ?? 0}px
                </span>
              )}
            </div>

            {!hasImage ? (
              <div
                className="upload-zone min-h-[300px] flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Click or drag to upload an image</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP supported</p>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative overflow-auto rounded-lg bg-[#111] flex items-center justify-center"
                style={{ minHeight: 300, maxHeight: 500 }}
              >
                <div
                  style={{
                    transform: `scale(${state.zoom}) rotate(${state.rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                    display: 'inline-block',
                  }}
                >
                  {/* Image canvas */}
                  <canvas
                    ref={imageCanvasRef}
                    style={{ display: 'block', maxWidth: '100%' }}
                  />
                  {/* Mask overlay canvas */}
                  <canvas
                    ref={maskCanvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      cursor: cursorStyle,
                      opacity: 1,
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleCanvasMouseUp}
                  />
                  {/* Crop overlay */}
                  {showCrop && state.cropBox && displaySize.w > 0 && (
                    <CropOverlay
                      containerWidth={displaySize.w}
                      containerHeight={displaySize.h}
                      imageWidth={canvasW}
                      imageHeight={canvasH}
                      cropBox={state.cropBox}
                      onCropChange={updateCropBox}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Brush hint */}
            {state.brushState.active && !showCrop && (
              <p className="text-xs text-muted-foreground text-center animate-fade-in">
                {state.brushState.mode === 'paint'
                  ? '🔴 Paint over areas you want to erase, then click "Erase Selected Area"'
                  : '⬜ Erase previously painted areas from the mask'}
              </p>
            )}
          </div>

          {/* Before/After Preview */}
          {state.resultDataUrl && state.imageDataUrl && (
            <div className="glass-card p-4">
              <BeforeAfterPreview
                originalDataUrl={state.imageDataUrl}
                resultDataUrl={state.resultDataUrl}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
