import type { CSSProperties } from 'react';
import type { FaceModel, FeatureEllipse, MakeupStyle } from '../../style/styleTypes';

interface MakeupPortraitProps {
  model: FaceModel;
  makeup: MakeupStyle;
  onReady?: () => void;
}

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/** Absolute box for an elliptical feature region, normalized over the photo. */
const region = (e: FeatureEllipse, extra?: CSSProperties): CSSProperties => ({
  position: 'absolute',
  left: pct(e.x - e.rx),
  top: pct(e.y - e.ry),
  width: pct(e.rx * 2),
  height: pct(e.ry * 2),
  borderRadius: '50%',
  pointerEvents: 'none',
  transform: e.angle ? `rotate(${e.angle}deg)` : undefined,
  ...extra
});

const shift = (e: FeatureEllipse, patch: Partial<FeatureEllipse>): FeatureEllipse => ({ ...e, ...patch });

const blendFor = (finish: MakeupStyle['eyeshadowFinish']): CSSProperties['mixBlendMode'] =>
  finish === 'matte' ? 'multiply' : finish === 'glow' ? 'screen' : 'soft-light';

/**
 * Renders a real portrait photo with live, feathered makeup layers composited
 * on top via CSS blend modes — a virtual makeup mirror (no pixel reads, so it
 * stays CORS-safe for hot-linked photos).
 */
export function MakeupPortrait({ model, makeup, onReady }: MakeupPortraitProps) {
  const lm = model.landmarks;
  const eyes = [lm.leftEye, lm.rightEye];
  const cheeks = [lm.leftCheek, lm.rightCheek];

  const lipOpacity = 0.16 + makeup.lipstickIntensity * 0.72;
  const eyeOpacity = 0.1 + makeup.eyeshadowIntensity * 0.62;
  const blushOpacity = makeup.blushIntensity * 0.55;
  const linerOpacity = makeup.eyelinerEnabled ? 0.4 + makeup.eyelinerIntensity * 0.5 : 0;

  return (
    <div className="makeup-portrait" style={{ aspectRatio: String(model.aspect) }}>
      <img
        className="makeup-photo"
        src={model.photo}
        alt={model.name}
        draggable={false}
        referrerPolicy="no-referrer"
        onLoad={() => onReady?.()}
        onError={() => onReady?.()}
      />
      <div className="makeup-overlays" aria-hidden="true">
        {/* blush */}
        {blushOpacity > 0.02 && cheeks.map((cheek, i) => (
          <div
            key={`blush-${i}`}
            className="mk-layer mk-blush"
            style={region(cheek, {
              background: `radial-gradient(closest-side, ${makeup.blushColor}, transparent 72%)`,
              opacity: blushOpacity,
              mixBlendMode: 'soft-light'
            })}
          />
        ))}

        {/* eyeshadow on the lid above each eye */}
        {eyeOpacity > 0.02 && eyes.map((eye, i) => (
          <div
            key={`shadow-${i}`}
            className="mk-layer mk-eyeshadow"
            style={region(shift(eye, { y: eye.y - eye.ry * 0.85, rx: eye.rx * 1.5, ry: eye.ry * 1.75 }), {
              background: `radial-gradient(closest-side, ${makeup.eyeshadowColor}, transparent 78%)`,
              opacity: eyeOpacity,
              mixBlendMode: blendFor(makeup.eyeshadowFinish)
            })}
          />
        ))}

        {/* eyeliner along the upper lash line */}
        {linerOpacity > 0.02 && eyes.map((eye, i) => (
          <div
            key={`liner-${i}`}
            className="mk-layer mk-liner"
            style={region(shift(eye, { y: eye.y - eye.ry * 0.5, rx: eye.rx * 1.06, ry: Math.max(0.006, eye.ry * 0.22) }), {
              background: '#150f1d',
              opacity: linerOpacity,
              mixBlendMode: 'multiply'
            })}
          />
        ))}

        {/* lipstick + gloss */}
        {lipOpacity > 0.02 && (
          <div
            className="mk-layer mk-lip"
            style={region(lm.lips, {
              background: makeup.lipstickColor,
              opacity: lipOpacity,
              mixBlendMode: 'multiply'
            })}
          />
        )}
        {lipOpacity > 0.02 && makeup.lipstickFinish !== 'matte' && (
          <div
            className="mk-layer mk-lip-gloss"
            style={region(shift(lm.lips, { y: lm.lips.y + lm.lips.ry * 0.1, ry: lm.lips.ry * 0.66, rx: lm.lips.rx * 0.82 }), {
              opacity: makeup.lipstickFinish === 'glow' ? 0.5 : 0.26
            })}
          />
        )}
      </div>
    </div>
  );
}
