"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const wakeWords_js_1 = require("../src/assistant/wakeWords.js");
(0, node_test_1.default)('extracts a Traditional Chinese command spoken with the wake phrase', () => {
    strict_1.default.deepEqual((0, wakeWords_js_1.matchWakePhrase)('嗨 Fusion，現在幾點？'), {
        matched: true,
        command: '現在幾點？'
    });
});
(0, node_test_1.default)('supports English and East Asian wake phrases', () => {
    strict_1.default.deepEqual((0, wakeWords_js_1.matchWakePhrase)('Hey Fusion, what time is it?'), {
        matched: true,
        command: 'what time is it?'
    });
    strict_1.default.equal((0, wakeWords_js_1.matchWakePhrase)('ねえ Fusion、今日の天気は？').matched, true);
    strict_1.default.equal((0, wakeWords_js_1.matchWakePhrase)('헤이 Fusion, 오늘 날씨 어때?').matched, true);
});
(0, node_test_1.default)('does not wake when Fusion is only an app name', () => {
    strict_1.default.deepEqual((0, wakeWords_js_1.matchWakePhrase)('打開 Fusion RPG'), {
        matched: false,
        command: ''
    });
});
(0, node_test_1.default)('accepts a standalone assistant name without inventing a command', () => {
    strict_1.default.deepEqual((0, wakeWords_js_1.matchWakePhrase)('Fusion'), {
        matched: true,
        command: ''
    });
});
