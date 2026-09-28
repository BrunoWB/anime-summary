import { AniListGraphQLResponse, AniListCollection } from '../types/anilist.ts';

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
