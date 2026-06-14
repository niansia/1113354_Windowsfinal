"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBrowHairStrokes = exports.buildLashCurves = exports.shapeBrowRegion = exports.buildEyelinerGeometry = exports.mapNormalizedPoints = exports.mapNormalizedPoint = exports.computeCoverTransform = void 0;
const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const magnitude = (point) => Math.hypot(point.x, point.y) || 1;
const normalize = (point) => {
    const length = magnitude(point);
    return { x: point.x / length, y: point.y / length };
};
const add = (point, vector, amount) => ({
    x: point.x + vector.x * amount,
    y: point.y + vector.y * amount
});
const tangentAt = (points, index) => {
    const previous = points[Math.max(0, index - 1)] ?? points[index];
    const next = points[Math.min(points.length - 1, index + 1)] ?? points[index];
    return normalize({ x: next.x - previous.x, y: next.y - previous.y });
};
const upwardNormalAt = (points, index) => {
    const tangent = tangentAt(points, index);
    const first = { x: -tangent.y, y: tangent.x };
    const second = { x: tangent.y, y: -tangent.x };
    return first.y <= second.y ? first : second;
};
const computeCoverTransform = ({ sourceWidth, sourceHeight, viewportWidth, viewportHeight }) => {
    const safeSourceWidth = Math.max(1, sourceWidth);
    const safeSourceHeight = Math.max(1, sourceHeight);
    const safeViewportWidth = Math.max(0, viewportWidth);
    const safeViewportHeight = Math.max(0, viewportHeight);
    const scale = Math.max(safeViewportWidth / safeSourceWidth, safeViewportHeight / safeSourceHeight);
    const renderedWidth = safeSourceWidth * scale;
    const renderedHeight = safeSourceHeight * scale;
    return {
        scale,
        renderedWidth,
        renderedHeight,
        offsetX: (safeViewportWidth - renderedWidth) / 2,
        offsetY: (safeViewportHeight - renderedHeight) / 2
    };
};
exports.computeCoverTransform = computeCoverTransform;
const mapNormalizedPoint = (point, transform) => ({
    x: transform.offsetX + point.x * transform.renderedWidth,
    y: transform.offsetY + point.y * transform.renderedHeight
});
exports.mapNormalizedPoint = mapNormalizedPoint;
const mapNormalizedPoints = (points, transform) => points.map((point) => (0, exports.mapNormalizedPoint)(point, transform));
exports.mapNormalizedPoints = mapNormalizedPoints;
const linerWidthProfile = (style, t) => {
    if (style === 'tightline')
        return 0.2 + t * 0.2;
    if (style === 'smoky' || style === 'bold')
        return 0.45 + t * 0.95;
    if (style === 'fox')
        return 0.12 + t * 0.62;
    if (style === 'puppy')
        return 0.16 + t * 0.66;
    if (style === 'wing')
        return 0.14 + t * 0.78;
    return 0.16 + t * 0.52;
};
const wingDirection = (eye, style, wingLift) => {
    const outward = normalize({
        x: eye.outer.x - eye.inner.x,
        y: eye.outer.y - eye.inner.y
    });
    const lift = clamp(wingLift, -1, 1);
    let vertical;
    if (style === 'puppy')
        vertical = 0.13 - lift * 0.08;
    else if (style === 'fox')
        vertical = -(0.14 + (lift + 1) * 0.12);
    else if (style === 'smoky' || style === 'bold')
        vertical = -(0.12 + (lift + 1) * 0.1);
    else
        vertical = -(0.2 + (lift + 1) * 0.16);
    return normalize({ x: outward.x, y: outward.y + vertical });
};
const buildEyelinerGeometry = (eye, options) => {
    const upper = eye.upper.length >= 2 ? eye.upper : [eye.inner, eye.outer];
    const intensity = clamp(options.intensity);
    const thickness = clamp(options.thickness);
    const style = options.style === 'bold' ? 'smoky' : options.style;
    const styleScale = style === 'tightline' ? 0.55 : style === 'smoky' ? 1.25 : 1;
    const baseThickness = eye.h * (0.025 + thickness * 0.085) * (0.55 + intensity * 0.65) * styleScale;
    const top = upper.map((point, index) => {
        const t = upper.length === 1 ? 0 : index / (upper.length - 1);
        return add(point, upwardNormalAt(upper, index), baseThickness * linerWidthProfile(style, t));
    });
    const band = [...upper, ...top.slice().reverse()];
    if (style === 'natural' || style === 'tightline') {
        return { band, wing: null, blur: style === 'tightline' ? 0 : 0.05 };
    }
    const lengthScale = style === 'fox' ? 0.34 :
        style === 'smoky' ? 0.23 :
            style === 'puppy' ? 0.18 :
                0.25;
    const wingLength = eye.w * lengthScale * (0.45 + clamp(options.wingLength) * 0.85);
    const direction = wingDirection(eye, style, options.wingLift);
    const tip = add(eye.outer, direction, wingLength);
    const outerTop = top[top.length - 1];
    const joinIndex = Math.max(0, upper.length - 3);
    const wingPoints = [upper[joinIndex], eye.outer, tip, outerTop, top[joinIndex]];
    return {
        band,
        wing: { points: wingPoints, tip },
        blur: style === 'smoky' ? 0.28 : 0.04
    };
};
exports.buildEyelinerGeometry = buildEyelinerGeometry;
const browArchOffset = (style, t, browGap) => {
    const softPeak = Math.exp(-Math.pow((t - 0.62) / 0.28, 2));
    const definedPeak = Math.exp(-Math.pow((t - 0.68) / 0.2, 2));
    if (style === 'soft-arch')
        return -browGap * 0.1 * softPeak;
    if (style === 'defined-arch')
        return -browGap * 0.17 * definedPeak + browGap * 0.025 * t;
    if (style === 'lifted')
        return -browGap * 0.14 * t;
    return 0;
};
const shapeBrowRegion = (brow, options) => {
    if (!brow.length)
        return [];
    const averageY = brow.reduce((sum, point) => sum + point.y, 0) / brow.length;
    const averageX = brow.reduce((sum, point) => sum + point.x, 0) / brow.length;
    const minX = Math.min(...brow.map((point) => point.x));
    const maxX = Math.max(...brow.map((point) => point.x));
    const width = Math.max(0.0001, maxX - minX);
    const isImageRight = averageX >= options.faceCenterX;
    const thicknessScale = 0.72 + clamp(options.thickness) * 0.5;
    return brow.map((point) => {
        const t = isImageRight
            ? (point.x - minX) / width
            : (maxX - point.x) / width;
        const local = point.y - averageY;
        const flattenedLocal = options.style === 'straight' ? local * 0.66 : local;
        const styledLocal = flattenedLocal * thicknessScale;
        const offset = browArchOffset(options.style, clamp(t), options.browGap);
        const y = averageY + styledLocal + offset;
        return {
            x: point.x,
            y: clamp(y, averageY - options.browGap * 0.72, averageY + options.browGap * 0.72)
        };
    });
};
exports.shapeBrowRegion = shapeBrowRegion;
const lashLengthFactor = (style, t, index) => {
    if (style === 'cat')
        return 0.55 + t * 0.85;
    if (style === 'doll')
        return 0.58 + Math.sin(Math.PI * t) * 0.88;
    if (style === 'wispy')
        return (index % 2 === 0 ? 1.12 : 0.72) * (0.74 + t * 0.28);
    return 0.72 + t * 0.3;
};
const buildLashCurves = (eye, options) => {
    const upper = eye.upper.length >= 2 ? eye.upper : [eye.inner, eye.outer];
    const intensity = clamp(options.intensity);
    const lengthControl = clamp(options.length);
    const curl = clamp(options.curl);
    return upper.map((base, index) => {
        const t = upper.length === 1 ? 0 : index / (upper.length - 1);
        const tangent = tangentAt(upper, index);
        const upward = upwardNormalAt(upper, index);
        const length = eye.h *
            (0.1 + lengthControl * 0.25) *
            lashLengthFactor(options.style, t, index) *
            (0.68 + intensity * 0.42);
        const sweep = length * (0.04 + curl * 0.18) * (0.35 + t * 0.65);
        const control = add(add(base, upward, length * 0.52), tangent, sweep * 0.25);
        const rawTip = add(add(base, upward, length), tangent, sweep);
        const tip = rawTip.y < base.y
            ? rawTip
            : { ...rawTip, y: base.y - length * 0.72 };
        return {
            base,
            control,
            tip,
            length: Math.hypot(tip.x - base.x, tip.y - base.y),
            width: eye.w * (0.0025 + intensity * 0.004)
        };
    });
};
exports.buildLashCurves = buildLashCurves;
const buildBrowHairStrokes = (brow, faceCenterX, intensity) => {
    if (brow.length < 4)
        return [];
    const half = Math.floor(brow.length / 2);
    const upper = brow.slice(0, half);
    const lower = brow.slice(half).reverse();
    const count = Math.min(upper.length, lower.length);
    const centerX = brow.reduce((sum, point) => sum + point.x, 0) / brow.length;
    const isImageRight = centerX >= faceCenterX;
    return Array.from({ length: count }, (_, index) => {
        const top = upper[index];
        const bottom = lower[index];
        const base = {
            x: (top.x + bottom.x) / 2,
            y: Math.max(top.y, bottom.y)
        };
        const localHeight = Math.max(0.003, Math.abs(top.y - bottom.y));
        const inward = isImageRight ? -1 : 1;
        const tip = {
            x: base.x + inward * localHeight * 0.32,
            y: base.y - localHeight * (0.72 + clamp(intensity) * 0.38)
        };
        return {
            base,
            control: {
                x: (base.x + tip.x) / 2,
                y: Math.min(base.y, tip.y) - localHeight * 0.08
            },
            tip,
            length: Math.hypot(tip.x - base.x, tip.y - base.y),
            width: localHeight * 0.12
        };
    });
};
exports.buildBrowHairStrokes = buildBrowHairStrokes;
