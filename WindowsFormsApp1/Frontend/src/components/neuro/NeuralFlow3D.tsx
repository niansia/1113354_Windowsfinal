import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { InferenceTrace } from '../../neuro/neuroFlow';
import { getPerformanceProfile } from '../../utils/performanceProfile';
import { NeuralFlowCanvas } from './NeuralFlowCanvas';

// Shared live-flow state, mutated imperatively by the parent (rAF + token streaming) so
// the 3D scene reacts at 60fps without re-rendering the whole React tree.
export interface NeuralFlowState {
  progress: number;     // 0..1 wavefront sweep position across the pipeline
  decoded: number;      // output tokens emitted so far
  outputCount: number;  // total output tokens for the current answer
}

interface NeuralFlow3DProps {
  trace: InferenceTrace;
  phaseIndex: number;
  running: boolean;
  speed: number;
  stageLabels: string[];
  label: string;
  flowRef?: React.MutableRefObject<NeuralFlowState>;
}

const layerColors = ['#6ee7ff', '#69a6ff', '#9a83ff', '#ef70c2', '#72edc5', '#f0d779'];

// Small deterministic PRNG so the network topology is stable per prompt seed.
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// One end-to-end signal route: a polyline that touches one node per layer and then exits
// to the right, so a travelling bead represents a signal flowing input -> output -> token.
interface FlowPath {
  pts: THREE.Vector3[];
  cum: number[];
  total: number;
  exitStart: number; // arc-length fraction where the emission (exit) segment begins
}

export function NeuralFlow3D({ trace, phaseIndex, running, speed, stageLabels, label, flowRef }: NeuralFlow3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef({ phaseIndex, running, speed, trace });
  const [failed, setFailed] = useState(false);
  const topologyKey = `${trace.architecture}:${Math.max(1, Math.ceil(trace.tokens.length / 4))}`;
  controlsRef.current = { phaseIndex, running, speed, trace };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const profile = getPerformanceProfile();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: profile.tier === 'high',
        powerPreference: 'high-performance'
      });
    } catch {
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.tier === 'high' ? 1.65 : profile.tier === 'medium' ? 1.3 : 1));
    renderer.setClearColor(0x020817, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03091d, 0.024);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 12.8);
    const graph = new THREE.Group();
    graph.rotation.set(-0.08, -0.28, 0);
    scene.add(graph);

    const rand = mulberry32(controlsRef.current.trace.promptSeed || 1);
    const tierScale = profile.tier === 'low' ? 0.68 : profile.tier === 'medium' ? 0.86 : 1;
    const tokenCount = Math.max(4, Math.min(12, trace.tokens.length || 6));
    const rawCounts = [tokenCount, 12, trace.architecture === 'transformer' ? 15 : 12, trace.architecture === 'hybrid' ? 14 : 11, 9, 6];
    const counts = rawCounts.map((count, index) => index === 0 ? count : Math.max(5, Math.round(count * tierScale)));
    const layerCount = counts.length;
    const minX = -6.6;
    const spanX = 13.2;
    const stepX = spanX / (layerCount - 1);
    const layers: THREE.Vector3[][] = counts.map((count, layerIndex) => Array.from({ length: count }, (_, nodeIndex) => {
      const angle = (nodeIndex / count) * Math.PI * 2 + layerIndex * 0.48;
      const radius = 2.25 + Math.sin(layerIndex * 0.8) * 0.35;
      return new THREE.Vector3(
        minX + layerIndex * stepX,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
    }));
    const nodes = layers.flat();
    // Stable per-node structural activation; layer 0 is overridden live from the prompt tokens.
    const baseActivation: number[] = nodes.map(() => 0.35 + rand() * 0.5);
    const layerOfNode: number[] = [];
    layers.forEach((layer, layerIndex) => layer.forEach(() => layerOfNode.push(layerIndex)));
    const baseColors = layers.map((_, layerIndex) => new THREE.Color(layerColors[layerIndex] ?? '#6ee7ff'));

    const sphereGeometry = new THREE.IcosahedronGeometry(profile.tier === 'low' ? 0.13 : 0.16, profile.tier === 'high' ? 2 : 1);
    const nodeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.94 });
    const nodeMesh = new THREE.InstancedMesh(sphereGeometry, nodeMaterial, nodes.length);
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    nodes.forEach((position, index) => {
      dummy.position.copy(position);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(index, dummy.matrix);
      nodeMesh.setColorAt(index, baseColors[layerOfNode[index]] ?? baseColors[0]);
    });
    nodeMesh.instanceColor?.setUsage(THREE.DynamicDrawUsage);
    graph.add(nodeMesh);

    // Forward feed-forward edges (plus recurrent links for liquid/hybrid) as one batched line set.
    const edgePairs: Array<[THREE.Vector3, THREE.Vector3, number]> = [];
    layers.slice(0, -1).forEach((layer, layerIndex) => {
      const next = layers[layerIndex + 1] ?? [];
      layer.forEach((from, fromIndex) => next.forEach((to, toIndex) => {
        const divisor = profile.tier === 'low' ? 6 : profile.tier === 'medium' ? 5 : 4;
        if ((fromIndex * 7 + toIndex * 11 + layerIndex * 5) % divisor > 1) return;
        edgePairs.push([from, to, layerIndex]);
      }));
    });
    if (trace.architecture !== 'transformer') {
      const recurrentLayer = layers[3] ?? [];
      recurrentLayer.forEach((from, index) => {
        const to = recurrentLayer[(index + 3) % recurrentLayer.length];
        if (to) edgePairs.push([from, to, 3]);
      });
    }

    const edgePositions = new Float32Array(edgePairs.length * 6);
    const edgeColors = new Float32Array(edgePairs.length * 6);
    edgePairs.forEach(([from, to, layerIndex], edgeIndex) => {
      edgePositions.set([from.x, from.y, from.z, to.x, to.y, to.z], edgeIndex * 6);
      const color = new THREE.Color(layerColors[layerIndex] ?? '#6ee7ff').multiplyScalar(0.55);
      edgeColors.set([color.r, color.g, color.b, color.r, color.g, color.b], edgeIndex * 6);
    });
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    graph.add(edgeLines);

    // End-to-end routes: each picks one node per layer, then an exit point to the right of
    // the final layer. Beads riding these travel the full depth, fixing the "stuck mid-graph"
    // look and giving the decoder a visible token-emission tail.
    const pathCount = profile.tier === 'low' ? 12 : profile.tier === 'medium' ? 20 : 30;
    const paths: FlowPath[] = Array.from({ length: pathCount }, () => {
      const pts = layers.map((layer) => layer[Math.floor(rand() * layer.length)].clone());
      const tail = pts[pts.length - 1].clone();
      tail.x += 2.4 + rand() * 0.8;
      tail.y += (rand() - 0.5) * 0.9;
      tail.z += (rand() - 0.5) * 0.9;
      pts.push(tail);
      const cum = [0];
      for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const total = cum[cum.length - 1] || 1;
      return { pts, cum, total, exitStart: cum[cum.length - 2] / total };
    });

    const beadCount = Math.min(profile.particleCount, pathCount * 4);
    const beadPath: number[] = [];
    const beadOffset: number[] = [];
    const beadSpeed: number[] = [];
    for (let i = 0; i < beadCount; i += 1) {
      beadPath.push(i % pathCount);
      beadOffset.push(rand());
      beadSpeed.push(0.6 + rand() * 0.7);
    }
    const pulsePositions = new Float32Array(beadCount * 3);
    const pulseColors = new Float32Array(beadCount * 3);
    const pulseGeometry = new THREE.BufferGeometry();
    const pulsePosAttr = new THREE.BufferAttribute(pulsePositions, 3);
    const pulseColAttr = new THREE.BufferAttribute(pulseColors, 3);
    pulsePosAttr.setUsage(THREE.DynamicDrawUsage);
    pulseColAttr.setUsage(THREE.DynamicDrawUsage);
    pulseGeometry.setAttribute('position', pulsePosAttr);
    pulseGeometry.setAttribute('color', pulseColAttr);
    const pulseMaterial = new THREE.PointsMaterial({ vertexColors: true, size: profile.tier === 'low' ? 0.12 : 0.15, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
    graph.add(pulsePoints);

    const haloGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
    const haloMaterial = new THREE.PointsMaterial({ color: 0x62dfff, size: 0.5, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
    const halos = new THREE.Points(haloGeometry, haloMaterial);
    graph.add(halos);

    let targetRotationX = -0.05;
    let targetRotationY = -0.12;
    let dragX = 0;
    let dragY = 0;
    let pointerDown = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let zoom = 12.8;
    let userZoomed = false;
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const normalizedX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const normalizedY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      targetRotationY = normalizedX * 0.22 + dragX;
      targetRotationX = normalizedY * 0.12 + dragY;
      if (pointerDown) {
        dragX += (event.clientX - pointerStartX) * 0.004;
        dragY += (event.clientY - pointerStartY) * 0.003;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      }
    };
    const onPointerUp = () => { pointerDown = false; };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      userZoomed = true;
      zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.008, 8.5, 22);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!userZoomed) {
        zoom = camera.aspect >= 2.2 ? 10.6 : camera.aspect >= 1.45 ? 13.2 : 14.6;
        camera.position.z = zoom;
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const tmpColor = new THREE.Color();
    const litColor = new THREE.Color();

    let raf = 0;
    let intersecting = true;
    let pageVisible = document.visibilityState !== 'hidden';
    const animationStartedAt = performance.now();
    const animate = () => {
      raf = 0;
      if (!intersecting || !pageVisible) return;
      const elapsed = (performance.now() - animationStartedAt) / 1000;
      const controls = controlsRef.current;
      const live = flowRef?.current;
      const motionScale = profile.reducedMotion ? 0.12 : 1;
      const liveTokens = controls.trace.tokens;

      // Wavefront position: prefer the parent's driven progress; otherwise self-sweep so the
      // network always looks alive (network tab / idle).
      const progress = live ? live.progress : controls.running ? (elapsed * 0.14 * controls.speed) % 1 : 0;
      const frontX = minX + progress * spanX;
      const emit = live && live.outputCount > 0 ? clamp01(live.decoded / live.outputCount) : 0;

      graph.rotation.x += (targetRotationX - graph.rotation.x) * 0.035;
      graph.rotation.y += (targetRotationY + Math.sin(elapsed * 0.16) * 0.06 * motionScale - graph.rotation.y) * 0.035;
      camera.position.z += (zoom - camera.position.z) * 0.08;

      for (let index = 0; index < nodes.length; index += 1) {
        const position = nodes[index];
        const layerIndex = layerOfNode[index];
        const activation = layerIndex === 0
          ? (liveTokens[index % Math.max(1, liveTokens.length)]?.activation ?? 0.5)
          : baseActivation[index];
        const front = Math.max(0, 1 - Math.abs(position.x - frontX) / 1.6);
        const flare = controls.running ? front : front * 0.35;
        const breathe = 1 + Math.sin(elapsed * controls.speed * 2.6 + index * 0.7) * 0.06 * motionScale;
        const sizeBase = 0.82 + activation * 0.6;
        dummy.position.copy(position);
        dummy.scale.setScalar(breathe * sizeBase * (0.86 + flare * 0.6));
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(index, dummy.matrix);
        litColor.copy(baseColors[layerIndex] ?? baseColors[0]).multiplyScalar(Math.min(1.7, 0.5 + flare * 0.95 + activation * 0.18));
        nodeMesh.setColorAt(index, litColor);
      }
      nodeMesh.instanceMatrix.needsUpdate = true;
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
      edgeMaterial.opacity = controls.running ? 0.4 : 0.24;

      for (let i = 0; i < beadCount; i += 1) {
        const path = paths[beadPath[i]];
        const t = (elapsed * 0.16 * controls.speed * beadSpeed[i] + beadOffset[i]) % 1;
        const target = t * path.total;
        let seg = 1;
        while (seg < path.cum.length - 1 && path.cum[seg] < target) seg += 1;
        const segStart = path.cum[seg - 1];
        const segLength = Math.max(1e-4, path.cum[seg] - segStart);
        const localT = (target - segStart) / segLength;
        const a = path.pts[seg - 1];
        const b = path.pts[seg];
        pulsePositions[i * 3] = a.x + (b.x - a.x) * localT;
        pulsePositions[i * 3 + 1] = a.y + (b.y - a.y) * localT;
        pulsePositions[i * 3 + 2] = a.z + (b.z - a.z) * localT;
        const onExit = t >= path.exitStart;
        if (onExit) {
          // Decoder emission tail: glows gold only while tokens are being produced.
          const e = 0.12 + emit * 1.05;
          tmpColor.setRGB(1.0 * e, 0.86 * e, 0.55 * e);
        } else {
          const headBoost = Math.max(0, 1 - Math.abs(a.x - frontX) / 2.2) * (controls.running ? 0.6 : 0.2);
          tmpColor.setRGB(0.72 + headBoost, 0.92 + headBoost * 0.3, 1.0);
        }
        pulseColors[i * 3] = tmpColor.r;
        pulseColors[i * 3 + 1] = tmpColor.g;
        pulseColors[i * 3 + 2] = tmpColor.b;
      }
      pulsePosAttr.needsUpdate = true;
      pulseColAttr.needsUpdate = true;
      pulseMaterial.opacity = controls.running ? 0.98 : 0.7;

      renderer.render(scene, camera);
      schedule();
    };
    const schedule = () => {
      if (!raf && intersecting && pageVisible) raf = requestAnimationFrame(animate);
    };
    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      if (!intersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
      schedule();
    }, { threshold: 0.01 });
    intersectionObserver.observe(mount);
    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      if (!pageVisible && raf) { cancelAnimationFrame(raf); raf = 0; }
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      sphereGeometry.dispose();
      nodeMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      pulseGeometry.dispose();
      pulseMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [topologyKey, trace.architecture, flowRef]);

  if (failed) {
    return <NeuralFlowCanvas trace={trace} phaseIndex={phaseIndex} running={running} speed={speed} stageLabels={stageLabels} />;
  }

  return (
    <div className="neuro-network-3d" ref={mountRef} role="img" aria-label={label}>
      <div className="neuro-3d-layer-labels" aria-hidden="true">
        {stageLabels.map((stage, index) => <span key={stage} className={phaseIndex === index ? 'active' : ''}>{stage}</span>)}
      </div>
    </div>
  );
}
