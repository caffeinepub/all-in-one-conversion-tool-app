import { useRef, useState, useCallback } from 'react';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  shadow: boolean;
  outline: boolean;
}

export interface ImageState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  filter: string | null;
  cropRect: { x: number; y: number; w: number; h: number } | null;
}

const DEFAULT_STATE: ImageState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  filter: null,
  cropRect: null,
};

export function useImageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageState, setImageState] = useState<ImageState>(DEFAULT_STATE);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [history, setHistory] = useState<ImageState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const loadImage = useCallback((src: string) => {
    const img = new window.Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageState(DEFAULT_STATE);
      setTextLayers([]);
      setHistory([DEFAULT_STATE]);
      setHistoryIndex(0);
    };
    img.src = src;
  }, []);

  const pushHistory = useCallback((state: ImageState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updateState = useCallback((updates: Partial<ImageState>) => {
    setImageState(prev => {
      const next = { ...prev, ...updates };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setImageState(history[newIndex]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setImageState(history[newIndex]);
    }
  }, [historyIndex, history]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { brightness, contrast, saturation, rotation, flipH, flipV, filter, cropRect } = imageState;

    let srcX = 0, srcY = 0, srcW = originalImage.width, srcH = originalImage.height;
    if (cropRect) {
      srcX = cropRect.x;
      srcY = cropRect.y;
      srcW = cropRect.w;
      srcH = cropRect.h;
    }

    const isRotated90 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90 ? srcH : srcW;
    canvas.height = isRotated90 ? srcW : srcH;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Build CSS filter string
    const b = 1 + brightness / 100;
    const c = 1 + contrast / 100;
    const s = 1 + saturation / 100;
    let filterStr = `brightness(${b}) contrast(${c}) saturate(${s})`;

    if (filter === 'vintage') {
      filterStr += ' sepia(0.5) contrast(1.1) brightness(0.95)';
    } else if (filter === 'bw') {
      filterStr += ' grayscale(1)';
    } else if (filter === 'hdr') {
      filterStr += ' contrast(1.4) saturate(1.5) brightness(1.05)';
    } else if (filter === 'cinematic') {
      filterStr += ' contrast(1.2) saturate(0.8) brightness(0.9) sepia(0.15)';
    } else if (filter === 'cool') {
      filterStr += ' hue-rotate(30deg) saturate(1.2)';
    } else if (filter === 'warm') {
      filterStr += ' hue-rotate(-20deg) saturate(1.3) brightness(1.05)';
    }

    ctx.filter = filterStr;
    ctx.drawImage(originalImage, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    // Draw text layers
    textLayers.forEach(layer => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (layer.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      if (layer.outline) {
        ctx.strokeStyle = layer.color === '#ffffff' ? '#000000' : '#ffffff';
        ctx.lineWidth = Math.max(1, layer.fontSize / 20);
        ctx.strokeText(layer.text, 0, 0);
      }

      ctx.fillText(layer.text, 0, 0);
      ctx.restore();
    });
  }, [originalImage, imageState, textLayers]);

  const exportImage = useCallback((format: string, quality: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    return canvas.toDataURL(mimeType, quality / 100);
  }, []);

  const addTextLayer = useCallback((layer: Omit<TextLayer, 'id'>) => {
    const newLayer: TextLayer = { ...layer, id: Date.now().toString() };
    setTextLayers(prev => [...prev, newLayer]);
  }, []);

  const updateTextLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const removeTextLayer = useCallback((id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id));
  }, []);

  return {
    canvasRef,
    originalImage,
    imageState,
    textLayers,
    loadImage,
    updateState,
    renderCanvas,
    exportImage,
    addTextLayer,
    updateTextLayer,
    removeTextLayer,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
