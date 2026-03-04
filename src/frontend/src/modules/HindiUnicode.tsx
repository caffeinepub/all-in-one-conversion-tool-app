import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ─── Transliteration map ─────────────────────────────────────────────────────
// Maps romanised syllable patterns → Hindi Unicode Devanagari
// Order matters: longer/more-specific patterns must come first.

const TRANS_MAP: [RegExp, string][] = [
  // ── Multi-char consonant clusters ──────────────────────────────────────────
  [/ksh/gi, "क्ष"],
  [/gya/gi, "ज्ञ"],
  [/tra/gi, "त्र"],
  [/shri/gi, "श्री"],
  [/shr/gi, "श्र"],
  [/tth/gi, "ठ"],
  [/ddh/gi, "ढ"],
  [/ngh/gi, "ङ"],
  [/ndh/gi, "न्ध"],
  [/nth/gi, "न्थ"],
  [/nch/gi, "न्च"],
  [/nj/gi, "न्ज"],
  // ── Aspirated consonants ───────────────────────────────────────────────────
  [/bh/gi, "भ"],
  [/ch/gi, "च"],
  [/dh/gi, "ध"],
  [/gh/gi, "घ"],
  [/jh/gi, "झ"],
  [/kh/gi, "ख"],
  [/ph/gi, "फ"],
  [/rh/gi, "ऋ"],
  [/sh/gi, "श"],
  [/th/gi, "थ"],
  [/vh/gi, "व"],
  // ── Long vowels (must come before short) ──────────────────────────────────
  [/aa/gi, "आ"],
  [/ee/gi, "ई"],
  [/ii/gi, "ई"],
  [/oo/gi, "ऊ"],
  [/uu/gi, "ऊ"],
  [/ai/gi, "ऐ"],
  [/au/gi, "औ"],
  [/ou/gi, "औ"],
  [/oe/gi, "ओ"],
  // ── Single consonants ─────────────────────────────────────────────────────
  [/b/gi, "ब"],
  [/c/gi, "क"],
  [/d/gi, "ड"],
  [/f/gi, "फ"],
  [/g/gi, "ग"],
  [/h/gi, "ह"],
  [/j/gi, "ज"],
  [/k/gi, "क"],
  [/l/gi, "ल"],
  [/m/gi, "म"],
  [/n/gi, "न"],
  [/p/gi, "प"],
  [/q/gi, "क"],
  [/r/gi, "र"],
  [/s/gi, "स"],
  [/t/gi, "त"],
  [/v/gi, "व"],
  [/w/gi, "व"],
  [/x/gi, "क्स"],
  [/y/gi, "य"],
  [/z/gi, "ज़"],
  // ── Short vowels (last) ────────────────────────────────────────────────────
  [/a/gi, "अ"],
  [/e/gi, "ए"],
  [/i/gi, "इ"],
  [/o/gi, "ओ"],
  [/u/gi, "उ"],
];

function transliterateWord(word: string): string {
  if (!word.trim()) return word;
  let result = word;
  for (const [pattern, replacement] of TRANS_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function transliterateText(text: string): string {
  // Process word-by-word to preserve spaces, newlines, punctuation
  return text
    .split(/(\s+)/)
    .map((chunk) => (/^\s+$/.test(chunk) ? chunk : transliterateWord(chunk)))
    .join("");
}

// ─── Kruti Dev 10 Converter ──────────────────────────────────────────────────
// Converts Hindi Unicode (Devanagari) text to Kruti Dev 10 encoded ASCII.
// Order matters: matras & multi-char sequences first, then standalone chars.

// Matras (dependent vowel signs) – must be handled before standalone vowels
const KRUTI_MATRA_MAP: [string, string][] = [
  ["ो", "ks"],
  ["ौ", "kS"],
  ["ा", "k"],
  ["ि", "f"],
  ["ी", "h"],
  ["ु", "q"],
  ["ू", "w"],
  ["े", "s"],
  ["ै", "S"],
  ["ं", "a"],
  ["ः", "%"],
  ["ँ", "¡"],
  ["़", ""],
  ["्", "~"], // virama / halant for conjuncts
  ["ॅ", "W"],
];

// Standalone characters (vowels, consonants, numerals) — Kruti Dev 010
const KRUTI_CHAR_MAP_010: [string, string][] = [
  // Standalone vowels
  ["अं", "va"],
  ["अः", "v%"],
  ["आ", "vk"],
  ["इ", "b"],
  ["ई", "bZ"],
  ["उ", "m"],
  ["ऊ", "Å"],
  ["ऋ", "_k"],
  ["ए", ","],
  ["ऐ", ",s"],
  ["ओ", "vks"],
  ["औ", "vkS"],
  ["अ", "v"],
  // Consonants
  ["क्ष", "{k"],
  ["ज्ञ", "K"],
  ["त्र", "="],
  ["श्र", "J"],
  ["क", "d"],
  ["ख", "[k"],
  ["ग", "x"],
  ["घ", "?k"],
  ["ङ", "³"],
  ["च", "p"],
  ["छ", "N"],
  ["ज", "t"],
  ["झ", ">k"],
  ["ञ", "¥"],
  ["ट", "V"],
  ["ठ", "B"],
  ["ड", "M"],
  ["ढ", "<"], // KD010: ढ → <
  ["ण", ".k"],
  ["त", "r"],
  ["थ", "Fk"],
  ["द", "n"],
  ["ध", "/k"],
  ["न", "u"],
  ["प", "i"],
  ["फ", "Q"],
  ["ब", "c"],
  ["भ", "Hk"],
  ["म", "e"],
  ["य", ";"],
  ["र", "j"],
  ["ल", "y"],
  ["व", "o"],
  ["श", "'k"],
  ["ष", '"k'],
  ["स", "l"],
  ["ह", "g"],
  // Numerals
  ["०", "0"],
  ["१", "1"],
  ["२", "2"],
  ["३", "3"],
  ["४", "4"],
  ["५", "5"],
  ["६", "6"],
  ["७", "7"],
  ["८", "8"],
  ["९", "9"],
];

// Standalone characters (vowels, consonants, numerals) — Kruti Dev 014
// Key difference from 010: ढ → <+ instead of <
const KRUTI_CHAR_MAP_014: [string, string][] = [
  // Standalone vowels
  ["अं", "va"],
  ["अः", "v%"],
  ["आ", "vk"],
  ["इ", "b"],
  ["ई", "bZ"],
  ["उ", "m"],
  ["ऊ", "Å"],
  ["ऋ", "_k"],
  ["ए", ","],
  ["ऐ", ",s"],
  ["ओ", "vks"],
  ["औ", "vkS"],
  ["अ", "v"],
  // Consonants
  ["क्ष", "{k"],
  ["ज्ञ", "K"],
  ["त्र", "="],
  ["श्र", "J"],
  ["क", "d"],
  ["ख", "[k"],
  ["ग", "x"],
  ["घ", "?k"],
  ["ङ", "³"],
  ["च", "p"],
  ["छ", "N"],
  ["ज", "t"],
  ["झ", ">k"],
  ["ञ", "¥"],
  ["ट", "V"],
  ["ठ", "B"],
  ["ड", "M"],
  ["ढ", "<+"], // KD014: ढ → <+ (differs from KD010)
  ["ण", ".k"],
  ["त", "r"],
  ["थ", "Fk"],
  ["द", "n"],
  ["ध", "/k"],
  ["न", "u"],
  ["प", "i"],
  ["फ", "Q"],
  ["ब", "c"],
  ["भ", "Hk"],
  ["म", "e"],
  ["य", ";"],
  ["र", "j"],
  ["ल", "y"],
  ["व", "o"],
  ["श", "'k"],
  ["ष", '"k'],
  ["स", "l"],
  ["ह", "g"],
  // Numerals
  ["०", "0"],
  ["१", "1"],
  ["२", "2"],
  ["३", "3"],
  ["४", "4"],
  ["५", "5"],
  ["६", "6"],
  ["७", "7"],
  ["८", "8"],
  ["९", "9"],
];

function toKrutiDev10(unicode: string): string {
  if (!unicode) return "";
  let result = unicode;

  // Step 1: replace matras (dependent vowel signs)
  for (const [ch, kd] of KRUTI_MATRA_MAP) {
    result = result.split(ch).join(kd);
  }

  // Step 2: replace standalone chars (vowels, consonants, numerals)
  for (const [ch, kd] of KRUTI_CHAR_MAP_010) {
    result = result.split(ch).join(kd);
  }

  return result;
}

function toKrutiDev14(unicode: string): string {
  if (!unicode) return "";
  let result = unicode;

  // Step 1: replace matras (dependent vowel signs) — same as KD010
  for (const [ch, kd] of KRUTI_MATRA_MAP) {
    result = result.split(ch).join(kd);
  }

  // Step 2: replace standalone chars using KD014-specific map
  for (const [ch, kd] of KRUTI_CHAR_MAP_014) {
    result = result.split(ch).join(kd);
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HindiUnicode() {
  const [inputText, setInputText] = useState("");
  const [unicodeText, setUnicodeText] = useState("");
  const [krutiText, setKrutiText] = useState("");
  const [kruti14Text, setKruti14Text] = useState("");

  const handleInput = useCallback((val: string) => {
    setInputText(val);
    const unicode = transliterateText(val);
    setUnicodeText(unicode);
    setKrutiText(toKrutiDev10(unicode));
    setKruti14Text(toKrutiDev14(unicode));
  }, []);

  const handleCopyUnicode = () => {
    if (!unicodeText) return;
    navigator.clipboard.writeText(unicodeText);
    toast.success("Hindi Unicode copied to clipboard!");
  };

  const handleCopyKruti = () => {
    if (!krutiText) return;
    navigator.clipboard.writeText(krutiText);
    toast.success("Kruti Dev 010 text copied to clipboard!");
  };

  const handleCopyKruti14 = () => {
    if (!kruti14Text) return;
    navigator.clipboard.writeText(kruti14Text);
    toast.success("Kruti Dev 014 text copied to clipboard!");
  };

  const handleClear = () => {
    setInputText("");
    setUnicodeText("");
    setKrutiText("");
    setKruti14Text("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200">Hindi Unicode</h3>
        <p className="text-sm text-gray-500 mt-1">
          Type English (Roman) words and instantly see them converted to Hindi
          Unicode (Devanagari), Kruti Dev 010, and Kruti Dev 014 font encoding.
        </p>
      </div>

      {/* Example hint */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-400">
        <span className="font-medium text-gray-300">Examples: </span>
        namaste → नमस्ते &nbsp;|&nbsp; bharat → भारत &nbsp;|&nbsp; krishna → क्रिष्ण
      </div>

      {/* Editor area — 2 columns on desktop (input left, outputs right), stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* ── Input ── */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="hindi-unicode-input"
            className="text-xs font-medium text-gray-400 uppercase tracking-wider"
          >
            English Input
          </label>
          <Textarea
            id="hindi-unicode-input"
            data-ocid="hindi_unicode.input"
            value={inputText}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Type in English here… e.g. namaste"
            className="flex-1 min-h-[320px] resize-none bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 text-base focus-visible:ring-teal-500"
          />
        </div>

        {/* ── Right column: 3 stacked output boxes ── */}
        <div className="flex flex-col gap-4">
          {/* Hindi Unicode Output */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="hindi-unicode-output"
                className="text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                Hindi Unicode Output
              </label>
              <Badge
                variant="outline"
                className="text-[10px] border-teal-500/40 text-teal-400"
              >
                Devanagari
              </Badge>
            </div>
            <Textarea
              id="hindi-unicode-output"
              data-ocid="hindi_unicode.unicode_output"
              value={unicodeText}
              readOnly
              placeholder="Hindi Unicode will appear here…"
              className="min-h-[80px] resize-none bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 text-xl leading-relaxed focus-visible:ring-teal-500"
              style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
            />
            <Button
              data-ocid="hindi_unicode.copy_unicode_button"
              onClick={handleCopyUnicode}
              disabled={!unicodeText}
              variant="secondary"
              size="sm"
              className="gap-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 w-full"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Hindi Unicode
            </Button>
          </div>

          {/* Kruti Dev 010 Output */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="hindi-krutidev010-output"
                className="text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                Kruti Dev 010 Output
              </label>
              <Badge
                variant="outline"
                className="text-[10px] border-orange-500/40 text-orange-400"
              >
                Kruti Dev 010
              </Badge>
            </div>
            <Textarea
              id="hindi-krutidev010-output"
              data-ocid="hindi_unicode.krutidev_output"
              value={krutiText}
              readOnly
              placeholder="Kruti Dev 010 encoded text will appear here…"
              className="min-h-[80px] resize-none bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 text-base font-mono leading-relaxed focus-visible:ring-orange-500"
            />
            <Button
              data-ocid="hindi_unicode.copy_krutidev_button"
              onClick={handleCopyKruti}
              disabled={!krutiText}
              variant="secondary"
              size="sm"
              className="gap-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 w-full"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Kruti Dev 010
            </Button>
          </div>

          {/* Kruti Dev 014 Output */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="hindi-krutidev014-output"
                className="text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                Kruti Dev 014 Output
              </label>
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/40 text-amber-400"
              >
                Kruti Dev 014
              </Badge>
            </div>
            <Textarea
              id="hindi-krutidev014-output"
              data-ocid="hindi_unicode.krutidev14_output"
              value={kruti14Text}
              readOnly
              placeholder="Kruti Dev 014 encoded text will appear here…"
              className="min-h-[80px] resize-none bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 text-base font-mono leading-relaxed focus-visible:ring-amber-500"
            />
            <Button
              data-ocid="hindi_unicode.copy_krutidev14_button"
              onClick={handleCopyKruti14}
              disabled={!kruti14Text}
              variant="secondary"
              size="sm"
              className="gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 w-full"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Kruti Dev 014
            </Button>
          </div>
        </div>
      </div>

      {/* Helper note + Clear button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-gray-500 bg-orange-900/20 border border-orange-500/20 rounded-md px-3 py-2 max-w-lg">
          💡 Paste the{" "}
          <span className="text-orange-400 font-medium">Kruti Dev 010</span>{" "}
          output in any app using the{" "}
          <span className="italic">Kruti Dev 010</span> font, or paste the{" "}
          <span className="text-amber-400 font-medium">Kruti Dev 014</span>{" "}
          output in any app using the{" "}
          <span className="italic">Kruti Dev 014</span> font to see correct
          Hindi text.
        </p>
        <Button
          data-ocid="hindi_unicode.clear_button"
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-500 hover:text-gray-300 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
