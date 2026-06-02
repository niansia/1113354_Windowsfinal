import { useEffect, useRef, useState, useCallback } from 'react';
import type { GestureType, ActivateType, StrokePhase, TapPhase, HandSide, ControlMode, FistPhase } from '../types';

export type { GestureType, ActivateType, StrokePhase, TapPhase, HandSide, ControlMode, FistPhase };

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
  // Stroke recognizer surface
  strokePhase: StrokePhase;
  handSide: HandSide;
  candidateX: number;
  anchorX: number;
  dxFromAnchor: number;
  velocityX: number;
  lastDirection: 'left' | 'right' | null;
  lastFireDirection: 'left' | 'right' | null;
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
    // stroke recognizer debug
    handSide: HandSide;
    gestureType: GestureType;
    strokePhase: StrokePhase;
    candidateX: number;
    anchorX: number;
    dxFromAnchor: number;
    lastDir: 'left' | 'right' | null;
    lastFireDir: 'left' | 'right' | null;
    timeSinceFire: number;
    returnDirIgnored: 'left' | 'right' | null;
    tapPhase: TapPhase;
    isFist: boolean;
    // active-hand / intent gating
    controlMode: ControlMode;
    activeHandSide: HandSide;
    activeHandScore: number;
    activeHandReason: string;
    ignoredHands: string;
    restingHand: boolean;
    restingReason: string;
    mouseActive: boolean;
    fistPhase: FistPhase;
    fistTransition: boolean;
    staticFistSuppressed: boolean;
    activateGate: string;
    activateSuppressedReason: string;
    lastActivateType: string;
    lastSuppressedType: string;
    lastSuppressedReason: string;
    errorName?: string;
    errorMessage?: string;
    trackInfo?: string;
    origin?: string;
    href?: string;
    mediapipeStatus: 'NOT_STARTED' | 'LOADING' | 'LOADED' | 'FAILED';
    mediapipeSource: 'LOCAL' | 'CDN' | 'NONE';
  };
}

type StrokeFrame = { x: number; t: number };

// ---- Stroke recognizer tuning (left/right symmetric, hand-agnostic) ----
const minimumRefireMs = 260;        // min gap between two fires
const oppositeReturnIgnoreMs = 480; // window where opposite (return) motion is ignored
const stillnessThreshold = 0.0025;  // |instVx| below this counts as "still"
const stillnessMs = 140;            // stillness must hold this long to reset
const minStrokeDistance = 0.045;    // finger/palm displacement to fire
const minStrokeVelocity = 0.00028;  // finger/palm windowed velocity to fire
const genericStrokeDistance = 0.09; // higher bar for generic-hand fallback
const genericStrokeVelocity = 0.0005;
const velocityWindowMs = 160;       // window for windowed velocity calc
const resetLostFrames = 8;
const activateCooldownMs = 900;
const activateSafeGapMs = 400;      // no activate within this of a fire
const activateSwipeGuardMs = 450;   // no activate within this of a swipe fire

// ---- Fist activate ----
const fistHoldMs = 300;
const fistOpenRecentMs = 950;   // an open/relaxed hand must have been seen this recently

// ---- Active control hand + intent gating ----
const mouseActiveWindowMs = 800;     // recent mouse activity window
const restingStillMs = 800;          // hand still this long => resting candidate
const restingVelocity = 0.004;       // |velocity| under this counts as "still"
const activeHandLockMs = 900;        // hysteresis before switching active hand
const switchHandScoreMargin = 0.25;  // new hand must beat active by this margin
const controlArmStableMs = 250;      // open/index centred this long => armed
const controlArmedDurationMs = 5000; // control stays armed this long
const intentRecentMs = 1200;         // a recent intentional transition window

// ---- Index double-tap activate ----
const tapDownThresholdY = 0.025;
const tapReleaseThresholdY = 0.015;
const tapMaxIntervalMs = 480;
const tapMinIntervalMs = 100;
const tapHorizVxGuard = 0.006;      // skip tap when hand moving horizontally fast

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
  handSide: 'Unknown',
  gestureType: 'NONE',
  strokePhase: 'IDLE',
  candidateX: 0.5,
  anchorX: 0.5,
  dxFromAnchor: 0,
  lastDir: null,
  lastFireDir: null,
  timeSinceFire: 0,
  returnDirIgnored: null,
  tapPhase: 'IDLE',
  isFist: false,
  controlMode: 'INACTIVE',
  activeHandSide: 'Unknown',
  activeHandScore: 0,
  activeHandReason: 'INIT',
  ignoredHands: '',
  restingHand: false,
  restingReason: '',
  mouseActive: false,
  fistPhase: 'IDLE',
  fistTransition: false,
  staticFistSuppressed: false,
  activateGate: 'IDLE',
  activateSuppressedReason: '',
  lastActivateType: 'NONE',
  lastSuppressedType: 'NONE',
  lastSuppressedReason: '',
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
    strokePhase: 'IDLE',
    handSide: 'Unknown',
    candidateX: 0.5,
    anchorX: 0.5,
    dxFromAnchor: 0,
    velocityX: 0,
    lastDirection: null,
    lastFireDirection: null,
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

  // Smoothing / continuous control
  const smoothedHandX = useRef(0.5);
  const lastHandX = useRef(0.5);
  const lastGestureTime = useRef(0);
  const pinchStartHandX = useRef<number | null>(null);
  const swipeIdCounter = useRef(0);
  const activateIdCounter = useRef(0);

  // Double Pinch Tracking
  const pinchDownRef = useRef(false);
  const lastPinchDownTime = useRef(0);
  const pinchCountRef = useRef(0);
  const lastActivateTimeRef = useRef(0);

  // Palm latch + hand-lost tracking
  const lastPalmDetectTime = useRef(0);
  const lostFrameCount = useRef(0);

  // ---- Stroke recognizer state ----
  const strokePhaseRef = useRef<StrokePhase>('IDLE');
  const strokeHistory = useRef<StrokeFrame[]>([]);
  const anchorXRef = useRef(0.5);
  const lastExtremeXRef = useRef(0.5);
  const lastCandidateXRef = useRef(0.5);
  const smoothedCandidateXRef = useRef(0.5);
  const lastDirectionRef = useRef<'left' | 'right' | null>(null);
  const lastFireDirectionRef = useRef<'left' | 'right' | null>(null);
  const lastFireTimeRef = useRef(0);
  const lastFireXRef = useRef(0.5);
  const lastConsumedHistoryTimeRef = useRef(0);
  const stillSinceRef = useRef(0);
  const returnSeenRef = useRef(false);
  const returnDirIgnoredRef = useRef<'left' | 'right' | null>(null);

  // ---- Fist activate state ----
  const fistSinceRef = useRef(0);
  const fistFiredRef = useRef(false);

  // ---- Index double-tap activate state ----
  const tapPhaseRef = useRef<TapPhase>('IDLE');
  const tapBaselineYRef = useRef(0.5);
  const firstTapTimeRef = useRef(0);

  // ---- Active control hand + intent gating ----
  const lastMouseActivityRef = useRef(0);
  const handTracksRef = useRef<Record<string, { x: number; y: number; t: number; vEma: number; stillSince: number; lastMoveT: number; sawIntentT: number; lastSeen: number }>>({});
  const activeHandRef = useRef<{ key: string | null; since: number; score: number }>({ key: null, since: 0, score: 0 });
  const switchCandidateRef = useRef<{ key: string | null; since: number }>({ key: null, since: 0 });
  const controlModeRef = useRef<ControlMode>('INACTIVE');
  const controlArmedUntilRef = useRef(0);
  const controlArmingSinceRef = useRef(0);
  const restingRef = useRef(false);
  const restingReasonRef = useRef('');
  // fist transition machine
  const fistPhaseRef = useRef<FistPhase>('IDLE');
  const fistOpenSeenRef = useRef(0);
  const fistClosingSinceRef = useRef(0);
  // debug refs
  const activeHandReasonRef = useRef('INIT');
  const ignoredHandsRef = useRef('');
  const activateGateRef = useRef('IDLE');
  const activateSuppressedReasonRef = useRef('');
  const lastActivateTypeRef = useRef('NONE');
  const lastSuppressedTypeRef = useRef('NONE');
  const lastSuppressedReasonRef = useRef('');
  const fistTransitionRef = useRef(false);
  const staticFistSuppressedRef = useRef(false);

  // Track mouse activity (over the stage) so activate gestures get stricter while
  // the user is actually using the mouse — avoids a bent hand on the mouse firing.
  useEffect(() => {
    const mark = () => { lastMouseActivityRef.current = Date.now(); };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('mousemove', mark, opts);
    window.addEventListener('mousedown', mark, opts);
    window.addEventListener('wheel', mark, opts);
    window.addEventListener('click', mark, opts);
    window.addEventListener('dragover', mark, opts);
    return () => {
      window.removeEventListener('mousemove', mark);
      window.removeEventListener('mousedown', mark);
      window.removeEventListener('wheel', mark);
      window.removeEventListener('click', mark);
      window.removeEventListener('dragover', mark);
    };
  }, []);

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

  // Reset the whole stroke recognizer (used on hand lost / pinch).
  const resetStroke = (phase: StrokePhase = 'IDLE') => {
    strokePhaseRef.current = phase;
    strokeHistory.current = [];
    lastDirectionRef.current = null;
    stillSinceRef.current = 0;
    returnSeenRef.current = false;
    returnDirIgnoredRef.current = null;
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
    let nextSwipeId = swipeIdCounter.current;
    let nextActivateId = activateIdCounter.current;
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
    let handSide: HandSide = 'Unknown';

    let candidateType: GestureType = 'NONE';
    let candidateX = lastCandidateXRef.current;
    let dxFromAnchor = 0;
    let instVx = 0;
    let isFistFlag = false;

    const mouseActiveNow = () => now - lastMouseActivityRef.current < mouseActiveWindowMs;

    // Emit a single activate event (shared by all activate gestures).
    const emitActivate = (type: ActivateType, reason: string) => {
      nextActivateType = type;
      activateIdCounter.current += 1;
      nextActivateId = activateIdCounter.current;
      lastActivateTimeRef.current = now;
      lastGestureTime.current = now + 400;
      debugReason = reason;
      activateGateRef.current = 'SAFE_ACTIVATE_ALLOWED';
      activateSuppressedReasonRef.current = '';
      lastActivateTypeRef.current = type;
    };

    // ===== Unified activate gate. Every app-launch gesture must pass through here.
    const tryActivate = (type: ActivateType): boolean => {
      const strict = type !== 'INDEX_DOUBLE_TAP_ACTIVATE';
      const block = (reason: string) => {
        activateGateRef.current = 'SAFE_ACTIVATE_BLOCKED';
        activateSuppressedReasonRef.current = reason;
        lastSuppressedTypeRef.current = type;
        lastSuppressedReasonRef.current = reason;
        return false;
      };
      // 1. cooldown / not immediately after a swipe
      if (now - lastActivateTimeRef.current < activateCooldownMs) return block('ACTIVATE_COOLDOWN');
      if (now - lastFireTimeRef.current < activateSwipeGuardMs) return block('SELECTED_APP_NOT_STABLE');
      // 2. stroke phase safe
      const phaseOk = strict
        ? (strokePhaseRef.current === 'IDLE' || strokePhaseRef.current === 'READY_FOR_NEXT')
        : (strokePhaseRef.current !== 'FIRED' && strokePhaseRef.current !== 'RETURNING');
      if (!phaseOk) return block('SELECTED_APP_NOT_STABLE');
      // 3. resting hand suppression
      if (restingRef.current) return block('RESTING_HAND_SUPPRESSED');
      // 4. control mode must be armed (or just performed a stroke)
      const controlOk = now < controlArmedUntilRef.current || now - lastFireTimeRef.current < intentRecentMs + 400;
      if (!controlOk) return block('CONTROL_MODE_INACTIVE');
      // 5. mouse activity makes strict gestures even stricter (need armed control)
      if (mouseActiveNow() && strict && now >= controlArmedUntilRef.current) {
        return block('MOUSE_ACTIVE_ACTIVATE_SUPPRESSED');
      }
      emitActivate(type, 'SAFE_ACTIVATE_ALLOWED');
      return true;
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      isHandPresent = true;
      lostFrameCount.current = 0;

      // ===================== ACTIVE CONTROL HAND SELECTION =====================
      // Score every detected hand and pick the one most likely being used to
      // control. Non-active hands (resting / face-support / mouse hand) are ignored
      // for gestures and only surfaced in debug.
      const allHands: any[] = results.multiHandLandmarks;
      const handedArr: any[] = results.multiHandedness || [];
      const labelSeen: Record<string, number> = {};
      type Cand = { key: string; side: HandSide; lm: any; conf: number; cx: number; cy: number; score: number; openish: boolean };
      const cands: Cand[] = allHands.map((lm: any, i: number) => {
        const rawSide = handedArr[i]?.label;
        const side: HandSide = rawSide === 'Left' ? 'Left' : rawSide === 'Right' ? 'Right' : 'Unknown';
        const n = (labelSeen[side] = (labelSeen[side] || 0) + 1);
        const key = `${side}#${n}`;
        const pc = [lm[0], lm[5], lm[9], lm[13], lm[17]];
        const cx = pc.reduce((s: number, p: any) => s + p.x, 0) / 5;
        const cy = pc.reduce((s: number, p: any) => s + p.y, 0) / 5;
        const conf = handedArr[i]?.score ?? 0.8;
        // finger extension for shape score
        const ext = (lm[8].y < lm[6].y ? 1 : 0) + (lm[12].y < lm[10].y ? 1 : 0) + (lm[16].y < lm[14].y ? 1 : 0) + (lm[20].y < lm[18].y ? 1 : 0);
        const openish = ext >= 2;

        // per-hand motion tracking
        const prev = handTracksRef.current[key];
        let vEma = 0;
        if (prev) {
          const dt = Math.max(16, now - prev.t);
          const v = Math.hypot(cx - prev.x, cy - prev.y) / dt;
          vEma = prev.vEma * 0.6 + v * 0.4;
          const moving = v > restingVelocity;
          handTracksRef.current[key] = {
            x: cx, y: cy, t: now, vEma,
            stillSince: moving ? 0 : (prev.stillSince || now),
            lastMoveT: moving ? now : prev.lastMoveT,
            sawIntentT: openish ? now : prev.sawIntentT,
            lastSeen: now
          };
        } else {
          handTracksRef.current[key] = { x: cx, y: cy, t: now, vEma: 0, stillSince: now, lastMoveT: 0, sawIntentT: openish ? now : 0, lastSeen: now };
        }

        // ---- scores ----
        const movementScore = Math.min(1, vEma * 220);
        const edgePenalty = Math.max(0, Math.abs(cx - 0.5) - 0.32) + Math.max(0, Math.abs(cy - 0.55) - 0.32);
        const facePenalty = cy < 0.26 ? 0.4 : 0; // high in frame ~ near face
        const centerScore = Math.max(0, 1 - Math.hypot(cx - 0.5, cy - 0.55) * 1.3 - edgePenalty - facePenalty);
        const confScore = Math.min(1, conf);
        const shapeScore = openish ? 0.9 : ext === 1 ? 0.7 : 0.3;
        const recentInteraction = (key === activeHandRef.current.key && (now - lastFireTimeRef.current < 1500 || now - lastActivateTimeRef.current < 1500)) ? 0.4 : 0;
        const score = 0.32 * movementScore + 0.24 * centerScore + 0.16 * confScore + 0.18 * shapeScore + 0.10 * recentInteraction;
        return { key, side, lm, conf, cx, cy, score, openish };
      });

      // best candidate
      let best = cands[0];
      for (const c of cands) if (c.score > best.score) best = c;

      // hysteresis: keep current active unless a clearly better hand persists
      const active = activeHandRef.current;
      const activeCand = cands.find((c) => c.key === active.key);
      if (!active.key || !activeCand) {
        const prevTrack = active.key ? handTracksRef.current[active.key] : undefined;
        const lostFor = prevTrack ? now - prevTrack.lastSeen : Infinity;
        if (!active.key || lostFor > activeHandLockMs) {
          activeHandRef.current = { key: best.key, since: now, score: best.score };
          activeHandReasonRef.current = 'ACTIVE_HAND_SELECTED';
          switchCandidateRef.current = { key: null, since: 0 };
        }
      } else {
        if (best.key !== active.key && best.score > activeCand.score + switchHandScoreMargin) {
          if (switchCandidateRef.current.key === best.key) {
            if (now - switchCandidateRef.current.since > activeHandLockMs) {
              activeHandRef.current = { key: best.key, since: now, score: best.score };
              activeHandReasonRef.current = 'ACTIVE_HAND_SWITCHED';
              switchCandidateRef.current = { key: null, since: 0 };
            }
          } else {
            switchCandidateRef.current = { key: best.key, since: now };
          }
        } else {
          switchCandidateRef.current = { key: null, since: 0 };
          activeHandRef.current.score = activeCand.score;
        }
      }

      const chosen = cands.find((c) => c.key === activeHandRef.current.key) || best;
      const chosenTrack = handTracksRef.current[chosen.key];
      ignoredHandsRef.current = cands.filter((c) => c.key !== chosen.key).map((c) => `${c.key}(${c.score.toFixed(2)})`).join(', ');

      // resting-hand detection for the chosen hand
      const stillFor = chosenTrack && chosenTrack.stillSince ? now - chosenTrack.stillSince : 0;
      const intentAgo = chosenTrack ? now - chosenTrack.sawIntentT : Infinity;
      if (stillFor > restingStillMs && intentAgo > intentRecentMs) {
        restingRef.current = true;
        restingReasonRef.current = chosen.cy < 0.26 ? 'RESTING_HAND_SUPPRESSED' : 'NO_INTENT_TRANSITION';
      } else {
        restingRef.current = false;
        restingReasonRef.current = '';
      }

      const landmarks = chosen.lm;
      currentLandmarks = landmarks;
      currentConfidence = chosen.conf;
      handSide = chosen.side;

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
      const palmCenterX = palmCenterLandmarks.reduce((sum, l) => sum + l.x, 0) / 5;

      // Finger extension (tip above pip => extended).
      const indexExt = indexTip.y < indexPip.y;
      const middleExt = middleTip.y < middlePip.y;
      const ringExt = ringTip.y < ringPip.y;
      const pinkyExt = pinkyTip.y < pinkyPip.y;
      fingerStates = { index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt };
      const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
      const foldedOfMRP = [middleExt, ringExt, pinkyExt].filter(e => !e).length;

      isOpenPalm = extendedCount >= 3;
      isIndexPointing = indexExt && foldedOfMRP >= 2;
      if (isOpenPalm) lastPalmDetectTime.current = now;
      const isLatchedPalm = isOpenPalm || (now - lastPalmDetectTime.current < 400);

      // ----- Control mode: arm naturally when an open/index hand rests centred -----
      const mouseActive = mouseActiveNow();
      const centred = Math.abs(chosen.cx - 0.5) < 0.3 && chosen.cy > 0.24 && chosen.cy < 0.82;
      const armCandidate = (isOpenPalm || isIndexPointing) && centred && !restingRef.current;
      if (armCandidate) {
        if (controlArmingSinceRef.current === 0) controlArmingSinceRef.current = now;
        if (now - controlArmingSinceRef.current > controlArmStableMs) controlArmedUntilRef.current = now + controlArmedDurationMs;
      } else {
        controlArmingSinceRef.current = 0;
      }
      if (isOpenPalm || isIndexPointing) fistOpenSeenRef.current = now; // intent marker
      if (mouseActive && now >= controlArmedUntilRef.current) controlModeRef.current = 'SUSPENDED_BY_MOUSE';
      else if (now < controlArmedUntilRef.current) controlModeRef.current = (strokePhaseRef.current === 'TRACKING' || strokePhaseRef.current === 'FIRED') ? 'ACTIVE_CONTROLLING' : 'CONTROL_ARMED';
      else if (armCandidate) controlModeRef.current = 'ARMING';
      else controlModeRef.current = 'INACTIVE';

      // ----- Fist detection (tip below pip => curled) -----
      const indexCurl = indexTip.y > indexPip.y;
      const middleCurl = middleTip.y > middlePip.y;
      const ringCurl = ringTip.y > ringPip.y;
      const pinkyCurl = pinkyTip.y > pinkyPip.y;
      const curledCount = [indexCurl, middleCurl, ringCurl, pinkyCurl].filter(Boolean).length;
      const isFist = curledCount >= 3;
      isFistFlag = isFist;
      // Any non-fist posture is an "open/relaxed/pointing" precursor: it re-arms the
      // fist machine and marks a recent open. A hand that appears already as a fist
      // (no preceding open) never gets re-armed -> static fist is suppressed.
      if (!isFist) {
        fistSinceRef.current = 0;
        fistFiredRef.current = false;
        fistOpenSeenRef.current = now;
        if (fistPhaseRef.current !== 'READY_OPEN_HAND') fistPhaseRef.current = 'READY_OPEN_HAND';
        fistTransitionRef.current = false;
        staticFistSuppressedRef.current = false;
      }

      // ----- Candidate selection by priority -----
      // A. Index finger swipe
      if (indexExt && foldedOfMRP >= 2) {
        candidateType = 'INDEX_SWIPE';
        candidateX = indexTip.x;
      // B. Two finger swipe (index + middle, ring/pinky at least one folded)
      } else if (indexExt && middleExt && (!ringExt || !pinkyExt)) {
        candidateType = 'TWO_FINGER_SWIPE';
        candidateX = (indexTip.x + middleTip.x) / 2;
      // C. Open palm swipe (>=3 extended)
      } else if (extendedCount >= 3) {
        candidateType = 'PALM_SWIPE';
        candidateX = palmCenterX;
      // D. Generic hand fallback (any hand present)
      } else {
        candidateType = 'GENERIC_HAND_SWIPE';
        candidateX = palmCenterX;
      }

      // Continuous palm control smoothing (used for pinch drag visuals).
      smoothedHandX.current = smoothedHandX.current * 0.55 + palmCenterX * 0.45;
      nextHandX = smoothedHandX.current;

      // ----- Pinch + double pinch -----
      const palmSize = calculateDistance(palmBase, palmMid);
      const pinchDist = calculateDistance(thumbTip, indexTip);
      normalizedPinchValue = pinchDist / (palmSize || 0.1);
      // A fist also makes thumb/index close; exclude it from pinch.
      const IS_PINCH_DOWN = !isFist && normalizedPinchValue < 0.38;
      const IS_PINCH_UP = isFist || normalizedPinchValue > 0.52;

      if (IS_PINCH_DOWN && !pinchDownRef.current) {
        pinchDownRef.current = true;
        const timeSinceLastPinch = now - lastPinchDownTime.current;
        if (timeSinceLastPinch < 450 && timeSinceLastPinch > 100) {
          pinchCountRef.current += 1;
        } else {
          pinchCountRef.current = 1;
        }
        lastPinchDownTime.current = now;

        // Double pinch is inherently transitional; still routed through the gate.
        if (pinchCountRef.current >= 2) {
          tryActivate('DOUBLE_PINCH_ACTIVATE');
          pinchCountRef.current = 0;
        }
      } else if (IS_PINCH_UP) {
        pinchDownRef.current = false;
      }

      nextIsPinching = !isFist && (IS_PINCH_DOWN || (gestureData.isPinching && !IS_PINCH_UP));

      if (isFist) {
        // ----- Intentional fist: open -> fist -> hold (>=300ms) -> activate -----
        candidateType = 'NONE';
        resetStroke('IDLE');
        tapPhaseRef.current = 'IDLE';
        const sawOpenRecently = now - fistOpenSeenRef.current < fistOpenRecentMs;
        switch (fistPhaseRef.current) {
          case 'IDLE':
          case 'SUPPRESSED_RESTING':
            // appeared as a fist with no preceding open -> static fist, suppress
            if (sawOpenRecently) {
              fistPhaseRef.current = 'FIST_CLOSING';
              fistClosingSinceRef.current = now;
              controlArmedUntilRef.current = now + controlArmedDurationMs; // deliberate fist arms control
            } else {
              fistPhaseRef.current = 'SUPPRESSED_RESTING';
            }
            break;
          case 'READY_OPEN_HAND':
            fistPhaseRef.current = 'FIST_CLOSING';
            fistClosingSinceRef.current = now;
            controlArmedUntilRef.current = now + controlArmedDurationMs; // deliberate fist arms control
            break;
          case 'FIST_CLOSING':
            if (now - fistClosingSinceRef.current >= fistHoldMs) fistPhaseRef.current = 'FIST_HOLDING';
            break;
          case 'FIST_HOLDING':
            if (tryActivate('FIST_ACTIVATE')) fistPhaseRef.current = 'WAIT_RELEASE';
            break;
          case 'WAIT_RELEASE':
            break;
        }
        fistTransitionRef.current = fistPhaseRef.current === 'FIST_CLOSING' || fistPhaseRef.current === 'FIST_HOLDING';
        staticFistSuppressedRef.current = fistPhaseRef.current === 'SUPPRESSED_RESTING';
        debugReason = staticFistSuppressedRef.current ? 'STATIC_FIST_SUPPRESSED'
          : fistPhaseRef.current === 'FIST_HOLDING' ? 'FIST_HOLDING'
          : fistPhaseRef.current === 'WAIT_RELEASE' ? 'FIST_HELD'
          : 'FIST_CLOSING';
      } else if (nextIsPinching) {
        // Pinch drag control: stroke recognizer paused & reset.
        nextStatus = 'PINCH_CONTROL';
        if (pinchStartHandX.current === null) pinchStartHandX.current = nextHandX;
        nextDeltaX = -(nextHandX - pinchStartHandX.current) * 2200;
        resetStroke('IDLE');
        tapPhaseRef.current = 'IDLE';
        candidateType = 'NONE';
      } else {
        pinchStartHandX.current = null;

        // ===================== STROKE RECOGNIZER =====================
        // Light smoothing of the candidate position to tame MediaPipe jitter.
        smoothedCandidateXRef.current = smoothedCandidateXRef.current * 0.4 + candidateX * 0.6;
        const sx = smoothedCandidateXRef.current;

        instVx = sx - lastCandidateXRef.current;
        const isStill = Math.abs(instVx) < stillnessThreshold;
        const instDir: 'left' | 'right' | null =
          instVx > stillnessThreshold ? 'right' : instVx < -stillnessThreshold ? 'left' : null;

        // Stillness window.
        if (isStill) {
          if (stillSinceRef.current === 0) stillSinceRef.current = now;
        } else {
          stillSinceRef.current = 0;
        }

        // History (used for windowed velocity + single-consume guard).
        strokeHistory.current.push({ x: sx, t: now });
        if (strokeHistory.current.length > 40) strokeHistory.current.shift();

        const isGeneric = candidateType === 'GENERIC_HAND_SWIPE';
        const fireDist = isGeneric ? genericStrokeDistance : minStrokeDistance;
        const fireVel = isGeneric ? genericStrokeVelocity : minStrokeVelocity;

        const phase = strokePhaseRef.current;

        if (phase === 'IDLE' || phase === 'READY_FOR_NEXT') {
          // Establish a fresh local baseline; a new stroke measures from here.
          anchorXRef.current = sx;
          lastExtremeXRef.current = sx;
          strokePhaseRef.current = 'TRACKING';
          debugReason = phase === 'READY_FOR_NEXT' ? 'READY_FOR_NEXT_STROKE' : 'STROKE_TRACKING';
        } else if (phase === 'TRACKING') {
          dxFromAnchor = sx - anchorXRef.current;

          // Windowed velocity over fresh (un-consumed) frames only.
          const fresh = strokeHistory.current.filter(f => f.t > lastConsumedHistoryTimeRef.current);
          let windowVx = 0;
          if (fresh.length >= 2) {
            const latest = fresh[fresh.length - 1];
            const earliest = fresh.find(f => latest.t - f.t < velocityWindowMs) || fresh[0];
            const dt = latest.t - earliest.t || 1;
            windowVx = (latest.x - earliest.x) / dt;
          }

          const dist = Math.abs(dxFromAnchor);
          const passDist = dist > fireDist;
          const passVel = Math.abs(windowVx) > fireVel && dist > fireDist * 0.5;
          const refireOk = now - lastFireTimeRef.current > minimumRefireMs;

          if ((passDist || passVel) && refireOk) {
            const dir: 'left' | 'right' = dxFromAnchor < 0 ? 'left' : 'right';
            nextSwipe = dir;
            nextGestureType = candidateType;
            nextSwipeVelocity = windowVx;
            swipeIdCounter.current += 1;
            nextSwipeId = swipeIdCounter.current;
            nextStatus = candidateType === 'INDEX_SWIPE' ? 'INDEX_SWIPE' : 'FAST_SWIPE';

            lastFireDirectionRef.current = dir;
            lastFireTimeRef.current = now;
            lastFireXRef.current = sx;
            // a real stroke proves intent -> (re)arm control for the active hand
            controlArmedUntilRef.current = now + controlArmedDurationMs;
            // Single-consume guard: nothing up to here can re-trigger.
            lastConsumedHistoryTimeRef.current = now;
            lastGestureTime.current = now;
            returnSeenRef.current = false;
            returnDirIgnoredRef.current = null;

            strokePhaseRef.current = 'FIRED';
            debugReason = dir === 'left' ? 'STROKE_FIRED_LEFT' : 'STROKE_FIRED_RIGHT';
          } else {
            // Re-baseline on long stillness (drift correction) so the next real
            // stroke measures from where the hand actually rests.
            if (isStill && stillSinceRef.current !== 0 && now - stillSinceRef.current > stillnessMs) {
              anchorXRef.current = sx;
            }
            debugReason = 'STROKE_TRACKING';
          }
        } else if (phase === 'FIRED') {
          // One frame of FIRED, then move to RETURNING.
          nextStatus = 'SWIPE_LOCKED';
          strokePhaseRef.current = 'RETURNING';
          debugReason = lastFireDirectionRef.current === 'left' ? 'STROKE_FIRED_LEFT' : 'STROKE_FIRED_RIGHT';
        } else if (phase === 'RETURNING') {
          nextStatus = 'SWIPE_LOCKED';
          dxFromAnchor = sx - anchorXRef.current;
          const reverseDir = lastFireDirectionRef.current === 'left' ? 'right' : 'left';

          // Opposite (return) motion inside the ignore window -> swallow, follow baseline.
          if (now - lastFireTimeRef.current < oppositeReturnIgnoreMs && instDir === reverseDir) {
            returnSeenRef.current = true;
            returnDirIgnoredRef.current = instDir;
            anchorXRef.current = sx; // baseline follows the hand back
            debugReason = 'RETURN_MOTION_IGNORED';
          } else {
            debugReason = 'STROKE_TRACKING';
          }

          // ----- Exit conditions (reset WITHOUT leaving frame) -----
          const stillReset = isStill && stillSinceRef.current !== 0 &&
            now - stillSinceRef.current > stillnessMs && now - lastFireTimeRef.current > minimumRefireMs;
          // A genuine NEW stroke after a return: we saw the return, now the hand
          // moves again in the fired direction.
          const reversalReset = returnSeenRef.current && instDir === lastFireDirectionRef.current &&
            now - lastFireTimeRef.current > minimumRefireMs;
          const windowElapsed = now - lastFireTimeRef.current > oppositeReturnIgnoreMs && isStill;

          if (stillReset || reversalReset || windowElapsed) {
            anchorXRef.current = sx;
            lastExtremeXRef.current = sx;
            returnDirIgnoredRef.current = null;
            returnSeenRef.current = false;
            strokePhaseRef.current = 'READY_FOR_NEXT';
            debugReason = reversalReset
              ? 'RESET_BY_DIRECTION_REVERSAL'
              : 'RESET_BY_STILLNESS';
          }
        }

        if (instDir) lastDirectionRef.current = instDir;
        lastCandidateXRef.current = sx;

        // ----- Index double-tap activate (runs while index pointing) -----
        if (candidateType === 'INDEX_SWIPE') {
          const idxY = indexTip.y;
          const horizFast = Math.abs(instVx) > tapHorizVxGuard;
          const tp = tapPhaseRef.current;
          const dyDown = idxY - tapBaselineYRef.current;

          if (tp === 'IDLE') {
            // Track resting position while the finger is up.
            tapBaselineYRef.current = tapBaselineYRef.current * 0.8 + idxY * 0.2;
            if (!horizFast && dyDown > tapDownThresholdY) {
              tapPhaseRef.current = 'TAP_DOWN_1';
            }
          } else if (tp === 'TAP_DOWN_1') {
            if (dyDown < tapReleaseThresholdY) {
              tapPhaseRef.current = 'WAIT_SECOND_TAP';
              firstTapTimeRef.current = now;
            }
          } else if (tp === 'WAIT_SECOND_TAP') {
            if (now - firstTapTimeRef.current > tapMaxIntervalMs) {
              tapPhaseRef.current = 'IDLE';
            } else if (now - firstTapTimeRef.current > tapMinIntervalMs && !horizFast && dyDown > tapDownThresholdY) {
              tapPhaseRef.current = 'TAP_DOWN_2';
            }
          } else if (tp === 'TAP_DOWN_2') {
            if (dyDown < tapReleaseThresholdY) {
              // Second tap released -> double tap complete (through unified gate).
              tryActivate('INDEX_DOUBLE_TAP_ACTIVATE');
              tapPhaseRef.current = 'IDLE';
            } else if (now - firstTapTimeRef.current > tapMaxIntervalMs * 2) {
              tapPhaseRef.current = 'IDLE';
            }
          }
        } else {
          tapPhaseRef.current = 'IDLE';
        }

        // Idle visual for palm control when nothing fired.
        if (nextStatus === 'MEDIAPIPE_RUNNING' && isLatchedPalm) {
          nextStatus = 'PALM_CONTROL';
        }
      }
      lastHandX.current = nextHandX;
    } else {
      // Hand lost
      lostFrameCount.current += 1;
      if (lostFrameCount.current > resetLostFrames) {
        nextStatus = 'NO_HAND_IN_FRAME';
        pinchStartHandX.current = null;
        pinchCountRef.current = 0;
        resetStroke('IDLE');
        fistSinceRef.current = 0;
        fistFiredRef.current = false;
        tapPhaseRef.current = 'IDLE';
        // Full intent reset: a fist reappearing after hand-lost must re-open first.
        fistPhaseRef.current = 'IDLE';
        fistOpenSeenRef.current = 0;
        fistTransitionRef.current = false;
        staticFistSuppressedRef.current = false;
        activeHandRef.current = { key: null, since: 0, score: 0 };
        switchCandidateRef.current = { key: null, since: 0 };
        controlModeRef.current = 'LOST';
        controlArmingSinceRef.current = 0;
        restingRef.current = false;
        ignoredHandsRef.current = '';
        debugReason = 'RESET_BY_HAND_LOST';
      } else {
        nextStatus = status === 'NO_HAND_IN_FRAME' ? 'NO_HAND_IN_FRAME' : status;
        nextIsPinching = gestureData.isPinching;
      }
    }

    const phaseNow = strokePhaseRef.current;
    const isLocked = phaseNow === 'FIRED' || phaseNow === 'RETURNING';

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
      isGestureLocked: isLocked,
      isControlling: nextIsPinching || phaseNow === 'TRACKING',
      confidence: currentConfidence,
      strokePhase: phaseNow,
      handSide,
      candidateX,
      anchorX: anchorXRef.current,
      dxFromAnchor,
      velocityX: instVx,
      lastDirection: lastDirectionRef.current,
      lastFireDirection: lastFireDirectionRef.current,
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
        dx: Number(dxFromAnchor.toFixed(4)),
        vx: Number(instVx.toFixed(5)),
        pinchNormalized: normalizedPinchValue,
        pinchDown: pinchDownRef.current,
        pinchCount: pinchCountRef.current,
        swipeDirection: nextSwipe,
        swipeId: nextSwipeId,
        activateId: nextActivateId,
        lastGestureAt: lastGestureTime.current,
        reason: debugReason,
        handSide,
        gestureType: candidateType,
        strokePhase: phaseNow,
        candidateX: Number(candidateX.toFixed(4)),
        anchorX: Number(anchorXRef.current.toFixed(4)),
        dxFromAnchor: Number(dxFromAnchor.toFixed(4)),
        lastDir: lastDirectionRef.current,
        lastFireDir: lastFireDirectionRef.current,
        timeSinceFire: lastFireTimeRef.current ? now - lastFireTimeRef.current : 0,
        returnDirIgnored: returnDirIgnoredRef.current,
        tapPhase: tapPhaseRef.current,
        isFist: isFistFlag,
        controlMode: controlModeRef.current,
        activeHandSide: handSide,
        activeHandScore: Number(activeHandRef.current.score.toFixed(2)),
        activeHandReason: activeHandReasonRef.current,
        ignoredHands: ignoredHandsRef.current,
        restingHand: restingRef.current,
        restingReason: restingReasonRef.current,
        mouseActive: now - lastMouseActivityRef.current < mouseActiveWindowMs,
        fistPhase: fistPhaseRef.current,
        fistTransition: fistTransitionRef.current,
        staticFistSuppressed: staticFistSuppressedRef.current,
        activateGate: activateGateRef.current,
        activateSuppressedReason: activateSuppressedReasonRef.current,
        lastActivateType: lastActivateTypeRef.current,
        lastSuppressedType: lastSuppressedTypeRef.current,
        lastSuppressedReason: lastSuppressedReasonRef.current
      }
    }));
    setStatus(nextStatus);
  }, [gestureData.isPinching, status, videoRef]);

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
      hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.45, minTrackingConfidence: 0.45 });
      hands.onResults(onResults);
      handsRef.current = hands;
      if (!cameraRef.current) {
        cameraRef.current = new Camera(video, {
          onFrame: async () => {
            frameCountRef.current++;
            if (handsRef.current && video) { try { await handsRef.current.send({ image: video }); } catch (e) {} }
          },
          width: 424, height: 320
        });
        await cameraRef.current.start();
      }
      updateDebug({ mediapipeStatus: 'LOADED', reason: 'MEDIAPIPE_RUNNING', status: 'MEDIAPIPE_RUNNING' });
    } catch (err: any) {
      if (window.localStorage?.getItem('fusionGestureDebug') === '1') {
        console.error('MediaPipe Init Failed', err);
      }
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 424 },
            height: { ideal: 320 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: "user"
          },
          audio: false
        });
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

  // The webcam is a single shared device. When the FusionOS host opens a
  // camera-using app (e.g. Cosmic Gesture) it posts FUSION_CAMERA_RELEASE so the
  // desktop stops grabbing the camera; FUSION_CAMERA_RESUME re-acquires it when
  // that app window closes. Without this the app gets "Could not start video source".
  useEffect(() => {
    const webview = (window as any).chrome?.webview;
    if (!webview || typeof webview.addEventListener !== 'function') return;
    const handler = (event: any) => {
      const data = typeof event?.data === 'string' ? event.data : '';
      if (data === 'FUSION_CAMERA_RELEASE') {
        stopCamera();
        updateDebug({ status: 'CAMERA_ONLY_MODE', reason: 'CAMERA_RELEASED_FOR_APP' });
      } else if (data === 'FUSION_CAMERA_RESUME') {
        updateDebug({ reason: 'CAMERA_RESUME_REQUESTED' });
        startCamera();
      }
    };
    webview.addEventListener('message', handler);
    return () => {
      try { webview.removeEventListener('message', handler); } catch (e) {}
    };
  }, [startCamera, stopCamera, updateDebug]);

  return { status, gestureData, startCamera };
};
