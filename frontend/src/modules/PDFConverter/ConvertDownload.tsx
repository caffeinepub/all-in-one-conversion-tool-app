import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download, Loader2, CheckCircle2, AlertCircle, FileDown } from 'lucide-react';
import type { PDFFile } from './usePDFOperations';

interface ConvertDownloadProps {
  files: PDFFile[];
  isConverting: boolean;
  convertedPdfData: Uint8Array | null;
  error: string | null;
  onConvert: () => void;
  onClear: () => void;
}

export default function ConvertDownload({
  files,
  isConverting,
  convertedPdfData,
  error,
  onConvert,
  onClear,
}: ConvertDownloadProps) {
  // Reset converted data when files change
  useEffect(() => {
    onClear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const handleDownload = () => {
    if (!convertedPdfData) return;
    const blob = new Blob([convertedPdfData.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pdfCount = files.filter(f => f.fileType === 'pdf').length;
  const imageCount = files.filter(f => f.fileType === 'image').length;

  return (
    <div className="space-y-5">
      <div>
        <p className="section-title mb-1">Convert &amp; Download</p>
        <p className="text-xs text-muted-foreground">
          Merge all PDFs and images in your file list into a single downloadable PDF.
        </p>
      </div>

      {/* File summary */}
      {files.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Files to convert ({files.length} total)</p>
          <div className="flex flex-wrap gap-2">
            {pdfCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>{pdfCount} PDF{pdfCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {imageCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Image className="w-3.5 h-3.5 text-accent" />
                <span>{imageCount} image{imageCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
            {files.map((file, idx) => (
              <div key={file.id} className="flex items-center gap-2 py-0.5">
                <span className="text-xs text-muted-foreground/60 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                {file.fileType === 'image'
                  ? <Image className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  : <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                }
                <span className="text-xs truncate flex-1">{file.name}</span>
                <Badge
                  variant={file.fileType === 'pdf' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                >
                  {file.fileType === 'pdf' ? 'PDF' : 'Image'}
                </Badge>
                <span className="text-xs text-muted-foreground/60 flex-shrink-0">{formatSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 p-6 text-center">
          <FileDown className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No files added yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Go to the Files tab to add PDFs or images.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Success */}
      {convertedPdfData && !error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">PDF ready!</p>
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
              {(convertedPdfData.byteLength / 1024).toFixed(1)} KB — click Download to save.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={onConvert}
          disabled={files.length === 0 || isConverting}
          className="w-full gap-2"
        >
          {isConverting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</>
            : <><FileDown className="w-4 h-4" /> Convert to PDF</>
          }
        </Button>

        {convertedPdfData && (
          <Button
            variant="outline"
            onClick={handleDownload}
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}
