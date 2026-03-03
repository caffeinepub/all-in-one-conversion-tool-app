import { CreditCard, FileText, Image, RefreshCw, Scissors } from "lucide-react";
import type { TabId } from "../App";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: Tab[] = [
  {
    id: "pdf-converter",
    label: "PDF Converter",
    icon: <FileText className="w-4 h-4" />,
    description: "Merge, split & create PDFs",
  },
  {
    id: "image-editor",
    label: "Image Editor",
    icon: <Image className="w-4 h-4" />,
    description: "Edit, crop, filter & export",
  },
  {
    id: "image-converter",
    label: "Image Converter",
    icon: <RefreshCw className="w-4 h-4" />,
    description: "Convert & batch process",
  },
  {
    id: "passport-photo",
    label: "Passport Photo",
    icon: <CreditCard className="w-4 h-4" />,
    description: "Create passport size photos",
  },
  {
    id: "bg-remover",
    label: "BG Remover",
    icon: <Scissors className="w-4 h-4" />,
    description: "Remove image backgrounds",
  },
];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <nav className="border-b border-border/50 bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium
                  whitespace-nowrap transition-all duration-200 flex-shrink-0
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && (
                  <span className="hidden sm:block text-xs opacity-70 font-normal">
                    — {tab.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
