import {
  AniListCollection,
  AniListEntry,
  ProcessedAnime,
  TasteProfile,
  AffinityItem,
  EraItem,
  SourceItem,
  BaseBiasMode
} from '../types/anilist.ts';
import { calculateDivergence } from './divergence.ts';
import { calculateTropeSalience } from './tropeSalience.ts';

function resolveViewDate(entry: AniListEntry, mediaYear: number | null): Date | null {
  const statusUpper = (entry.status || '').toUpperCase();
  // 1. If currently watching / repeating: today's date
  if (statusUpper.includes('CURRENT') || statusUpper.includes('WATCH') || statusUpper.includes('REPEAT')) {
    return new Date();
  }

  // 2. completedAt
  if (entry.completedAt?.year) {
    const y = entry.completedAt.year;
    const m = (entry.completedAt.month || 1) - 1;
    const d = entry.completedAt.day || 1;
    return new Date(y, m, d);
  }

  // 3. updatedAt (Unix seconds timestamp)
  if (entry.updatedAt && entry.updatedAt > 0) {
    return new Date(entry.updatedAt * 1000);
  }

  // 4. startedAt
  if (entry.startedAt?.year) {
    const y = entry.startedAt.year;
    const m = (entry.startedAt.month || 1) - 1;
    const d = entry.startedAt.day || 1;
    return new Date(y, m, d);
  }

  // 5. createdAt (Unix seconds timestamp)
  if (entry.createdAt && entry.createdAt > 0) {
    return new Date(entry.createdAt * 1000);
  }

  // 6. Fallback: media release year
  if (mediaYear && mediaYear > 1950 && mediaYear <= new Date().getFullYear() + 2) {
    return new Date(mediaYear, 6, 1);
  }

  return null;
}

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
const HALF_LIFE_YEARS = 2.0;
const MIN_RECENCY_WEIGHT = 0.20;

function computeRecencyWeight(viewDate: Date | null, baseBias: BaseBiasMode, nowTime: number): number {
  if (baseBias !== 'recency' || !viewDate) {
    return 1.0;
  }
  const deltaYears = Math.max(0, (nowTime - viewDate.getTime()) / MS_PER_YEAR);
  // Exponential half-life decay: 2^(-delta / half_life), floored at 0.20
  const decay = Math.pow(2, -deltaYears / HALF_LIFE_YEARS);
  return Math.max(MIN_RECENCY_WEIGHT, Math.min(1.0, decay));
}

/**
 * Mathematical taste profiler using Bayesian smoothing, statistical moments,
 * release era distribution, and adaptation source bias, with optional recency weighting.
 */
export function buildTasteProfile(
  collection: AniListCollection,
  username: string,
  baseBias: BaseBiasMode = 'none'
): TasteProfile {
  const allProcessed: ProcessedAnime[] = [];
  const validScores: number[] = [];
  let weightedScoreSum = 0;
  let totalScoreWeight = 0;
  const nowTime = Date.now();

  let completedCount = 0;
  let droppedCount = 0;
  let watchingCount = 0;
  let planningCount = 0;
  let totalCommitmentDropped = 0;
  let droppedWithEpisodes = 0;
  let totalMinutesWatched = 0;
  let totalPopularity = 0;
  let popularityCount = 0;

  for (const list of collection.lists) {
    for (const entry of list.entries) {
      const media = entry.media;
      if (!media) continue;

      const title = media.title.romaji || media.title.english || 'Unknown Title';
      const score = entry.score || 0;
      const commScore = media.averageScore || 0;
      const progress = entry.progress || 0;
      const episodes = media.episodes || null;
      const duration = media.duration || 24; // Default standard 24 min if omitted
      const year = media.seasonYear || media.startDate?.year || null;
      const popularity = media.popularity || 0;

      // Status tracking
      const statusUpper = (entry.status || list.name || '').toUpperCase();
      if (statusUpper.includes('COMPLET')) completedCount++;
      else if (statusUpper.includes('DROP')) droppedCount++;
      else if (statusUpper.includes('WATCH') || statusUpper.includes('CURRENT')) watchingCount++;
      else if (statusUpper.includes('PLAN')) planningCount++;

      // Watch time in minutes
      totalMinutesWatched += progress * duration;

      if (popularity > 0) {
        totalPopularity += popularity;
        popularityCount++;
      }

      // Commitment ratio on dropped anime
      let ratio = 1.0;
      if (episodes && episodes > 0) {
        ratio = Math.min(1.0, progress / episodes);
      }
      if (statusUpper.includes('DROP')) {
        totalCommitmentDropped += ratio;
        droppedWithEpisodes++;
      }

      const viewDate = resolveViewDate(entry, year);
      const recencyWeight = computeRecencyWeight(viewDate, baseBias, nowTime);

      if (score > 0) {
        validScores.push(score);
        weightedScoreSum += score * recencyWeight;
        totalScoreWeight += recencyWeight;
      }

      const diff = (score > 0 && commScore > 0) ? (score * 10 - commScore) : null;

      // True Animation Studio Isolation:
      // If any studio node has isAnimationStudio: true, pick the first animation studio;
      // otherwise fallback to the first studio node.
      const animStudioNode = media.studios?.nodes?.find(s => s.isAnimationStudio === true);
      const primaryStudio = animStudioNode?.name || media.studios?.nodes?.[0]?.name || 'Unknown Studio';

      // Keep only high-confidence non-spoiler tags, prioritizing Theme/Setting over Cast boilerplate
      const salientTags = (media.tags || [])
        .filter(t => !t.isMediaSpoiler && t.rank >= 70)
        .filter(t => !t.category || t.category !== 'Cast-Main Cast') // Filter out generic 'Male Protagonist'
        .slice(0, 5)
        .map(t => t.name);

      allProcessed.push({
        id: media.id,
        title,
        status: statusUpper,
        score,
        communityScore: commScore,
        diff,
        progress,
        episodes,
        duration,
        completionRatio: ratio,
        format: media.format || 'TV',
        year,
        source: media.source || 'UNKNOWN',
        popularity,
        primaryStudio,
        genres: media.genres || [],
        salientTags,
        viewDate,
        recencyWeight
      });
    }
  }

  // Calculate Mean, StdDev, Quantiles (Weighted Mean if Recency mode)
  const scoredCount = validScores.length;
  const meanScore = totalScoreWeight > 0
    ? weightedScoreSum / totalScoreWeight
    : 7.0;

  let variance = 0;
  if (scoredCount > 1) {
    variance = validScores.reduce((acc, s) => acc + Math.pow(s - meanScore, 2), 0) / (scoredCount - 1);
  }
  const stdDev = Math.sqrt(variance);

  const sortedScores = [...validScores].sort((a, b) => a - b);
  const p10 = sortedScores[Math.floor(sortedScores.length * 0.1)] || meanScore;
  const p50 = sortedScores[Math.floor(sortedScores.length * 0.5)] || meanScore;
  const p90 = sortedScores[Math.floor(sortedScores.length * 0.9)] || meanScore;

  const totalEntries = allProcessed.length;
  const dropRatePercent = totalEntries > 0 ? (droppedCount / totalEntries) * 100 : 0;
  const avgCommitment = droppedWithEpisodes > 0 ? (totalCommitmentDropped / droppedWithEpisodes) : 0;
  const totalHoursWatched = Math.round(totalMinutesWatched / 60);
  const meanPopularity = popularityCount > 0 ? Math.round(totalPopularity / popularityCount) : 0;

  // 1. Release Era / Modernity Bias
  // Eras: Classic (<2000), 2000s (2000-2009), 2010s (2010-2019), Modern (2020+)
  const eraBuckets: Record<string, { count: number; sumScore: number; scoredWeight: number }> = {
    'Classic (<2000)': { count: 0, sumScore: 0, scoredWeight: 0 },
    '2000s': { count: 0, sumScore: 0, scoredWeight: 0 },
    '2010s': { count: 0, sumScore: 0, scoredWeight: 0 },
    'Modern (2020+)': { count: 0, sumScore: 0, scoredWeight: 0 }
  };

  for (const item of allProcessed) {
    if (!item.year) continue;
    let eraKey = 'Modern (2020+)';
    if (item.year < 2000) eraKey = 'Classic (<2000)';
    else if (item.year < 2010) eraKey = '2000s';
    else if (item.year < 2020) eraKey = '2010s';

    eraBuckets[eraKey].count++;
    if (item.score > 0) {
      const w = item.recencyWeight ?? 1.0;
      eraBuckets[eraKey].sumScore += item.score * w;
      eraBuckets[eraKey].scoredWeight += w;
    }
  }

  const eras: EraItem[] = Object.entries(eraBuckets).map(([era, data]) => ({
    era,
    count: data.count,
    meanScore: data.scoredWeight > 0 ? parseFloat((data.sumScore / data.scoredWeight).toFixed(2)) : 0,
    percentage: totalEntries > 0 ? parseFloat(((data.count / totalEntries) * 100).toFixed(1)) : 0
  }));

  // 2. Adaptation Source Bias (Bayesian Smoothed)
  const C_PRIOR = 3.0;
  const sourceBuckets = new Map<string, { count: number; sumScore: number; sumWeight: number }>();
  for (const item of allProcessed) {
    if (!item.source || item.source === 'UNKNOWN') continue;
    const b = sourceBuckets.get(item.source) || { count: 0, sumScore: 0, sumWeight: 0 };
    b.count++;
    if (item.score > 0) {
      const w = item.recencyWeight ?? 1.0;
      b.sumScore += item.score * w;
      b.sumWeight += w;
    }
    sourceBuckets.set(item.source, b);
  }

  const sources: SourceItem[] = [];
  for (const [src, b] of sourceBuckets.entries()) {
    const rawAvg = b.sumWeight > 0 ? b.sumScore / b.sumWeight : meanScore;
    const bayesian = (C_PRIOR * meanScore + b.sumScore) / (C_PRIOR + b.sumWeight);
    sources.push({
      source: src,
      count: b.count,
      meanScore: parseFloat(rawAvg.toFixed(2)),
      bayesianScore: parseFloat(bayesian.toFixed(2))
    });
  }
  sources.sort((a, b) => b.bayesianScore - a.bayesianScore);

  // 3. Bayesian Smoothed Genre Affinity
  const genreBuckets = new Map<string, { count: number; sumScore: number; sumWeight: number }>();
  for (const item of allProcessed) {
    const w = item.recencyWeight ?? 1.0;
    for (const g of item.genres) {
      const bucket = genreBuckets.get(g) || { count: 0, sumScore: 0, sumWeight: 0 };
      bucket.count++;
      if (item.score > 0) {
        bucket.sumScore += item.score * w;
        bucket.sumWeight += w;
      }
      genreBuckets.set(g, bucket);
    }
  }

  const ANILIST_CANONICAL_GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
    'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery',
    'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
    'Supernatural', 'Thriller'
  ];

  const allGenres: AffinityItem[] = [];
  const seenGenres = new Set<string>();

  for (const [name, b] of genreBuckets.entries()) {
    seenGenres.add(name);
    const rawAvg = b.sumWeight > 0 ? b.sumScore / b.sumWeight : meanScore;
    const bayesian = (C_PRIOR * meanScore + b.sumScore) / (C_PRIOR + b.sumWeight);
    allGenres.push({
      name,
      count: b.count,
      rawAverage: parseFloat(rawAvg.toFixed(2)),
      bayesianScore: parseFloat(bayesian.toFixed(2))
    });
  }

  // Include any canonical genres not present in user watch history
  for (const g of ANILIST_CANONICAL_GENRES) {
    if (!seenGenres.has(g)) {
      allGenres.push({
        name: g,
        count: 0,
        rawAverage: parseFloat(meanScore.toFixed(2)),
        bayesianScore: parseFloat(meanScore.toFixed(2))
      });
    }
  }

  allGenres.sort((a, b) => b.bayesianScore - a.bayesianScore || b.count - a.count);

  let topGenres: AffinityItem[] = [];
  let contenderGenres: AffinityItem[] = [];
  let contenderPenalizedGenres: AffinityItem[] = [];
  let penalizedGenres: AffinityItem[] = [];

  const nGenres = allGenres.length;
  if (nGenres <= 4) {
    const half = Math.ceil(nGenres / 2);
    topGenres = allGenres.slice(0, half);
    penalizedGenres = allGenres.slice(half);
  } else {
    const topCount = Math.min(7, Math.max(3, Math.round(nGenres * 0.4)));
    const penalizedCount = Math.min(4, Math.max(2, Math.round(nGenres * 0.22)));
    topGenres = allGenres.slice(0, topCount);
    penalizedGenres = allGenres.slice(nGenres - penalizedCount).reverse();

    const middle = allGenres.slice(topCount, nGenres - penalizedCount);
    const midSplit = Math.ceil(middle.length / 2);
    contenderGenres = middle.slice(0, midSplit);
    // Near-penalized contenders: closest to penalized cutoff first
    contenderPenalizedGenres = middle.slice(midSplit).reverse();
  }

  // 4. Bayesian Smoothed Studio Affinity (>= 2 titles)
  const studioBuckets = new Map<string, { count: number; sumScore: number; sumWeight: number }>();
  for (const item of allProcessed) {
    if (!item.primaryStudio || item.primaryStudio === 'Unknown Studio') continue;
    const s = item.primaryStudio;
    const bucket = studioBuckets.get(s) || { count: 0, sumScore: 0, sumWeight: 0 };
    bucket.count++;
    if (item.score > 0) {
      const w = item.recencyWeight ?? 1.0;
      bucket.sumScore += item.score * w;
      bucket.sumWeight += w;
    }
    studioBuckets.set(s, bucket);
  }

  const allStudios: AffinityItem[] = [];
  for (const [name, b] of studioBuckets.entries()) {
    if (b.count < 2) continue;
    const rawAvg = b.sumWeight > 0 ? b.sumScore / b.sumWeight : meanScore;
    const bayesian = (C_PRIOR * meanScore + b.sumScore) / (C_PRIOR + b.sumWeight);
    allStudios.push({
      name,
      count: b.count,
      rawAverage: parseFloat(rawAvg.toFixed(2)),
      bayesianScore: parseFloat(bayesian.toFixed(2))
    });
  }
  allStudios.sort((a, b) => b.bayesianScore - a.bayesianScore);
  const topStudios = allStudios.slice(0, 6);
  const contenderStudios = allStudios.slice(6, 14);

  // 5. Divergence & Hidden Gems
  const { contrarianLoves, contrarianDislikes, hiddenGems } = calculateDivergence(allProcessed);

  // 6. Trope Salience
  const { lovedTropes, hatedTropes, availableTropes } = calculateTropeSalience(allProcessed, meanScore);

  return {
    username,
    totalEntries,
    scoredEntries: scoredCount,
    meanScore: parseFloat(meanScore.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    p10: parseFloat(p10.toFixed(1)),
    p50: parseFloat(p50.toFixed(1)),
    p90: parseFloat(p90.toFixed(1)),
    completedCount,
    droppedCount,
    watchingCount,
    planningCount,
    dropRatePercent: parseFloat(dropRatePercent.toFixed(1)),
    averageCommitmentRatio: parseFloat(avgCommitment.toFixed(2)),
    totalHoursWatched,
    meanPopularity,
    topGenres,
    contenderGenres,
    penalizedGenres,
    contenderPenalizedGenres,
    availableGenres: allGenres,
    topStudios,
    contenderStudios,
    eras,
    sources,
    contrarianLoves,
    contrarianDislikes,
    hiddenGems,
    lovedTropes,
    hatedTropes,
    availableTropes,
    allProcessed,
    baseBias
  };
}
