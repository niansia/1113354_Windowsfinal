import type { Lang } from '../i18n/strings.js';
import type { SportsPredictionModel } from './sportsTypes.js';

export type PredictionPreset = 'conservative' | 'balanced' | 'upset';

export interface PredictionSide {
  name: string;
  rating: number;
  offense: number;
  defense: number;
  form: number;
}

export interface SportsPredictionInput {
  model: SportsPredictionModel;
  home: PredictionSide;
  away: PredictionSide;
  iterations: number;
  seed: number;
  preset: PredictionPreset;
}

export interface ScorelineProbability {
  score: string;
  probability: number;
}

export interface SportsPredictionResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  projectedScore: string;
  topScorelines: ScorelineProbability[];
  confidence: number;
  iterations: number;
  model: SportsPredictionModel;
}

interface PredictionInputOptions {
  model: SportsPredictionModel;
  homeName: string;
  awayName: string;
  homeRating?: number;
  awayRating?: number;
  homeOffense?: number;
  awayOffense?: number;
  homeDefense?: number;
  awayDefense?: number;
  homeForm?: number;
  awayForm?: number;
  iterations?: number;
  seed?: number;
  preset?: PredictionPreset;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export function createPredictionInput(options: PredictionInputOptions): SportsPredictionInput {
  const side = (
    name: string,
    rating: number | undefined,
    offense: number | undefined,
    defense: number | undefined,
    form: number | undefined
  ): PredictionSide => ({
    name: String(name || 'Unknown').slice(0, 80),
    rating: clamp(Number(rating ?? 1500), 800, 2600),
    offense: clamp(Number(offense ?? 50), 0, 100),
    defense: clamp(Number(defense ?? 50), 0, 100),
    form: clamp(Number(form ?? 50), 0, 100)
  });

  return {
    model: options.model,
    home: side(options.homeName, options.homeRating, options.homeOffense, options.homeDefense, options.homeForm),
    away: side(options.awayName, options.awayRating, options.awayOffense, options.awayDefense, options.awayForm),
    iterations: Math.round(clamp(Number(options.iterations ?? 20000), 1000, 50000)),
    seed: Math.trunc(Number.isFinite(options.seed) ? Number(options.seed) : 42) >>> 0,
    preset: options.preset ?? 'balanced'
  };
}

const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const randomNormal = (random: () => number) => {
  const first = Math.max(Number.EPSILON, random());
  const second = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

const randomPoisson = (lambda: number, random: () => number) => {
  const threshold = Math.exp(-clamp(lambda, 0.05, 8));
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > threshold && count < 18);
  return count - 1;
};

const presetScale = (preset: PredictionPreset) => {
  if (preset === 'conservative') return 0.82;
  if (preset === 'upset') return 0.62;
  return 1;
};

const sideStrength = (side: PredictionSide) =>
  side.rating + (side.form - 50) * 4 + (side.offense - side.defense) * 1.5;

const logisticProbability = (difference: number) =>
  1 / (1 + 10 ** (-difference / 400));

export function simulateMatch(input: SportsPredictionInput): SportsPredictionResult {
  const random = createRandom(input.seed);
  const scorelines = new Map<string, number>();
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  const homeStrength = sideStrength(input.home);
  const awayStrength = sideStrength(input.away);
  const adjustedDifference = (homeStrength - awayStrength) * presetScale(input.preset);

  for (let index = 0; index < input.iterations; index += 1) {
    let homeScore = 0;
    let awayScore = 0;

    if (input.model === 'goals') {
      const homeExpected = clamp(
        1.4 * Math.exp(adjustedDifference / 1000) *
        (0.8 + input.home.offense / 250) *
        (1.2 - input.away.defense / 500),
        0.2,
        4.8
      );
      const awayExpected = clamp(
        1.12 * Math.exp(-adjustedDifference / 1100) *
        (0.8 + input.away.offense / 250) *
        (1.2 - input.home.defense / 500),
        0.15,
        4.5
      );
      homeScore = randomPoisson(homeExpected, random);
      awayScore = randomPoisson(awayExpected, random);
    } else if (input.model === 'points') {
      const scoringBase = 96;
      const margin = adjustedDifference / 18;
      homeScore = Math.max(0, Math.round(scoringBase + margin / 2 + (input.home.offense - 50) * 0.35 + randomNormal(random) * 11));
      awayScore = Math.max(0, Math.round(scoringBase - margin / 2 + (input.away.offense - 50) * 0.35 + randomNormal(random) * 11));
      if (homeScore === awayScore) {
        if (random() < logisticProbability(adjustedDifference)) homeScore += 1;
        else awayScore += 1;
      }
    } else if (input.model === 'sets') {
      const setProbability = logisticProbability(adjustedDifference);
      const target = 2;
      while (homeScore < target && awayScore < target) {
        if (random() < setProbability) homeScore += 1;
        else awayScore += 1;
      }
    } else {
      const probability = logisticProbability(adjustedDifference);
      if (random() < probability) homeScore = 1;
      else awayScore = 1;
    }

    if (homeScore > awayScore) homeWins += 1;
    else if (awayScore > homeScore) awayWins += 1;
    else draws += 1;
    const scoreline = `${homeScore}-${awayScore}`;
    scorelines.set(scoreline, (scorelines.get(scoreline) ?? 0) + 1);
  }

  const homeWin = homeWins / input.iterations;
  const draw = draws / input.iterations;
  const awayWin = awayWins / input.iterations;
  const topScorelines = [...scorelines.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([score, count]) => ({ score, probability: count / input.iterations }));
  const sortedOutcomes = [homeWin, draw, awayWin].sort((a, b) => b - a);
  const confidence = clamp(0.5 + (sortedOutcomes[0] - sortedOutcomes[1]) * 0.8, 0.5, 0.95);

  return {
    homeWin,
    draw,
    awayWin,
    projectedScore: topScorelines[0]?.score ?? '0-0',
    topScorelines,
    confidence,
    iterations: input.iterations,
    model: input.model
  };
}

const localeByLang: Record<Lang, string> = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR'
};

export function buildLocalSportsReport(
  input: SportsPredictionInput,
  result: SportsPredictionResult,
  lang: Lang
): string {
  const favorite = result.homeWin >= result.awayWin ? input.home.name : input.away.name;
  const probability = Math.max(result.homeWin, result.awayWin);
  const iterations = result.iterations.toLocaleString(localeByLang[lang]);
  const percent = new Intl.NumberFormat(localeByLang[lang], {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(probability);

  if (lang === 'en') {
    return `${favorite} is the model favorite at ${percent} after ${iterations} simulations. The most likely score is ${result.projectedScore}, with ${Math.round(result.confidence * 100)}% model confidence.`;
  }
  if (lang === 'ja') {
    return `${iterations} 回のシミュレーションでは、${favorite} が ${percent} で優勢です。最頻スコアは ${result.projectedScore}、モデル信頼度は ${Math.round(result.confidence * 100)}% です。`;
  }
  if (lang === 'ko') {
    return `${iterations}회 시뮬레이션 결과 ${favorite}의 우세 확률은 ${percent}입니다. 가장 가능성 높은 점수는 ${result.projectedScore}, 모델 신뢰도는 ${Math.round(result.confidence * 100)}%입니다.`;
  }
  if (lang === 'zh-CN') {
    return `${iterations} 次模拟后，${favorite} 以 ${percent} 成为模型看好的一方。最可能比分为 ${result.projectedScore}，模型信心为 ${Math.round(result.confidence * 100)}%。`;
  }
  return `${iterations} 次模擬後，${favorite} 以 ${percent} 成為模型較看好的一方。最可能比分為 ${result.projectedScore}，模型信心為 ${Math.round(result.confidence * 100)}%。`;
}

