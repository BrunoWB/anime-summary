import React, { useState } from 'react';
import { Search, Loader2, Database, ArrowRight, History, Trash2 } from 'lucide-react';
import { CachedQueryMeta } from '../services/cacheService.ts';

interface SearchHeroProps {
  onSearch: (username: string) => void;
  onLoadMock: () => void;
  cachedMeta: CachedQueryMeta | null;
  onLoadCached: () => void;
  onDeleteCached: () => void;
  isLoading: boolean;
  compact?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  onSearch,
  onLoadMock,
  cachedMeta,
  onLoadCached,
  onDeleteCached,
  isLoading,
  compact = false
}) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSearch(username.trim());
    }
  };

  if (compact) {
    return (
      <div className="w-full bg-[#131722] border-b border-[#1E2538] py-4 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter AniList username..."
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2 bg-[#0E1118] border border-[#1E2538] focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] rounded-lg text-sm text-[#F1F5F9] placeholder-[#555E6E] outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="px-5 py-2 rounded-lg bg-[#00F0FF] hover:bg-[#38F2FD] active:bg-[#01B4D7] text-[#0B0D13] font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)] shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Fetch
            </button>
          </form>

          <div className="flex items-center gap-2">
            {cachedMeta && (
              <div className="inline-flex items-center rounded-lg border border-[#A953F6]/40 bg-[#0E1118] overflow-hidden">
                <button
                  onClick={onLoadCached}
                  disabled={isLoading}
                  className="text-xs text-[#BD86F8] hover:text-[#F1F5F9] transition-colors flex items-center gap-1.5 font-mono px-3 py-1.5 hover:bg-[#A953F6]/20"
                >
                  <History className="w-3.5 h-3.5 text-[#A953F6]" />
                  <span>Cached: {cachedMeta.username}</span>
                </button>
                <button
                  onClick={onDeleteCached}
                  disabled={isLoading}
                  title="Clear saved query"
                  className="px-2 py-1.5 text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 transition-colors border-l border-[#A953F6]/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onLoadMock}
              disabled={isLoading}
              className="text-xs text-[#94A3B8] hover:text-[#00F0FF] transition-colors flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-lg border border-[#1E2538] hover:border-[#00F0FF]/40 bg-[#0E1118]"
            >
              <Database className="w-3.5 h-3.5" />
              Reload Sample Dump
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-xl w-full space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-mono">
            <span>AniList GraphQL V1</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"></span>
            <span>Mathematical Taste Extraction</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
            Compress Your Anime List <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#A953F6] to-[#BD86F8]">
              Ready for Any LLM
            </span>
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
            Reduces 500,000+ tokens of raw API clutter into an anime-centric, mathematically smoothed taste profile with Bayesian rankings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F0FF]/50 to-[#A953F6]/50 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
            <div className="relative flex items-center bg-[#0E1118] border border-[#1E2538] group-hover:border-[#00F0FF]/50 rounded-xl p-1.5 transition-all shadow-xl">
              <Search className="w-5 h-5 ml-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your AniList username..."
                disabled={isLoading}
                className="w-full bg-transparent px-3 py-2.5 text-base text-[#F1F5F9] placeholder-[#555E6E] outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="px-6 py-2.5 rounded-lg bg-[#00F0FF] hover:bg-[#38F2FD] active:bg-[#01B4D7] text-[#0B0D13] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Summarize</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick action buttons: Cached query directly above the Dump button */}
        <div className="pt-2 flex flex-col items-center gap-2.5">
          {cachedMeta && (
            <div className="inline-flex items-center rounded-lg border border-[#A953F6]/50 bg-[#19202F] shadow-[0_0_15px_rgba(169,83,246,0.15)] overflow-hidden transition-all hover:border-[#A953F6]">
              <button
                onClick={onLoadCached}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-mono text-[#F1F5F9] hover:text-[#00F0FF] transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4 text-[#A953F6]" />
                <span>
                  Load Saved: <strong className="text-[#00F0FF]">{cachedMeta.username}</strong> ({cachedMeta.count} shows · {formatRelativeTime(cachedMeta.timestamp)})
                </span>
              </button>
              <button
                onClick={onDeleteCached}
                disabled={isLoading}
                title="Delete saved query"
                className="px-3 py-2 text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 transition-colors border-l border-[#A953F6]/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onLoadMock}
            disabled={isLoading}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#94A3B8] hover:text-[#00F0FF] transition-all px-4 py-2 rounded-lg border border-[#1E2538] hover:border-[#00F0FF]/30 bg-[#131722]/60 hover:bg-[#19202F]"
          >
            <Database className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Load Sample Dump (414 Anime Offline Demo)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
