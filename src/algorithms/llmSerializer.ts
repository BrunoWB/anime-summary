import { TasteProfile, ProcessedAnime, TasteBiases, createEmptyBiases, TropeSalienceItem } from '../types/anilist.ts';

/**
 * Compresses an anime entry into a single dense row of the Anime-DSL.
 */
function serializeAnimeRow(item: ProcessedAnime): string {
  const shortStatus = item.status.length > 4 ? item.status.slice(0, 4) : item.status;
  const scoreStr = item.score > 0 ? item.score.toFixed(1) : 'NA';
  const diffStr = item.diff !== null
    ? (item.diff > 0 ? `+${item.diff.toFixed(1)}` : item.diff.toFixed(1))
    : 'NA';
  const epStr = `${item.progress}/${item.episodes || '?'}`;
  const studioStr = item.primaryStudio.replace(/\|/g, '/');
  const genresStr = item.genres.slice(0, 3).join(',');
  const tagsStr = item.salientTags.slice(0, 3).join(',');
  const sourceStr = item.source !== 'UNKNOWN' ? item.source.slice(0, 5) : '?';

  return `${shortStatus} | ${scoreStr} | ${diffStr} | ${item.title} | ${item.format} | ${epStr} | ${item.year || '?'} | ${sourceStr} | ${studioStr} | ${genresStr} | ${tagsStr}`;
}

/**
 * Builds the comprehensive, LLM-optimized Markdown payload with multi-category active bias steering.
 */
export function generateLlmMarkdown(profile: TasteProfile, biases: TasteBiases = createEmptyBiases()): string {
  const lines: string[] = [];

  lines.push(`# ANIME TASTE PROFILE: ${profile.username}`);
  lines.push(`> Dense mathematical summary & compressed watchlist for LLM ingestion.`);
  lines.push('');

  // Multi-Category Active Session Biases
  const activeGenreBiases = Object.entries(biases.genres || {}).filter(([_, b]) => b !== 0);
  const activeEraBiases = Object.entries(biases.eras || {}).filter(([_, b]) => b !== 0);
  const activeTropeBiases = Object.entries(biases.tropes || {}).filter(([_, b]) => b !== 0);
  const activeSourceBiases = Object.entries(biases.sources || {}).filter(([_, b]) => b !== 0);
  const activeStudioBiases = Object.entries(biases.studios || {}).filter(([_, b]) => b !== 0);

  const totalActive = activeGenreBiases.length + activeEraBiases.length + activeTropeBiases.length + activeSourceBiases.length + activeStudioBiases.length;

  if (totalActive > 0) {
    lines.push('## Active Session Taste Biases (User-Steered Focus)');
    lines.push('> The user has interactively modulated specific taste vectors for this session:');
    if (activeGenreBiases.length > 0) {
      lines.push(`- **Genres**: ${activeGenreBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Fatigue`})`).join(', ')}`);
    }
    if (activeEraBiases.length > 0) {
      lines.push(`- **Eras**: ${activeEraBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Focus` : `${b.toFixed(1)} Deprioritized`})`).join(', ')}`);
    }
    if (activeTropeBiases.length > 0) {
      lines.push(`- **Micro-Themes**: ${activeTropeBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Penalty`})`).join(', ')}`);
    }
    if (activeSourceBiases.length > 0) {
      lines.push(`- **Source Material**: ${activeSourceBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Penalty`})`).join(', ')}`);
    }
    if (activeStudioBiases.length > 0) {
      lines.push(`- **Studios**: ${activeStudioBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Penalty`})`).join(', ')}`);
    }
    lines.push('');
    lines.push('**Directive for LLM**: Prioritize recommendations and filter choices according to these user-adjusted biases above rather than defaulting solely to past watch volume.');
    lines.push('');
  }

  // 1. Core Mathematical Metrics
  lines.push('## 1. Mathematical Metrics & Distribution');
  lines.push(`- **Total Entries**: ${profile.totalEntries} (Scored: ${profile.scoredEntries})`);
  lines.push(`- **Estimated Time Invested**: ~${profile.totalHoursWatched.toLocaleString()} hours watched`);
  lines.push(`- **Score Statistics**: Mean: ${profile.meanScore}/10 | StdDev: ${profile.stdDev} | P10: ${profile.p10} | Median (P50): ${profile.p50} | P90: ${profile.p90}`);
  lines.push(`- **List Breakdown**: Completed: ${profile.completedCount} | Dropped: ${profile.droppedCount} (${profile.dropRatePercent}% drop rate) | Watching: ${profile.watchingCount} | Plan: ${profile.planningCount}`);
  lines.push(`- **Dropped Anime Average Commitment**: ${(profile.averageCommitmentRatio * 100).toFixed(0)}% of total episodes before dropping`);
  lines.push('');

  // 2. Era & Modernity Bias
  lines.push('## 2. Release Era & Modernity Profile');
  lines.push('| Era | Shows | Share | Historical Mean | User Bias | Steered Rating |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const e of profile.eras) {
    const bias = biases.eras?.[e.era] || 0;
    const steered = e.meanScore > 0 ? Math.max(0, parseFloat((e.meanScore + bias).toFixed(2))) : (bias !== 0 ? bias : 0);
    const biasStr = bias !== 0 ? (bias > 0 ? `+${bias.toFixed(1)}` : `${bias.toFixed(1)}`) : '0.0';
    lines.push(`| ${e.era} | ${e.count} | ${e.percentage}% | ${e.meanScore > 0 ? e.meanScore : 'N/A'} | ${biasStr} | **${steered > 0 ? steered : 'N/A'}** |`);
  }
  lines.push('');

  // 3. Adaptation Source Preference
  if (profile.sources.length > 0) {
    lines.push('## 3. Adaptation Source Preference');
    lines.push('| Source Material | Shows | Raw Avg | Baseline | User Bias | Steered Rating |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const s of profile.sources.slice(0, 5)) {
      const bias = biases.sources?.[s.source] || 0;
      const steered = Math.max(0, parseFloat((s.bayesianScore + bias).toFixed(2)));
      const biasStr = bias !== 0 ? (bias > 0 ? `+${bias.toFixed(1)}` : `${bias.toFixed(1)}`) : '0.0';
      lines.push(`| ${s.source} | ${s.count} | ${s.meanScore} | ${s.bayesianScore} | ${biasStr} | **${steered}** |`);
    }
    lines.push('');
  }

  // 4. Bayesian Genre Affinity (Including Contenders/Penalized that have user biases)
  const candidateGenres = [
    ...profile.topGenres,
    ...profile.contenderGenres.filter(c => (biases.genres?.[c.name] || 0) !== 0),
    ...profile.penalizedGenres.filter(p => (biases.genres?.[p.name] || 0) !== 0),
    ...(profile.contenderPenalizedGenres || []).filter(p => (biases.genres?.[p.name] || 0) !== 0)
  ];
  const seenGenres = new Set<string>();
  const uniqueCandidateGenres = candidateGenres.filter(g => {
    if (seenGenres.has(g.name)) return false;
    seenGenres.add(g.name);
    return true;
  });

  const steeredGenres = uniqueCandidateGenres.map(g => {
    const bias = biases.genres?.[g.name] || 0;
    const steered = Math.max(0, parseFloat((g.bayesianScore + bias).toFixed(2)));
    return { ...g, bias, steeredScore: steered };
  });
  steeredGenres.sort((a, b) => b.steeredScore - a.steeredScore);

  lines.push('## 4. Genre Affinity (Bayesian & Steered)');
  lines.push('| Genre | Watched | Historical Avg | Baseline | User Bias | Steered Rating |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const g of steeredGenres) {
    const biasStr = g.bias !== 0 ? (g.bias > 0 ? `+${g.bias.toFixed(1)}` : `${g.bias.toFixed(1)}`) : '0.0';
    lines.push(`| ${g.name} | ${g.count} | ${g.rawAverage} | ${g.bayesianScore} | ${biasStr} | **${g.steeredScore}** |`);
  }
  lines.push('');

  if (profile.penalizedGenres.length > 0) {
    lines.push('### Historically Penalized / Low Affinity Genres');
    lines.push(profile.penalizedGenres.map(g => {
      const bias = biases.genres?.[g.name] || 0;
      return bias !== 0 ? `${g.name} (Base: ${g.bayesianScore}, Steered: ${(g.bayesianScore + bias).toFixed(1)})` : `${g.name} (${g.bayesianScore})`;
    }).join(', '));
    lines.push('');
  }

  // 5. Studios (Including Contender studios that have user biases)
  const candidateStudios = [
    ...profile.topStudios,
    ...profile.contenderStudios.filter(c => (biases.studios?.[c.name] || 0) !== 0)
  ];
  const seenStudios = new Set<string>();
  const uniqueCandidateStudios = candidateStudios.filter(s => {
    if (seenStudios.has(s.name)) return false;
    seenStudios.add(s.name);
    return true;
  });
  const steeredStudios = uniqueCandidateStudios.map(s => {
    const bias = biases.studios?.[s.name] || 0;
    const steered = Math.max(0, parseFloat((s.bayesianScore + bias).toFixed(2)));
    return { ...s, bias, steeredScore: steered };
  });
  steeredStudios.sort((a, b) => b.steeredScore - a.steeredScore);

  if (steeredStudios.length > 0) {
    lines.push('## 5. Preferred Animation Studios');
    lines.push('| Studio | Shows | Raw Avg | Baseline | User Bias | Steered Rating |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const s of steeredStudios) {
      const biasStr = s.bias !== 0 ? (s.bias > 0 ? `+${s.bias.toFixed(1)}` : `${s.bias.toFixed(1)}`) : '0.0';
      lines.push(`| ${s.name} | ${s.count} | ${s.rawAverage} | ${s.bayesianScore} | ${biasStr} | **${s.steeredScore}** |`);
    }
    lines.push('');
  }

  // 6. Trope Salience with Steered Percentages & Dragged Additions
  const allTropeItems = [
    ...profile.lovedTropes,
    ...profile.hatedTropes,
    ...profile.availableTropes
  ];
  const tropeMap = new Map<string, TropeSalienceItem>();
  for (const t of allTropeItems) tropeMap.set(t.tag, t);

  const allRelevantTags = new Set([
    ...profile.lovedTropes.map(t => t.tag),
    ...profile.hatedTropes.map(t => t.tag),
    ...Object.keys(biases.tropes || {})
  ]);

  const activeLovedTags: string[] = [];
  const activeHatedTags: string[] = [];

  for (const tag of allRelevantTags) {
    const base = tropeMap.get(tag)?.score || 0;
    const bias = biases.tropes?.[tag] || 0;
    const steeredPct = Math.round((base + bias) * 10) / 10;
    if (steeredPct >= 0) {
      activeLovedTags.push(tag);
    } else {
      activeHatedTags.push(tag);
    }
  }

  const formatTrope = (tag: string) => {
    const base = tropeMap.get(tag)?.score || 0;
    const bias = biases.tropes?.[tag] || 0;
    const steeredPct = Math.round((base + bias) * 10) / 10;
    const sign = steeredPct > 0 ? `+${steeredPct}%` : `${steeredPct}%`;
    return bias !== 0 ? `${tag} (${sign} [bias: ${bias > 0 ? `+${bias.toFixed(1)}%` : `${bias.toFixed(1)}%`}])` : `${tag} (${sign})`;
  };

  lines.push('## 6. Trope & Micro-Theme Salience');
  lines.push(`- **Strongest Positive Themes**: ${activeLovedTags.map(formatTrope).join(', ') || 'N/A'}`);
  lines.push(`- **Disliked / Drop-Trigger Themes**: ${activeHatedTags.map(formatTrope).join(', ') || 'N/A'}`);
  lines.push('');

  // 7. Contrarian Divergence & Hidden Gems
  lines.push('## 7. Polarizing Shows & Contrarian Divergence (vs Community Consensus)');
  if (profile.contrarianLoves.length > 0) {
    lines.push('### Contrarian Favorites (Rated significantly higher than AniList average)');
    for (const c of profile.contrarianLoves) {
      lines.push(`- **${c.title}**: User **${c.userScore}** vs Community **${c.communityScore}** (Δ +${c.diff})`);
    }
    lines.push('');
  }

  if (profile.contrarianDislikes.length > 0) {
    lines.push('### Contrarian Dislikes / High-Profile Drops (User disliked what community praises)');
    for (const c of profile.contrarianDislikes) {
      lines.push(`- **${c.title}** [${c.status}]: User **${c.userScore || 'Dropped'}** vs Community **${c.communityScore}** (Δ ${c.diff})`);
    }
    lines.push('');
  }

  if (profile.hiddenGems && profile.hiddenGems.length > 0) {
    lines.push('### Hidden Gems (High User Rating & Low Community Popularity)');
    for (const g of profile.hiddenGems) {
      lines.push(`- **${g.title}**: User **${g.userScore}** (Popularity: ${g.popularity?.toLocaleString() || 'Niche'})`);
    }
    lines.push('');
  }

  // 8. Compressed Watchlist DSL Table
  lines.push('## 8. Full Compressed Watchlist (Anime-DSL)');
  lines.push('> Schema: STATUS | USER_SCORE | DIFF_VS_COMMUNITY | TITLE | FORMAT | PROGRESS/TOTAL | YEAR | SOURCE | STUDIO | GENRES | TOP_THEMES');
  lines.push('```text');
  for (const item of profile.allProcessed) {
    lines.push(serializeAnimeRow(item));
  }
  lines.push('```');

  return lines.join('\n');
}

/**
 * Triggers a client-side file download of the results.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
