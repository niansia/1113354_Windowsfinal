// Synthesized bird song engine (Web Audio, zero samples). Every species carries a
// "recipe": a sequence of syllables the engine performs live. Pure band-limited
// oscillators only -- no noise source anywhere, so it can never turn into harsh
// static (lesson learned from the old culture-music engine).
//
// Syllable types:
//   whistle  pure sweep f0->f1 (most songbirds)        { f0,f1,d,vib?,g? }
//   trill    fast frequency shake around f0            { f0,f1(depth),d,rate? }
//   chirp    very short rising/falling blip            { f0,f1,d }
//   hoot     soft low coo (owl/dove), slight drop      { f0,d }
//   rasp     buzzy saw through a formant filter (crow) { f0,d }
//   honk     brassy square blast (crane/goose)         { f0,d }
//   rest     silence                                    { d }
// A syllable may set n (repeats) and gap (s between repeats).

let ctx = null;
let master = null;
let busUntil = 0;
let activeNodes = [];

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    // a touch of forest air: one lowpassed feedback delay
    const d = ctx.createDelay(0.6);
    d.delayTime.value = 0.16;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const wet = ctx.createGain();
    wet.gain.value = 0.14;
    limiter.connect(d);
    d.connect(lp);
    lp.connect(fb);
    fb.connect(d);
    lp.connect(wet);
    wet.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function track(node) { activeNodes.push(node); }

export function stopSong() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const node of activeNodes) {
    try { if (node.stop) node.stop(now); } catch (e) { /* ignore */ }
    try { node.disconnect(); } catch (e) { /* ignore */ }
  }
  activeNodes = [];
  busUntil = 0;
}

// one enveloped oscillator voice; returns its end time
function voice(t, d, gain, build) {
  const out = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 7200;
  lp.Q.value = 0.4;
  out.connect(lp).connect(master);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, d * 0.3));
  out.gain.setValueAtTime(gain, t + d * 0.7);
  out.gain.exponentialRampToValueAtTime(0.0008, t + d);
  track(out);
  build(out, lp);
  return t + d;
}

function osc(type, t, d) {
  const o = ctx.createOscillator();
  o.type = type;
  o.start(t);
  o.stop(t + d + 0.05);
  track(o);
  return o;
}

function playSyllable(sy, t) {
  const d = sy.d ?? 0.2;
  const g = sy.g ?? 0.16;
  switch (sy.t) {
    case 'rest':
      return t + d;
    case 'whistle':
      return voice(t, d, g, (out) => {
        const o = osc('sine', t, d);
        o.frequency.setValueAtTime(sy.f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(60, sy.f1 ?? sy.f0), t + d);
        if (sy.vib) {
          const lfo = osc('sine', t, d);
          lfo.frequency.value = sy.vib;
          const lg = ctx.createGain();
          lg.gain.value = sy.f0 * 0.03;
          lfo.connect(lg).connect(o.frequency);
          track(lg);
        }
        o.connect(out);
      });
    case 'trill':
      return voice(t, d, g, (out) => {
        const o = osc('sine', t, d);
        o.frequency.value = sy.f0;
        const lfo = osc('sine', t, d);
        lfo.frequency.value = sy.rate ?? 22;
        const lg = ctx.createGain();
        lg.gain.value = sy.f1 ?? sy.f0 * 0.18;
        lfo.connect(lg).connect(o.frequency);
        track(lg);
        o.connect(out);
      });
    case 'chirp':
      return voice(t, d, g, (out) => {
        const o = osc('sine', t, d);
        o.frequency.setValueAtTime(sy.f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(80, sy.f1 ?? sy.f0 * 1.6), t + d * 0.85);
        o.connect(out);
      });
    case 'hoot':
      return voice(t, d, g * 1.2, (out, lp) => {
        lp.frequency.value = 900;
        const o = osc('sine', t, d);
        o.frequency.setValueAtTime(sy.f0, t);
        o.frequency.exponentialRampToValueAtTime(sy.f0 * 0.82, t + d);
        const o2 = osc('sine', t, d);
        o2.frequency.value = sy.f0 * 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.18;
        o2.connect(g2).connect(out);
        track(g2);
        o.connect(out);
      });
    case 'rasp':
      return voice(t, d, g * 0.5, (out, lp) => {
        lp.frequency.value = Math.min(2400, sy.f0 * 4);
        const o = osc('sawtooth', t, d);
        o.frequency.setValueAtTime(sy.f0, t);
        o.frequency.linearRampToValueAtTime(sy.f0 * 0.9, t + d);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = sy.f0 * 2.4;
        bp.Q.value = 1.4;
        o.connect(bp).connect(out);
        track(bp);
      });
    case 'honk':
      return voice(t, d, g * 0.7, (out, lp) => {
        lp.frequency.value = 2000;
        const o = osc('square', t, d);
        o.frequency.setValueAtTime(sy.f0, t);
        o.frequency.linearRampToValueAtTime(sy.f0 * 1.06, t + d * 0.3);
        o.frequency.linearRampToValueAtTime(sy.f0 * 0.94, t + d);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = sy.f0 * 2;
        bp.Q.value = 0.9;
        o.connect(bp).connect(out);
        track(bp);
      });
    default:
      return t + d;
  }
}

// Perform a recipe (array of syllables, each optionally repeated). Returns total
// duration in seconds. Cancels whatever song was playing before.
export function playRecipe(seq) {
  ensureCtx();
  stopSong();
  let t = ctx.currentTime + 0.04;
  for (const sy of seq) {
    const n = sy.n ?? 1;
    const gap = sy.gap ?? 0.06;
    for (let i = 0; i < n; i++) {
      t = playSyllable(sy, t);
      if (i < n - 1) t += gap;
    }
  }
  busUntil = t;
  return t - ctx.currentTime;
}

// season-aware: spring/summer = full breeding song, autumn/winter = the shorter call
// (real birds mostly sing in the breeding season). Falls back to whichever exists.
export function playBirdSong(bird, season) {
  const breeding = season === 'spring' || season === 'summer';
  const seq = (breeding ? bird.song : bird.call) || bird.song || bird.call;
  if (!seq) return 0;
  return playRecipe(seq);
}

export function isSinging() {
  return !!ctx && ctx.currentTime < busUntil;
}

// Fallback voice for any species without a real recording: a short, pleasant,
// DETERMINISTIC chirp built from the species' numeric seed so each bird sounds
// individual but the same bird always sounds the same.
export function playGenericBird(seed) {
  const rng = (() => {
    let h = (seed * 2654435761) >>> 0;
    return () => { h = (h ^ (h << 13)) >>> 0; h = (h ^ (h >>> 17)) >>> 0; h = (h ^ (h << 5)) >>> 0; return h / 4294967296; };
  })();
  const base = 1800 + Math.floor(rng() * 2600);
  const kinds = ['whistle', 'trill', 'chirp', 'hoot'];
  const seq = [];
  const motifs = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < motifs; i++) {
    const k = kinds[Math.floor(rng() * (rng() < 0.7 ? 3 : kinds.length))];
    const f = base * (0.7 + rng() * 0.6);
    if (k === 'whistle') seq.push(w(f, f * (0.6 + rng() * 0.9), 0.12 + rng() * 0.16, { n: 1 + Math.floor(rng() * 3), gap: 0.05 }));
    else if (k === 'trill') seq.push(tr(f, f * 0.16, 0.18 + rng() * 0.18, 18 + rng() * 18));
    else if (k === 'chirp') seq.push(ch(f, f * (1.2 + rng() * 0.6), 0.06 + rng() * 0.05, { n: 2 + Math.floor(rng() * 4), gap: 0.05 + rng() * 0.05 }));
    else seq.push(ho(260 + rng() * 240, 0.18 + rng() * 0.14, { n: 1 + Math.floor(rng() * 2), gap: 0.12 }));
    if (rng() < 0.5) seq.push(rest(0.1 + rng() * 0.18));
  }
  return playRecipe(seq);
}

// local syllable shorthands so playGenericBird is self-contained
function w(f0, f1, d, x = {}) { return { t: 'whistle', f0, f1, d, ...x }; }
function tr(f0, depth, d, rate, x = {}) { return { t: 'trill', f0, f1: depth, d, rate, ...x }; }
function ch(f0, f1, d, x = {}) { return { t: 'chirp', f0, f1, d, ...x }; }
function ho(f0, d, x = {}) { return { t: 'hoot', f0, d, ...x }; }
function rest(d) { return { t: 'rest', d }; }
