import {
  Download,
  FileText,
  Image,
  Layers,
  ScanLine,
  Upload,
} from "lucide-react";
import React, { useRef } from "react";
import CreatePDFFromImages from "./PDFConverter/CreatePDFFromImages";
import MergeSplitTools from "./PDFConverter/MergeSplitTools";
import PDFFileList from "./PDFConverter/PDFFileList";
import PDFScanner from "./PDFConverter/PDFScanner";
import { usePDFOperations } from "./PDFConverter/usePDFOperations";

type PDFTab = "scanner" | "files" | "merge" | "create";

export default function PDFConverter() {
  const [activeTab, setActiveTab] = React.useState<PDFTab>("scanner");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    pdfFiles,
    addPDFFiles,
    removePDFFile,
    convertToDownloadable,
    isConverting,
    mergeSplitEntries,
    addMergeSplitFiles,
    togglePageRemoval,
    reorderMergeSplitEntries,
    mergeAndDownload,
    clearMergeSplitEntries,
    isMerging,
  } = usePDFOperations();

  const tabs: { id: PDFTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "scanner",
      label: "PDF Scanner",
      icon: <ScanLine className="w-4 h-4" />,
    },
    { id: "files", label: "Files", icon: <Upload className="w-4 h-4" /> },
    { id: "merge", label: "Merge/Split", icon: <Layers className="w-4 h-4" /> },
    { id: "create", label: "Create", icon: <Image className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-card box-white p-4 md:p-6 rounded-2xl">
        {activeTab === "scanner" && <PDFScanner />}

        {activeTab === "files" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Files</h2>
            </div>
            {/* Drop zone for adding files */}
            <label
              className="upload-zone flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(
                  (f) =>
                    f.type === "application/pdf" || f.type.startsWith("image/"),
                );
                if (files.length) addPDFFiles(files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addPDFFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <Upload className="w-8 h-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Drag & drop PDFs or images here, or click to browse
              </p>
            </label>
            <PDFFileList
              files={pdfFiles}
              onAddFiles={addPDFFiles}
              onRemoveFile={removePDFFile}
              onCreatePDF={convertToDownloadable}
              isConverting={isConverting}
            />
          </div>
        )}

        {activeTab === "merge" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Merge / Split</h2>
            </div>
            <MergeSplitTools
              entries={mergeSplitEntries}
              onAddFiles={addMergeSplitFiles}
              onToggleRemoval={togglePageRemoval}
              onReorder={reorderMergeSplitEntries}
              onMergeAndDownload={mergeAndDownload}
              onClear={clearMergeSplitEntries}
              isMerging={isMerging}
            />
          </div>
        )}

        {activeTab === "create" && <CreatePDFFromImages />}
      </div>
    </div>
  );
}
