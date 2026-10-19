import{n as e,t}from"./vegetation.CIQOM6sl.js";var n={frag:`
// Barres : x0, x1 (hauteurs d’écran, centrées), pied, hauteur ; puis pente du toit (perspective), profondeur, palette.
const int NB = 6;
const vec4 BAR[NB] = vec4[NB](
  vec4(-1.65, -0.35, 0.075, 0.25), vec4(0.05, 1.7, 0.07, 0.27),
  vec4(-1.25, 0.25, 0.04, 0.29), vec4(0.45, 1.55, 0.035, 0.26),
  vec4(-0.95, 0.55, 0.0, 0.3), vec4(0.85, 1.9, 0.005, 0.28)
);
const vec3 BAR2[NB] = vec3[NB](
  vec3(0.03, 1.0, 0.0), vec3(-0.025, 1.0, 1.0),
  vec3(-0.02, 0.62, 1.0), vec3(0.035, 0.62, 0.0),
  vec3(0.012, 0.0, 0.0), vec3(-0.03, 0.0, 1.0)
);

${e}
${t}
// Arbres devant la cité : rangée r (0 : derrière la haie, 1 : grands feuillus sur le trottoir), cellule c.
// Renvoie x du pied, hauteur (négative : pas d’arbre), essence (0 peuplier, 1 feuillu).
vec3 avTreeSpot(float c, int r){
  float fr = float(r);
  float cw = r == 0 ? 0.16 : 0.31;
  if (hash12(vec2(c, 2.0 + fr * 17.0)) < (r == 0 ? 0.3 : 0.62)) return vec3(0.0, -1.0, 0.0);
  float kind = r == 0 ? step(0.62, hash12(vec2(c, 8.0))) : 1.0;
  float H = r == 0 ? mix(0.1, 0.19, hash12(vec2(c, 5.0))) * mix(1.0, 0.72, kind) : mix(0.12, 0.17, hash12(vec2(c, 22.0)));
  float tx = (c + 0.25 + 0.5 * hash12(vec2(c, 3.0 + fr * 17.0))) * cw;
  return vec3(tx, H, kind);
}
vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  float hu = min(uRes.y, uRes.x * 1.1);
  float dark = P_dark;
  float front = smoothstep(0.0, 1.0, clamp(dark * 1.9 - (uv.x * 0.7 + (1.0 - uv.y) * 0.25), 0.0, 1.0));
  float dayAmt = 1.0 - front;

  // Ciel
  vec3 zenith = vec3(0.030, 0.105, 0.400);
  vec3 low = vec3(0.150, 0.290, 0.620);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, uv.y));
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  float R = P_sr * minD;
  float frac = sunFraction(P_d);
  daySky += vec3(0.28, 0.33, 0.40) * exp(-length(fc - sc) / (uScale * 260.0)) * (0.3 + 0.7 * frac);
  float groundY = P_ground * uRes.y;
  float hz = max(fc.y - groundY, 0.0) / hu;
  vec3 night = vec3(0.004, 0.006, 0.016) + vec3(0.050, 0.030, 0.045) * exp(-hz / 0.30)
    + (vec3(0.42, 0.17, 0.05) * exp(-hz / 0.07) + vec3(0.30, 0.22, 0.12) * exp(-hz / 0.022)) * dark;
  vec3 col = mix(daySky * (0.25 + 0.75 * frac), night, front);

  // Étoiles dans la partie du ciel déjà dans l’ombre.
  vec2 st = (fc + uPar) / (uScale * 34.0);
  vec2 ci = floor(st);
  float hs = hash12(ci + 3.7);
  if (hs > 0.955) {
    vec2 off = (vec2(hash12(ci + 1.1), hash12(ci + 8.2)) - 0.5) * 0.7;
    float dd = length(fract(st) - 0.5 - off) * 34.0 * uScale;
    float tw = 1.0 + 0.25 * sin(uTime * (1.5 + 3.0 * hs) + hs * 50.0);
    col += front * front * vec3(0.85, 0.9, 1.0) * (0.05 + 0.6 * pow(hash12(ci + 5.5), 4.0)) * tw * exp(-dd * dd / (0.8 * uScale * uScale + 0.3)) * smoothstep(0.12, 0.35, hz);
  }
  float a = radians(P_ang);
  col += eclipseSun((fc - sc) / R, P_d, vec2(cos(a), sin(a)), 1.0 / R) * mix(0.55, 1.0, front);
  col = shootingStars(col, fc, front * dark);
  col = birds(col, fc, dayAmt * frac, 0.3, 0.6);
  col = airplane(col, fc, front, 0.15, vec2(-0.05, 0.36), vec2(1.05, 0.92), 36.0);

  // Barres, de la plus lointaine à la plus proche.
  float Y = (fc.y - groundY) / hu;
  float X0 = (fc.x - uRes.x * 0.5) / hu;
  vec3 lightCol = mix(vec3(1.0, 0.97, 0.92), vec3(1.0, 0.8, 0.62), 1.0 - frac) * (0.2 + 0.8 * frac);
  for (int i = 0; i < NB; i++) {
    vec4 b = BAR[i];
    vec3 b2 = BAR2[i];
    float depth = b2.y;
    float X = X0 + uPar.x / hu * (1.0 - 0.7 * depth);
    vec3 alb;
    float win;
    vec2 g;
    if (avBar(b, b2.x, X, Y, 0.0, float(i) * 3.7 + b2.z * 11.0, 0.25 + 0.5 * b2.z, alb, win, g) < 0.5) continue;
    float top = b.z + b.w + b2.x * (X - b.x);
    vec3 dayC = alb * lightCol;
    // Perspective aérienne : les barres lointaines pâlissent et se désaturent, sans virer au violet.
    dayC = mix(dayC, vec3(dot(dayC, vec3(0.3, 0.59, 0.11))) * 0.7 + low * (0.25 + 0.75 * frac) * 0.3, depth * 0.35);
    vec3 nightC = alb * vec3(0.012, 0.013, 0.02) * (1.0 - depth * 0.4) + vec3(0.18, 0.08, 0.03) * dark * exp(-max(top - Y, 0.0) * hu / (3.0 * uScale)) * 0.3;
    col = mix(dayC, nightC, front);
    // Fenêtres allumées.
    if (win > 0.0 && g.y >= 0.0) {
      vec2 cell = floor(g);
      float h = hash12(cell + float(i) * 13.1);
      float on = smoothstep(h, h + 0.035, P_win * 0.6);
      float k = hash12(cell + float(i) * 7.7 + 2.0);
      vec3 lamp = k > 0.84 ? vec3(0.55, 0.7, 1.0) * (0.8 + 0.2 * sin(uTime * (4.0 + 6.0 * k) + h * 40.0)) : mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.82, 0.55), k);
      col += lamp * on * win * (0.12 + 0.3 * hash12(cell + 5.0)) * (1.0 - depth * 0.5);
    }
  }

  // Sol, haie et arbres devant la cité (natTree : vegetation.ts). Albédo propre, lumière du Soleil voilé plus forte
  // côté Soleil, ciel en appoint ; la nuit, des silhouettes presque noires. Le vent fait bouger les houppiers.
  float sunSide = P_sx > 0.5 ? 1.0 : -1.0;
  vec3 skyAmb = low * (0.25 + 0.75 * frac);
  float Xt = X0 + uPar.x / hu;
  float roadY = groundY - 0.012 * hu;
  // Route et trottoir au pied : enrobé grenu, bordure claire, ombres de contact de la haie et des arbres.
  if (fc.y < groundY) {
    float dY = -Y;
    float walk = 1.0 - smoothstep(0.0068, 0.0078, dY);
    float grain = 0.88 + 0.24 * vnoise(vec2(Xt, Y) * 300.0);
    vec3 gAlb = mix(vec3(0.07, 0.074, 0.082), vec3(0.17, 0.168, 0.162) * (0.94 + 0.12 * vnoise(vec2(Xt * 90.0, 1.0))), walk) * grain;
    float kd = (dY - 0.0073) * hu / (1.2 * uScale);
    gAlb = mix(gAlb, vec3(0.3, 0.295, 0.285), exp(-kd * kd) * 0.7);
    float sh = 1.0 - 0.4 * exp(-dY * hu / (5.0 * uScale));
    float c1 = floor(Xt / 0.31);
    for (int j = -1; j <= 1; j++) {
      vec3 sp = avTreeSpot(c1 + float(j), 1);
      if (sp.y < 0.0) continue;
      vec2 dq = vec2((Xt - sp.x + sunSide * sp.y * 0.12) / (sp.y * 0.42), (dY - 0.002) / 0.005);
      sh *= 1.0 - (0.2 + 0.35 * dayAmt) * exp(-dot(dq, dq));
    }
    col = mix(gAlb * sh * (lightCol + skyAmb * 0.2), vec3(0.006, 0.006, 0.01) * (0.8 + 0.5 * walk) * sh, front);
  }
  for (int r = 0; r < 2; r++) {
    // Sous-bois et haie entre les deux rangées : touffes, pied dans l’ombre, crête éclairée.
    if (r == 1 && Y >= 0.0 && Y < 0.08) {
      float ht = 0.035 + 0.03 * fbm(vec2(X0 * 9.0, 1.0)) + 0.012 * vnoise(vec2(Xt * 46.0, 4.0));
      float hc = clamp((ht - Y) * hu + 0.5, 0.0, 1.0);
      if (hc > 0.0) {
        float cl = vnoise(vec2(Xt * 95.0, Y * 120.0) + 7.0) * 0.65 + vnoise(vec2(Xt * 260.0, Y * 300.0)) * 0.35;
        vec3 hAlb = mix(vec3(0.034, 0.055, 0.03), vec3(0.075, 0.09, 0.042), smoothstep(0.3, 0.7, vnoise(vec2(Xt * 14.0, 3.0))));
        float occl = mix(0.4, 1.0, smoothstep(0.0, ht, Y)) * (0.6 + 0.7 * cl);
        float rim = exp(-max(ht - Y, 0.0) * hu / (3.0 * uScale));
        vec3 dayH = hAlb * occl * (lightCol * (0.8 + 0.4 * rim) + skyAmb * 0.25);
        col = mix(col, mix(dayH, hAlb * vec3(0.03, 0.033, 0.045) * occl, front), hc);
      }
    }
    float cw = r == 0 ? 0.16 : 0.31;
    float c0 = floor(Xt / cw);
    float base = r == 0 ? 0.012 : -0.002;
    for (int j = -1; j <= 1; j++) {
      vec3 sp = avTreeSpot(c0 + float(j), r);
      if (sp.y < 0.0) continue;
      vec2 q = vec2(Xt - sp.x, Y - base) / sp.y;
      if (q.y < -0.02 || q.y > 1.08 || abs(q.x) > 0.8) continue;
      vec4 t = natTree(q, (c0 + float(j)) * 1.618 + float(r) * 41.0, uTime, 1.0 / (sp.y * hu), sp.z);
      if (t.a <= 0.0) continue;
      float side = clamp(0.5 + q.x * sunSide * 2.4, 0.0, 1.0);
      float up = smoothstep(0.05, 1.0, q.y);
      vec3 dayT = t.rgb * (lightCol * (0.5 + 0.65 * side) + skyAmb * (0.15 + 0.25 * up));
      // La rangée du fond prend un peu de l’air de la cité.
      dayT = mix(dayT, vec3(dot(dayT, vec3(0.3, 0.59, 0.11))) * 0.85 + skyAmb * 0.1, r == 0 ? 0.15 : 0.0);
      vec3 nightT = t.rgb * vec3(0.03, 0.033, 0.045) + vec3(0.1, 0.045, 0.015) * dark * 0.04 * up;
      col = mix(col, mix(dayT, nightT, front), t.a);
    }
  }
  col = traffic(col, fc, roadY, front, (0.3 + 0.7 * frac) * dayAmt + 0.02, 7.0 * uScale, 1.0);
  float lampsOn = smoothstep(0.5, 0.75, dark);
  if (lampsOn > 0.0 && Y < 0.07) {
    float lx = X0 / 0.11;
    float li = floor(lx);
    vec2 lp = vec2((li + 0.5) * 0.11, 0.045);
    float on = smoothstep(0.0, 0.15, lampsOn - hash12(vec2(li, 3.0)) * 0.8);
    float dl = length((vec2(X0, Y) - lp) * hu) / uScale;
    col += vec3(1.0, 0.55, 0.18) * on * (1.2 * exp(-dl * dl / 3.0) + 0.05 * exp(-dl / 22.0));
  }
  return col;
}`,params:[`dark`,`win`,`sx`,`sy`,`sr`,`d`,`ang`,`ground`,`day`],defaults:{dark:0,win:0,sx:.74,sy:.72,sr:.07,d:.9,ang:100,ground:0,day:.8}};export{n as default};