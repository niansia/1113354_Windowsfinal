"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const localeFormatting_js_1 = require("../src/i18n/localeFormatting.js");
const sample = new Date('2026-06-05T04:55:00.000Z');
(0, node_test_1.default)('falls back to Traditional Chinese for missing or unsupported language values', () => {
    strict_1.default.equal((0, localeFormatting_js_1.normalizeLanguage)(undefined), 'zh-TW');
    strict_1.default.equal((0, localeFormatting_js_1.normalizeLanguage)(''), 'zh-TW');
    strict_1.default.equal((0, localeFormatting_js_1.normalizeLanguage)('fr'), 'zh-TW');
    strict_1.default.equal((0, localeFormatting_js_1.normalizeLanguage)('en'), 'en');
});
(0, node_test_1.default)('formats the shell clock with the configured locale, timezone, and clock mode', () => {
    strict_1.default.equal((0, localeFormatting_js_1.formatFusionTime)(sample, 'zh-TW', 'Asia/Taipei', true), '12:55');
    strict_1.default.match((0, localeFormatting_js_1.formatFusionDate)(sample, 'zh-TW', 'Asia/Taipei'), /6月5日/);
    strict_1.default.match((0, localeFormatting_js_1.formatFusionDate)(sample, 'zh-TW', 'Asia/Taipei'), /星期五/);
    const english12Hour = (0, localeFormatting_js_1.formatFusionTime)(sample, 'en', 'America/New_York', false);
    strict_1.default.match(english12Hour, /12:55/);
    strict_1.default.match(english12Hour.toUpperCase(), /AM/);
});
(0, node_test_1.default)('uses a safe timezone fallback for invalid stored values', () => {
    strict_1.default.doesNotThrow(() => (0, localeFormatting_js_1.formatFusionDateTime)(sample, 'zh-TW', 'Invalid/Zone', true));
    strict_1.default.match((0, localeFormatting_js_1.formatFusionDateTime)(sample, 'zh-TW', 'Invalid/Zone', true), /12:55/);
});
