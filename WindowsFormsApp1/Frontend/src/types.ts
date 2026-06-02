export type AppId =
  | 'pc' | 'dir' | 'piano' | 'cosmic' | 'user'
  | 'add' | 'dev' | 'tool' | 'db' | 'web'
  | 'game' | 'cmd' | 'set';

export type GestureType =
  | 'INDEX_SWIPE'
  | 'TWO_FINGER_SWIPE'
  | 'PALM_SWIPE'
  | 'GENERIC_HAND_SWIPE'
  | 'NONE';

export type ActivateType =
  | 'DOUBLE_PINCH_ACTIVATE'
  | 'FIST_ACTIVATE'
  | 'INDEX_DOUBLE_TAP_ACTIVATE'
  | 'NONE';

export type StrokePhase = 'IDLE' | 'TRACKING' | 'FIRED' | 'RETURNING' | 'READY_FOR_NEXT';

export type TapPhase =
  | 'IDLE'
  | 'TAP_DOWN_1'
  | 'TAP_UP_1'
  | 'WAIT_SECOND_TAP'
  | 'TAP_DOWN_2'
  | 'ACTIVATED';

export type HandSide = 'Left' | 'Right' | 'Unknown';

export type ControlMode =
  | 'INACTIVE'
  | 'ARMING'
  | 'CONTROL_ARMED'
  | 'ACTIVE_CONTROLLING'
  | 'SUSPENDED_BY_MOUSE'
  | 'LOST';

export type FistPhase =
  | 'IDLE'
  | 'READY_OPEN_HAND'
  | 'FIST_CLOSING'
  | 'FIST_HOLDING'
  | 'ACTIVATED'
  | 'WAIT_RELEASE'
  | 'SUPPRESSED_RESTING';

export interface AppConfig {
  id: AppId;
  title: string;
  glyph: string;
  description: string;
  color: string;
}

export interface WindowState {
  id: AppId;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export const APPS_CONFIG: AppConfig[] = [
  { id: 'pc', title: '系統核心', glyph: 'PC', description: '檢視 FusionOS 狀態、裝置資訊與系統模組。', color: '#38d5ff' },
  { id: 'dir', title: '專案檔案', glyph: 'DIR', description: '管理作品資料夾、整合套件與使用者檔案。', color: '#ffb45c' },
  { id: 'piano', title: '鋼琴工作室', glyph: '88', description: '已整合的 WinForms 鋼琴作品。', color: '#ff4fb8' },
  { id: 'cosmic', title: '宇宙手勢', glyph: 'COS', description: '粒子宇宙與手勢辨識互動作品。', color: '#7c8cff' },
  { id: 'user', title: '使用者空間', glyph: 'USR', description: '放置自行新增的檔案與捷徑。', color: '#39d8c8' },
  { id: 'add', title: '新增檔案', glyph: '+', description: '將外部檔案新增到 FusionOS 桌面。', color: '#68a5ff' },
  { id: 'dev', title: '語言實驗室', glyph: 'DEV', description: 'C#、Python、JavaScript 與跨語言模組。', color: '#22d3ee' },
  { id: 'tool', title: '工具箱', glyph: 'TOOL', description: '資料處理、API 與實用工具集合。', color: '#ff6a7f' },
  { id: 'db', title: '資料核心', glyph: 'DB', description: '資料庫、SQL 與資料索引整合區。', color: '#55d7d0' },
  { id: 'web', title: '網頁區域', glyph: 'WEB', description: 'WebView、前端頁面與網頁作品整合。', color: '#7aa7ff' },
  { id: 'game', title: '遊戲房', glyph: 'GAME', description: '遊戲、互動視覺與 3D 作品預留區。', color: '#c35cff' },
  { id: 'cmd', title: '終端機', glyph: 'CMD', description: '命令列、腳本執行與系統紀錄入口。', color: '#70e2bc' },
  { id: 'set', title: '系統設定', glyph: 'SET', description: '語言、外觀、手勢與效能設定。', color: '#a385ff' }
];
