# All-in-One Conversion Tool App

## Current State
Multimedia Studio has 7 tabs: MP3 Cutter, Video Cutter, Video Downloader, IP Camera, Video Clips, IPTV Player, CCTV CAM. The tab list is defined in `MultimediaApp.tsx` and each tab maps to a module component in `src/modules/`.

## Requested Changes (Diff)

### Add
- New tab "Text Converter" in Multimedia Studio
- New module `TextFormatConverter.tsx` with Krutidev ↔ Unicode bidirectional conversion
  - Two-way conversion: Krutidev → Unicode (Devanagari) and Unicode → Krutidev
  - Large input textarea for source text
  - Output textarea showing converted result (read-only)
  - Toggle/radio to select conversion direction
  - Copy to clipboard button for output
  - Clear button to reset both fields
  - Character count display for input and output
  - Full Krutidev ↔ Unicode character mapping table built-in (no external API needed)

### Modify
- `MultimediaApp.tsx`: add `"text-converter"` to `MultimediaTabId` union, add tab entry to `tabs` array, render `<TextFormatConverter />` when active

### Remove
- Nothing

## Implementation Plan
1. Create `src/modules/TextFormatConverter.tsx` with complete Krutidev ↔ Unicode mapping and conversion logic
2. Update `MultimediaApp.tsx` to import and wire in the new tab
