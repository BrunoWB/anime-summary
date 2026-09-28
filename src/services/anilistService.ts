import { AniListGraphQLResponse, AniListCollection, FuzzyDate, PatchResult } from '../types/anilist.ts';

export const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

export const ENRICHED_ANIME_LIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      entries {
        status
        score(format: POINT_10_DECIMAL)
        progress
        repeat
        notes
        updatedAt
        createdAt
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        media {
          id
          title {
            romaji
            english
          }
          format
          episodes
          duration
          season
          seasonYear
          startDate {
            year
          }
          source
          countryOfOrigin
          isAdult
          averageScore
          popularity
          favourites
          genres
          tags {
            name
            rank
            category
            isMediaSpoiler
          }
          studios(isMain: true) {
            nodes {
              name
              isAnimationStudio
            }
          }
          staff(perPage: 3, sort: [RELEVANCE]) {
            edges {
              role
              node {
                name {
                  full
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Fetch Anime List from AniList GraphQL API by Username with enriched metadata
 */
export async function fetchAniListByUsername(username: string): Promise<AniListCollection> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Please enter an AniList username.');
  }

  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: ENRICHED_ANIME_LIST_QUERY,
      variables: {
        username: cleanUsername,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`AniList user "${cleanUsername}" was not found.`);
    }
    if (response.status === 429) {
      throw new Error('AniList API rate limit reached. Please wait a minute and try again.');
    }
    const errText = await response.text();
    throw new Error(`AniList API error (${response.status}): ${errText}`);
  }

  const result: AniListGraphQLResponse = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  if (!result.data?.MediaListCollection) {
    throw new Error(`No anime list found for user "${cleanUsername}".`);
  }

  return result.data.MediaListCollection;
}

/**
 * Load offline mock dump from public directory
 */
export async function loadMockDump(): Promise<{ collection: AniListCollection; username: string }> {
  const response = await fetch('/mockDump.json');
  if (!response.ok) {
    throw new Error('Failed to load local mock dump file.');
  }
  const result: AniListGraphQLResponse = await response.json();
  if (!result.data?.MediaListCollection) {
    throw new Error('Invalid format in local mock dump.');
  }
  return {
    collection: result.data.MediaListCollection,
    username: 'Demo User (Sample Dump)'
  };
}


export const END_DATE_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      entries {
        completedAt { year month day }
        updatedAt
        status
        media {
          id
          status
          endDate { year month day }
          startDate { year month day }
        }
      }
    }
  }
}
`;

export async function fetchEndDates(username: string): Promise<Map<number, { endDate: FuzzyDate|null, startDate: FuzzyDate|null, airingStatus: string|null, completedAt: FuzzyDate|null, listStatus: string, updatedAt?: number|null }>> {
  const cleanUsername = username.trim();
  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: END_DATE_QUERY,
      variables: { username: cleanUsername },
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch end dates.');
  }
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors.map((e: any) => e.message).join(', '));
  }
  const collection = result.data?.MediaListCollection;
  const map = new Map();
  if (collection?.lists) {
    for (const list of collection.lists) {
      if (list.entries) {
        for (const entry of list.entries) {
          map.set(entry.media.id, {
            endDate: entry.media.endDate,
            startDate: entry.media.startDate,
            airingStatus: entry.media.status,
            completedAt: entry.completedAt,
            listStatus: entry.status,
            updatedAt: entry.updatedAt,
          });
        }
      }
    }
  }
  return map;
}

export async function verifyAniListToken(token: string): Promise<string> {
  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `query { Viewer { id name } }`
    }),
  });
  if (!response.ok) {
    throw new Error('Token verification failed.');
  }
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors.map((e: any) => e.message).join(', '));
  }
  if (!result.data?.Viewer?.name) {
    throw new Error('Invalid token or no username returned.');
  }
  return result.data.Viewer.name;
}

export async function patchCompletedDate(
  mediaId: number,
  completedAt: FuzzyDate | null,
  token: string
): Promise<PatchResult> {
  const mutation = `
mutation ($mediaId: Int, $completedAt: FuzzyDateInput) {
  SaveMediaListEntry(mediaId: $mediaId, completedAt: $completedAt) {
    id
    mediaId
    completedAt { year month day }
  }
}
  `;

  try {
    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          mediaId,
          completedAt: completedAt ? {
            year: completedAt.year,
            month: completedAt.month,
            day: completedAt.day
          } : null
        },
      }),
    });

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

    // 1. Rate Limit (HTTP 429)
    if (response.status === 429) {
      return {
        success: false,
        status: 429,
        isRetryable: true,
        errorMessage: 'Rate limit reached (HTTP 429: Too Many Requests)',
        retryAfterSeconds: !isNaN(retryAfterSeconds || NaN) ? retryAfterSeconds : undefined
      };
    }

    // 2. Server Temporary Error (5xx)
    if (response.status >= 500) {
      return {
        success: false,
        status: response.status,
        isRetryable: true,
        errorMessage: `AniList server error (HTTP ${response.status})`
      };
    }

    // 3. Client True Errors (401 Unauthorized, 403 Forbidden, etc.)
    if (response.status === 401) {
      return {
        success: false,
        status: 401,
        isRetryable: false,
        errorMessage: 'Unauthorized (HTTP 401). Invalid or expired token.'
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        status: response.status,
        isRetryable: false,
        errorMessage: `HTTP error ${response.status}: ${errText.slice(0, 100)}`
      };
    }

    const result = await response.json();

    // 4. GraphQL response errors
    if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors.map((e: any) => e.message).join(', ');
      const lower = errorMsg.toLowerCase();
      const isThrottled = lower.includes('rate limit') || lower.includes('too many requests') || result.errors.some((e: any) => e.status === 429);

      return {
        success: false,
        status: isThrottled ? 429 : 400,
        isRetryable: isThrottled,
        errorMessage: errorMsg
      };
    }

    return {
      success: true,
      status: 200,
      isRetryable: false
    };
  } catch (err: any) {
    // Network drops / connection exceptions
    return {
      success: false,
      status: 0,
      isRetryable: true,
      errorMessage: err?.message || 'Network request failed'
    };
  }
}
