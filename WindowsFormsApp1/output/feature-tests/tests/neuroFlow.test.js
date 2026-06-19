"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const neuroFlow_js_1 = require("../src/neuro/neuroFlow.js");
const onlineKnowledge_js_1 = require("../src/neuro/onlineKnowledge.js");
(0, node_test_1.default)('tokenizes mixed Chinese and Latin prompts into stable visual units', () => {
    const tokens = (0, neuroFlow_js_1.tokenizePrompt)('AI 如何學習？');
    strict_1.default.deepEqual(tokens.map((token) => token.text), ['AI', '如', '何', '學', '習', '？']);
    strict_1.default.equal(tokens[0]?.index, 0);
    strict_1.default.ok(tokens.every((token) => token.activation >= 0 && token.activation <= 1));
});
(0, node_test_1.default)('normalizes every attention row to a probability distribution', () => {
    const matrix = (0, neuroFlow_js_1.createAttentionMatrix)((0, neuroFlow_js_1.tokenizePrompt)('液態神經網路'), 0.72);
    strict_1.default.equal(matrix.length, 6);
    for (const row of matrix) {
        const total = row.reduce((sum, value) => sum + value, 0);
        strict_1.default.ok(Math.abs(total - 1) < 0.000001);
    }
});
(0, node_test_1.default)('updates liquid network state while keeping activations bounded', () => {
    const first = (0, neuroFlow_js_1.stepLiquidNetwork)([0, 0, 0], [0.9, -0.2, 0.4], {
        timeConstant: 0.8,
        recurrence: 0.55,
        damping: 0.18
    }, 0.16);
    const second = (0, neuroFlow_js_1.stepLiquidNetwork)(first, [0.9, -0.2, 0.4], {
        timeConstant: 0.8,
        recurrence: 0.55,
        damping: 0.18
    }, 0.16);
    strict_1.default.notDeepEqual(first, [0, 0, 0]);
    strict_1.default.notDeepEqual(second, first);
    strict_1.default.ok(second.every((value) => value >= -1 && value <= 1));
});
(0, node_test_1.default)('combines reinforcement signals with normalized user weights', () => {
    const result = (0, neuroFlow_js_1.calculateReward)({ accuracy: 0.92, helpfulness: 0.84, safety: 0.98, clarity: 0.76 }, { accuracy: 4, helpfulness: 3, safety: 2, clarity: 1 });
    strict_1.default.equal(result.breakdown.length, 4);
    strict_1.default.ok(Math.abs(result.total - 0.892) < 0.001);
});
(0, node_test_1.default)('retrieves the liquid neural network note for a matching offline query', () => {
    const hits = (0, neuroFlow_js_1.retrieveLocalKnowledge)('液態神經網路如何記住時間狀態', 'zh-TW', 2);
    strict_1.default.equal(hits[0]?.id, 'liquid-network');
    strict_1.default.ok((hits[0]?.score ?? 0) > 0);
    strict_1.default.equal(hits[0]?.source, 'offline');
});
(0, node_test_1.default)('builds an API-key-free localized Wikipedia request', () => {
    const url = new URL((0, onlineKnowledge_js_1.buildWikipediaSearchUrl)('大型語言模型', 'zh-TW', 4));
    strict_1.default.equal(url.hostname, 'zh.wikipedia.org');
    strict_1.default.equal(url.searchParams.get('origin'), '*');
    strict_1.default.equal(url.searchParams.get('variant'), 'zh-tw');
    strict_1.default.equal(url.searchParams.get('gsrlimit'), '4');
    strict_1.default.equal(url.searchParams.has('api_key'), false);
});
(0, node_test_1.default)('reduces conversational prompts to focused public knowledge search terms', () => {
    strict_1.default.equal((0, onlineKnowledge_js_1.buildKnowledgeSearchQuery)('用簡單方式解釋大型語言模型如何產生答案', 'zh-TW'), '大型語言模型');
    strict_1.default.equal((0, onlineKnowledge_js_1.buildKnowledgeSearchQuery)('Please explain how liquid neural networks remember time', 'en'), 'liquid neural networks remember time');
});
(0, node_test_1.default)('parses public knowledge results into normalized evidence records', () => {
    const results = (0, onlineKnowledge_js_1.parseWikipediaResponse)({
        query: {
            pages: {
                '42': { pageid: 42, title: '神經網路', extract: '神經網路是一種計算模型。' }
            }
        }
    }, 'zh-TW');
    strict_1.default.deepEqual(results, [{
            id: 'wikipedia-42',
            title: '神經網路',
            content: '神經網路是一種計算模型。',
            url: 'https://zh.wikipedia.org/?curid=42',
            source: 'online',
            provider: 'Wikipedia',
            score: 1
        }]);
});
(0, node_test_1.default)('creates a complete LLM, RL, and liquid inference trace', () => {
    const trace = (0, neuroFlow_js_1.buildInferenceTrace)('解釋注意力如何運作', 'hybrid');
    strict_1.default.deepEqual(trace.stages.map((stage) => stage.id), [
        'tokenize', 'embed', 'attention', 'liquid', 'reward', 'decode'
    ]);
    strict_1.default.equal(trace.architecture, 'hybrid');
    strict_1.default.ok(trace.connections > trace.nodes);
    strict_1.default.ok(trace.estimatedLatencyMs > 0);
});
(0, node_test_1.default)('keeps the visual inference pipeline readable and scales playback speed', () => {
    strict_1.default.equal((0, neuroFlow_js_1.getInferencePlaybackMs)(6, 1), 2040);
    strict_1.default.equal((0, neuroFlow_js_1.getInferencePlaybackMs)(6, 2), 1200);
    strict_1.default.equal((0, neuroFlow_js_1.getInferencePlaybackMs)(2, 1), 1200);
});
(0, node_test_1.default)('uses batched Three.js primitives and adaptive rendering for the primary neural graph', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const source = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/neuro/NeuralFlow3D.tsx'), 'utf8');
    strict_1.default.match(source, /THREE\.InstancedMesh/);
    strict_1.default.match(source, /THREE\.LineSegments/);
    strict_1.default.match(source, /THREE\.Points/);
    strict_1.default.match(source, /setPixelRatio/);
    strict_1.default.match(source, /IntersectionObserver/);
    strict_1.default.match(source, /visibilityState/);
    strict_1.default.doesNotMatch(source, /THREE\.Clock/);
    strict_1.default.match(source, /controlsRef/);
});
