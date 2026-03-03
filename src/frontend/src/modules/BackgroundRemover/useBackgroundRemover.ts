import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DisplaySize {
  width: number;
  height: number;
}

export type OutputMode = "transparent" | "color";

interface UseBackgroundRemoverReturn {
  originalDataUrl: string | null;
  resultDataUrl: string | null;
  isProcessing: boolean;
  outputMode: OutputMode;
  bgColor: string;
  zoom: number;
  rotation: number;
  cropMode: boolean;
  cropBox: CropBox | null;
  brushActive: boolean;
  brushSize: number;
  brushMode: "paint" | "erase";
  hasMaskStrokes: boolean;
  displaySize: DisplaySize | null;
  setOutputMode: (mode: OutputMode) => void;
  setBgColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotation: number) => void;
  setCropMode: (mode: boolean) => void;
  setCropBox: (box: CropBox) => void;
  setBrushActive: (active: boolean) => void;
  setBrushSize: (size: number) => void;
  setBrushMode: (mode: "paint" | "erase") => void;
  loadImage: (file: File) => void;
  removeBackground: () => void;
  autoDetectBackground: () => void;
  applyCrop: () => void;
  processManualErase: () => void;
  reset: () => void;
  setResultDataUrl: (url: string) => void;
  drawImageToCanvas: () => void;
  drawMaskToCanvas: () => void;
  clearMask: () => void;
  undoLastStroke: () => void;
}

export function useBackgroundRemover(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  maskCanvasRef: RefObject<HTMLCanvasElement | null>,
): UseBackgroundRemoverReturn {
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputMode, setOutputMode] = useState<OutputMode>("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [brushActive, setBrushActive] = useState(false);
  // Default brush size 20px — within the new 4–100 range
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");
  const [hasMaskStrokes, setHasMaskStrokes] = useState(false);
  const [displaySize, setDisplaySize] = useState<DisplaySize | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const maskHistoryRef = useRef<ImageData[]>([]);
  // Stores the computed display dimensions for the pending draw after canvas mounts
  const pendingDrawDimsRef = useRef<{ w: number; h: number } | null>(null);

  const drawImageToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxDim = 600;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const scaledW = Math.round(w * zoom);
    const scaledH = Math.round(h * zoom);

    canvas.width = scaledW;
    canvas.height = scaledH;

    ctx.save();
    ctx.translate(scaledW / 2, scaledH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
    ctx.restore();

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = scaledW;
      maskCanvas.height = scaledH;
      maskCanvas.style.width = canvas.style.width;
      maskCanvas.style.height = canvas.style.height;
    }
  }, [canvasRef, maskCanvasRef, zoom, rotation]);

  // drawMaskToCanvas checks whether any painted pixels exist and updates hasMaskStrokes.
  // This is called only at the END of a stroke (mouseup/touchend) to avoid triggering
  // React state updates (and re-renders) during active painting, which would cause jitter.
  const drawMaskToCanvas = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const hasStrokes = data.data.some((v, i) => i % 4 === 3 && v > 0);
    setHasMaskStrokes(hasStrokes);
  }, [maskCanvasRef]);

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskHistoryRef.current = [];
    setHasMaskStrokes(false);
  }, [maskCanvasRef]);

  const undoLastStroke = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    const history = maskHistoryRef.current;
    if (history.length === 0) {
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      setHasMaskStrokes(false);
      return;
    }
    const prev = history.pop()!;
    ctx.putImageData(prev, 0, 0);
    maskHistoryRef.current = history;
    drawMaskToCanvas();
  }, [maskCanvasRef, drawMaskToCanvas]);

  const loadImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;

        const maxDim = 600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        // Store pending draw dimensions so the component's useEffect can
        // draw to the canvas after it mounts (canvasRef may be null here
        // because the canvas is conditionally rendered based on originalDataUrl).
        pendingDrawDimsRef.current = { w, h };

        setDisplaySize({ width: w, height: h });
        setResultDataUrl(null);
        setHasMaskStrokes(false);
        maskHistoryRef.current = [];
        setCropBox(null);
        setCropMode(false);
        setBrushActive(false);
        setZoom(1);
        setRotation(0);
        // Setting originalDataUrl last triggers the re-render that mounts the canvas.
        setOriginalDataUrl(url);
      };
      img.onerror = () => {
        // Failed to load image — silently ignore
      };
      img.src = url;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Re-draw when zoom or rotation changes (image already loaded)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reacting to zoom/rotation changes
  useEffect(() => {
    if (imageRef.current && originalDataUrl) {
      drawImageToCanvas();
    }
  }, [zoom, rotation]);

  const removeBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const getIdx = (x: number, y: number) => (y * width + x) * 4;
        const pixelIdx = (x: number, y: number) => y * width + x;

        const cornerColors: number[][] = [];
        const corners = [
          [0, 0],
          [width - 1, 0],
          [0, height - 1],
          [width - 1, height - 1],
          [Math.floor(width / 2), 0],
          [0, Math.floor(height / 2)],
        ];
        for (const [cx, cy] of corners) {
          const i = getIdx(cx, cy);
          cornerColors.push([data[i], data[i + 1], data[i + 2]]);
        }

        const avgBg = cornerColors
          .reduce(
            (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
            [0, 0, 0],
          )
          .map((v) => v / cornerColors.length);

        const colorDist = (r: number, g: number, b: number) =>
          Math.sqrt(
            (r - avgBg[0]) ** 2 + (g - avgBg[1]) ** 2 + (b - avgBg[2]) ** 2,
          );

        const threshold = 60;

        for (let x = 0; x < width; x++) {
          for (const y of [0, height - 1]) {
            const i = getIdx(x, y);
            if (
              !visited[pixelIdx(x, y)] &&
              colorDist(data[i], data[i + 1], data[i + 2]) < threshold
            ) {
              queue.push(pixelIdx(x, y));
              visited[pixelIdx(x, y)] = 1;
            }
          }
        }
        for (let y = 0; y < height; y++) {
          for (const x of [0, width - 1]) {
            const i = getIdx(x, y);
            if (
              !visited[pixelIdx(x, y)] &&
              colorDist(data[i], data[i + 1], data[i + 2]) < threshold
            ) {
              queue.push(pixelIdx(x, y));
              visited[pixelIdx(x, y)] = 1;
            }
          }
        }

        while (queue.length > 0) {
          const idx = queue.shift()!;
          const x = idx % width;
          const y = Math.floor(idx / width);
          const i = getIdx(x, y);

          if (outputMode === "transparent") {
            data[i + 3] = 0;
          } else {
            const hex = bgColor.replace("#", "");
            data[i] = Number.parseInt(hex.slice(0, 2), 16);
            data[i + 1] = Number.parseInt(hex.slice(2, 4), 16);
            data[i + 2] = Number.parseInt(hex.slice(4, 6), 16);
          }

          const neighbors = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const ni = getIdx(nx, ny);
            if (
              !visited[pixelIdx(nx, ny)] &&
              colorDist(data[ni], data[ni + 1], data[ni + 2]) < threshold
            ) {
              visited[pixelIdx(nx, ny)] = 1;
              queue.push(pixelIdx(nx, ny));
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const result = canvas.toDataURL("image/png");
        setResultDataUrl(result);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  }, [canvasRef, outputMode, bgColor]);

  const autoDetectBackground = useCallback(() => {
    removeBackground();
  }, [removeBackground]);

  const applyCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cropBox) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = canvas.width / (displaySize?.width ?? canvas.width);
    const scaleY = canvas.height / (displaySize?.height ?? canvas.height);

    const sx = Math.round(cropBox.x * scaleX);
    const sy = Math.round(cropBox.y * scaleY);
    const sw = Math.round(cropBox.w * scaleX);
    const sh = Math.round(cropBox.h * scaleY);

    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(tempCanvas, 0, 0);

    setDisplaySize({ width: sw, height: sh });

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.width = sw;
      maskCanvas.height = sh;
    }

    setCropMode(false);
    setCropBox(null);
  }, [canvasRef, maskCanvasRef, cropBox, displaySize]);

  const processManualErase = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!ctx || !maskCtx) return;

    // Save snapshot for undo before applying the erase
    maskHistoryRef.current.push(
      maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height),
    );

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
    );

    for (let i = 0; i < imageData.data.length; i += 4) {
      const maskAlpha = maskData.data[i + 3];
      if (maskAlpha > 0) {
        if (outputMode === "transparent") {
          imageData.data[i + 3] = 0;
        } else {
          const hex = bgColor.replace("#", "");
          imageData.data[i] = Number.parseInt(hex.slice(0, 2), 16);
          imageData.data[i + 1] = Number.parseInt(hex.slice(2, 4), 16);
          imageData.data[i + 2] = Number.parseInt(hex.slice(4, 6), 16);
          imageData.data[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setHasMaskStrokes(false);

    const result = canvas.toDataURL("image/png");
    setResultDataUrl(result);
  }, [canvasRef, maskCanvasRef, outputMode, bgColor]);

  const reset = useCallback(() => {
    setOriginalDataUrl(null);
    setResultDataUrl(null);
    setIsProcessing(false);
    setZoom(1);
    setRotation(0);
    setCropMode(false);
    setCropBox(null);
    setBrushActive(false);
    setHasMaskStrokes(false);
    setDisplaySize(null);
    maskHistoryRef.current = [];
    imageRef.current = null;
    pendingDrawDimsRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d");
      ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  }, [canvasRef, maskCanvasRef]);

  return {
    originalDataUrl,
    resultDataUrl,
    isProcessing,
    outputMode,
    bgColor,
    zoom,
    rotation,
    cropMode,
    cropBox,
    brushActive,
    brushSize,
    brushMode,
    hasMaskStrokes,
    displaySize,
    setOutputMode,
    setBgColor,
    setZoom,
    setRotation,
    setCropMode,
    setCropBox,
    setBrushActive,
    setBrushSize,
    setBrushMode,
    loadImage,
    removeBackground,
    autoDetectBackground,
    applyCrop,
    processManualErase,
    reset,
    setResultDataUrl,
    drawImageToCanvas,
    drawMaskToCanvas,
    clearMask,
    undoLastStroke,
  };
}
