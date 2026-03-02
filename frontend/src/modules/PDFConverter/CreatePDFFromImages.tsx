import React, { useState, useCallback } from 'react';
import { Upload, X, Download, Loader2, CheckCircle, Image, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  name: string;
}

declare const PDFLib: any;

async function loadPDFLib(): Promise<void> {
  if (typeof PDFLib !== 'undefined') return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export default function CreatePDFFromImages() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enhance, setEnhance] = useState(false);
  const [compress, setCompress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const addImages = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const newEntries: ImageEntry[] = imageFiles.map(file => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages(prev => [...prev, ...newEntries]);
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const entry = prev.find(e => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter(e => e.id !== id);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImages(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  };

  const createPDF = async () => {
    if (images.length === 0) return;
    setIsCreating(true);
    setSuccess(false);
    try {
      await loadPDFLib();
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.create();

      for (const entry of images) {
        const arrayBuffer = await entry.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let image;
        const mimeType = entry.file.type;
        if (mimeType === 'image/png') {
          image = await pdfDoc.embedPng(uint8Array);
        } else {
          // For other formats, try JPEG embedding
          image = await pdfDoc.embedJpg(uint8Array);
        }
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images-to-pdf.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('PDF creation failed:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Image className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Create PDF from Images</h2>
      </div>

      {/* Upload zone */}
      <label
        className={`upload-zone flex flex-col items-center justify-center gap-3 p-8 cursor-pointer transition-all ${
          isDragging ? 'border-primary bg-primary/10' : ''
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="w-10 h-10 text-muted-foreground/60" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Drag & drop images here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Supports JPG, PNG, WebP, GIF
          </p>
        </div>
      </label>

      {/* Options */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={enhance}
            onChange={e => setEnhance(e.target.checked)}
            className="rounded"
          />
          <span>Enhance quality</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={compress}
            onChange={e => setCompress(e.target.checked)}
            className="rounded"
          />
          <span>Compress output</span>
        </label>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((entry, index) => (
            <div key={entry.id} className="relative group rounded-xl overflow-hidden border border-border bg-card">
              <div className="aspect-square overflow-hidden">
                <img
                  src={entry.preview}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={() => removeImage(entry.id)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-xs text-white truncate">{index + 1}. {entry.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {images.length} image{images.length > 1 ? 's' : ''} will be combined into a single PDF
        </p>
      )}

      <Button
        onClick={createPDF}
        disabled={images.length === 0 || isCreating}
        className="w-full"
        size="lg"
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating PDF...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            PDF Downloaded!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Create & Download PDF
          </>
        )}
      </Button>
    </div>
  );
}
