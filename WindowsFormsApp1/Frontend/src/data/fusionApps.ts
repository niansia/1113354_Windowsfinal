import type { AppId } from '../types';

// The WinForms host routes launches by id, so keep these ids stable.
export type AppCategory =
  | 'system'
  | 'files'
  | 'creative'
  | 'dev'
  | 'data'
  | 'web'
  | 'play'
  | 'tools'
  | 'settings';

export interface FusionApp {
  id: AppId;
  title: string;
  subtitle: string;
  description: string;
  glyph: string;
  color: string;
  category: AppCategory;
  tags: string[];
  status: string;
}

export const FUSION_APPS: FusionApp[] = [
  {
    id: 'pc',
    title: '工作區',
    subtitle: '系統總覽',
    description: 'Fusion OS 空間指揮中心與目前工作區。',
    glyph: 'OS',
    color: '#67e8ff',
    category: 'system',
    tags: ['system', 'workspace', 'home'],
    status: '線上'
  },
  {
    id: 'dir',
    title: '專案檔案',
    subtitle: '本機工作區',
    description: '瀏覽專案資料夾、參考素材、建置檔與匯入檔案。',
    glyph: 'DIR',
    color: '#6aa8ff',
    category: 'files',
    tags: ['files', 'folders', 'sync'],
    status: '就緒'
  },
  {
    id: 'piano',
    title: '鋼琴工作室',
    subtitle: '內建應用程式',
    description: '啟動內建鋼琴學習與音樂工作區。',
    glyph: '88',
    color: '#d56bff',
    category: 'creative',
    tags: ['audio', 'studio', 'creative'],
    status: '就緒'
  },
  {
    id: 'media',
    title: 'AURORA 影院',
    subtitle: '內建應用程式',
    description: '啟動內建影院與多媒體播放空間。',
    glyph: 'VID',
    color: '#58dcff',
    category: 'creative',
    tags: ['video', 'media', 'cinema'],
    status: '就緒'
  },
  {
    id: 'wav',
    title: '音訊工作室',
    subtitle: '內建應用程式',
    description: '啟動 WAV 播放、音訊收藏與波形工具。',
    glyph: 'WAV',
    color: '#78ebda',
    category: 'creative',
    tags: ['wav', 'audio', 'playlist'],
    status: '就緒'
  },
  {
    id: 'cosmic',
    title: '宇宙手勢',
    subtitle: 'WebGL 實驗室',
    description: '開啟手勢控制的 3D 宇宙體驗。',
    glyph: 'COS',
    color: '#9c7cff',
    category: 'creative',
    tags: ['gesture', 'webgl', 'motion'],
    status: '就緒'
  },
  {
    id: 'user',
    title: '使用者空間',
    subtitle: '個人檔案',
    description: '集中放置執行捷徑與使用者選取的檔案。',
    glyph: 'USR',
    color: '#7ef6c8',
    category: 'files',
    tags: ['profile', 'local', 'identity'],
    status: '就緒'
  },
  {
    id: 'add',
    title: '新增檔案',
    subtitle: '匯入',
    description: '選取本機檔案並建立 Fusion OS 捷徑。',
    glyph: '+',
    color: '#68a5ff',
    category: 'tools',
    tags: ['import', 'files'],
    status: '就緒'
  },
  {
    id: 'dev',
    title: '語言實驗室',
    subtitle: '開發實驗室',
    description: '開啟混合語言開發工作區。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'dev',
    tags: ['code', 'tools', 'terminal'],
    status: '規劃中'
  },
  {
    id: 'tool',
    title: '工具箱',
    subtitle: '工具',
    description: '自動化、轉換器、API 實驗與工具啟動器。',
    glyph: 'APP',
    color: '#ff6a9e',
    category: 'tools',
    tags: ['launcher', 'tools', 'utility'],
    status: '就緒'
  },
  {
    id: 'db',
    title: '資料庫',
    subtitle: '資料工作區',
    description: 'SQL、SQLite 與結構化資料專案的預留空間。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['data', 'sql', 'storage'],
    status: '規劃中'
  },
  {
    id: 'web',
    title: '網頁區',
    subtitle: '瀏覽器表面',
    description: 'WebView、HTML、CSS 與 JavaScript 實驗工作區。',
    glyph: 'WEB',
    color: '#7aa7ff',
    category: 'web',
    tags: ['web', 'browser', 'webview'],
    status: '就緒'
  },
  {
    id: 'game',
    title: 'Fusion RPG',
    subtitle: 'Unity 原型',
    description: '啟動櫻花學院第三人稱動作 RPG 原型。',
    glyph: 'GAME',
    color: '#c35cff',
    category: 'play',
    tags: ['unity', 'rpg', 'sakura', '3d'],
    status: '可遊玩'
  },
  {
    id: 'cmd',
    title: '終端機',
    subtitle: '命令列',
    description: '開啟 Fusion OS 指令面板，用於腳本與診斷。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'tools',
    tags: ['cli', 'system', 'diagnostics'],
    status: '就緒'
  },
  {
    id: 'set',
    title: '設定',
    subtitle: '系統控制',
    description: '管理語言、主題、路徑、啟動設定與偏好。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['settings', 'system', 'shell'],
    status: '就緒'
  }
];
