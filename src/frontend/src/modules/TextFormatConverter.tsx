import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftRight, Check, Copy, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Krutidev → Unicode Mapping ───────────────────────────────────────────────
// Multi-character sequences must be sorted longest-first to ensure greedy match.

const KRU_TO_UNI_RAW: Array<[string, string]> = [
  // Conjuncts / multi-char (process before singles)
  ["DZ", "ड्ज़"],
  ["x", "क्ष"],
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
  // Halant
  ["~", "ँ"],
  // Independent vowels
  ["vk", "व"],
  ["vki", "वि"],
  ["A", "आ"],
  ["#", "ऋ"],
  ["E", "ए"],
  ["O", "ओ"],
  ["vkS", "औ"],
  ["vkb", "ऐ"],
  // Consonants (uppercase variants first where they differ)
  ["B", "भ"],
  ["C", "च"],
  ["D", "ड"],
  ["F", "फ"],
  ["G", "घ"],
  ["J", "ञ"],
  ["K", "ख"],
  ["L", "ळ"],
  ["N", "ण"],
  ["P", "प"],
  ["Q", "ढ"],
  ["S", "श"],
  ["T", "ट"],
  ["V", "व"],
  ["W", "श"],
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
  ["y", "य"],
  ["z", "ज़"],
  // Matras / vowel signs
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
  [";", ":"],
  [":", ";"],
  // Special symbols
  ["H", "ः"],
  ["M", "ं"],
  ["`", "़"],
  ["R", "र्"],
  ["^", "ॅ"],
  ["&", "ॆ"],
  // Numerals
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
  // Punctuation / special
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
];

// Sort by key length descending so longer sequences match first
const KRU_TO_UNI: Array<[string, string]> = [...KRU_TO_UNI_RAW].sort(
  (a, b) => b[0].length - a[0].length,
);

// Build reverse map: Unicode → Krutidev
// For reverse we only keep 1-to-1 deterministic mappings (skip ambiguous)
const UNI_TO_KRU: Array<[string, string]> = (() => {
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const [kru, uni] of KRU_TO_UNI_RAW) {
    if (!seen.has(uni)) {
      seen.add(uni);
      pairs.push([uni, kru]);
    }
  }
  // Sort by Unicode key length descending for greedy match
  return pairs.sort((a, b) => b[0].length - a[0].length);
})();

function krutidevToUnicode(input: string): string {
  let result = "";
  let i = 0;
  while (i < input.length) {
    let matched = false;
    for (const [kru, uni] of KRU_TO_UNI) {
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

function unicodeToKrutidev(input: string): string {
  let result = "";
  let i = 0;
  while (i < input.length) {
    let matched = false;
    for (const [uni, kru] of UNI_TO_KRU) {
      // slice by character not byte to handle multi-codepoint
      const slice = [...input].slice(i, i + uni.length).join("");
      if (slice === uni) {
        result += kru;
        i += uni.length;
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

// ─── Component ────────────────────────────────────────────────────────────────

type Direction = "kru-to-uni" | "uni-to-kru";

export default function TextFormatConverter() {
  const [direction, setDirection] = useState<Direction>("kru-to-uni");
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);

  const outputText = useMemo(() => {
    if (!inputText) return "";
    return direction === "kru-to-uni"
      ? krutidevToUnicode(inputText)
      : unicodeToKrutidev(inputText);
  }, [inputText, direction]);

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

      {/* Direction label strip */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
          {isKruToUni ? "Krutidev" : "Unicode (Devanagari)"}
        </span>
        <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
          {isKruToUni ? "Unicode (Devanagari)" : "Krutidev"}
        </span>
        <button
          type="button"
          onClick={handleSwapDirection}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all duration-200"
          title="Swap direction"
        >
          <RefreshCw className="w-3 h-3" />
          Swap
        </button>
      </div>

      {/* Text areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isKruToUni ? "Krutidev Input" : "Unicode Input"}
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
                ? "Type or paste Krutidev text here…"
                : "Type or paste Unicode Devanagari text here…"
            }
            className="min-h-[280px] resize-y font-mono text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-teal-500/50 focus:ring-teal-500/20 rounded-xl leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isKruToUni ? "Unicode Output" : "Krutidev Output"}
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
                : "Converted Krutidev text will appear here…"
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

      {/* Hint / Info card */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-gray-500 space-y-1.5 leading-relaxed">
        <p className="font-semibold text-gray-400">How to use</p>
        {isKruToUni ? (
          <ul className="list-disc list-inside space-y-1">
            <li>
              Paste or type Krutidev-encoded text in the left box (e.g., text
              typed with Krutidev 010 font).
            </li>
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
              Paste Unicode Devanagari text (e.g., from a website or Word
              document) in the left box.
            </li>
            <li>
              The right box shows the equivalent Krutidev-encoded characters for
              legacy font use.
            </li>
            <li>
              Click{" "}
              <span className="text-teal-400 font-medium">Copy Output</span> to
              copy the Krutidev text.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
