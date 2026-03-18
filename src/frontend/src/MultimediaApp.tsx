import { Toaster } from "@/components/ui/sonner";
import { Film, Languages, Music, Tv, Video } from "lucide-react";
import { Heart } from "lucide-react";
import { useState } from "react";
import Header from "./components/Header";
import IPTVPlayer from "./modules/IPTVPlayer";
import MP3Cutter from "./modules/MP3Cutter";
import TextMagic from "./modules/TextMagic";
import VideoClips from "./modules/VideoClips";
import VideoCutter from "./modules/VideoCutter";

export type MultimediaTabId =
  | "mp3-cutter"
  | "video-cutter"
  | "video-clips"
  | "iptv-player"
  | "text-magic";

interface MultimediaTab {
  id: MultimediaTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: MultimediaTab[] = [
  {
    id: "iptv-player",
    label: "IPTV Player",
    icon: <Tv className="w-4 h-4" />,
    description: "Free IPTV streams",
  },
  {
    id: "video-clips",
    label: "Video Clips",
    icon: <Film className="w-4 h-4" />,
    description: "Merge & download clips",
  },
  {
    id: "video-cutter",
    label: "Video Cutter",
    icon: <Video className="w-4 h-4" />,
    description: "Trim video clips",
  },
  {
    id: "mp3-cutter",
    label: "MP3 Cutter",
    icon: <Music className="w-4 h-4" />,
    description: "Trim & export audio",
  },
  {
    id: "text-magic",
    label: "Text Magic",
    icon: <Languages className="w-4 h-4" />,
    description: "Translate & convert text",
  },
];

interface MultimediaAppProps {
  onBack?: () => void;
  onOpenConvertAll?: () => void;
  onOpenChess?: () => void;
}

export default function MultimediaApp({
  onBack,
  onOpenConvertAll,
  onOpenChess,
}: MultimediaAppProps) {
  const [activeTab, setActiveTab] = useState<MultimediaTabId>("iptv-player");

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "unknown-app";
  const appId = encodeURIComponent(hostname);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col multimedia-bg">
      <Header
        isMultimedia={true}
        onOpenMultimedia={undefined}
        onOpenConvertAll={onOpenConvertAll ?? onBack}
        onOpenChess={onOpenChess}
      />

      {/* Tab Navigation */}
      <nav className="border-b border-white/10 multimedia-nav">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                    whitespace-nowrap transition-all duration-200 flex-shrink-0
                    ${
                      isActive
                        ? "bg-teal-500/90 text-gray-100 shadow-glow-sm"
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/10"
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
        <div className="animate-fade-in">
          {activeTab === "mp3-cutter" && <MP3Cutter />}
          {activeTab === "video-cutter" && <VideoCutter />}
          {activeTab === "video-clips" && <VideoClips />}
          {activeTab === "iptv-player" && <IPTVPlayer />}
          {activeTab === "text-magic" && <TextMagic />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 multimedia-footer mt-auto">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>
              © {year} Multimedia Studio. All processing is done locally in your
              browser.
            </p>
            <p className="flex items-center gap-1">
              Built with{" "}
              <Heart className="w-3 h-3 text-teal-400 fill-teal-400" /> using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:underline font-medium"
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
