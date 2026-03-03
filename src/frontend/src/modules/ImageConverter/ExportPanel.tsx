import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Archive,
  CheckCircle,
  ChevronLeft,
  Download,
  ImageIcon,
  Loader2,
} from "lucide-react";
import React from "react";
import type { ConversionProgress, ConvertedImage } from "./useImageConversion";

interface ExportPanelProps {
  convertedImages: ConvertedImage[];
  progress: ConversionProgress;
  error: string | null;
  isZipping: boolean;
  onConvertAll: () => void;
  onDownloadSingle: (img: ConvertedImage) => void;
  onDownloadAllAsZip: () => void;
  onBack?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ConvertedThumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  if (error) {
    return (
      <div className="h-10 w-10 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-destructive opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      {!loaded && (
        <div className="absolute inset-0 rounded bg-muted/30 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="h-10 w-10 rounded object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.15s" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export function ExportPanel({
  convertedImages,
  progress,
  error,
  isZipping,
  onConvertAll,
  onDownloadSingle,
  onDownloadAllAsZip,
  onBack,
}: ExportPanelProps) {
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Convert Button */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onConvertAll}
          disabled={progress.isConverting}
          size="lg"
          className="w-full max-w-xs"
        >
          {progress.isConverting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Converting… {progress.completed}/{progress.total}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Convert All Images
            </>
          )}
        </Button>

        {progress.isConverting && (
          <div className="w-full max-w-xs">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              {progressPercent}% complete
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {convertedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Converted Images
              <Badge variant="secondary" className="ml-2">
                {convertedImages.length}
              </Badge>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadAllAsZip}
              disabled={isZipping}
            >
              {isZipping ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Zipping…
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-3 w-3" />
                  Download as ZIP
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {convertedImages.map((img) => {
              const baseName = img.originalName.replace(/\.[^/.]+$/, "");
              return (
                <div
                  key={img.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ConvertedThumbnail
                      src={img.convertedDataUrl}
                      alt={img.originalName}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {baseName}.{img.format}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(img.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownloadSingle(img)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {convertedImages.length === 0 && !progress.isConverting && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Click "Convert All Images" to process your images.
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onBack}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}

export default ExportPanel;
