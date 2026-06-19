"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const microphoneSelection_js_1 = require("../src/assistant/microphoneSelection.js");
(0, node_test_1.default)('prefers a physical microphone array over silent virtual voice devices', () => {
    const selected = (0, microphoneSelection_js_1.choosePreferredMicrophone)([
        { deviceId: 'voice-changer', kind: 'audioinput', label: '麥克風 (Voice Changer Virtual Audio Device)' },
        { deviceId: 'realtek', kind: 'audioinput', label: '麥克風排列 (Realtek(R) Audio)' },
        { deviceId: 'hitpaw', kind: 'audioinput', label: 'HitPaw Virtual Audio Input' }
    ]);
    strict_1.default.equal(selected?.deviceId, 'realtek');
});
(0, node_test_1.default)('keeps a normal external USB microphone eligible', () => {
    const selected = (0, microphoneSelection_js_1.choosePreferredMicrophone)([
        { deviceId: 'virtual', kind: 'audioinput', label: 'Virtual Audio Cable' },
        { deviceId: 'usb', kind: 'audioinput', label: 'USB Microphone' }
    ]);
    strict_1.default.equal(selected?.deviceId, 'usb');
});
(0, node_test_1.default)('classifies silent, audible, and speech-range microphone levels', () => {
    strict_1.default.equal((0, microphoneSelection_js_1.classifyMicrophoneSignal)(-108), 'silent');
    strict_1.default.equal((0, microphoneSelection_js_1.classifyMicrophoneSignal)(-62), 'audible');
    strict_1.default.equal((0, microphoneSelection_js_1.classifyMicrophoneSignal)(-28), 'speech');
});
