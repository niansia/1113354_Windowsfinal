import type { AppId } from '../types';

// Single source of truth for the spatial desktop app metadata.
// `id` + `glyph` are kept identical to the original APPS_CONFIG so the existing
// WebView2 launch bridge (Form1.cs) keeps working unchanged.
export type AppCategory = 'system' | 'files' | 'creative' | 'dev' | 'data' | 'web' | 'play' | 'tools' | 'settings';

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
  { id: 'pc', title: '本機', subtitle: 'System Core', description: '系統檔案管理與電腦資訊入口，掌握整台機器的狀態。', glyph: 'PC', color: '#6366f1', category: 'system', tags: ['系統', '檔案', '硬體'], status: 'ONLINE' },
  { id: 'dir', title: '專案檔案', subtitle: 'Project Vault', description: '存放舊作品與新作品的預設資料夾，集中管理所有專案。', glyph: 'DIR', color: '#5ad4ff', category: 'files', tags: ['專案', '資料夾'], status: 'SYNCED' },
  { id: 'piano', title: '鋼琴工作室', subtitle: 'Piano Studio', description: '啟動鋼琴學習與音樂創作工具，整合式音訊體驗。', glyph: '88', color: '#cd5fff', category: 'creative', tags: ['音樂', '創作', 'App'], status: 'READY' },
  { id: 'cosmic', title: '宇宙手勢', subtitle: 'Cosmic Explorer', description: 'WebGL 粒子宇宙與手勢操控的天體探索控制台。', glyph: 'COS', color: '#677dff', category: 'creative', tags: ['3D', '手勢', '天文'], status: 'LIVE' },
  { id: 'user', title: '使用者檔案', subtitle: 'User Space', description: '執行時由使用者加入的檔案捷徑，個人化工作區。', glyph: 'USR', color: '#56d6ff', category: 'files', tags: ['捷徑', '個人'], status: 'READY' },
  { id: 'add', title: '新增檔案', subtitle: 'Add Shortcut', description: '選擇本機檔案並建立桌面捷徑，快速擴充工作區。', glyph: '+', color: '#82a5ff', category: 'tools', tags: ['工具', '捷徑'], status: 'READY' },
  { id: 'dev', title: '語言實驗室', subtitle: 'Language Lab', description: 'C#、Python、JavaScript、SQL、C++ 多語言融合實驗區。', glyph: 'DEV', color: '#22d3ee', category: 'dev', tags: ['程式', '實驗'], status: 'BETA' },
  { id: 'tool', title: '工具箱', subtitle: 'Toolbox', description: '自動化與資料處理工具集合，提升日常效率。', glyph: 'TOOL', color: '#ff818e', category: 'tools', tags: ['自動化', '工具'], status: 'READY' },
  { id: 'db', title: '資料庫', subtitle: 'Data Core', description: 'SQL 與資料分析專案，結構化資料的中樞。', glyph: 'DB', color: '#ffce8a', category: 'data', tags: ['SQL', '分析'], status: 'ONLINE' },
  { id: 'web', title: '網頁區', subtitle: 'Web Zone', description: 'WebView 與網頁作品展示，內嵌瀏覽體驗。', glyph: 'WEB', color: '#77bbff', category: 'web', tags: ['Web', '瀏覽'], status: 'ONLINE' },
  { id: 'game', title: '遊戲室', subtitle: 'Game Hub', description: '遊戲與視覺展示，互動娛樂專區。', glyph: 'GAME', color: '#c026d3', category: 'play', tags: ['遊戲', '視覺'], status: 'READY' },
  { id: 'cmd', title: '終端機', subtitle: 'Terminal', description: '命令面板，直接與系統核心對話。', glyph: 'CMD', color: '#70e2bc', category: 'tools', tags: ['CLI', '系統'], status: 'READY' },
  { id: 'set', title: '系統設定', subtitle: 'Settings', description: '語言、主題、啟動、資料夾與路徑的全域設定。', glyph: 'SET', color: '#a385ff', category: 'settings', tags: ['設定', '主題'], status: 'ONLINE' }
];
