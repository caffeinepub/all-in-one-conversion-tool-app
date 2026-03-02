import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Merge, Scissors, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import type { PDFFile, SplitResult } from './usePDFOperations';
import { downloadAsZip } from '@/lib/jszip';

interface MergeSplitToolsProps {
  pdfFiles: PDFFile[];
  isProcessing: boolean;
  lastMergeResult: Uint8Array | null;
  lastSplitResults: SplitResult[] | null;
  onMerge: (ids?: string[]) => void;
  onSplit: (id?: string, at?: number) => void;
}

export default function MergeSplitTools({
  pdfFiles,
  isProcessing,
  lastMergeResult,
  lastSplitResults,
  onMerge,
  onSplit,
}: MergeSplitToolsProps) {
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [splitFileId, setSplitFileId] = useState('');
  const [splitAt, setSplitAt] = useState(1);
  const [isZippingMerge, setIsZippingMerge] = useState(false);
  const [isZippingSplit, setIsZippingSplit] = useState(false);

  const toggleMergeSelect = (id: string) => {
    setSelectedForMerge(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMergeZip = async () => {
    if (!lastMergeResult) return;
    setIsZippingMerge(true);
    try {
      const blob = new Blob([lastMergeResult.buffer as ArrayBuffer], { type: 'application/pdf' });
      await downloadAsZip([{ filename: 'merged.pdf', data: blob }], 'merged.zip');
      toast.success('Merged PDF downloaded as ZIP!');
    } catch {
      toast.error('Failed to create ZIP');
    } finally {
      setIsZippingMerge(false);
    }
  };

  const handleSplitZip = async () => {
    if (!lastSplitResults || lastSplitResults.length === 0) return;
    setIsZippingSplit(true);
    try {
      const entries = lastSplitResults.map(r => ({
        filename: r.filename,
        data: new Blob([r.bytes.buffer as ArrayBuffer], { type: 'application/pdf' }),
      }));
      await downloadAsZip(entries, 'split-parts.zip');
      toast.success('Split PDFs downloaded as ZIP!');
    } catch {
      toast.error('Failed to create ZIP');
    } finally {
      setIsZippingSplit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Merge */}
      <div className="space-y-3">
        <p className="section-title">Merge PDFs</p>
        {pdfFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Upload PDFs to merge them</p>
        ) : (
          <>
            <div className="space-y-2">
              {pdfFiles.map(pdf => (
                <div key={pdf.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`merge-${pdf.id}`}
                    checked={selectedForMerge.includes(pdf.id)}
                    onCheckedChange={() => toggleMergeSelect(pdf.id)}
                  />
                  <Label htmlFor={`merge-${pdf.id}`} className="text-sm cursor-pointer truncate flex-1">
                    {pdf.name}
                  </Label>
                  <span className="text-xs text-muted-foreground">{pdf.pageCount}p</span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => onMerge(selectedForMerge)}
              disabled={selectedForMerge.length < 2 || isProcessing}
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Merge className="w-3.5 h-3.5" />}
              Merge Selected ({selectedForMerge.length})
            </Button>
            {lastMergeResult && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMergeZip}
                disabled={isZippingMerge}
                className="w-full gap-2"
              >
                {isZippingMerge ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                {isZippingMerge ? 'Creating ZIP...' : 'Download Merged as ZIP'}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Split */}
      <div className="space-y-3">
        <p className="section-title">Split PDF</p>
        {pdfFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Upload a PDF to split it</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select PDF to split</Label>
              <select
                value={splitFileId}
                onChange={(e) => setSplitFileId(e.target.value)}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
              >
                <option value="">Choose a PDF...</option>
                {pdfFiles.map(pdf => (
                  <option key={pdf.id} value={pdf.id}>{pdf.name} ({pdf.pageCount}p)</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Split after page</Label>
              <Input
                type="number"
                min={1}
                value={splitAt}
                onChange={(e) => setSplitAt(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={() => onSplit(splitFileId, splitAt)}
              disabled={!splitFileId || isProcessing}
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
              Split PDF
            </Button>
            {lastSplitResults && lastSplitResults.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSplitZip}
                disabled={isZippingSplit}
                className="w-full gap-2"
              >
                {isZippingSplit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                {isZippingSplit ? 'Creating ZIP...' : 'Download Split Parts as ZIP'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
