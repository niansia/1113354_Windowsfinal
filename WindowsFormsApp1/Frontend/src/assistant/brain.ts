import type { AppId } from '../types';
import type { Lang } from '../i18n/strings';
import { coerceParsed, ollamaUnderstand, type OllamaUnderstanding } from './ollama';

// The optional "brain": turns a free-form utterance into a structured action + reply.
// Prefers the local Fusion Voice Server's /understand endpoint (which runs the user's own
// Gemma model); falls back to a local Ollama install; returns null if neither is available
// so the caller uses the offline rule-based parser. Never throws.

async function understandViaServer(
  serverUrl: string,
  utterance: string,
  lang: Lang,
  apps: Array<{ id: AppId; name: string }>,
  signal?: AbortSignal
): Promise<OllamaUnderstanding | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(`${serverUrl.replace(/\/$/, '')}/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ utterance, lang, apps })
    });
    if (!res.ok) return null; // 503 = Gemma still loading / disabled → caller falls back
    const data = await res.json();
    return { parsed: coerceParsed(data), reply: data?.reply ? String(data.reply) : null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function understand(opts: {
  serverUrl?: string;
  ollamaModel?: string;
  utterance: string;
  lang: Lang;
  apps: Array<{ id: AppId; name: string }>;
  signal?: AbortSignal;
}): Promise<OllamaUnderstanding | null> {
  // 1) the user's Gemma via the local Fusion Voice Server
  if (opts.serverUrl) {
    const viaServer = await understandViaServer(opts.serverUrl, opts.utterance, opts.lang, opts.apps, opts.signal);
    if (viaServer) return viaServer;
  }
  // 2) a local Ollama model, if present
  if (opts.ollamaModel) {
    return ollamaUnderstand({ model: opts.ollamaModel, utterance: opts.utterance, lang: opts.lang, apps: opts.apps, signal: opts.signal });
  }
  return null;
}
