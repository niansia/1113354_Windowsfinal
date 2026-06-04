import { useCallback, useEffect, useState } from 'react';

// Local, sandboxed FusionOS preferences. Most settings only change the React shell,
// while Time & Language is forwarded to the WinForms host so native surfaces stay
// in sync with the same FusionOS settings.

export interface FusionSettingsState {
  // System
  brightness: number;
  nightLight: boolean;
  resolution: string;
  scale: string;
  volume: number;
  output: string;
  muted: boolean;
  powerMode: string;
  screenOff: string;
  // Devices / network (local mock state only)
  bluetooth: boolean;
  wifi: boolean;
  airplane: boolean;
  // Personalization (these DO visibly affect the desktop)
  colorMode: string;
  accent: string;
  wallpaper: number;
  transparency: boolean;
  // Time & language
  language: string;
  timezone: string;
  clock24: boolean;
  // Gaming
  gameMode: boolean;
  captureBg: boolean;
  // Accessibility (textSize + animations affect the desktop)
  textSize: number;
  highContrast: boolean;
  animations: boolean;
  // Privacy (local mock)
  camera: boolean;
  microphone: boolean;
  location: boolean;
  // Update / misc
  autoUpdate: boolean;
  notifications: boolean;
}

export const WALLPAPERS = [
  // index 0 = the default FusionOS desktop background (keeps the original look)
  'radial-gradient(122% 90% at 62% 24%, rgba(86,150,255,0.17), transparent 46%), radial-gradient(92% 82% at 84% 66%, rgba(178,92,255,0.12), transparent 44%), radial-gradient(80% 80% at 14% 92%, rgba(42,214,210,0.10), transparent 40%), linear-gradient(180deg, #05080f 0%, #03050c 56%, #010308 100%)',
  'radial-gradient(125% 95% at 32% 14%, #04263b 0%, #061a2c 46%, #02060f 100%)',
  'radial-gradient(125% 95% at 30% 12%, #2a0b3a 0%, #160a2e 46%, #05030d 100%)',
  'radial-gradient(125% 95% at 30% 12%, #06214a 0%, #061634 46%, #02040d 100%)',
  'radial-gradient(125% 95% at 30% 12%, #14161c 0%, #0a0a10 50%, #030307 100%)',
  'radial-gradient(125% 95% at 30% 12%, #1a0b2e 0%, #2a1052 42%, #06030f 100%)'
];

export const DEFAULT_SETTINGS: FusionSettingsState = {
  brightness: 100,
  nightLight: false,
  resolution: '1920 × 1080',
  scale: '100%',
  volume: 48,
  output: 'fusion-speakers',
  muted: false,
  powerMode: 'balanced',
  screenOff: '10',
  bluetooth: true,
  wifi: true,
  airplane: false,
  colorMode: 'dark',
  accent: '#67e8ff',
  wallpaper: 0,
  transparency: true,
  language: 'zh-TW',
  timezone: 'Asia/Taipei',
  clock24: true,
  gameMode: true,
  captureBg: false,
  textSize: 100,
  highContrast: false,
  animations: true,
  camera: true,
  microphone: true,
  location: false,
  autoUpdate: true,
  notifications: true
};

const STORAGE_KEY = 'fusionOsSettings.v2';

function loadSettings(): FusionSettingsState {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_SETTINGS;
}

export function useFusionSettings() {
  const [settings, setSettings] = useState<FusionSettingsState>(loadSettings);

  const update = useCallback(<K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable (private mode) — non-fatal */
    }
  }, [settings]);

  return { settings, update };
}
