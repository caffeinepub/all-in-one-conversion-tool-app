import { useState } from 'react';
import { useImageConversion } from './ImageConverter/useImageConversion';
import { ConversionSettings } from './ImageConverter/ConversionSettings';
import { BeforeAfterPreview } from './ImageConverter/BeforeAfterPreview';
import ExportPanel from './ImageConverter/ExportPanel';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type TabId = 'upload' | 'settings' | 'preview' | 'export';

const TABS: { id: TabId; label: string; step: number }[] = [
  { id: 'upload', label: 'Upload', step: 1 },
  { id: 'settings', label: 'Settings', step: 2 },
  { id: 'preview', label: 'Preview', step: 3 },
  { id: 'export', label: 'Export', step: 4 },
];

export default function ImageConverter() {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const hook = useImageConversion();
  const {
    images,
    settings,
    setSettings,
    convertedImages,
    progress,
    error,
    isZipping,
    addImages,
    removeImage,
    clearAll,
    convertAll,
    downloadSingle,
    downloadAllAsZip,
  } = hook;

  // Keep selectedImageIndex in bounds
  const safeIndex = images.length > 0 ? Math.min(selectedImageIndex, images.length - 1) : 0;
  const selectedImage = images[safeIndex] ?? null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) addImages(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addImages(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleRemoveImage = (id: string) => {
    const idx = images.findIndex(img => img.id === id);
    removeImage(id);
    // Adjust selected index if needed
    if (idx <= safeIndex && safeIndex > 0) {
      setSelectedImageIndex(safeIndex - 1);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-card/50 px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {tab.step}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Layout: Left Preview + Right Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col md:flex-row h-full min-h-0">
          {/* Left Side: Persistent Image Preview */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-card/30 p-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Image Preview
            </h3>

            {selectedImage ? (
              <div className="space-y-3">
                {/* Main preview */}
                <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                  <img
                    src={selectedImage.preview}
                    alt={selectedImage.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs text-muted-foreground truncate text-center">
                  {selectedImage.name}
                </div>

                {/* Thumbnail strip for multiple images */}
                {images.length > 1 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {images.length} images — click to preview
                    </p>
                    <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative rounded overflow-hidden aspect-square border-2 transition-colors ${
                            idx === safeIndex
                              ? 'border-primary'
                              : 'border-transparent hover:border-border'
                          }`}
                        >
                          <img
                            src={img.preview}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[160px] rounded-lg border-2 border-dashed border-border/50 text-center p-4">
                <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No image loaded</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Upload images in the Upload tab</p>
              </div>
            )}
          </div>

          {/* Right Side: Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-4 max-w-xl">
                <div
                  className="upload-zone rounded-xl border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => document.getElementById('img-file-input')?.click()}
                >
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Drop images here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, WebP, GIF, BMP</p>
                  <input
                    id="img-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>

                {images.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {images.length} image{images.length !== 1 ? 's' : ''} loaded
                        <Badge variant="secondary" className="ml-2">{images.length}</Badge>
                      </span>
                      <Button variant="ghost" size="sm" onClick={clearAll}>Clear All</Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((img, idx) => (
                        <div
                          key={img.id}
                          className={`relative group rounded-lg overflow-hidden border-2 bg-card cursor-pointer transition-colors ${
                            idx === safeIndex ? 'border-primary' : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedImageIndex(idx)}
                        >
                          <img src={img.preview} alt={img.name} className="w-full aspect-square object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate">{img.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setActiveTab('settings')}
                    disabled={images.length === 0}
                  >
                    Next: Settings →
                  </Button>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-md space-y-4">
                <ConversionSettings
                  settings={settings}
                  onChange={(partial) => setSettings(prev => ({ ...prev, ...partial }))}
                />
                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('preview')}>
                    Next: Preview →
                  </Button>
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-4 max-w-xl">
                {selectedImage ? (
                  <>
                    <BeforeAfterPreview
                      originalImage={selectedImage}
                      convertedImage={convertedImages.find(c => c.id === selectedImage.id) ?? null}
                      settings={settings}
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => setActiveTab('export')}>
                        Next: Export →
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-30" />
                    <p>No images loaded. Go back to Upload.</p>
                  </div>
                )}
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="max-w-xl">
                <ExportPanel
                  convertedImages={convertedImages}
                  progress={progress}
                  error={error}
                  isZipping={isZipping}
                  onConvertAll={convertAll}
                  onDownloadSingle={downloadSingle}
                  onDownloadAllAsZip={downloadAllAsZip}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
