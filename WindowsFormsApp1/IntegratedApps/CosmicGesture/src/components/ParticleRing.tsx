import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, ShaderMaterial, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import type { BodyId, CelestialBodyData, RuntimeControlsRef, SceneMode } from "../types";
import { createRingParticles } from "../utils/particleMath";
import particleVertex from "../shaders/particleVertex.glsl?raw";
import particleFragment from "../shaders/particleFragment.glsl?raw";

interface ParticleRingProps {
  body: CelestialBodyData;
  selectedId: BodyId;
  mode: SceneMode;
  position: Vector3;
  particleScale: number;
  coreLevel: number;
  controlsRef: RuntimeControlsRef;
}

export function ParticleRing({ body, selectedId, mode, position, particleScale, coreLevel, controlsRef }: ParticleRingProps) {
  const groupRef = useRef<Group>(null);

  const geometry = useMemo(() => {
    const data = createRingParticles(body, particleScale);
    if (!data) return null;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(data.positions, 3));
    geo.setAttribute("aExpanded", new BufferAttribute(data.positions.slice(), 3));
    geo.setAttribute("aCore", new BufferAttribute(data.positions.slice(), 3));
    geo.setAttribute("aColor", new BufferAttribute(data.colors, 3));
    geo.setAttribute("aSize", new BufferAttribute(data.sizes, 1));
    geo.setAttribute("aSeed", new BufferAttribute(data.seeds, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [body, particleScale]);

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uExpansion: { value: 0 },
        uCore: { value: 0 },
        uFocus: { value: 0 },
        uGlow: { value: body.glowIntensity + 0.6 },
        uInteractionStrength: { value: 0 },
        uInteractionPoint: { value: new Vector3(999, 999, 999) }
      }
    });
  }, [body.glowIntensity]);

  useFrame(({ clock }, delta) => {
    const ring = body.ringConfig;
    if (!geometry || !ring) return;
    const selected = selectedId === body.id;
    const uniforms = material.uniforms;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uFocus.value += ((selected ? 0.9 : 0.26) - uniforms.uFocus.value) * 0.07;
    uniforms.uExpansion.value += ((selected && mode === "inner" ? coreLevel * 0.7 : 0) - uniforms.uExpansion.value) * 0.05;
    uniforms.uCore.value += ((selected && mode === "inner" ? coreLevel * 0.42 : 0) - uniforms.uCore.value) * 0.05;

    const pointer = controlsRef.current.pointer;
    uniforms.uInteractionStrength.value += ((selected && pointer.active ? 0.45 : 0) - uniforms.uInteractionStrength.value) * 0.12;

    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.x = ring.tilt;
      groupRef.current.rotation.z += delta * (0.045 + coreLevel * 0.05);
    }
  });

  if (!geometry) return null;

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
