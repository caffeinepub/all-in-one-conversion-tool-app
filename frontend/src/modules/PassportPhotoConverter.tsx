import { useCallback, useRef } from 'react';
import { Upload, CreditCard, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePassportPhoto, SIZE_OPTIONS } from './PassportPhotoConverter/usePassportPhoto';
import CopyGridPanel from './PassportPhotoConverter/CopyGridPanel';
import TextCustomizationPanel from './PassportPhotoConverter/TextCustomizationPanel';
import ExportPanel from './PassportPhotoConverter/ExportPanel';

export default function PassportPhotoConverter() {
  const {
    state,
    processImage,
    reprocessImage,
    updatePreset,
    updateCustomSize,
    updateCopyCount,
    updateTextConfig,
    updateExportFormat,
    renderA4Canvas,
    getIndividualPhotoBlobs,
  } = usePassportPhoto();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => processImage(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => processImage(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  const handlePresetChange = useCallback((presetId: string) => {
    updatePreset(presetId as typeof state.selectedPreset);
    if (state.originalImage) {
      setTimeout(() => reprocessImage(), 0);
    }
  }, [updatePreset, reprocessImage, state.originalImage]);

  // Derive widthMm and heightMm for CopyGridPanel
  const currentSize = state.selectedPreset === 'custom'
    ? { widthMm: state.customWidth, heightMm: state.customHeight }
    : SIZE_OPTIONS.find(o => o.id === state.selectedPreset) ?? { widthMm: 35, heightMm: 45 };

  return (
    <div className="animate-slide-up space-y-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">Passport Photo Converter</h2>
        <p className="text-muted-foreground text-sm">Create professional passport photos with A4 sheet layout</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column: Controls */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          {/* Upload */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Photo Upload
            </h3>
            <div
              className="upload-zone cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {state.originalImage ? 'Click to replace photo' : 'Click or drag to upload'}
              </p>
              <p className="text-xs text-muted-foreground/60 text-center mt-1">JPG, PNG, WEBP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Size Preset */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Photo Size</h3>
            <div className="space-y-1.5">
              {SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handlePresetChange(opt.id)}
                  className={`tool-btn w-full justify-start text-xs ${state.selectedPreset === opt.id ? 'tool-btn-active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {state.selectedPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-xs text-muted-foreground">Width (mm)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={state.customWidth}
                    onChange={e => updateCustomSize(Number(e.target.value), state.customHeight)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height (mm)</label>
                  <input
                    type="number"
                    min={10}
                    max={150}
                    value={state.customHeight}
                    onChange={e => updateCustomSize(state.customWidth, Number(e.target.value))}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Copy Count */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Number of Copies</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateCopyCount(state.copyCount - 1)}
                className="tool-btn w-9 h-9 p-0 justify-center flex-shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center font-bold text-lg tabular-nums">{state.copyCount}</span>
              <button
                onClick={() => updateCopyCount(state.copyCount + 1)}
                className="tool-btn w-9 h-9 p-0 justify-center flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Copies per A4 sheet (max 40)</p>
          </div>

          {/* Text Customization */}
          <TextCustomizationPanel
            textConfig={state.textConfig}
            onUpdate={updateTextConfig}
          />

          {/* Export */}
          <ExportPanel
            exportFormat={state.exportFormat}
            onFormatChange={updateExportFormat}
            renderA4Canvas={renderA4Canvas}
            getIndividualPhotoBlobs={getIndividualPhotoBlobs}
            hasPhoto={!!state.processedDataUrl}
            canvasRef={canvasRef}
          />
        </div>

        {/* Right Column: Preview */}
        <div className="flex-1 min-w-0">
          <CopyGridPanel
            processedDataUrl={state.processedDataUrl}
            copyCount={state.copyCount}
            widthMm={currentSize.widthMm}
            heightMm={currentSize.heightMm}
            textConfig={state.textConfig}
            canvasRef={canvasRef}
          />
        </div>
      </div>
    </div>
  );
}
