// Lightweight seeded 3D value-noise + fractal Brownian motion (fBm) used to drive
// volumetric particle placement (nebula filaments, dust lanes, turbulent shells).
// Pure JS, no deps — runs once per object when its geometry is built (useMemo),
// so a few hundred-thousand samples are cheap and never touch the render loop.

export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash a lattice point (ix,iy,iz) into [0,1) deterministically for a given seed.
function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (ix | 0), 0x27d4eb2d);
  h = Math.imul(h ^ (iy | 0), 0x85ebca6b);
  h = Math.imul(h ^ (iz | 0), 0xc2b2ae35);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10); // quintic smoothstep
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Trilinearly-interpolated value noise in [0,1].
export function valueNoise3(x: number, y: number, z: number, seed = 1337): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const fz = smooth(z - z0);

  const c000 = hash3(x0, y0, z0, seed);
  const c100 = hash3(x0 + 1, y0, z0, seed);
  const c010 = hash3(x0, y0 + 1, z0, seed);
  const c110 = hash3(x0 + 1, y0 + 1, z0, seed);
  const c001 = hash3(x0, y0, z0 + 1, seed);
  const c101 = hash3(x0 + 1, y0, z0 + 1, seed);
  const c011 = hash3(x0, y0 + 1, z0 + 1, seed);
  const c111 = hash3(x0 + 1, y0 + 1, z0 + 1, seed);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);
  const y0i = lerp(x00, x10, fy);
  const y1i = lerp(x01, x11, fy);
  return lerp(y0i, y1i, fz);
}

// Fractal Brownian motion: layered noise -> cloudy, self-similar structure.
export function fbm3(x: number, y: number, z: number, seed = 1337, octaves = 4): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amplitude * valueNoise3(x * frequency, y * frequency, z * frequency, seed + o * 1013);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }
  return sum / norm; // [0,1]
}

// Ridged fBm: produces sharp bright filaments/veins like real emission nebulae.
export function ridgedFbm3(x: number, y: number, z: number, seed = 1337, octaves = 4): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const n = valueNoise3(x * frequency, y * frequency, z * frequency, seed + o * 2089);
    const ridge = 1 - Math.abs(n * 2 - 1); // fold -> ridge at 0.5
    sum += amplitude * ridge * ridge;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.06;
  }
  return sum / norm; // [0,1]
}
