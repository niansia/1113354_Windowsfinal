import type { AppId } from '../types';
import type { Lang } from '../i18n/strings';
import type { ParsedIntent, SettingTarget } from './nlu';

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
    case 'open_app':
      return { kind: 'open_app', appId: (data.app || undefined) as AppId | undefined };
    case 'weather':
      return { kind: 'weather', query: data.query ? String(data.query) : undefined };
    case 'time':
      return { kind: 'time' };
    case 'date':
      return { kind: 'date' };
    case 'search':
      return { kind: 'search', query: data.query ? String(data.query) : undefined };
    case 'setting': {
      const target = String(data.setting ?? '') as SettingTarget;
      if (!VALID_SETTINGS.includes(target)) return null;
      let value: string | number | undefined = data.value;
      if (target === 'volume' && /^\d+$/.test(String(data.value))) value = Number(data.value);
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
      reply: data?.reply ? String(data.reply) : null
    };
  } catch {
    return null; // unreachable / aborted / bad response → caller uses offline parser
  } finally {
    t.done();
  }
}
