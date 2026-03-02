import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Sun,
  Contrast,
  Type,
  Download,
  FileText,
  RotateCcw,
  Crop,
  Check,
  Loader2,
  FolderOpen,
  ScanLine,
  FilePlus,
  Images,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageAdjustments {
  brightness: number;
  contrast: number;
  darkenText: boolean;
}

interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  cropRegion: CropRegion | null;
  adjustments: PageAdjustments;
}

type CropMode = 'auto' | 'manual';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyAdjustmentsToCanvas(
  sourceDataUrl: string,
  cropRegion: CropRegion | null,
  adjustments: PageAdjustments
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcX = cropRegion ? cropRegion.x : 0;
      const srcY = cropRegion ? cropRegion.y : 0;
      const srcW = cropRegion ? cropRegion.width : img.width;
      const srcH = cropRegion ? cropRegion.height : img.height;
      const canvas = document.createElement('canvas');
      canvas.width = srcW;
      canvas.height = srcH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const imageData = ctx.getImageData(0, 0, srcW, srcH);
      const data = imageData.data;
      const brightness = adjustments.brightness;
      const contrast = adjustments.contrast;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        r = Math.min(255, Math.max(0, r + brightness));
        g = Math.min(255, Math.max(0, g + brightness));
        b = Math.min(255, Math.max(0, b + brightness));
        r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
        g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
        b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
        if (adjustments.darkenText) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = gray < 128 ? 0 : 255;
          r = val; g = val; b = val;
        }
        data[i] = r; data[i + 1] = g; data[i + 2] = b;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = sourceDataUrl;
  });
}

function autoDetectCrop(dataUrl: string): Promise<CropRegion> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Canvas-based edge detection: sample rows/cols for contrast boundaries
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Convert to grayscale and find edges
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = Math.round(
          0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
        );
      }

      // Find bounding box of high-contrast region
      const threshold = 30;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let found = false;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const dx = Math.abs(gray[idx + 1] - gray[idx - 1]);
          const dy = Math.abs(gray[idx + w] - gray[idx - w]);
          if (dx + dy > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }

      if (!found || maxX - minX < w * 0.1 || maxY - minY < h * 0.1) {
        // Fallback: use 5% margin
        const margin = Math.min(img.width, img.height) * 0.05;
        resolve({
          x: Math.round(margin),
          y: Math.round(margin),
          width: Math.round(img.width - margin * 2),
          height: Math.round(img.height - margin * 2),
        });
        return;
      }

      // Add a small padding around detected region
      const pad = 5;
      const rx = Math.max(0, (minX - pad) / scale);
      const ry = Math.max(0, (minY - pad) / scale);
      const rw = Math.min(img.width - rx, (maxX - minX + pad * 2) / scale);
      const rh = Math.min(img.height - ry, (maxY - minY + pad * 2) / scale);

      resolve({
        x: Math.round(rx),
        y: Math.round(ry),
        width: Math.round(rw),
        height: Math.round(rh),
      });
    };
    img.onerror = () => {
      resolve({ x: 0, y: 0, width: 100, height: 100 });
    };
    img.src = dataUrl;
  });
}

function getImageNaturalDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

async function loadPDFLibForScanner(): Promise<void> {
  const w = window as unknown as Record<string, unknown>;
  if (w.PDFLib) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pdf-lib'));
    document.head.appendChild(script);
  });
}

async function loadPDFJSForScanner(): Promise<void> {
  const w = window as unknown as Record<string, unknown>;
  if (w.pdfjsLib) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const lib = (window as unknown as Record<string, unknown>).pdfjsLib as {
        GlobalWorkerOptions: { workerSrc: string };
      };
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      } else {
        reject(new Error('pdfjsLib not found after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

// ─── Crop Overlay ─────────────────────────────────────────────────────────────

interface CropOverlayProps {
  crop: CropRegion;
  originalDataUrl: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onCropChange: (crop: CropRegion) => void;
  cropMode: CropMode;
}

function CropOverlay({
  crop,
  originalDataUrl,
  containerRef,
  onCropChange,
  cropMode,
}: CropOverlayProps) {
  const [imgDims, setImgDims] = useState({ width: 1, height: 1 });
  const [displayDims, setDisplayDims] = useState({ width: 1, height: 1 });
  const draggingRef = useRef<{
    corner: string;
    startX: number;
    startY: number;
    startCrop: CropRegion;
  } | null>(null);

  useEffect(() => {
    getImageNaturalDims(originalDataUrl).then(setImgDims);
  }, [originalDataUrl]);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDisplayDims({ width: rect.width, height: rect.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [containerRef]);

  const scaleX = displayDims.width / imgDims.width;
  const scaleY = displayDims.height / imgDims.height;
  const cx = crop.x * scaleX;
  const cy = crop.y * scaleY;
  const cw = crop.width * scaleX;
  const ch = crop.height * scaleY;

  const handleMouseDown = useCallback(
    (corner: string, e: React.MouseEvent) => {
      if (cropMode !== 'manual') return;
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = {
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...crop },
      };

      const handleMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const dx = (ev.clientX - draggingRef.current.startX) / scaleX;
        const dy = (ev.clientY - draggingRef.current.startY) / scaleY;
        const sc = draggingRef.current.startCrop;
        let { x, y, width, height } = sc;
        const min = 20;
        if (corner === 'tl') {
          x = Math.min(sc.x + dx, sc.x + sc.width - min);
          y = Math.min(sc.y + dy, sc.y + sc.height - min);
          width = sc.width - (x - sc.x);
          height = sc.height - (y - sc.y);
        } else if (corner === 'tr') {
          y = Math.min(sc.y + dy, sc.y + sc.height - min);
          width = Math.max(sc.width + dx, min);
          height = sc.height - (y - sc.y);
        } else if (corner === 'bl') {
          x = Math.min(sc.x + dx, sc.x + sc.width - min);
          width = sc.width - (x - sc.x);
          height = Math.max(sc.height + dy, min);
        } else if (corner === 'br') {
          width = Math.max(sc.width + dx, min);
          height = Math.max(sc.height + dy, min);
        }
        x = Math.max(0, Math.min(x, imgDims.width - min));
        y = Math.max(0, Math.min(y, imgDims.height - min));
        width = Math.min(width, imgDims.width - x);
        height = Math.min(height, imgDims.height - y);
        onCropChange({ x, y, width, height });
      };

      const handleUp = () => {
        draggingRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [crop, cropMode, scaleX, scaleY, imgDims, onCropChange]
  );

  // Touch support for mobile
  const handleTouchStart = useCallback(
    (corner: string, e: React.TouchEvent) => {
      if (cropMode !== 'manual') return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      draggingRef.current = {
        corner,
        startX: touch.clientX,
        startY: touch.clientY,
        startCrop: { ...crop },
      };

      const handleTouchMove = (ev: TouchEvent) => {
        if (!draggingRef.current) return;
        const t = ev.touches[0];
        const dx = (t.clientX - draggingRef.current.startX) / scaleX;
        const dy = (t.clientY - draggingRef.current.startY) / scaleY;
        const sc = draggingRef.current.startCrop;
        let { x, y, width, height } = sc;
        const min = 20;
        if (corner === 'tl') {
          x = Math.min(sc.x + dx, sc.x + sc.width - min);
          y = Math.min(sc.y + dy, sc.y + sc.height - min);
          width = sc.width - (x - sc.x);
          height = sc.height - (y - sc.y);
        } else if (corner === 'tr') {
          y = Math.min(sc.y + dy, sc.y + sc.height - min);
          width = Math.max(sc.width + dx, min);
          height = sc.height - (y - sc.y);
        } else if (corner === 'bl') {
          x = Math.min(sc.x + dx, sc.x + sc.width - min);
          width = sc.width - (x - sc.x);
          height = Math.max(sc.height + dy, min);
        } else if (corner === 'br') {
          width = Math.max(sc.width + dx, min);
          height = Math.max(sc.height + dy, min);
        }
        x = Math.max(0, Math.min(x, imgDims.width - min));
        y = Math.max(0, Math.min(y, imgDims.height - min));
        width = Math.min(width, imgDims.width - x);
        height = Math.min(height, imgDims.height - y);
        onCropChange({ x, y, width, height });
      };

      const handleTouchEnd = () => {
        draggingRef.current = null;
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    },
    [crop, cropMode, scaleX, scaleY, imgDims, onCropChange]
  );

  const handles: Array<{ corner: string; style: React.CSSProperties }> = [
    { corner: 'tl', style: { left: cx - 10, top: cy - 10 } },
    { corner: 'tr', style: { left: cx + cw - 10, top: cy - 10 } },
    { corner: 'bl', style: { left: cx - 10, top: cy + ch - 10 } },
    { corner: 'br', style: { left: cx + cw - 10, top: cy + ch - 10 } },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="scanner-crop-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={cx} y={cy} width={cw} height={ch} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.45)"
          mask="url(#scanner-crop-mask)"
        />
        <rect
          x={cx}
          y={cy}
          width={cw}
          height={ch}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeDasharray="6 3"
        />
        {/* Rule of thirds lines */}
        <line
          x1={cx + cw / 3} y1={cy}
          x2={cx + cw / 3} y2={cy + ch}
          stroke="#2dd4bf" strokeWidth="0.5" strokeOpacity="0.5"
        />
        <line
          x1={cx + (cw * 2) / 3} y1={cy}
          x2={cx + (cw * 2) / 3} y2={cy + ch}
          stroke="#2dd4bf" strokeWidth="0.5" strokeOpacity="0.5"
        />
        <line
          x1={cx} y1={cy + ch / 3}
          x2={cx + cw} y2={cy + ch / 3}
          stroke="#2dd4bf" strokeWidth="0.5" strokeOpacity="0.5"
        />
        <line
          x1={cx} y1={cy + (ch * 2) / 3}
          x2={cx + cw} y2={cy + (ch * 2) / 3}
          stroke="#2dd4bf" strokeWidth="0.5" strokeOpacity="0.5"
        />
      </svg>
      {cropMode === 'manual' &&
        handles.map(({ corner, style }) => (
          <div
            key={corner}
            className="absolute w-5 h-5 rounded-sm bg-teal-400 border-2 border-white cursor-pointer z-10 shadow-md"
            style={{ ...style, pointerEvents: 'all' }}
            onMouseDown={(e) => handleMouseDown(corner, e)}
            onTouchStart={(e) => handleTouchStart(corner, e)}
          />
        ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PDFScanner() {
  // Scanner state
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<CropMode>('auto');
  const [pendingCrop, setPendingCrop] = useState<CropRegion | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState('scanned-document.pdf');
  const [isMobile, setIsMobile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);

  const cropOverlayRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPage = scannedPages.find((p) => p.id === selectedPageId) ?? null;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Update preview when selected page or pending crop changes
  useEffect(() => {
    if (!selectedPage) {
      setPreviewDataUrl(null);
      return;
    }
    const crop = pendingCrop ?? selectedPage.cropRegion;
    applyAdjustmentsToCanvas(
      selectedPage.originalDataUrl,
      crop,
      selectedPage.adjustments
    ).then(setPreviewDataUrl);
  }, [selectedPage, pendingCrop]);

  // ── Choose from Files ──────────────────────────────────────────────────────

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const processImageFile = (file: File): Promise<ScannedPage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const id = `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const defaultAdj: PageAdjustments = { brightness: 0, contrast: 0, darkenText: false };
        resolve({
          id,
          originalDataUrl: dataUrl,
          processedDataUrl: dataUrl,
          cropRegion: null,
          adjustments: defaultAdj,
        });
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const processPDFFile = async (file: File): Promise<ScannedPage[]> => {
    await loadPDFJSForScanner();
    const pdfjsLib = (window as unknown as Record<string, unknown>).pdfjsLib as {
      getDocument: (src: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (n: number) => Promise<{
            getViewport: (opts: { scale: number }) => { width: number; height: number };
            render: (ctx: {
              canvasContext: CanvasRenderingContext2D;
              viewport: unknown;
            }) => { promise: Promise<void> };
          }>;
        }>;
      };
    };

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: ScannedPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const id = `page-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      const defaultAdj: PageAdjustments = { brightness: 0, contrast: 0, darkenText: false };
      pages.push({
        id,
        originalDataUrl: dataUrl,
        processedDataUrl: dataUrl,
        cropRegion: null,
        adjustments: defaultAdj,
      });
    }
    return pages;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsImporting(true);
    setPdfBlob(null);

    try {
      const newPages: ScannedPage[] = [];
      for (const file of files) {
        if (file.type === 'application/pdf') {
          const pdfPages = await processPDFFile(file);
          newPages.push(...pdfPages);
        } else {
          const page = await processImageFile(file);
          newPages.push(page);
        }
      }

      // Auto-detect crop for each new page
      const pagesWithCrop = await Promise.all(
        newPages.map(async (page) => {
          try {
            const crop = await autoDetectCrop(page.originalDataUrl);
            const processed = await applyAdjustmentsToCanvas(
              page.originalDataUrl,
              crop,
              page.adjustments
            );
            return { ...page, cropRegion: crop, processedDataUrl: processed };
          } catch {
            return page;
          }
        })
      );

      setScannedPages((prev) => [...prev, ...pagesWithCrop]);

      if (pagesWithCrop.length > 0) {
        const firstNewId = pagesWithCrop[0].id;
        setSelectedPageId(firstNewId);
        setPendingCrop(pagesWithCrop[0].cropRegion);
        toast.success(
          `${pagesWithCrop.length} page${pagesWithCrop.length > 1 ? 's' : ''} imported`
        );
      }
    } catch (err) {
      toast.error(
        'Failed to import files: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setIsImporting(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Page selection ─────────────────────────────────────────────────────────

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const page = scannedPages.find((p) => p.id === id);
    if (page) {
      setPendingCrop(page.cropRegion);
    }
  };

  const handleRemovePage = (id: string) => {
    const remaining = scannedPages.filter((p) => p.id !== id);
    setScannedPages(remaining);
    if (selectedPageId === id) {
      setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
      setPendingCrop(remaining.length > 0 ? remaining[0].cropRegion : null);
    }
    setPdfBlob(null);
  };

  // ── Crop actions ───────────────────────────────────────────────────────────

  const handleCropChange = (crop: CropRegion) => {
    setPendingCrop(crop);
  };

  const handleApplyCrop = async () => {
    if (!selectedPage || !pendingCrop) return;
    setIsApplyingCrop(true);
    try {
      const processed = await applyAdjustmentsToCanvas(
        selectedPage.originalDataUrl,
        pendingCrop,
        selectedPage.adjustments
      );
      setScannedPages((prev) =>
        prev.map((p) =>
          p.id === selectedPage.id
            ? { ...p, cropRegion: pendingCrop, processedDataUrl: processed }
            : p
        )
      );
      setPdfBlob(null);
      toast.success('Crop applied');
    } finally {
      setIsApplyingCrop(false);
    }
  };

  const handleResetCrop = async () => {
    if (!selectedPage) return;
    const processed = await applyAdjustmentsToCanvas(
      selectedPage.originalDataUrl,
      null,
      selectedPage.adjustments
    );
    setScannedPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id
          ? { ...p, cropRegion: null, processedDataUrl: processed }
          : p
      )
    );
    setPendingCrop(null);
    setPdfBlob(null);
    toast.success('Crop reset');
  };

  const handleAutoDetectCrop = async () => {
    if (!selectedPage) return;
    try {
      const crop = await autoDetectCrop(selectedPage.originalDataUrl);
      setPendingCrop(crop);
      toast.success('Auto-detected document edges');
    } catch {
      toast.error('Auto-detection failed');
    }
  };

  // ── Adjustments ────────────────────────────────────────────────────────────

  const handleAdjustmentChange = async (
    field: keyof PageAdjustments,
    value: number | boolean
  ) => {
    if (!selectedPage) return;
    const newAdj = { ...selectedPage.adjustments, [field]: value };
    const crop = pendingCrop ?? selectedPage.cropRegion;
    const processed = await applyAdjustmentsToCanvas(
      selectedPage.originalDataUrl,
      crop,
      newAdj
    );
    setScannedPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id
          ? { ...p, adjustments: newAdj, processedDataUrl: processed }
          : p
      )
    );
    setPdfBlob(null);
  };

  // ── PDF Generation ─────────────────────────────────────────────────────────

  const handleConvertToPDF = async () => {
    if (scannedPages.length === 0) return;
    setIsGeneratingPDF(true);
    setPdfBlob(null);

    try {
      await loadPDFLibForScanner();
      const PDFLib = (window as unknown as Record<string, unknown>).PDFLib as {
        PDFDocument: {
          create: () => Promise<{
            addPage: (size: [number, number]) => {
              drawImage: (img: unknown, opts: unknown) => void;
              getSize: () => { width: number; height: number };
            };
            embedPng: (bytes: Uint8Array) => Promise<{ width: number; height: number }>;
            embedJpg: (bytes: Uint8Array) => Promise<{ width: number; height: number }>;
            save: () => Promise<Uint8Array>;
          }>;
        };
      };

      const pdfDoc = await PDFLib.PDFDocument.create();

      for (const page of scannedPages) {
        try {
          const crop = page.cropRegion;
          const dataUrl = await applyAdjustmentsToCanvas(
            page.originalDataUrl,
            crop,
            page.adjustments
          );

          // Convert data URL to bytes
          const base64 = dataUrl.split(',')[1];
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          let embeddedImage: { width: number; height: number };
          let pdfPage: ReturnType<typeof pdfDoc.addPage>;

          if (dataUrl.startsWith('data:image/png')) {
            embeddedImage = await pdfDoc.embedPng(bytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(bytes);
          }

          pdfPage = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
          const { width, height } = pdfPage.getSize();
          (pdfPage as unknown as { drawImage: (img: unknown, opts: unknown) => void }).drawImage(
            embeddedImage,
            { x: 0, y: 0, width, height }
          );
        } catch (err) {
          console.warn('Skipping page due to error:', err);
        }
      }

      const pdfBytes = await pdfDoc.save();
      // Fix: copy into a plain ArrayBuffer to satisfy Blob constructor type requirements
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      setPdfBlob(blob);
      toast.success('PDF generated successfully!');
    } catch (err) {
      toast.error(
        'PDF generation failed: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    let name = filename.trim() || 'scanned-document.pdf';
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasPages = scannedPages.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Import Section ── */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="w-5 h-5 text-teal-400" />
          <h3 className="font-semibold text-foreground text-base">Document Scanner</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Import images or PDF files. Each page will be automatically detected and cropped.
        </p>
        <button
          className="tool-btn w-full justify-center py-3 text-base font-semibold bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30 hover:border-teal-400/60"
          onClick={handleChooseFiles}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <FolderOpen className="w-5 h-5" />
              {isMobile
                ? 'Choose from Files (Google Files / Scanner)'
                : 'Choose from Files'}
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Accepts JPG, PNG, WEBP, PDF · Multiple files supported
        </p>
      </div>

      {/* ── Pages List ── */}
      {hasPages && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="w-4 h-4 text-teal-400" />
              <span className="font-semibold text-sm text-foreground">
                Scanned Pages ({scannedPages.length})
              </span>
            </div>
            <button
              className="tool-btn text-xs py-1 px-2"
              onClick={handleChooseFiles}
              disabled={isImporting}
            >
              <FilePlus className="w-3.5 h-3.5" />
              Add More
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {scannedPages.map((page, idx) => (
              <div
                key={page.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPageId === page.id
                    ? 'border-teal-400 shadow-lg shadow-teal-500/20'
                    : 'border-border/40 hover:border-teal-400/50'
                }`}
                style={{ width: 72, height: 90 }}
                onClick={() => handleSelectPage(page.id)}
              >
                <img
                  src={page.processedDataUrl}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5 font-medium">
                  {idx + 1}
                </div>
                <button
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/80 hover:bg-destructive text-white flex items-center justify-center z-10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePage(page.id);
                  }}
                  title="Remove page"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor Panel ── */}
      {selectedPage && (
        <>
          {/* Preview + Crop */}
          <div className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Crop className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-sm text-foreground">Crop & Preview</span>
              </div>
              {/* Crop mode toggle */}
              <div className="flex items-center gap-1 rounded-lg overflow-hidden border border-border/40 text-xs">
                <button
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    cropMode === 'auto'
                      ? 'bg-teal-500/30 text-teal-300'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setCropMode('auto')}
                >
                  Auto
                </button>
                <button
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    cropMode === 'manual'
                      ? 'bg-teal-500/30 text-teal-300'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setCropMode('manual')}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Image preview with crop overlay */}
            <div
              ref={cropOverlayRef}
              className="relative w-full rounded-lg overflow-hidden bg-black/20"
              style={{ minHeight: 200, maxHeight: 420 }}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{ display: 'block', maxHeight: 420 }}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing…
                </div>
              )}
              {(pendingCrop || selectedPage.cropRegion) && (
                <CropOverlay
                  crop={pendingCrop ?? selectedPage.cropRegion!}
                  originalDataUrl={selectedPage.originalDataUrl}
                  containerRef={cropOverlayRef as React.RefObject<HTMLDivElement>}
                  onCropChange={handleCropChange}
                  cropMode={cropMode}
                />
              )}
            </div>

            {cropMode === 'manual' && (
              <p className="text-xs text-muted-foreground text-center">
                Drag the corner handles to adjust the crop region
              </p>
            )}

            {/* Crop action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                className="tool-btn flex-1 justify-center"
                onClick={handleAutoDetectCrop}
                title="Re-run auto edge detection"
              >
                <ScanLine className="w-4 h-4" />
                Auto Detect
              </button>
              <button
                className="tool-btn flex-1 justify-center bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30"
                onClick={handleApplyCrop}
                disabled={isApplyingCrop || !pendingCrop}
              >
                {isApplyingCrop ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Apply Crop
              </button>
              <button
                className="tool-btn flex-1 justify-center"
                onClick={handleResetCrop}
                title="Reset to original uncropped image"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Adjustments */}
          <div className="glass-card p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-teal-400" />
              <span className="font-semibold text-sm text-foreground">Image Adjustments</span>
            </div>

            {/* Brightness */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Sun className="w-3.5 h-3.5" />
                  Brightness
                </Label>
                <span className="text-xs font-mono text-teal-400">
                  {selectedPage.adjustments.brightness > 0
                    ? `+${selectedPage.adjustments.brightness}`
                    : selectedPage.adjustments.brightness}
                </span>
              </div>
              <Slider
                min={-100}
                max={100}
                step={1}
                value={[selectedPage.adjustments.brightness]}
                onValueChange={([v]) => handleAdjustmentChange('brightness', v)}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Contrast className="w-3.5 h-3.5" />
                  Contrast
                </Label>
                <span className="text-xs font-mono text-teal-400">
                  {selectedPage.adjustments.contrast > 0
                    ? `+${selectedPage.adjustments.contrast}`
                    : selectedPage.adjustments.contrast}
                </span>
              </div>
              <Slider
                min={-100}
                max={100}
                step={1}
                value={[selectedPage.adjustments.contrast]}
                onValueChange={([v]) => handleAdjustmentChange('contrast', v)}
                className="w-full"
              />
            </div>

            {/* Darken Text */}
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background/20 px-3 py-2.5">
              <Label
                htmlFor="darken-text-toggle"
                className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
              >
                <Type className="w-4 h-4 text-teal-400" />
                Darken Text
                <span className="text-xs text-muted-foreground">(B&W threshold)</span>
              </Label>
              <Switch
                id="darken-text-toggle"
                checked={selectedPage.adjustments.darkenText}
                onCheckedChange={(v) => handleAdjustmentChange('darkenText', v)}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Export Section ── */}
      {hasPages && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-sm text-foreground">Export PDF</span>
          </div>

          {/* Filename input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pdf-filename" className="text-xs text-muted-foreground">
              Document Name
            </Label>
            <Input
              id="pdf-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="scanned-document.pdf"
              className="bg-background/30 border-border/40 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="tool-btn w-full justify-center py-2.5 font-semibold bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30 hover:border-teal-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConvertToPDF}
              disabled={isGeneratingPDF || scannedPages.length === 0}
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Convert to PDF ({scannedPages.length} page
                  {scannedPages.length !== 1 ? 's' : ''})
                </>
              )}
            </button>

            {pdfBlob && (
              <button
                className="tool-btn w-full justify-center py-2.5 font-semibold bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30 hover:border-green-400/60"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}
          </div>

          {pdfBlob && (
            <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" />
              PDF ready · {(pdfBlob.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasPages && !isImporting && (
        <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <ScanLine className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">No pages yet</p>
            <p className="text-sm text-muted-foreground">
              Click "Choose from Files" above to import images or PDF files.
              <br />
              Each page will be automatically scanned and cropped.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
