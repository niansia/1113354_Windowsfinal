precision highp float;

uniform float uCore;
uniform float uGlow;

varying vec3 vColor;
varying float vAlpha;
varying float vPulse;

void main() {
  vec2 uv = gl_PointCoord.xy - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) {
    discard;
  }

  float soft = smoothstep(0.5, 0.03, d);
  float core = smoothstep(0.22, 0.0, d);
  float halo = pow(max(0.0, 1.0 - d * 2.0), 1.8);
  vec3 color = vColor * (0.24 + core * 0.82 + halo * (0.22 + uGlow * 0.055) + uCore * 0.32);
  float alpha = soft * vAlpha * (0.042 + core * 0.036 + vPulse * 0.018 + uCore * 0.035);

  gl_FragColor = vec4(color, alpha);
}
