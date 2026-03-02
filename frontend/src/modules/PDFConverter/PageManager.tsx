import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Loader2, GripVertical, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PDFFile } from './usePDFOperations';

interface PageManagerProps {
  pdfFiles: PDFFile[];
  onRemovePages: (fileId: string, pageIndices: number[]) => void;
}

interface PageThumb {
  index: number;
  dataUrl: string | null;
  error: string | null;
  isLoading: boolean;
}

// Load pdfjs-dist from CDN at runtime
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

export function PageManager({ pdfFiles, onRemovePages }: PageManagerProps) {
  const [selectedFileId, setSelectedFileId] = useState('');
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [thumbError, setThumbError] = useState('');
  const dragIndex = useRef<number | null>(null);

  const selectedFile = pdfFiles.find(f => f.id === selectedFileId);

  const loadThumbnails = async (file: PDFFile | undefined) => {
    if (!file) {
      setThumbs([]);
      setPageOrder([]);
      setThumbError('');
      return;
    }
    setLoadingThumbs(true);
    setSelectedPages([]);
    setThumbError('');

    try {
      const pdfjsLib = await loadPDFJS();
      const bytes = new Uint8Array(await file.file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages: PageThumb[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            pages.push({ index: i - 1, dataUrl: null, error: 'No canvas context', isLoading: false });
            continue;
          }
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          pages.push({ index: i - 1, dataUrl, error: null, isLoading: false });
        } catch (pageErr) {
          pages.push({
            index: i - 1,
            dataUrl: null,
            error: pageErr instanceof Error ? pageErr.message : 'Render failed',
            isLoading: false,
          });
        }
      }

      setThumbs(pages);
      setPageOrder(pages.map(p => p.index));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load PDF';
      setThumbError(msg);
      setThumbs([]);
    } finally {
      setLoadingThumbs(false);
    }
  };

  useEffect(() => {
    loadThumbnails(selectedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(dragIndex.current, 1);
    newOrder.splice(index, 0, moved);
    dragIndex.current = index;
    setPageOrder(newOrder);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  const togglePage = (index: number) => {
    setSelectedPages(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleRemoveSelected = () => {
    if (!selectedFile || selectedPages.length === 0) return;
    onRemovePages(selectedFile.id, selectedPages);
    setSelectedPages([]);
  };

  return (
    <div className="space-y-4">
      {/* File Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedFileId} onValueChange={setSelectedFileId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a PDF file to manage pages…" />
          </SelectTrigger>
          <SelectContent>
            {pdfFiles.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPages.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveSelected}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* CDN Error */}
      {thumbError && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Failed to load PDF thumbnails</p>
            <p className="text-xs mt-0.5 opacity-80">{thumbError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => loadThumbnails(selectedFile)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {loadingThumbs && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading page thumbnails…</span>
        </div>
      )}

      {/* Thumbnails Grid */}
      {!loadingThumbs && thumbs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {thumbs.length} page{thumbs.length !== 1 ? 's' : ''} · drag to reorder · check to select for removal
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pageOrder.map((pageIdx, orderIdx) => {
              const thumb = thumbs.find(t => t.index === pageIdx);
              if (!thumb) return null;
              const isSelected = selectedPages.includes(pageIdx);
              return (
                <div
                  key={pageIdx}
                  draggable
                  onDragStart={() => handleDragStart(orderIdx)}
                  onDragOver={e => handleDragOver(e, orderIdx)}
                  onDragEnd={handleDragEnd}
                  className={`relative rounded-lg border-2 overflow-hidden cursor-grab transition-all ${
                    isSelected ? 'border-destructive shadow-md' : 'border-border/50 hover:border-border'
                  }`}
                >
                  <div className="aspect-[3/4] bg-muted/20 flex items-center justify-center">
                    {thumb.isLoading && (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                    {thumb.error && !thumb.isLoading && (
                      <div className="flex flex-col items-center gap-1 text-destructive p-2 text-center">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs leading-tight">Render failed</span>
                      </div>
                    )}
                    {thumb.dataUrl && !thumb.isLoading && !thumb.error && (
                      <ThumbnailImg src={thumb.dataUrl} pageNum={thumb.index + 1} />
                    )}
                  </div>
                  <div className="p-1 bg-card flex items-center justify-between gap-1">
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 text-center">p.{thumb.index + 1}</span>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePage(pageIdx)}
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-destructive/10 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loadingThumbs && !thumbError && !selectedFileId && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Select a PDF file above to manage its pages.
        </div>
      )}

      {!loadingThumbs && !thumbError && selectedFileId && thumbs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No pages found in this PDF.
        </div>
      )}
    </div>
  );
}

function ThumbnailImg({ src, pageNum }: { src: string; pageNum: number }) {
  const [error, setError] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1 text-destructive">
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs">Error</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={src}
        alt={`Page ${pageNum}`}
        className="w-full h-full object-contain"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.15s' }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default PageManager;
