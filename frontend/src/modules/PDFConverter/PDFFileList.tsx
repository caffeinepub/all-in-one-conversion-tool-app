import React, { useState } from 'react';
import { FileText, Image, Trash2, Plus, CheckSquare, Square, Download, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface PDFFile {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'image';
  file: File;
  dataUrl?: string;
}

interface PDFFileListProps {
  files: PDFFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onCreatePDF: (selectedIds?: string[]) => Promise<void>;
  isConverting: boolean;
}

export default function PDFFileList({ files, onAddFiles, onRemoveFile, onCreatePDF, isConverting }: PDFFileListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);

  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConvert = async () => {
    setSuccess(false);
    const idsToConvert = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    await onCreatePDF(idsToConvert);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAddFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filesToConvert = selectedIds.size > 0
    ? files.filter(f => selectedIds.has(f.id))
    : files;

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : someSelected ? (
                <CheckSquare className="w-4 h-4 text-primary opacity-60" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selectedIds.size} selected)
            </span>
          )}
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <span className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-4 h-4" />
            Add Files
          </span>
        </label>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No files added yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Add PDF or image files to convert</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map(file => {
            const isSelected = selectedIds.has(file.id);
            return (
              <div
                key={file.id}
                onClick={() => toggleSelect(file.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(file.id)}
                  onClick={e => e.stopPropagation()}
                  className="shrink-0"
                />
                <div className={`p-1.5 rounded ${file.type === 'pdf' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                  {file.type === 'pdf' ? (
                    <FileText className="w-4 h-4 text-red-400" />
                  ) : (
                    <Image className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  file.type === 'pdf' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {file.type.toUpperCase()}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onRemoveFile(file.id); }}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${files.length} file(s) selected for conversion`
            : `All ${files.length} file(s) will be converted`}
        </p>
      )}

      {/* Convert button */}
      <Button
        onClick={handleConvert}
        disabled={files.length === 0 || isConverting}
        className="w-full mt-2"
        size="lg"
      >
        {isConverting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Converting...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            PDF Created!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Convert to PDF
            {selectedIds.size > 0 && ` (${selectedIds.size} file${selectedIds.size > 1 ? 's' : ''})`}
          </>
        )}
      </Button>
    </div>
  );
}
