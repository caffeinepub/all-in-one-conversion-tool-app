import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import ImageEditor from './modules/ImageEditor';
import PDFConverter from './modules/PDFConverter';
import { ImageConverter } from './modules/ImageConverter';
import { PassportPhotoConverter } from './modules/PassportPhotoConverter';
import BackgroundRemover from './modules/BackgroundRemover';
import Footer from './components/Footer';

export type TabId =
  | 'image-editor'
  | 'pdf-converter'
  | 'image-converter'
  | 'passport-photo'
  | 'bg-remover';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('image-editor');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="animate-fade-in">
          {activeTab === 'image-editor' && <ImageEditor />}
          {activeTab === 'pdf-converter' && <PDFConverter />}
          {activeTab === 'image-converter' && <ImageConverter />}
          {activeTab === 'passport-photo' && <PassportPhotoConverter />}
          {activeTab === 'bg-remover' && <BackgroundRemover />}
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
