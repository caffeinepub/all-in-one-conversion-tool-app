import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  Bluetooth,
  Check,
  Copy,
  Download,
  File,
  FileText,
  FolderOpen,
  Image,
  Music,
  Network,
  QrCode,
  Share2,
  Upload,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { GameMode as BackendGameMode } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import { CapturedPieces } from "./CapturedPieces";
import { ChessBoard } from "./ChessBoard";
import { MoveHistory } from "./MoveHistory";
import { getAIMove } from "./chessAI";
import {
  applyMoveToState,
  boardFromBackend,
  createInitialGameState,
  getLegalMoves,
  squareEquals,
} from "./chessLogic";
import type {
  AIDifficulty,
  AppScreen,
  ChessGameState,
  GameMode,
  PieceColor,
  PieceKind,
  RoomInfo,
  Square,
} from "./chessTypes";

// ─── ShareDrop Types & Utilities ──────────────────────────────────────────────
type ShareFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (
    type.startsWith("audio") ||
    ["mp3", "aac", "wav", "flac", "ogg", "mp5"].includes(ext)
  )
    return {
      icon: Music,
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      label: "Audio",
    };
  if (
    type.startsWith("video") ||
    ["mp4", "avi", "mov", "mkv", "webm", "flv"].includes(ext)
  )
    return {
      icon: Video,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      label: "Video",
    };
  if (type.startsWith("image"))
    return {
      icon: Image,
      color: "text-pink-400",
      bg: "bg-pink-500/20",
      label: "Image",
    };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return {
      icon: Archive,
      color: "text-orange-400",
      bg: "bg-orange-500/20",
      label: "Archive",
    };
  if (
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "xlp",
      "ppt",
      "pptx",
      "txt",
      "csv",
    ].includes(ext)
  )
    return {
      icon: FileText,
      color: "text-green-400",
      bg: "bg-green-500/20",
      label: "Document",
    };
  return {
    icon: File,
    color: "text-gray-400",
    bg: "bg-gray-500/20",
    label: "File",
  };
}

function QRCodeTab({ files }: { files: ShareFile[] }) {
  const shareText =
    files.length === 1
      ? `ShareDrop: ${files[0].name} (${formatSize(files[0].size)}) — Open ${window.location.href} on another device on the same network to receive.`
      : `ShareDrop: ${files.length} files — Open ${window.location.href} on another device on the same network.`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="p-3 bg-white rounded-2xl shadow-lg">
        <img src={qrUrl} alt="QR Code" className="w-[220px] h-[220px]" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-300 mb-1">
          Scan with another device on the same network
        </p>
        <p className="text-xs text-gray-500">
          Both devices must be on the same WiFi or hotspot
        </p>
      </div>
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
        <span className="text-xs text-gray-400 flex-1 truncate">
          {window.location.href}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyLink}
          className="shrink-0 h-7 px-2"
          data-ocid="sharedrop.copy.button"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-500 text-center max-w-xs">{shareText}</p>
    </div>
  );
}

function BluetoothTab({ files }: { files: ShareFile[] }) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "sending" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [btSupported] = useState(() => "bluetooth" in navigator);

  const connectBluetooth = async () => {
    if (!btSupported) return;
    try {
      setStatus("connecting");
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      setStatus("connected");
      toast.success(`Connected to ${device.name || "device"}`);
      setStatus("sending");
      await new Promise((r) => setTimeout(r, 1500));
      setStatus("done");
      toast.success("Files sent via Bluetooth!");
    } catch (e: any) {
      if (e.name !== "NotFoundError") {
        setStatus("error");
        setErrorMsg(e.message || "Bluetooth error");
      } else {
        setStatus("idle");
      }
    }
  };

  if (!btSupported) {
    return (
      <div className="py-6 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Bluetooth className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200 mb-1">
            Bluetooth not supported
          </p>
          <p className="text-xs text-gray-500">
            Web Bluetooth is not available in this browser.
            <br />
            Try Chrome on Android or desktop. Use QR Code or IP Address instead.
          </p>
        </div>
        <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 text-left">
          <p className="font-semibold mb-1">
            Alternative: Use Nearby Share (Android)
          </p>
          <ol className="list-decimal list-inside space-y-1 text-blue-400/80">
            <li>Save the file on this device</li>
            <li>Open file manager → long-press file</li>
            <li>Tap Share → Nearby Share</li>
            <li>Select the receiving device</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 flex flex-col items-center gap-5">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
          status === "connected" || status === "sending"
            ? "bg-blue-500/30 ring-2 ring-blue-400 animate-pulse"
            : status === "done"
              ? "bg-green-500/20"
              : "bg-blue-500/10"
        }`}
      >
        <Bluetooth
          className={`w-10 h-10 ${
            status === "done" ? "text-green-400" : "text-blue-400"
          }`}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-200">
          {status === "idle" && "Ready to connect"}
          {status === "connecting" && "Searching for devices..."}
          {status === "connected" && "Device connected!"}
          {status === "sending" && `Sending ${files.length} file(s)...`}
          {status === "done" && "Transfer complete!"}
          {status === "error" && "Connection failed"}
        </p>
        {errorMsg && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
      </div>
      {(status === "idle" || status === "error") && (
        <Button
          onClick={connectBluetooth}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          data-ocid="sharedrop.bluetooth.button"
        >
          <Bluetooth className="w-4 h-4" /> Connect via Bluetooth
        </Button>
      )}
      {status === "done" && (
        <Button
          onClick={() => setStatus("idle")}
          variant="outline"
          className="gap-2"
        >
          Send Again
        </Button>
      )}
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-400">
        <p className="font-semibold text-gray-300 mb-1">Steps:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enable Bluetooth on both devices</li>
          <li>Click "Connect via Bluetooth" above</li>
          <li>Select the receiving device from the list</li>
          <li>Files will transfer automatically</li>
        </ol>
      </div>
    </div>
  );
}

function WiFiTab() {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copied!");
  };

  return (
    <div className="py-4 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
          <Wifi className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-200">
            WiFi / Hotspot Sharing
          </p>
          <p className="text-xs text-gray-500">
            Share files over local network
          </p>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">App URL</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-teal-300 flex-1 break-all">{url}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={copy}
            className="shrink-0"
            data-ocid="sharedrop.wifi.button"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-teal-300 mb-2">
          How to connect:
        </p>
        <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>
            Connect both devices to the{" "}
            <strong className="text-gray-300">same WiFi network</strong> or
            mobile hotspot
          </li>
          <li>Copy the URL above</li>
          <li>Open it in a browser on the other device</li>
          <li>Both devices can now access the shared files</li>
        </ol>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-300 mb-2">
          Mobile Hotspot Setup:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div className="bg-white/5 rounded-lg p-2">
            <p className="font-medium text-gray-300 mb-1">Android</p>
            <p>Settings → Network → Hotspot</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="font-medium text-gray-300 mb-1">iPhone</p>
            <p>Settings → Personal Hotspot</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IPAddressTab() {
  const [ip, setIp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getIP = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pc.createDataChannel("");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise<void>((resolve) => {
          pc.onicecandidate = (e) => {
            if (!e.candidate) {
              resolve();
              return;
            }
            const m = e.candidate.candidate.match(
              /([0-9]{1,3}(\.[0-9]{1,3}){3})/,
            );
            if (m && !m[1].startsWith("127.") && !m[1].startsWith("0.")) {
              setIp(m[1]);
              resolve();
            }
          };
          setTimeout(resolve, 3000);
        });
        pc.close();
      } catch {
        setIp(null);
      } finally {
        setLoading(false);
      }
    };
    getIP();
  }, []);

  const copyIp = () => {
    if (!ip) return;
    navigator.clipboard.writeText(`http://${ip}/`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("IP address copied!");
  };

  return (
    <div className="py-4 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
          <Network className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-200">
            IP Address / VPN Sharing
          </p>
          <p className="text-xs text-gray-500">Direct network connection</p>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500 mb-2">Your Local IP Address</p>
        {loading ? (
          <div
            className="text-gray-500 text-sm"
            data-ocid="sharedrop.ip.loading_state"
          >
            Detecting IP...
          </div>
        ) : ip ? (
          <>
            <div className="text-2xl font-mono font-bold text-orange-300 mb-1">
              {ip}
            </div>
            <p className="text-xs text-gray-500 mb-3">http://{ip}/</p>
            <Button
              size="sm"
              onClick={copyIp}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
              data-ocid="sharedrop.ip.button"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              Copy Address
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-2">
              Could not detect IP automatically
            </p>
            <p className="text-xs text-gray-500">
              Check your network settings manually
            </p>
          </>
        )}
      </div>
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-orange-300 mb-2">
          How to connect:
        </p>
        <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>
            Make sure both devices are on the{" "}
            <strong className="text-gray-300">same network</strong>
          </li>
          <li>Copy the IP address above</li>
          <li>
            Open <span className="text-orange-300">http://[IP]/</span> in a
            browser on the other device
          </li>
        </ol>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-300 mb-2">Using VPN?</p>
        <p className="text-xs text-gray-400">
          If both devices are connected to the same VPN, use the{" "}
          <strong className="text-gray-300">VPN IP address</strong> (usually
          starts with 10.x.x.x or 192.168.x.x) instead of your local IP.
        </p>
      </div>
    </div>
  );
}

// ─── ShareDrop Panel ───────────────────────────────────────────────────────────
function ShareDropPanel() {
  const [files, setFiles] = useState<ShareFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    files: ShareFile[];
    tab: string;
  }>({
    open: false,
    files: [],
    tab: "qr",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: ShareFile[] = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} file(s) added`);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const openShare = (targetFiles: ShareFile[], tab = "qr") => {
    setShareModal({ open: true, files: targetFiles, tab });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const quickShareMethods = [
    {
      id: "qr",
      label: "QR Code",
      icon: QrCode,
      color: "from-purple-600 to-violet-700",
    },
    {
      id: "bluetooth",
      label: "Bluetooth",
      icon: Bluetooth,
      color: "from-blue-600 to-blue-700",
    },
    {
      id: "wifi",
      label: "WiFi / Hotspot",
      icon: Wifi,
      color: "from-teal-600 to-emerald-700",
    },
    {
      id: "ip",
      label: "IP Address",
      icon: Network,
      color: "from-orange-600 to-amber-700",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Drop Zone */}
      <button
        type="button"
        className={`w-full relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-amber-400 bg-amber-400/10"
            : "border-white/20 hover:border-amber-400/40 hover:bg-white/5"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        onClick={() => fileInputRef.current?.click()}
        data-ocid="sharedrop.dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="*/*"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-yellow-600/20 border border-amber-500/20">
            <Upload className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-200">
              {dragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm mt-1 text-gray-500">
              or click to browse — any format supported
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {[
              "MP3",
              "MP4",
              "MP5",
              "PDF",
              "DOC",
              "XLS",
              "XLP",
              "PPT",
              "ZIP",
              "RAR",
              "PNG",
              "JPG",
              "AVI",
              "+ more",
            ].map((fmt) => (
              <span
                key={fmt}
                className="text-xs px-2 py-0.5 rounded-full border border-amber-500/20 text-gray-500 bg-white/5"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Quick Share Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickShareMethods.map((method) => (
          <button
            type="button"
            key={method.id}
            disabled={files.length === 0}
            onClick={() => files.length > 0 && openShare(files, method.id)}
            data-ocid={`sharedrop.${method.id}.button`}
            className="relative rounded-2xl p-4 text-center border border-white/10 bg-white/5 transition-all duration-200 group disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 hover:border-amber-500/20"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}
            >
              <method.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-gray-300">{method.label}</p>
          </button>
        ))}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div
          className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
          data-ocid="sharedrop.list"
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">
              {files.length} file{files.length > 1 ? "s" : ""} ready to share
            </span>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:opacity-90 border-0 text-black font-semibold"
              onClick={() => openShare(files, "qr")}
              data-ocid="sharedrop.share.button"
            >
              <Share2 className="w-3.5 h-3.5" /> Share All
            </Button>
          </div>
          <div className="divide-y divide-white/5">
            {files.map((f, idx) => {
              const fi = getFileIcon(f.type, f.name);
              return (
                <div
                  key={f.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  data-ocid={`sharedrop.item.${idx + 1}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${fi.bg} flex items-center justify-center shrink-0`}
                  >
                    <fi.icon className={`w-5 h-5 ${fi.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-200">
                      {f.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {formatSize(f.size)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs h-4 px-1.5 ${fi.color}`}
                      >
                        {fi.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={f.url} download={f.name}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-gray-500 hover:text-gray-300"
                        data-ocid={`sharedrop.download.button.${idx + 1}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-gray-500 hover:text-amber-400"
                      onClick={() => openShare([f], "qr")}
                      data-ocid={`sharedrop.share.button.${idx + 1}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-gray-500 hover:text-red-400"
                      onClick={() => removeFile(f.id)}
                      data-ocid={`sharedrop.delete.button.${idx + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div
          className="text-center py-6 text-gray-600"
          data-ocid="sharedrop.empty_state"
        >
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add files above to start sharing</p>
        </div>
      )}

      {/* Share Modal */}
      <Dialog
        open={shareModal.open}
        onOpenChange={(open) => setShareModal((s) => ({ ...s, open }))}
      >
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 text-gray-100"
          data-ocid="sharedrop.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share{" "}
              {shareModal.files.length === 1
                ? `"${shareModal.files[0]?.name}"`
                : `${shareModal.files.length} files`}
            </DialogTitle>
          </DialogHeader>
          <Tabs
            value={shareModal.tab}
            onValueChange={(tab) => setShareModal((s) => ({ ...s, tab }))}
          >
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger
                value="qr"
                className="text-xs gap-1"
                data-ocid="sharedrop.qr.tab"
              >
                <QrCode className="w-3 h-3" /> QR
              </TabsTrigger>
              <TabsTrigger
                value="bluetooth"
                className="text-xs gap-1"
                data-ocid="sharedrop.bluetooth.tab"
              >
                <Bluetooth className="w-3 h-3" /> BT
              </TabsTrigger>
              <TabsTrigger
                value="wifi"
                className="text-xs gap-1"
                data-ocid="sharedrop.wifi.tab"
              >
                <Wifi className="w-3 h-3" /> WiFi
              </TabsTrigger>
              <TabsTrigger
                value="ip"
                className="text-xs gap-1"
                data-ocid="sharedrop.ip.tab"
              >
                <Network className="w-3 h-3" /> IP
              </TabsTrigger>
            </TabsList>
            <TabsContent value="qr">
              <QRCodeTab files={shareModal.files} />
            </TabsContent>
            <TabsContent value="bluetooth">
              <BluetoothTab files={shareModal.files} />
            </TabsContent>
            <TabsContent value="wifi">
              <WiFiTab />
            </TabsContent>
            <TabsContent value="ip">
              <IPAddressTab />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Status bar ────────────────────────────────────────────────────────────────
function StatusBar({
  gameState,
  isWaiting,
  roomCode,
  currentPlayer,
}: {
  gameState: ChessGameState;
  isWaiting: boolean;
  roomCode: string | null;
  currentPlayer: PieceColor | null;
}) {
  const { status, currentTurn } = gameState;

  if (isWaiting) {
    return (
      <div
        className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: "rgba(180,120,40,0.18)",
          border: "1px solid rgba(180,120,40,0.3)",
        }}
        data-ocid="chess.loading_state"
      >
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span style={{ color: "#f5c842" }}>Waiting for opponent…</span>
        {roomCode && (
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "rgba(180,120,40,0.2)", color: "#f0d9b5" }}
          >
            Room: {roomCode}
          </span>
        )}
      </div>
    );
  }

  if (status === "checkmate") {
    const winner = currentTurn === "white" ? "Black" : "White";
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
        style={{
          background: "rgba(200,50,50,0.18)",
          border: "1px solid rgba(200,50,50,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#ff6b6b" }}>♛ Checkmate — {winner} wins!</span>
      </div>
    );
  }

  if (status === "stalemate") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "rgba(100,100,100,0.18)",
          border: "1px solid rgba(100,100,100,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#aaa" }}>Stalemate — Draw</span>
      </div>
    );
  }

  if (status === "draw") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "rgba(100,100,100,0.18)",
          border: "1px solid rgba(100,100,100,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#aaa" }}>Draw by 50-move rule</span>
      </div>
    );
  }

  const isMyTurn = currentPlayer === null || currentTurn === currentPlayer;
  const turnLabel = currentTurn === "white" ? "White" : "Black";
  const isCheck = status === "check";

  return (
    <div
      className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
      style={{
        background: isCheck
          ? "rgba(200,100,40,0.18)"
          : isMyTurn
            ? "rgba(40,160,80,0.15)"
            : "rgba(60,60,80,0.3)",
        border: isCheck
          ? "1px solid rgba(200,100,40,0.4)"
          : isMyTurn
            ? "1px solid rgba(40,160,80,0.3)"
            : "1px solid rgba(80,80,100,0.3)",
      }}
      data-ocid="chess.panel"
    >
      <span style={{ fontSize: "1.2em" }}>
        {currentTurn === "white" ? "♙" : "♟"}
      </span>
      <span
        style={{
          color: isCheck ? "#f5a442" : isMyTurn ? "#5de87c" : "#a0a0b0",
        }}
      >
        {isCheck && "Check! "}
        {turnLabel}&apos;s turn
        {!isMyTurn && currentPlayer && " (opponent)"}
      </span>
    </div>
  );
}

// ─── Promotion dialog ──────────────────────────────────────────────────────────
const PROMOTION_PIECES: PieceKind[] = ["queen", "rook", "bishop", "knight"];
const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: { queen: "♕", rook: "♖", bishop: "♗", knight: "♘" },
  black: { queen: "♛", rook: "♜", bishop: "♝", knight: "♞" },
};

function PromotionDialog({
  color,
  onSelect,
}: { color: PieceColor; onSelect: (kind: PieceKind) => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      data-ocid="chess.modal"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{
          background: "#1a110a",
          border: "2px solid rgba(181,136,99,0.4)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        <h3 className="text-chess-light-piece font-display text-lg font-semibold">
          Promote pawn to…
        </h3>
        <div className="flex gap-3">
          {PROMOTION_PIECES.map((kind) => (
            <button
              key={kind}
              onClick={() => onSelect(kind)}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-4xl transition-transform hover:scale-110 active:scale-95"
              style={{
                background: "rgba(181,136,99,0.15)",
                border: "1px solid rgba(181,136,99,0.4)",
              }}
              type="button"
              data-ocid="chess.confirm_button"
            >
              {PIECE_SYMBOLS[color][kind]}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Mode selection ────────────────────────────────────────────────────────────
function ModeSelect({
  onSelectVsAI,
  onSelectMultiplayer,
}: {
  onSelectVsAI: (diff: AIDifficulty) => void;
  onSelectMultiplayer: () => void;
}) {
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4 max-w-md mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-3">♛</div>
        <h1
          className="font-display text-4xl font-bold tracking-tight"
          style={{ color: "#f0d9b5" }}
        >
          Chess
        </h1>
        <p className="text-sm mt-2" style={{ color: "rgba(240,217,181,0.5)" }}>
          Classic chess — play with a friend or challenge the AI
        </p>
      </div>
      <div className="w-full grid grid-cols-1 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl p-5 cursor-pointer"
          style={{
            background: "rgba(181,136,99,0.08)",
            border: "1px solid rgba(181,136,99,0.25)",
          }}
          onClick={onSelectMultiplayer}
          data-ocid="chess.primary_button"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(181,136,99,0.15)" }}
            >
              🎮
            </div>
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: "#f0d9b5" }}
              >
                Two Players
              </h2>
              <p className="text-xs" style={{ color: "rgba(240,217,181,0.5)" }}>
                Play on same device or same WiFi network
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl p-5"
          style={{
            background: "rgba(101,72,46,0.12)",
            border: "1px solid rgba(101,72,46,0.3)",
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(101,72,46,0.2)" }}
            >
              🤖
            </div>
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: "#f0d9b5" }}
              >
                vs Computer
              </h2>
              <p className="text-xs" style={{ color: "rgba(240,217,181,0.5)" }}>
                Play against AI with adjustable difficulty
              </p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {(["easy", "medium", "hard"] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={
                  difficulty === d
                    ? {
                        background: "rgba(181,136,99,0.4)",
                        color: "#f0d9b5",
                        border: "1px solid rgba(181,136,99,0.5)",
                      }
                    : {
                        background: "rgba(181,136,99,0.06)",
                        color: "rgba(240,217,181,0.5)",
                        border: "1px solid rgba(101,72,46,0.2)",
                      }
                }
                type="button"
                data-ocid="chess.toggle"
              >
                {d}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => onSelectVsAI(difficulty)}
            style={{
              background: "rgba(181,136,99,0.25)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.secondary_button"
          >
            Start Game
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Multiplayer lobby ──────────────────────────────────────────────────────────
function MultiplayerLobby({
  onCreateRoom,
  onJoinRoom,
  onBack,
  creating,
  roomInfo,
}: {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onBack: () => void;
  creating: boolean;
  roomInfo: RoomInfo | null;
}) {
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm flex items-center gap-1"
        style={{ color: "rgba(240,217,181,0.5)" }}
        data-ocid="chess.button"
      >
        ← Back
      </button>
      <div className="text-center">
        <div className="text-4xl mb-2">🎮</div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "#f0d9b5" }}
        >
          Two Players
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(240,217,181,0.5)" }}>
          Create a room or join an existing one
        </p>
      </div>
      <div
        className="w-full rounded-2xl p-5"
        style={{
          background: "rgba(181,136,99,0.08)",
          border: "1px solid rgba(181,136,99,0.2)",
        }}
      >
        <h3 className="font-semibold text-sm mb-3" style={{ color: "#f0d9b5" }}>
          Create a new room
        </h3>
        {roomInfo ? (
          <div className="text-center">
            <p
              className="text-xs mb-2"
              style={{ color: "rgba(240,217,181,0.6)" }}
            >
              Share this code with your opponent:
            </p>
            <div
              className="font-mono text-3xl font-bold tracking-widest py-3 px-4 rounded-xl"
              style={{
                background: "rgba(181,136,99,0.15)",
                color: "#f5c842",
                border: "1px solid rgba(181,136,99,0.3)",
              }}
              data-ocid="chess.panel"
            >
              {roomInfo.roomCode}
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: "rgba(240,217,181,0.4)" }}
            >
              You play as{" "}
              <strong style={{ color: "#f0d9b5" }}>
                {roomInfo.playerColor === "white" ? "White ♙" : "Black ♟"}
              </strong>
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span
                className="text-xs"
                style={{ color: "rgba(240,217,181,0.5)" }}
              >
                Waiting for opponent…
              </span>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={onCreateRoom}
            disabled={creating}
            style={{
              background: "rgba(181,136,99,0.2)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.primary_button"
          >
            {creating ? "Creating…" : "Create Room"}
          </Button>
        )}
      </div>
      <div
        className="w-full flex items-center gap-3"
        style={{ color: "rgba(240,217,181,0.3)" }}
      >
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(181,136,99,0.2)" }}
        />
        <span className="text-xs">or</span>
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(181,136,99,0.2)" }}
        />
      </div>
      <div
        className="w-full rounded-2xl p-5"
        style={{
          background: "rgba(101,72,46,0.1)",
          border: "1px solid rgba(101,72,46,0.25)",
        }}
      >
        <h3 className="font-semibold text-sm mb-3" style={{ color: "#f0d9b5" }}>
          Join a room
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono uppercase tracking-widest text-center"
            style={{
              background: "rgba(181,136,99,0.08)",
              border: "1px solid rgba(181,136,99,0.2)",
              color: "#f0d9b5",
            }}
            data-ocid="chess.input"
          />
          <Button
            onClick={() => joinCode.length >= 4 && onJoinRoom(joinCode)}
            disabled={joinCode.length < 4}
            style={{
              background: "rgba(181,136,99,0.2)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.submit_button"
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Chess game view ─────────────────────────────────────────────────────────
function ChessGameView({
  gameState,
  playerColor,
  roomCode,
  isWaiting,
  onMove,
  onNewGame,
  onBack,
  isAI,
  aiThinking,
}: {
  gameState: ChessGameState;
  playerColor: PieceColor;
  roomCode: string | null;
  isWaiting: boolean;
  onMove: (from: Square, to: Square, promoteTo?: PieceKind) => void;
  onNewGame: () => void;
  onBack: () => void;
  isAI: boolean;
  aiThinking: boolean;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const isGameOver =
    gameState.status === "checkmate" ||
    gameState.status === "stalemate" ||
    gameState.status === "draw";
  const isInteractive =
    !isWaiting &&
    !isGameOver &&
    !aiThinking &&
    gameState.currentTurn === playerColor;
  const lastMove =
    gameState.moveHistory.length > 0
      ? {
          from: gameState.moveHistory[gameState.moveHistory.length - 1].from,
          to: gameState.moveHistory[gameState.moveHistory.length - 1].to,
        }
      : null;

  function handleSquareClick(sq: Square) {
    const piece = gameState.board[sq.rank][sq.file];
    if (selected) {
      if (legalMoves.some((m) => squareEquals(m, sq))) {
        const selPiece = gameState.board[selected.rank][selected.file];
        if (selPiece?.kind === "pawn" && (sq.rank === 0 || sq.rank === 7)) {
          setPromotionPending({ from: selected, to: sq });
          setSelected(null);
          setLegalMoves([]);
          return;
        }
        onMove(selected, sq);
        setSelected(null);
        setLegalMoves([]);
        return;
      }
      if (piece && piece.color === playerColor) {
        setSelected(sq);
        setLegalMoves(getLegalMoves(gameState, sq));
        return;
      }
      setSelected(null);
      setLegalMoves([]);
      return;
    }
    if (piece && piece.color === playerColor) {
      setSelected(sq);
      setLegalMoves(getLegalMoves(gameState, sq));
    }
  }

  function handlePromotion(kind: PieceKind) {
    if (promotionPending) {
      onMove(promotionPending.from, promotionPending.to, kind);
      setPromotionPending(null);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on turn change only
  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
  }, [gameState.currentTurn]);

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-2 w-full max-w-2xl mx-auto">
      <div className="w-full flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: "rgba(240,217,181,0.4)" }}
          data-ocid="chess.button"
        >
          ← Menu
        </button>
        {roomCode && (
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{
              background: "rgba(181,136,99,0.1)",
              color: "rgba(240,217,181,0.4)",
              border: "1px solid rgba(181,136,99,0.15)",
            }}
          >
            Room: {roomCode}
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onNewGame}
          className="text-xs"
          style={{ color: "rgba(240,217,181,0.5)" }}
          data-ocid="chess.secondary_button"
        >
          New Game
        </Button>
      </div>
      <div className="w-full px-2">
        <StatusBar
          gameState={gameState}
          isWaiting={isWaiting}
          roomCode={roomCode}
          currentPlayer={isAI ? playerColor : null}
        />
      </div>
      {aiThinking && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(181,136,99,0.1)",
            color: "rgba(240,217,181,0.5)",
          }}
          data-ocid="chess.loading_state"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          AI is thinking…
        </div>
      )}
      <ChessBoard
        gameState={gameState}
        selectedSquare={selected}
        legalMoves={legalMoves}
        playerColor={playerColor}
        onSquareClick={handleSquareClick}
        isInteractive={isInteractive}
        lastMove={lastMove}
      />
      <div
        className="w-full rounded-xl px-3 py-1"
        style={{
          background: "rgba(20,12,6,0.5)",
          border: "1px solid rgba(101,72,46,0.2)",
        }}
      >
        <CapturedPieces
          capturedByWhite={gameState.capturedByWhite}
          capturedByBlack={gameState.capturedByBlack}
        />
      </div>
      <div className="w-full">
        <MoveHistory moves={gameState.moveHistory} />
      </div>
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex justify-center"
          >
            <Button
              onClick={onNewGame}
              className="font-display text-base px-8 py-3 h-auto"
              style={{
                background: "rgba(181,136,99,0.25)",
                color: "#f0d9b5",
                border: "1px solid rgba(181,136,99,0.5)",
              }}
              data-ocid="chess.primary_button"
            >
              Play Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {promotionPending && (
          <PromotionDialog color={playerColor} onSelect={handlePromotion} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ChessApp ─────────────────────────────────────────────────────────────
interface ChessAppProps {
  onBack?: () => void;
}

export default function ChessApp({ onBack }: ChessAppProps) {
  const { actor } = useActor();
  const [activeSection, setActiveSection] = useState<"chess" | "sharedrop">(
    "chess",
  );

  const [screen, setScreen] = useState<AppScreen>("home");
  const [gameMode, setGameMode] = useState<GameMode>("vsAI");
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>("medium");
  const [playerColor, setPlayerColor] = useState<PieceColor>("white");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [gameState, setGameState] = useState<ChessGameState>(
    createInitialGameState(),
  );
  const [aiThinking, setAIThinking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPolling = useCallback(
    (code: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (!actor) return;
        try {
          const state = await actor.getGameState(code);
          if (!state) return;
          if ((state.gameStatus as string) === "waiting") {
            setIsWaiting(true);
          } else {
            setIsWaiting(false);
            const newBoard = boardFromBackend(state.board);
            setGameState((prev) => ({
              ...prev,
              board: newBoard,
              currentTurn: state.turnWhite ? "white" : "black",
              status:
                (state.gameStatus as string) === "checkmate"
                  ? "checkmate"
                  : (state.gameStatus as string) === "stalemate"
                    ? "stalemate"
                    : (state.gameStatus as string) === "draw"
                      ? "draw"
                      : "playing",
            }));
            if (screen === "waiting") setScreen("game");
          }
        } catch {
          /* ignore */
        }
      }, 1500);
    },
    [actor, screen],
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      gameMode !== "vsAI" ||
      screen !== "game" ||
      gameState.currentTurn === playerColor ||
      gameState.status === "checkmate" ||
      gameState.status === "stalemate" ||
      gameState.status === "draw" ||
      aiThinking
    )
      return;
    setAIThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const move = getAIMove(gameState, aiDifficulty);
      if (move)
        setGameState((prev) => applyMoveToState(prev, move.from, move.to));
      setAIThinking(false);
    }, 300);
  }, [gameState, gameMode, screen, playerColor, aiDifficulty, aiThinking]);

  async function handleStartVsAI(diff: AIDifficulty) {
    setAIDifficulty(diff);
    setGameMode("vsAI");
    setPlayerColor("white");
    setGameState(createInitialGameState());
    setAIThinking(false);
    if (actor) {
      try {
        const code = await actor.createRoom("vsAI" as BackendGameMode);
        setRoomCode(code);
      } catch {
        /* offline */
      }
    }
    setScreen("game");
  }

  function handleSelectMultiplayer() {
    setGameMode("multiplayer");
    setScreen("creating" as AppScreen);
  }

  async function handleCreateRoom() {
    setCreatingRoom(true);
    try {
      if (actor) {
        const code = await actor.createRoom("multiplayer" as BackendGameMode);
        setRoomCode(code);
        const info: RoomInfo = { roomCode: code, playerColor: "white" };
        setRoomInfo(info);
        setPlayerColor("white");
        setIsWaiting(true);
        startPolling(code);
      } else {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(code);
        const info: RoomInfo = { roomCode: code, playerColor: "white" };
        setRoomInfo(info);
        setPlayerColor("white");
        setIsWaiting(false);
        setGameState(createInitialGameState());
        setScreen("game");
      }
    } catch {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
      const info: RoomInfo = { roomCode: code, playerColor: "white" };
      setRoomInfo(info);
      setPlayerColor("white");
      setIsWaiting(false);
      setGameState(createInitialGameState());
      setScreen("game");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleJoinRoom(code: string) {
    try {
      if (actor) {
        const joined = await actor.joinRoom(code);
        if (joined) {
          setRoomCode(code);
          setPlayerColor("black");
          setGameState(createInitialGameState());
          setIsWaiting(false);
          setScreen("game");
          startPolling(code);
        }
      } else {
        setRoomCode(code);
        setPlayerColor("black");
        setGameState(createInitialGameState());
        setIsWaiting(false);
        setScreen("game");
      }
    } catch {
      setRoomCode(code);
      setPlayerColor("black");
      setGameState(createInitialGameState());
      setIsWaiting(false);
      setScreen("game");
    }
  }

  function handleMove(from: Square, to: Square, promoteTo?: PieceKind) {
    setGameState((prev) =>
      applyMoveToState(prev, from, to, promoteTo ?? "queen"),
    );
    if (gameMode === "multiplayer" && roomCode && actor) {
      actor
        .makeMove(
          roomCode,
          { file: BigInt(from.file), rank: BigInt(from.rank) },
          { file: BigInt(to.file), rank: BigInt(to.rank) },
        )
        .catch(() => {});
    }
  }

  function handleNewGame() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGameState(createInitialGameState());
    setAIThinking(false);
    setIsWaiting(false);
    setRoomCode(null);
    setRoomInfo(null);
    setScreen("home");
  }

  function handleBack() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setAIThinking(false);
    setIsWaiting(false);
    setRoomInfo(null);
    setScreen("home");
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1e1208 0%, #100a04 60%, #0a0603 100%)",
      }}
    >
      {/* Top bar with back button and section tabs */}
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{
          background: "rgba(10,6,3,0.9)",
          borderBottom: "1px solid rgba(181,136,99,0.15)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Back button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{
                color: "rgba(240,217,181,0.5)",
                background: "rgba(181,136,99,0.08)",
                border: "1px solid rgba(181,136,99,0.15)",
              }}
              data-ocid="chess.back.button"
            >
              ← Studios
            </button>
          )}

          {/* Section tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(181,136,99,0.08)",
              border: "1px solid rgba(181,136,99,0.15)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveSection("chess")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                activeSection === "chess"
                  ? {
                      background: "rgba(181,136,99,0.3)",
                      color: "#f0d9b5",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }
                  : { color: "rgba(240,217,181,0.45)" }
              }
              data-ocid="chess.chess.tab"
            >
              <span>♛</span> Chess
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("sharedrop")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                activeSection === "sharedrop"
                  ? {
                      background: "rgba(181,136,99,0.3)",
                      color: "#f0d9b5",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }
                  : { color: "rgba(240,217,181,0.45)" }
              }
              data-ocid="chess.sharedrop.tab"
            >
              <Share2 className="w-3.5 h-3.5" /> ShareDrop
            </button>
          </div>

          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      {activeSection === "chess" && (
        <AnimatePresence mode="wait">
          {screen === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 flex items-center justify-center"
            >
              <ModeSelect
                onSelectVsAI={handleStartVsAI}
                onSelectMultiplayer={handleSelectMultiplayer}
              />
            </motion.div>
          )}
          {(screen === "creating" || screen === "waiting") && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 flex items-center justify-center"
            >
              <MultiplayerLobby
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onBack={handleBack}
                creating={creatingRoom}
                roomInfo={roomInfo}
              />
            </motion.div>
          )}
          {screen === "game" && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <ChessGameView
                gameState={gameState}
                playerColor={playerColor}
                roomCode={roomCode}
                isWaiting={isWaiting}
                onMove={handleMove}
                onNewGame={handleNewGame}
                onBack={handleBack}
                isAI={gameMode === "vsAI"}
                aiThinking={aiThinking}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {activeSection === "sharedrop" && (
        <motion.div
          key="sharedrop"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <ShareDropPanel />
        </motion.div>
      )}

      {/* Footer */}
      <footer
        className="text-center py-3 text-xs"
        style={{ color: "rgba(240,217,181,0.2)" }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(240,217,181,0.3)" }}
          className="hover:underline"
        >
          caffeine.ai
        </a>
      </footer>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
