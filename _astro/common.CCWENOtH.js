function e(e,t){let n=`#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uRes;     // canevas (px)
uniform float uTime;   // temps lent (s), 0 en pause
uniform float uScale;  // min(uRes) / 900
uniform vec2 uPar;     // parallaxe du pointeur (px)
uniform float uFade;   // ouverture (0 → 1)
uniform float uMobile; // 1 sur écran étroit
uniform float uV[16];
const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
// Aire commune de deux disques (rayons r1, r2, centres à distance d).
float lensArea(float d, float r1, float r2){
  if (d >= r1 + r2) return 0.0;
  if (d <= abs(r2 - r1)) return PI * min(r1, r2) * min(r1, r2);
  float a = r1 * r1 * acos(clamp((d * d + r1 * r1 - r2 * r2) / (2.0 * d * r1), -1.0, 1.0));
  float b = r2 * r2 * acos(clamp((d * d + r2 * r2 - r1 * r1) / (2.0 * d * r2), -1.0, 1.0));
  float c = 0.5 * sqrt(max(0.0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  return a + b - c;
}
// Fraction de photosphère visible pour un décalage lunaire d (rayons solaires).
float sunFraction(float d){ return 1.0 - lensArea(abs(d), 1.0, 1.025) / PI; }

// Petit Soleil éclipsé, en rayons solaires autour de son centre (q), décalage lunaire d dans la direction dir.
// px = taille d’un pixel en rayons solaires. Renvoie une luminance linéaire (photosphère ≈ 6, couronne ≈ 0,5).
vec3 eclipseSun(vec2 q, float d, vec2 dir, float px){
  float r = length(q);
  float frac = sunFraction(d);
  float moon = smoothstep(1.025 - px, 1.025 + px, length(q - dir * d));
  float disc = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
  float mu = sqrt(max(0.0, 1.0 - r * r));
  vec3 col = disc * moon * 6.0 * (1.0 - 0.55 * (1.0 - mu)) * vec3(1.0, 0.93, 0.82);
  // Éblouissement proportionnel à la lumière restante.
  col += vec3(1.0, 0.94, 0.86) * frac * (0.9 / (1.0 + r * r * 3.0) + 0.12 / (1.0 + r * r * 0.15)) * (1.0 - disc * moon);
  // Couronne et halo, seulement près de la totalité.
  float tot = 1.0 - smoothstep(0.0, 0.03, frac);
  if (tot > 0.0 && r > 1.0) {
    float th = atan(q.y, q.x);
    float lr = log(r);
    vec2 u = q / r;
    float rays = vnoise(u * 7.0 + lr * 0.35 + 3.0) * 0.55 + vnoise(u * 26.0 + lr * 0.2 - uTime * 0.01) * 0.45;
    float helm = pow(abs(cos(th - 0.4)), 3.0);
    float I = (0.9 * pow(r, -6.0) + 0.06 * pow(r, -2.4) * (0.5 + 1.3 * helm)) * (0.72 + 0.56 * rays);
    col += moon * tot * I * vec3(0.95, 0.97, 1.0) * 2.4;
    // Diffusion dans l’atmosphère : la couronne se fond dans la nuit, sans bord.
    col += moon * tot * vec3(0.72, 0.8, 0.98) * (0.09 * exp(-(r - 1.0) / 0.5) + 0.035 * exp(-(r - 1.0) / 2.2));
    // Chromosphère : fin liseré rose.
    col += moon * tot * vec3(1.0, 0.25, 0.4) * 1.2 * exp(-(r - 1.0) / 0.012);
  }
  return col;
}

vec3 aces(vec3 c){
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c = IN * (c / 0.6);
  vec3 a = c * (c + 0.0245786) - 0.000090537;
  vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
  return clamp(OUT * (a / b), 0.0, 1.0);
}
vec3 toSrgb(vec3 c){
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, 12.92 * c, step(c, vec3(0.0031308)));
}
\n${t.params.map((e,t)=>`#define P_${e} uV[${t}]`).join(`
`)}\n${t.frag}\n
void main(){
  vec3 col = toSrgb(aces(scene(gl_FragCoord.xy) * uFade));
  float n1 = hash12(gl_FragCoord.xy);
  float n2 = hash12(gl_FragCoord.yx + 3.1);
  col += (n1 + n2 - 1.0) / 255.0;
  outColor = vec4(col, 1.0);
}`,r=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader`);return r};try{let t=e.createProgram();if(e.attachShader(t,r(e.VERTEX_SHADER,`#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`)),e.attachShader(t,r(e.FRAGMENT_SHADER,n)),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw Error(e.getProgramInfoLog(t)??`link`);return e.useProgram(t),e.bindVertexArray(e.createVertexArray()),t}catch(e){return console.warn(`[totalité] scène indisponible, repli conservé.`,e),null}}export{e as buildProgram};