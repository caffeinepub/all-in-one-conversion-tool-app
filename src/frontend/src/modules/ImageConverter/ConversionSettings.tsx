import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  FilterType,
  OutputFormat,
  ConversionSettings as Settings,
} from "./useImageConversion";

interface ConversionSettingsProps {
  settings: Settings;
  onChange: (settings: Partial<Settings>) => void;
  onNext?: () => void;
  onBack?: () => void;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "gif", label: "GIF" },
  { value: "bmp", label: "BMP" },
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "grayscale", label: "Grayscale" },
  { value: "sepia", label: "Sepia" },
  { value: "vivid", label: "Vivid" },
  { value: "cool", label: "Cool" },
  { value: "warm", label: "Warm" },
];

export function ConversionSettings({
  settings,
  onChange,
  onNext,
  onBack,
}: ConversionSettingsProps) {
  return (
    <div className="space-y-5">
      {/* Format */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Output Format
        </Label>
        <Select
          value={settings.format}
          onValueChange={(v) => onChange({ format: v as OutputFormat })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      {["jpeg", "webp"].includes(settings.format) && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quality: {settings.quality}%
          </Label>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[settings.quality]}
            onValueChange={([v]) => onChange({ quality: v })}
          />
        </div>
      )}

      {/* Resize Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resize
        </Label>
        <Select
          value={settings.resizeMode}
          onValueChange={(v) =>
            onChange({ resizeMode: v as Settings["resizeMode"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Resize</SelectItem>
            <SelectItem value="dimensions">By Dimensions</SelectItem>
            <SelectItem value="percentage">By Percentage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.resizeMode === "dimensions" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Width (px)
              </Label>
              <Input
                type="number"
                min={1}
                value={settings.width}
                onChange={(e) => onChange({ width: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Height (px)
              </Label>
              <Input
                type="number"
                min={1}
                value={settings.height}
                onChange={(e) => onChange({ height: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="aspect-ratio"
              checked={settings.maintainAspectRatio}
              onCheckedChange={(v) => onChange({ maintainAspectRatio: v })}
            />
            <Label htmlFor="aspect-ratio" className="text-xs cursor-pointer">
              Maintain aspect ratio
            </Label>
          </div>
        </div>
      )}

      {settings.resizeMode === "percentage" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scale: {settings.percentage}%
          </Label>
          <Slider
            min={1}
            max={200}
            step={1}
            value={[settings.percentage]}
            onValueChange={([v]) => onChange({ percentage: v })}
          />
        </div>
      )}

      {/* Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filter
        </Label>
        <Select
          value={settings.filter}
          onValueChange={(v) => onChange({ filter: v as FilterType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onBack}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="tool-btn px-5 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default ConversionSettings;
