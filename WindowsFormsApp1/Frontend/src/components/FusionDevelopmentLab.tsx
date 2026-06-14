import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Binary,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleDot,
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
  Trash2,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  benchmarkSortAlgorithms,
  buildBinarySearchTree,
  createDatasetPreset,
  insertTreeValue,
  parseGraph,
  parseNumberList,
  removeTreeValue,
  runSearchTrace,
  runSortTrace,
  runTraversalTrace,
  searchTree,
  updateLinearStructure
} from '../devlab/developmentLabEngine';
import type {
  AlgorithmTrace,
  BinaryTreeNode,
  DatasetPreset,
  LinearStructureAction,
  LinearStructureKind,
  SortBenchmark,
  TraceFrame,
  TracePhase
} from '../devlab/developmentLabEngine';
import {
  DEVELOPMENT_LAB_MODULES,
  getDevelopmentLabModule,
  isAlgorithmModule,
  isSortModule
} from '../devlab/developmentLabCatalog';
import type { DevelopmentLabModuleId } from '../devlab/developmentLabCatalog';
import { localizeDevelopmentLabMessage } from '../devlab/developmentLabText';
import { useI18n } from '../i18n/I18nContext';
import { formatFusionDate, formatFusionTime } from '../i18n/localeFormatting';
import { useSettings } from '../state/SettingsContext';

interface FusionDevelopmentLabProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

interface SavedSession {
  selectedModule?: DevelopmentLabModuleId;
  structures?: Partial<Record<LinearStructureKind, number[]>>;
  tree?: BinaryTreeNode | null;
  dataInput?: string;
  graphInput?: string;
  targetInput?: string;
  startNode?: string;
}

interface ActivityEntry {
  source: string;
  args?: Array<string | number>;
  engine?: boolean;
}

const STORAGE_KEY = 'fusion-development-lab-session-v2';
const DEFAULT_DATA = '8, 3, 6, 1, 7, 2, 5, 4';
const DEFAULT_GRAPH = 'A-B, A-C, B-D, B-E, C-F, E-G';
const DEFAULT_TREE = [8, 3, 10, 1, 6, 14, 4, 7, 13];

const DEFAULT_STRUCTURES: Record<LinearStructureKind, number[]> = {
  stack: [12, 24, 36],
  queue: [11, 22, 33, 44],
  'linked-list': [7, 14, 21, 28]
};

const MODULE_ICONS: Record<DevelopmentLabModuleId, LucideIcon> = {
  stack: Layers3,
  queue: ListEnd,
  'linked-list': ListTree,
  'binary-tree': GitBranch,
  'bubble-sort': CircleDot,
  'insertion-sort': ArrowDownToLine,
  'selection-sort': Search,
  'quick-sort': Shuffle,
  'merge-sort': GitBranch,
  'heap-sort': Layers3,
  'linear-search': Search,
  'binary-search': Binary,
  bfs: Network,
  dfs: GitBranch
};

const SPEED_OPTIONS = [
  { label: '0.5x', value: 1000 },
  { label: '1x', value: 600 },
  { label: '2x', value: 260 }
];

const PRESET_LABELS: Record<DatasetPreset, string> = {
  random: '隨機',
  'nearly-sorted': '近乎排序',
  reversed: '反向排序',
  duplicates: '重複值'
};

const PHASE_LABELS: Record<TracePhase, string> = {
  ready: '準備',
  compare: '比較',
  write: '寫入',
  pivot: '樞紐',
  visit: '走訪中',
  complete: '完成'
};

const loadSession = (): SavedSession => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as SavedSession : {};
  } catch {
    return {};
  }
};

const collectTreeLevels = (root: BinaryTreeNode | null) => {
  if (!root) return [] as BinaryTreeNode[][];
  const levels: BinaryTreeNode[][] = [];
  let current = [root];
  while (current.length && levels.length < 5) {
    levels.push(current);
    current = current.flatMap((node) => [node.left, node.right].filter((child): child is BinaryTreeNode => Boolean(child)));
  }
  return levels;
};

const structureActions: Record<LinearStructureKind, Array<{ action: LinearStructureAction; label: string; needsValue?: boolean }>> = {
  stack: [
    { action: 'push', label: '推入', needsValue: true },
    { action: 'pop', label: '彈出' },
    { action: 'peek', label: '查看頂端' }
  ],
  queue: [
    { action: 'enqueue', label: '入列', needsValue: true },
    { action: 'dequeue', label: '出列' },
    { action: 'front', label: '查看前端' }
  ],
  'linked-list': [
    { action: 'append', label: '附加', needsValue: true },
    { action: 'prepend', label: '前置', needsValue: true },
    { action: 'remove', label: '移除', needsValue: true },
    { action: 'find', label: '尋找', needsValue: true }
  ]
};

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
  const saved = useMemo(loadSession, []);

  const [selectedModule, setSelectedModule] = useState<DevelopmentLabModuleId>(saved.selectedModule ?? 'stack');
  const [structures, setStructures] = useState<Record<LinearStructureKind, number[]>>({
    stack: saved.structures?.stack ?? DEFAULT_STRUCTURES.stack,
    queue: saved.structures?.queue ?? DEFAULT_STRUCTURES.queue,
    'linked-list': saved.structures?.['linked-list'] ?? DEFAULT_STRUCTURES['linked-list']
  });
  const [tree, setTree] = useState<BinaryTreeNode | null>(saved.tree ?? buildBinarySearchTree(DEFAULT_TREE));
  const [dataInput, setDataInput] = useState(saved.dataInput ?? DEFAULT_DATA);
  const [graphInput, setGraphInput] = useState(saved.graphInput ?? DEFAULT_GRAPH);
  const [targetInput, setTargetInput] = useState(saved.targetInput ?? '7');
  const [startNode, setStartNode] = useState(saved.startNode ?? 'A');
  const [operationInput, setOperationInput] = useState('42');
  const [activeIndex, setActiveIndex] = useState<number | undefined>();
  const [treePath, setTreePath] = useState<number[]>([]);
  const [trace, setTrace] = useState<AlgorithmTrace | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [error, setError] = useState('');
  const [datasetPreset, setDatasetPreset] = useState<DatasetPreset>('random');
  const [datasetSize, setDatasetSize] = useState(10);
  const [benchmarks, setBenchmarks] = useState<SortBenchmark[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [activity, setActivity] = useState<ActivityEntry[]>([
    { source: '開發實驗室已就緒。' },
    { source: '選擇模組、調整範例，再執行一項操作。' }
  ]);

  const module = getDevelopmentLabModule(selectedModule);
  const isGraph = selectedModule === 'bfs' || selectedModule === 'dfs';
  const isSearch = selectedModule === 'linear-search' || selectedModule === 'binary-search';
  const isSort = isSortModule(selectedModule);
  const isStructure = !isAlgorithmModule(selectedModule);
  const currentFrame = trace?.frames[frameIndex] ?? null;
  const currentStructure = selectedModule === 'stack' || selectedModule === 'queue' || selectedModule === 'linked-list'
    ? structures[selectedModule]
    : [];
  const treeLevels = useMemo(() => collectTreeLevels(tree), [tree]);
  const treeNodeCount = useMemo(() => treeLevels.reduce((count, level) => count + level.length, 0), [treeLevels]);
  const progress = trace && trace.frames.length > 1 ? (frameIndex / (trace.frames.length - 1)) * 100 : 0;

  const formatMessage = useCallback((message: string) => {
    const translated = t(message);
    if (translated !== message || /[^\u0000-\u007f]/.test(message)) return translated;
    return localizeDevelopmentLabMessage(message, lang);
  }, [lang, t]);

  const appendActivity = useCallback((source: string, args: Array<string | number> = [], engine = false) => {
    setActivity((items) => [{ source, args, engine }, ...items].slice(0, 8));
  }, []);

  const renderActivity = useCallback((item: ActivityEntry) => {
    if (item.engine) return localizeDevelopmentLabMessage(item.source, lang);
    const args = (item.args ?? []).map((arg) => typeof arg === 'string' ? t(arg) : arg);
    return tf(item.source, ...args);
  }, [lang, t, tf]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedModule,
      structures,
      tree,
      dataInput,
      graphInput,
      targetInput,
      startNode
    } satisfies SavedSession));
  }, [dataInput, graphInput, selectedModule, startNode, structures, targetInput, tree]);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = ['input', 'textarea', 'select'].includes(target?.tagName.toLowerCase() ?? '') || target?.isContentEditable;
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

  const selectModule = (id: DevelopmentLabModuleId) => {
    setSelectedModule(id);
    setTrace(null);
    setBenchmarks(null);
    setFrameIndex(0);
    setPlaying(false);
    setActiveIndex(undefined);
    setTreePath([]);
    setError('');
    appendActivity('開啟「{0}」。', [getDevelopmentLabModule(id).label]);
  };

  const handleReason = (reason: unknown, fallback: string) => {
    const message = reason instanceof Error ? reason.message : fallback;
    setError(formatMessage(message));
  };

  const handleLinearAction = (action: LinearStructureAction, needsValue = false) => {
    if (selectedModule !== 'stack' && selectedModule !== 'queue' && selectedModule !== 'linked-list') return;
    try {
      const result = updateLinearStructure(
        selectedModule,
        structures[selectedModule],
        action,
        needsValue ? valueFromInput(operationInput) : undefined
      );
      setStructures((items) => ({ ...items, [selectedModule]: result.values }));
      setActiveIndex(result.activeIndex);
      setError('');
      appendActivity(result.message, [], true);
    } catch (reason) {
      handleReason(reason, '操作失敗。');
    }
  };

  const handleTreeAction = (action: 'insert' | 'remove' | 'find') => {
    try {
      const value = valueFromInput(operationInput);
      if (action === 'insert') {
        const nextTree = insertTreeValue(tree, value);
        setTree(nextTree);
        setTreePath(searchTree(nextTree, value).path);
        appendActivity('已將 {0} 插入二元搜尋樹。', [value]);
      } else if (action === 'remove') {
        const result = searchTree(tree, value);
        if (!result.found) throw new Error(`Node ${value} was not found.`);
        setTree((root) => removeTreeValue(root, value));
        setTreePath([]);
        appendActivity('已從二元搜尋樹移除 {0}。', [value]);
      } else {
        const result = searchTree(tree, value);
        setTreePath(result.path);
        appendActivity(
          result.found ? '沿路徑 {1} 找到 {0}。' : '沿路徑 {1} 後仍找不到 {0}。',
          [value, result.path.join(' → ') || t('空集合')]
        );
      }
      setError('');
    } catch (reason) {
      handleReason(reason, '樹狀結構操作失敗。');
    }
  };

  const buildTrace = () => {
    try {
      let nextTrace: AlgorithmTrace;
      if (isSortModule(selectedModule)) {
        nextTrace = runSortTrace(selectedModule, parseNumberList(dataInput));
      } else if (selectedModule === 'linear-search' || selectedModule === 'binary-search') {
        nextTrace = runSearchTrace(selectedModule, parseNumberList(dataInput), valueFromInput(targetInput));
      } else if (selectedModule === 'bfs' || selectedModule === 'dfs') {
        nextTrace = runTraversalTrace(selectedModule, parseGraph(graphInput), startNode.trim());
      } else {
        return;
      }
      setTrace(nextTrace);
      setFrameIndex(0);
      setPlaying(nextTrace.frames.length > 1);
      setError('');
      appendActivity('已為「{0}」產生 {1} 個動畫影格。', [module.label, nextTrace.frames.length]);
    } catch (reason) {
      setPlaying(false);
      handleReason(reason, '無法產生此動畫。');
    }
  };

  const loadSample = () => {
    if (isGraph) {
      setGraphInput(DEFAULT_GRAPH);
      setStartNode('A');
    } else {
      setDataInput(selectedModule === 'binary-search' ? '2, 5, 8, 12, 16, 23, 38, 56, 72' : DEFAULT_DATA);
      setTargetInput(selectedModule === 'linear-search' ? '7' : '23');
    }
    setTrace(null);
    setBenchmarks(null);
    setFrameIndex(0);
    setPlaying(false);
    setError('');
    appendActivity('已載入「{0}」的引導範例。', [module.label]);
  };

  const generateDataset = () => {
    const values = createDatasetPreset(datasetPreset, datasetSize);
    setDataInput(values.join(', '));
    setTrace(null);
    setBenchmarks(null);
    setFrameIndex(0);
    setPlaying(false);
    setError('');
    appendActivity('已產生 {0} 筆「{1}」資料。', [values.length, PRESET_LABELS[datasetPreset]]);
  };

  const runBenchmark = () => {
    try {
      setBenchmarks(benchmarkSortAlgorithms(parseNumberList(dataInput)));
      setError('');
      appendActivity('已完成六種排序法的效能比較。');
    } catch (reason) {
      handleReason(reason, '無法產生此動畫。');
    }
  };

  const resetModule = () => {
    if (selectedModule === 'stack' || selectedModule === 'queue' || selectedModule === 'linked-list') {
      setStructures((items) => ({ ...items, [selectedModule]: [...DEFAULT_STRUCTURES[selectedModule]] }));
    } else if (selectedModule === 'binary-tree') {
      setTree(buildBinarySearchTree(DEFAULT_TREE));
      setTreePath([]);
    } else {
      loadSample();
    }
    setActiveIndex(undefined);
    setTrace(null);
    setBenchmarks(null);
    setFrameIndex(0);
    setPlaying(false);
    setError('');
    appendActivity('已重設「{0}」。', [module.label]);
  };

  const valueMotion = {
    initial: animate ? { opacity: 0, y: 18, scale: 0.9 } : false,
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: animate ? { opacity: 0, y: -14, scale: 0.86 } : undefined,
    transition: { type: 'spring' as const, stiffness: 340, damping: 27 }
  };

  const renderStructure = () => {
    if (selectedModule === 'stack') {
      return (
        <div className="devlab-stack" aria-label={t('堆疊')}>
          <AnimatePresence initial={false} mode="popLayout">
            {[...currentStructure].reverse().map((value, reverseIndex) => {
              const originalIndex = currentStructure.length - reverseIndex - 1;
              return (
                <motion.div
                  layout={animate}
                  {...valueMotion}
                  key={`${value}-${originalIndex}`}
                  className={`devlab-value-card ${activeIndex === originalIndex ? 'is-active' : ''}`}
                >
                  <span>{reverseIndex === 0 ? t('頂端') : `#${originalIndex}`}</span>
                  <strong>{value}</strong>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!currentStructure.length && <div className="devlab-empty">{t('堆疊是空的，推入數值即可開始。')}</div>}
        </div>
      );
    }
    if (selectedModule === 'queue') {
      return (
        <div className="devlab-linear-flow">
          <span className="devlab-flow-label">{t('前端')}</span>
          <AnimatePresence initial={false} mode="popLayout">
            {currentStructure.map((value, index) => (
              <motion.div
                layout={animate}
                {...valueMotion}
                key={`${value}-${index}`}
                className={`devlab-value-card compact ${activeIndex === index ? 'is-active' : ''}`}
              >
                <span>#{index}</span><strong>{value}</strong>
              </motion.div>
            ))}
          </AnimatePresence>
          <span className="devlab-flow-label">{t('後端')}</span>
          {!currentStructure.length && <div className="devlab-empty">{t('佇列是空的，加入數值即可開始。')}</div>}
        </div>
      );
    }
    if (selectedModule === 'linked-list') {
      return (
        <div className="devlab-linear-flow linked">
          <span className="devlab-flow-label">{t('頭節點')}</span>
          <AnimatePresence initial={false} mode="popLayout">
            {currentStructure.map((value, index) => (
              <motion.div layout={animate} {...valueMotion} className="devlab-list-link" key={`${value}-${index}`}>
                <div className={`devlab-value-card compact ${activeIndex === index ? 'is-active' : ''}`}>
                  <span>{t('節點')} {index}</span><strong>{value}</strong>
                </div>
                {index < currentStructure.length - 1 && <ArrowRight size={21} aria-hidden="true" />}
              </motion.div>
            ))}
          </AnimatePresence>
          <span className="devlab-flow-label">NULL</span>
        </div>
      );
    }
    return (
      <div className="devlab-tree" aria-label={t('二元搜尋樹')}>
        {treeLevels.map((level, depth) => (
          <div className="devlab-tree-level" key={depth}>
            {level.map((node, index) => (
              <motion.div
                layout={animate}
                initial={animate ? { opacity: 0, scale: 0.78, y: -12 } : false}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: animate ? depth * 0.05 + index * 0.025 : 0 }}
                key={node.id}
                className={`devlab-tree-node ${treePath.includes(node.value) ? 'is-active' : ''}`}
              >
                <small>{depth === 0 ? t('根節點') : node.value < (tree?.value ?? node.value) ? t('左側') : t('右側')}</small>
                <strong>{node.value}</strong>
                <span>{node.left ? `L ${node.left.value}` : 'L -'} · {node.right ? `R ${node.right.value}` : 'R -'}</span>
              </motion.div>
            ))}
          </div>
        ))}
        {!tree && <div className="devlab-empty">{t('樹是空的，插入數值即可開始。')}</div>}
      </div>
    );
  };

  const renderAlgorithm = (frame: TraceFrame | null) => {
    if (!frame) {
      return (
        <div className="devlab-empty algorithm">
          <Braces size={34} />
          <strong>{t('準備產生動畫')}</strong>
          <span>{t('編輯範例資料後，選擇「執行動畫」。')}</span>
        </div>
      );
    }
    if (isGraph) {
      let graph;
      try {
        graph = parseGraph(graphInput);
      } catch {
        return (
          <div className="devlab-empty algorithm">
            <Network size={34} />
            <strong>{t('圖形輸入已變更')}</strong>
            <span>{t('修正邊集合後重新執行動畫。')}</span>
          </div>
        );
      }
      return (
        <div className="devlab-graph">
          <div className="devlab-graph-nodes">
            {graph.nodes.map((node, index) => (
              <motion.div
                layout={animate}
                initial={animate ? { opacity: 0, scale: 0.75 } : false}
                animate={{
                  opacity: 1,
                  scale: frame.activeNodes.includes(node) ? 1.06 : 1,
                  y: frame.activeNodes.includes(node) ? -6 : 0
                }}
                transition={{ delay: animate ? index * 0.035 : 0 }}
                key={node}
                className={`devlab-graph-node ${frame.visitedNodes.includes(node) ? 'is-visited' : ''} ${frame.activeNodes.includes(node) ? 'is-active' : ''}`}
              >
                <span>{node}</span>
                <small>{frame.visitedNodes.indexOf(node) >= 0 ? `${t('走訪')} ${frame.visitedNodes.indexOf(node) + 1}` : t('等待中')}</small>
              </motion.div>
            ))}
          </div>
          <div className="devlab-edge-list">
            {graph.edges.map(([from, to]) => (
              <span key={`${from}-${to}`}>{from}<ArrowRight size={13} />{to}</span>
            ))}
          </div>
        </div>
      );
    }

    const min = Math.min(...frame.values);
    const max = Math.max(...frame.values);
    const span = Math.max(1, max - min);
    return (
      <div className="devlab-algorithm-stage">
        <div className="devlab-bars" aria-label={`${t(module.label)} visualization`}>
          {frame.values.map((value, index) => {
            const height = 24 + ((value - min) / span) * 72;
            const active = frame.activeIndices.includes(index);
            const settled = frame.settledIndices.includes(index);
            const outsideRange = frame.range ? index < frame.range[0] || index > frame.range[1] : false;
            return (
              <motion.div
                layout={animate}
                key={index}
                initial={false}
                animate={{
                  height: `${height}%`,
                  y: active ? -7 : 0,
                  scale: active ? 1.045 : 1,
                  opacity: outsideRange ? 0.38 : 1
                }}
                transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                className={`devlab-bar ${active ? 'is-active' : ''} ${settled ? 'is-settled' : ''}`}
              >
                <span>{value}</span>
                <small>{index}</small>
              </motion.div>
            );
          })}
        </div>
        <AnimatePresence>
          {frame.auxiliaryValues && (
            <motion.div
              initial={animate ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="devlab-buffer-row"
            >
              <span>{t('緩衝區')}</span>
              {frame.auxiliaryValues.map((value, index) => (
                <code key={`${value}-${index}`}>{value}</code>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!open) return null;

  const fastestComparisons = benchmarks ? Math.min(...benchmarks.map((row) => row.comparisons)) : 0;

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
        initial={animate ? { opacity: 0, scale: 0.975, y: 18 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 25 }}
      >
        <header className="devlab-topbar">
          <div className="devlab-brand">
            <span className="devlab-brand-icon"><Code2 size={24} /></span>
            <div>
              <strong>{t('開發實驗室')}</strong>
              <span>{t('資料結構 × 演算法系統')}</span>
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
            {isSort && (
              <button type="button" className={benchmarks ? 'is-engaged' : ''} onClick={runBenchmark}>
                <Gauge size={16} /> {t('效能比較')}
              </button>
            )}
            {isAlgorithmModule(selectedModule) && (
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
            {([
              { id: 'structures' as const, label: '資料結構' },
              { id: 'algorithms' as const, label: '演算法' }
            ]).map((group) => (
              <section key={group.id}>
                <span className="devlab-nav-label">{t(group.label)}</span>
                {DEVELOPMENT_LAB_MODULES.filter((item) => item.group === group.id).map((item) => {
                  const Icon = MODULE_ICONS[item.id];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={selectedModule === item.id ? 'is-active' : ''}
                      onClick={() => selectModule(item.id)}
                    >
                      <Icon size={18} />
                      <span><strong>{t(item.label)}</strong><small>{t(item.shortLabel)}</small></span>
                    </button>
                  );
                })}
              </section>
            ))}
          </aside>

          <main className="devlab-workspace">
            <div className="devlab-workspace-head">
              <div>
                <span>{t(module.group === 'structures' ? '資料結構' : '演算法')}</span>
                <h1>{t(module.label)}</h1>
                <p>{t(module.description)}</p>
              </div>
              <span className="devlab-ready-chip"><CircleDot size={13} /> {t('互動模式')}</span>
            </div>

            <div className="devlab-input-strip">
              {isStructure ? (
                <>
                  <label>
                    <span>{t('操作數值')}</span>
                    <input value={operationInput} onChange={(event) => setOperationInput(event.target.value)} inputMode="decimal" />
                  </label>
                  <div className="devlab-action-row">
                    {selectedModule === 'binary-tree'
                      ? (
                        <>
                          <button type="button" onClick={() => handleTreeAction('insert')}><Plus size={15} /> {t('插入')}</button>
                          <button type="button" onClick={() => handleTreeAction('remove')}><Trash2 size={15} /> {t('移除')}</button>
                          <button type="button" onClick={() => handleTreeAction('find')}><Search size={15} /> {t('尋找')}</button>
                        </>
                      )
                      : structureActions[selectedModule as LinearStructureKind].map((item) => (
                        <button type="button" key={item.action} onClick={() => handleLinearAction(item.action, item.needsValue)}>
                          {item.action === 'push' || item.action === 'enqueue' || item.action === 'append' || item.action === 'prepend'
                            ? <Plus size={15} />
                            : item.action === 'pop' || item.action === 'dequeue' || item.action === 'remove'
                              ? <ArrowUpFromLine size={15} />
                              : <Search size={15} />}
                          {t(item.label)}
                        </button>
                      ))}
                  </div>
                </>
              ) : isGraph ? (
                <>
                  <label className="wide">
                    <span>{t('無向邊')}</span>
                    <input value={graphInput} onChange={(event) => setGraphInput(event.target.value)} placeholder="A-B, A-C, B-D" />
                  </label>
                  <label className="short">
                    <span>{t('起始節點')}</span>
                    <input value={startNode} onChange={(event) => setStartNode(event.target.value)} />
                  </label>
                </>
              ) : (
                <>
                  <label className="wide">
                    <span>{t('資料集')}</span>
                    <input value={dataInput} onChange={(event) => setDataInput(event.target.value)} placeholder="8, 3, 6, 1" />
                  </label>
                  {isSort && (
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
                  {isSearch && (
                    <label className="short">
                      <span>{t('目標值')}</span>
                      <input value={targetInput} onChange={(event) => setTargetInput(event.target.value)} inputMode="decimal" />
                    </label>
                  )}
                </>
              )}
              {error && <div className="devlab-error">{error}</div>}
            </div>

            <section className={`devlab-canvas phase-${currentFrame?.phase ?? 'ready'}`}>
              <div className="devlab-canvas-aurora" aria-hidden="true" />
              <div className="devlab-canvas-grid" aria-hidden="true" />
              <div className="devlab-scan-beam" aria-hidden="true" />
              <div className="devlab-stage-copy">
                <span>
                  {isStructure
                    ? `${selectedModule === 'binary-tree' ? treeNodeCount : currentStructure.length} ${t('筆有效資料')}`
                    : `${t('影格')} ${trace ? frameIndex + 1 : 0} / ${trace?.frames.length ?? 0}`}
                </span>
                <strong>{currentFrame ? formatMessage(currentFrame.message) : isStructure ? t('操作資料結構以觀察其行為。') : t('產生動畫後即可開始逐步解說。')}</strong>
              </div>
              {currentFrame && (
                <div className={`devlab-phase-chip is-${currentFrame.phase}`}>
                  <span>{t('目前步驟')}</span>
                  <strong>{t(PHASE_LABELS[currentFrame.phase])}</strong>
                  <i style={{ '--progress': `${progress}%` } as CSSProperties} />
                </div>
              )}
              <div className="devlab-visual-stage">
                {isStructure ? renderStructure() : renderAlgorithm(currentFrame)}
              </div>
            </section>

            {isAlgorithmModule(selectedModule) && (
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
                  onChange={(event) => {
                    setPlaying(false);
                    setFrameIndex(Number(event.target.value));
                  }}
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
                  <li key={line} className={currentFrame?.pseudocodeLine === index ? 'is-active' : ''}>
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
                <span><strong>{currentFrame?.metrics.visits ?? (selectedModule === 'binary-tree' ? treePath.length : isStructure ? currentStructure.length : 0)}</strong><small>{t('走訪次數')}</small></span>
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
                    <div className={`devlab-benchmark-row ${row.comparisons === fastestComparisons ? 'is-best' : ''}`} key={row.algorithm}>
                      <strong>{t(getDevelopmentLabModule(row.algorithm).label)}</strong>
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
                  <p key={`${item.source}-${index}`}><span>{String(activity.length - index).padStart(2, '0')}</span>{renderActivity(item)}</p>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </motion.section>
    </motion.div>
  );
}
