import { useRef, useCallback, useEffect, useState } from 'react';
import { Upload, Crop, Check, X, RotateCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBackgroundRemover } from './BackgroundRemover/useBackgroundRemover';
import BrushToolPanel from './BackgroundRemover/BrushToolPanel';
import RemovalPanel from './BackgroundRemover/RemovalPanel';
import BeforeAfterPreview from './BackgroundRemover/BeforeAfterPreview';
import ExportPanel from './BackgroundRemover/ExportPanel';
import CropOverlay from './BackgroundRemover/CropOverlay';

export default function BackgroundRemover() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showCrop, setShowCrop] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const {
    state,
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
    applyCrop,
    reset,
    setResultDataUrl,
  } = useBackgroundRemover();

  // Draw image on canvas when image changes
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

    // Update display size
    const container = containerRef.current;
    if (container) {
      const maxW = container.clientWidth;
      const maxH = 400;
      const scale = Math.min(maxW / newW, maxH / newH, 1);
      setDisplaySize({ w: Math.round(newW * scale), h: Math.round(newH * scale) });
    }
  }, []);

  useEffect(() => {
    if (state.originalImage) {
      drawImageOnCanvas(state.originalImage, state.rotation);
    }
  }, [state.originalImage, state.rotation, drawImageOnCanvas]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        loadImage(img, dataUrl);
        setShowCrop(false);
        setStrokeCount(0);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [loadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        loadImage(img, dataUrl);
        setShowCrop(false);
        setStrokeCount(0);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  // Brush drawing
  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = imageCanvasRef.current;
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
  }, []);

  const drawBrush = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d')!;
    const { size, mode } = state.brushState;

    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    }

    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, [state.brushState]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!state.brushState.active || showCrop) return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !state.brushState.active || showCrop) return;
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
  }, [isDrawing, state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      saveMaskSnapshot(maskCanvas);
      setStrokeCount(c => c + 1);
    }
  }, [isDrawing, saveMaskSnapshot]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!state.brushState.active || showCrop) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
  }, [state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing || !state.brushState.active || showCrop) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
  }, [isDrawing, state.brushState.active, showCrop, getCanvasPos, drawBrush]);

  const handleRemoveBackground = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;
    const resultUrl = removeBackground(imageCanvas, maskCanvas, state.outputMode, state.bgColor);
    setResultDataUrl(resultUrl);
    toast.success('Background removed!');
  }, [removeBackground, state.outputMode, state.bgColor, setResultDataUrl]);

  const handleAutoDetect = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;
    autoDetectBackground(imageCanvas, maskCanvas);
    setStrokeCount(c => c + 1);
    toast.success('Background auto-detected! Review and click Remove Background.');
  }, [autoDetectBackground]);

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
  }, [applyCrop, state.cropBox, loadImage, updateCropBox]);

  const handleReset = useCallback(() => {
    reset(maskCanvasRef.current);
    setStrokeCount(0);
    setShowCrop(false);
    if (state.originalImage && state.originalDataUrl) {
      const img = new window.Image();
      img.onload = () => loadImage(img, state.originalDataUrl!);
      img.src = state.originalDataUrl;
    }
    toast.info('Reset to original');
  }, [reset, state.originalImage, state.originalDataUrl, loadImage]);

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
        // Draw background scaled to fit
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        // Draw foreground on top
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
    updateRotation(newRotation % 360);
  }, [state.rotation, updateRotation]);

  // Initialize crop box when crop mode is activated
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
  }, [showCrop, updateCropBox]);

  const canvasWidth = imageCanvasRef.current?.width ?? 1;
  const canvasHeight = imageCanvasRef.current?.height ?? 1;

  const cursorStyle = state.brushState.active && !showCrop
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${state.brushState.size}' height='${state.brushState.size}'%3E%3Ccircle cx='${state.brushState.size / 2}' cy='${state.brushState.size / 2}' r='${state.brushState.size / 2 - 1}' fill='none' stroke='red' stroke-width='2'/%3E%3C/svg%3E") ${state.brushState.size / 2} ${state.brushState.size / 2}, crosshair`
    : 'default';

  return (
    <div className="animate-slide-up max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Background Remover</h2>
        <p className="text-muted-foreground text-sm">
          Remove image backgrounds with brush selection or auto-detection
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
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {state.originalImage ? 'Click to change image' : 'Browse Photo'}
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, JPEG</p>
                  </div>
                </div>
              </div>

              {/* Crop & Rotate Controls */}
              {state.originalImage && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Transform</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRotate('ccw')}
                      className="tool-btn flex-1 justify-center"
                    >
                      <RotateCcw className="w-4 h-4" />
                      CCW
                    </button>
                    <button
                      onClick={() => handleRotate('cw')}
                      className="tool-btn flex-1 justify-center"
                    >
                      <RotateCw className="w-4 h-4" />
                      CW
                    </button>
                  </div>

                  <div>
                    <label className="section-title">Zoom: {Math.round(state.zoom * 100)}%</label>
                    <input
                      type="range"
                      min={25}
                      max={400}
                      value={Math.round(state.zoom * 100)}
                      onChange={e => updateZoom(Number(e.target.value) / 100)}
                      className="w-full accent-primary"
                    />
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
                onUpdate={updateBrushState}
                onUndo={() => {
                  if (maskCanvasRef.current) {
                    undoLastStroke(maskCanvasRef.current);
                    setStrokeCount(c => Math.max(0, c - 1));
                  }
                }}
                canUndo={strokeCount > 0}
              />

              {/* Removal Panel */}
              <RemovalPanel
                outputMode={state.outputMode}
                bgColor={state.bgColor}
                isProcessing={state.isProcessing}
                hasImage={!!state.originalImage}
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
          {/* Canvas Area */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {showCrop ? 'Crop Mode' : state.brushState.active ? 'Brush Mode — Paint background areas' : 'Canvas Preview'}
              </h3>
              {state.originalImage && (
                <span className="text-xs text-muted-foreground">
                  {imageCanvasRef.current?.width ?? 0}×{imageCanvasRef.current?.height ?? 0}px
                </span>
              )}
            </div>

            {!state.originalImage ? (
              <div
                className="upload-zone min-h-[300px] flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Click or drag to upload an image</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, JPEG supported</p>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative overflow-auto rounded-lg bg-[#111] flex items-center justify-center"
                style={{ minHeight: 300, maxHeight: 500 }}
              >
                <div
                  style={{
                    transform: `scale(${state.zoom})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.2s',
                    position: 'relative',
                    display: 'inline-block',
                  }}
                >
                  {/* Image Canvas */}
                  <canvas
                    ref={imageCanvasRef}
                    className="block max-w-full"
                    style={{
                      cursor: cursorStyle,
                      maxWidth: '100%',
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleCanvasMouseUp}
                  />
                  {/* Mask Canvas (overlay) */}
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{ opacity: 0.6 }}
                  />
                  {/* Crop Overlay */}
                  {showCrop && state.cropBox && displaySize.w > 0 && (
                    <CropOverlay
                      containerWidth={imageCanvasRef.current?.offsetWidth ?? displaySize.w}
                      containerHeight={imageCanvasRef.current?.offsetHeight ?? displaySize.h}
                      imageWidth={canvasWidth}
                      imageHeight={canvasHeight}
                      cropBox={state.cropBox}
                      onCropChange={updateCropBox}
                    />
                  )}
                </div>
              </div>
            )}

            {state.brushState.active && !showCrop && (
              <p className="text-xs text-center text-muted-foreground animate-fade-in">
                {state.brushState.mode === 'paint'
                  ? '🔴 Red overlay = marked for removal'
                  : '⬜ Erasing marked areas'}
                {' · '}Brush size: {state.brushState.size}px
              </p>
            )}
          </div>

          {/* Before/After Preview */}
          {state.resultDataUrl && state.originalDataUrl && (
            <div className="glass-card p-4 animate-fade-in">
              <BeforeAfterPreview
                originalDataUrl={state.originalDataUrl}
                resultDataUrl={state.resultDataUrl}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
