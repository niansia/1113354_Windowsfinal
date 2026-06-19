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

import { ensureCtx, bell, pad } from './engine';

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
