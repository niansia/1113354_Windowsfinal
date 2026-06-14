"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCircuitEditor = void 0;
const react_1 = require("react");
const circuitTemplates_1 = require("./circuitTemplates");
const circuitCatalog_1 = require("./circuitCatalog");
const STORAGE_KEY = 'fusion-circuit-studio-autosave-v1';
const MAX_HISTORY = 80;
const restoreAutosave = () => {
    if (typeof window === 'undefined')
        return (0, circuitTemplates_1.createLedStarterCircuit)();
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return saved ? (0, circuitCatalog_1.parseCircuitDocument)(saved) : (0, circuitTemplates_1.createLedStarterCircuit)();
    }
    catch {
        return (0, circuitTemplates_1.createLedStarterCircuit)();
    }
};
const useCircuitEditor = () => {
    const [history, setHistory] = (0, react_1.useState)(() => ({
        past: [],
        present: restoreAutosave(),
        future: []
    }));
    const commit = (0, react_1.useCallback)((next) => {
        setHistory((current) => {
            const resolved = typeof next === 'function' ? next(current.present) : next;
            return {
                past: [...current.past, current.present].slice(-MAX_HISTORY),
                present: { ...resolved, updatedAt: new Date().toISOString() },
                future: []
            };
        });
    }, []);
    const replace = (0, react_1.useCallback)((next) => {
        setHistory((current) => ({ ...current, present: next }));
    }, []);
    const recordPreview = (0, react_1.useCallback)((before) => {
        setHistory((current) => ({
            past: [...current.past, before].slice(-MAX_HISTORY),
            present: { ...current.present, updatedAt: new Date().toISOString() },
            future: []
        }));
    }, []);
    const undo = (0, react_1.useCallback)(() => {
        setHistory((current) => {
            const previous = current.past.at(-1);
            if (!previous)
                return current;
            return {
                past: current.past.slice(0, -1),
                present: previous,
                future: [current.present, ...current.future].slice(0, MAX_HISTORY)
            };
        });
    }, []);
    const redo = (0, react_1.useCallback)(() => {
        setHistory((current) => {
            const next = current.future[0];
            if (!next)
                return current;
            return {
                past: [...current.past, current.present].slice(-MAX_HISTORY),
                present: next,
                future: current.future.slice(1)
            };
        });
    }, []);
    const reset = (0, react_1.useCallback)((document) => {
        setHistory({ past: [], present: document, future: [] });
    }, []);
    (0, react_1.useEffect)(() => {
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
exports.useCircuitEditor = useCircuitEditor;
