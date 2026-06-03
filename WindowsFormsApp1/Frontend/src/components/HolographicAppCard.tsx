import React from 'react';
import { Monitor, Folder, Piano, Clapperboard, AudioWaveform, Hand, FileUser, Plus, Code, Wrench, Database, Globe, Gamepad2, Terminal, Settings } from 'lucide-react';
import type { FusionApp } from '../data/fusionApps';
import { useI18n } from '../i18n/I18nContext';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  PC: Monitor,
  DIR: Folder,
  '88': Piano,
  VID: Clapperboard,
  WAV: AudioWaveform,
  COS: Hand,
  USR: FileUser,
  '+': Plus,
  DEV: Code,
  TOOL: Wrench,
  DB: Database,
  WEB: Globe,
  GAME: Gamepad2,
  CMD: Terminal,
  SET: Settings
};

interface HolographicAppCardProps {
  app: FusionApp;
  index: number;
  position: number; // relative offset from centre (0 = active)
  isActive: boolean;
  spread: number;
  onSelect: (index: number) => void;
}

// A single floating HTML "surface" placed in 3D space via CSS transforms. The DOM
// stays fully interactive (click / hover / a11y) — canvas only composites depth
// around it — mirroring the HTML-in-Canvas interaction model.
//
// Memoized: with a stable onSelect, it only re-renders when its own visual props
// (position / isActive) change — NOT on every gesture frame.
const HolographicAppCardImpl: React.FC<HolographicAppCardProps> = ({ app, index, position, isActive, spread, onSelect }) => {
  const Icon = ICON_MAP[app.glyph] || Monitor;
  const { t } = useI18n();
  const abs = Math.abs(position);
  const title = t(app.title);
  const subtitle = t(app.subtitle);

  const translateX = position * spread;
  const translateZ = -abs * 240;
  const rotateY = Math.max(-55, Math.min(55, -position * 30));
  const scale = isActive ? 1 : Math.max(0.62, 1 - abs * 0.12);
  const opacity = Math.max(0, 1 - abs * 0.32);
  const blur = abs > 1 ? Math.min(5, (abs - 1) * 2.2) : 0;
  const zIndex = 100 - Math.round(abs * 10);

  const style = {
    transform: `translate(-50%, -50%) translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    filter: blur ? `blur(${blur}px)` : undefined,
    zIndex,
    // expose accent colour to CSS
    '--accent': app.color
  } as React.CSSProperties;

  return (
    <div
      className={`holo-card ${isActive ? 'is-active' : 'is-side'}`}
      style={style}
      onClick={() => onSelect(index)}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={`${title} ${subtitle}`}
    >
      <div className="holo-card-sheen" />
      {isActive && <div className="holo-card-ring" />}

      <div className="holo-card-top">
        <div className="holo-glyph" style={{ background: `radial-gradient(circle at 30% 30%, ${app.color}55, ${app.color}11)`, borderColor: `${app.color}66` }}>
          <Icon className="holo-glyph-icon" style={{ color: app.color }} />
        </div>
        <span className="holo-status" style={{ color: app.color, borderColor: `${app.color}55` }}>{t(app.status)}</span>
      </div>

      <div className="holo-card-body">
        <h3 className="holo-title">{title}</h3>
        <p className="holo-subtitle" style={{ color: app.color }}>{subtitle}</p>
        {isActive && <p className="holo-desc">{t(app.description)}</p>}
      </div>

      <div className="holo-card-foot">
        <div className="holo-tags">
          {app.tags.map((t) => (
            <span key={t} className="holo-tag">#{t}</span>
          ))}
        </div>
        {isActive && (
          <div className="holo-launch" style={{ color: app.color }}>
            <span className="holo-launch-dot" style={{ background: app.color }} />
            {t('開啟 · ENTER / 點擊 / 握拳')}
          </div>
        )}
      </div>
    </div>
  );
};

export const HolographicAppCard = React.memo(HolographicAppCardImpl);
