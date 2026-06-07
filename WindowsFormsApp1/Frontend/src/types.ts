export type AppId =
  | 'pc' | 'dir' | 'piano' | 'media' | 'wav' | 'cosmic' | 'user'
  | 'metro' | 'iot' | 'verify' | 'add' | 'dev' | 'tool' | 'db' | 'web'
  | 'game' | 'cmd' | 'set' | 'circuit' | 'toolbox';

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
  { id: 'pc', title: '工作區', glyph: 'OS', description: 'Fusion OS 空間指揮中心與目前工作區。', color: '#67e8ff' },
  { id: 'dir', title: '專案檔案', glyph: 'DIR', description: '瀏覽專案資料夾、參考素材、建置檔與匯入檔案。', color: '#6aa8ff' },
  { id: 'piano', title: '鋼琴工作室', glyph: '88', description: '啟動內建鋼琴學習與音樂工作區。', color: '#d56bff' },
  { id: 'media', title: 'AURORA 影院', glyph: 'VID', description: '啟動內建影院與多媒體播放空間。', color: '#58dcff' },
  { id: 'wav', title: '音訊工作室', glyph: 'WAV', description: '啟動 WAV 播放、音訊收藏與波形工具。', color: '#78ebda' },
  { id: 'cosmic', title: '宇宙手勢', glyph: 'COS', description: '開啟手勢控制的 3D 宇宙體驗。', color: '#9c7cff' },
  { id: 'user', title: '使用者空間', glyph: 'USR', description: '集中放置執行捷徑與使用者選取的檔案。', color: '#7ef6c8' },
  { id: 'add', title: '新增檔案', glyph: '+', description: '選取本機檔案並建立 Fusion OS 捷徑。', color: '#68a5ff' },
  { id: 'dev', title: '語言實驗室', glyph: 'DEV', description: '開啟混合語言開發工作區。', color: '#22d3ee' },
  { id: 'tool', title: '工具箱', glyph: 'APP', description: '自動化、轉換器、API 實驗與工具啟動器。', color: '#ff6a9e' },
  { id: 'db', title: '資料庫', glyph: 'DB', description: 'SQL、SQLite 與結構化資料專案的預留空間。', color: '#55d7d0' },
  { id: 'web', title: '網頁區', glyph: 'WEB', description: 'WebView、HTML、CSS 與 JavaScript 實驗工作區。', color: '#7aa7ff' },
  { id: 'game', title: 'Fusion RPG', glyph: 'GAME', description: '啟動櫻花學院第三人稱動作 RPG 原型。', color: '#c35cff' },
  { id: 'cmd', title: '終端機', glyph: 'CMD', description: '開啟 Fusion OS 指令面板，用於腳本與診斷。', color: '#70e2bc' },
  { id: 'set', title: '設定', glyph: 'SET', description: '管理語言、主題、路徑、啟動設定與偏好。', color: '#a385ff' }
];
