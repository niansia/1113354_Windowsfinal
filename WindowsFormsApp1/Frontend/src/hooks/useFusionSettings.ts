import { useCallback, useEffect, useState } from 'react';
import { isDesktopPetAsset, type DesktopPetAsset, type DesktopPetPosition } from '../pets/desktopPetRegistry';
import { normalizeLanguage, normalizeTimezone } from '../i18n/localeFormatting';

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
  // Voice assistant
  assistantEnabled: boolean;
  assistantVoice: boolean;
  assistantWakeWord: boolean;
  assistantUseAI: boolean;
  assistantModel: string;
  assistantServerUrl: string;
  // Desktop pet
  desktopPetEnabled: boolean;
  desktopPetSelectedId: string;
  desktopPetScale: number;
  desktopPetPosition: DesktopPetPosition;
  desktopPetCustoms: DesktopPetAsset[];
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
  notifications: true,
  assistantEnabled: true,
  assistantVoice: true,
  assistantWakeWord: true,
  assistantUseAI: true,
  assistantModel: 'gemma3:12b',
  assistantServerUrl: 'http://localhost:8770',
  desktopPetEnabled: true,
  desktopPetSelectedId: 'yuexin-miao',
  desktopPetScale: 72,
  desktopPetPosition: { x: -1, y: -1 },
  desktopPetCustoms: []
};

const STORAGE_KEY = 'fusionOsSettings.v3';
const LEGACY_STORAGE_KEY = 'fusionOsSettings.v2';

function normalizeSettings(value: Partial<FusionSettingsState>): FusionSettingsState {
  const next = { ...DEFAULT_SETTINGS, ...value };
  next.language = normalizeLanguage(next.language);
  next.timezone = normalizeTimezone(next.timezone);
  next.clock24 = Boolean(next.clock24);
  next.desktopPetScale = Math.min(120, Math.max(45, Number(next.desktopPetScale) || DEFAULT_SETTINGS.desktopPetScale));
  next.desktopPetPosition =
    next.desktopPetPosition &&
    Number.isFinite(next.desktopPetPosition.x) &&
    Number.isFinite(next.desktopPetPosition.y)
      ? next.desktopPetPosition
      : DEFAULT_SETTINGS.desktopPetPosition;
  next.assistantEnabled = Boolean(next.assistantEnabled);
  next.assistantVoice = Boolean(next.assistantVoice);
  next.assistantWakeWord = Boolean(next.assistantWakeWord);
  next.assistantUseAI = Boolean(next.assistantUseAI);
  next.assistantModel = String(next.assistantModel || DEFAULT_SETTINGS.assistantModel).trim() || DEFAULT_SETTINGS.assistantModel;
  next.assistantServerUrl = String(next.assistantServerUrl || DEFAULT_SETTINGS.assistantServerUrl).trim() || DEFAULT_SETTINGS.assistantServerUrl;
  next.desktopPetCustoms = Array.isArray(next.desktopPetCustoms) ? next.desktopPetCustoms.filter(isDesktopPetAsset) : [];
  next.desktopPetSelectedId = String(next.desktopPetSelectedId || DEFAULT_SETTINGS.desktopPetSelectedId);
  next.desktopPetEnabled = Boolean(next.desktopPetEnabled);
  return next;
}

function loadSettings(): FusionSettingsState {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<FusionSettingsState>);

    const legacyRaw = window.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<FusionSettingsState>;
      return normalizeSettings({
        ...legacy,
        microphone: true,
        assistantEnabled: true,
        assistantVoice: true,
        assistantWakeWord: true,
        assistantUseAI: true
      });
    }
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
