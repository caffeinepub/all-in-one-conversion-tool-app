import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Music,
  Sparkles,
  X,
  Youtube,
} from "lucide-react";
import { useState } from "react";

const YOUTUBE_API_KEY = "AIzaSyDlj5yvdIpE6OYJnIw_oJg5Cz5_kRJ33YQ";
const OPENROUTER_API_KEY = "nvidia/nemotron-nano-12b-v2-vl:free";
const OPENROUTER_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

type Quality = "1080" | "720" | "480" | "360" | "audio";

interface QualityOption {
  value: Quality;
  label: string;
  sublabel?: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: "1080", label: "1080p", sublabel: "Full HD" },
  { value: "720", label: "720p", sublabel: "HD" },
  { value: "480", label: "480p", sublabel: "SD" },
  { value: "360", label: "360p", sublabel: "Low" },
  { value: "audio", label: "MP3", sublabel: "Audio only" },
];

const PLATFORM_BADGES = [
  { label: "YouTube", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { label: "TikTok", color: "text-pink-400 border-pink-500/30 bg-pink-500/10" },
  { label: "Twitter/X", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { label: "Vimeo", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  {
    label: "Instagram",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  { label: "& more", color: "text-white/40 border-white/10 bg-white/5" },
];

interface VideoMeta {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  duration?: string;
  watchUrl: string;
}

interface AIAnalysis {
  summary: string;
  tags: string[];
  recommendation: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = Number.parseInt(match[1] || "0");
  const m = Number.parseInt(match[2] || "0");
  const s = Number.parseInt(match[3] || "0");
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function triggerDownload(downloadUrl: string, filename?: string) {
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename || "video";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function analyzeWithAI(
  thumbnailUrl: string,
  title: string,
  channelTitle?: string,
): Promise<AIAnalysis | null> {
  try {
    const systemPrompt = `You are a helpful video content analyst. When given a video thumbnail image and metadata, provide:
1. A brief 1-2 sentence summary of what the video appears to be about
2. 3-5 relevant content tags (single words or short phrases)
3. A short download recommendation (e.g. "Great for offline viewing", "Perfect for saving as audio")

Respond ONLY in this JSON format:
{"summary":"...","tags":["...","...","..."],"recommendation":"..."}`;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: `Video title: "${title}"${channelTitle ? ` | Channel: ${channelTitle}` : ""}\nAnalyze the thumbnail and provide insight.`,
      },
    ];

    if (thumbnailUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: thumbnailUrl },
      });
    }

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Multimedia Studio Video Downloader",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysis;
    return parsed;
  } catch {
    return null;
  }
}

export default function VideoDownloaderMultimedia() {
  const [url, setUrl] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<Quality>("720");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please paste a video URL.");
      return;
    }

    setError(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setVideoMeta(null);
    setAiAnalysis(null);
    setFetchLoading(true);

    // Try YouTube metadata fetch for YouTube URLs
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ytId}&key=${YOUTUBE_API_KEY}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const snippet = item.snippet ?? {};
            const contentDetails = item.contentDetails ?? {};
            const meta: VideoMeta = {
              videoId: ytId,
              title: snippet.title ?? "Unknown Title",
              thumbnail:
                snippet.thumbnails?.maxres?.url ||
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                snippet.thumbnails?.default?.url ||
                "",
              channelTitle: snippet.channelTitle ?? undefined,
              duration: contentDetails.duration
                ? formatDuration(contentDetails.duration)
                : undefined,
              watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
            };
            setVideoMeta(meta);
            setFetchLoading(false);

            // Trigger AI analysis in background
            if (meta.thumbnail) {
              setAiLoading(true);
              analyzeWithAI(meta.thumbnail, meta.title, meta.channelTitle).then(
                (analysis) => {
                  setAiAnalysis(analysis);
                  setAiLoading(false);
                },
              );
            }
            return;
          }
        }
      } catch {
        // Fall through to generic meta
      }
    }

    // For non-YouTube or if YouTube API fails — set a minimal meta to allow download
    const fallbackMeta: VideoMeta = {
      videoId: "",
      title: "Video",
      thumbnail: "",
      watchUrl: trimmed,
    };
    setVideoMeta(fallbackMeta);
    setFetchLoading(false);

    // Try AI analysis with just the URL as context
    setAiLoading(true);
    analyzeWithAI("", "Video from URL", undefined).then((analysis) => {
      setAiAnalysis(analysis);
      setAiLoading(false);
    });
  }

  async function handleDownload() {
    if (!videoMeta) return;
    setDownloadError(null);
    setDownloadSuccess(null);
    setDownloadLoading(true);

    const downloadUrl = url.trim();

    try {
      const isAudio = selectedQuality === "audio";

      const body = isAudio
        ? { url: downloadUrl, audioFormat: "mp3", downloadMode: "audio" }
        : {
            url: downloadUrl,
            videoQuality: selectedQuality,
            audioFormat: "mp3",
            downloadMode: "auto",
          };

      const res = await fetch("https://api.cobalt.tools/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.status === "stream" || data.status === "redirect") {
        triggerDownload(data.url, videoMeta.title);
        setDownloadSuccess("Download started! Check your downloads folder.");
      } else if (
        data.status === "picker" &&
        data.picker &&
        data.picker.length > 0
      ) {
        triggerDownload(data.picker[0].url, videoMeta.title);
        setDownloadSuccess("Download started! Check your downloads folder.");
      } else if (data.status === "error") {
        const code = data.error?.code ?? "unknown";
        // Fall back to opening watch URL
        window.open(videoMeta.watchUrl, "_blank");
        setDownloadError(
          `Cobalt couldn't process the download (${code}). Opening video page in a new tab instead.`,
        );
      } else {
        // Unknown status — fall back
        window.open(videoMeta.watchUrl, "_blank");
        setDownloadError(
          "Direct download failed. Opening video page in a new tab — use your browser to save.",
        );
      }
    } catch {
      // CORS / network error — fall back to watch URL
      window.open(videoMeta.watchUrl, "_blank");
      setDownloadError(
        "Direct download is unavailable from your browser (network restriction). Opening video page in a new tab instead.",
      );
    } finally {
      setDownloadLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleFetch();
  }

  function handleClear() {
    setUrl("");
    setVideoMeta(null);
    setAiAnalysis(null);
    setError(null);
    setDownloadError(null);
    setDownloadSuccess(null);
  }

  const isLoading = fetchLoading || downloadLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Download className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-300">
                Video Downloader
              </h2>
              <p className="text-sm text-gray-500">
                Paste a video URL and download directly to your device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-400">
              AI-Powered Analysis
            </span>
          </div>
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="mm-card p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Supported Platforms
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_BADGES.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.color}`}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* URL Input */}
      <div className="mm-card p-6 space-y-4">
        <label
          htmlFor="multimedia-video-url-input"
          className="text-xs font-semibold uppercase tracking-widest text-gray-500"
        >
          Paste Video URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
            <input
              id="multimedia-video-url-input"
              data-ocid="video_downloader.url_input"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste a video URL (YouTube, TikTok, Twitter, Vimeo, etc.)"
              className="w-full pl-10 pr-10 py-3 rounded-xl mm-input text-gray-300 placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-200"
            />
            {url && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                aria-label="Clear URL"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            data-ocid="video_downloader.fetch_button"
            onClick={handleFetch}
            disabled={isLoading || !url.trim()}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium px-6 h-12 transition-all duration-200 shadow-glow-sm disabled:opacity-50"
          >
            {fetchLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Fetch Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <Alert
          data-ocid="video_downloader.error_state"
          className="border-red-500/30 bg-red-500/10 text-red-300 animate-slide-up"
        >
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {downloadError && (
        <Alert
          data-ocid="video_downloader.error_state"
          className="border-orange-500/30 bg-orange-500/10 text-orange-300 animate-slide-up"
        >
          <AlertCircle className="h-4 w-4 text-orange-400" />
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {/* Download Success */}
      {downloadSuccess && (
        <Alert
          data-ocid="video_downloader.success_state"
          className="border-teal-500/30 bg-teal-500/10 text-teal-300 animate-slide-up"
        >
          <CheckCircle2 className="h-4 w-4 text-teal-400" />
          <AlertDescription>{downloadSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {fetchLoading && (
        <div
          data-ocid="video_downloader.loading_state"
          className="mm-card p-6 space-y-4 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="w-40 h-24 rounded-lg bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
              <div className="h-3 bg-white/10 rounded w-1/3" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!fetchLoading && !videoMeta && !error && (
        <div
          data-ocid="video_downloader.empty_state"
          className="mm-card p-10 flex flex-col items-center justify-center text-center space-y-3"
        >
          <div className="p-4 rounded-full bg-white/5">
            <Download className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-gray-600 text-sm">
            Paste a video URL above and click{" "}
            <span className="text-gray-400">Fetch Video</span> to get started.
          </p>
          <p className="text-gray-700 text-xs flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" />
            AI will analyze the video thumbnail automatically
          </p>
        </div>
      )}

      {/* Result */}
      {!fetchLoading && videoMeta && (
        <div className="space-y-4 animate-slide-up">
          {/* Thumbnail + Meta */}
          <div className="mm-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {videoMeta.thumbnail ? (
                <div className="relative flex-shrink-0 w-full sm:w-48 rounded-xl overflow-hidden bg-black aspect-video sm:aspect-auto sm:h-28">
                  <img
                    src={videoMeta.thumbnail}
                    alt={videoMeta.title}
                    className="w-full h-full object-cover"
                  />
                  {videoMeta.duration && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                      {videoMeta.duration}
                    </span>
                  )}
                </div>
              ) : null}

              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="font-semibold text-gray-300 text-base leading-snug line-clamp-2">
                  {videoMeta.title}
                </h3>
                {videoMeta.channelTitle && (
                  <p className="text-sm text-gray-500">
                    {videoMeta.channelTitle}
                  </p>
                )}
                <a
                  href={videoMeta.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open source page
                </a>
              </div>
            </div>

            {/* AI Analysis Panel */}
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
                <Bot className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  AI Analysis
                </span>
                <span className="text-xs text-gray-600 ml-1">
                  · Powered by Nvidia Nemotron
                </span>
              </div>
              <div className="p-4 space-y-3">
                {aiLoading ? (
                  <div
                    data-ocid="video_downloader.ai_analysis.loading_state"
                    className="flex items-center gap-2 text-gray-500 text-sm"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    <span>Analyzing video with AI…</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {aiAnalysis.summary}
                    </p>
                    {aiAnalysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs bg-white/5 border-white/15 text-gray-400 px-2 py-0.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {aiAnalysis.recommendation && (
                      <p className="text-xs text-gray-500 italic">
                        💡 {aiAnalysis.recommendation}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">
                    AI analysis unavailable for this video.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quality Selector + Download */}
          <div className="mm-card p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Download Quality
              </p>
              <div className="flex flex-wrap gap-2">
                {QUALITY_OPTIONS.map((opt, idx) => {
                  const isSelected = selectedQuality === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      data-ocid={`video_downloader.quality.button.${idx + 1}`}
                      onClick={() => setSelectedQuality(opt.value)}
                      className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-white/10 border-white/30 text-gray-200"
                          : "bg-white/5 border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-300"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {opt.value === "audio" ? (
                        <Music className="w-3.5 h-3.5 mb-0.5" />
                      ) : null}
                      <span>{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-current opacity-60 mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Download preparing loader */}
            {downloadLoading && (
              <div
                data-ocid="video_downloader.loading_state"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                <p className="text-sm text-gray-300">
                  Preparing download… This may take a moment.
                </p>
              </div>
            )}

            {/* Download Button */}
            <Button
              data-ocid="video_downloader.download_button"
              onClick={handleDownload}
              disabled={downloadLoading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium h-12 transition-all duration-200 shadow-glow-sm disabled:opacity-50"
            >
              {downloadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing
                  Download…
                </>
              ) : selectedQuality === "audio" ? (
                <>
                  <Music className="w-4 h-4 mr-2" /> Download MP3
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" /> Download{" "}
                  {selectedQuality}p Video
                </>
              )}
            </Button>

            <p className="text-xs text-gray-600 text-center">
              Powered by{" "}
              <a
                href="https://cobalt.tools"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-400 transition-colors"
              >
                cobalt.tools
              </a>{" "}
              — free & open-source video download service
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
