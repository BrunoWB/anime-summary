import React, { useState, useMemo } from 'react';
import { PatchLogEntry } from '../../types/anilist.ts';
import { X, Download, Trash2, AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';

interface PatchLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PatchLogEntry[];
  onClearLogs: () => void;
}

type LogFilter = 'all' | 'error' | 'retryable' | 'success';

export const PatchLogModal: React.FC<PatchLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');

  const errorCount = useMemo(() => logs.filter(l => l.type === 'error').length, [logs]);
  const retryCount = useMemo(() => logs.filter(l => l.type === 'retryable').length, [logs]);
  const successCount = useMemo(() => logs.filter(l => l.type === 'success').length, [logs]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter(l => l.type === filter);
  }, [logs, filter]);

  if (!isOpen) return null;

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anilist-patch-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E1118] border border-[#1E2538] rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2538] bg-[#131722] rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#F1F5F9]">API Activity & Error Log</h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-[#1E2538] text-[#94A3B8]">
              {logs.length} events
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1E2538] text-[#94A3B8] hover:text-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#131722]/60 border-b border-[#1E2538]">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                filter === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'text-[#94A3B8] hover:text-red-400'
              }`}
            >
              True Errors ({errorCount})
            </button>
            <button
              onClick={() => setFilter('retryable')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                filter === 'retryable'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-[#94A3B8] hover:text-amber-300'
              }`}
            >
              Throttled / Retried ({retryCount})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                filter === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'text-[#94A3B8] hover:text-green-400'
              }`}
            >
              Success ({successCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1E2538] hover:bg-[#2D3748] text-[#F1F5F9] rounded-md text-xs font-mono transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Log
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1E2538] hover:bg-red-900/40 text-red-400 rounded-md text-xs font-mono transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Log
            </button>
          </div>
        </div>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs divide-y divide-[#1E2538]/50">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-[#555E6E]">
              No log entries for this filter.
            </div>
          ) : (
            filteredLogs.map(log => {
              let badgeColor = 'bg-[#1E2538] text-[#94A3B8] border-[#2D3748]';
              let Icon = Info;
              let isSpinning = false;
              if (log.type === 'error') {
                badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40';
                Icon = AlertCircle;
              } else if (log.type === 'retryable') {
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                Icon = RefreshCw;
              } else if (log.type === 'success') {
                badgeColor = 'bg-green-500/20 text-green-400 border-green-500/40';
                Icon = CheckCircle;
              } else if (log.type === 'info') {
                badgeColor = 'bg-cyan-500/20 text-[#00F0FF] border-cyan-500/40';
                Icon = RefreshCw;
                isSpinning = true;
              }

              return (
                <div key={log.id} className="pt-2 flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSpinning ? 'animate-spin text-[#00F0FF]' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#555E6E]">{log.timestamp}</span>
                        {log.batch > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[#131722] border border-[#1E2538] text-[10px] text-[#00F0FF]">
                            Batch {log.batch}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded border text-[10px] uppercase font-bold ${badgeColor}`}>
                          {log.type === 'retryable' ? 'Throttled' : log.type === 'info' ? 'In Progress' : log.type}
                        </span>
                        <span className="font-semibold text-[#F1F5F9] truncate" title={log.title}>
                          {log.title}
                        </span>
                      </div>
                      <p className="mt-1 text-[#94A3B8] break-words">
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E2538] bg-[#131722] rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E2538] hover:bg-[#2D3748] text-[#F1F5F9] rounded-md text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
