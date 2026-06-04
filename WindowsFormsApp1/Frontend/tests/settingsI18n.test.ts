import assert from 'node:assert/strict';
import test from 'node:test';
import { TRANSLATIONS, type Lang } from '../src/i18n/strings.js';
import { ACCOUNT_TEXT, DESKTOP_PET_TEXT, SETTINGS_CATEGORY_LABELS, SETTINGS_TRANSLATIONS } from '../src/settings/settingsText.js';

function render(source: string, lang: Lang): string {
  if (lang === 'zh-TW') return source;
  return SETTINGS_TRANSLATIONS[source]?.[lang] ?? TRANSLATIONS[source]?.[lang] ?? source;
}

test('settings navigation defaults to Traditional Chinese and translates to English', () => {
  assert.equal(render(SETTINGS_CATEGORY_LABELS.system, 'zh-TW'), '系統');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.devices, 'zh-TW'), '裝置');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.network, 'zh-TW'), '網路與網際網路');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.personalize, 'zh-TW'), '個人化');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.pet, 'zh-TW'), '桌面寵物');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.time, 'zh-TW'), '時間與語言');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.privacy, 'zh-TW'), '隱私權與安全性');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.update, 'zh-TW'), '系統更新');

  assert.equal(render(SETTINGS_CATEGORY_LABELS.system, 'en'), 'System');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.devices, 'en'), 'Devices');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.network, 'en'), 'Network & internet');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.pet, 'en'), 'Desktop Pet');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.time, 'en'), 'Time & language');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.privacy, 'en'), 'Privacy & security');
  assert.equal(render(SETTINGS_CATEGORY_LABELS.update, 'en'), 'System update');
});

test('desktop pet settings copy follows the settings language', () => {
  assert.equal(render(DESKTOP_PET_TEXT.companion, 'zh-TW'), '桌面夥伴');
  assert.equal(render(DESKTOP_PET_TEXT.showDesktopPet, 'zh-TW'), '顯示桌寵');
  assert.equal(render(DESKTOP_PET_TEXT.importPet, 'zh-TW'), '匯入桌寵');
  assert.equal(render(DESKTOP_PET_TEXT.remove, 'zh-TW'), '移除');
  assert.equal(render(DESKTOP_PET_TEXT.presetCompanion, 'zh-TW'), '預設夥伴');

  assert.equal(render(DESKTOP_PET_TEXT.companion, 'en'), 'Companion');
  assert.equal(render(DESKTOP_PET_TEXT.showDesktopPet, 'en'), 'Show desktop pet');
  assert.equal(render(DESKTOP_PET_TEXT.importPet, 'en'), 'Import pet');
  assert.equal(render(DESKTOP_PET_TEXT.remove, 'en'), 'Remove');
  assert.equal(render(DESKTOP_PET_TEXT.presetCompanion, 'en'), 'Preset companion');
});

test('account fallback labels follow the settings language', () => {
  assert.equal(render(ACCOUNT_TEXT.fusionUser, 'zh-TW'), 'Fusion 使用者');
  assert.equal(render(ACCOUNT_TEXT.guest, 'zh-TW'), '訪客');

  assert.equal(render(ACCOUNT_TEXT.fusionUser, 'en'), 'Fusion User');
  assert.equal(render(ACCOUNT_TEXT.guest, 'en'), 'Guest');
});
