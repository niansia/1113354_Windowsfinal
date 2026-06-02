import type { AppId } from '../types';

// The WebView2 host routes app launches by id, so keep these ids stable.
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
    title: '系統核心',
    subtitle: 'This PC',
    description: '檢視 FusionOS 狀態、裝置資訊與目前整合中的系統模組。',
    glyph: 'PC',
    color: '#38d5ff',
    category: 'system',
    tags: ['系統', '狀態', '裝置'],
    status: 'ONLINE'
  },
  {
    id: 'dir',
    title: '專案檔案',
    subtitle: 'Project Files',
    description: '集中管理期末專案、整合套件、使用者加入的檔案與作品資料夾。',
    glyph: 'DIR',
    color: '#ffb45c',
    category: 'files',
    tags: ['資料夾', '整合', '作品'],
    status: 'SYNCED'
  },
  {
    id: 'piano',
    title: '鋼琴工作室',
    subtitle: 'Piano Studio',
    description: '已整包導入的 WinForms 鋼琴作品，可從 FusionOS 直接啟動。',
    glyph: '88',
    color: '#ff4fb8',
    category: 'creative',
    tags: ['音樂', 'WinForms', '內建 App'],
    status: 'READY'
  },
  {
    id: 'cosmic',
    title: '宇宙手勢',
    subtitle: 'Cosmic Gesture',
    description: 'React、Three.js、粒子天體與手勢辨識組成的沉浸式宇宙互動作品。',
    glyph: 'COS',
    color: '#7c8cff',
    category: 'creative',
    tags: ['WebGL', '手勢', '粒子'],
    status: 'LIVE'
  },
  {
    id: 'user',
    title: '使用者空間',
    subtitle: 'User Space',
    description: '放置你自行新增的檔案、捷徑與之後要收進系統的作品素材。',
    glyph: 'USR',
    color: '#39d8c8',
    category: 'files',
    tags: ['檔案', '個人', '快捷'],
    status: 'READY'
  },
  {
    id: 'add',
    title: '新增檔案',
    subtitle: 'Add File',
    description: '把外部檔案新增到 FusionOS 桌面，作為可管理的系統檔案。',
    glyph: '+',
    color: '#68a5ff',
    category: 'tools',
    tags: ['新增', '檔案'],
    status: 'READY'
  },
  {
    id: 'dev',
    title: '語言實驗室',
    subtitle: 'Language Lab',
    description: '預留給 C#、Python、JavaScript、資料庫與跨語言整合實驗。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'dev',
    tags: ['程式', '跨語言', '模組'],
    status: 'BETA'
  },
  {
    id: 'tool',
    title: '工具箱',
    subtitle: 'Tool Box',
    description: '集中放置資料處理、API、小工具、轉換器與實用功能。',
    glyph: 'TOOL',
    color: '#ff6a7f',
    category: 'tools',
    tags: ['工具', 'API', '流程'],
    status: 'READY'
  },
  {
    id: 'db',
    title: '資料核心',
    subtitle: 'Database',
    description: '預留資料庫、SQL、資料視覺化與作品資料索引整合區。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['SQL', '資料', '索引'],
    status: 'ONLINE'
  },
  {
    id: 'web',
    title: '網頁區域',
    subtitle: 'Web Zone',
    description: '整合網頁作品、WebView 模組、前端頁面與外部資料來源。',
    glyph: 'WEB',
    color: '#7aa7ff',
    category: 'web',
    tags: ['Web', 'WebView', '前端'],
    status: 'ONLINE'
  },
  {
    id: 'game',
    title: '遊戲房',
    subtitle: 'Game Room',
    description: '預留遊戲、互動視覺、Unity、Unreal 或 Canvas 作品整合。',
    glyph: 'GAME',
    color: '#c35cff',
    category: 'play',
    tags: ['遊戲', '互動', '3D'],
    status: 'READY'
  },
  {
    id: 'cmd',
    title: '終端機',
    subtitle: 'Terminal',
    description: '預留命令列、腳本執行、系統紀錄與開發者操作入口。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'tools',
    tags: ['CLI', '腳本', '系統'],
    status: 'READY'
  },
  {
    id: 'set',
    title: '系統設定',
    subtitle: 'Settings',
    description: '調整語言、外觀、手勢、效能與 FusionOS 系統行為。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['設定', '語言', '偏好'],
    status: 'ONLINE'
  }
];
