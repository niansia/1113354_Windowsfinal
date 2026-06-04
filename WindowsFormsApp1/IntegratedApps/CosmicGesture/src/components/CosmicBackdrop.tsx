import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, ShaderMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import type { RuntimeControlsRef } from "../types";
import { fbm3, mulberry32 } from "../utils/noise";
import deepVertex from "../shaders/deepVertex.glsl?raw";
import deepFragment from "../shaders/deepFragment.glsl?raw";

interface CosmicBackdropProps {
  controlsRef: RuntimeControlsRef;
  density?: number; // 0.3 .. 1
  nebulaDim?: number; // 0..1 multiplier on the big soft nebula volumes (dimmed in star-map mode)
}

interface StarData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  seeds: Float32Array;
}

// Realistic deep-space backdrop: a dense multi-magnitude starfield (coloured by
// stellar temperature, twinkling), a structured Milky Way band with dust lanes,
// and a few faint nebula volumes — with gentle pointer parallax so the whole sky
// feels alive even when idle.
export function CosmicBackdrop({ controlsRef, density = 1, nebulaDim = 1 }: CosmicBackdropProps) {
  const parallaxRef = useRef<Group>(null);
  const bandRef = useRef<Group>(null);

  const starMat = useMemo(() => makeMaterial(0.42, 0.72, 0), []);
  const bandMat = useMemo(() => makeMaterial(0.82, 0.18, 0), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    starMat.uniforms.uTime.value = t;
    bandMat.uniforms.uTime.value = t;
    const pointer = controlsRef.current.pointer;
    if (parallaxRef.current) {
      const px = pointer.active ? pointer.x - 0.5 : Math.sin(t * 0.05) * 0.2;
      const py = pointer.active ? pointer.y - 0.5 : Math.cos(t * 0.04) * 0.2;
      parallaxRef.current.rotation.y += (px * 0.16 - parallaxRef.current.rotation.y) * 0.04;
      parallaxRef.current.rotation.x += (-py * 0.1 - parallaxRef.current.rotation.x) * 0.04;
    }
    if (bandRef.current) bandRef.current.rotation.z = t * 0.004;
  });

  const stars = useMemo(() => geo(buildStarField(Math.floor(30000 * density))), [density]);
  const band = useMemo(() => geo(buildMilkyWay(Math.floor(14000 * density))), [density]);

  return (
    <group ref={parallaxRef}>
      <points geometry={stars} material={starMat} frustumCulled={false} />

      <group ref={bandRef} rotation={[0.5, 0.25, 0.18]}>
        <points geometry={band} material={bandMat} frustumCulled={false} />
      </group>

      {/* faint nebula volumes (dimmed in star-map mode so they don't dominate) */}
      <mesh position={[-26, -10, -56]} rotation={[0.2, 0.1, -0.2]}>
        <sphereGeometry args={[24, 30, 14]} />
        <meshBasicMaterial color="#1a6bff" transparent opacity={0.03 * nebulaDim} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[30, 14, -62]} rotation={[0.4, -0.2, 0.4]}>
        <sphereGeometry args={[30, 30, 14]} />
        <meshBasicMaterial color="#a23bff" transparent opacity={0.024 * nebulaDim} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[8, -22, -48]}>
        <sphereGeometry args={[20, 30, 14]} />
        <meshBasicMaterial color="#1fc3b0" transparent opacity={0.02 * nebulaDim} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function makeMaterial(softness: number, twinkle: number, drift: number): ShaderMaterial {
  return new ShaderMaterial({
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
  });
}

function geo(data: StarData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(data.positions, 3));
  g.setAttribute("aColor", new BufferAttribute(data.colors, 3));
  g.setAttribute("aSize", new BufferAttribute(data.sizes, 1));
  g.setAttribute("aAlpha", new BufferAttribute(data.alphas, 1));
  g.setAttribute("aSeed", new BufferAttribute(data.seeds, 1));
  g.computeBoundingSphere();
  return g;
}

// Stellar-temperature colours, weighted toward the white/blue-white stars that
// dominate a real night sky, with a sprinkling of yellow / orange / red giants.
function starColor(rand: () => number, c: Color): void {
  const pick = rand();
  if (pick < 0.5) c.set("#eaf1ff");        // white / blue-white (most common visible)
  else if (pick < 0.66) c.set("#cfe0ff");  // blue
  else if (pick < 0.82) c.set("#fff4d8");  // yellow-white
  else if (pick < 0.93) c.set("#ffd9a0");  // orange
  else c.set("#ff9a6a");                    // red giant
}

function buildStarField(count: number): StarData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const seeds = new Float32Array(count);
  const rand = mulberry32(18181);
  const c = new Color();
  for (let i = 0; i < count; i += 1) {
    const radius = 64 + rand() * 76;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    const sp = Math.sin(phi);
    positions[i * 3] = sp * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = sp * Math.sin(theta) * radius;

    // magnitude: most stars faint, a few bright (power skew)
    const bright = Math.pow(rand(), 3.0);
    starColor(rand, c);
    c.multiplyScalar(0.55 + bright * 0.85);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = 1.4 + bright * 7.0;
    alphas[i] = 0.32 + bright * 0.68;
    seeds[i] = rand();
  }
  return { positions, colors, sizes, alphas, seeds };
}

// The Milky Way: a dense band of faint stars + glowing gas concentrated near a
// great circle, clumped by fBm and broken up by dark dust lanes.
function buildMilkyWay(count: number): StarData {
  const px: number[] = [];
  const cl: number[] = [];
  const sz: number[] = [];
  const al: number[] = [];
  const sd: number[] = [];
  const rand = mulberry32(573913);
  const c = new Color();
  const warm = new Color("#ffe6c8");
  const coolw = new Color("#cfe0ff");
  let made = 0;
  let guard = 0;
  const cap = count * 6;
  while (made < count && guard < cap) {
    guard += 1;
    const theta = rand() * Math.PI * 2;
    // concentrate near the galactic plane (small latitude), gaussian-ish
    const lat = (rand() + rand() + rand() - 1.5) * 0.32;
    const radius = 70 + rand() * 66;
    const cl_ = Math.cos(lat);
    const x = cl_ * Math.cos(theta) * radius;
    const y = Math.sin(lat) * radius;
    const z = cl_ * Math.sin(theta) * radius;
    // clumps along the band + dust lanes
    const dirS = 0.06;
    const cloud = fbm3(x * dirS, y * dirS, z * dirS, 7001, 4);
    const dust = fbm3(x * dirS + 40, y * dirS, z * dirS - 40, 9311, 4);
    const dark = smooth(0.52, 0.74, dust);
    const dens = cloud * (1 - dark * 0.92) * (1 - Math.abs(lat) * 1.4);
    if (rand() > Math.pow(Math.max(0, dens), 1.1) * 1.4 + 0.02) continue;

    px.push(x, y, z);
    // mostly faint white/blue gas glow, a few brighter knots
    const bright = Math.pow(rand(), 2.4);
    c.copy(rand() > 0.6 ? coolw : warm).multiplyScalar(0.5 + dens * 0.85 + bright * 0.6);
    cl.push(c.r, c.g, c.b);
    sz.push(1.7 + dens * 4.2 + bright * 3.8);
    al.push(clamp(0.09 + dens * 0.5 + bright * 0.32, 0.04, 0.78));
    sd.push(rand());
    made += 1;
  }
  return { positions: new Float32Array(px), colors: new Float32Array(cl), sizes: new Float32Array(sz), alphas: new Float32Array(al), seeds: new Float32Array(sd) };
}

function smooth(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
