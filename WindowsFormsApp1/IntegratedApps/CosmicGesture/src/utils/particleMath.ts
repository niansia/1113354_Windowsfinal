import { Color, Vector3 } from "three";
import type { CelestialBodyData, PerformanceMode } from "../types";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface ParticleGeometryData {
  positions: Float32Array;
  expanded: Float32Array;
  core: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  count: number;
}

export interface RingGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  count: number;
}

export function performanceScale(mode: PerformanceMode): number {
  if (mode === "low") return 0.26;
  if (mode === "medium") return 0.5;
  if (mode === "high") return 0.82;
  const cores = navigator.hardwareConcurrency || 6;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
  if (cores >= 8 && memory >= 8) return 0.62;
  if (cores >= 4) return 0.46;
  return 0.3;
}

export function createBodyParticles(body: CelestialBodyData, scale: number): ParticleGeometryData {
  const focusBias = 0.34;
  const targetCount = body.particleCount + (body.focusParticleCount - body.particleCount) * focusBias;
  const count = Math.max(3600, Math.floor(targetCount * scale));
  const rand = mulberry32(body.seed);
  const palette = body.colors.map((value) => new Color(value));
  const coreColor = new Color(body.coreColor);

  const positions = new Float32Array(count * 3);
  const expanded = new Float32Array(count * 3);
  const core = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const seed = rand();
    const shellBias = Math.pow(rand(), body.type === "sun" ? 0.22 : 0.16);
    const radius = 0.42 + shellBias * 0.58;
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE + rand() * 0.028;
    const roughness = body.feature === "rocky" || body.feature === "dust" ? 0.055 : 0.024;
    const featureWave = surfaceWave(body, theta, y, seed);
    const localRadius = (radius + featureWave * roughness) * body.visualRadius;
    const x = Math.cos(theta) * r * localRadius;
    const z = Math.sin(theta) * r * localRadius;
    const yy = y * localRadius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = yy;
    positions[i * 3 + 2] = z;

    const direction = new Vector3(x, yy, z).normalize();
    const expandAmount = body.type === "sun" ? 1.2 + rand() * 1.8 : 0.72 + rand() * 1.25;
    const swirl = theta + rand() * 0.9 + y * 2.4;
    expanded[i * 3] = x + direction.x * body.visualRadius * expandAmount + Math.cos(swirl) * body.visualRadius * 0.12;
    expanded[i * 3 + 1] = yy + direction.y * body.visualRadius * (0.55 + rand() * 0.95);
    expanded[i * 3 + 2] = z + direction.z * body.visualRadius * expandAmount + Math.sin(swirl) * body.visualRadius * 0.12;

    const coreLayer = Math.pow(rand(), 0.42);
    const spiralRadius = body.visualRadius * (0.08 + coreLayer * (body.type === "sun" ? 2.5 : 1.75));
    const spiralTheta = theta * 2.7 + seed * TAU + y * 5.2;
    const coreY = (rand() - 0.5) * body.visualRadius * (body.type === "sun" ? 2.2 : 1.55);
    core[i * 3] = Math.cos(spiralTheta) * spiralRadius;
    core[i * 3 + 1] = coreY + Math.sin(seed * TAU) * body.visualRadius * 0.18;
    core[i * 3 + 2] = Math.sin(spiralTheta) * spiralRadius;

    const color = body.feature === "earth" ? earthSurfaceColor(theta, y, seed) : pickFeatureColor(body, palette, coreColor, theta, y, seed);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = (body.type === "sun" ? 2.9 : 2.15) * (0.46 + Math.pow(rand(), 1.8) * 0.92);
    seeds[i] = seed * 1000 + i * 0.013;
  }

  // Earth: keep the globe intact in focus / "enter Earth" modes instead of morphing
  // into a vortex, so the continents stay readable while the camera flies in close.
  if (body.feature === "earth") {
    for (let i = 0; i < count; i += 1) {
      const x = positions[i * 3];
      const yy = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      core[i * 3] = x;
      core[i * 3 + 1] = yy;
      core[i * 3 + 2] = z;
      expanded[i * 3] = x * 1.05;
      expanded[i * 3 + 1] = yy * 1.05;
      expanded[i * 3 + 2] = z * 1.05;
    }
  }

  return { positions, expanded, core, colors, sizes, seeds, count };
}

export function createRingParticles(body: CelestialBodyData, scale: number): RingGeometryData | null {
  const ring = body.ringConfig;
  if (!ring) return null;

  const count = Math.max(8000, Math.floor(ring.particleCount * scale));
  const rand = mulberry32(body.seed + 313);
  const colorsPalette = ring.colors.map((value) => new Color(value));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const gapMid = 0.62;

  for (let i = 0; i < count; i += 1) {
    const theta = rand() * TAU;
    const lane = Math.pow(rand(), 0.86);
    const gap = Math.abs(lane - gapMid) < 0.032 ? 0.065 : 0;
    const radius = body.visualRadius * (ring.innerRadius + (ring.outerRadius - ring.innerRadius) * Math.min(1, lane + gap));
    const jitter = (rand() - 0.5) * body.visualRadius * 0.018;
    const y = (rand() - 0.5) * body.visualRadius * 0.055;

    positions[i * 3] = Math.cos(theta) * (radius + jitter);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * (radius + jitter);

    const color = colorsPalette[Math.floor(rand() * colorsPalette.length)].clone();
    color.multiplyScalar(0.82 + rand() * ring.brightness);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 2.05 * (0.42 + rand() * 0.88);
    seeds[i] = rand() * 1000 + i * 0.011;
  }

  return { positions, colors, sizes, seeds, count };
}

export function createCoreVortexParticles(body: CelestialBodyData, scale: number): ParticleGeometryData {
  const count = Math.max(18000, Math.floor((body.type === "sun" ? 90000 : 62000) * scale));
  const rand = mulberry32(body.seed + 9091);
  const palette = body.colors.map((value) => new Color(value));
  const coreColor = new Color(body.coreColor);
  const positions = new Float32Array(count * 3);
  const expanded = new Float32Array(count * 3);
  const core = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const seed = rand();
    const arm = Math.floor(rand() * 5);
    const depth = Math.pow(rand(), 1.55);
    const radius = body.visualRadius * (0.12 + depth * 5.4);
    const theta = arm * (TAU / 5) + depth * 8.2 + seed * TAU * 0.9;
    const vertical = (rand() - 0.5) * body.visualRadius * (1.2 + depth * 3.8);
    const stream = Math.sin(depth * 16 + seed * 4) * body.visualRadius * 0.35;
    const x = Math.cos(theta) * radius + Math.cos(theta * 2.1) * stream;
    const y = vertical;
    const z = Math.sin(theta) * radius + Math.sin(theta * 1.7) * stream;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const outward = 1.0 + rand() * 0.8;
    expanded[i * 3] = x * outward;
    expanded[i * 3 + 1] = y * (0.9 + rand() * 0.6);
    expanded[i * 3 + 2] = z * outward;

    core[i * 3] = x;
    core[i * 3 + 1] = y;
    core[i * 3 + 2] = z;

    const color = palette[Math.floor(rand() * palette.length)].clone().lerp(coreColor, 0.25 + (1 - depth) * 0.5);
    color.multiplyScalar(0.55 + rand() * 0.95 + body.glowIntensity * 0.06);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 1.9 * (0.42 + rand() * 1.25 + (1 - depth) * 0.8);
    seeds[i] = seed * 1000 + i * 0.017;
  }

  return { positions, expanded, core, colors, sizes, seeds, count };
}

function pickFeatureColor(
  body: CelestialBodyData,
  palette: Color[],
  coreColor: Color,
  theta: number,
  y: number,
  seed: number
): Color {
  // Polar ice caps for rocky / icy worlds (e.g. Mars' white poles).
  const latDeg = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
  if (
    Math.abs(latDeg) > 74 &&
    (body.feature === "dust" || body.feature === "rocky" || body.feature === "ice" || body.feature === "deepIce")
  ) {
    return new Color("#f3f8ff").multiplyScalar(0.5 + seed * 0.45);
  }

  const lat = (y + 1) * 0.5;
  const band = Math.sin(lat * Math.PI * 18 + Math.sin(theta * 3) * 0.7);
  const cloud = Math.sin(theta * 3.1 + y * 7.5) + Math.sin(theta * 8.3 - y * 4.2);

  let index = Math.floor(seed * palette.length) % palette.length;
  if (body.feature === "earth") {
    const land = cloud + Math.sin(theta * 2.4 + y * 10.0) > 0.54;
    const white = Math.sin(theta * 6.5 + seed * 8.0) + Math.sin(y * 14.0) > 1.15;
    index = white ? 2 : land ? 1 : seed > 0.72 ? 4 : 0;
  } else if (body.feature === "banded" || body.feature === "ringed") {
    index = band > 0.47 ? 1 : band < -0.55 ? 2 : seed > 0.88 ? 3 : 0;
    const spot = body.feature === "banded" && Math.abs(y + 0.22) < 0.18 && Math.abs(Math.sin(theta - 1.35)) < 0.2;
    if (spot) index = 4;
  } else if (body.feature === "solar") {
    index = seed > 0.78 ? 4 : band > 0.2 ? 1 : seed > 0.42 ? 2 : 3;
  } else if (body.feature === "rocky" || body.feature === "dust") {
    index = cloud > 0.65 ? 3 : cloud < -0.75 ? 2 : index;
  } else if (body.feature === "cloudy") {
    index = cloud > 0.28 ? 3 : band > 0.48 ? 1 : 0;
  } else if (body.feature === "ice" || body.feature === "deepIce") {
    index = band > 0.45 ? 1 : cloud > 0.82 ? 3 : index;
  }

  const color = palette[index].clone();
  const coreBlend = Math.max(0, 0.16 - Math.abs(y) * 0.06) * (body.type === "sun" ? 0.8 : 0.34);
  color.lerp(coreColor, coreBlend);
  color.multiplyScalar(0.42 + seed * 0.52 + body.glowIntensity * 0.045);
  return color;
}

// ---- Realistic Earth surface (continents / oceans / ice caps) ----
// Each continent is approximated by a union of lat/lon ellipses, positioned at
// the real geographic coordinates so the seven continents are recognisable on the
// rotating particle globe. [centerLat, centerLon, radiusLat(deg), radiusLon(deg)]
const EARTH_CONTINENTS: [number, number, number, number][] = [
  // North America
  [50, -100, 20, 28], [60, -95, 12, 34], [63, -150, 9, 16], [40, -80, 15, 13],
  // Greenland
  [72, -42, 11, 15],
  // Central America
  [14, -89, 7, 12],
  // South America
  [-6, -60, 15, 15], [-30, -65, 16, 9],
  // Africa
  [16, 12, 17, 24], [-12, 24, 18, 13], [7, 40, 9, 9],
  // Europe
  [52, 16, 12, 22], [63, 18, 8, 12],
  // Asia
  [52, 90, 22, 52], [66, 110, 11, 50], [30, 46, 12, 15], [24, 80, 13, 9], [14, 103, 11, 11],
  // Indonesia / Japan
  [-2, 118, 7, 20], [38, 138, 8, 5],
  // Australia / New Zealand
  [-25, 134, 12, 20], [-42, 172, 6, 4]
];

// Major desert regions -> sandy land colour.
const EARTH_DESERTS: [number, number, number, number][] = [
  [22, 14, 12, 26], // Sahara
  [23, 47, 11, 14], // Arabian
  [40, 95, 10, 20], // Gobi
  [-25, 130, 10, 18], // Australian outback
  [-25, 20, 9, 10], // Kalahari
  [34, -110, 7, 10] // North American SW
];

function inEllipses(lat: number, lon: number, regions: [number, number, number, number][], grow: number): boolean {
  for (const [clat, clon, rlat, rlon] of regions) {
    let dlon = Math.abs(lon - clon);
    if (dlon > 180) dlon = 360 - dlon;
    const a = (lat - clat) / (rlat * grow);
    const b = dlon / (rlon * grow);
    if (a * a + b * b <= 1) return true;
  }
  return false;
}

function earthLand(lat: number, lon: number, grow = 1): boolean {
  if (lat < -62) return true; // Antarctica
  return inEllipses(lat, lon, EARTH_CONTINENTS, grow);
}

function earthSurfaceColor(theta: number, y: number, seed: number): Color {
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
  let lon = ((theta % TAU) + TAU) % TAU;
  lon = (lon / TAU) * 360 - 180; // -180..180

  // Ice: Antarctica + Arctic + Greenland sheet.
  if (lat > 72 || lat < -62) {
    return new Color("#eaf3ff").multiplyScalar(0.78 + seed * 0.28);
  }

  if (!earthLand(lat, lon)) {
    // Ocean with depth variation + coastal shelf lightening.
    const wave = 0.4 + 0.45 * Math.abs(Math.sin(lat * 0.2 + seed * 3.0));
    let c = new Color("#0a3578").lerp(new Color("#1769c4"), wave);
    if (earthLand(lat, lon, 1.7)) c = c.lerp(new Color("#23a0d8"), 0.6); // shallow coastal
    return c.multiplyScalar(0.7 + seed * 0.22);
  }

  // Land climate bands.
  const a = Math.abs(lat);
  let c: Color;
  if (a > 60) {
    c = new Color("#cde0e8").lerp(new Color("#5f7d5a"), 0.45); // tundra / snow line
  } else if (inEllipses(lat, lon, EARTH_DESERTS, 1)) {
    c = new Color("#d8b577"); // desert sand
  } else if (a < 12) {
    c = new Color("#1f7e38"); // tropical rainforest
  } else {
    c = new Color("#2f7d44"); // temperate forest / plains
  }
  const texture = 0.78 + seed * 0.3 + Math.sin(lon * 0.5 + lat * 0.3) * 0.05;
  return c.multiplyScalar(Math.max(0.5, texture));
}

function surfaceWave(body: CelestialBodyData, theta: number, y: number, seed: number): number {
  if (body.feature === "solar") {
    return Math.sin(theta * 10 + seed * 5) * 0.65 + Math.sin(y * 18 + seed) * 0.45;
  }
  if (body.feature === "rocky" || body.feature === "dust") {
    return Math.sin(theta * 9 + y * 11) + Math.sin(theta * 23 + seed * 5) * 0.55;
  }
  if (body.feature === "banded" || body.feature === "ringed") {
    return Math.sin(y * 32) * 0.48 + Math.sin(theta * 4 + y * 9) * 0.2;
  }
  return Math.sin(theta * 6 + y * 7 + seed) * 0.42;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
