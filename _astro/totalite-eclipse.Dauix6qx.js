var e=`
uniform vec4 uPlace;

float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float glowPt(float dPx, float core){ return exp(-dPx * dPx / core) + 0.06 * exp(-dPx / (core * 2.5)); }

vec3 placeAirplane(vec3 col, vec2 fc, float night, float seed, vec2 a, vec2 b, float period){
  float p = fract(uTime / period + seed) * 1.7 - 0.25;
  if (p < -0.15 || p > 1.15) return col;
  vec2 A = a * uRes, B = b * uRes;
  vec2 dir = normalize(B - A);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 pos = mix(A, B, p);
  float s = uScale * (0.75 + 0.5 * p);
  vec2 q = fc - pos;
  vec2 lq = vec2(dot(q, dir), dot(q, nrm)) / s;
  float day = 1.0 - night;
  float back = -lq.x;
  if (back > 8.0 && back < 420.0) {
    float w = 0.8 + back * 0.012;
    col = mix(col, vec3(0.92, 0.94, 0.97) * 0.4, exp(-lq.y * lq.y / (w * w)) * (1.0 - back / 420.0) * smoothstep(0.35, 0.7, p) * 0.3 * day);
  }
  // Loin de l’avion (> 48 longueurs), silhouette et feux ne pèsent plus rien : on s’arrête à la traînée.
  if (abs(lq.x) > 48.0 || abs(lq.y) > 48.0) return col;
  float d = sdSeg(lq, vec2(-7.0, 0.0), vec2(7.0, 0.0)) - 1.1;
  d = min(d, sdSeg(lq, vec2(1.5, 0.0), vec2(-2.5, 7.0)) - 0.7);
  d = min(d, sdSeg(lq, vec2(1.5, 0.0), vec2(-2.5, -7.0)) - 0.7);
  d = min(d, sdSeg(lq, vec2(-6.0, 0.0), vec2(-8.0, 2.8)) - 0.5);
  d = min(d, sdSeg(lq, vec2(-6.0, 0.0), vec2(-8.0, -2.8)) - 0.5);
  col = mix(col, vec3(0.05, 0.055, 0.07), clamp(0.5 - d * s, 0.0, 1.0) * day * 0.85);
  vec2 wl = pos + (dir * -2.5 + nrm * 7.0) * s;
  vec2 wr = pos + (dir * -2.5 - nrm * 7.0) * s;
  float k = 0.12 + 0.3 * night;
  col += vec3(1.0, 0.12, 0.08) * glowPt(length(fc - wl) / uScale, 1.2) * k;
  col += vec3(0.15, 1.0, 0.35) * glowPt(length(fc - wr) / uScale, 1.2) * k;
  float strobe = step(fract(uTime * 1.1 + seed * 7.0), 0.06);
  col += vec3(1.0) * strobe * (glowPt(length(fc - wl) / uScale, 1.6) + glowPt(length(fc - wr) / uScale, 1.6)) * 0.5 * k;
  return col;
}

// Vie du ciel, ajoutée au ciel avant le premier plan.
vec3 placeSky(vec3 S, vec2 fc){
  float night = 1.0 - smoothstep(0.05, 0.4, uDay);
  S = placeAirplane(S, fc, night, 0.15, vec2(-0.05, 0.42), vec2(1.05, 0.95), 38.0);
  S = placeAirplane(S, fc, night, 0.62, vec2(1.05, 0.55), vec2(-0.05, 0.9), 53.0);
  // Vol d’oiseaux, de jour.
  if (uDay > 0.08) {
    float k = fract(uTime / 50.0 + 0.3);
    vec2 c = vec2(mix(-0.15, 1.15, k), 0.66 + 0.04 * sin(k * 9.0)) * uRes;
    // Boîte englobante du vol (unités de q) : le reste de l’écran saute les six segments par pixel.
    vec2 bq = (fc - c) / uScale;
    if (bq.x > -100.0 && bq.x < 12.0 && bq.y > -26.0 && bq.y < 34.0)
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 o = vec2(-fi * 16.0 - 8.0 * hash12(vec2(fi, 0.3)), (hash12(vec2(fi, 3.3)) - 0.5) * 36.0 + 3.0 * sin(uTime * 0.7 + fi)) * uScale;
      vec2 q = (fc - c - o) / uScale;
      float flap = sin(uTime * 8.0 + fi * 1.9);
      float d = min(sdSeg(q, vec2(0.0), vec2(-4.5, 1.5 + 2.5 * flap)), sdSeg(q, vec2(0.0), vec2(4.5, 1.5 + 2.5 * flap)));
      S = mix(S, vec3(0.02, 0.025, 0.04) * uDay, clamp(0.7 - d * uScale, 0.0, 1.0) * smoothstep(0.08, 0.3, uDay) * 0.8);
    }
  }
  return S;
}

// Ligne des toits du premier plan SVG (px depuis le bas du canevas).
float placeHz(){ return uPlace.z; }
`,t=[[6e-4,23,1.3],[5e-4,37,4.1],[45e-5,59,2.2],[35e-5,83,5],[28e-5,127,.7],[22e-5,173,3.3],[16e-5,251,1.9]],n=1.025,r=.62,i=t.map(([e,t,n])=>`${e.toFixed(5)}*sin(${t.toFixed(1)}*a+${n.toFixed(2)})`).join(`+`),a=`#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,o=`#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;      // taille du canevas (px)
uniform vec2 uSun;      // centre du Soleil (px, origine en bas à gauche)
uniform float uR;       // rayon solaire (px)
uniform vec2 uMoon;     // décalage de la Lune (R)
uniform float uE;       // exposition
uniform float uF;       // fraction de photosphère visible
uniform float uScale;   // px par « pixel de référence » (min(res)/900)
uniform float uCorona;  // 0 quand la couronne est invisible : on évite son coût
uniform int uEmN;
uniform vec4 uEm[24];   // éblouissement : xy (R), z amplitude affichée
uniform vec3 uStar;     // anneau de diamant : xy (R), z amplitude
uniform float uGlow;    // halo élargi tant que le croissant reste large
uniform float uFade;    // ouverture de l’intro (0 → 1)
uniform float uDay;     // lumière du jour perçue (0 nuit de totalité → 1 plein jour), adaptée comme un œil
uniform float uTot;     // crépuscule de totalité : étoiles, planètes, lueur d’horizon (0 → 1)
uniform float uTime;    // temps lent (s) : scintillement, rotation diurne, respiration de la couronne
uniform vec2 uPar;      // parallaxe du ciel (px) : défilement et pointeur
uniform float uBands;   // ombres volantes, juste avant et après la totalité (0 → 1)
uniform float uCam;     // zoom du ciel étoilé (suit en partie la taille du Soleil)

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;
const float SUN = 1.0e6;
const float RM = ${n.toFixed(4)};

// Protubérances : angle de position, demi-largeur (rad), hauteur (R), forme (0 boucle → 1 nuage)
const vec4 PROM[3] = vec4[3](
  vec4(2.62, 0.045, 0.050, 0.3),
  vec4(4.05, 0.060, 0.038, 1.0),
  vec4(0.55, 0.035, 0.060, 0.7)
);

float limb(float a){ return ${i}; }

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Bruit de valeur périodique en x (angle autour du Soleil).
float pnoise(vec2 p, float per){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float i0 = mod(i.x, per);
  float i1 = mod(i.x + 1.0, per);
  float a = hash12(vec2(i0, i.y));
  float b = hash12(vec2(i1, i.y));
  float c = hash12(vec2(i0, i.y + 1.0));
  float d = hash12(vec2(i1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p, float per){
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * pnoise(p, per);
    p *= 2.0;
    per *= 2.0;
    a *= 0.5;
  }
  return s / 0.875;
}

// Couronne K+F : profil de Baumbach, jets fins étirés le long de lignes de champ superradiales,
// streamers en casque près de l’équateur solaire, plumes polaires fines.
vec3 corona(float r, float th){
  float rr = max(r, 1.0);
  float B = 0.0532 * pow(rr, -2.5) + 1.425 * pow(rr, -7.0) + 2.565 * pow(rr, -17.0);
  float Bv = 4.04 * pow(B / 4.04, 0.8);

  float a = th - 0.42;                    // équateur solaire incliné
  float ca = cos(a);
  float sa = sin(a);
  float lat = asin(clamp(sa, -1.0, 1.0));
  float s = abs(lat) / (0.5 * PI);        // 0 équateur → 1 pôle
  float k = 1.0 + 1.8 * (1.0 - 1.0 / rr); // expansion superradiale
  float lat0 = sign(sa) * pow(s, 1.0 / k) * 0.5 * PI;
  float th0 = ca >= 0.0 ? lat0 : PI - lat0;
  float u = fract(th0 / TAU);
  float lr = log(rr);

  float t = uTime;
  // Les jets ondulent très lentement ; la structure dérive vers l’extérieur.
  u = fract(u + 0.0016 * sin(t * 0.21 + lr * 5.0 + u * 31.0) + 0.0008 * sin(t * 0.13 + u * 97.0));
  float rays = fbm3(vec2(u * 64.0, lr * 1.4 - t * 0.008), 64.0);
  float fine = pnoise(vec2(u * 260.0, lr * 0.8 - t * 0.005), 260.0);
  // Jets fins mais peu contrastés près du limbe ; la structure ne se lit qu’au loin.
  float contrast = smoothstep(1.0, 1.6, rr);
  float streak = mix(1.0, 0.45 + 1.6 * pow(rays, 2.0), 0.22 + 0.4 * contrast);
  streak *= 1.0 + mix(0.12, 0.3, s) * (fine - 0.5) * 2.0 * contrast;

  // Streamers en casque : bulbe large près du limbe, tige étroite au loin.
  float m = 1.0 + 1.4 * (rr - 1.0);
  float side = ca >= 0.0 ? 0.0 : 19.0;
  float hn = pnoise(vec2(lat * m * 2.2 + side + 5.0, lr * 0.5 + 2.0), 1.0e4);
  float helm = smoothstep(0.45, 0.95, hn) * exp(-pow(lat * m / 0.75, 2.0));

  float shape = mix(1.0, 0.3, pow(s, 1.5) * smoothstep(1.0, 1.8, rr));
  float breath = 1.0 + 0.035 * sin(t * 0.52) + 0.02 * sin(t * 0.23 + 1.3);
  float I = Bv * streak * shape * (1.0 + 4.4 * helm * smoothstep(1.0, 1.4, rr)) * breath;
  vec3 tint = mix(vec3(1.0, 0.97, 0.94), vec3(0.88, 0.92, 1.0), smoothstep(1.0, 3.0, rr));
  return I * tint;
}

vec3 prominences(float th, float h){
  float tot = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 P = PROM[i];
    float da = atan(sin(th - P.x), cos(th - P.x));
    if (abs(da) > P.y * 1.7) continue;
    vec2 e = vec2(da / P.y, h / P.z);
    float n = fbm3(vec2(da * 70.0 + float(i) * 13.0 + 0.5 * sin(uTime * 0.7 + float(i)), h * 45.0 - uTime * 0.04), 1.0e4);
    float ring = exp(-pow((length(e) - 0.78) / 0.2, 2.0));
    float cloud = (1.0 - smoothstep(0.15, 1.0, length(e * vec2(0.9, 1.0)))) * n;
    float body = mix(ring * (0.15 + 1.4 * n * n), cloud * 1.5, P.w);
    tot += body * body * smoothstep(0.0, 0.003, h);
  }
  return tot * 16.0 * vec3(1.0, 0.16, 0.28);
}

vec3 aces(vec3 c){
  const mat3 IN = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(
    vec3( 1.60475, -0.10208, -0.00327),
    vec3(-0.53108,  1.10813, -0.07276),
    vec3(-0.07367, -0.00605,  1.07602));
  c = IN * (c / 0.6);
  vec3 a = c * (c + 0.0245786) - 0.000090537;
  vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
  return clamp(OUT * (a / b), 0.0, 1.0);
}

vec3 toSrgb(vec3 c){
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, 12.92 * c, step(c, vec3(0.0031308)));
}

${e}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float px = 1.0 / uR;
  vec2 q = (fc - uSun) * px;
  float r = length(q);
  float th = atan(q.y, q.x);

  // Lune : limbe montagneux, bord net (≈ 1 px).
  vec2 qm = q - uMoon;
  float dm = length(qm);
  float rm = RM + limb(atan(qm.y, qm.x));
  float aa = 0.7 * px + 0.0003;
  float vis = smoothstep(rm - aa, rm + aa, dm);

  vec3 L = vec3(0.0);

  // Photosphère avec assombrissement centre-bord, limbe plus chaud.
  float disc = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
  if (disc > 0.0) {
    float mu = sqrt(max(0.0, 1.0 - r * r));
    float ld = 1.0 - ${r.toFixed(2)} * (1.0 - mu);
    L += SUN * ld * disc * vis * vec3(1.0, 0.90 + 0.06 * mu, 0.78 + 0.12 * mu);
  }

  float h = r - 1.0;
  if (uCorona > 0.5) {
    // Au-delà de ~7 R, la couronne est invisible à l’écran : on évite son calcul.
    if (r < 9.0) L += vis * (1.0 - disc) * corona(r, th) * (1.0 - smoothstep(6.5, 9.0, r));
    // Chromosphère : frange rose très fine, hérissée de spicules.
    if (h > -2.0 * px && h < 0.02) {
      float sp = pnoise(vec2(fract(th / TAU) * 520.0, h * 90.0 - uTime * 0.06), 520.0);
      float chrom = exp(-max(h, 0.0) / (0.0024 + 0.0034 * sp)) * smoothstep(-px, px, h);
      L += vis * chrom * 26.0 * vec3(1.0, 0.13, 0.26);
    }
    if (h > 0.0 && h < 0.12) L += vis * prominences(th, h);
  }

  // Ciel, en unités d’affichage (hors exposition du Soleil) : bleu de jour qui s’assombrit et refroidit
  // avec le croissant, puis nuit de totalité avec lueur d’horizon orangée tout autour.
  float v = fc.y / uRes.y;
  vec3 zenith = vec3(0.030, 0.105, 0.400);
  vec3 low = vec3(0.140, 0.280, 0.620);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, v));
  // Auréole : le ciel s’éclaircit autour du Soleil.
  float ds0 = length(fc - uSun) / uScale;
  daySky += vec3(0.28, 0.33, 0.40) * exp(-ds0 / 260.0);
  vec3 cool = mix(vec3(0.62, 0.70, 1.05), vec3(1.0), uDay);
  vec3 S = daySky * cool * uDay;
  float t = uTime;
  vec2 sp0 = fc + uPar;
  // Voiles d’altitude : cirrus très légers, étirés et lents, visibles seulement de jour.
  if (uDay > 0.02) {
    vec2 cp = vec2(sp0.x / (uScale * 900.0) + t * 0.003, sp0.y / (uScale * 70.0) + t * 0.001);
    float ci = fbm3(cp + vec2(0.0, 0.6 * pnoise(cp * vec2(0.5, 0.2), 1.0e4)), 1.0e4);
    float veil = smoothstep(0.6, 0.9, ci) * smoothstep(0.35, 0.95, v);
    S += vec3(0.30, 0.33, 0.38) * veil * 0.06 * uDay;
  }
  // Ombres volantes : ondulations fines et rapides du ciel juste avant et après la totalité.
  if (uBands > 0.001) {
    vec2 bp = fc / uScale;
    float wob = pnoise(vec2(bp.x * 0.004 + t * 0.4, bp.y * 0.004), 1.0e4);
    float band = sin(dot(bp, vec2(0.34, 0.94)) * 0.11 + t * 4.2 + wob * 5.0);
    S *= 1.0 + 0.06 * uBands * band;
  }
  float tw = uTot;
  float pulse = 1.0 + 0.07 * sin(t * 0.35) + 0.04 * sin(t * 0.13 + fc.x / uRes.x * 6.0);
  // La lueur se pose sur l’horizon du paysage quand la caméra s’est élevée (bas de l’écran sinon).
  float vh = max(fc.y - placeHz(), 0.0) / uRes.y;
  S += vec3(0.0035, 0.0050, 0.0120)
     + tw * (vec3(0.060, 0.034, 0.050) * exp(-vh / 0.20)
           + (vec3(0.420, 0.170, 0.050) * exp(-vh / 0.055)
           + vec3(0.300, 0.230, 0.120) * exp(-vh / 0.018)) * pulse);
  if (tw > 0.01) {
    // Étoiles : rotation diurne lente autour d’un pôle hors écran, parallaxe, scintillement atmosphérique
    // différencié (plus fort et coloré près de l’horizon).
    // Le ciel étoilé suit le Soleil (même caméra) : rien ne glisse « sous » l’éclipse comme un décor collé.
    vec2 rp = (fc - uSun) / uCam + uPar;
    float ang = t * 0.0011;
    float ca = cos(ang), sa = sin(ang);
    vec2 sfc = vec2(ca * rp.x - sa * rp.y, sa * rp.x + ca * rp.y) + vec2(3000.0);
    vec2 sc = sfc / (uScale * 40.0);
    vec2 cell = floor(sc);
    float hs = hash12(cell + 11.3);
    if (hs > 0.955) {
      vec2 off = (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * 0.7;
      float dd = length(fract(sc) - 0.5 - off) * 40.0 * uScale;
      float mag = pow(hash12(cell + 1.9), 4.0);
      float low = 1.0 - smoothstep(0.08, 0.5, v);
      float f1 = 1.3 + 3.0 * hash12(cell + 5.3);
      float f2 = 2.1 + 4.0 * hash12(cell + 9.1);
      float amp = mix(0.10, 0.55, low) * (0.6 + 0.4 * (1.0 - mag));
      float twk = 1.0 + amp * (0.6 * sin(t * f1 + hs * 40.0) + 0.4 * sin(t * f2 + hs * 77.0));
      float chroma = 0.45 * low * sin(t * (f1 + 1.7) + hs * 13.0);
      vec3 sc3 = vec3(0.86, 0.9, 1.0) * vec3(1.0 + chroma, 1.0, 1.0 - chroma);
      S += vis * tw * sc3 * max(twk, 0.0) * (0.10 + 1.6 * mag) * exp(-dd * dd / (0.7 * uScale * uScale + 0.3)) * smoothstep(0.05, 0.3, v);
    }
    // Étoiles filantes : rares (au plus une toutes les ~11 s), brèves et discrètes.
    float P = 11.0;
    float slot = floor(t / P);
    float hm = hash12(vec2(slot, 4.7));
    if (hm > 0.45) {
      float t0 = slot * P + hash12(vec2(slot, 1.3)) * (P - 1.2);
      float life = (t - t0) / 0.75;
      if (life > 0.0 && life < 1.0) {
        vec2 start = vec2(hash12(vec2(slot, 2.9)) * 0.8 + 0.15, 0.55 + hash12(vec2(slot, 6.1)) * 0.4) * uRes;
        vec2 dir = normalize(vec2(-0.82 + 0.3 * hash12(vec2(slot, 8.3)), -0.5));
        float len = 170.0 * uScale;
        vec2 head = start + dir * len * 1.6 * life;
        vec2 rel = fc - head;
        float along = dot(rel, -dir);
        float perp = abs(dot(rel, vec2(-dir.y, dir.x)));
        float trail = step(0.0, along) * (1.0 - smoothstep(0.0, len, along));
        float env = sin(3.14159 * life);
        float w = 0.7 * uScale + 0.3;
        S += tw * vec3(0.9, 0.94, 1.0) * 0.5 * env * trail * trail * exp(-perp * perp / (w * w));
      }
    }
  }

  S = placeSky(S, fc);

  // Éblouissement (diffusion œil/optique) : déjà en unités d’affichage.
  vec3 G = vec3(0.0);
  if (uCorona > 0.5 && uTot > 0.001) {
    // Diffusion de la couronne dans l’atmosphère : un halo large et doux fond la couronne dans la nuit,
    // sans bord ni disque découpé.
    float hr = max(r - 1.0, 0.0);
    G += vis * uTot * vec3(0.78, 0.85, 1.0) * (0.075 * exp(-hr / 0.45) + 0.03 * exp(-hr / 1.8) + 0.012 * exp(-hr / 5.0));
    // Lumière cendrée : la face nocturne de la Lune, à peine visible, en relief.
    float inMoon = 1.0 - vis;
    if (inMoon > 0.0) {
      vec2 mp = qm / RM;
      float mz = sqrt(max(0.0, 1.0 - dot(mp, mp)));
      float maria = fbm3(mp * 3.2 + 7.0, 1.0e4);
      float shade = (0.55 + 0.45 * mz) * (0.75 + 0.5 * smoothstep(0.35, 0.7, maria));
      G += inMoon * uTot * vec3(0.0045, 0.0052, 0.0068) * shade;
    }
  }
  for (int i = 0; i < 24; i++) {
    if (i >= uEmN) break;
    vec4 em = uEm[i];
    float ds = length(q - em.xy) * uR / uScale;
    G += em.z * (vec3(1.0, 0.97, 0.92) / (1.0 + ds * ds * 0.012)
      + vec3(0.86, 0.9, 1.0) * 0.12 * uGlow / (1.0 + ds * ds / (2000.0 * uGlow))
      + vec3(0.78, 0.86, 1.0) * 0.008 * exp(-ds / 260.0));
  }

  // Anneau de diamant : aigrettes de diffraction discrètes.
  if (uStar.z > 0.001) {
    vec2 dp = (q - uStar.xy) * uR / uScale;
    vec3 sp = vec3(0.0);
    for (int k = 0; k < 4; k++) {
      float ang = 0.21 + float(k) * PI * 0.25;
      vec2 dir = vec2(cos(ang), sin(ang));
      float along = abs(dot(dp, dir));
      float perp = abs(dot(dp, vec2(-dir.y, dir.x)));
      float w = 0.8 + along * 0.01;
      float core = exp(-perp * perp / (w * w));
      vec3 len = vec3(130.0, 115.0, 100.0) * ((k == 0 || k == 2) ? 1.0 : 0.45);
      sp += core / (1.0 + along / len) * exp(-along / (len * 2.0));
    }
    float al = length(dp);
    G += uStar.z * (sp * 0.32 + 1.4 / (1.0 + al * al * 0.02) + 0.12 * exp(-al / 70.0));
  }

  // Premier plan SVG (totalite-stage.ts) : un Soleil passé derrière la ligne des toits n’éblouit plus.
  float topPx = uPlace.z;
  G *= smoothstep(topPx - uR, topPx + uR, uSun.y);
  vec3 X = L * uE + G + S;
  vec3 col = toSrgb(aces(X * uFade));
  // Dither triangulaire fixe (anti-banding), sans grain animé.
  float n1 = hash12(fc);
  float n2 = hash12(fc.yx + 3.1);
  col += (n1 + n2 - 1.0) / 255.0;
  outColor = vec4(col, 1.0);
}`,s=[{quality:1,stride:1},{quality:.85,stride:1},{quality:.85,stride:2},{quality:.7,stride:2}],c=1500,l=90;function u(){let e=new Float32Array(l).fill(1/0),t=0,n=NaN,r=NaN,i=0,a=1e3/60,o=0,u=0,d=360,f=-1/0;return{sample(p){Number.isFinite(n)||(n=p);let m=p-r;if(r=p,!(m>0)||m>120||(e[t]=m,t=(t+1)%l,a+=(m-a)*.1,p-n<c))return!1;let h=1/0;for(let t=0;t<l;t++)h=Math.min(h,e[t]);h=Math.min(40,Math.max(6,h)),o=a>h*1.3+1.5?o+1:0,u=a<h*1.1?u+1:0;let g=s[i].quality;return o>30&&i<s.length-1?(p-f<15e3&&(d=Math.min(d*2,2880)),i++,o=0,u=0):u>d&&i>0&&(i--,u=0,f=p),s[i].quality!==g},quality:()=>s[i].quality,stride:()=>s[i].stride,frameMs:()=>a}}var d=Math.PI*2,f=1e6,p=2,m=26e5,h=Math.atan2(.55,1)*180/Math.PI,g=e=>[Math.cos(e*Math.PI/180),Math.sin(e*Math.PI/180)],_=t.reduce((e,[t])=>e+t,0),v=4096,y=new Float32Array(4097);for(let e=0;e<=v;e++){let n=e/v*d,r=0;for(let[e,i,a]of t)r+=e*Math.sin(i*n+a);y[e]=r}var b=e=>{let t=e/d%1;t<0&&(t+=1);let n=t*v,r=n|0,i=n-r;return y[r]*(1-i)+y[r+1]*i},x=48,S=6,C=28,w=288,T=new Float32Array(w),E=new Float32Array(w);for(let e=0;e<w;e++){let t=(e+.5)/w*d;T[e]=Math.cos(t),E[e]=Math.sin(t)}var D=new Float32Array(C),O=new Float32Array(C),k=0;for(let e=0;e<C;e++){let t=(e+.5)/C,n=1-(1-t)**3,i=3*(1-t)**2/C,a=Math.sqrt(Math.max(0,1-n*n));D[e]=n,O[e]=n*i*(d/w)*(1-r*(1-a)),k+=O[e]*w}var A=x/24;function j(e,t=g(h)){let r=new Float32Array(72),i=t[0]*e,a=t[1]*e,o=n-_-1e-4,s=n+_+1e-4,c=o*o,l=s*s,u=0;for(let e=0;e<w;e++){let t=Math.floor(e/S/A)*3,n=T[e],o=E[e];for(let e=0;e<C;e++){let s=D[e]*n,d=D[e]*o,f=s-i,p=d-a,m=f*f+p*p;if(m<c||m<l&&Math.sqrt(m)<1.025+b(Math.atan2(p,f)))continue;let h=O[e];r[t]+=h,r[t+1]+=h*s,r[t+2]+=h*d,u+=h}}let d=0;for(let e=0;e<24;e++)r[e*3]>r[d*3]&&(d=e);return{W:u/k,groups:r,maxIndex:d}}var M=e=>Math.min(1,Math.max(0,e)),N=e=>1/(32e4*e+5),P=e=>e<=0?0:M((Math.log10(.003)-Math.log10(e))/1.2)*M((Math.log10(e)+7)/1.2),F=e=>M((e/.45)**.3);function I(e,t,n=h){let r=g(n),i=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:`high-performance`});if(!i)return null;let s=(e,t)=>{let n=i.createShader(e);if(i.shaderSource(n,t),i.compileShader(n),!i.getShaderParameter(n,i.COMPILE_STATUS))throw Error(i.getShaderInfoLog(n)??`shader`);return n},c=i.createProgram();try{if(i.attachShader(c,s(i.VERTEX_SHADER,a)),i.attachShader(c,s(i.FRAGMENT_SHADER,o)),i.linkProgram(c),!i.getProgramParameter(c,i.LINK_STATUS))throw Error(i.getProgramInfoLog(c)??`link`)}catch(e){return console.warn(`[totalité] WebGL indisponible, repli conservé.`,e),null}i.useProgram(c),i.bindVertexArray(i.createVertexArray());let l=e=>i.getUniformLocation(c,e),d={res:l(`uRes`),sun:l(`uSun`),R:l(`uR`),moon:l(`uMoon`),E:l(`uE`),F:l(`uF`),day:l(`uDay`),tot:l(`uTot`),time:l(`uTime`),par:l(`uPar`),bands:l(`uBands`),glow:l(`uGlow`),fade:l(`uFade`),scale:l(`uScale`),corona:l(`uCorona`),emN:l(`uEmN`),em:l(`uEm`),star:l(`uStar`),cam:l(`uCam`),place:l(`uPlace`)},_=new Float32Array(96),v=u(),y=1,b=NaN,x=j(.006,r),S=Math.log(N(0)),C=!1,w=1,T={key:``};function E(){let t=Math.max(1,e.clientWidth*e.clientHeight);y=Math.min(window.devicePixelRatio||1,p,Math.sqrt(m/t))*v.quality();let n=Math.max(1,Math.round(e.clientWidth*y)),r=Math.max(1,Math.round(e.clientHeight*y));(e.width!==n||e.height!==r)&&(e.width=n,e.height=r),i.viewport(0,0,n,r),T.key=``}function D(t,n,a,o,s,c){let l=e.width,u=e.height,p=Math.min(l,u);t!==b&&(x=j(t,r),b=t);let m=(x.W*a*f)**.4*(1-.45*M((x.W-.05)/.5)),h=0;for(let e=0;e<24;e++){let t=x.groups[e*3];t<=0||(_[h*4]=x.groups[e*3+1]/t,_[h*4+1]=x.groups[e*3+2]/t,_[h*4+2]=x.W>0?2.6*(t/k/x.W)*m:0,_[h*4+3]=0,h++)}let g=x.groups[x.maxIndex*3],v=x.W>0?g/k/x.W:0;i.uniform2f(d.res,l,u),i.uniform2f(d.sun,n.x*y,u-n.y*y),i.uniform1f(d.R,n.r*y),i.uniform2f(d.moon,r[0]*t,r[1]*t),i.uniform1f(d.E,a),i.uniform1f(d.F,x.W),i.uniform1f(d.glow,1+1.6*M((x.W-.002)/.15)),i.uniform1f(d.fade,o),i.uniform1f(d.day,s),i.uniform1f(d.time,c.t),i.uniform2f(d.par,c.px*y,-c.py*y),i.uniform1f(d.bands,P(x.W)),i.uniform1f(d.tot,M(1-s/.14)),i.uniform1f(d.scale,p/900),i.uniform1f(d.cam,(Math.max(1,n.r*y)/(.1*p))**.45),i.uniform1f(d.corona,+(a>4e-4)),i.uniform4f(d.place,n.p??0,n.z??1,(n.g??0)*u,(n.c??0)*u),i.uniform1i(d.emN,h),i.uniform4fv(d.em,_),i.uniform3f(d.star,g>0?x.groups[x.maxIndex*3+1]/g:0,g>0?x.groups[x.maxIndex*3+2]/g:0,x.W>0?1.5*v*v*m:0),i.drawArrays(i.TRIANGLES,0,3)}let O=e=>{e.preventDefault(),t()};return e.addEventListener(`webglcontextlost`,O),{frame(t,n,i,a,o,s,c){v.sample(t)&&E();let l=Number.isFinite(o)?(t-o)/1e3:1/0,u=!C&&l<1;i!==b&&(x=j(i,r),b=i);let d=Math.log(N(x.W)),f=F(x.W),p=1;if(s.still)C=!0,S=d,w=f;else if(u){let e=1-(1-M(l/1))**3;S=d+Math.log(1.8)*(1-e),w=f,p=e}else{C=!0;let e=d>S?.45:.16;S+=(d-S)*(1-Math.exp(-n/e)),Math.abs(d-S)<.01&&(S=d),w+=(f-w)*(1-Math.exp(-n/.3)),Math.abs(f-w)<.002&&(w=f)}let m=Math.exp(S),h=`${i}|${m}|${p}|${w}|${a.x}|${a.y}|${a.r}|${a.p}|${a.z}|${a.g}|${a.c}|${e.width}|${s.t}|${s.px}|${s.py}`;return c&&h!==T.key&&(D(i,a,m,p,w,s),T.key=h),u||S!==d||w!==f},resize:E,dispose(){e.removeEventListener(`webglcontextlost`,O)},stats:()=>({quality:v.quality(),frameMs:v.frameMs(),stride:v.stride()}),stride:()=>v.stride(),daylight:()=>w}}export{I as createEclipse};