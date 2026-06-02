import React, { useState, useRef, useEffect } from 'react';
import { useHandGesture } from '../hooks/useHandGesture';
import { SpatialHomeStage } from './SpatialHomeStage';
import { CameraPreview } from './CameraPreview';

// Production UI is clean. Enable the camera preview + debug HUD only by running
// `localStorage.setItem('fusionGestureDebug','1')` then reloading.
const DEBUG_GESTURE_UI =
  typeof window !== 'undefined' &&
  window.localStorage &&
  window.localStorage.getItem('fusionGestureDebug') === '1';

const HIDDEN_VIDEO_STYLE: React.CSSProperties = {
  position: 'fixed',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  left: -9999,
  top: -9999
};

// The FusionOS desktop. Mounted exactly once, AFTER the boot sequence finishes, so
// the camera / gesture pipeline initializes a single time (no double mount).
export const FusionHome: React.FC = () => {
  const [, setActiveAppIndex] = useState(0);
  const [, setQueueDepth] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { status, gestureData, startCamera } = useHandGesture(videoRef, canvasRef);

  useEffect(() => {
    if (!DEBUG_GESTURE_UI) return;
    const timer = setInterval(() => {
      console.log('[App Diagnostic]', {
        status,
        hasVideoRef: !!videoRef.current,
        videoReadyState: videoRef.current?.readyState,
        handDetected: gestureData.debug?.hasHand
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [status, gestureData]);

  return (
    <div className="w-screen h-screen bg-transparent flex flex-col relative overflow-hidden">
      {!DEBUG_GESTURE_UI && (
        <video ref={videoRef} autoPlay playsInline muted style={HIDDEN_VIDEO_STYLE} />
      )}

      <div className="flex-1 relative">
        <SpatialHomeStage
          status={status}
          gestureData={gestureData}
          onIndexChange={setActiveAppIndex}
          onQueueChange={setQueueDepth}
        />
      </div>

      {DEBUG_GESTURE_UI && (
        <CameraPreview
          status={status}
          videoRef={videoRef}
          canvasRef={canvasRef}
          gestureData={gestureData}
          onManualStart={startCamera}
        />
      )}
    </div>
  );
};
