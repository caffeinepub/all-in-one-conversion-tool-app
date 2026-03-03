import { dataUrlToBlob } from "@/lib/jszip";
import { useCallback, useRef, useState } from "react";

export type SizePreset = "35x45mm" | "2x2in" | "1.5x1.5in" | "custom";

export interface SizeOption {
  id: SizePreset;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const SIZE_OPTIONS: SizeOption[] = [
  { id: "35x45mm", label: "35×45mm (Standard)", widthMm: 35, heightMm: 45 },
  { id: "2x2in", label: "2×2 inch (US)", widthMm: 50.8, heightMm: 50.8 },
  { id: "1.5x1.5in", label: "1.5×1.5 inch", widthMm: 38.1, heightMm: 38.1 },
  { id: "custom", label: "Custom", widthMm: 35, heightMm: 45 },
];

export interface TextConfig {
  enabled: boolean;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  // Text background
  textBgEnabled: boolean;
  textBgColor: string;
  textBgOpacity: number;
  // Text shadow
  textShadowEnabled: boolean;
  textShadowColor: string;
  textShadowBlur: number;
  textShadowOffsetX: number;
  textShadowOffsetY: number;
}

export interface PassportPhotoState {
  originalImage: HTMLImageElement | null;
  processedDataUrl: string | null;
  selectedPreset: SizePreset;
  customWidth: number;
  customHeight: number;
  copyCount: number;
  textConfig: TextConfig;
  exportFormat: "png" | "pdf" | "gif";
  isProcessing: boolean;
}

const DPI = 300;

export function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * DPI);
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_MARGIN_MM = 5;
export const PHOTO_GAP_MM = 3;

export function usePassportPhoto() {
  const [state, setState] = useState<PassportPhotoState>({
    originalImage: null,
    processedDataUrl: null,
    selectedPreset: "35x45mm",
    customWidth: 35,
    customHeight: 45,
    copyCount: 8,
    textConfig: {
      enabled: false,
      content: "",
      fontFamily: "Arial",
      fontSize: 12,
      color: "#000000",
      bold: false,
      italic: false,
      align: "center",
      textBgEnabled: false,
      textBgColor: "#ffffff",
      textBgOpacity: 0.7,
      textShadowEnabled: false,
      textShadowColor: "#000000",
      textShadowBlur: 4,
      textShadowOffsetX: 2,
      textShadowOffsetY: 2,
    },
    exportFormat: "png",
    isProcessing: false,
  });

  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getCurrentSize = useCallback((): {
    widthMm: number;
    heightMm: number;
  } => {
    if (state.selectedPreset === "custom") {
      return { widthMm: state.customWidth, heightMm: state.customHeight };
    }
    const preset = SIZE_OPTIONS.find((o) => o.id === state.selectedPreset);
    return preset
      ? { widthMm: preset.widthMm, heightMm: preset.heightMm }
      : { widthMm: 35, heightMm: 45 };
  }, [state.selectedPreset, state.customWidth, state.customHeight]);

  const applyEnhancements = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.filter = "brightness(1.05) contrast(1.1) saturate(1.05)";
      const imageData = ctx.getImageData(0, 0, width, height);
      ctx.filter = "none";

      const data = imageData.data;
      const w = width;
      const h = height;
      const amount = 0.3;

      const blurred = new Uint8ClampedArray(data.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            blurred[idx + c] =
              (data[((y - 1) * w + (x - 1)) * 4 + c] +
                data[((y - 1) * w + x) * 4 + c] +
                data[((y - 1) * w + (x + 1)) * 4 + c] +
                data[(y * w + (x - 1)) * 4 + c] +
                data[(y * w + x) * 4 + c] +
                data[(y * w + (x + 1)) * 4 + c] +
                data[((y + 1) * w + (x - 1)) * 4 + c] +
                data[((y + 1) * w + x) * 4 + c] +
                data[((y + 1) * w + (x + 1)) * 4 + c]) /
              9;
          }
          blurred[idx + 3] = data[idx + 3];
        }
      }

      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.min(
            255,
            Math.max(0, data[i + c] + amount * (data[i + c] - blurred[i + c])),
          );
        }
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [],
  );

  const processImage = useCallback(
    async (img: HTMLImageElement) => {
      if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return;

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const { widthMm, heightMm } =
          state.selectedPreset === "custom"
            ? { widthMm: state.customWidth, heightMm: state.customHeight }
            : (SIZE_OPTIONS.find((o) => o.id === state.selectedPreset) ?? {
                widthMm: 35,
                heightMm: 45,
              });

        const targetW = mmToPx(widthMm);
        const targetH = mmToPx(heightMm);

        if (targetW <= 0 || targetH <= 0) {
          setState((prev) => ({ ...prev, isProcessing: false }));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setState((prev) => ({ ...prev, isProcessing: false }));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);

        const srcAspect = img.width / img.height;
        const tgtAspect = targetW / targetH;

        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;
        if (srcAspect > tgtAspect) {
          sw = img.height * tgtAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / tgtAspect;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        applyEnhancements(ctx, targetW, targetH);

        const dataUrl = canvas.toDataURL("image/png", 1.0);
        if (!dataUrl || dataUrl === "data:,") {
          setState((prev) => ({ ...prev, isProcessing: false }));
          return;
        }

        processedCanvasRef.current = canvas;

        setState((prev) => ({
          ...prev,
          originalImage: img,
          processedDataUrl: dataUrl,
          isProcessing: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [
      state.selectedPreset,
      state.customWidth,
      state.customHeight,
      applyEnhancements,
    ],
  );

  const reprocessImage = useCallback(() => {
    if (state.originalImage) {
      processImage(state.originalImage);
    }
  }, [state.originalImage, processImage]);

  const updatePreset = useCallback((preset: SizePreset) => {
    setState((prev) => ({ ...prev, selectedPreset: preset }));
  }, []);

  const updateCustomSize = useCallback((widthMm: number, heightMm: number) => {
    setState((prev) => ({
      ...prev,
      customWidth: widthMm,
      customHeight: heightMm,
    }));
  }, []);

  const updateCopyCount = useCallback((count: number) => {
    setState((prev) => ({
      ...prev,
      copyCount: Math.max(1, Math.min(40, count)),
    }));
  }, []);

  const updateTextConfig = useCallback((updates: Partial<TextConfig>) => {
    setState((prev) => ({
      ...prev,
      textConfig: { ...prev.textConfig, ...updates },
    }));
  }, []);

  const updateExportFormat = useCallback((format: "png" | "pdf" | "gif") => {
    setState((prev) => ({ ...prev, exportFormat: format }));
  }, []);

  const renderA4Canvas = useCallback(
    (canvas: HTMLCanvasElement): void => {
      if (!state.processedDataUrl || !canvas) return;

      const { widthMm, heightMm } = getCurrentSize();

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
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, a4W, a4H);

      const img = new window.Image();
      img.src = state.processedDataUrl;

      const textH =
        state.textConfig.enabled && state.textConfig.content
          ? Math.round(state.textConfig.fontSize * (exportDPI / 72) + 8)
          : 0;

      const drawAll = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;

        let x = marginPx;
        let y = marginPx;
        let count = 0;

        while (count < state.copyCount) {
          if (x + photoW > a4W - marginPx) {
            x = marginPx;
            y += photoH + textH + gapPx;
          }
          if (y + photoH + textH > a4H - marginPx) break;

          ctx.drawImage(img, x, y, photoW, photoH);

          if (state.textConfig.enabled && state.textConfig.content) {
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
            } = state.textConfig;
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

            const metrics = ctx.measureText(state.textConfig.content);
            const textWidth = metrics.width;
            const bgPadX = 6;
            const bgPadY = 4;

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

            if (textShadowEnabled) {
              ctx.shadowColor = textShadowColor;
              ctx.shadowBlur = textShadowBlur;
              ctx.shadowOffsetX = textShadowOffsetX;
              ctx.shadowOffsetY = textShadowOffsetY;
            }

            ctx.fillStyle = color;
            ctx.textAlign = align;
            ctx.fillText(state.textConfig.content, textX, textY, photoW);

            // Reset shadow
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }

          x += photoW + gapPx;
          count++;
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        drawAll();
      } else {
        img.onload = drawAll;
        img.onerror = () => {
          /* silently ignore */
        };
      }
    },
    [state.processedDataUrl, state.copyCount, state.textConfig, getCurrentSize],
  );

  const getIndividualPhotoBlobs = useCallback(async (): Promise<Blob[]> => {
    if (!state.processedDataUrl) return [];
    const result: Blob[] = [];
    for (let i = 0; i < state.copyCount; i++) {
      result.push(dataUrlToBlob(state.processedDataUrl));
    }
    return result;
  }, [state.processedDataUrl, state.copyCount]);

  return {
    state,
    processedCanvasRef,
    processImage,
    reprocessImage,
    updatePreset,
    updateCustomSize,
    updateCopyCount,
    updateTextConfig,
    updateExportFormat,
    renderA4Canvas,
    getIndividualPhotoBlobs,
  };
}
