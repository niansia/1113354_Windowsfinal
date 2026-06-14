import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Binary,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  FastForward,
  Gauge,
  GitBranch,
  Layers3,
  ListEnd,
  ListTree,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sigma,
  Spline,
  TableProperties,
  Trash2,
  TreeDeciduous,
  Waypoints,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DEV_GROUPS,
  DEV_MODULES,
  getDevModule
} from '../devlab/developmentLabCatalog';
import type { DevGroup, DevModuleId } from '../devlab/developmentLabCatalog';
import {
  benchmarkSortAlgorithms,
  createDatasetPreset,
  parseNumberList,
  runSearchTrace,
  runSortTrace
} from '../devlab/devlabSort';
import type { DatasetPreset, SearchAlgorithmId, SortAlgorithmId, SortBenchmark } from '../devlab/devlabSort';
import {
  buildBst,
  buildTreeScene,
  heapOperation,
  heapScene,
  treeOperation
} from '../devlab/devlabTrees';
import type { HeapMode, TreeKind, TreeNode } from '../devlab/devlabTrees';
import { parseGraph, runGraphTrace } from '../devlab/devlabGraph';
import type { GraphAlgorithmId } from '../devlab/devlabGraph';
import { DP_DEFAULT_INPUT, runDpTrace } from '../devlab/devlabDP';
import type { DpAlgorithmId } from '../devlab/devlabDP';
import type {
  ArrayScene,
  DevTrace,
  GraphScene,
  MatrixScene,
  Phase,
  Scene,
  TreeScene
} from '../devlab/devlabScene';
import { useI18n } from '../i18n/I18nContext';
import { formatFusionDate, formatFusionTime } from '../i18n/localeFormatting';
import { useSettings } from '../state/SettingsContext';

interface FusionDevelopmentLabProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

const MODULE_ICONS: Record<DevModuleId, LucideIcon> = {
  stack: Layers3,
  queue: ListEnd,
  'linked-list': ListTree,
  bst: GitBranch,
  avl: TreeDeciduous,
  'red-black': TreeDeciduous,
  heap: Layers3,
  'bubble-sort': Sigma,
  'insertion-sort': Sigma,
  'selection-sort': Sigma,
  'shell-sort': Sigma,
  'quick-sort': Shuffle,
  'merge-sort': Spline,
  'heap-sort': Layers3,
  'linear-search': Search,
  'binary-search': Binary,
  bfs: Network,
  dfs: Waypoints,
  dijkstra: Waypoints,
  prim: Network,
  kruskal: Network,
  topological: Waypoints,
  fibonacci: TableProperties,
  'coin-change': TableProperties,
  knapsack: TableProperties,
  lcs: TableProperties,
  'edit-distance': TableProperties
};

const GROUP_ICONS: Record<DevGroup, LucideIcon> = {
  linear: ListEnd,
  trees: GitBranch,
  sorting: Sigma,
  searching: Search,
  graph: Network,
  dp: TableProperties
};

const SPEED_OPTIONS = [
  { label: '0.5x', value: 1100 },
  { label: '1x', value: 620 },
  { label: '2x', value: 280 },
  { label: '4x', value: 130 }
];

const PRESET_LABELS: Record<DatasetPreset, string> = {
  random: '隨機',
  'nearly-sorted': '近乎排序',
  reversed: '反向排序',
  duplicates: '重複值'
};

const PHASE_LABELS: Record<Phase, string> = {
  ready: '準備',
  compare: '比較',
  write: '寫入',
  pivot: '樞紐',
  visit: '走訪中',
  rotate: '旋轉',
  relax: '鬆弛',
  fill: '填表',
  backtrack: '回溯',
  complete: '完成'
};

const PHASE_COLOR: Record<Phase, string> = {
  ready: '#67e8ff',
  compare: '#ffd166',
  write: '#ff79c6',
  pivot: '#a78bfa',
  visit: '#5eead4',
  rotate: '#fb923c',
  relax: '#60a5fa',
  fill: '#c4b5fd',
  backtrack: '#f472b6',
  complete: '#67f5b5'
};

const DEFAULT_DATA = '8, 3, 6, 1, 7, 2, 5, 4';
const DEFAULT_TREE = [50, 30, 70, 20, 40, 60, 80, 10, 25];
const DEFAULT_HEAP = [10, 22, 18, 35, 40, 27, 33];

const GRAPH_SAMPLES: Record<string, { edges: string; start: string }> = {
  bfs: { edges: 'A-B, A-C, B-D, B-E, C-F, E-G', start: 'A' },
  dfs: { edges: 'A-B, A-C, B-D, B-E, C-F, E-G', start: 'A' },
  dijkstra: { edges: 'A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3', start: 'A' },
  prim: { edges: 'A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3', start: 'A' },
  kruskal: { edges: 'A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3', start: 'A' },
  topological: { edges: 'A>B, A>C, B>D, C>D, C>F, D>E, E>F', start: 'A' }
};

const STATE_CLASS: Record<string, string> = {
  idle: '',
  active: 'is-active',
  compare: 'is-compare',
  swap: 'is-swap',
  settled: 'is-settled',
  pivot: 'is-pivot',
  frontier: 'is-frontier',
  visited: 'is-visited',
  path: 'is-path',
  min: 'is-min',
  excluded: 'is-excluded',
  insert: 'is-insert',
  remove: 'is-remove',
  rotate: 'is-rotate',
  relax: 'is-relax',
  highlight: 'is-highlight'
};

const LEGEND: Array<{ state: string; label: string }> = [
  { state: 'active', label: '走訪中' },
  { state: 'compare', label: '比較' },
  { state: 'swap', label: '寫入' },
  { state: 'path', label: '路徑' },
  { state: 'settled', label: '完成' }
];

interface ActivityEntry {
  key: string;
  args?: Array<string | number>;
}

const valueFromInput = (input: string) => {
  const value = Number(input);
  if (!Number.isFinite(value)) throw new Error('請輸入有效的操作數值。');
  return value;
};

export function FusionDevelopmentLab({ open, onClose, accent }: FusionDevelopmentLabProps) {
  const { lang, t, tf } = useI18n();
  const { settings } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const animate = settings.animations && !prefersReducedMotion;

  const [selectedModule, setSelectedModule] = useState<DevModuleId>('bst');
  const [structures, setStructures] = useState<Record<'stack' | 'queue' | 'linked-list', number[]>>({
    stack: [12, 24, 36],
    queue: [11, 22, 33, 44],
    'linked-list': [7, 14, 21, 28]
  });
  const [activeIndex, setActiveIndex] = useState<number | undefined>();
  const [bstRoot, setBstRoot] = useState<TreeNode | null>(() => buildBst(DEFAULT_TREE));
  const [avlRoot, setAvlRoot] = useState<TreeNode | null>(null);
  const [rbRoot, setRbRoot] = useState<TreeNode | null>(null);
  const [heapArray, setHeapArray] = useState<number[]>(DEFAULT_HEAP);
  const [heapMode, setHeapMode] = useState<HeapMode>('min');

  const [operationInput, setOperationInput] = useState('45');
  const [dataInput, setDataInput] = useState(DEFAULT_DATA);
  const [targetInput, setTargetInput] = useState('7');
  const [graphInput, setGraphInput] = useState(GRAPH_SAMPLES.bfs.edges);
  const [startNode, setStartNode] = useState('A');
  const [dpInput, setDpInput] = useState(DP_DEFAULT_INPUT.fibonacci);
  const [datasetPreset, setDatasetPreset] = useState<DatasetPreset>('random');
  const [datasetSize, setDatasetSize] = useState(10);

  const [trace, setTrace] = useState<DevTrace | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(620);
  const [error, setError] = useState('');
  const [benchmarks, setBenchmarks] = useState<SortBenchmark[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [activity, setActivity] = useState<ActivityEntry[]>([
    { key: '開發實驗室已就緒。' },
    { key: '選擇模組、調整範例，再執行一項操作。' }
  ]);

  const module = getDevModule(selectedModule);
  const kind = module.kind;
  const isTrace = kind === 'sort' || kind === 'search' || kind === 'graph' || kind === 'dp';
  const currentFrame = trace?.frames[frameIndex] ?? null;
  const phase: Phase = currentFrame?.phase ?? 'ready';
  const progress = trace && trace.frames.length > 1 ? (frameIndex / (trace.frames.length - 1)) * 100 : 0;

  const appendActivity = useCallback((key: string, args: Array<string | number> = []) => {
    setActivity((items) => [{ key, args }, ...items].slice(0, 8));
  }, []);

  const renderMessage = useCallback(
    (m: { key: string; args?: Array<string | number> } | null | undefined) =>
      m ? tf(m.key, ...(m.args ?? [])) : '',
    [tf]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = ['input', 'textarea', 'select'].includes(target?.tagName.toLowerCase() ?? '');
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (!typing && event.code === 'Space' && trace) {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (!typing && event.key === 'ArrowLeft' && trace) {
        event.preventDefault();
        setPlaying(false);
        setFrameIndex((index) => Math.max(0, index - 1));
      } else if (!typing && event.key === 'ArrowRight' && trace) {
        event.preventDefault();
        setPlaying(false);
        setFrameIndex((index) => Math.min(trace.frames.length - 1, index + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, trace]);

  useEffect(() => {
    if (!playing || !trace) return;
    if (frameIndex >= trace.frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setFrameIndex((index) => index + 1), speed);
    return () => window.clearTimeout(timer);
  }, [frameIndex, playing, speed, trace]);

  const resetPlayback = () => {
    setTrace(null);
    setFrameIndex(0);
    setPlaying(false);
  };

  const selectModule = (id: DevModuleId) => {
    setSelectedModule(id);
    resetPlayback();
    setBenchmarks(null);
    setActiveIndex(undefined);
    setError('');
    const next = getDevModule(id);
    if (next.kind === 'graph') {
      const sample = GRAPH_SAMPLES[id] ?? GRAPH_SAMPLES.bfs;
      setGraphInput(sample.edges);
      setStartNode(sample.start);
    } else if (next.kind === 'dp') {
      setDpInput(DP_DEFAULT_INPUT[id as DpAlgorithmId] ?? '');
    } else if (next.kind === 'search') {
      setDataInput(id === 'binary-search' ? '2, 5, 8, 12, 16, 23, 38, 56' : DEFAULT_DATA);
      setTargetInput('23');
    } else if (next.kind === 'sort') {
      setDataInput(DEFAULT_DATA);
    }
    appendActivity('開啟「{0}」。', [next.label]);
  };

  const handleReason = (reason: unknown, fallback: string) => {
    const message = reason instanceof Error ? reason.message : fallback;
    setError(t(message));
  };

  // ---- Linear structure operations ----
  const linearAction = (
    action: 'push' | 'pop' | 'peek' | 'enqueue' | 'dequeue' | 'front' | 'append' | 'prepend' | 'remove' | 'find'
  ) => {
    if (kind !== 'linear') return;
    const list = structures[selectedModule as 'stack' | 'queue' | 'linked-list'];
    try {
      let next = [...list];
      let highlight: number | undefined;
      if (action === 'push' || action === 'enqueue' || action === 'append') {
        next.push(valueFromInput(operationInput));
        highlight = next.length - 1;
      } else if (action === 'prepend') {
        next.unshift(valueFromInput(operationInput));
        highlight = 0;
      } else if (action === 'pop') {
        if (!next.length) throw new Error('堆疊目前是空的。');
        next.pop();
      } else if (action === 'dequeue') {
        if (!next.length) throw new Error('佇列目前是空的。');
        next.shift();
      } else if (action === 'peek') {
        highlight = next.length - 1;
      } else if (action === 'front') {
        highlight = 0;
      } else if (action === 'remove') {
        const idx = next.indexOf(valueFromInput(operationInput));
        if (idx < 0) throw new Error('找不到該節點。');
        next.splice(idx, 1);
      } else if (action === 'find') {
        highlight = next.indexOf(valueFromInput(operationInput));
        if (highlight < 0) highlight = undefined;
      }
      setStructures((items) => ({ ...items, [selectedModule]: next }));
      setActiveIndex(highlight);
      setError('');
    } catch (reason) {
      handleReason(reason, '操作失敗。');
    }
  };

  // ---- Tree operations ----
  const runTreeOp = (operation: 'insert' | 'search' | 'remove') => {
    try {
      const value = valueFromInput(operationInput);
      const treeKind = selectedModule as TreeKind;
      const root = treeKind === 'avl' ? avlRoot : treeKind === 'red-black' ? rbRoot : bstRoot;
      const result = treeOperation(treeKind, root, operation, value);
      if (treeKind === 'avl') setAvlRoot(result.root);
      else if (treeKind === 'red-black') setRbRoot(result.root);
      else setBstRoot(result.root);
      setTrace(result.trace);
      setFrameIndex(0);
      setPlaying(result.trace.frames.length > 1);
      setError('');
      appendActivity('已為「{0}」產生 {1} 個動畫影格。', [module.label, result.trace.frames.length]);
    } catch (reason) {
      setPlaying(false);
      handleReason(reason, '操作失敗。');
    }
  };

  const runHeapOp = (operation: 'insert' | 'extract' | 'peek') => {
    try {
      const result = heapOperation(heapMode, heapArray, operation, operation === 'insert' ? valueFromInput(operationInput) : undefined);
      setHeapArray(result.array);
      setTrace(result.trace);
      setFrameIndex(0);
      setPlaying(result.trace.frames.length > 1);
      setError('');
      appendActivity('已為「{0}」產生 {1} 個動畫影格。', [module.label, result.trace.frames.length]);
    } catch (reason) {
      setPlaying(false);
      handleReason(reason, '操作失敗。');
    }
  };

  // ---- Trace-based algorithms ----
  const buildTrace = () => {
    try {
      let next: DevTrace;
      if (kind === 'sort') next = runSortTrace(selectedModule as SortAlgorithmId, parseNumberList(dataInput));
      else if (kind === 'search') next = runSearchTrace(selectedModule as SearchAlgorithmId, parseNumberList(dataInput), valueFromInput(targetInput));
      else if (kind === 'graph') next = runGraphTrace(selectedModule as GraphAlgorithmId, parseGraph(graphInput), startNode.trim());
      else if (kind === 'dp') next = runDpTrace(selectedModule as DpAlgorithmId, dpInput);
      else return;
      setTrace(next);
      setFrameIndex(0);
      setPlaying(next.frames.length > 1);
      setError('');
      appendActivity('已為「{0}」產生 {1} 個動畫影格。', [module.label, next.frames.length]);
    } catch (reason) {
      setPlaying(false);
      handleReason(reason, '無法產生此動畫。');
    }
  };

  const generateDataset = () => {
    const values = createDatasetPreset(datasetPreset, datasetSize);
    setDataInput(values.join(', '));
    resetPlayback();
    setBenchmarks(null);
    setError('');
    appendActivity('已產生 {0} 筆「{1}」資料。', [values.length, PRESET_LABELS[datasetPreset]]);
  };

  const runBenchmark = () => {
    try {
      setBenchmarks(benchmarkSortAlgorithms(parseNumberList(dataInput)));
      setError('');
      appendActivity('已完成排序效能比較。');
    } catch (reason) {
      handleReason(reason, '無法產生此動畫。');
    }
  };

  const loadSample = () => {
    if (kind === 'graph') {
      const sample = GRAPH_SAMPLES[selectedModule] ?? GRAPH_SAMPLES.bfs;
      setGraphInput(sample.edges);
      setStartNode(sample.start);
    } else if (kind === 'dp') {
      setDpInput(DP_DEFAULT_INPUT[selectedModule as DpAlgorithmId] ?? '');
    } else if (kind === 'search') {
      setDataInput(selectedModule === 'binary-search' ? '2, 5, 8, 12, 16, 23, 38, 56' : DEFAULT_DATA);
      setTargetInput('23');
    } else if (kind === 'sort') {
      setDataInput(DEFAULT_DATA);
    } else if (kind === 'tree') {
      if (selectedModule === 'bst') setBstRoot(buildBst(DEFAULT_TREE));
      else if (selectedModule === 'avl') setAvlRoot(null);
      else setRbRoot(null);
    } else if (kind === 'heap') {
      setHeapArray(DEFAULT_HEAP);
    }
    resetPlayback();
    setBenchmarks(null);
    setError('');
    appendActivity('已載入「{0}」的引導範例。', [module.label]);
  };

  const resetModule = () => {
    if (kind === 'linear') {
      const defaults: Record<string, number[]> = { stack: [12, 24, 36], queue: [11, 22, 33, 44], 'linked-list': [7, 14, 21, 28] };
      setStructures((items) => ({ ...items, [selectedModule]: [...defaults[selectedModule]] }));
      setActiveIndex(undefined);
    } else if (kind === 'tree') {
      if (selectedModule === 'bst') setBstRoot(buildBst(DEFAULT_TREE));
      else if (selectedModule === 'avl') setAvlRoot(null);
      else setRbRoot(null);
    } else if (kind === 'heap') {
      setHeapArray(DEFAULT_HEAP);
    }
    resetPlayback();
    setBenchmarks(null);
    setError('');
    appendActivity('已重設「{0}」。', [module.label]);
  };

  // ---- Live scene (when no trace) ----
  const liveScene = useMemo<Scene | null>(() => {
    if (kind === 'tree') {
      const treeKind = selectedModule as TreeKind;
      const root = treeKind === 'avl' ? avlRoot : treeKind === 'red-black' ? rbRoot : bstRoot;
      return buildTreeScene(root, treeKind, { showBalance: treeKind === 'avl' });
    }
    if (kind === 'heap') return heapScene(heapArray);
    return null;
  }, [kind, selectedModule, bstRoot, avlRoot, rbRoot, heapArray]);

  const displayScene: Scene | null = currentFrame?.scene ?? liveScene;

  if (!open) return null;

  const fastest = benchmarks ? Math.min(...benchmarks.map((row) => row.comparisons)) : 0;
  const phaseColor = PHASE_COLOR[phase];

  return (
    <motion.div
      className={`devlab-overlay ${animate ? '' : 'reduce-motion'}`}
      style={{ '--accent': accent } as CSSProperties}
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
    >
      <motion.section
        className="devlab-shell"
        role="dialog"
        aria-modal="true"
        aria-label={t('開發實驗室')}
        style={{ '--phase-color': phaseColor } as CSSProperties}
        initial={animate ? { opacity: 0, scale: 0.975, y: 18 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 25 }}
      >
        <header className="devlab-topbar">
          <div className="devlab-brand">
            <span className="devlab-brand-icon"><Code2 size={24} /></span>
            <div>
              <strong>{t('開發實驗室')}</strong>
              <span>{t('資料結構 × 演算法視覺化')}</span>
            </div>
          </div>

          <div className="devlab-system-clock">
            <Clock3 size={16} />
            <div>
              <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
              <span>{formatFusionDate(now, lang, settings.timezone)} · {t('系統同步')}</span>
            </div>
          </div>

          <div className="devlab-command-center">
            <button type="button" onClick={loadSample}><Database size={16} /> {t('範例')}</button>
            <button type="button" onClick={resetModule}><RotateCcw size={16} /> {t('重設')}</button>
            {kind === 'sort' && (
              <button type="button" className={benchmarks ? 'is-engaged' : ''} onClick={runBenchmark}>
                <Gauge size={16} /> {t('效能比較')}
              </button>
            )}
            {isTrace && (
              <>
                <label className="devlab-speed">
                  <FastForward size={15} />
                  <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label={t('播放速度')}>
                    {SPEED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <button type="button" className="primary" onClick={buildTrace}>
                  <Play size={16} fill="currentColor" /> {t('執行動畫')}
                </button>
              </>
            )}
          </div>

          <button type="button" className="devlab-close" onClick={onClose} aria-label={t('關閉開發實驗室')}>
            <X size={20} />
          </button>
        </header>

        <div className="devlab-body">
          <aside className="devlab-navigator">
            {DEV_GROUPS.map((group) => {
              const GroupIcon = GROUP_ICONS[group.id];
              return (
                <section key={group.id}>
                  <span className="devlab-nav-label"><GroupIcon size={12} /> {t(group.label)}</span>
                  {DEV_MODULES.filter((item) => item.group === group.id).map((item) => {
                    const Icon = MODULE_ICONS[item.id];
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={selectedModule === item.id ? 'is-active' : ''}
                        onClick={() => selectModule(item.id)}
                      >
                        <Icon size={17} />
                        <span><strong>{t(item.label)}</strong><small>{t(item.short)}</small></span>
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </aside>

          <main className="devlab-workspace">
            <div className="devlab-workspace-head">
              <div>
                <span>{t(DEV_GROUPS.find((g) => g.id === module.group)?.label ?? '')}</span>
                <h1>{t(module.label)}</h1>
                <p>{t(module.description)}</p>
              </div>
              <span className="devlab-ready-chip"><Code2 size={13} /> {t('互動模式')}</span>
            </div>

            <div className="devlab-input-strip">
              {renderInputs()}
              {error && <div className="devlab-error">{error}</div>}
            </div>

            <section className={`devlab-canvas phase-${phase}`}>
              <div className="devlab-canvas-aurora" aria-hidden="true" />
              <div className="devlab-canvas-grid" aria-hidden="true" />
              <div className="devlab-stage-copy">
                <span>
                  {isTrace
                    ? `${t('影格')} ${trace ? frameIndex + 1 : 0} / ${trace?.frames.length ?? 0}`
                    : `${countLabel()}`}
                </span>
                <strong>{currentFrame ? renderMessage(currentFrame.message) : isTrace ? t('準備產生動畫') : t('操作資料結構以觀察其行為。')}</strong>
              </div>
              {currentFrame && (
                <div className="devlab-phase-chip">
                  <span>{t('目前步驟')}</span>
                  <strong>{t(PHASE_LABELS[phase])}</strong>
                  <i style={{ '--progress': `${progress}%` } as CSSProperties} />
                </div>
              )}
              <div className="devlab-legend">
                {LEGEND.map((item) => (
                  <span key={item.state} className={STATE_CLASS[item.state]}><i />{t(item.label)}</span>
                ))}
              </div>
              <div className="devlab-visual-stage">{renderScene(displayScene)}</div>
            </section>

            {isTrace && (
              <section className="devlab-timeline">
                <div className="devlab-playback">
                  <button type="button" onClick={() => { setPlaying(false); setFrameIndex(0); }} disabled={!trace}><SkipBack size={17} /></button>
                  <button type="button" onClick={() => { setPlaying(false); setFrameIndex((index) => Math.max(0, index - 1)); }} disabled={!trace}><ChevronLeft size={18} /></button>
                  <button type="button" className="play" onClick={() => setPlaying((value) => !value)} disabled={!trace}>
                    {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <button type="button" onClick={() => { setPlaying(false); setFrameIndex((index) => Math.min((trace?.frames.length ?? 1) - 1, index + 1)); }} disabled={!trace}><ChevronRight size={18} /></button>
                  <button type="button" onClick={() => { setPlaying(false); setFrameIndex(Math.max(0, (trace?.frames.length ?? 1) - 1)); }} disabled={!trace}><SkipForward size={17} /></button>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, (trace?.frames.length ?? 1) - 1)}
                  value={frameIndex}
                  disabled={!trace}
                  onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }}
                  aria-label={t('動畫影格')}
                />
                <span>{trace ? `${frameIndex + 1} / ${trace.frames.length}` : t('尚未產生動畫')}</span>
              </section>
            )}
          </main>

          <aside className="devlab-inspector">
            <section>
              <div className="devlab-section-title"><Gauge size={17} /><strong>{t('複雜度')}</strong></div>
              <div className="devlab-complexity-grid">
                <span><small>{t('最佳')}</small><strong>{module.complexity.best}</strong></span>
                <span><small>{t('平均')}</small><strong>{module.complexity.average}</strong></span>
                <span><small>{t('最差')}</small><strong>{module.complexity.worst}</strong></span>
                <span><small>{t('空間')}</small><strong>{module.complexity.space}</strong></span>
              </div>
            </section>

            <section>
              <div className="devlab-section-title"><Code2 size={17} /><strong>{t('虛擬碼')}</strong></div>
              <ol className="devlab-code">
                {module.pseudocode.map((line, index) => (
                  <li key={line} className={currentFrame?.pseudoLine === index ? 'is-active' : ''}>
                    <span>{String(index + 1).padStart(2, '0')}</span><code>{t(line)}</code>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <div className="devlab-section-title"><Binary size={17} /><strong>{t('即時指標')}</strong></div>
              <div className="devlab-metrics">
                <span><strong>{currentFrame?.metrics.comparisons ?? 0}</strong><small>{t('比較次數')}</small></span>
                <span><strong>{currentFrame?.metrics.writes ?? 0}</strong><small>{t('寫入次數')}</small></span>
                <span><strong>{currentFrame?.metrics.visits ?? 0}</strong><small>{t('走訪次數')}</small></span>
              </div>
            </section>

            <AnimatePresence>
              {benchmarks && (
                <motion.section
                  className="devlab-benchmark"
                  initial={animate ? { opacity: 0, y: 14 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="devlab-section-title">
                    <Gauge size={17} />
                    <div><strong>{t('排序效能比較')}</strong><small>{t('比較目前資料集的實際操作量')}</small></div>
                    <button type="button" onClick={() => setBenchmarks(null)} aria-label={t('關閉比較')}><X size={14} /></button>
                  </div>
                  <div className="devlab-benchmark-head">
                    <span>{t('演算法名稱')}</span><span>{t('比較次數')}</span><span>{t('寫入次數')}</span><span>{t('影格數')}</span>
                  </div>
                  {benchmarks.map((row) => (
                    <div className={`devlab-benchmark-row ${row.comparisons === fastest ? 'is-best' : ''}`} key={row.algorithm}>
                      <strong>{t(getDevModule(row.algorithm).label)}</strong>
                      <span>{row.comparisons}</span>
                      <span>{row.writes}</span>
                      <span>{row.frames}</span>
                    </div>
                  ))}
                </motion.section>
              )}
            </AnimatePresence>

            <section className="devlab-activity">
              <div className="devlab-section-title"><Database size={17} /><strong>{t('活動紀錄')}</strong></div>
              <div>
                {activity.map((item, index) => (
                  <p key={`${item.key}-${index}`}><span>{String(activity.length - index).padStart(2, '0')}</span>{tf(item.key, ...(item.args ?? []).map((a) => (typeof a === 'string' ? t(a) : a)))}</p>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </motion.section>
    </motion.div>
  );

  function countLabel() {
    if (kind === 'linear') {
      const list = structures[selectedModule as 'stack' | 'queue' | 'linked-list'];
      return `${list.length} ${t('筆有效資料')}`;
    }
    if (kind === 'tree' || kind === 'heap') {
      const count = displayScene && displayScene.kind === 'tree' ? displayScene.nodes.length : 0;
      return `${count} ${t('個節點')}`;
    }
    return '';
  }

  function renderInputs() {
    if (kind === 'linear') {
      const actions: Record<string, Array<{ action: Parameters<typeof linearAction>[0]; label: string; icon: LucideIcon }>> = {
        stack: [
          { action: 'push', label: '推入', icon: Plus },
          { action: 'pop', label: '彈出', icon: Trash2 },
          { action: 'peek', label: '查看頂端', icon: Search }
        ],
        queue: [
          { action: 'enqueue', label: '入列', icon: Plus },
          { action: 'dequeue', label: '出列', icon: Trash2 },
          { action: 'front', label: '查看前端', icon: Search }
        ],
        'linked-list': [
          { action: 'append', label: '附加', icon: Plus },
          { action: 'prepend', label: '前置', icon: Plus },
          { action: 'remove', label: '移除', icon: Trash2 },
          { action: 'find', label: '尋找', icon: Search }
        ]
      };
      return (
        <>
          <label>
            <span>{t('操作數值')}</span>
            <input value={operationInput} onChange={(event) => setOperationInput(event.target.value)} inputMode="decimal" />
          </label>
          <div className="devlab-action-row">
            {actions[selectedModule].map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.action} onClick={() => linearAction(item.action)}><Icon size={15} /> {t(item.label)}</button>
              );
            })}
          </div>
        </>
      );
    }
    if (kind === 'tree') {
      return (
        <>
          <label>
            <span>{t('操作數值')}</span>
            <input value={operationInput} onChange={(event) => setOperationInput(event.target.value)} inputMode="decimal" />
          </label>
          <div className="devlab-action-row">
            <button type="button" onClick={() => runTreeOp('insert')}><Plus size={15} /> {t('插入')}</button>
            <button type="button" onClick={() => runTreeOp('search')}><Search size={15} /> {t('尋找')}</button>
            <button type="button" onClick={() => runTreeOp('remove')}><Trash2 size={15} /> {t('移除')}</button>
          </div>
        </>
      );
    }
    if (kind === 'heap') {
      return (
        <>
          <label>
            <span>{t('操作數值')}</span>
            <input value={operationInput} onChange={(event) => setOperationInput(event.target.value)} inputMode="decimal" />
          </label>
          <label className="short">
            <span>{t('堆積類型')}</span>
            <select value={heapMode} onChange={(event) => { setHeapMode(event.target.value as HeapMode); resetPlayback(); }}>
              <option value="min">{t('最小堆積')}</option>
              <option value="max">{t('最大堆積')}</option>
            </select>
          </label>
          <div className="devlab-action-row">
            <button type="button" onClick={() => runHeapOp('insert')}><Plus size={15} /> {t('插入')}</button>
            <button type="button" onClick={() => runHeapOp('extract')}><Trash2 size={15} /> {t('取出')}</button>
            <button type="button" onClick={() => runHeapOp('peek')}><Search size={15} /> {t('查看根節點')}</button>
          </div>
        </>
      );
    }
    if (kind === 'graph') {
      return (
        <>
          <label className="wide">
            <span>{t('圖形邊')}</span>
            <input value={graphInput} onChange={(event) => setGraphInput(event.target.value)} placeholder="A-B:4, A>C" />
          </label>
          {selectedModule !== 'kruskal' && selectedModule !== 'topological' && (
            <label className="short">
              <span>{t('起始節點')}</span>
              <input value={startNode} onChange={(event) => setStartNode(event.target.value)} />
            </label>
          )}
        </>
      );
    }
    if (kind === 'dp') {
      return (
        <label className="wide">
          <span>{t('參數')}</span>
          <input value={dpInput} onChange={(event) => setDpInput(event.target.value)} />
        </label>
      );
    }
    // sort / search
    return (
      <>
        <label className="wide">
          <span>{t('資料集')}</span>
          <input value={dataInput} onChange={(event) => setDataInput(event.target.value)} placeholder="8, 3, 6, 1" />
        </label>
        {kind === 'sort' && (
          <div className="devlab-dataset-tools">
            <label className="preset">
              <span>{t('資料分布')}</span>
              <select value={datasetPreset} onChange={(event) => setDatasetPreset(event.target.value as DatasetPreset)}>
                {Object.entries(PRESET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </label>
            <label className="size">
              <span>{t('資料筆數')}</span>
              <select value={datasetSize} onChange={(event) => setDatasetSize(Number(event.target.value))}>
                {[8, 10, 12, 16, 20].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" onClick={generateDataset}><Shuffle size={15} /> {t('產生資料')}</button>
          </div>
        )}
        {kind === 'search' && (
          <label className="short">
            <span>{t('目標值')}</span>
            <input value={targetInput} onChange={(event) => setTargetInput(event.target.value)} inputMode="decimal" />
          </label>
        )}
      </>
    );
  }

  function renderScene(scene: Scene | null) {
    if (!scene) {
      return (
        <div className="devlab-empty algorithm">
          <Code2 size={34} />
          <strong>{t('準備產生動畫')}</strong>
          <span>{t('編輯範例資料後，選擇「執行動畫」。')}</span>
        </div>
      );
    }
    if (scene.kind === 'array') {
      return kind === 'linear' ? renderLinear() : renderArray(scene);
    }
    if (scene.kind === 'tree') return renderTree(scene);
    if (scene.kind === 'graph') return renderGraph(scene);
    return renderMatrix(scene);
  }

  function renderLinear() {
    const list = structures[selectedModule as 'stack' | 'queue' | 'linked-list'];
    if (selectedModule === 'stack') {
      return (
        <div className="devlab-stack">
          <AnimatePresence initial={false} mode="popLayout">
            {[...list].reverse().map((value, rev) => {
              const original = list.length - rev - 1;
              return (
                <motion.div
                  layout={animate}
                  initial={animate ? { opacity: 0, y: -16, scale: 0.9 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={animate ? { opacity: 0, y: -14, scale: 0.86 } : undefined}
                  transition={{ type: 'spring', stiffness: 340, damping: 27 }}
                  key={`${value}-${original}`}
                  className={`devlab-value-card ${activeIndex === original ? 'is-active' : ''}`}
                >
                  <span>{rev === 0 ? 'TOP' : `#${original}`}</span><strong>{value}</strong>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!list.length && <div className="devlab-empty">{t('操作資料結構以觀察其行為。')}</div>}
        </div>
      );
    }
    const headLabel = selectedModule === 'queue' ? 'FRONT' : 'HEAD';
    const tailLabel = selectedModule === 'queue' ? 'REAR' : 'NULL';
    return (
      <div className={`devlab-linear-flow ${selectedModule === 'linked-list' ? 'linked' : ''}`}>
        <span className="devlab-flow-label">{headLabel}</span>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((value, index) => (
            <motion.div
              layout={animate}
              initial={animate ? { opacity: 0, scale: 0.9 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={animate ? { opacity: 0, scale: 0.86 } : undefined}
              transition={{ type: 'spring', stiffness: 340, damping: 27 }}
              key={`${value}-${index}`}
              className="devlab-list-link"
            >
              <div className={`devlab-value-card compact ${activeIndex === index ? 'is-active' : ''}`}>
                <span>#{index}</span><strong>{value}</strong>
              </div>
              {selectedModule === 'linked-list' && index < list.length - 1 && <ChevronRight size={20} aria-hidden="true" />}
            </motion.div>
          ))}
        </AnimatePresence>
        <span className="devlab-flow-label">{tailLabel}</span>
      </div>
    );
  }

  function renderArray(scene: ArrayScene) {
    const values = scene.cells.map((c) => c.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const span = Math.max(1, max - min);
    return (
      <div className="devlab-array-stage">
        <div className="devlab-bars">
          {scene.cells.map((cell, index) => {
            const height = 16 + ((cell.value - min) / span) * 78;
            const pointer = scene.pointers?.find((p) => p.index === index);
            const outside = scene.range ? index < scene.range[0] || index > scene.range[1] : false;
            return (
              <div className="devlab-bar-col" key={index}>
                <motion.div
                  layout={animate}
                  initial={false}
                  animate={{ height: `${height}%`, opacity: outside ? 0.32 : 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className={`devlab-bar ${STATE_CLASS[cell.state]} ${scene.target === cell.value ? 'is-target' : ''}`}
                >
                  <span>{cell.value}</span>
                </motion.div>
                <small>{index}</small>
                {pointer && <em className={`devlab-pointer tone-${pointer.tone ?? 'a'}`}>{pointer.label}</em>}
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {scene.buffer && (
            <motion.div
              initial={animate ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="devlab-buffer-row"
            >
              <span>{t(scene.bufferLabel ?? '緩衝區')}</span>
              {scene.buffer.map((cell, index) => (
                <code key={index} className={STATE_CLASS[cell.state]}>{cell.value}</code>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function renderTree(scene: TreeScene) {
    if (scene.empty || !scene.nodes.length) {
      return <div className="devlab-empty">{t('操作資料結構以觀察其行為。')}</div>;
    }
    const W = 1000;
    const H = 560;
    const pos = (x: number, y: number) => ({ x: x * W, y: 40 + y * (H - 80) });
    const map = new Map(scene.nodes.map((n) => [n.id, n]));
    return (
      <svg className="devlab-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <g className="devlab-edges">
          {scene.edges.map((edge) => {
            const a = map.get(edge.from);
            const b = map.get(edge.to);
            if (!a || !b) return null;
            const p1 = pos(a.x, a.y);
            const p2 = pos(b.x, b.y);
            return (
              <motion.line
                key={`${edge.from}-${edge.to}`}
                className={`devlab-edge ${edge.state ? STATE_CLASS[edge.state] : ''}`}
                initial={false}
                animate={{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              />
            );
          })}
        </g>
        <g>
          {scene.nodes.map((node) => {
            const p = pos(node.x, node.y);
            const colorClass = node.color === 'red' ? 'rb-red' : node.color === 'black' ? 'rb-black' : '';
            return (
              <motion.g
                key={node.id}
                className={`devlab-node ${STATE_CLASS[node.state]} ${colorClass}`}
                initial={animate ? { opacity: 0, scale: 0.3 } : false}
                animate={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              >
                <circle r={24} />
                <text className="devlab-node-value" dy="0.34em">{node.value}</text>
                {node.badge && <text className="devlab-node-badge" x={26} y={-20}>{node.badge}</text>}
              </motion.g>
            );
          })}
        </g>
      </svg>
    );
  }

  function renderGraph(scene: GraphScene) {
    const W = 1000;
    const H = 560;
    const pos = (x: number, y: number) => ({ x: x * W, y: y * H });
    const map = new Map(scene.nodes.map((n) => [n.id, n]));
    return (
      <div className="devlab-graph-wrap">
        <svg className="devlab-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="devlab-arrow" markerWidth="10" markerHeight="10" refX="22" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L6,3 L0,6 Z" className="devlab-arrowhead" />
            </marker>
          </defs>
          <g className="devlab-edges">
            {scene.edges.map((edge) => {
              const a = map.get(edge.from);
              const b = map.get(edge.to);
              if (!a || !b) return null;
              const p1 = pos(a.x, a.y);
              const p2 = pos(b.x, b.y);
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    className={`devlab-edge ${edge.state ? STATE_CLASS[edge.state] : ''}`}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    markerEnd={edge.directed ? 'url(#devlab-arrow)' : undefined}
                  />
                  {edge.weight !== undefined && (
                    <g className="devlab-weight">
                      <rect x={mx - 13} y={my - 11} width={26} height={20} rx={6} />
                      <text x={mx} y={my} dy="0.32em">{edge.weight}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          <g>
            {scene.nodes.map((node) => {
              const p = pos(node.x, node.y);
              return (
                <motion.g
                  key={node.id}
                  className={`devlab-node ${STATE_CLASS[node.state]}`}
                  initial={animate ? { opacity: 0, scale: 0.4 } : false}
                  animate={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                >
                  <circle r={27} />
                  <text className="devlab-node-value" dy="0.34em">{node.id}</text>
                  {node.dist !== undefined && (
                    <text className="devlab-node-dist" y={45} dy="0.32em">{node.dist === null ? '∞' : node.dist}</text>
                  )}
                  {node.badge && <text className="devlab-node-dist" y={45} dy="0.32em">{node.badge}</text>}
                </motion.g>
              );
            })}
          </g>
        </svg>
        {(scene.frontier || scene.order) && (
          <div className="devlab-graph-side">
            {scene.frontier && (
              <div className="devlab-graph-panel">
                <small>{t(scene.frontierLabel ?? '佇列')}</small>
                <div className="devlab-chip-row">
                  {scene.frontier.length ? scene.frontier.map((item, index) => <code key={`${item}-${index}`}>{item}</code>) : <code className="muted">—</code>}
                </div>
              </div>
            )}
            {scene.order && (
              <div className="devlab-graph-panel">
                <small>{t('走訪順序')}</small>
                <div className="devlab-chip-row">
                  {scene.order.length ? scene.order.map((item, index) => <code key={`${item}-${index}`} className="ordered">{item}</code>) : <code className="muted">—</code>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderMatrix(scene: MatrixScene) {
    const cols = scene.cells[0]?.length ?? 0;
    return (
      <div className="devlab-matrix-wrap">
        <div className="devlab-matrix" style={{ '--cols': cols + (scene.rowLabels ? 1 : 0) } as CSSProperties}>
          {scene.colLabels && (
            <div className="devlab-matrix-row header">
              {scene.rowLabels && <div className="devlab-matrix-corner">{scene.rowHeader ? t(scene.rowHeader) : ''}</div>}
              {scene.colLabels.map((label, index) => (
                <div className="devlab-matrix-head" key={index}>{label}</div>
              ))}
            </div>
          )}
          {scene.cells.map((row, r) => (
            <div className="devlab-matrix-row" key={r}>
              {scene.rowLabels && <div className="devlab-matrix-head row">{scene.rowLabels[r]}</div>}
              {row.map((cellItem, c) => (
                <motion.div
                  key={c}
                  className={`devlab-matrix-cell ${STATE_CLASS[cellItem.state]}`}
                  initial={false}
                  animate={{ scale: cellItem.state === 'active' ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                >
                  {cellItem.value}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
        {scene.highlight && <div className="devlab-matrix-formula">{scene.highlight}</div>}
      </div>
    );
  }
}
