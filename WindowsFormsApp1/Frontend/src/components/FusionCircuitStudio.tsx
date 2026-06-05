import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BatteryCharging,
  ChevronDown,
  CircuitBoard,
  Copy,
  Download,
  Gauge,
  Grid3X3,
  Hand,
  Import,
  Lightbulb,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
  Zap
} from 'lucide-react';
import type {
  CircuitComponent,
  CircuitComponentKind,
  CircuitDocument,
  CircuitSimulationResult,
  TerminalKey
} from '../circuit/circuitTypes';
import { terminalId } from '../circuit/circuitTypes';
import {
  CIRCUIT_PARTS,
  createCircuitComponent,
  formatEngineering,
  getPartDefinition,
  parseCircuitDocument,
  rotateCircuitComponent
} from '../circuit/circuitCatalog';
import { CIRCUIT_TEMPLATES, createLedStarterCircuit } from '../circuit/circuitTemplates';
import { simulateCircuit } from '../circuit/circuitSimulator';
import { useCircuitEditor } from '../circuit/useCircuitEditor';
import { useI18n } from '../i18n/I18nContext';

interface FusionCircuitStudioProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type ToolMode = 'select' | 'pan';
type Point = { x: number; y: number };

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1100;
const GRID = 20;

const snap = (value: number) => Math.round(value / GRID) * GRID;

const terminalPosition = (component: CircuitComponent, terminal: TerminalKey): Point => {
  if (component.kind === 'ground') return { x: component.x, y: component.y - 34 };
  const side = terminal === 'a' ? -1 : 1;
  if (component.rotation === 0) return { x: component.x + side * 72, y: component.y };
  if (component.rotation === 90) return { x: component.x, y: component.y + side * 48 };
  if (component.rotation === 180) return { x: component.x - side * 72, y: component.y };
  return { x: component.x, y: component.y - side * 48 };
};

const terminalPoint = (document: CircuitDocument, id: string) => {
  const separator = id.lastIndexOf(':');
  const component = document.components.find((item) => item.id === id.slice(0, separator));
  if (!component) return null;
  return terminalPosition(component, id.slice(separator + 1) as TerminalKey);
};

const wirePath = (from: Point, to: Point) => {
  if (from.x > to.x + 120 && Math.abs(to.y - from.y) < 28) {
    const returnY = Math.min(WORLD_HEIGHT - 60, Math.max(from.y, to.y) + 220);
    return `M ${from.x} ${from.y} C ${from.x} ${returnY}, ${to.x} ${returnY}, ${to.x} ${to.y}`;
  }
  const dx = Math.abs(to.x - from.x);
  const curve = Math.max(60, dx * 0.42);
  const direction = to.x >= from.x ? 1 : -1;
  return `M ${from.x} ${from.y} C ${from.x + curve * direction} ${from.y}, ${to.x - curve * direction} ${to.y}, ${to.x} ${to.y}`;
};

const componentValue = (component: CircuitComponent, t: (source: string) => string) => {
  switch (component.kind) {
    case 'battery':
    case 'voltage-source':
      return `${component.voltage ?? 0} V`;
    case 'current-source':
      return `${component.current ?? 0} A`;
    case 'resistor':
    case 'potentiometer':
    case 'lamp':
      return formatEngineering(component.resistance ?? 0, 'Ω');
    case 'led':
      return `${component.forwardVoltage ?? 2} V`;
    case 'switch':
      return component.closed ? t('閉合') : t('開路');
    case 'fuse':
      return `${component.ratedCurrent ?? 0.5} A`;
    case 'capacitor':
      return formatEngineering(component.capacitance ?? 0, 'F');
    case 'inductor':
      return formatEngineering(component.inductance ?? 0, 'H');
    case 'ammeter':
      return t('電流');
    case 'voltmeter':
      return t('電壓');
    case 'ground':
      return '0 V';
  }
};

const PartSymbol = ({ component, active }: { component: CircuitComponent; active: boolean }) => {
  const definition = getPartDefinition(component.kind);
  if (component.kind === 'lamp') return <Lightbulb size={30} className={active ? 'is-lit' : ''} />;
  if (component.kind === 'battery') return <BatteryCharging size={31} />;
  if (component.kind === 'led') return <Zap size={28} className={active ? 'is-lit' : ''} />;
  if (component.kind === 'ammeter' || component.kind === 'voltmeter') return <Gauge size={29} />;
  if (component.kind === 'ground') return <span className="circuit-ground-symbol">⏚</span>;
  return <span className="circuit-part-symbol">{definition.symbol}</span>;
};

export const FusionCircuitStudio: React.FC<FusionCircuitStudioProps> = ({ open, onClose, accent }) => {
  const { t, tf } = useI18n();
  const {
    document,
    canUndo,
    canRedo,
    commit,
    replace,
    recordPreview,
    undo,
    redo,
    reset
  } = useCircuitEditor();
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [wireStart, setWireStart] = useState<string | null>(null);
  const [result, setResult] = useState<CircuitSimulationResult>(() => simulateCircuit(document));
  const [autoRun, setAutoRun] = useState(true);
  const [mode, setMode] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState(0.82);
  const [pan, setPan] = useState<Point>({ x: 60, y: 50 });
  const [search, setSearch] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [toast, setToast] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    componentId: string;
    startPointer: Point;
    startPosition: Point;
    before: CircuitDocument;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{ startPointer: Point; startPan: Point } | null>(null);

  const selectedComponent = document.components.find((item) => item.id === selectedComponentId) ?? null;
  const selectedReading = selectedComponent ? result.components[selectedComponent.id] : null;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const runSimulation = useCallback(() => {
    const next = simulateCircuit(document);
    setResult(next);
    notify(next.ok ? t('模擬完成。') : t(next.diagnostics[0]?.message ?? '模擬失敗。'));
  }, [document, notify, t]);

  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(() => setResult(simulateCircuit(document)), 100);
    return () => window.clearTimeout(timer);
  }, [autoRun, document]);

  const boardPoint = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }, [pan, zoom]);

  const clearSelection = () => {
    setSelectedComponentId(null);
    setSelectedWireId(null);
    setWireStart(null);
  };

  const addPart = (kind: CircuitComponentKind) => {
    const offset = document.components.length % 7;
    const component = createCircuitComponent(kind, 280 + offset * 75, 220 + offset * 55, document.components.length + 1);
    commit((current) => ({ ...current, components: [...current.components, component] }));
    setSelectedComponentId(component.id);
    setSelectedWireId(null);
    notify(tf('已新增 {0}。', t(getPartDefinition(kind).name)));
  };

  const updateComponent = (id: string, patch: Partial<CircuitComponent>) => {
    commit((current) => ({
      ...current,
      components: current.components.map((item) => item.id === id ? { ...item, ...patch } : item)
    }));
  };

  const deleteSelection = useCallback(() => {
    if (selectedWireId) {
      commit((current) => ({ ...current, wires: current.wires.filter((wire) => wire.id !== selectedWireId) }));
      setSelectedWireId(null);
      notify(t('已移除導線。'));
      return;
    }
    if (!selectedComponentId) return;
    commit((current) => ({
      ...current,
      components: current.components.filter((component) => component.id !== selectedComponentId),
      wires: current.wires.filter(
        (wire) => !wire.from.startsWith(`${selectedComponentId}:`) && !wire.to.startsWith(`${selectedComponentId}:`)
      )
    }));
    setSelectedComponentId(null);
    notify(t('已移除元件。'));
  }, [commit, notify, selectedComponentId, selectedWireId, t]);

  const duplicateSelected = useCallback(() => {
    if (!selectedComponent) return;
    const duplicate = {
      ...selectedComponent,
      id: `${selectedComponent.kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${selectedComponent.label} ${t('副本')}`,
      x: selectedComponent.x + 40,
      y: selectedComponent.y + 40
    };
    commit((current) => ({ ...current, components: [...current.components, duplicate] }));
    setSelectedComponentId(duplicate.id);
    notify(t('已複製元件。'));
  }, [commit, notify, selectedComponent, t]);

  const rotateSelected = useCallback(() => {
    if (!selectedComponent) return;
    updateComponent(selectedComponent.id, { rotation: rotateCircuitComponent(selectedComponent.rotation) });
  }, [selectedComponent]);

  const connectTerminal = (id: string) => {
    if (!wireStart) {
      setWireStart(id);
      setSelectedWireId(null);
      return;
    }
    if (wireStart === id) {
      setWireStart(null);
      return;
    }
    const duplicate = document.wires.some(
      (wire) => (wire.from === wireStart && wire.to === id) || (wire.from === id && wire.to === wireStart)
    );
    if (!duplicate) {
      commit((current) => ({
        ...current,
        wires: [...current.wires, { id: `wire-${Date.now().toString(36)}`, from: wireStart, to: id }]
      }));
    }
    setWireStart(null);
  };

  const beginComponentDrag = (event: React.PointerEvent, component: CircuitComponent) => {
    if (mode !== 'select' || event.button !== 0) return;
    event.stopPropagation();
    setSelectedComponentId(component.id);
    setSelectedWireId(null);
    dragRef.current = {
      componentId: component.id,
      startPointer: boardPoint(event.clientX, event.clientY),
      startPosition: { x: component.x, y: component.y },
      before: document,
      moved: false
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveComponent = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = boardPoint(event.clientX, event.clientY);
    const x = Math.max(90, Math.min(WORLD_WIDTH - 90, snap(drag.startPosition.x + point.x - drag.startPointer.x)));
    const y = Math.max(70, Math.min(WORLD_HEIGHT - 70, snap(drag.startPosition.y + point.y - drag.startPointer.y)));
    drag.moved = drag.moved || x !== drag.startPosition.x || y !== drag.startPosition.y;
    replace({
      ...document,
      components: document.components.map((item) => item.id === drag.componentId ? { ...item, x, y } : item)
    });
  };

  const endComponentDrag = () => {
    if (dragRef.current?.moved) recordPreview(dragRef.current.before);
    dragRef.current = null;
  };

  const beginBoardPointer = (event: React.PointerEvent) => {
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains('circuit-world-grid')) return;
    if (mode === 'pan' || event.button === 1) {
      panRef.current = { startPointer: { x: event.clientX, y: event.clientY }, startPan: pan };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } else {
      clearSelection();
    }
  };

  const moveBoardPointer = (event: React.PointerEvent) => {
    if (!panRef.current) return;
    setPan({
      x: panRef.current.startPan.x + event.clientX - panRef.current.startPointer.x,
      y: panRef.current.startPan.y + event.clientY - panRef.current.startPointer.y
    });
  };

  const endBoardPointer = () => {
    panRef.current = null;
  };

  const zoomBoard = (event: React.WheelEvent) => {
    event.preventDefault();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextZoom = Math.max(0.42, Math.min(1.8, zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - pan.x) / zoom;
    const worldY = (cursorY - pan.y) / zoom;
    setZoom(nextZoom);
    setPan({ x: cursorX - worldX * nextZoom, y: cursorY - worldY * nextZoom });
  };

  const saveProject = () => {
    window.localStorage.setItem('fusion-circuit-studio-saved-v1', JSON.stringify(document));
    notify(t('專案已儲存至本機。'));
  };

  const loadProject = () => {
    try {
      const saved = window.localStorage.getItem('fusion-circuit-studio-saved-v1');
      if (!saved) throw new Error('目前沒有可載入的已儲存專案。');
      reset(parseCircuitDocument(saved));
      clearSelection();
      notify(t('已載入儲存的專案。'));
    } catch (error) {
      notify(t(error instanceof Error ? error.message : '無法載入專案。'));
    }
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${document.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'fusion-circuit'}.fusion-circuit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(t('專案已匯出。'));
  };

  const importProject = async (file: File) => {
    try {
      reset(parseCircuitDocument(await file.text()));
      clearSelection();
      notify(t('專案已匯入。'));
    } catch (error) {
      notify(t(error instanceof Error ? error.message : '無法匯入專案。'));
    }
  };

  const useTemplate = (create: () => CircuitDocument) => {
    reset(create());
    clearSelection();
    setTemplateOpen(false);
    notify(t('範本已載入。'));
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === 'Escape') {
        if (wireStart) setWireStart(null);
        else onClose();
        return;
      }
      if (editing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      } else if (event.key.toLowerCase() === 'r') {
        rotateSelected();
      } else if (event.key === ' ') {
        event.preventDefault();
        setMode((current) => current === 'pan' ? 'select' : 'pan');
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [deleteSelection, duplicateSelected, onClose, open, redo, rotateSelected, undo, wireStart]);

  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CIRCUIT_PARTS.filter((part) =>
      !query || `${t(part.name)} ${t(part.description)} ${t(part.group)}`.toLowerCase().includes(query)
    );
  }, [search, t]);

  const groupedParts = useMemo(() => {
    const groups = new Map<string, typeof CIRCUIT_PARTS>();
    for (const part of filteredParts) groups.set(part.group, [...(groups.get(part.group) ?? []), part]);
    return [...groups.entries()];
  }, [filteredParts]);

  const diagnosticMessage = (diagnostic: CircuitSimulationResult['diagnostics'][number]) => {
    if (diagnostic.code === 'FUSE_OVERLOAD' && diagnostic.componentId) {
      const component = document.components.find((item) => item.id === diagnostic.componentId);
      return tf(
        '{0} 超過 {1} A 額定電流，保險絲已開路。',
        component?.label ?? diagnostic.componentId,
        component?.ratedCurrent ?? 0.5
      );
    }
    return t(diagnostic.message);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="circuit-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
        >
          <motion.div
            className="circuit-studio"
            initial={{ opacity: 0, scale: 0.975 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
          >
            <header className="circuit-topbar">
              <div className="circuit-brand">
                <span className="circuit-brand-icon"><CircuitBoard size={23} /></span>
                <div>
                  <strong>{t('電路工作室')}</strong>
                  <span>{t('空間直流電路設計與模擬')}</span>
                </div>
              </div>

              <div className="circuit-toolbar">
                <div className="circuit-template-wrap">
                  <button type="button" onClick={() => setTemplateOpen((value) => !value)}>
                    <Sparkles size={16} /> {t('範本')} <ChevronDown size={14} />
                  </button>
                  {templateOpen && (
                    <div className="circuit-template-menu">
                      {CIRCUIT_TEMPLATES.map((template) => (
                        <button key={template.id} type="button" onClick={() => useTemplate(template.create)}>
                          <strong>{t(template.name)}</strong>
                          <span>{t(template.description)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="circuit-tool-separator" />
                <button type="button" disabled={!canUndo} onClick={undo} title={t('復原（Ctrl+Z）')}><Undo2 size={17} /></button>
                <button type="button" disabled={!canRedo} onClick={redo} title={t('重做（Ctrl+Y）')}><Redo2 size={17} /></button>
                <button type="button" disabled={!selectedComponent} onClick={rotateSelected} title={t('旋轉（R）')}><RotateCw size={17} /></button>
                <button type="button" disabled={!selectedComponent} onClick={duplicateSelected} title={t('複製（Ctrl+D）')}><Copy size={17} /></button>
                <button type="button" disabled={!selectedComponentId && !selectedWireId} onClick={deleteSelection} title={t('刪除')}><Trash2 size={17} /></button>
                <span className="circuit-tool-separator" />
                <button type="button" onClick={saveProject} title={t('儲存至本機')}><Save size={17} /></button>
                <button type="button" onClick={loadProject} title={t('載入本機儲存')}><Upload size={17} /></button>
                <button type="button" onClick={() => fileInputRef.current?.click()} title={t('匯入專案')}><Import size={17} /></button>
                <button type="button" onClick={exportProject} title={t('匯出專案')}><Download size={17} /></button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.fusion-circuit.json"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importProject(file);
                    event.target.value = '';
                  }}
                />
              </div>

              <div className="circuit-run-controls">
                <button
                  type="button"
                  className={`circuit-auto ${autoRun ? 'active' : ''}`}
                  onClick={() => setAutoRun((value) => !value)}
                  title={t('切換即時模擬')}
                >
                  {autoRun ? <Activity size={16} /> : <Pause size={16} />} {t('即時')}
                </button>
                <button type="button" className="circuit-run" onClick={runSimulation}>
                  <Play size={17} fill="currentColor" /> {t('執行測試')}
                </button>
                <button type="button" className="circuit-close" onClick={onClose} title={t('關閉電路工作室')}>
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="circuit-body">
              <aside className="circuit-library">
                <div className="circuit-panel-heading">
                  <div><strong>{t('元件庫')}</strong><span>{tf('{0} 個精密元件', CIRCUIT_PARTS.length)}</span></div>
                </div>
                <label className="circuit-search">
                  <Search size={15} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('搜尋元件')} />
                </label>
                <div className="circuit-library-scroll">
                  {groupedParts.map(([group, parts]) => (
                    <section key={group} className="circuit-part-group">
                      <span>{t(group)}</span>
                      <div>
                        {parts.map((part) => (
                          <button key={part.kind} type="button" onClick={() => addPart(part.kind)} style={{ ['--part-color' as string]: part.color }}>
                            <i>{part.symbol}</i>
                            <span><strong>{t(part.name)}</strong><small>{t(part.description)}</small></span>
                            <b>+</b>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </aside>

              <main className="circuit-canvas-shell">
                <div className="circuit-canvas-tools">
                  <button type="button" className={mode === 'select' ? 'active' : ''} onClick={() => setMode('select')} title={t('選取工具')}>
                    <MousePointer2 size={17} />
                  </button>
                  <button type="button" className={mode === 'pan' ? 'active' : ''} onClick={() => setMode('pan')} title={t('平移工具（空白鍵）')}>
                    <Hand size={17} />
                  </button>
                  <span />
                  <button type="button" onClick={() => { setZoom(0.82); setPan({ x: 60, y: 50 }); }} title={t('重設檢視')}>
                    <Grid3X3 size={17} />
                  </button>
                  <b>{Math.round(zoom * 100)}%</b>
                </div>

                <div
                  ref={boardRef}
                  className={`circuit-board mode-${mode}`}
                  onPointerDown={beginBoardPointer}
                  onPointerMove={moveBoardPointer}
                  onPointerUp={endBoardPointer}
                  onPointerCancel={endBoardPointer}
                  onWheel={zoomBoard}
                >
                  <div
                    className="circuit-world circuit-world-grid"
                    style={{
                      width: WORLD_WIDTH,
                      height: WORLD_HEIGHT,
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
                    }}
                  >
                    <svg className="circuit-wires" width={WORLD_WIDTH} height={WORLD_HEIGHT}>
                      <defs>
                        <filter id="wireGlow">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      {document.wires.map((wire) => {
                        const from = terminalPoint(document, wire.from);
                        const to = terminalPoint(document, wire.to);
                        if (!from || !to) return null;
                        const current = Math.max(
                          ...document.components
                            .filter((component) => wire.from.startsWith(`${component.id}:`) || wire.to.startsWith(`${component.id}:`))
                            .map((component) => Math.abs(result.components[component.id]?.current ?? 0)),
                          0
                        );
                        const energized = result.ok && current > 1e-6;
                        return (
                          <g key={wire.id} className={`circuit-wire ${selectedWireId === wire.id ? 'selected' : ''} ${energized ? 'energized' : ''}`}>
                            <path className="wire-hit" d={wirePath(from, to)} onClick={(event) => { event.stopPropagation(); setSelectedWireId(wire.id); setSelectedComponentId(null); }} />
                            <path className="wire-core" d={wirePath(from, to)} />
                            {energized && <path className="wire-flow" d={wirePath(from, to)} />}
                          </g>
                        );
                      })}
                    </svg>

                    {document.components.map((component) => {
                      const definition = getPartDefinition(component.kind);
                      const reading = result.components[component.id];
                      const selected = component.id === selectedComponentId;
                      return (
                        <div
                          key={component.id}
                          className={`circuit-component kind-${component.kind} ${selected ? 'selected' : ''} ${reading?.active ? 'active' : ''} ${reading?.overloaded ? 'overloaded' : ''}`}
                          style={{
                            left: component.x,
                            top: component.y,
                            transform: `translate(-50%, -50%) rotate(${component.rotation}deg)`,
                            ['--part-color' as string]: definition.color
                          }}
                          onPointerDown={(event) => beginComponentDrag(event, component)}
                          onPointerMove={moveComponent}
                          onPointerUp={endComponentDrag}
                          onPointerCancel={endComponentDrag}
                          onClick={(event) => { event.stopPropagation(); setSelectedComponentId(component.id); setSelectedWireId(null); }}
                          onDoubleClick={() => component.kind === 'switch' && updateComponent(component.id, { closed: !component.closed })}
                        >
                          {component.kind !== 'ground' && (
                            <button
                              type="button"
                              className={`circuit-terminal terminal-a ${wireStart === terminalId(component.id, 'a') ? 'connecting' : ''}`}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => { event.stopPropagation(); connectTerminal(terminalId(component.id, 'a')); }}
                              title={tf('{0} 端子 A', component.label)}
                            />
                          )}
                          <div className="circuit-component-face" style={{ transform: `rotate(${-component.rotation}deg)` }}>
                            <PartSymbol component={component} active={Boolean(reading?.active)} />
                            <strong>{component.label}</strong>
                            <span>{componentValue(component, t)}</span>
                          </div>
                          <div className="circuit-component-reading" style={{ transform: `rotate(${-component.rotation}deg)` }}>
                            {reading ? formatEngineering(Math.abs(reading.current), 'A') : t('尚未測試')}
                          </div>
                          {component.kind !== 'ground' ? (
                            <button
                              type="button"
                              className={`circuit-terminal terminal-b ${wireStart === terminalId(component.id, 'b') ? 'connecting' : ''}`}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => { event.stopPropagation(); connectTerminal(terminalId(component.id, 'b')); }}
                              title={tf('{0} 端子 B', component.label)}
                            />
                          ) : (
                            <button
                              type="button"
                              className={`circuit-terminal terminal-ground ${wireStart === terminalId(component.id, 'a') ? 'connecting' : ''}`}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => { event.stopPropagation(); connectTerminal(terminalId(component.id, 'a')); }}
                              title={tf('{0} 參考端子', component.label)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="circuit-status-strip">
                  <span className={result.ok ? 'ok' : 'error'}><i />{result.ok ? t('電路已求解') : t('電路需要處理')}</span>
                  <span>{tf('{0} 個元件', document.components.length)}</span>
                  <span>{tf('{0} 條導線', document.wires.length)}</span>
                  <span>{t('總電流')} {formatEngineering(result.totalCurrent, 'A')}</span>
                  <span>{t('功率')} {formatEngineering(result.totalPower, 'W')}</span>
                  {wireStart && <strong>{t('請選取另一個端子以完成導線。')}</strong>}
                </div>
              </main>

              <aside className="circuit-inspector">
                <div className="circuit-panel-heading">
                  <div><strong>{t('檢查器')}</strong><span>{t('屬性與即時讀值')}</span></div>
                </div>

                {selectedComponent ? (
                  <div className="circuit-inspector-scroll">
                    <section className="circuit-inspector-card identity">
                      <div className="circuit-inspector-symbol" style={{ ['--part-color' as string]: getPartDefinition(selectedComponent.kind).color }}>
                        <PartSymbol component={selectedComponent} active={Boolean(selectedReading?.active)} />
                      </div>
                      <div>
                        <span>{t(getPartDefinition(selectedComponent.kind).name)}</span>
                        <input value={selectedComponent.label} onChange={(event) => updateComponent(selectedComponent.id, { label: event.target.value })} />
                      </div>
                    </section>

                    <section className="circuit-property-section">
                      <h3>{t('元件數值')}</h3>
                      {(selectedComponent.kind === 'battery' || selectedComponent.kind === 'voltage-source') && (
                        <label><span>{t('電壓')}</span><input type="number" step="0.1" value={selectedComponent.voltage ?? 0} onChange={(event) => updateComponent(selectedComponent.id, { voltage: Number(event.target.value) })} /><b>V</b></label>
                      )}
                      {selectedComponent.kind === 'current-source' && (
                        <label><span>{t('電流')}</span><input type="number" step="0.001" value={selectedComponent.current ?? 0} onChange={(event) => updateComponent(selectedComponent.id, { current: Number(event.target.value) })} /><b>A</b></label>
                      )}
                      {(['resistor', 'potentiometer', 'lamp'] as CircuitComponentKind[]).includes(selectedComponent.kind) && (
                        <label><span>{t('電阻值')}</span><input type="number" min="0.001" step="1" value={selectedComponent.resistance ?? 0} onChange={(event) => updateComponent(selectedComponent.id, { resistance: Math.max(0.001, Number(event.target.value)) })} /><b>Ω</b></label>
                      )}
                      {selectedComponent.kind === 'led' && (
                        <>
                          <label><span>{t('順向電壓')}</span><input type="number" min="0" step="0.1" value={selectedComponent.forwardVoltage ?? 2} onChange={(event) => updateComponent(selectedComponent.id, { forwardVoltage: Math.max(0, Number(event.target.value)) })} /><b>V</b></label>
                          <label><span>{t('動態電阻')}</span><input type="number" min="0.1" step="0.1" value={selectedComponent.resistance ?? 1} onChange={(event) => updateComponent(selectedComponent.id, { resistance: Math.max(0.1, Number(event.target.value)) })} /><b>Ω</b></label>
                        </>
                      )}
                      {selectedComponent.kind === 'fuse' && (
                        <label><span>{t('額定電流')}</span><input type="number" min="0.001" step="0.01" value={selectedComponent.ratedCurrent ?? 0.5} onChange={(event) => updateComponent(selectedComponent.id, { ratedCurrent: Math.max(0.001, Number(event.target.value)) })} /><b>A</b></label>
                      )}
                      {selectedComponent.kind === 'capacitor' && (
                        <label><span>{t('電容量')}</span><input type="number" min="0" step="0.000001" value={selectedComponent.capacitance ?? 0} onChange={(event) => updateComponent(selectedComponent.id, { capacitance: Math.max(0, Number(event.target.value)) })} /><b>F</b></label>
                      )}
                      {selectedComponent.kind === 'inductor' && (
                        <label><span>{t('電感量')}</span><input type="number" min="0" step="0.001" value={selectedComponent.inductance ?? 0} onChange={(event) => updateComponent(selectedComponent.id, { inductance: Math.max(0, Number(event.target.value)) })} /><b>H</b></label>
                      )}
                      {selectedComponent.kind === 'switch' && (
                        <button type="button" className={`circuit-switch-toggle ${selectedComponent.closed ? 'closed' : ''}`} onClick={() => updateComponent(selectedComponent.id, { closed: !selectedComponent.closed })}>
                          <i /><span>{selectedComponent.closed ? t('閉合接點') : t('開路接點')}</span>
                        </button>
                      )}
                    </section>

                    <section className="circuit-reading-grid">
                      <div><span>{t('電壓')}</span><strong>{selectedReading ? formatEngineering(selectedReading.voltage, 'V') : '--'}</strong></div>
                      <div><span>{t('電流')}</span><strong>{selectedReading ? formatEngineering(selectedReading.current, 'A') : '--'}</strong></div>
                      <div><span>{t('功率')}</span><strong>{selectedReading ? formatEngineering(selectedReading.power, 'W') : '--'}</strong></div>
                      <div><span>{t('狀態')}</span><strong>{selectedReading?.overloaded ? t('過載') : selectedReading?.active ? t('啟用') : t('閒置')}</strong></div>
                    </section>

                    <section className="circuit-position-section">
                      <h3>{t('位置')}</h3>
                      <div><span>X {Math.round(selectedComponent.x)}</span><span>Y {Math.round(selectedComponent.y)}</span><span>{selectedComponent.rotation}°</span></div>
                      <div className="circuit-inspector-actions">
                        <button type="button" onClick={rotateSelected}><RotateCw size={15} /> {t('旋轉')}</button>
                        <button type="button" onClick={duplicateSelected}><Copy size={15} /> {t('複製')}</button>
                        <button type="button" className="danger" onClick={deleteSelection}><Trash2 size={15} /> {t('刪除')}</button>
                      </div>
                    </section>
                  </div>
                ) : selectedWireId ? (
                  <div className="circuit-wire-inspector">
                    <Zap size={30} />
                    <strong>{t('已選取導線')}</strong>
                    <p>{t('連接的分支通電時會顯示電流路徑動畫。')}</p>
                    <button type="button" onClick={deleteSelection}><Trash2 size={15} /> {t('移除導線')}</button>
                  </div>
                ) : (
                  <div className="circuit-empty-inspector">
                    <CircuitBoard size={42} />
                    <strong>{t('選取元件')}</strong>
                    <p>{t('可編輯數值、旋轉元件、檢查讀值，或選取導線加以移除。')}</p>
                  </div>
                )}

                <section className="circuit-diagnostics">
                  <div><strong>{t('模擬診斷')}</strong><span>{result.diagnostics.length}</span></div>
                  {result.diagnostics.length ? result.diagnostics.map((diagnostic, index) => (
                    <p key={`${diagnostic.code}-${index}`} className={diagnostic.severity}>
                      <i />{diagnosticMessage(diagnostic)}
                    </p>
                  )) : <p className="clear"><i />{t('未偵測到電氣衝突。')}</p>}
                </section>
              </aside>
            </div>

            {toast && <div className="circuit-toast">{toast}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
