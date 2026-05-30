import React, { useEffect } from 'react';
import { GestureStatus, GestureData } from '../hooks/useHandGesture';

interface CameraPreviewProps {
  status: GestureStatus;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gestureData: GestureData;
  queueDepth?: number;
  onManualStart: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ status, videoRef, canvasRef, gestureData, queueDepth = 0, onManualStart }) => {
  const debug = gestureData.debug;
  const upper = (v: string | null | undefined) => (v || 'NONE').toString().toUpperCase();

  // Mount/Unmount logging
  useEffect(() => {
    console.log('[CameraPreview] MOUNTED');
    return () => {
      console.log('[CameraPreview] UNMOUNTED');
    };
  }, []);

  // Drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const landmarks = debug?.landmarks;
    if (!canvas || !landmarks) {
      if (canvas) {
         const ctx = canvas.getContext('2d');
         if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-width, 0);

    // 1. Draw Skeleton
    const connections = [
      [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17]
    ];

    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 4;
    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // 2. Draw Landmarks
    landmarks.forEach((pt: any, i: number) => {
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, (i===4||i===8)?10:5, 0, Math.PI*2);
      ctx.fillStyle = i===4 ? '#ff00ff' : (i===8 ? '#00f2ff' : '#ffffff');
      ctx.fill();
    });

    ctx.restore();
  }, [debug?.landmarks, canvasRef]);

  // HIGH VISIBILITY DEBUG STYLES
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '80px',
    right: '30px',
    width: '460px',
    height: '520px',
    zIndex: 2147483647,
    background: 'rgba(20, 0, 0, 0.9)',
    border: '4px solid #ff003c',
    boxShadow: '0 0 50px rgba(255, 0, 60, 0.8)',
    color: 'white',
    fontFamily: 'Consolas, monospace',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const videoAreaStyle: React.CSSProperties = {
    width: '100%',
    height: '300px',
    background: '#000',
    position: 'relative'
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)'
  };

  const canvasOverlayStyle: React.CSSProperties = {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: '100%', 
    height: '100%', 
    transform: 'scaleX(-1)',
    pointerEvents: 'none'
  };

  return (
    <div style={containerStyle} data-debug-id="camera-preview-mounted">
      <div style={{ background: '#ff003c', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
        <span>CAMERA PREVIEW FORCED MOUNTED</span>
        <button 
          onClick={onManualStart}
          style={{ background: '#fff', color: '#ff003c', border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 'black', cursor: 'pointer' }}
        >
          START CAMERA TEST
        </button>
      </div>
      
      <div style={videoAreaStyle}>
        <video ref={videoRef} style={videoStyle} playsInline muted autoPlay />
        <canvas 
          ref={canvasRef} 
          style={canvasOverlayStyle}
          width={640} 
          height={480}
        />
        
        {(!videoRef.current || !videoRef.current.srcObject) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 p-6 text-center">
            <span className="text-xl font-black">{!videoRef.current ? 'VIDEO REF NULL' : 'STREAM NOT ATTACHED'}</span>
            <span className="text-xs mt-2 opacity-80 text-white">
              1. Click START CAMERA TEST above<br/>
              2. Check Windows Privacy Settings &gt; Camera<br/>
              3. Close other apps using camera
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '10px', fontSize: '10px', background: '#1a1a1a', borderTop: '2px solid #ff003c' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <div className="col-span-2 text-[8px] opacity-60 truncate">ORIGIN: {debug?.origin}</div>
          <div>STATUS: <span style={{ color: '#ff003c' }}>{status}</span></div>
          <div>REASON: <span style={{ color: '#00f2ff' }}>{debug?.reason}</span></div>

          <div className="col-span-2 h-[1px] bg-white/10 my-1"></div>

          <div>HAND: {debug?.hasHand ? 'YES' : 'NO'} ({debug?.handCount})</div>
          <div>HAND SIDE: <span style={{ color: '#9aa' }}>{upper(debug?.handSide)}</span></div>
          <div>GESTURE TYPE: <span style={{ color: '#ffd500' }}>{upper((debug?.gestureType || 'NONE').replace('_SWIPE', ''))}</span></div>
          <div>STROKE PHASE: <span style={{ color: '#ffd500' }}>{upper(debug?.strokePhase)}</span></div>
          <div>STROKE DIR: <span style={{ color: '#00f2ff' }}>{upper(debug?.swipeDirection)}</span></div>
          <div>LAST FIRED DIR: <span style={{ color: '#00f2ff' }}>{upper(debug?.lastFireDir)}</span></div>
          <div>RETURN IGNORED: <span style={{ color: '#ff8800' }}>{upper(debug?.returnDirIgnored)}</span></div>
          <div>LOCKED: {gestureData.isGestureLocked ? 'YES' : 'NO'}</div>

          <div className="col-span-2 h-[1px] bg-white/10 my-1"></div>

          <div>CANDIDATE X: {debug?.candidateX?.toFixed(3)}</div>
          <div>ANCHOR X: {debug?.anchorX?.toFixed(3)}</div>
          <div>DX FROM ANCHOR: {debug?.dxFromAnchor?.toFixed(3)}</div>
          <div>VX: {debug?.vx?.toFixed(4)}</div>
          <div>TIME SINCE FIRE: {debug?.timeSinceFire}ms</div>
          <div>QUEUE: {queueDepth}</div>

          <div className="col-span-2 h-[1px] bg-white/10 my-1"></div>

          <div>OPEN PALM: {debug?.openPalm ? 'YES' : 'NO'}</div>
          <div>PINCH DOWN: {debug?.pinchDown ? 'YES' : 'NO'}</div>
          <div>PINCH VAL: {debug?.pinchNormalized?.toFixed(2) || 'N/A'}</div>
          <div>PINCH COUNT: {debug?.pinchCount}</div>
          <div>SWIPE ID: {debug?.swipeId}</div>
          <div>ACTIVATE ID: {debug?.activateId}</div>
          <div>FIST: <span style={{ color: debug?.isFist ? '#0f0' : '#888' }}>{debug?.isFist ? 'YES' : 'NO'}</span></div>
          <div>TAP PHASE: <span style={{ color: '#ffd500' }}>{upper(debug?.tapPhase)}</span></div>
          <div className="col-span-2">ACTIVATE TYPE: <span style={{ color: '#00f2ff' }}>{upper(gestureData.activateType)}</span></div>
          <div className="col-span-2">CONFIDENCE: {gestureData.confidence.toFixed(2)}</div>
          
          {debug?.errorName && (
            <div className="col-span-2 mt-1 p-1 bg-red-900/40 border border-red-500/50 rounded text-[8px] text-red-200">
               ERROR: {debug.errorName} - {debug.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
