import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { Minus, Plus, LocateFixed, X } from 'lucide-react';
import type { Poet, Poem, PoetryForm, PoetryGraph } from '../../poetry/poetryTypes';
import { fishFromCoord } from '../../poetry/poetryVoid';
import type { FishedPoem, VoidForm } from '../../poetry/poetryVoid';

interface PoetryUniverseCanvasProps {
  poets: Poet[];
  poems: Poem[];
  graph: PoetryGraph;
  selectedPoetId: string;
  selectedPoemId: string;
  form: PoetryForm | '全部';
  resetToken: number;
  archivePoetCount: number;
  archivePoemCount: number;
  onSelectPoet: (poetId: string) => void;
  onSelectPoem: (poetId: string, poemId: string) => void;
}

const GOLDEN = 2.399963229728653;
const WORLD = 70;

const PALETTES: Record<string, string[]> = {
  先秦: ['#ffe2a6', '#ffd27a', '#f6b96a'],
  漢: ['#ffce8a', '#ffb86b', '#ff9f5a'],
  魏晉: ['#ffe0a0', '#f6c878', '#e8b46a'],
  南北朝: ['#f4d68a', '#e8c070', '#d9ad62'],
  唐: ['#ffd166', '#ff9f68', '#ff6f91', '#ffc07a'],
  宋: ['#7fe3c0', '#6fd0ff', '#86f1c8', '#5fc8e6'],
  元: ['#c79bff', '#b388ff', '#9f7bff'],
  明: ['#7db8ff', '#6aa0ff', '#8fc4ff'],
  清: ['#ff9ec4', '#ff7fb0', '#ffadd2']
};
const paletteFor = (d: string) => PALETTES[d] ?? PALETTES['唐'];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hash = (v: string) => {
  let h = 2166136261;
  for (let i = 0; i < v.length; i += 1) {
    h ^= v.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rngFrom = (seed: number) => {
  let v = seed >>> 0 || 1;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
};

interface PoetNode {
  id: string;
  name: string;
  dynasty: string;
  count: number;
  pos: THREE.Vector3;
  color: THREE.Color;
}
interface SceneData {
  poetNodes: PoetNode[];
  byId: Map<string, PoetNode>;
  clusters: { dynasty: string; center: THREE.Vector3; color: THREE.Color; size: number }[];
}

function buildPoetScene(poets: Poet[]): SceneData {
  const byDynasty = new Map<string, Poet[]>();
  for (const p of poets) {
    const arr = byDynasty.get(p.dynasty) ?? [];
    arr.push(p);
    byDynasty.set(p.dynasty, arr);
  }
  const groups = [...byDynasty.entries()].sort((a, b) => b[1].length - a[1].length);
  const maxGroup = Math.max(...groups.map((g) => g[1].length), 1);
  const poetNodes: PoetNode[] = [];
  const clusters: SceneData['clusters'] = [];

  groups.forEach(([dynasty, members], gi) => {
    const y = groups.length > 1 ? 1 - (gi / (groups.length - 1)) * 1.6 : 0;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = gi * GOLDEN;
    const centerDist = gi === 0 ? 0 : WORLD * 0.62 * (0.5 + (gi % 3) * 0.22);
    const center = new THREE.Vector3(
      Math.cos(theta) * rr * centerDist,
      y * centerDist * 0.7,
      Math.sin(theta) * rr * centerDist
    );
    const palette = paletteFor(dynasty);
    const n = members.length;
    const clusterR = WORLD * 0.5 * (0.4 + 0.6 * Math.sqrt(n / maxGroup));
    clusters.push({ dynasty, center, color: new THREE.Color(palette[1] ?? palette[0]), size: clusterR });
    const sorted = [...members].sort((a, b) => b.poemCount - a.poemCount);
    sorted.forEach((poet, k) => {
      const rnd = rngFrom(hash(poet.id));
      const sy = 1 - ((k + 0.5) / n) * 2;
      const sr = Math.sqrt(Math.max(0, 1 - sy * sy));
      const st = k * GOLDEN;
      const dir = new THREE.Vector3(Math.cos(st) * sr, sy, Math.sin(st) * sr);
      const radius = clusterR * Math.pow((k + 0.7) / n, 0.5) * (0.78 + rnd() * 0.4);
      const pos = center
        .clone()
        .add(dir.multiplyScalar(radius))
        .add(new THREE.Vector3((rnd() - 0.5) * 6, (rnd() - 0.5) * 6, (rnd() - 0.5) * 6));
      poetNodes.push({
        id: poet.id,
        name: poet.name,
        dynasty,
        count: poet.poemCount,
        pos,
        color: new THREE.Color(palette[hash(poet.id + dynasty) % palette.length])
      });
    });
  });
  return { poetNodes, byId: new Map(poetNodes.map((p) => [p.id, p])), clusters };
}

// ---- shared additive round-point shaders --------------------------------
const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aGlow;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vCol;
  varying float vGlow;
  void main() {
    vCol = aColor; vGlow = aGlow;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.82 + 0.18 * sin(uTime * 1.4 + position.x * 0.4 + position.y * 0.7);
    gl_PointSize = clamp(aSize * uScale * uPixelRatio * tw * (118.0 / max(0.1, -mv.z)), 0.9, 30.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vCol;
  varying float vGlow;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    float core = exp(-r2 * 11.0);
    float halo = exp(-r2 * 3.2) * 0.16;
    float a = (core + halo) * 0.48;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol * (0.28 + vGlow * 0.58), a);
  }
`;

// ---- poem stars: every poem is a planet, clustered around its poet ------
interface PoemMeta {
  poemId: string;
  poetId: string;
}
function PoemStars({
  poems,
  byId,
  onSelectPoem,
  onHover
}: {
  poems: Poem[];
  byId: Map<string, PoetNode>;
  onSelectPoem: (poetId: string, poemId: string, pos: THREE.Vector3) => void;
  onHover: (poetId: string) => void;
}) {
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, meta, positions } = useMemo(() => {
    const valid = poems.filter((p) => byId.has(p.poetId));
    const n = valid.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const glow = new Float32Array(n);
    const meta: PoemMeta[] = [];
    const positions: THREE.Vector3[] = [];
    valid.forEach((poem, i) => {
      const node = byId.get(poem.poetId)!;
      const rnd = rngFrom(hash(poem.id));
      const u = rnd() * 2 - 1;
      const t = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 2 + Math.pow(rnd(), 0.7) * 9;
      const x = node.pos.x + Math.cos(t) * s * r;
      const y = node.pos.y + u * r;
      const z = node.pos.z + Math.sin(t) * s * r;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      col[i * 3] = node.color.r;
      col[i * 3 + 1] = node.color.g;
      col[i * 3 + 2] = node.color.b;
      size[i] = 1.0 + rnd() * 0.6;
      glow[i] = 0.28 + rnd() * 0.28;
      meta.push({ poemId: poem.id, poetId: poem.poetId });
      positions.push(new THREE.Vector3(x, y, z));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    return { geometry: g, meta, positions };
  }, [poems, byId]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: 0.68 } }),
    [pixelRatio]
  );
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      onClick={(e) => {
        if (e.index == null) return;
        e.stopPropagation();
        const m = meta[e.index];
        onSelectPoem(m.poetId, m.poemId, positions[e.index]);
      }}
      onPointerOver={(e) => {
        if (e.index != null) onHover(meta[e.index].poetId);
      }}
      onPointerOut={() => onHover('')}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={POINT_VERT}
        fragmentShader={POINT_FRAG}
        uniforms={uniforms}
        transparent
        depthTest
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---- poet cores: bright nucleus at each cluster, click to select poet ----
function PoetCores({
  scene,
  onSelectPoet,
  onHover
}: {
  scene: SceneData;
  onSelectPoet: (id: string, pos: THREE.Vector3) => void;
  onHover: (id: string) => void;
}) {
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const n = scene.poetNodes.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const glow = new Float32Array(n);
    scene.poetNodes.forEach((node, i) => {
      pos[i * 3] = node.pos.x;
      pos[i * 3 + 1] = node.pos.y;
      pos[i * 3 + 2] = node.pos.z;
      col[i * 3] = node.color.r;
      col[i * 3 + 1] = node.color.g;
      col[i * 3 + 2] = node.color.b;
      size[i] = clamp(1.4 + Math.sqrt(node.count) * 0.09, 1.4, 5.6);
      glow[i] = clamp(0.45 + Math.log10(node.count + 10) * 0.28, 0.45, 1.25);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    return g;
  }, [scene]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: 0.82 } }),
    [pixelRatio]
  );
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });
  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      onClick={(e) => {
        if (e.index == null) return;
        e.stopPropagation();
        const node = scene.poetNodes[e.index];
        onSelectPoet(node.id, node.pos);
      }}
      onPointerOver={(e) => {
        if (e.index != null) onHover(scene.poetNodes[e.index].id);
      }}
      onPointerOut={() => onHover('')}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={POINT_VERT}
        fragmentShader={POINT_FRAG}
        uniforms={uniforms}
        transparent
        depthTest
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---- the void: dense faint "all possible poems" noise -------------------
const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vA;
  varying vec3 vCol;
  float h(float x){ return fract(sin(x*127.1)*43758.5453); }
  void main(){
    vec3 p = position;
    float jt = uTime*0.04 + aSeed*30.0;
    p += vec3(sin(jt), cos(jt*1.2), sin(jt*0.8)) * 1.2;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = clamp(uPixelRatio * (20.0/max(0.1,-mv.z)) * (0.3+h(aSeed)*0.58), 0.55, 2.4);
    gl_Position = projectionMatrix * mv;
    vA = 0.02 + 0.09*h(aSeed*3.3) * (0.5+0.5*sin(uTime*0.7+aSeed*40.0));
    float c = h(aSeed*7.1);
    vCol = c > 0.82 ? vec3(1.0,0.55,0.76) :
           c > 0.60 ? vec3(1.0,0.84,0.45) :
           c > 0.38 ? vec3(0.45,1.0,0.74) :
           c > 0.16 ? vec3(0.58,0.76,1.0) :
                      vec3(1.0,0.96,0.86);
  }
`;
const DUST_FRAG = /* glsl */ `
  precision highp float;
  varying float vA; varying vec3 vCol;
  void main(){
    vec2 d = gl_PointCoord-0.5; float r2=dot(d,d);
    float a = exp(-r2*7.0)*vA;
    if(a<0.004) discard;
    gl_FragColor = vec4(vCol, a);
  }
`;
function VoidField({ count = 26000 }: { count?: number }) {
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rnd = rngFrom(0x9e3779b9);
    for (let i = 0; i < count; i += 1) {
      const r = WORLD * (0.25 + Math.pow(rnd(), 0.65) * 1.7);
      const u = rnd() * 2 - 1;
      const t = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(t) * s * r;
      pos[i * 3 + 1] = u * r * 0.82;
      pos[i * 3 + 2] = Math.sin(t) * s * r;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), WORLD * 4);
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } }), [pixelRatio]);
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function makeGasTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function NebulaGas({ scene }: { scene: SceneData }) {
  const tex = useMemo(() => makeGasTexture(), []);
  const blobs = useMemo(() => {
    const out: { pos: THREE.Vector3; scale: number; color: THREE.Color }[] = [];
    for (const c of scene.clusters) {
      const rnd = rngFrom(hash('gas' + c.dynasty));
      const blobN = 2 + Math.min(3, Math.floor(c.size / 30));
      for (let i = 0; i < blobN; i += 1) {
        out.push({
          pos: c.center
            .clone()
            .add(new THREE.Vector3((rnd() - 0.5) * c.size, (rnd() - 0.5) * c.size * 0.7, (rnd() - 0.5) * c.size)),
          scale: c.size * (1.1 + rnd() * 1.0),
          color: c.color
        });
      }
    }
    return out;
  }, [scene]);
  return (
    <group>
      {blobs.map((b, i) => (
        <sprite key={i} position={b.pos} scale={[b.scale, b.scale, 1]}>
          <spriteMaterial
            map={tex}
            color={b.color}
            transparent
            opacity={0.045}
            depthTest={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

function RelationWeb({ scene, edges }: { scene: SceneData; edges: PoetryGraph['edges'] }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (const e of edges) {
      const a = scene.byId.get(e.source);
      const b = scene.byId.get(e.target);
      if (!a || !b) continue;
      pts.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [scene, edges]);
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#d9b96c" transparent opacity={0.045} depthTest={false} depthWrite={false} blending={THREE.NormalBlending} />
    </lineSegments>
  );
}

function ArchiveColumns({
  scene,
  selectedId,
  archivePoetCount
}: {
  scene: SceneData;
  selectedId: string;
  archivePoetCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const node = scene.byId.get(selectedId) ?? scene.poetNodes[0];
    const center = node?.pos ?? new THREE.Vector3();
    const count = Math.round(clamp(Math.sqrt(archivePoetCount) * 1.75, 140, 320));
    const pts = new Float32Array(count * 6);
    const rnd = rngFrom(hash(`${selectedId}:archive-columns:${archivePoetCount}`));
    for (let i = 0; i < count; i += 1) {
      const theta = i * GOLDEN + rnd() * 0.4;
      const radius = 4 + Math.pow(rnd(), 0.58) * WORLD * 0.9;
      const lean = (rnd() - 0.5) * 6;
      const x = center.x + Math.cos(theta) * radius;
      const z = center.z + Math.sin(theta) * radius;
      const y0 = center.y - WORLD * (1.1 + rnd() * 0.55);
      const y1 = center.y + WORLD * (1.25 + rnd() * 0.75);
      pts[i * 6] = x;
      pts[i * 6 + 1] = y0;
      pts[i * 6 + 2] = z;
      pts[i * 6 + 3] = x + Math.cos(theta + 0.7) * lean;
      pts[i * 6 + 4] = y1;
      pts[i * 6 + 5] = z + Math.sin(theta + 0.7) * lean;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.boundingSphere = new THREE.Sphere(center, WORLD * 3.2);
    return g;
  }, [archivePoetCount, scene, selectedId]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.045;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial color="#ffd36a" transparent opacity={0.045} depthTest={false} depthWrite={false} blending={THREE.NormalBlending} />
      </lineSegments>
    </group>
  );
}

function ArchiveLattice({
  scene,
  selectedId,
  archivePoemCount
}: {
  scene: SceneData;
  selectedId: string;
  archivePoemCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const node = scene.byId.get(selectedId) ?? scene.poetNodes[0];
    const center = node?.pos ?? new THREE.Vector3();
    const rects = Math.round(clamp(Math.sqrt(archivePoemCount) * 0.09, 58, 110));
    const pts = new Float32Array(rects * 24);
    const rnd = rngFrom(hash(`${selectedId}:archive-lattice:${archivePoemCount}`));
    for (let i = 0; i < rects; i += 1) {
      const theta = i * GOLDEN;
      const radius = WORLD * (0.38 + rnd() * 1.05);
      const cx = center.x + Math.cos(theta) * radius;
      const cy = center.y + (rnd() - 0.5) * WORLD * 1.9;
      const cz = center.z + Math.sin(theta) * radius;
      const w = WORLD * (0.16 + rnd() * 0.5);
      const h = WORLD * (0.12 + rnd() * 0.42);
      const offset = i * 24;
      const corners = [
        [cx - w, cy, cz - h],
        [cx + w, cy, cz - h],
        [cx + w, cy, cz + h],
        [cx - w, cy, cz + h]
      ];
      const segs = [0, 1, 1, 2, 2, 3, 3, 0];
      for (let s = 0; s < segs.length; s += 1) {
        const p = corners[segs[s]];
        pts[offset + s * 3] = p[0];
        pts[offset + s * 3 + 1] = p[1];
        pts[offset + s * 3 + 2] = p[2];
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.boundingSphere = new THREE.Sphere(center, WORLD * 4);
    return g;
  }, [archivePoemCount, scene, selectedId]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.018;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.035;
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial color="#caa24d" transparent opacity={0.035} depthTest={false} depthWrite={false} blending={THREE.NormalBlending} />
      </lineSegments>
    </group>
  );
}

function SelectedBeacon({ scene, selectedId }: { scene: SceneData; selectedId: string }) {
  const node = scene.byId.get(selectedId);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!haloRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.1;
    haloRef.current.scale.setScalar(pulse);
  });
  if (!node) return null;
  return (
    <group position={node.pos}>
      <pointLight color="#ffd36c" intensity={0.28} distance={58} decay={1.9} />
      <mesh>
        <sphereGeometry args={[0.86, 32, 18]} />
        <meshBasicMaterial color="#fff2b8" transparent opacity={0.46} depthTest={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[5.8, 40, 20]} />
        <meshBasicMaterial color="#ffd36c" transparent opacity={0.025} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function SelectedAura({ scene, edges, selectedId }: { scene: SceneData; edges: PoetryGraph['edges']; selectedId: string }) {
  const node = scene.byId.get(selectedId);
  const lineRef = useRef<THREE.LineSegments>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lineGeo = useMemo(() => {
    const pts: number[] = [];
    if (node) {
      for (const e of edges) {
        if (e.source !== selectedId && e.target !== selectedId) continue;
        const other = scene.byId.get(e.source === selectedId ? e.target : e.source);
        if (!other) continue;
        pts.push(node.pos.x, node.pos.y, node.pos.z, other.pos.x, other.pos.y, other.pos.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [scene, edges, selectedId, node]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lineRef.current) (lineRef.current.material as THREE.LineBasicMaterial).opacity = 0.08 + 0.035 * Math.sin(t * 2.5);
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + 0.12 * Math.sin(t * 3));
      ringRef.current.lookAt(state.camera.position);
    }
  });
  if (!node) return null;
  return (
    <group>
      <lineSegments ref={lineRef} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial color="#ffcf6e" transparent opacity={0.08} depthTest={false} depthWrite={false} blending={THREE.NormalBlending} />
      </lineSegments>
      <mesh ref={ringRef} position={node.pos}>
        <ringGeometry args={[3.2, 3.8, 48]} />
        <meshBasicMaterial color="#fff3cf" transparent opacity={0.34} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}

function Labels({ scene, selectedId, hoveredId }: { scene: SceneData; selectedId: string; hoveredId: string }) {
  const shown = useMemo(() => {
    const top = [...scene.poetNodes].sort((a, b) => b.count - a.count).slice(0, 14);
    const set = new Map(top.map((n) => [n.id, n]));
    const sel = scene.byId.get(selectedId);
    const hov = scene.byId.get(hoveredId);
    if (sel) set.set(sel.id, sel);
    if (hov) set.set(hov.id, hov);
    return [...set.values()];
  }, [scene, selectedId, hoveredId]);
  return (
    <>
      {shown.map((n) => (
        <Html key={n.id} position={n.pos} center distanceFactor={130} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <span className={`poetry-3d-label${n.id === selectedId ? ' is-selected' : ''}`}>{n.name}</span>
        </Html>
      ))}
    </>
  );
}

// ---- free-flight pilot: WASD + drag-look + wheel-speed + auto fly-to -----
interface PilotApi {
  flyTo: (pos: THREE.Vector3, dist: number) => void;
  dolly: (factor: number) => void;
  reset: () => void;
}
function Pilot({
  apiRef,
  speedLabelRef
}: {
  apiRef: React.MutableRefObject<PilotApi>;
  speedLabelRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef<{ x: number; y: number } | null>(null);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const speed = useRef(70);
  const fly = useRef<{ active: boolean; t: number; fromP: THREE.Vector3; toP: THREE.Vector3; fromQ: THREE.Quaternion; toQ: THREE.Quaternion } | null>(null);

  useEffect(() => {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw.current = e.y;
    pitch.current = e.x;
  }, [camera]);

  const startFly = (target: THREE.Vector3, dist: number) => {
    const dirFromTarget = camera.position.clone().sub(target);
    if (dirFromTarget.lengthSq() < 0.01) dirFromTarget.set(0, 0, 1);
    dirFromTarget.normalize();
    const toP = target.clone().add(dirFromTarget.multiplyScalar(dist));
    const m = new THREE.Matrix4().lookAt(toP, target, new THREE.Vector3(0, 1, 0));
    const toQ = new THREE.Quaternion().setFromRotationMatrix(m);
    fly.current = { active: true, t: 0, fromP: camera.position.clone(), toP, fromQ: camera.quaternion.clone(), toQ };
  };

  apiRef.current = {
    flyTo: (pos, dist) => startFly(pos, dist),
    dolly: (factor) => {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(fwd, factor);
    },
    reset: () => startFly(new THREE.Vector3(0, 0, 0), 168)
  };

  useEffect(() => {
    const dom = gl.domElement;
    const flightKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'q', ' ', 'shift']);
    const isTyping = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA';
    };
    const kd = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const key = e.key.toLowerCase();
      if (flightKeys.has(key)) {
        e.preventDefault();
        fly.current = null;
      }
      keys.current[key] = true;
    };
    const ku = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (flightKeys.has(key)) e.preventDefault();
      keys.current[key] = false;
    };
    const pd = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY };
      fly.current = null; // taking manual control cancels auto-flight
    };
    const pm = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      yaw.current -= dx * 0.0026;
      pitch.current = clamp(pitch.current - dy * 0.0026, -1.45, 1.45);
    };
    const pu = () => {
      drag.current = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      speed.current = clamp(speed.current * (e.deltaY > 0 ? 0.85 : 1.18), 12, 2600);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    dom.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    dom.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      dom.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      dom.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (fly.current?.active) {
      fly.current.t = Math.min(1, fly.current.t + d * 0.9);
      const e = 1 - Math.pow(1 - fly.current.t, 3);
      camera.position.lerpVectors(fly.current.fromP, fly.current.toP, e);
      camera.quaternion.copy(fly.current.fromQ).slerp(fly.current.toQ, e);
      if (fly.current.t >= 1) {
        const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        yaw.current = eu.y;
        pitch.current = eu.x;
        fly.current = null;
      }
    } else {
      camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
      const k = keys.current;
      const mv = new THREE.Vector3();
      if (k['w'] || k['arrowup']) mv.z -= 1;
      if (k['s'] || k['arrowdown']) mv.z += 1;
      if (k['a'] || k['arrowleft']) mv.x -= 1;
      if (k['d'] || k['arrowright']) mv.x += 1;
      if (k['e'] || k[' ']) mv.y += 1;
      if (k['q'] || k['shift']) mv.y -= 1;
      if (mv.lengthSq() > 0) {
        mv.normalize().applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(mv, speed.current * d);
      }
    }
    if (speedLabelRef.current) {
      speedLabelRef.current.textContent = `速度 ×${(speed.current / 70).toFixed(2)} · ${Math.round(speed.current)} 單位/秒`;
    }
  });

  return null;
}

function Scene(props: {
  scene: SceneData;
  poems: Poem[];
  edges: PoetryGraph['edges'];
  selectedId: string;
  hoveredId: string;
  archivePoetCount: number;
  archivePoemCount: number;
  apiRef: React.MutableRefObject<PilotApi>;
  speedLabelRef: React.RefObject<HTMLSpanElement | null>;
  onSelectPoet: (id: string, pos: THREE.Vector3) => void;
  onSelectPoem: (poetId: string, poemId: string, pos: THREE.Vector3) => void;
  onHover: (id: string) => void;
}) {
  const { scene, poems, edges, selectedId, hoveredId } = props;
  const dustCount = Math.round(clamp(Math.sqrt(props.archivePoemCount) * 34, 26000, 48000));
  return (
    <>
      <color attach="background" args={['#04030a']} />
      <fog attach="fog" args={['#04030a', WORLD * 1.6, WORLD * 4.6]} />
      <NebulaGas scene={scene} />
      <VoidField count={dustCount} />
      <ArchiveLattice scene={scene} selectedId={selectedId} archivePoemCount={props.archivePoemCount} />
      <ArchiveColumns scene={scene} selectedId={selectedId} archivePoetCount={props.archivePoetCount} />
      <RelationWeb scene={scene} edges={edges} />
      <PoemStars poems={poems} byId={scene.byId} onSelectPoem={props.onSelectPoem} onHover={props.onHover} />
      <PoetCores scene={scene} onSelectPoet={props.onSelectPoet} onHover={props.onHover} />
      <SelectedBeacon scene={scene} selectedId={selectedId} />
      <SelectedAura scene={scene} edges={edges} selectedId={selectedId} />
      <Labels scene={scene} selectedId={selectedId} hoveredId={hoveredId} />
      <Pilot apiRef={props.apiRef} speedLabelRef={props.speedLabelRef} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.16} luminanceThreshold={0.82} luminanceSmoothing={0.52} mipmapBlur kernelSize={KernelSize.MEDIUM} />
      </EffectComposer>
    </>
  );
}

export function PoetryUniverseCanvas({
  poets,
  poems,
  graph,
  selectedPoetId,
  selectedPoemId,
  form,
  resetToken,
  archivePoetCount,
  archivePoemCount,
  onSelectPoet,
  onSelectPoem
}: PoetryUniverseCanvasProps) {
  const apiRef = useRef<PilotApi>({ flyTo: () => {}, dolly: () => {}, reset: () => {} });
  const speedLabelRef = useRef<HTMLSpanElement | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const handledRef = useRef(0); // timestamp of the last star click (suppresses void fishing)
  const [hoveredId, setHoveredId] = useState('');
  const [fish, setFish] = useState<FishedPoem | null>(null);
  void selectedPoemId;

  const visibleIds = useMemo(() => new Set(poets.map((p) => p.id)), [poets]);
  const edges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [graph.edges, visibleIds]
  );
  const scene = useMemo(() => buildPoetScene(poets), [poets]);

  // fly to the selected poet whenever it changes from outside (panel / route)
  useEffect(() => {
    const node = scene.byId.get(selectedPoetId);
    if (node) apiRef.current.flyTo(node.pos, 74);
  }, [selectedPoetId, scene]);
  useEffect(() => {
    if (resetToken > 0) apiRef.current.reset();
  }, [resetToken]);

  const voidForm: VoidForm = form === '全部' || form === '古體' || form === '樂府' || form === '詞' || form === '曲'
    ? '五絕'
    : (form as VoidForm);

  // click on empty space → fish a poem out of the void at that coordinate.
  // (own handler instead of R3F onPointerMissed, which is unreliable; a recent
  // star click sets handledRef so we don't also fish.)
  const onWrapperClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('.poetry-zoom') || el.closest('.poetry-fish-card') || el.closest('.poetry-3d-label')) return;
    if (performance.now() - handledRef.current < 160) return; // a star was just clicked
    const cam = cameraRef.current;
    const canvas = e.currentTarget as HTMLElement;
    if (!cam) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);
    const point = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(55));
    setFish(fishFromCoord(point.x, point.y, point.z, voidForm));
  };

  return (
    <div className="poetry-universe-3d" onClick={onWrapperClick}>
      <Canvas
        className="poetry-universe-canvas"
        dpr={[1, 1.8]}
        camera={{ position: [0, 8, 168], fov: 55, near: 0.1, far: 1200 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
        raycaster={{ params: { Points: { threshold: 2.2 } } as THREE.RaycasterParameters }}
        onCreated={(state) => {
          cameraRef.current = state.camera;
        }}
      >
        <Scene
          scene={scene}
          poems={poems}
          edges={edges}
          selectedId={selectedPoetId}
          hoveredId={hoveredId}
          archivePoetCount={archivePoetCount}
          archivePoemCount={archivePoemCount}
          apiRef={apiRef}
          speedLabelRef={speedLabelRef}
          onHover={setHoveredId}
          onSelectPoet={(id, pos) => {
            handledRef.current = performance.now();
            onSelectPoet(id);
            apiRef.current.flyTo(pos, 68);
          }}
          onSelectPoem={(poetId, poemId, pos) => {
            handledRef.current = performance.now();
            onSelectPoem(poetId, poemId);
            apiRef.current.flyTo(pos, 34);
          }}
        />
      </Canvas>

      <div className="poetry-zoom poetry-zoom-left">
        <button type="button" title="前進" onClick={() => apiRef.current.dolly(22)}><Plus size={18} /></button>
        <button type="button" title="後退" onClick={() => apiRef.current.dolly(-22)}><Minus size={18} /></button>
        <button type="button" title="回到全景" onClick={() => apiRef.current.reset()}><LocateFixed size={16} /></button>
      </div>
      <div className="poetry-zoom poetry-zoom-right">
        <button type="button" title="前進" onClick={() => apiRef.current.dolly(22)}><Plus size={18} /></button>
        <button type="button" title="後退" onClick={() => apiRef.current.dolly(-22)}><Minus size={18} /></button>
      </div>

      <div className="poetry-flight-hud"><span ref={speedLabelRef}>速度 ×1.00 · 70 單位/秒</span></div>

      {fish && (
        <div className="poetry-fish-card">
          <button type="button" className="poetry-fish-close" onClick={() => setFish(null)} title="放回虛空"><X size={15} /></button>
          <small>從噪聲裡撈起 · {fish.form}</small>
          <div className="poetry-fish-verses">
            {fish.lines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <code title="此詩在「一切可能的詩」全集中的編號">編號 …{fish.code.slice(-28)}</code>
        </div>
      )}
    </div>
  );
}
