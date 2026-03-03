import { useCallback, useState } from "react";

export interface PDFFile {
  id: string;
  name: string;
  size: number;
  type: "pdf" | "image";
  file: File;
}

export interface MergeSplitEntry {
  id: string;
  sourceFileId: string;
  sourceName: string;
  pageIndex: number;
  totalPages: number;
  type: "pdf-page" | "image";
  thumbnail: string;
  removed: boolean;
  file: File;
}

export interface UsePDFOperationsReturn {
  pdfFiles: PDFFile[];
  addPDFFiles: (files: File[]) => void;
  removePDFFile: (id: string) => void;
  convertToDownloadable: (selectedIds?: string[]) => Promise<void>;
  isConverting: boolean;
  mergeSplitEntries: MergeSplitEntry[];
  addMergeSplitFiles: (files: File[]) => Promise<void>;
  togglePageRemoval: (id: string) => void;
  reorderMergeSplitEntries: (fromIndex: number, toIndex: number) => void;
  mergeAndDownload: (selectedIds?: string[]) => Promise<void>;
  clearMergeSplitEntries: () => void;
  isMerging: boolean;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function loadPDFJS(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  return new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(lib);
      } else {
        reject(new Error("pdfjsLib not found after script load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

async function loadPDFLib(): Promise<any> {
  const w = window as any;
  if (w.PDFLib) return w.PDFLib;
  return new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    script.onload = () => {
      const lib = (window as any).PDFLib;
      if (lib) resolve(lib);
      else reject(new Error("PDFLib not found after script load"));
    };
    script.onerror = () => reject(new Error("Failed to load pdf-lib from CDN"));
    document.head.appendChild(script);
  });
}

async function renderPDFPageToThumbnail(
  file: File,
  pageIndex: number,
): Promise<string> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    .promise;
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 0.3 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function usePDFOperations(): UsePDFOperationsReturn {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [mergeSplitEntries, setMergeSplitEntries] = useState<MergeSplitEntry[]>(
    [],
  );
  const [isMerging, setIsMerging] = useState(false);

  const addPDFFiles = useCallback((files: File[]) => {
    const newFiles: PDFFile[] = files.map((file) => ({
      id: generateId(),
      name: file.name,
      size: file.size,
      type: (file.type === "application/pdf" ? "pdf" : "image") as
        | "pdf"
        | "image",
      file,
    }));
    setPdfFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removePDFFile = useCallback((id: string) => {
    setPdfFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const convertToDownloadable = useCallback(
    async (selectedIds?: string[]) => {
      setIsConverting(true);
      try {
        const PDFLib = await loadPDFLib();
        const { PDFDocument } = PDFLib;

        const filesToConvert =
          selectedIds && selectedIds.length > 0
            ? pdfFiles.filter((f) => selectedIds.includes(f.id))
            : pdfFiles;

        if (filesToConvert.length === 0) return;

        const mergedPdf = await PDFDocument.create();

        for (const pdfFile of filesToConvert) {
          const arrayBuffer = await pdfFile.file.arrayBuffer();
          if (pdfFile.type === "pdf") {
            const srcDoc = await PDFDocument.load(arrayBuffer);
            const indices = srcDoc.getPageIndices();
            const pages = await mergedPdf.copyPages(srcDoc, indices);
            for (const page of pages) mergedPdf.addPage(page);
          } else {
            const uint8Array = new Uint8Array(arrayBuffer);
            // biome-ignore lint/suspicious/noImplicitAnyLet: type depends on runtime branch
            let image;
            if (pdfFile.file.type === "image/png") {
              image = await mergedPdf.embedPng(uint8Array);
            } else {
              image = await mergedPdf.embedJpg(uint8Array);
            }
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, {
              x: 0,
              y: 0,
              width: image.width,
              height: image.height,
            });
          }
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "converted.pdf";
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsConverting(false);
      }
    },
    [pdfFiles],
  );

  const addMergeSplitFiles = useCallback(async (files: File[]) => {
    const newEntries: MergeSplitEntry[] = [];
    for (const file of files) {
      const sourceFileId = generateId();
      if (file.type === "application/pdf") {
        const pdfjsLib = await loadPDFJS();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;
        const totalPages = pdf.numPages;
        for (let i = 0; i < totalPages; i++) {
          let thumbnail = "";
          try {
            thumbnail = await renderPDFPageToThumbnail(file, i);
          } catch {
            thumbnail = "";
          }
          newEntries.push({
            id: generateId(),
            sourceFileId,
            sourceName: file.name,
            pageIndex: i,
            totalPages,
            type: "pdf-page",
            thumbnail,
            removed: false,
            file,
          });
        }
      } else {
        const thumbnail = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) ?? "");
          reader.readAsDataURL(file);
        });
        newEntries.push({
          id: generateId(),
          sourceFileId,
          sourceName: file.name,
          pageIndex: 0,
          totalPages: 1,
          type: "image",
          thumbnail,
          removed: false,
          file,
        });
      }
    }
    setMergeSplitEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const togglePageRemoval = useCallback((id: string) => {
    setMergeSplitEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, removed: !e.removed } : e)),
    );
  }, []);

  const reorderMergeSplitEntries = useCallback(
    (fromIndex: number, toIndex: number) => {
      setMergeSplitEntries((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [],
  );

  const mergeAndDownload = useCallback(
    async (selectedIds?: string[]) => {
      setIsMerging(true);
      try {
        const PDFLib = await loadPDFLib();
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        let entriesToMerge = mergeSplitEntries.filter((e) => !e.removed);
        if (selectedIds && selectedIds.length > 0) {
          entriesToMerge = entriesToMerge.filter((e) =>
            selectedIds.includes(e.id),
          );
        }

        for (const entry of entriesToMerge) {
          const arrayBuffer = await entry.file.arrayBuffer();
          if (entry.type === "pdf-page") {
            const srcDoc = await PDFDocument.load(arrayBuffer);
            const [page] = await mergedPdf.copyPages(srcDoc, [entry.pageIndex]);
            mergedPdf.addPage(page);
          } else {
            const uint8Array = new Uint8Array(arrayBuffer);
            // biome-ignore lint/suspicious/noImplicitAnyLet: type depends on runtime branch
            let image;
            if (entry.file.type === "image/png") {
              image = await mergedPdf.embedPng(uint8Array);
            } else {
              image = await mergedPdf.embedJpg(uint8Array);
            }
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, {
              x: 0,
              y: 0,
              width: image.width,
              height: image.height,
            });
          }
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "merged.pdf";
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsMerging(false);
      }
    },
    [mergeSplitEntries],
  );

  const clearMergeSplitEntries = useCallback(() => {
    setMergeSplitEntries([]);
  }, []);

  return {
    pdfFiles,
    addPDFFiles,
    removePDFFile,
    convertToDownloadable,
    isConverting,
    mergeSplitEntries,
    addMergeSplitFiles,
    togglePageRemoval,
    reorderMergeSplitEntries,
    mergeAndDownload,
    clearMergeSplitEntries,
    isMerging,
  };
}
