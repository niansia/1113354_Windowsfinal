import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildInferenceTrace,
  calculateReward,
  createAttentionMatrix,
  getInferencePlaybackMs,
  retrieveLocalKnowledge,
  stepLiquidNetwork,
  tokenizePrompt
} from '../src/neuro/neuroFlow.js';
import {
  buildKnowledgeSearchQuery,
  buildWikipediaSearchUrl,
  parseWikipediaResponse
} from '../src/neuro/onlineKnowledge.js';

test('tokenizes mixed Chinese and Latin prompts into stable visual units', () => {
  const tokens = tokenizePrompt('AI 如何學習？');

  assert.deepEqual(tokens.map((token) => token.text), ['AI', '如', '何', '學', '習', '？']);
  assert.equal(tokens[0]?.index, 0);
  assert.ok(tokens.every((token) => token.activation >= 0 && token.activation <= 1));
});

test('normalizes every attention row to a probability distribution', () => {
  const matrix = createAttentionMatrix(tokenizePrompt('液態神經網路'), 0.72);

  assert.equal(matrix.length, 6);
  for (const row of matrix) {
    const total = row.reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 0.000001);
  }
});

test('updates liquid network state while keeping activations bounded', () => {
  const first = stepLiquidNetwork([0, 0, 0], [0.9, -0.2, 0.4], {
    timeConstant: 0.8,
    recurrence: 0.55,
    damping: 0.18
  }, 0.16);
  const second = stepLiquidNetwork(first, [0.9, -0.2, 0.4], {
    timeConstant: 0.8,
    recurrence: 0.55,
    damping: 0.18
  }, 0.16);

  assert.notDeepEqual(first, [0, 0, 0]);
  assert.notDeepEqual(second, first);
  assert.ok(second.every((value) => value >= -1 && value <= 1));
});

test('combines reinforcement signals with normalized user weights', () => {
  const result = calculateReward(
    { accuracy: 0.92, helpfulness: 0.84, safety: 0.98, clarity: 0.76 },
    { accuracy: 4, helpfulness: 3, safety: 2, clarity: 1 }
  );

  assert.equal(result.breakdown.length, 4);
  assert.ok(Math.abs(result.total - 0.892) < 0.001);
});

test('retrieves the liquid neural network note for a matching offline query', () => {
  const hits = retrieveLocalKnowledge('液態神經網路如何記住時間狀態', 'zh-TW', 2);

  assert.equal(hits[0]?.id, 'liquid-network');
  assert.ok((hits[0]?.score ?? 0) > 0);
  assert.equal(hits[0]?.source, 'offline');
});

test('builds an API-key-free localized Wikipedia request', () => {
  const url = new URL(buildWikipediaSearchUrl('大型語言模型', 'zh-TW', 4));

  assert.equal(url.hostname, 'zh.wikipedia.org');
  assert.equal(url.searchParams.get('origin'), '*');
  assert.equal(url.searchParams.get('variant'), 'zh-tw');
  assert.equal(url.searchParams.get('gsrlimit'), '4');
  assert.equal(url.searchParams.has('api_key'), false);
});

test('reduces conversational prompts to focused public knowledge search terms', () => {
  assert.equal(buildKnowledgeSearchQuery('用簡單方式解釋大型語言模型如何產生答案', 'zh-TW'), '大型語言模型');
  assert.equal(buildKnowledgeSearchQuery('Please explain how liquid neural networks remember time', 'en'), 'liquid neural networks remember time');
});

test('parses public knowledge results into normalized evidence records', () => {
  const results = parseWikipediaResponse({
    query: {
      pages: {
        '42': { pageid: 42, title: '神經網路', extract: '神經網路是一種計算模型。' }
      }
    }
  }, 'zh-TW');

  assert.deepEqual(results, [{
    id: 'wikipedia-42',
    title: '神經網路',
    content: '神經網路是一種計算模型。',
    url: 'https://zh.wikipedia.org/?curid=42',
    source: 'online',
    provider: 'Wikipedia',
    score: 1
  }]);
});

test('creates a complete LLM, RL, and liquid inference trace', () => {
  const trace = buildInferenceTrace('解釋注意力如何運作', 'hybrid');

  assert.deepEqual(trace.stages.map((stage) => stage.id), [
    'tokenize', 'embed', 'attention', 'liquid', 'reward', 'decode'
  ]);
  assert.equal(trace.architecture, 'hybrid');
  assert.ok(trace.connections > trace.nodes);
  assert.ok(trace.estimatedLatencyMs > 0);
});

test('keeps the visual inference pipeline readable and scales playback speed', () => {
  assert.equal(getInferencePlaybackMs(6, 1), 2040);
  assert.equal(getInferencePlaybackMs(6, 2), 1200);
  assert.equal(getInferencePlaybackMs(2, 1), 1200);
});

test('uses batched Three.js primitives and adaptive rendering for the primary neural graph', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const source = readFileSync(resolve(repositoryRoot, 'Frontend/src/components/neuro/NeuralFlow3D.tsx'), 'utf8');

  assert.match(source, /THREE\.InstancedMesh/);
  assert.match(source, /THREE\.LineSegments/);
  assert.match(source, /THREE\.Points/);
  assert.match(source, /setPixelRatio/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /visibilityState/);
  assert.doesNotMatch(source, /THREE\.Clock/);
  assert.match(source, /controlsRef/);
});
