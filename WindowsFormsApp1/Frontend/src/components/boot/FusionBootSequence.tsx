import React, { useEffect } from 'react';
import type { BootState } from '../../hooks/useBootSequence';
import { fusionRuntimeCache } from '../../boot/runtimeCache';
import { BootParticleCanvas } from './BootParticleCanvas';

interface FusionBootSequenceProps {
  state: BootState;
  fadingOut: boolean;
  onSkip: () => void;
}

export const FusionBootSequence: React.FC<FusionBootSequenceProps> = ({ state, fadingOut, onSkip }) => {
  const pct = Math.round(state.progress * 100);
  const allowSkip = state.allowSkip;

  useEffect(() => {
    if (!allowSkip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowSkip, onSkip]);

  const cosmic = fusionRuntimeCache.cosmicSummary;
  const stars = fusionRuntimeCache.starfield?.length ?? 0;
  const runningModule = state.modules.find((module) => module.state === 'running');

  return (
    <div className={`fusion-boot ${fadingOut ? 'is-revealing' : ''} ${state.reducedMotion ? 'reduced' : ''}`}>
      <BootParticleCanvas intensity={Math.max(0.35, state.progress)} reducedMotion={state.reducedMotion} />
      <div className="boot-backlight" />
      <div className="boot-scanline" />

      <div className="boot-brand-panel">
        <span>FUSION OS</span>
        <strong>期末專案系統核心</strong>
      </div>

      <main className="boot-center-stage" aria-live="polite">
        <div className="boot-energy-field" style={{ ['--boot-progress' as string]: state.progress } as React.CSSProperties}>
          <span className="boot-orbit boot-orbit-a" />
          <span className="boot-orbit boot-orbit-b" />
          <span className="boot-orbit boot-orbit-c" />
          <span className="boot-loop boot-loop-a" />
          <span className="boot-loop boot-loop-b" />
          <span className="boot-loop boot-loop-c" />
          <span className="boot-core" />
          <span className="boot-core-pulse" />
        </div>

        <section className="boot-wordmark">
          <span>Initializing Fusion OS</span>
          <h1>FUSION OS</h1>
          <p>{state.phaseLabel} / {state.taskLabel}</p>
        </section>

        <section className="boot-progress-panel">
          <div className="boot-progress-line">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="boot-progress-meta">
            <span>{pct}%</span>
            <strong>{runningModule?.label ?? '核心模組同步完成'}</strong>
            <span>{cosmic ? `COSMIC ${cosmic.total} / STARFIELD ${stars}` : 'BUILD DIST ACTIVE'}</span>
          </div>
        </section>
      </main>

      <aside className="boot-module-stack">
        <div className="boot-module-head">
          <span>Core Modules</span>
          <strong>{state.tier.toUpperCase()}</strong>
        </div>
        {state.modules.map((module) => (
          <div key={module.id} className={`boot-module-row ${module.state}`}>
            <span className="boot-module-led" />
            <div>
              <strong>{module.label}</strong>
              <small>{module.detail || (module.state === 'pending' ? '等待中' : module.state === 'running' ? '載入中' : 'Ready')}</small>
            </div>
          </div>
        ))}
      </aside>

      <footer className="boot-footer">
        <span>WebView2 embedded runtime</span>
        <span>Vite dist / React shell / Fusion bridge</span>
      </footer>

      {allowSkip && (
        <button type="button" className="boot-skip" onClick={onSkip}>
          跳過啟動 / DEV
        </button>
      )}

      {state.debug && (
        <div className="boot-debug">
          <div>TIER: {state.tier.toUpperCase()}</div>
          <div>REDUCED MOTION: {state.reducedMotion ? 'YES' : 'NO'}</div>
          <div>PHASE: {state.phase}</div>
          <div>PROGRESS: {pct}%</div>
          <div>STARFIELD: {stars}</div>
          <div>COSMIC: {cosmic?.total ?? 0}</div>
          <div>DONE: {state.done ? 'YES' : 'NO'}</div>
        </div>
      )}
    </div>
  );
};
