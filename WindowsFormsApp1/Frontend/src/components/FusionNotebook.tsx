import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Mic, NotebookPen, Plus, StickyNote, Trash2, X
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';
import { formatFusionDate, formatFusionTime, localeForLanguage } from '../i18n/localeFormatting';
import { useAgenda, type AgendaEvent } from '../state/AgendaContext';

interface FusionNotebookProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type NotebookView = 'calendar' | 'notes';

const pad2 = (value: number) => String(value).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) => `${year}-${pad2(month + 1)}-${pad2(day)}`;
const todayISO = () => {
  const now = new Date();
  return isoOf(now.getFullYear(), now.getMonth(), now.getDate());
};

export const FusionNotebook: React.FC<FusionNotebookProps> = ({ open, onClose, accent }) => {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const agenda = useAgenda();

  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<NotebookView>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [draftTime, setDraftTime] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  // Respond to a voice-added reminder: jump to its day on the calendar so it visibly appears.
  useEffect(() => {
    if (!open || !agenda.focusDate) return;
    const [y, m] = agenda.focusDate.split('-').map(Number);
    setView('calendar');
    setSelectedDate(agenda.focusDate);
    if (Number.isFinite(y) && Number.isFinite(m)) { setViewYear(y); setViewMonth(m - 1); }
    agenda.requestFocusDate(null);
  }, [open, agenda]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of agenda.events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [agenda.events]);

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeForLanguage(lang), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i))); // Jan 1 2023 = Sunday
  }, [lang]);

  const monthTitle = useMemo(
    () => new Intl.DateTimeFormat(localeForLanguage(lang), { year: 'numeric', month: 'long' }).format(new Date(viewYear, viewMonth, 1)),
    [lang, viewMonth, viewYear]
  );

  const grid = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push({ iso: isoOf(viewYear, viewMonth, day), day });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedDateLabel = useMemo(
    () => formatFusionDate(new Date(`${selectedDate}T00:00:00`), lang, settings.timezone),
    [lang, selectedDate, settings.timezone]
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };
  const goToday = () => {
    const t0 = new Date();
    setViewYear(t0.getFullYear());
    setViewMonth(t0.getMonth());
    setSelectedDate(todayISO());
  };

  const addDraft = () => {
    const title = draftTitle.trim();
    if (!title) { titleInputRef.current?.focus(); return; }
    agenda.addEvent({ date: selectedDate, time: draftTime || null, title, note: draftNote, source: 'manual' });
    setDraftTitle('');
    setDraftNote('');
    setDraftTime('');
    titleInputRef.current?.focus();
  };

  const selectedNote = agenda.notes.find((note) => note.id === selectedNoteId) ?? null;
  const createNote = () => {
    const note = agenda.addNote();
    setSelectedNoteId(note.id);
  };

  const isToday = (iso: string) => iso === todayISO();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="notebook-overlay"
          style={{ ['--nb-accent' as string]: accent } as React.CSSProperties}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="notebook-shell"
            role="dialog"
            aria-modal="true"
            aria-label={t('記事本與日曆')}
            initial={{ opacity: 0, y: 24, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 240, damping: 29 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="notebook-topbar">
              <div className="notebook-brand">
                <span className="notebook-brand-mark"><CalendarDays size={24} strokeWidth={1.8} /></span>
                <div><strong>{t('記事本與日曆')}</strong><small>{t('備忘錄與行事曆')}</small></div>
              </div>
              <div className="notebook-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={view === 'calendar'} className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><CalendarDays size={16} />{t('日曆')}</button>
                <button type="button" role="tab" aria-selected={view === 'notes'} className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}><StickyNote size={16} />{t('記事本')}</button>
              </div>
              <div className="notebook-clock">
                <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
                <small>{formatFusionDate(now, lang, settings.timezone)}</small>
              </div>
              <button type="button" className="notebook-icon-button" onClick={onClose} title={t('關閉')} aria-label={t('關閉')}><X size={20} /></button>
            </header>

            {view === 'calendar' ? (
              <div className="notebook-body notebook-calendar">
                <section className="notebook-calendar-pane">
                  <div className="notebook-cal-toolbar">
                    <button type="button" onClick={() => shiftMonth(-1)} aria-label={t('上個月')}><ChevronLeft size={18} /></button>
                    <strong>{monthTitle}</strong>
                    <button type="button" onClick={() => shiftMonth(1)} aria-label={t('下個月')}><ChevronRight size={18} /></button>
                    <button type="button" className="notebook-today-btn" onClick={goToday}>{t('今天')}</button>
                  </div>
                  <div className="notebook-weekrow">
                    {weekdayLabels.map((label, index) => <span key={index} className={index === 0 || index === 6 ? 'weekend' : ''}>{label}</span>)}
                  </div>
                  <div className="notebook-grid">
                    {grid.map((cell, index) => {
                      if (!cell) return <span key={`empty-${index}`} className="notebook-cell empty" />;
                      const dayEvents = eventsByDate.get(cell.iso) ?? [];
                      const className = `notebook-cell${cell.iso === selectedDate ? ' selected' : ''}${isToday(cell.iso) ? ' today' : ''}`;
                      return (
                        <button type="button" key={cell.iso} className={className} onClick={() => setSelectedDate(cell.iso)}>
                          <i>{cell.day}</i>
                          {dayEvents.length > 0 && (
                            <span className="notebook-cell-events">
                              {dayEvents.slice(0, 2).map((event) => (
                                <b key={event.id} className={event.done ? 'done' : ''}>{event.time ? `${event.time} ` : ''}{event.title}</b>
                              ))}
                              {dayEvents.length > 2 && <em>+{dayEvents.length - 2}</em>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="notebook-day-pane">
                  <div className="notebook-day-head">
                    <div><span>{t('當日事項')}</span><strong>{selectedDateLabel}</strong></div>
                    <span className="notebook-day-count">{selectedEvents.length}</span>
                  </div>
                  <div className="notebook-event-list">
                    {selectedEvents.length === 0 && <p className="notebook-empty">{t('這一天還沒有任何事項。')}</p>}
                    {selectedEvents.map((event) => (
                      <article key={event.id} className={event.done ? 'done' : ''}>
                        <button type="button" className="notebook-check" onClick={() => agenda.toggleEvent(event.id)} aria-label={t('標記完成')}>
                          {event.done ? <Check size={14} /> : null}
                        </button>
                        <div className="notebook-event-main">
                          <div className="notebook-event-titleline">
                            {event.time && <time>{event.time}</time>}
                            <strong>{event.title}</strong>
                            {event.source === 'voice' && <span className="notebook-voice-tag"><Mic size={11} />{t('語音')}</span>}
                          </div>
                          {event.note && <p>{event.note}</p>}
                        </div>
                        <button type="button" className="notebook-del" onClick={() => agenda.removeEvent(event.id)} aria-label={t('刪除')}><Trash2 size={15} /></button>
                      </article>
                    ))}
                  </div>
                  <div className="notebook-add-form">
                    <div className="notebook-add-row">
                      <input type="time" value={draftTime} onChange={(e) => setDraftTime(e.target.value)} aria-label={t('時間')} />
                      <input ref={titleInputRef} type="text" value={draftTitle} placeholder={t('要做什麼？')} onChange={(e) => setDraftTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDraft(); }} aria-label={t('標題')} />
                    </div>
                    <input type="text" value={draftNote} placeholder={t('備註（可選）')} onChange={(e) => setDraftNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDraft(); }} aria-label={t('備註')} />
                    <button type="button" className="notebook-add-btn" onClick={addDraft}><Plus size={16} />{t('新增事項')}</button>
                  </div>
                  <p className="notebook-voice-hint"><Mic size={12} />{t('也可以對語音助理說「幫我在明天下午三點標註開會」，事項會立即出現在這裡。')}</p>
                </section>
              </div>
            ) : (
              <div className="notebook-body notebook-notes">
                <section className="notebook-notelist">
                  <button type="button" className="notebook-newnote" onClick={createNote}><NotebookPen size={16} />{t('新記事')}</button>
                  <div className="notebook-note-items">
                    {agenda.notes.length === 0 && <p className="notebook-empty">{t('還沒有記事，建立第一篇吧。')}</p>}
                    {agenda.notes.map((note) => (
                      <button type="button" key={note.id} className={`notebook-note-item${note.id === selectedNoteId ? ' active' : ''}`} onClick={() => setSelectedNoteId(note.id)}>
                        <strong>{note.title.trim() || t('未命名記事')}</strong>
                        <span>{note.content.trim().slice(0, 48) || t('（空白）')}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="notebook-editor">
                  {selectedNote ? (
                    <>
                      <input
                        type="text"
                        className="notebook-editor-title"
                        value={selectedNote.title}
                        placeholder={t('記事標題…')}
                        onChange={(e) => agenda.updateNote(selectedNote.id, { title: e.target.value })}
                      />
                      <textarea
                        className="notebook-editor-body"
                        value={selectedNote.content}
                        placeholder={t('開始輸入…')}
                        onChange={(e) => agenda.updateNote(selectedNote.id, { content: e.target.value })}
                      />
                      <div className="notebook-editor-foot">
                        <span>{new Intl.DateTimeFormat(localeForLanguage(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedNote.updatedAt))}</span>
                        <button type="button" onClick={() => { agenda.removeNote(selectedNote.id); setSelectedNoteId(null); }}><Trash2 size={15} />{t('刪除')}</button>
                      </div>
                    </>
                  ) : (
                    <div className="notebook-editor-empty">
                      <StickyNote size={40} strokeWidth={1.4} />
                      <strong>{t('選擇或建立一篇記事')}</strong>
                      <span>{t('在左側挑選記事，或建立新的一篇開始書寫。')}</span>
                    </div>
                  )}
                </section>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
