import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  FilePlus2,
  ImagePlus,
  Loader2,
  AlertCircle,
  X,
  Download,
  Trash2,
  RotateCcw,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PDFFile, MergeSplitEntry } from './usePDFOperations';

interface MergeSplitToolsProps {
  isProcessing: boolean;
  isMerging: boolean;
  mergeError: string | null;
  entries: MergeSplitEntry[];
  onAddFiles: (files: File[]) => Promise<void>;
  onToggleRemoval: (entryId: string) => void;
  onMergeAndDownload: () => Promise<void>;
  onClear: () => void;
  // Legacy props (kept for compatibility, not used in new UI)
  pdfFiles: PDFFile[];
  onMerge: () => Promise<void>;
  onSplit: () => Promise<void>;
  onRemovePages: (fileId: string, pageIndices: number[]) => Promise<void>;
}

export default function MergeSplitTools({
  isMerging,
  mergeError,
  entries,
  onAddFiles,
  onToggleRemoval,
  onMergeAndDownload,
  onClear,
}: MergeSplitToolsProps) {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const anyInputRef = useRef<HTMLInputElement>(null);

  const activeCount = entries.filter(e => !e.removed).length;
  const removedCount = entries.filter(e => e.removed).length;

  const handlePDFInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      await onAddFiles(files);
      toast.success(`Added ${files.length} PDF file${files.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to load PDF');
    }
    e.target.value = '';
  };

  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      await onAddFiles(files);
      toast.success(`Added ${files.length} image${files.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to load image');
    }
    e.target.value = '';
  };

  const handleAnyInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      await onAddFiles(files);
      toast.success(`Added ${files.length} file${files.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to load files');
    }
    e.target.value = '';
  };

  const handleMerge = async () => {
    await onMergeAndDownload();
    if (!mergeError) {
      toast.success('PDF merged and downloaded!');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Add Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Page Explorer</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Import PDFs and images, remove unwanted pages, then merge into one PDF.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden file inputs */}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handlePDFInput}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageInput}
          />
          <input
            ref={anyInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleAnyInput}
          />

          <button
            className="tool-btn text-xs"
            onClick={() => pdfInputRef.current?.click()}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Add PDF
          </button>
          <button
            className="tool-btn text-xs"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Add Image
          </button>
          {entries.length > 0 && (
            <button
              className="tool-btn text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
              onClick={onClear}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div
          className="upload-zone flex flex-col items-center justify-center gap-3 py-16 cursor-pointer"
          onClick={() => anyInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FilePlus2 className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Import PDF or Image</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click to browse or drop files here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, JPG, PNG, WEBP
            </p>
          </div>
        </div>
      )}

      {/* Page Grid */}
      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {entries.length} page{entries.length !== 1 ? 's' : ''} total
              {removedCount > 0 && (
                <span className="text-destructive ml-2">· {removedCount} removed</span>
              )}
              {activeCount > 0 && (
                <span className="text-primary ml-2">· {activeCount} will be merged</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {entries.map((entry, idx) => (
              <PageEntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                onToggleRemoval={onToggleRemoval}
              />
            ))}
          </div>
        </>
      )}

      {/* Merge Error */}
      {mergeError && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Merge failed</p>
            <p className="text-xs mt-0.5 opacity-80">{mergeError}</p>
          </div>
        </div>
      )}

      {/* Merge & Download Button */}
      {entries.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <Button
            className="w-full gap-2 tool-btn-active"
            onClick={handleMerge}
            disabled={isMerging || activeCount === 0}
          >
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merging PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Merge &amp; Download ({activeCount} page{activeCount !== 1 ? 's' : ''})
              </>
            )}
          </Button>
          {activeCount === 0 && !isMerging && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Un-remove at least one page to enable merging.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Entry Card ──────────────────────────────────────────────────────────

interface PageEntryCardProps {
  entry: MergeSplitEntry;
  index: number;
  onToggleRemoval: (id: string) => void;
}

function PageEntryCard({ entry, index, onToggleRemoval }: PageEntryCardProps) {
  return (
    <div
      className={`relative rounded-lg border-2 overflow-hidden transition-all duration-200 ${
        entry.removed
          ? 'border-destructive/40 opacity-40'
          : 'border-border/50 hover:border-primary/40'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-muted/20 flex items-center justify-center relative">
        {entry.thumbnailLoading && (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        )}
        {entry.thumbnailError && !entry.thumbnailLoading && (
          <div className="flex flex-col items-center gap-1 text-destructive p-2 text-center">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs leading-tight">Error</span>
          </div>
        )}
        {entry.thumbnailDataUrl && !entry.thumbnailLoading && !entry.thumbnailError && (
          <ThumbnailImg
            src={entry.thumbnailDataUrl}
            alt={entry.label}
            removed={entry.removed}
          />
        )}

        {/* Remove / Restore button */}
        <button
          onClick={() => onToggleRemoval(entry.id)}
          title={entry.removed ? 'Restore page' : 'Remove page'}
          className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${
            entry.removed
              ? 'bg-primary text-primary-foreground hover:bg-primary/80'
              : 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
          }`}
        >
          {entry.removed ? (
            <RotateCcw className="w-2.5 h-2.5" />
          ) : (
            <X className="w-2.5 h-2.5" />
          )}
        </button>

        {/* Removed overlay */}
        {entry.removed && (
          <div className="absolute inset-0 bg-destructive/10 pointer-events-none flex items-center justify-center">
            <span className="text-destructive text-xs font-bold bg-background/80 px-1.5 py-0.5 rounded">
              Removed
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-1.5 py-1 bg-card/80 flex items-center gap-1">
        {entry.type === 'pdf-page' ? (
          <FileText className="w-2.5 h-2.5 text-primary flex-shrink-0" />
        ) : (
          <ImageIcon className="w-2.5 h-2.5 text-accent flex-shrink-0" />
        )}
        <span className="text-xs text-muted-foreground truncate flex-1 text-center">
          {entry.type === 'pdf-page' ? `p.${entry.pageNumber}` : `img.${index + 1}`}
        </span>
      </div>
    </div>
  );
}

function ThumbnailImg({ src, alt, removed }: { src: string; alt: string; removed: boolean }) {
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
        alt={alt}
        className="w-full h-full object-contain"
        style={{
          opacity: loaded ? (removed ? 0.4 : 1) : 0,
          transition: 'opacity 0.15s',
          filter: removed ? 'grayscale(0.5)' : 'none',
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
