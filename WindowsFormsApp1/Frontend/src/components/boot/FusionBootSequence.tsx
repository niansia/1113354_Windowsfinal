import React, { useEffect } from 'react';
import type { BootState } from '../../hooks/useBootSequence';
import { FusionBootScene3D } from './FusionBootScene3D';
import { BootWebGLBoundary } from './BootFallback2D';

interface FusionBootSequenceProps {
  state: BootState;
  fadingOut: boolean;
  onSkip: () => void;
}

export const FusionBootSequence: React.FC<FusionBootSequenceProps> = ({ state, fadingOut, onSkip }) => {
  const pct = Math.round(state.progress * 100);
  const allowSkip = state.allowSkip;
  const showDebug = state.debug;
  const runningModule = state.modules.find((m) => m.state === 'running');

  useEffect(() => {
    if (!allowSkip || !showDebug) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowSkip, onSkip, showDebug]);

  return (
    <div className={`fusion-boot ${fadingOut ? 'is-revealing' : ''} ${state.reducedMotion ? 'reduced' : ''}`}>
      <div className="boot-vignette" />
      <div className="boot-noise" />

      <main className="boot-core-stage" aria-label="Fusion OS boot sequence">
        <div className="boot-core-canvas" aria-hidden="true">
          <BootWebGLBoundary progress={state.progress}>
            <FusionBootScene3D
              progress={state.progress}
              tier={state.tier as 'low' | 'medium' | 'high'}
              reducedMotion={state.reducedMotion}
            />
          </BootWebGLBoundary>
        </div>

        <section className="boot-core-copy">
          <h1>FUSION OS</h1>
          <span className="boot-kicker">Initializing Fusion OS</span>
        </section>

        <section className="boot-progress-panel" aria-label={`Loading ${pct}%`}>
          <div className="boot-progress-track" aria-label={`Loading ${pct}%`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="boot-progress-meta">
            <span>Loading core modules...</span>
            <span>{pct.toString().padStart(2, '0')}%</span>
          </div>
        </section>
      </main>

      {showDebug && (
        <aside className="boot-module-stack">
          <div className="boot-module-head"><span>Core Modules</span><strong>{state.tier.toUpperCase()}</strong></div>
          {state.modules.map((module) => (
            <div key={module.id} className={`boot-module-row ${module.state}`}>
              <span className="boot-module-led" />
              <div>
                <strong>{module.label}</strong>
                <small>{module.detail || module.state}</small>
              </div>
            </div>
          ))}
        </aside>
      )}

      {allowSkip && showDebug && (
        <button type="button" className="boot-skip" onClick={onSkip}>SKIP / DEV</button>
      )}

      {showDebug && (
        <div className="boot-debug">
          <div>TIER: {state.tier.toUpperCase()}</div>
          <div>PHASE: {state.phase}</div>
          <div>PROGRESS: {pct}%</div>
          <div>TASK: {runningModule?.label ?? state.taskLabel}</div>
        </div>
      )}
    </div>
  );
};
