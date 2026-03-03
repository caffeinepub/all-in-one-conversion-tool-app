import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppInfo } from "../hooks/useQueries";

interface HeaderProps {
  onOpenMultimedia?: () => void;
}

export default function Header({ onOpenMultimedia }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { isSuccess } = useAppInfo();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/assets/generated/logo-mark.dim_256x256.png"
                alt="ConvertAll Studio"
                className="w-9 h-9 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center -z-10">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-foreground">
                ConvertAll Studio
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                All-in-One Conversion Tool
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isSuccess && (
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1.5 text-xs border-success/40 text-success"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Connected
              </Badge>
            )}

            {onOpenMultimedia && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenMultimedia}
                className="hidden sm:flex items-center gap-1.5 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
              >
                <Film className="w-4 h-4" />
                Multimedia
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
