import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCheck,
  Copy,
  Loader2,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCamera } from "../camera/useCamera";

async function detectLocalIP(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pc.createDataChannel("");
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));

      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 5000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (ipMatch) {
          const ip = ipMatch[1];
          // Filter out loopback and link-local
          if (!ip.startsWith("127.") && !ip.startsWith("169.254.")) {
            clearTimeout(timeout);
            pc.close();
            resolve(ip);
          }
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export default function IPCamera() {
  const [localIP, setLocalIP] = useState<string | null>(null);
  const [ipDetecting, setIpDetecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "environment" });

  useEffect(() => {
    if (isActive && !localIP) {
      setIpDetecting(true);
      detectLocalIP().then((ip) => {
        setLocalIP(ip);
        setIpDetecting(false);
      });
    }
    if (!isActive) {
      setLocalIP(null);
    }
  }, [isActive, localIP]);

  const handleCopy = () => {
    if (!localIP) return;
    navigator.clipboard.writeText(`http://${localIP}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isSupported === false) {
    return (
      <div className="mm-card p-8 text-center">
        <CameraOff className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500">
          Camera is not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="mm-card p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Camera className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-300">IP Camera</h2>
            <p className="text-sm text-gray-500">
              Start camera and share your local IP address
            </p>
          </div>
          {isActive && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Camera Error */}
      {error && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300 animate-slide-up">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription>
            {error.type === "permission"
              ? "Camera permission denied. Please allow camera access in your browser settings."
              : error.type === "not-found"
                ? "No camera found on this device."
                : error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Permission info card — shown before camera is started */}
      {!isActive && !isLoading && (
        <div className="mm-card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-500/15 shrink-0">
              <Camera className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-gray-300">
                Camera Access Required
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                IP Camera uses your device camera to stream a live feed. When
                you tap <strong className="text-gray-400">Start IP Cam</strong>,
                your browser will ask for camera permission. Tap{" "}
                <strong className="text-gray-400">Allow</strong> to grant
                access.
              </p>
              {error?.type === "permission" && (
                <p className="text-xs text-red-400 mt-1 leading-relaxed">
                  Access was denied. Go to your browser or system settings →
                  Camera and allow this site, then refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Preview */}
      <div className="mm-card p-6 space-y-4">
        <div
          className="relative rounded-xl overflow-hidden bg-black"
          style={{ minHeight: "300px", aspectRatio: "16/9" }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: isActive ? "block" : "none" }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                <Camera className="w-8 h-8 text-teal-400" />
              </div>
              <p className="text-gray-500 text-sm">
                Camera preview will appear here
              </p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!isActive ? (
            <Button
              onClick={startCamera}
              disabled={isLoading}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium h-12 transition-all duration-200 shadow-glow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" /> Start IP Cam
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl font-medium h-12 transition-all duration-200"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>
      </div>

      {/* IP Address Display */}
      {isActive && (
        <div className="mm-card p-6 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-teal-400" />
            <h3 className="text-gray-300 font-medium">Network Access</h3>
          </div>

          {ipDetecting ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span className="text-sm">Detecting local IP address…</span>
            </div>
          ) : localIP ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl mm-card-inner">
                <code className="flex-1 text-gray-300 font-mono text-sm">
                  http://{localIP}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg w-8 h-8"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Wifi className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500">
                  Devices on the same WiFi network can use this address to view
                  the stream. Note: Browser-based streaming requires a signaling
                  server for full remote access.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-500">
                Could not detect local IP address. Make sure you're connected to
                a WiFi network.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
