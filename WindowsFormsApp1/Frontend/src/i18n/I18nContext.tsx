import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { TRANSLATIONS, type Lang } from './strings';
import { useSettings } from '../state/SettingsContext';
import { sendMessageToHost } from '../utils/bridge';
import { SETTINGS_TRANSLATIONS } from '../settings/settingsText';
import { normalizeLanguage } from './localeFormatting';
import { FEATURE_TRANSLATIONS } from './featureTranslations';
import { ASSISTANT_TRANSLATIONS } from '../assistant/assistantText';

// Source-as-key i18n: the Traditional-Chinese string in the JSX is itself the key. For
// zh-TW we return it unchanged; for the other four languages we look it up in
// TRANSLATIONS and fall back to the original Chinese if a translation is missing — so
// the UI is never broken, only partially translated while the dictionary grows.

interface I18nValue {
  lang: Lang;
  t: (source: string) => string;
  tf: (source: string, ...args: Array<string | number>) => string;
}

const I18nContext = createContext<I18nValue>({ lang: 'zh-TW', t: (s) => s, tf: (s) => s });

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const lang = normalizeLanguage(settings.language);

  const t = useCallback(
    (source: string): string => {
      if (lang === 'zh-TW') return source;
      const entry = SETTINGS_TRANSLATIONS[source] ?? ASSISTANT_TRANSLATIONS[source] ?? FEATURE_TRANSLATIONS[source] ?? TRANSLATIONS[source];
      return (entry && entry[lang]) || source;
    },
    [lang]
  );

  // tf('已開啟「{0}」。', name) — translate then substitute {0}, {1}, ...
  const tf = useCallback(
    (source: string, ...args: Array<string | number>): string => {
      let out = t(source);
      args.forEach((arg, i) => {
        out = out.split(`{${i}}`).join(String(arg));
      });
      return out;
    },
    [t]
  );

  // Push Time & Language settings to the WinForms host so native surfaces follow the
  // same system preferences as the React shell.
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      /* non-DOM env */
    }
    sendMessageToHost('FUSION_SET_LANGUAGE', {
      language: lang,
      timezone: settings.timezone,
      clock24: settings.clock24
    });
  }, [lang, settings.timezone, settings.clock24]);

  const value = useMemo<I18nValue>(() => ({ lang, t, tf }), [lang, t, tf]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
