import{n as e,t}from"./vegetation.DPMDNJGF.js";import{t as n}from"./graffiti.DVLx2wne.js";var r=`
uniform vec4 uPlace;
vec3 placeAdd;

const float WALL = 0.21;   // haut du mur de la maison
const float FAS0 = 0.232;  // bas de la bordure du pont
const float FAS1 = 0.284;  // chaussée du pont
const float WL = -0.34;    // bords du mur (la porte est en 0)
const float WR = 2.62;

float vn(vec2 p){ return pnoise(p, 1.0e4); }
float fbm4(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
${t}
float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdBox(vec2 p, vec2 b){
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float glowPt(float dPx, float core){ return exp(-dPx * dPx / core) + 0.06 * exp(-dPx / (core * 2.5)); }

${n}

// Croissant : disque moins un disque décalé (les cornes du robot, en éclipse).
float crescent(vec2 p, float r, vec2 off){ return max(length(p) - r, -(length(p - off) - r * 0.92)); }

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

// --- Le paysage découvert par la montée de la caméra ---
// Invisible au pied du mur ; il se lève dans la brume quand la caméra passe au-dessus du pont.
float placeReveal(){ return smoothstep(0.04, 0.3, uPlace.w / uRes.y); }
// Horizon (px) : la lueur orangée de la totalité s’y pose, au lieu du bas de l’écran.
float placeHorizon(){ return uPlace.z * 0.3 + uRes.y * (0.46 - 0.27 * uPlace.w / uRes.y); }
float placeHz(){ return mix(0.0, placeHorizon(), placeReveal()); }

// Barres des Avanchets (comme la page La maison) : x0, x1, pied, hauteur ; pente du toit, profondeur, palette.
const vec4 CB[6] = vec4[6](
  vec4(-1.65, -0.35, 0.075, 0.25), vec4(0.05, 1.7, 0.07, 0.27),
  vec4(-1.25, 0.25, 0.04, 0.29), vec4(0.45, 1.55, 0.035, 0.26),
  vec4(-0.95, 0.55, 0.0, 0.3), vec4(0.85, 1.9, 0.005, 0.28)
);
const vec3 CB2[6] = vec3[6](
  vec3(0.03, 1.0, 0.0), vec3(-0.025, 1.0, 1.0),
  vec3(-0.02, 0.62, 1.0), vec3(0.035, 0.62, 0.0),
  vec3(0.012, 0.0, 0.0), vec3(-0.03, 0.0, 1.0)
);
${e}
// Lumière ponctuelle d’une grille de cellules (lampadaires, fenêtres lointaines).
float cityLights(vec2 g, float density, float seed){
  vec2 id = floor(g);
  if (hash12(id + seed) > density) return 0.0;
  vec2 o = (vec2(hash12(id + seed + 1.3), hash12(id + seed + 4.1)) - 0.5) * 0.6;
  float d = length(fract(g) - 0.5 - o);
  return smoothstep(0.32, 0.0, d) * (0.5 + 0.5 * hash12(id + seed + 7.7));
}

vec4 placeCity(vec2 fc){
  float a = placeReveal();
  if (a <= 0.0) return vec4(0.0);
  float H = uRes.y;
  float L = uPlace.w / H;
  float hu = min(uRes.y, uRes.x * 1.1);
  float ks = hu * mix(1.0, uPlace.y, 0.75);
  float t = uTime;
  vec3 dayL = mix(vec3(0.62, 0.70, 1.05), vec3(1.0), uDay) * uDay;
  vec3 nightL = vec3(0.010, 0.011, 0.018) + uTot * vec3(0.03, 0.016, 0.01);
  float lampsOn = smoothstep(0.42, 0.14, uDay);
  // Couleur du ciel bas (brume) : bleu de jour, lueur orangée de totalité.
  vec3 haze = vec3(0.14, 0.28, 0.62) * dayL * 0.85 + vec3(0.0035, 0.005, 0.012) + uTot * vec3(0.36, 0.15, 0.05);
  float hz = placeHorizon();
  float X = (fc.x - uRes.x * 0.5 + uPar.x * 0.2) / ks + uPlace.x * 0.12;
  float Yh = (fc.y - hz) / ks;
  vec4 res = vec4(0.0);

  // Horizon : Jura à gauche, Salève à droite, le Mont-Blanc enneigé derrière.
  // Crêtes : relief de fond, arêtes et ravines (bruit en crêtes) ; versants tournés vers la gauche au soleil.
  float jn = smoothstep(1.3, 0.1, X);
  float jura = (0.026 + 0.02 * vn(vec2(X * 1.1 + 4.0, 1.0)) + 0.005 * vn(vec2(X * 7.0, 2.0)) + 0.0035 * (1.0 - abs(2.0 * vn(vec2(X * 26.0, 6.0)) - 1.0))) * jn;
  float sal = 0.048 * exp(-pow((X - 0.78) / 0.26, 4.0)) * (0.92 + 0.07 * vn(vec2(X * 10.0, 3.0)) + 0.05 * (1.0 - abs(2.0 * vn(vec2(X * 34.0, 7.0)) - 1.0)));
  float mb = 0.04 * exp(-pow((X - 1.18) / 0.1, 2.0)) * (0.9 + 0.1 * vn(vec2(X * 18.0, 5.0)));
  // Collines boisées du pied du Jura et du Genevois, plus proches : plus sombres, moins voilées.
  float hill = (0.006 + 0.007 * vn(vec2(X * 2.6 + 1.0, 8.0)) + 0.0025 * vn(vec2(X * 15.0, 9.0))) * (1.0 - smoothstep(0.6, 1.6, abs(X - 0.4)));
  float ridgeTop = max(jura, sal);
  // Pente de la crête (dérivée écran, hors branche) : sert à éclairer les versants.
  float slope = dFdx(max(ridgeTop, mb)) * ks;
  if (Yh > 0.0 && Yh < max(max(ridgeTop, mb), hill)) {
    float lit = clamp(0.5 + slope * 6.0, 0.0, 1.0);
    float gully = vn(vec2(X * 60.0, Yh * 8.0)) * smoothstep(0.0, ridgeTop + 1.0e-4, Yh);
    vec3 rock = vec3(0.04, 0.07, 0.15) * mix(0.75, 1.3, lit) * (0.88 + 0.24 * gully) * mix(vec3(0.95, 1.0, 1.05), vec3(1.08, 1.0, 0.9), lit);
    // Perspective aérienne : brume plus dense au pied, dans la cuvette genevoise.
    float rockW = 0.45 - 0.2 * (1.0 - smoothstep(0.0, 0.02, Yh));
    vec3 ridge = mix(haze, rock * dayL + nightL * 0.5, rockW);
    if (Yh > ridgeTop) ridge = mix(haze, vec3(0.86, 0.9, 0.98) * dayL * 0.7 * mix(0.82, 1.1, lit) + nightL, 0.55);
    if (Yh < hill) ridge = mix(haze, vec3(0.035, 0.05, 0.04) * (0.8 + 0.4 * vn(vec2(X * 90.0, Yh * 300.0))) * dayL + nightL * 0.5, 0.62 - 0.15 * (1.0 - smoothstep(0.0, 0.012, Yh)));
    // Sous la totalité, les crêtes se découpent en noir sur la lueur d’horizon.
    ridge = mix(ridge, vec3(0.006, 0.006, 0.011), uTot * 0.85);
    res = vec4(ridge, 1.0);
  }
  // Plaine : champs et quartiers en perspective, Genève au loin, une bande de lac.
  if (Yh <= 0.0) {
    float dy = -Yh;
    float z = 1.0 / (dy + 0.012);
    vec2 gp = vec2(X * z * 0.9, z * 0.35);
    float field = vn(gp * vec2(1.0, 1.0)) * 0.6 + vn(gp * 3.1 + 7.0) * 0.4;
    vec3 land = mix(vec3(0.06, 0.08, 0.05), vec3(0.11, 0.11, 0.09), field) * (dayL * 0.75 + nightL);
    // Lac : un trait de lumière sous l’horizon, à droite.
    float lake = smoothstep(0.012, 0.009, dy) * smoothstep(0.003, 0.005, dy) * smoothstep(0.1, 0.3, X) * smoothstep(1.3, 0.9, X);
    float glint = smoothstep(0.6, 0.8, vn(vec2(X * 160.0 + t * 0.3, dy * 900.0)));
    land = mix(land, haze * 1.15 + glint * (dayL * 0.25 + uTot * vec3(0.35, 0.14, 0.04)), lake);
    // Lumières : Genève dense à l’horizon, quartiers épars plus près.
    float far = cityLights(vec2(X * 190.0, dy * 520.0), 0.55, 2.0) * smoothstep(0.03, 0.006, dy) * (1.0 - lake);
    // Plus près, les lampadaires ne suivent que les rues : avenues en perspective et rues transversales.
    vec2 sg = vec2(X * z * 0.7 + 0.25 * vn(vec2(z * 0.2, 3.0)), z * 0.22);
    float street = max(smoothstep(0.06, 0.0, abs(fract(sg.x) - 0.5) - 0.44), smoothstep(0.08, 0.0, abs(fract(sg.y) - 0.5) - 0.42));
    // Quartiers par grappes, champs et parcs sombres entre eux.
    float quarter = smoothstep(0.5, 0.7, vn(vec2(X * z * 0.35, z * 0.09) + 2.0));
    float near = cityLights(vec2(X * z * 5.0, z * 1.2), 0.4, 9.0) * street * quarter * smoothstep(0.01, 0.03, dy) * 0.6;
    vec3 sodium = mix(vec3(1.0, 0.55, 0.22), vec3(0.75, 0.85, 1.0), step(0.88, hash12(floor(vec2(X * 190.0, dy * 520.0)))));
    land += sodium * (far * 0.55 + near * 0.5) * (lampsOn + 0.06);
    // Halo de la ville sur l’horizon, la nuit.
    land += vec3(0.5, 0.26, 0.1) * 0.05 * lampsOn * exp(-dy / 0.02) * (0.6 + 0.4 * vn(vec2(X * 4.0, 1.0)));
    // Perspective aérienne.
    land = mix(land, haze, exp(-dy / 0.05) * 0.7);
    res = vec4(land, 1.0);
  }

  // La cité des Avanchets, devant : les barres en « montagnes », vues de plus en plus d’en haut.
  float bm = uPlace.z + H * (0.36 - 0.62 * L);
  float Y = (fc.y - bm) / ks;
  float Xb = (fc.x - uRes.x * 0.5 + uPar.x * 0.5) / ks + uPlace.x * 0.3;
  float roofD = 0.006 + 0.03 * clamp(L - 0.3, 0.0, 1.0);
  vec3 lightCol = mix(vec3(1.0, 0.97, 0.92), vec3(1.0, 0.8, 0.62), 1.0 - uDay) * (0.2 + 0.8 * uDay);
  if (Y < 0.42) {
    for (int i = 0; i < 6; i++) {
      vec4 b = CB[i];
      vec3 b2 = CB2[i];
      float depth = b2.y;
      vec3 alb;
      float win;
      vec2 g;
      if (avBar(b, b2.x, Xb, Y, roofD, float(i) * 3.7 + b2.z * 11.0, 0.25 + 0.5 * b2.z, alb, win, g) < 0.5) continue;
      vec3 c = alb * lightCol * smoothstep(0.0, 0.5, uDay) + alb * nightL;
      // Fenêtres qui s’allument une à une quand la lumière tombe.
      if (win > 0.0 && g.y >= 0.0) {
        vec2 cell = floor(g);
        float h = hash12(cell + float(i) * 13.1);
        float on = smoothstep(h, h + 0.035, lampsOn * 0.55 + uTot * 0.1);
        float k = hash12(cell + float(i) * 7.7 + 2.0);
        vec3 lamp = k > 0.84 ? vec3(0.55, 0.7, 1.0) * (0.8 + 0.2 * sin(t * (4.0 + 6.0 * k) + h * 40.0)) : mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.82, 0.55), k);
        c += lamp * on * win * (0.1 + 0.26 * hash12(cell + 5.0));
      }
      // Brume : désature les barres lointaines sans les teinter (pas de rouge virant au violet).
      res = vec4(mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.6 + haze * 0.4, depth * 0.3 + 0.04), 1.0);
    }
    // Peupliers et arbres au pied des barres, parc et chemins devant.
    float sunK = smoothstep(0.0, 0.5, uDay);
    vec3 treeL = lightCol * sunK + nightL;
    float pxB = 1.0 / ks;
    // Bois du parc : masse de houppiers lointains au profil festonné, sommets au soleil, sous-bois dans l’ombre.
    float cxB = Xb * 42.0;
    float bump = 0.0;
    for (int j = -1; j <= 1; j++) {
      float id = floor(cxB) + float(j);
      float hb = hash12(vec2(id, 21.0));
      float u = (cxB - id - 0.5) / (0.6 + 0.35 * hb);
      bump = max(bump, (0.003 + 0.008 * hb) * sqrt(max(0.0, 1.0 - u * u)));
    }
    float trees = 0.014 + 0.02 * fbm4(vec2(Xb * 9.0, 1.0)) + bump;
    float parkEdge = trees * 0.3 - 0.024;
    if (Y < trees + pxB) {
      float cov = clamp((trees - Y) / pxB + 0.5, 0.0, 1.0);
      float cl = fbm4(vec2(Xb * 80.0, Y * 110.0));
      vec3 alb = mix(vec3(0.034, 0.054, 0.03), vec3(0.062, 0.08, 0.036), hash12(vec2(floor(cxB), 23.0)));
      float topLit = smoothstep(-0.022, 0.0, Y - trees);
      vec3 c = alb * (0.45 + 0.75 * topLit) * (0.7 + 0.6 * cl) * treeL;
      c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.6 + haze * 0.4, 0.1);
      res = vec4(mix(res.rgb, c, cov), max(res.a, cov));
    }
    // Arbres isolés au pied des barres : peupliers d’Italie et feuillus (vegetation.ts), assez espacés
    // pour laisser lire les façades.
    if (Y < 0.16) {
      for (int j = -1; j <= 1; j++) {
        float ci = floor(Xb / 0.11) + float(j);
        float h0 = hash12(vec2(ci, 2.0));
        if (h0 < 0.38) continue;
        float kind = step(0.58, hash12(vec2(ci, 6.0)));
        float th = kind > 0.5 ? 0.055 + 0.035 * hash12(vec2(ci, 5.0)) : 0.085 + 0.05 * hash12(vec2(ci, 5.0));
        float x0 = (ci + 0.2 + 0.6 * hash12(vec2(ci, 3.0))) * 0.11;
        float y0 = -0.008 + 0.012 * hash12(vec2(ci, 9.0));
        vec4 tr = natTree(vec2(Xb - x0, Y - y0) / th, ci * 1.37 + 3.0, t, pxB / th, kind);
        if (tr.a <= 0.0) continue;
        vec3 c = tr.rgb * treeL;
        c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.6 + haze * 0.4, 0.12);
        res = vec4(mix(res.rgb, c, tr.a), max(res.a, tr.a));
      }
    }
    if (Y < parkEdge + pxB) {
      // Parc : pelouse en perspective, allées de gravier aux bords adoucis et usés, lampadaires.
      float dz = -Y;
      float lawnN = 0.6 * vn(vec2(Xb * 30.0, Y * 60.0)) + 0.4 * vn(vec2(Xb * 120.0, Y * 300.0));
      vec3 lawn = mix(vec3(0.04, 0.06, 0.032), vec3(0.075, 0.092, 0.045), lawnN);
      float pd = abs(fract(Xb * 2.2 + Y * 3.0) - 0.5);
      float pw = max(0.004, 2.6 * pxB);
      float thr = max(0.43, 0.485 - 0.12 * dz);
      float path = smoothstep(thr - pw, thr + pw, pd);
      vec3 gravel = vec3(0.26, 0.25, 0.22) * (0.85 + 0.3 * vn(vec2(Xb * 260.0, Y * 420.0)));
      lawn *= 1.0 - 0.3 * smoothstep(thr - 0.04, thr, pd) * (1.0 - path);
      vec3 park = mix(lawn, gravel, path) * (lightCol * sunK * 0.8 + nightL);
      park = mix(park, haze * 0.5, 0.12 * exp(-dz / 0.03));
      park += vec3(1.0, 0.6, 0.25) * cityLights(vec2(Xb * 9.0, Y * 9.0), 0.35, 4.0) * lampsOn * 0.8 * smoothstep(0.0, 0.03, dz);
      float cov = clamp((parkEdge - Y) / pxB + 0.5, 0.0, 1.0);
      res = vec4(mix(res.rgb, park, cov), max(res.a, cov));
    }
    // Quelques arbres au premier plan du parc, ancrés par leur ombre portée et l’occlusion au pied.
    if (Y < 0.1) {
      for (int j = -1; j <= 1; j++) {
        float ci = floor(Xb / 0.3) + float(j);
        if (hash12(vec2(ci, 31.0)) < 0.55) continue;
        float kind = step(0.3, hash12(vec2(ci, 32.0)));
        float th = mix(0.1, 0.075, kind) + 0.025 * hash12(vec2(ci, 33.0));
        float x0 = (ci + 0.2 + 0.6 * hash12(vec2(ci, 34.0))) * 0.3;
        float y0 = -0.05 - 0.03 * hash12(vec2(ci, 35.0));
        vec2 tq = vec2(Xb - x0, Y - y0) / th;
        float sx = (tq.x - 0.22) / mix(0.12, 0.34, kind);
        float sy = tq.y / 0.05;
        float ax = tq.x / 0.07;
        float ay = tq.y / 0.025;
        float sh = exp(-sx * sx - sy * sy) * 0.5 * sunK + exp(-ax * ax - ay * ay) * 0.35;
        res.rgb *= 1.0 - sh;
        vec4 tr = natTree(tq, ci * 2.71 + 11.0, t, pxB / th, kind);
        if (tr.a <= 0.0) continue;
        vec3 c = tr.rgb * treeL;
        c += tr.rgb * vec3(1.0, 0.6, 0.25) * lampsOn * 0.5 * exp(-max(tq.y, 0.0) * 3.0);
        c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.6 + haze * 0.4, 0.04);
        res = vec4(mix(res.rgb, c, tr.a), max(res.a, tr.a));
      }
    }
  }
  // Étalonnage : comme la façade, le paysage reste en retrait de l’éclipse.
  res.rgb *= 0.92 * mix(0.7, 1.0, smoothstep(0.0, 0.45, fc.y / H));
  res.rgb = mix(res.rgb, res.rgb * vec3(0.8, 0.88, 1.1), 1.0 - uDay);
  res.a *= a;
  return res;
}

// Premier plan : couleur (unités d’affichage) et couverture ; les lueurs vont dans placeAdd.
vec4 placeFg(vec2 fc){
  placeAdd = vec3(0.0);
  float hu = min(uRes.y, uRes.x * 1.1);
  float z = uPlace.y;
  float k = hu * z;
  vec2 P = (fc - vec2(uRes.x * 0.5, uPlace.z - uPlace.w) + uPar * 0.6) / k + vec2(uPlace.x, 0.0);
  if (P.y > FAS1 + 0.1) return vec4(0.0);
  float px = 1.0 / k;
  float t = uTime;
  float rel = P.x;

  // Lumière : jour (froid quand il baisse), ombre du tablier, nuit de totalité, appliques et lampadaires.
  vec3 dayL = mix(vec3(0.62, 0.70, 1.05), vec3(1.0), uDay) * uDay;
  vec3 nightL = vec3(0.012, 0.013, 0.02) + uTot * vec3(0.03, 0.016, 0.01);
  float lampsOn = smoothstep(0.42, 0.14, uDay);
  vec3 shadeL = dayL * 0.42 + nightL;
  vec3 openL = dayL * 0.85 + nightL;

  // Appliques rondes sur le mur, allumées une à une.
  vec2 LP[4] = vec2[4](vec2(-0.005, 0.18), vec2(0.56, 0.176), vec2(1.36, 0.178), vec2(2.16, 0.175));
  float lon[4];
  vec3 pool = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    lon[i] = smoothstep(0.0, 0.25, lampsOn - hash12(vec2(float(i), 4.0)) * 0.5);
    vec2 d = P - LP[i];
    float cone = exp(-d.x * d.x / (0.004 + 0.02 * max(-d.y, 0.0))) * (d.y < 0.01 ? exp(d.y * 4.0) : exp(-d.y * 60.0));
    pool += vec3(1.0, 0.74, 0.46) * lon[i] * (cone * 0.55 + 0.6 * exp(-dot(d, d) / 0.0006));
  }

  vec4 res = vec4(0.0);

  // Ouvertures sous le pont, au-delà du mur : la cité au loin, puis le ciel.
  if (P.y > 0.0 && P.y < FAS0 && (rel < WL || rel > WR)) {
    vec2 Pf = vec2(rel * 0.7 + uPlace.x * 0.3, P.y);
    // Les barres des Avanchets au loin (avBar, même relevé Pelichrom que la cité) : deux rangs, le second plus
    // petit et plus voilé ; le lever de soleil sur la barre de devant que l’on voit dès l’arrivée, à gauche.
    vec3 skyF = vec3(0.2, 0.32, 0.6) * uDay + nightL;
    vec3 farL = dayL * 0.85 + nightL;
    for (int i = 0; i < 2; i++) {
      float r = float(1 - i);
      float s = mix(2.6, 3.6, r);
      float Xd = Pf.x * s + r * 0.37 - 0.3 * (1.0 - r);
      float Yd = Pf.y * s - 0.012 - r * 0.02;
      float id = floor(Xd / 0.95);
      float h = hash12(vec2(id, 41.0 + r));
      float len = 0.5 + 0.3 * h;
      float x0 = id * 0.95 + (0.95 - len) * hash12(vec2(id, 43.0 + r));
      vec4 b = vec4(x0, x0 + len, 0.0, 0.22 + 0.08 * hash12(vec2(id, 45.0 + r)));
      float seed = id * 3.7 + r * 11.0 + 0.3;
      if (abs(seed - 14.8) < 0.05) seed += 0.2;
      if (r < 0.5 && id == -2.0) { seed = 14.8; b = vec4(-1.9, -1.2, 0.0, 0.28); }
      vec3 alb;
      float win;
      vec2 g;
      if (avBar(b, 0.0, Xd, Yd, 0.0, seed, 0.25 + 0.5 * h, alb, win, g) < 0.5) continue;
      vec3 c = alb * farL;
      // Fenêtres qui s’allument quand la lumière tombe.
      if (win > 0.0 && g.y >= 0.0) {
        float hw = hash12(floor(g) + seed * 13.1);
        c += mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.82, 0.55), hw) * smoothstep(hw, hw + 0.035, lampsOn * 0.55 + uTot * 0.1) * win * 0.2;
      }
      // Perspective aérienne : désaturées puis fondues dans le ciel, davantage vers le haut et au second rang.
      c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.6 + skyF * 0.4, 0.3 + 0.2 * r);
      c = mix(c, skyF, 0.16 + 0.22 * r + 0.12 * smoothstep(0.0, 0.3, Yd));
      res = vec4(c, 1.0);
    }
    // Lisière d’arbres au pied des barres, festonnée, sommets au soleil.
    float cxF = Pf.x * 70.0;
    float bumpF = 0.0;
    for (int j = -1; j <= 1; j++) {
      float id = floor(cxF) + float(j);
      float hb = hash12(vec2(id, 51.0));
      float u = (cxF - id - 0.5) / (0.6 + 0.35 * hb);
      bumpF = max(bumpF, (0.002 + 0.004 * hb) * sqrt(max(0.0, 1.0 - u * u)));
    }
    float treesF = 0.002 + 0.007 * smoothstep(0.4, 0.8, fbm4(vec2(Pf.x * 5.0, 3.0))) + bumpF;
    if (P.y < treesF + px) {
      float cov = clamp((treesF - P.y) / px + 0.5, 0.0, 1.0);
      vec3 c = mix(vec3(0.034, 0.054, 0.03), vec3(0.062, 0.08, 0.036), hash12(vec2(floor(cxF), 53.0)));
      c *= (0.5 + 0.7 * smoothstep(-0.016, 0.0, P.y - treesF)) * (0.75 + 0.5 * fbm4(vec2(Pf.x * 120.0, P.y * 160.0))) * farL;
      c = mix(c, skyF, 0.22);
      res = vec4(mix(res.rgb, c, cov), max(res.a, cov));
    }
    // Sous-face du tablier, en perspective rasante.
    if (P.y > FAS0 - 0.016) res = vec4(vec3(0.05, 0.05, 0.06) * (dayL * 0.4 + nightL), 1.0);
  }
  // Piles du pont.
  for (int i = 0; i < 2; i++) {
    float x0 = i == 0 ? WL - 0.08 : WR + 0.08;
    float pw = 0.05 + 0.006 * P.y / FAS0;
    if (abs(rel - x0) < pw && P.y > 0.0 && P.y < FAS0) {
      float side = smoothstep(-pw, pw, rel - x0);
      // Béton banché : planches de coffrage, marbrures, pied assombri.
      float form = (0.94 + 0.06 * hash12(vec2(floor(P.y / 0.018), 3.0))) * (0.95 + 0.1 * vn(vec2(rel * 90.0, P.y * 25.0)));
      float foot = 0.72 + 0.28 * smoothstep(0.0, 0.03, P.y);
      res = vec4(vec3(0.5, 0.5, 0.52) * (0.75 + 0.35 * side) * form * foot * (shadeL + 0.1 * lampsOn * vec3(1.0, 0.7, 0.4)), 1.0);
    }
  }
  // Sous-face au-dessus du mur.
  if (P.y >= WALL && P.y < FAS0 && rel > WL - 0.25 && rel < WR + 0.25) {
    float beam = step(0.88, fract(rel / 0.21));
    res = vec4(vec3(0.045, 0.046, 0.055) * (1.0 + 0.6 * beam) * (dayL * 0.5 + nightL) + pool * 0.02, 1.0);
  }

  // --- Le mur de l’Éclipse ---
  if (rel > WL && rel < WR && P.y > 0.0 && P.y < WALL) {
    float row = floor(P.y / 0.0105);
    float bx = rel / 0.026 + 0.5 * mod(row, 2.0);
    vec2 bf = vec2(fract(bx), fract(P.y / 0.0105));
    vec3 alb = vec3(0.16, 0.165, 0.18) * (0.9 + 0.2 * hash12(vec2(floor(bx), row)));
    float joint = (bf.y < 0.09 || bf.x < 0.035) ? 1.0 : 0.0;
    alb = mix(alb, vec3(0.26, 0.26, 0.28), joint);
    // Coulures sous le couronnement, plus marquées en haut.
    float streak = smoothstep(0.55, 0.85, vn(vec2(rel * 110.0, 3.0))) * smoothstep(WALL - 0.08, WALL - 0.01, P.y);
    alb *= 1.0 - 0.35 * streak;
    // Béton des blocs : marbrures et pores liés au mur (pas de grain d’écran).
    alb *= 0.86 + 0.28 * fbm4(vec2(rel * 26.0, P.y * 34.0));
    alb *= mix(1.0, 0.86 + 0.28 * vn(vec2(rel, P.y) * 300.0), 1.0 - smoothstep(0.0015, 0.004, px));
    float paint = 0.0; // 1 sur la fresque : moins de joints visibles
    // Fresque turquoise.
    float mx0 = 0.17, mx1 = 2.52;
    float topM = 0.152 + 0.022 * fbm4(vec2(rel * 5.0, 2.0));
    if (rel > mx0 && rel < mx1 && P.y > 0.008 && P.y < topM) {
      // Lettrage « wildstyle » : formes étirées en biais, déformées par un second bruit.
      vec2 mp = vec2(rel * 8.0 + P.y * 3.0, P.y * 8.0);
      vec2 wv = vec2(fbm4(mp * 0.6 + 5.0), fbm4(mp * 0.6 + 9.0)) - 0.5;
      mp += wv * 1.4;
      float n = fbm4(mp + vec2(3.0, 1.0));
      float nh = fbm4(mp + vec2(3.0, 1.0) + vec2(-0.12, 0.16));
      vec3 m = vec3(0.03, 0.2, 0.27);
      if (n > 0.44) m = vec3(0.06, 0.5, 0.62);
      if (n > 0.55) m = vec3(0.3, 0.78, 0.86);
      if (n > 0.64) m = vec3(0.86, 0.94, 0.96);
      // Reflets blancs du lettrage : un liseré du côté de la lumière.
      if (n > 0.5 && nh < 0.5) m = mix(m, vec3(0.95), 0.85);
      if (vn(mp * 1.7 + 11.0) > 0.8 && n > 0.44) m = vec3(0.86, 0.15, 0.52);
      float edge = min(min(abs(n - 0.44), abs(n - 0.55)), abs(n - 0.64));
      float ew = fwidth(n) * 0.9 + 0.0025;
      m = mix(vec3(0.015), m, smoothstep(ew * 0.5, ew, edge));
      // Bulles au pied de la fresque.
      float cx = (floor(rel / 0.055) + 0.5) * 0.055;
      float bub = 1e3;
      for (int j = -1; j <= 1; j++) {
        float id = floor(rel / 0.055) + float(j);
        float h1 = hash12(vec2(id, 7.0));
        // Nuages de bulles par grappes, avec des trous : pas un collier régulier.
        if (vn(vec2(id * 0.35, 4.0)) < 0.42) continue;
        vec2 c = vec2((id + 0.5) * 0.055 + (h1 - 0.5) * 0.03, 0.02 + 0.05 * hash12(vec2(id, 8.0)));
        bub = min(bub, length(vec2(rel, P.y) - c) - (0.018 + 0.022 * h1));
      }
      if (bub < 0.0) {
        float sh = smoothstep(-0.03, 0.0, bub);
        m = mix(vec3(0.42, 0.85, 0.92), vec3(0.08, 0.48, 0.6), sh);
      }
      if (abs(bub) < 0.0011 + px * 0.6) m = vec3(0.02);
      // Robot aux cornes en croissants, le poing levé.
      vec2 rq = vec2(rel, P.y);
      float fist = sdBox(rq - vec2(1.22, 0.085), vec2(0.034, 0.04)) - 0.01;
      float arm = sdSeg(rq, vec2(1.25, 0.06), vec2(1.4, 0.05)) - 0.018;
      float head = sdBox(rq - vec2(1.47, 0.11), vec2(0.034, 0.03)) - 0.01;
      float hornL = crescent(rq - vec2(1.42, 0.158), 0.028, vec2(0.014, -0.01));
      float hornR = crescent(rq - vec2(1.52, 0.158), 0.028, vec2(-0.014, -0.01));
      float body = sdBox(rq - vec2(1.47, 0.04), vec2(0.06, 0.035)) - 0.012;
      float robot = min(min(min(fist, arm), min(head, body)), min(hornL, hornR));
      if (robot < 0.0) {
        m = vec3(0.05, 0.36, 0.47);
        if (body < 0.0) m = vec3(0.04, 0.28, 0.38);
        if (head < 0.0) m = vec3(0.1, 0.55, 0.66);
        if (head < 0.0 && abs(P.y - 0.113) < 0.006 && abs(rel - 1.47) < 0.026) m = vec3(0.95, 0.96, 0.9);
        if (hornL < 0.0 || hornR < 0.0) m = vec3(0.88, 0.94, 0.96);
        if (fist < 0.0) {
          m = vec3(0.12, 0.6, 0.72);
          if (abs(fract((P.y - 0.045) / 0.02) - 0.5) < 0.08 && rel < 1.235) m = vec3(0.015);
        }
        // Volume : plus clair en haut à gauche.
        m *= 0.85 + 0.3 * smoothstep(0.0, -0.02, robot);
      }
      if (abs(robot) < 0.0013 + px * 0.6) m = vec3(0.02);
      // Couleurs de la fresque retenues : peinture patinée sous le pont, pas d’aplats criards.
      m = mix(vec3(dot(m, vec3(0.3, 0.59, 0.11))), m, 0.72) * 0.82;
      float fade = smoothstep(0.0, 0.006, topM - P.y) * smoothstep(0.0, 0.025, rel - mx0) * smoothstep(0.0, 0.05, mx1 - rel);
      alb = mix(alb, m, fade);
      paint = fade;
    }
    alb = mix(alb, alb * 1.08, paint * joint);
    // Signature rose « Les Avanchets ».
    if (rel > 0.17 && rel < 0.36) {
      float u = rel - 0.17;
      float yS = 0.168 + 0.005 * sin(u * 150.0) + 0.0028 * sin(u * 430.0) + u * 0.04;
      float loops = step(0.25, fract(u * 52.0));
      alb = mix(alb, vec3(0.95, 0.2, 0.55), smoothstep(0.0022 + px, 0.0022, abs(P.y - yS)) * loops);
    }
    // « 1220 » couronné : blanc anguleux, contour noir, extrusion noire vers le bas à gauche (comme sur la photo).
    vec2 tq = (P - vec2(0.036, 0.05)) / 0.026;
    float pxT = px / 0.026;
    float dT = tag1220(tq);
    float dX = tag1220(tq + vec2(0.06, 0.06));
    float dS = tag1220(tq + vec2(0.12, 0.12));
    alb = mix(alb, vec3(0.015), smoothstep(0.09 + pxT, 0.09, min(dT, min(dX, dS))));
    alb = mix(alb, vec3(0.1, 0.1, 0.11), smoothstep(pxT, 0.0, dX) * (1.0 - smoothstep(0.06 + pxT, 0.06, dT)));
    alb = mix(alb, vec3(0.95, 0.95, 0.93), smoothstep(pxT, 0.0, dT));
    // Porte rouge : cadre, affiches, poignée.
    if (abs(rel) < 0.023 && P.y < 0.097) {
      alb = vec3(0.58, 0.085, 0.05);
      if (abs(rel) > 0.0205 || P.y > 0.094) alb = vec3(0.4, 0.06, 0.04);
      vec2 dp = vec2((rel + 0.017) / 0.034, (P.y - 0.038) / 0.052);
      vec2 cell = floor(dp * vec2(2.0, 3.0));
      vec2 cf = fract(dp * vec2(2.0, 3.0));
      if (dp.x > 0.0 && dp.x < 1.0 && dp.y > 0.0 && dp.y < 1.0 && cf.x > 0.07 && cf.x < 0.93 && cf.y > 0.08 && cf.y < 0.92) {
        vec3 paper = mix(vec3(0.88, 0.85, 0.77), vec3(0.75, 0.8, 0.9), step(0.62, hash12(cell)));
        if (cf.y > 0.72) paper = mix(paper, vec3(0.2, 0.32, 0.62), step(0.4, hash12(cell + 2.0)));
        if (cf.y < 0.68 && cf.x > 0.15 && cf.x < 0.85 && fract(cf.y * 9.0) < 0.3) paper *= 0.72;
        alb = paper;
      }
      if (abs(rel - 0.016) < 0.0022 && abs(P.y - 0.046) < 0.0012) alb = vec3(0.75);
    }
    // Ombre de l’auvent sur le mur, puis l’auvent.
    if (abs(rel - 0.002) < 0.034 && P.y > 0.09 && P.y < 0.0985) alb *= 0.55;
    if (abs(rel - 0.002) < 0.034 && P.y >= 0.0985 && P.y < 0.106) alb = vec3(0.88, 0.88, 0.87);
    // Coffret électrique.
    if (rel > -0.075 && rel < -0.048 && P.y > 0.044 && P.y < 0.074) alb = P.y > 0.071 ? vec3(0.42, 0.43, 0.45) : vec3(0.3, 0.31, 0.33);
    // Deux poubelles grillagées à droite de la porte.
    for (int i = 0; i < 2; i++) {
      float x0 = 0.05 + float(i) * 0.034;
      vec2 bq = vec2(rel - x0, P.y);
      if (abs(bq.x) < 0.015 && bq.y < 0.046) {
        float cyl = 1.0 - pow(bq.x / 0.015, 2.0);
        vec3 metal = vec3(0.5, 0.51, 0.53) * (0.55 + 0.5 * cyl);
        if (fract(bq.x / 0.004) < 0.25 || fract(bq.y / 0.006) < 0.2) metal *= 0.7;
        if (bq.y > 0.041) metal = vec3(0.62, 0.63, 0.65);
        alb = metal;
      }
    }
    // Bancs devant la fresque.
    if (((rel > 0.2 && rel < 0.37) || (rel > 0.45 && rel < 0.62)) && P.y < 0.034 && P.y > 0.0) {
      alb = P.y > 0.017 ? vec3(0.66, 0.67, 0.68) : (fract(rel / 0.17) < 0.12 || fract(rel / 0.17) > 0.88 ? vec3(0.5) : vec3(0.08));
    }
    // Couronnement clair et ombre portée du tablier.
    if (P.y > WALL - 0.007) alb = vec3(0.68, 0.69, 0.7) * (0.9 + 0.12 * vn(vec2(rel * 80.0, 2.0)));
    // Pied du mur : remontées d’humidité au bord irrégulier, occlusion au contact du parvis.
    float damp = 1.0 - smoothstep(0.0, 0.01 + 0.016 * fbm4(vec2(rel * 16.0, 7.0)), P.y);
    alb *= 1.0 - 0.26 * damp * (1.0 - 0.5 * paint);
    vec3 light = shadeL * (0.7 + 0.3 * smoothstep(WALL, WALL - 0.05, P.y)) * (0.8 + 0.2 * smoothstep(0.0, 0.03, P.y)) + pool;
    vec3 c = alb * light;
    // Appliques : globe et grille.
    for (int i = 0; i < 4; i++) {
      vec2 d = (P - LP[i]) * vec2(1.0, 1.3);
      float dl = length(d);
      if (dl < 0.0095) {
        vec3 globe = mix(vec3(0.7, 0.72, 0.74) * shadeL, vec3(1.0, 0.86, 0.62) * 2.2, lon[i]);
        if (abs(d.y) < 0.0012 || abs(d.x) < 0.0012) globe *= 0.55;
        c = globe;
      }
      placeAdd += vec3(1.0, 0.76, 0.48) * lon[i] * 0.4 * exp(-dl * dl / 0.00035);
    }
    res = vec4(c, 1.0);
  }

  // --- Le pont ---
  // Bordure blanche : grands panneaux, joints, salissures, larmier.
  if (P.y >= FAS0 && P.y < FAS1) {
    float panel = floor(rel / 0.12);
    vec3 alb = vec3(0.6, 0.61, 0.63) * (0.95 + 0.06 * hash12(vec2(panel, 1.0)));
    if (fract(rel / 0.12) < 0.012) alb *= 0.62;
    alb *= 1.0 - 0.18 * smoothstep(0.6, 0.9, vn(vec2(rel * 40.0, P.y * 90.0)));
    // Coulures sous la glissière, grain du béton, nez de dalle qui prend la lumière.
    float drip = smoothstep(0.5, 0.85, vn(vec2(rel * 140.0, 0.5))) * smoothstep(FAS0, FAS1, P.y + 0.025 * vn(vec2(rel * 70.0, 1.5)));
    alb *= 1.0 - 0.22 * drip;
    alb *= mix(1.0, 0.9 + 0.2 * vn(vec2(rel, P.y) * 280.0), 1.0 - smoothstep(0.0015, 0.004, px));
    if (P.y > FAS1 - 0.0025) alb *= 1.12;
    alb *= 0.85 + 0.15 * smoothstep(FAS0, FAS1, P.y);
    if (P.y < FAS0 + 0.005) alb *= 0.4;
    res = vec4(alb * (openL * 0.8 + vec3(1.0, 0.7, 0.4) * 0.06 * lampsOn), 1.0);
  }
  // Voitures, en partie cachées par la glissière : même dessin que traffic() (scenes/common.ts) — nez arrondi,
  // pare-brise incliné, roues, vitres sombres, ombre de contact —, phares et feux la nuit.
  if (P.y >= FAS1 && P.y < FAS1 + 0.05) {
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
      float speed = 0.09 + 0.05 * hash12(vec2(fi, 3.0));
      float x = uPlace.x + (fract(t * speed * dir / 6.0 + hash12(vec2(fi, 4.0))) - 0.5) * 6.0;
      float lane = FAS1 + 0.002 + (dir > 0.0 ? 0.0 : 0.003);
      vec2 q = vec2(rel - x, P.y - lane);
      if (abs(q.x) < 0.034 && q.y < 0.02) {
        // Unités de voiture (1 = 0.015), fx vers l’avant, roues posées en 0 ; cpx = pixels par unité.
        vec2 cq = vec2(q.x * dir, q.y - 0.00075) / 0.015;
        float fx = cq.x;
        float cpx = 0.015 / px;
        // Ombre de contact sur la chaussée, glissée sous les voitures déjà dessinées.
        float sa = 0.55 * (1.0 - 0.6 * lampsOn) * (1.0 - smoothstep(1.2, 1.9, abs(fx))) * (1.0 - smoothstep(-0.05, 0.15, cq.y));
        float sna = res.a + sa * (1.0 - res.a);
        if (sna > 0.0) res.rgb = (res.rgb * res.a + vec3(0.04, 0.04, 0.045) * (openL * 0.8 + nightL) * sa * (1.0 - res.a)) / sna;
        res.a = sna;
        float rc = fx > 0.0 ? 0.22 : 0.13;
        vec2 bd = abs(vec2(fx, cq.y - 0.37)) - vec2(1.6, 0.27) + rc;
        float body = length(max(bd, 0.0)) + min(max(bd.x, bd.y), 0.0) - rc;
        float tz = clamp((cq.y - 0.6) / 0.52, 0.0, 1.0);
        float cab = max(max(fx - mix(0.78, 0.22, tz), mix(-1.3, -1.02, tz) - fx) * 0.72, max(0.5 - cq.y, cq.y - 1.12));
        float wd = min(length(vec2(fx - 1.0, cq.y - 0.2)), length(vec2(fx + 1.02, cq.y - 0.2)));
        float wheel = wd - 0.25;
        float m = clamp(1.0 - min(min(body, cab), wheel) * cpx, 0.0, 1.0);
        if (m > 0.0) {
          vec3 paint = mix(vec3(0.75, 0.76, 0.78), mix(vec3(0.55, 0.08, 0.06), vec3(0.08, 0.12, 0.25), step(0.5, hash12(vec2(fi, 6.0)))), step(0.45, hash12(vec2(fi, 2.0))));
          vec3 car = paint * (0.7 + 0.35 * smoothstep(0.12, 0.6, cq.y) + 0.18 * exp(-(cq.y - 0.58) * (cq.y - 0.58) / 0.004));
          car *= 1.0 - 0.35 * (1.0 - smoothstep(0.12, 0.22, cq.y));
          float gd = max(max(cab + 0.1, 0.66 - cq.y), 0.06 - abs(fx + 0.28));
          car = mix(car, mix(vec3(0.035, 0.04, 0.055), vec3(0.13, 0.15, 0.19), smoothstep(0.7, 1.08, cq.y)), clamp(0.5 - gd * cpx, 0.0, 1.0));
          float hl = max(abs(fx - 1.52) - 0.09, abs(cq.y - 0.34) - 0.07);
          car = mix(car, vec3(0.95, 0.92, 0.82), clamp(0.5 - hl * cpx, 0.0, 1.0));
          float tl = max(abs(fx + 1.53) - 0.08, abs(cq.y - 0.36) - 0.07);
          car = mix(car, vec3(0.55, 0.05, 0.04), clamp(0.5 - tl * cpx, 0.0, 1.0));
          car = mix(car, vec3(0.03), clamp(0.5 - wheel * cpx, 0.0, 1.0));
          car = mix(car, vec3(0.32, 0.33, 0.35), clamp(0.5 - (wd - 0.1) * cpx, 0.0, 1.0));
          car *= openL * 0.9 + nightL;
          float na = m + res.a * (1.0 - m);
          res.rgb = (car * m + res.rgb * res.a * (1.0 - m)) / na;
          res.a = na;
        }
      }
      vec2 fr = vec2(x + dir * 0.024, lane + 0.006);
      vec2 rr = vec2(x - dir * 0.024, lane + 0.006);
      float on = 0.25 + 1.2 * lampsOn;
      placeAdd += vec3(1.0, 0.93, 0.8) * glowPt(length(P - fr) * k / uScale, 1.4) * on;
      placeAdd += vec3(1.0, 0.1, 0.05) * glowPt(length(P - rr) * k / uScale, 1.2) * on * 0.8;
    }
  }
  // Glissière : montants et lisses.
  if (P.y >= FAS1 && P.y < FAS1 + 0.024) {
    float post = step(fract(rel / 0.045), 0.07);
    float rail = step(abs(P.y - FAS1 - 0.022), 0.0016) + step(abs(P.y - FAS1 - 0.011), 0.0012);
    if (post + rail > 0.0) res = vec4(vec3(0.55, 0.57, 0.6) * (openL * 0.8 + nightL), 1.0);
  }
  // Lampadaires du pont.
  {
    float li = floor(rel / 0.42);
    float x0 = (li + 0.5) * 0.42;
    float pole = step(abs(rel - x0), 0.0022 + px * 0.5) * step(FAS1, P.y) * step(P.y, FAS1 + 0.078);
    float arm = step(abs(P.y - FAS1 - 0.078), 0.002 + px * 0.5) * step(x0, rel) * step(rel, x0 + 0.026);
    if (max(pole, arm) > 0.0) res = vec4(vec3(0.28, 0.29, 0.31) * (openL * 0.8 + nightL), 1.0);
    float on = smoothstep(0.0, 0.2, lampsOn - hash12(vec2(li, 3.0)) * 0.6);
    vec2 dl = (P - vec2(x0 + 0.025, FAS1 + 0.074)) * k / uScale;
    placeAdd += vec3(1.0, 0.62, 0.25) * on * (1.5 * exp(-dot(dl, dl) / 4.0) + 0.07 * exp(-length(dl) / 30.0));
  }

  // --- Le parvis ---
  if (P.y <= 0.0) {
    // Béton du trottoir lié au sol (plus de grain d’écran qui glisse) : granulats, taches, dalles en perspective.
    float lodP = 1.0 - smoothstep(0.0015, 0.004, px);
    float grit = (0.9 + 0.2 * mix(0.5, vn(vec2(rel, P.y * 2.5) * 260.0), lodP)) * (0.88 + 0.24 * fbm4(vec2(rel * 9.0, P.y * 45.0)));
    vec3 alb = vec3(0.22, 0.22, 0.23) * grit;
    if (P.y > -0.03) {
      float xs = (rel - uPlace.x) / (1.0 - P.y * 8.0) + uPlace.x;
      float jd = abs(fract(xs / 0.11) - 0.5);
      alb *= 1.0 - 0.35 * smoothstep(0.5 - 1.5 * px / 0.11, 0.5, jd);
    }
    // Bordure de trottoir, puis la chaussée.
    if (P.y < -0.03 && P.y > -0.036) alb = vec3(0.45, 0.45, 0.46) * (P.y > -0.0325 ? 1.08 : 0.72) * (0.92 + 0.16 * fbm4(vec2(rel * 30.0, 3.0)));
    if (P.y <= -0.036) alb = vec3(0.13, 0.13, 0.14) * grit * (0.7 + 0.3 * smoothstep(-0.036, -0.044, P.y));
    vec3 c = alb * (openL * 0.75 + pool * 0.45);
    // Flaques : reflets du ciel et des appliques.
    float wet = smoothstep(0.6, 0.66, fbm4(vec2(rel * 7.0, P.y * 32.0)));
    if (wet > 0.0 && P.y > -0.03) {
      vec3 refl = mix(vec3(0.06, 0.1, 0.22) * uDay, nightL, 1.0 - uDay) * 0.9;
      for (int i = 0; i < 4; i++) {
        float dx = (rel - LP[i].x) / 0.006;
        refl += vec3(1.0, 0.76, 0.46) * lon[i] * 0.5 * exp(-dx * dx) * (0.7 + 0.3 * sin(P.y * 900.0 + t * 2.0));
      }
      c = mix(c, refl, wet * 0.85);
    }
    // Ombre douce au pied du mur.
    c *= 0.68 + 0.32 * smoothstep(0.0, -0.016, P.y);
    // Ombres de contact : bancs, poubelles et piles du pont posés sur le parvis.
    float occ = 1.0 - smoothstep(0.0, 0.01, sdBox(vec2(rel - 0.285, P.y + 0.003), vec2(0.085, 0.004)));
    occ = max(occ, 1.0 - smoothstep(0.0, 0.01, sdBox(vec2(rel - 0.535, P.y + 0.003), vec2(0.085, 0.004))));
    occ = max(occ, 1.0 - smoothstep(0.0, 0.008, sdBox(vec2(rel - 0.067, P.y + 0.002), vec2(0.033, 0.003))));
    occ = max(occ, 1.0 - smoothstep(0.0, 0.012, min(sdBox(vec2(rel - WL + 0.08, P.y + 0.004), vec2(0.055, 0.005)), sdBox(vec2(rel - WR - 0.08, P.y + 0.004), vec2(0.055, 0.005)))));
    c *= 1.0 - 0.4 * occ;
    res = vec4(c, 1.0);
  }
  // Pigeons sur le parvis, de jour : ils picorent, puis s’envolent quand l’ombre arrive.
  float stay = smoothstep(0.18, 0.4, uDay);
  if (stay > 0.0 && P.y < 0.03 && P.y > -0.02) {
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float x0 = 0.66 + fi * 0.06 + 0.012 * sin(t * 0.25 + fi * 2.0);
      float dir = sin(t * 0.25 + fi * 2.0 + 1.57) > 0.0 ? 1.0 : -1.0;
      float peck = step(fract(t * 0.6 + fi * 0.37), 0.18);
      vec2 q = vec2((rel - x0) * dir, P.y - 0.004);
      float bodyD = length(q / vec2(0.009, 0.0055)) - 1.0;
      float headD = length(q - vec2(0.008, 0.006 - 0.006 * peck)) - 0.0034;
      float d = min(bodyD * 0.0055, headD);
      if (d < px * 0.5) {
        vec3 feather = headD < 0.0 ? vec3(0.32, 0.34, 0.4) : vec3(0.42, 0.43, 0.48);
        res = vec4(mix(res.rgb, feather * openL * 0.8, stay), 1.0);
      }
    }
  }
  // Étalonnage : le premier plan reste en retrait de l’éclipse — plus sombre vers le bas de l’écran,
  // légèrement refroidi quand la lumière baisse.
  res.rgb *= 0.82 * mix(0.5, 1.0, smoothstep(-0.1, 0.22, P.y));
  res.rgb = mix(res.rgb, res.rgb * vec3(0.8, 0.88, 1.1), 1.0 - uDay);
  placeAdd *= 0.9;
  return res;
}
`,i=[[6e-4,23,1.3],[5e-4,37,4.1],[45e-5,59,2.2],[35e-5,83,5],[28e-5,127,.7],[22e-5,173,3.3],[16e-5,251,1.9]],a=1.025,o=.62,s=i.map(([e,t,n])=>`${e.toFixed(5)}*sin(${t.toFixed(1)}*a+${n.toFixed(2)})`).join(`+`),c=`#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,l=`#version 300 es
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
const float RM = ${a.toFixed(4)};

// Protubérances : angle de position, demi-largeur (rad), hauteur (R), forme (0 boucle → 1 nuage)
const vec4 PROM[3] = vec4[3](
  vec4(2.62, 0.045, 0.050, 0.3),
  vec4(4.05, 0.060, 0.038, 1.0),
  vec4(0.55, 0.035, 0.060, 0.7)
);

float limb(float a){ return ${s}; }

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

${r}

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
    float ld = 1.0 - ${o.toFixed(2)} * (1.0 - mu);
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

  // Premier plan : la façade de l’Éclipse sous le pont (totalite-place.ts) ; un peu d’éblouissement déborde dessus.
  // Un Soleil caché par le pont n’éblouit plus : l’éblouissement s’éteint avec la part du disque masquée.
  float topPx = uPlace.z - uPlace.w + 0.362 * min(uRes.y, uRes.x * 1.1) * uPlace.y;
  G *= smoothstep(topPx - uR, topPx + uR, uSun.y);
  vec3 X = L * uE + G + S;
  // Paysage découvert quand la caméra s’élève (cité, plaine, horizon), puis la façade devant.
  vec4 city = placeCity(fc);
  X = mix(X, city.rgb, city.a);
  vec4 fg = placeFg(fc);
  X = mix(X, fg.rgb, fg.a) + placeAdd;
  vec3 col = toSrgb(aces(X * uFade));
  // Dither triangulaire fixe (anti-banding), sans grain animé.
  float n1 = hash12(fc);
  float n2 = hash12(fc.yx + 3.1);
  col += (n1 + n2 - 1.0) / 255.0;
  outColor = vec4(col, 1.0);
}`,u=Math.PI*2,d=1e6,f=1.5,p=26e5,m=Math.atan2(.55,1)*180/Math.PI,h=e=>[Math.cos(e*Math.PI/180),Math.sin(e*Math.PI/180)],g=i.reduce((e,[t])=>e+t,0),_=4096,v=new Float32Array(4097);for(let e=0;e<=_;e++){let t=e/_*u,n=0;for(let[e,r,a]of i)n+=e*Math.sin(r*t+a);v[e]=n}var y=e=>{let t=e/u%1;t<0&&(t+=1);let n=t*_,r=n|0,i=n-r;return v[r]*(1-i)+v[r+1]*i},b=48,x=6,S=28,C=288,w=new Float32Array(C),T=new Float32Array(C);for(let e=0;e<C;e++){let t=(e+.5)/C*u;w[e]=Math.cos(t),T[e]=Math.sin(t)}var E=new Float32Array(S),D=new Float32Array(S),O=0;for(let e=0;e<S;e++){let t=(e+.5)/S,n=1-(1-t)**3,r=3*(1-t)**2/S,i=Math.sqrt(Math.max(0,1-n*n));E[e]=n,D[e]=n*r*(u/C)*(1-o*(1-i)),O+=D[e]*C}var k=b/24;function A(e,t=h(m)){let n=new Float32Array(72),r=t[0]*e,i=t[1]*e,o=a-g-1e-4,s=a+g+1e-4,c=o*o,l=s*s,u=0;for(let e=0;e<C;e++){let t=Math.floor(e/x/k)*3,a=w[e],o=T[e];for(let e=0;e<S;e++){let s=E[e]*a,d=E[e]*o,f=s-r,p=d-i,m=f*f+p*p;if(m<c||m<l&&Math.sqrt(m)<1.025+y(Math.atan2(p,f)))continue;let h=D[e];n[t]+=h,n[t+1]+=h*s,n[t+2]+=h*d,u+=h}}let d=0;for(let e=0;e<24;e++)n[e*3]>n[d*3]&&(d=e);return{W:u/O,groups:n,maxIndex:d}}var j=e=>Math.min(1,Math.max(0,e)),M=e=>1/(32e4*e+5),N=e=>e<=0?0:j((Math.log10(.003)-Math.log10(e))/1.2)*j((Math.log10(e)+7)/1.2),P=e=>j((e/.45)**.3);function F(e,t,n=m){let r=h(n),i=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:`high-performance`});if(!i)return null;let a=(e,t)=>{let n=i.createShader(e);if(i.shaderSource(n,t),i.compileShader(n),!i.getShaderParameter(n,i.COMPILE_STATUS))throw Error(i.getShaderInfoLog(n)??`shader`);return n},o=i.createProgram();try{if(i.attachShader(o,a(i.VERTEX_SHADER,c)),i.attachShader(o,a(i.FRAGMENT_SHADER,l)),i.linkProgram(o),!i.getProgramParameter(o,i.LINK_STATUS))throw Error(i.getProgramInfoLog(o)??`link`)}catch(e){return console.warn(`[totalité] WebGL indisponible, repli conservé.`,e),null}i.useProgram(o),i.bindVertexArray(i.createVertexArray());let s=e=>i.getUniformLocation(o,e),u={res:s(`uRes`),sun:s(`uSun`),R:s(`uR`),moon:s(`uMoon`),E:s(`uE`),F:s(`uF`),day:s(`uDay`),tot:s(`uTot`),time:s(`uTime`),par:s(`uPar`),bands:s(`uBands`),glow:s(`uGlow`),fade:s(`uFade`),scale:s(`uScale`),corona:s(`uCorona`),emN:s(`uEmN`),em:s(`uEm`),star:s(`uStar`),cam:s(`uCam`),place:s(`uPlace`)},g=new Float32Array(96),_=1,v=1,y=16.7,b=0,x=0,S=NaN,C=A(.006,r),w=Math.log(M(0)),T=!1,E=1,D={key:``};function k(){let t=Math.max(1,e.clientWidth*e.clientHeight);v=Math.min(window.devicePixelRatio||1,f,Math.sqrt(p/t))*_;let n=Math.max(1,Math.round(e.clientWidth*v)),r=Math.max(1,Math.round(e.clientHeight*v));(e.width!==n||e.height!==r)&&(e.width=n,e.height=r),i.viewport(0,0,n,r),D.key=``}function F(t,n,a,o,s,c){let l=e.width,f=e.height,p=Math.min(l,f);t!==S&&(C=A(t,r),S=t);let m=(C.W*a*d)**.4*(1-.45*j((C.W-.05)/.5)),h=0;for(let e=0;e<24;e++){let t=C.groups[e*3];t<=0||(g[h*4]=C.groups[e*3+1]/t,g[h*4+1]=C.groups[e*3+2]/t,g[h*4+2]=C.W>0?2.6*(t/O/C.W)*m:0,g[h*4+3]=0,h++)}let _=C.groups[C.maxIndex*3],y=C.W>0?_/O/C.W:0;i.uniform2f(u.res,l,f),i.uniform2f(u.sun,n.x*v,f-n.y*v),i.uniform1f(u.R,n.r*v),i.uniform2f(u.moon,r[0]*t,r[1]*t),i.uniform1f(u.E,a),i.uniform1f(u.F,C.W),i.uniform1f(u.glow,1+1.6*j((C.W-.002)/.15)),i.uniform1f(u.fade,o),i.uniform1f(u.day,s),i.uniform1f(u.time,c.t),i.uniform2f(u.par,c.px*v,-c.py*v),i.uniform1f(u.bands,N(C.W)),i.uniform1f(u.tot,j(1-s/.14)),i.uniform1f(u.scale,p/900),i.uniform1f(u.cam,(Math.max(1,n.r*v)/(.1*p))**.45),i.uniform1f(u.corona,+(a>4e-4)),i.uniform4f(u.place,n.p??0,n.z??1,(n.g??0)*f,(n.c??0)*f),i.uniform1i(u.emN,h),i.uniform4fv(u.em,g),i.uniform3f(u.star,_>0?C.groups[C.maxIndex*3+1]/_:0,_>0?C.groups[C.maxIndex*3+2]/_:0,C.W>0?1.5*y*y*m:0),i.drawArrays(i.TRIANGLES,0,3)}function I(e){y+=(e*1e3-y)*.1,y>21?b++:b=0,y<12.5?x++:x=0,b>20&&_>.5?(_=Math.max(.5,_*.85),b=0,k()):x>150&&_<1&&(_=Math.min(1,_*1.1),x=0,k())}let L=e=>{e.preventDefault(),t()};return e.addEventListener(`webglcontextlost`,L),{frame(t,n,i,a,o,s,c){I(n);let l=Number.isFinite(o)?(t-o)/1e3:1/0,u=!T&&l<1;i!==S&&(C=A(i,r),S=i);let d=Math.log(M(C.W)),f=P(C.W),p=1;if(s.still)T=!0,w=d,E=f;else if(u){let e=1-(1-j(l/1))**3;w=d+Math.log(1.8)*(1-e),E=f,p=e}else{T=!0;let e=d>w?.45:.16;w+=(d-w)*(1-Math.exp(-n/e)),Math.abs(d-w)<.01&&(w=d),E+=(f-E)*(1-Math.exp(-n/.3)),Math.abs(f-E)<.002&&(E=f)}let m=Math.exp(w),h=`${i}|${m}|${p}|${E}|${a.x}|${a.y}|${a.r}|${a.p}|${a.z}|${a.g}|${a.c}|${e.width}|${s.t}|${s.px}|${s.py}`;return c&&h!==D.key&&(F(i,a,m,p,E,s),D.key=h),u||w!==d||E!==f},resize:k,dispose(){e.removeEventListener(`webglcontextlost`,L)},stats:()=>({quality:_,frameMs:y}),daylight:()=>E}}export{F as createEclipse};