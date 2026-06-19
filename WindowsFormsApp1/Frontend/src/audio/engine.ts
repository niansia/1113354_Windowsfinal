// Shared Web Audio engine for FusionOS — one AudioContext, one app-sound master bus,
// and a small library of synthesis primitives. Everything is generated live; no audio
// assets ship with the app (matches the rest of the project's procedural approach).
//
// Two routing paths share this single context:
//   • system sounds (boot chime / unlock) connect straight to the destination so their
//     carefully tuned loudness is preserved and always audible.
//   • app sounds (per-app launch cues + ambient beds) connect through appMaster(), which
//     is driven by the FusionOS volume/mute settings via setMasterLevel().

let ctx: AudioContext | null = null;

export function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// ---- App-sound master (obeys FusionOS volume / mute) -------------------------------

let masterGain: GainNode | null = null;
let curLevel = 0.48; // mirrors DEFAULT_SETTINGS.volume (48)
let curMuted = false;

export function appMaster(ac: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ac.createGain();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 24;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    masterGain.connect(comp).connect(ac.destination);
    masterGain.gain.value = curMuted ? 0 : curLevel;
  }
  return masterGain;
}

// Called from React whenever the volume/mute settings change.
export function setMasterLevel(level: number, muted: boolean): void {
  curLevel = Math.max(0, Math.min(1, level));
  curMuted = muted;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(curMuted ? 0 : curLevel, ctx.currentTime, 0.04);
  }
}

// Per-cue voice bus with a small lowpassed echo for a sense of space; routes to appMaster.
export function voiceBus(ac: AudioContext, opts: { level?: number; reverb?: number; delay?: number } = {}): GainNode {
  const bus = ac.createGain();
  bus.gain.value = opts.level ?? 0.9;
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -12;
  lim.ratio.value = 6;
  bus.connect(lim).connect(appMaster(ac));

  const wetAmt = opts.reverb ?? 0.16;
  if (wetAmt > 0) {
    const delay = ac.createDelay(0.6);
    delay.delayTime.value = opts.delay ?? 0.19;
    const fb = ac.createGain();
    fb.gain.value = 0.3;
    const wet = ac.createGain();
    wet.gain.value = wetAmt;
    const dlp = ac.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2000;
    bus.connect(delay);
    delay.connect(dlp).connect(fb).connect(delay);
    dlp.connect(wet).connect(appMaster(ac));
  }
  return bus;
}

// Shared, cached buses so repeated launches / ambient swaps don't accumulate idle nodes
// (only the short-lived oscillators churn; the buses are built once and reused).
let _cueBus: GainNode | null = null;
let _ambientBus: GainNode | null = null;

export function cueBus(ac: AudioContext): GainNode {
  if (!_cueBus) _cueBus = voiceBus(ac, { level: 0.9, reverb: 0.14 });
  return _cueBus;
}

export function ambientBus(ac: AudioContext): GainNode {
  if (!_ambientBus) _ambientBus = voiceBus(ac, { level: 1, reverb: 0.2, delay: 0.32 });
  return _ambientBus;
}

// ---- Noise source ------------------------------------------------------------------

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// ---- Synthesis primitives ----------------------------------------------------------

// Soft bell partial-stack through a lowpass — gentle attack, long ring-out.
export function bell(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, gain: number): void {
  const out = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(5200, freq * 5);
  lp.Q.value = 0.5;
  out.connect(lp).connect(dest);
  const partials: Array<[number, number]> = [[1, 1], [2.0, 0.34], [2.99, 0.12], [4.1, 0.05]];
  for (const [mult, amp] of partials) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    const og = ac.createGain();
    og.gain.value = amp;
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + 0.025);
  out.gain.exponentialRampToValueAtTime(0.0006, t + dur);
}

// Quiet airy pad that swells and breathes back out.
export function pad(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, gain: number): void {
  const out = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  out.connect(lp).connect(dest);
  for (const [mult, amp] of [[1, 1], [1.5, 0.4], [2, 0.3]] as Array<[number, number]>) {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq * mult;
    o.detune.value = (mult - 1) * 4;
    const og = ac.createGain();
    og.gain.value = amp;
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
  out.gain.exponentialRampToValueAtTime(0.0006, t + dur);
}

// Versatile single note: any waveform, optional pitch glide and lowpass colour.
export function tone(
  ac: AudioContext,
  dest: AudioNode,
  o: { freq: number; t: number; dur: number; gain: number; type?: OscillatorType; glideTo?: number; cutoff?: number; attack?: number }
): void {
  const osc = ac.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), o.t + o.dur);
  let node: AudioNode = osc;
  if (o.cutoff) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cutoff;
    osc.connect(lp);
    node = lp;
  }
  const g = ac.createGain();
  const atk = o.attack ?? 0.006;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(o.gain, o.t + atk);
  g.gain.exponentialRampToValueAtTime(0.0005, o.t + o.dur);
  node.connect(g).connect(dest);
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.05);
}

// Short percussive bleep (fast decay).
export function blip(ac: AudioContext, dest: AudioNode, freq: number, t: number, gain: number, type: OscillatorType = 'square', dur = 0.09): void {
  tone(ac, dest, { freq, t, dur, gain, type, attack: 0.003 });
}

// String-ish pluck: bright transient with quick decay through a gentle highpass.
export function pluck(ac: AudioContext, dest: AudioNode, freq: number, t: number, gain: number, dur = 0.5): void {
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const osc2 = ac.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = freq;
  osc2.detune.value = 6;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = freq * 0.6;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 6, t);
  lp.frequency.exponentialRampToValueAtTime(freq * 1.4, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  const mix = ac.createGain();
  mix.gain.value = 0.5;
  osc.connect(mix);
  osc2.connect(mix);
  mix.connect(hp).connect(lp).connect(g).connect(dest);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + dur + 0.05);
  osc2.stop(t + dur + 0.05);
}

// Filtered noise burst — whooshes, whistles, ticks, percussion bodies.
export function noiseHit(
  ac: AudioContext,
  dest: AudioNode,
  o: { t: number; dur: number; gain: number; type?: BiquadFilterType; freq?: number; q?: number; sweepTo?: number }
): void {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1800, o.t);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.sweepTo), o.t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(o.gain, o.t + Math.min(0.02, o.dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0004, o.t + o.dur);
  src.connect(f).connect(g).connect(dest);
  src.start(o.t);
  src.stop(o.t + o.dur + 0.05);
}

// Low-frequency body impact (gavel / drum / drop).
export function thud(ac: AudioContext, dest: AudioNode, t: number, gain: number, freq = 150): void {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0004, t + 0.22);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + 0.3);
  // click transient on top
  noiseHit(ac, dest, { t, dur: 0.03, gain: gain * 0.5, type: 'highpass', freq: 2200 });
}

// ---- Sustained drone voice (for ambient beds) — returns a stop() ramp -------------

export interface DroneHandle {
  stop: (when?: number) => void;
}

export function drone(
  ac: AudioContext,
  dest: AudioNode,
  o: { freq: number; type?: OscillatorType; gain: number; detune?: number; cutoff?: number; lfoRate?: number; lfoDepth?: number }
): DroneHandle {
  const osc = ac.createOscillator();
  osc.type = o.type ?? 'sawtooth';
  osc.frequency.value = o.freq;
  if (o.detune) osc.detune.value = o.detune;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.cutoff ?? 900;
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.gain, t + 1.6); // slow fade-in
  osc.connect(lp).connect(g).connect(dest);
  osc.start(t);

  // gentle filter wobble so the bed slowly evolves
  let lfo: OscillatorNode | null = null;
  if (o.lfoRate) {
    lfo = ac.createOscillator();
    lfo.frequency.value = o.lfoRate;
    const lg = ac.createGain();
    lg.gain.value = o.lfoDepth ?? (o.cutoff ?? 900) * 0.3;
    lfo.connect(lg).connect(lp.frequency);
    lfo.start(t);
  }

  return {
    stop(when = ac.currentTime) {
      g.gain.cancelScheduledValues(when);
      g.gain.setValueAtTime(g.gain.value, when);
      g.gain.exponentialRampToValueAtTime(0.0004, when + 0.8);
      osc.stop(when + 0.9);
      if (lfo) lfo.stop(when + 0.9);
    }
  };
}
