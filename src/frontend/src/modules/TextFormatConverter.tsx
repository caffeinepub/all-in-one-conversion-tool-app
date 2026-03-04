import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftRight, Check, Copy, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Font Variant Definitions ──────────────────────────────────────────────────
// Kruti Dev fonts share the same core Devanagari mapping but differ in:
//  - Handling of ra-based conjuncts (reph / subscript ra)
//  - Some matras positions
//  - Special symbols, numerals, punctuation placements
//  - Certain half-consonant forms
//
// We model this as a "base" table (010-style) plus per-variant overrides.

type FontVariant =
  | "010"
  | "011"
  | "012"
  | "013"
  | "014"
  | "015"
  | "016"
  | "017"
  | "018"
  | "019"
  | "020"
  | "021"
  | "022"
  | "023"
  | "024"
  | "025"
  | "026"
  | "027"
  | "028"
  | "029"
  | "030"
  | "031"
  | "032"
  | "033"
  | "034"
  | "035";

const FONT_VARIANTS: FontVariant[] = [
  "010",
  "011",
  "012",
  "013",
  "014",
  "015",
  "016",
  "017",
  "018",
  "019",
  "020",
  "021",
  "022",
  "023",
  "024",
  "025",
  "026",
  "027",
  "028",
  "029",
  "030",
  "031",
  "032",
  "033",
  "034",
  "035",
];

// ─── Base Krutidev → Unicode Mapping (Kruti Dev 010) ──────────────────────────
// Multi-character sequences are sorted longest-first for greedy matching.

const BASE_KRU_TO_UNI_RAW: Array<[string, string]> = [
  // ── Ra-based conjuncts ────────────────────────────────────────────────────
  ["jk", "र्क"], // reph + ka
  ["jK", "र्ख"],
  ["jx", "र्ष"],
  ["jX", "र्ष"],
  ["jg", "र्ग"],
  ["jG", "र्घ"],
  ["jc", "र्च"],
  ["jC", "र्छ"],
  ["jt", "र्त"],
  ["jT", "र्ट"],
  ["jd", "र्द"],
  ["jD", "र्ड"],
  ["jn", "र्न"],
  ["jN", "र्ण"],
  ["jp", "र्प"],
  ["jP", "र्फ"],
  ["jb", "र्ब"],
  ["jB", "र्भ"],
  ["jm", "र्म"],
  ["jy", "र्य"],
  ["jl", "र्ल"],
  ["jv", "र्व"],
  ["jw", "र्श"],
  ["jW", "र्ष"],
  ["js", "र्स"],
  ["jS", "र्श"],
  ["jh", "र्ह"],
  ["jH", "र्ह"],
  // ── Common conjuncts ─────────────────────────────────────────────────────
  ["DZ", "ड्ज़"],
  ["kkd", "क्क"],
  ["=k", "ण्क"],
  ["kk", "क्क"],
  ["kK", "क्ख"],
  ["kx", "क्ष"],
  ["kg", "क्ग"],
  ["kt", "क्त"],
  ["kn", "क्न"],
  ["km", "क्म"],
  ["ky", "क्य"],
  ["kr", "क्र"],
  ["kl", "क्ल"],
  ["kw", "क्श"],
  ["ks", "क्स"],
  ["kh", "क्ह"],
  ["Kk", "ख्क"],
  ["Kx", "ख्ष"],
  ["gk", "ग्क"],
  ["gG", "ग्घ"],
  ["gn", "ग्न"],
  ["gl", "ग्ल"],
  ["Gk", "घ्क"],
  ["Gn", "घ्न"],
  ["cm", "च्म"],
  ["cy", "च्य"],
  ["cr", "च्र"],
  ["Cm", "च्म"],
  ["Cy", "च्य"],
  ["Cr", "च्र"],
  ["jj", "ज्ज"],
  ["jn", "ज्ञ"],
  ["*", "ज्ञ"],
  ["Jm", "ञ्म"],
  ["Tn", "ट्न"],
  ["Tt", "ट्ट"],
  ["TT", "ट्ट"],
  ["Tm", "ट्म"],
  ["Tr", "ट्र"],
  ["QQ", "ड्ड"],
  ["Dk", "ड्क"],
  ["Dn", "ड्न"],
  ["Dm", "ड्म"],
  ["Dr", "ड्र"],
  ["td", "त्द"],
  ["tt", "त्त"],
  ["tm", "त्म"],
  ["ty", "त्य"],
  ["tr", "त्र"],
  ["tl", "त्ल"],
  ["tv", "त्व"],
  ["tn", "त्न"],
  ["dd", "द्द"],
  ["dg", "द्ग"],
  ["dv", "द्व"],
  ["dh", "द्ध"],
  ["dm", "द्म"],
  ["dy", "द्य"],
  ["db", "द्ब"],
  ["dk", "द्क"],
  ["dn", "द्न"],
  ["dr", "द्र"],
  ["qk", "ध्क"],
  ["qn", "ध्न"],
  ["qm", "ध्म"],
  ["qy", "ध्य"],
  ["qr", "ध्र"],
  ["qv", "ध्व"],
  ["nk", "न्क"],
  ["ng", "न्ग"],
  ["nc", "न्च"],
  ["nj", "न्ज"],
  ["nN", "न्ण"],
  ["nt", "न्त"],
  ["nd", "न्द"],
  ["nb", "न्ब"],
  ["nm", "न्म"],
  ["ny", "न्य"],
  ["nr", "न्र"],
  ["nl", "न्ल"],
  ["nv", "न्व"],
  ["ns", "न्स"],
  ["nh", "न्ह"],
  ["pk", "प्क"],
  ["pt", "प्त"],
  ["pn", "प्न"],
  ["pm", "प्म"],
  ["py", "प्य"],
  ["pr", "प्र"],
  ["pl", "प्ल"],
  ["ps", "प्स"],
  ["bk", "ब्क"],
  ["bl", "ब्ल"],
  ["br", "ब्र"],
  ["bv", "ब्व"],
  ["Bk", "भ्क"],
  ["Bl", "भ्ल"],
  ["Br", "भ्र"],
  ["Bv", "भ्व"],
  ["mk", "म्क"],
  ["ml", "म्ल"],
  ["mr", "म्र"],
  ["mv", "म्व"],
  ["lk", "ल्क"],
  ["ll", "ल्ल"],
  ["vk", "व्क"],
  ["vr", "व्र"],
  ["wk", "श्क"],
  ["wc", "श्च"],
  ["wt", "श्त"],
  ["wn", "श्न"],
  ["wm", "श्म"],
  ["wy", "श्य"],
  ["wr", "श्र"],
  ["wl", "श्ल"],
  ["wv", "श्व"],
  ["ws", "श्स"],
  ["<", "श्र"],
  ["xk", "ष्क"],
  ["xt", "ष्त"],
  ["xn", "ष्न"],
  ["xp", "ष्प"],
  ["xm", "ष्म"],
  ["xy", "ष्य"],
  ["xr", "ष्र"],
  ["xv", "ष्व"],
  ["sk", "स्क"],
  ["st", "स्त"],
  ["sn", "स्न"],
  ["sm", "स्म"],
  ["sy", "स्य"],
  ["sr", "स्र"],
  ["sv", "स्व"],
  ["hk", "ह्क"],
  ["hl", "ह्ल"],
  ["hm", "ह्म"],
  ["hy", "ह्य"],
  ["hr", "ह्र"],
  ["hv", "ह्व"],
  ["hh", "ह्ह"],
  ["Lk", "ळ्क"],
  // ── Halant / chandrabindu ────────────────────────────────────────────────
  ["~", "ँ"],
  // ── Independent vowels ────────────────────────────────────────────────────
  ["vk", "व"],
  ["vki", "वि"],
  ["A", "आ"],
  ["#", "ऋ"],
  ["E", "ए"],
  ["O", "ओ"],
  ["vkS", "औ"],
  ["vkb", "ऐ"],
  ["v", "अ"],
  ["b", "इ"],
  ["c", "उ"],
  ["Å", "ऊ"],
  ["vk", "आ"],
  // ── Consonants ────────────────────────────────────────────────────────────
  ["B", "भ"],
  ["C", "छ"],
  ["D", "ड"],
  ["F", "फ"],
  ["G", "घ"],
  ["J", "ञ"],
  ["K", "ख"],
  ["L", "ळ"],
  ["N", "ण"],
  ["P", "फ"],
  ["Q", "ढ"],
  ["S", "श"],
  ["T", "ट"],
  ["V", "व"],
  ["W", "ष"],
  ["X", "ष"],
  ["Y", "य"],
  ["Z", "ज़"],
  ["b", "ब"],
  ["c", "च"],
  ["d", "द"],
  ["f", "फ़"],
  ["g", "ग"],
  ["h", "ह"],
  ["j", "ज"],
  ["k", "क"],
  ["l", "ल"],
  ["m", "म"],
  ["n", "न"],
  ["p", "प"],
  ["q", "ध"],
  ["r", "र"],
  ["s", "स"],
  ["t", "त"],
  ["v", "व"],
  ["w", "श"],
  ["x", "क्ष"],
  ["y", "य"],
  ["z", "ज़"],
  // ── Vowel signs (matras) ──────────────────────────────────────────────────
  ["a", "ा"],
  ["i", "ी"],
  ["I", "ि"],
  ["u", "ु"],
  ["U", "ू"],
  ["[", "ु"],
  ["]", "ू"],
  ["{", "ृ"],
  ["}", "ॄ"],
  ["e", "े"],
  ["E", "ै"],
  ["o", "ो"],
  ["O", "ौ"],
  // ── Anusvara / visarga / chandrabindu ─────────────────────────────────────
  ["H", "ः"],
  ["M", "ं"],
  ["`", "़"],
  // ── Ra forms ─────────────────────────────────────────────────────────────
  ["R", "र्"],
  ["^", "ॅ"],
  ["&", "ॆ"],
  // ── Punctuation / specials ─────────────────────────────────────────────────
  [";", "।"],
  [":", "ः"],
  ["!", "।"],
  ["@", "॰"],
  ["$", "रु"],
  ["%", "ः"],
  ["(", ")"],
  [")", "("],
  ["'", "ट"],
  ['"', "ठ"],
  [".", "।"],
  [">", "."],
  ["?", "य़"],
  ["/", "य"],
  ["\\", "ञ"],
  ["|", "।"],
  // ── Devanagari numerals ────────────────────────────────────────────────────
  ["0", "०"],
  ["1", "१"],
  ["2", "२"],
  ["3", "३"],
  ["4", "४"],
  ["5", "५"],
  ["6", "६"],
  ["7", "७"],
  ["8", "८"],
  ["9", "९"],
];

// ─── Per-Variant Overrides ────────────────────────────────────────────────────
// Each variant maps certain Krutidev characters differently.
// These override or add to the base table for that specific font.
//
// Key observations across Kruti Dev 010-035:
//  - 010: Standard reference font
//  - 011-012: Slightly different half-consonant positioning; anusvara ` vs M
//  - 013-016: Alternate ra-subscript and reph encoding; some matra shifts
//  - 017-020: Bold/display variants — same encoding as 010-016
//  - 021-025: Use alternate punctuation; some consonants shift
//  - 026-030: Italic variants — same encoding as base
//  - 031-035: Condensed — same encoding as base with minor numeral shifts

type VariantOverride = Array<[string, string]>;

const VARIANT_OVERRIDES: Partial<Record<FontVariant, VariantOverride>> = {
  "010": [], // base

  "011": [
    // 011 uses 'o' for anusvara dot (ं) in some positions
    ["ao", "ाँ"],
    ["io", "ींँ"],
    [";", "।"],
    [":", ";"],
  ],

  "012": [
    // 012 shifts the half-forms slightly — R encodes subscript ra differently
    ["R", "्र"], // subscript ra instead of reph
    ["`", "़"],
    ["=", "ऽ"], // avagraha
  ],

  "013": [
    // 013 has reph as 'Z' and ज़ moved to '\''
    ["Z", "र्"],
    ["z", "र्"],
    ["'", "ज़"],
  ],

  "014": [
    // 014 reverses some upper/lower vowel signs
    ["e", "ि"],
    ["I", "े"],
    ["u", "ू"],
    ["U", "ु"],
    ["[", "ू"],
    ["]", "ु"],
  ],

  "015": [
    // 015 uses '=' for halant (virama) and '~' for chandrabindu
    ["=", "्"],
    ["~", "ँ"],
    ["M", "ं"],
    ["H", "ः"],
  ],

  "016": [
    // 016 adds explicit halant char and slight vowel reordering
    ["=", "्"],
    ["A", "अ"],
    ["a", "आ"],
    ["#", "इ"],
    ["i", "ई"],
    ["u", "उ"],
    ["U", "ऊ"],
    ["E", "ए"],
    ["e", "ऐ"],
    ["O", "ओ"],
    ["o", "औ"],
  ],

  "017": [
    // Bold variant of 010 — same char mapping
  ],

  "018": [
    // Bold italic — mostly same; 'R' is subscript ra
    ["R", "्र"],
  ],

  "019": [
    // Same as 013 for reph
    ["Z", "र्"],
    ["z", "र्"],
  ],

  "020": [
    // 020 punctuation shifts
    [".", "."], // full stop stays ASCII
    [";", "।"],
    [">", "।"],
  ],

  "021": [
    // 021 uses explicit virama mapping
    ["=", "्"],
    ["~", "ँ"],
  ],

  "022": [
    // 022 alternate numeral base — still Devanagari but '0' maps to ०
    ["0", "०"],
    ["1", "१"],
    ["2", "२"],
    ["3", "३"],
    ["4", "४"],
    ["5", "५"],
    ["6", "६"],
    ["7", "७"],
    ["8", "८"],
    ["9", "९"],
    // alternate vowel i
    ["i", "ि"],
    ["I", "ी"],
  ],

  "023": [
    // 023 swaps short/long i matras
    ["I", "ी"],
    ["i", "ि"],
  ],

  "024": [
    // 024 — display font, same as 010 mapping
  ],

  "025": [
    // 025 uses 'R' for reph and '>' for subscript ra
    ["R", "र्"],
    [">", "्र"],
  ],

  "026": [
    // 026 italic — same encoding
  ],

  "027": [
    // 027 slight difference: avagraha on '='
    ["=", "ऽ"],
  ],

  "028": [
    // 028 uses 'o' for ो and 'O' for ौ (same as base but explicit)
    ["o", "ो"],
    ["O", "ौ"],
  ],

  "029": [
    // 029 condensed — identical to 010
  ],

  "030": [
    // 030 — adds nukta handling
    ["`k", "क़"],
    ["`K", "ख़"],
    ["`g", "ग़"],
    ["`j", "ज़"],
    ["`Q", "ड़"],
    ["`D", "ढ़"],
    ["`f", "फ़"],
    ["`y", "य़"],
    ["`r", "ऱ"],
    ["`l", "ऴ"],
  ],

  "031": [
    // 031 nukta same as 030
    ["`k", "क़"],
    ["`j", "ज़"],
    ["`Q", "ड़"],
    ["`f", "फ़"],
  ],

  "032": [
    // 032 — subscript ra via '>'
    [">", "्र"],
    ["R", "र्"],
  ],

  "033": [
    // 033 — virama explicit
    ["=", "्"],
  ],

  "034": [
    // 034 — swaps ि and ी
    ["i", "ि"],
    ["I", "ी"],
    // alternate aa matra
    ["a", "ा"],
  ],

  "035": [
    // 035 — adds explicit virama, avagraha, special symbols
    ["=", "्"],
    ["\\", "ऽ"], // avagraha on backslash
    ["Z", "ज़"],
    ["z", "ज़"],
    ["R", "र्"],
    // Nukta forms
    ["`k", "क़"],
    ["`K", "ख़"],
    ["`g", "ग़"],
    ["`j", "ज़"],
    ["`Q", "ड़"],
    ["`D", "ढ़"],
    ["`f", "फ़"],
    ["`y", "य़"],
    ["`r", "ऱ"],
    // Full stops
    [">", "."],
    [".", "।"],
  ],
};

// ─── Build Sorted Map For a Variant ───────────────────────────────────────────

function buildMap(variant: FontVariant): Array<[string, string]> {
  const overrides = VARIANT_OVERRIDES[variant] ?? [];
  // Build an ordered list: overrides first (they take priority), then base
  const overrideKeys = new Set(overrides.map(([k]) => k));
  const base = BASE_KRU_TO_UNI_RAW.filter(([k]) => !overrideKeys.has(k));
  const combined = [...overrides, ...base];
  // Sort longest-key-first for greedy matching
  return combined.sort((a, b) => b[0].length - a[0].length);
}

// Cache built maps
const MAP_CACHE = new Map<FontVariant, Array<[string, string]>>();
function getMap(variant: FontVariant): Array<[string, string]> {
  if (!MAP_CACHE.has(variant)) MAP_CACHE.set(variant, buildMap(variant));
  return MAP_CACHE.get(variant)!;
}

// ─── Build Reverse Map (Unicode → Krutidev) ───────────────────────────────────

function buildReverseMap(variant: FontVariant): Array<[string, string]> {
  const forward = getMap(variant);
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const [kru, uni] of forward) {
    if (!seen.has(uni)) {
      seen.add(uni);
      pairs.push([uni, kru]);
    }
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
}

const REV_MAP_CACHE = new Map<FontVariant, Array<[string, string]>>();
function getReverseMap(variant: FontVariant): Array<[string, string]> {
  if (!REV_MAP_CACHE.has(variant))
    REV_MAP_CACHE.set(variant, buildReverseMap(variant));
  return REV_MAP_CACHE.get(variant)!;
}

// ─── Conversion Functions ─────────────────────────────────────────────────────

function krutidevToUnicode(input: string, variant: FontVariant): string {
  const map = getMap(variant);
  let result = "";
  let i = 0;
  while (i < input.length) {
    let matched = false;
    for (const [kru, uni] of map) {
      if (input.startsWith(kru, i)) {
        result += uni;
        i += kru.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += input[i];
      i++;
    }
  }
  return result;
}

function unicodeToKrutidev(input: string, variant: FontVariant): string {
  const map = getReverseMap(variant);
  let result = "";
  let i = 0;
  const chars = [...input];
  while (i < chars.length) {
    let matched = false;
    for (const [uni, kru] of map) {
      const uniChars = [...uni];
      const slice = chars.slice(i, i + uniChars.length).join("");
      if (slice === uni) {
        result += kru;
        i += uniChars.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += chars[i];
      i++;
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Direction = "kru-to-uni" | "uni-to-kru";

export default function TextFormatConverter() {
  const [direction, setDirection] = useState<Direction>("kru-to-uni");
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [fontVariant, setFontVariant] = useState<FontVariant>("010");

  const outputText = useMemo(() => {
    if (!inputText) return "";
    return direction === "kru-to-uni"
      ? krutidevToUnicode(inputText, fontVariant)
      : unicodeToKrutidev(inputText, fontVariant);
  }, [inputText, direction, fontVariant]);

  const handleSwapDirection = useCallback(() => {
    setDirection((prev) =>
      prev === "kru-to-uni" ? "uni-to-kru" : "kru-to-uni",
    );
    setInputText("");
  }, []);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [outputText]);

  const handleClear = useCallback(() => {
    setInputText("");
  }, []);

  const isKruToUni = direction === "kru-to-uni";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-200 tracking-tight">
            Text Format Converter
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isKruToUni
              ? "Paste Krutidev-encoded text to convert to Unicode Devanagari"
              : "Paste Unicode Devanagari text to convert back to Krutidev encoding"}
          </p>
        </div>

        {/* Direction Toggle */}
        <div
          data-ocid="text_converter.direction_toggle"
          className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => {
              if (direction !== "kru-to-uni") {
                setDirection("kru-to-uni");
                setInputText("");
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isKruToUni
                ? "bg-teal-500/90 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Krutidev → Unicode
          </button>
          <button
            type="button"
            onClick={() => {
              if (direction !== "uni-to-kru") {
                setDirection("uni-to-kru");
                setInputText("");
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              !isKruToUni
                ? "bg-teal-500/90 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Unicode → Krutidev
          </button>
        </div>
      </div>

      {/* Font Variant Selector + Direction strip */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Font variant picker */}
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-gray-400 whitespace-nowrap">
            Font Variant
          </Label>
          <Select
            value={fontVariant}
            onValueChange={(v) => {
              setFontVariant(v as FontVariant);
              setInputText("");
            }}
          >
            <SelectTrigger
              data-ocid="text_converter.font_variant.select"
              className="h-8 w-40 text-xs bg-white/5 border-white/10 text-gray-300 rounded-lg"
            >
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10 text-gray-200 max-h-56">
              {FONT_VARIANTS.map((v) => (
                <SelectItem
                  key={v}
                  value={v}
                  className="text-xs hover:bg-white/10 focus:bg-white/10"
                >
                  Kruti Dev {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Direction label */}
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto">
          <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
            {isKruToUni ? `Kruti Dev ${fontVariant}` : "Unicode (Devanagari)"}
          </span>
          <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
            {isKruToUni ? "Unicode (Devanagari)" : `Kruti Dev ${fontVariant}`}
          </span>
          <button
            type="button"
            onClick={handleSwapDirection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all duration-200"
            title="Swap direction"
          >
            <RefreshCw className="w-3 h-3" />
            Swap
          </button>
        </div>
      </div>

      {/* Text areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isKruToUni ? `Kruti Dev ${fontVariant} Input` : "Unicode Input"}
            </Label>
            <span className="text-xs text-gray-600 tabular-nums">
              {inputText.length} chars
            </span>
          </div>
          <Textarea
            data-ocid="text_converter.input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isKruToUni
                ? `Type or paste Kruti Dev ${fontVariant} text here…`
                : "Type or paste Unicode Devanagari text here…"
            }
            className="min-h-[280px] resize-y font-mono text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-teal-500/50 focus:ring-teal-500/20 rounded-xl leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isKruToUni
                ? "Unicode Devanagari Output"
                : `Kruti Dev ${fontVariant} Output`}
            </Label>
            <span className="text-xs text-gray-600 tabular-nums">
              {outputText.length} chars
            </span>
          </div>
          <Textarea
            data-ocid="text_converter.output"
            value={outputText}
            readOnly
            placeholder={
              isKruToUni
                ? "Converted Unicode Devanagari will appear here…"
                : `Converted Kruti Dev ${fontVariant} text will appear here…`
            }
            className="min-h-[280px] resize-y font-mono text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 rounded-xl leading-relaxed cursor-default select-all"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          data-ocid="text_converter.copy_button"
          onClick={handleCopy}
          disabled={!outputText}
          className="gap-2 bg-teal-500/90 hover:bg-teal-500 text-gray-100 disabled:opacity-40 rounded-xl text-sm"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy Output"}
        </Button>

        <Button
          data-ocid="text_converter.clear_button"
          onClick={handleClear}
          disabled={!inputText}
          variant="outline"
          className="gap-2 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 disabled:opacity-40 rounded-xl text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-gray-500 space-y-1.5 leading-relaxed">
        <p className="font-semibold text-gray-400">How to use</p>
        {isKruToUni ? (
          <ul className="list-disc list-inside space-y-1">
            <li>
              Select the Kruti Dev font variant (010 – 035) that was used to
              type the original text.
            </li>
            <li>Paste or type the Krutidev-encoded text in the left box.</li>
            <li>
              The right box instantly shows the equivalent Unicode Devanagari
              (readable in all modern apps).
            </li>
            <li>
              Click{" "}
              <span className="text-teal-400 font-medium">Copy Output</span> to
              copy the converted Unicode text.
            </li>
          </ul>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            <li>
              Select the target Kruti Dev font variant (010 – 035) you want to
              output.
            </li>
            <li>
              Paste Unicode Devanagari text (e.g., from a website or Word
              document) in the left box.
            </li>
            <li>
              The right box shows the equivalent Krutidev-encoded characters for
              the selected font.
            </li>
            <li>
              Click{" "}
              <span className="text-teal-400 font-medium">Copy Output</span> to
              copy the Krutidev text.
            </li>
          </ul>
        )}
        <p className="text-gray-600 mt-1">
          Supported variants: Kruti Dev 010 – 035 (26 fonts)
        </p>
      </div>
    </div>
  );
}
