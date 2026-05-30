import { useEffect, useRef, useState, useCallback } from 'react';

export type GestureStatus = 
  | 'INIT'
  | 'CHECKING_MEDIA_DEVICES'
  | 'STREAM_ACQUIRED'
  | 'STREAM_ATTACHED'
  | 'VIDEO_PLAYING'
  | 'MEDIAPIPE_RUNNING'
  | 'CAMERA_ONLY_MODE'
  | 'NO_HAND_IN_FRAME'
  | 'HAND_TRACKING' 
  | 'PINCH_CONTROL' 
  | 'FAST_SWIPE'
  | 'PALM_CONTROL'
  | 'INDEX_SWIPE'
  | 'RELEASED'
  | 'SWIPE_LOCKED'
  | 'DOUBLE_PINCH'
  | 'FALLBACK_MOUSE_MODE'
  | 'ERROR';

export type GestureType = 'PALM_SWIPE' | 'INDEX_SWIPE' | 'NONE';
export type ActivateType = 'DOUBLE_PINCH' | 'INDEX_TAP' | 'NONE';

export interface GestureData {
  status: GestureStatus;
  gestureType: GestureType;
  activateType: ActivateType;
  isPinching: boolean;
  handX: number;
  deltaX: number;
  gestureDeltaX: number;
  swipeDirection: 'left' | 'right' | null;
  swipeId: number;
  swipeVelocity: number;
  activateId: number;
  isGestureLocked: boolean;
  isControlling: boolean;
  confidence: number;
  isFallback: boolean;
  errorMessage?: string;
  debug: {
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
    hasCamera: boolean;
    permissionState: string;
    cameraStreamActive: boolean;
    videoReady: boolean;
    videoWidth: number;
    videoHeight: number;
    videoReadyState: number;
    frameCount: number;
    resultCount: number;
    lastResultTime: number;
    hasHand: boolean;
    handCount: number;
    landmarks: any[] | null;
    handLostFrames: number;
    openPalm: boolean;
    indexPointing: boolean;
    palmLatched: boolean;
    extendedFingers: {
      index: boolean;
      middle: boolean;
      ring: boolean;
      pinky: boolean;
    };
    palmX: number | null;
    smoothedPalmX: number | null;
    dx: number;
    vx: number;
    pinchNormalized: number | null;
    pinchDown: boolean;
    pinchCount: number;
    swipeDirection: 'left' | 'right' | null;
    swipeId: number;
    activateId: number;
    lastGestureAt: number;
    reason: string;
    errorName?: string;
    errorMessage?: string;
    trackInfo?: string;
    origin?: string;
    href?: string;
    mediapipeStatus: 'NOT_STARTED' | 'LOADING' | 'LOADED' | 'FAILED';
    mediapipeSource: 'LOCAL' | 'CDN' | 'NONE';
  };
}

type PalmFrame = {
  x: number;
  t: number;
  reliable: boolean;
  openPalm: boolean;
};

const INITIAL_DEBUG: GestureData['debug'] = {
  hasMediaDevices: false,
  hasGetUserMedia: false,
  hasCamera: false,
  permissionState: 'unknown',
  cameraStreamActive: false,
  videoReady: false,
  videoWidth: 0,
  videoHeight: 0,
  videoReadyState: 0,
  frameCount: 0,
  resultCount: 0,
  lastResultTime: 0,
  hasHand: false,
  handCount: 0,
  landmarks: null,
  handLostFrames: 0,
  openPalm: false,
  indexPointing: false,
  palmLatched: false,
  extendedFingers: { index: false, middle: false, ring: false, pinky: false },
  palmX: null,
  smoothedPalmX: 0.5,
  dx: 0,
  vx: 0,
  pinchNormalized: null,
  pinchDown: false,
  pinchCount: 0,
  swipeDirection: null,
  swipeId: 0,
  activateId: 0,
  lastGestureAt: 0,
  reason: 'INIT',
  origin: typeof window !== 'undefined' ? window.location.origin : '',
  href: typeof window !== 'undefined' ? window.location.href : '',
  mediapipeStatus: 'NOT_STARTED',
  mediapipeSource: 'NONE'
};

export const useHandGesture = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) => {
  const [status, setStatus] = useState<GestureStatus>('INIT');
  const [gestureData, setGestureData] = useState<GestureData>({
    status: 'INIT',
    gestureType: 'NONE',
    activateType: 'NONE',
    isPinching: false,
    handX: 0.5,
    deltaX: 0,
    gestureDeltaX: 0,
    swipeDirection: null,
    swipeId: 0,
    swipeVelocity: 0,
    activateId: 0,
    isGestureLocked: false,
    isControlling: false,
    confidence: 0,
    isFallback: false,
    debug: INITIAL_DEBUG
  });
  
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);

  // Stats
  const frameCountRef = useRef(0);
  const resultCountRef = useRef(0);
  const lastResultTimeRef = useRef(0);

  // Smoothing and tracking refs
  const smoothedHandX = useRef(0.5);
  const lastHandX = useRef(0.5);
  const velocityX = useRef(0);
  const lastGestureTime = useRef(0);
  const pinchStartHandX = useRef<number | null>(null);
  const swipeIdCounter = useRef(0);
  const activateIdCounter = useRef(0);

  // Gesture State Refs
  const isGestureArmed = useRef(true);
  const gestureLockStartTime = useRef(0);
  
  // Double Pinch Tracking
  const pinchDownRef = useRef(false);
  const lastPinchDownTime = useRef(0);
  const pinchCountRef = useRef(0);

  // History and Latching
  const palmHistory = useRef<PalmFrame[]>([]);
  const indexHistory = useRef<PalmFrame[]>([]);
  const lastPalmDetectTime = useRef(0);
  const lostFrameCount = useRef(0);

  const updateDebug = useCallback((updates: Partial<GestureData['debug']> | { status: GestureStatus, reason: string }) => {
    setGestureData(prev => {
      const newStatus = (updates as any).status || prev.status;
      const newDebug = { ...prev.debug, ...updates };
      if ((updates as any).status) setStatus(newStatus);
      
      return {
        ...prev,
        status: newStatus,
        debug: newDebug as GestureData['debug']
      };
    });
  }, []);

  const calculateDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const onResults = useCallback((results: any) => {
    resultCountRef.current++;
    lastResultTimeRef.current = Date.now();

    const now = Date.now();
    let nextStatus: GestureStatus = 'MEDIAPIPE_RUNNING';
    let nextIsPinching = false;
    let nextHandX = lastHandX.current;
    let nextDeltaX = 0;
    let nextSwipe: 'left' | 'right' | null = null;
    let nextSwipeId = gestureData.swipeId;
    let nextActivateId = gestureData.activateId;
    let nextGestureType: GestureType = 'NONE';
    let nextActivateType: ActivateType = 'NONE';
    let nextSwipeVelocity = 0;
    let currentConfidence = 0;
    let isHandPresent = false;
    let isOpenPalm = false;
    let isIndexPointing = false;
    let debugReason = 'HAND_FOUND';
    let normalizedPinchValue: number | null = null;
    let fingerStates = { index: false, middle: false, ring: false, pinky: false };
    let currentLandmarks = null;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      isHandPresent = true;
      lostFrameCount.current = 0;
      const landmarks = results.multiHandLandmarks[0];
      currentLandmarks = landmarks;
      currentConfidence = results.multiHandWorldLandmarks?.[0]?.[0]?.score || 0.8;
      
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPip = landmarks[18];
      const palmBase = landmarks[0];
      const palmMid = landmarks[9];

      const palmCenterLandmarks = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
      const currentPalmX = palmCenterLandmarks.reduce((sum, l) => sum + l.x, 0) / 5;

      // Finger Detection
      fingerStates = {
        index: indexTip.y < indexPip.y,
        middle: middleTip.y < middlePip.y,
        ring: ringTip.y < ringPip.y,
        pinky: pinkyTip.y < pinkyPip.y
      };
      const extendedCount = Object.values(fingerStates).filter(v => v).length;
      
      // Open Palm: Index + Middle + Ring or Pinky
      isOpenPalm = extendedCount >= 3;
      
      // Index Pointing: Index extended, Middle, Ring, Pinky folded (at least 2 of 3)
      const otherThreeFolded = (!fingerStates.middle && !fingerStates.ring) || 
                               (!fingerStates.middle && !fingerStates.pinky) ||
                               (!fingerStates.ring && !fingerStates.pinky);
      isIndexPointing = fingerStates.index && otherThreeFolded;
      
      if (isOpenPalm) lastPalmDetectTime.current = now;

      const isLatchedPalm = isOpenPalm || (now - lastPalmDetectTime.current < 400);

      // Continuous Control Smoothing
      smoothedHandX.current = smoothedHandX.current * 0.55 + currentPalmX * 0.45;
      nextHandX = smoothedHandX.current;

      // History Buffers
      palmHistory.current.push({ x: currentPalmX, t: now, reliable: true, openPalm: isOpenPalm });
      if (palmHistory.current.length > 25) palmHistory.current.shift();
      
      if (isIndexPointing) {
        indexHistory.current.push({ x: indexTip.x, t: now, reliable: true, openPalm: false });
      } else {
        // Clear history if not pointing to avoid stale movements
        if (indexHistory.current.length > 0) indexHistory.current.shift();
      }
      if (indexHistory.current.length > 20) indexHistory.current.shift();

      // 1. Double Pinch Activation
      const palmSize = calculateDistance(palmBase, palmMid);
      const pinchDist = calculateDistance(thumbTip, indexTip);
      normalizedPinchValue = pinchDist / (palmSize || 0.1);

      const IS_PINCH_DOWN = normalizedPinchValue < 0.38;
      const IS_PINCH_UP = normalizedPinchValue > 0.52;

      if (IS_PINCH_DOWN && !pinchDownRef.current) {
        // Pinch Start (Initial Down)
        pinchDownRef.current = true;
        const timeSinceLastPinch = now - lastPinchDownTime.current;
        
        if (timeSinceLastPinch < 450 && timeSinceLastPinch > 100) {
           pinchCountRef.current += 1;
        } else {
           pinchCountRef.current = 1;
        }
        lastPinchDownTime.current = now;
        
        if (pinchCountRef.current >= 2) {
          nextActivateType = 'DOUBLE_PINCH';
          activateIdCounter.current += 1;
          nextActivateId = activateIdCounter.current;
          debugReason = 'DOUBLE_PINCH_ACTIVATED';
          pinchCountRef.current = 0; // Reset
          
          // Cooldown for activate
          lastGestureTime.current = now + 400; 
        }
      } else if (IS_PINCH_UP) {
        pinchDownRef.current = false;
      }

      // 2. Pinch Drag Control (Continuous)
      nextIsPinching = IS_PINCH_DOWN || (gestureData.isPinching && !IS_PINCH_UP);

      if (nextIsPinching) {
        nextStatus = 'PINCH_CONTROL';
        if (pinchStartHandX.current === null) pinchStartHandX.current = nextHandX;
        nextDeltaX = -(nextHandX - pinchStartHandX.current) * 2200;
      } else {
        pinchStartHandX.current = null;
        
        // 3. Swipe Detection with Arming/Locking
        const currentVxRaw = (nextHandX - lastHandX.current) / 16; 
        
        // Re-arm conditions
        if (!isGestureArmed.current) {
          const timeSinceLock = now - gestureLockStartTime.current;
          const isStable = Math.abs(currentVxRaw) < 0.0004;
          const isCenter = Math.abs(nextHandX - 0.5) < 0.15;
          const isReleased = !isLatchedPalm && !isIndexPointing;
          
          if (timeSinceLock > 600 || isStable || isCenter || isReleased) {
            isGestureArmed.current = true;
            debugReason = 'GESTURE_REARMED';
          } else {
            nextStatus = 'SWIPE_LOCKED';
            debugReason = 'WAITING_FOR_RESET';
          }
        }

        // Only trigger if armed and enough time has passed since last gesture
        if (isGestureArmed.current && now - lastGestureTime.current > 450) {
          // A. Palm Swipe
          if (isLatchedPalm) {
            const history = palmHistory.current;
            const windowMs = 350;
            const earliest = history.find(f => now - f.t < windowMs);
            const latest = history[history.length - 1];
            if (earliest && earliest !== latest) {
              const dx = latest.x - earliest.x;
              const dt = latest.t - earliest.t;
              const vx = dx / dt;
              
              // Palm Swipe Thresholds
              if (Math.abs(dx) > 0.06 || Math.abs(vx) > 0.00038) {
                nextSwipe = dx > 0 ? 'right' : 'left';
                nextStatus = 'FAST_SWIPE';
                nextGestureType = 'PALM_SWIPE';
                nextSwipeVelocity = vx;
                swipeIdCounter.current += 1;
                nextSwipeId = swipeIdCounter.current;
                
                lastGestureTime.current = now;
                isGestureArmed.current = false;
                gestureLockStartTime.current = now;
                debugReason = 'PALM_SWIPE_TRIGGERED';
              }
            }
          }
          
          // B. Index Swipe
          if (nextStatus === 'MEDIAPIPE_RUNNING' && isIndexPointing) {
            const history = indexHistory.current;
            const windowMs = 300;
            const earliest = history.find(f => now - f.t < windowMs);
            const latest = history[history.length - 1];
            if (earliest && earliest !== latest) {
              const dx = latest.x - earliest.x;
              const dt = latest.t - earliest.t;
              const vx = dx / dt;
              
              // Index Swipe Thresholds
              if (Math.abs(dx) > 0.045 || Math.abs(vx) > 0.0003) {
                nextSwipe = dx > 0 ? 'right' : 'left';
                nextStatus = 'INDEX_SWIPE';
                nextGestureType = 'INDEX_SWIPE';
                nextSwipeVelocity = vx;
                swipeIdCounter.current += 1;
                nextSwipeId = swipeIdCounter.current;
                
                lastGestureTime.current = now;
                isGestureArmed.current = false;
                gestureLockStartTime.current = now;
                debugReason = 'INDEX_SWIPE_TRIGGERED';
              }
            }
          }
        }

        if (nextStatus === 'MEDIAPIPE_RUNNING' && isLatchedPalm) {
          nextStatus = 'PALM_CONTROL';
        }
      }
      lastHandX.current = nextHandX;
    } else {
      // Hand Lost
      lostFrameCount.current += 1;
      if (lostFrameCount.current > 8) {
        nextStatus = 'NO_HAND_IN_FRAME';
        pinchStartHandX.current = null;
        isGestureArmed.current = true; // Re-arm on hand exit
        pinchCountRef.current = 0;
        debugReason = 'HAND_LOST';
      } else {
        nextStatus = status === 'NO_HAND_IN_FRAME' ? 'NO_HAND_IN_FRAME' : status;
        nextIsPinching = gestureData.isPinching;
      }
    }

    setGestureData(prev => ({
      ...prev,
      status: nextStatus,
      gestureType: nextGestureType,
      activateType: nextActivateType,
      isPinching: nextIsPinching,
      handX: nextHandX,
      deltaX: nextDeltaX,
      swipeDirection: nextSwipe,
      swipeId: nextSwipeId,
      swipeVelocity: nextSwipeVelocity,
      activateId: nextActivateId,
      isGestureLocked: !isGestureArmed.current,
      confidence: currentConfidence,
      debug: {
        ...prev.debug,
        cameraStreamActive: !!streamRef.current?.active,
        videoReady: videoRef.current?.readyState === 4,
        videoWidth: videoRef.current?.videoWidth || 0,
        videoHeight: videoRef.current?.videoHeight || 0,
        frameCount: frameCountRef.current,
        resultCount: resultCountRef.current,
        hasHand: isHandPresent,
        handCount: results.multiHandLandmarks?.length || 0,
        landmarks: currentLandmarks,
        handLostFrames: lostFrameCount.current,
        openPalm: isOpenPalm,
        indexPointing: isIndexPointing,
        palmLatched: (now - lastPalmDetectTime.current < 400),
        extendedFingers: fingerStates,
        palmX: isHandPresent ? nextHandX : null,
        dx: Number((nextHandX - lastHandX.current).toFixed(4)),
        vx: Number(velocityX.current.toFixed(5)),
        pinchNormalized: normalizedPinchValue,
        pinchDown: pinchDownRef.current,
        pinchCount: pinchCountRef.current,
        swipeDirection: nextSwipe,
        swipeId: nextSwipeId,
        activateId: nextActivateId,
        lastGestureAt: lastGestureTime.current,
        reason: debugReason
      }
    }));
    setStatus(nextStatus);
  }, [gestureData.isPinching, gestureData.swipeId, gestureData.activateId, status, videoRef]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) { try { cameraRef.current.stop(); } catch (e) {} cameraRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (handsRef.current) { try { handsRef.current.close(); } catch (e) {} handsRef.current = null; }
    initializedRef.current = false;
    initializingRef.current = false;
    startPromiseRef.current = null;
  }, []);

  const initMediaPipe = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    try {
      updateDebug({ mediapipeStatus: 'LOADING', reason: 'INIT_MEDIAPIPE' });
      // @ts-ignore
      const { Hands, Camera } = window;
      if (!Hands || !Camera) throw new Error('MediaPipe scripts not found');
      const hands = new Hands({ locateFile: (file: string) => `./mediapipe/hands/${file}` });
      updateDebug({ mediapipeSource: 'LOCAL' });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.35, minTrackingConfidence: 0.35 });
      hands.onResults(onResults);
      handsRef.current = hands;
      if (!cameraRef.current) {
        cameraRef.current = new Camera(video, {
          onFrame: async () => {
            frameCountRef.current++;
            if (handsRef.current && video) { try { await handsRef.current.send({ image: video }); } catch (e) {} }
          },
          width: 640, height: 480
        });
        await cameraRef.current.start();
      }
      updateDebug({ mediapipeStatus: 'LOADED', reason: 'MEDIAPIPE_RUNNING', status: 'MEDIAPIPE_RUNNING' });
    } catch (err: any) {
      console.error('MediaPipe Init Failed', err);
      updateDebug({ mediapipeStatus: 'FAILED', reason: 'MEDIAPIPE_INIT_FAILED', status: 'CAMERA_ONLY_MODE' });
    }
  }, [videoRef, onResults, updateDebug]);

  const startCamera = useCallback(async () => {
    if (startPromiseRef.current) return startPromiseRef.current;
    startPromiseRef.current = (async () => {
      if (initializedRef.current && streamRef.current?.active) return;
      const video = videoRef.current;
      if (!video) { updateDebug({ reason: 'VIDEO_REF_NULL' }); return; }
      try {
        initializingRef.current = true;
        updateDebug({ status: 'CHECKING_MEDIA_DEVICES', reason: 'CALLING_GET_USER_MEDIA' });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 30, facingMode: "user" }, audio: false });
        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        updateDebug({ status: 'STREAM_ACQUIRED', reason: 'STREAM_ATTACHED', hasCamera: true, cameraStreamActive: true });
        await new Promise<void>((resolve) => { if (video.readyState >= 1 && video.videoWidth > 0) resolve(); else video.onloadedmetadata = () => resolve(); });
        try { await video.play(); } catch (playErr: any) { if (playErr.name === 'AbortError') { await new Promise(r => setTimeout(r, 200)); await video.play(); } else throw playErr; }
        setStatus('VIDEO_PLAYING');
        setTimeout(() => initMediaPipe(), 500);
      } catch (err: any) {
        updateDebug({ status: 'ERROR', reason: 'START_CAMERA_FAILED', errorName: err.name, errorMessage: err.message });
      } finally { initializingRef.current = false; startPromiseRef.current = null; initializedRef.current = true; }
    })();
    return startPromiseRef.current;
  }, [videoRef, updateDebug, initMediaPipe]);

  useEffect(() => {
    let cancelled = false;
    const autoStart = async () => {
      for (let i = 0; i < 15; i++) { if (videoRef.current) break; await new Promise(r => setTimeout(r, 200)); }
      if (!cancelled && videoRef.current) await startCamera();
    };
    autoStart();
    return () => { cancelled = true; stopCamera(); };
  }, []);

  return { status, gestureData, startCamera };
};
