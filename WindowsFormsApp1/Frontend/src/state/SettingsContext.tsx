import React, { createContext, useContext } from 'react';
import { useFusionSettings, type FusionSettingsState } from '../hooks/useFusionSettings';

// Lifts the sandboxed FusionOS preferences to a single shared instance so the desktop,
// the settings panel, AND the i18n layer all read/write the same state. Previously each
// `useFusionSettings()` call held its own copy, so changing the language inside Settings
// never reached the rest of the app.

interface SettingsContextValue {
  settings: FusionSettingsState;
  update: <K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useFusionSettings();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used within a SettingsProvider');
  return value;
}
