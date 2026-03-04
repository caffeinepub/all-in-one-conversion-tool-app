import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  Monitor,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useRef, useState } from "react";

interface CCTVChannel {
  id: number;
  label: string;
  url: string;
  status: "idle" | "connecting" | "connected" | "error";
  error?: string;
}

function CameraBox({
  channel,
  onReload,
  onRemove,
}: {
  channel: CCTVChannel;
  onReload: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [showStream, setShowStream] = useState(false);

  const handleLoad = () => {
    setImgError(false);
    setShowStream(true);
  };

  const handleError = () => {
    setImgError(true);
    setShowStream(false);
  };

  const isConnected = channel.status === "connected" && !imgError;

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-white/10 bg-gray-900/80 flex flex-col"
      style={{ minHeight: 200 }}
      data-ocid={`cctv.camera_box.${channel.id}`}
    >
      {/* Channel header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-300">
            {channel.label}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 border-0 ${
              channel.status === "connected" && !imgError
                ? "bg-green-500/20 text-green-400"
                : channel.status === "connecting"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : channel.status === "error" || imgError
                    ? "bg-red-500/20 text-red-400"
                    : "bg-gray-500/20 text-gray-500"
            }`}
          >
            {channel.status === "connected" && !imgError
              ? "LIVE"
              : channel.status === "connecting"
                ? "..."
                : channel.status === "error" || imgError
                  ? "ERR"
                  : "IDLE"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onReload(channel.id)}
            className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title="Reload"
            data-ocid={`cctv.camera_reload_button.${channel.id}`}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          {channel.id > 4 && (
            <button
              type="button"
              onClick={() => onRemove(channel.id)}
              className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
              title="Remove"
              data-ocid={`cctv.camera_remove_button.${channel.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Video frame */}
      <div
        className="flex-1 relative bg-black flex items-center justify-center"
        style={{ minHeight: 160 }}
      >
        {channel.status === "connected" && channel.url && (
          <img
            key={channel.url}
            src={channel.url}
            alt={channel.label}
            className={`w-full h-full object-cover transition-opacity duration-300 ${showStream && !imgError ? "opacity-100" : "opacity-0 absolute"}`}
            onLoad={handleLoad}
            onError={handleError}
            style={{ maxHeight: 200 }}
          />
        )}

        {/* Overlay states */}
        {channel.status === "idle" && (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <Camera className="w-8 h-8" />
            <span className="text-xs">No stream</span>
          </div>
        )}
        {channel.status === "connecting" && (
          <div className="flex flex-col items-center gap-2 text-yellow-500">
            <Wifi className="w-8 h-8 animate-pulse" />
            <span className="text-xs">Connecting...</span>
          </div>
        )}
        {(channel.status === "error" || imgError) && (
          <div className="flex flex-col items-center gap-2 text-red-400">
            <AlertTriangle className="w-8 h-8" />
            <span className="text-xs text-center px-2">
              {channel.error || "Stream unavailable"}
            </span>
            <button
              type="button"
              onClick={() => {
                setImgError(false);
                onReload(channel.id);
              }}
              className="text-[10px] text-gray-400 hover:text-gray-200 underline"
            >
              Retry
            </button>
          </div>
        )}
        {channel.status === "connected" && !imgError && !showStream && (
          <div className="flex flex-col items-center gap-2 text-teal-400">
            <Wifi className="w-8 h-8 animate-pulse" />
            <span className="text-xs">Loading stream...</span>
          </div>
        )}

        {/* LIVE indicator dot */}
        {isConnected && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CCTVCam() {
  const [ip, setIp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const nextIdRef = useRef(5);

  const defaultChannels: CCTVChannel[] = [
    { id: 1, label: "Camera 1", url: "", status: "idle" },
    { id: 2, label: "Camera 2", url: "", status: "idle" },
    { id: 3, label: "Camera 3", url: "", status: "idle" },
    { id: 4, label: "Camera 4", url: "", status: "idle" },
  ];

  const [channels, setChannels] = useState<CCTVChannel[]>(defaultChannels);

  const handleConnect = () => {
    if (!ip.trim()) return;
    setConnecting(true);

    // Build the stream URL for each channel using common sub-stream paths
    const streamPaths = ["/video", "/video1", "/video2", "/video3"];
    const creds = password ? `admin:${password}@` : "";
    const cleanIp = ip.trim().replace(/^https?:\/\//, "");

    setTimeout(() => {
      setChannels((prev) =>
        prev.map((ch, idx) => {
          const path = streamPaths[idx] || `/video${idx}`;
          const url = `http://${creds}${cleanIp}${path}`;
          return { ...ch, url, status: "connected" };
        }),
      );
      setConnected(true);
      setConnecting(false);
    }, 1200);
  };

  const handleDisconnect = () => {
    setChannels(defaultChannels);
    setConnected(false);
  };

  const handleReload = (id: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== id) return ch;
        const sep = ch.url.includes("?") ? "&" : "?";
        const newUrl = `${ch.url}${sep}t=${Date.now()}`;
        return { ...ch, url: newUrl, status: "connected" };
      }),
    );
  };

  const handleRemove = (id: number) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  };

  const handleAddChannel = () => {
    const newId = nextIdRef.current++;
    const creds = password ? `admin:${password}@` : "";
    const cleanIp = ip.trim().replace(/^https?:\/\//, "");
    const url = connected ? `http://${creds}${cleanIp}/video${newId}` : "";
    setChannels((prev) => [
      ...prev,
      {
        id: newId,
        label: `Camera ${newId}`,
        url,
        status: connected ? "connected" : "idle",
      },
    ]);
  };

  return (
    <div className="space-y-6" data-ocid="cctv.page">
      {/* Connection Panel */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">
              CCTV Connection
            </h2>
            <p className="text-xs text-gray-500">
              Enter your CCTV IP address and password to connect
            </p>
          </div>
          {connected && (
            <Badge className="ml-auto bg-green-500/20 text-green-400 border-0 text-xs">
              Connected
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* IP Address */}
          <div className="space-y-1.5">
            <Label htmlFor="cctv-ip" className="text-xs text-gray-400">
              CCTV IP Address
            </Label>
            <Input
              id="cctv-ip"
              type="text"
              placeholder="e.g. 192.168.1.100 or 192.168.1.100:8080"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={connected}
              className="bg-gray-800/60 border-white/10 text-gray-200 placeholder:text-gray-600 text-sm"
              data-ocid="cctv.ip_input"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cctv-password" className="text-xs text-gray-400">
              Password
            </Label>
            <div className="relative">
              <Input
                id="cctv-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter CCTV password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={connected}
                className="bg-gray-800/60 border-white/10 text-gray-200 placeholder:text-gray-600 text-sm pr-10"
                data-ocid="cctv.password_input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                data-ocid="cctv.toggle_password_button"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info note */}
        <p className="text-[11px] text-gray-600 mb-4">
          Supports MJPEG/HTTP streams. Most IP cameras use paths like{" "}
          <code className="text-gray-500">/video</code> or{" "}
          <code className="text-gray-500">/videostream.cgi</code>. Make sure
          your browser and camera are on the same network.
        </p>

        <div className="flex gap-3">
          {!connected ? (
            <Button
              onClick={handleConnect}
              disabled={!ip.trim() || connecting}
              className="bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold gap-2"
              data-ocid="cctv.connect_button"
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {connecting ? "Connecting..." : "Connect CCTV"}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2"
              data-ocid="cctv.disconnect_button"
            >
              <WifiOff className="w-4 h-4" />
              Disconnect
            </Button>
          )}
          {connected && (
            <Button
              onClick={handleAddChannel}
              variant="outline"
              className="border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 gap-2"
              data-ocid="cctv.add_channel_button"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </Button>
          )}
        </div>
      </div>

      {/* Live View Grid */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Live View</h2>
            <p className="text-xs text-gray-500">
              {connected
                ? `${channels.length} camera${channels.length !== 1 ? "s" : ""} connected`
                : "Connect your CCTV to view live streams"}
            </p>
          </div>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              channels.length <= 1 ? "1fr" : "repeat(2, 1fr)",
          }}
          data-ocid="cctv.live_view_grid"
        >
          {channels.map((channel) => (
            <CameraBox
              key={channel.id}
              channel={channel}
              onReload={handleReload}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {!connected && (
          <div
            className="mt-3 rounded-xl border border-dashed border-white/10 p-8 flex flex-col items-center gap-3 text-gray-600"
            data-ocid="cctv.empty_state"
          >
            <Camera className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              Enter IP address and password above, then click Connect
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
