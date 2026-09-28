import { TasteProfile, ProcessedAnime, TasteBiases, createEmptyBiases, TropeSalienceItem, SummarySectionToggles } from '../types/anilist.ts';

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
export function generateLlmMarkdown(
  profile: TasteProfile,
  biases: TasteBiases = createEmptyBiases(),
  excludedTropes: string[] = [],
  promotedGenres: string[] = [],
  demotedGenres: string[] = [],
  promotedStudios: string[] = [],
  demotedStudios: string[] = [],
  summarySections?: Partial<SummarySectionToggles>
): string {
  const enabledSections = {
    genres: summarySections?.genres ?? true,
    tropes: summarySections?.tropes ?? true,
    studios: summarySections?.studios ?? true,
    eras: summarySections?.eras ?? true,
    divergence: summarySections?.divergence ?? true,
  };

  const lines: string[] = [];

  lines.push(`# ANIME TASTE PROFILE: ${profile.username}`);
  lines.push(`> Dense mathematical summary & compressed watchlist for LLM ingestion.`);
  lines.push('');

  // Pre-build map of trope items for lookup
  const allTropeItems = [
    ...profile.lovedTropes,
    ...profile.hatedTropes,
    ...profile.availableTropes
  ];
  const tropeMap = new Map<string, TropeSalienceItem>();
  for (const t of allTropeItems) tropeMap.set(t.tag, t);

  // Multi-Category Active Session Biases (only for included sections)
  const activeGenreBiases = enabledSections.genres ? Object.entries(biases.genres || {}).filter(([_, b]) => b !== 0) : [];
  const activeEraBiases = enabledSections.eras ? Object.entries(biases.eras || {}).filter(([_, b]) => b !== 0) : [];
  const activeTropeBiases = enabledSections.tropes ? Object.entries(biases.tropes || {}).filter(([_, b]) => b !== 0) : [];
  const activeSourceBiases = enabledSections.eras ? Object.entries(biases.sources || {}).filter(([_, b]) => b !== 0) : [];
  const activeStudioBiases = enabledSections.studios ? Object.entries(biases.studios || {}).filter(([_, b]) => b !== 0) : [];

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
      const tropeStrings = activeTropeBiases.map(([n, b]) => {
        const base = tropeMap.get(n)?.score ?? 0;
        const steered = Math.round((base + b) * 10) / 10;
        if (b > 0) {
          return `${n} (+${b.toFixed(1)} Boost -> +${steered.toFixed(1)}%)`;
        } else if (steered > 0) {
          return `${n} (${b.toFixed(1)} Calibrated -> +${steered.toFixed(1)}% Favored)`;
        } else {
          return `${n} (${b.toFixed(1)} Penalty -> ${steered.toFixed(1)}%)`;
        }
      });
      lines.push(`- **Micro-Themes**: ${tropeStrings.join(', ')}`);
    }
    if (activeSourceBiases.length > 0) {
      lines.push(`- **Source Material**: ${activeSourceBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Penalty`})`).join(', ')}`);
    }
    if (activeStudioBiases.length > 0) {
      lines.push(`- **Studios**: ${activeStudioBiases.map(([n, b]) => `${n} (${b > 0 ? `+${b.toFixed(1)} Boost` : `${b.toFixed(1)} Penalty`})`).join(', ')}`);
    }
    lines.push('');
    lines.push('**Directive for LLM**: Prioritize recommendations and filter choices according to these user-adjusted biases above rather than defaulting solely to past watch volume. Note: Themes calibrated downward but remaining positive are favored themes (normalized to balance variety), not negative filters.');
    lines.push('');
  }

  let sectionIndex = 1;

  // 1. Core Mathematical Metrics
  lines.push(`## ${sectionIndex++}. Mathematical Metrics & Distribution`);
  lines.push(`- **Total Entries**: ${profile.totalEntries} (Scored: ${profile.scoredEntries})`);
  lines.push(`- **Estimated Time Invested**: ~${profile.totalHoursWatched.toLocaleString()} hours watched`);
  lines.push(`- **Score Statistics**: Mean: ${profile.meanScore}/10 | StdDev: ${profile.stdDev} | P10: ${profile.p10} | Median (P50): ${profile.p50} | P90: ${profile.p90}`);
  lines.push(`- **List Breakdown**: Completed: ${profile.completedCount} | Dropped: ${profile.droppedCount} (${profile.dropRatePercent}% drop rate) | Watching: ${profile.watchingCount} | Plan: ${profile.planningCount}`);
  lines.push(`- **Dropped Anime Average Commitment**: ${(profile.averageCommitmentRatio * 100).toFixed(0)}% of total episodes before dropping`);
  lines.push('');

  // 2. Era & Modernity Bias
  if (enabledSections.eras) {
    lines.push(`## ${sectionIndex++}. Release Era & Modernity Profile`);
    lines.push('| Era | Shows | Share | Historical Mean | User Bias | Steered Rating |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const e of profile.eras) {
      const bias = biases.eras?.[e.era] || 0;
      const steered = e.meanScore > 0 ? Math.max(0, parseFloat((e.meanScore + bias).toFixed(2))) : (bias !== 0 ? bias : 0);
      const biasStr = bias !== 0 ? (bias > 0 ? `+${bias.toFixed(1)}` : `${bias.toFixed(1)}`) : '0.0';
      lines.push(`| ${e.era} | ${e.count} | ${e.percentage}% | ${e.meanScore > 0 ? e.meanScore : 'N/A'} | ${biasStr} | **${steered > 0 ? steered : 'N/A'}** |`);
    }
    lines.push('');

    // Adaptation Source Preference
    if (profile.sources.length > 0) {
      lines.push(`## ${sectionIndex++}. Adaptation Source Preference`);
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
  }

  // 3. Bayesian Genre Affinity
  if (enabledSections.genres) {
    const allCandidateGenres = [
      ...(profile.availableGenres || []),
      ...profile.topGenres,
      ...profile.contenderGenres,
      ...profile.penalizedGenres,
      ...(profile.contenderPenalizedGenres || [])
    ];
    const seenAllGenres = new Set<string>();
    const dedupedPool = allCandidateGenres.filter(g => {
      if (seenAllGenres.has(g.name)) return false;
      seenAllGenres.add(g.name);
      return true;
    });

    const candidateGenres = profile.topGenres.filter(g => !demotedGenres.includes(g.name));
    for (const g of dedupedPool) {
      if (promotedGenres.includes(g.name) && !candidateGenres.some(x => x.name === g.name)) {
        candidateGenres.push(g);
      }
    }
    for (const g of dedupedPool) {
      if ((biases.genres?.[g.name] || 0) !== 0 && !candidateGenres.some(x => x.name === g.name) && !demotedGenres.includes(g.name)) {
        candidateGenres.push(g);
      }
    }
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

    lines.push(`## ${sectionIndex++}. Genre Affinity (Bayesian & Steered)`);
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
  }

  // 4. Studios
  const candidateStudios = profile.topStudios.filter(s => !demotedStudios.includes(s.name));
  for (const s of profile.contenderStudios) {
    if (promotedStudios.includes(s.name) && !candidateStudios.some(x => x.name === s.name)) {
      candidateStudios.push(s);
    }
  }
  for (const s of profile.contenderStudios) {
    if ((biases.studios?.[s.name] || 0) !== 0 && !candidateStudios.some(x => x.name === s.name) && !demotedStudios.includes(s.name)) {
      candidateStudios.push(s);
    }
  }
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

  if (enabledSections.studios && steeredStudios.length > 0) {
    lines.push(`## ${sectionIndex++}. Preferred Animation Studios`);
    lines.push('| Studio | Shows | Raw Avg | Baseline | User Bias | Steered Rating |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const s of steeredStudios) {
      const biasStr = s.bias !== 0 ? (s.bias > 0 ? `+${s.bias.toFixed(1)}` : `${s.bias.toFixed(1)}`) : '0.0';
      lines.push(`| ${s.name} | ${s.count} | ${s.rawAverage} | ${s.bayesianScore} | ${biasStr} | **${s.steeredScore}** |`);
    }
    lines.push('');
  }

  // 5. Trope Salience
  if (enabledSections.tropes) {
    const allRelevantTags = new Set([
      ...profile.lovedTropes.map(t => t.tag).filter(t => !excludedTropes.includes(t)),
      ...profile.hatedTropes.map(t => t.tag).filter(t => !excludedTropes.includes(t)),
      ...Object.keys(biases.tropes || {}).filter(t => !excludedTropes.includes(t))
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

    // Sort loved tags descending by net steered score, and hated tags ascending (most negative first)
    activeLovedTags.sort((a, b) => {
      const scoreA = (tropeMap.get(a)?.score || 0) + (biases.tropes?.[a] || 0);
      const scoreB = (tropeMap.get(b)?.score || 0) + (biases.tropes?.[b] || 0);
      return scoreB - scoreA;
    });
    activeHatedTags.sort((a, b) => {
      const scoreA = (tropeMap.get(a)?.score || 0) + (biases.tropes?.[a] || 0);
      const scoreB = (tropeMap.get(b)?.score || 0) + (biases.tropes?.[b] || 0);
      return scoreA - scoreB;
    });

    const formatTrope = (tag: string) => {
      const base = tropeMap.get(tag)?.score || 0;
      const bias = biases.tropes?.[tag] || 0;
      const steeredPct = Math.round((base + bias) * 10) / 10;
      const sign = steeredPct > 0 ? `+${steeredPct}%` : `${steeredPct}%`;
      if (bias !== 0) {
        if (bias < 0 && steeredPct > 0) {
          return `${tag} (${sign} [calibrated down from +${base.toFixed(1)}%])`;
        } else if (bias > 0) {
          return `${tag} (${sign} [boosted +${bias.toFixed(1)}%])`;
        } else {
          return `${tag} (${sign} [penalized ${bias.toFixed(1)}%])`;
        }
      }
      return `${tag} (${sign})`;
    };

    lines.push(`## ${sectionIndex++}. Trope & Micro-Theme Salience`);
    lines.push(`- **Strongest Positive Themes**: ${activeLovedTags.map(formatTrope).join(', ') || 'N/A'}`);
    lines.push(`- **Disliked / Drop-Trigger Themes**: ${activeHatedTags.map(formatTrope).join(', ') || 'N/A'}`);
    lines.push('');
  }

  // 6. Contrarian Divergence & Hidden Gems
  if (enabledSections.divergence) {
    lines.push(`## ${sectionIndex++}. Polarizing Shows & Contrarian Divergence (vs Community Consensus)`);
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
  }

  // Full Compressed Watchlist DSL Table
  lines.push(`## ${sectionIndex++}. Full Compressed Watchlist (Anime-DSL)`);
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
