import React, { useCallback, useState } from 'react';
import { Upload, Image } from 'lucide-react';

interface ImageUploadPanelProps {
  onImageLoad: (dataUrl: string) => void;
}

export default function ImageUploadPanel({ onImageLoad }: ImageUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        onImageLoad(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="p-4 rounded-2xl bg-primary/10">
          <Image className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Upload an Image</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Select an image file to start editing. Supports JPG, PNG, WebP, GIF and more.
        </p>
      </div>

      <label
        className={`upload-zone w-full max-w-md flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-all ${
          isDragging ? 'border-primary bg-primary/10' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="w-8 h-8 text-muted-foreground/60" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Drag & drop your image here
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            or click to browse files
          </p>
        </div>
      </label>

      <p className="text-xs text-muted-foreground/50">
        Supported formats: JPG, PNG, WebP, GIF, BMP, TIFF
      </p>
    </div>
  );
}
