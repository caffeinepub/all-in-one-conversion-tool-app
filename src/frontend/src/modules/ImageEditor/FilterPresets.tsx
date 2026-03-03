import type { ImageState } from "./useImageCanvas";

interface FilterPresetsProps {
  currentFilter: string | null;
  onUpdate: (updates: Partial<ImageState>) => void;
}

const FILTERS = [
  { id: null, label: "Original", preview: "none" },
  { id: "vintage", label: "Vintage", preview: "sepia(0.5) contrast(1.1)" },
  { id: "bw", label: "B&W", preview: "grayscale(1)" },
  { id: "hdr", label: "HDR", preview: "contrast(1.4) saturate(1.5)" },
  {
    id: "cinematic",
    label: "Cinematic",
    preview: "contrast(1.2) saturate(0.8) sepia(0.15)",
  },
  { id: "cool", label: "Cool", preview: "hue-rotate(30deg) saturate(1.2)" },
  { id: "warm", label: "Warm", preview: "hue-rotate(-20deg) saturate(1.3)" },
];

export default function FilterPresets({
  currentFilter,
  onUpdate,
}: FilterPresetsProps) {
  return (
    <div className="space-y-3">
      <p className="section-title">Filters</p>
      <div className="grid grid-cols-4 gap-2">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.id ?? "original"}
            onClick={() => onUpdate({ filter: f.id })}
            className={`
              flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-200
              ${
                currentFilter === f.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <div
              className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/30 to-primary/10"
              style={{ filter: f.preview }}
            />
            <span className="text-xs font-medium leading-none">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
