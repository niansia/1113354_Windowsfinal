import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Atom,
  BookOpen,
  BrainCircuit,
  CircleDotDashed,
  Cloud,
  Database,
  Download,
  ExternalLink,
  Gauge,
  History,
  KeyRound,
  Layers3,
  Network,
  PanelLeft,
  Play,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  WifiOff,
  X,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';
import { formatFusionDate, formatFusionTime, localeForLanguage } from '../i18n/localeFormatting';
import {
  analyzePrompt,
  buildInferenceTrace,
  calculateReward,
  composeGroundedAnswer,
  getInferencePlaybackMs,
  retrieveLocalKnowledge,
  streamChunks,
  tokenizePrompt,
  type KnowledgeHit,
  type LiquidParameters,
  type NeuroArchitecture,
  type PromptIntent,
  type RewardSignals
} from '../neuro/neuroFlow';
import { searchPublicKnowledge } from '../neuro/onlineKnowledge';
import { LiquidStateCanvas } from './neuro/NeuralFlowCanvas';
import { NeuralFlow3D, type NeuralFlowState } from './neuro/NeuralFlow3D';

interface FusionNeuroFlowProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type NeuroView = 'inference' | 'network' | 'dynamics' | 'knowledge' | 'history';
type SourceMode = 'auto' | 'online' | 'offline';
type NetworkState = 'ready' | 'connecting' | 'online' | 'fallback' | 'offline' | 'error';

interface WorkspaceNote {
  id: string;
  title: string;
  content: string;
}

interface ExperimentRun {
  id: number;
  prompt: string;
  answer: string;
  sourceMode: NetworkState;
  latencyMs: number;
  reward: number;
  tokenCount: number;
  timestamp: string;
  evidence: KnowledgeHit[];
}

const EXAMPLES = [
  '用簡單方式解釋大型語言模型如何產生答案',
  '液態神經網路和 Transformer 有什麼差異？',
  'RLHF 的獎勵如何影響模型輸出？'
];

const ARCHITECTURES: Array<{ id: NeuroArchitecture; label: string }> = [
  { id: 'hybrid', label: 'Transformer + LNN' },
  { id: 'transformer', label: 'Transformer' },
  { id: 'liquid', label: 'Liquid Network' }
];

const SOURCE_MODES: Array<{ id: SourceMode; label: string }> = [
  { id: 'auto', label: '自動' },
  { id: 'online', label: '連網' },
  { id: 'offline', label: '本機' }
];

const PIPELINE_KEYS = ['Token 化', '向量嵌入', '注意力', '液態狀態', '獎勵評估', '答案解碼'];

const INTENT_LABELS: Record<PromptIntent, string> = {
  compare: '比較分析',
  explain: '解釋說明',
  define: '定義',
  reason: '成因與影響',
  general: '綜合'
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const waitForPlayback = (milliseconds: number, signal: AbortSignal) => new Promise<boolean>((resolve) => {
  if (milliseconds <= 0) { resolve(true); return; }
  const timer = window.setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve(true);
  }, milliseconds);
  const onAbort = () => {
    window.clearTimeout(timer);
    resolve(false);
  };
  signal.addEventListener('abort', onAbort, { once: true });
});

export const FusionNeuroFlow: React.FC<FusionNeuroFlowProps> = ({ open, onClose, accent }) => {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [view, setView] = useState<NeuroView>('inference');
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [architecture, setArchitecture] = useState<NeuroArchitecture>('hybrid');
  const [sourceMode, setSourceMode] = useState<SourceMode>('auto');
  const [networkState, setNetworkState] = useState<NetworkState>('ready');
  const [running, setRunning] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [answer, setAnswer] = useState('');
  const [decoded, setDecoded] = useState(0);
  const [outputCount, setOutputCount] = useState(0);
  const [evidence, setEvidence] = useState<KnowledgeHit[]>([]);
  const [latencyMs, setLatencyMs] = useState(0);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [history, setHistory] = useState<ExperimentRun[]>([]);
  const [liquid, setLiquid] = useState<LiquidParameters>({ timeConstant: 0.82, recurrence: 0.58, damping: 0.2 });
  const [rewardWeights, setRewardWeights] = useState<RewardSignals>({ accuracy: 4, helpfulness: 4, safety: 3, clarity: 3 });
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const flowRef = useRef<NeuralFlowState>({ progress: 0, decoded: 0, outputCount: 0 });
  const progressRafRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => () => { abortRef.current?.abort(); cancelAnimationFrame(progressRafRef.current); }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const trace = useMemo(() => buildInferenceTrace(prompt || 'NeuroFlow', architecture), [architecture, prompt]);
  const rewardSignals = useMemo<RewardSignals>(() => ({
    accuracy: clamp(0.7 + evidence.length * 0.07),
    helpfulness: clamp(0.78 + Math.min(prompt.length, 80) / 800),
    safety: 0.96,
    clarity: clamp(0.84 + (answer ? 0.05 : 0))
  }), [answer, evidence.length, prompt.length]);
  const reward = useMemo(() => calculateReward(rewardSignals, rewardWeights), [rewardSignals, rewardWeights]);
  const numberFormat = useMemo(() => new Intl.NumberFormat(localeForLanguage(lang), { maximumFractionDigits: 1 }), [lang]);
  const stageLabels = useMemo(() => PIPELINE_KEYS.map(t), [t]);
  const intent = useMemo<PromptIntent>(() => analyzePrompt(prompt, lang).intent, [prompt, lang]);

  const workspaceHits = useCallback((query: string): KnowledgeHit[] => {
    const terms = new Set(tokenizePrompt(query.toLocaleLowerCase()).map((token) => token.text));
    return notes.map((note) => {
      const haystack = new Set(tokenizePrompt(`${note.title} ${note.content}`.toLocaleLowerCase()).map((token) => token.text));
      let overlap = 0;
      terms.forEach((term) => { if (haystack.has(term)) overlap += 1; });
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        source: 'workspace' as const,
        provider: 'Workspace',
        score: overlap / Math.max(1, terms.size)
      };
    }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  }, [notes]);

  const runInference = useCallback(async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || running || streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentRun = ++runIdRef.current;
    const startedAt = performance.now();
    setRunning(true);
    setStreaming(false);
    setAnswer('');
    setEvidence([]);
    setLatencyMs(0);
    setDecoded(0);
    setOutputCount(0);
    setPhaseIndex(0);
    setNetworkState(sourceMode === 'offline' ? 'offline' : 'connecting');

    const stageCount = trace.stages.length;
    const playbackMs = getInferencePlaybackMs(stageCount, speed);

    // Smoothly sweep the activation wavefront across the pipeline (drives the 3D scene at
    // 60fps via flowRef without re-rendering React).
    flowRef.current = { progress: 0, decoded: 0, outputCount: 0 };
    cancelAnimationFrame(progressRafRef.current);
    const sweep = () => {
      if (controller.signal.aborted) return;
      const k = Math.min(1, (performance.now() - startedAt) / Math.max(1, playbackMs));
      flowRef.current.progress = k * k * (3 - 2 * k);
      if (k < 1) progressRafRef.current = requestAnimationFrame(sweep);
    };
    progressRafRef.current = requestAnimationFrame(sweep);

    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((current) => Math.min(stageCount - 1, current + 1));
    }, playbackMs / stageCount);

    let resolvedState: NetworkState = 'offline';
    let hits: KnowledgeHit[] = [];
    try {
      const local = retrieveLocalKnowledge(cleanPrompt, lang, 3);
      const workspace = workspaceHits(cleanPrompt);
      if (sourceMode !== 'offline' && isOnline) {
        try {
          const online = await searchPublicKnowledge(cleanPrompt, lang, { limit: 3, timeoutMs: 5500, signal: controller.signal });
          hits = [...workspace, ...online, ...local].slice(0, 5);
          resolvedState = online.length ? 'online' : 'fallback';
        } catch (error) {
          if (controller.signal.aborted) return;
          hits = [...workspace, ...local].slice(0, 5);
          resolvedState = sourceMode === 'online' && hits.length === 0 ? 'error' : 'fallback';
        }
      } else {
        hits = [...workspace, ...local].slice(0, 5);
        resolvedState = sourceMode === 'offline' ? 'offline' : 'fallback';
      }
      if (currentRun !== runIdRef.current) return;

      // Let the wavefront finish sweeping through the network before decoding begins.
      const remainingPlayback = playbackMs - (performance.now() - startedAt);
      if (!(await waitForPlayback(remainingPlayback, controller.signal))) return;
      const inferenceMs = Math.max(1, Math.round(performance.now() - startedAt));
      setEvidence(hits);
      setLatencyMs(inferenceMs);
      setNetworkState(resolvedState);
      setPhaseIndex(stageCount - 1);

      // Autoregressive decode: stream the grounded answer token by token while emission
      // particles fly out of the final layer.
      const finalAnswer = composeGroundedAnswer(cleanPrompt, lang, hits);
      const chunks = streamChunks(finalAnswer);
      flowRef.current.outputCount = chunks.length;
      setOutputCount(chunks.length);
      setStreaming(true);
      const perToken = Math.max(10, Math.round(24 / Math.max(0.5, speed)));
      let shown = '';
      for (let i = 0; i < chunks.length; i += 1) {
        if (controller.signal.aborted || currentRun !== runIdRef.current) return;
        shown += chunks[i];
        flowRef.current.decoded = i + 1;
        setAnswer(shown);
        setDecoded(i + 1);
        if (!(await waitForPlayback(perToken, controller.signal))) return;
      }
      setStreaming(false);

      const finalReward = calculateReward({
        accuracy: clamp(0.7 + hits.length * 0.07),
        helpfulness: 0.86,
        safety: 0.96,
        clarity: 0.89
      }, rewardWeights).total;
      setHistory((items) => [{
        id: currentRun,
        prompt: cleanPrompt,
        answer: finalAnswer,
        sourceMode: resolvedState,
        latencyMs: inferenceMs,
        reward: finalReward,
        tokenCount: trace.tokens.length,
        timestamp: new Date().toISOString(),
        evidence: hits
      }, ...items].slice(0, 18));
    } finally {
      window.clearInterval(phaseTimer);
      if (currentRun === runIdRef.current) {
        cancelAnimationFrame(progressRafRef.current);
        flowRef.current.progress = 1;
        setRunning(false);
        setStreaming(false);
      }
    }
  }, [isOnline, lang, prompt, rewardWeights, running, streaming, sourceMode, speed, trace.stages.length, trace.tokens.length, workspaceHits]);

  const addNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setNotes((items) => [{ id: `workspace-${Date.now()}`, title: noteTitle.trim(), content: noteContent.trim() }, ...items]);
    setNoteTitle('');
    setNoteContent('');
  };

  const exportHistory = () => {
    const payload = JSON.stringify({ product: 'NeuroFlow AI', exportedAt: new Date().toISOString(), architecture, sourceMode, liquid, rewardWeights, runs: history }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `neuroflow-experiments-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const navItems: Array<{ id: NeuroView; label: string; icon: LucideIcon }> = [
    { id: 'inference', label: '推論工作台', icon: Sparkles },
    { id: 'network', label: '神經網路', icon: Network },
    { id: 'dynamics', label: '獎勵與 LNN', icon: Activity },
    { id: 'knowledge', label: '知識來源', icon: BookOpen },
    { id: 'history', label: '實驗紀錄', icon: History }
  ];

  const sourceLabel = networkState === 'online' ? '線上知識' : networkState === 'fallback' ? '本機備援' : networkState === 'offline' ? '本機模式' : networkState === 'connecting' ? '連線中' : networkState === 'error' ? '來源錯誤' : '待命';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="neuro-flow-overlay"
          style={{ ['--neuro-accent' as string]: accent } as React.CSSProperties}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="neuro-flow-shell"
            role="dialog"
            aria-modal="true"
            aria-label={t('NeuroFlow AI')}
            initial={{ opacity: 0, y: 24, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 240, damping: 29 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="neuro-topbar">
              <div className="neuro-brand">
                <span className="neuro-brand-mark"><BrainCircuit size={25} strokeWidth={1.7} /></span>
                <div><strong>{t('NeuroFlow AI')}</strong><small>{t('智慧推論與神經動態工作室')}</small></div>
              </div>
              <div className="neuro-runtime-badges">
                <span><KeyRound size={14} />{t('免金鑰')}</span>
                <span className={isOnline ? 'is-online' : 'is-offline'}>{isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}{t(isOnline ? '網路可用' : '離線')}</span>
                <span><ShieldCheck size={14} />{t('本機備援')}</span>
              </div>
              <div className="neuro-clock">
                <span>{t('系統時間')}</span>
                <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
                <small>{formatFusionDate(now, lang, settings.timezone)}</small>
              </div>
              <button type="button" className="neuro-icon-button" onClick={onClose} title={t('關閉')} aria-label={t('關閉')}><X size={20} /></button>
            </header>

            <div className="neuro-body">
              <aside className="neuro-sidebar">
                <nav aria-label={t('NeuroFlow 導覽')}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon size={18} /><span>{t(item.label)}</span></button>;
                  })}
                </nav>
                <section className="neuro-sidebar-section">
                  <span>{t('模型架構')}</span>
                  {ARCHITECTURES.map((item) => <button key={item.id} type="button" className={`neuro-model-button ${architecture === item.id ? 'active' : ''}`} onClick={() => setArchitecture(item.id)}><CircleDotDashed size={15} /><span>{item.label}</span></button>)}
                </section>
                <section className="neuro-sidebar-metrics">
                  <div><span>{t('節點')}</span><strong>{trace.nodes}</strong></div>
                  <div><span>{t('連結')}</span><strong>{numberFormat.format(trace.connections)}</strong></div>
                  <div><span>{t('Token')}</span><strong>{trace.tokens.length}</strong></div>
                  <div><span>{t('獎勵')}</span><strong>{numberFormat.format(reward.total * 100)}</strong></div>
                </section>
                <label className="neuro-speed-control"><span>{t('模擬速度')}<b>{speed.toFixed(1)}x</b></span><input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
              </aside>

              <main className="neuro-workspace">
                {view === 'inference' && (
                  <div className="neuro-view neuro-inference-view">
                    <section className="neuro-prompt-panel">
                      <div className="neuro-section-head"><div><span>{t('即時推論')}</span><strong>{t('輸入問題')}</strong></div><span className={`neuro-source-state state-${networkState}`}><Radio size={14} />{t(sourceLabel)}</span></div>
                      <textarea value={prompt} maxLength={560} onChange={(event) => setPrompt(event.target.value)} aria-label={t('輸入問題')} />
                      <div className="neuro-example-row">{EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}>{t(example)}</button>)}</div>
                      <div className="neuro-run-row">
                        <div className="neuro-segmented">{SOURCE_MODES.map((mode) => <button key={mode.id} type="button" className={sourceMode === mode.id ? 'active' : ''} onClick={() => setSourceMode(mode.id)}>{t(mode.label)}</button>)}</div>
                        <button type="button" className="neuro-run-button" onClick={runInference} disabled={running || streaming || !prompt.trim()}>{running || streaming ? <RefreshCw className="spin" size={17} /> : <Play size={17} fill="currentColor" />}{t(streaming ? '生成中' : running ? '推論中' : '執行推論')}</button>
                      </div>
                    </section>
                    <section className="neuro-visual-stage">
                      <div className="neuro-stage-toolbar"><div><Network size={17} /><strong>{t('動態神經路徑')}</strong></div><span>{architecture === 'hybrid' ? 'Transformer + LNN + RL' : architecture}</span></div>
                      <NeuralFlow3D trace={trace} phaseIndex={phaseIndex} running={running || streaming} speed={speed} stageLabels={stageLabels} label={t('3D 神經網路動態視覺化')} flowRef={flowRef} />
                    </section>
                    <section className={`neuro-answer-panel ${answer || streaming ? 'has-answer' : ''}`}>
                      <div className="neuro-answer-head"><div><Sparkles size={17} /><strong>{t('生成結果')}</strong>{(answer || streaming) && <span className="neuro-intent-badge">{t('推論意圖')}· {t(INTENT_LABELS[intent])}</span>}</div>{latencyMs > 0 && <span>{latencyMs} ms · {evidence.length} {t('筆證據')}</span>}</div>
                      <p>{answer || (streaming ? '' : t('執行推論後，答案與證據會顯示在這裡。'))}{streaming && <span className="neuro-caret" aria-hidden="true" />}</p>
                      {evidence.length > 0 && <div className="neuro-citation-row">{evidence.slice(0, 3).map((item) => <span key={item.id}>{item.provider} · {item.title}</span>)}</div>}
                    </section>
                  </div>
                )}

                {view === 'network' && (
                  <div className="neuro-view neuro-network-view">
                    <section className="neuro-view-header"><div><span>{t('神經網路')}</span><h2>{t('訊號傳播與注意力')}</h2></div><button type="button" className="neuro-primary-small" onClick={() => { setRunning((value) => !value); setPhaseIndex((value) => (value + 1) % 6); }}>{running ? t('暫停') : t('播放')}</button></section>
                    <section className="neuro-network-expanded"><NeuralFlow3D trace={trace} phaseIndex={phaseIndex} running={running} speed={speed} stageLabels={stageLabels} label={t('3D 神經網路動態視覺化')} /></section>
                    <div className="neuro-analysis-grid">
                      <section className="neuro-card"><div className="neuro-card-title"><Layers3 size={17} /><strong>{t('Token 活化')}</strong></div><div className="neuro-token-grid">{trace.tokens.slice(0, 20).map((token) => <span key={token.id} style={{ ['--token-power' as string]: token.activation } as React.CSSProperties}>{token.text}<i>{Math.round(token.activation * 100)}</i></span>)}</div></section>
                      <section className="neuro-card"><div className="neuro-card-title"><Atom size={17} /><strong>{t('注意力矩陣')}</strong></div><div className="neuro-attention-grid" style={{ gridTemplateColumns: `repeat(${Math.min(10, trace.tokens.length || 1)}, 1fr)` }}>{trace.attention.slice(0, 10).flatMap((row, rowIndex) => row.slice(0, 10).map((value, columnIndex) => <span key={`${rowIndex}-${columnIndex}`} title={`${rowIndex + 1} → ${columnIndex + 1}: ${value.toFixed(3)}`} style={{ opacity: 0.18 + value * 3.4 }} />))}</div></section>
                    </div>
                  </div>
                )}

                {view === 'dynamics' && (
                  <div className="neuro-view neuro-dynamics-view">
                    <section className="neuro-view-header"><div><span>{t('動態控制')}</span><h2>{t('獎勵與液態狀態')}</h2></div><span className="neuro-score"><Zap size={16} />{numberFormat.format(reward.total * 100)}</span></section>
                    <section className="neuro-liquid-stage"><div className="neuro-stage-toolbar"><div><Activity size={17} /><strong>{t('連續時間狀態')}</strong></div><span>τ {liquid.timeConstant.toFixed(2)}</span></div><LiquidStateCanvas params={liquid} running={true} speed={speed} label={t('液態神經網路狀態圖')} /></section>
                    <div className="neuro-control-grid">
                      <section className="neuro-card"><div className="neuro-card-title"><SlidersHorizontal size={17} /><strong>{t('LNN 參數')}</strong></div>
                        {([
                          ['timeConstant', '時間常數', 0.2, 2, 0.02],
                          ['recurrence', '回饋強度', 0, 1, 0.01],
                          ['damping', '阻尼', 0, 0.8, 0.01]
                        ] as const).map(([key, label, min, max, step]) => <label className="neuro-range" key={key}><span>{t(label)}<b>{liquid[key].toFixed(2)}</b></span><input type="range" min={min} max={max} step={step} value={liquid[key]} onChange={(event) => setLiquid((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
                      </section>
                      <section className="neuro-card"><div className="neuro-card-title"><Gauge size={17} /><strong>{t('RL 獎勵混合')}</strong></div>
                        {(Object.keys(rewardWeights) as Array<keyof RewardSignals>).map((key) => <label className="neuro-range" key={key}><span>{t(key === 'accuracy' ? '正確性' : key === 'helpfulness' ? '有用性' : key === 'safety' ? '安全性' : '清晰度')}<b>{rewardWeights[key]}</b></span><input type="range" min="0" max="5" step="1" value={rewardWeights[key]} onChange={(event) => setRewardWeights((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
                      </section>
                    </div>
                    <section className="neuro-reward-strip">{reward.breakdown.map((item) => <article key={item.key}><span>{t(item.key === 'accuracy' ? '正確性' : item.key === 'helpfulness' ? '有用性' : item.key === 'safety' ? '安全性' : '清晰度')}</span><strong>{Math.round(item.signal * 100)}</strong><i><b style={{ width: `${item.contribution * 400}%` }} /></i></article>)}</section>
                  </div>
                )}

                {view === 'knowledge' && (
                  <div className="neuro-view neuro-knowledge-view">
                    <section className="neuro-view-header"><div><span>{t('知識來源')}</span><h2>{t('連網檢索與本機備援')}</h2></div><div className="neuro-segmented">{SOURCE_MODES.map((mode) => <button key={mode.id} type="button" className={sourceMode === mode.id ? 'active' : ''} onClick={() => setSourceMode(mode.id)}>{t(mode.label)}</button>)}</div></section>
                    <div className="neuro-knowledge-grid">
                      <section className="neuro-card neuro-source-card"><div className="neuro-source-icon"><Cloud size={24} /></div><div><span>{t('公開知識')}</span><strong>Wikipedia</strong><p>{t('免金鑰 · 連網優先')}</p></div><i className={isOnline ? 'online' : ''}>{t(isOnline ? '可用' : '離線')}</i></section>
                      <section className="neuro-card neuro-source-card"><div className="neuro-source-icon local"><Database size={24} /></div><div><span>{t('本機知識')}</span><strong>NeuroFlow Core</strong><p>{t('斷線可用 · 即時檢索')}</p></div><i className="online">{t('就緒')}</i></section>
                    </div>
                    <section className="neuro-card neuro-note-editor"><div className="neuro-card-title"><Plus size={17} /><strong>{t('加入工作區知識')}</strong></div><div className="neuro-note-fields"><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder={t('標題')} /><textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder={t('內容')} /><button type="button" onClick={addNote} disabled={!noteTitle.trim() || !noteContent.trim()}><Plus size={16} />{t('加入')}</button></div></section>
                    <section className="neuro-card"><div className="neuro-card-title"><BookOpen size={17} /><strong>{t('目前證據')}</strong><span>{evidence.length}</span></div><div className="neuro-evidence-list">{[...evidence, ...notes.map((note): KnowledgeHit => ({ id: note.id, title: note.title, content: note.content, source: 'workspace', provider: 'Workspace', score: 1 }))].slice(0, 8).map((item) => <article key={item.id}><div><span>{item.provider}</span><strong>{item.title}</strong><p>{item.content}</p></div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" title={t('開啟來源')}><ExternalLink size={16} /></a>}</article>)}{evidence.length === 0 && notes.length === 0 && <p className="neuro-empty">{t('執行推論或加入工作區知識後，證據會顯示在這裡。')}</p>}</div></section>
                  </div>
                )}

                {view === 'history' && (
                  <div className="neuro-view neuro-history-view">
                    <section className="neuro-view-header"><div><span>{t('實驗紀錄')}</span><h2>{t('推論執行紀錄')}</h2></div><button type="button" className="neuro-primary-small" onClick={exportHistory} disabled={!history.length}><Download size={16} />{t('匯出 JSON')}</button></section>
                    <section className="neuro-history-table"><div className="neuro-history-head"><span>{t('時間')}</span><span>{t('提示')}</span><span>{t('模式')}</span><span>{t('延遲')}</span><span>{t('獎勵')}</span></div>{history.map((run) => <article key={run.id}><span>{new Intl.DateTimeFormat(localeForLanguage(lang), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(run.timestamp))}</span><strong title={run.prompt}>{run.prompt}</strong><span>{t(run.sourceMode === 'online' ? '線上知識' : run.sourceMode === 'fallback' ? '本機備援' : '本機模式')}</span><span>{run.latencyMs} ms</span><span>{Math.round(run.reward * 100)}</span></article>)}{!history.length && <div className="neuro-history-empty"><History size={36} /><strong>{t('尚無實驗紀錄')}</strong><span>{t('完成一次推論後會自動保留。')}</span></div>}</section>
                  </div>
                )}
              </main>

              <aside className="neuro-inspector">
                <section className="neuro-inspector-card">
                  <div className="neuro-card-title"><PanelLeft size={16} /><strong>{t('推論管線')}</strong></div>
                  <div className="neuro-pipeline-list">{trace.stages.map((stage, index) => <article key={stage.id} className={phaseIndex === index ? 'active' : phaseIndex > index ? 'complete' : ''}><i>{index + 1}</i><div><strong>{t(PIPELINE_KEYS[index] ?? stage.label)}</strong><span>{stage.durationMs} ms</span></div><b style={{ ['--stage-load' as string]: stage.load } as React.CSSProperties} /></article>)}</div>
                </section>
                <section className="neuro-inspector-card">
                  <div className="neuro-card-title"><Gauge size={16} /><strong>{t('即時遙測')}</strong></div>
                  <dl className="neuro-telemetry"><div><dt>{t('來源')}</dt><dd>{t(sourceLabel)}</dd></div><div><dt>{t('架構')}</dt><dd>{architecture}</dd></div><div><dt>{t('估計延遲')}</dt><dd>{trace.estimatedLatencyMs} ms</dd></div><div><dt>{t('實際延遲')}</dt><dd>{latencyMs ? `${latencyMs} ms` : '—'}</dd></div><div><dt>{t('證據')}</dt><dd>{evidence.length}</dd></div><div><dt>{t('輸出 Token')}</dt><dd>{outputCount ? `${decoded}/${outputCount}` : '—'}</dd></div><div><dt>{t('上下文')}</dt><dd>{trace.tokens.length * 64}</dd></div></dl>
                </section>
                <section className="neuro-inspector-card neuro-live-source">
                  <div className="neuro-card-title"><Radio size={16} /><strong>{t('來源追蹤')}</strong></div>
                  {evidence.slice(0, 4).map((item) => <article key={item.id}><i className={item.source} /><div><strong>{item.title}</strong><span>{item.provider}</span></div><b>{Math.round(item.score * 100)}</b></article>)}
                  {!evidence.length && <p>{t('目前沒有來源活動。')}</p>}
                </section>
              </aside>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
