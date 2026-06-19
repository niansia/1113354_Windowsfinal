import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import type { PerfTier } from '../../utils/performanceProfile';
import { FusionCoreLoop } from './FusionCoreLoop';
import { BootParticleField } from './BootParticleField';

interface FusionBootScene3DProps {
  progress: number;
  tier: PerfTier;
  reducedMotion: boolean;
}

// Transparent full-screen WebGL core. The boot screen is the OS surface itself,
// so no physical monitor, laptop, stand, or product mockup is rendered here.
export function FusionBootScene3D({ progress, tier, reducedMotion }: FusionBootScene3DProps) {
  const dpr = useMemo<[number, number]>(() => {
    if (tier === 'low' || reducedMotion) return [1, 1];
    if (tier === 'medium') return [1, 1.4];
    return [1, 1.7];
  }, [tier, reducedMotion]);

  const bloomIntensity = (tier === 'low' ? 0.2 : tier === 'medium' ? 0.28 : 0.36) * (0.82 + progress * 0.16);

  return (
    <Canvas
      className="boot-canvas"
      dpr={dpr}
      camera={{ position: [0, 0.18, 7.2], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.14} />
      <hemisphereLight args={['#89d9ff', '#080918', 0.24]} />
      <directionalLight position={[-3.2, 3.4, 4.8]} color="#8cdfff" intensity={0.68} />
      <pointLight position={[2.8, 1.4, 2.2]} color="#865cff" intensity={1.05} distance={9} />
      <Suspense fallback={null}>
        <FusionCoreLoop progress={progress} tier={tier} />
        <BootParticleField progress={progress} tier={tier} />
      </Suspense>
      {!reducedMotion && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.66}
            luminanceSmoothing={0.42}
            mipmapBlur
            kernelSize={KernelSize.MEDIUM}
          />
          <Vignette eskil={false} offset={0.36} darkness={0.48} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
