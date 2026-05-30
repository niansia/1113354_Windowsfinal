import React, { useState, useRef, useEffect } from 'react';
import { useHandGesture } from './hooks/useHandGesture';
import { GestureAppCarousel } from './components/GestureAppCarousel';
import { CameraPreview } from './components/CameraPreview';

// Production UI is clean. Enable the camera preview + debug HUD only by running
// `localStorage.setItem('fusionGestureDebug','1')` then reloading.
// Disable with `localStorage.removeItem('fusionGestureDebug')`.
const DEBUG_GESTURE_UI =
  typeof window !== 'undefined' &&
  window.localStorage &&
  window.localStorage.getItem('fusionGestureDebug') === '1';

// Hidden video keeps the camera stream feeding MediaPipe when the preview is off.
const HIDDEN_VIDEO_STYLE: React.CSSProperties = {
  position: 'fixed',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  left: -9999,
  top: -9999
};

export default function App() {
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [queueDepth, setQueueDepth] = useState(0);

  // Create refs here to share between hook and component
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { status, gestureData, startCamera } = useHandGesture(videoRef, canvasRef);

  // Periodic state logging for diagnostics
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('[App Diagnostic]', {
        status,
        hasVideoRef: !!videoRef.current,
        videoWidth: videoRef.current?.videoWidth,
        videoReadyState: videoRef.current?.readyState,
        handDetected: gestureData.debug?.hasHand,
        domProbe: !!document.querySelector('[data-debug-id="camera-preview-mounted"]')
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [status, gestureData]);

  const getGestureHintText = () => {
    switch (status) {
      case 'FAST_SWIPE': return `Fast Swipe ${gestureData.swipeDirection === 'left' ? '←' : '→'}`;
      case 'PINCH_CONTROL': return 'Pinch Control';
      case 'PALM_CONTROL': return 'Palm Air Control';
      case 'INDEX_SWIPE': return 'Index Swiping';
      case 'HAND_TRACKING': return 'Hand Detected';
      case 'MEDIAPIPE_RUNNING': return 'Air Control Online';
      case 'NO_HAND_IN_FRAME': return 'Waiting for Hand...';
      case 'CHECKING_MEDIA_DEVICES': return 'Checking Hardware...';
      case 'STREAM_ACQUIRED': return 'Stream Acquired';
      case 'STREAM_ATTACHED': return 'Stream Attached';
      case 'VIDEO_PLAYING': return 'Video Active';
      case 'FALLBACK_MOUSE_MODE': return 'Mouse Control Mode';
      case 'SWIPE_LOCKED': return 'Swipe Locked (Reset Hand)';
      case 'DOUBLE_PINCH': return 'Activating App...';
      case 'INIT': return 'Initializing Vision...';
      case 'ERROR': return 'Hardware Error';
      default: return 'Gesture Online';
    }
  };

  return (
    <div className="w-screen h-screen bg-transparent flex flex-col relative overflow-hidden">
      {/* DEFINITIVE BUILD MARKER (debug only) */}
      {DEBUG_GESTURE_UI && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100000] bg-cyan-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-xl pointer-events-none select-none animate-pulse border border-white/20">
          BUILD MODE ACTIVE - DIST VERSION (v{Date.now().toString().slice(-4)})
        </div>
      )}

      {/* Hidden video for MediaPipe when the debug preview is not rendered.
          Camera stream stays alive; only the preview UI is hidden. */}
      {!DEBUG_GESTURE_UI && (
        <video ref={videoRef} autoPlay playsInline muted style={HIDDEN_VIDEO_STYLE} />
      )}

      {/* Central Stage */}
      <div className="flex-1 relative">
        <GestureAppCarousel
          onIndexChange={setActiveAppIndex}
          onQueueChange={setQueueDepth}
          gestureData={gestureData}
        />
      </div>
      
      {/* HUD Status Hint - Non-interactive text only (debug only) */}
      {DEBUG_GESTURE_UI && (
      <div className="absolute bottom-6 left-10 flex items-center gap-4 pointer-events-none select-none">
        <div className={`
          w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]
          ${status === 'ERROR' ? 'bg-red-500' : 'bg-fusion-accent animate-pulse'}
        `} />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-fusion-accent/80 tracking-[0.4em] uppercase">
            System Logic
          </span>
          <span className="text-[12px] font-bold text-white/90 tracking-[0.1em] uppercase">
            {getGestureHintText()}
          </span>
        </div>
      </div>
      )}

      {/* DETAILED DIAGNOSTIC OVERLAY - debug only */}
      {DEBUG_GESTURE_UI && (
        <CameraPreview
          status={status}
          videoRef={videoRef}
          canvasRef={canvasRef}
          gestureData={gestureData}
          queueDepth={queueDepth}
          onManualStart={startCamera}
        />
      )}

      {/* Non-interactive Debug HUD - Detailed Diagnostic (debug only) */}
      {DEBUG_GESTURE_UI && gestureData.debug && (
        <div className="absolute bottom-24 right-10 flex flex-col items-end gap-1 pointer-events-none select-none opacity-80 font-mono text-[8px] text-fusion-accent bg-black/60 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="flex gap-4"><span>ORIGIN:</span><span className="text-white">{gestureData.debug.origin}</span></div>
          <div className="flex gap-4"><span>HREF:</span><span className="text-white">{gestureData.debug.href}</span></div>
          <div className="w-full h-[1px] bg-white/10 my-1" />
          <div className="flex gap-4"><span>MEDIA DEVICES:</span><span className="text-white">{gestureData.debug.hasMediaDevices ? 'YES' : 'NO'}</span><span>GUM:</span><span className="text-white">{gestureData.debug.hasGetUserMedia ? 'YES' : 'NO'}</span></div>
          <div className="flex gap-4"><span>PERM STATE:</span><span className="text-white font-bold">{gestureData.debug.permissionState}</span></div>
          <div className="flex gap-4"><span>CAMERA:</span><span className="text-white">{gestureData.debug.hasCamera ? 'YES' : 'NO'}</span><span>STREAM:</span><span className="text-white">{gestureData.debug.cameraStreamActive ? 'ACTIVE' : 'NONE'}</span></div>
          <div className="flex gap-4"><span>TRACK:</span><span className="text-white">{gestureData.debug.trackInfo || '---'}</span></div>
          <div className="flex gap-4"><span>VIDEO:</span><span className="text-white">{gestureData.debug.videoReady ? 'READY' : 'NOT READY'} ({gestureData.debug.videoReadyState})</span></div>
          <div className="flex gap-4"><span>SIZE:</span><span className="text-white">{gestureData.debug.videoWidth}x{gestureData.debug.videoHeight}</span></div>
          <div className="flex gap-4"><span>FRAME:</span><span className="text-white">{gestureData.debug.frameCount}</span><span>RESULT:</span><span className="text-white">{gestureData.debug.resultCount}</span></div>
          
          <div className="w-full h-[1px] bg-white/10 my-1" />
          
          <div className="flex gap-4"><span>HAND:</span><span className="text-white font-bold">{gestureData.debug.hasHand ? 'YES' : 'NO'} ({gestureData.debug.handCount})</span><span>LOST:</span><span className="text-white">{gestureData.debug.handLostFrames}f</span></div>
          <div className="flex gap-4"><span>PALM:</span><span className={gestureData.debug.openPalm ? 'text-green-400' : 'text-red-400'}>{gestureData.debug.openPalm ? 'YES' : 'NO'}</span><span>LATCHED:</span><span className="text-white">{gestureData.debug.palmLatched ? 'YES' : 'NO'}</span></div>
          
          {gestureData.debug.errorName && (
            <div className="w-full mt-1 p-1 bg-red-900/40 border border-red-500/50 rounded text-[8px] text-red-200">
               ERROR: {gestureData.debug.errorName}<br/>
               {gestureData.debug.errorMessage}
            </div>
          )}

          <div className="mt-1 pt-1 border-t border-white/10 w-full text-right">
            <span className="text-white/40 mr-2 uppercase tracking-tighter">REASON:</span>
            <span className="text-fusion-accent font-black uppercase text-[10px]">{gestureData.debug.reason}</span>
          </div>
        </div>
      )}
    </div>
  );
}
