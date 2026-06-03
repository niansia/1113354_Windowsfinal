// Shared soft-particle vertex shader for every deep-space object (nebula, galaxy,
// cluster, star, accretion disk). Per-particle colour / size / alpha drive the look,
// while uDrift adds gentle volumetric turbulence so gas clouds feel alive.

attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uDrift;     // turbulence amount (0 = rigid stars, 1 = churning gas)
uniform float uTwinkle;   // how much per-particle brightness flickers
uniform float uScale;     // global size multiplier (focus zoom)

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;

  // Cheap pseudo-curl drift: each particle wanders on a small looping path.
  if (uDrift > 0.0001) {
    float t = uTime * 0.18 + aSeed * 6.2831;
    vec3 wob = vec3(
      sin(t + p.z * 0.6),
      cos(t * 1.13 + p.x * 0.5),
      sin(t * 0.87 + p.y * 0.7)
    );
    p += wob * uDrift * (0.06 + aSize * 0.02);
  }

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depthScale = clamp(7.0 / max(1.0, -mvPosition.z), 0.18, 3.4);
  gl_PointSize = aSize * uPixelRatio * depthScale * uScale;

  float flicker = 1.0 - uTwinkle * 0.5 + uTwinkle * 0.5 * sin(uTime * (2.0 + aSeed * 5.0) + aSeed * 12.0);
  vColor = aColor;
  vAlpha = aAlpha * flicker;
}
