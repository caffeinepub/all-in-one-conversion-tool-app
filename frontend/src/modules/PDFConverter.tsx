import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { usePDFOperations } from './PDFConverter/usePDFOperations';
import PDFFileList from './PDFConverter/PDFFileList';
import MergeSplitTools from './PDFConverter/MergeSplitTools';
import PageManager from './PDFConverter/PageManager';
import CreatePDFFromImages from './PDFConverter/CreatePDFFromImages';

type TabId = 'files' | 'merge-split' | 'pages' | 'create';

const TABS: { id: TabId; label: string; step: number }[] = [
  { id: 'files', label: '① Files', step: 1 },
  { id: 'merge-split', label: '② Merge/Split', step: 2 },
  { id: 'pages', label: '③ Pages', step: 3 },
  { id: 'create', label: '④ Create', step: 4 },
];

export default function PDFConverter() {
  const [activeTab, setActiveTab] = useState<TabId>('files');
  const {
    pdfFiles,
    isProcessing,
    lastMergeResult,
    lastSplitResults,
    lastCreatedPDF,
    addPDFs,
    removePDF,
    mergePDFs,
    splitPDF,
    removePages,
    createPDFFromImages,
  } = usePDFOperations();

  const handleNext = () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx < TABS.length - 1) {
      setActiveTab(TABS[idx + 1].id);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">PDF Converter</h2>
        <p className="text-muted-foreground text-sm">Merge, split, manage pages, and create PDFs from images</p>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-thin border-b border-border/50">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6">
          {activeTab === 'files' && (
            <div className="space-y-4">
              <PDFFileList
                pdfFiles={pdfFiles}
                isProcessing={isProcessing}
                onAddPDFs={addPDFs}
                onRemovePDF={removePDF}
              />
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={pdfFiles.length === 0}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'merge-split' && (
            <div className="space-y-4">
              <MergeSplitTools
                pdfFiles={pdfFiles}
                isProcessing={isProcessing}
                lastMergeResult={lastMergeResult}
                lastSplitResults={lastSplitResults}
                onMerge={mergePDFs}
                onSplit={splitPDF}
              />
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleNext} className="gap-2">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4">
              <PageManager
                pdfFiles={pdfFiles}
                isProcessing={isProcessing}
                onRemovePages={removePages}
              />
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleNext} className="gap-2">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <CreatePDFFromImages
              isProcessing={isProcessing}
              lastCreatedPDF={lastCreatedPDF}
              onCreatePDF={createPDFFromImages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
