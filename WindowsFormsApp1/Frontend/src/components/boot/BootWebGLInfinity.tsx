import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BootWebGLInfinityProps {
  progress: number;
  reducedMotion: boolean;
}

const RING_COLORS = [0x66efff, 0x4e8dff, 0x8d72ff, 0xff8cf4, 0xffffff];

function createSoftParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(142,246,255,0.92)');
  gradient.addColorStop(0.58, 'rgba(139,109,255,0.30)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeInfinityPoints(phase = 0, scale = 1) {
  const points: THREE.Vector3[] = [];
  const total = 300;
  for (let i = 0; i <= total; i += 1) {
    const t = (i / total) * Math.PI * 2;
    const x = Math.sin(t + phase) * 3.18 * scale;
    const y = Math.sin(t + phase) * Math.cos(t + phase) * 1.42 * scale;
    const z = Math.cos((t + phase) * 2) * 0.42 * scale + Math.sin(t * 3 + phase) * 0.13;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function makeRingParticles(texture: THREE.Texture | null, profileScale: number) {
  const count = Math.floor(2600 * profileScale);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const tube = (Math.random() - 0.5) * 0.48;
    const x = Math.sin(t) * 3.18 + Math.cos(t * 3.0) * tube;
    const y = Math.sin(t) * Math.cos(t) * 1.42 + Math.sin(t * 2.0) * tube * 0.62;
    const z = Math.cos(t * 2) * 0.42 + (Math.random() - 0.5) * 0.86;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    color.setHex(RING_COLORS[i % RING_COLORS.length]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.052,
    map: texture ?? undefined,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
}

function makeStarfield(texture: THREE.Texture | null, profileScale: number) {
  const count = Math.floor(1400 * profileScale);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = -2.8 - Math.random() * 5.8;

    color.setHSL(0.55 + Math.random() * 0.23, 0.7, 0.55 + Math.random() * 0.35);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    map: texture ?? undefined,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
}

export const BootWebGLInfinity: React.FC<BootWebGLInfinityProps> = ({ progress, reducedMotion }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !window.WebGLRenderingContext) return;

    const profileScale = reducedMotion ? 0.45 : window.devicePixelRatio > 1.5 ? 0.78 : 1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.14, 8.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const particleTexture = createSoftParticleTexture();
    const disposables: Array<{ dispose: () => void }> = [];
    if (particleTexture) disposables.push(particleTexture);

    for (let i = 0; i < 5; i += 1) {
      const curve = new THREE.CatmullRomCurve3(makeInfinityPoints(i * 0.1, 1 + i * 0.016), true);
      const geometry = new THREE.TubeGeometry(curve, 360, 0.035 + i * 0.012, 10, true);
      const material = new THREE.MeshBasicMaterial({
        color: RING_COLORS[i],
        transparent: true,
        opacity: i === 4 ? 0.34 : 0.54,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.z = (i - 2) * 0.16;
      mesh.rotation.x = (i - 2) * 0.05;
      group.add(mesh);
      disposables.push(geometry, material);
    }

    const ringParticles = makeRingParticles(particleTexture, profileScale);
    const starfield = makeStarfield(particleTexture, profileScale);
    group.add(ringParticles);
    scene.add(starfield);
    disposables.push(ringParticles.geometry, ringParticles.material as THREE.Material);
    disposables.push(starfield.geometry, starfield.material as THREE.Material);

    const coreGeometry = new THREE.SphereGeometry(0.62, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xcffbff,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    disposables.push(coreGeometry, coreMaterial);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = Math.max(220, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    let last = performance.now();
    const render = (time: number) => {
      const dt = Math.min(0.04, (time - last) / 1000);
      last = time;
      const p = progressRef.current;
      group.rotation.y += dt * (0.18 + p * 0.22);
      group.rotation.x = Math.sin(time * 0.00026) * 0.16;
      group.rotation.z = Math.sin(time * 0.00019) * 0.08;
      group.scale.setScalar(0.92 + p * 0.18 + Math.sin(time * 0.002) * 0.012);
      ringParticles.rotation.z -= dt * (0.36 + p * 0.28);
      starfield.rotation.z += dt * 0.012;
      core.scale.setScalar(0.72 + p * 0.5 + Math.sin(time * 0.004) * 0.04);
      coreMaterial.opacity = 0.22 + p * 0.38;

      renderer.render(scene, camera);
      if (!reducedMotion) raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeChild(renderer.domElement);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    };
  }, [reducedMotion]);

  return <div ref={hostRef} className="boot-webgl-infinity" aria-hidden="true" />;
};
