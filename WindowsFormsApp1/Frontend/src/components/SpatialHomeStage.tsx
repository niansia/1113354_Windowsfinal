import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Cpu,
  Database,
  Folder,
  Gamepad2,
  Globe2,
  Home,
  LucideIcon,
  Menu,
  Music,
  Plus,
  Settings,
  Sparkles,
  Terminal,
  Volume2,
  Wifi
} from 'lucide-react';
import type { AppId } from '../types';
import type { GestureData, GestureStatus } from '../hooks/useHandGesture';
import { FUSION_APPS, type FusionApp } from '../data/fusionApps';
import { FusionDepthBackground } from './FusionDepthBackground';
import { getPerformanceProfile } from '../utils/performanceProfile';
import { getRenderMode } from '../utils/htmlInCanvasSupport';
import { fusionRuntimeCache } from '../boot/runtimeCache';
import { addHostMessageListener, launchApp } from '../utils/bridge';

interface SpatialHomeStageProps {
  status: GestureStatus;
  gestureData?: GestureData;
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
}

type LaunchState = 'idle' | 'open' | 'error' | 'closed';

const NAV_ITEMS: Array<{ label: string; icon: LucideIcon; appId: AppId; launch?: boolean }> = [
  { label: '首頁', icon: Home, appId: 'pc' },
  { label: '檔案', icon: Folder, appId: 'dir', launch: true },
  { label: '應用程式', icon: AppWindow, appId: 'tool' },
  { label: '開發', icon: Code2, appId: 'dev' },
  { label: '設定', icon: Settings, appId: 'set', launch: true }
];

const DOCK_IDS: AppId[] = ['pc', 'dir', 'piano', 'cosmic', 'dev', 'db', 'web', 'set'];

const APP_ICONS: Partial<Record<AppId, LucideIcon>> = {
  pc: Cpu,
  dir: Folder,
  piano: Music,
  cosmic: Sparkles,
  user: Home,
  add: Plus,
  dev: Code2,
  tool: AppWindow,
  db: Database,
  web: Globe2,
  game: Gamepad2,
  cmd: Terminal,
  set: Settings
};

const formatClock = (now: Date) =>
  now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

const formatDate = (now: Date) =>
  now.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });

const wrapIndex = (index: number, total: number) => ((index % total) + total) % total;

function resolveApps() {
  return fusionRuntimeCache.appRegistry?.apps?.length ? fusionRuntimeCache.appRegistry.apps : FUSION_APPS;
}

function appIcon(appId: AppId) {
  return APP_ICONS[appId] ?? AppWindow;
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
  const [lastLaunchMessage, setLastLaunchMessage] = useState('系統待命，選擇一個 App 後可直接啟動。');
  const [fps, setFps] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const lastSwipeIdRef = useRef(0);
  const lastActivateIdRef = useRef(0);

  const profile = useMemo(() => getPerformanceProfile(), []);
  const renderMode = useMemo(() => getRenderMode(), []);
  const selectedApp = apps[selectedIndex] ?? apps[0] ?? FUSION_APPS[0];
  const selectedIcon = appIcon(selectedApp.id);
  const handX = gestureData?.handX ?? 0.5;
  const stageTilt = (handX - 0.5) * 3.2;

  const selectIndex = useCallback((nextIndex: number) => {
    if (!apps.length) return;
    const wrapped = wrapIndex(nextIndex, apps.length);
    setSelectedIndex(wrapped);
    onIndexChange?.(wrapped);
    onQueueChange?.(Math.max(0, apps.length - wrapped - 1));
  }, [apps.length, onIndexChange, onQueueChange]);

  const selectApp = useCallback((appId: AppId, shouldLaunch = false) => {
    const index = apps.findIndex((app) => app.id === appId);
    const nextIndex = index >= 0 ? index : selectedIndex;
    selectIndex(nextIndex);
    if (shouldLaunch) {
      const app = apps[nextIndex];
      launchApp(app.id);
      setLastLaunchMessage(`${app.title} 啟動中...`);
      setLaunchStates((prev) => ({ ...prev, [app.id]: 'open' }));
      setRunningApps((prev) => {
        const next = new Set(prev);
        next.add(app.id);
        return next;
      });
    }
  }, [apps, selectIndex, selectedIndex]);

  const launchSelectedApp = useCallback((app = selectedApp) => {
    launchApp(app.id);
    setLastLaunchMessage(`${app.title} 啟動中...`);
    setLaunchStates((prev) => ({ ...prev, [app.id]: 'open' }));
    setRunningApps((prev) => {
      const next = new Set(prev);
      next.add(app.id);
      return next;
    });
  }, [selectedApp]);

  const visibleModules = useMemo(() => {
    if (!apps.length) return [];
    return [-2, -1, 0, 1, 2].map((offset) => apps[wrapIndex(selectedIndex + offset, apps.length)]);
  }, [apps, selectedIndex]);

  const dockApps = useMemo(
    () => DOCK_IDS.map((id) => apps.find((app) => app.id === id)).filter(Boolean) as FusionApp[],
    [apps]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return addHostMessageListener((message) => {
      if (message.type !== 'FUSION_APP_LAUNCH_STATUS' || !message.payload || typeof message.payload !== 'object') {
        return;
      }
      const payload = message.payload as { appId?: string; status?: LaunchState; message?: string };
      const appId = payload.appId as AppId | undefined;
      if (!appId) return;

      setLaunchStates((prev) => ({ ...prev, [appId]: payload.status ?? 'idle' }));
      setLastLaunchMessage(payload.message ?? `${appId}: ${payload.status ?? 'updated'}`);
      setRunningApps((prev) => {
        const next = new Set(prev);
        if (payload.status === 'closed' || payload.status === 'error') next.delete(appId);
        if (payload.status === 'open') next.add(appId);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    const swipeId = gestureData?.swipeId ?? 0;
    if (!swipeId || swipeId === lastSwipeIdRef.current) return;
    lastSwipeIdRef.current = swipeId;
    selectIndex(selectedIndex + (gestureData?.swipeDirection === 'left' ? 1 : -1));
  }, [gestureData?.swipeDirection, gestureData?.swipeId, selectIndex, selectedIndex]);

  useEffect(() => {
    const activateId = gestureData?.activateId ?? 0;
    if (!activateId || activateId === lastActivateIdRef.current) return;
    lastActivateIdRef.current = activateId;
    launchSelectedApp();
  }, [gestureData?.activateId, launchSelectedApp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [apps, launchSelectedApp, selectApp, selectIndex, selectedIndex]);

  return (
    <div className="fusion-stage fusion-os-home">
      <FusionDepthBackground handX={handX} profile={profile} onFps={setFps} />
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
              title={sidebarCollapsed ? '展開側欄' : '收合側欄'}
            >
              <Menu size={18} strokeWidth={1.9} />
            </button>
          </div>

          <nav className="fusion-side-nav" aria-label="FusionOS navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = item.appId === selectedApp.id;
              return (
                <button
                  key={item.appId}
                  type="button"
                  className={selected ? 'is-selected' : ''}
                  onClick={() => selectApp(item.appId, item.launch)}
                  title={item.label}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="fusion-user-pill">
            <span className="fusion-user-ring" />
            <div>
              <strong>期末專案</strong>
              <span>多語言整合系統</span>
            </div>
          </div>
        </aside>

        <main className="fusion-main-panel">
          <section className="fusion-hero-card" style={{ ['--app-color' as string]: selectedApp.color } as React.CSSProperties}>
            <div className="fusion-hero-copy">
              <span className="fusion-eyebrow">FINAL PROJECT OPERATING SYSTEM</span>
              <h1>FUSION OS</h1>
              <p>
                目前聚焦：{selectedApp.title}。這是一套由 C# WinForms 宿主、React 系統殼、WebGL 作品與原生程式共同組成的期末專案系統。
              </p>
              <div className="fusion-hero-actions">
                <button type="button" onClick={() => launchSelectedApp()}>
                  開啟目前 App
                </button>
                <button type="button" onClick={() => selectApp('cosmic', true)}>
                  啟動宇宙手勢
                </button>
                <button type="button" onClick={() => selectIndex(selectedIndex + 1)}>
                  下一個模組
                </button>
              </div>
            </div>

            <div className="fusion-liquid-core" aria-hidden="true">
              <span className="fusion-liquid-ring ring-a" />
              <span className="fusion-liquid-ring ring-b" />
              <span className="fusion-liquid-ring ring-c" />
              <span className="fusion-liquid-glow" />
              <span className="fusion-liquid-label">{selectedApp.glyph}</span>
            </div>
          </section>

          <section className="fusion-running-section">
            <div className="fusion-section-head">
              <div>
                <span>Active Modules</span>
                <strong>{selectedApp.title}</strong>
              </div>
              <small>{renderMode.toUpperCase()} / {profile.tier.toUpperCase()} / {fps} FPS</small>
            </div>

            <div className="fusion-module-grid">
              {visibleModules.map((app) => {
                const Icon = appIcon(app.id);
                const selected = app.id === selectedApp.id;
                const launchState = launchStates[app.id] ?? 'idle';
                return (
                  <button
                    key={app.id}
                    type="button"
                    className={`fusion-module-card ${selected ? 'is-selected' : ''}`}
                    style={{ ['--app-color' as string]: app.color } as React.CSSProperties}
                    onMouseEnter={() => selectApp(app.id)}
                    onFocus={() => selectApp(app.id)}
                    onDoubleClick={() => launchSelectedApp(app)}
                    onClick={() => selectApp(app.id)}
                  >
                    <span className="fusion-module-icon">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="fusion-module-title">{app.title}</span>
                    <span className="fusion-module-subtitle">{app.subtitle}</span>
                    <span className={`fusion-module-status ${launchState}`}>{launchState === 'open' ? 'RUNNING' : app.status}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="fusion-widget-column">
          <section className="fusion-widget time-widget">
            <strong>{formatClock(now)}</strong>
            <span>{formatDate(now)}</span>
            <div className="fusion-quick-toggles">
              <button type="button" title="Wi-Fi">
                <Wifi size={17} />
              </button>
              <button type="button" title="Bluetooth">
                <Bluetooth size={17} />
              </button>
              <button type="button" title="Audio">
                <Volume2 size={17} />
              </button>
            </div>
          </section>

          <section className="fusion-widget active-widget">
            <div className="fusion-widget-title">
              {React.createElement(selectedIcon, { size: 20, strokeWidth: 1.8 })}
              <span>目前 App</span>
            </div>
            <h2>{selectedApp.title}</h2>
            <p>{selectedApp.description}</p>
            <button type="button" onClick={() => launchSelectedApp()}>
              開啟 {selectedApp.subtitle}
            </button>
          </section>

          <section className="fusion-widget task-widget">
            <div className="fusion-widget-title">
              <Activity size={20} strokeWidth={1.8} />
              <span>系統狀態</span>
            </div>
            <ul>
              <li><CheckCircle2 size={16} /> React 完整 Shell 已接管桌面</li>
              <li><CheckCircle2 size={16} /> WebView2 全螢幕宿主模式</li>
              <li><Circle size={16} /> 執行中 App：{runningApps.size}</li>
            </ul>
            <p className="fusion-launch-status">{lastLaunchMessage}</p>
          </section>

          <section className="fusion-widget gesture-widget">
            <span>Gesture</span>
            <strong>{status}</strong>
            <small>
              左右滑動切換模組，握拳或 Enter 開啟目前 App。沒有攝影機時可用方向鍵與滑鼠完成同樣操作。
            </small>
          </section>
        </aside>
      </div>

      <nav className="fusion-dock" aria-label="FusionOS dock">
        <button type="button" className="dock-step" onClick={() => selectIndex(selectedIndex - 1)} title="上一個模組">
          <ChevronLeft size={21} />
        </button>
        {dockApps.map((app) => {
          const Icon = appIcon(app.id);
          const selected = app.id === selectedApp.id;
          const running = runningApps.has(app.id);
          return (
            <button
              key={app.id}
              type="button"
              className={`${selected ? 'is-selected' : ''} ${running ? 'is-running' : ''}`}
              onMouseEnter={() => selectApp(app.id)}
              onFocus={() => selectApp(app.id)}
              onClick={() => selectApp(app.id, true)}
              title={app.title}
            >
              <Icon size={23} strokeWidth={1.8} />
              <span>{app.title}</span>
            </button>
          );
        })}
        <button type="button" className="dock-step" onClick={() => selectIndex(selectedIndex + 1)} title="下一個模組">
          <ChevronRight size={21} />
        </button>
      </nav>
    </div>
  );
};
