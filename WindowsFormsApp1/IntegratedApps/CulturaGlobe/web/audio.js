// Procedural cultural-audio engine (Web Audio API, fully offline, no samples).
//
// Each country has a music profile {scale, root, timbre, tempo}. From a seed we
// generate a short deterministic melodic phrase in a region-appropriate scale and
// synthesise it with a region-appropriate timbre:
//   * pluck  -> Karplus-Strong plucked string (koto / guzheng / sitar / guitar)
//   * bell   -> FM synthesis (gamelan metallophone / carillon)
//   * flute  -> filtered triangle + vibrato + breath (dizi / pan / shakuhachi)
//   * reed   -> filtered sawtooth + vibrato (bagpipe / duduk / accordion)
//   * bowed  -> slow-attack sawtooth + lowpass (erhu / fiddle)
//   * perc   -> noise + pitched body (djembe / taiko / steelpan)
// A synthesised convolution reverb gives it space. Language markers additionally
// speak the greeting via the Web Speech API when a matching voice exists.

let ctx = null;
let master = null;
let reverb = null;
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
  master.gain.value = 0.85;
  reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(2.2, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  master.connect(dry).connect(ctx.destination);
  master.connect(reverb).connect(wet).connect(ctx.destination);
  return ctx;
}

function makeImpulse(seconds, decay) {
  const rate = (ctx || ensureCtx()).sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c += 1) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i += 1) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function track(node, stopAt) {
  activeNodes.push({ node, stopAt });
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

// ---- timbres ----------------------------------------------------------------
function pluck(freq, t, dur, gain) {
  const rate = ctx.sampleRate;
  const n = Math.max(1, Math.floor(rate * 0.02));
  const buf = ctx.createBuffer(1, n, rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const delay = ctx.createDelay(0.05); delay.delayTime.value = 1 / freq;
  const fb = ctx.createGain(); fb.gain.value = 0.962;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(8000, freq * 8);
  const out = ctx.createGain(); out.gain.value = gain;
  src.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
  delay.connect(out); out.connect(master);
  out.gain.setValueAtTime(gain, t);
  out.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.start(t); src.stop(t + 0.02);
  track(src); track(out);
}

function fmBell(freq, t, dur, gain) {
  const carrier = ctx.createOscillator(); carrier.frequency.value = freq;
  const mod = ctx.createOscillator(); mod.frequency.value = freq * 1.41;
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(freq * 2.2, t);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.2, t + dur);
  const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  mod.connect(modGain).connect(carrier.frequency);
  carrier.connect(out).connect(master);
  carrier.start(t); mod.start(t); carrier.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  track(carrier); track(mod); track(out);
}

function toneVoice(type, freq, t, dur, gain, opts = {}) {
  const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter(); lp.type = opts.bandpass ? 'bandpass' : 'lowpass';
  lp.frequency.value = opts.cutoff || Math.min(6000, freq * 6);
  if (opts.bandpass) lp.Q.value = 3;
  const out = ctx.createGain();
  const atk = opts.attack ?? 0.02;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + atk);
  out.gain.setValueAtTime(gain, t + Math.max(atk, dur * 0.6));
  out.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  // vibrato
  if (opts.vibrato) {
    const lfo = ctx.createOscillator(); lfo.frequency.value = opts.vibrato;
    const lg = ctx.createGain(); lg.gain.value = freq * 0.012;
    lfo.connect(lg).connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.05); track(lfo);
  }
  osc.connect(lp).connect(out).connect(master);
  osc.start(t); osc.stop(t + dur + 0.05);
  track(osc); track(out);
}

function perc(freq, t, dur, gain) {
  // body
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + dur * 0.6);
  const og = ctx.createGain(); og.gain.setValueAtTime(gain, t); og.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(og).connect(master); o.start(t); o.stop(t + dur + 0.02); track(o); track(og);
  // noise transient
  const n = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 3; bp.Q.value = 1.2;
  const ng = ctx.createGain(); ng.gain.value = gain * 0.6;
  src.connect(bp).connect(ng).connect(master); src.start(t); track(src); track(ng);
}

function playNote(timbre, freq, t, dur, gain) {
  switch (timbre) {
    case 'pluck': return pluck(freq, t, dur, gain);
    case 'bell': return fmBell(freq, t, dur, gain);
    case 'flute': return toneVoice('triangle', freq, t, dur, gain, { vibrato: 5.5, attack: 0.06, cutoff: freq * 4 });
    case 'reed': return toneVoice('sawtooth', freq, t, dur, gain, { vibrato: 5, bandpass: true, cutoff: freq * 3 });
    case 'bowed': return toneVoice('sawtooth', freq, t, dur, gain, { attack: 0.12, cutoff: freq * 3.2 });
    case 'perc': return perc(freq, t, dur, gain);
    default: return pluck(freq, t, dur, gain);
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
export function playCountryMotif(country) {
  ensureCtx();
  stopAudio();
  const m = country.music || {};
  const scale = SCALES[m.scale] || SCALES.major;
  const root = m.root || 262;
  const tempo = m.tempo || 100;
  const beat = 60 / tempo;
  const rand = seeded(country.id + m.scale);
  const noteCount = 7 + Math.floor(rand() * 4);
  const t0 = ctx.currentTime + 0.04;
  let t = t0;
  let degree = 0;

  for (let i = 0; i < noteCount; i += 1) {
    // melodic walk within the scale, occasional octave lift
    const step = Math.floor(rand() * 5) - 2;
    degree = Math.max(-2, Math.min(scale.length + 4, degree + step));
    const oct = degree >= scale.length ? 1 : degree < 0 ? -1 : 0;
    const idx = ((degree % scale.length) + scale.length) % scale.length;
    const semis = scale[idx] + oct * 12;
    const freq = root * Math.pow(2, semis / 12);
    // rhythm: mostly eighths/quarters
    const r = rand();
    const dur = r < 0.18 ? beat * 1.0 : r < 0.7 ? beat * 0.5 : beat * 0.25;
    const gain = 0.16 + rand() * 0.07;
    playNote(m.timbre, freq, t, Math.max(0.45, dur * 2.6), gain);
    t += dur;
  }
  // a soft sustained root drone underneath for body
  playNote(m.timbre === 'perc' ? 'bowed' : m.timbre, root / 2, t0, (t - t0) + 1.2, 0.05);
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

export function speakGreeting(country) {
  const g = country.greeting;
  if (!g) return false;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(g.text);
    const v = pickVoice(g.lang || 'en');
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = g.lang || 'en'; }
    u.rate = 0.92; u.pitch = 1.0;
    synth.speak(u);
    return true;
  } catch (e) {
    return false;
  }
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
