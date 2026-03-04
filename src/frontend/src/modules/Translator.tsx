import { ExternalLink, Languages } from "lucide-react";

const GOOGLE_TRANSLATE_URL =
  "https://translate.google.com/?hl=hi&sl=hi&tl=en&op=translate";

export default function Translator() {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <Languages className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-200 tracking-tight">
              Translator
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Powered by Google Translate
            </p>
          </div>
        </div>

        <a
          href={GOOGLE_TRANSLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="translator.secondary_button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all duration-200"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in new tab
        </a>
      </div>

      {/* Google Translate iframe */}
      <div
        className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-white"
        style={{ minHeight: "600px" }}
      >
        <iframe
          data-ocid="translator.editor"
          src={GOOGLE_TRANSLATE_URL}
          title="Google Translate"
          className="w-full h-full"
          style={{ minHeight: "600px", border: "none" }}
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <p className="text-xs text-gray-600 text-center">
        If the translator doesn't load,{" "}
        <a
          href={GOOGLE_TRANSLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:underline"
        >
          click here to open Google Translate
        </a>{" "}
        in a new tab.
      </p>
    </div>
  );
}
