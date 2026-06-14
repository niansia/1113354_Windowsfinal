"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const developmentLabEngine_js_1 = require("../src/devlab/developmentLabEngine.js");
const developmentLabText_js_1 = require("../src/devlab/developmentLabText.js");
(0, node_test_1.default)('parses numeric datasets and rejects invalid values', () => {
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.parseNumberList)('8, 3, -2, 4.5'), [8, 3, -2, 4.5]);
    strict_1.default.throws(() => (0, developmentLabEngine_js_1.parseNumberList)('8, nope, 3'), /valid numbers/i);
    strict_1.default.throws(() => (0, developmentLabEngine_js_1.parseNumberList)('   '), /at least one number/i);
});
(0, node_test_1.default)('applies immutable stack, queue, and linked-list operations', () => {
    const stack = (0, developmentLabEngine_js_1.updateLinearStructure)('stack', [2, 4], 'push', 6);
    strict_1.default.deepEqual(stack.values, [2, 4, 6]);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.updateLinearStructure)('stack', stack.values, 'pop').values, [2, 4]);
    const queue = (0, developmentLabEngine_js_1.updateLinearStructure)('queue', [2, 4], 'enqueue', 6);
    strict_1.default.deepEqual(queue.values, [2, 4, 6]);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.updateLinearStructure)('queue', queue.values, 'dequeue').values, [4, 6]);
    const list = (0, developmentLabEngine_js_1.updateLinearStructure)('linked-list', [2, 4], 'prepend', 1);
    strict_1.default.deepEqual(list.values, [1, 2, 4]);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.updateLinearStructure)('linked-list', list.values, 'remove', 2).values, [1, 4]);
    strict_1.default.equal((0, developmentLabEngine_js_1.updateLinearStructure)('linked-list', list.values, 'find', 4).activeIndex, 2);
});
(0, node_test_1.default)('builds and removes values from a binary search tree', () => {
    const tree = (0, developmentLabEngine_js_1.buildBinarySearchTree)([8, 3, 10, 1, 6, 14, 4, 7, 13]);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.inOrderTree)(tree), [1, 3, 4, 6, 7, 8, 10, 13, 14]);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.inOrderTree)((0, developmentLabEngine_js_1.removeTreeValue)(tree, 3)), [1, 4, 6, 7, 8, 10, 13, 14]);
});
(0, node_test_1.default)('produces complete sorting traces without mutating input', () => {
    const source = [5, 1, 4, 2, 8];
    for (const algorithm of ['bubble-sort', 'insertion-sort', 'selection-sort', 'quick-sort', 'merge-sort', 'heap-sort']) {
        const trace = (0, developmentLabEngine_js_1.runSortTrace)(algorithm, source);
        strict_1.default.deepEqual(trace.frames.at(-1)?.values, [1, 2, 4, 5, 8], algorithm);
        strict_1.default.ok(trace.frames.length > 1, `${algorithm} should expose intermediate frames`);
        strict_1.default.equal(trace.frames.at(-1)?.phase, 'complete');
    }
    strict_1.default.deepEqual(source, [5, 1, 4, 2, 8]);
});
(0, node_test_1.default)('creates deterministic dataset presets with useful shapes', () => {
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.createDatasetPreset)('random', 6, 42), (0, developmentLabEngine_js_1.createDatasetPreset)('random', 6, 42));
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.createDatasetPreset)('reversed', 5, 42), [5, 4, 3, 2, 1]);
    strict_1.default.equal(new Set((0, developmentLabEngine_js_1.createDatasetPreset)('duplicates', 12, 42)).size <= 4, true);
    strict_1.default.equal((0, developmentLabEngine_js_1.createDatasetPreset)('nearly-sorted', 10, 42).length, 10);
});
(0, node_test_1.default)('benchmarks every sorting algorithm against the same dataset', () => {
    const rows = (0, developmentLabEngine_js_1.benchmarkSortAlgorithms)([5, 1, 4, 2, 8]);
    strict_1.default.deepEqual(rows.map((row) => row.algorithm), [
        'bubble-sort',
        'insertion-sort',
        'selection-sort',
        'quick-sort',
        'merge-sort',
        'heap-sort'
    ]);
    strict_1.default.ok(rows.every((row) => row.frames > 1));
    strict_1.default.ok(rows.every((row) => row.comparisons >= 0 && row.writes >= 0));
});
(0, node_test_1.default)('localizes trace and validation messages with the selected system language', () => {
    strict_1.default.equal((0, developmentLabText_js_1.localizeDevelopmentLabMessage)('Compare 5 and 8.', 'zh-TW'), '比較 5 與 8。');
    strict_1.default.equal((0, developmentLabText_js_1.localizeDevelopmentLabMessage)('Trace complete. The dataset is sorted.', 'en'), 'Trace complete. The dataset is sorted.');
    strict_1.default.equal((0, developmentLabText_js_1.localizeDevelopmentLabMessage)('Enter at least one number.', 'ja'), '1 つ以上の数値を入力してください。');
});
(0, node_test_1.default)('reports successful and unsuccessful search traces', () => {
    const linear = (0, developmentLabEngine_js_1.runSearchTrace)('linear-search', [8, 3, 6, 1], 6);
    strict_1.default.equal(linear.resultIndex, 2);
    strict_1.default.match(linear.frames.at(-1)?.message ?? '', /found/i);
    const binary = (0, developmentLabEngine_js_1.runSearchTrace)('binary-search', [8, 3, 6, 1], 7);
    strict_1.default.equal(binary.resultIndex, -1);
    strict_1.default.deepEqual(binary.frames[0]?.values, [1, 3, 6, 8]);
    strict_1.default.match(binary.frames.at(-1)?.message ?? '', /not found/i);
});
(0, node_test_1.default)('parses graph edges and creates deterministic BFS and DFS traces', () => {
    const graph = (0, developmentLabEngine_js_1.parseGraph)('A-B, A-C, B-D, B-E, C-F');
    strict_1.default.deepEqual(graph.nodes, ['A', 'B', 'C', 'D', 'E', 'F']);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.runTraversalTrace)('bfs', graph, 'A').visitedOrder, ['A', 'B', 'C', 'D', 'E', 'F']);
    strict_1.default.deepEqual((0, developmentLabEngine_js_1.runTraversalTrace)('dfs', graph, 'A').visitedOrder, ['A', 'B', 'D', 'E', 'C', 'F']);
    strict_1.default.throws(() => (0, developmentLabEngine_js_1.runTraversalTrace)('bfs', graph, 'Z'), /start node/i);
});
