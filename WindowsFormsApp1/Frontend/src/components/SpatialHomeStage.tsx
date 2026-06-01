import React, { useMemo, useState } from 'react';
import type { GestureData, GestureStatus } from '../hooks/useHandGesture';
import { FUSION_APPS } from '../data/fusionApps';
import { FusionDepthBackground } from './FusionDepthBackground';
import { SpatialAppCarousel } from './SpatialAppCarousel';
import { FusionHud } from './FusionHud';
import { getPerformanceProfile } from '../utils/performanceProfile';
import { getRenderMode } from '../utils/htmlInCanvasSupport';

interface SpatialHomeStageProps {
  status: GestureStatus;
  gestureData?: GestureData;
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
}

// FusionOS 3D Spatial Desktop — the central hero stage. Composes a Canvas-2D depth
// field, a CSS perspective grid floor, the spatial coverflow of holographic HTML
// cards, and an always-on operations HUD.
export const SpatialHomeStage: React.FC<SpatialHomeStageProps> = ({ status, gestureData, onIndexChange, onQueueChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fps, setFps] = useState(0);

  const profile = useMemo(() => getPerformanceProfile(), []);
  const renderMode = useMemo(() => getRenderMode(), []);

  const handX = gestureData?.handX ?? 0.5;
  const activeApp = FUSION_APPS[activeIndex] ?? FUSION_APPS[0];

  // gentle whole-stage parallax tilt following the hand / pointer
  const tilt = (handX - 0.5) * 6;

  return (
    <div className="fusion-stage">
      <FusionDepthBackground handX={handX} profile={profile} onFps={setFps} />
      <div className="fusion-grid-floor" />
      <div className="fusion-vignette" />

      <div className="fusion-stage-inner" style={{ transform: `rotateY(${tilt}deg)` }}>
        <SpatialAppCarousel
          gestureData={gestureData}
          onIndexChange={(i) => { setActiveIndex(i); onIndexChange?.(i); }}
          onQueueChange={onQueueChange}
        />
      </div>

      <div className="fusion-stage-title">
        <span className="fst-eyebrow">FUSIONOS · SPATIAL DESKTOP</span>
        <span className="fst-hint">揮手 / 拖曳 / 方向鍵切換 · 握拳 / 雙擊 / Enter 開啟</span>
      </div>

      <FusionHud
        app={activeApp}
        status={status}
        gestureData={gestureData}
        fps={fps}
        renderMode={renderMode}
        tier={profile.tier}
        index={activeIndex}
        total={FUSION_APPS.length}
      />
    </div>
  );
};
