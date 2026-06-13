import React, { useRef } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import {
  insertMathToken,
  resizeMatrixGrid,
  type EditableGraphRow
} from '../../math/index';

export interface OperationOption {
  value: string;
  label: string;
  formula?: string;
}

export function OperationPicker({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: OperationOption[];
}) {
  return (
    <div className="emath-operation-picker">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          {option.formula && <span>{option.formula}</span>}
        </button>
      ))}
    </div>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  compact = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  compact?: boolean;
}) {
  const nudge = (direction: number) => {
    const current = Number(value);
    const fallback = Number.isFinite(current) ? current : 0;
    let next = fallback + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(String(Number(next.toFixed(10))));
  };

  return (
    <label className={`emath-number-control${compact ? ' compact' : ''}`}>
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => nudge(-1)} aria-label={`${label} -`}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={() => nudge(1)} aria-label={`${label} +`}>
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
}

export interface FormulaKey {
  label: string;
  token: string;
  caretOffset?: number;
}

export function FormulaEditor({
  label,
  value,
  onChange,
  keys,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keys: FormulaKey[];
  hint?: string;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const insert = (key: FormulaKey) => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? value.length;
    const end = editor?.selectionEnd ?? value.length;
    const next = insertMathToken(value, start, end, key.token, key.caretOffset);
    onChange(next.value);
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className="emath-formula-editor">
      <label>
        <span>{label}</span>
        <textarea
          ref={editorRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="emath-formula-keys">
        {keys.map((key) => (
          <button
            key={`${key.label}-${key.token}`}
            type="button"
            onClick={() => insert(key)}
          >
            {key.label}
          </button>
        ))}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function MatrixEditor({
  label,
  value,
  onChange,
  rowsLabel,
  columnsLabel,
  hint,
  fixedColumns
}: {
  label: string;
  value: string[][];
  onChange: (value: string[][]) => void;
  rowsLabel: string;
  columnsLabel: string;
  hint?: string;
  fixedColumns?: number;
}) {
  const rows = value.length;
  const columns = fixedColumns ?? value[0]?.length ?? 1;
  const setSize = (nextRows: number, nextColumns: number) => {
    onChange(resizeMatrixGrid(value, Math.max(1, Math.min(6, nextRows)), Math.max(1, Math.min(6, nextColumns))));
  };
  const updateCell = (rowIndex: number, columnIndex: number, nextValue: string) => {
    onChange(value.map((row, currentRow) =>
      row.map((cell, currentColumn) =>
        currentRow === rowIndex && currentColumn === columnIndex ? nextValue : cell
      )
    ));
  };

  return (
    <section className="emath-matrix-editor">
      <header>
        <div>
          <strong>{label}</strong>
          {hint && <small>{hint}</small>}
        </div>
        <div className="emath-dimension-controls">
          <NumberControl
            label={rowsLabel}
            value={String(rows)}
            min={1}
            max={6}
            onChange={(next) => setSize(Number(next) || 1, columns)}
            compact
          />
          {!fixedColumns && (
            <NumberControl
              label={columnsLabel}
              value={String(columns)}
              min={1}
              max={6}
              onChange={(next) => setSize(rows, Number(next) || 1)}
              compact
            />
          )}
        </div>
      </header>
      <div
        className="emath-matrix-cells"
        style={{ gridTemplateColumns: `26px repeat(${columns}, minmax(52px, 1fr))` }}
      >
        <span />
        {Array.from({ length: columns }, (_, columnIndex) => (
          <span key={`column-${columnIndex}`} className="emath-matrix-index">
            {columnIndex + 1}
          </span>
        ))}
        {value.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            <span className="emath-matrix-index">{rowIndex + 1}</span>
            {row.map((cell, columnIndex) => (
              <input
                key={`${rowIndex}-${columnIndex}`}
                type="number"
                inputMode="decimal"
                value={cell}
                placeholder="0"
                onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                aria-label={`${label} ${rowIndex + 1},${columnIndex + 1}`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

export function SeriesEditor({
  label,
  values,
  onChange,
  addLabel,
  removeLabel
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel: string;
  removeLabel: string;
}) {
  const update = (index: number, value: string) => {
    onChange(values.map((current, currentIndex) => currentIndex === index ? value : current));
  };
  return (
    <section className="emath-series-editor">
      <header>
        <strong>{label}</strong>
        <button type="button" onClick={() => onChange([...values, ''])}>
          <Plus size={14} /> {addLabel}
        </button>
      </header>
      <div className="emath-series-grid">
        {values.map((value, index) => (
          <label key={index}>
            <span>{index + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(event) => update(index, event.target.value)}
            />
            <button
              type="button"
              title={removeLabel}
              aria-label={removeLabel}
              disabled={values.length === 1}
              onClick={() => onChange(values.filter((_, currentIndex) => currentIndex !== index))}
            >
              <Trash2 size={13} />
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}

export function PairedSeriesEditor({
  xValues,
  yValues,
  onChange,
  addLabel,
  removeLabel
}: {
  xValues: string[];
  yValues: string[];
  onChange: (xValues: string[], yValues: string[]) => void;
  addLabel: string;
  removeLabel: string;
}) {
  const length = Math.max(xValues.length, yValues.length, 1);
  const x = Array.from({ length }, (_, index) => xValues[index] ?? '');
  const y = Array.from({ length }, (_, index) => yValues[index] ?? '');
  const update = (axis: 'x' | 'y', index: number, value: string) => {
    const nextX = [...x];
    const nextY = [...y];
    if (axis === 'x') nextX[index] = value;
    else nextY[index] = value;
    onChange(nextX, nextY);
  };

  return (
    <section className="emath-paired-editor">
      <header>
        <strong>X / Y</strong>
        <button type="button" onClick={() => onChange([...x, ''], [...y, ''])}>
          <Plus size={14} /> {addLabel}
        </button>
      </header>
      <div className="emath-paired-table">
        <div className="head">#</div>
        <div className="head">X</div>
        <div className="head">Y</div>
        <div className="head" />
        {Array.from({ length }, (_, index) => (
          <React.Fragment key={index}>
            <span>{index + 1}</span>
            <input type="number" value={x[index]} onChange={(event) => update('x', index, event.target.value)} />
            <input type="number" value={y[index]} onChange={(event) => update('y', index, event.target.value)} />
            <button
              type="button"
              title={removeLabel}
              aria-label={removeLabel}
              disabled={length === 1}
              onClick={() => onChange(x.filter((_, currentIndex) => currentIndex !== index), y.filter((_, currentIndex) => currentIndex !== index))}
            >
              <Trash2 size={13} />
            </button>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

export function GraphEdgeEditor({
  rows,
  onChange,
  labels
}: {
  rows: EditableGraphRow[];
  onChange: (rows: EditableGraphRow[]) => void;
  labels: {
    edge: string;
    from: string;
    to: string;
    weight: string;
    add: string;
    remove: string;
  };
}) {
  const update = (id: string, key: 'from' | 'to' | 'weight', value: string) => {
    onChange(rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
  };
  return (
    <section className="emath-edge-editor">
      <header>
        <strong>{labels.edge}</strong>
        <button
          type="button"
          onClick={() => onChange([...rows, { id: `edge-${Date.now()}`, from: '', to: '', weight: '1' }])}
        >
          <Plus size={14} /> {labels.add}
        </button>
      </header>
      <div className="emath-edge-table">
        <span className="head">#</span>
        <span className="head">{labels.from}</span>
        <span className="head">{labels.to}</span>
        <span className="head">{labels.weight}</span>
        <span className="head" />
        {rows.map((row, index) => (
          <React.Fragment key={row.id}>
            <span>{index + 1}</span>
            <input value={row.from} onChange={(event) => update(row.id, 'from', event.target.value)} />
            <input value={row.to} onChange={(event) => update(row.id, 'to', event.target.value)} />
            <input type="number" value={row.weight} placeholder="1" onChange={(event) => update(row.id, 'weight', event.target.value)} />
            <button
              type="button"
              title={labels.remove}
              aria-label={labels.remove}
              disabled={rows.length === 1}
              onClick={() => onChange(rows.filter((current) => current.id !== row.id))}
            >
              <Trash2 size={13} />
            </button>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
