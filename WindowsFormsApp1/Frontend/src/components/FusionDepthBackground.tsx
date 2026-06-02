import React, { useEffect, useRef } from 'react';
import type { PerfProfile } from '../utils/performanceProfile';
import { fusionRuntimeCache } from '../boot/runtimeCache';

interface FusionDepthBackgroundProps {
  // 0..1 horizontal hand position for gesture parallax (falls back to pointer).
  handX: number;
  profile: PerfProfile;
  onFps?: (fps: number) => void;
}

interface Particle {
  x: number;
  y: number;
  z: number; // depth 0 (far) .. 1 (near)
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

// Canvas-2D depth field: drifting holographic particles + faint data-stream links,
// with pointer/gesture parallax. Pure presentation, pointer-events: none, fully
// cleaned up on unmount. Kept on Canvas-2D (not WebGL/three) to stay light inside
// the WinForms WebView2 host.
export const FusionDepthBackground: React.FC<FusionDepthBackgroundProps> = ({ handX, profile, onFps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handXRef = useRef(handX);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    handXRef.current = handX;
  }, [handX]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let resizeRaf = 0;

    const seed = () => {
      particles = [];
      const cached = fusionRuntimeCache.starfield;
      const count = profile.particleCount;
      for (let i = 0; i < count; i += 1) {
        const node = cached && cached.length ? cached[i % cached.length] : null;
        const z = node ? node.z : Math.random();
        particles.push({
          x: node ? node.x : Math.random(),
          y: node ? node.y : Math.random(),
          z,
          vx: (Math.random() - 0.5) * 0.00018 * (0.4 + z),
          vy: (-0.00006 - Math.random() * 0.00016) * (0.4 + z),
          r: node ? Math.max(0.35, node.mag * (0.45 + z * 1.35)) : 0.4 + z * 1.8,
          hue: node ? node.hue : Math.random() > 0.7 ? 280 : 188
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    seed();

    const scheduleResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    };

    const ro = new ResizeObserver(scheduleResize);
    ro.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      pointerRef.current.x = e.clientX / window.innerWidth;
      pointerRef.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onPointer);

    let raf = 0;
    let last = performance.now();
    let fpsAccum = 0;
    let fpsFrames = 0;
    const reduced = profile.reducedMotion;

    const render = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      // fps report ~ every 1000ms to avoid React state churn.
      fpsAccum += dt;
      fpsFrames += 1;
      if (fpsAccum >= 1000) {
        onFps?.(Math.round((fpsFrames * 1000) / fpsAccum));
        fpsAccum = 0;
        fpsFrames = 0;
      }

      // Parallax: combine gesture hand + pointer.
      const px = (handXRef.current - 0.5) * 0.7 + (pointerRef.current.x - 0.5) * 0.3;
      const py = (pointerRef.current.y - 0.5);

      ctx.clearRect(0, 0, width, height);

      // soft radial nebula glow
      const grad = ctx.createRadialGradient(width * (0.5 - px * 0.2), height * 0.42, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(34,211,238,0.05)');
      grad.addColorStop(0.5, 'rgba(99,102,241,0.03)');
      grad.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // project particle screen positions
      const pts: { sx: number; sy: number; z: number; r: number; hue: number }[] = [];
      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
          if (p.x < -0.05) p.x = 1.05;
          if (p.x > 1.05) p.x = -0.05;
        }
        const par = (p.z * 2 - 1) * 46; // depth parallax magnitude
        const sx = p.x * width + px * par;
        const sy = p.y * height + py * par * 0.5;
        pts.push({ sx, sy, z: p.z, r: p.r, hue: p.hue });
      }

      // data-stream links between nearby foreground particles
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        if (a.z < 0.45) continue;
        for (let j = i + 1; j < pts.length; j += 1) {
          const b = pts[j];
          if (b.z < 0.45) continue;
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const alpha = (1 - Math.sqrt(d2) / 120) * 0.14 * a.z;
            ctx.strokeStyle = `rgba(34,211,238,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

      // particles
      for (const p of pts) {
        const alpha = 0.2 + p.z * 0.7;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, ${55 + p.z * 20}%, ${alpha.toFixed(3)})`;
        ctx.shadowBlur = p.z * 10;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [profile, onFps]);

  return <canvas ref={canvasRef} className="fusion-bg-canvas" />;
};
