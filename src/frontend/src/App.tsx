import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import MultimediaApp from "./MultimediaApp";
import Footer from "./components/Footer";
import Header from "./components/Header";
import PermissionOnboarding, {
  usePermissionOnboarding,
} from "./components/PermissionOnboarding";
import TabNavigation from "./components/TabNavigation";
import BackgroundRemover from "./modules/BackgroundRemover";
import { ImageConverter } from "./modules/ImageConverter";
import ImageEditor from "./modules/ImageEditor";
import PDFConverter from "./modules/PDFConverter";
import { PassportPhotoConverter } from "./modules/PassportPhotoConverter";

export type TabId =
  | "image-editor"
  | "pdf-converter"
  | "image-converter"
  | "passport-photo"
  | "bg-remover";

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("pdf-converter");
  const [showMultimedia, setShowMultimedia] = useState(false);
  const { show: showPermissions, dismiss: dismissPermissions } =
    usePermissionOnboarding();

  if (showMultimedia) {
    return <MultimediaApp onBack={() => setShowMultimedia(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showPermissions && <PermissionOnboarding onDone={dismissPermissions} />}
      <Header onOpenMultimedia={() => setShowMultimedia(true)} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="animate-fade-in">
          {activeTab === "image-editor" && <ImageEditor />}
          {activeTab === "pdf-converter" && <PDFConverter />}
          {activeTab === "image-converter" && <ImageConverter />}
          {activeTab === "passport-photo" && <PassportPhotoConverter />}
          {activeTab === "bg-remover" && <BackgroundRemover />}
        </div>
      </main>
      <Footer />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AppContent />
    </ThemeProvider>
  );
}
