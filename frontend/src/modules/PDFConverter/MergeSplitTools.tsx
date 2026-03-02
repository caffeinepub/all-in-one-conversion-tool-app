import React, { useState, useRef } from 'react';
import { FileText, Image, Plus, Trash2, RotateCcw, Download, Loader2, CheckCircle, CheckSquare, Square, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MergeSplitEntry } from './usePDFOperations';

interface MergeSplitToolsProps {
  entries: MergeSplitEntry[];
  onAddFiles: (files: File[]) => Promise<void>;
  onToggleRemoval: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onMergeAndDownload: (selectedIds?: string[]) => Promise<void>;
  onClear: () => void;
  isMerging: boolean;
}

export default function MergeSplitTools({
  entries,
  onAddFiles,
  onToggleRemoval,
  onReorder,
  onMergeAndDownload,
  onClear,
  isMerging,
}: MergeSplitToolsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const activeEntries = entries.filter(e => !e.removed);
  const allSelected = activeEntries.length > 0 && selectedIds.size === activeEntries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < activeEntries.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeEntries.map(e => e.id)));
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

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsLoading(true);
      try {
        await onAddFiles(Array.from(e.target.files));
      } finally {
        setIsLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleMerge = async () => {
    setSuccess(false);
    const idsToMerge = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    await onMergeAndDownload(idsToMerge);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const activeCount = activeEntries.length;
  const removedCount = entries.filter(e => e.removed).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleAddFiles}
            disabled={isLoading}
          />
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/40 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <FileText className="w-4 h-4 text-red-400" />
            Add PDF
          </span>
        </label>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleAddFiles}
            disabled={isLoading}
          />
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/40 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Image className="w-4 h-4 text-blue-400" />
            Add Images
          </span>
        </label>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading pages...
        </div>
      )}

      {/* Select All + status */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between">
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
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">({selectedIds.size} selected)</span>
            )}
          </button>
          <span className="text-xs text-muted-foreground">
            {activeCount} active{removedCount > 0 ? `, ${removedCount} removed` : ''}
          </span>
        </div>
      )}

      {/* Page grid */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
          <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No files added yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Add PDFs or images to merge</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {entries.map((entry, index) => {
            const isSelected = selectedIds.has(entry.id);
            const isDragTarget = dragOverIndex === index;
            return (
              <div
                key={entry.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative flex flex-col rounded-xl border overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                  entry.removed
                    ? 'opacity-40 border-border'
                    : isSelected
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                } ${isDragTarget ? 'border-primary border-2 scale-105 shadow-lg' : ''}`}
              >
                {/* Drag handle */}
                <div className="absolute top-1 left-1 z-10 p-0.5 rounded bg-black/30 text-white/70">
                  <GripVertical className="w-3 h-3" />
                </div>

                {/* Checkbox */}
                {!entry.removed && (
                  <div
                    className="absolute top-1 right-1 z-10"
                    onClick={e => { e.stopPropagation(); toggleSelect(entry.id); }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(entry.id)}
                      className="bg-black/40 border-white/60 data-[state=checked]:bg-primary"
                    />
                  </div>
                )}

                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center overflow-hidden">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt={`${entry.sourceName} page ${entry.pageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                      {entry.type === 'pdf-page' ? (
                        <FileText className="w-8 h-8" />
                      ) : (
                        <Image className="w-8 h-8" />
                      )}
                    </div>
                  )}
                  {entry.removed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <X className="w-8 h-8 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info + controls */}
                <div className="p-1.5 flex flex-col gap-1">
                  <p className="text-xs truncate text-muted-foreground leading-tight">
                    {entry.sourceName}
                  </p>
                  {entry.type === 'pdf-page' && (
                    <p className="text-xs text-muted-foreground/60">
                      p.{entry.pageIndex + 1}/{entry.totalPages}
                    </p>
                  )}
                  <button
                    onClick={() => onToggleRemoval(entry.id)}
                    className={`flex items-center justify-center gap-1 text-xs py-0.5 px-1 rounded transition-colors ${
                      entry.removed
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                    }`}
                  >
                    {entry.removed ? (
                      <><RotateCcw className="w-3 h-3" /> Restore</>
                    ) : (
                      <><X className="w-3 h-3" /> Remove</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Merge info */}
      {entries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} page(s) selected for merge`
            : `All ${activeCount} active page(s) will be merged`}
        </p>
      )}

      {/* Download button */}
      <Button
        onClick={handleMerge}
        disabled={activeCount === 0 || isMerging}
        className="w-full"
        size="lg"
      >
        {isMerging ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Merging PDF...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Merge & Download PDF
            {selectedIds.size > 0 && ` (${selectedIds.size})`}
          </>
        )}
      </Button>
    </div>
  );
}
