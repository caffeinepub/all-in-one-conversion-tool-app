import { useRef } from 'react';
import { Upload, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageFile } from './useImageConversion';

// ImageItem is an alias for ImageFile - exported from useImageConversion
export type { ImageFile as ImageItem };

interface BatchUploadPanelProps {
  images: ImageFile[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (id: string) => void;
  onClearAll: () => void;
  onNext?: () => void;
}

export function BatchUploadPanel({ images, onAddImages, onRemoveImage, onClearAll, onNext }: BatchUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onAddImages(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onAddImages(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        className="upload-zone rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop images here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, WebP, GIF, BMP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{images.length} image{images.length !== 1 ? 's' : ''}</span>
            <Button variant="ghost" size="sm" onClick={onClearAll}>Clear All</Button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {images.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-2 border-t border-border/40">
        <button
          onClick={onNext}
          disabled={images.length === 0}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default BatchUploadPanel;
