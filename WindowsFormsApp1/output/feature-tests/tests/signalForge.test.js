"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const signalForge_js_1 = require("../src/signal/signalForge.js");
(0, node_test_1.default)('builds a framed payload with parity and checksum details', () => {
    const frame = (0, signalForge_js_1.buildSignalFrame)('Fusion');
    strict_1.default.equal(frame.payload, 'Fusion');
    strict_1.default.equal(frame.byteCount, 6);
    strict_1.default.equal(frame.bitCount, 48);
    strict_1.default.match(frame.binaryPreview, /^[01 ]+$/);
    strict_1.default.equal(frame.parity, 'even');
    strict_1.default.equal(frame.hexChecksum.length, 2);
});
(0, node_test_1.default)('estimates physical channel behavior from data-rate and medium settings', () => {
    const channel = (0, signalForge_js_1.estimateChannel)({
        medium: 'fiber',
        distanceMeters: 1200,
        dataRateMbps: 100,
        carrierFrequencyMhz: 2400,
        noiseDb: 18
    });
    strict_1.default.equal(channel.mediumLabel, '光纖鏈路');
    strict_1.default.ok(channel.propagationDelayUs > 5);
    strict_1.default.ok(channel.wavelengthMeters > 0);
    strict_1.default.equal(channel.reliabilityLevel, 'steady');
});
(0, node_test_1.default)('runs a processor trace that connects frame bytes to register work', () => {
    const trace = (0, signalForge_js_1.runProcessorTrace)((0, signalForge_js_1.buildSignalFrame)('OS'));
    strict_1.default.deepEqual(trace.registers.map((register) => register.name), ['R0', 'R1', 'R2', 'R3']);
    strict_1.default.ok(trace.steps.some((step) => step.instruction.startsWith('LOAD')));
    strict_1.default.ok(trace.steps.some((step) => step.instruction.startsWith('XOR')));
    strict_1.default.ok(trace.steps.some((step) => step.instruction.startsWith('STORE')));
});
