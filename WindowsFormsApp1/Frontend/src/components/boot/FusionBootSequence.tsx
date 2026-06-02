import React, { useEffect } from 'react';
import type { BootState } from '../../hooks/useBootSequence';
import { fusionRuntimeCache } from '../../boot/runtimeCache';
import { BootParticleCanvas } from './BootParticleCanvas';
import { BootCubeSurface } from './BootCubeSurface';

interface FusionBootSequenceProps {
  state: BootState;
  fadingOut: boolean;
  onSkip: () => void;
}

// FusionOS Liquid Glass Boot Sequence overlay.
export const FusionBootSequence: React.FC<FusionBootSequenceProps> = ({ state, fadingOut, onSkip }) => {
  const pct = Math.round(state.progress * 100);

  // Esc / Enter / Space skip the ritual pacing (necessary tasks still finish).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const cosmic = fusionRuntimeCache.cosmicSummary;
  const stars = fusionRuntimeCache.starfield?.length ?? 0;

  return (
    <div className={`fusion-boot ${fadingOut ? 'is-revealing' : ''} ${state.reducedMotion ? 'reduced' : ''}`}>
      <BootParticleCanvas intensity={state.progress} reducedMotion={state.reducedMotion} />

      {/* central liquid-glass core + assembling cube */}
      <div className="boot-stage">
        <div className="boot-glass-core" style={{ ['--p' as string]: state.progress } as React.CSSProperties}>
          <div className="bgc-ring" />
          <div className="bgc-ring bgc-ring-2" />
          <div className="bgc-flow" />
          <BootCubeSurface progress={state.progress} />
        </div>
      </div>

      {/* brand + phase */}
      <div className="boot-brand">
        <div className="boot-logo">FUSION&nbsp;OS</div>
        <div className="boot-sub">BOOT SEQUENCE · LIQUID GLASS CORE</div>
      </div>

      <div className="boot-phase">
        <span className="boot-phase-name">{state.phaseLabel}</span>
        <span className="boot-task">{state.taskLabel}</span>
      </div>

      {/* progress */}
      <div className="boot-progress">
        <div className="boot-progress-bar">
          <div className="boot-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="boot-progress-meta">
          <span>{pct}%</span>
          <span>{cosmic ? `CATALOG ${cosmic.total} · STARFIELD ${stars}` : 'INITIALIZING'}</span>
        </div>
      </div>

      {/* module HUD */}
      <div className="boot-modules">
        {state.modules.map((m) => (
          <div key={m.id} className={`boot-mod ${m.state}`}>
            <span className="boot-mod-dot" />
            <span className="boot-mod-label">{m.label}</span>
            <span className="boot-mod-detail">{m.detail || (m.state === 'running' ? '…' : m.state === 'pending' ? '' : 'Ready')}</span>
          </div>
        ))}
      </div>

      {/* skip + debug */}
      <button type="button" className="boot-skip" onClick={onSkip}>跳過 · SKIP (Esc)</button>

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
