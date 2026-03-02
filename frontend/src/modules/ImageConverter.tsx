import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { useImageConversion, type ConversionSettings as ConversionSettingsType } from './ImageConverter/useImageConversion';
import { BatchUploadPanel } from './ImageConverter/BatchUploadPanel';
import ConversionSettingsPanel from './ImageConverter/ConversionSettings';
import BeforeAfterPreview from './ImageConverter/BeforeAfterPreview';
import ExportPanel from './ImageConverter/ExportPanel';

function PreviewImage({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  if (!src) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
        <ImageIcon className="w-10 h-10 opacity-30" />
        <p className="text-sm text-center">Upload images to see preview</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive gap-2 p-4">
        <AlertCircle className="w-8 h-8 opacity-60" />
        <p className="text-xs text-center">Preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

function ThumbnailItem({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50">
        <AlertCircle className="w-3 h-3 text-destructive opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 bg-muted/30" />}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

const TAB_ORDER = ['upload', 'settings', 'preview', 'export'] as const;
type TabValue = typeof TAB_ORDER[number];

export function ImageConverter() {
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
  } = useImageConversion();

  const [activeTab, setActiveTab] = React.useState<TabValue>('upload');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const currentImage = images[selectedIndex] ?? null;
  const currentConverted = currentImage
    ? convertedImages.find(c => c.id === currentImage.id) ?? null
    : null;

  const handleSettingsChange = React.useCallback((partial: Partial<ConversionSettingsType>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  const goToTab = React.useCallback((tab: TabValue) => {
    setActiveTab(tab);
  }, []);

  const goNext = React.useCallback(() => {
    const idx = TAB_ORDER.indexOf(activeTab);
    if (idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1]);
  }, [activeTab]);

  const goBack = React.useCallback(() => {
    const idx = TAB_ORDER.indexOf(activeTab);
    if (idx > 0) setActiveTab(TAB_ORDER[idx - 1]);
  }, [activeTab]);

  const ThumbnailStrip = () => {
    if (images.length <= 1) return null;
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setSelectedIndex(idx)}
            className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all ${
              idx === selectedIndex ? 'border-primary' : 'border-border/50 hover:border-border'
            }`}
          >
            <ThumbnailItem src={img.preview} alt={img.name} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Persistent Preview Panel */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="glass-card p-4 sticky top-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            {currentImage ? currentImage.name : 'Preview'}
          </p>
          <div
            className="w-full rounded-lg overflow-hidden bg-muted/20 border border-border/50 flex items-center justify-center"
            style={{ minHeight: 200, aspectRatio: '4/3' }}
          >
            <PreviewImage
              src={currentImage?.preview ?? null}
              alt={currentImage?.name ?? 'preview'}
            />
          </div>
          <ThumbnailStrip />
          {currentImage && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Original: {(currentImage.size / 1024).toFixed(1)} KB
              </p>
              {currentConverted && (
                <p className="text-xs text-muted-foreground">
                  Converted: {(currentConverted.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Tabs */}
      <div className="flex-1 min-w-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <BatchUploadPanel
              images={images}
              onAddImages={addImages}
              onRemoveImage={removeImage}
              onClearAll={clearAll}
              onNext={goNext}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <ConversionSettingsPanel
              settings={settings}
              onChange={handleSettingsChange}
              onNext={goNext}
              onBack={goBack}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {currentImage ? (
              <BeforeAfterPreview
                originalImage={currentImage}
                convertedImage={currentConverted}
                settings={settings}
                onNext={goNext}
                onBack={goBack}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Upload images first to preview</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <button
                    onClick={goBack}
                    className="tool-btn px-5 py-2 text-sm font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={goNext}
                    className="tool-btn px-5 py-2 text-sm font-medium"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            <ExportPanel
              convertedImages={convertedImages}
              progress={progress}
              error={error}
              isZipping={isZipping}
              onConvertAll={convertAll}
              onDownloadSingle={downloadSingle}
              onDownloadAllAsZip={downloadAllAsZip}
              onBack={goBack}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ImageConverter;
