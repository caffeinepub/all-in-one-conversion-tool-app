import { Button } from "@/components/ui/button";
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
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";
import type { TextConfig } from "./usePassportPhoto";

interface TextCustomizationPanelProps {
  textConfig: TextConfig;
  onUpdate: (config: Partial<TextConfig>) => void;
}

const FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
];

function hexToRgba(hex: string, opacity: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function TextCustomizationPanel({
  textConfig,
  onUpdate,
}: TextCustomizationPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="text-enabled"
          checked={textConfig.enabled}
          onCheckedChange={(v) => onUpdate({ enabled: v })}
        />
        <Label htmlFor="text-enabled" className="cursor-pointer">
          Enable text overlay
        </Label>
      </div>

      {textConfig.enabled && (
        <div className="space-y-4 pl-1">
          {/* Text content */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Text
            </Label>
            <Input
              value={textConfig.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter overlay text…"
            />
          </div>

          {/* Font family */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Font Family
            </Label>
            <Select
              value={textConfig.fontFamily}
              onValueChange={(v) => onUpdate({ fontFamily: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font size */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Font Size: {textConfig.fontSize}px
            </Label>
            <Slider
              min={8}
              max={48}
              step={1}
              value={[textConfig.fontSize]}
              onValueChange={([v]) => onUpdate({ fontSize: v })}
            />
          </div>

          {/* Text color */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Text Color:</Label>
            <input
              type="color"
              value={textConfig.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="h-8 w-12 rounded border border-border cursor-pointer"
            />
          </div>

          {/* Bold / Italic / Align */}
          <div className="flex items-center gap-2">
            <Button
              variant={textConfig.bold ? "default" : "outline"}
              size="icon"
              onClick={() => onUpdate({ bold: !textConfig.bold })}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={textConfig.italic ? "default" : "outline"}
              size="icon"
              onClick={() => onUpdate({ italic: !textConfig.italic })}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <div className="flex gap-1 ml-2">
              {(["left", "center", "right"] as const).map((alignVal) => (
                <Button
                  key={alignVal}
                  variant={
                    textConfig.align === alignVal ? "default" : "outline"
                  }
                  size="icon"
                  onClick={() => onUpdate({ align: alignVal })}
                  title={`Align ${alignVal}`}
                >
                  {alignVal === "left" ? (
                    <AlignLeft className="h-4 w-4" />
                  ) : alignVal === "center" ? (
                    <AlignCenter className="h-4 w-4" />
                  ) : (
                    <AlignRight className="h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* ── Text Background Color ── */}
          <div className="glass-card p-3 space-y-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Text Background
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Switch
                  id="text-bg-enabled"
                  checked={textConfig.textBgEnabled}
                  onCheckedChange={(v) => onUpdate({ textBgEnabled: v })}
                />
                <Label
                  htmlFor="text-bg-enabled"
                  className="text-xs cursor-pointer"
                >
                  {textConfig.textBgEnabled ? "On" : "Off"}
                </Label>
              </div>
            </div>

            {textConfig.textBgEnabled && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-16 shrink-0">
                    Color:
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={textConfig.textBgColor}
                      onChange={(e) =>
                        onUpdate({ textBgColor: e.target.value })
                      }
                      className="h-8 w-12 rounded border border-border cursor-pointer"
                    />
                    <div
                      className="h-8 flex-1 rounded border border-border/50"
                      style={{
                        backgroundColor: hexToRgba(
                          textConfig.textBgColor,
                          textConfig.textBgOpacity,
                        ),
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Opacity: {Math.round(textConfig.textBgOpacity * 100)}%
                  </Label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[Math.round(textConfig.textBgOpacity * 100)]}
                    onValueChange={([v]) =>
                      onUpdate({ textBgOpacity: v / 100 })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Text Shadow ── */}
          <div className="glass-card p-3 space-y-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Text Shadow
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Switch
                  id="text-shadow-enabled"
                  checked={textConfig.textShadowEnabled}
                  onCheckedChange={(v) => onUpdate({ textShadowEnabled: v })}
                />
                <Label
                  htmlFor="text-shadow-enabled"
                  className="text-xs cursor-pointer"
                >
                  {textConfig.textShadowEnabled ? "On" : "Off"}
                </Label>
              </div>
            </div>

            {textConfig.textShadowEnabled && (
              <div className="space-y-3 pt-1">
                {/* Shadow color */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-16 shrink-0">
                    Color:
                  </Label>
                  <input
                    type="color"
                    value={textConfig.textShadowColor}
                    onChange={(e) =>
                      onUpdate({ textShadowColor: e.target.value })
                    }
                    className="h-8 w-12 rounded border border-border cursor-pointer"
                  />
                  <div
                    className="h-8 w-8 rounded border border-border/50"
                    style={{ backgroundColor: textConfig.textShadowColor }}
                  />
                </div>

                {/* Blur radius */}
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      Blur Radius
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {textConfig.textShadowBlur}px
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={20}
                    step={1}
                    value={[textConfig.textShadowBlur]}
                    onValueChange={([v]) => onUpdate({ textShadowBlur: v })}
                  />
                </div>

                {/* Horizontal offset */}
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      Horizontal Offset
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {textConfig.textShadowOffsetX}px
                    </span>
                  </div>
                  <Slider
                    min={-10}
                    max={10}
                    step={1}
                    value={[textConfig.textShadowOffsetX]}
                    onValueChange={([v]) => onUpdate({ textShadowOffsetX: v })}
                  />
                </div>

                {/* Vertical offset */}
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      Vertical Offset
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {textConfig.textShadowOffsetY}px
                    </span>
                  </div>
                  <Slider
                    min={-10}
                    max={10}
                    step={1}
                    value={[textConfig.textShadowOffsetY]}
                    onValueChange={([v]) => onUpdate({ textShadowOffsetY: v })}
                  />
                </div>

                {/* Live preview */}
                <div className="mt-2 p-3 rounded bg-muted/40 flex items-center justify-center">
                  <span
                    className="text-sm font-medium select-none"
                    style={{
                      color: textConfig.color,
                      textShadow: `${textConfig.textShadowOffsetX}px ${textConfig.textShadowOffsetY}px ${textConfig.textShadowBlur}px ${textConfig.textShadowColor}`,
                    }}
                  >
                    {textConfig.content || "Preview Text"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TextCustomizationPanel;
