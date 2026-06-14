"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFusionEventDateTime = exports.fusionCalendarKey = exports.formatFusionDateTime = exports.formatFusionFileDate = exports.formatFusionDate = exports.formatFusionTime = exports.normalizeTimezone = exports.localeForLanguage = exports.normalizeLanguage = void 0;
const SUPPORTED_LANGUAGES = new Set(['zh-TW', 'zh-CN', 'en', 'ja', 'ko']);
const DEFAULT_TIMEZONE = 'Asia/Taipei';
const LOCALES = {
    'zh-TW': 'zh-TW',
    'zh-CN': 'zh-CN',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR'
};
const normalizeLanguage = (value) => typeof value === 'string' && SUPPORTED_LANGUAGES.has(value) ? value : 'zh-TW';
exports.normalizeLanguage = normalizeLanguage;
const localeForLanguage = (lang) => LOCALES[lang];
exports.localeForLanguage = localeForLanguage;
const normalizeTimezone = (value) => {
    const timezone = typeof value === 'string' && value ? value : DEFAULT_TIMEZONE;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
        return timezone;
    }
    catch {
        return DEFAULT_TIMEZONE;
    }
};
exports.normalizeTimezone = normalizeTimezone;
const formatFusionTime = (date, lang, timezone, clock24) => new Intl.DateTimeFormat((0, exports.localeForLanguage)(lang), {
    timeZone: (0, exports.normalizeTimezone)(timezone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: !clock24
}).format(date);
exports.formatFusionTime = formatFusionTime;
const formatFusionDate = (date, lang, timezone) => new Intl.DateTimeFormat((0, exports.localeForLanguage)(lang), {
    timeZone: (0, exports.normalizeTimezone)(timezone),
    month: 'long',
    day: 'numeric',
    weekday: 'long'
}).format(date);
exports.formatFusionDate = formatFusionDate;
const formatFusionFileDate = (date, lang, timezone) => new Intl.DateTimeFormat((0, exports.localeForLanguage)(lang), {
    timeZone: (0, exports.normalizeTimezone)(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).format(date);
exports.formatFusionFileDate = formatFusionFileDate;
const formatFusionDateTime = (date, lang, timezone, clock24) => new Intl.DateTimeFormat((0, exports.localeForLanguage)(lang), {
    timeZone: (0, exports.normalizeTimezone)(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !clock24
}).format(date);
exports.formatFusionDateTime = formatFusionDateTime;
const fusionCalendarKey = (date, timezone) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: (0, exports.normalizeTimezone)(timezone),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
};
exports.fusionCalendarKey = fusionCalendarKey;
const formatFusionEventDateTime = (date, lang, timezone, clock24) => new Intl.DateTimeFormat((0, exports.localeForLanguage)(lang), {
    timeZone: (0, exports.normalizeTimezone)(timezone),
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: !clock24
}).format(date);
exports.formatFusionEventDateTime = formatFusionEventDateTime;
