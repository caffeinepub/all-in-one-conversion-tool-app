import { useEffect, useRef } from 'react';
import type { TextConfig } from './usePassportPhoto';
import { A4_WIDTH_MM, A4_HEIGHT_MM, A4_MARGIN_MM, PHOTO_GAP_MM } from './usePassportPhoto';

interface CopyGridPanelProps {
  processedDataUrl: string | null;
  copyCount: number;
  widthMm: number;
  heightMm: number;
  textConfig: TextConfig;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function CopyGridPanel({
  processedDataUrl,
  copyCount,
  widthMm,
  heightMm,
  textConfig,
  canvasRef: externalCanvasRef,
}: CopyGridPanelProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resolvedRef = externalCanvasRef ?? internalCanvasRef;

  useEffect(() => {
    const canvas = resolvedRef.current;
    if (!canvas || !processedDataUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use 300 DPI for high-quality rendering
    const exportDPI = 300;
    const scale = exportDPI / 25.4;

    const a4W = Math.round(A4_WIDTH_MM * scale);
    const a4H = Math.round(A4_HEIGHT_MM * scale);
    const marginPx = Math.round(A4_MARGIN_MM * scale);
    const gapPx = Math.round(PHOTO_GAP_MM * scale);
    const photoW = Math.round(widthMm * scale);
    const photoH = Math.round(heightMm * scale);

    canvas.width = a4W;
    canvas.height = a4H;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4W, a4H);

    const img = new window.Image();

    const drawAll = () => {
      let x = marginPx;
      let y = marginPx;
      let count = 0;

      const textH = textConfig.enabled && textConfig.content
        ? Math.round(textConfig.fontSize * (exportDPI / 72) + 8)
        : 0;

      while (count < copyCount) {
        if (x + photoW > a4W - marginPx) {
          x = marginPx;
          y += photoH + textH + gapPx;
        }
        if (y + photoH + textH > a4H - marginPx) break;

        ctx.drawImage(img, x, y, photoW, photoH);

        // Draw text
        if (textConfig.enabled && textConfig.content) {
          const { fontFamily, fontSize, color, bold, italic, align } = textConfig;
          const scaledFontSize = Math.round(fontSize * (exportDPI / 72));
          ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${scaledFontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = align;
          const textX = align === 'left' ? x : align === 'right' ? x + photoW : x + photoW / 2;
          ctx.fillText(textConfig.content, textX, y + photoH + scaledFontSize + 2, photoW);
        }

        x += photoW + gapPx;
        count++;
      }

      // Draw A4 border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = Math.round(scale);
      ctx.strokeRect(0, 0, a4W, a4H);
    };

    if (img.complete && img.naturalWidth > 0) {
      drawAll();
    } else {
      img.onload = drawAll;
    }
    img.src = processedDataUrl;
  }, [processedDataUrl, copyCount, widthMm, heightMm, textConfig, resolvedRef]);

  if (!processedDataUrl) {
    return (
      <div className="glass-card p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm text-center">
          Upload a photo to see the A4 sheet preview
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">A4 Sheet Preview</h3>
        <span className="text-xs text-muted-foreground">{copyCount} copies</span>
      </div>
      <div className="overflow-auto rounded-lg border border-border/50 bg-white">
        <canvas
          ref={resolvedRef}
          className="block max-w-full"
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        A4 (210×297mm) — {widthMm}×{heightMm}mm per photo · 300 DPI
      </p>
    </div>
  );
}
