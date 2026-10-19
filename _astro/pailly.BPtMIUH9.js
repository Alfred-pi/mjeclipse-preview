var e={frag:`
const vec2 DOOR = vec2(0.24, 0.0);
const float WALL = 0.21;   // haut du mur de la maison
const float FAS0 = 0.232;  // bas de la bordure du pont
const float FAS1 = 0.284;  // haut de la bordure = chaussée
const float WL = -0.3;     // bord gauche du mur (relatif à la porte)
const float WR = 2.3;      // bord droit

// Chiffre en sept segments, cellule 1 × 2 (origine en bas à gauche) : distance au trait.
float digit(vec2 p, int n){
  float d = 1e3;
  if (n != 1) d = min(d, sdSeg(p, vec2(0.0, 2.0), vec2(1.0, 2.0)));
  if (n != 1) d = min(d, sdSeg(p, vec2(1.0, 2.0), vec2(1.0, 1.0)));
  if (n == 0) d = min(d, sdSeg(p, vec2(1.0, 1.0), vec2(1.0, 0.0)));
  if (n != 1) d = min(d, sdSeg(p, vec2(0.0, 0.0), vec2(1.0, 0.0)));
  if (n == 0) d = min(d, sdSeg(p, vec2(0.0, 1.0), vec2(0.0, 0.0)));
  if (n == 0) d = min(d, sdSeg(p, vec2(0.0, 2.0), vec2(0.0, 1.0)));
  if (n == 2) d = min(d, sdSeg(p, vec2(1.0, 1.05), vec2(0.0, 1.05)));
  if (n == 2) d = min(d, sdSeg(p, vec2(0.0, 1.05), vec2(0.0, 0.0)));
  if (n == 1) d = min(d, sdSeg(p, vec2(0.5, 2.0), vec2(0.5, 0.0)));
  if (n == 1) d = min(d, sdSeg(p, vec2(0.1, 1.55), vec2(0.5, 2.0)));
  return d;
}

// « 1220 » en deux lignes, comme sur le mur : « 12 » en bas à gauche, « 20 » en haut à droite. q en unités du lettrage.
float tag1220(vec2 q){
  q.x -= q.y * 0.12;
  float d = digit(q, 1);
  d = min(d, digit(q - vec2(1.0, 0.0), 2));
  d = min(d, digit((q - vec2(1.25, 2.45)) / 0.85, 2) * 0.85);
  d = min(d, digit((q - vec2(2.4, 2.45)) / 0.85, 0) * 0.85);
  return d;
}

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  float hu = min(uRes.y, uRes.x * 1.1);
  float dark = P_dark;
  float front = smoothstep(0.0, 1.0, clamp(dark * 1.9 - (uv.x * 0.7 + (1.0 - uv.y) * 0.25), 0.0, 1.0));
  float frac = sunFraction(P_d);
  float dayAmt = 1.0 - front;

  // Ciel (non zoomé : le Soleil reste à sa place à l’écran)
  vec3 zenith = vec3(0.03, 0.105, 0.40);
  vec3 low = vec3(0.16, 0.29, 0.6);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, uv.y));
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  float R = P_sr * minD;
  daySky += vec3(0.28, 0.33, 0.40) * exp(-length(fc - sc) / (uScale * 260.0)) * (0.3 + 0.7 * frac);
  float groundY = P_ground * uRes.y;
  float hz = max(fc.y - groundY, 0.0) / hu;
  vec3 night = vec3(0.004, 0.006, 0.016) + vec3(0.05, 0.03, 0.045) * exp(-hz / 0.3)
    + (vec3(0.42, 0.17, 0.05) * exp(-hz / 0.07) + vec3(0.3, 0.22, 0.12) * exp(-hz / 0.022)) * dark;
  vec3 col = mix(daySky * (0.25 + 0.75 * frac), night, front);
  vec2 st = (fc + uPar * 0.3) / (uScale * 34.0);
  vec2 ci = floor(st);
  float hs = hash12(ci + 3.7);
  if (hs > 0.955) {
    vec2 off = (vec2(hash12(ci + 1.1), hash12(ci + 8.2)) - 0.5) * 0.7;
    float dd = length(fract(st) - 0.5 - off) * 34.0 * uScale;
    float tw = 1.0 + 0.25 * sin(uTime * (1.5 + 3.0 * hs) + hs * 50.0);
    col += front * front * vec3(0.85, 0.9, 1.0) * (0.05 + 0.6 * pow(hash12(ci + 5.5), 4.0)) * tw * exp(-dd * dd / (0.8 * uScale * uScale + 0.3)) * smoothstep(0.15, 0.35, hz);
  }
  float a = radians(P_ang);
  col += eclipseSun((fc - sc) / R, P_d, vec2(cos(a), sin(a)), 1.0 / R) * mix(0.55, 1.0, front);
  col = shootingStars(col, fc, front * dark);
  col = birds(col, fc, dayAmt * frac, 0.7, 0.66);
  col = airplane(col, fc, front, 0.55, vec2(1.05, 0.5), vec2(-0.05, 0.95), 40.0);

  // Monde : hauteurs d’écran, origine au pied de la porte ; l’approche (zoom) garde la porte fixe à l’écran.
  // Sur écran étroit, la porte se place à gauche pour laisser voir le « 1220 » et la fresque.
  vec2 doorPx = vec2(mix(uRes.x * 0.5 + DOOR.x * hu, uRes.x * 0.22, uMobile), groundY);
  vec2 P = (fc - doorPx + uPar) / (hu * P_zoom) + DOOR;
  float pxW = 1.0 / (hu * P_zoom);
  vec3 sunLight = mix(vec3(1.0, 0.97, 0.92), vec3(1.0, 0.8, 0.62), 1.0 - frac) * (0.2 + 0.8 * frac);

  // La cité au loin, entre les piles.
  vec2 Pf = (fc - doorPx + uPar * 0.3) / (hu * mix(1.0, P_zoom, 0.4)) + DOOR;
  float cellF = floor(Pf.x * 5.0);
  float farTop = 0.12 + 0.07 * hash12(vec2(cellF, 2.0));
  if (Pf.y < farTop && Pf.y > 0.0) {
    col = mix(low * 0.42 + daySky * 0.05, vec3(0.02, 0.018, 0.03) + vec3(0.12, 0.05, 0.02) * dark * exp(-Pf.y / 0.1), front) * (0.4 + 0.6 * frac);
    vec2 wg = vec2(Pf.x * 150.0, Pf.y * 100.0);
    if (fract(wg.x) > 0.4 && fract(wg.y) > 0.45 && hash12(floor(wg) + 9.0) < 0.45 * dark) col += vec3(1.0, 0.7, 0.4) * 0.12 * front;
  }

  // Arbres entre la cité et le pont : houppiers en touffes, voilés par l’air ; silhouettes sombres la nuit.
  {
    float tb = 0.03 + 0.022 * vnoise(vec2(Pf.x * 22.0, 4.0)) + 0.01 * vnoise(vec2(Pf.x * 85.0, 5.0));
    if (Pf.y > 0.0 && Pf.y < tb + 0.01) {
      float tc = clamp((tb - Pf.y) * hu * mix(1.0, P_zoom, 0.4) + 0.5, 0.0, 1.0);
      float cl = vnoise(Pf * vec2(150.0, 180.0)) * 0.7 + vnoise(Pf * vec2(420.0, 480.0)) * 0.3;
      vec3 tDay = vec3(0.035, 0.05, 0.034) * (0.6 + 0.7 * cl) * (sunLight * (0.7 + 0.5 * smoothstep(0.3, 1.0, Pf.y / tb)) + low * 0.25);
      tDay = mix(tDay, low * 0.42 * (0.4 + 0.6 * frac), 0.35);
      col = mix(col, mix(tDay, vec3(0.006, 0.007, 0.011), front), tc);
    }
  }

  // Lumière reçue sous le pont : ombre du tablier le jour, appliques la nuit.
  float rel = P.x - DOOR.x;
  vec2 L1 = vec2(DOOR.x - 0.004, 0.178);
  vec2 L2 = vec2(DOOR.x + 0.56, 0.172);
  float pool = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 L = i == 0 ? L1 : L2;
    vec2 dl = (P - L) * vec2(1.0, 0.8);
    pool += exp(-dot(dl, dl) / 0.006) * (P.y < L.y + 0.01 ? 1.0 : 0.25);
  }
  vec3 lampLight = vec3(1.0, 0.72, 0.42) * pool * P_door * 0.9;
  // La nuit, la lueur de la ville et des lampadaires du pont éclaire encore un peu le mur.
  vec3 shade = sunLight * 0.5 * dayAmt + (vec3(0.03, 0.032, 0.045) + vec3(0.05, 0.035, 0.02) * P_lamps) * front;
  vec3 light = shade + lampLight;

  // Piles du pont, de part et d’autre de la maison.
  for (int i = 0; i < 2; i++) {
    float x0 = DOOR.x + (i == 0 ? WL - 0.07 : WR + 0.07);
    if (abs(P.x - x0) < 0.045 && P.y > 0.0 && P.y < FAS0) {
      // Béton banché : planches verticales, arêtes adoucies, pied plus sombre.
      float u = (P.x - x0) / 0.045;
      float board = 0.94 + 0.08 * vnoise(vec2(P.x * 420.0, P.y * 40.0)) - 0.05 * step(0.88, fract(P.x / 0.009));
      col = vec3(0.42, 0.42, 0.44) * light * 1.2 * (0.78 + 0.26 * (1.0 - u * u)) * board * mix(0.75, 1.0, smoothstep(0.0, 0.03, P.y));
    }
  }
  // Sous le tablier, au-dessus du mur : ombre.
  if (P.y > WALL && P.y < FAS0 && rel > WL - 0.2 && rel < WR + 0.2) col = vec3(0.02, 0.022, 0.03) * (0.3 + 0.7 * dayAmt * frac);

  // Le mur de l’Éclipse.
  if (rel > WL && rel < WR && P.y > 0.0 && P.y < WALL) {
    // Blocs de béton gris foncé, joints plus clairs.
    float row = floor(P.y / 0.0105);
    float bx = P.x / 0.026 + 0.5 * mod(row, 2.0);
    vec2 bf = vec2(fract(bx), fract(P.y / 0.0105));
    vec3 alb = vec3(0.17, 0.175, 0.19) * (0.92 + 0.16 * hash12(vec2(floor(bx), row)));
    if (bf.y < 0.09 || bf.x < 0.04) alb = vec3(0.27, 0.27, 0.29);
    // Couronnement clair en haut du mur.
    if (P.y > WALL - 0.008) alb = vec3(0.7, 0.71, 0.72);

    // Fresque turquoise et rose, contours noirs, reflets blancs.
    float mx0 = 0.16, mx1 = 2.15;
    float topM = 0.155 + 0.02 * fbm(vec2(rel * 5.0, 2.0));
    if (rel > mx0 && rel < mx1 && P.y > 0.012 && P.y < topM) {
      vec2 mp = vec2(rel * 7.0, P.y * 9.0);
      float n = fbm(mp + vec2(3.0, 1.0));
      float n2 = vnoise(mp * 1.7 + 11.0);
      vec3 m = vec3(0.03, 0.22, 0.29);
      if (n > 0.44) m = vec3(0.07, 0.55, 0.66);
      if (n > 0.56) m = vec3(0.45, 0.86, 0.92);
      if (n > 0.66) m = vec3(0.92, 0.95, 0.96);
      if (n2 > 0.8) m = vec3(0.86, 0.16, 0.52);
      float edge = min(min(abs(n - 0.44), abs(n - 0.56)), abs(n - 0.66));
      float ew = fwidth(n) * 1.2 + 0.004;
      m = mix(vec3(0.02), m, smoothstep(ew * 0.5, ew, edge));
      float fade = smoothstep(0.0, 0.006, topM - P.y) * smoothstep(0.0, 0.03, rel - mx0) * smoothstep(0.0, 0.05, mx1 - rel);
      alb = mix(alb, m, fade);
    }
    // Signature rose « Les Avanchets » au-dessus du début de la fresque.
    if (rel > 0.16 && rel < 0.34) {
      float yS = 0.168 + 0.004 * sin(rel * 140.0) + 0.0025 * sin(rel * 410.0) + (rel - 0.16) * 0.03;
      float dS = abs(P.y - yS);
      alb = mix(alb, vec3(0.95, 0.2, 0.55), smoothstep(0.0022 + pxW, 0.0022, dS) * step(0.3, fract(rel * 55.0)));
    }
    // « 1220 » blanc, ombre portée noire.
    vec2 tq = (P - vec2(DOOR.x + 0.036, 0.026)) / 0.025;
    float dT = tag1220(tq);
    float dSh = tag1220(tq - vec2(0.14, -0.14));
    float tw = 0.27;
    float pxT = pxW / 0.025;
    alb = mix(alb, vec3(0.02), smoothstep(tw + 0.14 + pxT, tw + 0.14, min(dT, dSh)));
    alb = mix(alb, vec3(0.94, 0.94, 0.92), smoothstep(tw + pxT, tw, dT));

    // Porte rouge, affiches, auvent blanc.
    if (abs(rel) < 0.022 && P.y < 0.096) {
      alb = vec3(0.6, 0.09, 0.05);
      vec2 dp = vec2((rel + 0.016) / 0.032, (P.y - 0.04) / 0.048);
      vec2 cell = floor(dp * vec2(2.0, 3.0));
      vec2 cf = fract(dp * vec2(2.0, 3.0));
      if (dp.x > 0.0 && dp.x < 1.0 && dp.y > 0.0 && dp.y < 1.0 && cf.x > 0.08 && cf.x < 0.92 && cf.y > 0.1 && cf.y < 0.9) alb = mix(vec3(0.85, 0.82, 0.74), vec3(0.6, 0.66, 0.78), step(0.6, hash12(cell)));
      if (abs(rel - 0.017) < 0.002 && abs(P.y - 0.045) < 0.002) alb = vec3(0.7);
    }
    if (rel > -0.03 && rel < 0.03 && P.y > 0.098 && P.y < 0.106) alb = vec3(0.86, 0.86, 0.85);
    // Coffret gris à gauche de la porte.
    if (rel > -0.072 && rel < -0.05 && P.y > 0.045 && P.y < 0.07) alb = vec3(0.3, 0.31, 0.33);
    // Bancs devant la fresque.
    if (((rel > 0.17 && rel < 0.33) || (rel > 0.4 && rel < 0.56)) && P.y < 0.032 && P.y > 0.018) alb = vec3(0.62, 0.63, 0.64);
    // Matière : piqûres du béton, joints en creux, coulures sous le couronnement (hors porte), pied sali,
    // ombre sous le tablier, ombres de contact des bancs et de l’auvent.
    float concrete = (1.0 - step(abs(rel), 0.022) * step(P.y, 0.096)) * step(P.y, WALL - 0.008);
    vec2 cp = P * 380.0;
    alb *= mix(1.0, 0.92 + 0.16 * (vnoise(cp) * 0.6 + vnoise(cp * 2.3 + 7.0) * 0.4), concrete);
    alb *= mix(1.0, 0.9 + 0.1 * smoothstep(0.09, 0.3, bf.y) * (1.0 - smoothstep(0.82, 1.0, bf.y)), concrete);
    float drip = smoothstep(0.55, 0.85, vnoise(vec2(P.x * 140.0, 0.5))) * smoothstep(WALL - 0.03 - 0.07 * vnoise(vec2(P.x * 60.0, 2.0)), WALL - 0.01, P.y);
    alb *= 1.0 - 0.2 * drip * concrete;
    alb *= mix(1.0, 0.86, smoothstep(0.12, WALL, P.y));
    alb *= mix(0.7, 1.0, smoothstep(0.0, 0.024, P.y)) * (0.94 + 0.06 * vnoise(vec2(P.x * 90.0, 3.0)));
    for (int k = 0; k < 2; k++) {
      float b0 = k == 0 ? 0.17 : 0.4;
      float b1 = b0 + 0.16;
      float inB = smoothstep(b0 - 0.006, b0 + 0.008, rel) * (1.0 - smoothstep(b1 - 0.008, b1 + 0.006, rel));
      alb *= 1.0 - 0.45 * inB * (1.0 - smoothstep(0.004, 0.0185, P.y));
      if (P.y < 0.018 && (abs(rel - b0 - 0.012) < 0.0028 || abs(rel - b1 + 0.012) < 0.0028)) alb = vec3(0.2, 0.2, 0.21);
      if (P.y > 0.0298 && P.y < 0.032 && rel > b0 && rel < b1) alb *= 1.18;
    }
    alb *= 1.0 - 0.35 * (1.0 - smoothstep(0.026, 0.034, abs(rel))) * step(P.y, 0.098) * exp(-(0.098 - P.y) / 0.012);
    col = alb * light;
    // Appliques rondes.
    for (int i = 0; i < 2; i++) {
      vec2 L = i == 0 ? L1 : L2;
      float dl = length((P - L) * vec2(1.0, 1.4));
      if (dl < 0.008) col = mix(vec3(0.55, 0.56, 0.58) * light, vec3(1.0, 0.85, 0.6) * 2.0, P_door);
      col += vec3(1.0, 0.75, 0.45) * P_door * 0.35 * exp(-dl * dl / 0.0003);
    }
  }

  // Bordure blanche du pont : grands panneaux, joints, larmier sombre.
  if (P.y > FAS0 && P.y < FAS1 && rel > -2.5 && rel < 4.5) {
    vec3 alb = vec3(0.78, 0.79, 0.8) * (0.96 + 0.05 * hash12(vec2(floor(P.x / 0.12), 1.0)));
    if (fract(P.x / 0.12) < 0.015) alb *= 0.7;
    if (P.y < FAS0 + 0.006) alb *= 0.45;
    col = alb * (sunLight * 0.62 * dayAmt + vec3(0.012, 0.013, 0.02) * front + vec3(1.0, 0.7, 0.4) * 0.08 * P_lamps);
  }
  // Voitures sur le pont, en partie cachées par la glissière.
  float carY = FAS1 * hu * P_zoom + groundY + 0.002 * hu * P_zoom;
  if (P.y > FAS1 - 0.002 && P.y < FAS1 + 0.05) col = traffic(col, fc, carY, front, (0.3 + 0.7 * frac) * dayAmt + 0.02, 0.0105 * hu * P_zoom, 3.0);
  // Glissière : montants et lisses.
  if (P.y > FAS1 && P.y < FAS1 + 0.022 && rel > -2.5 && rel < 4.5) {
    float post = step(fract(P.x / 0.045), 0.08);
    float rail = step(abs(P.y - FAS1 - 0.02), 0.0016) + step(abs(P.y - FAS1 - 0.009), 0.0012);
    if (post + rail > 0.0) col = vec3(0.6, 0.62, 0.64) * (sunLight * 0.5 * dayAmt + vec3(0.01) * front);
  }
  // Lampadaires sur le pont.
  {
    float li = floor(P.x / 0.42);
    float x0 = (li + 0.5) * 0.42;
    float pole = step(abs(P.x - x0), 0.0022) * step(FAS1, P.y) * step(P.y, FAS1 + 0.075);
    float arm = step(abs(P.y - FAS1 - 0.075), 0.0022) * step(x0, P.x) * step(P.x, x0 + 0.024);
    col = mix(col, vec3(0.3, 0.31, 0.33) * (sunLight * 0.5 * dayAmt + vec3(0.01) * front), max(pole, arm));
    float on = smoothstep(0.0, 0.2, P_lamps - hash12(vec2(li, 3.0)) * 0.6);
    vec2 dl = (P - vec2(x0 + 0.023, FAS1 + 0.071)) * hu * P_zoom / uScale;
    col += vec3(1.0, 0.62, 0.25) * on * (1.5 * exp(-dot(dl, dl) / 4.0) + 0.07 * exp(-length(dl) / 30.0));
  }

  // Parvis : enrobé gris, lumière des appliques.
  if (P.y < 0.0) {
    float grit = 0.9 + 0.2 * hash12(floor(fc / max(1.0, 2.0 * uScale)));
    // Taches et reprises de l’enrobé ; ombres de contact au pied du mur, des piles et sous les bancs.
    float gz = -P.y;
    float blot = vnoise(vec2(P.x * 9.0, gz * 30.0)) * 0.6 + vnoise(vec2(P.x * 31.0, gz * 90.0)) * 0.4;
    float inWall = smoothstep(WL - 0.02, WL + 0.02, rel) * (1.0 - smoothstep(WR - 0.02, WR + 0.02, rel));
    float ao = 1.0 - 0.45 * inWall * exp(-gz / 0.01);
    ao *= 1.0 - 0.4 * (1.0 - smoothstep(0.04, 0.06, min(abs(rel - WL + 0.07), abs(rel - WR - 0.07)))) * exp(-gz / 0.008);
    for (int k = 0; k < 2; k++) {
      float b0 = k == 0 ? 0.17 : 0.4;
      float inB = smoothstep(b0 - 0.01, b0 + 0.01, rel) * (1.0 - smoothstep(b0 + 0.15, b0 + 0.17, rel));
      ao *= 1.0 - 0.3 * inB * exp(-gz / 0.007);
    }
    col = vec3(0.24, 0.24, 0.25) * grit * (0.86 + 0.24 * blot) * ao * (sunLight * 0.55 * dayAmt + vec3(0.01) * front);
    vec2 dg = (P - vec2(DOOR.x + 0.2, 0.0)) * vec2(0.6, 2.2);
    col += vec3(1.0, 0.68, 0.38) * P_door * 0.1 * exp(-dot(dg, dg) / 0.02);
  }
  return col;
}`,params:[`dark`,`lamps`,`door`,`zoom`,`sx`,`sy`,`sr`,`d`,`ang`,`ground`,`day`],defaults:{dark:0,lamps:0,door:0,zoom:1,sx:.76,sy:.8,sr:.045,d:.8,ang:120,ground:.04,day:.8}};export{e as default};