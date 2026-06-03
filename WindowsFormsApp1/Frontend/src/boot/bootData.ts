import { FUSION_APPS } from '../data/fusionApps';
import { getPerformanceProfile } from '../utils/performanceProfile';
import { fusionRuntimeCache } from './runtimeCache';
import type { AppRegistry, CosmicSummary, GestureConfig, PianoManifest, StarNode } from './runtimeCache';

// ----- App registry + search index (used by Home) -----
export function buildAppRegistry(): AppRegistry {
  const byId: Record<string, (typeof FUSION_APPS)[number]> = {};
  const searchIndex: { id: string; hay: string }[] = [];
  const categories = new Set<string>();
  FUSION_APPS.forEach((app) => {
    byId[app.id] = app;
    categories.add(app.category);
    searchIndex.push({ id: app.id, hay: [app.title, app.subtitle, app.category, ...app.tags].join(' ').toLowerCase() });
  });
  const carouselLayout = FUSION_APPS.map((app, i) => ({ id: app.id, pos: i }));
  return { apps: FUSION_APPS, byId, categories: Array.from(categories), searchIndex, carouselLayout };
}

// ----- Procedural starfield (real CPU work, reused by boot visual) -----
function mulberry32(seed: number): () => number {
  let v = seed >>> 0;
  return () => {
    v += 0x6d2b79f5;
    let t = v;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateStarfield(count: number, seed = 73939133): StarNode[] {
  const rand = mulberry32(seed);
  const nodes: StarNode[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const z = rand();
    const pick = rand();
    nodes[i] = {
      x: rand(),
      y: rand(),
      z,
      mag: 0.3 + Math.pow(rand(), 1.6) * 0.9,
      hue: pick > 0.82 ? 280 : pick > 0.6 ? 45 : pick > 0.4 ? 188 : 210,
      twinkle: 0.4 + rand() * 2.2
    };
  }
  return nodes;
}

// The cosmic catalog lives in the separate Cosmic Gesture app; here we record a
// curated summary that mirrors it (for the boot HUD and Home diagnostics).
export function buildCosmicSummary(starNodeCount: number): CosmicSummary {
  const byCategory: Record<string, number> = {
    planet: 9,
    dwarf: 5,
    moon: 8,
    star: 12,
    constellation: 14,
    nebula: 10,
    galaxy: 15,
    blackhole: 7,
    cluster: 5
  };
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  return { total, byCategory, starNodeCount };
}

// ----- Piano metadata / keyboard mapping (no audio playback) -----
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function buildPianoManifest(): PianoManifest {
  const mapping: { note: string; midi: number }[] = [];
  for (let midi = 21; midi <= 108; midi += 1) {
    const name = NOTE_NAMES[(midi - 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    mapping.push({ note: `${name}${octave}`, midi });
  }
  return { keys: 88, mapping, ready: true };
}

export async function preloadApp(appId: string): Promise<void> {
  const registry = fusionRuntimeCache.appRegistry ?? buildAppRegistry();
  fusionRuntimeCache.appRegistry = registry;
  if (registry.byId[appId] && !fusionRuntimeCache.preloadedApps.includes(appId)) {
    fusionRuntimeCache.preloadedApps.push(appId);
  }
  await Promise.resolve();
}

export async function preloadCommonApps(): Promise<string> {
  await Promise.all(['piano', 'media', 'wav', 'cosmic', 'set', 'web'].map((id) => preloadApp(id)));
  return `Preloaded ${fusionRuntimeCache.preloadedApps.length} app manifests`;
}

// ----- Gesture state-machine config (no camera side effects) -----
export function buildGestureConfig(): GestureConfig {
  return { minimumRefireMs: 260, oppositeReturnIgnoreMs: 480, activeHandLockMs: 900, ready: true };
}

export function detectPerformance() {
  return getPerformanceProfile();
}

export async function warmGlassKernel(): Promise<string> {
  if (typeof document !== 'undefined') {
    const probe = document.createElement('div');
    probe.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:-9999px',
      'width:240px',
      'height:160px',
      'border-radius:18px',
      'backdrop-filter:blur(18px) saturate(1.35)',
      'background:linear-gradient(135deg,rgba(88,220,255,.16),rgba(154,103,255,.14))',
      'box-shadow:0 24px 80px rgba(34,211,238,.18)'
    ].join(';');
    document.body.appendChild(probe);
    void probe.getBoundingClientRect();
    void window.getComputedStyle(probe).backdropFilter;
    document.body.removeChild(probe);
  }
  await nextPaint();
  return 'Glass compositor warmed';
}

export async function warmShellLayout(): Promise<string> {
  const registry = fusionRuntimeCache.appRegistry ?? buildAppRegistry();
  fusionRuntimeCache.appRegistry = registry;
  const layout = registry.apps.map((app, index) => ({
    id: app.id,
    x: index % 4,
    y: Math.floor(index / 4),
    hue: app.color
  }));
  await nextPaint();
  return `Layout ${layout.length} launch targets`;
}

export async function warmBridge(): Promise<string> {
  const ok = typeof (window as unknown as { chrome?: { webview?: unknown } }).chrome?.webview !== 'undefined';
  await Promise.resolve();
  return ok ? 'Bridge linked' : 'Bridge console fallback';
}

export async function warmRevealSurface(): Promise<string> {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--fusion-boot-ready', '1');
  }
  await nextPaint();
  return 'Desktop surface ready';
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Decode the lucide glyph set + ensure boot CSS is laid out (prevents first-paint
// flicker). Resolves quickly; purely a warm-up.
export async function warmTheme(): Promise<void> {
  // force a style/layout flush so glass blur + gradients are compiled early
  if (typeof document !== 'undefined') {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;backdrop-filter:blur(8px);background:linear-gradient(#000,#111);';
    document.body.appendChild(probe);
    void probe.getBoundingClientRect();
    document.body.removeChild(probe);
  }
  await Promise.resolve();
}

// Optional, non-blocking NASA APOD warm-up (DNS/cache). Times out gracefully.
export async function warmApod(signal: AbortSignal): Promise<unknown> {
  const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true', { signal });
  if (!res.ok) throw new Error('apod http ' + res.status);
  return res.json();
}
