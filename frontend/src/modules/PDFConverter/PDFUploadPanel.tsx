import { useRef, useState } from 'react';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PDFFile } from './usePDFOperations';

interface PDFUploadPanelProps {
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  onAddPDFs: (files: File[]) => void;
  onRemovePDF: (id: string) => void;
}

export default function PDFUploadPanel({ pdfFiles, isProcessing, onAddPDFs, onRemovePDF }: PDFUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    onAddPDFs(pdfs);
  };

  return (
    <div className="space-y-3">
      <div
        className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
        ) : (
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        )}
        <p className="font-medium text-sm text-foreground">
          {isProcessing ? 'Loading PDFs...' : 'Drop PDF files here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse · Multiple files supported</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {pdfFiles.length > 0 && (
        <div className="space-y-2">
          {pdfFiles.map((pdf) => (
            <div key={pdf.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pdf.name}</p>
                <p className="text-xs text-muted-foreground">{pdf.pageCount} page{pdf.pageCount !== 1 ? 's' : ''}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemovePDF(pdf.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
