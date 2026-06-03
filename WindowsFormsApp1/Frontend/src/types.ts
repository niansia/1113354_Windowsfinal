export type AppId =
  | 'pc' | 'dir' | 'piano' | 'media' | 'wav' | 'cosmic' | 'user'
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
  { id: 'pc', title: 'Workspace', glyph: 'OS', description: 'Fusion OS spatial command center.', color: '#67e8ff' },
  { id: 'dir', title: 'Files', glyph: 'DIR', description: 'Browse local projects and folders.', color: '#6aa8ff' },
  { id: 'piano', title: 'Holo Studio', glyph: '88', description: 'Creative piano and sound workspace.', color: '#d56bff' },
  { id: 'media', title: 'AURORA Cinema', glyph: 'VID', description: 'Multimedia playback and cinema workspace.', color: '#58dcff' },
  { id: 'wav', title: 'Wave Studio', glyph: 'WAV', description: 'WAV playback, audio library, and waveform tools.', color: '#78ebda' },
  { id: 'cosmic', title: 'Flow', glyph: 'COS', description: 'Gesture and WebGL motion surface.', color: '#9c7cff' },
  { id: 'user', title: 'User Space', glyph: 'USR', description: 'Personal workspace profile.', color: '#7ef6c8' },
  { id: 'add', title: 'Add File', glyph: '+', description: 'Import files into the workspace.', color: '#68a5ff' },
  { id: 'dev', title: 'Aurora', glyph: 'DEV', description: 'Development lab and code tools.', color: '#22d3ee' },
  { id: 'tool', title: 'Apps', glyph: 'APP', description: 'Utility and app launcher.', color: '#ff6a9e' },
  { id: 'db', title: 'Orbital', glyph: 'DB', description: 'Database and data workspace.', color: '#55d7d0' },
  { id: 'web', title: 'Web', glyph: 'WEB', description: 'Browser tools and WebView surfaces.', color: '#7aa7ff' },
  { id: 'game', title: 'Game Room', glyph: 'GAME', description: 'Interactive play and 3D experiments.', color: '#c35cff' },
  { id: 'cmd', title: 'Terminal', glyph: 'CMD', description: 'Command line and diagnostics.', color: '#70e2bc' },
  { id: 'set', title: 'System', glyph: 'SET', description: 'Fusion OS preferences and settings.', color: '#a385ff' }
];
