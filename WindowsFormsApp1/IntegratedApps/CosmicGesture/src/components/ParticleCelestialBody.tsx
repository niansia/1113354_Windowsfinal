import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  ShaderMaterial,
  Vector3
} from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { BodyId, CelestialBodyData, RuntimeControlsRef, SceneMode } from "../types";
import { createBodyParticles } from "../utils/particleMath";
import particleVertex from "../shaders/particleVertex.glsl?raw";
import particleFragment from "../shaders/particleFragment.glsl?raw";

interface ParticleCelestialBodyProps {
  body: CelestialBodyData;
  selectedId: BodyId;
  mode: SceneMode;
  position: Vector3;
  particleScale: number;
  coreLevel: number;
  controlsRef: RuntimeControlsRef;
  bloomEnabled: boolean;
  onSelect: (id: BodyId) => void;
}

export function ParticleCelestialBody({
  body,
  selectedId,
  mode,
  position,
  particleScale,
  coreLevel,
  controlsRef,
  bloomEnabled,
  onSelect
}: ParticleCelestialBodyProps) {
  const groupRef = useRef<Group>(null);
  const coreLightRef = useRef<PointLight>(null);
  const coreMeshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    const data = createBodyParticles(body, particleScale);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(data.positions, 3));
    geo.setAttribute("aExpanded", new BufferAttribute(data.expanded, 3));
    geo.setAttribute("aCore", new BufferAttribute(data.core, 3));
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
        uGlow: { value: body.glowIntensity },
        uInteractionStrength: { value: 0 },
        uInteractionPoint: { value: new Vector3(999, 999, 999) }
      }
    });
  }, [body.glowIntensity]);

  useFrame(({ clock }, delta) => {
    const selected = selectedId === body.id;
    const focus = selected && mode !== "overview" ? 1 : selected ? 0.42 : 0;
    const targetCore = selected && mode === "inner" ? Math.max(0.38, coreLevel) : 0;
    const targetExpansion = selected && mode === "inner" ? Math.max(0.28, coreLevel) : selected ? 0.06 : 0;
    const uniforms = material.uniforms;

    if (uniforms) {
      uniforms.uTime.value = clock.elapsedTime;
      uniforms.uFocus.value += (focus - uniforms.uFocus.value) * 0.075;
      uniforms.uCore.value += (targetCore - uniforms.uCore.value) * 0.06;
      uniforms.uExpansion.value += (targetExpansion - uniforms.uExpansion.value) * 0.055;
      uniforms.uGlow.value = bloomEnabled ? body.glowIntensity : body.glowIntensity * 0.48;

      const pointer = controlsRef.current.pointer;
      if (selected && pointer.active) {
        const px = (0.5 - pointer.x) * body.visualRadius * 2.7;
        const py = (0.5 - pointer.y) * body.visualRadius * 2.0;
        uniforms.uInteractionPoint.value.set(px, py, body.visualRadius * 0.35);
        uniforms.uInteractionStrength.value += (0.95 - uniforms.uInteractionStrength.value) * 0.16;
      } else {
        uniforms.uInteractionStrength.value += (0 - uniforms.uInteractionStrength.value) * 0.08;
      }
    }

    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.y += body.rotationSpeed * delta * (selected ? 1.3 : 1);
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.17 + body.seed) * 0.035;
    }

    const coreAlpha = selected && mode === "inner" ? coreLevel : 0;
    if (coreLightRef.current) {
      coreLightRef.current.intensity += ((body.type === "sun" ? 8.5 : 3.4) * coreAlpha - coreLightRef.current.intensity) * 0.08;
      coreLightRef.current.color = new Color(body.coreColor);
    }
    if (coreMeshRef.current) {
      const scale = body.visualRadius * (0.12 + coreAlpha * (body.type === "sun" ? 0.34 : 0.26));
      coreMeshRef.current.scale.setScalar(scale);
      coreMeshRef.current.visible = coreAlpha > 0.04;
      const mat = coreMeshRef.current.material as MeshBasicMaterial;
      mat.opacity = Math.min(0.95, coreAlpha * 0.86);
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(body.id);
  };

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <mesh onClick={handleClick} visible={false}>
        <sphereGeometry args={[body.visualRadius * (body.id === "saturn" ? 2.2 : 1.3), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh ref={coreMeshRef} visible={false}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={body.coreColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={coreLightRef} distance={body.visualRadius * 8} intensity={0} />
    </group>
  );
}
