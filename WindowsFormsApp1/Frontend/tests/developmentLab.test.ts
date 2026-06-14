import test from 'node:test';
import assert from 'node:assert/strict';
import {
  benchmarkSortAlgorithms,
  buildBinarySearchTree,
  createDatasetPreset,
  inOrderTree,
  parseGraph,
  parseNumberList,
  removeTreeValue,
  runSearchTrace,
  runSortTrace,
  runTraversalTrace,
  updateLinearStructure
} from '../src/devlab/developmentLabEngine.js';
import { localizeDevelopmentLabMessage } from '../src/devlab/developmentLabText.js';

test('parses numeric datasets and rejects invalid values', () => {
  assert.deepEqual(parseNumberList('8, 3, -2, 4.5'), [8, 3, -2, 4.5]);
  assert.throws(() => parseNumberList('8, nope, 3'), /valid numbers/i);
  assert.throws(() => parseNumberList('   '), /at least one number/i);
});

test('applies immutable stack, queue, and linked-list operations', () => {
  const stack = updateLinearStructure('stack', [2, 4], 'push', 6);
  assert.deepEqual(stack.values, [2, 4, 6]);
  assert.deepEqual(updateLinearStructure('stack', stack.values, 'pop').values, [2, 4]);

  const queue = updateLinearStructure('queue', [2, 4], 'enqueue', 6);
  assert.deepEqual(queue.values, [2, 4, 6]);
  assert.deepEqual(updateLinearStructure('queue', queue.values, 'dequeue').values, [4, 6]);

  const list = updateLinearStructure('linked-list', [2, 4], 'prepend', 1);
  assert.deepEqual(list.values, [1, 2, 4]);
  assert.deepEqual(updateLinearStructure('linked-list', list.values, 'remove', 2).values, [1, 4]);
  assert.equal(updateLinearStructure('linked-list', list.values, 'find', 4).activeIndex, 2);
});

test('builds and removes values from a binary search tree', () => {
  const tree = buildBinarySearchTree([8, 3, 10, 1, 6, 14, 4, 7, 13]);

  assert.deepEqual(inOrderTree(tree), [1, 3, 4, 6, 7, 8, 10, 13, 14]);
  assert.deepEqual(inOrderTree(removeTreeValue(tree, 3)), [1, 4, 6, 7, 8, 10, 13, 14]);
});

test('produces complete sorting traces without mutating input', () => {
  const source = [5, 1, 4, 2, 8];

  for (const algorithm of ['bubble-sort', 'insertion-sort', 'selection-sort', 'quick-sort', 'merge-sort', 'heap-sort'] as const) {
    const trace = runSortTrace(algorithm, source);
    assert.deepEqual(trace.frames.at(-1)?.values, [1, 2, 4, 5, 8], algorithm);
    assert.ok(trace.frames.length > 1, `${algorithm} should expose intermediate frames`);
    assert.equal(trace.frames.at(-1)?.phase, 'complete');
  }

  assert.deepEqual(source, [5, 1, 4, 2, 8]);
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
    'bubble-sort',
    'insertion-sort',
    'selection-sort',
    'quick-sort',
    'merge-sort',
    'heap-sort'
  ]);
  assert.ok(rows.every((row) => row.frames > 1));
  assert.ok(rows.every((row) => row.comparisons >= 0 && row.writes >= 0));
});

test('localizes trace and validation messages with the selected system language', () => {
  assert.equal(
    localizeDevelopmentLabMessage('Compare 5 and 8.', 'zh-TW'),
    '比較 5 與 8。'
  );
  assert.equal(
    localizeDevelopmentLabMessage('Trace complete. The dataset is sorted.', 'en'),
    'Trace complete. The dataset is sorted.'
  );
  assert.equal(
    localizeDevelopmentLabMessage('Enter at least one number.', 'ja'),
    '1 つ以上の数値を入力してください。'
  );
});

test('reports successful and unsuccessful search traces', () => {
  const linear = runSearchTrace('linear-search', [8, 3, 6, 1], 6);
  assert.equal(linear.resultIndex, 2);
  assert.match(linear.frames.at(-1)?.message ?? '', /found/i);

  const binary = runSearchTrace('binary-search', [8, 3, 6, 1], 7);
  assert.equal(binary.resultIndex, -1);
  assert.deepEqual(binary.frames[0]?.values, [1, 3, 6, 8]);
  assert.match(binary.frames.at(-1)?.message ?? '', /not found/i);
});

test('parses graph edges and creates deterministic BFS and DFS traces', () => {
  const graph = parseGraph('A-B, A-C, B-D, B-E, C-F');

  assert.deepEqual(graph.nodes, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(runTraversalTrace('bfs', graph, 'A').visitedOrder, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(runTraversalTrace('dfs', graph, 'A').visitedOrder, ['A', 'B', 'D', 'E', 'C', 'F']);
  assert.throws(() => runTraversalTrace('bfs', graph, 'Z'), /start node/i);
});
