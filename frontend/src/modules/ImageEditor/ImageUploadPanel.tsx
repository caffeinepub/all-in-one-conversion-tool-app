import { useRef, useState } from 'react';
import { Upload, Camera, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '../../camera/useCamera';
import { toast } from 'sonner';

interface ImageUploadPanelProps {
  onImageLoad: (src: string) => void;
  hasImage: boolean;
}

export default function ImageUploadPanel({ onImageLoad, hasImage }: ImageUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { isActive, isSupported, error, isLoading, startCamera, stopCamera, capturePhoto, videoRef, canvasRef } = useCamera({
    facingMode: 'environment',
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageLoad(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleOpenCamera = async () => {
    setShowCamera(true);
    await startCamera();
  };

  const handleCloseCamera = async () => {
    await stopCamera();
    setShowCamera(false);
  };

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageLoad(e.target.result as string);
          handleCloseCamera();
        }
      };
      reader.readAsDataURL(photo);
    }
  };

  if (showCamera) {
    return (
      <div className="space-y-3 animate-scale-in">
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 280 }}>
          <video
            ref={videoRef}
            className="w-full h-auto"
            style={{ minHeight: 280, display: 'block' }}
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-white text-sm">Starting camera...</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <div className="text-center text-white">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCapture} disabled={!isActive || isLoading} className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            Capture Photo
          </Button>
          <Button variant="outline" onClick={handleCloseCamera}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
        {isSupported === false && (
          <p className="text-xs text-destructive">Camera not supported in this browser.</p>
        )}
      </div>
    );
  }

  if (hasImage) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div
        className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-foreground mb-1">Drop an image here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
        <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP supported · HEIC may vary by browser</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          From Gallery
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleOpenCamera}>
          <Camera className="w-4 h-4 mr-2" />
          From Camera
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
