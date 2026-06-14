"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const devlabSort_js_1 = require("../src/devlab/devlabSort.js");
const devlabTrees_js_1 = require("../src/devlab/devlabTrees.js");
const devlabGraph_js_1 = require("../src/devlab/devlabGraph.js");
const devlabDP_js_1 = require("../src/devlab/devlabDP.js");
const developmentLabText_js_1 = require("../src/devlab/developmentLabText.js");
const developmentLabCatalog_js_1 = require("../src/devlab/developmentLabCatalog.js");
const finalValues = (trace) => {
    const scene = trace.frames.at(-1)?.scene;
    return scene && scene.kind === 'array' ? scene.cells.map((c) => c.value) : [];
};
(0, node_test_1.default)('parses numeric datasets and rejects invalid values', () => {
    strict_1.default.deepEqual((0, devlabSort_js_1.parseNumberList)('8, 3, -2, 4.5'), [8, 3, -2, 4.5]);
    strict_1.default.throws(() => (0, devlabSort_js_1.parseNumberList)('8, nope, 3'), /有效數值/);
    strict_1.default.throws(() => (0, devlabSort_js_1.parseNumberList)('   '), /至少一個數值/);
});
(0, node_test_1.default)('produces complete sorting traces without mutating input', () => {
    const source = [5, 1, 4, 2, 8, 3];
    for (const algorithm of ['bubble-sort', 'insertion-sort', 'selection-sort', 'shell-sort', 'quick-sort', 'merge-sort', 'heap-sort']) {
        const trace = (0, devlabSort_js_1.runSortTrace)(algorithm, source);
        strict_1.default.deepEqual(finalValues(trace), [1, 2, 3, 4, 5, 8], algorithm);
        strict_1.default.ok(trace.frames.length > 1, `${algorithm} should expose intermediate frames`);
        strict_1.default.equal(trace.frames.at(-1)?.phase, 'complete');
    }
    strict_1.default.deepEqual(source, [5, 1, 4, 2, 8, 3]);
});
(0, node_test_1.default)('creates deterministic dataset presets with useful shapes', () => {
    strict_1.default.deepEqual((0, devlabSort_js_1.createDatasetPreset)('random', 6, 42), (0, devlabSort_js_1.createDatasetPreset)('random', 6, 42));
    strict_1.default.deepEqual((0, devlabSort_js_1.createDatasetPreset)('reversed', 5, 42), [5, 4, 3, 2, 1]);
    strict_1.default.equal(new Set((0, devlabSort_js_1.createDatasetPreset)('duplicates', 12, 42)).size <= 4, true);
    strict_1.default.equal((0, devlabSort_js_1.createDatasetPreset)('nearly-sorted', 10, 42).length, 10);
});
(0, node_test_1.default)('benchmarks every sorting algorithm against the same dataset', () => {
    const rows = (0, devlabSort_js_1.benchmarkSortAlgorithms)([5, 1, 4, 2, 8]);
    strict_1.default.deepEqual(rows.map((row) => row.algorithm), [
        'bubble-sort', 'insertion-sort', 'selection-sort', 'shell-sort', 'quick-sort', 'merge-sort', 'heap-sort'
    ]);
    strict_1.default.ok(rows.every((row) => row.frames > 1));
});
(0, node_test_1.default)('reports successful and unsuccessful search traces', () => {
    const linear = (0, devlabSort_js_1.runSearchTrace)('linear-search', [8, 3, 6, 1], 6);
    strict_1.default.equal(linear.summary?.key, '在索引 {1} 找到目標值 {0}。');
    const binary = (0, devlabSort_js_1.runSearchTrace)('binary-search', [8, 3, 6, 1], 7);
    strict_1.default.equal(binary.summary?.key, '找不到目標值 {0}。');
    strict_1.default.deepEqual((binary.frames[0]?.scene).cells.map((c) => c.value), [1, 3, 6, 8]);
});
(0, node_test_1.default)('builds, balances, and removes from binary search and AVL trees', () => {
    const bst = (0, devlabTrees_js_1.buildBst)([8, 3, 10, 1, 6, 14, 4, 7, 13]);
    strict_1.default.deepEqual((0, devlabTrees_js_1.inOrder)(bst), [1, 3, 4, 6, 7, 8, 10, 13, 14]);
    strict_1.default.deepEqual((0, devlabTrees_js_1.inOrder)((0, devlabTrees_js_1.treeOperation)('bst', bst, 'remove', 3).root), [1, 4, 6, 7, 8, 10, 13, 14]);
    // Inserting an ascending run forces AVL rotations; the root must rebalance to 2.
    let avl = null;
    for (const value of [1, 2, 3, 4, 5, 6, 7])
        avl = (0, devlabTrees_js_1.treeOperation)('avl', avl, 'insert', value).root;
    strict_1.default.equal(avl?.value, 4);
    strict_1.default.deepEqual((0, devlabTrees_js_1.inOrder)(avl), [1, 2, 3, 4, 5, 6, 7]);
});
(0, node_test_1.default)('keeps red-black tree ordered with a black root', () => {
    let rb = null;
    for (const value of [10, 20, 30, 15, 25, 5])
        rb = (0, devlabTrees_js_1.treeOperation)('red-black', rb, 'insert', value).root;
    strict_1.default.deepEqual((0, devlabTrees_js_1.inOrder)(rb), [5, 10, 15, 20, 25, 30]);
    strict_1.default.equal(rb?.color, 'black');
});
(0, node_test_1.default)('maintains heap order through insert and extract', () => {
    let heap = [];
    for (const value of [5, 3, 8, 1, 9, 2])
        heap = (0, devlabTrees_js_1.heapOperation)('min', heap, 'insert', value).array;
    strict_1.default.equal(heap[0], 1);
    const extract = (0, devlabTrees_js_1.heapOperation)('min', heap, 'extract');
    strict_1.default.equal(extract.output, 1);
    strict_1.default.equal(extract.array[0], 2);
});
(0, node_test_1.default)('parses graphs and traces graph algorithms', () => {
    const graph = (0, devlabGraph_js_1.parseGraph)('A-B, A-C, B-D, B-E, C-F');
    strict_1.default.deepEqual(graph.nodes, ['A', 'B', 'C', 'D', 'E', 'F']);
    const bfs = (0, devlabGraph_js_1.runGraphTrace)('bfs', graph, 'A');
    strict_1.default.equal(bfs.summary?.key, '走訪順序：{0}');
    strict_1.default.equal(bfs.summary?.args?.[0], 'A → B → C → D → E → F');
    const dfs = (0, devlabGraph_js_1.runGraphTrace)('dfs', graph, 'A');
    strict_1.default.equal(dfs.summary?.args?.[0], 'A → B → D → E → C → F');
    const weighted = (0, devlabGraph_js_1.parseGraph)('A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, D-E:2, C-E:10');
    const dijkstra = (0, devlabGraph_js_1.runGraphTrace)('dijkstra', weighted, 'A');
    strict_1.default.equal(dijkstra.summary?.key, 'Dijkstra 完成，已求得最短路徑樹。');
    strict_1.default.ok(dijkstra.frames.length > 1);
    const dag = (0, devlabGraph_js_1.parseGraph)('A>B, A>C, B>D, C>D, D>E');
    const topo = (0, devlabGraph_js_1.runGraphTrace)('topological', dag, 'A');
    strict_1.default.equal(topo.summary?.key, '拓撲順序：{0}');
    strict_1.default.throws(() => (0, devlabGraph_js_1.runGraphTrace)('topological', graph, 'A'), /有向圖/);
});
(0, node_test_1.default)('solves dynamic programming problems correctly', () => {
    strict_1.default.equal((0, devlabDP_js_1.runDpTrace)('fibonacci', '10').summary?.args?.[1], 55);
    strict_1.default.equal((0, devlabDP_js_1.runDpTrace)('coin-change', '1,3,4 | 6').summary?.args?.[1], '2 枚');
    strict_1.default.equal((0, devlabDP_js_1.runDpTrace)('knapsack', '2,3,4,5 | 3,4,5,6 | 5').summary?.args?.[0], 7);
    strict_1.default.equal((0, devlabDP_js_1.runDpTrace)('lcs', 'ABCBDAB | BDCAB').summary?.args?.[0], 4);
    strict_1.default.equal((0, devlabDP_js_1.runDpTrace)('edit-distance', 'KITTEN | SITTING').summary?.args?.[0], 3);
});
(0, node_test_1.default)('exposes catalog metadata and English translations', () => {
    strict_1.default.equal(developmentLabCatalog_js_1.DEV_MODULES.length, 27);
    strict_1.default.ok(developmentLabCatalog_js_1.DEV_MODULES.every((module) => module.pseudocode.length > 0));
    strict_1.default.equal(developmentLabText_js_1.DEVELOPMENT_LAB_TRANSLATIONS['開發實驗室']?.en, 'Development Lab');
    strict_1.default.equal(developmentLabText_js_1.DEVELOPMENT_LAB_TRANSLATIONS['紅黑樹']?.en, 'Red-Black Tree');
});
