import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAgenda } from '../src/assistant/agendaParse.js';
import { parseIntent } from '../src/assistant/nlu.js';

// Fixed reference point: 2026-06-19 is a Friday (matches the running Fusion OS clock).
const NOW = new Date(2026, 5, 19);

test('parses "幫我在明天下午三點標註開會" into tomorrow 15:00 / 開會', () => {
  const result = parseAgenda('幫我在明天下午三點標註開會', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-20');
  assert.equal(result.time, '15:00');
  assert.equal(result.title, '開會');
  assert.equal(result.hasDate, true);
  assert.equal(result.hasTime, true);
});

test('parses "提醒我後天早上九點交報告" into +2 days 09:00 / 交報告', () => {
  const result = parseAgenda('提醒我後天早上九點交報告', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-21');
  assert.equal(result.time, '09:00');
  assert.equal(result.title, '交報告');
});

test('parses an explicit "6月25日晚上八點" date and pm time', () => {
  const result = parseAgenda('幫我在6月25日晚上八點標註生日聚會', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-25');
  assert.equal(result.time, '20:00');
  assert.equal(result.title, '生日聚會');
});

test('an all-day task with no time defaults to today', () => {
  const result = parseAgenda('記得買牛奶', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-19');
  assert.equal(result.time, null);
  assert.equal(result.title, '買牛奶');
  assert.equal(result.hasDate, false);
});

test('resolves "下週一" to next week\'s Monday (not two weeks out)', () => {
  const result = parseAgenda('下週一開會', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-22');
  assert.equal(result.title, '開會');
});

test('resolves "三天後" as a relative day offset', () => {
  const result = parseAgenda('三天後提醒我繳費', 'zh-TW', NOW);
  assert.equal(result.date, '2026-06-22');
  assert.equal(result.title, '繳費');
});

test('parses an English reminder with am time', () => {
  const result = parseAgenda('remind me tomorrow at 9am to call mom', 'en', NOW);
  assert.equal(result.date, '2026-06-20');
  assert.equal(result.time, '09:00');
  assert.ok(result.title.includes('call mom'));
});

test('routes reminder phrasing to the add_note intent but keeps app-open separate', () => {
  assert.equal(parseIntent('幫我在明天下午三點標註開會').kind, 'add_note');
  assert.equal(parseIntent('提醒我繳電費').kind, 'add_note');
  // Opening the app itself is still an app launch, not a note.
  assert.equal(parseIntent('打開記事本').kind, 'open_app');
  assert.equal(parseIntent('打開記事本').appId, 'notes');
});
