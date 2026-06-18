import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { InferenceTrace } from '../../neuro/neuroFlow';
import { getPerformanceProfile } from '../../utils/performanceProfile';
import { NeuralFlowCanvas } from './NeuralFlowCanvas';

interface NeuralFlow3DProps {
  trace: InferenceTrace;
  phaseIndex: number;
  running: boolean;
  speed: number;
  stageLabels: string[];
  label: string;
}

const layerColors = ['#6ee7ff', '#69a6ff', '#9a83ff', '#ef70c2', '#72edc5', '#f0d779'];

export function NeuralFlow3D({ trace, phaseIndex, running, speed, stageLabels, label }: NeuralFlow3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef({ phaseIndex, running, speed });
  const [failed, setFailed] = useState(false);
  const topologyKey = `${trace.architecture}:${Math.max(1, Math.ceil(trace.tokens.length / 4))}`;
  controlsRef.current = { phaseIndex, running, speed };

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
    scene.fog = new THREE.FogExp2(0x03091d, 0.026);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 12.8);
    const graph = new THREE.Group();
    graph.rotation.set(-0.08, -0.28, 0);
    scene.add(graph);

    const tierScale = profile.tier === 'low' ? 0.68 : profile.tier === 'medium' ? 0.86 : 1;
    const tokenCount = Math.max(4, Math.min(12, trace.tokens.length || 6));
    const rawCounts = [tokenCount, 12, trace.architecture === 'transformer' ? 15 : 12, trace.architecture === 'hybrid' ? 14 : 11, 9, 6];
    const counts = rawCounts.map((count, index) => index === 0 ? count : Math.max(5, Math.round(count * tierScale)));
    const layers: THREE.Vector3[][] = counts.map((count, layerIndex) => Array.from({ length: count }, (_, nodeIndex) => {
      const angle = (nodeIndex / count) * Math.PI * 2 + layerIndex * 0.48;
      const radius = 2.25 + Math.sin(layerIndex * 0.8) * 0.35;
      return new THREE.Vector3(
        -6.6 + layerIndex * (13.2 / (counts.length - 1)),
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
    }));
    const nodes = layers.flat();

    const sphereGeometry = new THREE.IcosahedronGeometry(profile.tier === 'low' ? 0.13 : 0.16, profile.tier === 'high' ? 2 : 1);
    const nodeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
    const nodeMesh = new THREE.InstancedMesh(sphereGeometry, nodeMaterial, nodes.length);
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    let nodeOffset = 0;
    layers.forEach((layer, layerIndex) => {
      const color = new THREE.Color(layerColors[layerIndex] ?? '#6ee7ff');
      layer.forEach((position) => {
        dummy.position.copy(position);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(nodeOffset, dummy.matrix);
        nodeMesh.setColorAt(nodeOffset, color);
        nodeOffset += 1;
      });
    });
    nodeMesh.instanceColor?.setUsage(THREE.StaticDrawUsage);
    graph.add(nodeMesh);

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
    const edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    graph.add(edgeLines);

    const pulseCount = Math.min(profile.particleCount, Math.max(18, Math.round(edgePairs.length * 0.22)));
    const pulsePositions = new Float32Array(pulseCount * 3);
    const pulseGeometry = new THREE.BufferGeometry();
    const pulseAttribute = new THREE.BufferAttribute(pulsePositions, 3);
    pulseAttribute.setUsage(THREE.DynamicDrawUsage);
    pulseGeometry.setAttribute('position', pulseAttribute);
    const pulseMaterial = new THREE.PointsMaterial({ color: 0xe8fbff, size: profile.tier === 'low' ? 0.08 : 0.11, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
    graph.add(pulsePoints);

    const haloGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
    const haloMaterial = new THREE.PointsMaterial({ color: 0x62dfff, size: 0.48, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
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
        zoom = camera.aspect >= 2.2 ? 10.2 : camera.aspect >= 1.45 ? 12.8 : 14.2;
        camera.position.z = zoom;
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let raf = 0;
    let intersecting = true;
    let pageVisible = document.visibilityState !== 'hidden';
    const animationStartedAt = performance.now();
    const animate = () => {
      raf = 0;
      if (!intersecting || !pageVisible) return;
      const elapsed = (performance.now() - animationStartedAt) / 1000;
      const controls = controlsRef.current;
      const motionScale = profile.reducedMotion ? 0.12 : 1;
      graph.rotation.x += (targetRotationX - graph.rotation.x) * 0.035;
      graph.rotation.y += (targetRotationY + Math.sin(elapsed * 0.16) * 0.06 * motionScale - graph.rotation.y) * 0.035;
      camera.position.z += (zoom - camera.position.z) * 0.08;

      let index = 0;
      layers.forEach((layer, layerIndex) => layer.forEach((position, localIndex) => {
        const active = controls.running && layerIndex === controls.phaseIndex;
        const pulse = 1 + Math.sin(elapsed * controls.speed * 2.8 + localIndex * 0.72) * (active ? 0.32 : 0.08) * motionScale;
        dummy.position.copy(position);
        dummy.scale.setScalar(pulse * (active ? 1.25 : 1));
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }));
      nodeMesh.instanceMatrix.needsUpdate = true;
      edgeMaterial.opacity = controls.running ? 0.38 : 0.24;

      for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
        const pair = edgePairs[pulseIndex % Math.max(1, edgePairs.length)];
        if (!pair) continue;
        const [from, to, edgeLayer] = pair;
        const phaseBoost = edgeLayer === controls.phaseIndex ? 1.45 : 0.72;
        const progress = (elapsed * 0.22 * controls.speed * phaseBoost + pulseIndex * 0.071) % 1;
        pulsePositions[pulseIndex * 3] = THREE.MathUtils.lerp(from.x, to.x, progress);
        pulsePositions[pulseIndex * 3 + 1] = THREE.MathUtils.lerp(from.y, to.y, progress);
        pulsePositions[pulseIndex * 3 + 2] = THREE.MathUtils.lerp(from.z, to.z, progress);
      }
      pulseAttribute.needsUpdate = true;
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
  }, [topologyKey, trace.architecture]);

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
