import { loadSportsSnapshot } from './sportsProviders.js';
import type {
  SportsCompetition,
  SportsDataSnapshot,
  SportsEvent
} from './sportsTypes.js';

export interface SportsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

interface StoredSportsSnapshot {
  version: 1;
  savedAt: number;
  snapshot: SportsDataSnapshot;
}

const readStored = (
  storage: SportsStorage | undefined,
  cacheKey: string
): StoredSportsSnapshot | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSportsSnapshot>;
    if (
      parsed.version !== 1 ||
      !Number.isFinite(parsed.savedAt) ||
      !parsed.snapshot ||
      !Array.isArray(parsed.snapshot.events)
    ) {
      return null;
    }
    return parsed as StoredSportsSnapshot;
  } catch {
    return null;
  }
};

export function writeSportsCache(
  storage: SportsStorage | undefined,
  cacheKey: string,
  snapshot: SportsDataSnapshot,
  savedAt = Date.now()
): void {
  if (!storage) return;
  try {
    storage.setItem(cacheKey, JSON.stringify({
      version: 1,
      savedAt,
      snapshot
    } satisfies StoredSportsSnapshot));
  } catch {
    // Cache availability must never block scores or predictions.
  }
}

export function readSportsCache(
  storage: SportsStorage | undefined,
  cacheKey: string,
  nowMs = Date.now(),
  ttlMs = 45_000
): SportsDataSnapshot | null {
  const stored = readStored(storage, cacheKey);
  if (!stored || nowMs - stored.savedAt > ttlMs) return null;
  return {
    ...stored.snapshot,
    mode: 'cache'
  };
}

export async function loadSportsCenterData(options: {
  cacheKey: string;
  storage?: SportsStorage;
  nowMs?: number;
  ttlMs?: number;
  force?: boolean;
  competitions: readonly SportsCompetition[];
  dateKey: string;
  fallbackEvents: readonly SportsEvent[];
  fetcher?: typeof fetch;
}): Promise<SportsDataSnapshot> {
  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = options.ttlMs ?? 45_000;
  const fresh = readSportsCache(options.storage, options.cacheKey, nowMs, ttlMs);
  if (fresh && !options.force) return fresh;

  const stale = readStored(options.storage, options.cacheKey)?.snapshot ?? null;
  const snapshot = await loadSportsSnapshot({
    competitions: options.competitions,
    dateKey: options.dateKey,
    fallbackEvents: options.fallbackEvents,
    fetcher: options.fetcher,
    now: () => new Date(nowMs)
  });

  if (snapshot.mode === 'live') {
    writeSportsCache(options.storage, options.cacheKey, snapshot, nowMs);
    return snapshot;
  }

  if (!snapshot.events.length && stale?.events.length) {
    return {
      ...stale,
      mode: 'cache',
      warning: '遠端更新失敗，顯示快取資料。'
    };
  }

  return snapshot;
}
