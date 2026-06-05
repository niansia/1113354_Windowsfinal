import assert from 'node:assert/strict';
import test from 'node:test';
import { matchWakePhrase } from '../src/assistant/wakeWords.js';

test('extracts a Traditional Chinese command spoken with the wake phrase', () => {
  assert.deepEqual(matchWakePhrase('嗨 Fusion，現在幾點？'), {
    matched: true,
    command: '現在幾點？'
  });
});

test('supports English and East Asian wake phrases', () => {
  assert.deepEqual(matchWakePhrase('Hey Fusion, what time is it?'), {
    matched: true,
    command: 'what time is it?'
  });
  assert.equal(matchWakePhrase('ねえ Fusion、今日の天気は？').matched, true);
  assert.equal(matchWakePhrase('헤이 Fusion, 오늘 날씨 어때?').matched, true);
});

test('does not wake when Fusion is only an app name', () => {
  assert.deepEqual(matchWakePhrase('打開 Fusion RPG'), {
    matched: false,
    command: ''
  });
});

test('accepts a standalone assistant name without inventing a command', () => {
  assert.deepEqual(matchWakePhrase('Fusion'), {
    matched: true,
    command: ''
  });
});
