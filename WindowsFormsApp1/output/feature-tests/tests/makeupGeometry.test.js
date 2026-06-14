"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const makeupGeometry_js_1 = require("../src/style/makeupGeometry.js");
const rightFacingEye = () => ({
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
const mirrorEye = (eye) => {
    const mirror = (point) => ({ x: 1 - point.x, y: point.y });
    return {
        ...eye,
        upper: eye.upper.map(mirror),
        lower: eye.lower.map(mirror),
        inner: mirror(eye.inner),
        outer: mirror(eye.outer),
        center: mirror(eye.center)
    };
};
(0, node_test_1.default)('maps normalized landmarks through the cropped cover-fit image rectangle', () => {
    const transform = (0, makeupGeometry_js_1.computeCoverTransform)({
        sourceWidth: 900,
        sourceHeight: 923,
        viewportWidth: 300,
        viewportHeight: 640
    });
    strict_1.default.ok(transform.offsetX < -160);
    strict_1.default.equal(transform.offsetY, 0);
    strict_1.default.ok(transform.renderedWidth > 620);
    strict_1.default.equal(transform.renderedHeight, 640);
    const displayedEye = (0, makeupGeometry_js_1.mapNormalizedPoint)({ x: 0.655, y: 0.248 }, transform);
    strict_1.default.ok(displayedEye.x > 240 && displayedEye.x < 250);
    strict_1.default.ok(displayedEye.y > 155 && displayedEye.y < 165);
});
(0, node_test_1.default)('builds mirrored cat-eye wings that extend outwards and upwards', () => {
    const imageRightEye = rightFacingEye();
    const imageLeftEye = mirrorEye(imageRightEye);
    const options = {
        style: 'wing',
        intensity: 0.7,
        thickness: 0.45,
        wingLength: 0.7,
        wingLift: 0.55
    };
    const right = (0, makeupGeometry_js_1.buildEyelinerGeometry)(imageRightEye, options);
    const left = (0, makeupGeometry_js_1.buildEyelinerGeometry)(imageLeftEye, options);
    strict_1.default.ok(right.wing);
    strict_1.default.ok(left.wing);
    strict_1.default.ok(right.wing.tip.x > imageRightEye.outer.x);
    strict_1.default.ok(left.wing.tip.x < imageLeftEye.outer.x);
    strict_1.default.ok(right.wing.tip.y < imageRightEye.outer.y);
    strict_1.default.ok(left.wing.tip.y < imageLeftEye.outer.y);
    strict_1.default.ok(right.band.length >= imageRightEye.upper.length * 2);
    strict_1.default.ok(left.band.length >= imageLeftEye.upper.length * 2);
});
(0, node_test_1.default)('keeps eyebrow styles within a bounded brow-bone region', () => {
    const brow = [
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
    for (const style of ['natural', 'straight', 'soft-arch', 'defined-arch', 'lifted']) {
        const shaped = (0, makeupGeometry_js_1.shapeBrowRegion)(brow, {
            style,
            thickness: 0.55,
            browGap: 0.08,
            faceCenterX: 0.5
        });
        strict_1.default.equal(shaped.length, brow.length);
        strict_1.default.ok(shaped.every((point) => point.y >= 0.15 && point.y <= 0.27));
    }
});
(0, node_test_1.default)('creates curved lash strokes with style-specific length distribution', () => {
    const eye = rightFacingEye();
    const cat = (0, makeupGeometry_js_1.buildLashCurves)(eye, {
        style: 'cat',
        intensity: 0.75,
        length: 0.7,
        curl: 0.7
    });
    const doll = (0, makeupGeometry_js_1.buildLashCurves)(eye, {
        style: 'doll',
        intensity: 0.75,
        length: 0.7,
        curl: 0.7
    });
    strict_1.default.ok(cat.length >= 5);
    strict_1.default.ok(cat.every((lash) => lash.tip.y < lash.base.y));
    strict_1.default.ok(cat[cat.length - 1].length > cat[0].length);
    const dollMiddle = doll[Math.floor(doll.length / 2)];
    strict_1.default.ok(dollMiddle.length > doll[0].length);
    strict_1.default.ok(dollMiddle.length > doll[doll.length - 1].length);
});
