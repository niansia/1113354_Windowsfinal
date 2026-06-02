import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isFiniteVector3(value: THREE.Vector3 | undefined | null): value is THREE.Vector3 {
  return Boolean(
    value &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.z)
  );
}

function safeCurvePoint(curve: THREE.CatmullRomCurve3, u: number): THREE.Vector3 {
  const fallback = new THREE.Vector3();

  try {
    const point = curve.getPointAt(clamp01(u));
    return isFiniteVector3(point) ? point.clone() : fallback;
  } catch {
    return fallback;
  }
}

function safeCurveTangent(curve: THREE.CatmullRomCurve3, u: number): THREE.Vector3 {
  const fallback = new THREE.Vector3(1, 0, 0);

  try {
    const tangent = curve.getTangentAt(clamp01(u));
    if (!isFiniteVector3(tangent) || tangent.lengthSq() < 0.000001) return fallback;
    return tangent.clone().normalize();
  } catch {
    return fallback;
  }
}

function buildRibbonCurve(radiusX = 2.52, radiusY = 1.04, depth = 1.18, phase = 0): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const total = 520;

  for (let i = 0; i < total; i += 1) {
    const t = (i / total) * Math.PI * 2 + phase;
    const pinch = 1 + Math.sin(t * 3.0 + phase) * 0.055 + Math.cos(t * 5.0 - phase) * 0.032;
    const crest = Math.sin(t * 2.0 + phase);
    const x = Math.cos(t) * radiusX * pinch + crest * 0.18;
    const y =
      Math.sin(t) * radiusY * (0.92 + Math.cos(t * 2.0 - phase) * 0.08) +
      Math.sin(t * 2.0 - phase) * 0.16 +
      Math.cos(t * 3.0 + phase) * 0.07;
    const z =
      crest * depth +
      Math.cos(t - phase) * 0.22 +
      Math.sin(t * 4.0 + phase) * 0.08;

    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
}

function frameAt(curve: THREE.CatmullRomCurve3, u: number) {
  const tangent = safeCurveTangent(curve, u);
  const up = Math.abs(tangent.dot(new THREE.Vector3(0, 1, 0))) > 0.88
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(up, tangent);
  if (normal.lengthSq() < 0.000001) normal.set(0, 0, 1);
  normal.normalize();
  const binormal = new THREE.Vector3().crossVectors(tangent, normal);
  if (binormal.lengthSq() < 0.000001) binormal.set(0, 1, 0);
  binormal.normalize();
  return { tangent, normal, binormal };
}

function buildFilamentCurve(
  curve: THREE.CatmullRomCurve3,
  strand: number,
  strandCount: number,
  bandRadius: number,
  phase: number
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const total = 300;
  const lane = strand / Math.max(strandCount - 1, 1);
  const side = lane * 2 - 1;
  const wrap = seededRandom(strand + phase * 17) * Math.PI * 2;
  const orbitOffset = (seededRandom(strand + 31) - 0.5) * 0.5;

  for (let i = 0; i < total; i += 1) {
    const u = i / total;
    const p = safeCurvePoint(curve, u);
    const { normal, binormal } = frameAt(curve, u);
    const surfaceLock = 0.36 + seededRandom(strand + 9) * 0.26;
    const ribbonSide = normal.multiplyScalar(side * bandRadius * surfaceLock);
    const orbit =
      Math.sin(u * Math.PI * 2 * (1.0 + seededRandom(strand + 5) * 1.8) + wrap) *
      bandRadius *
      0.14;
    const breathing =
      Math.sin(u * Math.PI * 12 + phase + strand * 0.37) *
      bandRadius *
      0.055;
    const threadJitter =
      Math.sin(u * Math.PI * 34 + strand * 1.7 + phase) *
      bandRadius *
      0.014;
    const depthWeave = binormal.multiplyScalar((orbit + orbitOffset * bandRadius * 0.14 + breathing + threadJitter));
    const slip = safeCurveTangent(curve, u).multiplyScalar((seededRandom(strand + 73) - 0.5) * 0.032);
    points.push(p.clone().add(ribbonSide).add(depthWeave).add(slip));
  }

  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.42);
}

function buildPlasmaRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  thickness: number,
  phase: number
): THREE.BufferGeometry {
  const segments = 420;
  const lanes = 18;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const p = safeCurvePoint(curve, u);
    const { normal, binormal } = frameAt(curve, u);
    const widthPulse = 1 + Math.sin(u * Math.PI * 6 + phase) * 0.16 + Math.cos(u * Math.PI * 10 - phase) * 0.06;

    for (let j = 0; j <= lanes; j += 1) {
      const lane = j / lanes;
      const side = lane * 2 - 1;
      const edgeTaper = 0.78 + (1 - Math.abs(side)) * 0.22;
      const weave = Math.sin(u * Math.PI * 10 + side * 2.4 + phase) * thickness * 0.34;
      const crown = (1 - side * side) * thickness * 0.72;
      const point = p.clone()
        .add(normal.clone().multiplyScalar(side * width * widthPulse * edgeTaper))
        .add(binormal.clone().multiplyScalar(crown + weave));

      positions.push(point.x, point.y, point.z);
      uvs.push(u, lane);
    }
  }

  const row = lanes + 1;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < lanes; j += 1) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + j + 1;
      const d = i * row + j + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PlasmaRibbonSurface({
  curve,
  width,
  thickness,
  opacity,
  progress,
  phase,
  speed,
  colorA,
  colorB,
  colorC
}: {
  curve: THREE.CatmullRomCurve3;
  width: number;
  thickness: number;
  opacity: number;
  progress: number;
  phase: number;
  speed: number;
  colorA: string;
  colorB: string;
  colorC: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => buildPlasmaRibbonGeometry(curve, width, thickness, phase), [curve, phase, thickness, width]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uOpacity: { value: opacity },
          uPhase: { value: phase },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uColorC: { value: new THREE.Color(colorC) }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormalW;

          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormalW;
          uniform float uTime;
          uniform float uProgress;
          uniform float uOpacity;
          uniform float uPhase;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float facing = clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0);
            float rim = pow(1.0 - facing, 2.15);
            float edge = pow(abs(vUv.y * 2.0 - 1.0), 2.4);
            float fiberA = smoothstep(0.66, 1.0, sin(vUv.x * 92.0 + vUv.y * 15.0 - uTime * 1.5 + uPhase) * 0.5 + 0.5);
            float fiberB = smoothstep(0.78, 1.0, sin(vUv.x * 176.0 - vUv.y * 33.0 + uTime * 0.82 + uPhase * 1.7) * 0.5 + 0.5);
            float slowFlow = 0.5 + 0.5 * sin(vUv.x * 7.0 - uTime * 0.72 + uPhase);
            float cyanHot = exp(-pow((vWorldPos.x + 1.58) * 1.12, 2.0)) * smoothstep(-0.3, 1.05, vWorldPos.y + 0.68);
            float violetHot = exp(-pow((vWorldPos.x - 1.5) * 1.1, 2.0)) * smoothstep(-0.45, 1.0, vWorldPos.y + 0.6);
            float depthFade = smoothstep(-1.25, 0.72, vWorldPos.z);
            float centerQuiet = 1.0 - exp(-pow(vWorldPos.x * 0.6, 2.0)) * 0.18;
            vec3 gradient = mix(uColorA, uColorB, smoothstep(0.0, 0.62, vUv.x));
            gradient = mix(gradient, uColorC, smoothstep(0.52, 1.0, vUv.x));
            vec3 fiberColor = mix(uColorA, uColorC, slowFlow);
            float fiber = fiberA * 0.58 + fiberB * 0.34;
            vec3 color =
              gradient * (0.3 + facing * 0.28 + depthFade * 0.18) +
              fiberColor * fiber * 0.42 +
              mix(uColorA, uColorC, vUv.x) * rim * 0.42 +
              vec3(0.58, 0.94, 1.0) * cyanHot * (0.34 + fiber * 0.24) +
              vec3(0.78, 0.42, 1.0) * violetHot * (0.3 + fiber * 0.22);
            float alpha =
              (0.15 + edge * 0.18 + rim * 0.24 + fiber * 0.17 + cyanHot * 0.12 + violetHot * 0.11) *
              centerQuiet *
              (0.66 + depthFade * 0.34) *
              uOpacity *
              (0.76 + uProgress * 0.18);
            gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.54));
          }
        `
      }),
    [colorA, colorB, colorC, opacity, phase]
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta * speed;
    material.uniforms.uProgress.value = progress;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  });

  return (
    <mesh geometry={geometry}>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function MainRibbonBody({
  curve,
  radius,
  opacity,
  progress,
  phase,
  speed,
  colorA,
  colorB,
  colorC
}: {
  curve: THREE.CatmullRomCurve3;
  radius: number;
  opacity: number;
  progress: number;
  phase: number;
  speed: number;
  colorA: string;
  colorB: string;
  colorC: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const geom = new THREE.TubeGeometry(curve, 860, radius, 34, true);
    geom.computeVertexNormals();
    return geom;
  }, [curve, radius]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uOpacity: { value: opacity },
          uPhase: { value: phase },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uColorC: { value: new THREE.Color(colorC) }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vWorldPos;

          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vWorldPos;
          uniform float uTime;
          uniform float uProgress;
          uniform float uOpacity;
          uniform float uPhase;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;

          float strand(float frequency, float width, float offset) {
            float wave = abs(fract(vUv.y * frequency + vUv.x * 1.85 + offset) - 0.5);
            return smoothstep(width, 0.0, wave);
          }

          void main() {
            vec3 normalW = normalize(vNormalW);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec3 lightDir = normalize(vec3(-0.42, 0.52, 0.74));
            float facing = clamp(dot(normalW, viewDir), 0.0, 1.0);
            float fresnel = pow(1.0 - facing, 2.05);
            float specular = pow(max(dot(reflect(-lightDir, normalW), viewDir), 0.0), 46.0);
            float flow = 0.5 + 0.5 * sin(vUv.x * 21.0 - uTime * 1.55 + uPhase);
            float fineA = strand(18.0, 0.15, -uTime * 0.16 + uPhase);
            float fineB = strand(32.0, 0.078, uTime * 0.12 + uPhase * 1.7);
            float fineC = strand(54.0, 0.05, -uTime * 0.075 + uPhase * 2.4);
            float seam = smoothstep(0.7, 1.0, sin(vUv.x * 8.0 - uTime * 0.9 + uPhase) * 0.5 + 0.5);

            vec3 gradient = mix(uColorA, uColorB, smoothstep(0.0, 0.62, vUv.x));
            gradient = mix(gradient, uColorC, smoothstep(0.52, 1.0, vUv.x));
            vec3 filamentColor = mix(uColorA, uColorC, 0.5 + 0.5 * sin(vUv.x * 4.0 + uPhase));
            float fiberMask = fineA * 0.5 + fineB * 0.36 + fineC * 0.26 + seam * 0.15;
            float cyanHot = exp(-pow((vWorldPos.x + 1.62) * 1.18, 2.0)) * smoothstep(-0.18, 1.16, vWorldPos.y + 0.76);
            float violetHot = exp(-pow((vWorldPos.x - 1.54) * 1.15, 2.0)) * smoothstep(-0.42, 1.0, vWorldPos.y + 0.62);
            float centerQuiet = 1.0 - exp(-pow(vWorldPos.x * 0.58, 2.0)) * 0.22;
            float depthFade = smoothstep(-1.25, 0.72, vWorldPos.z);
            float bodyVolume = 0.34 + facing * 0.34 + fresnel * 0.26;

            vec3 color =
              gradient * bodyVolume +
              filamentColor * fiberMask * (0.28 + depthFade * 0.28) +
              mix(uColorA, uColorC, flow) * fresnel * 0.44 +
              vec3(0.7, 0.92, 1.0) * specular * 0.16 +
              vec3(0.58, 0.94, 1.0) * cyanHot * (0.22 + fiberMask * 0.32) +
              vec3(0.82, 0.42, 1.0) * violetHot * (0.2 + fiberMask * 0.3);

            float alpha =
              (0.16 + fresnel * 0.3 + fiberMask * 0.2 + specular * 0.07 + cyanHot * 0.1 + violetHot * 0.09) *
              centerQuiet *
              (0.68 + depthFade * 0.32) *
              uOpacity *
              (0.78 + uProgress * 0.2);

            gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.58));
          }
        `
      }),
    [colorA, colorB, colorC, opacity, phase]
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta * speed;
    material.uniforms.uProgress.value = progress;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  });

  return (
    <mesh geometry={geometry}>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function FilamentBundle({
  curve,
  count,
  bandRadius,
  tubeRadius,
  opacity,
  progress,
  phase,
  speed,
  colorA,
  colorB
}: {
  curve: THREE.CatmullRomCurve3;
  count: number;
  bandRadius: number;
  tubeRadius: number;
  opacity: number;
  progress: number;
  phase: number;
  speed: number;
  colorA: string;
  colorB: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometries = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const strandCurve = buildFilamentCurve(curve, index, count, bandRadius, phase);
        return new THREE.TubeGeometry(strandCurve, 240, tubeRadius * (0.65 + seededRandom(index + phase) * 0.7), 5, true);
      }),
    [bandRadius, count, curve, phase, tubeRadius]
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uOpacity: { value: opacity },
          uPhase: { value: phase },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormalW;

          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormalW;
          uniform float uTime;
          uniform float uProgress;
          uniform float uOpacity;
          uniform float uPhase;
          uniform vec3 uColorA;
          uniform vec3 uColorB;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float rim = pow(1.0 - clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0), 1.55);
            float dash = smoothstep(0.24, 1.0, sin(vUv.x * 50.0 - uTime * 3.25 + uPhase) * 0.5 + 0.5);
            float hair = smoothstep(0.72, 1.0, sin(vUv.x * 141.0 + vUv.y * 23.0 + uTime * 1.55 + uPhase) * 0.5 + 0.5);
            float micro = smoothstep(0.82, 1.0, sin(vUv.x * 233.0 - uTime * 0.8 + uPhase * 1.3) * 0.5 + 0.5);
            vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vUv.x));
            float cyanHot = exp(-pow((vWorldPos.x + 1.58) * 1.18, 2.0)) * 0.32;
            float violetHot = exp(-pow((vWorldPos.x - 1.52) * 1.15, 2.0)) * 0.28;
            float depthFade = smoothstep(-1.15, 0.55, vWorldPos.z);
            float pulse = 0.78 + 0.22 * sin(vUv.x * 11.0 + uPhase);
            float alpha = (0.035 + rim * 0.11 + dash * 0.06 + hair * 0.12 + micro * 0.06 + cyanHot + violetHot) * pulse * uOpacity * (0.58 + depthFade * 0.34) * (0.76 + uProgress * 0.18);
            gl_FragColor = vec4(color * (0.46 + dash * 0.18 + hair * 0.28 + micro * 0.16 + cyanHot * 0.74 + violetHot * 0.68), clamp(alpha, 0.0, 0.28));
          }
        `
      }),
    [colorA, colorB, opacity, phase]
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta * speed;
    material.uniforms.uProgress.value = progress;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  });

  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <primitive ref={index === 0 ? materialRef : undefined} object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function EdgeHighlight({
  curve,
  radius,
  opacity,
  progress,
  phase,
  speed,
  colorA,
  colorB
}: {
  curve: THREE.CatmullRomCurve3;
  radius: number;
  opacity: number;
  progress: number;
  phase: number;
  speed: number;
  colorA: string;
  colorB: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 820, radius, 12, true), [curve, radius]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uOpacity: { value: opacity },
          uPhase: { value: phase },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) }
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
          uniform float uOpacity;
          uniform float uPhase;
          uniform vec3 uColorA;
          uniform vec3 uColorB;

          void main() {
            float pulse = 0.5 + 0.5 * sin(vUv.x * 34.0 - uTime * 2.0 + uPhase);
            float glint = smoothstep(0.8, 1.0, pulse);
            float brokenEdge = 0.55 + 0.45 * smoothstep(0.32, 1.0, sin(vUv.x * 93.0 + uPhase) * 0.5 + 0.5);
            vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vUv.x));
            float alpha = (0.12 + glint * 0.26) * brokenEdge * uOpacity * (0.76 + uProgress * 0.16);
            gl_FragColor = vec4(color * (0.64 + glint * 0.5), clamp(alpha, 0.0, 0.32));
          }
        `
      }),
    [colorA, colorB, opacity, phase]
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta * speed;
    material.uniforms.uProgress.value = progress;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  });

  return (
    <mesh geometry={geometry}>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function AmbientSparks({ count, progress }: { count: number; progress: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#5deaff', '#4b93ff', '#7b6dff', '#bd75ff'];

    for (let i = 0; i < count; i += 1) {
      const theta = seededRandom(i + 3) * Math.PI * 2;
      const ring = 2.2 + seededRandom(i + 11) * 1.75;
      positions[i * 3] = Math.cos(theta) * ring + (seededRandom(i + 23) - 0.5) * 0.12;
      positions[i * 3 + 1] = Math.sin(theta) * (0.84 + seededRandom(i + 31) * 0.42) + (seededRandom(i + 17) - 0.5) * 0.36;
      positions[i * 3 + 2] = (seededRandom(i + 41) - 0.5) * 2.0;

      const color = new THREE.Color(palette[Math.floor(seededRandom(i + 53) * palette.length)]);
      color.multiplyScalar(0.36 + seededRandom(i + 61) * 0.26);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.012;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.06;
    const material = ref.current.material as THREE.PointsMaterial;
    material.opacity = 0.075 + progress * 0.04;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.09}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function CoreAura({ progress }: { progress: number }) {
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
            float ellipse = length(vec2(c.x * 1.15, c.y * 2.15));
            float body = exp(-pow(ellipse * 3.6, 2.0));
            float rim = exp(-pow((ellipse - 0.3) * 11.0, 2.0));
            float pulse = 0.9 + 0.1 * sin(uTime * 0.48);
            vec3 color = mix(vec3(0.05, 0.28, 0.9), vec3(0.48, 0.17, 0.9), vUv.x);
            float alpha = (body * 0.018 + rim * 0.032) * pulse * (0.38 + uProgress * 0.16);
            gl_FragColor = vec4(color, alpha);
          }
        `
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uProgress.value = progress;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0.48, -1.58]} scale={[4.95, 2.58, 1]}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function InnerVolume({ progress }: { progress: number }) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        uniforms: { uProgress: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vWorldPos;
          varying vec3 vNormalW;

          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPos;
          varying vec3 vNormalW;
          uniform float uProgress;
          uniform float uTime;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0), 2.0);
            float flow = 0.5 + 0.5 * sin(vWorldPos.x * 3.2 + vWorldPos.y * 2.1 - uTime * 0.8);
            float cyanHot = exp(-pow((vWorldPos.x + 1.0) * 1.15, 2.0));
            float violetHot = exp(-pow((vWorldPos.x - 1.05) * 1.15, 2.0));
            vec3 color = vec3(0.03, 0.16, 0.62) + vec3(0.14, 0.52, 0.78) * cyanHot + vec3(0.28, 0.08, 0.52) * violetHot;
            float alpha = (0.006 + fresnel * 0.026 + flow * 0.008 + cyanHot * 0.012 + violetHot * 0.011) * (0.56 + uProgress * 0.12);
            gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.045));
          }
        `
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uProgress.value = progress;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  });

  return (
    <mesh position={[0, 0.08, -0.52]} scale={[1.22, 0.42, 0.34]}>
      <sphereGeometry args={[1, 64, 28]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function GroundRipples({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, index) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity =
        (0.014 - index * 0.0024) *
        (0.66 + progress * 0.16) *
        (0.88 + 0.12 * Math.sin(state.clock.elapsedTime * 0.42 + index));
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.38, -0.78]} rotation={[Math.PI / 2.16, 0, 0]}>
      {[1.56, 2.06, 2.58].map((radius, index) => (
        <mesh key={radius}>
          <torusGeometry args={[radius, 0.0028, 8, 180]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? '#40cfff' : '#7c55ff'}
            transparent
            opacity={0.007}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface FusionCoreLoopProps {
  progress: number;
  tier: 'low' | 'medium' | 'high';
}

export function FusionCoreLoop({ progress, tier }: FusionCoreLoopProps) {
  const curves = useMemo(
    () => [
      buildRibbonCurve(2.68, 1.16, 1.1, 0),
      buildRibbonCurve(2.54, 1.04, 1.22, Math.PI * 0.24),
      buildRibbonCurve(2.74, 1.2, 0.92, -Math.PI * 0.16),
      buildRibbonCurve(2.4, 0.96, 1.04, Math.PI * 0.48)
    ],
    []
  );

  const filamentCount = tier === 'high' ? 58 : tier === 'medium' ? 42 : 24;
  const sparkCount = tier === 'high' ? 30 : tier === 'medium' ? 22 : 14;
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z += delta * 0.012;
    groupRef.current.rotation.y = -0.24 + Math.sin(state.clock.elapsedTime * 0.13) * 0.12;
    groupRef.current.rotation.x = 0.1 + Math.cos(state.clock.elapsedTime * 0.17) * 0.04;
    const viewportHeight = Math.max(state.size.height, 1);
    const scale = (0.86 + progress * 0.1) * (1 + Math.sin(state.clock.elapsedTime * 0.68) * 0.008);
    const aspectSquash = Math.min(1, Math.max(0.62, (state.size.width / viewportHeight) * 0.98));
    groupRef.current.scale.set(scale * 1.12 * aspectSquash, scale * 1.08, scale * 1.02);
  });

  return (
    <>
      <CoreAura progress={progress} />
      <group ref={groupRef} position={[0, 0.46, 0]}>
        <MainRibbonBody
          curve={curves[0]}
          radius={0.28}
          opacity={0.18}
          progress={progress}
          phase={0.08}
          speed={0.44}
          colorA="#1fbfe8"
          colorB="#2758f0"
          colorC="#7b38e8"
        />
        <PlasmaRibbonSurface
          curve={curves[0]}
          width={0.48}
          thickness={0.18}
          opacity={0.34}
          progress={progress}
          phase={0.18}
          speed={0.64}
          colorA="#45e7ff"
          colorB="#3c70ff"
          colorC="#8d50ff"
        />
        <PlasmaRibbonSurface
          curve={curves[1]}
          width={0.36}
          thickness={0.13}
          opacity={0.24}
          progress={progress}
          phase={1.6}
          speed={0.52}
          colorA="#69f2ff"
          colorB="#4d65ff"
          colorC="#bb66ff"
        />
        <MainRibbonBody
          curve={curves[0]}
          radius={0.21}
          opacity={0.34}
          progress={progress}
          phase={0.25}
          speed={0.72}
          colorA="#35dfff"
          colorB="#2f72ff"
          colorC="#9656ff"
        />
        <MainRibbonBody
          curve={curves[1]}
          radius={0.15}
          opacity={0.24}
          progress={progress}
          phase={1.8}
          speed={0.58}
          colorA="#4cecff"
          colorB="#405cff"
          colorC="#bd5dff"
        />
        <FilamentBundle
          curve={curves[0]}
          count={filamentCount}
          bandRadius={0.082}
          tubeRadius={0.0076}
          opacity={0.24}
          progress={progress}
          phase={0.4}
          speed={0.92}
          colorA="#69efff"
          colorB="#a96cff"
        />
        <FilamentBundle
          curve={curves[1]}
          count={Math.max(10, Math.floor(filamentCount * 0.7))}
          bandRadius={0.068}
          tubeRadius={0.0064}
          opacity={0.2}
          progress={progress}
          phase={2.15}
          speed={0.74}
          colorA="#4bcfff"
          colorB="#7f68ff"
        />
        <FilamentBundle
          curve={curves[2]}
          count={Math.max(8, Math.floor(filamentCount * 0.55))}
          bandRadius={0.056}
          tubeRadius={0.0052}
          opacity={0.16}
          progress={progress}
          phase={3.2}
          speed={1.05}
          colorA="#46dcff"
          colorB="#c063ff"
        />
        <FilamentBundle
          curve={curves[3]}
          count={Math.max(8, Math.floor(filamentCount * 0.42))}
          bandRadius={0.046}
          tubeRadius={0.0044}
          opacity={0.13}
          progress={progress}
          phase={4.65}
          speed={0.86}
          colorA="#69e8ff"
          colorB="#806cff"
        />
        <EdgeHighlight
          curve={curves[2]}
          radius={0.024}
          opacity={0.42}
          progress={progress}
          phase={2.7}
          speed={1.05}
          colorA="#62efff"
          colorB="#b375ff"
        />
        <EdgeHighlight
          curve={curves[3]}
          radius={0.017}
          opacity={0.3}
          progress={progress}
          phase={4.4}
          speed={0.82}
          colorA="#3ec7ff"
          colorB="#7a62ff"
        />
        <AmbientSparks count={sparkCount} progress={progress} />
      </group>
      <GroundRipples progress={progress} />
    </>
  );
}
