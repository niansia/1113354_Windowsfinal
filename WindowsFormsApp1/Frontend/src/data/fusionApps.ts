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

// 名稱與 WinForms 主機實際開啟的視窗一致（id ↔ glyph 不變，啟動路由不受影響）。
export const FUSION_APPS: FusionApp[] = [
  {
    id: 'pc',
    title: '本機',
    subtitle: '系統資訊',
    description: '系統檔案管理與電腦資訊入口。',
    glyph: 'OS',
    color: '#67e8ff',
    category: 'system',
    tags: ['system', 'workspace', 'home'],
    status: '線上'
  },
  {
    id: 'dir',
    title: '專案檔案',
    subtitle: '檔案空間',
    description: '存放舊作品與新作品的預設資料夾。',
    glyph: 'DIR',
    color: '#6aa8ff',
    category: 'files',
    tags: ['files', 'folders', 'sync'],
    status: '已同步'
  },
  {
    id: 'piano',
    title: '鋼琴工作室',
    subtitle: '內建應用程式',
    description: '啟動鋼琴學習與音樂工具（IntegratedApps/PianoStudio）。',
    glyph: '88',
    color: '#d56bff',
    category: 'creative',
    tags: ['audio', 'studio', 'creative'],
    status: '就緒'
  },
  {
    id: 'media',
    title: '影音中心',
    subtitle: '內建應用程式',
    description: '啟動 AURORA Cinema 多媒體播放器（IntegratedApps/MultimediaStudio）。',
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
    description: '啟動 WAV 與音訊播放工具（IntegratedApps/WaveStudio）。',
    glyph: 'WAV',
    color: '#78ebda',
    category: 'creative',
    tags: ['wav', 'audio', 'playlist'],
    status: '就緒'
  },
  {
    id: 'cosmic',
    title: '宇宙手勢',
    subtitle: '內建應用程式',
    description: 'Python + JavaScript 的 WebGL 宇宙手勢系統。',
    glyph: 'COS',
    color: '#9c7cff',
    category: 'creative',
    tags: ['gesture', 'webgl', 'motion'],
    status: '已連結'
  },
  {
    id: 'user',
    title: '使用者檔案',
    subtitle: '個人檔案',
    description: '執行時由使用者加入的檔案捷徑區。',
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
    description: '選擇本機檔案並建立桌面捷徑。',
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
    description: '預留 C#、Python、JavaScript、SQL、C++ 與多語言融合實驗區。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'dev',
    tags: ['code', 'tools', 'terminal'],
    status: '可用'
  },
  {
    id: 'tool',
    title: '工具箱',
    subtitle: '工具',
    description: '自動化、爬蟲、API、轉檔、計算與資料工具。',
    glyph: 'APP',
    color: '#ff6a9e',
    category: 'tools',
    tags: ['launcher', 'tools', 'utility'],
    status: '就緒'
  },
  {
    id: 'db',
    title: '資料庫',
    subtitle: '資料',
    description: '預留 SQL、SQLite、資料表與分析專案。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['data', 'sql', 'storage'],
    status: '已連線'
  },
  {
    id: 'web',
    title: '網頁區',
    subtitle: '網路空間',
    description: '預留 WebView、HTML、CSS、JavaScript 與網頁作品。',
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
    description: '預留 Unity、Unreal、WinForms 小遊戲與視覺展示。',
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
    description: '未來用來啟動腳本與外部程式的命令面板。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'tools',
    tags: ['cli', 'system', 'diagnostics'],
    status: '就緒'
  },
  {
    id: 'set',
    title: '系統設定',
    subtitle: '設定',
    description: '管理系統語言、主題、強調色、桌布與啟動設定。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['settings', 'system', 'shell'],
    status: '就緒'
  }
];
