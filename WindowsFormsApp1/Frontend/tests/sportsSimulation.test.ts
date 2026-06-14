import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalSportsReport,
  createPredictionInput,
  simulateMatch
} from '../src/sports/sportsSimulation.js';
import { generateSportsReport } from '../src/sports/sportsAi.js';

test('produces deterministic football probabilities that sum to one', () => {
  const input = createPredictionInput({
    model: 'goals',
    homeName: 'Netherlands',
    awayName: 'Japan',
    homeRating: 1860,
    awayRating: 1770,
    iterations: 12000,
    seed: 20260614
  });

  const first = simulateMatch(input);
  const second = simulateMatch(input);

  assert.deepEqual(first, second);
  assert.ok(Math.abs(first.homeWin + first.draw + first.awayWin - 1) < 1e-9);
  assert.ok(first.homeWin > first.awayWin);
  assert.ok(first.topScorelines.length > 0);
});

test('gives a stronger basketball side a higher win probability', () => {
  const strong = simulateMatch(createPredictionInput({
    model: 'points',
    homeName: 'Home',
    awayName: 'Away',
    homeRating: 1800,
    awayRating: 1550,
    iterations: 8000,
    seed: 42
  }));
  const weak = simulateMatch(createPredictionInput({
    model: 'points',
    homeName: 'Home',
    awayName: 'Away',
    homeRating: 1500,
    awayRating: 1800,
    iterations: 8000,
    seed: 42
  }));

  assert.ok(strong.homeWin > weak.homeWin);
  assert.equal(strong.draw, 0);
});

test('simulates best-of-three set sports without draws', () => {
  const result = simulateMatch(createPredictionInput({
    model: 'sets',
    homeName: 'Player A',
    awayName: 'Player B',
    homeRating: 1680,
    awayRating: 1640,
    iterations: 6000,
    seed: 7
  }));

  assert.equal(result.draw, 0);
  assert.ok(result.projectedScore.includes('-'));
  assert.ok(Math.abs(result.homeWin + result.awayWin - 1) < 1e-9);
});

test('clamps unsafe numeric input and creates a readable local report', () => {
  const input = createPredictionInput({
    model: 'generic',
    homeName: 'Fighter A',
    awayName: 'Fighter B',
    homeRating: 99999,
    awayRating: -100,
    iterations: 9999999,
    seed: 5
  });
  const result = simulateMatch(input);
  const report = buildLocalSportsReport(input, result, 'en');

  assert.equal(input.iterations, 50000);
  assert.equal(input.home.rating, 2600);
  assert.equal(input.away.rating, 800);
  assert.match(report, /Fighter A/);
  assert.match(report, /50,000/);
});

test('uses the local sports report when Ollama is disabled or unavailable', async () => {
  const input = createPredictionInput({
    model: 'goals',
    homeName: 'Netherlands',
    awayName: 'Japan',
    homeRating: 1860,
    awayRating: 1770,
    iterations: 4000,
    seed: 12
  });
  const result = simulateMatch(input);
  let calls = 0;
  const report = await generateSportsReport({
    input,
    result,
    lang: 'en',
    useAI: true,
    model: 'gemma3:12b',
    fetcher: async () => {
      calls += 1;
      throw new Error('Ollama offline');
    }
  });

  assert.equal(calls, 1);
  assert.equal(report.source, 'local');
  assert.match(report.text, /Netherlands/);
});

test('accepts a length-limited report from local Ollama', async () => {
  const input = createPredictionInput({
    model: 'generic',
    homeName: 'A',
    awayName: 'B',
    iterations: 1000,
    seed: 2
  });
  const result = simulateMatch(input);
  const report = await generateSportsReport({
    input,
    result,
    lang: 'zh-TW',
    useAI: true,
    model: 'gemma3:12b',
    fetcher: async () => new Response(JSON.stringify({
      message: { content: '本機模型分析完成。' }
    }), { status: 200 })
  });

  assert.equal(report.source, 'ollama');
  assert.equal(report.text, '本機模型分析完成。');
});
