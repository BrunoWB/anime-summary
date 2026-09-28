import React, { useRef } from 'react';
import { Download, UploadCloud, RotateCcw, AlertTriangle, Upload, FileText, Square } from 'lucide-react';
import { DatePatch } from '../../types/anilist.ts';

export interface ApplyProgressInfo {
  batch: number;
  intervalSec: number;
  done: number;
  totalInBatch: number;
  overallTotal: number;
  retryingCount: number;
  trueErrorsCount: number;
  currentTitle?: string;
  isWaitingCooldown?: boolean;
}

interface PatchActionsBarProps {
  pendingCount: number;
  onExport: () => void;
  onImport: (patches: DatePatch[]) => void;
  onApply: () => void;
  onCancel: () => void;
  onReset: () => void;
  isApplying: boolean;
  hasToken: boolean;
  applyProgress: ApplyProgressInfo | null;
  errorCount: number;
  onOpenLog: () => void;
}

export const PatchActionsBar: React.FC<PatchActionsBarProps> = ({
  pendingCount,
  onExport,
  onImport,
  onApply,
  onCancel,
  onReset,
  isApplying,
  hasToken,
  applyProgress,
  errorCount,
  onOpenLog
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          throw new Error('Expected a JSON array of patch records.');
        }
        onImport(parsed);
      } catch (err: any) {
        alert('Failed to read patch file: ' + (err.message || 'Invalid JSON'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0E1118] border-t border-[#1E2538] p-4 shadow-xl z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className={`text-sm font-mono ${pendingCount > 0 ? 'font-bold text-[#F1F5F9]' : 'text-[#94A3B8]'}`}>
            {pendingCount > 0 ? `${pendingCount} changes pending` : 'No changes pending'}
          </span>
          {isApplying && applyProgress && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-[#00F0FF] font-bold">
                Batch {applyProgress.batch} ({applyProgress.intervalSec}s interval): {applyProgress.done} / {applyProgress.totalInBatch}
              </span>
              {applyProgress.currentTitle && (
                <span className="text-[#94A3B8] truncate max-w-[200px] sm:max-w-[320px]">
                  · {applyProgress.isWaitingCooldown ? 'Cooldown after' : 'Updating'}:{' '}
                  <span className="text-cyan-300 font-semibold" title={applyProgress.currentTitle}>
                    {applyProgress.currentTitle}
                  </span>
                </span>
              )}
              {applyProgress.retryingCount > 0 && (
                <span className="text-amber-400 font-medium">
                  · {applyProgress.retryingCount} throttled
                </span>
              )}
              {applyProgress.trueErrorsCount > 0 && (
                <span className="text-red-400 font-medium">
                  · {applyProgress.trueErrorsCount} true errors
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Log Button */}
          <button
            type="button"
            onClick={onOpenLog}
            title="Open API activity and error log"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] text-[#F1F5F9] rounded-md text-sm font-mono transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#00F0FF]" />
            <span>Log</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                {errorCount}
              </span>
            )}
          </button>

          {/* Import JSON Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isApplying}
            title="Import a previously exported date patches JSON file"
            className="flex items-center gap-2 px-3.5 py-2 bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] text-[#F1F5F9] rounded-md text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#00F0FF]" />
            Import JSON
          </button>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={onExport}
            title="Export pending changes to JSON"
            className="flex items-center gap-2 px-3.5 py-2 bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] text-[#F1F5F9] rounded-md text-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          
          {/* Stop / Cancel Button (while applying) */}
          {isApplying ? (
            <button
              type="button"
              onClick={onCancel}
              title="Stop recursive batch processing"
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 font-bold rounded-md text-sm transition-colors cursor-pointer"
            >
              <Square className="w-4 h-4 fill-red-400" />
              Stop
            </button>
          ) : (
            /* Apply Button */
            <button
              type="button"
              onClick={onApply}
              disabled={!hasToken || pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#00F0FF] hover:bg-[#38F2FD] text-[#0B0D13] font-bold rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              title={!hasToken ? "Please verify an AniList token first to apply changes." : pendingCount === 0 ? "No changes to apply" : "Apply changes in batches directly to AniList"}
            >
              {!hasToken && <AlertTriangle className="w-4 h-4 text-amber-950" />}
              <UploadCloud className="w-4 h-4" />
              Apply to AniList
            </button>
          )}
          
          {/* Reset All Button */}
          <button
            type="button"
            onClick={onReset}
            disabled={isApplying || pendingCount === 0}
            title={pendingCount === 0 ? "No changes to reset" : "Discard all pending changes"}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#131722] hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
};
