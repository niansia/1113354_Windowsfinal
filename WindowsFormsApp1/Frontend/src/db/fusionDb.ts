// A small but real relational store for the FusionOS Database app. Tables + typed
// columns + rows, persisted to localStorage, with a working SQL subset
// (SELECT/INSERT/UPDATE/DELETE/CREATE TABLE/DROP TABLE). It is intentionally
// self-contained (no backend, no deps) so it behaves identically in the browser
// preview and inside the WinForms WebView.

export type CellValue = string | number | null;
export type ColumnType = 'text' | 'integer' | 'real';

export interface Column {
  name: string;
  type: ColumnType;
}

export interface Table {
  name: string;
  columns: Column[];
  rows: Record<string, CellValue>[];
}

interface DatabaseState {
  tables: Table[];
}

export type QueryResult =
  | { kind: 'rows'; columns: string[]; rows: CellValue[][] }
  | { kind: 'mutation'; affected: number; message: string }
  | { kind: 'error'; message: string };

const STORAGE_KEY = 'fusionDb.v1';

function seed(): DatabaseState {
  return {
    tables: [
      {
        name: 'members',
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'text' },
          { name: 'role', type: 'text' },
          { name: 'joined', type: 'text' }
        ],
        rows: [
          { id: 1, name: '若安', role: '管理員', joined: '2026-01-12' },
          { id: 2, name: '星璃', role: '設計師', joined: '2026-02-03' },
          { id: 3, name: '凱文', role: '開發者', joined: '2026-03-21' },
          { id: 4, name: '林月', role: '開發者', joined: '2026-04-08' }
        ]
      },
      {
        name: 'projects',
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'title', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'owner', type: 'text' }
        ],
        rows: [
          { id: 1, title: 'FusionOS Shell', status: '執行中', owner: '若安' },
          { id: 2, title: 'Gesture Engine', status: '執行中', owner: '凱文' },
          { id: 3, title: 'Cosmic Atlas', status: '已暫停', owner: '星璃' },
          { id: 4, title: 'Audio Studio', status: '已完成', owner: '林月' }
        ]
      }
    ]
  };
}

function load(): DatabaseState {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && Array.isArray(parsed.tables)) return parsed;
    }
  } catch {
    /* corrupt / unavailable */
  }
  return seed();
}

let state: DatabaseState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

function findTable(name: string): Table | undefined {
  const lower = name.toLowerCase();
  return state.tables.find((t) => t.name.toLowerCase() === lower);
}

function coerce(value: CellValue, type: ColumnType): CellValue {
  if (value === null || value === undefined) return null;
  if (type === 'integer') {
    const n = parseInt(String(value), 10);
    return Number.isNaN(n) ? null : n;
  }
  if (type === 'real') {
    const n = parseFloat(String(value));
    return Number.isNaN(n) ? null : n;
  }
  return String(value);
}

/* ---------------- SQL subset ---------------- */

interface Condition {
  col: string;
  op: string;
  value: CellValue;
}

function parseLiteral(token: string): CellValue {
  const t = token.trim();
  if (/^null$/i.test(t)) return null;
  const m = t.match(/^'(.*)'$/s) || t.match(/^"(.*)"$/s);
  if (m) return m[1];
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d*\.\d+$/.test(t)) return parseFloat(t);
  return t; // bareword -> treat as text
}

function splitTopLevel(input: string, separator: ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let buf = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === separator && depth === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== '') out.push(buf);
  return out;
}

function parseConditions(where: string): Condition[] {
  return where
    .split(/\s+and\s+/i)
    .map((part) => {
      const m = part.trim().match(/^([\w]+)\s*(<>|!=|>=|<=|=|>|<|like)\s*(.+)$/i);
      if (!m) throw new Error('WHERE: ' + part.trim());
      return { col: m[1], op: m[2].toLowerCase(), value: parseLiteral(m[3]) };
    });
}

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp('^' + escaped + '$', 'i');
}

function rowMatches(row: Record<string, CellValue>, conditions: Condition[]): boolean {
  return conditions.every((c) => {
    const cell = row[c.col];
    switch (c.op) {
      case '=':
        return String(cell) === String(c.value);
      case '!=':
      case '<>':
        return String(cell) !== String(c.value);
      case '>':
        return Number(cell) > Number(c.value);
      case '<':
        return Number(cell) < Number(c.value);
      case '>=':
        return Number(cell) >= Number(c.value);
      case '<=':
        return Number(cell) <= Number(c.value);
      case 'like':
        return likeToRegExp(String(c.value)).test(String(cell ?? ''));
      default:
        return false;
    }
  });
}

function runSql(sql: string): QueryResult {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (!trimmed) return { kind: 'error', message: 'EMPTY' };

  try {
    // SELECT
    let m = trimmed.match(/^select\s+(.+?)\s+from\s+([\w]+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+([\w]+)(\s+desc|\s+asc)?)?(?:\s+limit\s+(\d+))?$/is);
    if (m) {
      const table = findTable(m[2]);
      if (!table) return { kind: 'error', message: 'NO_TABLE:' + m[2] };
      const cols = m[1].trim() === '*' ? table.columns.map((c) => c.name) : m[1].split(',').map((c) => c.trim());
      let rows = table.rows.slice();
      if (m[3]) {
        const conditions = parseConditions(m[3]);
        rows = rows.filter((r) => rowMatches(r, conditions));
      }
      if (m[4]) {
        const dir = (m[5] || '').trim().toLowerCase() === 'desc' ? -1 : 1;
        rows = rows.slice().sort((a, b) => {
          const av = a[m![4]];
          const bv = b[m![4]];
          if (av === bv) return 0;
          if (av === null) return -1 * dir;
          if (bv === null) return 1 * dir;
          return (av < bv ? -1 : 1) * dir;
        });
      }
      if (m[6]) rows = rows.slice(0, parseInt(m[6], 10));
      return { kind: 'rows', columns: cols, rows: rows.map((r) => cols.map((c) => r[c] ?? null)) };
    }

    // INSERT INTO t (cols) VALUES (vals)
    m = trimmed.match(/^insert\s+into\s+([\w]+)\s*(?:\(([^)]+)\))?\s*values\s*\((.+)\)$/is);
    if (m) {
      const table = findTable(m[1]);
      if (!table) return { kind: 'error', message: 'NO_TABLE:' + m[1] };
      const cols = m[2] ? m[2].split(',').map((c) => c.trim()) : table.columns.map((c) => c.name);
      const vals = splitTopLevel(m[3], ',').map((v) => parseLiteral(v));
      if (cols.length !== vals.length) return { kind: 'error', message: 'COLUMN_COUNT' };
      const row: Record<string, CellValue> = {};
      table.columns.forEach((c) => (row[c.name] = null));
      cols.forEach((c, i) => {
        const def = table.columns.find((d) => d.name === c);
        row[c] = def ? coerce(vals[i], def.type) : vals[i];
      });
      table.rows.push(row);
      persist();
      return { kind: 'mutation', affected: 1, message: 'INSERT' };
    }

    // UPDATE t SET a=1, b=2 WHERE ...
    m = trimmed.match(/^update\s+([\w]+)\s+set\s+(.+?)(?:\s+where\s+(.+))?$/is);
    if (m) {
      const table = findTable(m[1]);
      if (!table) return { kind: 'error', message: 'NO_TABLE:' + m[1] };
      const assigns = splitTopLevel(m[2], ',').map((a) => {
        const am = a.match(/^([\w]+)\s*=\s*(.+)$/s);
        if (!am) throw new Error('SET: ' + a);
        return { col: am[1].trim(), value: parseLiteral(am[2]) };
      });
      const conditions = m[3] ? parseConditions(m[3]) : [];
      let affected = 0;
      table.rows.forEach((r) => {
        if (conditions.length === 0 || rowMatches(r, conditions)) {
          assigns.forEach((a) => {
            const def = table.columns.find((d) => d.name === a.col);
            r[a.col] = def ? coerce(a.value, def.type) : a.value;
          });
          affected++;
        }
      });
      persist();
      return { kind: 'mutation', affected, message: 'UPDATE' };
    }

    // DELETE FROM t WHERE ...
    m = trimmed.match(/^delete\s+from\s+([\w]+)(?:\s+where\s+(.+))?$/is);
    if (m) {
      const table = findTable(m[1]);
      if (!table) return { kind: 'error', message: 'NO_TABLE:' + m[1] };
      const conditions = m[2] ? parseConditions(m[2]) : [];
      const before = table.rows.length;
      table.rows = conditions.length === 0 ? [] : table.rows.filter((r) => !rowMatches(r, conditions));
      persist();
      return { kind: 'mutation', affected: before - table.rows.length, message: 'DELETE' };
    }

    // CREATE TABLE t (col type, ...)
    m = trimmed.match(/^create\s+table\s+([\w]+)\s*\((.+)\)$/is);
    if (m) {
      if (findTable(m[1])) return { kind: 'error', message: 'EXISTS:' + m[1] };
      const columns: Column[] = splitTopLevel(m[2], ',').map((def) => {
        const parts = def.trim().split(/\s+/);
        const type = (parts[1] || 'text').toLowerCase();
        return { name: parts[0], type: type === 'integer' || type === 'int' ? 'integer' : type === 'real' || type === 'float' ? 'real' : 'text' };
      });
      state.tables.push({ name: m[1], columns, rows: [] });
      persist();
      return { kind: 'mutation', affected: 0, message: 'CREATE' };
    }

    // DROP TABLE t
    m = trimmed.match(/^drop\s+table\s+([\w]+)$/is);
    if (m) {
      const before = state.tables.length;
      state.tables = state.tables.filter((t) => t.name.toLowerCase() !== m![1].toLowerCase());
      persist();
      return { kind: 'mutation', affected: before - state.tables.length, message: 'DROP' };
    }

    return { kind: 'error', message: 'UNSUPPORTED' };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/* ---------------- Programmatic API (used by the grid UI) ---------------- */

export const fusionDb = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  listTables(): Table[] {
    return state.tables;
  },
  getTable(name: string): Table | null {
    return findTable(name) ?? null;
  },
  createTable(name: string, columns: Column[]): boolean {
    if (!name.trim() || findTable(name)) return false;
    state.tables.push({ name: name.trim(), columns: columns.length ? columns : [{ name: 'id', type: 'integer' }], rows: [] });
    persist();
    return true;
  },
  dropTable(name: string) {
    state.tables = state.tables.filter((t) => t !== findTable(name));
    persist();
  },
  addColumn(tableName: string, column: Column) {
    const table = findTable(tableName);
    if (!table || table.columns.some((c) => c.name === column.name)) return;
    table.columns.push(column);
    table.rows.forEach((r) => (r[column.name] = null));
    persist();
  },
  insertRow(tableName: string) {
    const table = findTable(tableName);
    if (!table) return;
    const row: Record<string, CellValue> = {};
    table.columns.forEach((c) => (row[c.name] = c.type === 'text' ? '' : null));
    table.rows.push(row);
    persist();
  },
  updateCell(tableName: string, rowIndex: number, column: string, value: string) {
    const table = findTable(tableName);
    if (!table || !table.rows[rowIndex]) return;
    const def = table.columns.find((c) => c.name === column);
    table.rows[rowIndex][column] = def ? coerce(value, def.type) : value;
    persist();
  },
  deleteRow(tableName: string, rowIndex: number) {
    const table = findTable(tableName);
    if (!table) return;
    table.rows.splice(rowIndex, 1);
    persist();
  },
  runSql,
  reset() {
    state = seed();
    persist();
  }
};
