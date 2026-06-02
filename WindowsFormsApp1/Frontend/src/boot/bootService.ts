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
  warmTheme
} from './bootData';

export type BootPhase = 'firmware' | 'kernel' | 'shell' | 'gesture' | 'cosmic' | 'runtime' | 'reveal';

export interface BootTask {
  id: string;
  label: string;
  phase: BootPhase;
  weight: number;
  minMs: number; // ritual pacing floor (overlaps real work)
  timeoutMs: number;
  optional?: boolean;
  run: () => Promise<string | void>; // returns a short detail string for the HUD
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
  progress: number; // 0..1
  modules: BootModuleStatus[];
  done: boolean;
}

export interface RunBootOptions {
  fast: boolean; // skip ritual pacing (Skip / fusionSkipBoot)
  paceScale: number; // 1 = full, <1 shortens (reduced motion / low perf / replay)
  onUpdate: (snap: BootSnapshot) => void;
  shouldSkip?: () => boolean; // live skip (Skip button / Esc) — shortens pacing now
}

export const PHASE_LABELS: Record<BootPhase, string> = {
  firmware: '韌體喚醒 · Firmware Wake',
  kernel: '液態玻璃核心 · Liquid Glass Kernel',
  shell: '空間外殼組裝 · Spatial Shell Assembly',
  gesture: '手勢層校準 · Gesture Layer Calibration',
  cosmic: '宇宙資料庫預熱 · Cosmic Database Warm-up',
  runtime: 'App 執行環境預熱 · Runtime Warm-up',
  reveal: '展開桌面 · Reveal Desktop'
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Ritual pacing delay that resolves early when the user requests skip.
function pacedDelay(ms: number, opts: RunBootOptions): Promise<void> {
  if (opts.fast || ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = () => {
      if ((opts.shouldSkip && opts.shouldSkip()) || performance.now() - start >= ms) resolve();
      else window.setTimeout(tick, 50);
    };
    tick();
  });
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
}

function buildTasks(): BootTask[] {
  return [
    { id: 'core', label: 'FusionOS 核心喚醒', phase: 'firmware', weight: 1, minMs: 600, timeoutMs: 4000, run: async () => { await warmTheme(); return 'React surface mounted'; } },
    { id: 'kernel', label: '液態玻璃材質編譯', phase: 'kernel', weight: 1, minMs: 1200, timeoutMs: 4000, run: async () => { await delay(60); return 'Glass material compiled'; } },
    { id: 'perf', label: '效能設定檔偵測', phase: 'kernel', weight: 1, minMs: 500, timeoutMs: 3000, run: async () => { fusionRuntimeCache.performanceProfile = detectPerformance(); return `Profile ${fusionRuntimeCache.performanceProfile.tier.toUpperCase()}`; } },
    { id: 'registry', label: '建立 App 登錄與索引', phase: 'shell', weight: 2, minMs: 900, timeoutMs: 4000, run: async () => { fusionRuntimeCache.appRegistry = buildAppRegistry(); return `Registry ${fusionRuntimeCache.appRegistry.apps.length} apps`; } },
    { id: 'shell', label: '空間桌面佈局計算', phase: 'shell', weight: 1, minMs: 700, timeoutMs: 4000, run: async () => { await delay(40); return 'Carousel layout ready'; } },
    { id: 'gesture', label: '手勢狀態機 / 安全閘建立', phase: 'gesture', weight: 1, minMs: 900, timeoutMs: 4000, run: async () => { fusionRuntimeCache.gestureConfig = buildGestureConfig(); return 'Safe gesture gate armed'; } },
    { id: 'starfield', label: '星場節點生成', phase: 'cosmic', weight: 3, minMs: 1500, timeoutMs: 8000, run: async () => {
        const tier = fusionRuntimeCache.performanceProfile?.tier ?? 'medium';
        const count = tier === 'high' ? 4200 : tier === 'medium' ? 2400 : 900;
        fusionRuntimeCache.starfield = generateStarfield(count);
        fusionRuntimeCache.nebulaSeed = Math.floor(Math.random() * 1e9);
        return `Generated ${count} nodes`;
      } },
    { id: 'catalog', label: '宇宙天體目錄索引', phase: 'cosmic', weight: 2, minMs: 900, timeoutMs: 4000, run: async () => {
        const n = fusionRuntimeCache.starfield?.length ?? 0;
        fusionRuntimeCache.cosmicSummary = buildCosmicSummary(n);
        return `Indexed ${fusionRuntimeCache.cosmicSummary.total} objects`;
      } },
    { id: 'piano', label: '鋼琴引擎預備', phase: 'runtime', weight: 1, minMs: 900, timeoutMs: 4000, run: async () => { fusionRuntimeCache.pianoManifest = buildPianoManifest(); return `${fusionRuntimeCache.pianoManifest.keys}-key mapping`; } },
    { id: 'preload-apps', label: '預載常用 App metadata', phase: 'runtime', weight: 1, minMs: 240, timeoutMs: 3000, run: preloadCommonApps },
    { id: 'bridge', label: 'WebView 橋接與快捷鍵', phase: 'runtime', weight: 1, minMs: 600, timeoutMs: 3000, run: async () => { const ok = typeof (window as unknown as { chrome?: { webview?: unknown } }).chrome?.webview !== 'undefined'; return ok ? 'Bridge linked' : 'Bridge (console fallback)'; } },
    { id: 'apod', label: 'NASA 影像背景預熱', phase: 'runtime', weight: 1, minMs: 140, timeoutMs: 1200, optional: true, run: async () => {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 1000);
        try { fusionRuntimeCache.apod = await warmApod(ctrl.signal); return 'NASA APOD cached'; }
        finally { window.clearTimeout(t); }
      } },
    { id: 'reveal', label: '展開 FusionOS 桌面', phase: 'reveal', weight: 1, minMs: 900, timeoutMs: 3000, run: async () => { await delay(60); return 'Desktop ready'; } }
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
    const task = tasks[i];
    const mod = modules[i];
    mod.state = 'running';
    emit(task.label, task.phase);

    const tStart = performance.now();
    const pace = pacedDelay(task.minMs * opts.paceScale, opts);
    try {
      const [detail] = await Promise.all([withTimeout(task.run(), task.timeoutMs), pace]);
      mod.detail = (detail as string) || 'Ready';
      mod.state = 'ok';
      diag.push({ id: task.id, ok: true, ms: Math.round(performance.now() - tStart), optional: !!task.optional });
    } catch (e) {
      // optional or not, never block the boot — fall back gracefully.
      await pace.catch(() => {});
      mod.detail = task.optional ? '略過 (timeout/offline)' : 'fallback';
      mod.state = 'fallback';
      diag.push({ id: task.id, ok: false, ms: Math.round(performance.now() - tStart), optional: !!task.optional, error: e instanceof Error ? e.message : String(e) });
    }
    doneWeight += task.weight;
    emit(task.label, task.phase);
    // yield a frame so the UI paints smoothly
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
