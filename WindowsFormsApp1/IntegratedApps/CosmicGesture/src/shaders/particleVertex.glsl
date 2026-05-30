attribute vec3 aExpanded;
attribute vec3 aCore;
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uExpansion;
uniform float uCore;
uniform float uFocus;
uniform float uGlow;
uniform float uInteractionStrength;
uniform vec3 uInteractionPoint;

varying vec3 vColor;
varying float vAlpha;
varying float vPulse;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec3 base = position;
  vec3 expanded = aExpanded;
  vec3 core = aCore;

  vec3 p = mix(base, expanded, smoothstep(0.0, 1.0, uExpansion));
  p = mix(p, core, smoothstep(0.0, 1.0, uCore));

  vec3 normal = normalize(base + vec3(0.0001));
  float pulse = sin(uTime * (1.45 + hash(aSeed) * 1.8) + aSeed * 6.28318);
  float breath = (0.012 + 0.022 * uCore + 0.012 * uFocus) * pulse;
  p += normal * breath;

  float interactDistance = distance(p, uInteractionPoint);
  float interaction = smoothstep(1.35, 0.0, interactDistance) * uInteractionStrength;
  p += normal * interaction * 0.065;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depthScale = clamp(5.2 / max(1.0, -mvPosition.z), 0.16, 2.7);
  float twinkle = 0.78 + 0.42 * sin(uTime * (2.2 + hash(aSeed + 3.0) * 4.0) + aSeed * 12.1);
  gl_PointSize = aSize * uPixelRatio * depthScale * (1.0 + uFocus * 0.18 + uCore * 0.44 + interaction * 1.35);

  vColor = aColor * (1.0 + interaction * 1.25 + uCore * 0.42 + uGlow * 0.08);
  vAlpha = clamp(0.45 + twinkle * 0.5 + uFocus * 0.16 + uCore * 0.06 + interaction * 0.55, 0.0, 1.35);
  vPulse = twinkle;
}
