import React, { useEffect, useRef } from 'react';
import { fusionRuntimeCache, type StarNode } from '../../boot/runtimeCache';

interface BootParticleCanvasProps {
  intensity: number; // 0..1 grows with boot progress
  reducedMotion: boolean;
}

// Depth starfield for the boot stage. Reuses the starfield the boot pipeline
// generated (runtimeCache) when available, else a small local fallback. rAF is
// fully cleaned up on unmount; static single frame under reduced motion.
export const BootParticleCanvas: React.FC<BootParticleCanvasProps> = ({ intensity, reducedMotion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const stars: StarNode[] = fusionRuntimeCache.starfield && fusionRuntimeCache.starfield.length > 0
      ? fusionRuntimeCache.starfield
      : Array.from({ length: 700 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), mag: 0.3 + Math.random() * 0.8, hue: Math.random() > 0.7 ? 280 : 188, twinkle: 0.5 + Math.random() * 2 }));

    let raf = 0;
    const draw = (t: number) => {
      const k = intensityRef.current;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        // pull stars toward centre early, expand as boot progresses
        const spread = 0.25 + k * 0.85;
        const sx = cx + (s.x - 0.5) * w * spread;
        const sy = cy + (s.y - 0.5) * h * spread;
        const tw = reducedMotion ? 1 : 0.6 + Math.sin(t * 0.001 * s.twinkle + i) * 0.4;
        const alpha = Math.min(1, s.mag * (0.3 + k * 0.8) * tw);
        const size = 0.4 + s.z * 1.7 * (0.5 + k * 0.6);
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 90%, ${60 + s.z * 18}%, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    if (reducedMotion) { cancelAnimationFrame(raf); draw(0); }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="boot-particle-canvas" />;
};
