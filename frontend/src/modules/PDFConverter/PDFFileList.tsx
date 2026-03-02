import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image, Loader2, FilePlus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PDFFile } from './usePDFOperations';

interface PDFFileListProps {
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  onAddPDFs: (files: File[]) => void;
  onRemovePDF: (id: string) => void;
  convertToDownloadable?: () => Promise<void>;
  isConverting?: boolean;
}

export default function PDFFileList({
  pdfFiles,
  isProcessing,
  onAddPDFs,
  onRemovePDF,
  convertToDownloadable,
  isConverting,
}: PDFFileListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onAddPDFs(files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)
        || ['.jpg', '.jpeg', '.png', '.webp'].some(ext => f.name.toLowerCase().endsWith(ext));
      return isPdf || isImage;
    });
    if (files.length > 0) {
      onAddPDFs(files);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCreatePDF = async () => {
    if (!convertToDownloadable) return;
    setCreateSuccess(false);
    try {
      await convertToDownloadable();
      setCreateSuccess(true);
      toast.success('PDF created and downloaded!');
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch {
      toast.error('Failed to create PDF');
    }
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Files</p>

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
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Click or drag PDF &amp; image files here
            </p>
            <p className="text-xs text-muted-foreground/60 text-center mt-1">
              Supports PDF, JPG, PNG, WEBP — multiple files
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* File List */}
      {pdfFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{pdfFiles.length} file{pdfFiles.length !== 1 ? 's' : ''} loaded</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {pdfFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
              >
                {file.fileType === 'image'
                  ? <Image className="w-4 h-4 text-accent flex-shrink-0" />
                  : <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Badge
                  variant={file.fileType === 'pdf' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                >
                  {file.fileType === 'pdf' ? 'PDF' : 'Image'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => onRemovePDF(file.id)}
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
          No files loaded yet. Upload PDFs or images to get started.
        </p>
      )}

      {/* Create PDF Button */}
      {convertToDownloadable && (
        <div className="pt-2 border-t border-border/40">
          <button
            onClick={handleCreatePDF}
            disabled={pdfFiles.length === 0 || isConverting}
            className="tool-btn w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating PDF…
              </>
            ) : createSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                PDF Created!
              </>
            ) : (
              <>
                <FilePlus className="w-5 h-5" />
                Create PDF
              </>
            )}
          </button>
          {pdfFiles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Add files above to create a PDF
            </p>
          )}
        </div>
      )}
    </div>
  );
}
