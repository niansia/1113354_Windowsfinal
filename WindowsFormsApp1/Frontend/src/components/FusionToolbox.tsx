import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Binary,
  Braces,
  Brush,
  Calculator as CalcIcon,
  Clock,
  Eraser,
  Hash,
  KeyRound,
  Paintbrush,
  Palette,
  Ruler,
  Type,
  Wrench,
  X,
  type LucideIcon
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface FusionToolboxProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

/* ---------------- individual tools ---------------- */

function safeEval(expr: string): string {
  if (!expr.trim()) return '';
  if (!/^[0-9.+\-*/()%\s]*$/.test(expr)) return '';
  try {
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict";return (' + expr + ')')();
    if (r === undefined || r === null || typeof r !== 'number' || Number.isNaN(r) || !Number.isFinite(r)) return '';
    return String(Math.round((r + Number.EPSILON) * 1e10) / 1e10);
  } catch {
    return '';
  }
}

interface CalcKey { label: string; value?: string; act?: 'clear' | 'back'; cls?: string; }

function CalculatorTool() {
  const [expr, setExpr] = useState('');
  const preview = safeEval(expr);
  const evaluate = () => { if (preview !== '') setExpr(preview); };

  const keys: CalcKey[] = [
    { label: 'AC', act: 'clear', cls: 'fn' }, { label: '⌫', act: 'back', cls: 'fn' }, { label: '(', value: '(', cls: 'fn' }, { label: ')', value: ')', cls: 'fn' },
    { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' }, { label: '÷', value: '/', cls: 'op' },
    { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' }, { label: '×', value: '*', cls: 'op' },
    { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '−', value: '-', cls: 'op' },
    { label: '0', value: '0' }, { label: '.', value: '.' }, { label: '%', value: '%' }, { label: '+', value: '+', cls: 'op' }
  ];

  const onKey = (k: CalcKey) => {
    if (k.act === 'clear') setExpr('');
    else if (k.act === 'back') setExpr((v) => v.slice(0, -1));
    else if (k.value !== undefined) setExpr((v) => v + k.value);
  };

  return (
    <div className="calc-wrap">
      <div className="calc">
        <div className="calc-screen">
          <input
            className="calc-expr"
            value={expr}
            placeholder="0"
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); evaluate(); } }}
          />
          <div className="calc-preview">{preview !== '' ? '= ' + preview : ''}</div>
        </div>
        <div className="calc-keys">
          {keys.map((k) => (
            <button key={k.label} type="button" className={`calc-key ${k.cls || ''}`} onClick={() => onKey(k)}>{k.label}</button>
          ))}
          <button type="button" className="calc-key eq" onClick={evaluate}>=</button>
        </div>
      </div>
    </div>
  );
}

const UNIT_GROUPS: Record<string, { units: Record<string, number> }> = {
  length: { units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 } },
  weight: { units: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.0283495 } },
  data: { units: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 } }
};

function UnitTool() {
  const { t } = useI18n();
  const [group, setGroup] = useState<'length' | 'weight' | 'temperature' | 'data'>('length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('km');

  const units = group === 'temperature' ? ['C', 'F', 'K'] : Object.keys(UNIT_GROUPS[group].units);
  useEffect(() => {
    setFrom(units[0]);
    setTo(units[1] ?? units[0]);
  }, [group]);

  const convert = (): string => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return '';
    if (group === 'temperature') {
      const toC = from === 'C' ? n : from === 'F' ? ((n - 32) * 5) / 9 : n - 273.15;
      const out = to === 'C' ? toC : to === 'F' ? (toC * 9) / 5 + 32 : toC + 273.15;
      return out.toFixed(4).replace(/\.?0+$/, '');
    }
    const g = UNIT_GROUPS[group].units;
    const out = (n * g[from]) / g[to];
    return String(out);
  };

  return (
    <div className="tool-form">
      <div className="tool-seg">
        {(['length', 'weight', 'temperature', 'data'] as const).map((gp) => (
          <button key={gp} type="button" className={group === gp ? 'active' : ''} onClick={() => setGroup(gp)}>
            {t(gp === 'length' ? '長度' : gp === 'weight' ? '重量' : gp === 'temperature' ? '溫度' : '資料量')}
          </button>
        ))}
      </div>
      <label className="tool-field"><span>{t('數值')}</span><input value={value} onChange={(e) => setValue(e.target.value)} /></label>
      <div className="tool-row2">
        <label className="tool-field"><span>{t('從')}</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        </label>
        <label className="tool-field"><span>{t('到')}</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        </label>
      </div>
      <div className="tool-result">{convert()} <small>{to}</small></div>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function ColorTool() {
  const { t } = useI18n();
  const [hex, setHex] = useState('#67e8ff');
  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(...rgb) : null;
  return (
    <div className="tool-form">
      <div className="tool-color-row">
        <input type="color" value={hex.match(/^#[0-9a-f]{6}$/i) ? hex : '#67e8ff'} onChange={(e) => setHex(e.target.value)} />
        <input className="tool-color-hex" value={hex} onChange={(e) => setHex(e.target.value)} />
      </div>
      <div className="tool-color-preview" style={{ background: rgb ? hex : '#222' }} />
      <div className="tool-kv"><span>RGB</span><code>{rgb ? `rgb(${rgb.join(', ')})` : '—'}</code></div>
      <div className="tool-kv"><span>HSL</span><code>{hsl ? `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` : '—'}</code></div>
      {!rgb && <div className="tool-hint">{t('請輸入有效的 6 位十六進位色碼')}</div>}
    </div>
  );
}

function Base64Tool() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const enc = () => { try { setText(btoa(unescape(encodeURIComponent(text)))); } catch { /* */ } };
  const dec = () => { try { setText(decodeURIComponent(escape(atob(text)))); } catch { setText(t('無法解碼')); } };
  return (
    <div className="tool-form">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Base64 / text" />
      <div className="tool-actions">
        <button type="button" className="tool-btn" onClick={enc}>{t('編碼')}</button>
        <button type="button" className="tool-btn" onClick={dec}>{t('解碼')}</button>
        <button type="button" className="tool-btn ghost" onClick={() => setText('')}>{t('清除')}</button>
      </div>
    </div>
  );
}

function HashTool() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [algo, setAlgo] = useState('SHA-256');
  const [out, setOut] = useState('');
  const run = async () => {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
    setOut(Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));
  };
  return (
    <div className="tool-form">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('輸入文字')} />
      <div className="tool-row2">
        <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
          <option>SHA-256</option><option>SHA-1</option><option>SHA-512</option>
        </select>
        <button type="button" className="tool-btn" onClick={run}>{t('產生雜湊')}</button>
      </div>
      {out && <div className="tool-output mono">{out}</div>}
    </div>
  );
}

function JsonTool() {
  const { t } = useI18n();
  const [text, setText] = useState('{"hello":"world","items":[1,2,3]}');
  const [error, setError] = useState('');
  const transform = (minify: boolean) => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, minify ? 0 : 2));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="tool-form">
      <textarea className="mono" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="tool-actions">
        <button type="button" className="tool-btn" onClick={() => transform(false)}>{t('格式化')}</button>
        <button type="button" className="tool-btn" onClick={() => transform(true)}>{t('壓縮')}</button>
      </div>
      {error ? <div className="tool-hint err">{tf2(t('無效的 JSON：{0}'), error)}</div> : <div className="tool-hint ok">{t('有效的 JSON')}</div>}
    </div>
  );
}
function tf2(template: string, v: string) { return template.replace('{0}', v); }

function PasswordTool() {
  const { t } = useI18n();
  const [len, setLen] = useState(16);
  const [upper, setUpper] = useState(true);
  const [nums, setNums] = useState(true);
  const [syms, setSyms] = useState(true);
  const [pw, setPw] = useState('');
  const gen = () => {
    let set = 'abcdefghijklmnopqrstuvwxyz';
    if (upper) set += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (nums) set += '0123456789';
    if (syms) set += '!@#$%^&*()-_=+[]{}';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    setPw(Array.from(arr, (n) => set[n % set.length]).join(''));
  };
  useEffect(() => { gen(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="tool-form">
      <div className="tool-output mono lg">{pw || '—'}</div>
      <label className="tool-field"><span>{tf2(t('長度：{0}'), String(len))}</span>
        <input type="range" min={6} max={48} value={len} onChange={(e) => setLen(Number(e.target.value))} />
      </label>
      <div className="tool-checks">
        <label><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> A-Z</label>
        <label><input type="checkbox" checked={nums} onChange={(e) => setNums(e.target.checked)} /> 0-9</label>
        <label><input type="checkbox" checked={syms} onChange={(e) => setSyms(e.target.checked)} /> !@#</label>
      </div>
      <div className="tool-actions">
        <button type="button" className="tool-btn" onClick={gen}>{t('產生')}</button>
        <button type="button" className="tool-btn ghost" onClick={() => navigator.clipboard?.writeText(pw)}>{t('複製')}</button>
      </div>
    </div>
  );
}

function TextTool() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const stats = useMemo(() => ({
    chars: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text ? text.split(/\n/).length : 0
  }), [text]);
  return (
    <div className="tool-form">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('輸入文字')} />
      <div className="tool-stats">
        <span>{tf2(t('{0} 字元'), String(stats.chars))}</span>
        <span>{tf2(t('{0} 字'), String(stats.words))}</span>
        <span>{tf2(t('{0} 行'), String(stats.lines))}</span>
      </div>
      <div className="tool-actions">
        <button type="button" className="tool-btn" onClick={() => setText(text.toUpperCase())}>{t('大寫')}</button>
        <button type="button" className="tool-btn" onClick={() => setText(text.toLowerCase())}>{t('小寫')}</button>
        <button type="button" className="tool-btn ghost" onClick={() => setText('')}>{t('清除')}</button>
      </div>
    </div>
  );
}

function TimeTool() {
  const { t } = useI18n();
  const [unix, setUnix] = useState(String(Math.floor(Date.now() / 1000)));
  const date = new Date(Number(unix) * 1000);
  const valid = !Number.isNaN(date.getTime());
  return (
    <div className="tool-form">
      <label className="tool-field"><span>{t('Unix 時間戳（秒）')}</span>
        <input value={unix} onChange={(e) => setUnix(e.target.value)} />
      </label>
      <button type="button" className="tool-btn" onClick={() => setUnix(String(Math.floor(Date.now() / 1000)))}>{t('目前時間')}</button>
      <div className="tool-kv"><span>{t('本地時間')}</span><code>{valid ? date.toLocaleString() : '—'}</code></div>
      <div className="tool-kv"><span>UTC / ISO</span><code>{valid ? date.toISOString() : '—'}</code></div>
    </div>
  );
}

const PAINT_BG = '#0a1020';

function PaintTool() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#67e8ff');
  const [size, setSize] = useState(8);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [neon, setNeon] = useState(true);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = PAINT_BG;
    ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  }, []);

  const at = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    if (mode === 'eraser') {
      ctx.strokeStyle = PAINT_BG;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = neon ? size * 0.9 : 0;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    const p = at(e);
    last.current = p;
    stroke(p, p);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = at(e);
    stroke(last.current, p);
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };
  const clear = () => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.fillStyle = PAINT_BG;
    ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  };
  const save = () => {
    const c = canvasRef.current!;
    const a = document.createElement('a');
    a.download = 'fusion-paint.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };

  const palette = ['#67e8ff', '#6aa8ff', '#9c7cff', '#d56bff', '#ff6a9e', '#ffb45c', '#7ef6c8', '#ffffff'];

  return (
    <div className="paint">
      <div className="paint-bar">
        <div className="paint-group">
          <button type="button" className={`paint-tool ${mode === 'brush' ? 'active' : ''}`} onClick={() => setMode('brush')} title={t('筆刷')}>
            <Brush size={17} />
          </button>
          <button type="button" className={`paint-tool ${mode === 'eraser' ? 'active' : ''}`} onClick={() => setMode('eraser')} title={t('橡皮擦')}>
            <Eraser size={17} />
          </button>
        </div>
        <div className="paint-swatches">
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              className={`paint-swatch ${color === c && mode === 'brush' ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setMode('brush'); }}
            />
          ))}
          <input type="color" className="paint-color" value={color} onChange={(e) => { setColor(e.target.value); setMode('brush'); }} />
        </div>
        <label className="paint-size">
          <span>{tf2(t('筆刷大小：{0}'), String(size))}</span>
          <input type="range" min={1} max={60} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <button type="button" className={`paint-neon ${neon ? 'active' : ''}`} onClick={() => setNeon((v) => !v)}>✦ {t('霓虹')}</button>
        <span className="paint-grow" />
        <button type="button" className="tool-btn ghost" onClick={clear}>{t('清除')}</button>
        <button type="button" className="tool-btn" onClick={save}>{t('儲存 PNG')}</button>
      </div>
      <canvas
        ref={canvasRef}
        width={760}
        height={460}
        className="paint-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
    </div>
  );
}

interface ToolDef { id: string; label: string; icon: LucideIcon; render: () => React.ReactElement; }
const TOOLS: ToolDef[] = [
  { id: 'calc', label: '計算機', icon: CalcIcon, render: () => <CalculatorTool /> },
  { id: 'unit', label: '單位轉換', icon: Ruler, render: () => <UnitTool /> },
  { id: 'color', label: '顏色工具', icon: Palette, render: () => <ColorTool /> },
  { id: 'base64', label: 'Base64', icon: Binary, render: () => <Base64Tool /> },
  { id: 'hash', label: '雜湊', icon: Hash, render: () => <HashTool /> },
  { id: 'json', label: 'JSON', icon: Braces, render: () => <JsonTool /> },
  { id: 'pw', label: '密碼產生器', icon: KeyRound, render: () => <PasswordTool /> },
  { id: 'text', label: '文字工具', icon: Type, render: () => <TextTool /> },
  { id: 'time', label: '時間戳', icon: Clock, render: () => <TimeTool /> },
  { id: 'paint', label: '小畫家', icon: Paintbrush, render: () => <PaintTool /> }
];

export const FusionToolbox: React.FC<FusionToolboxProps> = ({ open, onClose, accent }) => {
  const { t } = useI18n();
  const [active, setActive] = useState('calc');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const current = TOOLS.find((tool) => tool.id === active) ?? TOOLS[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="set-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
        >
          <motion.div
            className="set-panel tool-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="set-topbar">
              <div className="set-title">
                <Wrench size={20} strokeWidth={1.9} />
                <span>{t('工具箱')}</span>
              </div>
              <button type="button" className="set-close" onClick={onClose} title={t('關閉')}>
                <X size={18} />
              </button>
            </header>

            <div className="tool-body">
              <nav className="tool-side">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button key={tool.id} type="button" className={tool.id === active ? 'active' : ''} onClick={() => setActive(tool.id)}>
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{t(tool.label)}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="tool-main">
                <div className="tool-main-head">
                  <current.icon size={22} strokeWidth={1.8} />
                  <h2>{t(current.label)}</h2>
                </div>
                <div className="tool-main-body">{current.render()}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
