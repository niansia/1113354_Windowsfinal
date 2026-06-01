import React from 'react';
import type { GestureData, GestureStatus } from '../hooks/useHandGesture';
import type { FusionApp } from '../data/fusionApps';
import type { RenderMode } from '../utils/htmlInCanvasSupport';
import type { PerfTier } from '../utils/performanceProfile';

interface FusionHudProps {
  app: FusionApp;
  status: GestureStatus;
  gestureData?: GestureData;
  fps: number;
  renderMode: RenderMode;
  tier: PerfTier;
  index: number;
  total: number;
}

function gestureHint(status: GestureStatus): string {
  switch (status) {
    case 'FAST_SWIPE': return '快速撥動';
    case 'INDEX_SWIPE': return '食指滑動';
    case 'PALM_CONTROL': return '手掌空中控制';
    case 'PINCH_CONTROL': return '捏合拖曳';
    case 'SWIPE_LOCKED': return '手勢鎖定 · 回手復位';
    case 'DOUBLE_PINCH': return '啟動 App';
    case 'MEDIAPIPE_RUNNING': return '空中控制就緒';
    case 'HAND_TRACKING': return '偵測到手';
    case 'NO_HAND_IN_FRAME': return '等待手部…';
    case 'CAMERA_ONLY_MODE': return '相機交給 App';
    case 'ERROR': return '硬體錯誤';
    case 'INIT': return '視覺初始化…';
    default: return '手勢線上';
  }
}

// Always-on sci-fi operations bar for the central stage (separate from the native
// WinForms taskbar). Non-interactive readout: selected app, gesture mode, render
// pipeline and live diagnostics.
export const FusionHud: React.FC<FusionHudProps> = ({ app, status, gestureData, fps, renderMode, tier, index, total }) => {
  const tracking = !!gestureData?.debug?.hasHand;
  return (
    <div className="fusion-hud" aria-hidden>
      <div className="fhud-block fhud-left">
        <span className="fhud-label">SELECTED NODE</span>
        <div className="fhud-app">
          <span className="fhud-dot" style={{ background: app.color, boxShadow: `0 0 12px ${app.color}` }} />
          <b style={{ color: app.color }}>{app.title}</b>
          <small>{app.subtitle}</small>
        </div>
        <span className="fhud-sub">{app.category.toUpperCase()} · {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}</span>
      </div>

      <div className="fhud-block fhud-center">
        <span className="fhud-label">GESTURE MODE</span>
        <div className={`fhud-gesture ${tracking ? 'on' : ''}`}>
          <span className="fhud-pulse" />
          {gestureHint(status)}
        </div>
        <span className="fhud-sub">{gestureData?.handSide ? `HAND ${gestureData.handSide.toUpperCase()}` : 'AIR CONTROL'}</span>
      </div>

      <div className="fhud-block fhud-right">
        <span className="fhud-label">SYSTEM DIAGNOSTICS</span>
        <div className="fhud-diag">
          <span>FPS <b>{fps || '—'}</b></span>
          <span>NODES <b>{total}</b></span>
          <span>LAYERS <b>3</b></span>
          <span>TIER <b>{tier.toUpperCase()}</b></span>
        </div>
        <span className="fhud-sub">RENDER · {renderMode === 'html-in-canvas' ? 'HTML-IN-CANVAS' : 'CSS3D + CANVAS2D'}</span>
      </div>
    </div>
  );
};
