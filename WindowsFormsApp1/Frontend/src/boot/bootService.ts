import { fusionRuntimeCache } from './runtimeCache';
import {
  buildAppRegistry,
  buildCosmicSummary,
  buildGestureConfig,
  buildPianoManifest,
  detectPerformance,
  generateStarfield,
  preloadCommonApps,
  warmApod,
  warmBridge,
  warmGlassKernel,
  warmRevealSurface,
  warmShellLayout,
  warmTheme
} from './bootData';

export type BootPhase = 'firmware' | 'kernel' | 'shell' | 'gesture' | 'cosmic' | 'runtime' | 'reveal';

export interface BootTask {
  id: string;
  label: string;
  phase: BootPhase;
  weight: number;
  timeoutMs: number;
  optional?: boolean;
  run: () => Promise<string | void>;
}

export interface BootModuleStatus {
  id: string;
  label: string;
  phase: BootPhase;
  detail: string;
  state: 'pending' | 'running' | 'ok' | 'fallback';
}

export interface BootSnapshot {
  phase: BootPhase;
  phaseLabel: string;
  taskLabel: string;
  progress: number;
  modules: BootModuleStatus[];
  done: boolean;
}

export interface RunBootOptions {
  onUpdate: (snap: BootSnapshot) => void;
  shouldSkip?: () => boolean;
}

export const PHASE_LABELS: Record<BootPhase, string> = {
  firmware: 'Firmware Wake',
  kernel: 'Liquid Glass Kernel',
  shell: 'Spatial Shell Assembly',
  gesture: 'Gesture Layer Calibration',
  cosmic: 'Cosmic Database Warm-up',
  runtime: 'Runtime Warm-up',
  reveal: 'Reveal Desktop'
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

function buildTasks(): BootTask[] {
  return [
    { id: 'core', label: 'React surface wake', phase: 'firmware', weight: 1, timeoutMs: 4000, run: async () => { await warmTheme(); return 'React surface mounted'; } },
    { id: 'kernel', label: 'Glass material warm-up', phase: 'kernel', weight: 1, timeoutMs: 4000, run: warmGlassKernel },
    { id: 'perf', label: 'Performance profile scan', phase: 'kernel', weight: 1, timeoutMs: 3000, run: async () => { fusionRuntimeCache.performanceProfile = detectPerformance(); return `Profile ${fusionRuntimeCache.performanceProfile.tier.toUpperCase()}`; } },
    { id: 'registry', label: 'App registry indexing', phase: 'shell', weight: 2, timeoutMs: 4000, run: async () => { fusionRuntimeCache.appRegistry = buildAppRegistry(); return `Registry ${fusionRuntimeCache.appRegistry.apps.length} apps`; } },
    { id: 'shell', label: 'Spatial layout precompute', phase: 'shell', weight: 1, timeoutMs: 4000, run: warmShellLayout },
    { id: 'gesture', label: 'Gesture state gate', phase: 'gesture', weight: 1, timeoutMs: 4000, run: async () => { fusionRuntimeCache.gestureConfig = buildGestureConfig(); return 'Safe gesture gate armed'; } },
    {
      id: 'starfield',
      label: 'Starfield node generation',
      phase: 'cosmic',
      weight: 3,
      timeoutMs: 8000,
      run: async () => {
        const tier = fusionRuntimeCache.performanceProfile?.tier ?? 'medium';
        const count = tier === 'high' ? 4200 : tier === 'medium' ? 2400 : 900;
        fusionRuntimeCache.starfield = generateStarfield(count);
        fusionRuntimeCache.nebulaSeed = Math.floor(Math.random() * 1e9);
        return `Generated ${count} nodes`;
      }
    },
    {
      id: 'catalog',
      label: 'Cosmic catalog index',
      phase: 'cosmic',
      weight: 2,
      timeoutMs: 4000,
      run: async () => {
        const n = fusionRuntimeCache.starfield?.length ?? 0;
        fusionRuntimeCache.cosmicSummary = buildCosmicSummary(n);
        return `Indexed ${fusionRuntimeCache.cosmicSummary.total} objects`;
      }
    },
    { id: 'piano', label: 'Piano engine manifest', phase: 'runtime', weight: 1, timeoutMs: 4000, run: async () => { fusionRuntimeCache.pianoManifest = buildPianoManifest(); return `${fusionRuntimeCache.pianoManifest.keys}-key mapping`; } },
    { id: 'preload-apps', label: 'App metadata preload', phase: 'runtime', weight: 1, timeoutMs: 3000, run: preloadCommonApps },
    { id: 'bridge', label: 'WebView bridge handshake', phase: 'runtime', weight: 1, timeoutMs: 3000, run: warmBridge },
    {
      id: 'apod',
      label: 'NASA image cache probe',
      phase: 'runtime',
      weight: 1,
      timeoutMs: 1200,
      optional: true,
      run: async () => {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 1000);
        try {
          fusionRuntimeCache.apod = await warmApod(ctrl.signal);
          return 'NASA APOD cached';
        } finally {
          window.clearTimeout(t);
        }
      }
    },
    { id: 'reveal', label: 'Desktop surface reveal', phase: 'reveal', weight: 1, timeoutMs: 3000, run: warmRevealSurface }
  ];
}

export async function runBoot(opts: RunBootOptions): Promise<void> {
  const tasks = buildTasks();
  const totalWeight = tasks.reduce((a, t) => a + t.weight, 0);
  const modules: BootModuleStatus[] = tasks.map((t) => ({ id: t.id, label: t.label, phase: t.phase, detail: '', state: 'pending' }));
  const diag: { id: string; ok: boolean; ms: number; optional: boolean; error?: string }[] = [];
  const startedAt = performance.now();
  let doneWeight = 0;

  const emit = (taskLabel: string, phase: BootPhase) => {
    opts.onUpdate({
      phase,
      phaseLabel: PHASE_LABELS[phase],
      taskLabel,
      progress: Math.min(0.99, doneWeight / totalWeight),
      modules: modules.map((m) => ({ ...m })),
      done: false
    });
  };

  for (let i = 0; i < tasks.length; i += 1) {
    if (opts.shouldSkip?.()) break;

    const task = tasks[i];
    const mod = modules[i];
    mod.state = 'running';
    emit(task.label, task.phase);

    const tStart = performance.now();
    try {
      const detail = await withTimeout(task.run(), task.timeoutMs);
      mod.detail = detail || 'Ready';
      mod.state = 'ok';
      diag.push({ id: task.id, ok: true, ms: Math.round(performance.now() - tStart), optional: !!task.optional });
    } catch (e) {
      mod.detail = task.optional ? 'Skipped (timeout/offline)' : 'Fallback';
      mod.state = 'fallback';
      diag.push({ id: task.id, ok: false, ms: Math.round(performance.now() - tStart), optional: !!task.optional, error: e instanceof Error ? e.message : String(e) });
    }

    doneWeight += task.weight;
    emit(task.label, task.phase);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }

  fusionRuntimeCache.bootDiagnostics = { durationMs: Math.round(performance.now() - startedAt), tasks: diag };
  fusionRuntimeCache.bootCompleted = true;

  opts.onUpdate({
    phase: 'reveal',
    phaseLabel: PHASE_LABELS.reveal,
    taskLabel: 'FusionOS Ready',
    progress: 1,
    modules: modules.map((m) => ({ ...m })),
    done: true
  });
}
