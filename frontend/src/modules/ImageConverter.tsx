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

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4 max-w-2xl mx-auto">
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
                  {images.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border bg-card">
                      <img src={img.preview} alt={img.name} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <button
                        onClick={() => removeImage(img.id)}
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
          <div className="max-w-md mx-auto space-y-4">
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
          <div className="space-y-4 max-w-2xl mx-auto">
            {images.length > 0 ? (
              <>
                <BeforeAfterPreview
                  originalImage={images[0]}
                  convertedImage={convertedImages.find(c => c.id === images[0].id) ?? null}
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
          <div className="max-w-2xl mx-auto">
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
  );
}
