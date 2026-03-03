import { Button } from "@/components/ui/button";
import { Download, FileText, Image, Loader2 } from "lucide-react";
import type { PDFFile } from "./usePDFOperations";

interface ConvertDownloadProps {
  files: PDFFile[];
  isConverting: boolean;
  onConvert: (selectedIds?: string[]) => Promise<void>;
}

export default function ConvertDownload({
  files,
  isConverting,
  onConvert,
}: ConvertDownloadProps) {
  const pdfCount = files.filter((f) => f.type === "pdf").length;
  const imageCount = files.filter((f) => f.type === "image").length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Convert &amp; Download</p>

      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No files loaded. Go to the Files tab to add PDFs or images.
        </div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
              >
                {file.type === "image" ? (
                  <Image className="w-4 h-4 text-accent flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    file.type === "pdf"
                      ? "bg-primary/20 text-primary"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {file.type === "pdf" ? "PDF" : "Image"}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            {pdfCount > 0 && (
              <span>
                {pdfCount} PDF{pdfCount !== 1 ? "s" : ""}
              </span>
            )}
            {pdfCount > 0 && imageCount > 0 && <span> · </span>}
            {imageCount > 0 && (
              <span>
                {imageCount} image{imageCount !== 1 ? "s" : ""}
              </span>
            )}
            <span> will be merged into one PDF</span>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => onConvert()}
            disabled={isConverting || files.length === 0}
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Convert &amp; Download PDF
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
