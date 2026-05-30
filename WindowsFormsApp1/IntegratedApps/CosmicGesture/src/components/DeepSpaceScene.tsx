import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { CatalogEntry, RenderKind } from "../data/catalog";
import type { RuntimeControlsRef } from "../types";
import { SceneEffects } from "./SceneEffects";

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
    // gentle pointer parallax + fixed viewing tilt
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
      {bloomEnabled && <SceneEffects intensity={entry.render === "blackhole" ? 1.35 : 0.95} vignette={0.8} />}
    </>
  );
}

function DeepObject({ entry, scale }: { entry: CatalogEntry; scale: number }) {
  const palette = useMemo(() => entry.palette.map((c) => new Color(c)), [entry.palette]);
  const data = useMemo(() => buildGeometry(entry.render, entry.seed, palette, scale), [entry.render, entry.seed, palette, scale]);

  if (entry.render === "blackhole") {
    return <BlackHole geometry={data.points} accent={entry.accent} />;
  }
  if (entry.render === "constellation") {
    return <Constellation id={entry.id} palette={palette} />;
  }
  return (
    <points geometry={data.points} frustumCulled={false}>
      <pointsMaterial size={data.size} vertexColors transparent opacity={0.92} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function BlackHole({ geometry, accent }: { geometry: BufferGeometry; accent: string }) {
  return (
    <group rotation={[0.5, 0, 0.15]}>
      {/* event horizon shadow */}
      <mesh>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.05, 16, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.95} blending={AdditiveBlending} />
      </mesh>
      {/* accretion disk particles */}
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.05} vertexColors transparent opacity={0.95} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function Constellation({ id, palette }: { id: string; palette: Color[] }) {
  const { stars, links } = constellationPattern(id);
  const SCALE = 5.5;

  const pointsGeo = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const c = palette[0] ?? new Color("#cfe0ff");
    stars.forEach((s, i) => {
      positions[i * 3] = s[0] * SCALE;
      positions[i * 3 + 1] = s[1] * SCALE;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    return makeGeo(positions, colors);
  }, [stars, palette]);

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

// ---------------- geometry generators ----------------
interface DeepGeometry {
  points: BufferGeometry;
  size: number;
}

function buildGeometry(kind: RenderKind, seed: number, palette: Color[], scale: number): DeepGeometry {
  switch (kind) {
    case "galaxySpiral":
      return { points: spiralGalaxy(seed, palette, count(34000, scale)), size: 0.05 };
    case "galaxyElliptical":
      return { points: ellipsoid(seed, palette, count(30000, scale), [5.5, 4, 4.6]), size: 0.05 };
    case "nebula":
      return { points: nebula(seed, palette, count(30000, scale)), size: 0.07 };
    case "blackhole":
      return { points: accretionDisk(seed, palette, count(20000, scale)), size: 0.05 };
    case "star":
      return { points: starGlow(seed, palette, count(26000, scale)), size: 0.06 };
    case "cluster":
      return { points: cluster(seed, palette, count(9000, scale)), size: 0.09 };
    case "rocky":
    default:
      return { points: rockySphere(seed, palette, count(24000, scale)), size: 0.05 };
  }
}

function count(base: number, scale: number): number {
  return Math.max(3000, Math.floor(base * scale));
}

function spiralGalaxy(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const arms = 2;
  for (let i = 0; i < n; i += 1) {
    const bulge = rand() < 0.22;
    let x: number, y: number, z: number;
    let col: Color;
    if (bulge) {
      const r = Math.pow(rand(), 2) * 2.0;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(rand() * 2 - 1);
      x = Math.sin(ph) * Math.cos(th) * r;
      y = Math.cos(ph) * r * 0.7;
      z = Math.sin(ph) * Math.sin(th) * r;
      col = palette[1].clone().lerp(new Color("#fff3c0"), 0.5);
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
    }
    col.multiplyScalar(0.6 + rand() * 0.7);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function ellipsoid(seed: number, palette: Color[], n: number, axes: [number, number, number]): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const r = Math.pow(rand(), 1.6);
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r * axes[0];
    positions[i * 3 + 1] = Math.cos(ph) * r * axes[1];
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * axes[2];
    const col = palette[Math.floor(rand() * palette.length)].clone().lerp(new Color("#fff0d0"), (1 - r) * 0.5);
    col.multiplyScalar(0.5 + rand() * 0.7);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function nebula(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const blobs = Array.from({ length: 5 }, () => ({
    x: (rand() - 0.5) * 7,
    y: (rand() - 0.5) * 5,
    z: (rand() - 0.5) * 6,
    r: 1.6 + rand() * 2.4,
    c: palette[Math.floor(rand() * palette.length)]
  }));
  for (let i = 0; i < n; i += 1) {
    const blob = blobs[Math.floor(rand() * blobs.length)];
    const r = Math.pow(rand(), 1.8) * blob.r;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = blob.x + Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = blob.y + Math.cos(ph) * r;
    positions[i * 3 + 2] = blob.z + Math.sin(ph) * Math.sin(th) * r;
    const col = blob.c.clone().multiplyScalar(0.4 + rand() * 0.8);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function accretionDisk(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
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
    // doppler-ish brightening on +x side
    const beam = 0.55 + Math.max(0, x / radius) * 0.9;
    const col = hot.clone().lerp(cool, lane).multiplyScalar((0.5 + rand() * 0.6) * beam + 0.2);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function starGlow(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const core = palette[0];
  for (let i = 0; i < n; i += 1) {
    const corona = rand() < 0.3;
    const r = corona ? 2.2 + Math.pow(rand(), 2) * 2.4 : Math.pow(rand(), 0.5) * 2.0;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = Math.cos(ph) * r;
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    const col = core.clone().lerp(palette[2] ?? core, corona ? 0.6 : 0.1).multiplyScalar(corona ? 0.4 + rand() * 0.4 : 0.8 + rand() * 0.7);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function cluster(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const r = Math.pow(rand(), 1.4) * 4.5;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    positions[i * 3 + 1] = Math.cos(ph) * r;
    positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    const col = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.7 + rand() * 0.8);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function rockySphere(seed: number, palette: Color[], n: number): BufferGeometry {
  const rand = mulberry32(seed);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
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
    const col = palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(0.55 + rand() * 0.5);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  return makeGeo(positions, colors);
}

function makeGeo(positions: Float32Array, colors: Float32Array): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
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
  // fallback: scattered asterism
  const rand = mulberry32(id.length * 7919);
  const stars: StarPoint[] = Array.from({ length: 7 }, () => [(rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6] as StarPoint);
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
  return { stars, links };
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
