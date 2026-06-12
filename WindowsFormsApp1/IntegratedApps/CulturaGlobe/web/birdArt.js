// Procedural bird illustrator -- every species portrait is DRAWN in code (canvas,
// transparent background, field-guide side view facing right). No image files at all:
// a species supplies an archetype ("shape") plus plumage colours/tweaks, and the
// painter assembles body, neck, head, beak, tail, wing, legs, crest and markings.
//
// Shapes: songbird, kingfisher, owl, parrot, raptor, duck, crane (long neck+legs),
// penguin (upright), ratite (ostrich/emu/kiwi), hummingbird, peacock (display fan),
// gull (slender sea bird).

const CACHE = new Map();

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function ell(g, cx, cy, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  g.closePath();
}

// pale plumage disappears on the paper-toned page -- give it a thin ink outline
function isPale(hex) {
  if (!hex || hex[0] !== '#') return false;
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255);
  return lum > 205;
}

// default proportions per archetype; species params override
const SHAPES = {
  songbird:    { bodyRx: 64, bodyRy: 44, headR: 30, neckLen: 8,  neckUp: 22, legLen: 34, legTh: 4, beakLen: 22, beakTh: 9,  beakCurve: 0,    tailLen: 70, tailW: 22, tailAng: 0.45, upright: 0 },
  kingfisher:  { bodyRx: 58, bodyRy: 42, headR: 36, neckLen: 2,  neckUp: 16, legLen: 20, legTh: 4, beakLen: 52, beakTh: 11, beakCurve: 0,    tailLen: 36, tailW: 20, tailAng: 0.4,  upright: 0 },
  owl:         { bodyRx: 60, bodyRy: 56, headR: 42, neckLen: -8, neckUp: 10, legLen: 22, legTh: 6, beakLen: 12, beakTh: 10, beakCurve: 0.8,  tailLen: 40, tailW: 30, tailAng: 0.6,  upright: 0.35 },
  parrot:      { bodyRx: 58, bodyRy: 46, headR: 32, neckLen: 4,  neckUp: 26, legLen: 26, legTh: 5, beakLen: 24, beakTh: 16, beakCurve: 1.0,  tailLen: 96, tailW: 22, tailAng: 0.62, upright: 0.25 },
  raptor:      { bodyRx: 66, bodyRy: 46, headR: 28, neckLen: 8,  neckUp: 20, legLen: 30, legTh: 6, beakLen: 18, beakTh: 12, beakCurve: 0.9,  tailLen: 64, tailW: 30, tailAng: 0.5,  upright: 0.15 },
  duck:        { bodyRx: 70, bodyRy: 42, headR: 26, neckLen: 18, neckUp: 30, legLen: 18, legTh: 5, beakLen: 30, beakTh: 12, beakCurve: -0.1, tailLen: 30, tailW: 18, tailAng: 0.25, upright: 0 },
  crane:       { bodyRx: 70, bodyRy: 40, headR: 18, neckLen: 70, neckUp: 64, legLen: 80, legTh: 4, beakLen: 40, beakTh: 7,  beakCurve: 0,    tailLen: 40, tailW: 26, tailAng: 0.3,  upright: 0 },
  penguin:     { bodyRx: 46, bodyRy: 72, headR: 28, neckLen: 2,  neckUp: 18, legLen: 12, legTh: 7, beakLen: 26, beakTh: 8,  beakCurve: 0.1,  tailLen: 18, tailW: 16, tailAng: 1.0,  upright: 1 },
  ratite:      { bodyRx: 72, bodyRy: 52, headR: 16, neckLen: 80, neckUp: 80, legLen: 96, legTh: 7, beakLen: 20, beakTh: 8,  beakCurve: 0.1,  tailLen: 34, tailW: 36, tailAng: 0.55, upright: 0 },
  hummingbird: { bodyRx: 40, bodyRy: 26, headR: 20, neckLen: 4,  neckUp: 10, legLen: 8,  legTh: 2, beakLen: 52, beakTh: 4,  beakCurve: 0.12, tailLen: 44, tailW: 14, tailAng: 0.5,  upright: 0 },
  peacock:     { bodyRx: 58, bodyRy: 42, headR: 22, neckLen: 46, neckUp: 48, legLen: 50, legTh: 5, beakLen: 18, beakTh: 8,  beakCurve: 0.1,  tailLen: 0,  tailW: 0,  tailAng: 0,    upright: 0, fan: 1 },
  gull:        { bodyRx: 66, bodyRy: 38, headR: 24, neckLen: 14, neckUp: 24, legLen: 30, legTh: 4, beakLen: 28, beakTh: 8,  beakCurve: 0.15, tailLen: 52, tailW: 18, tailAng: 0.3,  upright: 0 }
};

// art = { shape, body, belly, head, wing, tail, beak, legs, patch?, crest?, crestCol?,
//         eyeRing?, wingBar?, spots?, throat?, sizeMul?, beakLenMul?, tailLenMul?, neckMul? }
export function drawBird(art, W = 380, H = 320) {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const p = { ...SHAPES[art.shape || 'songbird'] };
  if (art.beakLenMul) p.beakLen *= art.beakLenMul;
  if (art.tailLenMul) p.tailLen *= art.tailLenMul;
  if (art.neckMul) { p.neckLen *= art.neckMul; p.neckUp *= art.neckMul; p.legLen *= art.neckMul > 1 ? art.neckMul * 0.9 : 1; }
  const s = (art.sizeMul || 1) * 0.92;

  g.save();
  g.translate(W * 0.46, H * 0.62);
  g.scale(s, s);

  const bodyRot = -0.12 - p.upright * 1.15;          // upright birds tilt the body vertical
  const headX = p.bodyRx * (1 - p.upright * 0.7) + p.neckLen;
  const headY = -p.neckUp - p.bodyRy * p.upright * 0.9;

  // ---- legs (behind body) ----
  g.strokeStyle = art.legs || '#7a6a55';
  g.lineWidth = p.legTh;
  g.lineCap = 'round';
  for (const off of [-10, 12]) {
    const lx = off * (1 - p.upright * 0.5);
    g.beginPath();
    g.moveTo(lx, p.bodyRy * (1 - p.upright * 0.25));
    g.lineTo(lx + 4, p.bodyRy + p.legLen);
    g.lineTo(lx + 18, p.bodyRy + p.legLen);           // foot
    g.stroke();
  }

  // ---- tail (multi-feather wedge, behind body) ----
  if (p.tailLen > 0) {
    g.fillStyle = art.tail || art.body;
    const tx = -p.bodyRx * (1 - p.upright * 0.4);
    const ty = p.upright ? p.bodyRy * 0.8 : -4;
    for (let i = -1; i <= 1; i++) {
      g.save();
      g.translate(tx, ty);
      g.rotate(Math.PI - p.tailAng + i * 0.14);
      rr(g, 0, -p.tailW / 2, p.tailLen * (1 - Math.abs(i) * 0.16), p.tailW, p.tailW / 2);
      g.globalAlpha = 0.92 - Math.abs(i) * 0.18;
      g.fill();
      g.restore();
    }
    g.globalAlpha = 1;
  }

  // ---- peacock display fan ----
  if (p.fan) {
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = Math.PI * (0.12 + 0.76 * (i / (N - 1)));
      const fx = -Math.cos(a) * 150, fy = -Math.sin(a) * 150;
      g.strokeStyle = art.tail || '#1e7e63';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(-p.bodyRx * 0.4, 0);
      g.quadraticCurveTo(fx * 0.5, fy * 0.7, fx, fy);
      g.stroke();
      ell(g, fx, fy, 12, 16, a - Math.PI / 2);
      g.fillStyle = art.tail || '#1e7e63';
      g.fill();
      ell(g, fx, fy, 6.5, 9, a - Math.PI / 2);
      g.fillStyle = art.patch || '#2b4f8f';
      g.fill();
      ell(g, fx, fy, 2.6, 3.6, a - Math.PI / 2);
      g.fillStyle = '#10241c';
      g.fill();
    }
  }

  // ---- neck ----
  if (p.neckLen > 6) {
    const neckCol = art.neckCol || art.body;
    const drawNeck = (width, col) => {
      g.strokeStyle = col;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.bodyRx * 0.45, -p.bodyRy * 0.35);
      g.quadraticCurveTo(headX * 0.82, headY * 0.25, headX, headY);
      g.stroke();
    };
    const nw = Math.max(10, p.headR * 0.9);
    if (isPale(neckCol)) drawNeck(nw + 4, 'rgba(72, 62, 46, 0.45)');
    drawNeck(nw, neckCol);
  }

  // ---- body ----
  const outline = isPale(art.body) || isPale(art.head || art.body);
  ell(g, 0, 0, p.bodyRx, p.bodyRy, bodyRot);
  g.fillStyle = art.body;
  g.fill();
  if (outline) {
    g.strokeStyle = 'rgba(72, 62, 46, 0.45)';
    g.lineWidth = 2.5;
    g.stroke();
  }
  // belly underlay (upright birds wear it as a front bib, others underneath)
  if (art.belly) {
    g.save();
    ell(g, 0, 0, p.bodyRx, p.bodyRy, bodyRot);
    g.clip();
    if (p.upright > 0.5) {
      ell(g, p.bodyRx * 0.4, p.bodyRy * 0.08, p.bodyRx * 0.72, p.bodyRy * 0.84, bodyRot);
    } else {
      ell(g, 6, p.bodyRy * 0.42, p.bodyRx * 0.92, p.bodyRy * 0.78, bodyRot * 0.6);
    }
    g.fillStyle = art.belly;
    g.fill();
    g.restore();
  }

  // ---- wing ----
  g.save();
  ell(g, -p.bodyRx * 0.12, -p.bodyRy * 0.08, p.bodyRx * 0.62, p.bodyRy * 0.55, bodyRot - 0.35);
  g.fillStyle = art.wing || art.body;
  g.fill();
  if (art.wingBar) {
    g.clip();
    g.fillStyle = art.wingBar;
    g.fillRect(-p.bodyRx * 0.55, -2, p.bodyRx * 0.9, 8);
  }
  g.restore();
  // spotted plumage (e.g. starling/owl)
  if (art.spots) {
    g.save();
    ell(g, 0, 0, p.bodyRx, p.bodyRy, bodyRot);
    g.clip();
    g.fillStyle = art.spots;
    for (let i = 0; i < 26; i++) {
      const a = (i * 2.4) % (Math.PI * 2), r = (i * 7) % p.bodyRx;
      ell(g, Math.cos(a) * r, Math.sin(a) * r * 0.7, 3, 4.4, 0);
      g.fill();
    }
    g.restore();
  }

  // ---- head ----
  ell(g, headX, headY, p.headR, p.headR * 0.94, 0);
  g.fillStyle = art.head || art.body;
  g.fill();
  if (outline) {
    g.strokeStyle = 'rgba(72, 62, 46, 0.45)';
    g.lineWidth = 2.5;
    g.stroke();
  }
  // cheek / face patch
  if (art.patch && !p.fan) {
    g.save();
    ell(g, headX, headY, p.headR, p.headR * 0.94, 0);
    g.clip();
    ell(g, headX + p.headR * 0.25, headY + p.headR * 0.25, p.headR * 0.72, p.headR * 0.6, 0);
    g.fillStyle = art.patch;
    g.fill();
    g.restore();
  }
  // throat
  if (art.throat) {
    ell(g, headX + p.headR * 0.3, headY + p.headR * 0.9, p.headR * 0.55, p.headR * 0.5, 0);
    g.fillStyle = art.throat;
    g.fill();
  }

  // ---- crest ----
  if (art.crest) {
    g.fillStyle = art.crestCol || art.head || art.body;
    const n = art.crest === 2 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      g.save();
      g.translate(headX - p.headR * 0.25 + i * 6, headY - p.headR * 0.72);
      g.rotate(-0.7 + i * 0.24);
      rr(g, 0, -26 - i * 4, 7, 30 + i * 4, 3.5);
      g.fill();
      g.restore();
    }
  }

  // ---- beak ----
  const bx = headX + p.headR * 0.82, by = headY + p.headR * 0.08;
  g.fillStyle = art.beak || '#caa64a';
  g.beginPath();
  if (p.beakCurve > 0.5) {           // hooked (parrot / raptor / owl)
    g.moveTo(bx - 4, by - p.beakTh * 0.8);
    g.quadraticCurveTo(bx + p.beakLen * 1.1, by - p.beakTh * 0.5, bx + p.beakLen * 0.7, by + p.beakTh * 0.9);
    g.quadraticCurveTo(bx + p.beakLen * 0.35, by + p.beakTh * 0.4, bx - 4, by + p.beakTh * 0.6);
  } else {
    g.moveTo(bx - 3, by - p.beakTh / 2);
    g.lineTo(bx + p.beakLen, by + p.beakLen * (p.beakCurve || 0) * 0.3);
    g.lineTo(bx - 3, by + p.beakTh / 2);
  }
  g.closePath();
  g.fill();

  // ---- eye ----
  const er = p.headR * (art.shape === 'owl' ? 0.3 : 0.16);
  if (art.eyeRing) {
    ell(g, headX + p.headR * 0.28, headY - p.headR * 0.18, er * 1.9, er * 1.9, 0);
    g.fillStyle = art.eyeRing;
    g.fill();
  }
  ell(g, headX + p.headR * 0.28, headY - p.headR * 0.18, er, er, 0);
  g.fillStyle = art.eye || '#1a140c';
  g.fill();
  ell(g, headX + p.headR * 0.33, headY - p.headR * 0.24, er * 0.32, er * 0.32, 0);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fill();

  g.restore();

  // soft ground shadow so the cutout "stands"
  g.save();
  g.globalAlpha = 0.16;
  ell(g, W * 0.46, H * 0.93, W * 0.2, 7, 0);
  g.fillStyle = '#3a3127';
  g.fill();
  g.restore();

  return cv;
}

// cached portrait canvas per species id
export function birdPortrait(bird) {
  let cv = CACHE.get(bird.id);
  if (!cv) {
    cv = drawBird(bird.art);
    CACHE.set(bird.id, cv);
  }
  return cv;
}

export function birdPortraitURL(bird) {
  const key = bird.id + ':url';
  let url = CACHE.get(key);
  if (!url) {
    url = birdPortrait(bird).toDataURL('image/png');
    CACHE.set(key, url);
  }
  return url;
}
