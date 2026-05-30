export type AppId =
  | 'pc' | 'dir' | 'piano' | 'cosmic' | 'user'
  | 'add' | 'dev' | 'tool' | 'db' | 'web'
  | 'game' | 'cmd' | 'set';

// ---- Gesture recognizer shared type unions ----
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
  { id: 'pc', title: '本機', glyph: 'PC', description: '系統檔案管理與電腦資訊入口。', color: '#6366f1' },
  { id: 'dir', title: '專案檔案', glyph: 'DIR', description: '存放舊作品與新作品的預設資料夾。', color: '#5ad4ff' },
  { id: 'piano', title: '鋼琴工作室', glyph: '88', description: '啟動鋼琴學習與音樂工具。', color: '#cd5fff' },
  { id: 'cosmic', title: '宇宙手勢', glyph: 'COS', description: '啟動 WebGL 宇宙手勢系統。', color: '#677dff' },
  { id: 'user', title: '使用者檔案', glyph: 'USR', description: '執行時由使用者加入的檔案捷徑。', color: '#56d6ff' },
  { id: 'add', title: '新增檔案', glyph: '+', description: '選擇本機檔案並建立桌面捷徑。', color: '#82a5ff' },
  { id: 'dev', title: '語言實驗室', glyph: 'DEV', description: '多語言融合實驗區。', color: '#22d3ee' },
  { id: 'tool', title: '工具箱', glyph: 'TOOL', description: '自動化與資料工具。', color: '#ff818e' },
  { id: 'db', title: '資料庫', glyph: 'DB', description: 'SQL 與資料分析專案。', color: '#ffce8a' },
  { id: 'web', title: '網頁區', glyph: 'WEB', description: 'WebView 與網頁作品。', color: '#77bbff' },
  { id: 'game', title: '遊戲室', glyph: 'GAME', description: '遊戲與視覺展示。', color: '#c026d3' },
  { id: 'cmd', title: '終端機', glyph: 'CMD', description: '命令面板。', color: '#70e2bc' },
  { id: 'set', title: '系統設定', glyph: 'SET', description: '管理系統設定。', color: '#a385ff' },
];
