export interface AniListTag {
  name: string;
  rank: number;
  category?: string;
  isMediaSpoiler: boolean;
}

export interface AniListStudioNode {
  name: string;
  isAnimationStudio?: boolean;
}

export interface AniListStaffEdge {
  role: string;
  node: {
    name: {
      full: string;
    };
  };
}

export interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
  };
  format: string | null;
  episodes: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear: number | null;
  startDate?: {
    year: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  endDate?: {
    year: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  airingStatus?: string | null;
  source: string | null;
  countryOfOrigin?: string | null;
  averageScore: number | null;
  popularity?: number | null;
  favourites?: number | null;
  genres: string[];
  tags: AniListTag[];
  studios: {
    nodes: AniListStudioNode[];
  };
  staff: {
    edges: AniListStaffEdge[];
  };
}

export interface FuzzyDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export type BaseBiasMode = 'none' | 'recency';

export interface AniListEntry {
  status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING' | string;
  score: number;
  progress: number;
  repeat: number;
  notes: string | null;
  updatedAt?: number | null;
  createdAt?: number | null;
  startedAt?: FuzzyDate | null;
  completedAt?: FuzzyDate | null;
  media: AniListMedia;
}

export interface AniListMediaList {
  name: string;
  entries: AniListEntry[];
}

export interface AniListCollection {
  lists: AniListMediaList[];
}

export interface AniListGraphQLResponse {
  data?: {
    MediaListCollection?: AniListCollection;
  };
  errors?: Array<{ message: string }>;
}

export interface ProcessedAnime {
  id: number;
  title: string;
  status: string;
  score: number;
  communityScore: number;
  diff: number | null;
  progress: number;
  episodes: number | null;
  duration: number;
  completionRatio: number;
  format: string;
  year: number | null;
  source: string;
  popularity: number;
  primaryStudio: string;
  genres: string[];
  salientTags: string[];
  viewDate?: Date | null;
  recencyWeight?: number;
}

export interface AffinityItem {
  name: string;
  count: number;
  rawAverage: number;
  bayesianScore: number;
  bias?: number;
  steeredScore?: number;
}

export interface TasteBiases {
  genres: Record<string, number>;
  eras: Record<string, number>;
  tropes: Record<string, number>;
  sources: Record<string, number>;
  studios: Record<string, number>;
}

export interface SummarySectionToggles {
  genres: boolean;
  tropes: boolean;
  studios: boolean;
  eras: boolean;
  divergence: boolean;
}

export const createDefaultSummarySections = (): SummarySectionToggles => ({
  genres: true,
  tropes: true,
  studios: true,
  eras: true,
  divergence: true
});

export const createEmptyBiases = (): TasteBiases => ({
  genres: {},
  eras: {},
  tropes: {},
  sources: {},
  studios: {}
});

export interface EraItem {
  era: string;
  count: number;
  meanScore: number;
  percentage: number;
  bias?: number;
  steeredScore?: number;
}

export interface SourceItem {
  source: string;
  count: number;
  meanScore: number;
  bayesianScore: number;
  bias?: number;
  steeredScore?: number;
}

export interface TropeSalienceItem {
  tag: string;
  score: number;
  topFrequency: number;
  droppedFrequency: number;
  salience: number;
  bias?: number;
  steeredScore?: number;
  meetsThreshold?: boolean;
}

export interface DivergenceItem {
  title: string;
  userScore: number;
  communityScore: number;
  diff: number;
  status: string;
  popularity?: number;
}

export interface TasteProfile {
  username: string;
  totalEntries: number;
  scoredEntries: number;
  meanScore: number;
  stdDev: number;
  p10: number;
  p50: number;
  p90: number;
  completedCount: number;
  droppedCount: number;
  watchingCount: number;
  planningCount: number;
  dropRatePercent: number;
  averageCommitmentRatio: number;
  totalHoursWatched: number;
  meanPopularity: number;
  topGenres: AffinityItem[];
  contenderGenres: AffinityItem[];
  penalizedGenres: AffinityItem[];
  contenderPenalizedGenres: AffinityItem[];
  availableGenres?: AffinityItem[];
  topStudios: AffinityItem[];
  contenderStudios: AffinityItem[];
  eras: EraItem[];
  sources: SourceItem[];
  contrarianLoves: DivergenceItem[];
  contrarianDislikes: DivergenceItem[];
  hiddenGems: DivergenceItem[];
  lovedTropes: TropeSalienceItem[];
  hatedTropes: TropeSalienceItem[];
  availableTropes: TropeSalienceItem[];
  allProcessed: ProcessedAnime[];
  baseBias?: BaseBiasMode;
}


export type EndDateSource = 'endDate' | 'startDate' | 'today' | 'unknown';

export interface DateFixerRow {
  mediaId: number;
  title: string;
  listStatus: string;              // COMPLETED, DROPPED, PAUSED, CURRENT, PLANNING, REPEATING
  watchDate: FuzzyDate | null;     // current completedAt
  pendingWatchDate: FuzzyDate | null; // pending (after user action), undefined = no change queued
  hasPendingChange: boolean;
  animeEndDate: FuzzyDate | null;  // resolved effective date
  endDateSource: EndDateSource;
  discrepancyDays: number | null;  // watchDate - animeEndDate in days (signed)
  updatedAt?: number | null;
}

export interface DatePatch {
  mediaId: number;
  title: string;
  completedAt: FuzzyDate | null;   // null = clear the date
}

export interface PatchResult {
  success: boolean;
  status: number;
  isRetryable: boolean;
  errorMessage?: string;
  retryAfterSeconds?: number;
}

export interface PatchLogEntry {
  id: string;
  timestamp: string;
  batch: number;
  mediaId: number;
  title: string;
  type: 'success' | 'retryable' | 'error' | 'info';
  message: string;
}
