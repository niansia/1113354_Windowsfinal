import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * GPU particle point-cloud layered over the aurora core.
 *
 * Every particle's motion is computed entirely in the vertex shader from a static
 * per-particle seed + uTime — the CPU never touches positions per frame — so even
 * 10k+ points cost one draw call and stay perfectly smooth. Particles orbit the
 * elliptical energy loop, breathe with curl-ish jitter, and a subset streams
 * radially outward and respawns (the "dust / sparks" radiating look). Colour
 * matches the aurora palette (cyan → blue → violet). Additive, unlit — energy,
 * not plastic.
 */

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aAngle;
  attribute float aBand;
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vA;
  varying vec3 vCol;

  float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  void main() {
    vec2 center = vec2(0.0, 0.46);
    float rx = 2.62, ry = 1.12;

    // orbit along the loop
    float spd = 0.05 + h(aSeed * 3.1) * 0.07;
    float ang = aAngle + uTime * spd;

    // base point on the elliptical band (+ thickness across the band)
    vec3 pos;
    pos.x = center.x + cos(ang) * rx;
    pos.y = center.y + sin(ang) * ry;
    pos.xy += vec2(cos(ang), sin(ang)) * aBand * 0.55;
    pos.z = (h(aSeed * 5.7) - 0.5) * 1.5;

    // a subset streams radially outward and respawns -> radiating dust
    float stream = step(0.5, h(aSeed * 9.9));
    float life = fract(uTime * (0.05 + h(aSeed * 7.3) * 0.12) + aSeed);
    vec2 outward = normalize(vec2(cos(ang), sin(ang)) + 0.0001);
    pos.xy += outward * stream * life * (1.1 + h(aSeed * 2.2) * 1.3);

    // organic jitter
    float jt = uTime * 0.35 + aSeed * 20.0;
    pos += vec3(sin(jt), cos(jt * 1.27), sin(jt * 0.73)) * 0.07;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // small, crisp points (keeping additive overdraw / fill-rate low -> no jank)
    float sz = uSize * (0.5 + h(aSeed * 4.4) * 0.9);
    gl_PointSize = clamp(sz * uPixelRatio * (7.0 / max(0.1, -mv.z)), 1.0, 9.0);

    // streaming particles fade in/out over their life; orbiting ones twinkle
    float fade = stream > 0.5
      ? sin(life * 3.14159)
      : (0.45 + 0.4 * sin(uTime * 0.6 + aSeed * 30.0));
    vA = clamp(fade, 0.0, 1.0) * (0.45 + uProgress * 0.55);

    float hx = clamp(pos.x / 3.0 + 0.5, 0.0, 1.0);
    vec3 cyan = vec3(0.30, 0.86, 1.0);
    vec3 blue = vec3(0.26, 0.46, 1.0);
    vec3 violet = vec3(0.60, 0.34, 1.0);
    vCol = mix(mix(cyan, blue, smoothstep(0.0, 0.5, hx)), violet, smoothstep(0.45, 1.0, hx));
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying float vA;
  varying vec3 vCol;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    float a = exp(-r2 * 7.5) * vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vCol * (0.65 + a * 0.8), a);
  }
`;

interface BootParticleFieldProps {
  progress: number;
  tier: 'low' | 'medium' | 'high';
}

export function BootParticleField({ progress, tier }: BootParticleFieldProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());

  const count = tier === 'high' ? 7000 : tier === 'medium' ? 4200 : 2200;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3); // unused placeholder (motion is procedural)
    const seed = new Float32Array(count);
    const angle = new Float32Array(count);
    const band = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      seed[i] = Math.random();
      angle[i] = Math.random() * Math.PI * 2;
      // concentrate near the band centre, with a soft spread
      band[i] = (Math.random() * 2 - 1) * (0.4 + Math.random() * 0.6);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    g.setAttribute('aBand', new THREE.BufferAttribute(band, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.46, 0), 8);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uSize: { value: tier === 'high' ? 3.8 : tier === 'medium' ? 3.4 : 3.0 },
      uPixelRatio: { value: pixelRatio }
    }),
    [tier, pixelRatio]
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    matRef.current.uniforms.uProgress.value = progress;
  });

  return (
    <points geometry={geometry} renderOrder={2} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
