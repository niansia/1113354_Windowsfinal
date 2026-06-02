import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Points, PointsMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import type { RuntimeControlsRef } from "../types";

interface CosmicBackdropProps {
  controlsRef: RuntimeControlsRef;
  density?: number; // 0.3 .. 1
}

// Layered deep-space background shared by every scene: a deep starfield, a tilted
// milky-way band, soft nebula volumes and slowly drifting dust — with gentle
// pointer parallax so the whole cosmos feels alive even when idle.
export function CosmicBackdrop({ controlsRef, density = 1 }: CosmicBackdropProps) {
  const parallaxRef = useRef<Group>(null);
  const dustRef = useRef<Points>(null);
  const bandRef = useRef<Group>(null);
  const brightRef = useRef<Points>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pointer = controlsRef.current.pointer;
    if (parallaxRef.current) {
      const px = pointer.active ? (pointer.x - 0.5) : Math.sin(t * 0.05) * 0.2;
      const py = pointer.active ? (pointer.y - 0.5) : Math.cos(t * 0.04) * 0.2;
      // ease toward target for smoothness
      parallaxRef.current.rotation.y += (px * 0.18 - parallaxRef.current.rotation.y) * 0.04;
      parallaxRef.current.rotation.x += (-py * 0.12 - parallaxRef.current.rotation.x) * 0.04;
    }
    if (dustRef.current) dustRef.current.rotation.y = t * 0.012;
    if (bandRef.current) bandRef.current.rotation.z = t * 0.004;
    // subtle twinkle on the bright-star layer
    if (brightRef.current) {
      const mat = brightRef.current.material as PointsMaterial;
      mat.opacity = 0.75 + Math.sin(t * 2.2) * 0.18;
    }
  });

  const stars = useMemo(() => buildStarField(Math.floor(6800 * density)), [density]);
  const band = useMemo(() => buildGalaxyBand(Math.floor(3600 * density)), [density]);
  const dust = useMemo(() => buildDust(Math.floor(1200 * density)), [density]);
  const bright = useMemo(() => buildBrightStars(Math.floor(180 * density)), [density]);

  return (
    <group ref={parallaxRef}>
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial size={0.05} vertexColors transparent opacity={0.82} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
      </points>

      {/* brighter, twinkling foreground stars (different magnitudes/colours) */}
      <points ref={brightRef} geometry={bright} frustumCulled={false}>
        <pointsMaterial size={0.16} vertexColors transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
      </points>

      <group ref={bandRef} rotation={[0.55, 0.3, 0.2]}>
        <points geometry={band} frustumCulled={false}>
          <pointsMaterial size={0.07} vertexColors transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
        </points>
      </group>

      {/* soft nebula volumes */}
      <mesh position={[-14, -6, -30]} rotation={[0.2, 0.1, -0.2]}>
        <sphereGeometry args={[14, 30, 14]} />
        <meshBasicMaterial color="#1a8bff" transparent opacity={0.03} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[16, 8, -34]} rotation={[0.4, -0.2, 0.4]}>
        <sphereGeometry args={[18, 30, 14]} />
        <meshBasicMaterial color="#c733ff" transparent opacity={0.022} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[4, -12, -26]}>
        <sphereGeometry args={[12, 30, 14]} />
        <meshBasicMaterial color="#23d5c0" transparent opacity={0.018} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      <points ref={dustRef} geometry={dust} frustumCulled={false}>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function buildStarField(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(18181);
  for (let i = 0; i < count; i += 1) {
    const radius = 38 + rand() * 80;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.72;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    const pick = rand();
    const color = new Color(pick > 0.82 ? "#ff7bd8" : pick > 0.6 ? "#ffd9a0" : pick > 0.4 ? "#8dfff8" : "#d7e8ff");
    color.multiplyScalar(0.35 + rand() * 0.85);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return makeGeometry(positions, colors);
}

function buildBrightStars(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(424242);
  // star colours by temperature: blue-white, white, yellow, orange, red
  const palette = ["#cfe0ff", "#ffffff", "#fff3c0", "#ffd9a0", "#ff9a6a"];
  for (let i = 0; i < count; i += 1) {
    const radius = 40 + rand() * 78;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.72;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    const color = new Color(palette[Math.floor(rand() * palette.length)]);
    color.multiplyScalar(0.7 + rand() * 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return makeGeometry(positions, colors);
}

function buildGalaxyBand(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(573913);
  for (let i = 0; i < count; i += 1) {
    const radius = 40 + rand() * 70;
    const theta = rand() * Math.PI * 2;
    const thickness = (rand() - 0.5) * 14 * Math.pow(rand(), 1.5);
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = thickness;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
    const color = new Color(rand() > 0.7 ? "#9fd0ff" : rand() > 0.4 ? "#ffe0c0" : "#e7f1ff");
    color.multiplyScalar(0.3 + rand() * 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return makeGeometry(positions, colors);
}

function buildDust(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(99221);
  for (let i = 0; i < count; i += 1) {
    const radius = 14 + rand() * 26;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.5;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    const color = new Color(rand() > 0.5 ? "#6fd9ff" : "#b79dff");
    color.multiplyScalar(0.2 + rand() * 0.4);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return makeGeometry(positions, colors);
}

function makeGeometry(positions: Float32Array, colors: Float32Array): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
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
