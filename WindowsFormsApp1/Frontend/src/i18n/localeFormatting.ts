import type { Lang } from './strings.js';

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(['zh-TW', 'zh-CN', 'en', 'ja', 'ko']);
const DEFAULT_TIMEZONE = 'Asia/Taipei';

const LOCALES: Record<Lang, string> = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR'
};

export const normalizeLanguage = (value: unknown): Lang =>
  typeof value === 'string' && SUPPORTED_LANGUAGES.has(value) ? value as Lang : 'zh-TW';

export const localeForLanguage = (lang: Lang) => LOCALES[lang];

export const normalizeTimezone = (value: unknown): string => {
  const timezone = typeof value === 'string' && value ? value : DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

export const formatFusionTime = (
  date: Date,
  lang: Lang,
  timezone: string,
  clock24: boolean
) => new Intl.DateTimeFormat(localeForLanguage(lang), {
  timeZone: normalizeTimezone(timezone),
  hour: '2-digit',
  minute: '2-digit',
  hour12: !clock24
}).format(date);

export const formatFusionDate = (
  date: Date,
  lang: Lang,
  timezone: string
) => new Intl.DateTimeFormat(localeForLanguage(lang), {
  timeZone: normalizeTimezone(timezone),
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(date);

export const formatFusionFileDate = (
  date: Date,
  lang: Lang,
  timezone: string
) => new Intl.DateTimeFormat(localeForLanguage(lang), {
  timeZone: normalizeTimezone(timezone),
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(date);

export const formatFusionDateTime = (
  date: Date,
  lang: Lang,
  timezone: string,
  clock24: boolean
) => new Intl.DateTimeFormat(localeForLanguage(lang), {
  timeZone: normalizeTimezone(timezone),
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: !clock24
}).format(date);
