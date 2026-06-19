import test from 'node:test';
import assert from 'node:assert/strict';
import {
  benchmarkSortAlgorithms,
  createDatasetPreset,
  parseNumberList,
  runSearchTrace,
  runSortTrace
} from '../src/devlab/devlabSort.js';
import {
  buildBst,
  heapOperation,
  inOrder,
  treeOperation
} from '../src/devlab/devlabTrees.js';
import { parseGraph, runGraphTrace } from '../src/devlab/devlabGraph.js';
import { runDpTrace } from '../src/devlab/devlabDP.js';
import { DEVELOPMENT_LAB_TRANSLATIONS } from '../src/devlab/developmentLabText.js';
import { DEV_MODULES } from '../src/devlab/developmentLabCatalog.js';
import type { ArrayScene, DevTrace } from '../src/devlab/devlabScene.js';

const finalValues = (trace: DevTrace): number[] => {
  const scene = trace.frames.at(-1)?.scene;
  return scene && scene.kind === 'array' ? (scene as ArrayScene).cells.map((c) => c.value) : [];
};

test('parses numeric datasets and rejects invalid values', () => {
  assert.deepEqual(parseNumberList('8, 3, -2, 4.5'), [8, 3, -2, 4.5]);
  assert.throws(() => parseNumberList('8, nope, 3'), /有效數值/);
  assert.throws(() => parseNumberList('   '), /至少一個數值/);
});

test('produces complete sorting traces without mutating input', () => {
  const source = [5, 1, 4, 2, 8, 3];
  for (const algorithm of ['bubble-sort', 'insertion-sort', 'selection-sort', 'shell-sort', 'quick-sort', 'merge-sort', 'heap-sort'] as const) {
    const trace = runSortTrace(algorithm, source);
    assert.deepEqual(finalValues(trace), [1, 2, 3, 4, 5, 8], algorithm);
    assert.ok(trace.frames.length > 1, `${algorithm} should expose intermediate frames`);
    assert.equal(trace.frames.at(-1)?.phase, 'complete');
  }
  assert.deepEqual(source, [5, 1, 4, 2, 8, 3]);
});

test('creates deterministic dataset presets with useful shapes', () => {
  assert.deepEqual(createDatasetPreset('random', 6, 42), createDatasetPreset('random', 6, 42));
  assert.deepEqual(createDatasetPreset('reversed', 5, 42), [5, 4, 3, 2, 1]);
  assert.equal(new Set(createDatasetPreset('duplicates', 12, 42)).size <= 4, true);
  assert.equal(createDatasetPreset('nearly-sorted', 10, 42).length, 10);
});

test('benchmarks every sorting algorithm against the same dataset', () => {
  const rows = benchmarkSortAlgorithms([5, 1, 4, 2, 8]);
  assert.deepEqual(rows.map((row) => row.algorithm), [
    'bubble-sort', 'insertion-sort', 'selection-sort', 'shell-sort', 'quick-sort', 'merge-sort', 'heap-sort'
  ]);
  assert.ok(rows.every((row) => row.frames > 1));
});

test('reports successful and unsuccessful search traces', () => {
  const linear = runSearchTrace('linear-search', [8, 3, 6, 1], 6);
  assert.equal(linear.summary?.key, '在索引 {1} 找到目標值 {0}。');
  const binary = runSearchTrace('binary-search', [8, 3, 6, 1], 7);
  assert.equal(binary.summary?.key, '找不到目標值 {0}。');
  assert.deepEqual((binary.frames[0]?.scene as ArrayScene).cells.map((c) => c.value), [1, 3, 6, 8]);
});

test('builds, balances, and removes from binary search and AVL trees', () => {
  const bst = buildBst([8, 3, 10, 1, 6, 14, 4, 7, 13]);
  assert.deepEqual(inOrder(bst), [1, 3, 4, 6, 7, 8, 10, 13, 14]);
  assert.deepEqual(inOrder(treeOperation('bst', bst, 'remove', 3).root), [1, 4, 6, 7, 8, 10, 13, 14]);

  // Inserting an ascending run forces AVL rotations; the root must rebalance to 2.
  let avl = null as ReturnType<typeof buildBst>;
  for (const value of [1, 2, 3, 4, 5, 6, 7]) avl = treeOperation('avl', avl, 'insert', value).root;
  assert.equal(avl?.value, 4);
  assert.deepEqual(inOrder(avl), [1, 2, 3, 4, 5, 6, 7]);
});

test('keeps red-black tree ordered with a black root', () => {
  let rb = null as ReturnType<typeof buildBst>;
  for (const value of [10, 20, 30, 15, 25, 5]) rb = treeOperation('red-black', rb, 'insert', value).root;
  assert.deepEqual(inOrder(rb), [5, 10, 15, 20, 25, 30]);
  assert.equal(rb?.color, 'black');
});

test('maintains heap order through insert and extract', () => {
  let heap: number[] = [];
  for (const value of [5, 3, 8, 1, 9, 2]) heap = heapOperation('min', heap, 'insert', value).array;
  assert.equal(heap[0], 1);
  const extract = heapOperation('min', heap, 'extract');
  assert.equal(extract.output, 1);
  assert.equal(extract.array[0], 2);
});

test('parses graphs and traces graph algorithms', () => {
  const graph = parseGraph('A-B, A-C, B-D, B-E, C-F');
  assert.deepEqual(graph.nodes, ['A', 'B', 'C', 'D', 'E', 'F']);

  const bfs = runGraphTrace('bfs', graph, 'A');
  assert.equal(bfs.summary?.key, '走訪順序：{0}');
  assert.equal(bfs.summary?.args?.[0], 'A → B → C → D → E → F');

  const dfs = runGraphTrace('dfs', graph, 'A');
  assert.equal(dfs.summary?.args?.[0], 'A → B → D → E → C → F');

  const weighted = parseGraph('A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, D-E:2, C-E:10');
  const dijkstra = runGraphTrace('dijkstra', weighted, 'A');
  assert.equal(dijkstra.summary?.key, 'Dijkstra 完成，已求得最短路徑樹。');
  assert.ok(dijkstra.frames.length > 1);

  const dag = parseGraph('A>B, A>C, B>D, C>D, D>E');
  const topo = runGraphTrace('topological', dag, 'A');
  assert.equal(topo.summary?.key, '拓撲順序：{0}');
  assert.throws(() => runGraphTrace('topological', graph, 'A'), /有向圖/);
});

test('solves dynamic programming problems correctly', () => {
  assert.equal(runDpTrace('fibonacci', '10').summary?.args?.[1], 55);
  assert.equal(runDpTrace('coin-change', '1,3,4 | 6').summary?.args?.[1], '2 枚');
  assert.equal(runDpTrace('knapsack', '2,3,4,5 | 3,4,5,6 | 5').summary?.args?.[0], 7);
  assert.equal(runDpTrace('lcs', 'ABCBDAB | BDCAB').summary?.args?.[0], 4);
  assert.equal(runDpTrace('edit-distance', 'KITTEN | SITTING').summary?.args?.[0], 3);
});

test('exposes catalog metadata and English translations', () => {
  assert.equal(DEV_MODULES.length, 27);
  assert.ok(DEV_MODULES.every((module) => module.pseudocode.length > 0));
  assert.equal(DEVELOPMENT_LAB_TRANSLATIONS['開發實驗室']?.en, 'Development Lab');
  assert.equal(DEVELOPMENT_LAB_TRANSLATIONS['紅黑樹']?.en, 'Red-Black Tree');
});
