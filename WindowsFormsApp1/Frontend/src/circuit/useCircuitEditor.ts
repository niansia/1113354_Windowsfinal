import { useCallback, useEffect, useState } from 'react';
import type { CircuitDocument } from './circuitTypes';
import { createLedStarterCircuit } from './circuitTemplates';
import { parseCircuitDocument } from './circuitCatalog';

interface HistoryState {
  past: CircuitDocument[];
  present: CircuitDocument;
  future: CircuitDocument[];
}

const STORAGE_KEY = 'fusion-circuit-studio-autosave-v1';
const MAX_HISTORY = 80;

const restoreAutosave = () => {
  if (typeof window === 'undefined') return createLedStarterCircuit();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? parseCircuitDocument(saved) : createLedStarterCircuit();
  } catch {
    return createLedStarterCircuit();
  }
};

export const useCircuitEditor = () => {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: restoreAutosave(),
    future: []
  }));

  const commit = useCallback((next: CircuitDocument | ((current: CircuitDocument) => CircuitDocument)) => {
    setHistory((current) => {
      const resolved = typeof next === 'function' ? next(current.present) : next;
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY),
        present: { ...resolved, updatedAt: new Date().toISOString() },
        future: []
      };
    });
  }, []);

  const replace = useCallback((next: CircuitDocument) => {
    setHistory((current) => ({ ...current, present: next }));
  }, []);

  const recordPreview = useCallback((before: CircuitDocument) => {
    setHistory((current) => ({
      past: [...current.past, before].slice(-MAX_HISTORY),
      present: { ...current.present, updatedAt: new Date().toISOString() },
      future: []
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, MAX_HISTORY)
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY),
        present: next,
        future: current.future.slice(1)
      };
    });
  }, []);

  const reset = useCallback((document: CircuitDocument) => {
    setHistory({ past: [], present: document, future: [] });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [history.present]);

  return {
    document: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    replace,
    recordPreview,
    undo,
    redo,
    reset
  };
};
