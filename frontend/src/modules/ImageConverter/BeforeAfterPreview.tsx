import React, { useState, useRef, useCallback } from 'react';
import type { ImageFile, ConvertedImage, ConversionSettings } from './useImageConversion';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterPreviewProps {
  originalImage: ImageFile;
  convertedImage: ConvertedImage | null;
  settings: ConversionSettings;
  onNext?: () => void;
  onBack?: () => void;
}

function SafeImage({ src, alt, className, style }: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 ${className ?? ''}`} style={style}>
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={`flex items-center justify-center bg-muted/20 ${className ?? ''}`} style={style}>
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

export function BeforeAfterPreview({ originalImage, convertedImage, settings, onNext, onBack }: BeforeAfterPreviewProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    updateSlider(e.clientX);
  }, [updateSlider]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  }, [updateSlider]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>Original</span>
          <span>Converted ({settings.format.toUpperCase()})</span>
        </div>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl border border-border cursor-col-resize select-none"
          style={{ aspectRatio: '16/9', minHeight: 200 }}
          onMouseDown={handleMouseDown}
          onTouchMove={handleTouchMove}
          onTouchStart={e => updateSlider(e.touches[0].clientX)}
        >
          {/* Original (full width background) */}
          <div className="absolute inset-0">
            <SafeImage
              src={originalImage.preview}
              alt="Original"
              className="w-full h-full object-contain"
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>

          {/* Converted (clipped to right side) */}
          {convertedImage ? (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ left: `${sliderPos}%` }}
            >
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, left: `-${sliderPos / (1 - sliderPos / 100 || 0.001) * 0}px`, width: `${100 / (1 - sliderPos / 100) || 100}%` }}>
                <SafeImage
                  src={convertedImage.convertedDataUrl}
                  alt="Converted"
                  className="w-full h-full object-contain"
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${100 / (1 - sliderPos / 100)}%`, maxWidth: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center bg-muted/40"
              style={{ left: `${sliderPos}%` }}
            >
              <p className="text-xs text-muted-foreground px-2 text-center">
                Convert images to see preview
              </p>
            </div>
          )}

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-border/30">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-muted-foreground/60 rounded-full" />
                <div className="w-0.5 h-4 bg-muted-foreground/60 rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
            Before
          </div>
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
            After
          </div>
        </div>

        {convertedImage && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Original: {(originalImage.size / 1024).toFixed(1)} KB</span>
            <span>Converted: {(convertedImage.size / 1024).toFixed(1)} KB</span>
            {originalImage.size > 0 && (
              <span className={convertedImage.size < originalImage.size ? 'text-green-500' : 'text-orange-400'}>
                {convertedImage.size < originalImage.size
                  ? `↓ ${(((originalImage.size - convertedImage.size) / originalImage.size) * 100).toFixed(1)}% smaller`
                  : `↑ ${(((convertedImage.size - originalImage.size) / originalImage.size) * 100).toFixed(1)}% larger`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <button
          onClick={onBack}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default BeforeAfterPreview;
