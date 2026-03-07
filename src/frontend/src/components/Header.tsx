import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Film, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppInfo } from "../hooks/useQueries";

interface HeaderProps {
  onOpenMultimedia?: () => void;
  isMultimedia?: boolean;
  onOpenConvertAll?: () => void;
  onOpenChess?: () => void;
}

export default function Header({
  onOpenMultimedia,
  isMultimedia = false,
  onOpenConvertAll,
  onOpenChess,
}: HeaderProps) {
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
                {isMultimedia ? "Multimedia Studio" : "ConvertAll Studio"}
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                {isMultimedia
                  ? "Audio & Video Tools"
                  : "All-in-One Conversion Tool"}
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

            {/* Studio Switcher Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="studio.switcher.button"
                  className="hidden sm:flex items-center gap-1.5 rounded-xl text-xs font-medium border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Film className="w-3.5 h-3.5" />
                  Switch Studio
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Choose Studio
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-ocid="studio.convertall.link"
                  onClick={onOpenConvertAll}
                  className={`cursor-pointer gap-2 ${!isMultimedia ? "bg-primary/10 text-primary font-medium" : ""}`}
                >
                  <Zap className="w-4 h-4" />
                  ConvertAll Studio
                  {!isMultimedia && (
                    <span className="ml-auto text-xs opacity-60">Active</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-ocid="studio.multimedia.link"
                  onClick={onOpenMultimedia}
                  className={`cursor-pointer gap-2 ${isMultimedia ? "bg-primary/10 text-primary font-medium" : ""}`}
                >
                  <Film className="w-4 h-4" />
                  Multimedia Studio
                  {isMultimedia && (
                    <span className="ml-auto text-xs opacity-60">Active</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-ocid="studio.chess.link"
                  onClick={onOpenChess}
                  className="cursor-pointer gap-2"
                >
                  <span className="text-base leading-none">♛</span>
                  Chess Game
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
