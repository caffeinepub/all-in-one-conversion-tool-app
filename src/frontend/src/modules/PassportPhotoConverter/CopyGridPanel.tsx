import { useEffect, useRef } from "react";
import type { TextConfig } from "./usePassportPhoto";
import {
  A4_HEIGHT_MM,
  A4_MARGIN_MM,
  A4_WIDTH_MM,
  PHOTO_GAP_MM,
} from "./usePassportPhoto";

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, a4W, a4H);

    const img = new window.Image();

    const drawAll = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;

      let x = marginPx;
      let y = marginPx;
      let count = 0;

      const textH =
        textConfig.enabled && textConfig.content
          ? Math.round(textConfig.fontSize * (exportDPI / 72) + 8)
          : 0;

      while (count < copyCount) {
        if (x + photoW > a4W - marginPx) {
          x = marginPx;
          y += photoH + textH + gapPx;
        }
        if (y + photoH + textH > a4H - marginPx) break;

        ctx.drawImage(img, x, y, photoW, photoH);

        if (textConfig.enabled && textConfig.content) {
          const {
            fontFamily,
            fontSize,
            color,
            bold,
            italic,
            align,
            textBgEnabled,
            textBgColor,
            textBgOpacity,
            textShadowEnabled,
            textShadowColor,
            textShadowBlur,
            textShadowOffsetX,
            textShadowOffsetY,
          } = textConfig;

          const scaledFontSize = Math.round(fontSize * (exportDPI / 72));
          const fontStyle = `${italic ? "italic " : ""}${bold ? "bold " : ""}${scaledFontSize}px ${fontFamily}`;
          ctx.font = fontStyle;

          const textX =
            align === "left"
              ? x
              : align === "right"
                ? x + photoW
                : x + photoW / 2;
          const textY = y + photoH + scaledFontSize + 2;

          // Measure text for background rect
          const metrics = ctx.measureText(textConfig.content);
          const textWidth = metrics.width;
          const bgPadX = 6;
          const bgPadY = 4;

          // Draw text background if enabled
          if (textBgEnabled) {
            const bgX =
              align === "left"
                ? x - bgPadX
                : align === "right"
                  ? x + photoW - textWidth - bgPadX
                  : x + photoW / 2 - textWidth / 2 - bgPadX;
            const bgY = textY - scaledFontSize - bgPadY;
            const bgW = textWidth + bgPadX * 2;
            const bgH = scaledFontSize + bgPadY * 2;

            ctx.save();
            ctx.globalAlpha = textBgOpacity;
            ctx.fillStyle = textBgColor;
            ctx.fillRect(bgX, bgY, bgW, bgH);
            ctx.restore();
          }

          // Apply shadow if enabled
          if (textShadowEnabled) {
            ctx.shadowColor = textShadowColor;
            ctx.shadowBlur = textShadowBlur;
            ctx.shadowOffsetX = textShadowOffsetX;
            ctx.shadowOffsetY = textShadowOffsetY;
          }

          // Draw text
          ctx.fillStyle = color;
          ctx.textAlign = align;
          ctx.fillText(textConfig.content, textX, textY, photoW);

          // Reset shadow to avoid affecting other canvas operations
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        x += photoW + gapPx;
        count++;
      }

      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = Math.round(scale);
      ctx.strokeRect(0, 0, a4W, a4H);
    };

    img.onload = drawAll;
    img.onerror = () => {
      /* silently ignore broken image */
    };

    if (img.complete && img.naturalWidth > 0) {
      drawAll();
    } else {
      img.src = processedDataUrl;
    }

    // Set src after attaching handlers if not already set
    if (!img.src) {
      img.src = processedDataUrl;
    }
  }, [processedDataUrl, copyCount, widthMm, heightMm, textConfig, resolvedRef]);

  if (!processedDataUrl) {
    return (
      <div className="glass-card box-black p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm text-center">
          Upload a photo to see the A4 sheet preview
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card box-black p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          A4 Sheet Preview
        </h3>
        <span className="text-xs text-muted-foreground">210 × 297 mm</span>
      </div>
      <div className="overflow-auto rounded border border-border/40 bg-muted/20">
        <canvas
          ref={resolvedRef}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
    </div>
  );
}
