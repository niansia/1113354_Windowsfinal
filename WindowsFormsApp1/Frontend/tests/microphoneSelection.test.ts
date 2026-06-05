import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyMicrophoneSignal,
  choosePreferredMicrophone
} from '../src/assistant/microphoneSelection.js';

test('prefers a physical microphone array over silent virtual voice devices', () => {
  const selected = choosePreferredMicrophone([
    { deviceId: 'voice-changer', kind: 'audioinput', label: '麥克風 (Voice Changer Virtual Audio Device)' },
    { deviceId: 'realtek', kind: 'audioinput', label: '麥克風排列 (Realtek(R) Audio)' },
    { deviceId: 'hitpaw', kind: 'audioinput', label: 'HitPaw Virtual Audio Input' }
  ]);

  assert.equal(selected?.deviceId, 'realtek');
});

test('keeps a normal external USB microphone eligible', () => {
  const selected = choosePreferredMicrophone([
    { deviceId: 'virtual', kind: 'audioinput', label: 'Virtual Audio Cable' },
    { deviceId: 'usb', kind: 'audioinput', label: 'USB Microphone' }
  ]);

  assert.equal(selected?.deviceId, 'usb');
});

test('classifies silent, audible, and speech-range microphone levels', () => {
  assert.equal(classifyMicrophoneSignal(-108), 'silent');
  assert.equal(classifyMicrophoneSignal(-62), 'audible');
  assert.equal(classifyMicrophoneSignal(-28), 'speech');
});
