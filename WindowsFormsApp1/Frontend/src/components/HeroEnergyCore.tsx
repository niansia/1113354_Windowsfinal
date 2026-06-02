import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import * as THREE from 'three';

interface HeroEnergyCoreProps {
  glyph: string;
  accent: string;
  tier: 'low' | 'medium' | 'high';
}

interface CoreTuning {
  samples: number;
  resolution: number;
  tubular: number;
  radial: number;
  sparkles: number;
  backside: boolean;
}

const TUNING: Record<'medium' | 'high', CoreTuning> = {
  high: { samples: 10, resolution: 512, tubular: 420, radial: 48, sparkles: 70, backside: true },
  medium: { samples: 6, resolution: 256, tubular: 240, radial: 36, sparkles: 36, backside: false }
};

// A single flowing glass ribbon (trefoil knot) made of true transmission glass so it
// refracts the coloured studio environment behind it — that refraction + the iridescent
// film is what reads as premium "liquid glass" instead of a flat translucent shape.
function GlassRibbon({ accent, tuning }: { accent: string; tuning: CoreTuning }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);
  const violet = useMemo(() => new THREE.Color('#8b5cff'), []);
  const coreColor = useMemo(() => accentColor.clone().lerp(violet, 0.45).multiplyScalar(1.6), [accentColor, violet]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.16;
      groupRef.current.rotation.x = -0.16 + Math.sin(state.clock.elapsedTime * 0.2) * 0.06;
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04;
      coreRef.current.scale.setScalar(0.52 * pulse);
    }
  });

  return (
    <group ref={groupRef} scale={1.18} rotation={[0.18, -0.4, -0.16]}>
      {/* main liquid-glass ribbon */}
      <mesh>
        <torusKnotGeometry args={[1.0, 0.34, tuning.tubular, tuning.radial, 2, 3]} />
        <MeshTransmissionMaterial
          transmission={1}
          thickness={1.4}
          roughness={0.05}
          ior={1.46}
          chromaticAberration={0.45}
          anisotropy={0.35}
          distortion={0.32}
          distortionScale={0.4}
          temporalDistortion={0.12}
          iridescence={1}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 520]}
          clearcoat={1}
          clearcoatRoughness={0.08}
          color={'#eaf6ff'}
          attenuationColor={accentColor}
          attenuationDistance={1.6}
          samples={tuning.samples}
          resolution={tuning.resolution}
          backside={tuning.backside}
          backsideThickness={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* glowing inner core seen through the glass */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 4]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Thin additive halo rings orbiting the knot for depth and motion.
function EnergyRings({ accent }: { accent: string }) {
  const ringsRef = useRef<THREE.Group>(null);
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(accent).lerp(new THREE.Color('#ffffff'), 0.35),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }),
    [accent]
  );

  useFrame((state, delta) => {
    if (!ringsRef.current) return;
    ringsRef.current.rotation.z += delta * 0.22;
    ringsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  return (
    <group ref={ringsRef}>
      <mesh material={ringMaterial} rotation={[Math.PI / 2.6, 0.1, 0.3]} scale={[1.7, 1.7, 1]}>
        <torusGeometry args={[1.25, 0.006, 8, 220]} />
      </mesh>
      <mesh material={ringMaterial} rotation={[Math.PI / 2.2, -0.18, -0.5]} scale={[2.05, 2.05, 1]}>
        <torusGeometry args={[1.18, 0.004, 8, 220]} />
      </mesh>
    </group>
  );
}

// Procedural studio HDRI built from coloured area lights. Fully offline (no CDN/HDR
// download) so it works inside the WinForms WebView2 host. These reflections are the
// main source of the blue/cyan/violet iridescence on the glass.
function StudioEnvironment({ accent }: { accent: string }) {
  return (
    <Environment resolution={256} background={false}>
      <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[12, 8, 1]} position={[0, 6, -6]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={3.2} color="#4fd6ff" scale={[6, 9, 1]} position={[-6, 1, 2]} rotation={[0, Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={3.0} color="#b65cff" scale={[6, 9, 1]} position={[6, -1, 2]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer form="circle" intensity={2.2} color={accent} scale={5} position={[0, -3, -4]} />
      <Lightformer form="ring" intensity={1.4} color="#ffd9f4" scale={3} position={[3, 3, 3]} />
    </Environment>
  );
}

export function HeroEnergyCore({ glyph, accent, tier }: HeroEnergyCoreProps) {
  const useGL = tier !== 'low';
  const tuning = tier === 'high' ? TUNING.high : TUNING.medium;

  return (
    <div className="hero-core-wrap" style={{ ['--accent' as string]: accent } as React.CSSProperties}>
      {useGL && (
        <Canvas
          className="hero-core-canvas"
          dpr={tier === 'high' ? [1, 1.75] : [1, 1.25]}
          camera={{ position: [0, 0.1, 5.4], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
            toneMappingExposure: 1.15
          }}
        >
          <ambientLight intensity={0.35} />
          <directionalLight position={[-3, 3, 4]} color="#bdf3ff" intensity={1.4} />
          <pointLight position={[3, -1.4, 2.4]} color="#c06bff" intensity={2.2} distance={9} />

          <Suspense fallback={null}>
            <StudioEnvironment accent={accent} />
            <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.55}>
              <GlassRibbon accent={accent} tuning={tuning} />
              <EnergyRings accent={accent} />
            </Float>
            <Sparkles count={tuning.sparkles} scale={[7, 4.5, 4]} size={2.4} speed={0.3} opacity={0.6} color="#cfeaff" />
          </Suspense>

          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={1.15}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.5}
              mipmapBlur
              kernelSize={KernelSize.LARGE}
            />
          </EffectComposer>
        </Canvas>
      )}
      <div className="hero-core-glow" />
      <div className="hero-core-floor" aria-hidden="true" />
      {!useGL && <div className="hero-core-label">{glyph}</div>}
    </div>
  );
}
