import { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface BeforeAfterPreviewProps {
  originalDataUrl: string;
  resultDataUrl: string;
}

export default function BeforeAfterPreview({ originalDataUrl, resultDataUrl }: BeforeAfterPreviewProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Before / After Comparison</span>
        <span>Drag slider to compare</span>
      </div>
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-border/50 cursor-col-resize select-none"
        style={{ height: 280 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
      >
        {/* After (result) - full background with checkerboard for transparency */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        />
        {afterError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs">Result unavailable</p>
            </div>
          </div>
        ) : (
          <img
            src={resultDataUrl}
            alt="Result"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: afterLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
            onLoad={() => setAfterLoaded(true)}
            onError={() => setAfterError(true)}
          />
        )}

        {/* Before (original) - clipped */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          {beforeError ? (
            <div className="flex items-center justify-center w-full h-full bg-muted/50">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs">Original unavailable</p>
              </div>
            </div>
          ) : (
            <img
              src={originalDataUrl}
              alt="Original"
              className="absolute inset-0 h-full object-contain bg-secondary/50"
              style={{
                width: containerRef.current?.offsetWidth ?? 400,
                opacity: beforeLoaded ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
              onLoad={() => setBeforeLoaded(true)}
              onError={() => setBeforeError(true)}
            />
          )}
        </div>

        {/* Slider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-col-resize"
          style={{ left: `${sliderPos}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={() => { isDragging.current = true; }}
          onTouchEnd={() => { isDragging.current = false; }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-gray-400 rounded" />
              <div className="w-0.5 h-3 bg-gray-400 rounded" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Original</div>
        <div className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Result</div>
      </div>
    </div>
  );
}
