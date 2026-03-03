import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  List,
  Loader2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Square,
  Tv,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Channel {
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

type PlayerType =
  | "hls"
  | "youtube"
  | "facebook"
  | "instagram"
  | "direct-video"
  | "unknown";

type PlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "stopped"
  | "error";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function detectPlayerType(url: string): PlayerType {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    return "youtube";
  if (lower.includes("facebook.com") || lower.includes("fb.watch"))
    return "facebook";
  if (lower.includes("instagram.com")) return "instagram";
  if (
    lower.endsWith(".m3u8") ||
    lower.includes(".m3u8?") ||
    lower.includes("m3u8")
  )
    return "hls";
  if (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mkv") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".mov")
  )
    return "direct-video";
  return "unknown";
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseM3U(content: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#EXTINF:")) {
      current = {};
      // Parse name (after the last comma)
      const commaIdx = trimmed.lastIndexOf(",");
      if (commaIdx !== -1) {
        current.name = trimmed.slice(commaIdx + 1).trim() || "Unnamed Channel";
      }
      // Parse tvg-logo
      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/i);
      if (logoMatch) current.logo = logoMatch[1];
      // Parse group-title
      const groupMatch = trimmed.match(/group-title="([^"]*)"/i);
      if (groupMatch) current.group = groupMatch[1];
    } else if (!trimmed.startsWith("#") && current) {
      current.url = trimmed;
      if (current.name && current.url) {
        channels.push(current as Channel);
      }
      current = null;
    }
  }

  return channels;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function IPTVPlayer() {
  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [playerType, setPlayerType] = useState<PlayerType>("hls");
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChannels, setShowChannels] = useState(false);
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [hlsLoading, setHlsLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load HLS.js ───────────────────────────────────────────────────────── */
  const loadHls = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (hlsLoaded) {
        resolve();
        return;
      }
      if (hlsLoading) {
        // Poll until loaded
        const interval = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).Hls) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        return;
      }
      setHlsLoading(true);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js";
      script.onload = () => {
        setHlsLoaded(true);
        setHlsLoading(false);
        resolve();
      };
      script.onerror = () => {
        setHlsLoading(false);
        reject(new Error("Failed to load HLS.js"));
      };
      document.head.appendChild(script);
    });
  }, [hlsLoaded, hlsLoading]);

  /* ── Attach HLS stream to video element ─────────────────────────────────── */
  const attachHls = useCallback(
    async (url: string) => {
      const video = videoRef.current;
      if (!video) return;

      // Destroy existing HLS instance
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }

      setStatus("loading");
      setStatusMsg("Loading stream…");

      // Check native HLS support (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video
          .play()
          .then(() => {
            setStatus("playing");
            setStatusMsg("Playing");
          })
          .catch(() => {
            setStatus("error");
            setStatusMsg("Error — try another link");
          });
        return;
      }

      try {
        await loadHls();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Hls = (window as any).Hls;
        if (!Hls || !Hls.isSupported()) {
          setStatus("error");
          setStatusMsg("HLS not supported in this browser");
          return;
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsInstanceRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video
            .play()
            .then(() => {
              setStatus("playing");
              setStatusMsg("Playing");
            })
            .catch(() => {
              setStatus("error");
              setStatusMsg("Playback blocked — click Play");
            });
        });
        hls.on(
          Hls.Events.ERROR,
          (_event: unknown, data: { fatal?: boolean }) => {
            if (data.fatal) {
              setStatus("error");
              setStatusMsg("Stream error — check URL or try another link");
            }
          },
        );
      } catch {
        setStatus("error");
        setStatusMsg("Failed to load HLS player");
      }
    },
    [loadHls],
  );

  /* ── Volume sync ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  /* ── Cleanup ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
    };
  }, []);

  /* ── Play URL ─────────────────────────────────────────────────────────── */
  const playUrl = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;

      setActiveUrl(trimmed);
      const type = detectPlayerType(trimmed);
      setPlayerType(type);

      if (type === "hls" || type === "unknown") {
        await attachHls(trimmed);
      } else if (type === "direct-video") {
        const video = videoRef.current;
        if (video) {
          if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
            hlsInstanceRef.current = null;
          }
          video.src = trimmed;
          setStatus("loading");
          setStatusMsg("Loading video…");
          video
            .play()
            .then(() => {
              setStatus("playing");
              setStatusMsg("Playing");
            })
            .catch(() => {
              setStatus("error");
              setStatusMsg("Error loading video — check URL");
            });
        }
      } else if (type === "youtube") {
        setStatus("playing");
        setStatusMsg("Playing via YouTube embed");
      } else if (type === "facebook") {
        setStatus("playing");
        setStatusMsg("Playing via Facebook embed");
      } else if (type === "instagram") {
        setStatus("idle");
        setStatusMsg("Instagram restricts direct embedding");
      }
    },
    [attachHls],
  );

  /* ── Handle Play button ───────────────────────────────────────────────── */
  const handlePlay = useCallback(() => {
    const url = inputUrl.trim();
    if (!url) return;
    playUrl(url);
  }, [inputUrl, playUrl]);

  /* ── Handle channel select ────────────────────────────────────────────── */
  const handleChannelSelect = useCallback(
    (ch: Channel) => {
      setSelectedChannel(ch);
      setInputUrl(ch.url);
      playUrl(ch.url);
    },
    [playUrl],
  );

  /* ── Video controls ───────────────────────────────────────────────────── */
  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setStatus("playing");
        setStatusMsg("Playing");
      });
    } else {
      video.pause();
      setStatus("paused");
      setStatusMsg("Paused");
    }
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = "";
    }
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
    setStatus("stopped");
    setStatusMsg("Stopped");
    setActiveUrl("");
  };

  const handleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {});
    }
  };

  const handleReset = () => {
    handleStop();
    setInputUrl("");
    setChannels([]);
    setSelectedChannel(null);
    setShowChannels(false);
    setSearchQuery("");
    setStatus("idle");
    setStatusMsg("");
    setActiveUrl("");
    setFileInputKey((k) => k + 1);
  };

  /* ── M3U file upload ───────────────────────────────────────────────────── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseM3U(text);
      if (parsed.length === 0) {
        setStatusMsg("No channels found in the playlist file");
        return;
      }
      setChannels(parsed);
      setShowChannels(true);
      setStatusMsg(`Loaded ${parsed.length} channels`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const isVideoType =
    activeUrl &&
    (playerType === "hls" ||
      playerType === "direct-video" ||
      playerType === "unknown");
  const isYouTubeType = activeUrl && playerType === "youtube";
  const isFacebookType = activeUrl && playerType === "facebook";
  const isInstagramType = activeUrl && playerType === "instagram";

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const ytId = isYouTubeType ? extractYouTubeId(activeUrl) : null;

  const statusColor =
    status === "playing"
      ? "text-teal-400 border-teal-500/30 bg-teal-500/10"
      : status === "loading"
        ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
        : status === "error"
          ? "text-red-400 border-red-500/30 bg-red-500/10"
          : status === "paused"
            ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
            : "text-white/40 border-white/10 bg-white/5";

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─ Header ─────────────────────────────────────────────────────────── */}
      <div className="mm-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Tv className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-300">
                Free IPTV Player
              </h2>
              <p className="text-sm text-gray-500">
                Paste m3u8, YouTube, Facebook, or any video link — or load an
                M3U playlist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {status !== "idle" && (
              <Badge
                className={`text-xs font-medium border px-2.5 py-0.5 rounded-full ${statusColor}`}
              >
                {status === "loading" && (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin inline-block" />
                )}
                {statusMsg || status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              data-ocid="iptv.reset_button"
              className="text-gray-600 hover:text-gray-300 hover:bg-white/10 rounded-xl"
              title="Reset player"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─ Supported formats info ──────────────────────────────────────────── */}
      <div className="mm-card p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-600 mr-1">
            Supports:
          </span>
          {[
            {
              label: "M3U8 / HLS",
              color: "text-teal-400 border-teal-500/30 bg-teal-500/10",
            },
            {
              label: "YouTube",
              color: "text-red-400 border-red-500/30 bg-red-500/10",
            },
            {
              label: "Facebook",
              color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
            },
            {
              label: "Instagram",
              color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
            },
            {
              label: "MP4 / WebM",
              color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
            },
            {
              label: "M3U Playlist",
              color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
            },
          ].map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${b.color}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ─ Input area + controls ─────────────────────────────────────────── */}
      <div className="mm-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* URL input */}
          <div className="relative flex-1">
            <Tv className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400/70 pointer-events-none" />
            <input
              data-ocid="iptv.input"
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlay()}
              placeholder="Paste m3u8, YouTube, Facebook, Instagram or video link…"
              className="w-full pl-10 pr-10 py-3 rounded-xl mm-input text-gray-300 placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-200"
              aria-label="Stream URL"
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                aria-label="Clear URL"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Play button */}
          <Button
            data-ocid="iptv.primary_button"
            onClick={handlePlay}
            disabled={!inputUrl.trim() || status === "loading"}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium px-6 h-12 transition-all duration-200 shadow-glow-sm disabled:opacity-50 flex-shrink-0"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-white" />
                Play
              </>
            )}
          </Button>
        </div>

        {/* File upload row */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            key={fileInputKey}
            ref={fileInputRef}
            type="file"
            accept=".m3u,.m3u8,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            data-ocid="iptv.upload_button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-white/20 text-gray-400 hover:bg-white/10 hover:text-gray-200 rounded-xl"
          >
            <Upload className="w-4 h-4 mr-2" />
            Load M3U / M3U8 File
          </Button>
          {channels.length > 0 && (
            <Button
              data-ocid="iptv.toggle"
              variant="outline"
              size="sm"
              onClick={() => setShowChannels((v) => !v)}
              className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 rounded-xl"
            >
              <List className="w-4 h-4 mr-2" />
              {showChannels ? "Hide" : "Show"} Channels ({channels.length})
            </Button>
          )}
          {channels.length > 0 && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {channels.length} channels loaded
            </span>
          )}
        </div>
      </div>

      {/* ─ Main content grid ──────────────────────────────────────────────── */}
      <div
        className={`flex flex-col ${showChannels && channels.length > 0 ? "lg:flex-row" : ""} gap-4`}
      >
        {/* Channel list sidebar */}
        {showChannels && channels.length > 0 && (
          <div
            className="mm-card p-4 space-y-3 w-full lg:w-72 flex-shrink-0"
            data-ocid="iptv.panel"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-400">
                Channel List
              </h3>
              <button
                type="button"
                onClick={() => setShowChannels(false)}
                className="text-gray-600 hover:text-gray-400 transition-colors"
                aria-label="Close channel list"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
              <input
                data-ocid="iptv.search_input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels…"
                className="w-full pl-8 pr-3 py-2 rounded-lg mm-input text-gray-300 placeholder:text-gray-600 text-xs focus:outline-none focus:ring-1 focus:ring-gray-500/50 transition-all"
              />
            </div>

            {/* Channels */}
            <div
              className="overflow-y-auto max-h-96 space-y-1 scrollbar-thin"
              data-ocid="iptv.list"
            >
              {filteredChannels.length === 0 ? (
                <div
                  data-ocid="iptv.empty_state"
                  className="py-6 text-center text-gray-600 text-xs"
                >
                  No channels match your search
                </div>
              ) : (
                filteredChannels.map((ch, idx) => {
                  const isSelected = selectedChannel?.url === ch.url;
                  return (
                    <button
                      type="button"
                      key={`${ch.url}-${idx}`}
                      data-ocid={`iptv.item.${idx + 1}`}
                      onClick={() => handleChannelSelect(ch)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
                          : "hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent"
                      }`}
                    >
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt=""
                          className="w-7 h-7 rounded object-contain bg-black/20 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                          <Tv className="w-3.5 h-3.5 text-teal-500/60" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {ch.name}
                        </p>
                        {ch.group && (
                          <p className="truncate text-[10px] text-gray-600 mt-0.5">
                            {ch.group}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 animate-pulse" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Player area */}
        <div className="flex-1 space-y-4">
          {/* Player window */}
          <div
            ref={playerContainerRef}
            className="mm-card overflow-hidden relative"
            style={{ aspectRatio: "16/9", maxHeight: "560px" }}
            data-ocid="iptv.canvas_target"
          >
            {/* Idle state */}
            {!activeUrl && status === "idle" && (
              <div
                data-ocid="iptv.empty_state"
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <Tv className="w-10 h-10 text-teal-500/40" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 text-white/30 fill-white/30 ml-0.5" />
                  </div>
                </div>
                <div className="text-center space-y-1 px-6">
                  <p className="text-gray-500 text-sm font-medium">
                    Paste a stream link above and press{" "}
                    <span className="text-gray-300">Play</span>
                  </p>
                  <p className="text-gray-600 text-xs">
                    Supports IPTV streams, YouTube, Facebook, direct video files
                    & M3U playlists
                  </p>
                </div>
              </div>
            )}

            {/* Stopped state */}
            {!activeUrl && status === "stopped" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                <Square className="w-8 h-8 text-gray-700" />
                <p className="text-gray-600 text-sm">Stream stopped</p>
              </div>
            )}

            {/* Loading overlay */}
            {status === "loading" && (
              <div
                data-ocid="iptv.loading_state"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10"
              >
                <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
                <p className="text-gray-400 text-sm">Loading stream…</p>
              </div>
            )}

            {/* Error overlay */}
            {status === "error" && (
              <div
                data-ocid="iptv.error_state"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 z-10 px-6 text-center"
              >
                <AlertCircle className="w-10 h-10 text-red-400" />
                <div>
                  <p className="text-red-300 text-sm font-medium">
                    Playback Error
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{statusMsg}</p>
                </div>
                <Button
                  size="sm"
                  onClick={handlePlay}
                  className="bg-teal-500 hover:bg-teal-400 text-white rounded-lg text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Instagram — no embed */}
            {isInstagramType && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 z-10 px-6 text-center">
                <AlertTriangle className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-gray-300 text-sm font-medium">
                    Instagram restricts direct embedding
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Open the link in a new tab to watch
                  </p>
                </div>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ocid="iptv.link"
                >
                  <Button
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-500 text-gray-100 rounded-lg text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    Open on Instagram
                  </Button>
                </a>
              </div>
            )}

            {/* YouTube embed */}
            {isYouTubeType && ytId && (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title="YouTube Player"
              />
            )}

            {/* YouTube without ID — fallback */}
            {isYouTubeType && !ytId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10 px-6 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-400" />
                <p className="text-gray-500 text-sm">
                  Could not parse YouTube video ID. Try a standard watch URL.
                </p>
              </div>
            )}

            {/* Facebook embed */}
            {isFacebookType && (
              <iframe
                src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(activeUrl)}&show_text=false&autoplay=true&width=100%25`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title="Facebook Video Player"
              />
            )}

            {/* HLS / direct video */}
            {/* biome-ignore lint/a11y/useMediaCaption: live IPTV streams don't have captions */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-contain bg-black ${isVideoType ? "block" : "hidden"}`}
              controls={false}
              playsInline
              onPlay={() => {
                setStatus("playing");
                setStatusMsg("Playing");
              }}
              onPause={() => {
                if (status !== "stopped") {
                  setStatus("paused");
                  setStatusMsg("Paused");
                }
              }}
              onError={() => {
                setStatus("error");
                setStatusMsg("Stream error — try another link");
              }}
              onWaiting={() => {
                if (status !== "error") {
                  setStatus("loading");
                  setStatusMsg("Buffering…");
                }
              }}
              onCanPlay={() => {
                if (status === "loading") {
                  setStatus("playing");
                  setStatusMsg("Playing");
                }
              }}
            />

            {/* Fullscreen button always visible in top-right */}
            {activeUrl && (
              <button
                type="button"
                onClick={handleFullscreen}
                data-ocid="iptv.secondary_button"
                className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
                title="Toggle fullscreen"
                aria-label="Toggle fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ─ Transport controls ──────────────────────────────────────────── */}
          {activeUrl && !isInstagramType && (
            <div className="mm-card p-4" data-ocid="iptv.panel">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Left: play controls */}
                <div className="flex items-center gap-2">
                  {/* Play/Pause — only for video types */}
                  {isVideoType && (
                    <Button
                      data-ocid="iptv.toggle"
                      variant="ghost"
                      size="icon"
                      onClick={handlePause}
                      className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all"
                      aria-label={status === "paused" ? "Resume" : "Pause"}
                    >
                      {status === "paused" ? (
                        <Play className="w-4 h-4 fill-white/80" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                  )}

                  {/* Stop */}
                  <Button
                    data-ocid="iptv.delete_button"
                    variant="ghost"
                    size="icon"
                    onClick={handleStop}
                    className="w-10 h-10 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    aria-label="Stop"
                    title="Stop stream"
                  >
                    <Square className="w-4 h-4" />
                  </Button>

                  {/* Fullscreen (always) */}
                  <Button
                    data-ocid="iptv.button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all"
                    aria-label="Fullscreen"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>

                  {/* Status badge */}
                  <Badge
                    className={`text-xs font-medium border px-2.5 py-0.5 rounded-full ${statusColor}`}
                  >
                    {status === "loading" && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin inline-block" />
                    )}
                    {status === "playing" && (
                      <CheckCircle2 className="w-3 h-3 mr-1 inline-block text-teal-400" />
                    )}
                    {statusMsg ||
                      status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>

                {/* Right: volume controls (only for video types) */}
                {isVideoType && (
                  <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      data-ocid="iptv.toggle"
                      className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <div className="w-28 sm:w-32">
                      <Slider
                        data-ocid="iptv.select"
                        min={0}
                        max={100}
                        step={1}
                        value={[volume]}
                        onValueChange={([v]) => {
                          setVolume(v);
                          if (v > 0 && isMuted) setIsMuted(false);
                        }}
                        className="cursor-pointer"
                        aria-label="Volume"
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right tabular-nums flex-shrink-0">
                      {isMuted ? "0" : volume}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Currently playing info */}
          {selectedChannel && activeUrl && (
            <div className="mm-card p-4 flex items-center gap-3 animate-slide-up">
              {selectedChannel.logo ? (
                <img
                  src={selectedChannel.logo}
                  alt=""
                  className="w-10 h-10 rounded-lg object-contain bg-black/20 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <Tv className="w-5 h-5 text-teal-500/60" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-300 truncate">
                  {selectedChannel.name}
                </p>
                {selectedChannel.group && (
                  <p className="text-xs text-gray-500 truncate">
                    {selectedChannel.group}
                  </p>
                )}
              </div>
              <Badge className="text-xs bg-teal-500/10 border-teal-500/30 text-teal-300">
                Live
              </Badge>
            </div>
          )}

          {/* Instagram open-in-tab alert */}
          {isInstagramType && (
            <Alert
              data-ocid="iptv.error_state"
              className="border-gray-500/30 bg-gray-500/10 text-gray-300"
            >
              <AlertTriangle className="h-4 w-4 text-gray-400" />
              <AlertDescription>
                Instagram does not allow external video embedding. Open the link
                in a new tab to watch.{" "}
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-gray-300 hover:text-gray-200"
                >
                  Open on Instagram ↗
                </a>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* ─ Tips ──────────────────────────────────────────────────────────── */}
      <div className="mm-card p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">
          How to use
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              icon: "📺",
              title: "M3U8 / HLS Stream",
              desc: "Paste any .m3u8 URL or IPTV stream link and press Play",
            },
            {
              icon: "▶️",
              title: "YouTube",
              desc: "Paste a youtube.com or youtu.be URL to embed and watch",
            },
            {
              icon: "📘",
              title: "Facebook",
              desc: "Paste a facebook.com video URL to embed directly",
            },
            {
              icon: "🎬",
              title: "Direct Video",
              desc: "Paste any .mp4 / .webm / .ogg link to play instantly",
            },
            {
              icon: "📋",
              title: "M3U Playlist",
              desc: "Click 'Load M3U / M3U8 File' to open a channel list from file",
            },
            {
              icon: "📷",
              title: "Instagram",
              desc: "Instagram restricts embedding — you'll get a link to open instead",
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-white/3"
            >
              <span className="text-base leading-none mt-0.5 flex-shrink-0">
                {tip.icon}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-400">
                  {tip.title}
                </p>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                  {tip.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
