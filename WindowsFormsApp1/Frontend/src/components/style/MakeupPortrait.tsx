import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { detectFaceGeometry, type FaceGeometry, type Pt } from '../../style/faceLandmarks';
import {
  buildBrowHairStrokes,
  buildEyelinerGeometry,
  buildLashCurves,
  computeCoverTransform,
  mapNormalizedPoint,
  mapNormalizedPoints,
  shapeBrowRegion
} from '../../style/makeupGeometry';
import type { FaceModel, MakeupStyle } from '../../style/styleTypes';

interface PxPt {
  x: number;
  y: number;
}

interface MakeupPortraitProps {
  photoUrl: string;
  fallbackModel?: FaceModel;
  makeup: MakeupStyle;
  onStatus?: (status: 'loading' | 'ready' | 'noface') => void;
}

const lighten = (hex: string, amount: number) => {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'ffffff';
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    return Math.round(value + (255 - value) * amount);
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

export function MakeupPortrait({
  photoUrl,
  fallbackModel,
  makeup,
  onStatus
}: MakeupPortraitProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(fallbackModel?.aspect ?? 0.8);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [geo, setGeo] = useState<FaceGeometry | null>(null);

  useLayoutEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        setBox({ w: element.clientWidth, h: element.clientHeight });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [aspect]);

  useEffect(() => {
    let cancelled = false;
    setGeo(null);
    onStatus?.('loading');
    const image = imgRef.current;
    if (!image) return;

    const run = async () => {
      const geometry = await detectFaceGeometry(image, fallbackModel);
      if (cancelled) return;
      setGeo(geometry);
      onStatus?.(geometry ? 'ready' : 'noface');
    };
    const syncImageSize = () => {
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
      setAspect(image.naturalWidth / image.naturalHeight);
      setNaturalSize({ w: image.naturalWidth, h: image.naturalHeight });
    };
    const onLoad = () => {
      syncImageSize();
      void run();
    };

    if (image.complete && image.naturalWidth > 0) onLoad();
    image.addEventListener('load', onLoad);
    return () => {
      cancelled = true;
      image.removeEventListener('load', onLoad);
    };
  }, [fallbackModel, onStatus, photoUrl]);

  const { w, h } = box;
  const transform = computeCoverTransform({
    sourceWidth: naturalSize.w,
    sourceHeight: naturalSize.h,
    viewportWidth: w,
    viewportHeight: h
  });
  const mapPoint = (point: Pt) => mapNormalizedPoint(point, transform);
  const X = (point: Pt) => +mapPoint(point).x.toFixed(1);
  const Y = (point: Pt) => +mapPoint(point).y.toFixed(1);
  const px = (points: Pt[]): PxPt[] => mapNormalizedPoints(points, transform);
  const toPath = (points: PxPt[], close = true) =>
    points.length
      ? `M${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')}${close ? ' Z' : ''}`
      : '';
  const poly = (points: Pt[], close = true) => toPath(px(points), close);
  const curvePath = (base: Pt, control: Pt, tip: Pt) => {
    const start = mapPoint(base);
    const middle = mapPoint(control);
    const end = mapPoint(tip);
    return `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${middle.x.toFixed(1)} ${middle.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  };
  const unit = geo ? geo.faceW * transform.renderedWidth : w * 0.4;

  const layers = () => {
    if (!geo || w === 0 || h === 0) return null;
    const m = makeup;
    const elements: React.ReactNode[] = [];

    if (m.foundationIntensity > 0.02) {
      elements.push(
        <rect key="foundation" x={0} y={0} width={w} height={h}
          fill="#fff3ea" opacity={m.foundationIntensity * 0.16}
          style={{ mixBlendMode: 'soft-light' }} />
      );
    }

    if (m.contourIntensity > 0.02) {
      geo.noseSides.forEach((point, index) => elements.push(
        <circle key={`contour-nose-${index}`} cx={X(point)} cy={Y(point)} r={unit * 0.06}
          fill="#7a5440" opacity={m.contourIntensity * 0.4}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.045}px)` }} />
      ));
      geo.cheeks.forEach((point, index) => elements.push(
        <circle key={`contour-cheek-${index}`}
          cx={X(point)}
          cy={Y({ x: point.x, y: point.y + 0.035 })}
          r={unit * 0.12}
          fill="#7a5440"
          opacity={m.contourIntensity * 0.28}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.07}px)` }} />
      ));
    }

    if (m.blushIntensity > 0.02) {
      geo.cheeks.forEach((point, index) => elements.push(
        <circle key={`blush-${index}`} cx={X(point)} cy={Y(point)} r={unit * 0.15}
          fill={m.blushColor} opacity={m.blushIntensity * 0.48}
          style={{ mixBlendMode: 'soft-light', filter: `blur(${unit * 0.06}px)` }} />
      ));
    }

    if (m.eyeshadowIntensity > 0.02) {
      const blend = m.eyeshadowFinish === 'matte'
        ? 'multiply'
        : m.eyeshadowFinish === 'glow'
          ? 'screen'
          : 'soft-light';
      geo.eyes.forEach((eye, index) => {
        const lift = Math.min(eye.browGap * 0.5, eye.h * 1.7);
        const lidTop = eye.upper.map((point) => ({
          x: eye.center.x + (point.x - eye.center.x) * 1.06,
          y: point.y - lift
        }));
        elements.push(
          <path key={`eyeshadow-${index}`} d={poly([...eye.upper, ...lidTop.reverse()])}
            fill={m.eyeshadowColor}
            opacity={0.08 + m.eyeshadowIntensity * 0.5}
            style={{ mixBlendMode: blend, filter: `blur(${unit * 0.018}px)` }} />
        );
      });
    }

    if (m.aegyoIntensity > 0.02) {
      geo.eyes.forEach((eye, index) => {
        const band = eye.lower.map((point) => ({ x: point.x, y: point.y + eye.h * 0.22 }));
        elements.push(
          <path key={`aegyo-${index}`} d={poly([...eye.lower, ...band.reverse()])}
            fill="#fff1e6" opacity={m.aegyoIntensity * 0.5}
            style={{ mixBlendMode: 'soft-light', filter: `blur(${unit * 0.01}px)` }} />
        );
      });
    }

    if (m.browIntensity > 0.02) {
      geo.browPolys.forEach((brow, index) => {
        const shaped = shapeBrowRegion(brow, {
          style: m.browStyle,
          thickness: m.browThickness,
          browGap: geo.eyes[index]?.browGap ?? 0.05,
          faceCenterX: 0.5
        });
        elements.push(
          <path key={`brow-fill-${index}`} d={poly(shaped)} fill={m.browColor}
            opacity={m.browIntensity * 0.34}
            style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.006}px)` }} />
        );
        buildBrowHairStrokes(shaped, 0.5, m.browIntensity).forEach((hair, hairIndex) => {
          elements.push(
            <path key={`brow-hair-${index}-${hairIndex}`}
              d={curvePath(hair.base, hair.control, hair.tip)}
              fill="none"
              stroke={m.browColor}
              strokeWidth={Math.max(0.45, hair.width * transform.renderedWidth)}
              strokeLinecap="round"
              opacity={0.18 + m.browIntensity * 0.38}
              style={{ mixBlendMode: 'multiply' }} />
          );
        });
      });
    }

    if (m.lashIntensity > 0.02) {
      geo.eyes.forEach((eye, eyeIndex) => {
        const lashes = buildLashCurves(eye, {
          style: m.lashStyle,
          intensity: m.lashIntensity,
          length: m.lashLength,
          curl: m.lashCurl
        });
        lashes.slice(1, -1).forEach((lash, lashIndex) => {
          elements.push(
            <path key={`lash-${eyeIndex}-${lashIndex}`}
              d={curvePath(lash.base, lash.control, lash.tip)}
              fill="none"
              stroke={m.eyelinerColor}
              strokeWidth={Math.max(0.65, lash.width * transform.renderedWidth)}
              strokeLinecap="round"
              opacity={0.32 + m.lashIntensity * 0.58} />
          );
        });
      });
    }

    if (m.eyelinerEnabled && m.eyelinerIntensity > 0.01) {
      geo.eyes.forEach((eye, index) => {
        const liner = buildEyelinerGeometry(eye, {
          style: m.eyelinerStyle,
          intensity: m.eyelinerIntensity,
          thickness: m.eyelinerThickness,
          wingLength: m.eyelinerWingLength,
          wingLift: m.eyelinerWingLift
        });
        const filter = liner.blur > 0
          ? `blur(${liner.blur * eye.h * transform.renderedHeight}px)`
          : undefined;
        elements.push(
          <path key={`liner-band-${index}`} d={poly(liner.band)} fill={m.eyelinerColor}
            opacity={0.55 + m.eyelinerIntensity * 0.45}
            style={{ filter }} />
        );
        if (liner.wing) {
          elements.push(
            <path key={`liner-wing-${index}`} d={poly(liner.wing.points)} fill={m.eyelinerColor}
              opacity={0.55 + m.eyelinerIntensity * 0.45}
              style={{ filter }} />
          );
        }
      });
    }

    if (m.highlightIntensity > 0.02) {
      const highlight = (key: string, point: Pt, radius: number, opacity: number) => {
        elements.push(
          <circle key={key} cx={X(point)} cy={Y(point)} r={radius} fill="#fff6ee"
            opacity={m.highlightIntensity * opacity}
            style={{ mixBlendMode: 'screen', filter: `blur(${unit * 0.028}px)` }} />
        );
      };
      const bridge = geo.noseBridge[Math.floor(geo.noseBridge.length / 2)] ?? geo.noseTip;
      highlight('highlight-bridge', bridge, unit * 0.045, 0.4);
      highlight('highlight-cupid', geo.cupidBow, unit * 0.04, 0.4);
      geo.cheekbones.forEach((point, index) =>
        highlight(`highlight-cheek-${index}`, point, unit * 0.09, 0.36)
      );
    }

    if (m.lipstickIntensity > 0.02) {
      elements.push(
        <path key="lipstick"
          d={`${poly(geo.lipsOuter)} ${poly(geo.lipsInner)}`}
          fillRule="evenodd"
          fill={m.lipstickColor}
          opacity={0.34 + m.lipstickIntensity * 0.6}
          style={{ mixBlendMode: 'multiply', filter: `blur(${unit * 0.004}px)` }} />
      );
      if (m.lipstickFinish !== 'matte') {
        const gloss = { x: geo.lipCenter.x, y: geo.lipCenter.y + geo.lipH * 0.16 };
        elements.push(
          <ellipse key="lip-gloss" cx={X(gloss)} cy={Y(gloss)}
            rx={geo.lipW * transform.renderedWidth * 0.2}
            ry={geo.lipH * transform.renderedHeight * 0.14}
            fill={lighten(m.lipstickColor, 0.72)}
            opacity={m.lipstickFinish === 'glow' ? 0.45 : 0.24}
            style={{ mixBlendMode: 'screen', filter: `blur(${unit * 0.016}px)` }} />
        );
      }
    }

    return elements;
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
