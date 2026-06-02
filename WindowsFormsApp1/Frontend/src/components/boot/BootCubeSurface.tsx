import React from 'react';
import { Monitor, Folder, Piano, Hand, Code, Database, Globe, Gamepad2, Terminal, Settings } from 'lucide-react';
import { FUSION_APPS } from '../../data/fusionApps';

const ICONS = [Monitor, Folder, Piano, Hand, Code, Database, Globe, Gamepad2, Terminal, Settings];

interface BootCubeSurfaceProps {
  progress: number; // 0..1 — assembly amount
}

// A rotating 3D glass cube whose six faces carry FusionOS app glyphs — the system
// modules "assembling" into the OS. Pure CSS 3D (no WebGL) for stability inside
// the WinForms WebView2.
export const BootCubeSurface: React.FC<BootCubeSurfaceProps> = ({ progress }) => {
  const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
  // faces fade/assemble in as boot progresses
  const assembled = Math.round(progress * faces.length);

  return (
    <div className="boot-cube-wrap" aria-hidden>
      <div className="boot-cube">
        {faces.map((face, i) => {
          const app = FUSION_APPS[i % FUSION_APPS.length];
          const Icon = ICONS[i % ICONS.length];
          const on = i < assembled || progress > 0.92;
          return (
            <div
              key={face}
              className={`boot-cube-face boot-cube-${face} ${on ? 'on' : ''}`}
              style={{ ['--accent' as string]: app.color } as React.CSSProperties}
            >
              <div className="bcf-sheen" />
              <Icon className="bcf-icon" />
              <span className="bcf-label">{app.subtitle}</span>
            </div>
          );
        })}
      </div>
      <div className="boot-cube-core" style={{ opacity: 0.3 + progress * 0.7 }} />
    </div>
  );
};
