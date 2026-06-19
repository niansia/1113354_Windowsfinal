"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const circuitSimulator_js_1 = require("../src/circuit/circuitSimulator.js");
const circuitTemplates_js_1 = require("../src/circuit/circuitTemplates.js");
(0, node_test_1.default)('solves a grounded voltage source and resistor loop', () => {
    const result = (0, circuitSimulator_js_1.simulateCircuit)((0, circuitTemplates_js_1.createResistorCircuit)(9, 330));
    const resistor = result.components.resistor;
    strict_1.default.equal(result.ok, true);
    strict_1.default.ok(resistor);
    strict_1.default.ok(Math.abs(Math.abs(resistor.current) - 9 / 330) < 1e-6);
    strict_1.default.ok(Math.abs(Math.abs(resistor.voltage) - 9) < 1e-6);
});
(0, node_test_1.default)('reports zero current through an open switch branch', () => {
    const result = (0, circuitSimulator_js_1.simulateCircuit)((0, circuitTemplates_js_1.createOpenSwitchCircuit)());
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal(result.components.switch.current, 0);
    strict_1.default.equal(result.components.lamp.active, false);
});
(0, node_test_1.default)('applies LED forward voltage and marks the LED active', () => {
    const result = (0, circuitSimulator_js_1.simulateCircuit)((0, circuitTemplates_js_1.createLedStarterCircuit)());
    const led = result.components.led;
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal(led.active, true);
    strict_1.default.ok(Math.abs(Math.abs(led.current) - (9 - 2) / 330) < 0.001);
    strict_1.default.ok(Math.abs(Math.abs(led.voltage) - 2) < 0.05);
});
(0, node_test_1.default)('returns a useful diagnostic when ground is missing', () => {
    const circuit = (0, circuitTemplates_js_1.createResistorCircuit)(5, 1000);
    circuit.components = circuit.components.filter((component) => component.kind !== 'ground');
    const result = (0, circuitSimulator_js_1.simulateCircuit)(circuit);
    strict_1.default.equal(result.ok, false);
    strict_1.default.equal(result.diagnostics.some((item) => item.code === 'GROUND_REQUIRED'), true);
});
(0, node_test_1.default)('supports an ideal current source driving a grounded resistor', () => {
    const circuit = {
        version: 1,
        id: 'current-source-test',
        name: 'Current Source Test',
        updatedAt: new Date(0).toISOString(),
        components: [
            { id: 'source', kind: 'current-source', label: 'I1', x: 0, y: 0, rotation: 0, current: 0.02 },
            { id: 'resistor', kind: 'resistor', label: 'R1', x: 0, y: 0, rotation: 0, resistance: 100 },
            { id: 'ground', kind: 'ground', label: 'GND', x: 0, y: 0, rotation: 0 }
        ],
        wires: [
            { id: 'w1', from: 'source:a', to: 'resistor:a' },
            { id: 'w2', from: 'source:b', to: 'resistor:b' },
            { id: 'w3', from: 'source:b', to: 'ground:a' }
        ]
    };
    const result = (0, circuitSimulator_js_1.simulateCircuit)(circuit);
    strict_1.default.equal(result.ok, true);
    strict_1.default.ok(Math.abs(Math.abs(result.components.resistor.current) - 0.02) < 1e-8);
    strict_1.default.ok(Math.abs(Math.abs(result.components.resistor.voltage) - 2) < 1e-8);
});
(0, node_test_1.default)('provides realistic ammeter and voltmeter readings', () => {
    const result = (0, circuitSimulator_js_1.simulateCircuit)((0, circuitTemplates_js_1.createMeasurementBench)());
    strict_1.default.equal(result.ok, true);
    strict_1.default.ok(Math.abs(Math.abs(result.components.ammeter.current) - 9 / 330) < 0.00001);
    strict_1.default.ok(Math.abs(Math.abs(result.components.voltmeter.voltage) - 9) < 0.001);
});
(0, node_test_1.default)('opens an overloaded fuse and reports the event', () => {
    const circuit = {
        version: 1,
        id: 'fuse-test',
        name: 'Fuse Test',
        updatedAt: new Date(0).toISOString(),
        components: [
            { id: 'source', kind: 'battery', label: 'BAT1', x: 0, y: 0, rotation: 0, voltage: 12 },
            { id: 'fuse', kind: 'fuse', label: 'F1', x: 0, y: 0, rotation: 0, ratedCurrent: 0.5 },
            { id: 'load', kind: 'resistor', label: 'R1', x: 0, y: 0, rotation: 0, resistance: 1 },
            { id: 'ground', kind: 'ground', label: 'GND', x: 0, y: 0, rotation: 0 }
        ],
        wires: [
            { id: 'w1', from: 'source:a', to: 'fuse:a' },
            { id: 'w2', from: 'fuse:b', to: 'load:a' },
            { id: 'w3', from: 'load:b', to: 'source:b' },
            { id: 'w4', from: 'source:b', to: 'ground:a' }
        ]
    };
    const result = (0, circuitSimulator_js_1.simulateCircuit)(circuit);
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal(result.components.fuse.overloaded, true);
    strict_1.default.equal(result.components.fuse.current, 0);
    strict_1.default.equal(result.diagnostics.some((item) => item.code === 'FUSE_OVERLOAD'), true);
});
