import { useState } from 'react';
import { Download, Loader2, AlertCircle, Youtube, Play, ExternalLink, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const YOUTUBE_API_KEY = 'AIzaSyDlj5yvdIpE6OYJnIw_oJg5Cz5_kRJ33YQ';

interface VideoMeta {
  platform: 'youtube' | 'facebook';
  videoId?: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  duration?: string;
  description?: string;
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

function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.watch|fb\.com/.test(url);
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

const QUALITY_OPTIONS = [
  { label: '1080p Full HD', tag: '1080p', note: 'Best quality' },
  { label: '720p HD', tag: '720p', note: 'High quality' },
  { label: '480p SD', tag: '480p', note: 'Standard quality' },
  { label: '360p', tag: '360p', note: 'Low quality' },
  { label: 'Audio Only (MP3)', tag: 'audio', note: 'Music / podcast' },
];

export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a YouTube or Facebook video URL.');
      return;
    }

    const ytId = extractYouTubeId(trimmed);
    const isFb = isFacebookUrl(trimmed);

    if (!ytId && !isFb) {
      setError('Invalid URL. Please paste a valid YouTube or Facebook video link.');
      return;
    }

    setError(null);
    setVideoMeta(null);
    setLoading(true);

    try {
      if (ytId) {
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
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;
        setVideoMeta({
          platform: 'youtube',
          videoId: ytId,
          title: snippet.title,
          thumbnail:
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            '',
          channelTitle: snippet.channelTitle,
          duration: contentDetails?.duration ? formatDuration(contentDetails.duration) : undefined,
          description: snippet.description?.slice(0, 200),
          watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
        });
      } else if (isFb) {
        // Facebook: we can't bypass their auth/CORS, so we show the URL and guide the user
        setVideoMeta({
          platform: 'facebook',
          title: 'Facebook Video',
          thumbnail: '',
          watchUrl: trimmed,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadQuality(quality: { label: string; tag: string }) {
    if (!videoMeta) return;

    if (videoMeta.platform === 'youtube') {
      // YouTube restricts direct stream downloads via browser due to CORS/auth.
      // We open the watch URL and inform the user to use browser extensions or yt-dlp.
      // For audio, we can try to open the embed URL.
      if (quality.tag === 'audio') {
        window.open(`https://www.youtube.com/watch?v=${videoMeta.videoId}`, '_blank');
      } else {
        window.open(`https://www.youtube.com/watch?v=${videoMeta.videoId}`, '_blank');
      }
    } else if (videoMeta.platform === 'facebook') {
      window.open(videoMeta.watchUrl, '_blank');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleFetch();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Video Downloader</h2>
            <p className="text-sm text-muted-foreground">Download videos from YouTube and Facebook</p>
          </div>
        </div>
      </div>

      {/* URL Input Panel */}
      <div className="glass-card p-6 space-y-4">
        <label className="section-title">Paste Video URL</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://www.youtube.com/watch?v=... or https://www.facebook.com/..."
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 pr-10"
            />
            {url && (
              <button
                onClick={() => { setUrl(''); setVideoMeta(null); setError(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear URL"
              >
                ×
              </button>
            )}
          </div>
          <Button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 h-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Fetch Video</span>
              </>
            )}
          </Button>
        </div>

        {/* Supported platforms hint */}
        <div className="flex flex-wrap gap-3 pt-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Youtube className="w-3.5 h-3.5 text-red-400" />
            YouTube
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Play className="w-3.5 h-3.5 text-blue-400" />
            Facebook
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="animate-slide-up">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="glass-card p-6 space-y-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-40 h-24 rounded-lg bg-secondary shimmer flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-secondary rounded shimmer w-3/4" />
              <div className="h-3 bg-secondary rounded shimmer w-1/2" />
              <div className="h-3 bg-secondary rounded shimmer w-1/3" />
            </div>
          </div>
        </div>
      )}

      {/* Result Panel */}
      {!loading && videoMeta && (
        <div className="glass-card p-6 space-y-5 animate-slide-up">
          {/* Video Info */}
          <div className="flex flex-col sm:flex-row gap-4">
            {videoMeta.thumbnail ? (
              <div className="relative flex-shrink-0 w-full sm:w-48 rounded-xl overflow-hidden bg-secondary aspect-video sm:aspect-auto sm:h-28">
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
            ) : (
              <div className="flex-shrink-0 w-full sm:w-48 h-28 rounded-xl bg-secondary flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-2">
                {videoMeta.title}
              </h3>
              {videoMeta.channelTitle && (
                <p className="text-sm text-muted-foreground">{videoMeta.channelTitle}</p>
              )}
              {videoMeta.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{videoMeta.description}</p>
              )}
              <a
                href={videoMeta.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open on {videoMeta.platform === 'youtube' ? 'YouTube' : 'Facebook'}
              </a>
            </div>
          </div>

          {/* Download Options */}
          {videoMeta.platform === 'youtube' && (
            <div className="space-y-3">
              <p className="section-title">Select Quality & Download</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.tag}
                    onClick={() => handleDownloadQuality(q)}
                    className="tool-btn justify-between group hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{q.label}</span>
                    </div>
                    <span className="text-xs opacity-60 group-hover:opacity-80">{q.note}</span>
                  </button>
                ))}
              </div>

              {/* Info notice */}
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm text-foreground">How downloads work</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Clicking a quality option opens the video on YouTube. To save the file, use a browser
                  extension (e.g. <strong>Video DownloadHelper</strong>) or a tool like{' '}
                  <strong>yt-dlp</strong>. Direct browser downloads are blocked by YouTube's servers.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Facebook notice */}
          {videoMeta.platform === 'facebook' && (
            <div className="space-y-3">
              <p className="section-title">Download Options</p>
              <button
                onClick={() => handleDownloadQuality({ label: 'Open Video', tag: 'open' })}
                className="tool-btn w-full justify-center gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <ExternalLink className="w-4 h-4" />
                Open Video on Facebook
              </button>

              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm text-foreground">Facebook video downloads</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Facebook restricts direct video downloads. To save a Facebook video, open it in your
                  browser and use a browser extension or a third-party service like{' '}
                  <strong>fdown.net</strong> or <strong>savefrom.net</strong>.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !videoMeta && !error && (
        <div className="glass-card p-10 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-4 rounded-full bg-secondary">
            <Download className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            Paste a YouTube or Facebook video URL above and click <strong>Fetch Video</strong> to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
