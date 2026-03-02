import { useState, useCallback } from 'react';

declare global {
  interface Window {
    PDFLib: {
      PDFDocument: {
        create(): Promise<PDFDocumentProxy>;
        load(bytes: Uint8Array): Promise<PDFDocumentProxy>;
      };
    };
  }
}

interface PDFDocumentProxy {
  getPageCount(): number;
  getPages(): PDFPageProxy[];
  addPage(sizeOrPage?: PDFPageProxy | [number, number]): PDFPageProxy;
  copyPages(src: PDFDocumentProxy, indices: number[]): Promise<PDFPageProxy[]>;
  embedJpg(bytes: Uint8Array): Promise<PDFImageProxy>;
  embedPng(bytes: Uint8Array): Promise<PDFImageProxy>;
  save(): Promise<Uint8Array>;
  removePage(index: number): void;
}

interface PDFPageProxy {
  getSize(): { width: number; height: number };
  drawImage(image: PDFImageProxy, options: {
    x: number; y: number; width: number; height: number;
  }): void;
}

interface PDFImageProxy {
  width: number;
  height: number;
}

export interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  fileType: 'pdf' | 'image';
  bytes?: Uint8Array;
}

export interface SplitResult {
  filename: string;
  bytes: Uint8Array;
  data: Uint8Array;
}

/** A single page entry in the Merge/Split page explorer */
export interface MergeSplitEntry {
  id: string;
  type: 'pdf-page' | 'image';
  /** Source file reference */
  sourceFile: File;
  /** Source file bytes (for PDFs) */
  sourceBytes?: Uint8Array;
  /** 1-indexed page number (for pdf-page entries) */
  pageNumber?: number;
  /** Display name */
  label: string;
  /** Data URL for thumbnail preview */
  thumbnailDataUrl: string | null;
  /** Whether this entry is loading its thumbnail */
  thumbnailLoading: boolean;
  /** Thumbnail render error */
  thumbnailError: string | null;
  /** Whether this entry is marked for removal */
  removed: boolean;
}

export interface UsePDFOperationsReturn {
  files: PDFFile[];
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  isConverting: boolean;
  convertedPdfData: Uint8Array | null;
  error: string | null;
  lastMergeResult: Uint8Array | null;
  lastSplitResults: SplitResult[] | null;
  lastCreatedPDF: Uint8Array | null;
  addFiles: (files: File[]) => void;
  addPDFs: (files: File[]) => void;
  removeFile: (id: string) => void;
  removePDF: (id: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  mergePDFs: () => Promise<void>;
  splitPDF: () => Promise<void>;
  removePages: (fileId: string, pageIndices: number[]) => Promise<void>;
  createPDFFromImages: (imageFiles: File[], options?: { enhance?: boolean; compress?: boolean }) => Promise<void>;
  convertAndMergeAll: () => Promise<void>;
  clearConvertedPdf: () => void;
  // Merge/Split page explorer
  mergeSplitEntries: MergeSplitEntry[];
  isMerging: boolean;
  mergeError: string | null;
  addMergeSplitFiles: (files: File[]) => Promise<void>;
  togglePageRemoval: (entryId: string) => void;
  mergeAndDownload: () => Promise<void>;
  clearMergeSplitEntries: () => void;
}

async function loadPDFLib(): Promise<void> {
  if (window.PDFLib) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pdf-lib'));
    document.head.appendChild(script);
  });
}

function loadPDFJS(): Promise<typeof import('pdfjs-dist')> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w.pdfjsLib) {
      resolve(w.pdfjsLib as typeof import('pdfjs-dist'));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const lib = w.pdfjsLib as typeof import('pdfjs-dist');
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('pdfjsLib not found after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

async function getPageCount(file: File): Promise<number> {
  try {
    await loadPDFLib();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function isImageFile(file: File): boolean {
  if (IMAGE_MIME_TYPES.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function imageFileToJpegBytes(file: File): Promise<{ bytes: Uint8Array; width: number; height: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const quality = isPng ? undefined : 0.92;

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Blob creation failed')); return; }
        blob.arrayBuffer().then(ab => resolve({
          bytes: new Uint8Array(ab),
          width: img.naturalWidth,
          height: img.naturalHeight,
          isPng,
        }));
      }, mimeType, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}

async function renderPDFPageThumbnail(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale = 0.3
): Promise<string> {
  const pdfjsLib = await loadPDFJS();
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function getImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function usePDFOperations(): UsePDFOperationsReturn {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPdfData, setConvertedPdfData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMergeResult, setLastMergeResult] = useState<Uint8Array | null>(null);
  const [lastSplitResults, setLastSplitResults] = useState<SplitResult[] | null>(null);
  const [lastCreatedPDF, setLastCreatedPDF] = useState<Uint8Array | null>(null);

  // Merge/Split page explorer state
  const [mergeSplitEntries, setMergeSplitEntries] = useState<MergeSplitEntry[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const accepted = newFiles.filter(f => isPDFFile(f) || isImageFile(f));
    const withMeta = await Promise.all(
      accepted.map(async (file) => {
        if (isPDFFile(file)) {
          const pageCount = await getPageCount(file);
          const bytes = new Uint8Array(await file.arrayBuffer());
          return {
            id: `${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            size: file.size,
            pageCount,
            fileType: 'pdf' as const,
            bytes,
          };
        } else {
          return {
            id: `${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            size: file.size,
            pageCount: 1,
            fileType: 'image' as const,
          };
        }
      })
    );
    setFiles(prev => [...prev, ...withMeta]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
  }, []);

  const mergePDFs = useCallback(async () => {
    const pdfOnlyFiles = files.filter(f => f.fileType === 'pdf');
    if (pdfOnlyFiles.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const mergedDoc = await window.PDFLib.PDFDocument.create();

      for (const pdfFile of pdfOnlyFiles) {
        const bytes = pdfFile.bytes ?? new Uint8Array(await pdfFile.file.arrayBuffer());
        const srcDoc = await window.PDFLib.PDFDocument.load(bytes);
        const pageCount = srcDoc.getPageCount();
        const indices = Array.from({ length: pageCount }, (_, i) => i);
        const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
        copiedPages.forEach(page => mergedDoc.addPage(page));
      }

      const mergedBytes = await mergedDoc.save();
      setLastMergeResult(mergedBytes);
      downloadPDF(mergedBytes, 'merged.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  const splitPDF = useCallback(async () => {
    const pdfOnlyFiles = files.filter(f => f.fileType === 'pdf');
    if (pdfOnlyFiles.length === 0) {
      setError('Please add a PDF file to split.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const bytes = pdfOnlyFiles[0].bytes ?? new Uint8Array(await pdfOnlyFiles[0].file.arrayBuffer());
      const srcDoc = await window.PDFLib.PDFDocument.load(bytes);
      const pageCount = srcDoc.getPageCount();
      const results: SplitResult[] = [];

      for (let i = 0; i < pageCount; i++) {
        const newDoc = await window.PDFLib.PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(copiedPage);
        const pageBytes = await newDoc.save();
        const baseName = pdfOnlyFiles[0].name.replace(/\.pdf$/i, '');
        const filename = `${baseName}-page-${i + 1}.pdf`;
        results.push({ filename, bytes: pageBytes, data: pageBytes });
        downloadPDF(pageBytes, filename);
      }

      setLastSplitResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  const removePages = useCallback(async (fileId: string, pageIndices: number[]) => {
    const pdfFile = files.find(f => f.id === fileId);
    if (!pdfFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const bytes = pdfFile.bytes ?? new Uint8Array(await pdfFile.file.arrayBuffer());
      const doc = await window.PDFLib.PDFDocument.load(bytes);
      const total = doc.getPageCount();
      const keepIndices = Array.from({ length: total }, (_, i) => i).filter(i => !pageIndices.includes(i));
      const newDoc = await window.PDFLib.PDFDocument.create();
      const pages = await newDoc.copyPages(doc, keepIndices);
      pages.forEach(p => newDoc.addPage(p));
      const newBytes = await newDoc.save();
      downloadPDF(newBytes, `${pdfFile.name.replace('.pdf', '')}-edited.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove pages');
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  const createPDFFromImages = useCallback(async (
    imageFiles: File[],
    options: { enhance?: boolean; compress?: boolean } = {}
  ) => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const pdfDoc = await window.PDFLib.PDFDocument.create();

      for (const imageFile of imageFiles) {
        const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(imageFile);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas unavailable')); return; }

            if (options.enhance) {
              ctx.filter = 'contrast(1.1) brightness(1.05)';
            }
            ctx.drawImage(img, 0, 0);
            ctx.filter = 'none';

            const quality = options.compress ? 0.6 : 0.92;
            canvas.toBlob(blob => {
              if (!blob) { reject(new Error('Blob creation failed')); return; }
              blob.arrayBuffer().then(ab => resolve(new Uint8Array(ab)));
            }, 'image/jpeg', quality);
            URL.revokeObjectURL(url);
          };
          img.onerror = () => reject(new Error(`Failed to load ${imageFile.name}`));
          img.src = url;
        });

        const embeddedImage = await pdfDoc.embedJpg(pngBytes);

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const imgAspect = embeddedImage.width / embeddedImage.height;
        const pageAspect = pageWidth / pageHeight;
        let drawWidth: number, drawHeight: number;

        if (imgAspect > pageAspect) {
          drawWidth = pageWidth;
          drawHeight = pageWidth / imgAspect;
        } else {
          drawHeight = pageHeight;
          drawWidth = pageHeight * imgAspect;
        }

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, { x, y, width: drawWidth, height: drawHeight });
      }

      const pdfBytes = await pdfDoc.save();
      setLastCreatedPDF(pdfBytes);
      downloadPDF(pdfBytes, 'created.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDF');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const convertAndMergeAll = useCallback(async () => {
    if (files.length === 0) {
      setError('Please add at least one PDF or image file to convert.');
      return;
    }
    setIsConverting(true);
    setError(null);
    setConvertedPdfData(null);
    try {
      await loadPDFLib();
      const mergedDoc = await window.PDFLib.PDFDocument.create();

      for (const entry of files) {
        if (entry.fileType === 'pdf') {
          const bytes = entry.bytes ?? new Uint8Array(await entry.file.arrayBuffer());
          const srcDoc = await window.PDFLib.PDFDocument.load(bytes);
          const pageCount = srcDoc.getPageCount();
          const indices = Array.from({ length: pageCount }, (_, i) => i);
          const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
          copiedPages.forEach(page => mergedDoc.addPage(page));
        } else {
          const { bytes: imgBytes, width: imgW, height: imgH, isPng } = await imageFileToJpegBytes(entry.file);
          const embeddedImage = isPng
            ? await mergedDoc.embedPng(imgBytes)
            : await mergedDoc.embedJpg(imgBytes);

          const maxDim = 842;
          const scale = Math.min(1, maxDim / Math.max(imgW, imgH));
          const pageW = imgW * scale;
          const pageH = imgH * scale;

          const page = mergedDoc.addPage([pageW, pageH]);
          page.drawImage(embeddedImage, { x: 0, y: 0, width: pageW, height: pageH });
        }
      }

      const outputBytes = await mergedDoc.save();
      setConvertedPdfData(outputBytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert files to PDF');
    } finally {
      setIsConverting(false);
    }
  }, [files]);

  const clearConvertedPdf = useCallback(() => {
    setConvertedPdfData(null);
  }, []);

  // ─── Merge/Split Page Explorer ───────────────────────────────────────────────

  const addMergeSplitFiles = useCallback(async (newFiles: File[]) => {
    const accepted = newFiles.filter(f => isPDFFile(f) || isImageFile(f));
    if (accepted.length === 0) return;

    // Create placeholder entries immediately (thumbnails load async)
    const placeholders: MergeSplitEntry[] = [];

    for (const file of accepted) {
      if (isPDFFile(file)) {
        // We'll get page count and create one entry per page
        // First add placeholders, then load thumbnails
        try {
          const pdfBytes = new Uint8Array(await file.arrayBuffer());
          await loadPDFLib();
          const doc = await window.PDFLib.PDFDocument.load(pdfBytes);
          const pageCount = doc.getPageCount();

          for (let p = 1; p <= pageCount; p++) {
            const entryId = `ms-${Date.now()}-${Math.random()}-p${p}`;
            placeholders.push({
              id: entryId,
              type: 'pdf-page',
              sourceFile: file,
              sourceBytes: pdfBytes,
              pageNumber: p,
              label: `${file.name} — p.${p}`,
              thumbnailDataUrl: null,
              thumbnailLoading: true,
              thumbnailError: null,
              removed: false,
            });
          }
        } catch {
          // If we can't load the PDF, add a single error entry
          const entryId = `ms-${Date.now()}-${Math.random()}`;
          placeholders.push({
            id: entryId,
            type: 'pdf-page',
            sourceFile: file,
            pageNumber: 1,
            label: file.name,
            thumbnailDataUrl: null,
            thumbnailLoading: false,
            thumbnailError: 'Failed to load PDF',
            removed: false,
          });
        }
      } else {
        // Image file
        const entryId = `ms-${Date.now()}-${Math.random()}`;
        placeholders.push({
          id: entryId,
          type: 'image',
          sourceFile: file,
          label: file.name,
          thumbnailDataUrl: null,
          thumbnailLoading: true,
          thumbnailError: null,
          removed: false,
        });
      }
    }

    // Add placeholders to state
    setMergeSplitEntries(prev => [...prev, ...placeholders]);

    // Now load thumbnails asynchronously and update state
    for (const entry of placeholders) {
      if (entry.thumbnailError) continue; // skip error entries

      if (entry.type === 'image') {
        try {
          const dataUrl = await getImageDataUrl(entry.sourceFile);
          setMergeSplitEntries(prev =>
            prev.map(e => e.id === entry.id
              ? { ...e, thumbnailDataUrl: dataUrl, thumbnailLoading: false }
              : e
            )
          );
        } catch (err) {
          setMergeSplitEntries(prev =>
            prev.map(e => e.id === entry.id
              ? { ...e, thumbnailLoading: false, thumbnailError: err instanceof Error ? err.message : 'Failed to load image' }
              : e
            )
          );
        }
      } else if (entry.type === 'pdf-page' && entry.sourceBytes && entry.pageNumber !== undefined) {
        try {
          const dataUrl = await renderPDFPageThumbnail(entry.sourceBytes, entry.pageNumber, 0.3);
          setMergeSplitEntries(prev =>
            prev.map(e => e.id === entry.id
              ? { ...e, thumbnailDataUrl: dataUrl, thumbnailLoading: false }
              : e
            )
          );
        } catch (err) {
          setMergeSplitEntries(prev =>
            prev.map(e => e.id === entry.id
              ? { ...e, thumbnailLoading: false, thumbnailError: err instanceof Error ? err.message : 'Render failed' }
              : e
            )
          );
        }
      }
    }
  }, []);

  const togglePageRemoval = useCallback((entryId: string) => {
    setMergeSplitEntries(prev =>
      prev.map(e => e.id === entryId ? { ...e, removed: !e.removed } : e)
    );
  }, []);

  const mergeAndDownload = useCallback(async () => {
    const activeEntries = mergeSplitEntries.filter(e => !e.removed);
    if (activeEntries.length === 0) {
      setMergeError('No pages to merge. Add files and make sure at least one page is not removed.');
      return;
    }
    setIsMerging(true);
    setMergeError(null);
    try {
      await loadPDFLib();
      const mergedDoc = await window.PDFLib.PDFDocument.create();

      // Cache loaded PDF docs to avoid re-loading the same file multiple times
      const pdfDocCache = new Map<string, PDFDocumentProxy>();

      for (const entry of activeEntries) {
        if (entry.type === 'pdf-page' && entry.pageNumber !== undefined) {
          const cacheKey = entry.sourceFile.name + entry.sourceFile.size;
          let srcDoc = pdfDocCache.get(cacheKey);
          if (!srcDoc) {
            const bytes = entry.sourceBytes ?? new Uint8Array(await entry.sourceFile.arrayBuffer());
            srcDoc = await window.PDFLib.PDFDocument.load(bytes);
            pdfDocCache.set(cacheKey, srcDoc);
          }
          const [copiedPage] = await mergedDoc.copyPages(srcDoc, [entry.pageNumber - 1]);
          mergedDoc.addPage(copiedPage);
        } else if (entry.type === 'image') {
          const { bytes: imgBytes, width: imgW, height: imgH, isPng } = await imageFileToJpegBytes(entry.sourceFile);
          const embeddedImage = isPng
            ? await mergedDoc.embedPng(imgBytes)
            : await mergedDoc.embedJpg(imgBytes);

          const maxDim = 842;
          const scale = Math.min(1, maxDim / Math.max(imgW, imgH));
          const pageW = imgW * scale;
          const pageH = imgH * scale;

          const page = mergedDoc.addPage([pageW, pageH]);
          page.drawImage(embeddedImage, { x: 0, y: 0, width: pageW, height: pageH });
        }
      }

      const outputBytes = await mergedDoc.save();
      downloadPDF(outputBytes, 'merged-document.pdf');
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Failed to merge PDF. Please try again.');
    } finally {
      setIsMerging(false);
    }
  }, [mergeSplitEntries]);

  const clearMergeSplitEntries = useCallback(() => {
    setMergeSplitEntries([]);
    setMergeError(null);
  }, []);

  return {
    files,
    pdfFiles: files.filter(f => f.fileType === 'pdf'),
    isProcessing,
    isConverting,
    convertedPdfData,
    error,
    lastMergeResult,
    lastSplitResults,
    lastCreatedPDF,
    addFiles,
    addPDFs: addFiles,
    removeFile,
    removePDF: removeFile,
    reorderFiles,
    mergePDFs,
    splitPDF,
    removePages,
    createPDFFromImages,
    convertAndMergeAll,
    clearConvertedPdf,
    mergeSplitEntries,
    isMerging,
    mergeError,
    addMergeSplitFiles,
    togglePageRemoval,
    mergeAndDownload,
    clearMergeSplitEntries,
  };
}
