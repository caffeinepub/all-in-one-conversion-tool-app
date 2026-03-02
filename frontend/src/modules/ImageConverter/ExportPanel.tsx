import { Download, Archive, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ConvertedImage, ConversionProgress } from './useImageConversion';

interface ExportPanelProps {
  convertedImages: ConvertedImage[];
  progress: ConversionProgress;
  error: string | null;
  isZipping: boolean;
  onConvertAll: () => void;
  onDownloadSingle: (img: ConvertedImage) => void;
  onDownloadAllAsZip: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ExportPanel({
  convertedImages,
  progress,
  error,
  isZipping,
  onConvertAll,
  onDownloadSingle,
  onDownloadAllAsZip,
}: ExportPanelProps) {
  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

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
            <p className="text-xs text-muted-foreground text-center mt-1">{progressPercent}% complete</p>
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
              <Badge variant="secondary" className="ml-2">{convertedImages.length}</Badge>
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
              const baseName = img.originalName.replace(/\.[^/.]+$/, '');
              return (
                <div
                  key={img.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={img.convertedDataUrl}
                      alt={img.originalName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{baseName}.{img.format}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(img.size)}</p>
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
          Click "Convert All Images" to process your images.
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
