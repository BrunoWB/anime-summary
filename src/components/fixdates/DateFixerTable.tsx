import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { DateFixerRow, FuzzyDate } from '../../types/anilist.ts';
import {
  fuzzyDateLabel,
  fuzzyDateToDate,
  dateDiffDays,
  formatDiscrepancyPretty,
  unixTimestampToFuzzyDate
} from '../../utils/dateUtils.ts';
import { Check, X, RotateCcw, ArrowUpDown, Sparkles } from 'lucide-react';
import { DateInputStepper } from './DateInputStepper.tsx';

interface DateFixerTableProps {
  rows: DateFixerRow[];
  pendingChanges: Map<number, FuzzyDate | null>;
  applyStatuses: Map<number, 'pending' | 'success' | 'error'>;
  onResetToEndDate: (mediaId: number) => void;
  onResetToLastUpdate: (mediaId: number) => void;
  onClearDate: (mediaId: number) => void;
  onUndoChange: (mediaId: number) => void;
  onUpdateDate: (mediaId: number, date: FuzzyDate | null) => void;
  onBatchUpdate: (updates: Array<{ mediaId: number; date: FuzzyDate }>) => void;
}

type SortCol = 'title' | 'watchDate' | 'animeEndDate' | 'discrepancy' | 'status';
type SortDir = 'asc' | 'desc';
type HealthFilter = 'all' | 'missing' | 'wrongYear' | 'off' | 'good';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  DROPPED: 'bg-red-500/20 text-red-400 border-red-500/30',
  PAUSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CURRENT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  PLANNING: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  REPEATING: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

const SOURCE_COLORS: Record<string, string> = {
  endDate: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  startDate: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  today: 'bg-green-500/20 text-green-400 border-green-500/30',
  unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

export const DateFixerTable: React.FC<DateFixerTableProps> = ({
  rows,
  pendingChanges,
  applyStatuses,
  onResetToEndDate,
  onResetToLastUpdate,
  onClearDate,
  onUndoChange,
  onUpdateDate,
  onBatchUpdate
}) => {
  const [sortCol, setSortCol] = useState<SortCol>('discrepancy');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unsetDroppedRows = useMemo(() => {
    return rows.filter(r => {
      if (r.listStatus !== 'DROPPED') return false;
      const effective = pendingChanges.has(r.mediaId) ? pendingChanges.get(r.mediaId) : r.watchDate;
      const isUnset = !effective || !effective.year;
      if (!isUnset) return false;
      // For dropped, if no updatedAt, do nothing
      const fuzzy = unixTimestampToFuzzyDate(r.updatedAt);
      return !!fuzzy && !!fuzzy.year;
    });
  }, [rows, pendingChanges]);

  const unsetCompletedRows = useMemo(() => {
    return rows.filter(r => {
      if (r.listStatus !== 'COMPLETED') return false;
      const effective = pendingChanges.has(r.mediaId) ? pendingChanges.get(r.mediaId) : r.watchDate;
      const isUnset = !effective || !effective.year;
      return isUnset && !!r.animeEndDate?.year;
    });
  }, [rows, pendingChanges]);

  const scrollPosRef = useRef<{ windowY: number; containerX: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleActionWithScrollPreserve = (action: () => void) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    scrollPosRef.current = {
      windowY: window.scrollY,
      containerX: containerRef.current?.scrollLeft ?? 0
    };
    action();
  };

  useLayoutEffect(() => {
    if (scrollPosRef.current !== null) {
      const { windowY, containerX } = scrollPosRef.current;
      scrollPosRef.current = null;
      window.scrollTo({ top: windowY, behavior: 'instant' as ScrollBehavior });
      if (containerRef.current) {
        containerRef.current.scrollLeft = containerX;
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: windowY, behavior: 'instant' as ScrollBehavior });
        if (containerRef.current) {
          containerRef.current.scrollLeft = containerX;
        }
      });
    }
  }, [pendingChanges]);

  const handleFixAllUnsetDropped = () => {
    handleActionWithScrollPreserve(() => {
      const updates: Array<{ mediaId: number; date: FuzzyDate }> = [];
      for (const r of unsetDroppedRows) {
        const fuzzy = unixTimestampToFuzzyDate(r.updatedAt);
        if (fuzzy && fuzzy.year) {
          updates.push({ mediaId: r.mediaId, date: fuzzy });
        }
      }
      if (updates.length > 0) {
        onBatchUpdate(updates);
      }
    });
  };

  const handleFixAllUnsetCompleted = () => {
    handleActionWithScrollPreserve(() => {
      const updates = unsetCompletedRows.map(r => ({
        mediaId: r.mediaId,
        date: r.animeEndDate!
      }));
      onBatchUpdate(updates);
    });
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    const augmented = rows.map(r => {
      const isPending = pendingChanges.has(r.mediaId);
      const effectiveWatchDate = isPending ? pendingChanges.get(r.mediaId) : r.watchDate;
      let effectiveDiscrepancy: number | null = null;
      if (effectiveWatchDate?.year && r.animeEndDate?.year) {
        const watchDateObj = fuzzyDateToDate(effectiveWatchDate);
        const animeEndDateObj = fuzzyDateToDate(r.animeEndDate);
        effectiveDiscrepancy = dateDiffDays(watchDateObj, animeEndDateObj);
      }
      return {
        ...r,
        isPending,
        effectiveWatchDate,
        effectiveDiscrepancy
      };
    });

    let result = augmented.filter(r => {
      if (r.listStatus === 'PLANNING') return false;
      if (statusFilter !== 'all' && r.listStatus !== statusFilter) return false;
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      if (healthFilter !== 'all') {
        const d = r.effectiveDiscrepancy;
        if (healthFilter === 'missing' && d !== null) return false;
        if (healthFilter === 'wrongYear' && (d === null || Math.abs(d) <= 365)) return false;
        if (healthFilter === 'off' && (d === null || Math.abs(d) <= 30 || Math.abs(d) > 365)) return false;
        if (healthFilter === 'good' && (d === null || Math.abs(d) > 30)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let valA: any = (a as any)[sortCol];
      let valB: any = (b as any)[sortCol];

      if (sortCol === 'discrepancy') {
        valA = a.effectiveDiscrepancy === null ? -99999999 : Math.abs(a.effectiveDiscrepancy);
        valB = b.effectiveDiscrepancy === null ? -99999999 : Math.abs(b.effectiveDiscrepancy);
      } else if (sortCol === 'watchDate') {
        valA = fuzzyDateLabel(a.effectiveWatchDate);
        valB = fuzzyDateLabel(b.effectiveWatchDate);
      } else if (sortCol === 'animeEndDate') {
        valA = fuzzyDateLabel(a.animeEndDate);
        valB = fuzzyDateLabel(b.animeEndDate);
      } else if (sortCol === 'status') {
        valA = a.listStatus;
        valB = b.listStatus;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, pendingChanges, statusFilter, healthFilter, searchQuery, sortCol, sortDir]);

  const renderDiscrepancy = (days: number | null) => {
    if (days === null) return <span className="text-[#555E6E] font-mono">—</span>;
    const abs = Math.abs(days);
    let color = 'text-green-400';
    if (abs > 365) color = 'text-red-400';
    else if (abs > 30) color = 'text-amber-400';
    
    const pretty = formatDiscrepancyPretty(days);
    const sign = days >= 0 ? '+' : '';
    return (
      <span
        className={`font-mono font-medium ${color}`}
        title={`${sign}${days} days exact`}
      >
        {pretty}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Quick Fixes Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131722] border border-[#1E2538] px-4 py-3 rounded-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00F0FF]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F1F5F9]">
            Quick Fixes
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleFixAllUnsetDropped}
            disabled={unsetDroppedRows.length === 0}
            title="Sets watch date of all unset Dropped anime to their last updatedAt timestamp"
            className="px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
          >
            <span>↺ Fix all unset dropped to last updatedAt</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[10px] font-bold">
              {unsetDroppedRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleFixAllUnsetCompleted}
            disabled={unsetCompletedRows.length === 0}
            title="Sets watch date of all unset Completed anime to their anime broadcast end date"
            className="px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300"
          >
            <span>↺ Fix all unset completed to end date</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[10px] font-bold">
              {unsetCompletedRows.length}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-[#131722] p-4 rounded-xl border border-[#1E2538]">
        <input
          type="text"
          placeholder="Search titles..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-[#0B0D13] border border-[#1E2538] rounded-md px-3 py-1.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
        />
        
        <div className="flex gap-2">
          {['all', 'COMPLETED', 'DROPPED', 'PAUSED', 'REPEATING'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50' : 'bg-[#0B0D13] text-[#94A3B8] border-[#1E2538]'}`}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2 border-l border-[#1E2538] pl-4">
          {[
            { id: 'all', label: 'All Health' },
            { id: 'missing', label: 'Missing' },
            { id: 'wrongYear', label: '> 1 Year' },
            { id: 'off', label: '1 - 12 mo' },
            { id: 'good', label: '< 1 mo' }
          ].map(h => (
            <button
              key={h.id}
              onClick={() => setHealthFilter(h.id as HealthFilter)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${healthFilter === h.id ? 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50' : 'bg-[#0B0D13] text-[#94A3B8] border-[#1E2538]'}`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="bg-[#131722] border border-[#1E2538] rounded-xl overflow-x-auto [overflow-anchor:none]">
        <table className="w-full text-left text-sm text-[#F1F5F9] [overflow-anchor:none]">
          <thead className="bg-[#0E1118] border-b border-[#1E2538]">
            <tr>
              {['Status', 'Title', 'Watch Date', 'Anime End Date', 'Discrepancy', 'Actions'].map((header, i) => (
                <th
                  key={header}
                  onClick={() => {
                    const map: Record<string, SortCol> = {
                      'Status': 'status',
                      'Title': 'title',
                      'Watch Date': 'watchDate',
                      'Anime End Date': 'animeEndDate',
                      'Discrepancy': 'discrepancy'
                    };
                    if (map[header]) handleSort(map[header]);
                  }}
                  className={`p-4 font-medium text-[#94A3B8] ${i !== 5 ? 'cursor-pointer hover:text-[#F1F5F9]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {header}
                    {i !== 5 && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2538]">
            {filteredAndSortedRows.map(row => {
              const status = applyStatuses.get(row.mediaId);
              const statusColorClass = STATUS_COLORS[row.listStatus] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
              const sourceColorClass = SOURCE_COLORS[row.endDateSource] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

              const hasNoDate = !row.effectiveWatchDate || !row.effectiveWatchDate.year;

              let rowClass = 'hover:bg-[#19202F]/50 transition-colors';
              if (hasNoDate) {
                rowClass = 'bg-amber-500/10 hover:bg-amber-500/20 border-l-4 border-l-amber-500 transition-colors';
              } else if (row.isPending) {
                rowClass = 'bg-cyan-500/5 hover:bg-cyan-500/15 border-l-4 border-l-cyan-400 transition-colors';
              }

              const hasValidUpdatedAt = !!unixTimestampToFuzzyDate(row.updatedAt);
              const hasAnimeEndDate = !!row.animeEndDate;
              const fallbackDate = row.animeEndDate || unixTimestampToFuzzyDate(row.updatedAt) || undefined;

              return (
                <tr key={row.mediaId} className={rowClass}>
                  <td className="p-4">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusColorClass}`}>
                      {row.listStatus}
                    </span>
                  </td>
                  <td className="p-4 font-medium" title={row.title}>
                    {row.title.length > 40 ? row.title.slice(0, 40) + '...' : row.title}
                  </td>
                  <td className="p-4">
                    <DateInputStepper
                      value={row.effectiveWatchDate}
                      originalValue={row.watchDate}
                      fallbackDate={fallbackDate}
                      isPending={row.isPending}
                      onChange={(newDate) => {
                        handleActionWithScrollPreserve(() => onUpdateDate(row.mediaId, newDate));
                      }}
                      disabled={status === 'success'}
                    />
                  </td>
                  <td className="p-4 font-mono">
                    <div className="flex flex-col gap-1 items-start">
                      {fuzzyDateLabel(row.animeEndDate)}
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${sourceColorClass}`}>
                        {row.endDateSource}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {renderDiscrepancy(row.effectiveDiscrepancy)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {status === 'success' && <Check className="w-5 h-5 text-green-500" />}
                      {status === 'error' && <X className="w-5 h-5 text-red-500" />}
                      
                      {!status && !row.isPending && (
                        <>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleActionWithScrollPreserve(() => onResetToEndDate(row.mediaId))}
                            disabled={!hasAnimeEndDate}
                            title={hasAnimeEndDate ? "Reset to anime broadcast end date" : "No anime end date available"}
                            className="text-xs px-2 py-1 bg-[#1E2538] hover:bg-[#2D3748] rounded text-[#F1F5F9] transition-colors disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                          >
                            ↺ End Date
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleActionWithScrollPreserve(() => onResetToLastUpdate(row.mediaId))}
                            disabled={!hasValidUpdatedAt}
                            title={hasValidUpdatedAt ? "Reset to last updatedAt timestamp" : "No updatedAt timestamp available (do nothing)"}
                            className="text-xs px-2 py-1 bg-[#1E2538] hover:bg-[#2D3748] rounded text-[#F1F5F9] transition-colors disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                          >
                            ↺ Last Update
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleActionWithScrollPreserve(() => onClearDate(row.mediaId))}
                            title="Clear watch date"
                            className="text-xs px-2 py-1 bg-[#1E2538] hover:bg-red-900/50 rounded text-red-400 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            ✕ Clear
                          </button>
                        </>
                      )}
                      
                      {row.isPending && !status && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleActionWithScrollPreserve(() => onUndoChange(row.mediaId))}
                          className="text-xs px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 rounded transition-colors whitespace-nowrap cursor-pointer"
                        >
                          ↩ Undo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
