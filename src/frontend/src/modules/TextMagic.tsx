import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Type } from "lucide-react";
import TextFormatConverter from "./TextFormatConverter";
import Translator from "./Translator";

export default function TextMagic() {
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
      <Tabs defaultValue="translator" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 h-auto gap-1">
          <TabsTrigger
            data-ocid="text_magic.translator_tab"
            value="translator"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              data-[state=active]:bg-teal-500/90 data-[state=active]:text-gray-100 data-[state=active]:shadow-sm
              data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-300"
          >
            <Languages className="w-4 h-4" />
            Translator
          </TabsTrigger>
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
        </TabsList>

        <TabsContent value="translator" className="mt-0">
          <Translator />
        </TabsContent>

        <TabsContent value="text-converter" className="mt-0">
          <TextFormatConverter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
