import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Fusion boot core — a single full-screen procedural "aurora" shader.
 *
 * Replaces the old stack of ~15 solid tube ribbons (which read as shiny plastic
 * because of their specular/fresnel surface shading) with one screen-space energy
 * field built from domain-warped fBm flow, the way a TouchDesigner noise/feedback
 * network looks: organic, volumetric, additive glow — no hard surfaces, no plastic
 * highlights. It is also far lighter: one full-screen quad instead of many heavy
 * TubeGeometry meshes and draw calls.
 *
 * The colour palette (cyan → blue → violet), the elliptical loop framing the
 * FUSION OS title, and the quiet dark centre are preserved from the original.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // full-screen triangle/quad: ignore the camera, write clip space directly.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform float uAspect;
  uniform float uDetail;     // 0..1 quality (filament + chromatic detail)
  uniform vec3  uCyan;
  uniform vec3  uBlue;
  uniform vec3  uViolet;

  // ---- value noise + fBm -------------------------------------------------
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = M * p; a *= 0.5; }
    return v;
  }
  // ridged fBm -> thin bright filaments
  float ridged(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      float n = noise(p); n = 1.0 - abs(n * 2.0 - 1.0); v += a * n * n;
      p = M * p; a *= 0.5;
    }
    return v;
  }

  // energy density of the swirling band at a given elliptical radius er /
  // angle ang, plus a domain-warped flow field.
  float bandDensity(float er, float ang, float warpAmt, out float fil) {
    // coordinates that wrap along the loop (ang) and across the band (er)
    vec2 dom = vec2(ang * 0.95, er * 1.7);
    dom += vec2(uTime * 0.05, -uTime * 0.028);          // flow along + drift across
    vec2 w = vec2(fbm(dom * 1.25 + 11.3), fbm(dom * 1.25 - 7.1));
    float n  = fbm(dom * 1.55 + w * warpAmt + uTime * 0.02);
    float n2 = fbm(dom * 3.10 + w * (warpAmt * 1.4) - uTime * 0.05);
    fil = ridged(dom * 2.45 + w * 1.6 + uTime * 0.045);

    // gaussian ring whose radius wobbles with noise -> organic, not a clean ellipse
    float wob = (n - 0.5) * 0.30 + (n2 - 0.5) * 0.12;
    float d = exp(-pow((er - 0.98 - wob) * 2.35, 2.0));
    d *= 0.45 + 0.85 * n;            // break up the band with the flow
    d *= smoothstep(0.18, 0.55, er); // keep the centre quiet for the title
    d *= smoothstep(2.4, 1.05, er);  // fade the far outside
    return d;
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    p.y += 0.012;

    // gentle, slowly breathing tilt of the whole loop
    float tilt = -0.12 + 0.022 * sin(uTime * 0.09);
    p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;

    // elliptical (horizontal) coordinate frame
    vec2 e = vec2(p.x / 0.66, p.y / 0.245);
    float er = length(e);
    float ang = atan(e.y, e.x);

    // band density + filaments. The subtle chromatic dispersion (3 evaluations at
    // offset radii) is the expensive part, so only do it on high tier; mid/low reuse
    // a single evaluation -> ~3x cheaper fragment, smooth on weak GPUs.
    float filG;
    float dG = bandDensity(er, ang, 1.35, filG);
    float dR = dG, dB = dG, filR = filG, filB = filG;
    if (uDetail > 0.8) {
      float ca = 0.018;
      dR = bandDensity(er + ca, ang, 1.35, filR);
      dB = bandDensity(er - ca, ang, 1.35, filB);
    }

    // colour by horizontal position: cyan (left) -> blue -> violet (right)
    float hx = clamp((p.x / uAspect) * 1.35 + 0.5, 0.0, 1.0);
    vec3 col = mix(uCyan, uBlue, smoothstep(0.0, 0.52, hx));
    col = mix(col, uViolet, smoothstep(0.46, 1.0, hx));

    // localised hot-spots (cyan upper-left, violet upper-right) like the original
    float cyanHot   = exp(-pow((p.x + 0.42) * 1.7, 2.0)) * smoothstep(-0.2, 0.5, p.y);
    float violetHot = exp(-pow((p.x - 0.42) * 1.7, 2.0)) * smoothstep(-0.2, 0.5, p.y);

    // additive emission, per channel for the chromatic fringe
    vec3 emit = vec3(col.r * dR, col.g * dG, col.b * dB) * 1.7;

    // bright filament cores riding on the band
    float fil = (filR + filG + filB) / 3.0;
    float filaments = pow(fil, 2.3) * dG * (0.6 + uDetail * 0.8);
    emit += mix(vec3(0.62, 0.95, 1.0), vec3(0.86, 0.66, 1.0), hx) * filaments * 0.9;

    // hot-spot tints
    emit += vec3(0.45, 0.86, 1.0) * cyanHot * dG * 0.6;
    emit += vec3(0.74, 0.42, 1.0) * violetHot * dG * 0.6;

    // soft inner volumetric haze (the quiet purple glow behind the title)
    float haze = exp(-pow(er * 2.05, 2.0));
    emit += mix(vec3(0.05, 0.13, 0.42), vec3(0.20, 0.09, 0.44), hx) * haze * 0.22;

    // intro reveal + progress-driven intensity
    float intro = smoothstep(0.0, 1.0, uTime * 0.9);
    emit *= (0.72 + uProgress * 0.5) * intro;

    // filmic-ish soft clamp so highlights bloom instead of clipping flat
    emit = vec3(1.0) - exp(-emit * 1.25);

    // fine film grain
    float grain = (hash(vUv * (900.0 + uTime)) - 0.5) * 0.035;
    emit += grain;

    float alpha = clamp(max(max(emit.r, emit.g), emit.b) * 1.05, 0.0, 1.0);
    gl_FragColor = vec4(max(emit, 0.0), alpha);
  }
`;

interface FusionCoreLoopProps {
  progress: number;
  tier: 'low' | 'medium' | 'high';
}

export function FusionCoreLoop({ progress, tier }: FusionCoreLoopProps) {
  const size = useThree((s) => s.size);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uAspect: { value: 1.6 },
      uDetail: { value: tier === 'high' ? 1.0 : tier === 'medium' ? 0.6 : 0.25 },
      uCyan: { value: new THREE.Color('#45e7ff') },
      uBlue: { value: new THREE.Color('#3c70ff') },
      uViolet: { value: new THREE.Color('#8d50ff') }
    }),
    [tier]
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value += delta;
    u.uProgress.value = progress;
    u.uAspect.value = Math.max(0.2, size.width / Math.max(1, size.height));
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
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
    </mesh>
  );
}
