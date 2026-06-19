// Per-app audio identity for FusionOS — every app gets a unique, theme-fitting signature
// synthesized live with Web Audio (no audio files). Two layers:
//   • playAppCue(id):  a short (~0.5–1.4s) "open" cue, fired centrally from the launch
//     path so it covers both in-shell overlays and host-window apps.
//   • startAppAmbient(id) / stopAppAmbient(): a soft, slowly evolving ambient bed for the
//     immersive overlay apps, running while that app is on screen.
//
// Excluded by design (they already own their sound): the GitHub-imported 鋼琴 / FinWeb,
// the dedicated WAV / AURORA players, and 世界文化星球 (procedural in-place music).

import type { AppId } from '../types';
import {
  ensureCtx,
  cueBus,
  ambientBus,
  bell,
  pad,
  tone,
  blip,
  pluck,
  noiseHit,
  thud,
  drone,
  type DroneHandle
} from './engine';

const EXCLUDED = new Set<string>(['piano', 'finweb', 'wav', 'media', 'cultura']);

// --- Launch cues --------------------------------------------------------------------

type Cue = (ac: AudioContext, bus: GainNode, t: number) => void;

const CUES: Partial<Record<AppId, Cue>> = {
  // 本機 — clean "system ready" tone
  pc: (ac, bus, t) => {
    blip(ac, bus, 523.25, t, 0.16, 'sine', 0.12);
    blip(ac, bus, 783.99, t + 0.1, 0.16, 'sine', 0.12);
    bell(ac, bus, 1046.5, t + 0.18, 1.1, 0.12);
  },
  // 專案檔案 — soft drawer whoosh + wood tick
  dir: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.34, gain: 0.1, type: 'lowpass', freq: 500, sweepTo: 1600 });
    blip(ac, bus, 196, t + 0.04, 0.12, 'triangle', 0.12);
    bell(ac, bus, 659.25, t + 0.18, 0.8, 0.08);
  },
  // 應用程式中心 — expansive ascending shimmer (open everything)
  tool: (ac, bus, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(ac, bus, f, t + i * 0.07, 1.6, 0.1));
    pad(ac, bus, 261.63, t, 1.4, 0.04);
  },
  // 網頁區 — "connect / online" rising pings
  web: (ac, bus, t) => {
    tone(ac, bus, { freq: 440, t, dur: 0.16, gain: 0.12, type: 'sine', glideTo: 660 });
    tone(ac, bus, { freq: 660, t: t + 0.12, dur: 0.22, gain: 0.12, type: 'sine', glideTo: 880 });
    blip(ac, bus, 1318.5, t + 0.26, 0.06, 'square', 0.05);
  },
  // Fusion RPG — cheerful chiptune adventure jingle
  game: (ac, bus, t) => {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => blip(ac, bus, f, t + i * 0.085, 0.14, 'square', 0.12));
    blip(ac, bus, 1046.5, t + 0.34, 0.2, 'square', 0.2);
    blip(ac, bus, 1046.5, t + 0.34, 0.12, 'triangle', 0.18);
  },
  // 系統設定 — mechanical tick + confirm
  set: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.04, gain: 0.08, type: 'highpass', freq: 3000 });
    blip(ac, bus, 587.33, t + 0.06, 0.12, 'triangle', 0.1);
    bell(ac, bus, 880, t + 0.16, 0.7, 0.08);
  },
  // 電路工作室 — electric power-on zap + spark
  circuit: (ac, bus, t) => {
    tone(ac, bus, { freq: 80, t, dur: 0.26, gain: 0.12, type: 'sawtooth', glideTo: 880, cutoff: 2200 });
    noiseHit(ac, bus, { t, dur: 0.05, gain: 0.06, type: 'bandpass', freq: 4000, q: 2 });
    blip(ac, bus, 1318.5, t + 0.16, 0.1, 'square', 0.08);
    blip(ac, bus, 1567.98, t + 0.24, 0.07, 'square', 0.06);
  },
  // 虛擬造型工作室 — glamorous sparkle
  style: (ac, bus, t) => {
    [1046.5, 1318.5, 1567.98].forEach((f, i) => bell(ac, bus, f, t + i * 0.05, 1.0, 0.07));
    noiseHit(ac, bus, { t: t + 0.05, dur: 0.5, gain: 0.04, type: 'highpass', freq: 6000 });
    bell(ac, bus, 880, t + 0.18, 1.2, 0.08);
  },
  // 英文單字卡 — friendly marimba learning ding
  flashcards: (ac, bus, t) => {
    pluck(ac, bus, 523.25, t, 0.12, 0.4);
    pluck(ac, bus, 659.25, t + 0.1, 0.12, 0.4);
    bell(ac, bus, 1046.5, t + 0.22, 0.9, 0.08);
  },
  // 宇宙手勢 — cosmic shimmer / whoosh
  cosmic: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.7, gain: 0.05, type: 'bandpass', freq: 300, sweepTo: 5000, q: 0.7 });
    pad(ac, bus, 220, t, 1.4, 0.05);
    [1318.5, 1760, 2093].forEach((f, i) => bell(ac, bus, f, t + 0.2 + i * 0.08, 1.2, 0.05));
  },
  // MetroPulse — transit door chime (descending major third, soft mallet)
  metro: (ac, bus, t) => {
    bell(ac, bus, 659.25, t, 0.9, 0.13);
    bell(ac, bus, 523.25, t + 0.22, 1.3, 0.13);
  },
  // 真偽鑑識中心 — forensic scan sweep + analytic blips
  verify: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.5, gain: 0.06, type: 'bandpass', freq: 800, sweepTo: 4000, q: 3 });
    blip(ac, bus, 880, t + 0.18, 0.08, 'square', 0.06);
    blip(ac, bus, 1174.66, t + 0.3, 0.08, 'square', 0.06);
    tone(ac, bus, { freq: 196, t: t + 0.42, dur: 0.4, gain: 0.1, type: 'sine' });
  },
  // 物聯網中樞 — sensor-network pings then a connect tone
  iot: (ac, bus, t) => {
    [880, 1174.66, 1318.5, 1567.98].forEach((f, i) => blip(ac, bus, f, t + i * 0.07, 0.07, 'sine', 0.06));
    blip(ac, bus, 659.25, t + 0.32, 0.13, 'triangle', 0.14);
  },
  // 全球體育中心 — referee whistle + energetic stab chord
  sports: (ac, bus, t) => {
    tone(ac, bus, { freq: 2300, t, dur: 0.22, gain: 0.07, type: 'sine' });
    noiseHit(ac, bus, { t, dur: 0.22, gain: 0.05, type: 'bandpass', freq: 2300, q: 6 });
    [523.25, 659.25, 783.99].forEach((f) => tone(ac, bus, { freq: f, t: t + 0.26, dur: 0.4, gain: 0.08, type: 'sawtooth', cutoff: 2600 }));
  },
  // MediSphere — calm ECG monitor beeps + soft pad
  medical: (ac, bus, t) => {
    pad(ac, bus, 392, t, 1.3, 0.04);
    blip(ac, bus, 1567.98, t + 0.05, 0.1, 'sine', 0.12);
    blip(ac, bus, 1567.98, t + 0.32, 0.1, 'sine', 0.12);
    bell(ac, bus, 783.99, t + 0.5, 1.0, 0.07);
  },
  // SignalForge — modem / data tones + carrier sweep
  signal: (ac, bus, t) => {
    blip(ac, bus, 1046.5, t, 0.08, 'square', 0.07);
    blip(ac, bus, 1396.91, t + 0.07, 0.08, 'square', 0.06);
    tone(ac, bus, { freq: 600, t: t + 0.16, dur: 0.34, gain: 0.08, type: 'sawtooth', glideTo: 1200, cutoff: 2400 });
    blip(ac, bus, 1760, t + 0.3, 0.06, 'square', 0.05);
  },
  // NeuroFlow AI — synthetic neural arpeggio (glide) + thinking pad + sparkle
  neuro: (ac, bus, t) => {
    pad(ac, bus, 220, t, 1.5, 0.045);
    [440, 554.37, 659.25, 880].forEach((f, i) =>
      tone(ac, bus, { freq: f * 0.99, t: t + i * 0.06, dur: 0.5, gain: 0.07, type: 'sawtooth', glideTo: f, cutoff: 2600 })
    );
    bell(ac, bus, 1760, t + 0.34, 1.2, 0.05);
  },
  // LexTaiwan 法律導航 — gavel double-knock + settled chord
  legal: (ac, bus, t) => {
    thud(ac, bus, t, 0.22, 180);
    thud(ac, bus, t + 0.16, 0.18, 170);
    [196, 261.63, 392].forEach((f) => tone(ac, bus, { freq: f, t: t + 0.3, dur: 0.7, gain: 0.06, type: 'triangle', cutoff: 1400 }));
  },
  // 詩雲 — ethereal guzheng pentatonic descent over an airy pad
  poetry: (ac, bus, t) => {
    pad(ac, bus, 146.83, t, 1.8, 0.04);
    [587.33, 440, 880, 1174.66].forEach((f, i) => pluck(ac, bus, f, t + i * 0.12, 0.1, 0.7));
  },
  // 記事本與日曆 — pencil tick + soft mark
  notes: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.05, gain: 0.07, type: 'bandpass', freq: 2600, q: 1.5 });
    blip(ac, bus, 392, t + 0.07, 0.1, 'triangle', 0.1);
    bell(ac, bus, 659.25, t + 0.18, 0.7, 0.07);
  },
  // 開發實驗室 — playful computational blips + data click
  dev: (ac, bus, t) => {
    [659.25, 880, 587.33, 1046.5].forEach((f, i) => blip(ac, bus, f, t + i * 0.06, 0.1, 'square', 0.08));
    noiseHit(ac, bus, { t: t + 0.26, dur: 0.04, gain: 0.05, type: 'highpass', freq: 3000 });
  },
  // Fusion 資料庫 — data whir + record clicks
  db: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.22, gain: 0.05, type: 'bandpass', freq: 1200, sweepTo: 600, q: 2 });
    blip(ac, bus, 880, t + 0.12, 0.08, 'square', 0.05);
    blip(ac, bus, 1046.5, t + 0.2, 0.08, 'square', 0.05);
    bell(ac, bus, 523.25, t + 0.28, 0.7, 0.07);
  },
  // 工具箱 — mechanical ratchet clicks
  toolbox: (ac, bus, t) => {
    noiseHit(ac, bus, { t, dur: 0.03, gain: 0.09, type: 'bandpass', freq: 2000, q: 3 });
    noiseHit(ac, bus, { t: t + 0.08, dur: 0.03, gain: 0.08, type: 'bandpass', freq: 1700, q: 3 });
    blip(ac, bus, 330, t + 0.14, 0.12, 'sawtooth', 0.12);
    bell(ac, bus, 523.25, t + 0.24, 0.7, 0.06);
  },
  // 終端機 — retro PC-speaker beep + key click
  cmd: (ac, bus, t) => {
    blip(ac, bus, 880, t, 0.14, 'square', 0.12);
    noiseHit(ac, bus, { t: t + 0.14, dur: 0.03, gain: 0.05, type: 'highpass', freq: 3500 });
    blip(ac, bus, 1318.5, t + 0.16, 0.1, 'square', 0.1);
  },
  // 使用者空間 — warm personal welcome
  user: (ac, bus, t) => {
    pad(ac, bus, 261.63, t, 1.2, 0.04);
    bell(ac, bus, 523.25, t, 1.0, 0.12);
    bell(ac, bus, 659.25, t + 0.12, 1.2, 0.1);
  },
  // 匯入專案 — incoming "append" sweep + confirm
  add: (ac, bus, t) => {
    tone(ac, bus, { freq: 330, t, dur: 0.3, gain: 0.1, type: 'triangle', glideTo: 660 });
    blip(ac, bus, 880, t + 0.28, 0.1, 'sine', 0.12);
  }
};

export function playAppCue(id: string | null | undefined): void {
  if (!id || EXCLUDED.has(id)) return;
  const recipe = CUES[id as AppId];
  if (!recipe) return;
  const ac = ensureCtx();
  if (!ac) return;
  try {
    recipe(ac, cueBus(ac), ac.currentTime + 0.02);
  } catch {
    /* never let a sound break a launch */
  }
}

// --- Ambient beds (immersive overlay apps) ------------------------------------------

interface AmbientRecipe {
  chord: number[];
  type: OscillatorType;
  level: number;
  cutoff: number;
  lfoRate: number;
  noise?: number;
  sparkle?: { everyMs: number; freqs: number[]; gain: number; kind?: 'bell' | 'pluck' | 'blip'; osc?: OscillatorType };
}

const AMBIENT: Partial<Record<AppId, AmbientRecipe>> = {
  // 詩雲 — calm pentatonic drone with occasional guzheng plucks
  poetry: { chord: [146.83, 220, 293.66], type: 'triangle', level: 0.05, cutoff: 1200, lfoRate: 0.05, noise: 0.006, sparkle: { everyMs: 5200, freqs: [587.33, 659.25, 783.99, 880], gain: 0.03, kind: 'pluck' } },
  // NeuroFlow — deep AI-lab hum with periodic data blips
  neuro: { chord: [110, 164.81, 220], type: 'sawtooth', level: 0.04, cutoff: 620, lfoRate: 0.08, noise: 0.004, sparkle: { everyMs: 2600, freqs: [880, 1318.5], gain: 0.016, kind: 'blip', osc: 'square' } },
  // SignalForge — low electrical hum + faint telemetry
  signal: { chord: [82.41, 123.47, 164.81], type: 'sawtooth', level: 0.04, cutoff: 520, lfoRate: 0.07, noise: 0.005, sparkle: { everyMs: 3400, freqs: [1046.5, 1567.98], gain: 0.014, kind: 'blip', osc: 'square' } },
  // 電路工作室 — workbench electronic hum + occasional bleep
  circuit: { chord: [120, 180, 240], type: 'sawtooth', level: 0.035, cutoff: 800, lfoRate: 0.12, noise: 0.004, sparkle: { everyMs: 4200, freqs: [1318.5, 1567.98], gain: 0.012, kind: 'blip', osc: 'square' } },
  // MediSphere — calm clinical pad + faint monitor pulse
  medical: { chord: [196, 293.66, 392], type: 'sine', level: 0.045, cutoff: 1500, lfoRate: 0.04, sparkle: { everyMs: 3000, freqs: [1567.98], gain: 0.012, kind: 'blip', osc: 'sine' } },
  // 虛擬造型工作室 — soft glam shimmer pad
  style: { chord: [261.63, 392, 523.25], type: 'triangle', level: 0.04, cutoff: 2000, lfoRate: 0.06, noise: 0.006, sparkle: { everyMs: 4600, freqs: [1046.5, 1318.5, 1567.98], gain: 0.02, kind: 'bell' } },
  // LexTaiwan — quiet study-room drone with a rare soft bell
  legal: { chord: [98, 146.83, 196], type: 'triangle', level: 0.04, cutoff: 900, lfoRate: 0.03, noise: 0.003, sparkle: { everyMs: 8000, freqs: [392, 523.25], gain: 0.012, kind: 'bell' } }
};

let loopBuf: AudioBuffer | null = null;
function loopNoise(ac: AudioContext): AudioBuffer {
  if (!loopBuf) {
    loopBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = loopBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  }
  return loopBuf;
}

interface ActiveAmbient {
  id: string;
  drones: DroneHandle[];
  stopNoise?: () => void;
  timer?: number;
}

let active: ActiveAmbient | null = null;

export function stopAppAmbient(): void {
  if (!active) return;
  const a = active;
  active = null;
  if (a.timer) window.clearInterval(a.timer);
  try {
    a.drones.forEach((d) => d.stop());
    a.stopNoise?.();
  } catch {
    /* ignore */
  }
}

export function startAppAmbient(id: string | null | undefined): void {
  if (active && active.id === id) return; // already playing this bed
  stopAppAmbient();
  if (!id || EXCLUDED.has(id)) return;
  const recipe = AMBIENT[id as AppId];
  if (!recipe) return;
  const ac = ensureCtx();
  if (!ac) return;
  try {
    const bus = ambientBus(ac);

    const drones = recipe.chord.map((f, i) =>
      drone(ac, bus, {
        freq: f,
        type: recipe.type,
        gain: recipe.level * (i === 0 ? 1 : 0.7),
        detune: i * 5,
        cutoff: recipe.cutoff,
        lfoRate: recipe.lfoRate,
        lfoDepth: recipe.cutoff * 0.35
      })
    );

    let stopNoise: (() => void) | undefined;
    if (recipe.noise) {
      const src = ac.createBufferSource();
      src.buffer = loopNoise(ac);
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1600;
      f.Q.value = 0.6;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.linearRampToValueAtTime(recipe.noise, ac.currentTime + 1.8);
      src.connect(f).connect(g).connect(bus);
      src.start();
      stopNoise = () => {
        try {
          g.gain.cancelScheduledValues(ac.currentTime);
          g.gain.setValueAtTime(g.gain.value, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0004, ac.currentTime + 0.6);
          src.stop(ac.currentTime + 0.7);
        } catch {
          /* ignore */
        }
      };
    }

    let timer: number | undefined;
    if (recipe.sparkle) {
      const sp = recipe.sparkle;
      const fire = () => {
        if (Math.random() > 0.7) return; // irregular, sparse
        const tt = ac.currentTime + 0.02;
        const fq = sp.freqs[Math.floor(Math.random() * sp.freqs.length)];
        if (sp.kind === 'pluck') pluck(ac, bus, fq, tt, sp.gain, 0.8);
        else if (sp.kind === 'blip') blip(ac, bus, fq, tt, sp.gain, sp.osc ?? 'sine', 0.12);
        else bell(ac, bus, fq, tt, 1.4, sp.gain);
      };
      timer = window.setInterval(fire, sp.everyMs);
    }

    active = { id, drones, stopNoise, timer };
  } catch {
    /* never let ambient break the UI */
  }
}
