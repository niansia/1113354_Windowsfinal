import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EyelinerStyle, FaceModel, MakeupStyle } from '../../style/styleTypes';
import { detectFaceGeometry, type FaceGeometry, type Pt } from '../../style/faceLandmarks';

interface PxPt { x: number; y: number }

/** Eyeliner line styles: base thickness (× face unit), inner/outer taper, wing. */
const LINER_STYLES: Record<EyelinerStyle, { base: number; innerW: number; outerW: number; wing: boolean }> = {
  natural: { base: 0.030, innerW: 0.18, outerW: 1.0, wing: false },
  wing: { base: 0.032, innerW: 0.18, outerW: 1.0, wing: true },
  bold: { base: 0.055, innerW: 0.5, outerW: 1.35, wing: true },
  tightline: { base: 0.018, innerW: 0.45, outerW: 0.7, wing: false }
};

interface MakeupPortraitProps {
  photoUrl: string;
  /** Built-in model, used for ellipse fallback if detection fails. */
  fallbackModel?: FaceModel;
  makeup: MakeupStyle;
  onStatus?: (status: 'loading' | 'ready' | 'noface') => void;
}

const lighten = (hex: string, amount: number) => {
  const n = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'ffffff';
  const ch = [0, 2, 4].map((o) => {
    const v = Number.parseInt(n.slice(o, o + 2), 16);
    return Math.round(v + (255 - v) * amount);
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export function MakeupPortrait({ photoUrl, fallbackModel, makeup, onStatus }: MakeupPortraitProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(fallbackModel?.aspect ?? 0.8);
  const [geo, setGeo] = useState<FaceGeometry | null>(null);

  // Track the rendered pixel size so the SVG overlay maps 1:1 to the photo.
  // Measure synchronously (ResizeObserver can be throttled in background tabs).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setBox({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [aspect]);

  // Detect facial geometry once per photo.
  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    onStatus?.('loading');
    const img = imgRef.current;
    if (!img) return;
    const run = async () => {
      const geometry = await detectFaceGeometry(img, fallbackModel);
      if (cancelled) return;
      setGeo(geometry);
      onStatus?.(geometry ? 'ready' : 'noface');
    };
    if (img.complete && img.naturalWidth > 0) {
      setAspect(img.naturalWidth / img.naturalHeight);
      void run();
    }
    const onLoad = () => {
      setAspect(img.naturalWidth / img.naturalHeight);
      void run();
    };
    img.addEventListener('load', onLoad);
    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl]);

  const { w, h } = box;
  const X = (p: Pt) => +(p.x * w).toFixed(1);
  const Y = (p: Pt) => +(p.y * h).toFixed(1);
  const px = (pts: Pt[]): PxPt[] => pts.map((p) => ({ x: p.x * w, y: p.y * h }));
  const toPath = (pts: PxPt[], close = true) =>
    pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}${close ? ' Z' : ''}` : '';
  const poly = (pts: Pt[], close = true) => toPath(px(pts), close);

  const unit = geo ? geo.faceW * w : w * 0.4; // face width in px → scale reference

  const layers = () => {
    if (!geo || w === 0) return null;
    const m = makeup;
    const els: React.ReactNode[] = [];

    // Foundation: gentle full-face soft-light glow (skin evening)
    if (m.foundationIntensity > 0.02) {
      els.push(
        <rect key="found" x={0} y={0} width={w} height={h}
          fill="#fff3ea" opacity={m.foundationIntensity * 0.16}
          style={{ mixBlendMode: 'soft-light' }} />
      );
    }

    // Contour: soft shadow on the nose sides + cheek hollows
    if (m.contourIntensity > 0.02) {
      geo.noseSides.forEach((p, i) => els.push(
        <circle key={`con-n${i}`} cx={X(p)} cy={Y(p)} r={unit * 0.06}
          fill="#7a5440" opacity={m.contourIntensity * 0.4}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.045}px)` }} />
      ));
      geo.cheeks.forEach((p, i) => els.push(
        <circle key={`con-c${i}`} cx={X(p)} cy={Y({ x: p.x, y: p.y + 0.035 })} r={unit * 0.12}
          fill="#7a5440" opacity={m.contourIntensity * 0.28}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.07}px)` }} />
      ));
    }

    // Blush on the apples of the cheeks
    if (m.blushIntensity > 0.02) {
      geo.cheeks.forEach((p, i) => els.push(
        <circle key={`blush${i}`} cx={X(p)} cy={Y(p)} r={unit * 0.15}
          fill={m.blushColor} opacity={m.blushIntensity * 0.48}
          style={{ mixBlendMode: 'soft-light', filter: `blur(${unit * 0.06}px)` }} />
      ));
    }

    // Eyeshadow — lid band, lifted toward the crease but bounded BELOW the brow
    if (m.eyeshadowIntensity > 0.02) {
      const blend = m.eyeshadowFinish === 'matte' ? 'multiply' : m.eyeshadowFinish === 'glow' ? 'screen' : 'soft-light';
      geo.eyes.forEach((eye, i) => {
        const lift = Math.min(eye.browGap * 0.5, eye.h * 1.7);
        const lidTop = eye.upper.map((p) => ({
          x: eye.center.x + (p.x - eye.center.x) * 1.06,
          y: p.y - lift
        }));
        const shape = [...eye.upper, ...lidTop.reverse()];
        els.push(
          <path key={`shadow${i}`} d={poly(shape)} fill={m.eyeshadowColor}
            opacity={0.08 + m.eyeshadowIntensity * 0.5}
            style={{ mixBlendMode: blend, filter: `blur(${unit * 0.018}px)` }} />
        );
      });
    }

    // Aegyo-sal (臥蠶) — soft highlight just below the lower lash line
    if (m.aegyoIntensity > 0.02) {
      geo.eyes.forEach((eye, i) => {
        const band = eye.lower.map((p) => ({ x: p.x, y: p.y + eye.h * 0.22 }));
        els.push(
          <path key={`aegyo${i}`} d={poly([...eye.lower, ...band.reverse()])}
            fill="#fff1e6" opacity={m.aegyoIntensity * 0.5}
            style={{ mixBlendMode: 'soft-light', filter: `blur(${unit * 0.01}px)` }} />
        );
      });
    }

    // Eyebrows — fill the brow region with a soft tint (follows the brow shape)
    if (m.browIntensity > 0.02) {
      geo.browPolys.forEach((brow, i) => els.push(
        <path key={`brow${i}`} d={poly(brow)} fill={m.browColor}
          opacity={m.browIntensity * 0.42}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.008}px)` }} />
      ));
    }

    // Lashes (mascara) — thin lash-line darkening + flick strokes on the outer half
    if (m.lashIntensity > 0.02) {
      geo.eyes.forEach((eye, i) => {
        const lash = px(eye.upper); // inner → outer
        const lw = unit * (0.005 + m.lashIntensity * 0.01);
        const flickLen = unit * (0.03 + m.lashIntensity * 0.05);
        const flicks: string[] = [];
        for (let k = Math.floor(lash.length * 0.4); k < lash.length; k += 1) {
          const p = lash[k];
          const prev = lash[Math.max(0, k - 1)];
          const dx = p.x - prev.x;
          const len = Math.hypot(dx, p.y - prev.y) || 1;
          // flick points up and slightly outward
          flicks.push(`M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${(p.x + (dx / len) * flickLen * 0.5).toFixed(1)} ${(p.y - flickLen).toFixed(1)}`);
        }
        els.push(
          <path key={`lashline${i}`} d={toPath(lash, false)} fill="none" stroke="#0c0810"
            strokeWidth={lw * 1.6} strokeLinecap="round" opacity={0.4 + m.lashIntensity * 0.4} />
        );
        els.push(
          <path key={`flick${i}`} d={flicks.join(' ')} fill="none" stroke="#0c0810"
            strokeWidth={lw} strokeLinecap="round" opacity={0.35 + m.lashIntensity * 0.45} />
        );
      });
    }

    // Eyeliner — tapered, crisp line along the upper lash (style-driven, optional wing)
    if (m.eyelinerEnabled) {
      const style = LINER_STYLES[m.eyelinerStyle] ?? LINER_STYLES.natural;
      geo.eyes.forEach((eye, i) => {
        const lash = px(eye.upper); // inner → outer
        const n = lash.length;
        if (n < 2) return;
        const thick = unit * style.base * (0.5 + m.eyelinerIntensity * 0.7);
        const top = lash.map((p, idx) => {
          const t = idx / (n - 1);
          const tw = thick * (style.innerW + (style.outerW - style.innerW) * t);
          return { x: p.x, y: p.y - tw };
        });
        const shape: PxPt[] = [...lash];
        if (style.wing) {
          const o = lash[n - 1];
          const prev = lash[n - 2];
          const dx = o.x - prev.x;
          const dy = o.y - prev.y;
          const len = Math.hypot(dx, dy) || 1;
          const wl = unit * 0.11 * (0.6 + m.eyelinerIntensity * 0.6);
          shape.push({ x: o.x + (dx / len) * wl, y: o.y + (dy / len) * wl - thick * 1.7 });
        }
        shape.push(...top.reverse());
        els.push(
          <path key={`liner${i}`} d={toPath(shape, true)} fill="#0b0710"
            opacity={0.55 + m.eyelinerIntensity * 0.45}
            style={{ filter: `blur(${unit * 0.003}px)` }} />
        );
      });
    }

    // Highlighter (高光) — soft glow on bridge, cupid's bow, cheekbones
    if (m.highlightIntensity > 0.02) {
      const hi = (key: string, p: Pt, r: number, op: number) => els.push(
        <circle key={key} cx={X(p)} cy={Y(p)} r={r} fill="#fff6ee"
          opacity={m.highlightIntensity * op}
          style={{ mixBlendMode: 'screen', filter: `blur(${unit * 0.028}px)` }} />
      );
      const bridge = geo.noseBridge[Math.floor(geo.noseBridge.length / 2)] ?? geo.noseTip;
      hi('hi-bridge', bridge, unit * 0.045, 0.4);
      hi('hi-cb', geo.cupidBow, unit * 0.04, 0.4);
      geo.cheekbones.forEach((p, i) => hi(`hi-cheek${i}`, p, unit * 0.09, 0.36));
    }

    // Lipstick — fill the lip contour precisely (inner contour cut out for open mouths)
    if (m.lipstickIntensity > 0.02) {
      els.push(
        <path key="lip" d={`${poly(geo.lipsOuter)} ${poly(geo.lipsInner)}`} fillRule="evenodd"
          fill={m.lipstickColor} opacity={0.34 + m.lipstickIntensity * 0.6}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.003}px)` }} />
      );
      if (m.lipstickFinish !== 'matte') {
        const gloss = { x: geo.lipCenter.x, y: geo.lipCenter.y + geo.lipH * 0.16 };
        els.push(
          <ellipse key="gloss" cx={X(gloss)} cy={Y(gloss)} rx={geo.lipW * w * 0.2} ry={geo.lipH * h * 0.14}
            fill={lighten(m.lipstickColor, 0.72)} opacity={m.lipstickFinish === 'glow' ? 0.45 : 0.24}
            style={{ mixBlendMode: 'screen', filter: `blur(${unit * 0.016}px)` }} />
        );
      }
    }

    return els;
  };

  return (
    <div ref={wrapRef} className="makeup-portrait" style={{ aspectRatio: String(aspect) }}>
      <img
        ref={imgRef}
        className="makeup-photo"
        src={photoUrl}
        alt=""
        draggable={false}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      {w > 0 && geo && (
        <svg className="makeup-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {layers()}
        </svg>
      )}
    </div>
  );
}
