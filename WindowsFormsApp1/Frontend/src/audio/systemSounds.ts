// System sounds, synthesized live with Web Audio — no audio assets to ship.
//
// playBootChime(): the startup sound, played once when boot hands off to the login
// screen. A short rising four-note bell figure over a soft pad, in the spirit of a
// classic OS startup chime. In the WebView2 host autoplay is allowed
// (--autoplay-policy=no-user-gesture-required); in a plain browser without a prior
// gesture the AudioContext stays suspended and the chime is silently skipped.
//
// playUnlockSound(): a tiny two-note confirmation right after a correct password
// (always allowed — the submit click is the user gesture).

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// one soft bell partial-stack through a lowpass, gentle attack, long ring-out
function bell(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, gain: number) {
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

// a quiet airy pad that swells under the bells and breathes back out
function pad(ac: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, gain: number) {
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

function makeBus(ac: AudioContext): AudioNode {
  const master = ac.createGain();
  master.gain.value = 0.6;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 6;
  master.connect(limiter).connect(ac.destination);
  // small noise-free echo for a sense of space
  const delay = ac.createDelay(0.5);
  delay.delayTime.value = 0.21;
  const fb = ac.createGain();
  fb.gain.value = 0.32;
  const wet = ac.createGain();
  wet.gain.value = 0.18;
  const dlp = ac.createBiquadFilter();
  dlp.type = 'lowpass';
  dlp.frequency.value = 1800;
  master.connect(delay);
  delay.connect(dlp).connect(fb).connect(delay);
  dlp.connect(wet).connect(ac.destination);
  return master;
}

let bootChimePlayed = false;

export function playBootChime(): void {
  if (bootChimePlayed) return;
  bootChimePlayed = true;
  const ac = ensureCtx();
  if (!ac) return;
  try {
    const bus = makeBus(ac);
    const t0 = ac.currentTime + 0.05;
    // D major lift: D4 - A4 - F#5 - D5 settling on the octave (warm, not saccharine)
    pad(ac, bus, 146.83, t0, 3.2, 0.05); // D3 pad floor
    bell(ac, bus, 293.66, t0, 2.6, 0.16); // D4
    bell(ac, bus, 440.0, t0 + 0.16, 2.4, 0.13); // A4
    bell(ac, bus, 739.99, t0 + 0.34, 2.2, 0.1); // F#5
    bell(ac, bus, 587.33, t0 + 0.52, 2.8, 0.14); // D5
  } catch {
    /* never let a sound break boot */
  }
}

export function playUnlockSound(): void {
  const ac = ensureCtx();
  if (!ac) return;
  try {
    const bus = makeBus(ac);
    const t0 = ac.currentTime + 0.02;
    bell(ac, bus, 587.33, t0, 0.7, 0.1); // D5
    bell(ac, bus, 880.0, t0 + 0.09, 1.1, 0.09); // A5
  } catch {
    /* ignore */
  }
}
