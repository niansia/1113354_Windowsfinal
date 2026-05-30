import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, ShaderMaterial, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import type { CelestialBodyData } from "../types";
import { createCoreVortexParticles } from "../utils/particleMath";
import particleVertex from "../shaders/particleVertex.glsl?raw";
import particleFragment from "../shaders/particleFragment.glsl?raw";

interface CoreVortexProps {
  body: CelestialBodyData;
  position: Vector3;
  particleScale: number;
  coreLevel: number;
}

export function CoreVortex({ body, position, particleScale, coreLevel }: CoreVortexProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    const data = createCoreVortexParticles(body, particleScale);
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

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uExpansion: { value: 1 },
          uCore: { value: 1 },
          uFocus: { value: 1 },
          uGlow: { value: body.glowIntensity + 1.8 },
          uInteractionStrength: { value: 0 },
          uInteractionPoint: { value: new Vector3(999, 999, 999) }
        }
      }),
    [body.glowIntensity]
  );

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.y += delta * (0.16 + coreLevel * 0.16);
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.25) * 0.18;
      groupRef.current.visible = coreLevel > 0.03;
      groupRef.current.scale.setScalar(0.72 + coreLevel * 0.72);
    }
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uGlow.value = body.glowIntensity + coreLevel * 2.8;
    if (coreRef.current) {
      coreRef.current.visible = coreLevel > 0.03;
      coreRef.current.scale.setScalar(body.visualRadius * (0.18 + coreLevel * (body.type === "sun" ? 0.75 : 0.48)));
      const mat = coreRef.current.material as MeshBasicMaterial;
      mat.color = new Color(body.coreColor);
      mat.opacity = Math.min(0.92, coreLevel * 0.82);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 42, 42]} />
        <meshBasicMaterial color={body.coreColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color={body.coreColor} intensity={2.2 + coreLevel * 6} distance={body.visualRadius * 9} />
    </group>
  );
}
