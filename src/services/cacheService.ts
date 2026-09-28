import { AniListCollection, TasteBiases, BaseBiasMode } from '../types/anilist.ts';

const DB_NAME = 'AnimeSummaryDB';
const DB_VERSION = 1;
const STORE_NAME = 'query_cache';
const CACHE_KEY = 'last_query';
const STEERING_PREFIX = 'anime_summary_steering_';

export interface CachedQueryData {
  username: string;
  timestamp: number;
  count: number;
  collection: AniListCollection;
}

export interface CachedQueryMeta {
  username: string;
  timestamp: number;
  count: number;
}

export interface UserSteeringState {
  biases: TasteBiases;
  promotedGenres: string[];
  promotedPenalizedGenres: string[];
  promotedStudios: string[];
  demotedGenres?: string[];
  demotedPenalizedGenres?: string[];
  demotedStudios?: string[];
  includedTropes?: string[];
  excludedTropes?: string[];
  baseBias?: BaseBiasMode;
  timestamp: number;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save query data into IndexedDB (keyed by both 'last_query' and 'user_<username>')
 */
export async function saveLastQuery(username: string, collection: AniListCollection): Promise<void> {
  let count = 0;
  for (const list of collection.lists) {
    count += list.entries.length;
  }

  const payload: CachedQueryData = {
    username,
    timestamp: Date.now(),
    count,
    collection
  };

  const norm = normalizeUsername(username);
  const userKey = `user_${norm}`;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(payload, CACHE_KEY);
      store.put(payload, userKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Save lightweight metadata to localStorage
    const meta: CachedQueryMeta = { username, timestamp: payload.timestamp, count };
    localStorage.setItem('anime_summary_last_query_meta', JSON.stringify(meta));
    localStorage.setItem(`anime_summary_user_${norm}_meta`, JSON.stringify(meta));
  } catch (err) {
    console.warn('Failed to save to IndexedDB, falling back to localStorage if size allows:', err);
    try {
      localStorage.setItem('anime_summary_last_query_payload', JSON.stringify(payload));
      localStorage.setItem(`anime_summary_user_${norm}_payload`, JSON.stringify(payload));
    } catch (e) {
      console.error('Cache payload exceeded localStorage capacity:', e);
    }
  }
}

/**
 * Get the cached query metadata for displaying the button
 */
export function getCachedQueryMeta(): CachedQueryMeta | null {
  try {
    const raw = localStorage.getItem('anime_summary_last_query_meta');
    if (!raw) return null;
    return JSON.parse(raw) as CachedQueryMeta;
  } catch {
    return null;
  }
}

/**
 * Load the last cached query data from IndexedDB
 */
export async function loadLastQuery(): Promise<CachedQueryData | null> {
  try {
    const db = await openDB();
    return await new Promise<CachedQueryData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve((req.result as CachedQueryData) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB, checking localStorage fallback:', err);
    try {
      const fallback = localStorage.getItem('anime_summary_last_query_payload');
      if (fallback) {
        return JSON.parse(fallback) as CachedQueryData;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Check if a specific user's query data is saved locally and load it
 */
export async function loadUserQuery(username: string): Promise<CachedQueryData | null> {
  if (!username) return null;
  const norm = normalizeUsername(username);
  const userKey = `user_${norm}`;

  try {
    const db = await openDB();
    const data = await new Promise<CachedQueryData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userKey);
      req.onsuccess = () => resolve((req.result as CachedQueryData) || null);
      req.onerror = () => reject(req.error);
    });
    if (data) return data;
  } catch (err) {
    console.warn(`Failed to load ${username} from IndexedDB:`, err);
  }

  // Fallback: check if 'last_query' happens to match this user
  try {
    const last = await loadLastQuery();
    if (last && normalizeUsername(last.username) === norm) {
      return last;
    }
  } catch {
    // ignore
  }

  // Fallback to localStorage payload
  try {
    const fallback = localStorage.getItem(`anime_summary_user_${norm}_payload`);
    if (fallback) {
      return JSON.parse(fallback) as CachedQueryData;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Delete the cached query for a user
 */
export async function deleteUserQuery(username: string): Promise<void> {
  const norm = normalizeUsername(username);
  const userKey = `user_${norm}`;
  clearUserSteering(username);

  try {
    localStorage.removeItem(`anime_summary_user_${norm}_meta`);
    localStorage.removeItem(`anime_summary_user_${norm}_payload`);
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(userKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Failed to delete ${username} from IndexedDB:`, err);
  }

  const lastMeta = getCachedQueryMeta();
  if (lastMeta && normalizeUsername(lastMeta.username) === norm) {
    await clearLastQuery();
  }
}

/**
 * Delete the last cached query
 */
export async function clearLastQuery(): Promise<void> {
  try {
    const lastMeta = getCachedQueryMeta();
    if (lastMeta) {
      const norm = normalizeUsername(lastMeta.username);
      clearUserSteering(lastMeta.username);
      localStorage.removeItem(`anime_summary_user_${norm}_meta`);
      localStorage.removeItem(`anime_summary_user_${norm}_payload`);
    }
    localStorage.removeItem('anime_summary_last_query_meta');
    localStorage.removeItem('anime_summary_last_query_payload');
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete from IndexedDB:', err);
  }
}

/**
 * Persist user steering state (biases and promoted items) into localStorage
 */
export function saveUserSteering(
  username: string,
  steering: {
    biases: TasteBiases;
    promotedGenres?: string[];
    promotedPenalizedGenres?: string[];
    promotedStudios?: string[];
    demotedGenres?: string[];
    demotedPenalizedGenres?: string[];
    demotedStudios?: string[];
    includedTropes?: string[];
    excludedTropes?: string[];
    baseBias?: BaseBiasMode;
  }
): void {
  if (!username) return;
  const norm = normalizeUsername(username);
  const state: UserSteeringState = {
    biases: steering.biases,
    promotedGenres: steering.promotedGenres || [],
    promotedPenalizedGenres: steering.promotedPenalizedGenres || [],
    promotedStudios: steering.promotedStudios || [],
    demotedGenres: steering.demotedGenres || [],
    demotedPenalizedGenres: steering.demotedPenalizedGenres || [],
    demotedStudios: steering.demotedStudios || [],
    includedTropes: steering.includedTropes || [],
    excludedTropes: steering.excludedTropes || [],
    baseBias: steering.baseBias || 'none',
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(`${STEERING_PREFIX}${norm}`, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save user steering to localStorage:', err);
  }
}

/**
 * Load user steering state (biases and promoted items) from localStorage
 */
export function loadUserSteering(username: string): UserSteeringState | null {
  if (!username) return null;
  const norm = normalizeUsername(username);
  try {
    const raw = localStorage.getItem(`${STEERING_PREFIX}${norm}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserSteeringState;
  } catch (err) {
    console.warn('Failed to parse user steering:', err);
    return null;
  }
}

/**
 * Clear user steering from localStorage
 */
export function clearUserSteering(username: string): void {
  if (!username) return;
  const norm = normalizeUsername(username);
  try {
    localStorage.removeItem(`${STEERING_PREFIX}${norm}`);
  } catch (err) {
    console.warn('Failed to clear user steering:', err);
  }
}
