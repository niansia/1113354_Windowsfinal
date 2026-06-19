"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cutoutGarment = cutoutGarment;
/**
 * Remove a (roughly uniform) background from a product/flat clothing photo and
 * return a transparent cutout cropped to its content. Uses an edge-seeded,
 * local region-grow flood fill so smooth backdrop gradients/vignettes are
 * followed while sharp garment edges stop the fill. Requires a CORS-clean image.
 */
function cutoutGarment(img, opts = {}) {
    const tolerance = opts.tolerance ?? 32;
    const cropTopFrac = opts.cropTopFrac ?? 0;
    const maxSize = opts.maxSize ?? 520;
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        return null;
    ctx.drawImage(img, 0, 0, w, h);
    let data;
    try {
        data = ctx.getImageData(0, 0, w, h);
    }
    catch {
        return null; // tainted (CORS) — bail
    }
    const px = data.data;
    const bg = new Uint8Array(w * h); // 1 = background
    const stack = [];
    // Sample the backdrop colour from the border (corners + edge midpoints).
    const sampleIdx = [
        0, w - 1, (h - 1) * w, h * w - 1,
        (w >> 1), (h - 1) * w + (w >> 1), ((h >> 1) * w), ((h >> 1) * w) + w - 1
    ];
    let sr = 0, sg = 0, sb = 0;
    sampleIdx.forEach((i) => { sr += px[i * 4]; sg += px[i * 4 + 1]; sb += px[i * 4 + 2]; });
    sr /= sampleIdx.length;
    sg /= sampleIdx.length;
    sb /= sampleIdx.length;
    const tol2 = tolerance * tolerance * 3;
    const isBgColor = (j) => {
        const dr = px[j * 4] - sr;
        const dg = px[j * 4 + 1] - sg;
        const db = px[j * 4 + 2] - sb;
        return dr * dr + dg * dg + db * db <= tol2;
    };
    // Connected flood from the edges: only remove backdrop-coloured pixels that
    // are reachable from a border, so a contrasting garment is never eaten and
    // garment interior pixels (not edge-connected) are kept.
    const pushSeed = (x, y) => {
        const i = y * w + x;
        if (!bg[i] && isBgColor(i)) {
            bg[i] = 1;
            stack.push(i);
        }
    };
    for (let x = 0; x < w; x += 1) {
        pushSeed(x, 0);
        pushSeed(x, h - 1);
    }
    for (let y = 0; y < h; y += 1) {
        pushSeed(0, y);
        pushSeed(w - 1, y);
    }
    while (stack.length) {
        const i = stack.pop();
        const x = i % w;
        const y = (i / w) | 0;
        const neighbors = [i - 1, i + 1, i - w, i + w];
        const nx = [x - 1, x + 1, x, x];
        const ny = [y, y, y - 1, y + 1];
        for (let k = 0; k < 4; k += 1) {
            const xx = nx[k];
            const yy = ny[k];
            if (xx < 0 || yy < 0 || xx >= w || yy >= h)
                continue;
            const j = neighbors[k];
            if (bg[j])
                continue;
            if (isBgColor(j)) {
                bg[j] = 1;
                stack.push(j);
            }
        }
    }
    // Apply transparency + optional top crop; track content bbox.
    // Also clear stray backdrop-coloured patches the edge fill never reached
    // (tighter tolerance so a contrasting garment is not touched).
    const strayTol2 = (tolerance * 0.62) * (tolerance * 0.62) * 3;
    const isStrayBg = (j) => {
        const dr = px[j * 4] - sr;
        const dg = px[j * 4 + 1] - sg;
        const db = px[j * 4 + 2] - sb;
        return dr * dr + dg * dg + db * db <= strayTol2;
    };
    const topCut = Math.round(h * cropTopFrac);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const i = y * w + x;
            if (bg[i] || y < topCut || isStrayBg(i)) {
                px[i * 4 + 3] = 0;
            }
            else {
                if (x < minX)
                    minX = x;
                if (x > maxX)
                    maxX = x;
                if (y < minY)
                    minY = y;
                if (y > maxY)
                    maxY = y;
            }
        }
    }
    ctx.putImageData(data, 0, 0);
    if (maxX <= minX || maxY <= minY)
        return { url: canvas.toDataURL('image/png'), aspect: w / h };
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    const octx = out.getContext('2d');
    if (!octx)
        return { url: canvas.toDataURL('image/png'), aspect: w / h };
    octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
    return { url: out.toDataURL('image/png'), aspect: cw / ch };
}
