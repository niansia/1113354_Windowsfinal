import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, ShaderMaterial } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { CatalogEntry, NebulaKind, RenderKind } from "../data/catalog";
import type { RuntimeControlsRef } from "../types";
import { SceneEffects } from "./SceneEffects";
import { fbm3, mulberry32, ridgedFbm3, valueNoise3 } from "../utils/noise";
import deepVertex from "../shaders/deepVertex.glsl?raw";
import deepFragment from "../shaders/deepFragment.glsl?raw";

interface DeepSpaceSceneProps {
  entry: CatalogEntry;
  particleScale: number;
  controlsRef: RuntimeControlsRef;
  bloomEnabled: boolean;
}

// Procedurally renders any non-solar catalog object (galaxy, nebula, black hole,
// star, constellation, cluster, dwarf planet, moon) as a distinct particle visual.
export function DeepSpaceScene({ entry, particleScale, controlsRef, bloomEnabled }: DeepSpaceSceneProps) {
  const spinRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!spinRef.current) return;
    const t = clock.elapsedTime;
    const spin = entry.render === "blackhole" ? 0.18 : entry.render === "constellation" ? 0.0 : 0.05;
    spinRef.current.rotation.y = t * spin;
    const p = controlsRef.current.pointer;
    const tx = p.active ? (p.x - 0.5) * 0.3 : 0;
    const ty = p.active ? (p.y - 0.5) * 0.2 : 0;
    const baseTilt = entry.render === "constellation" ? 0 : 0.3;
    spinRef.current.rotation.z += (tx * 0.1 - spinRef.current.rotation.z) * 0.04;
    spinRef.current.rotation.x += (baseTilt + ty * 0.1 - spinRef.current.rotation.x) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.32} />
      <pointLight position={[0, 0, 0]} intensity={3.2} color={entry.accent} distance={50} />
      <DeepCameraRig controlsRef={controlsRef} />
      <group ref={spinRef}>
        <DeepObject entry={entry} scale={particleScale} />
      </group>
      {bloomEnabled && <SceneEffects intensity={entry.render === "blackhole" ? 1.35 : 1.05} vignette={0.82} />}
    </>
  );
}

// Pure dispatcher — no hooks here, so each leaf owns its own memoised geometry
// and the Rules of Hooks are never violated across render-kind switches.
function DeepObject({ entry, scale }: { entry: CatalogEntry; scale: number }) {
  if (entry.render === "blackhole") return <BlackHole entry={entry} scale={scale} />;
  if (entry.render === "constellation") return <Constellation id={entry.id} color={entry.palette[0]} />;
  if (entry.render === "nebula") return <NebulaObject entry={entry} scale={scale} />;
  return <GenericCloud entry={entry} scale={scale} />;
}

function GenericCloud({ entry, scale }: { entry: CatalogEntry; scale: number }) {
  const palette = useMemo(() => entry.palette.map((c) => new Color(c)), [entry.palette]);
  const cloud = useMemo(() => buildDeep(entry.render, entry.seed, palette, scale), [entry.render, entry.seed, palette, scale]);
  const mat = MATERIAL[entry.render] ?? MATERIAL.cluster;
  return <DeepCloud data={cloud} softness={mat.softness} drift={mat.drift} twinkle={mat.twinkle} />;
}

// ---------------- Nebula: gas cloud + embedded star cluster ----------------
function NebulaObject({ entry, scale }: { entry: CatalogEntry; scale: number }) {
  const palette = useMemo(() => entry.palette.map((c) => new Color(c)), [entry.palette]);
  const kind = nebulaKindOf(entry);
  const built = useMemo(() => buildNebula(kind, entry.seed, palette, scale), [kind, entry.seed, palette, scale]);
  return (
    <group>
      <DeepCloud data={built.gas} softness={0.96} drift={kind === "snr" || kind === "dark" ? 0.35 : 0.7} twinkle={0.1} />
      {built.stars.count > 0 && <DeepCloud data={built.stars} softness={0.18} drift={0.0} twinkle={0.85} />}
    </group>
  );
}

function nebulaKindOf(entry: CatalogEntry): NebulaKind {
  if (entry.nebulaKind) return entry.nebulaKind;
  const hay = `${entry.subtype} ${entry.tags.join(" ")} ${entry.englishName}`.toLowerCase();
  const cn = entry.subtype + entry.tags.join("");
  if (cn.includes("行星狀") || hay.includes("planetary")) return "planetary";
  if (cn.includes("超新星殘骸") || hay.includes("supernova") || hay.includes("remnant")) return "snr";
  if (cn.includes("暗星雲") || hay.includes("dark")) return "dark";
  if (cn.includes("反射") || hay.includes("reflection")) return "reflection";
  return "emission";
}

// ---------------- Soft particle cloud (shared by all deep objects) ----------------
interface DeepCloudData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  seeds: Float32Array;
  count: number;
}

const MATERIAL: Record<RenderKind, { softness: number; drift: number; twinkle: number }> = {
  solar: { softness: 0.4, drift: 0, twinkle: 0.3 },
  galaxySpiral: { softness: 0.62, drift: 0.12, twinkle: 0.55 },
  galaxyElliptical: { softness: 0.7, drift: 0.1, twinkle: 0.45 },
  nebula: { softness: 0.96, drift: 0.7, twinkle: 0.15 },
  blackhole: { softness: 0.45, drift: 0.18, twinkle: 0.4 },
  star: { softness: 0.74, drift: 0.22, twinkle: 0.5 },
  constellation: { softness: 0.3, drift: 0, twinkle: 0.7 },
  cluster: { softness: 0.4, drift: 0.05, twinkle: 0.8 },
  rocky: { softness: 0.35, drift: 0, twinkle: 0.3 }
};

function DeepCloud({
  data,
  softness,
  drift,
  twinkle
}: {
  data: DeepCloudData;
  softness: number;
  drift: number;
  twinkle: number;
}) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(data.positions, 3));
    geo.setAttribute("aColor", new BufferAttribute(data.colors, 3));
    geo.setAttribute("aSize", new BufferAttribute(data.sizes, 1));
    geo.setAttribute("aAlpha", new BufferAttribute(data.alphas, 1));
    geo.setAttribute("aSeed", new BufferAttribute(data.seeds, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: deepVertex,
        fragmentShader: deepFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uDrift: { value: drift },
          uTwinkle: { value: twinkle },
          uScale: { value: 1 },
          uSoftness: { value: softness }
        }
      }),
    [drift, twinkle, softness]
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function BlackHole({ entry, scale }: { entry: CatalogEntry; scale: number }) {
  const palette = useMemo(() => entry.palette.map((c) => new Color(c)), [entry.palette]);
  const data = useMemo(() => accretionDisk(entry.seed, palette, count(22000, scale)), [entry.seed, palette, scale]);
  return (
    <group rotation={[0.5, 0, 0.15]}>
      <mesh>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.05, 16, 96]} />
        <meshBasicMaterial color={entry.accent} transparent opacity={0.95} blending={AdditiveBlending} />
      </mesh>
      <DeepCloud data={data} softness={MATERIAL.blackhole.softness} drift={MATERIAL.blackhole.drift} twinkle={MATERIAL.blackhole.twinkle} />
    </group>
  );
}

function Constellation({ id, color }: { id: string; color: string }) {
  const { stars, links } = constellationPattern(id);
  const SCALE = 5.5;

  const pointsGeo = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const c = new Color(color ?? "#cfe0ff");
    stars.forEach((s, i) => {
      positions[i * 3] = s[0] * SCALE;
      positions[i * 3 + 1] = s[1] * SCALE;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
  }, [stars, color]);

  const lineGeo = useMemo(() => {
    const positions = new Float32Array(links.length * 2 * 3);
    links.forEach((pair, i) => {
      const a = stars[pair[0]];
      const b = stars[pair[1]];
      positions[i * 6] = a[0] * SCALE;
      positions[i * 6 + 1] = a[1] * SCALE;
      positions[i * 6 + 2] = 0;
      positions[i * 6 + 3] = b[0] * SCALE;
      positions[i * 6 + 4] = b[1] * SCALE;
      positions[i * 6 + 5] = 0;
    });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    return geo;
  }, [stars, links]);

  return (
    <group>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#7ffbf1" transparent opacity={0.45} blending={AdditiveBlending} />
      </lineSegments>
      <points geometry={pointsGeo} frustumCulled={false}>
        <pointsMaterial size={0.34} vertexColors transparent opacity={1} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function DeepCameraRig({ controlsRef }: { controlsRef: RuntimeControlsRef }) {
  const { camera } = useThree();
  const azimuth = useRef(-0.6);
  const azVel = useRef(0.004);
  const elevation = useRef(0.18);
  const elVel = useRef(0);
  const zoom = useRef(0);

  useFrame((_, delta) => {
    const c = controlsRef.current;
    azVel.current += c.orbitImpulse;
    elVel.current += c.elevationImpulse;
    zoom.current += c.zoomImpulse;
    c.orbitImpulse *= 0.24;
    c.elevationImpulse *= 0.18;
    c.zoomImpulse = 0;
    azVel.current *= 0.95;
    elVel.current *= 0.88;
    azimuth.current += azVel.current * delta * 60;
    elevation.current = clamp(elevation.current + elVel.current * delta * 60, -0.7, 0.8);
    zoom.current = clamp(zoom.current, -6, 6);

    const distance = 15 - zoom.current;
    const x = Math.cos(azimuth.current) * Math.cos(elevation.current) * distance;
    const y = Math.sin(elevation.current) * distance + 1.2;
    const z = Math.sin(azimuth.current) * Math.cos(elevation.current) * distance;
    camera.position.lerp({ x, y, z } as any, 0.06);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

// ================= geometry generators =================
function count(base: number, scale: number): number {
  return Math.max(3000, Math.floor(base * scale));
}

function emptyCloud(): DeepCloudData {
  return { positions: new Float32Array(0), colors: new Float32Array(0), sizes: new Float32Array(0), alphas: new Float32Array(0), seeds: new Float32Array(0), count: 0 };
}

function buildDeep(kind: RenderKind, seed: number, palette: Color[], scale: number): DeepCloudData {
  switch (kind) {
    case "galaxySpiral":
      return spiralGalaxy(seed, palette, count(36000, scale));
    case "galaxyElliptical":
      return ellipsoid(seed, palette, count(30000, scale), [5.5, 4, 4.6]);
    case "star":
      return starGlow(seed, palette, count(26000, scale));
    case "cluster":
      return cluster(seed, palette, count(11000, scale));
    case "rocky":
    default:
      return rockySphere(seed, palette, count(22000, scale));
  }
}

// ---- Nebula: volumetric fBm filaments + dust lanes + embedded cluster ----
interface NebulaBuild {
  gas: DeepCloudData;
  stars: DeepCloudData;
}

function buildNebula(kind: NebulaKind, seed: number, palette: Color[], scale: number): NebulaBuild {
  switch (kind) {
    case "planetary":
      return planetaryNebula(seed, palette, scale);
    case "snr":
      return supernovaRemnant(seed, palette, scale);
    case "dark":
      return darkNebula(seed, palette, scale);
    case "reflection":
      return reflectionNebula(seed, palette, scale);
    case "emission":
    default:
      return emissionNebula(seed, palette, scale);
  }
}

// Hot H-II emission cloud (like the Rosette / Carina look in the reference): a
// turbulent volume populated by REJECTION SAMPLING on a 3D noise field, so
// particles cling to bright filaments and leave dark cavities + dust lanes,
// rather than collapsing into a central ball. Predominantly H-alpha red/orange
// with warm-white knots where young stars ionise the gas.
function emissionNebula(seed: number, palette: Color[], scale: number): NebulaBuild {
  const n = count(30000, scale);
  const rand = mulberry32(seed);
  const px: number[] = [];
  const cl: number[] = [];
  const sz: number[] = [];
  const al: number[] = [];
  const sd: number[] = [];

  // Warm emission palette: red H-alpha body, warm-orange mids, a cool accent.
  const ember = new Color("#ff3b24");
  const warm = (palette[1] ?? new Color("#ffae5a")).clone().lerp(new Color("#ff7a3a"), 0.45);
  const accent = palette[0] ?? new Color("#5ad6ff");
  const hotKnot = new Color("#ffe6cf");

  const ext: [number, number, number] = [5.2, 4.0, 4.4];
  // 2-4 bright ionising knots (where the embedded cluster sits).
  const coreCount = 2 + Math.floor(rand() * 3);
  const cores = Array.from({ length: coreCount }, () => ({
    x: (rand() - 0.5) * ext[0] * 0.85,
    y: (rand() - 0.5) * ext[1] * 0.7,
    z: (rand() - 0.5) * ext[2] * 0.85,
    r: 0.9 + rand() * 1.3
  }));
  const dustOff = rand() * 50;
  const warpOff = rand() * 30;

  let made = 0;
  let guard = 0;
  const cap = n * 7;
  while (made < n && guard < cap) {
    guard += 1;
    // near-uniform volume sample (mild centre bias) so structure fills the cloud
    const g = Math.pow(rand(), 0.42);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    const sp = Math.sin(ph);
    let x = sp * Math.cos(th) * g * ext[0];
    let y = Math.cos(ph) * g * ext[1];
    let z = sp * Math.sin(th) * g * ext[2];
    // domain warp -> swirling, organic shapes instead of round blobs
    const wx = valueNoise3(x * 0.3 + warpOff, y * 0.3, z * 0.3, seed + 3) - 0.5;
    const wy = valueNoise3(x * 0.3, y * 0.3 + warpOff, z * 0.3, seed + 9) - 0.5;
    x += wx * 1.8;
    z += wy * 1.8;

    const filament = ridgedFbm3(x * 0.5, y * 0.5, z * 0.5, seed, 5);
    const blob = fbm3(x * 0.3 + 10, y * 0.3, z * 0.3, seed + 7, 4);
    let coreBoost = 0;
    for (const c of cores) {
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      coreBoost = Math.max(coreBoost, Math.exp(-(dx * dx + dy * dy + dz * dz) / (c.r * c.r)));
    }
    const dust = fbm3(x * 0.55 + dustOff, y * 0.55, z * 0.55 - dustOff, seed + 31, 4);
    const darkLane = smoothstep(0.5, 0.72, dust);
    // overall density: filaments + soft blobs + ionised knots, minus dust voids
    let d = (filament * 0.62 + blob * 0.45 + coreBoost * 0.8) * (1 - darkLane * 0.9);
    d *= 1 - Math.pow(g, 3) * 0.25; // gently fade the very outer edge

    // Rejection: keep particles in proportion to local density -> cavities form.
    if (rand() > Math.pow(clamp(d, 0, 1), 1.25) + 0.015) continue;

    px.push(x, y, z);
    // Colour: red body -> warm orange -> warm-white ionised knots; faint cool wisps.
    const col = ember.clone().lerp(warm, clamp(d * 1.1, 0, 1));
    if (coreBoost > 0.25) col.lerp(hotKnot, Math.min(0.85, coreBoost));
    else if (filament > 0.7 && d > 0.55) col.lerp(accent, 0.18);
    col.multiplyScalar(0.45 + d * 0.95);
    cl.push(col.r, col.g, col.b);
    sz.push(3.6 + d * 7.5 + (coreBoost > 0.5 ? 3.0 : 0));
    al.push(clamp(0.08 + d * 0.6, 0.04, 0.72));
    sd.push(rand());
    made += 1;
  }

  // A modest embedded cluster — present but not overpowering the gas.
  const stars = embeddedCluster(seed + 991, cores, 30 + Math.floor(scale * 30), 0.6, "#dbe6ff", 3.2);
  return {
    gas: { positions: new Float32Array(px), colors: new Float32Array(cl), sizes: new Float32Array(sz), alphas: new Float32Array(al), seeds: new Float32Array(sd), count: made },
    stars
  };
}

// Planetary nebula: an expanding, slightly bipolar gas shell lit from a central
// white-dwarf, with filamentary structure on the shell (Ring / Helix look).
function planetaryNebula(seed: number, palette: Color[], scale: number): NebulaBuild {
  const n = count(24000, scale);
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);

  const inner = palette[0] ?? new Color("#7bdfff");
  const ringCol = palette[1] ?? new Color("#9bff9b");
  const outer = palette[2] ?? new Color("#ff9a5a");
  const baseR = 2.7;

  for (let i = 0; i < n; i += 1) {
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    let dir = { x: Math.sin(ph) * Math.cos(th), y: Math.cos(ph), z: Math.sin(ph) * Math.sin(th) };
    // bipolar squeeze (flatten equator slightly, stretch poles)
    const bipolar = 1 + Math.abs(dir.y) * 0.5;
    const shell = 0.78 + Math.pow(rand(), 2) * 0.5; // most mass in the shell
    const wobble = ridgedFbm3(dir.x * 2.4, dir.y * 2.4, dir.z * 2.4, seed, 4);
    const r = baseR * shell * bipolar * (0.85 + wobble * 0.35);
    const x = dir.x * r;
    const y = dir.y * r;
    const z = dir.z * r;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const rNorm = clamp((r / (baseR * 1.6)), 0, 1);
    const col = inner.clone().lerp(ringCol, rNorm).lerp(outer, Math.max(0, rNorm - 0.55) * 1.5);
    const bright = 0.6 + wobble * 0.85;
    col.multiplyScalar(bright);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 2.8 + wobble * 4.2;
    alphas[i] = clamp(0.1 + wobble * 0.5, 0.04, 0.62);
    seeds[i] = rand();
  }

  // central star + faint inner glow
  const stars = embeddedCluster(seed + 7, [{ x: 0, y: 0, z: 0, r: 0.5 }], 1, 1.0, "#eaf4ff", 9);
  return { gas: { positions, colors, sizes, alphas, seeds, count: n }, stars };
}

// Supernova remnant: thin, highly filamentary expanding shell (Veil / Crab),
// two-tone O-III cyan + H-alpha red wisps, no bright core.
function supernovaRemnant(seed: number, palette: Color[], scale: number): NebulaBuild {
  const n = count(26000, scale);
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);

  const oiii = palette[0] ?? new Color("#7bdfff");
  const halpha = palette[2] ?? new Color("#ff7b9a");
  const baseR = 3.2;

  for (let i = 0; i < n; i += 1) {
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    const dir = { x: Math.sin(ph) * Math.cos(th), y: Math.cos(ph), z: Math.sin(ph) * Math.sin(th) };
    const fil = ridgedFbm3(dir.x * 3.4, dir.y * 3.4, dir.z * 3.4, seed, 5);
    const fil2 = ridgedFbm3(dir.x * 6.2 + 9, dir.y * 6.2, dir.z * 6.2, seed + 5, 3);
    const strength = fil * 0.7 + fil2 * 0.5;
    // particles cling to a thin shell, biased onto bright filaments
    const shellJitter = (rand() - 0.5) * 0.5 * (1.1 - strength);
    const r = baseR * (1 + shellJitter * 0.18);
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;

    const col = (strength > 0.62 ? oiii.clone() : halpha.clone()).lerp(new Color("#ffffff"), Math.max(0, strength - 0.8));
    col.multiplyScalar(0.3 + strength * 1.1);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 1.8 + strength * 2.4;
    alphas[i] = clamp(0.03 + Math.pow(strength, 1.6) * 0.5, 0.02, 0.55);
    seeds[i] = rand();
  }
  return { gas: { positions, colors, sizes, alphas, seeds, count: n }, stars: emptyCloud() };
}

// Dark nebula: a red background emission sheet with a dust silhouette carved out
// of it (Horsehead look) — additive can't subtract light, so we drop glow where
// the dust shape sits, leaving a dark cut-out, plus a few foreground stars.
function darkNebula(seed: number, palette: Color[], scale: number): NebulaBuild {
  const target = count(26000, scale);
  const rand = mulberry32(seed);
  const px: number[] = [];
  const cl: number[] = [];
  const sz: number[] = [];
  const al: number[] = [];
  const sd: number[] = [];

  const glow = palette[0] ?? new Color("#ff5a7b");
  const deep = palette[1] ?? new Color("#6a3a8a");
  const ext: [number, number, number] = [4.8, 4.2, 3.2];
  const dustOff = rand() * 40;

  let made = 0;
  let guard = 0;
  while (made < target && guard < target * 5) {
    guard += 1;
    const g = Math.pow(rand(), 0.5);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    const x = Math.sin(ph) * Math.cos(th) * g * ext[0];
    const y = Math.cos(ph) * g * ext[1];
    const z = Math.sin(ph) * Math.sin(th) * g * ext[2];
    const glowField = fbm3(x * 0.42, y * 0.42, z * 0.42, seed, 4);
    // dust silhouette: a vertical-ish lobe of opaque dust in the foreground
    const dust = fbm3(x * 0.7 + dustOff, y * 0.5 - 1.2, z * 0.7, seed + 17, 4) + Math.max(0, 0.6 - Math.abs(x + 0.4) * 0.5);
    const obscured = smoothstep(0.62, 0.92, dust);
    const density = glowField * (1 - obscured);
    if (rand() > density * 1.3) continue;

    px.push(x, y, z);
    const radial = clamp(Math.hypot(x, y, z) / ext[0], 0, 1);
    const col = glow.clone().lerp(deep, radial * 0.7).multiplyScalar(0.4 + density * 0.9);
    cl.push(col.r, col.g, col.b);
    sz.push(2.2 + density * 3.6);
    al.push(clamp(0.05 + density * 0.45, 0.02, 0.5));
    sd.push(rand());
    made += 1;
  }

  const stars = embeddedCluster(seed + 13, [{ x: 1.6, y: 1.2, z: 0.5, r: 0.6 }], 26, 0.5, "#cfe0ff", 7);
  return {
    gas: { positions: new Float32Array(px), colors: new Float32Array(cl), sizes: new Float32Array(sz), alphas: new Float32Array(al), seeds: new Float32Array(sd), count: made },
    stars
  };
}

// Reflection nebula: cool blue diffuse haze scattered around 1-2 bright stars.
function reflectionNebula(seed: number, palette: Color[], scale: number): NebulaBuild {
  const n = count(24000, scale);
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);

  const blue = palette[0] ?? new Color("#9ec2ff");
  const pale = new Color("#dfe9ff");
  const lamps = [
    { x: -1.3, y: 0.4, z: 0.2 },
    { x: 1.7, y: -0.6, z: -0.4 }
  ];

  for (let i = 0; i < n; i += 1) {
    const lamp = lamps[Math.floor(rand() * lamps.length)];
    const g = Math.pow(rand(), 1.6) * 3.2;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    const x = lamp.x + Math.sin(ph) * Math.cos(th) * g;
    const y = lamp.y + Math.cos(ph) * g * 0.8;
    const z = lamp.z + Math.sin(ph) * Math.sin(th) * g;
    const haze = fbm3(x * 0.5, y * 0.5, z * 0.5, seed, 4);
    const dist = Math.hypot(x - lamp.x, y - lamp.y, z - lamp.z);
    const lit = Math.exp(-dist * 0.6);
    const density = haze * lit;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const col = pale.clone().lerp(blue, 0.6).multiplyScalar(0.3 + density * 1.2);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 2.4 + density * 3.0;
    alphas[i] = clamp(0.04 + density * 0.4, 0.02, 0.42);
    seeds[i] = rand();
  }
  const stars = embeddedCluster(seed + 5, lamps.map((l) => ({ ...l, r: 0.5 })), 6, 1.0, "#eaf2ff", 8);
  return { gas: { positions, colors, sizes, alphas, seeds, count: n }, stars };
}

// A tight knot of bright young stars near the nebula's dense cores.
function embeddedCluster(
  seed: number,
  cores: { x: number; y: number; z: number; r: number }[],
  k: number,
  spread: number,
  tint = "#dce6ff",
  size = 6
): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(k * 3);
  const colors = new Float32Array(k * 3);
  const sizes = new Float32Array(k);
  const alphas = new Float32Array(k);
  const seeds = new Float32Array(k);
  const hot = new Color(tint);
  const blue = new Color("#bcd4ff");
  for (let i = 0; i < k; i += 1) {
    const c = cores[Math.floor(rand() * cores.length)];
    positions[i * 3] = c.x + (rand() - 0.5) * spread;
    positions[i * 3 + 1] = c.y + (rand() - 0.5) * spread;
    positions[i * 3 + 2] = c.z + (rand() - 0.5) * spread;
    const col = hot.clone().lerp(blue, rand() * 0.6).multiplyScalar(0.9 + rand() * 0.6);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = size * (0.6 + rand() * 0.9);
    alphas[i] = 0.85 + rand() * 0.15;
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: k };
}

function spiralGalaxy(seed: number, palette: Color[], n: number): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  const arms = 2;
  for (let i = 0; i < n; i += 1) {
    const bulge = rand() < 0.22;
    let x: number, y: number, z: number;
    let col: Color;
    let bright: number;
    if (bulge) {
      const r = Math.pow(rand(), 2) * 2.0;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(rand() * 2 - 1);
      x = Math.sin(ph) * Math.cos(th) * r;
      y = Math.cos(ph) * r * 0.7;
      z = Math.sin(ph) * Math.sin(th) * r;
      col = (palette[1] ?? palette[0]).clone().lerp(new Color("#fff3c0"), 0.5);
      bright = 0.8;
    } else {
      const arm = Math.floor(rand() * arms);
      const dist = Math.pow(rand(), 0.7) * 6.5 + 0.6;
      const spin = dist * 0.65 + arm * ((Math.PI * 2) / arms);
      const spread = (rand() - 0.5) * (0.6 + dist * 0.08);
      const th = spin + spread;
      x = Math.cos(th) * dist;
      z = Math.sin(th) * dist;
      y = (rand() - 0.5) * (0.5 + Math.max(0, 1.4 - dist * 0.12));
      const edge = dist / 7;
      col = palette[0].clone().lerp(palette[2] ?? palette[0], edge);
      // dust lanes + brighter HII knots along arms
      const knot = ridgedFbm3(x * 0.6, y * 0.6, z * 0.6, seed, 3);
      bright = 0.4 + knot * 0.8;
      if (knot > 0.75) col.lerp(new Color("#ff7bd0"), 0.4);
    }
    col.multiplyScalar(0.55 + rand() * 0.6);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 1.7 + bright * 1.8;
    alphas[i] = clamp(0.12 + bright * 0.4, 0.05, 0.6);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

function ellipsoid(seed: number, palette: Color[], n: number, axes: [number, number, number]): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = Math.pow(rand(), 1.6);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r * axes[0];
    positions[i * 3 + 1] = Math.cos(ph) * r * axes[1];
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * axes[2];
    const col = palette[Math.floor(rand() * palette.length)].clone().lerp(new Color("#fff0d0"), (1 - r) * 0.5);
    const bright = 0.45 + (1 - r) * 0.6;
    col.multiplyScalar(0.4 + rand() * 0.6 + (1 - r) * 0.3);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 1.7 + bright * 1.6;
    alphas[i] = clamp(0.1 + bright * 0.35, 0.05, 0.55);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

function accretionDisk(seed: number, palette: Color[], n: number): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  const hot = palette[0];
  const cool = palette[2] ?? palette[1];
  for (let i = 0; i < n; i += 1) {
    const lane = Math.pow(rand(), 0.7);
    const radius = 1.45 + lane * 3.2;
    const th = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * (0.05 + lane * 0.18);
    const x = Math.cos(th) * radius;
    const z = Math.sin(th) * radius;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const beam = 0.55 + Math.max(0, x / radius) * 0.9;
    const col = hot.clone().lerp(cool, lane).multiplyScalar((0.5 + rand() * 0.6) * beam + 0.2);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 1.8 + beam * 1.6;
    alphas[i] = clamp(0.1 + beam * 0.4, 0.05, 0.6);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

function starGlow(seed: number, palette: Color[], n: number): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  const core = palette[0];
  for (let i = 0; i < n; i += 1) {
    const corona = rand() < 0.3;
    const r = corona ? 2.2 + Math.pow(rand(), 2) * 2.4 : Math.pow(rand(), 0.5) * 2.0;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = Math.cos(ph) * r;
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    const col = core.clone().lerp(palette[2] ?? core, corona ? 0.6 : 0.1).multiplyScalar(corona ? 0.4 + rand() * 0.4 : 0.9 + rand() * 0.7);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = corona ? 1.8 + rand() * 1.6 : 2.4 + rand() * 2.2;
    alphas[i] = corona ? clamp(0.06 + rand() * 0.18, 0.03, 0.3) : clamp(0.25 + rand() * 0.4, 0.1, 0.7);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

function cluster(seed: number, palette: Color[], n: number): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = Math.pow(rand(), 1.6) * 4.5;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = Math.cos(ph) * r;
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    const col = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.8 + rand() * 0.7);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    // bright crisp stars near centre, fewer toward the halo
    sizes[i] = 2.6 + Math.pow(1 - r / 4.5, 2) * 2.2 + rand() * 0.8;
    alphas[i] = clamp(0.3 + rand() * 0.5, 0.12, 0.85);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

function rockySphere(seed: number, palette: Color[], n: number): DeepCloudData {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const alphas = new Float32Array(n);
  const seeds = new Float32Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * golden;
    const bump = 1 + (Math.sin(th * 9 + y * 11) + Math.sin(th * 23 + seed)) * 0.02;
    const rad = 2.1 * bump;
    positions[i * 3] = Math.cos(th) * r * rad;
    positions[i * 3 + 1] = y * rad;
    positions[i * 3 + 2] = Math.sin(th) * r * rad;
    const col = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.6 + rand() * 0.5);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 2.0 + rand() * 1.0;
    alphas[i] = clamp(0.4 + rand() * 0.4, 0.2, 0.9);
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds, count: n };
}

type StarPoint = [number, number];
function constellationPattern(id: string): { stars: StarPoint[]; links: [number, number][] } {
  if (id === "orion") {
    return {
      stars: [[0.6, 0.7], [-0.55, 0.7], [0.25, 0.0], [0.0, 0.05], [-0.25, 0.1], [0.45, -0.8], [-0.5, -0.8], [0.05, 1.0]],
      links: [[2, 3], [3, 4], [0, 1], [0, 2], [1, 4], [2, 5], [4, 6], [7, 0], [7, 1]]
    };
  }
  if (id === "ursa-major") {
    return {
      stars: [[-0.9, 0.5], [-0.9, 0.1], [-0.45, -0.05], [-0.25, 0.15], [0.05, 0.2], [0.45, 0.25], [0.85, 0.15]],
      links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]
    };
  }
  if (id === "scorpius") {
    return {
      stars: [[0.0, 0.0], [-0.3, 0.6], [-0.15, 0.5], [-0.45, 0.55], [0.2, -0.2], [0.25, -0.45], [0.2, -0.65], [0.0, -0.8], [-0.2, -0.85], [-0.45, -0.8], [-0.6, -0.6], [-0.55, -0.4], [-0.4, -0.3]],
      links: [[3, 2], [2, 1], [1, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12]]
    };
  }
  const rand = mulberry32(id.length * 7919);
  const stars: StarPoint[] = Array.from({ length: 7 }, () => [(rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6] as StarPoint);
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
  return { stars, links };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
