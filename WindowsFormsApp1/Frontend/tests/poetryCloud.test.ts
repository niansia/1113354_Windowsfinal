import test from 'node:test';
import assert from 'node:assert/strict';
import { POETS, POEMS } from '../src/poetry/poetryCorpus.js';
import { analyzePoem } from '../src/poetry/poetryAnalysis.js';
import {
  getFavoriteViewFilters,
  parseFavoritePoems,
  serializeFavoritePoems,
  toggleFavoritePoem
} from '../src/poetry/poetryFavorites.js';
import { buildPoetryGraph, findPoetPath } from '../src/poetry/poetryGraph.js';
import { createPoetryLayout } from '../src/poetry/poetryLayout.js';
import { getPoetryDisplayStats, mergeCorpus } from '../src/poetry/poetryRemoteCorpus.js';
import { searchPoetry } from '../src/poetry/poetrySearch.js';

test('searches poet names, poem titles, lines, and themes', () => {
  const result = searchPoetry(POETS, POEMS, {
    query: '明月',
    dynasty: '全部',
    form: '全部',
    mode: '全部'
  });

  assert.ok(result.poems.some((poem) => poem.content.some((line) => line.includes('明月'))));
  assert.ok(result.poets.some((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
  assert.ok(result.total > 0);
});

test('filters poetry by dynasty and form without mutating the corpus', () => {
  const originalCount = POEMS.length;
  const result = searchPoetry(POETS, POEMS, {
    query: '',
    dynasty: '唐',
    form: '七絕',
    mode: '詩作'
  });

  assert.ok(result.poems.length > 0);
  assert.ok(result.poems.every((poem) => poem.dynasty === '唐' && poem.form === '七絕'));
  assert.ok(result.poets.every((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
  assert.equal(POEMS.length, originalCount);
});

test('hides unrelated poets when a poem form filter is active', () => {
  const result = searchPoetry(POETS, POEMS, {
    query: '',
    dynasty: '全部',
    form: '樂府',
    mode: '全部'
  });

  assert.equal(result.poems.length, 1);
  assert.ok(result.poets.every((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
});

test('builds explainable poet relations and finds the shortest route', () => {
  const graph = buildPoetryGraph(POETS, POEMS);
  const path = findPoetPath(graph, 'li-bai', 'du-fu');

  assert.ok(graph.edges.some((edge) => edge.reason.length > 0));
  assert.deepEqual(path.poetIds, ['li-bai', 'du-fu']);
  assert.equal(path.edges.length, 1);
  assert.match(path.edges[0].reason, /唐|交遊|詩風|意象/);
});

test('creates a deterministic bounded star-map layout', () => {
  const graph = buildPoetryGraph(POETS, POEMS);
  const first = createPoetryLayout(graph, { width: 1200, height: 760, seed: 42 });
  const second = createPoetryLayout(graph, { width: 1200, height: 760, seed: 42 });

  assert.deepEqual(first, second);
  assert.ok(first.every((node) => node.x >= 60 && node.x <= 1140));
  assert.ok(first.every((node) => node.y >= 60 && node.y <= 700));
  assert.ok(first.every((node) => node.radius >= 8 && node.radius <= 28));
});

test('produces a deterministic local appreciation from poem metadata', () => {
  const poem = POEMS.find((item) => item.id === 'quiet-night-thought');
  assert.ok(poem);

  const analysis = analyzePoem(poem);

  assert.match(analysis.summary, /月|鄉|夜/);
  assert.ok(analysis.images.includes('月'));
  assert.ok(analysis.mood.length > 0);
  assert.ok(analysis.craft.length >= 2);
});

test('round-trips favorites and ignores malformed local data', () => {
  const favorites = toggleFavoritePoem(new Set<string>(), 'quiet-night-thought');
  const restored = parseFavoritePoems(serializeFavoritePoems(favorites));

  assert.deepEqual([...restored], ['quiet-night-thought']);
  assert.deepEqual([...parseFavoritePoems('{broken')], []);
  assert.deepEqual([...toggleFavoritePoem(restored, 'quiet-night-thought')], []);
});

test('resets search constraints when entering the favorites view', () => {
  assert.deepEqual(getFavoriteViewFilters(), {
    query: '',
    dynasty: '全部',
    form: '全部',
    mode: '全部'
  });
});

test('reports expanded archive totals separately from loaded poem text', () => {
  const corpus = mergeCorpus(POETS, POEMS, {
    meta: {
      source: 'combined public poetry archive',
      sourceUrl: 'https://example.test/archive',
      poets: 3000,
      poemsWithText: 8200,
      totalAvailablePoems: 335000,
      edges: 5000
    },
    poets: [],
    poems: [],
    edges: []
  });

  const stats = getPoetryDisplayStats(corpus);

  assert.equal(stats.archivePoets, 32657);
  assert.equal(stats.archivePoems, 933857);
  assert.equal(stats.loadedPoets, POETS.length);
  assert.equal(stats.loadedTextPoems, Math.max(POEMS.length, 8200));
});
