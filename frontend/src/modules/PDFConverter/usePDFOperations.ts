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
  // bytes is kept for backward compat with PageManager which reads it
  bytes?: Uint8Array;
}

export interface SplitResult {
  filename: string;
  bytes: Uint8Array;
  data: Uint8Array;
}

export interface UsePDFOperationsReturn {
  files: PDFFile[];
  /** Legacy alias for files */
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  error: string | null;
  lastMergeResult: Uint8Array | null;
  lastSplitResults: SplitResult[] | null;
  lastCreatedPDF: Uint8Array | null;
  addFiles: (files: File[]) => void;
  /** Legacy alias for addFiles */
  addPDFs: (files: File[]) => void;
  removeFile: (id: string) => void;
  /** Legacy alias for removeFile */
  removePDF: (id: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  mergePDFs: () => Promise<void>;
  splitPDF: () => Promise<void>;
  /** Legacy alias for removePages */
  removePages: (fileId: string, pageIndices: number[]) => Promise<void>;
  createPDFFromImages: (imageFiles: File[], options?: { enhance?: boolean; compress?: boolean }) => Promise<void>;
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

export function usePDFOperations(): UsePDFOperationsReturn {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMergeResult, setLastMergeResult] = useState<Uint8Array | null>(null);
  const [lastSplitResults, setLastSplitResults] = useState<SplitResult[] | null>(null);
  const [lastCreatedPDF, setLastCreatedPDF] = useState<Uint8Array | null>(null);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    const withCounts = await Promise.all(
      pdfFiles.map(async (file) => {
        const pageCount = await getPageCount(file);
        // Also read bytes for PageManager compatibility
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
          bytes,
        };
      })
    );
    setFiles(prev => [...prev, ...withCounts]);
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
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const mergedDoc = await window.PDFLib.PDFDocument.create();

      for (const pdfFile of files) {
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
    if (files.length === 0) {
      setError('Please add a PDF file to split.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await loadPDFLib();
      const bytes = files[0].bytes ?? new Uint8Array(await files[0].file.arrayBuffer());
      const srcDoc = await window.PDFLib.PDFDocument.load(bytes);
      const pageCount = srcDoc.getPageCount();
      const results: SplitResult[] = [];

      for (let i = 0; i < pageCount; i++) {
        const newDoc = await window.PDFLib.PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(copiedPage);
        const pageBytes = await newDoc.save();
        const baseName = files[0].name.replace(/\.pdf$/i, '');
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

  return {
    files,
    pdfFiles: files,
    isProcessing,
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
  };
}
