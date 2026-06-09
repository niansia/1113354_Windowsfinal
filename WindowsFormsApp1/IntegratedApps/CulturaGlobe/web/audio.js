// Procedural cultural-audio engine (Web Audio API, fully offline, no samples).
//
// REWRITE (v5): every voice is built from pure, band-limited oscillators (sine /
// triangle) shaped by soft attack/decay envelopes. There is NO noise generator and
// NO noise-convolution reverb anywhere in the signal path, so the engine physically
// cannot produce the harsh static the old Karplus-Strong / noise-percussion path did.
// Spaciousness comes from a gentle lowpassed feedback-delay network. Each country
// still gets a deterministic melodic phrase in a region-appropriate scale, voiced
// with a soft region-appropriate timbre. Language markers also speak the greeting via
// the Web Speech API when a matching voice exists.

let ctx = null;
let master = null;
let reverbIn = null;
let activeNodes = [];

// scale = semitone offsets within an octave
const SCALES = {
  penta_cn: [0, 2, 4, 7, 9],
  hirajoshi: [0, 2, 3, 7, 8],
  raga: [0, 1, 4, 5, 7, 8, 11],      // Bhairav-ish
  slendro: [0, 2, 5, 7, 9],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  andean: [0, 3, 5, 7, 10],
  penta_africa: [0, 2, 5, 7, 9]
};

function ensureCtx() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  const limiter = ctx.createDynamicsCompressor();   // gentle peak control, no clipping
  limiter.threshold.value = -12; limiter.ratio.value = 8; limiter.attack.value = 0.005; limiter.release.value = 0.2;
  master.connect(limiter);
  const dry = ctx.createGain();
  dry.gain.value = 0.92;
  limiter.connect(dry).connect(ctx.destination);
  // smooth, NOISE-FREE reverb: parallel lowpassed feedback delays (a small FDN).
  reverbIn = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0.15;
  [0.029, 0.037, 0.047, 0.061].forEach((dt) => {
    const d = ctx.createDelay(0.5); d.delayTime.value = dt;
    const fb = ctx.createGain(); fb.gain.value = 0.55;          // <1 -> always decays, never screams
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000;
    reverbIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet);
  });
  limiter.connect(reverbIn);
  wet.connect(ctx.destination);
  return ctx;
}

function track(node) {
  activeNodes.push({ node });
}

export function stopAudio() {
  if (!ctx) return;
  const now = ctx.currentTime;
  activeNodes.forEach(({ node }) => {
    try { if (node.stop) node.stop(now); } catch (e) { /* ignore */ }
    try { node.disconnect(); } catch (e) { /* ignore */ }
  });
  activeNodes = [];
  try { window.speechSynthesis?.cancel(); } catch (e) { /* ignore */ }
}

// ---- one soft, noise-free voice ------------------------------------------------
// Built from a small stack of oscillator partials through a lowpass + soft envelope.
function voice(opts) {
  const { freq, t, dur, gain } = opts;
  const type = opts.type || 'sine';
  const attack = opts.attack ?? 0.02;
  const out = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = opts.cutoff || Math.min(4000, freq * 4); lp.Q.value = 0.6;
  lp.connect(out).connect(master);
  (opts.partials || [[1, 1]]).forEach(([mult, amp]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq * mult;
    const og = ctx.createGain(); og.gain.value = amp;
    o.connect(og).connect(lp);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = opts.vibrato;
      const lg = ctx.createGain(); lg.gain.value = freq * mult * (opts.vibDepth || 0.006);
      lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); track(lfo);
    }
    o.start(t); o.stop(t + dur + 0.1); track(o);
  });
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + attack);           // soft attack -> no click
  if (opts.plucked) {
    out.gain.exponentialRampToValueAtTime(0.0008, t + dur);     // plucked: decay away
  } else {
    out.gain.setValueAtTime(gain, t + Math.max(attack, dur * 0.55));
    out.gain.exponentialRampToValueAtTime(0.0008, t + dur);     // sustained: hold then release
  }
  track(out);
}

// soft pitched mallet for the "percussion" regions -> still no noise
function marimba(freq, t, dur, gain) {
  const out = ctx.createGain();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(3000, freq * 4);
  lp.connect(out).connect(master);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.045);    // quick pitch settle = mallet attack
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 4.0;
  const o2g = ctx.createGain(); o2g.gain.value = 0.1;
  o.connect(lp); o2.connect(o2g).connect(lp);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0008, t + Math.min(dur, 0.55));
  o.start(t); o.stop(t + dur + 0.05); o2.start(t); o2.stop(t + 0.22);
  track(o); track(o2); track(out);
}

function playNote(timbre, freq, t, dur, gain) {
  switch (timbre) {
    case 'pluck': return voice({ type: 'triangle', freq, t, dur, gain, plucked: true, attack: 0.006, partials: [[1, 1], [2, 0.22]], cutoff: Math.min(3400, freq * 4) });
    case 'bell':  return voice({ type: 'sine', freq, t, dur, gain: gain * 0.95, plucked: true, attack: 0.004, partials: [[1, 1], [2.0, 0.5], [3.01, 0.22], [4.2, 0.1]], cutoff: Math.min(5200, freq * 6) });
    case 'flute': return voice({ type: 'sine', freq, t, dur, gain, attack: 0.07, vibrato: 5.0, vibDepth: 0.006, partials: [[1, 1], [2, 0.05]], cutoff: Math.min(3800, freq * 3.2) });
    case 'reed':  return voice({ type: 'triangle', freq, t, dur, gain: gain * 0.9, attack: 0.045, vibrato: 4.5, vibDepth: 0.007, partials: [[1, 1], [2, 0.1]], cutoff: Math.min(2600, freq * 2.4) });
    case 'bowed': return voice({ type: 'triangle', freq, t, dur, gain: gain * 0.88, attack: 0.12, partials: [[1, 1], [2, 0.07]], cutoff: Math.min(2400, freq * 2.2) });
    case 'perc':  return marimba(freq, t, dur, gain);
    default:      return voice({ type: 'triangle', freq, t, dur, gain, plucked: true, attack: 0.006, partials: [[1, 1], [2, 0.22]], cutoff: Math.min(3400, freq * 4) });
  }
}

// deterministic PRNG from a string seed
function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i += 1) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// ---- main ------------------------------------------------------------------
// `seed` lets each individual marker get its own melody (so two markers of the same
// country don't sound identical). Defaults to the country id when omitted.
export function playCountryMotif(country, seed) {
  ensureCtx();
  stopAudio();
  const m = country.music || {};
  const scale = SCALES[m.scale] || SCALES.major;
  const root = m.root || 262;
  const tempo = m.tempo || 100;
  const beat = 60 / tempo;
  const rand = seeded((seed || country.id) + m.scale);
  const noteCount = 7 + Math.floor(rand() * 4);
  const t0 = ctx.currentTime + 0.06;
  let t = t0;
  let degree = 0;

  for (let i = 0; i < noteCount; i += 1) {
    // melodic walk within the scale, occasional octave lift
    const step = Math.floor(rand() * 5) - 2;
    degree = Math.max(-2, Math.min(scale.length + 4, degree + step));
    const oct = degree >= scale.length ? 1 : degree < 0 ? -1 : 0;
    const idx = ((degree % scale.length) + scale.length) % scale.length;
    const semis = scale[idx] + oct * 12;
    const freq = Math.min(1320, Math.max(120, root * Math.pow(2, semis / 12)));
    // rhythm: mostly eighths/quarters
    const r = rand();
    const dur = r < 0.18 ? beat * 1.0 : r < 0.7 ? beat * 0.5 : beat * 0.25;
    const gain = 0.1 + rand() * 0.04;
    playNote(m.timbre, freq, t, Math.max(0.35, dur * 1.5), gain);
    t += dur;
  }
}

let voicesCache = null;
function pickVoice(lang) {
  try {
    if (!voicesCache) voicesCache = window.speechSynthesis.getVoices();
    if (!voicesCache || !voicesCache.length) return null;
    const base = lang.toLowerCase();
    return (
      voicesCache.find((v) => v.lang && v.lang.toLowerCase() === base) ||
      voicesCache.find((v) => v.lang && v.lang.toLowerCase().startsWith(base.split('-')[0])) ||
      null
    );
  } catch (e) {
    return null;
  }
}

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

export const SCALE_KEYS = Object.keys(SCALES);
