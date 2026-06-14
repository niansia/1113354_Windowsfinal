"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchWakePhrase = matchWakePhrase;
const WAKE_PATTERNS = [
    /^(?:嗨|嘿|哈囉|你好)\s*fusion\b/i,
    /^(?:hey|hi|hello|ok|okay)\s+fusion\b/i,
    /^(?:ねえ|こんにちは)\s*fusion\b/i,
    /^(?:헤이|안녕)\s*fusion\b/i,
    /^fusion\b/i
];
const trimCommand = (value) => value
    .replace(/^[\s,，、:：;；.!！?？\-—]+/, '')
    .trim();
function matchWakePhrase(transcript) {
    const normalized = transcript.trim();
    if (!normalized)
        return { matched: false, command: '' };
    for (const pattern of WAKE_PATTERNS) {
        const match = normalized.match(pattern);
        if (!match || match.index !== 0)
            continue;
        return {
            matched: true,
            command: trimCommand(normalized.slice(match[0].length))
        };
    }
    return { matched: false, command: '' };
}
