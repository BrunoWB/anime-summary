import React, { useState } from 'react';
import { TasteProfile, TasteBiases } from '../types/anilist.ts';
import { generateLlmMarkdown, downloadFile } from '../algorithms/llmSerializer.ts';
import {
  Download,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  MessageSquareCode,
  Copy,
  Sparkles,
  Flame,
  Compass,
  ListOrdered
} from 'lucide-react';

interface ResultsDownloadCardProps {
  profile: TasteProfile;
  biases?: TasteBiases;
}

interface ProposedQuery {
  id: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  prompt: string;
}

const PROPOSED_QUERIES: ProposedQuery[] = [
  {
    id: 'recommendations',
    title: 'Precision Recommendation Engine',
    badge: 'Discovery',
    icon: <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />,
    prompt: `I have attached my mathematical anime taste profile and compressed watchlist. Based on my Bayesian genre/studio affinities, contrarian preferences, and favored micro-themes:
1. Recommend 5 anime I have NOT watched.
2. For each recommendation, explain specifically which of my top micro-tropes it fulfills and which favored animation studio/director style it matches.
3. Explicitly verify that none of these recommendations contain my drop-trigger tropes.`
  },
  {
    id: 'roast',
    title: 'Taste Roast & Psychological Diagnostic',
    badge: 'Humor & Critique',
    icon: <Flame className="w-3.5 h-3.5 text-[#F2741D]" />,
    prompt: `Analyze my attached anime taste profile and watch history. Give me a brutally honest, humorous roast of my taste. Call out my glaring contradictions (e.g. shows I dropped vs shows I rated 10, or high-profile consensus masterworks I rejected), diagnose what kind of anime fan I actually am, and tell me the one hard truth I need to hear about my watching habits.`
  },
  {
    id: 'hidden-gems',
    title: 'Hidden Gems & Niche Exploration',
    badge: 'Underground',
    icon: <Compass className="w-3.5 h-3.5 text-[#A953F6]" />,
    prompt: `Examine my attached anime taste profile. I want to discover overlooked or niche anime that fit my specific tastes.
1. Identify 4 high-quality 'hidden gems' (avoid mainstream blockbusters or shows in the AniList top 100 popularity).
2. Prioritize shows from my preferred release eras and favored themes.
3. Explain why the broader community may have overlooked them, but why my profile indicates I would rate them highly.`
  },
  {
    id: 'triage',
    title: 'Plan-to-Watch Prioritizer & Triage',
    badge: 'Triage',
    icon: <ListOrdered className="w-3.5 h-3.5 text-[#BD86F8]" />,
    prompt: `Here is my anime taste profile. In the compressed watchlist, examine the entries marked with status 'Plan'.
1. Rank the top 5 shows from my planning list that I should watch next.
2. Score each one based on alignment with my highest Bayesian genre scores and favorite studios.
3. Flag any shows on my plan list that carry high drop-risk based on my past dropped tropes.`
  }
];

export const ResultsDownloadCard: React.FC<ResultsDownloadCardProps> = ({ profile, biases }) => {
  const [downloadedMd, setDownloadedMd] = useState(false);
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQueries, setShowQueries] = useState(false);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const markdownContent = React.useMemo(() => generateLlmMarkdown(profile, biases), [profile, biases]);

  const activeBiasCount = React.useMemo(() => {
    if (!biases) return 0;
    let count = 0;
    for (const key of ['genres', 'eras', 'tropes', 'sources', 'studios'] as const) {
      if (biases[key]) {
        count += Object.values(biases[key]).filter((b) => b !== 0).length;
      }
    }
    return count;
  }, [biases]);

  const handleDownloadMarkdown = () => {
    const filename = `${profile.username.replace(/[^a-zA-Z0-9_-]/g, '_')}_anime_summary.md`;
    downloadFile(markdownContent, filename, 'text/markdown;charset=utf-8');
    setDownloadedMd(true);
    setTimeout(() => setDownloadedMd(false), 3000);
  };

  const handleDownloadJson = () => {
    const filename = `${profile.username.replace(/[^a-zA-Z0-9_-]/g, '_')}_profile.json`;
    const jsonStr = JSON.stringify(profile, null, 2);
    downloadFile(jsonStr, filename, 'application/json;charset=utf-8');
    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 3000);
  };

  const handleCopyQuery = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2500);
  };

  const estimatedTokens = Math.round(markdownContent.length / 4);

  return (
    <div className="bg-[#19202F] border-2 border-[#00F0FF]/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,240,255,0.12)] space-y-6 w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E2538] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#00F0FF]" />
            <h3 className="text-lg font-bold text-[#F1F5F9]">
              LLM Ingestion Payload Ready
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Dense mathematical profile + {profile.totalEntries} compressed anime catalogue entries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeBiasCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-right font-mono">
              <div className="text-[10px] text-[#00F0FF] uppercase font-bold">Active Biases</div>
              <div className="text-sm font-bold text-[#00F0FF]">{activeBiasCount} Steered</div>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-[#0E1118] border border-[#1E2538] text-right font-mono">
            <div className="text-[10px] text-[#94A3B8] uppercase">Est. LLM Tokens</div>
            <div className="text-sm font-bold text-[#00F0FF]">~{estimatedTokens.toLocaleString()}</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-right font-mono">
            <div className="text-[10px] text-[#94A3B8] uppercase">Token Saving</div>
            <div className="text-sm font-bold text-[#00F0FF]">~98%</div>
          </div>
        </div>
      </div>

      {/* Prominent Action Area */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleDownloadMarkdown}
          className="w-full sm:flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#38F2FD] hover:from-[#38F2FD] hover:to-[#00F0FF] active:from-[#01B4D7] active:to-[#01B4D7] text-[#0B0D13] font-extrabold text-base transition-all shadow-[0_0_25px_rgba(0,240,255,0.35)] flex items-center justify-center gap-3 cursor-pointer group"
        >
          {downloadedMd ? (
            <>
              <Check className="w-5 h-5 text-[#0B0D13]" />
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>Download LLM Summary (.md)</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownloadJson}
          className="w-full sm:w-auto py-4 px-6 rounded-xl bg-[#0E1118] hover:bg-[#131722] border border-[#1E2538] hover:border-[#A953F6]/50 text-[#F1F5F9] font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          {downloadedJson ? (
            <>
              <Check className="w-4 h-4 text-[#A953F6]" />
              <span>JSON Saved!</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-[#A953F6]" />
              <span>Download Raw Profile (.json)</span>
            </>
          )}
        </button>
      </div>

      {/* Action Toggles: Payload Preview & Proposed Queries */}
      <div className="border-t border-[#1E2538] pt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setShowPreview(!showPreview);
              if (!showPreview) setShowQueries(false);
            }}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showPreview
                ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]'
                : 'bg-[#0E1118] border-[#1E2538] text-[#94A3B8] hover:text-[#00F0FF] hover:border-[#00F0FF]/40'
            }`}
          >
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showPreview ? 'Hide Payload Preview' : 'Show Payload Preview'}</span>
          </button>

          <button
            onClick={() => {
              setShowQueries(!showQueries);
              if (!showQueries) setShowPreview(false);
            }}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showQueries
                ? 'bg-[#A953F6]/15 border-[#A953F6] text-[#BD86F8]'
                : 'bg-[#0E1118] border-[#1E2538] text-[#94A3B8] hover:text-[#BD86F8] hover:border-[#A953F6]/40'
            }`}
          >
            <MessageSquareCode className="w-3.5 h-3.5 text-[#A953F6]" />
            {showQueries ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showQueries ? 'Hide Proposed Queries' : 'Show Proposed Queries'}</span>
          </button>
        </div>

        {/* Payload Preview Body */}
        {showPreview && (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-[#0E1118] border border-[#1E2538] font-mono text-[11px] text-[#94A3B8] overflow-x-auto max-h-80 select-all leading-relaxed whitespace-pre-wrap">
              {markdownContent}
            </pre>
          </div>
        )}

        {/* Proposed Queries Body */}
        {showQueries && (
          <div className="space-y-3 pt-2">
            <div className="text-xs text-[#94A3B8]">
              Copy any of these tailored prompts alongside your downloaded summary file into ChatGPT, Claude, or Gemini:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROPOSED_QUERIES.map((q) => {
                const isCopied = copiedQueryId === q.id;
                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-[#0E1118] border border-[#1E2538] hover:border-[#A953F6]/40 transition-all flex flex-col justify-between gap-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-xs text-[#F1F5F9]">
                        {q.icon}
                        <span>{q.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#19202F] text-[#94A3B8] border border-[#1E2538]">
                        {q.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#94A3B8] font-mono line-clamp-3 leading-relaxed bg-[#131722] p-2 rounded-lg border border-[#1E2538]/60">
                      {q.prompt}
                    </p>

                    <button
                      onClick={() => handleCopyQuery(q.id, q.prompt)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCopied
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                          : 'bg-[#19202F] hover:bg-[#232C3F] text-[#F1F5F9] border border-[#1E2538]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>Copy Query</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
