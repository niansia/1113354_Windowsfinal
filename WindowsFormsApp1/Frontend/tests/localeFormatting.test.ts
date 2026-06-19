import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fusionCalendarKey,
  formatFusionDate,
  formatFusionEventDateTime,
  formatFusionDateTime,
  formatFusionTime,
  normalizeLanguage
} from '../src/i18n/localeFormatting.js';

const sample = new Date('2026-06-05T04:55:00.000Z');

test('falls back to Traditional Chinese for missing or unsupported language values', () => {
  assert.equal(normalizeLanguage(undefined), 'zh-TW');
  assert.equal(normalizeLanguage(''), 'zh-TW');
  assert.equal(normalizeLanguage('fr'), 'zh-TW');
  assert.equal(normalizeLanguage('en'), 'en');
});

test('builds sports date keys and event labels in the selected system timezone', () => {
  const sample = new Date('2026-06-14T16:30:00Z');

  assert.equal(fusionCalendarKey(sample, 'Asia/Taipei'), '2026-06-15');
  assert.match(
    formatFusionEventDateTime(sample, 'en', 'America/New_York', false),
    /Jun|June/
  );
});

test('formats the shell clock with the configured locale, timezone, and clock mode', () => {
  assert.equal(formatFusionTime(sample, 'zh-TW', 'Asia/Taipei', true), '12:55');
  assert.match(formatFusionDate(sample, 'zh-TW', 'Asia/Taipei'), /6月5日/);
  assert.match(formatFusionDate(sample, 'zh-TW', 'Asia/Taipei'), /星期五/);

  const english12Hour = formatFusionTime(sample, 'en', 'America/New_York', false);
  assert.match(english12Hour, /12:55/);
  assert.match(english12Hour.toUpperCase(), /AM/);
});

test('uses a safe timezone fallback for invalid stored values', () => {
  assert.doesNotThrow(() => formatFusionDateTime(sample, 'zh-TW', 'Invalid/Zone', true));
  assert.match(formatFusionDateTime(sample, 'zh-TW', 'Invalid/Zone', true), /12:55/);
});
