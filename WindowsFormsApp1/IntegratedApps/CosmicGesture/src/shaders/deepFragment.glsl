precision highp float;

uniform float uSoftness; // 0 = tight star, 1 = soft diffuse gas

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord.xy - vec2(0.5);
  float d = length(uv) * 2.0; // 0 at centre, 1 at edge
  if (d > 1.0) discard;

  // Gaussian-ish falloff: gas blends into a soft volumetric haze, stars stay crisp.
  float k = mix(7.0, 1.7, uSoftness);
  float fall = exp(-d * d * k);
  // tiny bright core keeps embedded stars sparkling even in soft mode
  float core = smoothstep(0.34, 0.0, d) * (1.0 - uSoftness * 0.55);

  float alpha = clamp((fall + core) * vAlpha, 0.0, 1.0);
  vec3 color = vColor * (0.82 + core * 1.2) + core * 0.22;

  gl_FragColor = vec4(color, alpha);
}
