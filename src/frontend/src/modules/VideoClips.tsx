import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Download,
  Film,
  Loader2,
  Merge,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface VideoClipItem {
  id: string;
  file: File;
  name: string;
  duration: number;
  thumbnailUrl: string | null;
  objectUrl: string;
}

async function generateThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(0.5, video.duration / 2);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });

    video.load();
  });
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;

    video.addEventListener("loadedmetadata", () => {
      const dur = video.duration || 0;
      URL.revokeObjectURL(url);
      resolve(dur);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    video.load();
  });
}

export default function VideoClips() {
  const [clips, setClips] = useState<VideoClipItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingClips, setLoadingClips] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<unknown>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegLoaded || ffmpegLoading) return;
    setFfmpegLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load FFmpeg"));
        document.head.appendChild(script);
      });
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load FFmpeg util"));
        document.head.appendChild(script);
      });
      setFfmpegLoaded(true);
    } catch {
      setError(
        "Failed to load FFmpeg. Merge will use fallback method (WebM output).",
      );
    } finally {
      setFfmpegLoading(false);
    }
  }, [ffmpegLoaded, ffmpegLoading]);

  const addClips = useCallback(async (files: FileList | File[]) => {
    const videoFiles = Array.from(files).filter((f) =>
      f.type.startsWith("video/"),
    );
    if (videoFiles.length === 0) return;

    setLoadingClips(true);
    setError(null);

    const newClips = await Promise.all(
      videoFiles.map(async (file) => {
        const [duration, thumbnailUrl] = await Promise.all([
          getVideoDuration(file),
          generateThumbnail(file),
        ]);
        return {
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          duration,
          thumbnailUrl,
          objectUrl: URL.createObjectURL(file),
        } satisfies VideoClipItem;
      }),
    );

    setClips((prev) => [...prev, ...newClips]);
    setLoadingClips(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addClips(e.target.files);
      // Reset input so same file can be re-added
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      addClips(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const removeClip = (id: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.objectUrl);
      return prev.filter((c) => c.id !== id);
    });
  };

  const moveClip = (index: number, direction: "up" | "down") => {
    setClips((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  const mergeWithFFmpeg = async (): Promise<void> => {
    const win = window as unknown as Record<string, unknown>;
    const { FFmpeg } = win.FFmpeg as { FFmpeg: new () => unknown };
    const { fetchFile } = win.FFmpegUtil as {
      fetchFile: (f: File) => Promise<Uint8Array>;
    };

    if (!ffmpegRef.current) {
      const ff = new FFmpeg() as {
        on: (event: string, cb: (data: unknown) => void) => void;
        load: () => Promise<void>;
        writeFile: (name: string, data: Uint8Array | string) => Promise<void>;
        exec: (args: string[]) => Promise<void>;
        readFile: (name: string) => Promise<Uint8Array>;
      };
      ff.on("progress", (data: unknown) => {
        const d = data as { progress?: number };
        if (d.progress !== undefined) setProgress(Math.round(d.progress * 100));
      });
      await ff.load();
      ffmpegRef.current = ff;
    }

    const ff = ffmpegRef.current as {
      writeFile: (name: string, data: Uint8Array | string) => Promise<void>;
      exec: (args: string[]) => Promise<void>;
      readFile: (name: string) => Promise<Uint8Array>;
    };

    // Write all clip files and build concat list
    const concatLines: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const ext = clip.name.split(".").pop() || "mp4";
      const inputName = `clip_${i}.${ext}`;
      const fileData = await fetchFile(clip.file);
      await ff.writeFile(inputName, fileData);
      concatLines.push(`file '${inputName}'`);
      setProgress(Math.round(((i + 1) / clips.length) * 40));
    }

    const concatContent = concatLines.join("\n");
    await ff.writeFile("concat.txt", concatContent);

    setProgress(50);
    await ff.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
      "merged.mp4",
    ]);
    setProgress(90);

    const rawData = await ff.readFile("merged.mp4");
    const concreteBuffer =
      rawData.buffer instanceof ArrayBuffer
        ? rawData.buffer
        : new Uint8Array(rawData).buffer;
    const blob = new Blob([concreteBuffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged_clips.mp4";
    a.click();
    URL.revokeObjectURL(url);
    setProgress(100);
  };

  const mergeWithFallback = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      // Use the dimensions of the first clip
      const firstClip = clips[0];
      const tempVideo = document.createElement("video");
      tempVideo.src = firstClip.objectUrl;
      tempVideo.muted = true;

      tempVideo.addEventListener("loadedmetadata", async () => {
        canvas.width = tempVideo.videoWidth || 1280;
        canvas.height = tempVideo.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas context"));
          return;
        }

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm;codecs=vp8",
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "merged_clips.webm";
          a.click();
          URL.revokeObjectURL(url);
          setProgress(100);
          resolve();
        };

        recorder.start();

        const totalClipDuration = clips.reduce((s, c) => s + c.duration, 0);
        let elapsed = 0;

        for (let i = 0; i < clips.length; i++) {
          const clip = clips[i];
          await new Promise<void>((res) => {
            const vid = document.createElement("video");
            vid.src = clip.objectUrl;
            vid.muted = true;
            vid.playsInline = true;

            vid.addEventListener("loadedmetadata", () => {
              vid.currentTime = 0;
              vid.play().catch(() => {});

              const drawLoop = () => {
                if (vid.ended || vid.currentTime >= vid.duration - 0.05) {
                  elapsed += clip.duration;
                  setProgress(Math.round((elapsed / totalClipDuration) * 90));
                  res();
                  return;
                }
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(drawLoop);
              };
              drawLoop();
            });

            vid.load();
          });
        }

        recorder.stop();
      });

      tempVideo.load();
    });
  };

  const handleMergeAndDownload = async () => {
    if (clips.length < 2) {
      setError("Please add at least 2 video clips to merge.");
      return;
    }
    setIsMerging(true);
    setProgress(0);
    setError(null);

    try {
      const win = window as unknown as Record<string, unknown>;
      if (win.FFmpeg && win.FFmpegUtil) {
        await mergeWithFFmpeg();
      } else {
        await mergeWithFallback();
      }
    } catch (err) {
      console.error(err);
      try {
        await mergeWithFallback();
      } catch {
        setError(
          "Failed to merge clips. Please try with fewer or smaller clips.",
        );
      }
    } finally {
      setIsMerging(false);
    }
  };

  const handleReset = () => {
    for (const clip of clips) URL.revokeObjectURL(clip.objectUrl);
    setClips([]);
    setProgress(0);
    setError(null);
    ffmpegRef.current = null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Film className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-300">Video Clips</h2>
            <p className="text-sm text-gray-500">
              Add multiple clips, reorder them, merge into one video & download
            </p>
          </div>
          {clips.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              data-ocid="video-clips.reset_button"
              className="text-gray-600 hover:text-gray-300 hover:bg-white/10 rounded-xl flex-shrink-0"
              title="Clear all clips"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Drop Zone / Add Clips */}
      <button
        type="button"
        className={`mm-card p-6 mm-upload-zone cursor-pointer transition-all duration-200 w-full text-left ${
          isDragOver ? "border-teal-400/80 bg-teal-500/10" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        data-ocid="video-clips.dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.webm,.mov,.avi,.mkv,video/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          {loadingClips ? (
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
              {clips.length > 0 ? (
                <Plus className="w-8 h-8 text-teal-400" />
              ) : (
                <Upload className="w-8 h-8 text-teal-400" />
              )}
            </div>
          )}
          <div className="text-center">
            <p className="text-gray-300 font-medium">
              {clips.length > 0
                ? "Add more clips — click or drop here"
                : "Drop video clips here or click to browse"}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Supports MP4, WebM, MOV, AVI, MKV · Multiple files allowed
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-auto border-teal-500/40 text-teal-400 hover:bg-teal-500/10 hover:border-teal-400 rounded-xl mt-1"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            data-ocid="video-clips.upload_button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Clips
          </Button>
        </div>
      </button>

      {/* Error */}
      {error && (
        <Alert
          className="border-red-500/30 bg-red-500/10 text-red-300"
          data-ocid="video-clips.error_state"
        >
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Clips List */}
      {clips.length > 0 && (
        <div className="mm-card p-6 space-y-4 animate-slide-up">
          {/* Stats */}
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm font-medium">
              {clips.length} clip{clips.length !== 1 ? "s" : ""} queued
            </p>
            <span className="text-gray-500 text-xs">
              Total: {formatTime(totalDuration)}
            </span>
          </div>

          {/* Clip Rows */}
          <div className="space-y-2">
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                className="mm-card-inner rounded-xl p-3 flex items-center gap-3"
                data-ocid={`video-clips.item.${index + 1}`}
              >
                {/* Thumbnail */}
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-5 h-5 text-gray-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-gray-300 text-sm font-medium truncate"
                    title={clip.name}
                  >
                    {clip.name}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatTime(clip.duration)}
                  </p>
                </div>

                {/* Order index badge */}
                <span className="text-gray-500 text-xs font-mono font-bold w-6 text-center flex-shrink-0">
                  {index + 1}
                </span>

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveClip(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded text-gray-600 hover:text-gray-400 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                    aria-label="Move clip up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveClip(index, "down")}
                    disabled={index === clips.length - 1}
                    className="p-1 rounded text-gray-600 hover:text-gray-400 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                    aria-label="Move clip down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeClip(clip.id)}
                  data-ocid={`video-clips.delete_button.${index + 1}`}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Remove clip"
                  aria-label={`Remove ${clip.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* FFmpeg Load Button */}
          {!ffmpegLoaded && (
            <Button
              onClick={loadFFmpeg}
              disabled={ffmpegLoading}
              variant="outline"
              className="w-full border-white/20 text-gray-400 hover:bg-white/10 hover:text-gray-200 rounded-xl"
            >
              {ffmpegLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading FFmpeg…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Load FFmpeg for MP4 Output (Better Quality)
                </>
              )}
            </Button>
          )}

          {/* Progress Bar */}
          {isMerging && (
            <div className="space-y-2" data-ocid="video-clips.loading_state">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Merging clips…</span>
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

          {/* Merge & Download Button */}
          <Button
            onClick={handleMergeAndDownload}
            disabled={isMerging || clips.length < 2}
            data-ocid="video-clips.merge_button"
            className="w-full bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-all duration-200 shadow-glow-sm h-12 text-base"
          >
            {isMerging ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Merging… {progress}%
              </>
            ) : (
              <>
                <Merge className="w-5 h-5 mr-2" />
                <Download className="w-4 h-4 mr-1.5" />
                Merge & Download
              </>
            )}
          </Button>

          {clips.length < 2 && (
            <p className="text-center text-gray-600 text-xs">
              Add at least 2 clips to enable merging
            </p>
          )}
        </div>
      )}
    </div>
  );
}
