import { useState } from 'react';
import { FileText, ScanLine, GitMerge, RefreshCw, PlusSquare } from 'lucide-react';
import PDFScanner from './PDFConverter/PDFScanner';
import PDFFileList from './PDFConverter/PDFFileList';
import MergeSplitTools from './PDFConverter/MergeSplitTools';
import ConvertDownload from './PDFConverter/ConvertDownload';
import CreatePDFFromImages from './PDFConverter/CreatePDFFromImages';
import { usePDFOperations } from './PDFConverter/usePDFOperations';

type PDFTab = 'scanner' | 'files' | 'merge' | 'convert' | 'create';

export default function PDFConverter() {
  const [activeTab, setActiveTab] = useState<PDFTab>('scanner');
  const {
    files,
    isProcessing,
    isConverting,
    convertedPdfData,
    error,
    lastCreatedPDF,
    addFiles,
    removeFile,
    mergePDFs,
    splitPDF,
    removePages,
    createPDFFromImages,
    convertAndMergeAll,
    clearConvertedPdf,
    mergeSplitEntries,
    isMerging,
    mergeError,
    addMergeSplitFiles,
    togglePageRemoval,
    mergeAndDownload,
    clearMergeSplitEntries,
  } = usePDFOperations();

  const tabs: { id: PDFTab; label: string; icon: React.ReactNode }[] = [
    { id: 'scanner', label: 'PDF Scanner', icon: <ScanLine className="w-4 h-4" /> },
    { id: 'files', label: 'Files', icon: <FileText className="w-4 h-4" /> },
    { id: 'merge', label: 'Merge/Split', icon: <GitMerge className="w-4 h-4" /> },
    { id: 'convert', label: 'Convert', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'create', label: 'Create', icon: <PlusSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">PDF Converter</h2>
        <p className="text-muted-foreground text-sm">Add PDFs &amp; images, convert, merge, split, and scan documents</p>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Tab Bar */}
        <div className="flex overflow-x-auto scrollbar-thin border-b border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6">
          {activeTab === 'scanner' && (
            <PDFScanner />
          )}

          {activeTab === 'files' && (
            <PDFFileList
              pdfFiles={files}
              isProcessing={isProcessing}
              onAddPDFs={addFiles}
              onRemovePDF={removeFile}
              convertToDownloadable={convertAndMergeAll}
              isConverting={isConverting}
            />
          )}

          {activeTab === 'merge' && (
            <MergeSplitTools
              isProcessing={isProcessing}
              isMerging={isMerging}
              mergeError={mergeError}
              entries={mergeSplitEntries}
              onAddFiles={addMergeSplitFiles}
              onToggleRemoval={togglePageRemoval}
              onMergeAndDownload={mergeAndDownload}
              onClear={clearMergeSplitEntries}
              pdfFiles={files.filter(f => f.fileType === 'pdf')}
              onMerge={mergePDFs}
              onSplit={splitPDF}
              onRemovePages={removePages}
            />
          )}

          {activeTab === 'convert' && (
            <ConvertDownload
              files={files}
              isConverting={isConverting}
              convertedPdfData={convertedPdfData}
              error={error}
              onConvert={convertAndMergeAll}
              onClear={clearConvertedPdf}
            />
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
