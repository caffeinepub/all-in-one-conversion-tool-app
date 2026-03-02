import { useState, useRef, useCallback } from 'react';
import type { ImageFile, ConvertedImage, ConversionSettings } from './useImageConversion';

interface BeforeAfterPreviewProps {
  originalImage: ImageFile;
  convertedImage: ConvertedImage | null;
  settings: ConversionSettings;
}

export function BeforeAfterPreview({ originalImage, convertedImage, settings }: BeforeAfterPreviewProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    updateSlider(e.clientX);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Original</span>
        <span>Converted ({settings.format.toUpperCase()})</span>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-border cursor-col-resize select-none"
        style={{ aspectRatio: '16/9' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
      >
        {/* Original */}
        <img
          src={originalImage.preview}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {/* Converted overlay */}
        {convertedImage && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={convertedImage.convertedDataUrl}
              alt="Converted"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }}
            />
          </div>
        )}
        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="w-0.5 h-3 bg-gray-400 mx-0.5" />
            <div className="w-0.5 h-3 bg-gray-400 mx-0.5" />
          </div>
        </div>
      </div>
      {!convertedImage && (
        <p className="text-xs text-center text-muted-foreground">
          Convert images in the Export tab to see the comparison.
        </p>
      )}
    </div>
  );
}

export default BeforeAfterPreview;
