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

const SENTENCE_DELIMITERS = /[.。!！?？,，、;；・　]+/;

// Collapse Whisper-style repetition hallucinations: both glued repeats ("XX X") and
// delimiter-separated repeats ("X.X.X") fold back to a single instance.
function collapseRepeats(text: string): string {
  let out = text.replace(/\s+/g, ' ').trim();
  // Immediately repeated unit (2+ chars, 2+ times), with optional spacing between copies.
  out = out.replace(/(.{2,40}?)(?:\s*\1){1,}/giu, '$1').trim();
  const phrases = out.split(SENTENCE_DELIMITERS).map((part) => part.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const phrase of phrases) {
    const previous = deduped[deduped.length - 1];
    if (!previous || previous.toLowerCase() !== phrase.toLowerCase()) deduped.push(phrase);
  }
  // Only rebuild (which strips delimiters) when a duplicate phrase was actually removed —
  // otherwise keep the original punctuation intact.
  if (deduped.length === phrases.length) return out;
  return deduped.join(' ').replace(/\s+/g, ' ').trim();
}

// Turn a raw voice transcript into a real command, or '' when there is nothing to act on
// (pure wake phrase, repeated hallucination, or empty). Used to drop spurious "commands".
export function sanitizeVoiceCommand(input: string): string {
  let text = collapseRepeats((input ?? '').trim());
  if (!text) return '';
  // Strip any leading wake phrases (the transcript may BE the wake phrase, repeated).
  for (let i = 0; i < 4; i += 1) {
    const wake = matchWakePhrase(text);
    if (!wake.matched) break;
    const rest = wake.command.trim();
    if (rest === text) break;
    text = rest;
    if (!text) break;
  }
  return collapseRepeats(text);
}
