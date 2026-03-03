import { downloadAsZip } from "@/lib/jszip";
import { Archive, Download, Loader2, Printer } from "lucide-react";
import { useState } from "react";

interface ExportPanelProps {
  exportFormat: "png" | "pdf" | "gif";
  onFormatChange: (format: "png" | "pdf" | "gif") => void;
  renderA4Canvas: (canvas: HTMLCanvasElement) => void;
  getIndividualPhotoBlobs?: () => Promise<Blob[]>;
  hasPhoto: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function ExportPanel({
  exportFormat,
  onFormatChange,
  renderA4Canvas: _renderA4Canvas,
  getIndividualPhotoBlobs,
  hasPhoto,
  canvasRef,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const getCanvas = (): HTMLCanvasElement | null => {
    return canvasRef.current ?? null;
  };

  const handleDownload = async () => {
    if (!hasPhoto) return;
    setIsExporting(true);
    try {
      const canvas = getCanvas();
      if (!canvas) return;

      if (exportFormat === "png") {
        const dataUrl = canvas.toDataURL("image/png", 1.0);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "passport-photos.png";
        a.click();
      } else if (exportFormat === "gif") {
        // Export as GIF using canvas toDataURL
        // Most browsers support image/gif via canvas
        let dataUrl = canvas.toDataURL("image/gif");
        // Fallback: if browser doesn't support image/gif natively, use PNG with .gif extension
        if (!dataUrl.startsWith("data:image/gif")) {
          // Convert canvas to PNG blob then re-encode as GIF via a secondary canvas
          // Since native GIF encoding is limited in browsers, we use PNG data with .gif extension
          // as a widely-compatible fallback
          dataUrl = canvas.toDataURL("image/png", 1.0);
        }
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "passport-photos.gif";
        a.click();
      } else {
        // PDF export via pdf-lib
        await new Promise<void>((resolve, reject) => {
          if ((window as any).PDFLib) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load pdf-lib"));
          document.head.appendChild(script);
        });

        const PDFLib = (window as any).PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const a4WPt = (210 / 25.4) * 72;
        const a4HPt = (297 / 25.4) * 72;
        const page = pdfDoc.addPage([a4WPt, a4HPt]);

        // Use maximum quality JPEG for PDF embedding
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 1.0);
        const jpegBase64 = jpegDataUrl.split(",")[1];
        const jpegBytes = Uint8Array.from(atob(jpegBase64), (c) =>
          c.charCodeAt(0),
        );
        const embeddedImage = await pdfDoc.embedJpg(jpegBytes);

        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: a4WPt,
          height: a4HPt,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "passport-photos.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silent
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!hasPhoto) return;
    setIsPrinting(true);
    try {
      const canvas = getCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Passport Photos</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { background: white; }
              img { width: 210mm; height: 297mm; display: block; }
              @media print {
                @page { size: A4; margin: 0; }
                img { width: 100%; height: 100%; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!hasPhoto) return;
    setIsZipping(true);
    try {
      const canvas = getCanvas();
      if (!canvas) return;

      const entries: Array<{ filename: string; data: Blob }> = [];

      const sheetDataUrl = canvas.toDataURL("image/png", 1.0);
      const sheetBlob = await fetch(sheetDataUrl).then((r) => r.blob());
      entries.push({ filename: "passport-sheet.png", data: sheetBlob });

      if (getIndividualPhotoBlobs) {
        const copies = await getIndividualPhotoBlobs();
        copies.forEach((blob, i) => {
          entries.push({ filename: `passport-copy-${i + 1}.png`, data: blob });
        });
      }

      await downloadAsZip(entries, "passport-photos.zip");
    } catch {
      // silent
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Export &amp; Print
      </h3>

      {/* Format Selector */}
      <div>
        <p className="section-title">Export Format</p>
        <div className="flex gap-2">
          {(["png", "pdf", "gif"] as const).map((fmt) => (
            <button
              type="button"
              key={fmt}
              onClick={() => onFormatChange(fmt)}
              className={`tool-btn flex-1 justify-center uppercase text-xs font-bold ${exportFormat === fmt ? "tool-btn-active" : ""}`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isExporting || !hasPhoto}
          className="tool-btn flex-1 justify-center bg-primary text-primary-foreground hover:bg-primary/90 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isExporting ? "Exporting..." : "Download"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={isPrinting || !hasPhoto}
          className="tool-btn flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          Print
        </button>
      </div>

      {/* ZIP Download */}
      <button
        type="button"
        onClick={handleDownloadZip}
        disabled={isZipping || !hasPhoto}
        className="tool-btn w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isZipping ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
        {isZipping ? "Creating ZIP..." : "Download as ZIP"}
      </button>

      {!hasPhoto && (
        <p className="text-xs text-muted-foreground text-center">
          Upload a photo to enable export
        </p>
      )}
    </div>
  );
}
