// Speech engine (Web Speech API). The old procedural-music synth was removed on
// request -- clicking a marker now only NARRATES (in the country's own language);
// nothing else plays. In the WebView2/Edge host the online "Microsoft ... (Natural)"
// neural voices cover ~140 languages; hasVoice() lets callers fall back to English
// narration when a language has no installed/online voice at all.

let voicesCache = null;

// Google translate_tts languages VERIFIED working (probed one by one, 2026-06-11).
// Languages outside this set + with no local voice fall back via SPEAK_FALLBACK -> English.
const GOOGLE_TTS = new Set([
  'af', 'am', 'ar', 'bg', 'bn', 'bs', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'et',
  'fi', 'fr', 'ha', 'hi', 'hr', 'hu', 'id', 'is', 'it', 'iw', 'ja', 'km', 'ko', 'lt',
  'lv', 'ms', 'my', 'ne', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sq', 'sr',
  'sv', 'sw', 'ta', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'zh-CN', 'zh-TW'
]);
function googleCode(lang) {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('zh')) return l === 'zh-tw' ? 'zh-TW' : 'zh-CN';
  const r = l.split('-')[0];
  return { he: 'iw', fil: 'tl', nb: 'no' }[r] || r;
}
export function hasOnlineVoice(lang) { return GOOGLE_TTS.has(googleCode(lang)); }

// online narration via Google translate_tts, fetched through the server's
// same-origin /api/tts proxy (a direct cross-origin media load gets ORB-blocked).
// Resolves when playback ENDS, rejects fast on unsupported language / offline /
// blocked autoplay.
let onlinePlayer = null;
function stopOnline() {
  if (onlinePlayer) {
    try { onlinePlayer.pause(); onlinePlayer.src = ''; } catch (e) { /* ignore */ }
    onlinePlayer = null;
  }
}
export function speakOnline(text, lang) {
  return new Promise((resolve, reject) => {
    const tl = googleCode(lang);
    if (!text || !GOOGLE_TTS.has(tl)) { reject(new Error('unsupported')); return; }
    stopOnline();
    const a = new Audio();
    a.src = '/api/tts?tl=' + encodeURIComponent(tl)
      + '&q=' + encodeURIComponent(text.replace(/\s+/g, ' ').slice(0, 195));
    onlinePlayer = a;
    a.onended = () => { if (onlinePlayer === a) onlinePlayer = null; resolve(true); };
    a.onerror = () => { if (onlinePlayer === a) onlinePlayer = null; reject(new Error('audio failed')); };
    a.play().catch((e) => { if (onlinePlayer === a) onlinePlayer = null; reject(e); });
  });
}

export function stopAudio() {
  try { window.speechSynthesis?.cancel(); } catch (e) { /* ignore */ }
  stopOnline();
}

function voiceQuality(v) {           // prefer Edge's online "Natural" neural voices
  const n = (v.name || '').toLowerCase();
  return (/natural/.test(n) ? 4 : 0) + (/online/.test(n) ? 2 : 0) + (v.localService ? 1 : 0);
}

function pickVoice(lang) {
  try {
    if (!voicesCache || !voicesCache.length) voicesCache = window.speechSynthesis.getVoices();
    if (!voicesCache || !voicesCache.length) return null;
    const base = lang.toLowerCase();
    const root = base.split('-')[0];
    const exact = voicesCache.filter((v) => v.lang && v.lang.toLowerCase() === base);
    const loose = voicesCache.filter((v) => v.lang && v.lang.toLowerCase().split('-')[0] === root);
    const pool = (exact.length ? exact : loose).slice();
    if (!pool.length) return null;
    pool.sort((a, b) => voiceQuality(b) - voiceQuality(a));   // best quality first
    return pool[0];
  } catch (e) {
    return null;
  }
}

// true when the engine has any voice able to speak this language
export function hasVoice(lang) { return !!pickVoice(lang || 'en'); }

// Speak arbitrary text in a given language -- the per-marker "voice guide". Picks a
// matching system voice when available, otherwise lets the engine fall back.
export function speak(text, lang, rate = 0.96) {
  if (!text) return false;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang || 'en');
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang || 'en'; }
    u.rate = rate; u.pitch = 1.0;
    synth.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

// Speak WITHOUT cancelling what's already playing -> queues after it. stopAudio()
// still clears the whole queue.
export function speakQueued(text, lang, rate = 0.96) {
  if (!text) return false;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang || 'en');
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang || 'en'; }
    u.rate = rate; u.pitch = 1.0;
    synth.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

export function speakGreeting(country) {
  const g = country.greeting;
  if (!g) return false;
  return speak(g.text, g.lang || 'en', 0.92);
}

export function initAudioVoices() {
  try {
    if (window.speechSynthesis) {
      voicesCache = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { voicesCache = window.speechSynthesis.getVoices(); };
    }
  } catch (e) { /* ignore */ }
}
