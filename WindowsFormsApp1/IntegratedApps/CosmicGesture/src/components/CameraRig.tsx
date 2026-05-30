import { useRef, type MutableRefObject } from "react";
import { Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { bodyById } from "../data/celestialBodies";
import type { BodyId, BodyPositions, RuntimeControlsRef, SceneMode } from "../types";

interface CameraRigProps {
  selectedId: BodyId;
  mode: SceneMode;
  bodyPositionsRef: MutableRefObject<BodyPositions>;
  controlsRef: RuntimeControlsRef;
}

const tempTarget = new Vector3();
const tempCamera = new Vector3();

export function CameraRig({ selectedId, mode, bodyPositionsRef, controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const azimuthRef = useRef(-0.72);
  const elevationRef = useRef(0.34);
  const azimuthVelocityRef = useRef(0.006);
  const elevationVelocityRef = useRef(0);
  const zoomBiasRef = useRef(0);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    azimuthVelocityRef.current += controls.orbitImpulse;
    elevationVelocityRef.current += controls.elevationImpulse;
    zoomBiasRef.current += controls.zoomImpulse;
    controls.orbitImpulse *= 0.24;
    controls.elevationImpulse *= 0.18;
    controls.zoomImpulse = 0;

    azimuthVelocityRef.current *= mode === "overview" ? 0.94 : 0.965;
    elevationVelocityRef.current *= 0.88;
    azimuthRef.current += azimuthVelocityRef.current * delta * 60;
    elevationRef.current = clamp(elevationRef.current + elevationVelocityRef.current * delta * 60, -0.68, 0.82);
    zoomBiasRef.current = clamp(zoomBiasRef.current, -5.2, 4.8);

    const selectedBody = bodyById[selectedId];
    const selectedPosition = bodyPositionsRef.current[selectedId] ?? tempTarget.set(0, 0, 0);
    const target = mode === "overview" ? tempTarget.set(0, 0, 0) : selectedPosition;
    const radius = selectedBody.visualRadius;
    const overviewDistance = 25 - zoomBiasRef.current * 0.7;
    const focusDistance = Math.max(3.2, radius * 5.6 + 2.2 - zoomBiasRef.current);
    const innerDistance = Math.max(0.72, radius * 1.15 - zoomBiasRef.current * 0.22);
    const distance = mode === "overview" ? overviewDistance : mode === "inner" ? innerDistance : focusDistance;
    const elevation = mode === "overview" ? 0.42 : elevationRef.current;
    const azimuth = azimuthRef.current;

    tempCamera.set(
      target.x + Math.cos(azimuth) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance + (mode === "overview" ? 6.4 : 0.35),
      target.z + Math.sin(azimuth) * Math.cos(elevation) * distance
    );

    camera.position.lerp(tempCamera, mode === "inner" ? 0.055 : 0.072);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
