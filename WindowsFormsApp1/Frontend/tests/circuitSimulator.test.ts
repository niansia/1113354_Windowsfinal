import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateCircuit } from '../src/circuit/circuitSimulator.js';
import {
  createLedStarterCircuit,
  createMeasurementBench,
  createOpenSwitchCircuit,
  createResistorCircuit
} from '../src/circuit/circuitTemplates.js';
import type { CircuitDocument } from '../src/circuit/circuitTypes.js';

test('solves a grounded voltage source and resistor loop', () => {
  const result = simulateCircuit(createResistorCircuit(9, 330));
  const resistor = result.components.resistor;

  assert.equal(result.ok, true);
  assert.ok(resistor);
  assert.ok(Math.abs(Math.abs(resistor.current) - 9 / 330) < 1e-6);
  assert.ok(Math.abs(Math.abs(resistor.voltage) - 9) < 1e-6);
});

test('reports zero current through an open switch branch', () => {
  const result = simulateCircuit(createOpenSwitchCircuit());

  assert.equal(result.ok, true);
  assert.equal(result.components.switch.current, 0);
  assert.equal(result.components.lamp.active, false);
});

test('applies LED forward voltage and marks the LED active', () => {
  const result = simulateCircuit(createLedStarterCircuit());
  const led = result.components.led;

  assert.equal(result.ok, true);
  assert.equal(led.active, true);
  assert.ok(Math.abs(Math.abs(led.current) - (9 - 2) / 330) < 0.001);
  assert.ok(Math.abs(Math.abs(led.voltage) - 2) < 0.05);
});

test('returns a useful diagnostic when ground is missing', () => {
  const circuit = createResistorCircuit(5, 1000);
  circuit.components = circuit.components.filter((component) => component.kind !== 'ground');

  const result = simulateCircuit(circuit);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((item) => item.code === 'GROUND_REQUIRED'), true);
});

test('supports an ideal current source driving a grounded resistor', () => {
  const circuit: CircuitDocument = {
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

  const result = simulateCircuit(circuit);

  assert.equal(result.ok, true);
  assert.ok(Math.abs(Math.abs(result.components.resistor.current) - 0.02) < 1e-8);
  assert.ok(Math.abs(Math.abs(result.components.resistor.voltage) - 2) < 1e-8);
});

test('provides realistic ammeter and voltmeter readings', () => {
  const result = simulateCircuit(createMeasurementBench());

  assert.equal(result.ok, true);
  assert.ok(Math.abs(Math.abs(result.components.ammeter.current) - 9 / 330) < 0.00001);
  assert.ok(Math.abs(Math.abs(result.components.voltmeter.voltage) - 9) < 0.001);
});

test('opens an overloaded fuse and reports the event', () => {
  const circuit: CircuitDocument = {
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

  const result = simulateCircuit(circuit);

  assert.equal(result.ok, true);
  assert.equal(result.components.fuse.overloaded, true);
  assert.equal(result.components.fuse.current, 0);
  assert.equal(result.diagnostics.some((item) => item.code === 'FUSE_OVERLOAD'), true);
});
