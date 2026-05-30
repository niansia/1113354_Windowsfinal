import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

interface SceneEffectsProps {
  intensity: number;
  vignette?: number;
}

// Shared bloom + vignette stack so every scene glows consistently.
export function SceneEffects({ intensity, vignette = 0.72 }: SceneEffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={intensity} luminanceThreshold={0.11} luminanceSmoothing={0.32} mipmapBlur radius={0.48} />
      <Vignette eskil={false} offset={0.22} darkness={vignette} />
    </EffectComposer>
  );
}
