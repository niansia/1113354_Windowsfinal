import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, LineBasicMaterial, LineLoop, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { celestialBodies } from "../data/celestialBodies";
import type { BodyId, BodyPositions, PerformanceMode, RuntimeControlsRef, SceneMode } from "../types";
import { ParticleCelestialBody } from "./ParticleCelestialBody";
import { ParticleRing } from "./ParticleRing";
import { CameraRig } from "./CameraRig";
import { performanceScale } from "../utils/particleMath";
import { CoreVortex } from "./CoreVortex";
import { SceneEffects } from "./SceneEffects";

interface SolarSystemSceneProps {
  selectedId: BodyId;
  mode: SceneMode;
  performanceMode: PerformanceMode;
  coreLevel: number;
  bloomEnabled: boolean;
  orbitLinesEnabled: boolean;
  controlsRef: RuntimeControlsRef;
  onSelectBody: (id: BodyId) => void;
}

export function SolarSystemScene({
  selectedId,
  mode,
  performanceMode,
  coreLevel,
  bloomEnabled,
  orbitLinesEnabled,
  controlsRef,
  onSelectBody
}: SolarSystemSceneProps) {
  const particleScale = useMemo(() => performanceScale(performanceMode), [performanceMode]);
  const positionsRef = useRef<BodyPositions>(
    Object.fromEntries(celestialBodies.map((body) => [body.id, new Vector3()])) as BodyPositions
  );

  useFrame(({ clock }, _delta, frame) => {
    const time = clock.elapsedTime;
    for (const body of celestialBodies) {
      const vector = positionsRef.current[body.id];
      if (body.type === "sun") {
        vector.set(0, 0, 0);
      } else {
        // Real revolution: each planet sweeps its orbit at its own (Kepler-scaled)
        // speed, on a near-coplanar ecliptic with a small per-planet inclination
        // so the system reads as a flat disc rather than a bobbing scatter.
        const angle = time * body.orbitSpeed + body.seed * 0.0021;
        const inclination = 0.012 + (body.seed % 5) * 0.007;
        vector.set(
          Math.cos(angle) * body.orbitRadius,
          Math.sin(angle) * body.orbitRadius * inclination,
          Math.sin(angle) * body.orbitRadius
        );
      }
    }
    void frame;
  }, -1);

  return (
    <>
      <color attach="background" args={["#030611"]} />
      <fog attach="fog" args={["#030611", 18, 44]} />
      <ambientLight intensity={0.18} />
      <pointLight position={[0, 0, 0]} intensity={6.5} color="#fff1b6" distance={40} />
      {orbitLinesEnabled &&
        mode !== "inner" &&
        celestialBodies.filter((body) => body.type === "planet").map((body) => <OrbitLine key={body.id} radius={body.orbitRadius} />)}
      {celestialBodies.map((body) => {
        const position = positionsRef.current[body.id];
        return (
          <ParticleCelestialBody
            key={body.id}
            body={body}
            selectedId={selectedId}
            mode={mode}
            position={position}
            particleScale={particleScale}
            coreLevel={coreLevel}
            controlsRef={controlsRef}
            bloomEnabled={bloomEnabled}
            onSelect={onSelectBody}
          />
        );
      })}
      {celestialBodies
        .filter((body) => body.ringConfig)
        .map((body) => (
          <ParticleRing
            key={`${body.id}-ring`}
            body={body}
            selectedId={selectedId}
            mode={mode}
            position={positionsRef.current[body.id]}
            particleScale={particleScale}
            coreLevel={coreLevel}
            controlsRef={controlsRef}
          />
        ))}
      {mode === "inner" && selectedId !== "earth" && (
        <CoreVortex body={celestialBodies.find((body) => body.id === selectedId)!} position={positionsRef.current[selectedId]} particleScale={particleScale} coreLevel={coreLevel} />
      )}
      <GestureLight controlsRef={controlsRef} />
      <CameraRig selectedId={selectedId} mode={mode} bodyPositionsRef={positionsRef} controlsRef={controlsRef} />
      {bloomEnabled && (
        <SceneEffects intensity={mode === "inner" ? 1.15 + coreLevel * 1.35 : mode === "focus" ? 0.82 : 0.46} />
      )}
    </>
  );
}

function OrbitLine({ radius }: { radius: number }) {
  const line = useMemo(() => {
    const segments = 220;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new LineBasicMaterial({
      color: "#65fff3",
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending
    });
    return new LineLoop(geo, material);
  }, [radius]);

  return <primitive object={line} />;
}

function GestureLight({ controlsRef }: { controlsRef: RuntimeControlsRef }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ camera }) => {
    const pointer = controlsRef.current.pointer;
    if (!groupRef.current) return;
    groupRef.current.visible = pointer.active;
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    groupRef.current.position
      .copy(camera.position)
      .add(forward.multiplyScalar(5.5))
      .add(right.multiplyScalar((pointer.x - 0.5) * 5.2))
      .add(up.multiplyScalar((0.5 - pointer.y) * 3.2));
    const scale = 0.06 + pointer.openness * 0.028;
    groupRef.current.scale.setScalar(scale);
  });
  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial color="#9dfff7" transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#75fff2" intensity={1.8} distance={5} />
    </group>
  );
}
