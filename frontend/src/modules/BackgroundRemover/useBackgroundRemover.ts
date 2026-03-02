import { useState, useCallback, useRef } from 'react';

export type BrushMode = 'paint' | 'erase';
export type OutputMode = 'transparent' | 'color';

export interface BrushState {
  active: boolean;
  size: number;
  mode: BrushMode;
}

export interface BackgroundRemoverState {
  originalImage: HTMLImageElement | null;
  originalDataUrl: string | null;
  resultDataUrl: string | null;
  brushState: BrushState;
  outputMode: OutputMode;
  bgColor: string;
  zoom: number;
  rotation: number;
  cropBox: { x: number; y: number; w: number; h: number } | null;
  isProcessing: boolean;
}

export function useBackgroundRemover() {
  const [state, setState] = useState<BackgroundRemoverState>({
    originalImage: null,
    originalDataUrl: null,
    resultDataUrl: null,
    brushState: { active: false, size: 25, mode: 'paint' },
    outputMode: 'transparent',
    bgColor: '#ffffff',
    zoom: 1,
    rotation: 0,
    cropBox: null,
    isProcessing: false,
  });

  const strokeHistoryRef = useRef<ImageData[]>([]);

  const loadImage = useCallback((img: HTMLImageElement, dataUrl: string) => {
    strokeHistoryRef.current = [];
    setState(prev => ({
      ...prev,
      originalImage: img,
      originalDataUrl: dataUrl,
      resultDataUrl: null,
      cropBox: null,
      rotation: 0,
      zoom: 1,
    }));
  }, []);

  const updateBrushState = useCallback((updates: Partial<BrushState>) => {
    setState(prev => ({ ...prev, brushState: { ...prev.brushState, ...updates } }));
  }, []);

  const updateOutputMode = useCallback((mode: OutputMode) => {
    setState(prev => ({ ...prev, outputMode: mode }));
  }, []);

  const updateBgColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, bgColor: color }));
  }, []);

  const updateZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom: Math.max(0.25, Math.min(4, zoom)) }));
  }, []);

  const updateRotation = useCallback((rotation: number) => {
    setState(prev => ({ ...prev, rotation }));
  }, []);

  const updateCropBox = useCallback((cropBox: { x: number; y: number; w: number; h: number } | null) => {
    setState(prev => ({ ...prev, cropBox }));
  }, []);

  const saveMaskSnapshot = useCallback((maskCanvas: HTMLCanvasElement) => {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    strokeHistoryRef.current.push(snapshot);
    if (strokeHistoryRef.current.length > 20) {
      strokeHistoryRef.current.shift();
    }
  }, []);

  const undoLastStroke = useCallback((maskCanvas: HTMLCanvasElement) => {
    if (strokeHistoryRef.current.length === 0) return;
    strokeHistoryRef.current.pop();
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    if (strokeHistoryRef.current.length === 0) {
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    } else {
      const last = strokeHistoryRef.current[strokeHistoryRef.current.length - 1];
      ctx.putImageData(last, 0, 0);
    }
  }, []);

  const removeBackground = useCallback((
    imageCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    outputMode: OutputMode,
    bgColor: string
  ): string => {
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = imageCanvas.width;
    resultCanvas.height = imageCanvas.height;
    const ctx = resultCanvas.getContext('2d')!;

    ctx.drawImage(imageCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    const data = imageData.data;
    const mask = maskData.data;

    let bgR = 255, bgG = 255, bgB = 255;
    if (outputMode === 'color') {
      const hex = bgColor.replace('#', '');
      bgR = parseInt(hex.substring(0, 2), 16);
      bgG = parseInt(hex.substring(2, 4), 16);
      bgB = parseInt(hex.substring(4, 6), 16);
    }

    for (let i = 0; i < data.length; i += 4) {
      const maskAlpha = mask[i + 3];
      const maskR = mask[i];
      if (maskAlpha > 0 && maskR > 100) {
        if (outputMode === 'transparent') {
          data[i + 3] = 0;
        } else {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return resultCanvas.toDataURL('image/png', 1.0);
  }, []);

  const autoDetectBackground = useCallback((
    imageCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement
  ) => {
    const ctx = imageCanvas.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;
    const w = imageCanvas.width;
    const h = imageCanvas.height;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const samplePoints = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w / 2), 0], [0, Math.floor(h / 2)],
    ];

    let totalR = 0, totalG = 0, totalB = 0;
    for (const [x, y] of samplePoints) {
      const idx = (y * w + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
    }
    const avgR = totalR / samplePoints.length;
    const avgG = totalG / samplePoints.length;
    const avgB = totalB / samplePoints.length;

    const tolerance = 40;
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    const colorMatch = (idx: number) => {
      const dr = data[idx] - avgR;
      const dg = data[idx + 1] - avgG;
      const db = data[idx + 2] - avgB;
      return Math.sqrt(dr * dr + dg * dg + db * db) < tolerance;
    };

    for (let x = 0; x < w; x++) {
      const topIdx = x;
      const botIdx = (h - 1) * w + x;
      if (!visited[topIdx] && colorMatch(topIdx * 4)) { queue.push(topIdx); visited[topIdx] = 1; }
      if (!visited[botIdx] && colorMatch(botIdx * 4)) { queue.push(botIdx); visited[botIdx] = 1; }
    }
    for (let y = 0; y < h; y++) {
      const leftIdx = y * w;
      const rightIdx = y * w + w - 1;
      if (!visited[leftIdx] && colorMatch(leftIdx * 4)) { queue.push(leftIdx); visited[leftIdx] = 1; }
      if (!visited[rightIdx] && colorMatch(rightIdx * 4)) { queue.push(rightIdx); visited[rightIdx] = 1; }
    }

    while (queue.length > 0) {
      const idx = queue.pop()!;
      const x = idx % w;
      const y = Math.floor(idx / w);

      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < w - 1 ? idx + 1 : -1,
        y > 0 ? idx - w : -1,
        y < h - 1 ? idx + w : -1,
      ];

      for (const n of neighbors) {
        if (n >= 0 && !visited[n] && colorMatch(n * 4)) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    maskCtx.clearRect(0, 0, w, h);
    const maskImageData = maskCtx.createImageData(w, h);
    const maskData = maskImageData.data;
    for (let i = 0; i < visited.length; i++) {
      if (visited[i]) {
        maskData[i * 4] = 255;
        maskData[i * 4 + 1] = 0;
        maskData[i * 4 + 2] = 0;
        maskData[i * 4 + 3] = 128;
      }
    }
    maskCtx.putImageData(maskImageData, 0, 0);
  }, []);

  const applyCrop = useCallback((
    imageCanvas: HTMLCanvasElement,
    cropBox: { x: number; y: number; w: number; h: number }
  ): HTMLImageElement => {
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropBox.w;
    croppedCanvas.height = cropBox.h;
    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(imageCanvas, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);

    const dataUrl = croppedCanvas.toDataURL('image/png');
    const img = new window.Image();
    img.src = dataUrl;
    return img;
  }, []);

  const reset = useCallback((maskCanvas: HTMLCanvasElement | null) => {
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    strokeHistoryRef.current = [];
    setState(prev => ({
      ...prev,
      resultDataUrl: null,
      cropBox: null,
      rotation: 0,
      zoom: 1,
      brushState: { active: false, size: 25, mode: 'paint' },
    }));
  }, []);

  const setResultDataUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, resultDataUrl: url }));
  }, []);

  return {
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
  };
}
