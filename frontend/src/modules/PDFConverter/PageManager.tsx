import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Loader2, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PDFFile } from './usePDFOperations';

interface PageManagerProps {
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  onRemovePages: (fileId: string, pageIndices: number[]) => void;
}

interface PageThumb {
  index: number;
  dataUrl: string;
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

export default function PageManager({ pdfFiles, isProcessing, onRemovePages }: PageManagerProps) {
  const [selectedFileId, setSelectedFileId] = useState('');
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [thumbError, setThumbError] = useState('');
  const dragIndex = useRef<number | null>(null);

  const selectedFile = pdfFiles.find(f => f.id === selectedFileId);

  useEffect(() => {
    if (!selectedFile) {
      setThumbs([]);
      setPageOrder([]);
      setThumbError('');
      return;
    }
    setLoadingThumbs(true);
    setSelectedPages([]);
    setThumbError('');

    (async () => {
      try {
        const pdfjsLib = await loadPDFJS();
        // Use stored bytes if available, otherwise read from file
        const bytes = selectedFile.bytes
          ? selectedFile.bytes.slice()
          : new Uint8Array(await selectedFile.file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const pages: PageThumb[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          pages.push({ index: i - 1, dataUrl: canvas.toDataURL() });
        }
        setThumbs(pages);
        setPageOrder(pages.map(p => p.index));
      } catch {
        setThumbError('Could not generate thumbnails. PDF.js may be unavailable.');
        setThumbs([]);
      } finally {
        setLoadingThumbs(false);
      }
    })();
  }, [selectedFile]);

  const togglePage = (idx: number) => {
    setSelectedPages(prev =>
      prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
    );
  };

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    const newOrder = [...pageOrder];
    const from = newOrder.indexOf(dragIndex.current);
    const to = newOrder.indexOf(idx);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragIndex.current);
    setPageOrder(newOrder);
    dragIndex.current = idx;
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Page Manager</p>

      <Select value={selectedFileId} onValueChange={setSelectedFileId}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select a PDF..." />
        </SelectTrigger>
        <SelectContent>
          {pdfFiles.map(pdf => (
            <SelectItem key={pdf.id} value={pdf.id}>
              {pdf.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pdfFiles.length === 0 && (
        <p className="text-xs text-muted-foreground">Upload PDFs first to manage their pages</p>
      )}

      {loadingThumbs && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating thumbnails...
        </div>
      )}

      {thumbError && (
        <p className="text-xs text-destructive">{thumbError}</p>
      )}

      {thumbs.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            Drag to reorder · Check to select for removal
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
            {pageOrder.map((pageIdx) => {
              const thumb = thumbs.find(t => t.index === pageIdx);
              if (!thumb) return null;
              return (
                <div
                  key={pageIdx}
                  draggable
                  onDragStart={() => handleDragStart(pageIdx)}
                  onDragOver={(e) => handleDragOver(e, pageIdx)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all
                    ${selectedPages.includes(pageIdx)
                      ? 'border-destructive'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <img src={thumb.dataUrl} alt={`Page ${pageIdx + 1}`} className="w-full block" />
                  <div className="absolute top-1 left-1">
                    <Checkbox
                      checked={selectedPages.includes(pageIdx)}
                      onCheckedChange={() => togglePage(pageIdx)}
                      className="bg-background/80"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                    {pageIdx + 1}
                  </div>
                  <GripVertical className="absolute top-1 right-1 w-3 h-3 text-white/70" />
                </div>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemovePages(selectedFileId, selectedPages)}
            disabled={selectedPages.length === 0 || isProcessing}
            className="w-full gap-2"
          >
            {isProcessing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
            Remove Selected Pages ({selectedPages.length})
          </Button>
        </>
      )}

      {!loadingThumbs && thumbs.length === 0 && selectedFileId && !thumbError && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No pages found in this PDF.
        </p>
      )}
    </div>
  );
}
