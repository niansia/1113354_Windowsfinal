import { fusionRuntimeCache } from './runtimeCache';
import { warmGestureModel } from './gestureWarmup';
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
    // NOTE: the heavy MediaPipe hand-model download+compile (~24MB WASM) is NOT run as a
    // blocking boot step any more — compiling WASM on the main thread stutters the boot
    // animation. It is scheduled as a background idle warm-up *after* the desktop reveals
    // (see runBoot), so the boot stays perfectly smooth while the engine still pre-warms.
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
        fusionRuntimeCache.apod = await warmApod();
        return 'APOD fallback ready';
      }
    },
    { id: 'reveal', label: 'Desktop surface reveal', phase: 'reveal', weight: 1, timeoutMs: 3000, run: warmRevealSurface }
  ];
}

// Like a real OS, the boot dwells for a readable minimum while it genuinely
// pre-warms subsystems. Progress is *time-gated* and smoothed so the bar eases up
// instead of snapping per task; it can never run ahead of either the real work or
// the minimum duration.
const MIN_BOOT_MS = 6200;

function scheduleIdle(fn: () => void): void {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (typeof ric === 'function') ric(fn, { timeout: 2500 });
  else window.setTimeout(fn, 800);
}

export async function runBoot(opts: RunBootOptions): Promise<void> {
  const tasks = buildTasks();
  const totalWeight = tasks.reduce((a, t) => a + t.weight, 0);
  const modules: BootModuleStatus[] = tasks.map((t) => ({ id: t.id, label: t.label, phase: t.phase, detail: '', state: 'pending' }));
  const diag: { id: string; ok: boolean; ms: number; optional: boolean; error?: string }[] = [];
  const startedAt = performance.now();

  let doneWeight = 0;
  let tasksDone = false;
  let skipped = false;
  let currentLabel = tasks[0]?.label ?? 'FusionOS';
  let currentPhase: BootPhase = tasks[0]?.phase ?? 'firmware';

  // Run the real warm-up tasks sequentially in the background. The smooth emit
  // loop below reads the shared progress/labels — it is never blocked waiting on
  // a single task, so a slow async warm cannot freeze the animation.
  const runner = (async () => {
    for (let i = 0; i < tasks.length; i += 1) {
      if (opts.shouldSkip?.()) { skipped = true; break; }
      const task = tasks[i];
      const mod = modules[i];
      mod.state = 'running';
      currentLabel = task.label;
      currentPhase = task.phase;
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
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    tasksDone = true;
  })();

  // Smooth, time-gated progress driven by rAF (decoupled from task timing).
  let displayed = 0;
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const timeFrac = skipped ? 1 : Math.min(1, elapsed / MIN_BOOT_MS);
      const taskFrac = skipped ? 1 : tasksDone ? 1 : Math.min(0.985, doneWeight / totalWeight);
      const target = Math.min(taskFrac, timeFrac);
      displayed += (target - displayed) * (skipped ? 0.22 : 0.1);
      const finished = skipped
        ? displayed > 0.99
        : tasksDone && elapsed >= MIN_BOOT_MS && displayed > 0.985;
      const phase = finished ? 'reveal' : currentPhase;
      opts.onUpdate({
        phase,
        phaseLabel: PHASE_LABELS[phase],
        taskLabel: finished ? 'FusionOS Ready' : currentLabel,
        progress: finished ? 1 : Math.min(0.995, displayed),
        modules: modules.map((m) => ({ ...m })),
        done: false
      });
      if (finished) { resolve(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await runner.catch(() => undefined);

  fusionRuntimeCache.bootDiagnostics = { durationMs: Math.round(performance.now() - startedAt), tasks: diag };
  fusionRuntimeCache.bootCompleted = true;

  // Heavy MediaPipe hand-model warm-up runs AFTER reveal, on idle time, so it
  // never stutters the boot or the first desktop frames. Still pre-warms the
  // engine so the first real gesture is responsive.
  scheduleIdle(() => { warmGestureModel().catch(() => undefined); });

  opts.onUpdate({
    phase: 'reveal',
    phaseLabel: PHASE_LABELS.reveal,
    taskLabel: 'FusionOS Ready',
    progress: 1,
    modules: modules.map((m) => ({ ...m })),
    done: true
  });
}
