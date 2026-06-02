import { useEffect, useRef, useState } from 'react';
import { runBoot, type BootSnapshot, PHASE_LABELS } from '../boot/bootService';
import { getPerformanceProfile } from '../utils/performanceProfile';

export interface BootState extends BootSnapshot {
  debug: boolean;
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

  const [snap, setSnap] = useState<BootSnapshot>(INITIAL);
  const skipRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // run exactly once (survives StrictMode double-mount)
    startedRef.current = true;

    const skipVisual = flag('skip');
    const force = flag('force');
    let played = false;
    try { played = window.sessionStorage?.getItem('fusionBootPlayed') === '1'; } catch { /* ignore */ }

    let paceScale = 1;
    if (!force && played) paceScale = 0.4; // same-session F5 => short boot
    if (reducedMotion || profile.current.tier === 'low') paceScale = Math.min(paceScale, 0.5);
    if (force) paceScale = 1;

    runBoot({
      fast: skipVisual,
      paceScale,
      shouldSkip: () => skipRef.current,
      onUpdate: setSnap
    }).then(() => {
      try { window.sessionStorage?.setItem('fusionBootPlayed', '1'); } catch { /* ignore */ }
    });
  }, [reducedMotion]);

  return {
    ...snap,
    debug,
    reducedMotion,
    tier: profile.current.tier,
    skip: () => { skipRef.current = true; }
  };
}
