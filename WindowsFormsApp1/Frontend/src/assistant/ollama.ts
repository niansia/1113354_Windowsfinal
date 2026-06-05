import type { AppId } from '../types';
import type { Lang } from '../i18n/strings';
import type { ParsedIntent, SettingTarget } from './nlu';
import { FUSION_APPS } from '../data/fusionApps';

// Treat the model as an UNTRUSTED black box: its JSON output drives real actions (opening
// apps, changing settings), so every field is validated against an allowlist below before it
// is ever executed. A hallucinated or prompt-injected response can therefore only ever map to
// a known-safe action or be dropped — never to something arbitrary.
const VALID_APP_IDS = new Set<string>(FUSION_APPS.map((app) => app.id));
const VALID_LANGS = new Set<Lang>(['zh-TW', 'zh-CN', 'en', 'ja', 'ko']);
export const MAX_REPLY_CHARS = 2000;

const clampText = (value: unknown, max: number): string | undefined => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : undefined;
};

function coerceSettingValue(target: SettingTarget, raw: unknown): string | number | undefined {
  const value = String(raw ?? '').trim().toLowerCase();
  switch (target) {
    case 'theme':
      return value === 'dark' || value === 'light' ? value : undefined;
    case 'brightness':
      return value === 'up' || value === 'down' ? value : undefined;
    case 'volume':
      if (/^\d{1,3}$/.test(value)) return Math.max(0, Math.min(100, Number(value)));
      return ['up', 'down', 'mute', 'unmute'].includes(value) ? value : undefined;
    case 'language':
      if (value === 'zh-cn') return 'zh-CN';
      if (value === 'zh-tw') return 'zh-TW';
      return VALID_LANGS.has(value as Lang) ? value : undefined;
    case 'wallpaper':
      return undefined; // no value needed (cycles to next)
    default: // night | transparency | animations | contrast → boolean toggles
      return ['on', 'off', 'toggle'].includes(value) ? value : 'toggle';
  }
}

// Optional local LLM bridge (Ollama). When the user enables "Advanced AI understanding"
// and is running Ollama locally with a Gemma model, the assistant asks the model to map a
// free-form utterance to one of its known actions (function-calling style, JSON output) and
// to provide a natural conversational reply. If Ollama is unreachable the caller silently
// falls back to the offline rule-based parser, so this never blocks the assistant.
//
// To use: install Ollama, `ollama pull gemma3:12b`, and allow the web origin, e.g.
//   setx OLLAMA_ORIGINS "*"   (then restart Ollama)

const DEFAULT_BASE = 'http://localhost:11434';

export interface OllamaUnderstanding {
  parsed: ParsedIntent | null; // a concrete action to execute, or null for pure chat
  reply: string | null; // a natural-language reply (used for chat / unknown)
}

function withTimeout(ms: number, signal?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  };
}

export async function ollamaAvailable(baseUrl = DEFAULT_BASE): Promise<boolean> {
  const t = withTimeout(1400);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: t.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    t.done();
  }
}

const VALID_SETTINGS: SettingTarget[] = ['theme', 'night', 'brightness', 'volume', 'transparency', 'animations', 'contrast', 'wallpaper', 'language'];

function buildSystemPrompt(apps: Array<{ id: AppId; name: string }>, lang: Lang): string {
  const appList = apps.map((a) => `${a.id} = ${a.name}`).join(', ');
  return [
    'You are the intent router for the Fusion OS voice assistant. Read the user utterance and reply with ONLY a single JSON object, no markdown, no extra text.',
    'Schema: {"action": one of ["open_app","weather","time","date","setting","search","chat"], "app": app id or "", "setting": one of ["theme","night","brightness","volume","transparency","animations","contrast","wallpaper","language"] or "", "value": string, "query": string, "reply": string}',
    `Available app ids: ${appList}.`,
    'Rules: For opening an app use action "open_app" and set "app" to the matching id. For weather use "weather" and put the city (if any) in "query". For the current time use "time", for the date use "date". For changing a system preference use "setting" with the right "setting" field and "value" (theme→"dark"/"light"; night/transparency/animations/contrast→"on"/"off"/"toggle"; brightness→"up"/"down"; volume→a number 0-100 or "up"/"down"/"mute"/"unmute"; language→"en"/"ja"/"ko"/"zh-CN"/"zh-TW"). For web search use "search" with the text in "query". For anything else, greetings, or small talk use "chat".',
    `Always write the "reply" field as a short, friendly response in this language code: ${lang}.`
  ].join('\n');
}

export function coerceParsed(data: any): ParsedIntent | null {
  const action = String(data?.action ?? '').trim();
  switch (action) {
    case 'open_app': {
      const appId = String(data?.app ?? '').trim();
      // Only ever an app that actually exists; an unknown id becomes a no-op "not found".
      return { kind: 'open_app', appId: VALID_APP_IDS.has(appId) ? (appId as AppId) : undefined };
    }
    case 'weather':
      return { kind: 'weather', query: clampText(data?.query, 80) };
    case 'time':
      return { kind: 'time' };
    case 'date':
      return { kind: 'date' };
    case 'search':
      return { kind: 'search', query: clampText(data?.query, 200) };
    case 'setting': {
      const target = String(data?.setting ?? '').trim() as SettingTarget;
      if (!VALID_SETTINGS.includes(target)) return null;
      const value = coerceSettingValue(target, data?.value);
      // Drop settings whose value we can't validate (except wallpaper, which needs none).
      if (target !== 'wallpaper' && value === undefined) return null;
      return { kind: 'setting', setTarget: target, setValue: value };
    }
    default:
      return null; // 'chat' / unknown → no concrete action
  }
}

export async function ollamaUnderstand(opts: {
  model: string;
  utterance: string;
  lang: Lang;
  apps: Array<{ id: AppId; name: string }>;
  baseUrl?: string;
  signal?: AbortSignal;
}): Promise<OllamaUnderstanding | null> {
  const base = opts.baseUrl ?? DEFAULT_BASE;
  const t = withTimeout(22000, opts.signal);
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: t.signal,
      body: JSON.stringify({
        model: opts.model,
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: buildSystemPrompt(opts.apps, opts.lang) },
          { role: 'user', content: opts.utterance }
        ]
      })
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const content: string = payload?.message?.content ?? '';
    if (!content) return null;

    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      // Some models wrap JSON in prose; salvage the first {...} block.
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return { parsed: null, reply: content.trim() };
      data = JSON.parse(match[0]);
    }

    return {
      parsed: coerceParsed(data),
      reply: data?.reply ? String(data.reply).slice(0, MAX_REPLY_CHARS) : null
    };
  } catch {
    return null; // unreachable / aborted / bad response → caller uses offline parser
  } finally {
    t.done();
  }
}
