import { useRef, useState, useCallback } from 'react';

export type BrushMode = 'paint' | 'erase';
export type OutputMode = 'transparent' | 'color';

export interface BrushState {
  active: boolean;
  size: number;
  mode: BrushMode;
}

// CropBox uses w/h to match CropOverlay component
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BackgroundRemoverState {
  imageDataUrl: string | null;
  resultDataUrl: string | null;
  brushState: BrushState;
  outputMode: OutputMode;
  bgColor: string;
  zoom: number;
  rotation: number;
  cropBox: CropBox | null;
  isProcessing: boolean;
  hasMaskStrokes: boolean;
}

const DEFAULT_BRUSH: BrushState = {
  active: false,
  size: 20,
  mode: 'paint',
};

export function useBackgroundRemover() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [state, setState] = useState<BackgroundRemoverState>({
    imageDataUrl: null,
    resultDataUrl: null,
    brushState: DEFAULT_BRUSH,
    outputMode: 'transparent',
    bgColor: '#ffffff',
    zoom: 1,
    rotation: 0,
    cropBox: null,
    isProcessing: false,
    hasMaskStrokes: false,
  });

  const loadImage = useCallback((img: HTMLImageElement, dataUrl: string) => {
    imageRef.current = img;
    setState(prev => ({
      ...prev,
      imageDataUrl: dataUrl,
      resultDataUrl: null,
      hasMaskStrokes: false,
      cropBox: null,
    }));
  }, []);

  const updateBrushState = useCallback((updates: Partial<BrushState>) => {
    setState(prev => ({
      ...prev,
      brushState: { ...prev.brushState, ...updates },
    }));
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

  const updateCropBox = useCallback((cropBox: CropBox | null) => {
    setState(prev => ({ ...prev, cropBox }));
  }, []);

  const checkMaskStrokes = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return false;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  }, []);

  const saveMaskSnapshot = useCallback(() => {
    const has = checkMaskStrokes();
    setState(prev => ({ ...prev, hasMaskStrokes: has }));
  }, [checkMaskStrokes]);

  const undoLastStroke = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setState(prev => ({ ...prev, hasMaskStrokes: false }));
  }, []);

  const removeBackground = useCallback(() => {
    const img = imageRef.current;
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !imageCanvas || !maskCanvas) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
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
      // Read bgColor from state via closure — use a ref approach
      setState(prev => {
        const { outputMode, bgColor } = prev;
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
        const resultDataUrl = resultCanvas.toDataURL('image/png', 1.0);
        return { ...prev, resultDataUrl, isProcessing: false };
      });
    } catch {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  const autoDetectBackground = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
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
      const maskDataArr = maskImageData.data;
      for (let i = 0; i < visited.length; i++) {
        if (visited[i]) {
          maskDataArr[i * 4] = 255;
          maskDataArr[i * 4 + 1] = 0;
          maskDataArr[i * 4 + 2] = 0;
          maskDataArr[i * 4 + 3] = 128;
        }
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      setState(prev => ({ ...prev, isProcessing: false, hasMaskStrokes: true }));
    } catch {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  const processManualErase = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;

    setState(prev => {
      const { outputMode, bgColor, resultDataUrl } = prev;

      const applyErase = (sourceCanvas: HTMLCanvasElement) => {
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = sourceCanvas.width;
        resultCanvas.height = sourceCanvas.height;
        const resultCtx = resultCanvas.getContext('2d')!;
        resultCtx.drawImage(sourceCanvas, 0, 0);

        const maskCtx = maskCanvas.getContext('2d')!;
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const resultData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);

        const scaleX = resultCanvas.width / maskCanvas.width;
        const scaleY = resultCanvas.height / maskCanvas.height;

        let bgR = 255, bgG = 255, bgB = 255;
        if (outputMode === 'color') {
          const hex = bgColor.replace('#', '');
          bgR = parseInt(hex.substring(0, 2), 16);
          bgG = parseInt(hex.substring(2, 4), 16);
          bgB = parseInt(hex.substring(4, 6), 16);
        }

        for (let my = 0; my < maskCanvas.height; my++) {
          for (let mx = 0; mx < maskCanvas.width; mx++) {
            const maskIdx = (my * maskCanvas.width + mx) * 4;
            if (maskData.data[maskIdx + 3] > 0) {
              const rx = Math.round(mx * scaleX);
              const ry = Math.round(my * scaleY);
              const rw = Math.ceil(scaleX);
              const rh = Math.ceil(scaleY);

              for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                  const px = rx + dx;
                  const py = ry + dy;
                  if (px < resultCanvas.width && py < resultCanvas.height) {
                    const rIdx = (py * resultCanvas.width + px) * 4;
                    if (outputMode === 'transparent') {
                      resultData.data[rIdx + 3] = 0;
                    } else {
                      resultData.data[rIdx] = bgR;
                      resultData.data[rIdx + 1] = bgG;
                      resultData.data[rIdx + 2] = bgB;
                      resultData.data[rIdx + 3] = 255;
                    }
                  }
                }
              }
            }
          }
        }

        resultCtx.putImageData(resultData, 0, 0);
        return resultCanvas.toDataURL('image/png', 1.0);
      };

      // If there's already a result, apply erase on top of it
      if (resultDataUrl) {
        const tempImg = new Image();
        tempImg.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = tempImg.naturalWidth;
          tempCanvas.height = tempImg.naturalHeight;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(tempImg, 0, 0);
          const newUrl = applyErase(tempCanvas);
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          setState(s => ({ ...s, resultDataUrl: newUrl, hasMaskStrokes: false }));
        };
        tempImg.src = resultDataUrl;
        // Return unchanged state for now; async update will follow
        return prev;
      } else {
        const newUrl = applyErase(imageCanvas);
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        return { ...prev, resultDataUrl: newUrl, hasMaskStrokes: false };
      }
    });
  }, []);

  const applyCrop = useCallback((imageCanvas: HTMLCanvasElement, cropBox: CropBox): HTMLImageElement => {
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

  const reset = useCallback((maskCanvas?: HTMLCanvasElement | null) => {
    const mc = maskCanvas ?? maskCanvasRef.current;
    if (mc) {
      const ctx = mc.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, mc.width, mc.height);
    }
    imageRef.current = null;
    setState({
      imageDataUrl: null,
      resultDataUrl: null,
      brushState: DEFAULT_BRUSH,
      outputMode: 'transparent',
      bgColor: '#ffffff',
      zoom: 1,
      rotation: 0,
      cropBox: null,
      isProcessing: false,
      hasMaskStrokes: false,
    });
  }, []);

  const setResultDataUrl = useCallback((dataUrl: string | null) => {
    setState(prev => ({ ...prev, resultDataUrl: dataUrl }));
  }, []);

  return {
    state,
    imageCanvasRef,
    maskCanvasRef,
    resultCanvasRef,
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
  };
}
