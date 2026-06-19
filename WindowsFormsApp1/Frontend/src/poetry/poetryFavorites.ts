import type { PoetrySearchFilters } from './poetryTypes.js';

export const POETRY_FAVORITES_KEY = 'fusion-poetry-cloud-favorites-v1';

export function getFavoriteViewFilters(): PoetrySearchFilters {
  return {
    query: '',
    dynasty: '全部',
    form: '全部',
    mode: '全部'
  };
}

export function parseFavoritePoems(value: string | null | undefined): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0));
  } catch {
    return new Set();
  }
}

export function serializeFavoritePoems(favorites: Set<string>): string {
  return JSON.stringify([...favorites].sort());
}

export function toggleFavoritePoem(favorites: Set<string>, poemId: string): Set<string> {
  const next = new Set(favorites);
  if (next.has(poemId)) next.delete(poemId);
  else next.add(poemId);
  return next;
}
