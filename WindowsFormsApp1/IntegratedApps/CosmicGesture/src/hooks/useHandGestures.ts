import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GestureDebugState, GestureEvent, NumberGesture, NumberGestureValue } from "../types";

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
  const numberVotesRef = useRef<Array<NumberGestureValue | 0>>([]);
  const numberStableRef = useRef<{ value: NumberGestureValue | 0; since: number }>({ value: 0, since: 0 });
  const cooldownUntilRef = useRef(0);
  const swipeCooldownRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
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
          video: { width: 640, height: 480, facingMode: "user" },
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
      const landmarks = result.landmarks[0];
      if (landmarks) {
        processLandmarks(smoothLandmarks(landmarks), now);
      } else {
        setDebug((state) => ({ ...state, active: false, label: "未偵測到手" }));
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

    const processLandmarks = (hand: NormalizedLandmark[], now: number) => {
      const state = computeFingerState(hand);
      const pointer = {
        active: true,
        x: hand[8].x,
        y: hand[8].y,
        openness: state.openness
      };
      onGesture({ type: "pointer", pointer });

      const prev = prevPointerRef.current;
      if (prev) {
        const dt = Math.max(16, now - prev.t);
        const vx = (pointer.x - prev.x) / dt;
        const vy = (pointer.y - prev.y) / dt;
        if (Math.abs(vx) > 0.00042) {
          onGesture({ type: "orbit", velocityX: vx * 155, velocityY: vy * 82 });
        }
        // Decisive flicks => discrete navigation (object / category), with cooldown.
        if (now > swipeCooldownRef.current) {
          if (Math.abs(vx) > 0.0062 && Math.abs(vx) > Math.abs(vy) * 1.4) {
            swipeCooldownRef.current = now + 720;
            onGesture({ type: "swipe", dir: vx < 0 ? "left" : "right" });
          } else if (Math.abs(vy) > 0.0062 && Math.abs(vy) > Math.abs(vx) * 1.4) {
            swipeCooldownRef.current = now + 720;
            onGesture({ type: "tilt", dir: vy < 0 ? "up" : "down" });
          }
        }
      }
      prevPointerRef.current = { x: pointer.x, y: pointer.y, t: now };

      const open = countExtended(state) >= 4 && state.openness > 1.92;
      const fist = countExtended(state) <= 1 && state.openness < 1.42;
      if (open) {
        openSinceRef.current ??= now;
        const held = now - openSinceRef.current;
        if (held > 460) {
          onGesture({ type: "openPalm", amount: clamp((state.openness - 1.8) / 0.9, 0.48, 1) });
        }
      } else {
        openSinceRef.current = null;
      }

      if (fist) {
        fistSinceRef.current ??= now;
        if (now - fistSinceRef.current > 360) {
          onGesture({ type: "closedFist", confidence: clamp((1.5 - state.openness) / 0.42, 0.45, 1) });
        }
      } else {
        fistSinceRef.current = null;
      }

      updateFps(now);

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
    };

    const updateNumberVotes = (value: NumberGestureValue | 0, confidence: number, now: number) => {
      const votes = numberVotesRef.current;
      votes.push(confidence > 0.62 ? value : 0);
      while (votes.length > 10) votes.shift();
      const winner = majorityVote(votes);
      if (winner !== numberStableRef.current.value) {
        numberStableRef.current = { value: winner, since: now };
      }
      if (winner && now - numberStableRef.current.since > 680 && now > cooldownUntilRef.current) {
        cooldownUntilRef.current = now + 1080;
        onGesture({ type: "number", value: winner, confidence: Math.max(confidence, 0.72) });
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

export function classifySingleHandNumberGesture(hand: NormalizedLandmark[], state = computeFingerState(hand)): NumberGesture | null {
  const { thumb, index, middle, ring, pinky, palmScale } = state;
  const tip = (i: number) => hand[i];
  const thumbIndex = distance(tip(4), tip(8)) / palmScale;
  const indexMiddle = distance(tip(8), tip(12)) / palmScale;
  const thumbMiddle = distance(tip(4), tip(12)) / palmScale;
  const thumbPinky = distance(tip(4), tip(20)) / palmScale;
  const threeTipsCluster = thumbIndex < 0.56 && indexMiddle < 0.48 && thumbMiddle < 0.56;

  if (thumb && !index && !middle && !ring && pinky && thumbPinky > 1.35) {
    return { type: "number", value: 6, confidence: 0.9 };
  }
  if (!ring && !pinky && threeTipsCluster) {
    return { type: "number", value: 7, confidence: 0.86 };
  }
  if (thumb && index && !middle && !ring && !pinky && thumbIndex > 0.68) {
    return { type: "number", value: 8, confidence: 0.88 };
  }
  if (!thumb && index && !middle && !ring && !pinky) {
    return { type: "number", value: 1, confidence: 0.85 };
  }
  if (!thumb && index && middle && !ring && !pinky) {
    return { type: "number", value: 2, confidence: 0.86 };
  }
  if (!thumb && index && middle && ring && !pinky) {
    return { type: "number", value: 3, confidence: 0.84 };
  }
  if (!thumb && index && middle && ring && pinky) {
    return { type: "number", value: 4, confidence: 0.84 };
  }
  if (thumb && index && middle && ring && pinky) {
    return { type: "number", value: 5, confidence: 0.78 };
  }
  return null;
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

function majorityVote(votes: Array<NumberGestureValue | 0>): NumberGestureValue | 0 {
  const counts = new Map<NumberGestureValue | 0, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }
  let best: NumberGestureValue | 0 = 0;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (value && count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return bestCount >= 6 ? best : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
