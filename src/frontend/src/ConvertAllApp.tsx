import { Toaster } from "@/components/ui/sonner";
import { FileImage, FileText, Image, Layers, Scan } from "lucide-react";
import { Heart } from "lucide-react";
import { useState } from "react";
import Header from "./components/Header";
import BackgroundRemover from "./modules/BackgroundRemover";
import ImageConverter from "./modules/ImageConverter";
import ImageEditor from "./modules/ImageEditor";
import PDFConverter from "./modules/PDFConverter";
import PassportPhotoConverter from "./modules/PassportPhotoConverter";

type ConvertAllTabId =
  | "pdf-scanner"
  | "image-converter"
  | "image-editor"
  | "bg-remover"
  | "passport-photo";

interface ConvertAllTab {
  id: ConvertAllTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: ConvertAllTab[] = [
  {
    id: "pdf-scanner",
    label: "PDF Scanner",
    icon: <Scan className="w-4 h-4" />,
    description: "Scan & convert to PDF",
  },
  {
    id: "image-converter",
    label: "Image Converter",
    icon: <FileImage className="w-4 h-4" />,
    description: "Convert image formats",
  },
  {
    id: "image-editor",
    label: "Image Editor",
    icon: <Image className="w-4 h-4" />,
    description: "Edit & enhance images",
  },
  {
    id: "bg-remover",
    label: "BG Remover",
    icon: <Layers className="w-4 h-4" />,
    description: "Remove backgrounds",
  },
  {
    id: "passport-photo",
    label: "Passport Photo",
    icon: <FileText className="w-4 h-4" />,
    description: "Passport-size photos",
  },
];

interface ConvertAllAppProps {
  onOpenMultimedia?: () => void;
  onOpenChess?: () => void;
}

export default function ConvertAllApp({
  onOpenMultimedia,
  onOpenChess,
}: ConvertAllAppProps) {
  const [activeTab, setActiveTab] = useState<ConvertAllTabId>("pdf-scanner");

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "unknown-app";
  const appId = encodeURIComponent(hostname);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        isMultimedia={false}
        onOpenMultimedia={onOpenMultimedia}
        onOpenChess={onOpenChess}
      />

      {/* Tab Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-ocid={`convertall.${tab.id}.tab`}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                    whitespace-nowrap transition-all duration-200 flex-shrink-0
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="hidden sm:block text-xs opacity-70 font-normal">
                      — {tab.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {activeTab === "pdf-scanner" && <PDFConverter />}
        {activeTab === "image-converter" && <ImageConverter />}
        {activeTab === "image-editor" && <ImageEditor />}
        {activeTab === "bg-remover" && <BackgroundRemover />}
        {activeTab === "passport-photo" && <PassportPhotoConverter />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-auto">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              © {year} ConvertAll Studio. All processing is done locally in your
              browser.
            </p>
            <p className="flex items-center gap-1">
              Built with <Heart className="w-3 h-3 text-primary fill-primary" />{" "}
              using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
