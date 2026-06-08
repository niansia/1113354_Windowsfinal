import type { AppId } from '../types.js';

export type AppCategory =
  | 'system'
  | 'files'
  | 'creative'
  | 'development'
  | 'data'
  | 'web'
  | 'play'
  | 'utilities'
  | 'settings';

export type AppLaunchMode = 'host' | 'overlay';

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
  launchMode: AppLaunchMode;
  featured?: boolean;
}

export const FUSION_APPS: FusionApp[] = [
  {
    id: 'pc',
    title: '本機',
    subtitle: 'Fusion 工作區',
    description: '查看 Fusion OS 工作區、已連接的儲存空間與系統總覽。',
    glyph: 'OS',
    color: '#67e8ff',
    category: 'system',
    tags: ['系統', '工作區', '首頁'],
    status: '已就緒',
    launchMode: 'overlay'
  },
  {
    id: 'dir',
    title: '專案檔案',
    subtitle: '本機檔案空間',
    description: '瀏覽專案資料夾，並透過安全檔案工作區開啟本機目錄。',
    glyph: 'DIR',
    color: '#6aa8ff',
    category: 'files',
    tags: ['檔案', '資料夾', '專案'],
    status: '已就緒',
    launchMode: 'overlay'
  },
  {
    id: 'tool',
    title: '應用程式中心',
    subtitle: '統一應用程式入口',
    description: '從單一入口開啟創作工作室、工程工具、資料應用程式與實用工具。',
    glyph: 'APP',
    color: '#ff6a9e',
    category: 'system',
    tags: ['啟動器', '應用程式', '入口'],
    status: '15 個應用程式',
    launchMode: 'overlay',
    featured: true
  },
  {
    id: 'web',
    title: '網頁區',
    subtitle: 'Chromium 工作區',
    description: '在 Fusion OS 內瀏覽網頁並開啟 HTML、CSS 與 JavaScript 專案。',
    glyph: 'WEB',
    color: '#7aa7ff',
    category: 'web',
    tags: ['網頁', '瀏覽器', 'WebView'],
    status: '已上線',
    launchMode: 'host'
  },
  {
    id: 'game',
    title: 'Fusion RPG',
    subtitle: '櫻花校園動作遊戲',
    description: '啟動整合式第三人稱 Unity 動作角色扮演遊戲。',
    glyph: 'GAME',
    color: '#c35cff',
    category: 'play',
    tags: ['Unity', '角色扮演', '櫻花', '3D'],
    status: 'Unity',
    launchMode: 'host'
  },
  {
    id: 'set',
    title: '系統設定',
    subtitle: '個人化 Fusion OS',
    description: '管理外觀、互動、語言、協助工具與桌面行為。',
    glyph: 'SET',
    color: '#a385ff',
    category: 'settings',
    tags: ['設定', '系統', '桌面殼層'],
    status: '已就緒',
    launchMode: 'overlay'
  },
  {
    id: 'circuit',
    title: '電路工作室',
    subtitle: '設計與測試電路',
    description: '在空間工程畫布上建立、接線、量測並模擬完整的直流電路。',
    glyph: 'PCB',
    color: '#58f0ff',
    category: 'development',
    tags: ['電路', '電子', '模擬', '工程'],
    status: '即時模擬',
    launchMode: 'overlay',
    featured: true
  },
  {
    id: 'piano',
    title: '鋼琴工作室',
    subtitle: '演奏工作區',
    description: '演奏並探索整合式數位鋼琴工作室。',
    glyph: '88',
    color: '#d56bff',
    category: 'creative',
    tags: ['音訊', '音樂', '鋼琴'],
    status: '已就緒',
    launchMode: 'host'
  },
  {
    id: 'media',
    title: 'AURORA 影音中心',
    subtitle: '影院與播放',
    description: '在具電影感的 Fusion 播放空間中開啟本機媒體。',
    glyph: 'VID',
    color: '#58dcff',
    category: 'creative',
    tags: ['影片', '媒體', '影院'],
    status: '已就緒',
    launchMode: 'host'
  },
  {
    id: 'wav',
    title: '音訊工作室',
    subtitle: '波形工作區',
    description: '在專注的聲音工作區中檢視並播放 WAV 音訊。',
    glyph: 'WAV',
    color: '#78ebda',
    category: 'creative',
    tags: ['WAV', '音訊', '播放清單'],
    status: '已就緒',
    launchMode: 'host'
  },
  {
    id: 'cosmic',
    title: '宇宙手勢',
    subtitle: '空間動作實驗室',
    description: '探索由相機手部追蹤驅動的 WebGL 手勢環境。',
    glyph: 'COS',
    color: '#9c7cff',
    category: 'creative',
    tags: ['手勢', 'WebGL', '動作'],
    status: '相機',
    launchMode: 'host'
  },
  {
    id: 'metro',
    title: 'MetroPulse 智慧交通',
    subtitle: '即時移動智慧',
    description: '探索整合式即時交通與城市移動應用程式。',
    glyph: 'MAP',
    color: '#5ee0b8',
    category: 'data',
    tags: ['交通', '城市', '定位', '即時'],
    status: '即時',
    launchMode: 'host'
  },
  {
    id: 'cultura',
    title: '世界文化星球',
    subtitle: '擬真地球文化探索',
    description: '在擬真 3D 地球上探索世界各國文化，點擊文化標記聆聽程序化合成的在地音樂與語言問候。',
    glyph: 'WCG',
    color: '#5ac8a0',
    category: 'creative',
    tags: ['文化', '3D', '地球', '音樂', '世界'],
    status: '3D',
    launchMode: 'host',
    featured: true
  },
  {
    id: 'verify',
    title: '真偽鑑識中心',
    subtitle: '假新聞多模態鑑識',
    description: '結合 YOLO 影像物件偵測、ELA 影像竄改鑑識、NLP 文字分析與 C++ 多模態融合的假新聞偵測平台。',
    glyph: 'FND',
    color: '#ff5d9e',
    category: 'data',
    tags: ['假新聞', 'YOLO', '電腦視覺', 'NLP', '鑑識'],
    status: 'AI',
    launchMode: 'host',
    featured: true
  },
  {
    id: 'iot',
    title: '物聯網中樞',
    subtitle: '智慧建築指揮中心',
    description: '即時監控智慧建築裝置艦隊：手寫 MQTT broker、C++ 邊緣運算引擎、數位孿生與遙測儀表板。',
    glyph: 'IOT',
    color: '#46e0ff',
    category: 'data',
    tags: ['物聯網', 'MQTT', '數位孿生', '即時'],
    status: '即時',
    launchMode: 'host',
    featured: true
  },
  {
    id: 'dev',
    title: '開發實驗室',
    subtitle: '程式碼與語言工具',
    description: '開啟支援 C#、Python、JavaScript、SQL 與 C++ 的多語言開發工作區。',
    glyph: 'DEV',
    color: '#22d3ee',
    category: 'development',
    tags: ['程式碼', '開發者', '語言'],
    status: '已就緒',
    launchMode: 'host'
  },
  {
    id: 'db',
    title: 'Fusion 資料庫',
    subtitle: '資料表與 SQL',
    description: '在系統殼層內建立本機資料表、編輯記錄並執行 SQL。',
    glyph: 'DB',
    color: '#55d7d0',
    category: 'data',
    tags: ['資料', 'SQL', '儲存空間'],
    status: '本機資料',
    launchMode: 'overlay'
  },
  {
    id: 'toolbox',
    title: '工具箱',
    subtitle: '日常實用工具',
    description: '使用計算、換算、色彩、文字、安全性、時間與繪圖工具。',
    glyph: 'UTIL',
    color: '#ff8bb8',
    category: 'utilities',
    tags: ['計算機', '換算器', '小畫家', '實用工具'],
    status: '10 個工具',
    launchMode: 'overlay'
  },
  {
    id: 'cmd',
    title: '終端機',
    subtitle: '命令工作區',
    description: '開啟 Fusion 命令介面以執行指令碼與系統操作。',
    glyph: 'CMD',
    color: '#70e2bc',
    category: 'development',
    tags: ['CLI', '系統', '終端機'],
    status: '已就緒',
    launchMode: 'host'
  },
  {
    id: 'user',
    title: '使用者空間',
    subtitle: '個人檔案與身分',
    description: '查看本機 Fusion 個人檔案與個人工作區。',
    glyph: 'USR',
    color: '#7ef6c8',
    category: 'system',
    tags: ['個人檔案', '本機', '身分'],
    status: '本機資料',
    launchMode: 'host'
  },
  {
    id: 'add',
    title: '匯入專案',
    subtitle: '新增本機內容',
    description: '將本機專案或檔案集加入 Fusion 工作區。',
    glyph: '+',
    color: '#68a5ff',
    category: 'files',
    tags: ['匯入', '檔案', '專案'],
    status: '可匯入',
    launchMode: 'host'
  }
];

const PRIMARY_SHELL_IDS: AppId[] = ['pc', 'dir', 'tool', 'web', 'game', 'set'];

export const PRIMARY_SHELL_APPS = PRIMARY_SHELL_IDS
  .map((id) => FUSION_APPS.find((app) => app.id === id))
  .filter((app): app is FusionApp => Boolean(app));

export const APP_CENTER_APPS = FUSION_APPS.filter((app) => !PRIMARY_SHELL_IDS.includes(app.id));

export const getAppById = (id: string) => FUSION_APPS.find((app) => app.id === id);
