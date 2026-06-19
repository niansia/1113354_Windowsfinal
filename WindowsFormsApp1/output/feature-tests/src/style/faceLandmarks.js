"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFaceGeometry = detectFaceGeometry;
// ── Canonical MediaPipe FaceMesh landmark indices (all eyes inner → outer) ──
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
// Eye A = subject's right eye (image-left). inner corner 133, outer corner 33.
const EYE_A_UPPER = [133, 173, 157, 158, 159, 160, 161, 246, 33];
const EYE_A_LOWER = [133, 155, 154, 153, 145, 144, 163, 7, 33];
const EYE_A_INNER = 133;
const EYE_A_OUTER = 33;
// Eye B = subject's left eye (image-right). inner corner 362, outer corner 263.
const EYE_B_UPPER = [362, 398, 384, 385, 386, 387, 388, 466, 263];
const EYE_B_LOWER = [362, 382, 381, 380, 374, 373, 390, 249, 263];
const EYE_B_INNER = 362;
const EYE_B_OUTER = 263;
// Eyebrow regions as closed loops (upper chain then lower chain reversed).
const BROW_A_LOOP = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const BROW_B_LOOP = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
const NOSE_BRIDGE = [168, 6, 197, 195];
const NOSE_TIP = 4;
const NOSE_SIDE_A = 129;
const NOSE_SIDE_B = 358;
const CHEEK_A = 50;
const CHEEK_B = 280;
const CHEEKBONE_A = 117;
const CHEEKBONE_B = 346;
const CUPID_BOW = 0;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;
let landmarkerPromise = null;
let landmarkerFailed = false;
async function getLandmarker() {
    if (landmarkerFailed)
        return null;
    if (!landmarkerPromise) {
        landmarkerPromise = (async () => {
            const vision = await import('@mediapipe/tasks-vision');
            const { FaceLandmarker, FilesetResolver } = vision;
            const fileset = await FilesetResolver.forVisionTasks('/mediapipe/tasks-vision/wasm');
            return FaceLandmarker.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath: '/mediapipe/models/face_landmarker.task',
                    delegate: 'CPU'
                },
                runningMode: 'IMAGE',
                numFaces: 1
            });
        })().catch((error) => {
            console.warn('[styleStudio] FaceLandmarker failed to load', error);
            landmarkerFailed = true;
            return null;
        });
    }
    return landmarkerPromise;
}
const pick = (points, indices) => indices.map((i) => points[i]).filter(Boolean);
const centroid = (pts) => {
    if (!pts.length)
        return { x: 0.5, y: 0.5 };
    const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / pts.length, y: sum.y / pts.length };
};
const span = (pts, axis) => {
    const values = pts.map((p) => p[axis]);
    return Math.max(...values) - Math.min(...values);
};
function eyeGeo(points, upperIdx, lowerIdx, innerIdx, outerIdx, browPoly) {
    const upper = pick(points, upperIdx);
    const lower = pick(points, lowerIdx);
    const all = [...upper, ...lower];
    const lashY = centroid(upper).y;
    const browY = centroid(browPoly).y;
    return {
        upper,
        lower,
        inner: points[innerIdx] ?? upper[0],
        outer: points[outerIdx] ?? upper[upper.length - 1],
        center: centroid(all),
        w: span(all, 'x'),
        h: span(all, 'y'),
        browGap: Math.max(0.012, lashY - browY)
    };
}
function buildFromLandmarks(points) {
    const lipsOuter = pick(points, LIPS_OUTER);
    const lipsInner = pick(points, LIPS_INNER);
    const browA = pick(points, BROW_A_LOOP);
    const browB = pick(points, BROW_B_LOOP);
    const faceW = Math.abs((points[FACE_RIGHT]?.x ?? 0.7) - (points[FACE_LEFT]?.x ?? 0.3)) || 0.4;
    return {
        source: 'mediapipe',
        lipsOuter,
        lipsInner,
        lipCenter: centroid(lipsOuter),
        lipW: span(lipsOuter, 'x'),
        lipH: span(lipsOuter, 'y'),
        eyes: [
            eyeGeo(points, EYE_A_UPPER, EYE_A_LOWER, EYE_A_INNER, EYE_A_OUTER, browA),
            eyeGeo(points, EYE_B_UPPER, EYE_B_LOWER, EYE_B_INNER, EYE_B_OUTER, browB)
        ],
        browPolys: [browA, browB],
        cheeks: [points[CHEEK_A], points[CHEEK_B]].filter(Boolean),
        cheekbones: [points[CHEEKBONE_A], points[CHEEKBONE_B]].filter(Boolean),
        noseBridge: pick(points, NOSE_BRIDGE),
        noseTip: points[NOSE_TIP] ?? { x: 0.5, y: 0.5 },
        noseSides: [points[NOSE_SIDE_A], points[NOSE_SIDE_B]].filter(Boolean),
        cupidBow: points[CUPID_BOW] ?? { x: 0.5, y: 0.45 },
        faceW
    };
}
/** Sample an arc of an ellipse from startDeg→endDeg (degrees, 0 = +x, CW). */
const arc = (e, startDeg, endDeg, n = 7) => {
    const rot = ((e.angle ?? 0) * Math.PI) / 180;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const out = [];
    for (let i = 0; i < n; i += 1) {
        const a = ((startDeg + (endDeg - startDeg) * (i / (n - 1))) * Math.PI) / 180;
        const ex = Math.cos(a) * e.rx;
        const ey = Math.sin(a) * e.ry;
        out.push({ x: e.x + ex * cos - ey * sin, y: e.y + ex * sin + ey * cos });
    }
    return out;
};
/** Fallback geometry synthesized from a model's hand-authored ellipses. */
function buildFromEllipses(model) {
    const lm = model.landmarks;
    const eyeFromEllipse = (e) => {
        // inner corner is toward the face centre (x ~ 0.5)
        const innerIsLeft = e.x < 0.5;
        const upper = arc(e, 180, 360, 9); // upper half, left→right
        const lower = arc(e, 180, 0, 9);
        const left = { x: e.x - e.rx, y: e.y };
        const right = { x: e.x + e.rx, y: e.y };
        return {
            upper,
            lower,
            inner: innerIsLeft ? right : left,
            outer: innerIsLeft ? left : right,
            center: { x: e.x, y: e.y },
            w: e.rx * 2,
            h: e.ry * 2,
            browGap: e.ry * 2.6
        };
    };
    const browFromEye = (e) => arc({ ...e, y: e.y - e.ry * 2.4, rx: e.rx * 1.15, ry: e.ry * 0.5 }, 0, 360, 10);
    const lipPts = arc(lm.lips, 0, 360, 18);
    return {
        source: 'ellipse',
        lipsOuter: lipPts,
        lipsInner: arc({ ...lm.lips, rx: lm.lips.rx * 0.62, ry: lm.lips.ry * 0.42 }, 0, 360, 16),
        lipCenter: { x: lm.lips.x, y: lm.lips.y },
        lipW: lm.lips.rx * 2,
        lipH: lm.lips.ry * 2,
        eyes: [eyeFromEllipse(lm.leftEye), eyeFromEllipse(lm.rightEye)],
        browPolys: [browFromEye(lm.leftEye), browFromEye(lm.rightEye)],
        cheeks: [{ x: lm.leftCheek.x, y: lm.leftCheek.y }, { x: lm.rightCheek.x, y: lm.rightCheek.y }],
        cheekbones: [
            { x: lm.leftCheek.x, y: lm.leftCheek.y - lm.leftCheek.ry * 0.5 },
            { x: lm.rightCheek.x, y: lm.rightCheek.y - lm.rightCheek.ry * 0.5 }
        ],
        noseBridge: [
            { x: (lm.leftEye.x + lm.rightEye.x) / 2, y: lm.leftEye.y + 0.02 },
            { x: (lm.leftEye.x + lm.rightEye.x) / 2, y: lm.lips.y - lm.lips.ry * 2 }
        ],
        noseTip: { x: (lm.leftEye.x + lm.rightEye.x) / 2, y: lm.lips.y - lm.lips.ry * 1.8 },
        noseSides: [
            { x: (lm.leftEye.x + lm.rightEye.x) / 2 - 0.05, y: lm.lips.y - lm.lips.ry * 2 },
            { x: (lm.leftEye.x + lm.rightEye.x) / 2 + 0.05, y: lm.lips.y - lm.lips.ry * 2 }
        ],
        cupidBow: { x: lm.lips.x, y: lm.lips.y - lm.lips.ry },
        faceW: Math.abs(lm.rightCheek.x - lm.leftCheek.x) || 0.4
    };
}
/**
 * Detect facial geometry on a loaded <img>. Tries MediaPipe FaceLandmarker;
 * if that is unavailable or finds no face, falls back to the model's
 * hand-authored ellipses (built-in models only).
 */
async function detectFaceGeometry(image, fallbackModel) {
    try {
        const landmarker = (await getLandmarker());
        if (landmarker) {
            const result = landmarker.detect(image);
            const face = result?.faceLandmarks?.[0];
            if (face && face.length > 400) {
                return buildFromLandmarks(face.map((p) => ({ x: p.x, y: p.y })));
            }
        }
    }
    catch (error) {
        console.warn('[styleStudio] face detection error', error);
    }
    return fallbackModel ? buildFromEllipses(fallbackModel) : null;
}
