import { useState, useRef, useCallback, useEffect } from 'react';
import { Video, Upload, Scissors, Download, Loader2, AlertCircle, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VideoCutter() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isCutting, setIsCutting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const ffmpegRef = useRef<unknown>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegLoaded || ffmpegLoading) return;
    setFfmpegLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load FFmpeg'));
        document.head.appendChild(script);
      });
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load FFmpeg util'));
        document.head.appendChild(script);
      });
      setFfmpegLoaded(true);
    } catch {
      setError('Failed to load video processing library. Using fallback method.');
    } finally {
      setFfmpegLoading(false);
    }
  }, [ffmpegLoaded, ffmpegLoading]);

  const handleFileUpload = (file: File) => {
    setError(null);
    setFileName(file.name);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setStartTime(0);
      setEndTime(dur);
    }
  };

  const getTimeFromEvent = (e: React.MouseEvent | React.TouchEvent): number => {
    const timeline = timelineRef.current;
    if (!timeline || !duration) return 0;
    const rect = timeline.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!duration) return;
    const pos = getTimeFromEvent(e);
    const startDist = Math.abs(pos - startTime);
    const endDist = Math.abs(pos - endTime);
    setDragging(startDist < endDist ? 'start' : 'end');
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !duration) return;
    const pos = getTimeFromEvent(e);
    if (dragging === 'start') {
      setStartTime(Math.min(pos, endTime - 0.5));
    } else {
      setEndTime(Math.max(pos, startTime + 0.5));
    }
  };

  const handleTimelineMouseUp = () => setDragging(null);

  useEffect(() => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime, duration]);

  const handleCutAndDownload = async () => {
    if (!videoFile || !videoUrl) return;
    setIsCutting(true);
    setProgress(0);
    setError(null);

    try {
      const win = window as unknown as Record<string, unknown>;
      if (win.FFmpeg && win.FFmpegUtil) {
        const { FFmpeg } = win.FFmpeg as { FFmpeg: new () => unknown };
        const { fetchFile } = win.FFmpegUtil as { fetchFile: (f: File) => Promise<Uint8Array> };

        if (!ffmpegRef.current) {
          const ff = new FFmpeg() as {
            on: (event: string, cb: (data: unknown) => void) => void;
            load: () => Promise<void>;
            writeFile: (name: string, data: Uint8Array) => Promise<void>;
            exec: (args: string[]) => Promise<void>;
            readFile: (name: string) => Promise<Uint8Array>;
          };
          ff.on('progress', (data: unknown) => {
            const d = data as { progress?: number };
            if (d.progress !== undefined) setProgress(Math.round(d.progress * 100));
          });
          await ff.load();
          ffmpegRef.current = ff;
        }

        const ff = ffmpegRef.current as {
          writeFile: (name: string, data: Uint8Array) => Promise<void>;
          exec: (args: string[]) => Promise<void>;
          readFile: (name: string) => Promise<Uint8Array>;
        };

        const inputName = 'input.' + (fileName.split('.').pop() || 'mp4');
        const outputName = 'output.mp4';
        const fileData = await fetchFile(videoFile);
        await ff.writeFile(inputName, fileData);
        await ff.exec([
          '-i', inputName,
          '-ss', String(startTime),
          '-to', String(endTime),
          '-c', 'copy',
          outputName,
        ]);
        const rawData = await ff.readFile(outputName);
        // Convert to a concrete ArrayBuffer to satisfy Blob constructor type requirements
        const concreteBuffer = rawData.buffer instanceof ArrayBuffer
          ? rawData.buffer
          : new Uint8Array(rawData).buffer;
        const blob = new Blob([concreteBuffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const baseName = fileName.replace(/\.[^.]+$/, '') || 'video';
        a.href = url;
        a.download = `${baseName}_cut.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress(100);
      } else {
        await fallbackCut();
      }
    } catch (err) {
      console.error(err);
      try {
        await fallbackCut();
      } catch {
        setError('Failed to cut video. Please try a shorter clip or a different browser.');
      }
    } finally {
      setIsCutting(false);
    }
  };

  const fallbackCut = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !videoUrl) {
        reject(new Error('No video'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const baseName = fileName.replace(/\.[^.]+$/, '') || 'video';
        a.href = url;
        a.download = `${baseName}_cut.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setProgress(100);
        resolve();
      };

      video.currentTime = startTime;
      video.muted = true;

      const drawFrame = () => {
        if (video.currentTime >= endTime) {
          recorder.stop();
          video.pause();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const prog = ((video.currentTime - startTime) / (endTime - startTime)) * 100;
        setProgress(Math.round(prog));
        requestAnimationFrame(drawFrame);
      };

      recorder.start();
      video.play().then(() => {
        drawFrame();
      }).catch(reject);
    });
  };

  const handleReset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoFile(null);
    setFileName('');
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setError(null);
    setProgress(0);
  };

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Video className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Video Cutter</h2>
            <p className="text-sm text-white/50">Import video, select a range, and download the clip</p>
          </div>
          {videoUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="ml-auto text-white/40 hover:text-white/80 hover:bg-white/10 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {!videoUrl && (
        <div
          className="mm-card p-8 text-center cursor-pointer mm-upload-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.webm,.mov,.avi,.mkv,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <p className="text-white font-medium">Drop video file here or click to browse</p>
              <p className="text-white/40 text-sm mt-1">Supports MP4, WebM, MOV, AVI, MKV</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video Editor */}
      {videoUrl && (
        <div className="mm-card p-6 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-sm font-medium truncate max-w-xs">{fileName}</p>
            <span className="text-white/40 text-xs">Duration: {formatTime(duration)}</span>
          </div>

          {/* Video Preview */}
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleVideoLoaded}
              controls
              playsInline
            />
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs">Drag handles to set start and end points</p>
            <div
              ref={timelineRef}
              className="relative h-12 rounded-xl overflow-hidden cursor-pointer select-none"
              style={{ background: 'rgba(15, 23, 42, 0.8)' }}
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onMouseLeave={handleTimelineMouseUp}
            >
              {/* Track background */}
              <div className="absolute inset-0 flex items-center px-2">
                <div className="w-full h-2 rounded-full bg-white/10" />
              </div>

              {/* Selected region */}
              <div
                className="absolute top-0 bottom-0 bg-teal-500/20 border-x-2 border-teal-500"
                style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
              />

              {/* Start handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-teal-400 cursor-ew-resize flex items-center justify-center"
                style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-4 h-6 rounded bg-teal-400 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-white/60 rounded" />
                </div>
              </div>

              {/* End handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize flex items-center justify-center"
                style={{ left: `${endPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-4 h-6 rounded bg-cyan-400 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-white/60 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-3 gap-4">
            <div className="mm-card-inner p-3 rounded-xl">
              <p className="text-white/40 text-xs mb-1">Start</p>
              <p className="text-teal-400 font-mono text-lg font-semibold">{formatTime(startTime)}</p>
            </div>
            <div className="mm-card-inner p-3 rounded-xl text-center">
              <p className="text-white/40 text-xs mb-1">Duration</p>
              <p className="text-white/70 font-mono text-lg font-semibold">{formatTime(endTime - startTime)}</p>
            </div>
            <div className="mm-card-inner p-3 rounded-xl text-right">
              <p className="text-white/40 text-xs mb-1">End</p>
              <p className="text-cyan-400 font-mono text-lg font-semibold">{formatTime(endTime)}</p>
            </div>
          </div>

          {/* FFmpeg Load Button */}
          {!ffmpegLoaded && (
            <Button
              onClick={loadFFmpeg}
              disabled={ffmpegLoading}
              variant="outline"
              className="w-full border-white/20 text-white/60 hover:bg-white/10 hover:text-white rounded-xl"
            >
              {ffmpegLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading FFmpeg…</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Load FFmpeg for Better Quality</>
              )}
            </Button>
          )}

          {/* Progress */}
          {isCutting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50">
                <span>Processing…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cut Button */}
          <Button
            onClick={handleCutAndDownload}
            disabled={isCutting || duration === 0}
            className="w-full bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-all duration-200 shadow-glow-sm h-12"
          >
            {isCutting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cutting… {progress}%</>
            ) : (
              <><Scissors className="w-4 h-4 mr-2" /> Cut & Download</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
