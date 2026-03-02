import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import type { PDFFile } from './usePDFOperations';

interface PDFFileListProps {
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  onAddPDFs: (files: File[]) => void;
  onRemovePDF: (id: string) => void;
}

export default function PDFFileList({ pdfFiles, isProcessing, onAddPDFs, onRemovePDF }: PDFFileListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onAddPDFs(files);
    }
    // Reset input so same file can be re-added
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
      onAddPDFs(files);
    }
  };

  return (
    <div className="space-y-4">
      <p className="section-title">PDF Files</p>

      {/* Drop Zone */}
      <div
        className="upload-zone cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading PDFs...</p>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Click or drag PDF files here
            </p>
            <p className="text-xs text-muted-foreground/60 text-center mt-1">
              Supports multiple files
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* File List */}
      {pdfFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{pdfFiles.length} file{pdfFiles.length !== 1 ? 's' : ''} loaded</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
            {pdfFiles.map(pdf => (
              <div
                key={pdf.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
              >
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{pdf.name}</p>
                  <p className="text-xs text-muted-foreground">{pdf.pageCount} page{pdf.pageCount !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => onRemovePDF(pdf.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pdfFiles.length === 0 && !isProcessing && (
        <p className="text-xs text-muted-foreground text-center">
          No PDFs loaded yet. Upload files to get started.
        </p>
      )}
    </div>
  );
}
