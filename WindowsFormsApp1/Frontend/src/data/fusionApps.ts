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
    title: '本機',
    subtitle: '系統總覽',
    description: '查看 Fusion OS 的裝置狀態、資源使用、使用者資料與系統資訊。',
    glyph: 'OS',
    color: '#67e8ff',
    category: 'system',
    tags: ['system', 'workspace', 'home'],
    status: '已就緒'
  },
  {
    id: 'dir',
    title: '專案檔案',
    subtitle: '作品資料夾',
    description: '快速開啟期末專案與整合應用程式所在的本機資料夾。',
    glyph: 'DIR',
    color: '#6aa8ff',
    category: 'files',
    tags: ['files', 'folders', 'sync'],
    status: '已就緒'
  },
  {
    id: 'piano',
    title: '鋼琴工作室',
    subtitle: '音樂互動作品',
    description: '啟動鋼琴學習與音樂工具，整合鍵盤互動、音階與播放控制。',
    glyph: '88',
    color: '#d56bff',
    category: 'creative',
    tags: ['audio', 'studio', 'creative'],
    status: '已連結'
  },
  {
    id: 'media',
    title: 'AURORA 影音中心',
    subtitle: '多媒體播放作品',
    description: '啟動影音播放器與媒體管理介面，展示播放清單、平台搜尋與筆記流程。',
    glyph: 'VID',
    color: '#58dcff',
    category: 'creative',
    tags: ['video', 'media', 'cinema'],
    status: '已連結'
  },
  {
    id: 'wav',
    title: '音訊工作室',
    subtitle: 'WAV 與音訊工具',
    description: '啟動 WAV 播放、音訊工具箱與聲波資料視覺化作品。',
    glyph: 'WAV',
    color: '#78ebda',
    category: 'creative',
    tags: ['wav', 'audio', 'playlist'],
    status: '已連結'
  },
  {
    id: 'cosmic',
    title: '宇宙手勢',
    subtitle: 'WebGL 手勢作品',
    description: '以 Python、TypeScript、WebGL 與相機手勢控制打造的 3D 宇宙探索介面。',
    glyph: 'COS',
    color: '#9c7cff',
    category: 'creative',
    tags: ['gesture', 'webgl', 'motion'],
    status: '已預載'
  },
  {
    id: 'metro',
    title: 'MetroPulse 智慧交通',
    subtitle: '即時城市中樞',
    description: '結合定位、開放資料、Python broker 與原生模擬核心的智慧城市交通作品。',
    glyph: 'MAP',
    color: '#5ee0b8',
    category: 'data',
    tags: ['traffic', 'city', 'location', 'realtime'],
    status: '即時'
  },
  {
    id: 'user',
    title: '使用者檔案',
    subtitle: '個人捷徑',
    description: '管理使用者在執行期間加入的本機檔案捷徑與作品入口。',
    glyph: 'USR',
    color: '#7ef6c8',
    category: 'files',
    tags: ['profile', 'local', 'identity'],
    status: '已就緒'
  },
  {
    id: 'add',
    title: '新增檔案',
    subtitle: '匯入捷徑',
    description: '選擇本機檔案並建立 Fusion OS 桌面捷徑。',
    glyph: '+',
    color: '#68a5ff',
    category: 'tools',
    tags: ['import', 'files'],
    status: '可使用'
  },
  {
    id: 'dev',
    title: '開發實驗室',
    subtitle: '程式整合區',
    description: '保留 C#、Python、JavaScript、SQL、C++ 與跨語言整合展示的位置。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'dev',
    tags: ['code', 'tools', 'terminal'],
    status: '建置中'
  },
  {
    id: 'tool',
    title: '工具箱',
    subtitle: '實用工具',
    description: '整合自動化、API、轉檔、計算、資料工具與系統操作入口。',
    glyph: 'APP',
    color: '#ff6a9e',
    category: 'tools',
    tags: ['launcher', 'tools', 'utility'],
    status: '已就緒'
  },
  {
    id: 'db',
    title: '資料庫',
    subtitle: '資料工作區',
    description: '保留 SQL、SQLite、資料表、查詢與分析專案的整合入口。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['data', 'sql', 'storage'],
    status: '建置中'
  },
  {
    id: 'web',
    title: '網頁區',
    subtitle: '瀏覽與 WebView',
    description: '開啟 Fusion Web 入口，進入內嵌 Chromium 瀏覽器與網頁作品區。',
    glyph: 'WEB',
    color: '#7aa7ff',
    category: 'web',
    tags: ['web', 'browser', 'webview'],
    status: '已預載'
  },
  {
    id: 'game',
    title: 'Fusion RPG',
    subtitle: 'Unity 原型',
    description: '啟動櫻花學院第三人稱 RPG Unity 原型。',
    glyph: 'GAME',
    color: '#c35cff',
    category: 'play',
    tags: ['unity', 'rpg', 'sakura', '3d'],
    status: '可執行'
  },
  {
    id: 'cmd',
    title: '終端機',
    subtitle: '命令面板',
    description: '開啟 Fusion OS 內建終端機，用於腳本、診斷與本機命令操作。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'tools',
    tags: ['cli', 'system', 'diagnostics'],
    status: '已就緒'
  },
  {
    id: 'set',
    title: '系統設定',
    subtitle: '語言與個人化',
    description: '管理顯示語言、時區、主題、音訊、隱私、帳戶與啟動設定。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['settings', 'system', 'shell'],
    status: '已就緒'
  }
];
