import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ---- Lemniscate (infinity) curve sampled in 3D, smoothed by Catmull-Rom ----
function buildLemniscate(scale = 3.2, samples = 220): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = (scale * Math.cos(t)) / denom;
    const y = (scale * Math.sin(t) * Math.cos(t)) / denom * 0.62;
    const z = Math.sin(t * 2) * 0.18;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

// ============================================================================
// SpineRibbon: ONE thin bright white core ribbon along the curve.
// This is the bright spine you see threading through the middle of the wave.
// ============================================================================
function SpineRibbon({ curve, progress }: { curve: THREE.CatmullRomCurve3; progress: number }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const geom = useMemo(() => new THREE.TubeGeometry(curve, 600, 0.025, 12, true), [curve]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uProgress;
          void main() {
            // sharp falloff at edges so it stays a thin glowing line
            float edge = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
            // sliding bright pulses along the curve
            float flow = 0.55 + 0.35 * sin(vUv.x * 24.0 - uTime * 3.4)
                              + 0.15 * sin(vUv.x * 8.0 + uTime * 1.4);
            // hotspot near lemniscate crossover (uv.x near 0 / 0.5)
            float hotspot = exp(-pow((mod(vUv.x + 0.25, 0.5) - 0.25) * 7.0, 2.0));
            float a = edge * (flow * 0.7 + hotspot) * (0.5 + uProgress * 0.6);
            gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), a);
          }
        `
      }),
    []
  );

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
    material.uniforms.uProgress.value = progress;
    if (matRef.current) matRef.current.needsUpdate = true;
  });

  return (
    <mesh geometry={geom}>
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
}

// ============================================================================
// WispField: thousands of fine particles drifting ALONG the curve with a
// Gaussian radial offset envelope. THIS is the brush-stroke / luminous fibre
// look from the reference — many fine lit threads forming an atmospheric volume.
// ============================================================================
function WispField({ curve, count, progress }: { curve: THREE.CatmullRomCurve3; count: number; progress: number }) {
  // Per-particle constants (stable across frames)
  const offsets = useMemo(() => new Float32Array(count).map(() => Math.random()), [count]);
  // Gaussian-ish radial envelope: Box-Muller pair gives a soft wisp shape
  const radials = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.random();
      const r = Math.sqrt(-2 * Math.log(u1));
      const th = 2 * Math.PI * u2;
      // bias most particles tight to the spine, with a long tail
      const k = 0.42;
      arr[i * 3] = r * Math.cos(th) * k;     // radial X
      arr[i * 3 + 1] = r * Math.sin(th) * k; // radial Y
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6; // depth wobble
    }
    return arr;
  }, [count]);
  const speeds = useMemo(() => new Float32Array(count).map(() => 0.04 + Math.random() * 0.18), [count]);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#9efcff'), // soft cyan
      new THREE.Color('#5ab7ff'), // electric blue
      new THREE.Color('#7c5cff'), // indigo
      new THREE.Color('#b78cff'), // violet
      new THREE.Color('#ff8ad8'), // magenta
      new THREE.Color('#ffffff')  // white highlight
    ];
    for (let i = 0; i < count; i += 1) {
      // colour bias by per-particle index so each side of the ring leans a hue
      const c = palette[Math.floor(Math.random() * palette.length)].clone();
      c.multiplyScalar(0.7 + Math.random() * 0.6);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const point = new THREE.Vector3();
  const up = new THREE.Vector3(0, 0, 1);

  const ref = useRef<THREE.Points>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const speedScale = 0.45 + progress * 1.6;
    for (let i = 0; i < count; i += 1) {
      const u = (offsets[i] + t * speeds[i] * speedScale * 0.18 + Math.sin(t * 0.4 + i) * 0.002) % 1;
      curve.getPointAt(u, point);
      curve.getTangentAt(u, tangent).normalize();
      // build a frame around the tangent so we can offset radially
      normal.crossVectors(tangent, up).normalize();
      binormal.crossVectors(tangent, normal).normalize();

      const rx = radials[i * 3];
      const ry = radials[i * 3 + 1];
      const rz = radials[i * 3 + 2];

      // soft breathing offset so wisps shimmer
      const breathe = 1.0 + 0.12 * Math.sin(t * 1.6 + i * 0.37);

      positions[i * 3] = point.x + (normal.x * rx + binormal.x * ry) * breathe + tangent.x * rz * 0.4;
      positions[i * 3 + 1] = point.y + (normal.y * rx + binormal.y * ry) * breathe + tangent.y * rz * 0.4;
      positions[i * 3 + 2] = point.z + (normal.z * rx + binormal.z * ry) * breathe + tangent.z * rz * 0.4;
    }
    geom.attributes.position.needsUpdate = true;

    if (ref.current) {
      const mat = ref.current.material as THREE.PointsMaterial;
      mat.opacity = 0.55 + progress * 0.45;
      mat.size = 0.038 + progress * 0.018;
    }
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

// ============================================================================
// Ambient starfield around the ring (slow rotation, brightens with progress).
// ============================================================================
function Starfield({ count, progress }: { count: number; progress: number }) {
  const geom = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#ffffff', '#cfe0ff', '#b8a8ff', '#ffd9a0'];
    for (let i = 0; i < count; i += 1) {
      const r = 7 + Math.random() * 16;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      positions[i * 3 + 1] = Math.cos(ph) * r * 0.7;
      positions[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]).multiplyScalar(0.4 + Math.random() * 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
    if (ref.current) {
      const mat = ref.current.material as THREE.PointsMaterial;
      mat.opacity = 0.35 + progress * 0.35;
    }
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

// ============================================================================
// AtmosphericHalo: a large additive sprite behind everything that gives the
// whole ring a soft glow halo (so bloom has something to bite into).
// ============================================================================
function AtmosphericHalo({ progress }: { progress: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uProgress: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uProgress;
          uniform float uTime;
          void main() {
            vec2 c = vUv - 0.5;
            float d = length(c);
            // elongated lemniscate-ish halo: stretch X, squash Y
            float ax = abs(c.x) * 1.0;
            float ay = abs(c.y) * 1.9;
            float field = exp(-pow(ax * 3.2, 2.0)) * exp(-pow(ay * 3.4, 2.0));
            float pulse = 0.85 + 0.15 * sin(uTime * 0.8);
            float a = field * pulse * (0.45 + uProgress * 0.5);
            vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.7, 0.4, 1.0), vUv.x);
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }
        `
      }),
    []
  );

  useFrame((state, dt) => {
    material.uniforms.uProgress.value = progress;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.04;
  });

  return (
    <mesh ref={ref} position={[0, 0, -1.4]} scale={[10, 6, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface InfinityEnergyRingProps {
  progress: number;
  tier: 'low' | 'medium' | 'high';
}

// Composite: atmospheric halo + dense wisp field + thin bright spine + stars.
// Tier scales wisp/star density.
export function InfinityEnergyRing({ progress, tier }: InfinityEnergyRingProps) {
  const curve = useMemo(() => buildLemniscate(3.2, tier === 'low' ? 110 : 220), [tier]);
  const wispCount = tier === 'high' ? 6000 : tier === 'medium' ? 3200 : 1200;
  const starCount = tier === 'high' ? 2400 : tier === 'medium' ? 1200 : 480;

  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!groupRef.current) return;
    // slow autonomous Z spin + slight Y wobble + breathing scale
    groupRef.current.rotation.z += dt * 0.04;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.08;
    const breath = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
    groupRef.current.scale.setScalar(0.55 + progress * 0.45 * breath);
  });

  return (
    <group ref={groupRef}>
      <AtmosphericHalo progress={progress} />
      <WispField curve={curve} count={wispCount} progress={progress} />
      <SpineRibbon curve={curve} progress={progress} />
      <Starfield count={starCount} progress={progress} />
    </group>
  );
}
