import type { Lang } from '../i18n/strings.js';
import {
  buildLocalSportsReport,
  type SportsPredictionInput,
  type SportsPredictionResult
} from './sportsSimulation.js';
import type { SportsPredictionEvidence } from './sportsEvidence.js';

export interface SportsReport {
  text: string;
  source: 'local' | 'ollama';
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const OLLAMA_BASE = 'http://localhost:11434';
const MAX_REPORT_LENGTH = 1800;

const languageName: Record<Lang, string> = {
  'zh-TW': 'Traditional Chinese',
  'zh-CN': 'Simplified Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean'
};

const factorLabels: Record<string, Record<Lang, string>> = {
  'model-rating': { 'zh-TW': '模型評分', 'zh-CN': '模型评分', en: 'Model rating', ja: 'モデル評価', ko: '모델 평점' },
  record: { 'zh-TW': '賽季戰績', 'zh-CN': '赛季战绩', en: 'Season record', ja: 'シーズン成績', ko: '시즌 전적' },
  'recent-form': { 'zh-TW': '近五場狀態', 'zh-CN': '近五场状态', en: 'Recent form', ja: '直近5試合', ko: '최근 폼' },
  'head-to-head': { 'zh-TW': '歷史交手', 'zh-CN': '历史交手', en: 'Head-to-head', ja: '対戦履歴', ko: '상대 전적' },
  standings: { 'zh-TW': '賽事排名', 'zh-CN': '赛事排名', en: 'Competition standing', ja: '大会順位', ko: '대회 순위' },
  'squad-depth': { 'zh-TW': '陣容深度', 'zh-CN': '阵容深度', en: 'Squad depth', ja: '選手層', ko: '선수층' },
  availability: { 'zh-TW': '可用球員', 'zh-CN': '可用球员', en: 'Availability', ja: '出場可能選手', ko: '출전 가능 선수' },
  venue: { 'zh-TW': '場地因素', 'zh-CN': '场地因素', en: 'Venue factor', ja: '会場要因', ko: '경기장 요인' }
};

const evidenceNarrative = (
  evidence: SportsPredictionEvidence | undefined,
  lang: Lang
) => {
  if (!evidence?.factors.length) return '';
  const factors = [...evidence.factors]
    .sort((left, right) =>
      Math.abs(right.impact * right.confidence) - Math.abs(left.impact * left.confidence)
    )
    .slice(0, 3)
    .map((factor) => {
      const label = factorLabels[factor.id]?.[lang] ?? factor.label;
      const direction = factor.impact > 1 ? '+' : factor.impact < -1 ? '-' : '±';
      return `${label}: ${factor.homeValue} vs ${factor.awayValue} (${direction}${Math.abs(factor.impact).toFixed(1)})`;
    });
  const coverage = Math.round(evidence.coverage * 100);
  if (lang === 'en') return ` Key factors (${coverage}% data coverage): ${factors.join('; ')}.`;
  if (lang === 'ja') return ` 主な要因（データ網羅率 ${coverage}%）：${factors.join('；')}。`;
  if (lang === 'ko') return ` 주요 요인(데이터 범위 ${coverage}%): ${factors.join('; ')}.`;
  if (lang === 'zh-CN') return ` 关键因素（数据覆盖率 ${coverage}%）：${factors.join('；')}。`;
  return ` 關鍵因素（資料覆蓋率 ${coverage}%）：${factors.join('；')}。`;
};

export async function generateSportsReport(options: {
  input: SportsPredictionInput;
  result: SportsPredictionResult;
  evidence?: SportsPredictionEvidence;
  lang: Lang;
  useAI: boolean;
  model: string;
  fetcher?: Fetcher;
  signal?: AbortSignal;
}): Promise<SportsReport> {
  const local = `${buildLocalSportsReport(options.input, options.result, options.lang)}${evidenceNarrative(options.evidence, options.lang)}`;
  if (!options.useAI) return { text: local, source: 'local' };

  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetcher(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        stream: false,
        options: { temperature: 0.25 },
        messages: [
          {
            role: 'system',
            content: [
              'You are a sports analysis assistant inside Fusion OS.',
              `Write in ${languageName[options.lang]}.`,
              'Use only the supplied normalized statistics and simulation result.',
              'Be concise, explain uncertainty, and never present the analysis as betting advice.'
            ].join(' ')
          },
          {
            role: 'user',
            content: JSON.stringify({
              participants: [options.input.home, options.input.away],
              model: options.result.model,
              simulations: options.result.iterations,
              probability: {
                home: options.result.homeWin,
                draw: options.result.draw,
                away: options.result.awayWin
              },
              projectedScore: options.result.projectedScore,
              confidence: options.result.confidence,
              likelyScores: options.result.topScorelines,
              evidence: options.evidence ? {
                coverage: options.evidence.coverage,
                factors: options.evidence.factors.map((factor) => ({
                  id: factor.id,
                  homeValue: factor.homeValue,
                  awayValue: factor.awayValue,
                  impact: factor.impact,
                  confidence: factor.confidence,
                  source: factor.source
                }))
              } : undefined
            })
          }
        ]
      })
    });
    if (!response.ok) return { text: local, source: 'local' };
    const payload = await response.json() as { message?: { content?: unknown } };
    const content = String(payload.message?.content ?? '').trim();
    if (!content) return { text: local, source: 'local' };
    return {
      text: content.slice(0, MAX_REPORT_LENGTH),
      source: 'ollama'
    };
  } catch {
    return { text: local, source: 'local' };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
