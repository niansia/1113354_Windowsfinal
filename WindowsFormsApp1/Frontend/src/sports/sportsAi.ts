import type { Lang } from '../i18n/strings.js';
import {
  buildLocalSportsReport,
  type SportsPredictionInput,
  type SportsPredictionResult
} from './sportsSimulation.js';

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

export async function generateSportsReport(options: {
  input: SportsPredictionInput;
  result: SportsPredictionResult;
  lang: Lang;
  useAI: boolean;
  model: string;
  fetcher?: Fetcher;
  signal?: AbortSignal;
}): Promise<SportsReport> {
  const local = buildLocalSportsReport(options.input, options.result, options.lang);
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
              likelyScores: options.result.topScorelines
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

