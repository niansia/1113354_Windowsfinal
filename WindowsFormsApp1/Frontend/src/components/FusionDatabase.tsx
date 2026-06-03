import React, { useEffect, useReducer, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database,
  Play,
  Plus,
  RotateCcw,
  Table2,
  Terminal,
  Trash2,
  X
} from 'lucide-react';
import { fusionDb, type CellValue, type ColumnType, type QueryResult } from '../db/fusionDb';
import { useI18n } from '../i18n/I18nContext';

interface FusionDatabaseProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

function useFusionDb() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => fusionDb.subscribe(force), []);
  return fusionDb;
}

// Per-cell editor: local state committed on blur, re-synced when the value changes
// externally (e.g. after a SQL mutation).
function CellInput({ value, onCommit }: { value: CellValue; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value === null ? '' : String(value));
  useEffect(() => setV(value === null ? '' : String(value)), [value]);
  return (
    <input
      className="db-cell"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export const FusionDatabase: React.FC<FusionDatabaseProps> = ({ open, onClose, accent }) => {
  const { t, tf } = useI18n();
  const db = useFusionDb();
  const tables = db.listTables();

  const [activeTable, setActiveTable] = useState<string | null>(tables[0]?.name ?? null);
  const [tab, setTab] = useState<'data' | 'sql'>('data');
  const [newTable, setNewTable] = useState('');
  const [newCol, setNewCol] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [addingCol, setAddingCol] = useState(false);
  const [sql, setSql] = useState('SELECT * FROM members WHERE role = \'developer\'');
  const [result, setResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (!tables.some((tb) => tb.name === activeTable)) setActiveTable(tables[0]?.name ?? null);
  }, [tables, activeTable]);

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

  const table = activeTable ? db.getTable(activeTable) : null;

  const createTable = () => {
    const name = newTable.trim();
    if (!name) return;
    if (db.createTable(name, [{ name: 'id', type: 'integer' }])) {
      setActiveTable(name);
      setNewTable('');
    }
  };

  const addColumn = () => {
    const name = newCol.trim();
    if (!name || !activeTable) return;
    db.addColumn(activeTable, { name, type: newColType });
    setNewCol('');
    setAddingCol(false);
  };

  const describeResult = (r: QueryResult): string => {
    if (r.kind === 'mutation') return tf('{0} 列受影響', r.affected);
    if (r.kind === 'error') {
      if (r.message.startsWith('NO_TABLE:')) return tf('找不到資料表「{0}」', r.message.split(':')[1]);
      if (r.message.startsWith('EXISTS:')) return tf('資料表「{0}」已存在', r.message.split(':')[1]);
      if (r.message === 'UNSUPPORTED') return t('不支援的語法（支援 SELECT / INSERT / UPDATE / DELETE / CREATE TABLE / DROP TABLE）');
      if (r.message === 'COLUMN_COUNT') return t('欄位數量與值不符');
      if (r.message === 'EMPTY') return t('請輸入 SQL 查詢');
      return tf('語法錯誤：{0}', r.message);
    }
    return tf('{0} 列', r.rows.length);
  };

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
            className="set-panel db-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="set-topbar">
              <div className="set-title">
                <Database size={20} strokeWidth={1.9} />
                <span>{t('資料庫')}</span>
              </div>
              <div className="db-tabs">
                <button type="button" className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>
                  <Table2 size={15} /> {t('資料表')}
                </button>
                <button type="button" className={tab === 'sql' ? 'active' : ''} onClick={() => setTab('sql')}>
                  <Terminal size={15} /> SQL
                </button>
              </div>
              <button type="button" className="db-reset" onClick={() => { db.reset(); setResult(null); }} title={t('重設為範例資料')}>
                <RotateCcw size={15} /> {t('重設')}
              </button>
              <button type="button" className="set-close" onClick={onClose} title={t('關閉')}>
                <X size={18} />
              </button>
            </header>

            <div className="db-body">
              <nav className="db-side">
                <span className="db-side-label">{t('資料表')}</span>
                {tables.map((tb) => (
                  <button
                    key={tb.name}
                    type="button"
                    className={tb.name === activeTable ? 'active' : ''}
                    onClick={() => { setActiveTable(tb.name); setTab('data'); }}
                  >
                    <Table2 size={16} strokeWidth={1.8} />
                    <span>{tb.name}</span>
                    <small>{tb.rows.length}</small>
                  </button>
                ))}
                <div className="db-new-table">
                  <input
                    value={newTable}
                    placeholder={t('新資料表名稱')}
                    onChange={(e) => setNewTable(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createTable()}
                  />
                  <button type="button" onClick={createTable} title={t('建立資料表')}>
                    <Plus size={16} />
                  </button>
                </div>
              </nav>

              <div className="db-main">
                {tab === 'data' && table && (
                  <>
                    <div className="db-toolbar">
                      <strong>{table.name}</strong>
                      <span className="db-grow" />
                      <button type="button" className="db-btn" onClick={() => db.insertRow(table.name)}>
                        <Plus size={15} /> {t('新增列')}
                      </button>
                      {addingCol ? (
                        <span className="db-addcol">
                          <input
                            autoFocus
                            value={newCol}
                            placeholder={t('欄位名稱')}
                            onChange={(e) => setNewCol(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                          />
                          <select value={newColType} onChange={(e) => setNewColType(e.target.value as ColumnType)}>
                            <option value="text">text</option>
                            <option value="integer">integer</option>
                            <option value="real">real</option>
                          </select>
                          <button type="button" className="db-btn" onClick={addColumn}>{t('新增')}</button>
                        </span>
                      ) : (
                        <button type="button" className="db-btn" onClick={() => setAddingCol(true)}>
                          <Plus size={15} /> {t('新增欄位')}
                        </button>
                      )}
                      <button type="button" className="db-btn danger" onClick={() => db.dropTable(table.name)} title={t('刪除資料表')}>
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="db-grid-wrap">
                      <table className="db-grid">
                        <thead>
                          <tr>
                            {table.columns.map((c) => (
                              <th key={c.name}>
                                {c.name}
                                <em>{c.type}</em>
                              </th>
                            ))}
                            <th className="db-row-actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {table.columns.map((c) => (
                                <td key={c.name}>
                                  <CellInput
                                    value={row[c.name] ?? null}
                                    onCommit={(v) => db.updateCell(table.name, rowIndex, c.name, v)}
                                  />
                                </td>
                              ))}
                              <td className="db-row-actions">
                                <button type="button" onClick={() => db.deleteRow(table.name, rowIndex)} title={t('刪除列')}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {table.rows.length === 0 && (
                            <tr>
                              <td colSpan={table.columns.length + 1} className="db-empty">{t('此資料表是空的')}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="db-statusbar">{tf('{0} 列 · {1} 欄', table.rows.length, table.columns.length)}</div>
                  </>
                )}

                {tab === 'data' && !table && <div className="db-empty-state">{t('尚無資料表，請在左側建立一個。')}</div>}

                {tab === 'sql' && (
                  <div className="db-sql">
                    <textarea
                      value={sql}
                      spellCheck={false}
                      onChange={(e) => setSql(e.target.value)}
                      placeholder="SELECT * FROM members"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) setResult(db.runSql(sql));
                      }}
                    />
                    <div className="db-sql-bar">
                      <button type="button" className="db-btn primary" onClick={() => setResult(db.runSql(sql))}>
                        <Play size={15} /> {t('執行')} <kbd>Ctrl+Enter</kbd>
                      </button>
                      {result && <span className={result.kind === 'error' ? 'db-err' : 'db-ok'}>{describeResult(result)}</span>}
                    </div>

                    {result && result.kind === 'rows' && (
                      <div className="db-grid-wrap result">
                        <table className="db-grid">
                          <thead>
                            <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {result.rows.map((r, i) => (
                              <tr key={i}>{r.map((cell, j) => <td key={j}><span className="db-readonly">{cell === null ? 'NULL' : String(cell)}</span></td>)}</tr>
                            ))}
                            {result.rows.length === 0 && (
                              <tr><td colSpan={result.columns.length} className="db-empty">{t('沒有符合的資料列')}</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
