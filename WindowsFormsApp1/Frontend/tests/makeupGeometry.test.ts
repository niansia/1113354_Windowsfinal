import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEyelinerGeometry,
  buildLashCurves,
  computeCoverTransform,
  mapNormalizedPoint,
  shapeBrowRegion
} from '../src/style/makeupGeometry.js';
import type { EyeGeo, Pt } from '../src/style/faceLandmarks.js';

const rightFacingEye = (): EyeGeo => ({
  upper: [
    { x: 0.58, y: 0.35 },
    { x: 0.63, y: 0.32 },
    { x: 0.68, y: 0.31 },
    { x: 0.73, y: 0.32 },
    { x: 0.78, y: 0.35 }
  ],
  lower: [
    { x: 0.58, y: 0.35 },
    { x: 0.63, y: 0.38 },
    { x: 0.68, y: 0.39 },
    { x: 0.73, y: 0.38 },
    { x: 0.78, y: 0.35 }
  ],
  inner: { x: 0.58, y: 0.35 },
  outer: { x: 0.78, y: 0.35 },
  center: { x: 0.68, y: 0.35 },
  w: 0.2,
  h: 0.08,
  browGap: 0.08
});

const mirrorEye = (eye: EyeGeo): EyeGeo => {
  const mirror = (point: Pt): Pt => ({ x: 1 - point.x, y: point.y });
  return {
    ...eye,
    upper: eye.upper.map(mirror),
    lower: eye.lower.map(mirror),
    inner: mirror(eye.inner),
    outer: mirror(eye.outer),
    center: mirror(eye.center)
  };
};

test('maps normalized landmarks through the cropped cover-fit image rectangle', () => {
  const transform = computeCoverTransform({
    sourceWidth: 900,
    sourceHeight: 923,
    viewportWidth: 300,
    viewportHeight: 640
  });

  assert.ok(transform.offsetX < -160);
  assert.equal(transform.offsetY, 0);
  assert.ok(transform.renderedWidth > 620);
  assert.equal(transform.renderedHeight, 640);

  const displayedEye = mapNormalizedPoint({ x: 0.655, y: 0.248 }, transform);
  assert.ok(displayedEye.x > 240 && displayedEye.x < 250);
  assert.ok(displayedEye.y > 155 && displayedEye.y < 165);
});

test('builds mirrored cat-eye wings that extend outwards and upwards', () => {
  const imageRightEye = rightFacingEye();
  const imageLeftEye = mirrorEye(imageRightEye);
  const options = {
    style: 'wing' as const,
    intensity: 0.7,
    thickness: 0.45,
    wingLength: 0.7,
    wingLift: 0.55
  };

  const right = buildEyelinerGeometry(imageRightEye, options);
  const left = buildEyelinerGeometry(imageLeftEye, options);

  assert.ok(right.wing);
  assert.ok(left.wing);
  assert.ok(right.wing.tip.x > imageRightEye.outer.x);
  assert.ok(left.wing.tip.x < imageLeftEye.outer.x);
  assert.ok(right.wing.tip.y < imageRightEye.outer.y);
  assert.ok(left.wing.tip.y < imageLeftEye.outer.y);
  assert.ok(right.band.length >= imageRightEye.upper.length * 2);
  assert.ok(left.band.length >= imageLeftEye.upper.length * 2);
});

test('keeps eyebrow styles within a bounded brow-bone region', () => {
  const brow: Pt[] = [
    { x: 0.58, y: 0.23 },
    { x: 0.63, y: 0.20 },
    { x: 0.68, y: 0.19 },
    { x: 0.73, y: 0.20 },
    { x: 0.78, y: 0.23 },
    { x: 0.78, y: 0.245 },
    { x: 0.73, y: 0.23 },
    { x: 0.68, y: 0.22 },
    { x: 0.63, y: 0.23 },
    { x: 0.58, y: 0.245 }
  ];

  for (const style of ['natural', 'straight', 'soft-arch', 'defined-arch', 'lifted'] as const) {
    const shaped = shapeBrowRegion(brow, {
      style,
      thickness: 0.55,
      browGap: 0.08,
      faceCenterX: 0.5
    });
    assert.equal(shaped.length, brow.length);
    assert.ok(shaped.every((point: Pt) => point.y >= 0.15 && point.y <= 0.27));
  }
});

test('creates curved lash strokes with style-specific length distribution', () => {
  const eye = rightFacingEye();
  const cat = buildLashCurves(eye, {
    style: 'cat',
    intensity: 0.75,
    length: 0.7,
    curl: 0.7
  });
  const doll = buildLashCurves(eye, {
    style: 'doll',
    intensity: 0.75,
    length: 0.7,
    curl: 0.7
  });

  assert.ok(cat.length >= 5);
  assert.ok(cat.every((lash: { base: Pt; tip: Pt; length: number }) => lash.tip.y < lash.base.y));
  assert.ok(cat[cat.length - 1].length > cat[0].length);

  const dollMiddle = doll[Math.floor(doll.length / 2)];
  assert.ok(dollMiddle.length > doll[0].length);
  assert.ok(dollMiddle.length > doll[doll.length - 1].length);
});
