// Lightweight device tiering so the 3D background scales down on weak hardware
// and respects the user's reduced-motion preference.

export type PerfTier = 'low' | 'medium' | 'high';

export interface PerfProfile {
  tier: PerfTier;
  particleCount: number;
  reducedMotion: boolean;
}

export function getPerformanceProfile(): PerfProfile {
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  const memory = (typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory) || 4;

  let tier: PerfTier = 'medium';
  if (cores >= 8 && memory >= 8) tier = 'high';
  else if (cores <= 2 || memory <= 2) tier = 'low';

  const base = tier === 'high' ? 150 : tier === 'medium' ? 90 : 44;
  return {
    tier,
    particleCount: reducedMotion ? 24 : base,
    reducedMotion: !!reducedMotion
  };
}
