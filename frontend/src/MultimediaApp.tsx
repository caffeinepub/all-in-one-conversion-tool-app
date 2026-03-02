import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Music, Video, Download, Camera, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import MP3Cutter from './modules/MP3Cutter';
import VideoCutter from './modules/VideoCutter';
import VideoDownloaderMultimedia from './modules/VideoDownloaderMultimedia';
import IPCamera from './modules/IPCamera';
import { Heart } from 'lucide-react';

export type MultimediaTabId = 'mp3-cutter' | 'video-cutter' | 'video-downloader' | 'ip-camera';

interface MultimediaTab {
  id: MultimediaTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: MultimediaTab[] = [
  {
    id: 'mp3-cutter',
    label: 'MP3 Cutter',
    icon: <Music className="w-4 h-4" />,
    description: 'Trim & export audio',
  },
  {
    id: 'video-cutter',
    label: 'Video Cutter',
    icon: <Video className="w-4 h-4" />,
    description: 'Trim video clips',
  },
  {
    id: 'video-downloader',
    label: 'Video Downloader',
    icon: <Download className="w-4 h-4" />,
    description: 'Download from YouTube',
  },
  {
    id: 'ip-camera',
    label: 'IP Camera',
    icon: <Camera className="w-4 h-4" />,
    description: 'Live camera stream',
  },
];

interface MultimediaAppProps {
  onBack?: () => void;
}

export default function MultimediaApp({ onBack }: MultimediaAppProps) {
  const [activeTab, setActiveTab] = useState<MultimediaTabId>('mp3-cutter');
  const { theme, setTheme } = useTheme();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown-app';
  const appId = encodeURIComponent(hostname);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col multimedia-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 multimedia-header">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors mr-1"
                  aria-label="Back to ConvertAll Studio"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg leading-tight text-white">
                  Multimedia Studio
                </h1>
                <p className="text-xs text-white/50 leading-none">
                  Audio & Video Tools
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-white/10 multimedia-nav">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                    whitespace-nowrap transition-all duration-200 flex-shrink-0
                    ${isActive
                      ? 'bg-teal-500/90 text-white shadow-glow-sm'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/10'
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
          {activeTab === 'mp3-cutter' && <MP3Cutter />}
          {activeTab === 'video-cutter' && <VideoCutter />}
          {activeTab === 'video-downloader' && <VideoDownloaderMultimedia />}
          {activeTab === 'ip-camera' && <IPCamera />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 multimedia-footer mt-auto">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
            <p>© {year} Multimedia Studio. All processing is done locally in your browser.</p>
            <p className="flex items-center gap-1">
              Built with{' '}
              <Heart className="w-3 h-3 text-teal-400 fill-teal-400" />{' '}
              using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline font-medium"
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
