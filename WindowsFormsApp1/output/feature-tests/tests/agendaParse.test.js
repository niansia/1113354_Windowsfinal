"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const agendaParse_js_1 = require("../src/assistant/agendaParse.js");
const nlu_js_1 = require("../src/assistant/nlu.js");
// Fixed reference point: 2026-06-19 is a Friday (matches the running Fusion OS clock).
const NOW = new Date(2026, 5, 19);
(0, node_test_1.default)('parses "幫我在明天下午三點標註開會" into tomorrow 15:00 / 開會', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('幫我在明天下午三點標註開會', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-20');
    strict_1.default.equal(result.time, '15:00');
    strict_1.default.equal(result.title, '開會');
    strict_1.default.equal(result.hasDate, true);
    strict_1.default.equal(result.hasTime, true);
});
(0, node_test_1.default)('parses "提醒我後天早上九點交報告" into +2 days 09:00 / 交報告', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('提醒我後天早上九點交報告', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-21');
    strict_1.default.equal(result.time, '09:00');
    strict_1.default.equal(result.title, '交報告');
});
(0, node_test_1.default)('parses an explicit "6月25日晚上八點" date and pm time', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('幫我在6月25日晚上八點標註生日聚會', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-25');
    strict_1.default.equal(result.time, '20:00');
    strict_1.default.equal(result.title, '生日聚會');
});
(0, node_test_1.default)('an all-day task with no time defaults to today', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('記得買牛奶', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-19');
    strict_1.default.equal(result.time, null);
    strict_1.default.equal(result.title, '買牛奶');
    strict_1.default.equal(result.hasDate, false);
});
(0, node_test_1.default)('resolves "下週一" to next week\'s Monday (not two weeks out)', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('下週一開會', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-22');
    strict_1.default.equal(result.title, '開會');
});
(0, node_test_1.default)('resolves "三天後" as a relative day offset', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('三天後提醒我繳費', 'zh-TW', NOW);
    strict_1.default.equal(result.date, '2026-06-22');
    strict_1.default.equal(result.title, '繳費');
});
(0, node_test_1.default)('parses an English reminder with am time', () => {
    const result = (0, agendaParse_js_1.parseAgenda)('remind me tomorrow at 9am to call mom', 'en', NOW);
    strict_1.default.equal(result.date, '2026-06-20');
    strict_1.default.equal(result.time, '09:00');
    strict_1.default.ok(result.title.includes('call mom'));
});
(0, node_test_1.default)('routes reminder phrasing to the add_note intent but keeps app-open separate', () => {
    strict_1.default.equal((0, nlu_js_1.parseIntent)('幫我在明天下午三點標註開會').kind, 'add_note');
    strict_1.default.equal((0, nlu_js_1.parseIntent)('提醒我繳電費').kind, 'add_note');
    // Opening the app itself is still an app launch, not a note.
    strict_1.default.equal((0, nlu_js_1.parseIntent)('打開記事本').kind, 'open_app');
    strict_1.default.equal((0, nlu_js_1.parseIntent)('打開記事本').appId, 'notes');
});
