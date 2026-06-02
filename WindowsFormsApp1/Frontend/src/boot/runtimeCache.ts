import type { FusionApp } from '../data/fusionApps';
import type { PerfProfile } from '../utils/performanceProfile';

// Module-singleton runtime cache. Boot fills it once; Home + (where reachable)
// apps read from it instead of recomputing. Safe to read before boot finishes —
// every field is nullable and consumers must fall back.

export interface AppRegistry {
  apps: FusionApp[];
  byId: Record<string, FusionApp>;
  categories: string[];
  searchIndex: { id: string; hay: string }[];
  carouselLayout: { id: string; pos: number }[];
}

export interface StarNode {
  x: number;
  y: number;
  z: number; // depth 0..1
  mag: number; // brightness
  hue: number;
  twinkle: number;
}

export interface CosmicSummary {
  total: number;
  byCategory: Record<string, number>;
  starNodeCount: number;
}

export interface PianoManifest {
  keys: number;
  mapping: { note: string; midi: number }[];
  ready: boolean;
}

export interface GestureConfig {
  minimumRefireMs: number;
  oppositeReturnIgnoreMs: number;
  activeHandLockMs: number;
  ready: boolean;
}

export interface BootDiagnostics {
  durationMs: number;
  tasks: { id: string; ok: boolean; ms: number; optional: boolean; error?: string }[];
}

export interface FusionRuntimeCache {
  appRegistry: AppRegistry | null;
  performanceProfile: PerfProfile | null;
  starfield: StarNode[] | null;
  nebulaSeed: number | null;
  cosmicSummary: CosmicSummary | null;
  pianoManifest: PianoManifest | null;
  gestureConfig: GestureConfig | null;
  apod: unknown | null;
  bootDiagnostics: BootDiagnostics | null;
  bootCompleted: boolean;
}

export const fusionRuntimeCache: FusionRuntimeCache = {
  appRegistry: null,
  performanceProfile: null,
  starfield: null,
  nebulaSeed: null,
  cosmicSummary: null,
  pianoManifest: null,
  gestureConfig: null,
  apod: null,
  bootDiagnostics: null,
  bootCompleted: false
};

// expose for debugging from devtools
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).fusionRuntimeCache = fusionRuntimeCache;
}
