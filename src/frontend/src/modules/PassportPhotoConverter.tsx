import { CreditCard, ImageIcon, Minus, Plus, Upload } from "lucide-react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import CopyGridPanel from "./PassportPhotoConverter/CopyGridPanel";
import ExportPanel from "./PassportPhotoConverter/ExportPanel";
import TextCustomizationPanel from "./PassportPhotoConverter/TextCustomizationPanel";
import {
  SIZE_OPTIONS,
  usePassportPhoto,
} from "./PassportPhotoConverter/usePassportPhoto";

export function PassportPhotoConverter() {
  const {
    state,
    processedCanvasRef,
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        const img = new window.Image();
        img.onload = () => processImage(img);
        img.onerror = () => toast.error("Failed to load image");
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [processImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) {
        toast.error("Please drop an image file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        const img = new window.Image();
        img.onload = () => processImage(img);
        img.onerror = () => toast.error("Failed to load image");
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [processImage],
  );

  const handlePresetChange = useCallback(
    (presetId: string) => {
      updatePreset(presetId as typeof state.selectedPreset);
      if (state.originalImage) {
        setTimeout(() => reprocessImage(), 0);
      }
    },
    [updatePreset, reprocessImage, state.originalImage],
  );

  const currentSize =
    state.selectedPreset === "custom"
      ? { widthMm: state.customWidth, heightMm: state.customHeight }
      : (SIZE_OPTIONS.find((o) => o.id === state.selectedPreset) ?? {
          widthMm: 35,
          heightMm: 45,
        });

  return (
    <div className="animate-slide-up space-y-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-1">
          Passport Photo Converter
        </h2>
        <p className="text-muted-foreground text-sm">
          Create professional passport photos with A4 sheet layout
        </p>
      </div>

      {/* Top Preview Section */}
      {state.processedDataUrl ? (
        <div className="glass-card box-white p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 text-center">
                Processed Photo Preview
              </p>
              <div
                className="rounded-lg overflow-hidden border-2 border-primary/30 shadow-md bg-white"
                style={{ width: 120, height: 154 }}
              >
                <img
                  src={state.processedDataUrl}
                  alt="Passport size portrait"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground">
                Photo Ready
              </p>
              <p className="text-xs text-muted-foreground">
                Size: {currentSize.widthMm}×{currentSize.heightMm}mm · 300 DPI
              </p>
              <p className="text-xs text-muted-foreground">
                {state.copyCount} {state.copyCount === 1 ? "copy" : "copies"} on
                A4 sheet
              </p>
              <p className="text-xs text-muted-foreground">
                Export format:{" "}
                <span className="font-medium uppercase text-foreground">
                  {state.exportFormat}
                </span>
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tool-btn text-xs mt-2"
              >
                <Upload className="w-3 h-3" />
                Replace Photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor="passport-file-input"
          className="glass-card box-white p-6 flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors block"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Upload a passport photo to get started
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click or drag & drop · JPG, PNG, WEBP
            </p>
          </div>
        </label>
      )}

      <input
        id="passport-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column: Controls */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          {/* Upload */}
          <div className="glass-card box-black p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Photo Upload
            </h3>
            <label
              className="upload-zone cursor-pointer block"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">
                {state.originalImage
                  ? "Replace photo"
                  : "Drop photo here or click"}
              </p>
            </label>
          </div>

          {/* Size Preset */}
          <div className="glass-card box-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Size Preset
            </h3>
            <div className="space-y-1.5">
              {SIZE_OPTIONS.filter((o) => o.id !== "custom").map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handlePresetChange(opt.id)}
                  className={`tool-btn w-full justify-start text-xs ${state.selectedPreset === opt.id ? "tool-btn-active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePresetChange("custom")}
                className={`tool-btn w-full justify-start text-xs ${state.selectedPreset === "custom" ? "tool-btn-active" : ""}`}
              >
                Custom Size
              </button>
            </div>

            {state.selectedPreset === "custom" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="custom-width"
                    className="text-xs text-muted-foreground w-16"
                  >
                    Width mm
                  </label>
                  <input
                    id="custom-width"
                    type="number"
                    min={10}
                    max={200}
                    value={state.customWidth}
                    onChange={(e) =>
                      updateCustomSize(
                        Number(e.target.value),
                        state.customHeight,
                      )
                    }
                    className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="custom-height"
                    className="text-xs text-muted-foreground w-16"
                  >
                    Height mm
                  </label>
                  <input
                    id="custom-height"
                    type="number"
                    min={10}
                    max={200}
                    value={state.customHeight}
                    onChange={(e) =>
                      updateCustomSize(
                        state.customWidth,
                        Number(e.target.value),
                      )
                    }
                    className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Copy Count */}
          <div className="glass-card box-black p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Copies on A4
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateCopyCount(state.copyCount - 1)}
                className="tool-btn w-8 h-8 p-0 justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="flex-1 text-center font-bold text-lg text-foreground">
                {state.copyCount}
              </span>
              <button
                type="button"
                onClick={() => updateCopyCount(state.copyCount + 1)}
                className="tool-btn w-8 h-8 p-0 justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Text Overlay */}
          <div className="glass-card box-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Text Overlay
            </h3>
            <TextCustomizationPanel
              textConfig={state.textConfig}
              onUpdate={updateTextConfig}
            />
          </div>

          {/* Export */}
          <ExportPanel
            exportFormat={state.exportFormat}
            onFormatChange={updateExportFormat}
            renderA4Canvas={renderA4Canvas}
            getIndividualPhotoBlobs={getIndividualPhotoBlobs}
            hasPhoto={!!state.processedDataUrl}
            canvasRef={processedCanvasRef}
          />
        </div>

        {/* Right Column: A4 Preview */}
        <div className="flex-1 min-w-0">
          <CopyGridPanel
            processedDataUrl={state.processedDataUrl}
            copyCount={state.copyCount}
            widthMm={currentSize.widthMm}
            heightMm={currentSize.heightMm}
            textConfig={state.textConfig}
            canvasRef={processedCanvasRef}
          />
        </div>
      </div>
    </div>
  );
}

export default PassportPhotoConverter;
