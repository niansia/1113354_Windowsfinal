"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const sportsSimulation_js_1 = require("../src/sports/sportsSimulation.js");
const sportsAi_js_1 = require("../src/sports/sportsAi.js");
(0, node_test_1.default)('produces deterministic football probabilities that sum to one', () => {
    const input = (0, sportsSimulation_js_1.createPredictionInput)({
        model: 'goals',
        homeName: 'Netherlands',
        awayName: 'Japan',
        homeRating: 1860,
        awayRating: 1770,
        iterations: 12000,
        seed: 20260614
    });
    const first = (0, sportsSimulation_js_1.simulateMatch)(input);
    const second = (0, sportsSimulation_js_1.simulateMatch)(input);
    strict_1.default.deepEqual(first, second);
    strict_1.default.ok(Math.abs(first.homeWin + first.draw + first.awayWin - 1) < 1e-9);
    strict_1.default.ok(first.homeWin > first.awayWin);
    strict_1.default.ok(first.topScorelines.length > 0);
});
(0, node_test_1.default)('gives a stronger basketball side a higher win probability', () => {
    const strong = (0, sportsSimulation_js_1.simulateMatch)((0, sportsSimulation_js_1.createPredictionInput)({
        model: 'points',
        homeName: 'Home',
        awayName: 'Away',
        homeRating: 1800,
        awayRating: 1550,
        iterations: 8000,
        seed: 42
    }));
    const weak = (0, sportsSimulation_js_1.simulateMatch)((0, sportsSimulation_js_1.createPredictionInput)({
        model: 'points',
        homeName: 'Home',
        awayName: 'Away',
        homeRating: 1500,
        awayRating: 1800,
        iterations: 8000,
        seed: 42
    }));
    strict_1.default.ok(strong.homeWin > weak.homeWin);
    strict_1.default.equal(strong.draw, 0);
});
(0, node_test_1.default)('simulates best-of-three set sports without draws', () => {
    const result = (0, sportsSimulation_js_1.simulateMatch)((0, sportsSimulation_js_1.createPredictionInput)({
        model: 'sets',
        homeName: 'Player A',
        awayName: 'Player B',
        homeRating: 1680,
        awayRating: 1640,
        iterations: 6000,
        seed: 7
    }));
    strict_1.default.equal(result.draw, 0);
    strict_1.default.ok(result.projectedScore.includes('-'));
    strict_1.default.ok(Math.abs(result.homeWin + result.awayWin - 1) < 1e-9);
});
(0, node_test_1.default)('clamps unsafe numeric input and creates a readable local report', () => {
    const input = (0, sportsSimulation_js_1.createPredictionInput)({
        model: 'generic',
        homeName: 'Fighter A',
        awayName: 'Fighter B',
        homeRating: 99999,
        awayRating: -100,
        iterations: 9999999,
        seed: 5
    });
    const result = (0, sportsSimulation_js_1.simulateMatch)(input);
    const report = (0, sportsSimulation_js_1.buildLocalSportsReport)(input, result, 'en');
    strict_1.default.equal(input.iterations, 50000);
    strict_1.default.equal(input.home.rating, 2600);
    strict_1.default.equal(input.away.rating, 800);
    strict_1.default.match(report, /Fighter A/);
    strict_1.default.match(report, /50,000/);
});
(0, node_test_1.default)('uses the local sports report when Ollama is disabled or unavailable', async () => {
    const input = (0, sportsSimulation_js_1.createPredictionInput)({
        model: 'goals',
        homeName: 'Netherlands',
        awayName: 'Japan',
        homeRating: 1860,
        awayRating: 1770,
        iterations: 4000,
        seed: 12
    });
    const result = (0, sportsSimulation_js_1.simulateMatch)(input);
    let calls = 0;
    const report = await (0, sportsAi_js_1.generateSportsReport)({
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
    strict_1.default.equal(calls, 1);
    strict_1.default.equal(report.source, 'local');
    strict_1.default.match(report.text, /Netherlands/);
});
(0, node_test_1.default)('accepts a length-limited report from local Ollama', async () => {
    const input = (0, sportsSimulation_js_1.createPredictionInput)({
        model: 'generic',
        homeName: 'A',
        awayName: 'B',
        iterations: 1000,
        seed: 2
    });
    const result = (0, sportsSimulation_js_1.simulateMatch)(input);
    const report = await (0, sportsAi_js_1.generateSportsReport)({
        input,
        result,
        lang: 'zh-TW',
        useAI: true,
        model: 'gemma3:12b',
        fetcher: async () => new Response(JSON.stringify({
            message: { content: '本機模型分析完成。' }
        }), { status: 200 })
    });
    strict_1.default.equal(report.source, 'ollama');
    strict_1.default.equal(report.text, '本機模型分析完成。');
});
