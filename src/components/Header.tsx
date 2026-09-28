import React from 'react';
import { Sparkles, Terminal } from 'lucide-react';

interface HeaderProps {
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  return (
    <header className="w-full border-b border-[#1E2538] bg-[#0E1118]/80 backdrop-blur-md sticky top-0 z-50 py-3.5 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div
          onClick={onNavigateHome}
          className={`flex items-center gap-3 ${onNavigateHome ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        >
          <div className="w-9 h-9 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
              AnimeSummary
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#A953F6]/15 text-[#BD86F8] border border-[#A953F6]/30">
                LLM Optimizer
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Mathematical taste profiling & context compression for AniList
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
          <span>v1.0 (GraphQL)</span>
        </div>
      </div>
    </header>
  );
};
