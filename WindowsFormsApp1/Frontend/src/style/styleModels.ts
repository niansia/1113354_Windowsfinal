import type { FaceModel } from './styleTypes.js';

const pexels = (id: number, w = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Real, front-facing portrait photos (Pexels, free license) used as the live
 * canvas for the makeup simulator. Facial-feature regions are normalized 0..1
 * over the photo (x → width, y → height) so the makeup overlays line up.
 */
export const FACE_MODELS: FaceModel[] = [
  {
    id: 'fair',
    name: '冷白膚調',
    toneLabel: '白皙',
    photo: pexels(12634014),
    credit: 'Krivitskiy · Pexels',
    aspect: 0.974,
    landmarks: {
      leftEye: { x: 0.155, y: 0.25, rx: 0.085, ry: 0.04, angle: -4 },
      rightEye: { x: 0.655, y: 0.248, rx: 0.085, ry: 0.04, angle: 4 },
      lips: { x: 0.415, y: 0.84, rx: 0.105, ry: 0.056 },
      leftCheek: { x: 0.22, y: 0.55, rx: 0.11, ry: 0.10 },
      rightCheek: { x: 0.72, y: 0.55, rx: 0.11, ry: 0.10 }
    }
  },
  {
    id: 'medium',
    name: '溫暖膚調',
    toneLabel: '自然',
    photo: pexels(6681652),
    credit: 'Krivitskiy · Pexels',
    aspect: 0.667,
    landmarks: {
      leftEye: { x: 0.17, y: 0.195, rx: 0.085, ry: 0.04, angle: -3 },
      rightEye: { x: 0.615, y: 0.19, rx: 0.085, ry: 0.04, angle: 3 },
      lips: { x: 0.40, y: 0.545, rx: 0.105, ry: 0.058 },
      leftCheek: { x: 0.21, y: 0.43, rx: 0.105, ry: 0.095 },
      rightCheek: { x: 0.64, y: 0.43, rx: 0.105, ry: 0.095 }
    }
  },
  {
    id: 'deep',
    name: '深棕膚調',
    toneLabel: '深邃',
    photo: pexels(10883300),
    credit: 'Macedofotografo · Pexels',
    aspect: 0.666,
    landmarks: {
      leftEye: { x: 0.315, y: 0.358, rx: 0.072, ry: 0.038, angle: -2 },
      rightEye: { x: 0.577, y: 0.346, rx: 0.075, ry: 0.04, angle: 4 },
      lips: { x: 0.38, y: 0.54, rx: 0.082, ry: 0.052, angle: 3 },
      leftCheek: { x: 0.26, y: 0.47, rx: 0.092, ry: 0.085 },
      rightCheek: { x: 0.575, y: 0.46, rx: 0.09, ry: 0.082 }
    }
  }
];

export const getFaceModel = (id: string | undefined): FaceModel =>
  FACE_MODELS.find((model) => model.id === id) ?? FACE_MODELS[0];
