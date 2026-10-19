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

// --- Vie du ciel et des routes (pixels écran, uScale = taille de référence) ---
float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float glowPt(float dPx, float core){ return exp(-dPx * dPx / core) + 0.06 * exp(-dPx / (core * 2.5)); }

// Avion qui monte depuis Cointrin : silhouette et traînée de jour, feux de position et flash la nuit.
// a → b en fractions d’écran ; il traverse pendant ~60 % de la période, puis le ciel reste libre.
vec3 airplane(vec3 col, vec2 fc, float night, float seed, vec2 a, vec2 b, float period){
  float p = fract(uTime / period + seed) * 1.7 - 0.25;
  if (p < -0.15 || p > 1.15) return col;
  vec2 A = a * uRes, B = b * uRes;
  vec2 dir = normalize(B - A);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 pos = mix(A, B, p);
  vec2 q = fc - pos;
  float s = uScale * (0.75 + 0.5 * p);
  vec2 lq = vec2(dot(q, dir), dot(q, nrm)) / s;
  float day = 1.0 - night;
  // Traînée de condensation, seulement en altitude et de jour.
  float back = -lq.x;
  if (back > 8.0 && back < 420.0) {
    float w = 0.8 + back * 0.012;
    float tr = exp(-lq.y * lq.y / (w * w)) * (1.0 - back / 420.0) * smoothstep(0.35, 0.7, p);
    col = mix(col, vec3(0.92, 0.94, 0.97) * (0.6 + 0.4 * day), tr * 0.35 * day);
  }
  float d = sdSeg(lq, vec2(-7.0, 0.0), vec2(7.0, 0.0)) - 1.1;
  d = min(d, sdSeg(lq, vec2(1.5, 0.0), vec2(-2.5, 7.0)) - 0.7);
  d = min(d, sdSeg(lq, vec2(1.5, 0.0), vec2(-2.5, -7.0)) - 0.7);
  d = min(d, sdSeg(lq, vec2(-6.0, 0.0), vec2(-8.0, 2.8)) - 0.5);
  d = min(d, sdSeg(lq, vec2(-6.0, 0.0), vec2(-8.0, -2.8)) - 0.5);
  float sil = clamp(0.5 - d * s, 0.0, 1.0);
  col = mix(col, vec3(0.16, 0.17, 0.2), sil * day * 0.85);
  // Feux : rouge à gauche, vert à droite, flash blanc, phare d’atterrissage pendant la montée.
  vec2 wl = pos + (dir * -2.5 + nrm * 7.0) * s;
  vec2 wr = pos + (dir * -2.5 - nrm * 7.0) * s;
  float k = 0.35 + 0.65 * night;
  col += vec3(1.0, 0.12, 0.08) * glowPt(length(fc - wl) / uScale, 1.2) * k;
  col += vec3(0.15, 1.0, 0.35) * glowPt(length(fc - wr) / uScale, 1.2) * k;
  float strobe = step(fract(uTime * 1.1 + seed * 7.0), 0.06);
  col += vec3(1.0) * strobe * (glowPt(length(fc - wl) / uScale, 1.6) + glowPt(length(fc - wr) / uScale, 1.6)) * 1.5 * k;
  col += vec3(1.0, 0.95, 0.85) * glowPt(length(fc - pos - dir * 7.5 * s) / uScale, 2.0) * night * (1.0 - smoothstep(0.3, 0.6, p)) * 1.5;
  return col;
}

// Étoiles filantes, de temps en temps, seulement la nuit.
vec3 shootingStars(vec3 col, vec2 fc, float night){
  if (night < 0.05) return col;
  const float P = 6.5;
  for (int i = 0; i < 2; i++) {
    float tt = uTime / P + float(i) * 0.5;
    float slot = floor(tt) + float(i) * 100.0;
    float lt = fract(tt) * P;
    if (hash12(vec2(slot, 7.0)) < 0.3 || lt > 0.8) continue;
    vec2 a = vec2(0.1 + 0.8 * hash12(vec2(slot, 1.0)), 0.6 + 0.35 * hash12(vec2(slot, 2.0))) * uRes;
    vec2 dir = normalize(vec2((hash12(vec2(slot, 4.0)) > 0.5 ? 1.0 : -1.0) * (0.7 + 0.6 * hash12(vec2(slot, 3.0))), -0.5));
    float len = (180.0 + 160.0 * hash12(vec2(slot, 5.0))) * uScale;
    float prog = lt / 0.8;
    vec2 head = a + dir * len * prog;
    vec2 tail = a + dir * len * max(0.0, prog - 0.4);
    float d = sdSeg(fc, tail, head) / uScale;
    float along = clamp(dot(fc - tail, dir) / max(1.0, length(head - tail)), 0.0, 1.0);
    col += vec3(0.85, 0.92, 1.0) * night * sin(PI * prog) * along * along * exp(-d * d / 0.9) * 1.6;
  }
  return col;
}

// Petit vol d’oiseaux qui traverse le ciel, de jour.
vec3 birds(vec3 col, vec2 fc, float day, float seed, float y){
  if (day < 0.05) return col;
  float k = fract(uTime / 52.0 + seed);
  vec2 c = vec2(mix(-0.15, 1.15, k), y + 0.04 * sin(k * 9.0 + seed)) * uRes;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 o = vec2(-fi * 16.0 - 8.0 * hash12(vec2(fi, seed)), (hash12(vec2(fi, seed + 3.0)) - 0.5) * 36.0 + 3.0 * sin(uTime * 0.7 + fi)) * uScale;
    vec2 q = (fc - c - o) / uScale;
    float flap = sin(uTime * 8.0 + fi * 1.9);
    float d = min(sdSeg(q, vec2(0.0), vec2(-4.5, 1.5 + 2.5 * flap)), sdSeg(q, vec2(0.0), vec2(4.5, 1.5 + 2.5 * flap)));
    col = mix(col, vec3(0.05, 0.06, 0.09), clamp(0.7 - d * uScale, 0.0, 1.0) * day * 0.75);
  }
  return col;
}

// Voitures sur une voie horizontale (y en pixels) : silhouettes simplifiées (nez arrondi, pare-brise incliné,
// roues), vitres sombres et ombre de contact de jour, phares et feux la nuit.
// n voitures, dans les deux sens ; px = taille d’une voiture (pixels).
vec3 traffic(vec3 col, vec2 fc, float y, float night, float light, float px, float seed){
  if (abs(fc.y - y) > px * 4.0) return col;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float speed = 0.035 + 0.02 * hash12(vec2(fi, seed));
    float x = (fract(uTime * speed * dir + hash12(vec2(fi, seed + 1.0))) * 1.4 - 0.2) * uRes.x;
    float lane = y + dir * px * 0.35;
    vec2 q = (fc - vec2(x, lane)) / px;
    if (abs(q.x) < 2.2 && q.y > -0.4 && q.y < 1.3) {
      // Repère de la voiture : fx vers l’avant, roues posées en y = -0.05.
      float fx = q.x * dir;
      // Ombre de contact douce sur la chaussée.
      float sh = (1.0 - smoothstep(1.2, 1.9, abs(fx))) * exp(-(q.y + 0.04) * (q.y + 0.04) / 0.012);
      col *= 1.0 - 0.45 * sh * (1.0 - night * 0.85);
      // Caisse aux angles arrondis (nez plus rond que l’arrière), habitacle en trapèze, deux roues.
      float rc = fx > 0.0 ? 0.22 : 0.13;
      vec2 bd = abs(vec2(fx, q.y - 0.37)) - vec2(1.6, 0.27) + rc;
      float body = length(max(bd, 0.0)) + min(max(bd.x, bd.y), 0.0) - rc;
      float tz = clamp((q.y - 0.6) / 0.52, 0.0, 1.0);
      float cab = max(max(fx - mix(0.78, 0.22, tz), mix(-1.3, -1.02, tz) - fx) * 0.72, max(0.5 - q.y, q.y - 1.12));
      float wd = min(length(vec2(fx - 1.0, q.y - 0.2)), length(vec2(fx + 1.02, q.y - 0.2)));
      float wheel = wd - 0.25;
      float m = clamp(0.5 - min(min(body, cab), wheel) * px, 0.0, 1.0);
      if (m > 0.0) {
        vec3 paint = mix(vec3(0.75, 0.76, 0.78), mix(vec3(0.55, 0.08, 0.06), vec3(0.08, 0.12, 0.25), step(0.5, hash12(vec2(fi, seed + 4.0)))), step(0.45, hash12(vec2(fi, seed + 2.0))));
        // Lumière douce : dessus et ligne d’épaule plus clairs, bas de caisse dans l’ombre.
        vec3 c = paint * (0.7 + 0.35 * smoothstep(0.12, 0.6, q.y) + 0.18 * exp(-(q.y - 0.58) * (q.y - 0.58) / 0.004));
        c *= 1.0 - 0.35 * (1.0 - smoothstep(0.12, 0.22, q.y));
        // Vitres sombres (reflet du ciel vers le haut) et montant central.
        float gd = max(max(cab + 0.1, 0.66 - q.y), 0.06 - abs(fx + 0.28));
        c = mix(c, mix(vec3(0.035, 0.04, 0.055), vec3(0.13, 0.15, 0.19), smoothstep(0.7, 1.08, q.y)), clamp(0.5 - gd * px, 0.0, 1.0));
        // Optiques : phare clair à l’avant, feu rouge à l’arrière.
        float hl = max(abs(fx - 1.52) - 0.09, abs(q.y - 0.34) - 0.07);
        c = mix(c, vec3(0.95, 0.92, 0.82), clamp(0.5 - hl * px, 0.0, 1.0));
        float tl = max(abs(fx + 1.53) - 0.08, abs(q.y - 0.36) - 0.07);
        c = mix(c, vec3(0.55, 0.05, 0.04), clamp(0.5 - tl * px, 0.0, 1.0));
        // Pneus et jantes.
        c = mix(c, vec3(0.03), clamp(0.5 - wheel * px, 0.0, 1.0));
        c = mix(c, vec3(0.32, 0.33, 0.35), clamp(0.5 - (wd - 0.1) * px, 0.0, 1.0));
        col = mix(col, c * light, m * (1.0 - night * 0.85));
      }
    }
    vec2 front = vec2(x + dir * 1.6 * px, lane + 0.3 * px);
    vec2 rear = vec2(x - dir * 1.6 * px, lane + 0.3 * px);
    col += vec3(1.0, 0.93, 0.8) * glowPt(length(fc - front) / uScale, 1.6) * (0.25 + 1.4 * night);
    col += vec3(1.0, 0.1, 0.05) * glowPt(length(fc - rear) / uScale, 1.3) * (0.15 + 0.9 * night);
    // Faisceau des phares sur la route, la nuit.
    vec2 bq2 = (fc - front) / uScale;
    if (bq2.x * dir > 0.0) col += vec3(1.0, 0.9, 0.7) * night * 0.08 * exp(-abs(bq2.y) / 4.0) * exp(-abs(bq2.x) / 60.0);
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