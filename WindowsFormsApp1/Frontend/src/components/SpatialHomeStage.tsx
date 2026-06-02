import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  Bluetooth,
  CheckCircle2,
  Circle,
  Code2,
  Cpu,
  Database,
  Folder,
  Gamepad2,
  Globe2,
  Home,
  LucideIcon,
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
import { launchApp } from '../utils/bridge';

interface SpatialHomeStageProps {
  status: GestureStatus;
  gestureData?: GestureData;
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
}

const NAV_ITEMS: Array<{ label: string; icon: LucideIcon; appId: AppId }> = [
  { label: '首頁', icon: Home, appId: 'pc' },
  { label: '檔案', icon: Folder, appId: 'dir' },
  { label: '應用', icon: AppWindow, appId: 'tool' },
  { label: '開發', icon: Code2, appId: 'dev' },
  { label: '系統', icon: Settings, appId: 'set' }
];

const DOCK_IDS: AppId[] = ['pc', 'dir', 'piano', 'cosmic', 'dev', 'db', 'web', 'set'];
const FEATURED_IDS: AppId[] = ['cosmic', 'piano', 'dev', 'db'];

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

function findApp(apps: FusionApp[], id: AppId) {
  return apps.find((app) => app.id === id) ?? FUSION_APPS.find((app) => app.id === id);
}

function formatClock(now: Date) {
  return now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(now: Date) {
  return now.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
}

export const SpatialHomeStage: React.FC<SpatialHomeStageProps> = ({
  status,
  gestureData,
  onIndexChange,
  onQueueChange
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fps, setFps] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const lastSwipeIdRef = useRef(0);
  const lastActivateIdRef = useRef(0);

  const profile = useMemo(() => getPerformanceProfile(), []);
  const renderMode = useMemo(() => getRenderMode(), []);
  const apps = useMemo(
    () => (fusionRuntimeCache.appRegistry?.apps?.length ? fusionRuntimeCache.appRegistry.apps : FUSION_APPS),
    []
  );

  const activeApp = apps[activeIndex] ?? apps[0] ?? FUSION_APPS[0];
  const handX = gestureData?.handX ?? 0.5;
  const stageTilt = (handX - 0.5) * 4;

  const selectIndex = useCallback((next: number) => {
    if (!apps.length) return;
    const wrapped = (next + apps.length) % apps.length;
    setActiveIndex(wrapped);
    onIndexChange?.(wrapped);
    onQueueChange?.(Math.max(0, apps.length - wrapped - 1));
  }, [apps.length, onIndexChange, onQueueChange]);

  const launchRealApp = useCallback((app?: FusionApp) => {
    if (!app) return;
    launchApp(app.id);
  }, []);

  const selectApp = useCallback((id: AppId, shouldLaunch = false) => {
    const index = apps.findIndex((app) => app.id === id);
    const nextIndex = index >= 0 ? index : activeIndex;
    selectIndex(nextIndex);
    if (shouldLaunch) launchRealApp(apps[nextIndex]);
  }, [activeIndex, apps, launchRealApp, selectIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const swipeId = gestureData?.swipeId ?? 0;
    if (!swipeId || swipeId === lastSwipeIdRef.current) return;
    lastSwipeIdRef.current = swipeId;
    selectIndex(activeIndex + (gestureData?.swipeDirection === 'left' ? 1 : -1));
  }, [activeIndex, gestureData?.swipeDirection, gestureData?.swipeId, selectIndex]);

  useEffect(() => {
    const activateId = gestureData?.activateId ?? 0;
    if (!activateId || activateId === lastActivateIdRef.current) return;
    lastActivateIdRef.current = activateId;
    launchRealApp(activeApp);
  }, [activeApp, gestureData?.activateId, launchRealApp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectIndex(activeIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectIndex(activeIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        launchRealApp(activeApp);
      } else if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (apps[index]) {
          event.preventDefault();
          selectIndex(index);
          launchRealApp(apps[index]);
        }
      } else if (event.key === '0') {
        event.preventDefault();
        selectApp('pc', true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeApp, activeIndex, apps, launchRealApp, selectApp, selectIndex]);

  const dockApps = DOCK_IDS.map((id) => findApp(apps, id)).filter(Boolean) as FusionApp[];
  const featuredApps = FEATURED_IDS.map((id) => findApp(apps, id)).filter(Boolean) as FusionApp[];
  const activeIcon = APP_ICONS[activeApp.id] ?? AppWindow;

  return (
    <div className="fusion-stage fusion-os-home">
      <FusionDepthBackground handX={handX} profile={profile} onFps={setFps} />
      <div className="fusion-stage-aurora" />
      <div className="fusion-stage-grid" />

      <div className="fusion-shell" style={{ transform: `rotateY(${stageTilt}deg)` }}>
        <aside className="fusion-side-panel">
          <div className="fusion-side-brand">
            <div className="fusion-side-orb" />
            <div>
              <span>FUSION</span>
              <strong>OS</strong>
            </div>
          </div>

          <nav className="fusion-side-nav" aria-label="FusionOS navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = item.appId === activeApp.id;
              return (
                <button
                  key={item.appId}
                  type="button"
                  className={selected ? 'is-selected' : ''}
                  onClick={() => selectApp(item.appId, item.appId !== 'pc')}
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
          <section className="fusion-hero-card">
            <div className="fusion-hero-copy">
              <span className="fusion-eyebrow">FINAL PROJECT OPERATING SYSTEM</span>
              <h1>FUSION OS</h1>
              <p>
                將 C#、Python、JavaScript、WebGL、資料庫與舊作品整合成一套可擴充的獨立系統。
              </p>
              <div className="fusion-hero-actions">
                <button type="button" onClick={() => launchRealApp(activeApp)}>
                  開啟目前 App
                </button>
                <button type="button" onClick={() => selectApp('cosmic', true)}>
                  啟動宇宙手勢
                </button>
              </div>
            </div>

            <div className="fusion-liquid-core" aria-hidden="true">
              <span className="fusion-liquid-ring ring-a" />
              <span className="fusion-liquid-ring ring-b" />
              <span className="fusion-liquid-ring ring-c" />
              <span className="fusion-liquid-glow" />
            </div>
          </section>

          <section className="fusion-running-section">
            <div className="fusion-section-head">
              <div>
                <span>Running</span>
                <strong>Active Modules</strong>
              </div>
              <small>{renderMode.toUpperCase()} / {profile.tier.toUpperCase()} / {fps} FPS</small>
            </div>

            <div className="fusion-module-grid">
              {featuredApps.map((app) => {
                const Icon = APP_ICONS[app.id] ?? AppWindow;
                const selected = app.id === activeApp.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    className={`fusion-module-card ${selected ? 'is-selected' : ''}`}
                    style={{ ['--app-color' as string]: app.color } as React.CSSProperties}
                    onMouseEnter={() => selectApp(app.id)}
                    onFocus={() => selectApp(app.id)}
                    onClick={() => launchRealApp(app)}
                  >
                    <span className="fusion-module-icon">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="fusion-module-title">{app.title}</span>
                    <span className="fusion-module-subtitle">{app.subtitle}</span>
                    <span className="fusion-module-status">{app.status}</span>
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
              {React.createElement(activeIcon, { size: 20, strokeWidth: 1.8 })}
              <span>目前 App</span>
            </div>
            <h2>{activeApp.title}</h2>
            <p>{activeApp.description}</p>
            <button type="button" onClick={() => launchRealApp(activeApp)}>
              開啟 {activeApp.subtitle}
            </button>
          </section>

          <section className="fusion-widget task-widget">
            <div className="fusion-widget-title">
              <Activity size={20} strokeWidth={1.8} />
              <span>系統任務</span>
            </div>
            <ul>
              <li><CheckCircle2 size={16} /> WebView2 內嵌系統</li>
              <li><CheckCircle2 size={16} /> 鋼琴作品整包導入</li>
              <li><Circle size={16} /> 宇宙粒子手勢深化</li>
            </ul>
          </section>

          <section className="fusion-widget gesture-widget">
            <span>Gesture</span>
            <strong>{status}</strong>
            <small>
              手勢啟動目前 App，左右滑切換。沒有攝影機時可用方向鍵、數字鍵與 Enter。
            </small>
          </section>
        </aside>
      </div>

      <nav className="fusion-dock" aria-label="FusionOS dock">
        {dockApps.map((app) => {
          const Icon = APP_ICONS[app.id] ?? AppWindow;
          const selected = app.id === activeApp.id;
          return (
            <button
              key={app.id}
              type="button"
              className={selected ? 'is-selected' : ''}
              onMouseEnter={() => selectApp(app.id)}
              onFocus={() => selectApp(app.id)}
              onClick={() => launchRealApp(app)}
              title={app.title}
            >
              <Icon size={23} strokeWidth={1.8} />
              <span>{app.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
