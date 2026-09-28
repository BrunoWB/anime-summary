import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { SearchHero } from './components/SearchHero.tsx';
import { OverviewCards } from './components/OverviewCards.tsx';
import { AffinitiesView } from './components/AffinitiesView.tsx';
import { ContrarianView } from './components/ContrarianView.tsx';
import { ResultsDownloadCard } from './components/ResultsDownloadCard.tsx';
import { TasteProfile, TasteBiases, createEmptyBiases, AniListCollection, BaseBiasMode, SummarySectionToggles, createDefaultSummarySections } from './types/anilist.ts';
import { fetchAniListByUsername, loadMockDump } from './services/anilistService.ts';
import { buildTasteProfile } from './algorithms/scoringEngine.ts';
import {
  saveLastQuery,
  loadLastQuery,
  loadUserQuery,
  getCachedQueryMeta,
  clearLastQuery,
  saveUserSteering,
  loadUserSteering,
  clearUserSteering,
  CachedQueryMeta
} from './services/cacheService.ts';
import { AlertCircle, X, RotateCcw, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { FixDatesPage } from './pages/FixDatesPage.tsx';

function getAppBasePath(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function getUsernameFromPath(pathname: string): string | null {
  const match = pathname.match(/(?:^|\/)user\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateToUser(username: string) {
  const base = getAppBasePath();
  const target = `${base}user/${encodeURIComponent(username)}`;
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target);
  }
}

function navigateToHome(replace = false) {
  const base = getAppBasePath();
  const current = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
  if (current !== base) {
    if (replace) {
      window.history.replaceState(null, '', base);
    } else {
      window.history.pushState(null, '', base);
    }
  }
}

function navigateToFixDates() {
  const base = getAppBasePath();
  const target = `${base}fixdates`;
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target);
  }
}

export const App: React.FC = () => {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [rawCollection, setRawCollection] = useState<AniListCollection | null>(null);
  const [baseBias, setBaseBias] = useState<BaseBiasMode>('none');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedMeta, setCachedMeta] = useState<CachedQueryMeta | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [biases, setBiases] = useState<TasteBiases>(createEmptyBiases());
  const [appView, setAppView] = useState<'main' | 'fixdates'>('main');
  const [promotedGenres, setPromotedGenres] = useState<string[]>([]);
  const [promotedPenalizedGenres, setPromotedPenalizedGenres] = useState<string[]>([]);
  const [promotedStudios, setPromotedStudios] = useState<string[]>([]);
  const [demotedGenres, setDemotedGenres] = useState<string[]>([]);
  const [demotedPenalizedGenres, setDemotedPenalizedGenres] = useState<string[]>([]);
  const [demotedStudios, setDemotedStudios] = useState<string[]>([]);
  const [includedTropes, setIncludedTropes] = useState<string[]>([]);
  const [excludedTropes, setExcludedTropes] = useState<string[]>([]);
  const [summarySections, setSummarySections] = useState<SummarySectionToggles>(createDefaultSummarySections());

  const handleToggleSummarySection = (section: keyof SummarySectionToggles) => {
    setSummarySections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeSinceLastFetch = currentTime - lastFetchTime;
  const isUpdateCooldown = lastFetchTime > 0 && timeSinceLastFetch < 60000;
  const remainingCooldown = Math.max(0, Math.ceil((60000 - timeSinceLastFetch) / 1000));

  const hasBiases = React.useMemo(() => {
    return Object.values(biases).some(cat =>
      Object.values(cat || {}).some(b => b !== 0)
    );
  }, [biases]);

  const hasDisabledSummarySections = Object.values(summarySections).some(v => !v);

  const hasSteering = Boolean(
    hasBiases ||
    hasDisabledSummarySections ||
    baseBias !== 'none' ||
    promotedGenres.length > 0 ||
    promotedPenalizedGenres.length > 0 ||
    promotedStudios.length > 0 ||
    demotedGenres.length > 0 ||
    demotedPenalizedGenres.length > 0 ||
    demotedStudios.length > 0 ||
    includedTropes.length > 0 ||
    excludedTropes.length > 0
  );

  const applyUserProfile = (
    collection: AniListCollection,
    username: string,
    syncUrl = true,
    overrideBaseBias?: BaseBiasMode
  ) => {
    setRawCollection(collection);
    const savedSteering = loadUserSteering(username);
    const activeBaseBias = overrideBaseBias ?? (savedSteering?.baseBias || 'none');
    setBaseBias(activeBaseBias);

    const computed = buildTasteProfile(collection, username, activeBaseBias);
    setProfile(computed);

    if (savedSteering) {
      setBiases(savedSteering.biases || createEmptyBiases());
      setPromotedGenres(savedSteering.promotedGenres || []);
      setPromotedPenalizedGenres(savedSteering.promotedPenalizedGenres || []);
      setPromotedStudios(savedSteering.promotedStudios || []);
      setDemotedGenres(savedSteering.demotedGenres || []);
      setDemotedPenalizedGenres(savedSteering.demotedPenalizedGenres || []);
      setDemotedStudios(savedSteering.demotedStudios || []);
      setIncludedTropes(savedSteering.includedTropes || []);
      setExcludedTropes(savedSteering.excludedTropes || []);
      if (savedSteering.summarySections) {
        setSummarySections({
          genres: savedSteering.summarySections.genres ?? true,
          tropes: savedSteering.summarySections.tropes ?? true,
          studios: savedSteering.summarySections.studios ?? true,
          eras: savedSteering.summarySections.eras ?? true,
          divergence: savedSteering.summarySections.divergence ?? true
        });
      } else {
        setSummarySections(createDefaultSummarySections());
      }
    } else {
      setBiases(createEmptyBiases());
      setPromotedGenres([]);
      setPromotedPenalizedGenres([]);
      setPromotedStudios([]);
      setDemotedGenres([]);
      setDemotedPenalizedGenres([]);
      setDemotedStudios([]);
      setIncludedTropes([]);
      setExcludedTropes([]);
      setSummarySections(createDefaultSummarySections());
    }

    if (syncUrl) {
      navigateToUser(username);
    }
  };

  const handleBaseBiasChange = (mode: BaseBiasMode) => {
    setBaseBias(mode);
    if (rawCollection && profile) {
      const recomputed = buildTasteProfile(rawCollection, profile.username, mode);
      setProfile(recomputed);
    }
  };

  // Auto-save user steering whenever biases, promoted items, demoted items, tropes, base bias, or summary sections change
  useEffect(() => {
    if (!profile) return;
    saveUserSteering(profile.username, {
      biases,
      promotedGenres,
      promotedPenalizedGenres,
      promotedStudios,
      demotedGenres,
      demotedPenalizedGenres,
      demotedStudios,
      includedTropes,
      excludedTropes,
      baseBias,
      summarySections
    });
  }, [
    profile,
    biases,
    promotedGenres,
    promotedPenalizedGenres,
    promotedStudios,
    demotedGenres,
    demotedPenalizedGenres,
    demotedStudios,
    includedTropes,
    excludedTropes,
    baseBias,
    summarySections
  ]);

  // Synchronize route with local cache on mount and on popstate
  const handleRouteSync = async () => {
    const isFixDates = window.location.pathname.endsWith('/fixdates');
    if (isFixDates) {
      setAppView('fixdates');
      return;
    } else {
      setAppView('main');
    }
    const username = getUsernameFromPath(window.location.pathname);
    if (username) {
      setIsLoading(true);
      setError(null);
      try {
        const cached = await loadUserQuery(username);
        if (cached) {
          setLastFetchTime(cached.timestamp);
          applyUserProfile(cached.collection, cached.username, false);
        } else {
          // No local save for this username -> gracefully head to homepage
          navigateToHome(true);
          setProfile(null);
          setError(`No local save found for "${username}". Please search to fetch from AniList.`);
        }
      } catch (err: any) {
        navigateToHome(true);
        setProfile(null);
        setError(`Failed to load saved profile for "${username}".`);
      } finally {
        setIsLoading(false);
      }
    } else {
      setProfile(null);
    }
    setCachedMeta(getCachedQueryMeta());
  };

  useEffect(() => {
    handleRouteSync();

    const onPopState = () => {
      handleRouteSync();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSearch = async (username: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const collection = await fetchAniListByUsername(username);
      await saveLastQuery(username, collection);
      setLastFetchTime(Date.now());
      applyUserProfile(collection, username, true);
      setCachedMeta(getCachedQueryMeta());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AniList data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { collection, username } = await loadMockDump();
      await saveLastQuery(username, collection);
      setLastFetchTime(Date.now());
      applyUserProfile(collection, username, true);
      setCachedMeta(getCachedQueryMeta());
    } catch (err: any) {
      setError(err?.message || 'Failed to load local mock dump.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCached = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cached = await loadLastQuery();
      if (!cached) {
        throw new Error('No saved query found.');
      }
      setLastFetchTime(cached.timestamp);
      applyUserProfile(cached.collection, cached.username, true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load saved query.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!profile || isUpdateCooldown || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const collection = await fetchAniListByUsername(profile.username);
      await saveLastQuery(profile.username, collection);
      setLastFetchTime(Date.now());
      setRawCollection(collection);
      const computed = buildTasteProfile(collection, profile.username, baseBias);
      setProfile(computed);
      setCachedMeta(getCachedQueryMeta());
    } catch (err: any) {
      setError(err?.message || 'Failed to update AniList data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCached = async () => {
    await clearLastQuery();
    setCachedMeta(null);
  };

  const handleBiasChange = (category: keyof TasteBiases, name: string, bias: number) => {
    setBiases(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [name]: bias
      }
    }));
  };

  const handlePromoteGenre = (name: string) => {
    setDemotedGenres(prev => prev.filter(n => n !== name));
    setPromotedPenalizedGenres(prev => prev.filter(n => n !== name));
    if (profile?.penalizedGenres.some(g => g.name === name)) {
      setDemotedPenalizedGenres(prev => Array.from(new Set([...prev, name])));
    }
    if (!profile?.topGenres.some(g => g.name === name)) {
      setPromotedGenres(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('genres', name, 0);
  };

  const handleDemoteGenre = (name: string) => {
    setPromotedGenres(prev => prev.filter(n => n !== name));
    if (profile?.topGenres.some(g => g.name === name)) {
      setDemotedGenres(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('genres', name, 0);
  };

  const handlePromotePenalizedGenre = (name: string) => {
    setDemotedPenalizedGenres(prev => prev.filter(n => n !== name));
    setPromotedGenres(prev => prev.filter(n => n !== name));
    if (profile?.topGenres.some(g => g.name === name)) {
      setDemotedGenres(prev => Array.from(new Set([...prev, name])));
    }
    if (!profile?.penalizedGenres.some(g => g.name === name)) {
      setPromotedPenalizedGenres(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('genres', name, 0);
  };

  const handleDemotePenalizedGenre = (name: string) => {
    setPromotedPenalizedGenres(prev => prev.filter(n => n !== name));
    if (profile?.penalizedGenres.some(g => g.name === name)) {
      setDemotedPenalizedGenres(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('genres', name, 0);
  };

  const handlePromoteStudio = (name: string) => {
    setDemotedStudios(prev => prev.filter(n => n !== name));
    if (!profile?.topStudios.some(s => s.name === name)) {
      setPromotedStudios(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('studios', name, 0);
  };

  const handleDemoteStudio = (name: string) => {
    setPromotedStudios(prev => prev.filter(n => n !== name));
    if (profile?.topStudios.some(s => s.name === name)) {
      setDemotedStudios(prev => Array.from(new Set([...prev, name])));
    }
    handleBiasChange('studios', name, 0);
  };

  const handleIncludeTrope = (tag: string, initialBias = 0) => {
    setExcludedTropes(prev => prev.filter(t => t !== tag));
    if (!includedTropes.includes(tag)) {
      setIncludedTropes(prev => [...prev, tag]);
    }
    handleBiasChange('tropes', tag, initialBias);
  };

  const handleRemoveTrope = (tag: string) => {
    setIncludedTropes(prev => prev.filter(t => t !== tag));
    if (profile?.lovedTropes.some(t => t.tag === tag) || profile?.hatedTropes.some(t => t.tag === tag)) {
      setExcludedTropes(prev => Array.from(new Set([...prev, tag])));
    }
    handleBiasChange('tropes', tag, 0);
  };

  const handleResetBiases = () => {
    setBiases(createEmptyBiases());
    setPromotedGenres([]);
    setPromotedPenalizedGenres([]);
    setPromotedStudios([]);
    setDemotedGenres([]);
    setDemotedPenalizedGenres([]);
    setDemotedStudios([]);
    setIncludedTropes([]);
    setExcludedTropes([]);
    setSummarySections(createDefaultSummarySections());
    setBaseBias('none');
    if (rawCollection && profile) {
      const recomputed = buildTasteProfile(rawCollection, profile.username, 'none');
      setProfile(recomputed);
    }
    if (profile) {
      clearUserSteering(profile.username);
    }
  };

  const handleReset = () => {
    setProfile(null);
    setRawCollection(null);
    setBaseBias('none');
    setError(null);
    setBiases(createEmptyBiases());
    setPromotedGenres([]);
    setPromotedPenalizedGenres([]);
    setPromotedStudios([]);
    setDemotedGenres([]);
    setDemotedPenalizedGenres([]);
    setDemotedStudios([]);
    setIncludedTropes([]);
    setExcludedTropes([]);
    navigateToHome();
    setAppView('main');
    setCachedMeta(getCachedQueryMeta());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D13] text-[#F1F5F9]">
      <Header onNavigateHome={handleReset} />

      <main className="flex-1">
        {/* Error notification banner */}
        {error && (
          <div className="max-w-4xl mx-auto mt-4 px-4">
            <div className="p-4 rounded-xl bg-[#E35913]/10 border border-[#E35913]/30 text-[#F59442] flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#E35913]" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-1 hover:bg-[#E35913]/20 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* View switching: Search Hero (Centered) vs Results Dashboard */}
        {!profile ? (
          <SearchHero
            onSearch={handleSearch}
            onLoadMock={handleLoadMock}
            cachedMeta={cachedMeta}
            onLoadCached={handleLoadCached}
            onDeleteCached={handleDeleteCached}
            isLoading={isLoading}
          />
        ) : appView === 'fixdates' ? (
            <FixDatesPage 
              rawCollection={rawCollection} 
              username={profile.username} 
              onNavigateBack={() => { navigateToUser(profile.username); setAppView('main'); }} 
            />
        ) : (
          <div className="space-y-8 pb-16">
            {/* Compact search & controls bar */}
            <SearchHero
              onSearch={handleSearch}
              onLoadMock={handleLoadMock}
              cachedMeta={cachedMeta}
              onLoadCached={handleLoadCached}
              onDeleteCached={handleDeleteCached}
              isLoading={isLoading}
              compact
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
              {/* Profile Header banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#131722] border border-[#1E2538] rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <div className="text-xs uppercase font-mono text-[#00F0FF] tracking-wider">
                      Profile Summary Active
                    </div>
                    <h2 className="text-xl font-extrabold text-[#F1F5F9]">
                      {profile.username}
                    </h2>
                  </div>

                  {/* Base Bias Radio Group */}
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0E1118] border border-[#1E2538]">
                    <span className="text-[10px] font-mono text-[#555E6E] uppercase px-1.5 font-bold">
                      Base Bias:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBaseBiasChange('none')}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                        baseBias === 'none'
                          ? 'bg-[#1E2538] text-[#00F0FF] font-bold shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBaseBiasChange('recency')}
                      title="Exponential half-life decay (2-year half-life) giving more mathematical weight to newly watched and recently rated anime"
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all flex items-center gap-1 cursor-pointer ${
                        baseBias === 'recency'
                          ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 font-bold shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-[#00F0FF]" />
                      <span>Recency</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { navigateToFixDates(); setAppView('fixdates'); }}
                    className="px-3.5 py-1.5 rounded-lg border border-[#1E2538] hover:border-violet-500/50 bg-[#0E1118] text-violet-400 hover:text-violet-300 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Fix Dates</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBiases}
                    disabled={!hasSteering}
                    title={hasSteering ? "Reset all taste biases, promotions, and demotions" : "No active steering to reset"}
                    className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                      hasSteering
                        ? 'bg-[#0E1118] border-[#1E2538] hover:border-[#F2741D]/50 text-[#94A3B8] hover:text-[#F2741D] cursor-pointer'
                        : 'bg-[#0E1118]/40 border-[#1E2538]/30 text-[#555E6E] cursor-not-allowed opacity-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Steering</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isUpdateCooldown || isLoading}
                    title={
                      isUpdateCooldown
                        ? `Rate limit protection: updates restricted to once per minute to prevent AniList ban (${remainingCooldown}s remaining)`
                        : 'Fetch latest AniList data for this profile'
                    }
                    className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                      isUpdateCooldown || isLoading
                        ? 'bg-[#0E1118]/40 border-[#1E2538]/30 text-[#555E6E] cursor-not-allowed opacity-50'
                        : 'bg-[#00F0FF]/10 border-[#00F0FF]/40 hover:bg-[#00F0FF]/20 text-[#00F0FF] hover:border-[#00F0FF] cursor-pointer shadow-sm'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Updating...' : isUpdateCooldown ? `Update (${remainingCooldown}s)` : 'Update'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Core Overview Cards */}
              <OverviewCards profile={profile} />

              {/* 2. Prominent Download Results Action Card */}
              <ResultsDownloadCard
                profile={profile}
                biases={biases}
                excludedTropes={excludedTropes}
                promotedGenres={promotedGenres}
                demotedGenres={demotedGenres}
                promotedStudios={promotedStudios}
                demotedStudios={demotedStudios}
                summarySections={summarySections}
              />

              {/* 3. Mathematical Affinities (Bayesian Genres, Studios, Tropes, Eras, Sources) */}
              <AffinitiesView
                profile={profile}
                biases={biases}
                onBiasChange={handleBiasChange}
                onResetBiases={handleResetBiases}
                promotedGenres={promotedGenres}
                promotedPenalizedGenres={promotedPenalizedGenres}
                promotedStudios={promotedStudios}
                demotedGenres={demotedGenres}
                demotedPenalizedGenres={demotedPenalizedGenres}
                demotedStudios={demotedStudios}
                onPromoteGenre={handlePromoteGenre}
                onDemoteGenre={handleDemoteGenre}
                onPromotePenalizedGenre={handlePromotePenalizedGenre}
                onDemotePenalizedGenre={handleDemotePenalizedGenre}
                onPromoteStudio={handlePromoteStudio}
                onDemoteStudio={handleDemoteStudio}
                includedTropes={includedTropes}
                excludedTropes={excludedTropes}
                onIncludeTrope={handleIncludeTrope}
                onRemoveTrope={handleRemoveTrope}
                summarySections={summarySections}
                onToggleSummarySection={handleToggleSummarySection}
              />

              {/* 4. Contrarian Divergence vs Community */}
              <ContrarianView
                profile={profile}
                summaryEnabled={summarySections.divergence}
                onToggleSummary={() => handleToggleSummarySection('divergence')}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1E2538] py-6 px-6 text-center text-xs text-[#555E6E] font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AnimeSummary &copy; 2026 · Electric Cyan &amp; Vibrant Violet Design System</span>
          <span>AniList API V2 GraphQL Client</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
