export interface Pt { x: number; y: number; visible?: number }

/** Key body points (normalized 0..1 over the image) for garment placement. */
export interface PoseGeometry {
  shoulderL: Pt;
  shoulderR: Pt;
  hipL: Pt;
  hipR: Pt;
  kneeL: Pt;
  kneeR: Pt;
  ankleL: Pt;
  ankleR: Pt;
  shoulderCenter: Pt;
  hipCenter: Pt;
  shoulderWidth: number;
  hipWidth: number;
  /** tilt of the shoulder line, degrees */
  shoulderAngle: number;
}

// MediaPipe Pose landmark indices
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

let posePromise: Promise<unknown> | null = null;
let poseFailed = false;

async function getPoseLandmarker(): Promise<unknown> {
  if (poseFailed) return null;
  if (!posePromise) {
    posePromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const { PoseLandmarker, FilesetResolver } = vision;
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/tasks-vision/wasm');
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: '/mediapipe/models/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        numPoses: 1
      });
    })().catch((error) => {
      console.warn('[styleStudio] PoseLandmarker failed to load', error);
      poseFailed = true;
      return null;
    });
  }
  return posePromise;
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export async function detectPoseGeometry(image: HTMLImageElement): Promise<PoseGeometry | null> {
  try {
    const lm = (await getPoseLandmarker()) as
      | { detect: (img: HTMLImageElement) => { landmarks: Pt[][] } }
      | null;
    if (!lm) return null;
    const result = lm.detect(image);
    const pose = result?.landmarks?.[0];
    if (!pose || pose.length < 29) return null;
    const get = (i: number): Pt => ({ x: pose[i].x, y: pose[i].y, visible: (pose[i] as { visibility?: number }).visibility });
    const shoulderL = get(L_SHOULDER);
    const shoulderR = get(R_SHOULDER);
    const hipL = get(L_HIP);
    const hipR = get(R_HIP);
    const shoulderCenter = mid(shoulderL, shoulderR);
    const hipCenter = mid(hipL, hipR);
    return {
      shoulderL, shoulderR, hipL, hipR,
      kneeL: get(L_KNEE), kneeR: get(R_KNEE),
      ankleL: get(L_ANKLE), ankleR: get(R_ANKLE),
      shoulderCenter, hipCenter,
      shoulderWidth: dist(shoulderL, shoulderR),
      hipWidth: dist(hipL, hipR),
      // tilt from horizontal: go from the image-left shoulder to the image-right one
      shoulderAngle: (() => {
        const left = shoulderL.x <= shoulderR.x ? shoulderL : shoulderR;
        const right = shoulderL.x <= shoulderR.x ? shoulderR : shoulderL;
        return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
      })()
    };
  } catch (error) {
    console.warn('[styleStudio] pose detection error', error);
    return null;
  }
}
