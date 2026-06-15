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
import { SPORTS_TRANSLATIONS } from '../src/sports/sportsText.js';

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

test('registers Global Sports Center as a translated data overlay', () => {
  const sports = getAppById('sports');

  assert.equal(sports?.title, '全球體育中心');
  assert.equal(sports?.subtitle, '即時比分、賽程與 AI 預測');
  assert.equal(sports?.category, 'data');
  assert.equal(sports?.launchMode, 'overlay');
  assert.equal(sports?.featured, true);
  assert.equal(APP_CENTER_APPS.some((app) => app.id === 'sports'), true);
});

test('wires Global Sports Center into the React overlay shell', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const shellSource = readFileSync(resolve(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
  const entrySource = readFileSync(resolve(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');

  assert.match(shellSource, /FusionSportsCenter/);
  assert.match(shellSource, /overlayApp === 'sports'/);
  assert.match(entrySource, /fusionSportsCenter\.css/);
});

test('wires event dossiers, prediction evidence, and player matchups into Sports Center', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const sportsSource = readFileSync(resolve(repositoryRoot, 'Frontend/src/components/FusionSportsCenter.tsx'), 'utf8');

  assert.match(sportsSource, /SportsEventDetailDialog/);
  assert.match(sportsSource, /SportsPredictionEvidence/);
  assert.match(sportsSource, /SportsPositionMatchups/);
  assert.match(sportsSource, /onDoubleClick/);
  assert.match(sportsSource, /loadSportsEventDetail/);
});

test('translates every Sports Intelligence expansion label', () => {
  const keys = [
    '查看賽事詳情',
    '賽事詳情',
    '總覽',
    '近期狀態與交手',
    '陣容與球員',
    '資料覆蓋率',
    '轉播',
    '場館地址',
    '近五場',
    '歷史交手',
    '賽事排名',
    '世界排名未由資料源提供',
    '預測依據',
    '影響方向',
    '有利主隊',
    '有利客隊',
    '中性',
    '模型評分',
    '賽季戰績',
    '陣容深度',
    '可用球員',
    '場地因素',
    '位置對位',
    '球員對位',
    '比較分數',
    '此分數為可用資料估計，並非官方球員評分。',
    '球員簡介',
    '身高',
    '體重',
    '出生日期',
    '健康狀態',
    '傷病資訊',
    '完整資料',
    '部分資料',
    '暫無詳細資料',
    '讀取賽事詳情中...',
    '隊伍'
  ];

  for (const key of keys) {
    const translation = SPORTS_TRANSLATIONS[key];
    assert.ok(translation, `missing sports intelligence translation for "${key}"`);
    for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
      assert.ok(translation[lang], `missing ${lang} sports intelligence translation for "${key}"`);
    }
  }
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
      const translation = SPORTS_TRANSLATIONS[source] ?? STYLE_TRANSLATIONS[source] ?? FEATURE_TRANSLATIONS[source] ?? TRANSLATIONS[source];
      assert.ok(translation, `missing translation entry for "${source}"`);
      for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
        assert.ok(translation[lang], `missing ${lang} translation for "${source}"`);
      }
    }
  }
});
