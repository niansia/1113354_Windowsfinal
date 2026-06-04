import type { Lang } from '../i18n/strings';

type TranslationEntry = Partial<Record<Exclude<Lang, 'zh-TW'>, string>>;

export type SettingsCategoryId =
  | 'system'
  | 'devices'
  | 'network'
  | 'personalize'
  | 'pet'
  | 'apps'
  | 'accounts'
  | 'time'
  | 'gaming'
  | 'accessibility'
  | 'privacy'
  | 'update';

export const SETTINGS_CATEGORY_LABELS: Record<SettingsCategoryId, string> = {
  system: '系統',
  devices: '裝置',
  network: '網路與網際網路',
  personalize: '個人化',
  pet: '桌面寵物',
  apps: '應用程式',
  accounts: '帳戶',
  time: '時間與語言',
  gaming: '遊戲',
  accessibility: '協助工具',
  privacy: '隱私權與安全性',
  update: '系統更新'
};

export const DESKTOP_PET_TEXT = {
  companion: '桌面夥伴',
  preset: '預設',
  imported: '已匯入',
  showDesktopPet: '顯示桌寵',
  showDesktopPetDesc: '在 Fusion OS 桌面顯示可拖曳的動態夥伴。',
  activePet: '目前桌寵',
  activePetDesc: '選擇預設或匯入的桌寵。',
  size: '大小',
  sizeDesc: '調整桌面精靈縮放比例。',
  resetPosition: '重設位置',
  resetPositionDesc: '將桌寵移回 Dock 附近。',
  reset: '重設',
  petLibrary: '桌寵資料庫',
  importPet: '匯入桌寵',
  remove: '移除',
  presetCompanion: '預設夥伴',
  importedCompanion: '匯入夥伴',
  readSpritesheetError: '無法讀取選取的 spritesheet。',
  importPairError: '請同時選取 pet.json 與 PNG 或 WebP spritesheet。',
  importTooLargeError: 'Spritesheet 太大，無法存入本機瀏覽器儲存空間。',
  importFallbackError: '無法匯入這個桌寵。',
  importedStatus: '{0} 已匯入。',
  removedStatus: '{0} 已移除。',
  bundledDescription: '內建 Fusion OS 桌寵。',
  importedDescription: '匯入的桌寵。',
  invalidManifestError: '桌寵 manifest 必須是 JSON 物件。',
  unsupportedSpritesheetError: '桌寵匯入需要 PNG 或 WebP spritesheet。',
  desktopPetAria: '{0} 桌寵'
} as const;

export const ACCOUNT_TEXT = {
  fusionUser: 'Fusion 使用者',
  guest: '訪客'
} as const;

export const SETTINGS_TRANSLATIONS: Record<string, TranslationEntry> = {
  [SETTINGS_CATEGORY_LABELS.system]: { 'zh-CN': '系统', en: 'System', ja: 'システム', ko: '시스템' },
  [SETTINGS_CATEGORY_LABELS.devices]: { 'zh-CN': '装置', en: 'Devices', ja: 'デバイス', ko: '장치' },
  [SETTINGS_CATEGORY_LABELS.network]: { 'zh-CN': '网络和 Internet', en: 'Network & internet', ja: 'ネットワークとインターネット', ko: '네트워크 및 인터넷' },
  [SETTINGS_CATEGORY_LABELS.personalize]: { 'zh-CN': '个性化', en: 'Personalization', ja: '個人用設定', ko: '개인 설정' },
  [SETTINGS_CATEGORY_LABELS.pet]: { 'zh-CN': '桌面宠物', en: 'Desktop Pet', ja: 'デスクトップペット', ko: '데스크톱 펫' },
  [SETTINGS_CATEGORY_LABELS.apps]: { 'zh-CN': '应用程序', en: 'Apps', ja: 'アプリ', ko: '앱' },
  [SETTINGS_CATEGORY_LABELS.accounts]: { 'zh-CN': '帐户', en: 'Accounts', ja: 'アカウント', ko: '계정' },
  [SETTINGS_CATEGORY_LABELS.time]: { 'zh-CN': '时间和语言', en: 'Time & language', ja: '時刻と言語', ko: '시간 및 언어' },
  [SETTINGS_CATEGORY_LABELS.gaming]: { 'zh-CN': '游戏', en: 'Gaming', ja: 'ゲーム', ko: '게임' },
  [SETTINGS_CATEGORY_LABELS.accessibility]: { 'zh-CN': '辅助功能', en: 'Accessibility', ja: 'アクセシビリティ', ko: '접근성' },
  [SETTINGS_CATEGORY_LABELS.privacy]: { 'zh-CN': '隐私和安全性', en: 'Privacy & security', ja: 'プライバシーとセキュリティ', ko: '개인정보 및 보안' },
  [SETTINGS_CATEGORY_LABELS.update]: { 'zh-CN': '系统更新', en: 'System update', ja: 'システム更新', ko: '시스템 업데이트' },

  [DESKTOP_PET_TEXT.companion]: { 'zh-CN': '桌面伙伴', en: 'Companion', ja: 'コンパニオン', ko: '동반자' },
  [DESKTOP_PET_TEXT.preset]: { 'zh-CN': '预设', en: 'Preset', ja: 'プリセット', ko: '프리셋' },
  [DESKTOP_PET_TEXT.imported]: { 'zh-CN': '已导入', en: 'Imported', ja: 'インポート済み', ko: '가져옴' },
  [DESKTOP_PET_TEXT.showDesktopPet]: { 'zh-CN': '显示桌宠', en: 'Show desktop pet', ja: 'デスクトップペットを表示', ko: '데스크톱 펫 표시' },
  [DESKTOP_PET_TEXT.showDesktopPetDesc]: {
    'zh-CN': '在 Fusion OS 桌面显示可拖拽的动态伙伴。',
    en: 'Display a draggable animated companion on the Fusion OS desktop.',
    ja: 'Fusion OS デスクトップにドラッグできるアニメーションの相棒を表示します。',
    ko: 'Fusion OS 데스크톱에 드래그 가능한 애니메이션 동반자를 표시합니다.'
  },
  [DESKTOP_PET_TEXT.activePet]: { 'zh-CN': '当前桌宠', en: 'Active pet', ja: '現在のペット', ko: '활성 펫' },
  [DESKTOP_PET_TEXT.activePetDesc]: {
    'zh-CN': '选择预设或导入的桌宠。',
    en: 'Choose one preset or imported pet.',
    ja: 'プリセットまたはインポートしたペットを選択します。',
    ko: '프리셋 또는 가져온 펫을 선택합니다.'
  },
  [DESKTOP_PET_TEXT.size]: { 'zh-CN': '大小', en: 'Size', ja: 'サイズ', ko: '크기' },
  [DESKTOP_PET_TEXT.sizeDesc]: { 'zh-CN': '调整桌面精灵缩放比例。', en: 'Adjust the desktop sprite scale.', ja: 'デスクトップスプライトの拡大率を調整します。', ko: '데스크톱 스프라이트 배율을 조정합니다.' },
  [DESKTOP_PET_TEXT.resetPosition]: { 'zh-CN': '重置位置', en: 'Reset position', ja: '位置をリセット', ko: '위치 재설정' },
  [DESKTOP_PET_TEXT.resetPositionDesc]: { 'zh-CN': '将桌宠移回 Dock 附近。', en: 'Move the desktop pet back near the dock.', ja: 'デスクトップペットを Dock 付近に戻します。', ko: '데스크톱 펫을 Dock 근처로 되돌립니다.' },
  [DESKTOP_PET_TEXT.reset]: { 'zh-CN': '重置', en: 'Reset', ja: 'リセット', ko: '재설정' },
  [DESKTOP_PET_TEXT.petLibrary]: { 'zh-CN': '桌宠资料库', en: 'Pet Library', ja: 'ペットライブラリ', ko: '펫 라이브러리' },
  [DESKTOP_PET_TEXT.importPet]: { 'zh-CN': '导入桌宠', en: 'Import pet', ja: 'ペットをインポート', ko: '펫 가져오기' },
  [DESKTOP_PET_TEXT.remove]: { 'zh-CN': '移除', en: 'Remove', ja: '削除', ko: '제거' },
  [DESKTOP_PET_TEXT.presetCompanion]: { 'zh-CN': '预设伙伴', en: 'Preset companion', ja: 'プリセットの相棒', ko: '프리셋 동반자' },
  [DESKTOP_PET_TEXT.importedCompanion]: { 'zh-CN': '导入伙伴', en: 'Imported companion', ja: 'インポートした相棒', ko: '가져온 동반자' },
  [DESKTOP_PET_TEXT.readSpritesheetError]: { 'zh-CN': '无法读取选取的 spritesheet。', en: 'Could not read the selected spritesheet.', ja: '選択した spritesheet を読み取れません。', ko: '선택한 spritesheet를 읽을 수 없습니다.' },
  [DESKTOP_PET_TEXT.importPairError]: {
    'zh-CN': '请同时选择 pet.json 与 PNG 或 WebP spritesheet。',
    en: 'Select pet.json and a PNG or WebP spritesheet together.',
    ja: 'pet.json と PNG または WebP の spritesheet を一緒に選択してください。',
    ko: 'pet.json과 PNG 또는 WebP spritesheet를 함께 선택하세요.'
  },
  [DESKTOP_PET_TEXT.importTooLargeError]: {
    'zh-CN': 'Spritesheet 太大，无法存入本机浏览器存储空间。',
    en: 'Spritesheet is too large for local browser storage.',
    ja: 'Spritesheet が大きすぎるため、ローカルブラウザーのストレージに保存できません。',
    ko: 'Spritesheet가 너무 커서 로컬 브라우저 저장소에 저장할 수 없습니다.'
  },
  [DESKTOP_PET_TEXT.importFallbackError]: { 'zh-CN': '无法导入这个桌宠。', en: 'Could not import this desktop pet.', ja: 'このデスクトップペットをインポートできません。', ko: '이 데스크톱 펫을 가져올 수 없습니다.' },
  [DESKTOP_PET_TEXT.importedStatus]: { 'zh-CN': '{0} 已导入。', en: '{0} imported.', ja: '{0} をインポートしました。', ko: '{0}을(를) 가져왔습니다.' },
  [DESKTOP_PET_TEXT.removedStatus]: { 'zh-CN': '{0} 已移除。', en: '{0} removed.', ja: '{0} を削除しました。', ko: '{0}을(를) 제거했습니다.' },
  [DESKTOP_PET_TEXT.bundledDescription]: { 'zh-CN': '内置 Fusion OS 桌宠。', en: 'Bundled Fusion OS desktop pet.', ja: 'Fusion OS 内蔵のデスクトップペットです。', ko: 'Fusion OS에 포함된 데스크톱 펫입니다.' },
  [DESKTOP_PET_TEXT.importedDescription]: { 'zh-CN': '导入的桌宠。', en: 'Imported desktop pet.', ja: 'インポートしたデスクトップペットです。', ko: '가져온 데스크톱 펫입니다.' },
  [DESKTOP_PET_TEXT.invalidManifestError]: { 'zh-CN': '桌宠 manifest 必须是 JSON 对象。', en: 'Pet manifest must be a JSON object.', ja: 'ペット manifest は JSON オブジェクトである必要があります。', ko: '펫 manifest는 JSON 객체여야 합니다.' },
  [DESKTOP_PET_TEXT.unsupportedSpritesheetError]: {
    'zh-CN': '桌宠导入需要 PNG 或 WebP spritesheet。',
    en: 'Desktop pet imports need a PNG or WebP spritesheet.',
    ja: 'デスクトップペットのインポートには PNG または WebP の spritesheet が必要です。',
    ko: '데스크톱 펫 가져오기에는 PNG 또는 WebP spritesheet가 필요합니다.'
  },
  [DESKTOP_PET_TEXT.desktopPetAria]: { 'zh-CN': '{0} 桌宠', en: '{0} desktop pet', ja: '{0} デスクトップペット', ko: '{0} 데스크톱 펫' },
  [ACCOUNT_TEXT.fusionUser]: { 'zh-CN': 'Fusion 用户', en: 'Fusion User', ja: 'Fusion ユーザー', ko: 'Fusion 사용자' },
  [ACCOUNT_TEXT.guest]: { 'zh-CN': '访客', en: 'Guest', ja: 'ゲスト', ko: '게스트' }
};
