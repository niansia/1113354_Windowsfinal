import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APP_CENTER_APPS,
  FUSION_APPS,
  PRIMARY_SHELL_APPS,
  getAppById
} from '../src/data/fusionApps.js';
import { FEATURE_TRANSLATIONS } from '../src/i18n/featureTranslations.js';
import { TRANSLATIONS } from '../src/i18n/strings.js';
import { STYLE_TRANSLATIONS } from '../src/style/styleText.js';

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

test('registers English Flashcards as a translated host application', () => {
  const flashcards = getAppById('flashcards');

  assert.equal(flashcards?.title, '英文單字卡');
  assert.equal(flashcards?.launchMode, 'host');
  assert.equal(APP_CENTER_APPS.some((app) => String(app.id) === 'flashcards'), true);

  const titleTranslation = TRANSLATIONS['英文單字卡'];
  assert.ok(titleTranslation);
  for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
    assert.ok(titleTranslation[lang], `missing ${lang} translation for English Flashcards`);
  }
});

test('registers Virtual Style Studio as a translated creative overlay', () => {
  const style = getAppById('style');

  assert.equal(style?.title, '虛擬造型工作室');
  assert.equal(style?.category, 'creative');
  assert.equal(style?.launchMode, 'overlay');
  assert.equal(style?.featured, true);
  assert.equal(APP_CENTER_APPS.some((app) => String(app.id) === 'style'), true);
});

test('registers Development Lab as a data structures and algorithms overlay', () => {
  const developmentLab = getAppById('dev');

  assert.equal(developmentLab?.subtitle, '資料結構與演算法');
  assert.equal(developmentLab?.launchMode, 'overlay');
  assert.equal(developmentLab?.category, 'development');
  assert.equal(developmentLab?.tags.includes('視覺化'), true);
  assert.equal(APP_CENTER_APPS.some((app) => app.id === 'dev'), true);
});

test('wires English Flashcards into the WinForms host build and launch route', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const hostSource = readFileSync(resolve(repositoryRoot, 'Form1.cs'), 'utf8');
  const projectSource = readFileSync(resolve(repositoryRoot, 'WindowsFormsApp1.csproj'), 'utf8');

  assert.match(hostSource, /LaunchEnglishFlashcards\(\)/);
  assert.match(hostSource, /lower\.Contains\("\\"flashcards\\""\)/);
  assert.match(projectSource, /IntegratedApps\\EnglishFlashcards\\\*\*\\\*\.csproj/);
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
      const translation = STYLE_TRANSLATIONS[source] ?? FEATURE_TRANSLATIONS[source] ?? TRANSLATIONS[source];
      assert.ok(translation, `missing translation entry for "${source}"`);
      for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
        assert.ok(translation[lang], `missing ${lang} translation for "${source}"`);
      }
    }
  }
});
