import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  AudioWaveform,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircuitBoard,
  Clapperboard,
  Circle,
  Code2,
  Cpu,
  Database,
  Folder,
  Gamepad2,
  Globe2,
  Home,
  LucideIcon,
  Map as MapIcon,
  Menu,
  Music,
  Plus,
  Settings,
  Sparkles,
  Terminal,
  Volume2,
  Wrench,
  Wifi
} from 'lucide-react';
import type { AppId } from '../types';
import type { GestureData, GestureStatus } from '../hooks/useHandGesture';
import { FUSION_APPS, PRIMARY_SHELL_APPS, getAppById, type FusionApp } from '../data/fusionApps';
import { FusionDepthBackground } from './FusionDepthBackground';
import { HeroEnergyCore } from './HeroEnergyCore';
import { FusionSettings } from './FusionSettings';
import { FusionThisPc } from './FusionThisPc';
import { FusionFiles } from './FusionFiles';
import { FusionToolbox } from './FusionToolbox';
import { FusionDatabase } from './FusionDatabase';
import { FusionAppCenter } from './FusionAppCenter';
import { FusionCircuitStudio } from './FusionCircuitStudio';
import { FusionAssistant } from './FusionAssistant';
import { DesktopPet } from './DesktopPet';
import { WALLPAPERS } from '../hooks/useFusionSettings';
import { useSettings } from '../state/SettingsContext';
import { useI18n } from '../i18n/I18nContext';
import { useAccount } from '../account/AccountContext';
import { getPerformanceProfile } from '../utils/performanceProfile';
import { addHostMessageListener, launchApp, sendMessageToHost } from '../utils/bridge';
import { ACCOUNT_TEXT } from '../settings/settingsText';
import { formatFusionDate, formatFusionTime } from '../i18n/localeFormatting';

// Running-carousel geometry (must match .fusion-run-track .fusion-module-card in CSS).
const CARD_W = 208;
const CARD_GAP = 16;
const CARD_STEP = CARD_W + CARD_GAP;

interface SpatialHomeStageProps {
  status: GestureStatus;
  gestureData?: GestureData;
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
}

type LaunchState = 'idle' | 'open' | 'error' | 'closed';
type DesktopContextMenuState = { x: number; y: number };

const NAV_ITEMS: Array<{ label: string; icon: LucideIcon; appId: AppId; launch?: boolean }> = [
  { label: '首頁', icon: Home, appId: 'pc' },
  { label: '專案檔案', icon: Folder, appId: 'dir', launch: true },
  { label: '應用程式中心', icon: AppWindow, appId: 'tool' },
  { label: '系統設定', icon: Settings, appId: 'set', launch: true }
];

const APP_ICONS: Partial<Record<AppId, LucideIcon>> = {
  pc: Cpu,
  dir: Folder,
  piano: Music,
  media: Clapperboard,
  wav: AudioWaveform,
  cosmic: Sparkles,
  metro: MapIcon,
  user: Home,
  add: Plus,
  dev: Code2,
  tool: AppWindow,
  toolbox: Wrench,
  circuit: CircuitBoard,
  db: Database,
  web: Globe2,
  game: Gamepad2,
  cmd: Terminal,
  set: Settings
};

const wrapIndex = (index: number, total: number) => ((index % total) + total) % total;

function resolveApps() {
  return PRIMARY_SHELL_APPS;
}

function appIcon(appId: AppId) {
  return APP_ICONS[appId] ?? AppWindow;
}

function gestureStatusLabel(status: GestureStatus, gestureData?: GestureData) {
  if (gestureData?.isFallback || status === 'FALLBACK_MOUSE_MODE') return '滑鼠輔助';
  if (status === 'HAND_TRACKING' || status === 'PALM_CONTROL' || status === 'INDEX_SWIPE') return '手勢就緒';
  if (status === 'FAST_SWIPE' || status === 'SWIPE_LOCKED') return '已擷取滑動';
  if (status === 'DOUBLE_PINCH' || gestureData?.activateId) return '啟動脈衝';
  if (status === 'ERROR') return '相機降級';
  if (status === 'NO_HAND_IN_FRAME' || status === 'CAMERA_ONLY_MODE') return '相機待命';
  return '系統閒置';
}

export const SpatialHomeStage: React.FC<SpatialHomeStageProps> = ({
  status,
  gestureData,
  onIndexChange,
  onQueueChange
}) => {
  const apps = useMemo(resolveApps, []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [runningApps, setRunningApps] = useState<Set<AppId>>(() => new Set());
  const [launchStates, setLaunchStates] = useState<Partial<Record<AppId, LaunchState>>>({});
  const [lastLaunchMessage, setLastLaunchMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  // In-shell app overlays (React pages instead of the host's placeholder windows).
  const [overlayApp, setOverlayApp] = useState<AppId | null>(null);
  // Voice assistant overlay (summoned by orb / Alt+V / wake word).
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [desktopContextMenu, setDesktopContextMenu] = useState<DesktopContextMenuState | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const [dragDX, setDragDX] = useState(0);
  const runViewportRef = useRef<HTMLDivElement>(null);
  const dockRailRef = useRef<HTMLDivElement>(null);
  const selectedDockBtnRef = useRef<HTMLButtonElement>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const lastSwipeIdRef = useRef(0);
  const lastActivateIdRef = useRef(0);

  // Sandboxed FusionOS preferences (localStorage only — never touches the host OS).
  const { settings, update } = useSettings();
  const { t, tf, lang } = useI18n();
  const { profile: userProfile } = useAccount();

  const profile = useMemo(() => getPerformanceProfile(), []);
  const selectedApp = apps[selectedIndex] ?? apps[0] ?? FUSION_APPS[0];
  const selectedIcon = appIcon(selectedApp.id);
  const handX = gestureData?.handX ?? 0.5;
  const stageTilt = (handX - 0.5) * 2.2;
  const runningCount = runningApps.size;

  const selectIndex = useCallback((nextIndex: number) => {
    if (!apps.length) return;
    const wrapped = wrapIndex(nextIndex, apps.length);
    setSelectedIndex(wrapped);
    onIndexChange?.(wrapped);
    onQueueChange?.(Math.max(0, apps.length - wrapped - 1));
  }, [apps.length, onIndexChange, onQueueChange]);

  const launchFusionApp = useCallback((app: FusionApp) => {
    // Native shell workspaces open inside React; external applications keep
    // their stable WinForms launch ids.
    if (
      app.id === 'set' ||
      app.id === 'pc' ||
      app.id === 'dir' ||
      app.id === 'tool' ||
      app.id === 'db' ||
      app.id === 'circuit' ||
      app.id === 'toolbox'
    ) {
      setOverlayApp(app.id);
      setLastLaunchMessage(tf('已開啟「{0}」。', t(app.title)));
      return;
    }
    setOverlayApp(null);
    launchApp(app.id);
    setLastLaunchMessage(tf('已將「{0}」的啟動要求送至 Fusion 主機。', t(app.title)));
    setLaunchStates((prev) => ({ ...prev, [app.id]: 'open' }));
    setRunningApps((prev) => {
      const next = new Set(prev);
      next.add(app.id);
      return next;
    });
  }, [t, tf]);

  // Launch an app by id (used by the voice assistant); resolves to the same path as a
  // dock/carousel launch so overlay apps open in-shell and host apps go to the host.
  const launchAppById = useCallback((id: AppId): boolean => {
    const app = getAppById(id);
    if (!app) return false;
    launchFusionApp(app);
    return true;
  }, [launchFusionApp]);

  const selectApp = useCallback((appId: AppId, shouldLaunch = false) => {
    const index = apps.findIndex((app) => app.id === appId);
    if (index < 0) return;
    selectIndex(index);
    if (shouldLaunch) launchFusionApp(apps[index]);
  }, [apps, launchFusionApp, selectIndex]);

  const launchSelectedApp = useCallback(() => {
    if (selectedApp) launchFusionApp(selectedApp);
  }, [launchFusionApp, selectedApp]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Measure the running-carousel viewport so the selected card can be centred.
  useEffect(() => {
    const el = runViewportRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Slide the track so the selected card sits centred in the viewport (+ live drag).
  const trackX = (viewportW ? viewportW / 2 - CARD_W / 2 - selectedIndex * CARD_STEP : 0) + dragDX;

  // Keep the selected dock button scrolled into view so the dock mirrors the
  // carousel (same apps, same order, both centred on the selection).
  useEffect(() => {
    selectedDockBtnRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [selectedIndex]);

  // ----- Left-button drag to slide the running carousel -----
  // Capture the pointer only AFTER it moves past a threshold, so a plain click
  // still reaches the card underneath (otherwise pointer-capture swallows it).
  const onCarouselPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    dragStartXRef.current = event.clientX;
    dragMovedRef.current = false;
  }, []);

  const onCarouselPointerMove = useCallback((event: React.PointerEvent) => {
    if (dragStartXRef.current === null) return;
    const dx = event.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 5) {
      if (!dragMovedRef.current) {
        dragMovedRef.current = true;
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      }
      setDragDX(dx);
    }
  }, []);

  const endCarouselDrag = useCallback((event: React.PointerEvent) => {
    if (dragStartXRef.current === null) return;
    const dx = event.clientX - dragStartXRef.current;
    dragStartXRef.current = null;
    setDragDX(0);
    if (dragMovedRef.current) {
      const steps = Math.round(-dx / CARD_STEP);
      if (steps !== 0) selectIndex(selectedIndex + steps);
      // keep the flag set until after the click event so the post-drag click is ignored
      window.setTimeout(() => { dragMovedRef.current = false; }, 0);
    }
  }, [selectIndex, selectedIndex]);

  // Derived desktop theming from the sandboxed settings.
  const uiScale = (parseInt(settings.scale, 10) || 100) / 100;
  const homeClassName = [
    'fusion-stage',
    'fusion-os-home',
    settings.transparency ? '' : 'fusion-no-glass',
    settings.animations ? '' : 'fusion-reduce-motion',
    settings.highContrast ? 'fusion-high-contrast' : '',
    settings.nightLight ? 'fusion-night' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const homeStyle = {
    ['--fusion-accent']: settings.accent,
    ['--fusion-wallpaper']: WALLPAPERS[settings.wallpaper] ?? WALLPAPERS[0],
    ['--fusion-ui-scale']: uiScale
  } as React.CSSProperties;

  const veilOpacity = Math.max(0, Math.min(0.62, (100 - settings.brightness) / 100));

  useEffect(() => {
    return addHostMessageListener((message) => {
      if (message.type !== 'FUSION_APP_LAUNCH_STATUS' || !message.payload || typeof message.payload !== 'object') {
        return;
      }
      const payload = message.payload as { appId?: string; status?: LaunchState; message?: string };
      const appId = payload.appId as AppId | undefined;
      if (!appId) return;

      setLaunchStates((prev) => ({ ...prev, [appId]: payload.status ?? 'idle' }));
      setLastLaunchMessage(payload.message ?? `${appId} 狀態已更新。`);
      setRunningApps((prev) => {
        const next = new Set(prev);
        if (payload.status === 'closed' || payload.status === 'error') next.delete(appId);
        if (payload.status === 'open') next.add(appId);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (overlayApp) return;
    const swipeId = gestureData?.swipeId ?? 0;
    if (!swipeId || swipeId === lastSwipeIdRef.current) return;
    lastSwipeIdRef.current = swipeId;
    selectIndex(selectedIndex + (gestureData?.swipeDirection === 'left' ? 1 : -1));
  }, [gestureData?.swipeDirection, gestureData?.swipeId, selectIndex, selectedIndex, overlayApp]);

  useEffect(() => {
    if (overlayApp) return;
    const activateId = gestureData?.activateId ?? 0;
    if (!activateId || activateId === lastActivateIdRef.current) return;
    lastActivateIdRef.current = activateId;
    launchSelectedApp();
  }, [gestureData?.activateId, launchSelectedApp, overlayApp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (overlayApp) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectIndex(selectedIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectIndex(selectedIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        launchSelectedApp();
      } else if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (apps[index]) {
          event.preventDefault();
          selectIndex(index);
        }
      } else if (event.key === '0') {
        event.preventDefault();
        selectApp('pc');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [apps, launchSelectedApp, selectApp, selectIndex, selectedIndex, overlayApp]);

  const openDesktopContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menuWidth = 270;
    const menuHeight = 390;
    setDesktopContextMenu({
      x: Math.min(event.clientX, Math.max(12, window.innerWidth - menuWidth - 12)),
      y: Math.min(event.clientY, Math.max(12, window.innerHeight - menuHeight - 12))
    });
  }, []);

  const closeDesktopContextMenu = useCallback(() => {
    setDesktopContextMenu(null);
  }, []);

  const runDesktopAction = useCallback((action: string) => {
    setDesktopContextMenu(null);
    if (action === 'refresh') {
      setLastLaunchMessage('Desktop refreshed.');
    } else if (action.startsWith('new-')) {
      setLastLaunchMessage('Creating desktop item...');
    }
    sendMessageToHost('FUSION_DESKTOP_ACTION', { action });
  }, []);

  useEffect(() => {
    if (!desktopContextMenu) return;
    const closeOnPointer = () => closeDesktopContextMenu();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDesktopContextMenu();
    };
    window.addEventListener('pointerdown', closeOnPointer);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnPointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeDesktopContextMenu, desktopContextMenu]);

  return (
    <div className={homeClassName} style={homeStyle} onContextMenu={openDesktopContextMenu}>
      <FusionDepthBackground handX={handX} profile={profile} />
      <div className="fusion-stage-aurora" />
      <div className="fusion-stage-grid" />

      <div className={`fusion-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ transform: `rotateY(${stageTilt}deg)` }}>
        <aside className="fusion-side-panel">
          <div className="fusion-side-brand">
            <div className="fusion-side-orb" />
            <div className="fusion-side-title">
              <span>FUSION</span>
              <strong>OS</strong>
            </div>
            <button
              type="button"
              className="fusion-side-toggle"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? t('展開側欄') : t('收合側欄')}
            >
              <Menu size={18} strokeWidth={1.9} />
            </button>
          </div>

          <nav className="fusion-side-nav" aria-label={t('Fusion OS 導覽')}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = item.appId === selectedApp.id;
              return (
                <button
                  key={item.appId}
                  type="button"
                  className={selected ? 'is-selected' : ''}
                  onClick={() => selectApp(item.appId, item.launch)}
                  title={t(item.label)}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{t(item.label)}</span>
                </button>
              );
            })}
          </nav>

          <div className="fusion-user-pill">
            <span className="fusion-user-ring" />
            <div>
              <strong>{userProfile.displayName || t(ACCOUNT_TEXT.guest)}</strong>
              <span>{t('專業使用者')}</span>
            </div>
          </div>
        </aside>

        <main className="fusion-main-panel">
          <section className="fusion-hero-card" style={{ ['--app-color' as string]: selectedApp.color } as React.CSSProperties}>
            <div className="fusion-hero-copy">
              <span className="fusion-eyebrow">{t('空間工作區')}</span>
              <h1>FUSION OS</h1>
              <p>{t('歡迎來到全新的清晰境界。')}</p>
              <div className="fusion-hero-actions">
                <button type="button" onClick={launchSelectedApp}>
                  {t('開始探索')}
                </button>
                <button type="button" onClick={() => selectApp('tool')}>
                  {t('瀏覽應用程式')}
                </button>
              </div>
            </div>

            <div className="fusion-liquid-core" aria-hidden="true">
              <HeroEnergyCore glyph="OS" accent={selectedApp.color} tier={profile.tier as 'low' | 'medium' | 'high'} />
            </div>
          </section>

          <section className="fusion-running-section">
            <div className="fusion-section-head">
              <div>
                <span>{t('執行中')}</span>
                <strong>{t(selectedApp.title)}</strong>
              </div>
              <small>{tf('{0} 個應用程式執行中', runningCount)}</small>
            </div>

            <div
              className={`fusion-run-viewport ${dragStartXRef.current !== null ? 'is-dragging' : ''}`}
              ref={runViewportRef}
              onPointerDown={onCarouselPointerDown}
              onPointerMove={onCarouselPointerMove}
              onPointerUp={endCarouselDrag}
              onPointerCancel={endCarouselDrag}
            >
              <div
                className="fusion-run-track"
                style={{ transform: `translateX(${trackX}px)`, transition: dragStartXRef.current !== null ? 'none' : undefined }}
              >
                {apps.map((app, index) => {
                  const Icon = appIcon(app.id);
                  const offset = index - selectedIndex;
                  const dist = Math.abs(offset);
                  const selected = index === selectedIndex;
                  const launchState = launchStates[app.id] ?? 'idle';
                  const scale = selected ? 1 : dist === 1 ? 0.9 : 0.82;
                  const opacity = dist > 3 ? 0 : selected ? 1 : dist === 1 ? 0.74 : 0.46;
                  const offscreen = dist > 3;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      className={`fusion-module-card ${selected ? 'is-selected' : ''}`}
                      style={{
                        ['--app-color' as string]: app.color,
                        transform: `scale(${scale})`,
                        opacity
                      } as React.CSSProperties}
                      onDoubleClick={() => launchFusionApp(app)}
                      onClick={() => {
                        if (dragMovedRef.current) return;
                        if (selected) launchFusionApp(app);
                        else selectApp(app.id);
                      }}
                      tabIndex={offscreen ? -1 : 0}
                      aria-hidden={offscreen}
                    >
                      <span className="fusion-module-icon">
                        <Icon size={22} strokeWidth={1.8} />
                      </span>
                      <span className="fusion-module-title">{t(app.title)}</span>
                      <span className="fusion-module-subtitle">{t(app.subtitle)}</span>
                      <span className={`fusion-module-status ${launchState}`}>
                        {launchState === 'open' ? t('執行中') : t(app.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <aside className="fusion-widget-column">
          <section className="fusion-widget time-widget">
            <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
            <span>{formatFusionDate(now, lang, settings.timezone)}</span>
            <div className="fusion-quick-toggles">
              <button type="button" title="Wi-Fi">
                <Wifi size={17} />
              </button>
              <button type="button" title={t('藍牙')}>
                <Bluetooth size={17} />
              </button>
              <button type="button" title={t('音訊')}>
                <Volume2 size={17} />
              </button>
            </div>
          </section>

          <section className="fusion-widget active-widget">
            <div className="fusion-widget-title">
              {React.createElement(selectedIcon, { size: 20, strokeWidth: 1.8 })}
              <span>{t('已選取應用程式')}</span>
            </div>
            <h2>{t(selectedApp.title)}</h2>
            <p>{t(selectedApp.description)}</p>
            <button type="button" onClick={launchSelectedApp}>
              {tf('啟動 {0}', t(selectedApp.subtitle))}
            </button>
          </section>

          <section className="fusion-widget task-widget">
            <div className="fusion-widget-title">
              <Activity size={20} strokeWidth={1.8} />
              <span>{t('任務')}</span>
            </div>
            <ul>
              <li><CheckCircle2 size={16} /> {t('設計審查已同步')}</li>
              <li><CheckCircle2 size={16} /> {t('系統模組就緒')}</li>
              <li><Circle size={16} /> {tf('{0} 個應用程式執行中', runningCount)}</li>
              <li><Circle size={16} /> {tf('手勢狀態：{0}', t(gestureStatusLabel(status, gestureData)))}</li>
            </ul>
            <p className="fusion-launch-status">{lastLaunchMessage || t('工作區已上線。選擇應用程式，或按 Enter 啟動。')}</p>
          </section>
        </aside>
      </div>

      <nav className="fusion-dock" aria-label={t('Fusion OS 程式塢')}>
        <button type="button" className="dock-step" onClick={() => selectIndex(selectedIndex - 1)} title={t('上一個應用程式')}>
          <ChevronLeft size={21} />
        </button>
        <div className="fusion-dock-rail" ref={dockRailRef}>
          {apps.map((app, index) => {
            const Icon = appIcon(app.id);
            const selected = index === selectedIndex;
            const running = runningApps.has(app.id);
            return (
              <button
                key={app.id}
                ref={selected ? selectedDockBtnRef : undefined}
                type="button"
                className={`${selected ? 'is-selected' : ''} ${running ? 'is-running' : ''}`}
                onClick={() => selectApp(app.id, true)}
                title={t(app.title)}
              >
                <Icon size={23} strokeWidth={1.8} />
                <span>{t(app.title)}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="dock-step" onClick={() => selectIndex(selectedIndex + 1)} title={t('下一個應用程式')}>
          <ChevronRight size={21} />
        </button>
      </nav>

      {desktopContextMenu && (
        <div
          className="fusion-desktop-context-menu"
          style={{ left: desktopContextMenu.x, top: desktopContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
          role="menu"
        >
          <button type="button" role="menuitem" onClick={() => runDesktopAction('view-contents')}>
            <span className="context-mark context-grid" />
            {t('檢視桌面內容')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('sort-name')}>
            <span className="context-mark context-sort" />
            {t('依名稱排序')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('refresh')}>
            <span className="context-mark context-refresh" />
            {t('重新整理')}
          </button>
          <div className="context-divider" />
          <span className="context-section">{t('新增')}</span>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-folder')}>
            <span className="context-mark context-folder" />
            {t('資料夾')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-text')}>
            <span className="context-mark context-doc" />
            {t('文字文件')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-markdown')}>
            <span className="context-mark context-doc" />
            {t('Markdown 檔案')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-html')}>
            <span className="context-mark context-code" />
            {t('HTML 文件')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-csharp')}>
            <span className="context-mark context-code" />
            {t('C# 原始碼檔案')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('new-shortcut')}>
            <span className="context-mark context-shortcut" />
            {t('捷徑...')}
          </button>
          <div className="context-divider" />
          <button type="button" role="menuitem" onClick={() => runDesktopAction('open-folder')}>
            <span className="context-mark context-open" />
            {t('開啟 FusionDesktop')}
          </button>
          <button type="button" role="menuitem" onClick={() => runDesktopAction('properties')}>
            <span className="context-mark context-info" />
            {t('內容')}
          </button>
        </div>
      )}

      <div className="fusion-brightness-veil" style={{ opacity: veilOpacity }} aria-hidden="true" />
      <div className="fusion-night-veil" style={{ opacity: settings.nightLight ? 1 : 0 }} aria-hidden="true" />
      <DesktopPet settings={settings} onChange={update} />

      <FusionSettings
        open={overlayApp === 'set'}
        onClose={() => setOverlayApp(null)}
        settings={settings}
        onChange={update}
        onOpenAssistant={() => {
          setOverlayApp(null);
          setAssistantOpen(true);
        }}
      />
      <FusionThisPc
        open={overlayApp === 'pc'}
        onClose={() => setOverlayApp(null)}
        accent={settings.accent}
        onOpenFiles={() => setOverlayApp('dir')}
      />
      <FusionFiles
        open={overlayApp === 'dir'}
        onClose={() => setOverlayApp(null)}
        accent={settings.accent}
      />
      <FusionToolbox
        open={overlayApp === 'toolbox'}
        onClose={() => setOverlayApp('tool')}
        accent={settings.accent}
      />
      <FusionDatabase
        open={overlayApp === 'db'}
        onClose={() => setOverlayApp('tool')}
        accent={settings.accent}
      />
      <FusionAppCenter
        open={overlayApp === 'tool'}
        onClose={() => setOverlayApp(null)}
        accent={settings.accent}
        onLaunch={launchFusionApp}
      />
      <FusionCircuitStudio
        open={overlayApp === 'circuit'}
        onClose={() => setOverlayApp('tool')}
        accent={settings.accent}
      />

      <FusionAssistant
        enabled={settings.assistantEnabled}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        dimmed={Boolean(overlayApp)}
        settings={settings}
        onChange={update}
        onLaunchAppId={launchAppById}
      />
    </div>
  );
};
