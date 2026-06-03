import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { CatalogEntry } from "../data/catalog";
import type { RuntimeControlsRef } from "../types";
import { SceneEffects } from "./SceneEffects";
import deepVertex from "../shaders/deepVertex.glsl?raw";
import deepFragment from "../shaders/deepFragment.glsl?raw";

interface StarMapSceneProps {
  entries: CatalogEntry[];
  controlsRef: RuntimeControlsRef;
  bloomEnabled: boolean;
  selectedId: string;
  onPick: (id: string) => void;
  onHover: (entry: CatalogEntry | null) => void;
}

// A single draw-call "observable universe" — every catalogued object placed at
// its REAL right-ascension / declination on a sphere shell, coloured by class
// and sized by brightness. Thousands of objects cost one points cloud, so the
// whole sky is navigable without lag; clicking an object dives into its full
// procedural particle render.
export function StarMapScene({ entries, controlsRef, bloomEnabled, selectedId, onPick, onHover }: StarMapSceneProps) {
  const mapped = useMemo(() => entries.filter((e) => e.ra != null && e.dec != null), [entries]);

  const geometry = useMemo(() => {
    const n = mapped.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const alphas = new Float32Array(n);
    const seeds = new Float32Array(n);
    const c = new Color();
    for (let i = 0; i < n; i += 1) {
      const e = mapped[i];
      const ra = (e.ra as number) * (Math.PI / 180);
      const dec = (e.dec as number) * (Math.PI / 180);
      // slight depth by category so the shell has parallax instead of being flat
      const depth = e.category === "galaxy" ? 1.12 : e.category === "star" ? 0.82 : 1.0;
      const r = 52 * depth;
      positions[i * 3] = Math.cos(dec) * Math.cos(ra) * r;
      positions[i * 3 + 1] = Math.sin(dec) * r;
      positions[i * 3 + 2] = Math.cos(dec) * Math.sin(ra) * r;

      c.set(e.accent || e.palette[0] || "#cfe0ff");
      const mag = e.magnitude;
      const bright = mag != null ? clamp((9 - mag) / 9, 0.2, 1.3) : 0.55;
      c.multiplyScalar(0.7 + bright * 0.7);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = (mag != null ? clamp(8.5 - mag * 0.5, 2.4, 10) : 3.4) * (e.category === "galaxy" ? 1.2 : 1);
      alphas[i] = clamp(0.45 + bright * 0.5, 0.3, 1.0);
      seeds[i] = (e.seed % 997) / 997;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geo.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [mapped]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: deepVertex,
        fragmentShader: deepFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uDrift: { value: 0 },
          uTwinkle: { value: 0.45 },
          uScale: { value: 1 },
          uSoftness: { value: 0.55 }
        }
      }),
    []
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  const handlePick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.index != null && mapped[event.index]) onPick(mapped[event.index].id);
  };
  const handleHover = (event: ThreeEvent<PointerEvent>) => {
    if (event.index != null && mapped[event.index]) onHover(mapped[event.index]);
  };

  // Highlight ring on the currently selected object.
  const highlight = useMemo(() => {
    const idx = mapped.findIndex((e) => e.id === selectedId);
    if (idx < 0) return null;
    const e = mapped[idx];
    const ra = (e.ra as number) * (Math.PI / 180);
    const dec = (e.dec as number) * (Math.PI / 180);
    const depth = e.category === "galaxy" ? 1.12 : e.category === "star" ? 0.82 : 1.0;
    const r = 52 * depth;
    return [Math.cos(dec) * Math.cos(ra) * r, Math.sin(dec) * r, Math.cos(dec) * Math.sin(ra) * r] as [number, number, number];
  }, [mapped, selectedId]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <StarMapRig controlsRef={controlsRef} />
      <points
        geometry={geometry}
        material={material}
        frustumCulled={false}
        onClick={handlePick}
        onPointerMove={handleHover}
        onPointerOut={() => onHover(null)}
      />
      {highlight && (
        <mesh position={highlight}>
          <ringGeometry args={[1.6, 2.1, 36]} />
          <meshBasicMaterial color="#7ffbf1" transparent opacity={0.85} blending={AdditiveBlending} side={2} />
        </mesh>
      )}
      {bloomEnabled && <SceneEffects intensity={0.85} vignette={0.85} />}
    </>
  );
}

function StarMapRig({ controlsRef }: { controlsRef: RuntimeControlsRef }) {
  const { camera, raycaster } = useThree();
  const azimuth = useRef(0);
  const azVel = useRef(0.0015);
  const elevation = useRef(0.1);
  const elVel = useRef(0);
  const zoom = useRef(0);

  useEffect(() => {
    // Generous pick radius so clicking near a point selects it.
    raycaster.params.Points = { threshold: 1.6 };
  }, [raycaster]);

  useFrame((_, delta) => {
    const c = controlsRef.current;
    azVel.current += c.orbitImpulse;
    elVel.current += c.elevationImpulse;
    zoom.current += c.zoomImpulse;
    c.orbitImpulse *= 0.24;
    c.elevationImpulse *= 0.18;
    c.zoomImpulse = 0;
    azVel.current *= 0.95;
    elVel.current *= 0.88;
    azimuth.current += azVel.current * delta * 60;
    elevation.current = clamp(elevation.current + elVel.current * delta * 60, -1.1, 1.1);
    // Wide range so you can fly right INTO the cloud (surrounded by stars) or
    // pull far back to see the whole observable-universe ball.
    zoom.current = clamp(zoom.current, -44, 86);

    const distance = 100 - zoom.current;
    const x = Math.cos(azimuth.current) * Math.cos(elevation.current) * distance;
    const y = Math.sin(elevation.current) * distance;
    const z = Math.sin(azimuth.current) * Math.cos(elevation.current) * distance;
    camera.position.lerp({ x, y, z } as any, 0.07);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
