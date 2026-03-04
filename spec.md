# All-in-One Conversion Tool App

## Current State

Multimedia Studio (`MultimediaApp.tsx`) has 6 tabs:
- MP3 Cutter
- Video Cutter
- IP Camera
- Video Clips
- IPTV Player
- Text Converter (Krutidev ↔ Unicode, rendered by `TextFormatConverter.tsx`)

The "Text Converter" tab currently handles only Krutidev ↔ Unicode Devanagari font conversion.

## Requested Changes (Diff)

### Add
- New **Translator** tab in Multimedia Studio: Hindi ↔ English translation. User types or pastes text, selects direction (Hindi→English or English→Hindi), and gets the translated output. Translation is done client-side using the MyMemory free translation API (no API key needed). Includes a swap direction button, copy output button, and clear button.
- New combined page called **"Text Magic"** that consolidates both the existing **Text Converter** tab and the new **Translator** tab into a single unified page with two sub-sections (or internal tabs).

### Modify
- Replace the existing "Text Converter" tab in Multimedia Studio with a single **"Text Magic"** tab.
- The Text Magic tab renders both sub-tools on one page:
  1. **Text Converter** — existing Krutidev ↔ Unicode functionality (unchanged)
  2. **Translator** — new Hindi ↔ English translation tool
- Update `MultimediaTabId` type and the tabs array in `MultimediaApp.tsx` accordingly: rename `"text-converter"` to `"text-magic"`.
- Update the tab label to "Text Magic" and update the icon/description.

### Remove
- The standalone "Text Converter" tab entry (replaced by "Text Magic").

## Implementation Plan

1. Create `src/frontend/src/modules/Translator.tsx` — new Hindi↔English translator component using MyMemory API (`https://api.mymemory.translated.net/get?q=TEXT&langpair=hi|en` or `en|hi`). Features: direction toggle (Hindi→English / English→Hindi), text input, translated output (auto on input change with debounce), swap button, copy button, clear button, loading/error states.

2. Create `src/frontend/src/modules/TextMagic.tsx` — wrapper page that renders both `TextFormatConverter` and `Translator` on the same page, separated by a clear section divider and section headings. Uses internal tab switcher or stacked layout so both tools are accessible without leaving the page.

3. Update `MultimediaApp.tsx`:
   - Add `"text-magic"` to `MultimediaTabId` union, remove `"text-converter"`.
   - Replace the `text-converter` entry in `tabs` array with a `text-magic` entry (label: "Text Magic", icon: `<Sparkles>` or `<Languages>`, description: "Translate & convert text").
   - Replace `{activeTab === "text-converter" && <TextFormatConverter />}` with `{activeTab === "text-magic" && <TextMagic />}`.
   - Remove the `TextFormatConverter` import (it will be used inside `TextMagic.tsx` instead).
   - Add import for `TextMagic`.
