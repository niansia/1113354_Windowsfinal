import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Shared agenda store for the Notes & Calendar app AND the voice assistant. Both read and
// write the same events/notes so a spoken reminder ("幫我在明天三點標註開會") shows up on the
// calendar immediately. Persisted to localStorage so it survives reloads / app restarts.

export interface AgendaEvent {
  id: string;
  date: string;          // 'YYYY-MM-DD' (local)
  time: string | null;   // 'HH:mm' or null for an all-day item
  title: string;
  note: string;
  done: boolean;
  source: 'voice' | 'manual';
  createdAt: number;
}

export interface AgendaNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface AgendaEventInput {
  date: string;
  time?: string | null;
  title: string;
  note?: string;
  source?: 'voice' | 'manual';
}

interface AgendaValue {
  events: AgendaEvent[];
  notes: AgendaNote[];
  focusDate: string | null;
  addEvent: (input: AgendaEventInput) => AgendaEvent;
  updateEvent: (id: string, patch: Partial<Omit<AgendaEvent, 'id'>>) => void;
  removeEvent: (id: string) => void;
  toggleEvent: (id: string) => void;
  addNote: (input?: { title?: string; content?: string }) => AgendaNote;
  updateNote: (id: string, patch: Partial<Pick<AgendaNote, 'title' | 'content'>>) => void;
  removeNote: (id: string) => void;
  requestFocusDate: (date: string | null) => void;
}

const STORAGE_KEY = 'fusionAgenda.v1';

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const sortEvents = (events: AgendaEvent[]) =>
  [...events].sort((a, b) => (a.date === b.date
    ? (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
    : a.date.localeCompare(b.date)));

interface PersistShape { events: AgendaEvent[]; notes: AgendaNote[] }

function loadInitial(): PersistShape {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { events: [], notes: [] };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const events = Array.isArray(parsed.events) ? parsed.events.filter((e) => e && e.id && e.date && typeof e.title === 'string') : [];
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter((n) => n && n.id && typeof n.content === 'string') : [];
    return {
      events: sortEvents(events.map((e) => ({
        id: String(e.id),
        date: String(e.date),
        time: e.time ?? null,
        title: String(e.title),
        note: e.note ?? '',
        done: Boolean(e.done),
        source: e.source === 'voice' ? 'voice' : 'manual',
        createdAt: e.createdAt ?? Date.now()
      }))),
      notes
    };
  } catch {
    return { events: [], notes: [] };
  }
}

const AgendaContext = createContext<AgendaValue | null>(null);

export const useAgenda = (): AgendaValue => {
  const value = useContext(AgendaContext);
  if (!value) throw new Error('useAgenda must be used within AgendaProvider');
  return value;
};

export function AgendaProvider({ children }: { children: React.ReactNode }) {
  const initial = useRef<PersistShape>(loadInitial());
  const [events, setEvents] = useState<AgendaEvent[]>(initial.current.events);
  const [notes, setNotes] = useState<AgendaNote[]>(initial.current.notes);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ events, notes }));
    } catch {
      /* storage full / unavailable — keep running in-memory */
    }
  }, [events, notes]);

  const addEvent = useCallback((input: AgendaEventInput): AgendaEvent => {
    const event: AgendaEvent = {
      id: makeId(),
      date: input.date,
      time: input.time ?? null,
      title: input.title.trim() || '提醒',
      note: input.note?.trim() ?? '',
      done: false,
      source: input.source ?? 'manual',
      createdAt: Date.now()
    };
    setEvents((prev) => sortEvents([...prev, event]));
    return event;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<Omit<AgendaEvent, 'id'>>) => {
    setEvents((prev) => sortEvents(prev.map((e) => (e.id === id ? { ...e, ...patch } : e))));
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const toggleEvent = useCallback((id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));
  }, []);

  const addNote = useCallback((input?: { title?: string; content?: string }): AgendaNote => {
    const note: AgendaNote = {
      id: makeId(),
      title: input?.title?.trim() ?? '',
      content: input?.content ?? '',
      updatedAt: Date.now()
    };
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<AgendaNote, 'title' | 'content'>>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const requestFocusDate = useCallback((date: string | null) => setFocusDate(date), []);

  const value = useMemo<AgendaValue>(() => ({
    events, notes, focusDate,
    addEvent, updateEvent, removeEvent, toggleEvent,
    addNote, updateNote, removeNote, requestFocusDate
  }), [events, notes, focusDate, addEvent, updateEvent, removeEvent, toggleEvent, addNote, updateNote, removeNote, requestFocusDate]);

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}
