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
    subtitle: '融合首頁',
    description: '一個用來啟動應用程式、查看系統狀態並保持專注的空間指揮中心。',
    glyph: 'OS',
    color: '#67e8ff',
    category: 'system',
    tags: ['system', 'workspace', 'home'],
    status: '線上'
  },
  {
    id: 'dir',
    title: '檔案',
    subtitle: '檔案空間',
    description: '透過沉靜的玻璃工作區瀏覽本機專案與工作資料夾。',
    glyph: 'DIR',
    color: '#6aa8ff',
    category: 'files',
    tags: ['files', 'folders', 'sync'],
    status: '已同步'
  },
  {
    id: 'piano',
    title: '全息工作室',
    subtitle: '鋼琴工作室',
    description: '用於聲音實驗與即時樂器工具的創作工作室介面。',
    glyph: '88',
    color: '#d56bff',
    category: 'creative',
    tags: ['audio', 'studio', 'creative'],
    status: '就緒'
  },
  {
    id: 'cosmic',
    title: '流動',
    subtitle: '宇宙手勢',
    description: '與 Fusion OS 介面連動的手勢導覽與動態實驗。',
    glyph: 'COS',
    color: '#9c7cff',
    category: 'creative',
    tags: ['gesture', 'webgl', 'motion'],
    status: '已連結'
  },
  {
    id: 'user',
    title: '使用者空間',
    subtitle: '個人檔案',
    description: '個人工作區偏好設定、身分識別與本機使用者情境。',
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
    description: '將檔案與資料夾匯入目前的 Fusion OS 工作區。',
    glyph: '+',
    color: '#68a5ff',
    category: 'tools',
    tags: ['import', 'files'],
    status: '就緒'
  },
  {
    id: 'dev',
    title: '極光',
    subtitle: '開發實驗室',
    description: '專注於程式碼、指令稿與本機工具的開發實驗室。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'dev',
    tags: ['code', 'tools', 'terminal'],
    status: '可用'
  },
  {
    id: 'tool',
    title: '應用程式',
    subtitle: '工具箱',
    description: '集合各式工具程式、創作工具與系統小幫手的精簡啟動器。',
    glyph: 'APP',
    color: '#ff6a9e',
    category: 'tools',
    tags: ['launcher', 'tools', 'utility'],
    status: '就緒'
  },
  {
    id: 'db',
    title: '軌道',
    subtitle: '資料庫',
    description: '檢視已連線的資料來源與資料庫工作區狀態。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['data', 'sql', 'storage'],
    status: '已連線'
  },
  {
    id: 'web',
    title: '網路',
    subtitle: '網路空間',
    description: '在 Fusion OS 介面中開啟以瀏覽器為基礎的工具。',
    glyph: 'WEB',
    color: '#7aa7ff',
    category: 'web',
    tags: ['web', 'browser', 'webview'],
    status: '就緒'
  },
  {
    id: 'game',
    title: '遊戲室',
    subtitle: '遊戲空間',
    description: '集中於單一遊樂介面的互動式 3D 與遊戲實驗。',
    glyph: 'GAME',
    color: '#c35cff',
    category: 'play',
    tags: ['games', '3d', 'play'],
    status: '就緒'
  },
  {
    id: 'cmd',
    title: '終端機',
    subtitle: '命令列',
    description: '用於本機工作流程控制的命令導向工具與診斷。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'tools',
    tags: ['cli', 'system', 'diagnostics'],
    status: '就緒'
  },
  {
    id: 'set',
    title: '系統',
    subtitle: '設定',
    description: '調整 Fusion OS 偏好設定、介面行為與本機環境狀態。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['settings', 'system', 'shell'],
    status: '就緒'
  }
];
