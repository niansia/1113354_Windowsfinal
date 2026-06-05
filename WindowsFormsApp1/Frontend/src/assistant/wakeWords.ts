export interface WakePhraseMatch {
  matched: boolean;
  command: string;
}

const WAKE_PATTERNS = [
  /^(?:嗨|嘿|哈囉|你好)\s*fusion\b/i,
  /^(?:hey|hi|hello|ok|okay)\s+fusion\b/i,
  /^(?:ねえ|こんにちは)\s*fusion\b/i,
  /^(?:헤이|안녕)\s*fusion\b/i,
  /^fusion\b/i
];

const trimCommand = (value: string) =>
  value
    .replace(/^[\s,，、:：;；.!！?？\-—]+/, '')
    .trim();

export function matchWakePhrase(transcript: string): WakePhraseMatch {
  const normalized = transcript.trim();
  if (!normalized) return { matched: false, command: '' };

  for (const pattern of WAKE_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match || match.index !== 0) continue;
    return {
      matched: true,
      command: trimCommand(normalized.slice(match[0].length))
    };
  }

  return { matched: false, command: '' };
}
