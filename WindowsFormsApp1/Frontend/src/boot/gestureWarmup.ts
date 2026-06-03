import { fusionRuntimeCache } from './runtimeCache';

// MediaPipe Hands is by far the heaviest thing the desktop loads (~24 MB of WASM +
// model assets, plus a graph compile). Left to the Home shell, that work runs the
// moment the boot loader disappears — which is exactly the post-boot stutter. This
// module loads + warms it DURING boot so the loader's progress bar reflects the real
// cost and Home mounts with the engine already live. Every failure is swallowed: the
// gesture hook falls back to a cold init if anything here goes wrong.

let mediaPipeLoadPromise: Promise<void> | null = null;

function loadScriptOnce(src: string, id: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    if (!existing) document.head.appendChild(script);
  });
}

// Shared by the boot warm-up and the live gesture hook so both await the same load.
export function ensureMediaPipeScripts(): Promise<void> {
  if (!mediaPipeLoadPromise) {
    mediaPipeLoadPromise = loadScriptOnce('./mediapipe/hands/hands.js', 'fusion-mediapipe-hands')
      .then(() => loadScriptOnce('./mediapipe/hands/camera_utils.js', 'fusion-mediapipe-camera-utils'));
  }
  return mediaPipeLoadPromise;
}

// Must stay identical to the options useHandGesture applies, so the warmed graph is
// reusable without a re-init.
export const GESTURE_MODEL_OPTIONS = {
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.45,
  minTrackingConfidence: 0.45
};

// Load the scripts, build the Hands solution, and push ONE blank frame through it.
// That blank frame forces the WASM solution graph + tflite model to fully initialize
// now instead of on the first live camera frame. The warmed instance is parked in the
// runtime cache as a one-shot handoff to the Home gesture hook.
export async function warmGestureModel(): Promise<string> {
  await ensureMediaPipeScripts();

  const HandsCtor = (window as unknown as { Hands?: new (config: unknown) => any }).Hands;
  if (typeof HandsCtor !== 'function') throw new Error('MediaPipe Hands unavailable');

  const hands = new HandsCtor({ locateFile: (file: string) => `./mediapipe/hands/${file}` });
  hands.setOptions(GESTURE_MODEL_OPTIONS);
  hands.onResults(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await hands.send({ image: canvas });

  fusionRuntimeCache.gestureHands = hands;
  fusionRuntimeCache.gestureEngineWarm = true;
  return 'Gesture model warmed';
}
