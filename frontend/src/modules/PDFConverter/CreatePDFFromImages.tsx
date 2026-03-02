import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Upload, Camera, X, Sparkles, FileDown, Loader2, AlertCircle, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { downloadAsZip } from '@/lib/jszip';

interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  enhanced: boolean;
}

interface CreatePDFFromImagesProps {
  isProcessing: boolean;
  lastCreatedPDF: Uint8Array | null;
  onCreatePDF: (images: File[], options?: { enhance?: boolean; compress?: boolean }) => void;
}

export default function CreatePDFFromImages({ isProcessing, lastCreatedPDF, onCreatePDF }: CreatePDFFromImagesProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [compress, setCompress] = useState(false);
  const [enhance, setEnhance] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addImageFromDataUrl = (dataUrl: string, name: string) => {
    setImages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name,
      dataUrl,
      enhanced: false,
    }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) addImageFromDataUrl(ev.target.result as string, file.name);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied or not available.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleOpenCamera = async () => {
    setShowCamera(true);
    await startCamera();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    addImageFromDataUrl(dataUrl, `camera-${Date.now()}.jpg`);
    stopCamera();
    setShowCamera(false);
  };

  const enhanceImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = 'brightness(1.15) contrast(1.25) saturate(1.1)';
      ctx.drawImage(image, 0, 0);
      const enhanced = canvas.toDataURL('image/jpeg', 0.95);
      setImages(prev => prev.map(i => i.id === id ? { ...i, dataUrl: enhanced, enhanced: true } : i));
      toast.success('Image enhanced!');
    };
    image.src = img.dataUrl;
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
  };

  // Convert dataUrl images to File objects for the hook
  const handleCreatePDF = async () => {
    if (images.length === 0) return;
    const files = await Promise.all(images.map(async (img) => {
      const res = await fetch(img.dataUrl);
      const blob = await res.blob();
      return new File([blob], img.name, { type: blob.type || 'image/jpeg' });
    }));
    onCreatePDF(files, { enhance, compress });
  };

  const handleDownloadZip = async () => {
    if (!lastCreatedPDF) {
      toast.error('Create a PDF first');
      return;
    }
    setIsZipping(true);
    try {
      const blob = new Blob([lastCreatedPDF.buffer as ArrayBuffer], { type: 'application/pdf' });
      await downloadAsZip([{ filename: 'created-document.pdf', data: blob }], 'created-document.zip');
      toast.success('PDF downloaded as ZIP!');
    } catch {
      toast.error('Failed to create ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Create PDF from Images</p>

      {showCamera ? (
        <div className="space-y-3 animate-scale-in">
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 200 }}>
            <video ref={videoRef} className="w-full h-auto" style={{ minHeight: 200 }} playsInline muted autoPlay />
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <div className="text-center text-white">
                  <AlertCircle className="w-6 h-6 mx-auto mb-1 text-destructive" />
                  <p className="text-xs">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCapture} disabled={!cameraActive} className="flex-1">
              <Camera className="w-3.5 h-3.5 mr-2" />
              Capture
            </Button>
            <Button size="sm" variant="outline" onClick={() => { stopCamera(); setShowCamera(false); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            Add Images
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleOpenCamera}>
            <Camera className="w-3.5 h-3.5" />
            Camera
          </Button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {images.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {images.map((img) => (
            <div key={img.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50">
              <img src={img.dataUrl} alt={img.name} className="w-10 h-10 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{img.name}</p>
                {img.enhanced && <p className="text-xs text-success">✓ Enhanced</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary"
                onClick={() => enhanceImage(img.id)}
                title="Auto enhance"
              >
                <Sparkles className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => removeImage(img.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch checked={enhance} onCheckedChange={setEnhance} id="enhance-pdf" />
        <Label htmlFor="enhance-pdf" className="text-xs cursor-pointer">Auto-enhance images</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={compress} onCheckedChange={setCompress} id="compress-pdf" />
        <Label htmlFor="compress-pdf" className="text-xs cursor-pointer">Compress PDF (smaller file size)</Label>
      </div>

      <Button
        size="sm"
        onClick={handleCreatePDF}
        disabled={images.length === 0 || isProcessing}
        className="w-full gap-2"
      >
        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        Create PDF ({images.length} image{images.length !== 1 ? 's' : ''})
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadZip}
        disabled={!lastCreatedPDF || isZipping}
        className="w-full gap-2"
      >
        {isZipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
        {isZipping ? 'Creating ZIP...' : 'Download as ZIP'}
      </Button>
    </div>
  );
}
