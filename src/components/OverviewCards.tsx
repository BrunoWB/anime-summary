import React from 'react';
import { TasteProfile } from '../types/anilist.ts';
import { Film, Star, AlertTriangle, Clock } from 'lucide-react';

interface OverviewCardsProps {
  profile: TasteProfile;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ profile }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Total Anime */}
      <div className="bg-[#19202F] border border-[#1E2538] rounded-xl p-4.5 hover:border-[#00F0FF]/30 transition-all shadow-md">
        <div className="flex items-center justify-between text-[#94A3B8] mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">Catalog Scale</span>
          <div className="p-2 rounded-lg bg-[#0E1118] text-[#00F0FF]">
            <Film className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-[#F1F5F9] font-mono">
          {profile.totalEntries} <span className="text-xs font-normal text-[#94A3B8]">shows</span>
        </div>
        <div className="text-xs text-[#94A3B8] mt-1.5 flex items-center gap-1.5">
          <span className="text-[#00F0FF] font-semibold">{profile.completedCount}</span> completed ·{' '}
          <span className="text-[#BD86F8] font-semibold">{profile.watchingCount}</span> watching
        </div>
      </div>

      {/* Mean Score */}
      <div className="bg-[#19202F] border border-[#1E2538] rounded-xl p-4.5 hover:border-[#00F0FF]/30 transition-all shadow-md">
        <div className="flex items-center justify-between text-[#94A3B8] mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">Mean Rating</span>
          <div className="p-2 rounded-lg bg-[#0E1118] text-[#F2741D]">
            <Star className="w-4 h-4 fill-[#F2741D]/20 text-[#F2741D]" />
          </div>
        </div>
        <div className="text-2xl font-black text-[#F1F5F9] font-mono">
          {profile.meanScore} <span className="text-xs font-normal text-[#94A3B8]">/ 10</span>
        </div>
        <div className="text-xs text-[#94A3B8] mt-1.5">
          StdDev: <span className="font-mono text-[#F1F5F9]">±{profile.stdDev}</span> · Median: <span className="font-mono text-[#F1F5F9]">{profile.p50}</span>
        </div>
      </div>

      {/* Time Invested */}
      <div className="bg-[#19202F] border border-[#1E2538] rounded-xl p-4.5 hover:border-[#00F0FF]/30 transition-all shadow-md">
        <div className="flex items-center justify-between text-[#94A3B8] mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">Time Invested</span>
          <div className="p-2 rounded-lg bg-[#0E1118] text-[#00F0FF]">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-[#F1F5F9] font-mono">
          ~{profile.totalHoursWatched.toLocaleString()} <span className="text-xs font-normal text-[#94A3B8]">hours</span>
        </div>
        <div className="text-xs text-[#94A3B8] mt-1.5">
          Avg commitment: <span className="font-mono text-[#F1F5F9]">{(profile.averageCommitmentRatio * 100).toFixed(0)}%</span> ep. before drop
        </div>
      </div>

      {/* Drop Rate */}
      <div className="bg-[#19202F] border border-[#1E2538] rounded-xl p-4.5 hover:border-[#00F0FF]/30 transition-all shadow-md">
        <div className="flex items-center justify-between text-[#94A3B8] mb-2">
          <span className="text-xs font-medium uppercase tracking-wider font-mono">Drop Behavior</span>
          <div className="p-2 rounded-lg bg-[#0E1118] text-[#E35913]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-[#F1F5F9] font-mono">
          {profile.dropRatePercent}% <span className="text-xs font-normal text-[#94A3B8]">({profile.droppedCount})</span>
        </div>
        <div className="text-xs text-[#94A3B8] mt-1.5">
          Top Genre: <span className="font-bold text-[#A953F6]">{profile.topGenres[0]?.name || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};
