import React, { useState, useRef, useEffect } from 'react';
import { TasteProfile, TasteBiases, TropeSalienceItem, AffinityItem } from '../types/anilist.ts';
import { NumberStepper } from './NumberStepper.tsx';
import {
  Sparkles,
  Building,
  Tag,
  ThumbsDown,
  Calendar,
  BookOpen,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Minus,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface AffinitiesViewProps {
  profile: TasteProfile;
  biases: TasteBiases;
  onBiasChange: (category: keyof TasteBiases, name: string, bias: number) => void;
  onResetBiases: () => void;
  promotedGenres?: string[];
  promotedPenalizedGenres?: string[];
  promotedStudios?: string[];
  demotedGenres?: string[];
  demotedPenalizedGenres?: string[];
  demotedStudios?: string[];
  onPromoteGenre?: (name: string) => void;
  onDemoteGenre?: (name: string) => void;
  onPromotePenalizedGenre?: (name: string) => void;
  onDemotePenalizedGenre?: (name: string) => void;
  onPromoteStudio?: (name: string) => void;
  onDemoteStudio?: (name: string) => void;
  includedTropes?: string[];
  excludedTropes?: string[];
  onIncludeTrope?: (tag: string, initialBias?: number) => void;
  onRemoveTrope?: (tag: string) => void;
}

export const AffinitiesView: React.FC<AffinitiesViewProps> = ({
  profile,
  biases,
  onBiasChange,
  onResetBiases,
  promotedGenres = [],
  promotedPenalizedGenres = [],
  promotedStudios = [],
  demotedGenres = [],
  demotedPenalizedGenres = [],
  demotedStudios = [],
  onPromoteGenre,
  onDemoteGenre,
  onPromotePenalizedGenre,
  onDemotePenalizedGenre,
  onPromoteStudio,
  onDemoteStudio,
  includedTropes = [],
  excludedTropes = [],
  onIncludeTrope,
  onRemoveTrope
}) => {
  const [isDragOverGenreTop, setIsDragOverGenreTop] = useState(false);
  const [isDragOverGenrePenalized, setIsDragOverGenrePenalized] = useState(false);
  const [isGenrePoolExpanded, setIsGenrePoolExpanded] = useState(false);
  const [showStudioContenders, setShowStudioContenders] = useState(false);
  const [isDragOverFavored, setIsDragOverFavored] = useState(false);
  const [isDragOverHated, setIsDragOverHated] = useState(false);
  const [isPoolExpanded, setIsPoolExpanded] = useState(false);

  // Reset deferred ordering when profile changes
  useEffect(() => {
    setGenreOrder([]);
    setStudioOrder([]);
    setPenalizedOrder([]);
    setFavoredOrder([]);
    setHatedOrder([]);
  }, [profile.username]);

  const isGenrePromoted = (name: string) => promotedGenres.includes(name);
  const isPenalizedPromoted = (name: string) => promotedPenalizedGenres.includes(name);
  const isStudioPromoted = (name: string) => promotedStudios.includes(name);

  const handlePromoteGenre = (name: string) => {
    if (onPromoteGenre) {
      onPromoteGenre(name);
    } else {
      onBiasChange('genres', name, 0);
    }
  };

  const handleDemoteGenre = (name: string) => {
    if (onDemoteGenre) {
      onDemoteGenre(name);
    } else {
      onBiasChange('genres', name, 0);
    }
  };

  const handlePromotePenalizedGenre = (name: string) => {
    if (onPromotePenalizedGenre) {
      onPromotePenalizedGenre(name);
    } else {
      onBiasChange('genres', name, 0);
    }
  };

  const handleDemotePenalizedGenre = (name: string) => {
    if (onDemotePenalizedGenre) {
      onDemotePenalizedGenre(name);
    } else {
      onBiasChange('genres', name, 0);
    }
  };

  const handlePromoteStudio = (name: string) => {
    if (onPromoteStudio) {
      onPromoteStudio(name);
    } else {
      onBiasChange('studios', name, 0);
    }
  };

  const handleDemoteStudio = (name: string) => {
    if (onDemoteStudio) {
      onDemoteStudio(name);
    } else {
      onBiasChange('studios', name, 0);
    }
  };

  const handleIncludeTrope = (tag: string, initialBias = 0) => {
    if (onIncludeTrope) {
      onIncludeTrope(tag, initialBias);
    } else {
      onBiasChange('tropes', tag, initialBias);
    }
  };

  const handleRemoveTrope = (tag: string) => {
    if (onRemoveTrope) {
      onRemoveTrope(tag);
    } else {
      onBiasChange('tropes', tag, 0);
    }
  };

  // All available genres candidate pool
  const allCandidateGenres = React.useMemo(() => {
    const list = [
      ...(profile.availableGenres || []),
      ...profile.topGenres,
      ...profile.contenderGenres,
      ...profile.penalizedGenres,
      ...(profile.contenderPenalizedGenres || [])
    ];
    const seen = new Set<string>();
    const res: AffinityItem[] = [];
    for (const g of list) {
      if (!seen.has(g.name)) {
        seen.add(g.name);
        res.push(g);
      }
    }
    return res;
  }, [profile.availableGenres, profile.topGenres, profile.contenderGenres, profile.penalizedGenres, profile.contenderPenalizedGenres]);

  // 1. Deferred Genre Order (prevents shifting while mouse is over NumberField)
  const [genreOrder, setGenreOrder] = useState<string[]>([]);
  const isHoveringGenreRef = useRef(false);

  const genreCandidateMap = React.useMemo(() => {
    const list = profile.topGenres.filter(g => !demotedGenres.includes(g.name));
    for (const c of allCandidateGenres) {
      if (isGenrePromoted(c.name) && !list.some(x => x.name === c.name)) {
        list.push(c);
      }
    }
    const map = new Map<string, typeof list[0] & { bias: number; steeredScore: number }>();
    for (const g of list) {
      const bias = biases.genres?.[g.name] || 0;
      const steeredScore = Math.max(0, Math.round((g.bayesianScore + bias) * 10) / 10);
      map.set(g.name, { ...g, bias, steeredScore });
    }
    return map;
  }, [profile.topGenres, allCandidateGenres, biases.genres, promotedGenres, demotedGenres]);

  const computeSortedGenreNames = () => {
    return Array.from(genreCandidateMap.values())
      .sort((a, b) => b.steeredScore - a.steeredScore)
      .map(g => g.name);
  };

  useEffect(() => {
    if (!isHoveringGenreRef.current) {
      setGenreOrder(computeSortedGenreNames());
    }
  }, [genreCandidateMap]);

  const handleGenreStepperEnter = () => {
    isHoveringGenreRef.current = true;
  };

  const handleGenreStepperLeave = () => {
    isHoveringGenreRef.current = false;
    setGenreOrder(computeSortedGenreNames());
  };

  const effectiveGenreOrder = genreOrder.length > 0 ? genreOrder : computeSortedGenreNames();
  const displayTopGenres = effectiveGenreOrder
    .map(name => genreCandidateMap.get(name))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // 1b. Deferred Penalized Genre Order
  const [penalizedOrder, setPenalizedOrder] = useState<string[]>([]);
  const isHoveringPenalizedRef = useRef(false);

  const penalizedCandidateMap = React.useMemo(() => {
    const list = profile.penalizedGenres.filter(g => !demotedPenalizedGenres.includes(g.name));
    for (const c of allCandidateGenres) {
      if (isPenalizedPromoted(c.name) && !list.some(x => x.name === c.name)) {
        list.push(c);
      }
    }
    const map = new Map<string, typeof list[0] & { bias: number; steeredScore: number }>();
    for (const g of list) {
      const bias = biases.genres?.[g.name] || 0;
      const steeredScore = Math.max(0, Math.round((g.bayesianScore + bias) * 10) / 10);
      map.set(g.name, { ...g, bias, steeredScore });
    }
    return map;
  }, [profile.penalizedGenres, allCandidateGenres, biases.genres, promotedPenalizedGenres, demotedPenalizedGenres]);

  const computeSortedPenalizedNames = () => {
    return Array.from(penalizedCandidateMap.values())
      .sort((a, b) => a.steeredScore - b.steeredScore)
      .map(g => g.name);
  };

  useEffect(() => {
    if (!isHoveringPenalizedRef.current) {
      setPenalizedOrder(computeSortedPenalizedNames());
    }
  }, [penalizedCandidateMap]);

  const handlePenalizedStepperEnter = () => {
    isHoveringPenalizedRef.current = true;
  };

  const handlePenalizedStepperLeave = () => {
    isHoveringPenalizedRef.current = false;
    setPenalizedOrder(computeSortedPenalizedNames());
  };

  const effectivePenalizedOrder = penalizedOrder.length > 0 ? penalizedOrder : computeSortedPenalizedNames();
  const displayPenalizedGenres = effectivePenalizedOrder
    .map(name => penalizedCandidateMap.get(name))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // Unassigned neutral genre library pool (ordered by user base affinity)
  const unassignedGenres = React.useMemo(() => {
    const topActive = new Set(displayTopGenres.map(g => g.name));
    const penalizedActive = new Set(displayPenalizedGenres.map(g => g.name));
    const seen = new Set<string>();
    const result: AffinityItem[] = [];

    for (const g of allCandidateGenres) {
      if (!topActive.has(g.name) && !penalizedActive.has(g.name) && !seen.has(g.name)) {
        seen.add(g.name);
        result.push(g);
      }
    }
    result.sort((a, b) => b.bayesianScore - a.bayesianScore || b.count - a.count);
    return result;
  }, [allCandidateGenres, displayTopGenres, displayPenalizedGenres]);

  // Genre Drag and Drop & Include Handlers
  const handleDragStartGenre = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.setData('application/genre', name);
  };

  const handleDropToGenreTop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverGenreTop(false);
    const name = e.dataTransfer.getData('application/genre') || e.dataTransfer.getData('text/plain');
    if (name) {
      handlePromoteGenre(name);
    }
  };

  const handleDropToGenrePenalized = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverGenrePenalized(false);
    const name = e.dataTransfer.getData('application/genre') || e.dataTransfer.getData('text/plain');
    if (name) {
      handlePromotePenalizedGenre(name);
    }
  };

  const handleIncludeGenreFromPool = (g: AffinityItem) => {
    const threshold = profile.meanScore > 0 ? profile.meanScore : 7.0;
    if (g.bayesianScore >= threshold) {
      handlePromoteGenre(g.name);
    } else {
      handlePromotePenalizedGenre(g.name);
    }
  };

  // 2. Deferred Studio Order (prevents shifting while mouse is over NumberField)
  const [studioOrder, setStudioOrder] = useState<string[]>([]);
  const isHoveringStudioRef = useRef(false);

  const studioCandidateMap = React.useMemo(() => {
    const list = profile.topStudios.filter(s => !demotedStudios.includes(s.name));
    for (const s of profile.contenderStudios) {
      if (isStudioPromoted(s.name) && !list.some(x => x.name === s.name)) {
        list.push(s);
      }
    }
    const map = new Map<string, typeof list[0] & { bias: number; steeredScore: number }>();
    for (const s of list) {
      const bias = biases.studios?.[s.name] || 0;
      const steeredScore = Math.max(0, Math.round((s.bayesianScore + bias) * 10) / 10);
      map.set(s.name, { ...s, bias, steeredScore });
    }
    return map;
  }, [profile.topStudios, profile.contenderStudios, biases.studios, promotedStudios, demotedStudios]);

  const computeSortedStudioNames = () => {
    return Array.from(studioCandidateMap.values())
      .sort((a, b) => b.steeredScore - a.steeredScore)
      .map(s => s.name);
  };

  useEffect(() => {
    if (!isHoveringStudioRef.current) {
      setStudioOrder(computeSortedStudioNames());
    }
  }, [studioCandidateMap]);

  // Contender studios that are NOT in top list: includes unpromoted contenders + demoted top studios
  const displayContenderStudios = React.useMemo(() => {
    const unpromoted = profile.contenderStudios.filter(s => !isStudioPromoted(s.name));
    const demoted = profile.topStudios.filter(s => demotedStudios.includes(s.name));
    return [...demoted, ...unpromoted].sort((a, b) => b.bayesianScore - a.bayesianScore);
  }, [profile.topStudios, profile.contenderStudios, promotedStudios, demotedStudios]);

  const handleStudioStepperEnter = () => {
    isHoveringStudioRef.current = true;
  };

  const handleStudioStepperLeave = () => {
    isHoveringStudioRef.current = false;
    setStudioOrder(computeSortedStudioNames());
  };

  const effectiveStudioOrder = studioOrder.length > 0 ? studioOrder : computeSortedStudioNames();
  const displayTopStudios = effectiveStudioOrder
    .map(name => studioCandidateMap.get(name))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // 3. Dynamic Micro-Tropes Map
  const tropeMap = React.useMemo(() => {
    const map = new Map<string, TropeSalienceItem>();
    for (const t of [...profile.lovedTropes, ...profile.hatedTropes, ...profile.availableTropes]) {
      map.set(t.tag, t);
    }
    return map;
  }, [profile.lovedTropes, profile.hatedTropes, profile.availableTropes]);

  // All active trope tags: loved + hated + included - excluded
  const allActiveTags = React.useMemo(() => {
    const tags = new Set<string>();
    for (const t of profile.lovedTropes) {
      if (!excludedTropes.includes(t.tag)) tags.add(t.tag);
    }
    for (const t of profile.hatedTropes) {
      if (!excludedTropes.includes(t.tag)) tags.add(t.tag);
    }
    for (const tag of includedTropes) {
      if (!excludedTropes.includes(tag)) tags.add(tag);
    }
    return Array.from(tags);
  }, [profile.lovedTropes, profile.hatedTropes, includedTropes, excludedTropes]);

  // Deferred Favored & Drop-Trigger Tropes Order
  const [favoredOrder, setFavoredOrder] = useState<string[]>([]);
  const [hatedOrder, setHatedOrder] = useState<string[]>([]);
  const isHoveringTropeRef = useRef(false);

  const computePartitions = () => {
    const getSteeredPct = (tag: string) => {
      const base = tropeMap.get(tag)?.score || 0;
      const bias = biases.tropes?.[tag] || 0;
      return Math.round((base + bias) * 10) / 10;
    };

    const favored: string[] = [];
    const hated: string[] = [];

    for (const tag of allActiveTags) {
      if (getSteeredPct(tag) >= 0) {
        favored.push(tag);
      } else {
        hated.push(tag);
      }
    }

    favored.sort((a, b) => getSteeredPct(b) - getSteeredPct(a));
    hated.sort((a, b) => getSteeredPct(a) - getSteeredPct(b));

    return { favored, hated };
  };

  useEffect(() => {
    if (!isHoveringTropeRef.current) {
      const { favored, hated } = computePartitions();
      setFavoredOrder(favored);
      setHatedOrder(hated);
    }
  }, [allActiveTags, biases.tropes, tropeMap]);

  const handleTropeStepperEnter = () => {
    isHoveringTropeRef.current = true;
  };

  const handleTropeStepperLeave = () => {
    isHoveringTropeRef.current = false;
    const { favored, hated } = computePartitions();
    setFavoredOrder(favored);
    setHatedOrder(hated);
  };

  const activeSet = React.useMemo(() => new Set(allActiveTags), [allActiveTags]);
  const partitions = computePartitions();

  const effectiveFavoredOrder = (favoredOrder.length > 0 || isHoveringTropeRef.current)
    ? favoredOrder.filter(tag => activeSet.has(tag))
    : partitions.favored;

  const effectiveHatedOrder = (hatedOrder.length > 0 || isHoveringTropeRef.current)
    ? hatedOrder.filter(tag => activeSet.has(tag))
    : partitions.hated;

  const favoredTropesList = effectiveFavoredOrder.map(tag => {
    const baseScore = tropeMap.get(tag)?.score || 0;
    const bias = biases.tropes?.[tag] || 0;
    const steeredPct = Math.round((baseScore + bias) * 10) / 10;
    return { tag, baseScore, bias, steeredPct };
  });

  const hatedTropesList = effectiveHatedOrder.map(tag => {
    const baseScore = tropeMap.get(tag)?.score || 0;
    const bias = biases.tropes?.[tag] || 0;
    const steeredPct = Math.round((baseScore + bias) * 10) / 10;
    return { tag, baseScore, bias, steeredPct };
  });

  // Unassigned available library tropes
  const unassignedTropes = React.useMemo(() => {
    const active = new Set(allActiveTags);
    const all = [
      ...profile.availableTropes,
      ...profile.lovedTropes,
      ...profile.hatedTropes
    ];
    const seen = new Set<string>();
    const result: TropeSalienceItem[] = [];
    for (const t of all) {
      if (!active.has(t.tag) && !seen.has(t.tag)) {
        seen.add(t.tag);
        result.push(t);
      }
    }
    result.sort((a, b) => b.score - a.score);
    return result;
  }, [profile.availableTropes, profile.lovedTropes, profile.hatedTropes, allActiveTags]);

  // Total active biases count
  const activeBiasCount = React.useMemo(() => {
    let count = 0;
    for (const cat of ['genres', 'eras', 'tropes', 'sources', 'studios'] as const) {
      count += Object.values(biases[cat] || {}).filter((b) => b !== 0).length;
    }
    return count;
  }, [biases]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, tag: string) => {
    e.dataTransfer.setData('text/plain', tag);
  };

  const handleDropToFavored = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFavored(false);
    const tag = e.dataTransfer.getData('text/plain');
    if (tag) {
      const base = tropeMap.get(tag)?.score || 0;
      const initialBias = base < 0.1 ? Math.round((0.1 - base) * 10) / 10 : 0;
      handleIncludeTrope(tag, initialBias);
    }
  };

  const handleDropToHated = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverHated(false);
    const tag = e.dataTransfer.getData('text/plain');
    if (tag) {
      const base = tropeMap.get(tag)?.score || 0;
      const initialBias = base > -0.1 ? Math.round((-0.1 - base) * 10) / 10 : 0;
      handleIncludeTrope(tag, initialBias);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Global Status Banner if biases active */}
      {activeBiasCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#00F0FF]">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">{activeBiasCount} Active Taste Biases Steered</span>
            <span className="text-[#94A3B8] font-normal hidden sm:inline">
              (Order updates once cursor leaves NumberField)
            </span>
          </div>
          <button
            onClick={() => {
              onResetBiases();
              setGenreOrder([]);
              setStudioOrder([]);
              setFavoredOrder([]);
              setHatedOrder([]);
              setPenalizedOrder([]);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1118] border border-[#00F0FF]/30 hover:border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Biases</span>
          </button>
        </div>
      )}

      {/* Top Row: Steerable Genres (Section 1) & Steerable Micro-Themes (Section 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steerable Genres */}
        <div className="bg-[#131722] border border-[#1E2538] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F0FF]" />
              <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Genre Affinity
              </h3>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-mono">Fixed while hovering (re-ranks on exit)</span>
          </div>

          {/* Top Positive Zone: Genre Affinity (Drop Zone) */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOverGenreTop(true); }}
            onDragLeave={() => setIsDragOverGenreTop(false)}
            onDrop={handleDropToGenreTop}
            className={`p-3 rounded-xl border-2 transition-all space-y-2.5 ${
              isDragOverGenreTop
                ? 'border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                : 'border-[#1E2538] bg-[#0E1118]/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#00F0FF] uppercase tracking-wider font-mono flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> High Affinity Genres (Drop Zone)
              </span>
              <span className="text-[10px] text-[#94A3B8] font-mono">{displayTopGenres.length} genres</span>
            </div>

            <div className="space-y-2.5">
              {displayTopGenres.map((g) => {
                const pct = Math.min(100, Math.max(0, (g.steeredScore / 10) * 100));
                const hasBias = g.bias !== 0;
                const isPromoted = isGenrePromoted(g.name) && !profile.topGenres.some(x => x.name === g.name);

                return (
                  <div
                    key={g.name}
                    className={`group space-y-1 p-2 rounded-lg border transition-colors ${
                      isPromoted
                        ? 'bg-[#00F0FF]/5 border-[#00F0FF]/40 hover:border-[#00F0FF]'
                        : 'bg-[#0E1118]/40 border-[#1E2538]/60 hover:border-[#1E2538]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#F1F5F9] font-medium truncate">{g.name}</span>
                        {isPromoted && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                            Added
                          </span>
                        )}
                        <span className="text-[11px] text-[#555E6E] font-mono shrink-0">({g.count} shows)</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <NumberStepper
                          value={g.bias}
                          min={-5.0}
                          max={5.0}
                          step={0.1}
                          hoverOnly={true}
                          onMouseEnter={handleGenreStepperEnter}
                          onMouseLeave={handleGenreStepperLeave}
                          onChange={(newVal) => onBiasChange('genres', g.name, newVal)}
                        />

                        {/* Remove button: moves back to genre library pool */}
                        <button
                          type="button"
                          onClick={() => handleDemoteGenre(g.name)}
                          title="Move to genre library pool"
                          className="p-1 rounded text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="text-right min-w-[46px] font-mono">
                          <span
                            className={`text-sm font-bold ${
                              g.bias > 0
                                ? 'text-[#00F0FF]'
                                : g.bias < 0
                                ? 'text-[#F2741D]'
                                : 'text-[#F1F5F9]'
                            }`}
                          >
                            {g.steeredScore.toFixed(1)}
                          </span>
                          {hasBias && (
                            <div className="text-[9px] text-[#555E6E] leading-none">
                              base: {g.bayesianScore}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-[#0E1118] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          g.bias > 0
                            ? 'bg-gradient-to-r from-[#00F0FF] to-[#38F2FD]'
                            : g.bias < 0
                            ? 'bg-gradient-to-r from-[#F2741D] to-[#BD4214]'
                            : 'bg-gradient-to-r from-[#00F0FF] to-[#A953F6]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Section: Scrollable Genre Library Pool */}
          <div className="p-3 rounded-xl border border-[#A953F6]/40 bg-[#0E1118] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#BD86F8] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5" /> Genre Library Pool ({unassignedGenres.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94A3B8] font-mono hidden sm:inline">
                  Drag or click + to activate
                </span>
                <button
                  type="button"
                  onClick={() => setIsGenrePoolExpanded(!isGenrePoolExpanded)}
                  title={isGenrePoolExpanded ? "Collapse genre library pool" : "Expand genre library pool for more visibility"}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#BD86F8] hover:bg-[#A953F6]/20 transition-all flex items-center gap-1 text-[10px] font-mono cursor-pointer border border-[#1E2538] hover:border-[#A953F6]/40"
                >
                  {isGenrePoolExpanded ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Collapse</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Expand</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable genre pills container */}
            <div className={`${isGenrePoolExpanded ? 'max-h-96' : 'max-h-28'} transition-all duration-200 overflow-y-auto pr-1 flex flex-wrap gap-1.5`}>
              {unassignedGenres.map((g) => (
                <div
                  key={g.name}
                  draggable
                  onDragStart={(e) => handleDragStartGenre(e, g.name)}
                  className="group px-2 py-1 rounded-md text-[11px] font-mono bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] hover:border-[#A953F6]/50 text-[#F1F5F9] flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
                  title={`Drag into Genre Affinity or Penalized Genres, or click + (${g.bayesianScore.toFixed(1)} Base · ${g.count} shows)`}
                >
                  <GripVertical className="w-3 h-3 text-[#555E6E] group-hover:text-[#BD86F8]" />
                  <span>{g.name}</span>
                  <span className="text-[10px] text-[#BD86F8] font-semibold">
                    ({g.bayesianScore.toFixed(1)})
                  </span>

                  {/* Single (+) Button */}
                  <button
                    type="button"
                    onClick={() => handleIncludeGenreFromPool(g)}
                    title={`Include "${g.name}" into ${g.bayesianScore >= (profile.meanScore || 7.0) ? 'Genre Affinity' : 'Penalized Genres'}`}
                    className="p-1 rounded text-[10px] font-mono font-medium bg-[#A953F6]/15 hover:bg-[#A953F6] text-[#BD86F8] hover:text-[#0B0D13] border border-[#A953F6]/30 transition-all flex items-center justify-center cursor-pointer ml-0.5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Negative Zone: Historically Penalized Genres (Drop Zone) */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOverGenrePenalized(true); }}
            onDragLeave={() => setIsDragOverGenrePenalized(false)}
            onDrop={handleDropToGenrePenalized}
            className={`p-3 rounded-xl border-2 transition-all space-y-2 ${
              isDragOverGenrePenalized
                ? 'border-[#F2741D] bg-[#F2741D]/15 shadow-[0_0_15px_rgba(242,116,29,0.25)]'
                : 'border-[#1E2538] bg-[#0E1118]/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#F2741D] flex items-center gap-1">
                <ThumbsDown className="w-3.5 h-3.5" /> Historically Penalized Genres (Drop Zone)
              </span>
              <span className="text-[10px] text-[#94A3B8] font-mono">{displayPenalizedGenres.length} genres</span>
            </div>

            {displayPenalizedGenres.length === 0 ? (
              <div className="py-4 text-center text-xs font-mono text-[#555E6E] border border-dashed border-[#1E2538] rounded-lg">
                Drag genres here to penalize
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayPenalizedGenres.map((g) => {
                  const bias = biases.genres?.[g.name] || 0;
                  const steeredScore = Math.max(0, Math.round((g.bayesianScore + bias) * 10) / 10);
                  const isPromoted = isPenalizedPromoted(g.name) && !profile.penalizedGenres.some(x => x.name === g.name);

                  return (
                    <div
                      key={g.name}
                      className={`group p-2 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        isPromoted
                          ? 'bg-[#F2741D]/5 border-[#F2741D]/40 hover:border-[#F2741D]'
                          : 'bg-[#0E1118] border-[#1E2538] hover:border-[#1E2538]/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#94A3B8] truncate">{g.name}</span>
                        {isPromoted && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#F2741D]/20 text-[#F2741D] border border-[#F2741D]/30 shrink-0">
                            Added
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <NumberStepper
                          value={bias}
                          min={-5.0}
                          max={5.0}
                          step={0.1}
                          hoverOnly={true}
                          onMouseEnter={handlePenalizedStepperEnter}
                          onMouseLeave={handlePenalizedStepperLeave}
                          onChange={(newVal) => onBiasChange('genres', g.name, newVal)}
                        />
                        <button
                          type="button"
                          onClick={() => handleDemotePenalizedGenre(g.name)}
                          title="Move to genre library pool"
                          className="p-1 rounded text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className={`font-mono text-xs font-bold ${bias > 0 ? 'text-[#00F0FF]' : bias < 0 ? 'text-[#BD4214]' : 'text-[#F2741D]'}`}>
                          {steeredScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Micro-Themes with Middle Drag-and-Drop Library */}
        <div className="bg-[#131722] border border-[#1E2538] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#00F0FF]" />
              <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Micro-Themes
              </h3>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-mono">Drag themes to modulate</span>
          </div>

          <div className="space-y-4">
            {/* Favored Themes Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverFavored(true); }}
              onDragLeave={() => setIsDragOverFavored(false)}
              onDrop={handleDropToFavored}
              className={`p-3 rounded-xl border-2 transition-all ${
                isDragOverFavored
                  ? 'border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                  : 'border-[#1E2538] bg-[#0E1118]/50'
              }`}
            >
              <span className="text-[11px] text-[#00F0FF] uppercase tracking-wider font-mono block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Favored Themes (Drop Zone)
                </span>
                <span className="text-[10px] text-[#94A3B8]">Total Steered %</span>
              </span>

              <div className="flex flex-wrap gap-2 min-h-[38px] items-center">
                {favoredTropesList.map((t) => (
                  <div
                    key={t.tag}
                    className="group px-2.5 py-1 rounded-md text-xs font-medium bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center gap-1.5 font-mono shadow-sm"
                  >
                    <span>{t.tag}</span>
                    <span className="font-bold text-[11px]">
                      {t.steeredPct > 0 ? `+${t.steeredPct}%` : `${t.steeredPct}%`}
                    </span>
                    <NumberStepper
                      value={t.bias}
                      min={-100.0}
                      max={100.0}
                      step={0.1}
                      hoverOnly={true}
                      onMouseEnter={handleTropeStepperEnter}
                      onMouseLeave={handleTropeStepperLeave}
                      onChange={(newVal) => onBiasChange('tropes', t.tag, newVal)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTrope(t.tag)}
                      title="Remove to library pool"
                      className="p-0.5 rounded text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity shrink-0 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Section: Scrollable Available Themes Pool */}
            <div className="p-3 rounded-xl border border-[#A953F6]/40 bg-[#0E1118] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#BD86F8] font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5" /> Library Themes Pool ({unassignedTropes.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#94A3B8] font-mono hidden sm:inline">
                    Drag or click + to activate
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPoolExpanded(!isPoolExpanded)}
                    title={isPoolExpanded ? "Collapse library pool view" : "Expand library pool for more visibility"}
                    className="p-1 rounded text-[#94A3B8] hover:text-[#BD86F8] hover:bg-[#A953F6]/20 transition-all flex items-center gap-1 text-[10px] font-mono cursor-pointer border border-[#1E2538] hover:border-[#A953F6]/40"
                  >
                    {isPoolExpanded ? (
                      <>
                        <Minimize2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Collapse</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Expand</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable themes pills container */}
              <div className={`${isPoolExpanded ? 'max-h-96' : 'max-h-28'} transition-all duration-200 overflow-y-auto pr-1 flex flex-wrap gap-1.5`}>
                {unassignedTropes.map((t) => (
                  <div
                    key={t.tag}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.tag)}
                    className="group px-2 py-1 rounded-md text-[11px] font-mono bg-[#131722] hover:bg-[#19202F] border border-[#1E2538] hover:border-[#A953F6]/50 text-[#F1F5F9] flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
                    title={`Drag into Favored/Drop-Trigger, or click + (${t.topFrequency} completed, ${t.droppedFrequency} dropped)`}
                  >
                    <GripVertical className="w-3 h-3 text-[#555E6E] group-hover:text-[#BD86F8]" />
                    <span>{t.tag}</span>
                    <span className={`text-[10px] ${t.score >= 0 ? 'text-[#00F0FF]' : 'text-[#F2741D]'}`}>
                      ({t.score > 0 ? `+${t.score}%` : `${t.score}%`})
                    </span>

                    {/* Single (+) Button */}
                    <button
                      type="button"
                      onClick={() => handleIncludeTrope(t.tag)}
                      title={`Include "${t.tag}" into ${t.score >= 0 ? 'Favored' : 'Drop-Trigger'}`}
                      className="p-1 rounded text-[10px] font-mono font-medium bg-[#A953F6]/15 hover:bg-[#A953F6] text-[#BD86F8] hover:text-[#0B0D13] border border-[#A953F6]/30 transition-all flex items-center justify-center cursor-pointer ml-0.5"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Drop-Trigger Themes Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverHated(true); }}
              onDragLeave={() => setIsDragOverHated(false)}
              onDrop={handleDropToHated}
              className={`p-3 rounded-xl border-2 transition-all ${
                isDragOverHated
                  ? 'border-[#F2741D] bg-[#F2741D]/15 shadow-[0_0_15px_rgba(242,116,29,0.25)]'
                  : 'border-[#1E2538] bg-[#0E1118]/50'
              }`}
            >
              <span className="text-[11px] text-[#F2741D] uppercase tracking-wider font-mono block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ThumbsDown className="w-3.5 h-3.5" /> Drop-Trigger Themes (Drop Zone)
                </span>
                <span className="text-[10px] text-[#94A3B8]">Total Steered %</span>
              </span>

              <div className="flex flex-wrap gap-2 min-h-[38px] items-center">
                {hatedTropesList.map((t) => (
                  <div
                    key={t.tag}
                    className="group px-2.5 py-1 rounded-md text-xs font-medium bg-[#F2741D]/10 text-[#F2741D] border border-[#F2741D]/30 flex items-center gap-1.5 font-mono shadow-sm"
                  >
                    <span>{t.tag}</span>
                    <span className="font-bold text-[11px]">
                      {t.steeredPct > 0 ? `+${t.steeredPct}%` : `${t.steeredPct}%`}
                    </span>
                    <NumberStepper
                      value={t.bias}
                      min={-100.0}
                      max={100.0}
                      step={0.1}
                      hoverOnly={true}
                      onMouseEnter={handleTropeStepperEnter}
                      onMouseLeave={handleTropeStepperLeave}
                      onChange={(newVal) => onBiasChange('tropes', t.tag, newVal)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTrope(t.tag)}
                      title="Remove to library pool"
                      className="p-0.5 rounded text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity shrink-0 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Steerable Studios & Steerable Release Eras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steerable Studios with Contenders */}
        <div className="bg-[#131722] border border-[#1E2538] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#A953F6]" />
              <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Studios
              </h3>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-mono">Fixed while hovering (re-ranks on exit)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {displayTopStudios.map((s) => {
              const isPromoted = isStudioPromoted(s.name) && !profile.topStudios.some(x => x.name === s.name);
              return (
                <div
                  key={s.name}
                  className={`group p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                    isPromoted
                      ? 'bg-[#A953F6]/5 border-[#A953F6]/40 hover:border-[#A953F6]'
                      : 'bg-[#0E1118] border-[#1E2538] hover:border-[#1E2538]/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-semibold text-[#F1F5F9] truncate">
                      {s.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDemoteStudio(s.name)}
                      title="Move to contender studios"
                      className="p-0.5 rounded text-[#94A3B8] hover:text-[#F2741D] hover:bg-[#F2741D]/20 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-[#94A3B8]">{s.count} titles</span>
                    <span className={`font-bold ${s.bias > 0 ? 'text-[#00F0FF]' : s.bias < 0 ? 'text-[#F2741D]' : 'text-[#BD86F8]'}`}>
                      {s.steeredScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-[#1E2538]/40 flex justify-end">
                    <NumberStepper
                      value={s.bias}
                      min={-5.0}
                      max={5.0}
                      step={0.1}
                      hoverOnly={true}
                      onMouseEnter={handleStudioStepperEnter}
                      onMouseLeave={handleStudioStepperLeave}
                      onChange={(newVal) => onBiasChange('studios', s.name, newVal)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contender Studios (With "+ Add" button) */}
          {displayContenderStudios.length > 0 && (
            <div className="pt-2 border-t border-[#1E2538]/60 space-y-2">
              <button
                onClick={() => setShowStudioContenders(!showStudioContenders)}
                className="text-xs font-mono text-[#94A3B8] hover:text-[#A953F6] flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
              >
                <span>Contender Studios ({displayContenderStudios.length} close to entering)</span>
                {showStudioContenders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showStudioContenders && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {displayContenderStudios.map((s) => (
                    <div
                      key={s.name}
                      className="p-2 rounded-lg bg-[#0E1118] border border-[#1E2538] flex flex-col justify-between gap-1.5 hover:border-[#A953F6]/30 transition-colors"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="text-[#F1F5F9] font-medium truncate">{s.name}</span>
                        <span className="text-[10px] text-[#555E6E] font-mono">{s.count} shows</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-[#94A3B8]">Base: {s.bayesianScore}</span>
                        <button
                          type="button"
                          onClick={() => handlePromoteStudio(s.name)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#A953F6]/15 text-[#BD86F8] border border-[#A953F6]/30 hover:bg-[#A953F6] hover:text-[#0B0D13] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Steerable Release Eras & Source Material */}
        <div className="bg-[#131722] border border-[#1E2538] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#A953F6]" />
              <h3 className="text-sm font-bold text-[#F1F5F9] uppercase tracking-wider font-mono">
                Release Eras
              </h3>
            </div>
            <span className="text-[11px] text-[#94A3B8] font-mono">Temporal Bias</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {profile.eras.map((e) => {
              const bias = biases.eras?.[e.era] || 0;
              const steeredScore = e.meanScore > 0 ? Math.max(0, Math.round((e.meanScore + bias) * 10) / 10) : 0;
              return (
                <div
                  key={e.era}
                  className="group p-3 rounded-lg bg-[#0E1118] border border-[#1E2538] hover:border-[#1E2538]/80 flex flex-col justify-between gap-2 transition-all"
                >
                  <div className="flex justify-between items-center text-xs font-semibold text-[#F1F5F9]">
                    <span>{e.era}</span>
                    <span className="text-[11px] text-[#00F0FF] font-mono">{e.percentage}%</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-[#94A3B8]">{e.count} shows</span>
                    <span className={`font-bold ${bias > 0 ? 'text-[#00F0FF]' : bias < 0 ? 'text-[#F2741D]' : 'text-[#BD86F8]'}`}>
                      {steeredScore > 0 ? `Avg: ${steeredScore.toFixed(1)}` : 'Unrated'}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-[#1E2538]/40 flex justify-end">
                    <NumberStepper
                      value={bias}
                      min={-5.0}
                      max={5.0}
                      step={0.1}
                      hoverOnly={true}
                      onChange={(newVal) => onBiasChange('eras', e.era, newVal)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Steerable Adaptation Source Preference */}
          {profile.sources.length > 0 && (
            <div className="pt-2 border-t border-[#1E2538]/60 space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#94A3B8] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00F0FF]" /> Adaptation Sources
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.sources.slice(0, 4).map((s) => {
                  const bias = biases.sources?.[s.source] || 0;
                  const steeredScore = Math.max(0, Math.round((s.bayesianScore + bias) * 10) / 10);
                  return (
                    <div
                      key={s.source}
                      className="group px-3 py-1.5 rounded-lg bg-[#0E1118] border border-[#1E2538] flex items-center gap-2 font-mono text-xs"
                    >
                      <span className="text-[#F1F5F9] font-medium">{s.source}</span>
                      <span className={`font-bold ${bias > 0 ? 'text-[#00F0FF]' : bias < 0 ? 'text-[#F2741D]' : 'text-[#BD86F8]'}`}>
                        {steeredScore.toFixed(1)}
                      </span>
                      <NumberStepper
                        value={bias}
                        min={-5.0}
                        max={5.0}
                        step={0.1}
                        hoverOnly={true}
                        onChange={(newVal) => onBiasChange('sources', s.source, newVal)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
