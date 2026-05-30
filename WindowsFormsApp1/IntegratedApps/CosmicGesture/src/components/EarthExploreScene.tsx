import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  Vector3
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { RuntimeControlsRef } from "../types";
import { earthClimateColor, earthLand, latLonToVec3, nearestRegion, EARTH_REGIONS } from "../utils/earthGeo";
import { SceneEffects } from "./SceneEffects";

interface EarthExploreSceneProps {
  controlsRef: RuntimeControlsRef;
  particleScale: number;
  bloomEnabled: boolean;
  onRegion: (regionId: string) => void;
}

const GLOBE_R = 1.6;

// "Inside Earth" mode: a solid, lit 3D globe with recognisable continents that you
// travel across by waving/dragging. A green vegetation particle layer sits on the
// land as an extensible hook for future endemic-species / biome data.
export function EarthExploreScene({ controlsRef, particleScale, bloomEnabled, onRegion }: EarthExploreSceneProps) {
  const globeRef = useRef<Group>(null);
  const focusRingRef = useRef<Mesh>(null);
  const sunRef = useRef<Group>(null);

  const azimuth = useRef(2.0);
  const azVel = useRef(0.003);
  const elevation = useRef(0.35);
  const elVel = useRef(0);
  const zoom = useRef(0);
  const lastRegion = useRef<string>("");
  const lastReport = useRef(0);

  const globeGeometry = useMemo(() => buildGlobe(96, 192), []);
  const vegGeometry = useMemo(() => buildVegetation(Math.floor(7000 * particleScale)), [particleScale]);

  const { camera } = useThree();

  useFrame((_, delta) => {
    const c = controlsRef.current;
    azVel.current += c.orbitImpulse;
    elVel.current += c.elevationImpulse;
    zoom.current += c.zoomImpulse;
    c.orbitImpulse *= 0.26;
    c.elevationImpulse *= 0.2;
    c.zoomImpulse = 0;
    azVel.current *= 0.95;
    elVel.current *= 0.88;
    azimuth.current += azVel.current * delta * 60;
    elevation.current = clamp(elevation.current + elVel.current * delta * 60, -1.2, 1.2);
    zoom.current = clamp(zoom.current, -1.4, 2.2);

    // Camera orbits the (static) globe: the sub-camera point IS the geographic
    // coordinate currently facing the viewer.
    const distance = 4.2 - zoom.current;
    const x = Math.cos(azimuth.current) * Math.cos(elevation.current) * distance;
    const y = Math.sin(elevation.current) * distance;
    const z = Math.sin(azimuth.current) * Math.cos(elevation.current) * distance;
    camera.position.lerp(new Vector3(x, y, z), 0.08);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    if (globeRef.current) globeRef.current.rotation.y += 0.01 * delta;
    if (sunRef.current) sunRef.current.position.set(Math.cos(_.clock.elapsedTime * 0.05) * 8, 3, Math.sin(_.clock.elapsedTime * 0.05) * 8);

    // Current viewing coordinate -> nearest named region (throttled).
    const latDeg = (elevation.current * 180) / Math.PI;
    const lonDeg = wrapLon(((azimuth.current * 180) / Math.PI) - (globeRef.current ? (globeRef.current.rotation.y * 180) / Math.PI : 0));
    const region = nearestRegion(latDeg, lonDeg);
    if (focusRingRef.current) {
      const [rx, ry, rz] = latLonToVec3(region.lat, region.lon, GLOBE_R * 1.02);
      focusRingRef.current.position.set(rx, ry, rz);
      focusRingRef.current.lookAt(rx * 2, ry * 2, rz * 2);
    }
    const now = performance.now();
    if (region.id !== lastRegion.current && now - lastReport.current > 220) {
      lastRegion.current = region.id;
      lastReport.current = now;
      onRegion(region.id);
    }
  });

  useEffect(() => {
    onRegion(nearestRegion(20, 110).id);
  }, [onRegion]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <group ref={sunRef} position={[8, 3, 4]}>
        <directionalLight intensity={2.1} color="#fff6e6" />
      </group>

      <group ref={globeRef}>
        {/* solid lit globe */}
        <mesh geometry={globeGeometry}>
          <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
        </mesh>
        {/* vegetation / flora layer (extensible) */}
        <points geometry={vegGeometry} frustumCulled={false}>
          <pointsMaterial size={0.02} vertexColors transparent opacity={0.95} depthWrite={false} blending={AdditiveBlending} sizeAttenuation />
        </points>
        {/* region markers */}
        {EARTH_REGIONS.map((r) => {
          const [mx, my, mz] = latLonToVec3(r.lat, r.lon, GLOBE_R * 1.015);
          return (
            <mesh key={r.id} position={[mx, my, mz]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshBasicMaterial color="#9dfcff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          );
        })}
        {/* highlight ring for the region currently in view */}
        <mesh ref={focusRingRef}>
          <ringGeometry args={[0.05, 0.075, 28]} />
          <meshBasicMaterial color="#7ffbf1" transparent opacity={0.9} side={BackSide} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* atmosphere rim */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.06, 48, 48]} />
        <meshBasicMaterial color="#5aa6ff" transparent opacity={0.16} side={BackSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      {bloomEnabled && <SceneEffects intensity={0.6} vignette={0.7} />}
    </>
  );
}

function buildGlobe(latBands: number, lonBands: number): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= latBands; i += 1) {
    const v = i / latBands;
    const latDeg = 90 - v * 180;
    for (let j = 0; j <= lonBands; j += 1) {
      const u = j / lonBands;
      const lonDeg = -180 + u * 360;
      const [x, y, z] = latLonToVec3(latDeg, lonDeg, GLOBE_R);
      positions.push(x, y, z);
      const n = new Vector3(x, y, z).normalize();
      normals.push(n.x, n.y, n.z);
      const seed = ((Math.sin(latDeg * 12.9898 + lonDeg * 78.233) * 43758.5453) % 1 + 1) % 1;
      const c = earthClimateColor(latDeg, lonDeg, seed);
      // tiny elevation tint on land for relief feel
      colors.push(c.r, c.g, c.b);
    }
  }

  const stride = lonBands + 1;
  for (let i = 0; i < latBands; i += 1) {
    for (let j = 0; j < lonBands; j += 1) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geo.setIndex(indices);
  return geo;
}

function buildVegetation(count: number): BufferGeometry {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(7777);
  let i = 0;
  let guard = 0;
  while (i < count && guard < count * 40) {
    guard += 1;
    const latDeg = Math.asin(rand() * 2 - 1) * (180 / Math.PI);
    const lonDeg = rand() * 360 - 180;
    if (Math.abs(latDeg) > 70) continue; // skip ice
    if (!earthLand(latDeg, lonDeg)) continue;
    const [x, y, z] = latLonToVec3(latDeg, lonDeg, GLOBE_R * 1.006);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const tropical = Math.abs(latDeg) < 18;
    const col = new Color(tropical ? "#3ff07a" : "#7fe06a").multiplyScalar(0.6 + rand() * 0.5);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    i += 1;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

function wrapLon(lon: number): number {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  return l;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
