import { useState } from 'react';
import { Download, Loader2, AlertCircle, Youtube, ExternalLink, Info, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const YOUTUBE_API_KEY = 'AIzaSyDlj5yvdIpE6OYJnIw_oJg5Cz5_kRJ33YQ';

interface VideoMeta {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  duration?: string;
  watchUrl: string;
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
  if (!match) return '';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoDownloaderMultimedia() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a YouTube video URL.');
      return;
    }

    const ytId = extractYouTubeId(trimmed);
    if (!ytId) {
      setError('Invalid YouTube URL. Please paste a valid YouTube link.');
      return;
    }

    setError(null);
    setDownloadError(null);
    setVideoMeta(null);
    setLoading(true);

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ytId}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found. It may be private, deleted, or unavailable in your region.');
      }
      const item = data.items[0];
      const snippet = item.snippet ?? {};
      const contentDetails = item.contentDetails ?? {};
      setVideoMeta({
        videoId: ytId,
        title: snippet.title ?? 'Unknown Title',
        thumbnail:
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          '',
        channelTitle: snippet.channelTitle ?? undefined,
        duration: contentDetails.duration ? formatDuration(contentDetails.duration) : undefined,
        watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!videoMeta) return;
    setDownloadError(null);
    const opened = window.open(videoMeta.watchUrl, '_blank');
    if (!opened) {
      setDownloadError('Pop-up was blocked. Please allow pop-ups for this site and try again.');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleFetch();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Download className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Video Downloader</h2>
            <p className="text-sm text-white/50">Paste a YouTube link and open it for download</p>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="mm-card p-6 space-y-4">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Paste YouTube URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-10 pr-10 py-3 rounded-xl mm-input text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all duration-200"
            />
            {url && (
              <button
                onClick={() => { setUrl(''); setVideoMeta(null); setError(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium px-6 h-12 transition-all duration-200 shadow-glow-sm disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Fetch Video</>
            )}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300 animate-slide-up">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {downloadError && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300 animate-slide-up">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="mm-card p-6 space-y-4 animate-pulse">
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

      {/* Result */}
      {!loading && videoMeta && (
        <div className="mm-card p-6 space-y-5 animate-slide-up">
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
              <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                {videoMeta.title}
              </h3>
              {videoMeta.channelTitle && (
                <p className="text-sm text-white/50">{videoMeta.channelTitle}</p>
              )}
              <a
                href={videoMeta.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-teal-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open on YouTube
              </a>
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/60">
              The video will open in a new tab — use your browser or a download extension to save it.
            </p>
          </div>

          <Button
            onClick={handleDownload}
            className="w-full bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium h-12 transition-all duration-200 shadow-glow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Open Video for Download
          </Button>
        </div>
      )}
    </div>
  );
}
