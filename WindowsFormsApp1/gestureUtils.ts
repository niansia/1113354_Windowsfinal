/**
 * gestureUtils.ts
 * 手勢偵測輔助函式
 */

export const calculateDistance = (p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }) => {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + 
        Math.pow(p1.y - p2.y, 2)
    );
};

export const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

export const clamp = (val: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, val));
};
