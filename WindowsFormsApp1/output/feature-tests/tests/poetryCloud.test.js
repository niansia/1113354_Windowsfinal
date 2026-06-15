"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const poetryCorpus_js_1 = require("../src/poetry/poetryCorpus.js");
const poetryAnalysis_js_1 = require("../src/poetry/poetryAnalysis.js");
const poetryFavorites_js_1 = require("../src/poetry/poetryFavorites.js");
const poetryGraph_js_1 = require("../src/poetry/poetryGraph.js");
const poetryLayout_js_1 = require("../src/poetry/poetryLayout.js");
const poetrySearch_js_1 = require("../src/poetry/poetrySearch.js");
(0, node_test_1.default)('searches poet names, poem titles, lines, and themes', () => {
    const result = (0, poetrySearch_js_1.searchPoetry)(poetryCorpus_js_1.POETS, poetryCorpus_js_1.POEMS, {
        query: '明月',
        dynasty: '全部',
        form: '全部',
        mode: '全部'
    });
    strict_1.default.ok(result.poems.some((poem) => poem.content.some((line) => line.includes('明月'))));
    strict_1.default.ok(result.poets.some((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
    strict_1.default.ok(result.total > 0);
});
(0, node_test_1.default)('filters poetry by dynasty and form without mutating the corpus', () => {
    const originalCount = poetryCorpus_js_1.POEMS.length;
    const result = (0, poetrySearch_js_1.searchPoetry)(poetryCorpus_js_1.POETS, poetryCorpus_js_1.POEMS, {
        query: '',
        dynasty: '唐',
        form: '七絕',
        mode: '詩作'
    });
    strict_1.default.ok(result.poems.length > 0);
    strict_1.default.ok(result.poems.every((poem) => poem.dynasty === '唐' && poem.form === '七絕'));
    strict_1.default.ok(result.poets.every((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
    strict_1.default.equal(poetryCorpus_js_1.POEMS.length, originalCount);
});
(0, node_test_1.default)('hides unrelated poets when a poem form filter is active', () => {
    const result = (0, poetrySearch_js_1.searchPoetry)(poetryCorpus_js_1.POETS, poetryCorpus_js_1.POEMS, {
        query: '',
        dynasty: '全部',
        form: '樂府',
        mode: '全部'
    });
    strict_1.default.equal(result.poems.length, 1);
    strict_1.default.ok(result.poets.every((poet) => result.poems.some((poem) => poem.poetId === poet.id)));
});
(0, node_test_1.default)('builds explainable poet relations and finds the shortest route', () => {
    const graph = (0, poetryGraph_js_1.buildPoetryGraph)(poetryCorpus_js_1.POETS, poetryCorpus_js_1.POEMS);
    const path = (0, poetryGraph_js_1.findPoetPath)(graph, 'li-bai', 'du-fu');
    strict_1.default.ok(graph.edges.some((edge) => edge.reason.length > 0));
    strict_1.default.deepEqual(path.poetIds, ['li-bai', 'du-fu']);
    strict_1.default.equal(path.edges.length, 1);
    strict_1.default.match(path.edges[0].reason, /唐|交遊|詩風|意象/);
});
(0, node_test_1.default)('creates a deterministic bounded star-map layout', () => {
    const graph = (0, poetryGraph_js_1.buildPoetryGraph)(poetryCorpus_js_1.POETS, poetryCorpus_js_1.POEMS);
    const first = (0, poetryLayout_js_1.createPoetryLayout)(graph, { width: 1200, height: 760, seed: 42 });
    const second = (0, poetryLayout_js_1.createPoetryLayout)(graph, { width: 1200, height: 760, seed: 42 });
    strict_1.default.deepEqual(first, second);
    strict_1.default.ok(first.every((node) => node.x >= 60 && node.x <= 1140));
    strict_1.default.ok(first.every((node) => node.y >= 60 && node.y <= 700));
    strict_1.default.ok(first.every((node) => node.radius >= 8 && node.radius <= 28));
});
(0, node_test_1.default)('produces a deterministic local appreciation from poem metadata', () => {
    const poem = poetryCorpus_js_1.POEMS.find((item) => item.id === 'quiet-night-thought');
    strict_1.default.ok(poem);
    const analysis = (0, poetryAnalysis_js_1.analyzePoem)(poem);
    strict_1.default.match(analysis.summary, /月|鄉|夜/);
    strict_1.default.ok(analysis.images.includes('月'));
    strict_1.default.ok(analysis.mood.length > 0);
    strict_1.default.ok(analysis.craft.length >= 2);
});
(0, node_test_1.default)('round-trips favorites and ignores malformed local data', () => {
    const favorites = (0, poetryFavorites_js_1.toggleFavoritePoem)(new Set(), 'quiet-night-thought');
    const restored = (0, poetryFavorites_js_1.parseFavoritePoems)((0, poetryFavorites_js_1.serializeFavoritePoems)(favorites));
    strict_1.default.deepEqual([...restored], ['quiet-night-thought']);
    strict_1.default.deepEqual([...(0, poetryFavorites_js_1.parseFavoritePoems)('{broken')], []);
    strict_1.default.deepEqual([...(0, poetryFavorites_js_1.toggleFavoritePoem)(restored, 'quiet-night-thought')], []);
});
(0, node_test_1.default)('resets search constraints when entering the favorites view', () => {
    strict_1.default.deepEqual((0, poetryFavorites_js_1.getFavoriteViewFilters)(), {
        query: '',
        dynasty: '全部',
        form: '全部',
        mode: '全部'
    });
});
