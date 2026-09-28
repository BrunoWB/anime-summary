import React from 'react';
import { TasteProfile } from '../types/anilist.ts';
import { ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface ContrarianViewProps {
  profile: TasteProfile;
}

export const ContrarianView: React.FC<ContrarianViewProps> = ({ profile }) => {
  return (
    <div className="bg-[#131722] border border-[#1E2538] rounded-xl p-5 shadow-sm space-y-4 w-full">
      <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#00F0FF]" />
          <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
            Divergence Residuals (Δ vs AniList Community Consensus)
          </h3>
        </div>
        <span className="text-[11px] text-[#94A3B8] font-mono">High-Signal Taste Differentiators</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contrarian Loves */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF]">
            <ArrowUpRight className="w-4 h-4" />
            <span>Contrarian Favorites (User Loved &gt; Community)</span>
          </div>
          <div className="space-y-1.5">
            {profile.contrarianLoves.length === 0 ? (
              <div className="text-xs text-[#555E6E] italic py-2">No strong contrarian favorites detected.</div>
            ) : (
              profile.contrarianLoves.map((item) => (
                <div
                  key={item.title}
                  className="p-2.5 rounded-lg bg-[#0E1118] border border-[#1E2538] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="font-medium text-[#F1F5F9] truncate flex-1">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-[#94A3B8]">Comm: {item.communityScore}</span>
                    <span className="text-[#F1F5F9] font-bold">User: {item.userScore}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-bold text-[11px]">
                      +{item.diff}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contrarian Dislikes */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F2741D]">
            <ArrowDownRight className="w-4 h-4" />
            <span>Contrarian Rejections (Community Loved &gt; User)</span>
          </div>
          <div className="space-y-1.5">
            {profile.contrarianDislikes.length === 0 ? (
              <div className="text-xs text-[#555E6E] italic py-2">No strong contrarian dislikes detected.</div>
            ) : (
              profile.contrarianDislikes.map((item) => (
                <div
                  key={item.title}
                  className="p-2.5 rounded-lg bg-[#0E1118] border border-[#1E2538] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="font-medium text-[#F1F5F9] truncate flex-1">
                    {item.title}
                    {item.status.includes('DROP') && (
                      <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-[#E35913]/20 text-[#F59442]">
                        DROPPED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-[#94A3B8]">Comm: {item.communityScore}</span>
                    <span className="text-[#F1F5F9] font-bold">User: {item.userScore || 'Drop'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#F2741D]/15 text-[#F2741D] font-bold text-[11px]">
                      {item.diff}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
