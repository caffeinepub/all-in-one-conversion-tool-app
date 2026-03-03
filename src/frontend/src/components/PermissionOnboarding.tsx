import { Button } from "@/components/ui/button";
import { Camera, FolderOpen, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "caffeine_permissions_granted_v1";

interface PermissionOnboardingProps {
  onDone: () => void;
}

export default function PermissionOnboarding({
  onDone,
}: PermissionOnboardingProps) {
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [galleryStatus, setGalleryStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [step, setStep] = useState<"intro" | "requesting" | "done">("intro");

  const requestPermissions = async () => {
    setStep("requesting");

    // ── Camera permission ──────────────────────────────────────────────────
    setCameraStatus("requesting");
    let camGranted = false;
    try {
      // Check if Permissions API is available and query first
      if (navigator.permissions) {
        try {
          const camPerm = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          if (camPerm.state === "granted") {
            camGranted = true;
            setCameraStatus("granted");
          }
        } catch (_) {
          // Permissions API may not support "camera" — fall through to getUserMedia
        }
      }

      if (!camGranted) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        // Stop all tracks immediately — we only needed the permission grant
        for (const track of stream.getTracks()) track.stop();
        camGranted = true;
        setCameraStatus("granted");
      }
    } catch (_) {
      setCameraStatus("denied");
    }

    // ── Gallery / storage permission ───────────────────────────────────────
    // On the web, gallery access is implicit via <input type="file">. We
    // simulate a "request" by clicking a hidden file input so the user sees
    // the OS picker (and implicitly grants access). We mark it granted after
    // the picker is dismissed.
    setGalleryStatus("requesting");
    try {
      await new Promise<void>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        // Resolve when user closes the picker (focus returns to window)
        const onFocus = () => {
          window.removeEventListener("focus", onFocus);
          resolve();
        };
        window.addEventListener("focus", onFocus);
        // Fallback: resolve after 30 s in case focus event never fires
        const timeout = setTimeout(() => {
          window.removeEventListener("focus", onFocus);
          resolve();
        }, 30_000);
        input.addEventListener("change", () => {
          clearTimeout(timeout);
          window.removeEventListener("focus", onFocus);
          resolve();
        });
        input.click();
      });
      setGalleryStatus("granted");
    } catch (_) {
      setGalleryStatus("denied");
    }

    setStep("done");
  };

  const handleDone = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      data-ocid="permission_onboarding.modal"
    >
      <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">App Permissions</h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          To give you the best experience, this app needs access to your{" "}
          <strong className="text-foreground">camera</strong> (for scanning
          documents) and <strong className="text-foreground">gallery</strong>{" "}
          (for selecting images). You will only be asked once.
        </p>

        {/* Permission items */}
        <div className="flex flex-col gap-3">
          <PermissionRow
            icon={<Camera className="w-5 h-5" />}
            label="Camera"
            description="Scan documents and capture images"
            status={cameraStatus}
          />
          <PermissionRow
            icon={<FolderOpen className="w-5 h-5" />}
            label="Gallery / Files"
            description="Select images and files from your device"
            status={galleryStatus}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {step === "intro" && (
            <Button
              onClick={requestPermissions}
              data-ocid="permission_onboarding.allow_button"
              className="w-full"
            >
              Allow Permissions
            </Button>
          )}

          {step === "requesting" && (
            <Button disabled className="w-full flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Requesting...
            </Button>
          )}

          {step === "done" && (
            <Button
              onClick={handleDone}
              data-ocid="permission_onboarding.continue_button"
              className="w-full"
            >
              Continue to App
            </Button>
          )}

          {step === "intro" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDone}
              data-ocid="permission_onboarding.skip_button"
              className="w-full text-muted-foreground text-xs"
            >
              Skip for now
            </Button>
          )}
        </div>

        {/* Note */}
        {step === "done" &&
          (cameraStatus === "denied" || galleryStatus === "denied") && (
            <p className="text-xs text-muted-foreground text-center">
              Some permissions were denied. You can enable them later in your
              browser settings.
            </p>
          )}
      </div>
    </div>
  );
}

// ── Helper row component ──────────────────────────────────────────────────────

interface PermissionRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  status: "idle" | "requesting" | "granted" | "denied";
}

function PermissionRow({
  icon,
  label,
  description,
  status,
}: PermissionRowProps) {
  const statusColor =
    status === "granted"
      ? "text-green-500"
      : status === "denied"
        ? "text-destructive"
        : status === "requesting"
          ? "text-primary"
          : "text-muted-foreground";

  const statusText =
    status === "granted"
      ? "Allowed"
      : status === "denied"
        ? "Denied"
        : status === "requesting"
          ? "Requesting..."
          : "Pending";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <span className={`text-xs font-medium shrink-0 ${statusColor}`}>
        {status === "requesting" ? (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
            {statusText}
          </span>
        ) : (
          statusText
        )}
      </span>
    </div>
  );
}

// ── Hook for easy usage ───────────────────────────────────────────────────────

export function usePermissionOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const already = localStorage.getItem(STORAGE_KEY);
    if (!already) {
      // Small delay so the app renders first before showing the modal
      const timer = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    show,
    dismiss: () => {
      localStorage.setItem(STORAGE_KEY, "true");
      setShow(false);
    },
  };
}
