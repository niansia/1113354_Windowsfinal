import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GestureDebugState, GestureEvent } from "../types";

interface UseHandGesturesOptions {
  enabled: boolean;
  onGesture: (event: GestureEvent) => void;
}

interface FingerState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  openness: number;
  palmScale: number;
}

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

export function useHandGestures({ enabled, onGesture }: UseHandGesturesOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<NormalizedLandmark[] | null>(null);
  const prevPointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const openSinceRef = useRef<number | null>(null);
  const fistSinceRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const swipeCooldownRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastDebugUpdateRef = useRef(0);

  // ---- Gesture safety layer (active control hand + intent gating) ----
  const lastMouseRef = useRef(0);
  const handTracksRef = useRef<Record<string, { x: number; y: number; t: number; vEma: number; stillSince: number; sawOpenT: number; lastSeen: number }>>({});
  const activeKeyRef = useRef<string | null>(null);
  const fistPhaseRef = useRef<'IDLE' | 'READY' | 'CLOSING' | 'HOLDING' | 'WAIT_RELEASE' | 'SUPPRESSED'>('IDLE');
  const fistOpenSeenRef = useRef(0);
  const fistClosingSinceRef = useRef(0);
  const restingRef = useRef(false);
  const [debug, setDebug] = useState<GestureDebugState>({
    enabled,
    active: false,
    label: "尚未啟動",
    confidence: 0,
    fingerStates: "-----",
    fps: 0
  });

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    smoothedRef.current = null;
    setDebug((state) => ({ ...state, active: false, label: enabled ? "攝影機已停止" : "手勢關閉" }));
  }, [enabled]);

  // Track mouse activity so gestures get stricter while the mouse is in use.
  useEffect(() => {
    const mark = () => { lastMouseRef.current = performance.now(); };
    const o = { passive: true } as AddEventListenerOptions;
    window.addEventListener("mousemove", mark, o);
    window.addEventListener("mousedown", mark, o);
    window.addEventListener("wheel", mark, o);
    window.addEventListener("click", mark, o);
    return () => {
      window.removeEventListener("mousemove", mark);
      window.removeEventListener("mousedown", mark);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("click", mark);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function start() {
      if (!enabled) {
        stop();
        return;
      }

      try {
        setDebug((state) => ({ ...state, enabled: true, label: "載入手勢模型" }));
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (disposed) return;
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.58,
          minHandPresenceConfidence: 0.58,
          minTrackingConfidence: 0.58
        });
        if (disposed) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 424, height: 320, facingMode: "user" },
          audio: false
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setDebug((state) => ({ ...state, active: true, label: "追蹤中" }));
        loop();
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知錯誤";
        setDebug((state) => ({ ...state, active: false, label: `手勢不可用：${message}` }));
      }
    }

    const loop = () => {
      if (!landmarkerRef.current || !videoRef.current || disposed) return;
      const now = performance.now();
      const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
      const hands = result.landmarks;
      if (hands && hands.length > 0) {
        // ----- Active control hand selection (movement / centre / conf / shape) -----
        const handed: any[] = (result as any).handedness || (result as any).handednesses || [];
        const seen: Record<string, number> = {};
        let bestIdx = 0;
        let bestScore = -1;
        let bestKey = "U#1";
        for (let i = 0; i < hands.length; i += 1) {
          const lm = hands[i];
          const label = handed[i]?.[0]?.categoryName || "U";
          const n = (seen[label] = (seen[label] || 0) + 1);
          const key = `${label}#${n}`;
          const pc = palmCenter(lm);
          const conf = handed[i]?.[0]?.score ?? 0.8;
          const ext = rawExtended(lm);
          const openish = ext >= 2;
          const prev = handTracksRef.current[key];
          let vEma = 0;
          if (prev) {
            const dt = Math.max(16, now - prev.t);
            const v = Math.hypot(pc.x - prev.x, pc.y - prev.y) / dt;
            vEma = prev.vEma * 0.6 + v * 0.4;
            handTracksRef.current[key] = { x: pc.x, y: pc.y, t: now, vEma, stillSince: v > 0.004 ? 0 : (prev.stillSince || now), sawOpenT: openish ? now : prev.sawOpenT, lastSeen: now };
          } else {
            handTracksRef.current[key] = { x: pc.x, y: pc.y, t: now, vEma: 0, stillSince: now, sawOpenT: openish ? now : 0, lastSeen: now };
          }
          const movement = Math.min(1, vEma * 220);
          const center = Math.max(0, 1 - Math.hypot(pc.x - 0.5, pc.y - 0.55) * 1.3 - (pc.y < 0.26 ? 0.4 : 0));
          const shape = openish ? 0.9 : ext === 1 ? 0.7 : 0.3;
          const recent = key === activeKeyRef.current ? 0.25 : 0;
          const score = 0.34 * movement + 0.24 * center + 0.16 * Math.min(1, conf) + 0.16 * shape + 0.1 * recent;
          if (score > bestScore) { bestScore = score; bestIdx = i; bestKey = key; }
        }
        if (activeKeyRef.current !== bestKey) { smoothedRef.current = null; activeKeyRef.current = bestKey; }
        const track = handTracksRef.current[bestKey];
        const stillFor = track && track.stillSince ? now - track.stillSince : 0;
        restingRef.current = stillFor > 800 && now - (track?.sawOpenT ?? 0) > 1200;
        const mouseActive = now - lastMouseRef.current < 800;
        processLandmarks(smoothLandmarks(hands[bestIdx]), now, mouseActive);
      } else {
        if (now - lastDebugUpdateRef.current > 260) {
          lastDebugUpdateRef.current = now;
          setDebug((state) => ({ ...state, active: false, label: "未偵測到手" }));
        }
        restingRef.current = false;
        fistPhaseRef.current = "IDLE";
        fistOpenSeenRef.current = 0;
        activeKeyRef.current = null;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    const smoothLandmarks = (landmarks: NormalizedLandmark[]) => {
      const previous = smoothedRef.current;
      const alpha = 0.38;
      if (!previous) {
        smoothedRef.current = landmarks.map((point) => ({ ...point }));
        return landmarks;
      }
      const smoothed = landmarks.map((point, index) => ({
        x: previous[index].x + (point.x - previous[index].x) * alpha,
        y: previous[index].y + (point.y - previous[index].y) * alpha,
        z: previous[index].z + (point.z - previous[index].z) * alpha,
        visibility: point.visibility ?? 0
      }));
      smoothedRef.current = smoothed;
      return smoothed;
    };

    const processLandmarks = (hand: NormalizedLandmark[], now: number, mouseActive: boolean) => {
      const state = computeFingerState(hand);
      const pointer = {
        active: true,
        x: hand[8].x,
        y: hand[8].y,
        openness: state.openness
      };
      onGesture({ type: "pointer", pointer });

      const prev = prevPointerRef.current;
      // Navigation (orbit / swipe / tilt) only for an actively moving control hand.
      if (prev && !restingRef.current) {
        const dt = Math.max(16, now - prev.t);
        const vx = (pointer.x - prev.x) / dt;
        const vy = (pointer.y - prev.y) / dt;
        if (Math.abs(vx) > 0.00042) {
          onGesture({ type: "orbit", velocityX: vx * 155, velocityY: vy * 82 });
        }
        // Decisive flicks => discrete navigation (object / category), with cooldown.
        if (now > swipeCooldownRef.current) {
          if (Math.abs(vx) > 0.0062 && Math.abs(vx) > Math.abs(vy) * 1.4) {
            // Interstellar travel: a left/right sweep warps to the prev/next body.
            // Short cooldown so repeated sweeps glide through the catalogue.
            swipeCooldownRef.current = now + 500;
            onGesture({ type: "swipe", dir: vx < 0 ? "left" : "right" });
          } else if (Math.abs(vy) > 0.0062 && Math.abs(vy) > Math.abs(vx) * 1.4) {
            swipeCooldownRef.current = now + 700;
            onGesture({ type: "tilt", dir: vy < 0 ? "up" : "down" });
          }
        }
      }
      prevPointerRef.current = { x: pointer.x, y: pointer.y, t: now };

      const open = countExtended(state) >= 4 && state.openness > 1.92;
      const fist = countExtended(state) <= 1 && state.openness < 1.42;

      // Open palm => overview/reset, suppressed for a resting hand.
      if (open && !restingRef.current) {
        openSinceRef.current ??= now;
        if (now - openSinceRef.current > 460) {
          onGesture({ type: "openPalm", amount: clamp((state.openness - 1.8) / 0.9, 0.48, 1) });
        }
      } else {
        openSinceRef.current = null;
      }

      // ----- Intentional fist machine: open/relaxed -> fist -> hold(300ms) -> fire.
      // Static fist (no preceding open), resting fist, and mouse-hand fist are suppressed.
      if (!fist) {
        fistOpenSeenRef.current = now;
        fistSinceRef.current = null;
        if (fistPhaseRef.current !== "READY") fistPhaseRef.current = "READY";
      } else {
        const sawOpen = now - fistOpenSeenRef.current < 950;
        switch (fistPhaseRef.current) {
          case "IDLE":
          case "SUPPRESSED":
            if (sawOpen) { fistPhaseRef.current = "CLOSING"; fistClosingSinceRef.current = now; }
            else fistPhaseRef.current = "SUPPRESSED";
            break;
          case "READY":
            fistPhaseRef.current = "CLOSING";
            fistClosingSinceRef.current = now;
            break;
          case "CLOSING":
            if (now - fistClosingSinceRef.current >= 300) fistPhaseRef.current = "HOLDING";
            break;
          case "HOLDING": {
            const intentionalEnough = !mouseActive || now - fistClosingSinceRef.current < 1600;
            if (!restingRef.current && intentionalEnough && now > cooldownUntilRef.current) {
              cooldownUntilRef.current = now + 900;
              onGesture({ type: "closedFist", confidence: 0.9 });
              fistPhaseRef.current = "WAIT_RELEASE";
            }
            break;
          }
          case "WAIT_RELEASE":
            break;
        }
      }

      updateFps(now);

      if (now - lastDebugUpdateRef.current > 140) {
        lastDebugUpdateRef.current = now;
        setDebug({
          enabled,
          active: true,
          label: open ? "張掌" : fist ? "握拳" : "追蹤中",
          confidence: open || fist ? 0.78 : 0.5,
          fingerStates: [
            state.thumb ? "T" : "-",
            state.index ? "I" : "-",
            state.middle ? "M" : "-",
            state.ring ? "R" : "-",
            state.pinky ? "P" : "-"
          ].join(""),
          fps: frameTimesRef.current.length
        });
      }
    };

    const updateFps = (now: number) => {
      const frames = frameTimesRef.current;
      frames.push(now);
      while (frames.length && frames[0] < now - 1000) frames.shift();
    };

    start();

    return () => {
      disposed = true;
      stop();
    };
  }, [enabled, onGesture, stop]);

  return { videoRef, debug, stop };
}

function computeFingerState(hand: NormalizedLandmark[]): FingerState {
  const palm = palmCenter(hand);
  const palmScale = Math.max(0.04, distance(hand[0], hand[9]) + distance(hand[5], hand[17]));
  const states = {
    thumb: fingerExtended(hand, palm, palmScale, [1, 2, 3, 4], true),
    index: fingerExtended(hand, palm, palmScale, [5, 6, 7, 8]),
    middle: fingerExtended(hand, palm, palmScale, [9, 10, 11, 12]),
    ring: fingerExtended(hand, palm, palmScale, [13, 14, 15, 16]),
    pinky: fingerExtended(hand, palm, palmScale, [17, 18, 19, 20])
  };
  const openness =
    (distance(hand[4], palm) + distance(hand[8], palm) + distance(hand[12], palm) + distance(hand[16], palm) + distance(hand[20], palm)) /
    palmScale;
  return { ...states, openness, palmScale };
}

// Cheap finger-extension count straight from tip/pip y, for active-hand scoring.
function rawExtended(hand: NormalizedLandmark[]): number {
  return (
    (hand[8].y < hand[6].y ? 1 : 0) +
    (hand[12].y < hand[10].y ? 1 : 0) +
    (hand[16].y < hand[14].y ? 1 : 0) +
    (hand[20].y < hand[18].y ? 1 : 0)
  );
}

function fingerExtended(
  hand: NormalizedLandmark[],
  palm: NormalizedLandmark,
  palmScale: number,
  [mcp, pip, dip, tip]: [number, number, number, number],
  thumb = false
) {
  const tipDistance = distance(hand[tip], palm);
  const pipDistance = distance(hand[pip], palm);
  const dipDistance = distance(hand[dip], palm);
  const straightness = angle(hand[mcp], hand[pip], hand[tip]);
  if (thumb) {
    const thumbStraight = angle(hand[1], hand[2], hand[4]) > 2.05;
    return thumbStraight && tipDistance > dipDistance * 1.05 && distance(hand[4], hand[5]) > palmScale * 0.2;
  }
  return straightness > 2.28 && tipDistance > pipDistance * 1.09 && tipDistance > dipDistance * 1.03;
}

function palmCenter(hand: NormalizedLandmark[]): NormalizedLandmark {
  const indices = [0, 5, 9, 13, 17];
  const sum = indices.reduce(
    (acc, index) => {
      acc.x += hand[index].x;
      acc.y += hand[index].y;
      acc.z += hand[index].z ?? 0;
      return acc;
    },
    { x: 0, y: 0, z: 0 }
  );
  return { x: sum.x / indices.length, y: sum.y / indices.length, z: sum.z / indices.length, visibility: 0 };
}

function angle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magA = Math.hypot(ab.x, ab.y, ab.z);
  const magC = Math.hypot(cb.x, cb.y, cb.z);
  return Math.acos(clamp(dot / Math.max(0.00001, magA * magC), -1, 1));
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function countExtended(state: FingerState): number {
  return [state.thumb, state.index, state.middle, state.ring, state.pinky].filter(Boolean).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
