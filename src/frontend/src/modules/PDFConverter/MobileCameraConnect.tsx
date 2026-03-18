import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import {
  Bluetooth,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  QrCode,
  Radio,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MobileCameraConnectProps {
  onCapture?: (dataUrl: string) => void;
}

type ConnectionState = "idle" | "creating" | "waiting" | "connected" | "error";

export default function MobileCameraConnect({
  onCapture,
}: MobileCameraConnectProps) {
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webrtcSupported, setWebrtcSupported] = useState(true);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCandidates = useRef<Set<string>>(new Set());

  // Base URL for building connect links
  const baseUrl = window.location.href.split("?")[0].split("#")[0];

  useEffect(() => {
    // Check WebRTC support
    if (!window.RTCPeerConnection) {
      setWebrtcSupported(false);
    }
  }, []);

  // Attach remote stream to video element when it arrives
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      cleanupPeer();
    };
  }, []);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function cleanupPeer() {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    processedCandidates.current.clear();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: stopPolling and cleanupPeer are stable refs
  const startWebRTC = useCallback(async () => {
    if (!actor || !webrtcSupported) return;

    try {
      setConnectionState("creating");
      setErrorMsg(null);
      cleanupPeer();
      stopPolling();

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      // Collect desktop ICE candidates
      const pendingCandidates: string[] = [];
      let sid: string | null = null;

      pc.onicecandidate = async (e) => {
        if (e.candidate && sid && actor) {
          try {
            await actor.addCamIceCandidate(
              sid,
              JSON.stringify(e.candidate),
              false,
            );
          } catch {
            // Ignore candidate errors
          }
        } else if (e.candidate) {
          pendingCandidates.push(JSON.stringify(e.candidate));
        }
      };

      pc.ontrack = (e) => {
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
          setConnectionState("connected");
        }
      };

      // Add a dummy receive-only transceiver so the offer contains video
      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Store offer in backend and get sessionId
      const newSessionId = await actor.createCamSession(JSON.stringify(offer));
      sid = newSessionId;

      // Send any buffered candidates now that we have the sessionId
      for (const cand of pendingCandidates) {
        actor.addCamIceCandidate(newSessionId, cand, false).catch(() => {});
      }

      const url = `${baseUrl}?camSession=${newSessionId}`;
      setConnectUrl(url);
      setConnectionState("waiting");

      // Poll for answer and mobile ICE candidates
      pollIntervalRef.current = setInterval(async () => {
        if (!actor || !sid) return;
        try {
          const session = await actor.getCamSession(sid);
          if (!session) return;

          // Set answer once it arrives
          if (session.answer && pc.remoteDescription === null) {
            const answerDesc = JSON.parse(session.answer);
            await pc.setRemoteDescription(
              new RTCSessionDescription(answerDesc),
            );
          }

          // Add new mobile ICE candidates
          for (const candStr of session.mobileCandidates) {
            if (!processedCandidates.current.has(candStr)) {
              processedCandidates.current.add(candStr);
              try {
                const cand = JSON.parse(candStr);
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch {
                // Ignore bad candidates
              }
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 1500);
    } catch (err: any) {
      setConnectionState("error");
      setErrorMsg(err?.message || "Failed to start WebRTC session");
    }
  }, [actor, webrtcSupported, baseUrl]);

  const handleDisconnect = () => {
    stopPolling();
    cleanupPeer();
    setConnectUrl("");
    setConnectionState("idle");
    setRemoteStream(null);
    setErrorMsg(null);
  };

  const handleCapture = useCallback(() => {
    const video = remoteVideoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !onCapture) return;

    const w = video.videoWidth || video.clientWidth || 640;
    const h = video.videoHeight || video.clientHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCapture(dataUrl);
  }, [onCapture]);

  function handleCopy(url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }

  // Determine QR URL — use WebRTC session URL if available, else fallback
  const displayUrl = connectUrl || `${baseUrl}?mobileCam=1`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(displayUrl)}`;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        data-ocid="mobile_cam_connect.toggle"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-violet-500/10 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-violet-500/15 shrink-0">
            <Smartphone className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              Connect Mobile Camera
              {connectionState === "connected" && (
                <span className="inline-flex items-center gap-1 text-xs text-green-400 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              )}
              {connectionState === "waiting" && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Waiting for phone...
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Scan QR code, share WiFi link, or use Hotspot to scan from your
              phone
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expandable panel */}
      {open && (
        <div className="px-4 pb-4">
          {/* Live preview panel */}
          {connectionState === "connected" && remoteStream && (
            <div className="mb-4 rounded-xl overflow-hidden border border-green-500/40 bg-black relative">
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-red-600 text-white text-xs gap-1 animate-pulse px-2 py-0.5">
                  <Radio className="w-3 h-3" />
                  LIVE
                </Badge>
              </div>
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <button
                  type="button"
                  data-ocid="mobile_cam_connect.close_button"
                  onClick={handleDisconnect}
                  className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Disconnect"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={remoteVideoRef}
                className="w-full max-h-72 object-contain"
                autoPlay
                playsInline
                muted
              />
              {onCapture && (
                <div className="p-3 bg-black/60 flex items-center justify-between gap-3">
                  <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    Mobile camera streaming — ready to capture
                  </p>
                  <Button
                    size="sm"
                    data-ocid="mobile_cam_connect.capture_button"
                    onClick={handleCapture}
                    className="bg-teal-600 hover:bg-teal-700 text-white border-0 gap-1.5 text-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture Frame
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {connectionState === "error" && errorMsg && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
              {errorMsg}
              <button
                type="button"
                onClick={() => setConnectionState("idle")}
                className="ml-2 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* WebRTC session start button */}
          {webrtcSupported && connectionState === "idle" && actor && (
            <div className="mb-4 rounded-xl bg-violet-500/10 border border-violet-500/30 p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">
                  Live Camera Streaming
                </p>
                <p className="text-xs text-muted-foreground">
                  Stream mobile camera to this device in real time via WebRTC
                </p>
              </div>
              <Button
                size="sm"
                data-ocid="mobile_cam_connect.start_webrtc_button"
                onClick={startWebRTC}
                className="bg-violet-600 hover:bg-violet-700 text-white border-0 shrink-0 gap-1.5 text-xs"
              >
                <Radio className="w-3.5 h-3.5" />
                Start Live
              </Button>
            </div>
          )}

          {connectionState === "creating" && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground p-3">
              <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              Setting up WebRTC session...
            </div>
          )}

          {connectionState === "waiting" && connectUrl && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex flex-col gap-2">
              <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Waiting for mobile to connect...
              </p>
              <p className="text-xs text-muted-foreground">
                Scan the QR code below or open the link on your phone to start
                streaming.
              </p>
              <Button
                size="sm"
                variant="outline"
                data-ocid="mobile_cam_connect.disconnect_button"
                onClick={handleDisconnect}
                className="text-xs gap-1.5 self-start"
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          )}

          <Tabs defaultValue="qr" className="w-full">
            <TabsList
              className="w-full mb-4 bg-background/60"
              data-ocid="mobile_cam_connect.tab"
            >
              <TabsTrigger
                value="qr"
                className="flex-1 gap-1.5 text-xs"
                data-ocid="mobile_cam_connect.qr_tab"
              >
                <QrCode className="w-3.5 h-3.5" />
                QR Code
              </TabsTrigger>
              <TabsTrigger
                value="wifi"
                className="flex-1 gap-1.5 text-xs"
                data-ocid="mobile_cam_connect.wifi_tab"
              >
                <Wifi className="w-3.5 h-3.5" />
                WiFi / Hotspot
              </TabsTrigger>
              <TabsTrigger
                value="bluetooth"
                className="flex-1 gap-1.5 text-xs"
                data-ocid="mobile_cam_connect.bluetooth_tab"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                Bluetooth
              </TabsTrigger>
            </TabsList>

            {/* QR Code tab */}
            <TabsContent value="qr" className="mt-0">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-border bg-white p-3 shadow-md">
                  <img
                    src={qrImageSrc}
                    alt="QR code to open scanner on mobile"
                    width={220}
                    height={220}
                    className="block rounded-lg"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).alt =
                        "QR code unavailable — use the WiFi link instead";
                    }}
                  />
                </div>
                <div className="text-center flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-foreground">
                    Scan with your phone camera
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    {connectUrl
                      ? "This QR code contains a live session link. When your phone scans it, the camera will start streaming to this desktop instantly."
                      : "Point your phone's camera at this QR code. The scanner will open in your mobile browser, ready to capture documents. Make sure your phone and this device are on the same WiFi network or Hotspot."}
                  </p>
                </div>
                <div className="w-full flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    Link opens:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2">
                    <span className="text-xs text-foreground/70 truncate flex-1 font-mono">
                      {displayUrl}
                    </span>
                    <button
                      type="button"
                      data-ocid="mobile_cam_connect.qr_copy_button"
                      onClick={() => handleCopy(displayUrl)}
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                      title="Copy link"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* WiFi / Hotspot tab */}
            <TabsContent value="wifi" className="mt-0">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-xl bg-emerald-500/8 border border-emerald-500/30 p-4">
                  <Wifi className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground">
                      Connect via WiFi or Hotspot
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connect your phone to the <strong>same WiFi</strong> as
                      this device, or turn on <strong>Mobile Hotspot</strong> on
                      this device and connect your phone to it. Then open the
                      link below on your phone.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Open this link on your phone:
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 shadow-sm">
                    <span className="text-sm text-foreground truncate flex-1 font-mono break-all">
                      {displayUrl}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid="mobile_cam_connect.copy_link_button"
                      onClick={() => handleCopy(displayUrl)}
                      className="flex-1 gap-2 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid="mobile_cam_connect.open_link_button"
                      onClick={() => window.open(displayUrl, "_blank")}
                      className="flex-1 gap-2 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">How it works:</strong>{" "}
                    {connectUrl
                      ? "Open the link on your phone → the phone camera streams live to this desktop via WebRTC → capture frames directly."
                      : "Open the link on your phone → the scanner activates your phone camera automatically → scan and capture documents directly on your phone."}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Bluetooth tab */}
            <TabsContent value="bluetooth" className="mt-0">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-xl bg-blue-500/8 border border-blue-500/30 p-4">
                  <Bluetooth className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground">
                      Bluetooth Not Supported
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Web browsers do not support live video streaming over
                      Bluetooth. This is a platform limitation — not something
                      we can work around in a web app.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-foreground">
                    Better alternatives:
                  </p>
                  <ul className="flex flex-col gap-2">
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <QrCode className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">QR Code</strong> —
                        fastest option. Scan the QR code in the QR tab with your
                        phone camera to instantly open the scanner.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">
                          WiFi / Hotspot
                        </strong>{" "}
                        — copy the link from the WiFi tab and open it on your
                        phone while both devices are on the same network.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Hidden canvas for frame capture */}
          <canvas ref={captureCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
