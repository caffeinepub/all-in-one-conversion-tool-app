import { useState, useRef, useCallback, useEffect } from 'react';
import { Music, Upload, Scissors, Download, Loader2, AlertCircle, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface WaveformData {
  peaks: number[];
  duration: number;
}

export default function MP3Cutter() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCutting, setIsCutting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawWaveform = useCallback((peaks: number[], start: number, end: number, duration: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, W, H);

    const startX = (start / duration) * W;
    const endX = (end / duration) * W;

    // Selected region highlight
    ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
    ctx.fillRect(startX, 0, endX - startX, H);

    // Draw peaks
    const barWidth = W / peaks.length;
    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barH = peak * (H * 0.85);
      const y = (H - barH) / 2;
      const inSelection = x >= startX && x <= endX;
      ctx.fillStyle = inSelection ? 'rgba(20, 184, 166, 0.9)' : 'rgba(20, 184, 166, 0.3)';
      ctx.fillRect(x + 0.5, y, Math.max(barWidth - 1, 1), barH);
    });

    // Start handle
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, H);
    ctx.stroke();
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.arc(startX, H / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // End handle
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, H);
    ctx.stroke();
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(endX, H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  useEffect(() => {
    if (waveform) {
      drawWaveform(waveform.peaks, startTime, endTime, waveform.duration);
    }
  }, [waveform, startTime, endTime, drawWaveform]);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);
    setAudioBuffer(null);
    setWaveform(null);
    setFileName(file.name);

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);

      // Extract waveform peaks
      const channelData = decoded.getChannelData(0);
      const numPeaks = 300;
      const blockSize = Math.floor(channelData.length / numPeaks);
      const peaks: number[] = [];
      for (let i = 0; i < numPeaks; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[i * blockSize + j] || 0);
          if (val > max) max = val;
        }
        peaks.push(max);
      }

      setWaveform({ peaks, duration: decoded.duration });
      setStartTime(0);
      setEndTime(decoded.duration);
    } catch {
      setError('Failed to decode audio file. Please try a different file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const getPositionFromEvent = (e: React.MouseEvent | React.TouchEvent): number => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return 0;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * waveform.duration;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!waveform) return;
    const pos = getPositionFromEvent(e);
    const startDist = Math.abs(pos - startTime);
    const endDist = Math.abs(pos - endTime);
    setDragging(startDist < endDist ? 'start' : 'end');
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !waveform) return;
    const pos = getPositionFromEvent(e);
    if (dragging === 'start') {
      setStartTime(Math.min(pos, endTime - 0.1));
    } else {
      setEndTime(Math.max(pos, startTime + 0.1));
    }
  };

  const handleCanvasMouseUp = () => setDragging(null);

  const handlePlayPreview = () => {
    if (!audioBuffer || !audioContextRef.current) return;
    if (isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
      return;
    }
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start(0, startTime, endTime - startTime);
    source.onended = () => setIsPlaying(false);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const handleCutAndDownload = async () => {
    if (!audioBuffer || !audioContextRef.current) return;
    setIsCutting(true);
    setError(null);

    try {
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const length = endSample - startSample;
      const numChannels = audioBuffer.numberOfChannels;

      // Create offline context for the slice
      const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);
      const slicedBuffer = offlineCtx.createBuffer(numChannels, length, sampleRate);

      for (let ch = 0; ch < numChannels; ch++) {
        const srcData = audioBuffer.getChannelData(ch);
        const dstData = slicedBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dstData[i] = srcData[startSample + i];
        }
      }

      // Encode to WAV (since lamejs CDN loading is unreliable, use WAV which is natively supported)
      const wavBlob = audioBufferToWav(slicedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      const baseName = fileName.replace(/\.[^.]+$/, '') || 'audio';
      a.href = url;
      a.download = `${baseName}_cut.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to cut audio. Please try again.');
    } finally {
      setIsCutting(false);
    }
  };

  const handleReset = () => {
    setAudioBuffer(null);
    setWaveform(null);
    setFileName('');
    setError(null);
    setIsPlaying(false);
    sourceNodeRef.current?.stop();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Music className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">MP3 Cutter</h2>
            <p className="text-sm text-white/50">Import audio, select a range, and download the cut</p>
          </div>
          {waveform && (
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
      {!waveform && (
        <div
          className="mm-card p-8 text-center cursor-pointer mm-upload-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.aac,.wav,.mp4,.m4a"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
              <p className="text-white/60">Decoding audio…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-teal-400" />
              </div>
              <div>
                <p className="text-white font-medium">Drop audio file here or click to browse</p>
                <p className="text-white/40 text-sm mt-1">Supports MP3, AAC, WAV, MP4, M4A</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Waveform Editor */}
      {waveform && (
        <div className="mm-card p-6 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-sm font-medium truncate max-w-xs">{fileName}</p>
            <span className="text-white/40 text-xs">Duration: {formatTime(waveform.duration)}</span>
          </div>

          {/* Canvas */}
          <div
            ref={containerRef}
            className="relative rounded-xl overflow-hidden cursor-crosshair"
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={120}
              className="w-full h-auto rounded-xl"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            <p className="text-white/30 text-xs text-center mt-1">
              Drag the teal/cyan handles to set start and end points
            </p>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="mm-card-inner p-3 rounded-xl">
              <p className="text-white/40 text-xs mb-1">Start Time</p>
              <p className="text-teal-400 font-mono text-lg font-semibold">{formatTime(startTime)}</p>
            </div>
            <div className="mm-card-inner p-3 rounded-xl">
              <p className="text-white/40 text-xs mb-1">End Time</p>
              <p className="text-cyan-400 font-mono text-lg font-semibold">{formatTime(endTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Scissors className="w-4 h-4 text-teal-400" />
            <span>Selected: <span className="text-white/70 font-mono">{formatTime(endTime - startTime)}</span></span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePlayPreview}
              variant="outline"
              className="flex-1 border-white/20 text-white/70 hover:bg-white/10 hover:text-white rounded-xl"
            >
              {isPlaying ? (
                <><Pause className="w-4 h-4 mr-2" /> Stop Preview</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Preview Selection</>
              )}
            </Button>
            <Button
              onClick={handleCutAndDownload}
              disabled={isCutting}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-all duration-200 shadow-glow-sm"
            >
              {isCutting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cutting…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Cut & Download</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// WAV encoder utility
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
