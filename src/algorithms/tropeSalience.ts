import { ProcessedAnime, TropeSalienceItem } from '../types/anilist.ts';

/**
 * Calculates Trope / Tag Salience using differential frequencies between
 * top-rated anime and dropped/low-rated anime.
 */
export function calculateTropeSalience(
  items: ProcessedAnime[],
  meanScore: number
): {
  lovedTropes: TropeSalienceItem[];
  hatedTropes: TropeSalienceItem[];
  availableTropes: TropeSalienceItem[];
} {
  const likedItems = items.filter(i => i.score >= 8.0 || (i.score >= meanScore && i.status.includes('COMPLET')));
  const droppedItems = items.filter(i => i.status.includes('DROP') || (i.score > 0 && i.score <= 5.5));

  const likedTagWeights = new Map<string, number>();
  const droppedTagWeights = new Map<string, number>();
  const likedTagCounts = new Map<string, number>();
  const droppedTagCounts = new Map<string, number>();
  const totalTagCounts = new Map<string, number>();
  const allTags = new Set<string>();

  // Collect all salient tags across all items in user's library
  for (const item of items) {
    if (item.salientTags) {
      for (const tag of item.salientTags) {
        allTags.add(tag);
        totalTagCounts.set(tag, (totalTagCounts.get(tag) || 0) + 1);
      }
    }
  }

  let totalLikedWeight = 0;
  for (const item of likedItems) {
    const w = item.recencyWeight ?? 1.0;
    totalLikedWeight += w;
    if (item.salientTags) {
      for (const tag of item.salientTags) {
        likedTagWeights.set(tag, (likedTagWeights.get(tag) || 0) + w);
        likedTagCounts.set(tag, (likedTagCounts.get(tag) || 0) + 1);
      }
    }
  }

  let totalDroppedWeight = 0;
  for (const item of droppedItems) {
    const w = item.recencyWeight ?? 1.0;
    totalDroppedWeight += w;
    if (item.salientTags) {
      for (const tag of item.salientTags) {
        droppedTagWeights.set(tag, (droppedTagWeights.get(tag) || 0) + w);
        droppedTagCounts.set(tag, (droppedTagCounts.get(tag) || 0) + 1);
      }
    }
  }

  const nLiked = Math.max(0.1, totalLikedWeight);
  const nDropped = Math.max(0.1, totalDroppedWeight);

  const results: TropeSalienceItem[] = [];

  for (const tag of allTags) {
    const weightLiked = likedTagWeights.get(tag) || 0;
    const weightDropped = droppedTagWeights.get(tag) || 0;
    const countLiked = likedTagCounts.get(tag) || 0;
    const countDropped = droppedTagCounts.get(tag) || 0;
    const totalCount = totalTagCounts.get(tag) || (countLiked + countDropped);

    const pLiked = weightLiked / nLiked;
    const pDropped = weightDropped / nDropped;
    const salience = pLiked - pDropped;

    // Minimum occurrences across liked/dropped or total list >= 3 for threshold
    const meetsThreshold = (countLiked + countDropped >= 3) || totalCount >= 3;

    results.push({
      tag,
      score: parseFloat((salience * 100).toFixed(1)),
      topFrequency: countLiked,
      droppedFrequency: countDropped,
      salience: parseFloat(salience.toFixed(3)),
      meetsThreshold
    });
  }

  // Loved Tropes: highest positive salience (frequent in liked, absent in dropped), must meet threshold
  const loved = [...results]
    .filter(r => r.meetsThreshold && r.salience > 0.05)
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 8);

  // Hated Tropes: highest negative salience (frequent in dropped, absent in liked), must meet threshold
  const hated = [...results]
    .filter(r => r.meetsThreshold && r.salience < -0.05)
    .sort((a, b) => a.salience - b.salience)
    .slice(0, 8);

  // Available / Neutral Library Themes (sorted by frequency and salience, no cap)
  const lovedTags = new Set(loved.map(l => l.tag));
  const hatedTags = new Set(hated.map(h => h.tag));
  const available = results
    .filter(r => !lovedTags.has(r.tag) && !hatedTags.has(r.tag))
    .sort((a, b) => {
      if (a.meetsThreshold !== b.meetsThreshold) {
        return a.meetsThreshold ? -1 : 1;
      }
      const freqA = (totalTagCounts.get(a.tag) || 0) + a.topFrequency + a.droppedFrequency;
      const freqB = (totalTagCounts.get(b.tag) || 0) + b.topFrequency + b.droppedFrequency;
      if (freqB !== freqA) return freqB - freqA;
      return Math.abs(b.salience) - Math.abs(a.salience);
    });

  return {
    lovedTropes: loved,
    hatedTropes: hated,
    availableTropes: available
  };
}
