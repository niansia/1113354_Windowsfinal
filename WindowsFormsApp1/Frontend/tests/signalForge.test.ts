import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSignalFrame,
  estimateChannel,
  runProcessorTrace
} from '../src/signal/signalForge.js';

test('builds a framed payload with parity and checksum details', () => {
  const frame = buildSignalFrame('Fusion');

  assert.equal(frame.payload, 'Fusion');
  assert.equal(frame.byteCount, 6);
  assert.equal(frame.bitCount, 48);
  assert.match(frame.binaryPreview, /^[01 ]+$/);
  assert.equal(frame.parity, 'even');
  assert.equal(frame.hexChecksum.length, 2);
});

test('estimates physical channel behavior from data-rate and medium settings', () => {
  const channel = estimateChannel({
    medium: 'fiber',
    distanceMeters: 1200,
    dataRateMbps: 100,
    carrierFrequencyMhz: 2400,
    noiseDb: 18
  });

  assert.equal(channel.mediumLabel, '光纖鏈路');
  assert.ok(channel.propagationDelayUs > 5);
  assert.ok(channel.wavelengthMeters > 0);
  assert.equal(channel.reliabilityLevel, 'steady');
});

test('runs a processor trace that connects frame bytes to register work', () => {
  const trace = runProcessorTrace(buildSignalFrame('OS'));

  assert.deepEqual(trace.registers.map((register) => register.name), ['R0', 'R1', 'R2', 'R3']);
  assert.ok(trace.steps.some((step) => step.instruction.startsWith('LOAD')));
  assert.ok(trace.steps.some((step) => step.instruction.startsWith('XOR')));
  assert.ok(trace.steps.some((step) => step.instruction.startsWith('STORE')));
});
