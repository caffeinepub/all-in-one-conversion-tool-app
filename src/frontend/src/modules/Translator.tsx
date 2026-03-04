import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Languages,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Direction = "hi-to-en" | "en-to-hi";

interface TranslationResult {
  translatedText: string;
  error?: string;
}

async function translateText(
  text: string,
  direction: Direction,
): Promise<TranslationResult> {
  const langpair = direction === "hi-to-en" ? "hi|en" : "en|hi";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation API error: ${res.status}`);
  }
  const data = await res.json();
  if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
    return { translatedText: data.responseData.translatedText };
  }
  throw new Error(data?.responseDetails ?? "Translation failed");
}

export default function Translator() {
  const [direction, setDirection] = useState<Direction>("hi-to-en");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runTranslation = useCallback(async (text: string, dir: Direction) => {
    if (!text.trim()) {
      setOutputText("");
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await translateText(text, dir);
      setOutputText(result.translatedText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Translation failed";
      setError(msg);
      setOutputText("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced translation on input change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!inputText.trim()) {
      setOutputText("");
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      runTranslation(inputText, direction);
    }, 700);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputText, direction, runTranslation]);

  const handleSwapDirection = useCallback(() => {
    setDirection((prev) => (prev === "hi-to-en" ? "en-to-hi" : "hi-to-en"));
    setInputText("");
    setOutputText("");
    setError(null);
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
    setOutputText("");
    setError(null);
  }, []);

  const isHiToEn = direction === "hi-to-en";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <Languages className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-200 tracking-tight">
              Translator
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isHiToEn
                ? "Translate Hindi text to English"
                : "Translate English text to Hindi"}
            </p>
          </div>
        </div>

        {/* Direction Toggle */}
        <div
          data-ocid="translator.direction_toggle"
          className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => {
              if (!isHiToEn) {
                setDirection("hi-to-en");
                setInputText("");
                setOutputText("");
                setError(null);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isHiToEn
                ? "bg-teal-500/90 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Hindi → English
          </button>
          <button
            type="button"
            onClick={() => {
              if (isHiToEn) {
                setDirection("en-to-hi");
                setInputText("");
                setOutputText("");
                setError(null);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              !isHiToEn
                ? "bg-teal-500/90 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            English → Hindi
          </button>
        </div>
      </div>

      {/* Language labels row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
          {isHiToEn ? "हिन्दी (Hindi)" : "English"}
        </span>
        <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
          {isHiToEn ? "English" : "हिन्दी (Hindi)"}
        </span>
        <button
          type="button"
          data-ocid="translator.swap_button"
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
              {isHiToEn ? "Hindi Input" : "English Input"}
            </Label>
            <span className="text-xs text-gray-600 tabular-nums">
              {inputText.length} chars
            </span>
          </div>
          <Textarea
            data-ocid="translator.input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isHiToEn
                ? "यहाँ हिन्दी टेक्स्ट लिखें या पेस्ट करें…"
                : "Type or paste English text here…"
            }
            className="min-h-[280px] resize-y text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 focus:border-teal-500/50 focus:ring-teal-500/20 rounded-xl leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isHiToEn ? "English Output" : "Hindi Output"}
            </Label>
            <span className="text-xs text-gray-600 tabular-nums">
              {outputText.length} chars
            </span>
          </div>

          {isLoading ? (
            <div
              data-ocid="translator.loading_state"
              className="min-h-[280px] rounded-xl bg-white/5 border border-white/10 p-3 space-y-2.5"
            >
              <Skeleton className="h-4 w-3/4 bg-white/10 rounded" />
              <Skeleton className="h-4 w-full bg-white/10 rounded" />
              <Skeleton className="h-4 w-5/6 bg-white/10 rounded" />
              <Skeleton className="h-4 w-2/3 bg-white/10 rounded" />
              <Skeleton className="h-4 w-4/5 bg-white/10 rounded" />
            </div>
          ) : error ? (
            <div
              data-ocid="translator.error_state"
              className="min-h-[280px] rounded-xl bg-red-500/5 border border-red-500/20 p-4 flex flex-col items-center justify-center gap-2 text-center"
            >
              <p className="text-sm font-semibold text-red-400">
                Translation Failed
              </p>
              <p className="text-xs text-gray-500 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => runTranslation(inputText, direction)}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all duration-200"
              >
                Try again
              </button>
            </div>
          ) : (
            <Textarea
              data-ocid="translator.output"
              value={outputText}
              readOnly
              placeholder={
                isHiToEn
                  ? "English translation will appear here…"
                  : "हिन्दी अनुवाद यहाँ दिखेगा…"
              }
              className="min-h-[280px] resize-y text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600 rounded-xl leading-relaxed cursor-default select-all"
            />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          data-ocid="translator.copy_button"
          onClick={handleCopy}
          disabled={!outputText || isLoading}
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
          data-ocid="translator.clear_button"
          onClick={handleClear}
          disabled={!inputText && !outputText}
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
        <ul className="list-disc list-inside space-y-1">
          <li>
            Choose translation direction — Hindi → English or English → Hindi.
          </li>
          <li>Type or paste your text in the input box on the left.</li>
          <li>
            Translation happens automatically after a short pause — powered by
            the <span className="text-teal-400 font-medium">MyMemory API</span>.
          </li>
          <li>
            Click <span className="text-teal-400 font-medium">Copy Output</span>{" "}
            to copy the translated text.
          </li>
          <li>
            Use <span className="text-teal-400 font-medium">Swap</span> to
            quickly switch direction and start fresh.
          </li>
        </ul>
        <p className="text-gray-600 mt-1">
          Free tier: up to 500 words per request via MyMemory.
        </p>
      </div>
    </div>
  );
}
