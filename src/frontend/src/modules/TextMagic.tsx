import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Languages, Type } from "lucide-react";
import HindiUnicode from "./HindiUnicode";
import TextFormatConverter from "./TextFormatConverter";

const GOOGLE_TRANSLATE_URL =
  "https://translate.google.com/?hl=hi&sl=hi&tl=en&op=translate";

export default function TextMagic() {
  const handleTranslatorClick = () => {
    window.location.href = GOOGLE_TRANSLATE_URL;
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-200 tracking-tight">
          Text Magic
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          All your text conversion tools in one place
        </p>
      </div>

      {/* Internal tabs */}
      <Tabs defaultValue="text-converter" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 h-auto gap-1 flex-wrap">
          <button
            data-ocid="text_magic.translator_tab"
            onClick={handleTranslatorClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              text-gray-500 hover:text-gray-300 hover:bg-white/5"
            type="button"
          >
            <Languages className="w-4 h-4" />
            Translator
          </button>
          <TabsTrigger
            data-ocid="text_magic.text_converter_tab"
            value="text-converter"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              data-[state=active]:bg-teal-500/90 data-[state=active]:text-gray-100 data-[state=active]:shadow-sm
              data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-300"
          >
            <Type className="w-4 h-4" />
            Text Converter
          </TabsTrigger>
          <TabsTrigger
            data-ocid="text_magic.hindi_unicode_tab"
            value="hindi-unicode"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              data-[state=active]:bg-teal-500/90 data-[state=active]:text-gray-100 data-[state=active]:shadow-sm
              data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-300"
          >
            <Globe className="w-4 h-4" />
            Hindi Unicode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text-converter" className="mt-0">
          <TextFormatConverter />
        </TabsContent>

        <TabsContent value="hindi-unicode" className="mt-0">
          <HindiUnicode />
        </TabsContent>
      </Tabs>
    </div>
  );
}
