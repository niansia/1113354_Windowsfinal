import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_CENTER_APPS,
  FUSION_APPS,
  PRIMARY_SHELL_APPS,
  getAppById
} from '../src/data/fusionApps.js';
import { FEATURE_TRANSLATIONS } from '../src/i18n/featureTranslations.js';
import { TRANSLATIONS } from '../src/i18n/strings.js';

test('keeps the primary dock focused on shell-level destinations', () => {
  assert.deepEqual(
    PRIMARY_SHELL_APPS.map((app) => app.id),
    ['pc', 'dir', 'tool', 'web', 'game', 'set']
  );
});

test('moves secondary applications into App Center without losing launch ids', () => {
  const groupedIds = new Set(APP_CENTER_APPS.map((app) => app.id));

  for (const id of ['piano', 'media', 'wav', 'cosmic', 'metro', 'dev', 'db', 'cmd'] as const) {
    assert.equal(groupedIds.has(id), true, `${id} should be available in App Center`);
    assert.equal(getAppById(id)?.id, id);
  }
});

test('registers Circuit Studio as a first-class App Center application', () => {
  const circuit = getAppById('circuit');

  assert.equal(circuit?.title, '電路工作室');
  assert.equal(circuit?.launchMode, 'overlay');
  assert.equal(APP_CENTER_APPS.some((app) => app.id === 'circuit'), true);
  assert.equal(FUSION_APPS.some((app) => app.id === 'circuit'), true);
});

test('uses Traditional Chinese source keys for the default app catalog', () => {
  assert.equal(getAppById('pc')?.title, '本機');
  assert.equal(getAppById('dir')?.title, '專案檔案');
  assert.equal(getAppById('tool')?.title, '應用程式中心');
  assert.equal(getAppById('set')?.title, '系統設定');
  assert.equal(getAppById('circuit')?.subtitle, '設計與測試電路');
});

test('provides every app catalog field in all selectable languages', () => {
  for (const app of FUSION_APPS) {
    for (const source of [app.title, app.subtitle, app.description, app.status, ...app.tags]) {
      const translation = FEATURE_TRANSLATIONS[source] ?? TRANSLATIONS[source];
      assert.ok(translation, `missing translation entry for "${source}"`);
      for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
        assert.ok(translation[lang], `missing ${lang} translation for "${source}"`);
      }
    }
  }
});
