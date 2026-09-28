import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AniListCollection, DateFixerRow, FuzzyDate, DatePatch, PatchLogEntry } from '../types/anilist.ts';
import { fetchEndDates, verifyAniListToken, patchCompletedDate } from '../services/anilistService.ts';
import { resolveEffectiveEndDate, fuzzyDateToDate, dateDiffDays, unixTimestampToFuzzyDate, fuzzyDateLabel } from '../utils/dateUtils.ts';
import { TokenBanner } from '../components/fixdates/TokenBanner.tsx';
import { PatchActionsBar, ApplyProgressInfo } from '../components/fixdates/PatchActionsBar.tsx';
import { DateFixerTable } from '../components/fixdates/DateFixerTable.tsx';
import { PatchLogModal } from '../components/fixdates/PatchLogModal.tsx';
import { Calendar, ArrowLeft } from 'lucide-react';

const TOKEN_STORAGE_KEY = 'anilist_auth_token';
const USERNAME_STORAGE_KEY = 'anilist_auth_username';

interface FixDatesPageProps {
  rawCollection: AniListCollection | null;
  username: string | null;
  onNavigateBack: () => void;
}

export const FixDatesPage: React.FC<FixDatesPageProps> = ({ rawCollection, username, onNavigateBack }) => {
  const [rows, setRows] = useState<DateFixerRow[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [pendingChanges, setPendingChanges] = useState<Map<number, FuzzyDate | null>>(new Map());
  const [applyStatuses, setApplyStatuses] = useState<Map<number, 'pending' | 'success' | 'error'>>(new Map());
  
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [verifiedUsername, setVerifiedUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_STORAGE_KEY));
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<ApplyProgressInfo | null>(null);
  const [logs, setLogs] = useState<PatchLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const isCancelledRef = useRef(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const trueErrorCount = useMemo(() => logs.filter(l => l.type === 'error').length, [logs]);

  useEffect(() => {
    if (!rawCollection || !username) return;
    
    let isMounted = true;
    
    const loadEndDates = async () => {
      setLoadState('loading');
      try {
        const endDatesMap = await fetchEndDates(username);
        
        if (!isMounted) return;
        
        const newRows: DateFixerRow[] = [];
        
        for (const list of rawCollection.lists) {
          for (const entry of list.entries) {
            if (entry.status === 'PLANNING' || entry.status === 'CURRENT') continue;
            const mediaId = entry.media.id;
            const extraData = endDatesMap.get(mediaId);
            
            const resolved = resolveEffectiveEndDate(
              extraData?.endDate,
              extraData?.startDate,
              extraData?.airingStatus,
              entry.status
            );
            
            let dDays: number | null = null;
            if (entry.completedAt?.year && resolved.date?.year) {
              const watchDateObj = fuzzyDateToDate(entry.completedAt);
              const animeEndDateObj = fuzzyDateToDate(resolved.date);
              dDays = dateDiffDays(watchDateObj, animeEndDateObj);
            }
            
            newRows.push({
              mediaId,
              title: entry.media.title.english || entry.media.title.romaji || `Media ${mediaId}`,
              listStatus: entry.status,
              watchDate: entry.completedAt || null,
              pendingWatchDate: null,
              hasPendingChange: false,
              animeEndDate: resolved.date,
              endDateSource: resolved.source,
              discrepancyDays: dDays,
              updatedAt: entry.updatedAt ?? extraData?.updatedAt ?? null,
            });
          }
        }
        
        setRows(newRows);
        setLoadState('ready');
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(err.message || 'Failed to fetch anime end dates.');
        setLoadState('error');
      }
    };
    
    loadEndDates();
    
    return () => { isMounted = false; };
  }, [rawCollection, username]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const u = await verifyAniListToken(token);
      setVerifiedUsername(u);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USERNAME_STORAGE_KEY, u);
    } catch (err: any) {
      setVerifyError(err.message || 'Failed to verify token.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearToken = () => {
    setToken('');
    setVerifiedUsername(null);
    setVerifyError(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
  };

  const handleResetToEndDate = (mediaId: number) => {
    const row = rows.find(r => r.mediaId === mediaId);
    if (row && row.animeEndDate) {
      handleUpdateDate(mediaId, row.animeEndDate);
    }
  };

  const handleResetToLastUpdate = (mediaId: number) => {
    const row = rows.find(r => r.mediaId === mediaId);
    if (!row) return;
    const updateDate = unixTimestampToFuzzyDate(row.updatedAt);
    if (updateDate && updateDate.year) {
      handleUpdateDate(mediaId, updateDate);
    }
  };

  const handleClearDate = (mediaId: number) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(mediaId, null);
    setPendingChanges(newChanges);
    
    const newStatuses = new Map(applyStatuses);
    newStatuses.delete(mediaId);
    setApplyStatuses(newStatuses);
  };

  const handleUndoChange = (mediaId: number) => {
    const newChanges = new Map(pendingChanges);
    newChanges.delete(mediaId);
    setPendingChanges(newChanges);
    
    const newStatuses = new Map(applyStatuses);
    newStatuses.delete(mediaId);
    setApplyStatuses(newStatuses);
  };

  const handleUpdateDate = (mediaId: number, newDate: FuzzyDate | null) => {
    const row = rows.find(r => r.mediaId === mediaId);
    const newChanges = new Map(pendingChanges);
    
    const isOriginal = (
      (!newDate && !row?.watchDate) ||
      (newDate && row?.watchDate &&
        newDate.year === row.watchDate.year &&
        (newDate.month || null) === (row.watchDate.month || null) &&
        (newDate.day || null) === (row.watchDate.day || null)
      )
    );

    if (isOriginal) {
      newChanges.delete(mediaId);
    } else {
      newChanges.set(mediaId, newDate);
    }
    setPendingChanges(newChanges);
    
    const newStatuses = new Map(applyStatuses);
    newStatuses.delete(mediaId);
    setApplyStatuses(newStatuses);
  };

  const handleBatchUpdate = (updates: Array<{ mediaId: number; date: FuzzyDate }>) => {
    const newChanges = new Map(pendingChanges);
    const newStatuses = new Map(applyStatuses);
    for (const { mediaId, date } of updates) {
      newChanges.set(mediaId, date);
      newStatuses.delete(mediaId);
    }
    setPendingChanges(newChanges);
    setApplyStatuses(newStatuses);
  };

  const handleExport = () => {
    const patches: DatePatch[] = Array.from(pendingChanges.entries()).map(([mediaId, completedAt]) => {
      const title = rows.find(r => r.mediaId === mediaId)?.title || String(mediaId);
      return { mediaId, title, completedAt };
    });
    
    const blob = new Blob([JSON.stringify(patches, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `anilist-date-patches-${username}-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPatches = (patches: DatePatch[]) => {
    let importedCount = 0;
    let ignoredCount = 0;

    const newChanges = new Map(pendingChanges);
    const newStatuses = new Map(applyStatuses);

    for (const patch of patches) {
      if (!patch || typeof patch.mediaId !== 'number') continue;
      const row = rows.find(r => r.mediaId === patch.mediaId);
      if (!row) continue;

      const pYear = patch.completedAt?.year ?? null;
      const pMonth = patch.completedAt?.month ?? null;
      const pDay = patch.completedAt?.day ?? null;

      const rYear = row.watchDate?.year ?? null;
      const rMonth = row.watchDate?.month ?? null;
      const rDay = row.watchDate?.day ?? null;

      const isSameDate = (
        pYear === rYear &&
        pMonth === rMonth &&
        pDay === rDay
      );

      if (isSameDate) {
        // If imported matches original date, does not count as edited/pending row
        newChanges.delete(patch.mediaId);
        newStatuses.delete(patch.mediaId);
        ignoredCount++;
      } else {
        newChanges.set(patch.mediaId, patch.completedAt ?? null);
        newStatuses.delete(patch.mediaId);
        importedCount++;
      }
    }

    setPendingChanges(newChanges);
    setApplyStatuses(newStatuses);

    setImportNotice(
      `Imported ${importedCount} pending change${importedCount === 1 ? '' : 's'}${
        ignoredCount > 0 ? ` (${ignoredCount} matched original dates and were not marked pending)` : ''
      }.`
    );
  };

  const handleCancelApply = () => {
    isCancelledRef.current = true;
  };

  const handleApply = async () => {
    if (!verifiedUsername || !token || pendingChanges.size === 0) return;
    
    setIsApplying(true);
    isCancelledRef.current = false;

    let currentBatch: Array<[number, FuzzyDate | null]> = Array.from(pendingChanges.entries());
    const overallTotal = currentBatch.length;
    let batchNumber = 1;
    let intervalSec = 1;
    let cumulativeTrueErrors = 0;

    const sleepWithCancel = async (ms: number) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        if (isCancelledRef.current) break;
        await new Promise(r => setTimeout(r, Math.min(200, ms - (Date.now() - start))));
      }
    };

    while (currentBatch.length > 0 && !isCancelledRef.current) {
      const nextBatch: Array<[number, FuzzyDate | null]> = [];
      let failedInThisBatch = 0;

      // Log start of batch immediately
      setLogs(prev => [
        {
          id: `batch-${Date.now()}-${batchNumber}`,
          timestamp: new Date().toLocaleTimeString(),
          batch: batchNumber,
          mediaId: 0,
          title: `Batch ${batchNumber} Started`,
          type: 'info',
          message: `Processing ${currentBatch.length} item(s) with ${intervalSec}s interval...`
        },
        ...prev
      ]);

      setApplyProgress({
        batch: batchNumber,
        intervalSec,
        done: 0,
        totalInBatch: currentBatch.length,
        overallTotal,
        retryingCount: 0,
        trueErrorsCount: cumulativeTrueErrors
      });

      for (let i = 0; i < currentBatch.length; i++) {
        if (isCancelledRef.current) {
          setLogs(prev => [
            {
              id: `${Date.now()}-cancelled`,
              timestamp: new Date().toLocaleTimeString(),
              batch: batchNumber,
              mediaId: 0,
              title: 'Batch Execution',
              type: 'info',
              message: 'Batch processing stopped by user.'
            },
            ...prev
          ]);
          break;
        }

        const [mediaId, date] = currentBatch[i];
        const row = rows.find(r => r.mediaId === mediaId);
        const title = row?.title || `Media ${mediaId}`;
        const tryLogId = `try-${Date.now()}-${mediaId}`;

        // Immediately add in-progress log entry for current attempt
        setLogs(prev => [
          {
            id: tryLogId,
            timestamp: new Date().toLocaleTimeString(),
            batch: batchNumber,
            mediaId,
            title,
            type: 'info',
            message: `Sending update to AniList: ${fuzzyDateLabel(date)} (Item ${i + 1} of ${currentBatch.length})...`
          },
          ...prev
        ]);

        setApplyProgress({
          batch: batchNumber,
          intervalSec,
          done: i,
          totalInBatch: currentBatch.length,
          overallTotal,
          retryingCount: nextBatch.length,
          trueErrorsCount: cumulativeTrueErrors,
          currentTitle: title,
          isWaitingCooldown: false
        });

        const result = await patchCompletedDate(mediaId, date, token);
        const timeStr = new Date().toLocaleTimeString();

        if (result.success) {
          // Update in-memory row data
          setRows(prevRows => prevRows.map(r => {
            if (r.mediaId === mediaId) {
              let dDays: number | null = null;
              if (date?.year && r.animeEndDate?.year) {
                const watchDateObj = fuzzyDateToDate(date);
                const animeEndDateObj = fuzzyDateToDate(r.animeEndDate);
                dDays = dateDiffDays(watchDateObj, animeEndDateObj);
              }
              return {
                ...r,
                watchDate: date,
                discrepancyDays: dDays
              };
            }
            return r;
          }));

          // Remove from pending changes
          setPendingChanges(prev => {
            const m = new Map(prev);
            m.delete(mediaId);
            return m;
          });

          // Mark success
          setApplyStatuses(prev => {
            const m = new Map(prev);
            m.set(mediaId, 'success');
            return m;
          });

          // Update in-flight log to success
          setLogs(prev => prev.map(l => l.id === tryLogId ? {
            ...l,
            timestamp: timeStr,
            type: 'success',
            message: `Successfully updated date to ${fuzzyDateLabel(date)}`
          } : l));
        } else if (result.isRetryable) {
          failedInThisBatch++;
          nextBatch.push([mediaId, date]);

          setApplyStatuses(prev => {
            const m = new Map(prev);
            m.set(mediaId, 'error');
            return m;
          });

          // Update in-flight log to retryable
          setLogs(prev => prev.map(l => l.id === tryLogId ? {
            ...l,
            timestamp: timeStr,
            type: 'retryable',
            message: `${result.errorMessage || 'Throttled / temporary error'}. Added to retry queue.`
          } : l));
        } else {
          // True error - not retryable
          failedInThisBatch++;
          cumulativeTrueErrors++;

          setApplyStatuses(prev => {
            const m = new Map(prev);
            m.set(mediaId, 'error');
            return m;
          });

          // Update in-flight log to error
          setLogs(prev => prev.map(l => l.id === tryLogId ? {
            ...l,
            timestamp: timeStr,
            type: 'error',
            message: result.errorMessage || 'True error reported by AniList. Will not retry.'
          } : l));
        }

        setApplyProgress({
          batch: batchNumber,
          intervalSec,
          done: i + 1,
          totalInBatch: currentBatch.length,
          overallTotal,
          retryingCount: nextBatch.length,
          trueErrorsCount: cumulativeTrueErrors,
          currentTitle: title,
          isWaitingCooldown: i < currentBatch.length - 1
        });

        // Delay between calls in this batch
        if (i < currentBatch.length - 1 && !isCancelledRef.current) {
          const waitTimeMs = Math.max(intervalSec * 1000, (result.retryAfterSeconds || 0) * 1000);
          await sleepWithCancel(waitTimeMs);
        }
      }

      if (isCancelledRef.current) break;

      // Stop condition: stops when number in batch is the number of failures
      if (failedInThisBatch === currentBatch.length) {
        setLogs(prev => [
          {
            id: `${Date.now()}-all-failed`,
            timestamp: new Date().toLocaleTimeString(),
            batch: batchNumber,
            mediaId: 0,
            title: 'Batch Complete',
            type: 'error',
            message: `Stopped: all ${failedInThisBatch} item(s) in batch ${batchNumber} failed. No progress could be made.`
          },
          ...prev
        ]);
        break;
      }

      if (nextBatch.length === 0) {
        setLogs(prev => [
          {
            id: `${Date.now()}-all-done`,
            timestamp: new Date().toLocaleTimeString(),
            batch: batchNumber,
            mediaId: 0,
            title: 'Batch Complete',
            type: 'info',
            message: 'All retryable batches completed.'
          },
          ...prev
        ]);
        break;
      }

      // Prepare next batch
      currentBatch = nextBatch;
      batchNumber++;
      intervalSec = intervalSec * 2;

      setLogs(prev => [
        {
          id: `${Date.now()}-next-batch`,
          timestamp: new Date().toLocaleTimeString(),
          batch: batchNumber,
          mediaId: 0,
          title: 'Next Batch Scheduled',
          type: 'info',
          message: `Starting Batch ${batchNumber} with ${currentBatch.length} retryable item(s) using a ${intervalSec}s interval.`
        },
        ...prev
      ]);

      await sleepWithCancel(intervalSec * 1000);
    }

    setIsApplying(false);
  };

  const handleReset = () => {
    setPendingChanges(new Map());
    setApplyStatuses(new Map());
  };

  if (!rawCollection || !username) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <div className="text-center p-8 bg-[#131722] rounded-xl border border-[#1E2538]">
          <p className="text-[#94A3B8] mb-4">No profile loaded. Go back and search for a username first.</p>
          <button
            onClick={onNavigateBack}
            className="px-4 py-2 bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 rounded-md hover:bg-[#00F0FF]/20 cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F1F5F9]">Date Fixer</h1>
              <p className="text-sm text-[#94A3B8]">Fix watch date discrepancies in your AniList catalogue</p>
            </div>
          </div>
          
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-4 py-2 bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] text-[#94A3B8] hover:text-[#F1F5F9] rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </button>
        </div>
        
        {importNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm flex items-center justify-between">
            <span className="font-mono">{importNotice}</span>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="text-cyan-400 hover:text-white px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <TokenBanner
          token={token}
          verifiedUsername={verifiedUsername}
          onTokenChange={setToken}
          onVerify={handleVerify}
          onClearToken={handleClearToken}
          isVerifying={isVerifying}
          verifyError={verifyError}
        />
        
        {loadState === 'loading' && (
          <div className="p-12 text-center text-[#94A3B8]">
            Loading dates from AniList...
          </div>
        )}
        
        {loadState === 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
            {loadError}
          </div>
        )}
        
        {loadState === 'ready' && (
          <DateFixerTable
            rows={rows}
            pendingChanges={pendingChanges}
            applyStatuses={applyStatuses}
            onResetToEndDate={handleResetToEndDate}
            onResetToLastUpdate={handleResetToLastUpdate}
            onClearDate={handleClearDate}
            onUndoChange={handleUndoChange}
            onUpdateDate={handleUpdateDate}
            onBatchUpdate={handleBatchUpdate}
          />
        )}

      <PatchActionsBar
        pendingCount={pendingChanges.size}
        onExport={handleExport}
        onImport={handleImportPatches}
        onApply={handleApply}
        onCancel={handleCancelApply}
        onReset={handleReset}
        isApplying={isApplying}
        hasToken={!!verifiedUsername}
        applyProgress={applyProgress}
        errorCount={trueErrorCount}
        onOpenLog={() => setIsLogOpen(true)}
      />

      <PatchLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />
    </div>
  );
};
