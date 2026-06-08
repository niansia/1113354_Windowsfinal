import { useEffect, useRef, useState } from 'react';
import { runBoot, type BootSnapshot, PHASE_LABELS } from '../boot/bootService';
import { getPerformanceProfile } from '../utils/performanceProfile';

export interface BootState extends BootSnapshot {
  debug: boolean;
  allowSkip: boolean;
  reducedMotion: boolean;
  tier: string;
  skip: () => void;
}

function flag(name: string): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (name === 'skip') { if (params.get('boot') === '0') return true; }
    if (name === 'debug') { if (params.get('bootDebug') === '1') return true; }
    if (name === 'force') { if (params.get('bootFull') === '1') return true; }
    if (name === 'hold') { return params.get('bootHold') === '1'; }
    const map: Record<string, string> = { skip: 'fusionSkipBoot', debug: 'fusionBootDebug', force: 'fusionForceFullBoot' };
    return window.localStorage?.getItem(map[name]) === '1';
  } catch {
    return false;
  }
}

const INITIAL: BootSnapshot = {
  phase: 'firmware',
  phaseLabel: PHASE_LABELS.firmware,
  taskLabel: 'FusionOS 核心喚醒',
  progress: 0,
  modules: [],
  done: false
};

export function useBootSequence(): BootState {
  const profile = useRef(getPerformanceProfile());
  const reducedMotion = profile.current.reducedMotion;
  const debug = flag('debug');

  // Skip is DEVELOPER-ONLY. Production boot can never be skipped by the user; it can
  // only fall back via the system timeout. Enable with ?bootDebug=1 or
  // localStorage.fusionBootDebug='1' / localStorage.fusionAllowBootSkip='1'.
  let allowSkip = debug;
  try { if (window.localStorage?.getItem('fusionAllowBootSkip') === '1') allowSkip = true; } catch { /* ignore */ }

  const [snap, setSnap] = useState<BootSnapshot>(INITIAL);
  const skipRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // run exactly once (survives StrictMode double-mount)
    startedRef.current = true;

    // DEV: ?bootHold=1 freezes on the boot screen (progress gently breathes) so the
    // boot core animation can be inspected. Never completes -> never reveals home.
    if (flag('hold')) {
      const t0 = performance.now();
      let raf = 0;
      const loop = () => {
        const t = (performance.now() - t0) / 1000;
        setSnap((s) => ({ ...s, taskLabel: 'Boot hold (dev)', done: false,
          progress: 0.55 + 0.4 * Math.sin(t * 0.5) }));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    const skipVisual = flag('skip');
    if (skipVisual) skipRef.current = true;

    runBoot({
      shouldSkip: () => skipRef.current,
      onUpdate: setSnap
    }).then(() => {
      try { window.sessionStorage?.setItem('fusionBootPlayed', '1'); } catch { /* ignore */ }
    });
  }, [reducedMotion]);

  return {
    ...snap,
    debug,
    allowSkip,
    reducedMotion,
    tier: profile.current.tier,
    skip: () => { if (allowSkip) skipRef.current = true; }
  };
}
