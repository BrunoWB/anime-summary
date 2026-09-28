import { ProcessedAnime, DivergenceItem } from '../types/anilist.ts';

export function calculateDivergence(items: ProcessedAnime[]): {
  contrarianLoves: DivergenceItem[];
  contrarianDislikes: DivergenceItem[];
  hiddenGems: DivergenceItem[];
} {
  const scoredItems = items.filter(i => i.score > 0 && i.communityScore > 0 && i.diff !== null);

  // Contrarian Loves: user score significantly exceeds community average
  const loves: DivergenceItem[] = scoredItems
    .filter(i => (i.diff || 0) >= 8.0)
    .sort((a, b) => (b.diff || 0) - (a.diff || 0))
    .slice(0, 8)
    .map(i => ({
      title: i.title,
      userScore: i.score,
      communityScore: i.communityScore,
      diff: parseFloat((i.diff || 0).toFixed(1)),
      status: i.status,
      popularity: i.popularity
    }));

  // Contrarian Dislikes: user score much lower than community or dropped high-rated show
  const dislikes: DivergenceItem[] = scoredItems
    .filter(i => (i.diff || 0) <= -8.0 || (i.status.includes('DROP') && i.communityScore >= 75))
    .sort((a, b) => (a.diff || 0) - (b.diff || 0))
    .slice(0, 8)
    .map(i => ({
      title: i.title,
      userScore: i.score,
      communityScore: i.communityScore,
      diff: parseFloat((i.diff || 0).toFixed(1)),
      status: i.status,
      popularity: i.popularity
    }));

  // Hidden Gems: high user rating (>= 8.0) with low community popularity (< 35,000)
  const gems: DivergenceItem[] = scoredItems
    .filter(i => i.score >= 8.0 && i.popularity > 0 && i.popularity < 35000)
    .sort((a, b) => b.score - a.score || a.popularity - b.popularity)
    .slice(0, 6)
    .map(i => ({
      title: i.title,
      userScore: i.score,
      communityScore: i.communityScore,
      diff: parseFloat((i.diff || 0).toFixed(1)),
      status: i.status,
      popularity: i.popularity
    }));

  return {
    contrarianLoves: loves,
    contrarianDislikes: dislikes,
    hiddenGems: gems
  };
}
