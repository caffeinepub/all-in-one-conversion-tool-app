import { useState, useCallback } from 'react';
import { downloadAsZip } from '@/lib/jszip';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';
// Aliases for backward compatibility
export type OutputFormat = ImageFormat;
export type FilterPreset = 'none' | 'grayscale' | 'sepia' | 'vivid' | 'cool' | 'warm';
export type FilterType = FilterPreset;

export interface ConversionSettings {
  format: ImageFormat;
  quality: number;
  resizeMode: 'none' | 'dimensions' | 'percentage';
  width: number;
  height: number;
  percentage: number;
  maintainAspectRatio: boolean;
  filter: FilterPreset;
}

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

// Alias for backward compatibility
export type ImageItem = ImageFile;

export interface ConvertedImage {
  id: string;
  originalName: string;
  convertedDataUrl: string;
  convertedBlob: Blob;
  format: ImageFormat;
  size: number;
}

export interface ConversionProgress {
  total: number;
  completed: number;
  isConverting: boolean;
}

const DEFAULT_SETTINGS: ConversionSettings = {
  format: 'jpeg',
  quality: 85,
  resizeMode: 'none',
  width: 800,
  height: 600,
  percentage: 100,
  maintainAspectRatio: true,
  filter: 'none',
};

function applyFilter(ctx: CanvasRenderingContext2D, filter: FilterPreset, width: number, height: number) {
  if (filter === 'none') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filter === 'grayscale') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i + 1] = data[i + 2] = gray;
    } else if (filter === 'sepia') {
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    } else if (filter === 'vivid') {
      data[i] = Math.min(255, r * 1.2);
      data[i + 1] = Math.min(255, g * 1.1);
      data[i + 2] = Math.min(255, b * 0.9);
    } else if (filter === 'cool') {
      data[i] = Math.max(0, r - 20);
      data[i + 1] = g;
      data[i + 2] = Math.min(255, b + 30);
    } else if (filter === 'warm') {
      data[i] = Math.min(255, r + 30);
      data[i + 1] = g;
      data[i + 2] = Math.max(0, b - 20);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

async function convertImage(imageFile: ImageFile, settings: ConversionSettings): Promise<ConvertedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (settings.resizeMode === 'dimensions') {
        if (settings.maintainAspectRatio) {
          const ratio = Math.min(settings.width / img.width, settings.height / img.height);
          targetWidth = Math.round(img.width * ratio);
          targetHeight = Math.round(img.height * ratio);
        } else {
          targetWidth = settings.width;
          targetHeight = settings.height;
        }
      } else if (settings.resizeMode === 'percentage') {
        targetWidth = Math.round(img.width * (settings.percentage / 100));
        targetHeight = Math.round(img.height * (settings.percentage / 100));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      if (settings.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      applyFilter(ctx, settings.filter, targetWidth, targetHeight);

      const mimeType = settings.format === 'jpeg' ? 'image/jpeg'
        : settings.format === 'png' ? 'image/png'
        : settings.format === 'webp' ? 'image/webp'
        : settings.format === 'gif' ? 'image/gif'
        : 'image/bmp';

      const quality = ['jpeg', 'webp'].includes(settings.format) ? settings.quality / 100 : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve({
            id: imageFile.id,
            originalName: imageFile.name,
            convertedDataUrl: dataUrl,
            convertedBlob: blob,
            format: settings.format,
            size: blob.size,
          });
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageFile.name}`));
    img.src = imageFile.preview;
  });
}

export function useImageConversion() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [progress, setProgress] = useState<ConversionProgress>({ total: 0, completed: 0, isConverting: false });
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const addImages = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
    setConvertedImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setConvertedImages([]);
    setProgress({ total: 0, completed: 0, isConverting: false });
    setError(null);
  }, [images]);

  const convertAll = useCallback(async () => {
    if (images.length === 0) return;
    setError(null);
    setProgress({ total: images.length, completed: 0, isConverting: true });
    const results: ConvertedImage[] = [];

    for (const image of images) {
      try {
        const converted = await convertImage(image, settings);
        results.push(converted);
        setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      } catch (err) {
        setError(`Failed to convert ${image.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setConvertedImages(results);
    setProgress((prev) => ({ ...prev, isConverting: false }));
  }, [images, settings]);

  const convertSingle = useCallback(async (imageFile: ImageFile) => {
    try {
      const converted = await convertImage(imageFile, settings);
      setConvertedImages(prev => {
        const idx = prev.findIndex(c => c.id === imageFile.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = converted;
          return next;
        }
        return [...prev, converted];
      });
    } catch (err) {
      setError(`Failed to convert ${imageFile.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [settings]);

  const downloadSingle = useCallback((converted: ConvertedImage) => {
    const a = document.createElement('a');
    a.href = converted.convertedDataUrl;
    const baseName = converted.originalName.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}.${converted.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadAllAsZip = useCallback(async () => {
    if (convertedImages.length === 0) return;
    setIsZipping(true);
    setError(null);

    try {
      const entries = convertedImages.map((img) => {
        const baseName = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          filename: `${baseName}.${img.format}`,
          data: img.convertedBlob,
        };
      });

      await downloadAsZip(entries, 'converted-images.zip');
    } catch (err) {
      setError(`Failed to create ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsZipping(false);
    }
  }, [convertedImages]);

  const downloadAll = downloadAllAsZip;
  const updateSettings = setSettings;
  const isBatchConverting = progress.isConverting;

  return {
    images,
    settings,
    setSettings,
    updateSettings,
    convertedImages,
    progress,
    error,
    isZipping,
    isBatchConverting,
    addImages,
    removeImage,
    clearAll,
    convertAll,
    convertSingle,
    downloadSingle,
    downloadAllAsZip,
    downloadAll,
  };
}
