var e={frag:`
// Crête « ridged » : sommets nets, vallées arrondies.
float ridge(float x, float seed){
  float n = 0.0, a = 0.5, f = 1.0;
  for (int k = 0; k < 5; k++) {
    float v = vnoise(vec2(x * f, seed + float(k) * 3.1));
    n += a * (1.0 - abs(2.0 * v - 1.0));
    f *= 2.07; a *= 0.47;
  }
  return n;
}

// Pente de la crête (trois octaves « ridged », différences centrées) : la forme qui porte la lumière.
float ridgeSlope(float x, float seed, float e){
  float s = 0.0, a = 0.5, f = 1.0;
  for (int k = 0; k < 3; k++) {
    float v0 = vnoise(vec2((x - e) * f, seed + float(k) * 3.1));
    float v1 = vnoise(vec2((x + e) * f, seed + float(k) * 3.1));
    s += a * (abs(2.0 * v0 - 1.0) - abs(2.0 * v1 - 1.0));
    f *= 2.07; a *= 0.47;
  }
  return s / (2.0 * e);
}

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  float hu = min(uRes.y, uRes.x * 1.1);
  float dark = P_dark;
  float pos = mix(uv.x * 0.7, (1.0 - uv.x) * 0.7, P_leave) + (1.0 - uv.y) * 0.25;
  float front = smoothstep(0.0, 1.0, clamp(dark * 1.9 - pos, 0.0, 1.0));

  // Ciel
  vec3 zenith = vec3(0.028, 0.10, 0.40);
  vec3 low = vec3(0.17, 0.31, 0.62);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, uv.y));
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  float R = P_sr * minD;
  float frac = sunFraction(P_d);
  daySky += vec3(0.28, 0.33, 0.40) * exp(-length(fc - sc) / (uScale * 260.0)) * (0.3 + 0.7 * frac);
  float groundY = P_ground * uRes.y;
  float Y = (fc.y - groundY) / hu;
  float hz = max(Y - 0.2, 0.0);
  vec3 night = vec3(0.004, 0.006, 0.018) + vec3(0.045, 0.03, 0.05) * exp(-hz / 0.3)
    + (vec3(0.45, 0.19, 0.06) * exp(-hz / 0.08) + vec3(0.3, 0.22, 0.12) * exp(-hz / 0.025)) * dark;
  vec3 col = mix(daySky * (0.25 + 0.75 * frac), night, front);

  // Étoiles dans la partie du ciel déjà dans l’ombre.
  vec2 st = (fc + uPar * 0.3) / (uScale * 34.0);
  vec2 ci = floor(st);
  float hs = hash12(ci + 3.7);
  if (hs > 0.955) {
    vec2 off = (vec2(hash12(ci + 1.1), hash12(ci + 8.2)) - 0.5) * 0.7;
    float dd = length(fract(st) - 0.5 - off) * 34.0 * uScale;
    float tw = 1.0 + 0.25 * sin(uTime * (1.5 + 3.0 * hs) + hs * 50.0);
    col += front * front * vec3(0.85, 0.9, 1.0) * (0.05 + 0.6 * pow(hash12(ci + 5.5), 4.0)) * tw * exp(-dd * dd / (0.8 * uScale * uScale + 0.3));
  }

  float a = radians(P_ang);
  col += eclipseSun((fc - sc) / R, P_d, vec2(cos(a), sin(a)), 1.0 / R) * mix(0.55, 1.0, front);
  col = shootingStars(col, fc, front * dark);
  col = birds(col, fc, (1.0 - front) * frac, 0.1, 0.6);
  col = airplane(col, fc, front, 0.3, vec2(-0.05, 0.62), vec2(1.05, 0.93), 44.0);
  // Parapente qui dérive lentement au-dessus de la vallée.
  {
    float k = fract(uTime / 120.0 + 0.2);
    vec2 pos = vec2(mix(1.1, -0.1, k), 0.56 + 0.04 * sin(uTime * 0.21)) * uRes;
    vec2 q = (fc - pos) / uScale;
    float arc = abs(length(q - vec2(0.0, -12.0)) - 12.0) - 1.3;
    arc = max(arc, -(q.y + 2.5));
    float lines = min(sdSeg(q, vec2(-9.5, -4.5), vec2(0.0, -16.0)), sdSeg(q, vec2(9.5, -4.5), vec2(0.0, -16.0))) - 0.15;
    float pilot = length(q - vec2(0.0, -17.0)) - 1.4;
    float vis = 1.0 - front;
    col = mix(col, mix(vec3(0.85, 0.25, 0.12), vec3(0.95, 0.75, 0.2), step(0.0, q.x)) * (0.3 + 0.7 * frac), clamp(0.5 - arc * uScale, 0.0, 1.0) * vis);
    col = mix(col, vec3(0.1), clamp(0.5 - lines * uScale, 0.0, 1.0) * 0.5 * vis);
    col = mix(col, vec3(0.08), clamp(0.5 - pilot * uScale, 0.0, 1.0) * vis);
  }

  float sunSide = sign(P_sx - 0.5);
  float X0 = (fc.x - uRes.x * 0.5) / hu;

  // Crêtes, de la plus lointaine à la plus proche.
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float depth = fi / 3.0;
    float X = X0 + (P_pan * (0.04 + 0.3 * depth * depth) + uPar.x / hu * (0.1 + 0.9 * depth)) ;
    float base = mix(0.25, 0.0, pow(depth, 0.8));
    float amp = mix(0.3, 0.085, depth);
    float freq = mix(1.5, 4.4, depth);
    float seed = 11.0 + fi * 17.3;
    // Étages : forêt sous la limite des arbres, rocher et neige au-dessus.
    float treeLine = i == 0 ? -1.0 : base + amp * (i == 1 ? 0.3 : (i == 2 ? 0.74 : 0.98)) + 0.02 * (vnoise(vec2(X * freq * 5.0, seed + 9.0)) - 0.5);
    float h = base + amp * ridge(X * freq, seed);
    // Sapins sur l’arête des chaînes proches : silhouette hérissée plutôt que découpée au ciseau.
    if (i >= 2) {
      float pin = 1.0 - abs(2.0 * vnoise(vec2(X * 260.0, seed)) - 1.0);
      h += (1.0 - smoothstep(treeLine - 0.01, treeLine + 0.01, h)) * (0.0015 + 0.0045 * pin) * (fi - 1.0);
    }
    if (Y > h + 1.5 / hu) continue;
    float cov = clamp((h - Y) * hu + 0.5, 0.0, 1.0);
    float dh = max(h - Y, 0.0);
    float haze = mix(0.66, 0.03, pow(depth, 0.7));
    // Pente réelle de la crête : la face tournée vers le Soleil est plus claire.
    float slope = ridgeSlope(X * freq, seed, 0.012) * amp * freq;
    // Éperons et couloirs le long de la ligne de pente : relief interne, fixe.
    vec2 rq = vec2(X * freq * 7.0, dh * freq * 1.6 + seed);
    rq.x += 1.4 * vnoise(vec2(X * freq * 2.0, dh * freq * 3.0 + seed));
    float r0 = vnoise(rq);
    float rib = (vnoise(rq + vec2(0.12, 0.0)) - r0) / 0.12;
    float lit = clamp(0.5 - 0.6 * slope * sunSide - 0.12 * rib * sunSide, 0.0, 1.0);
    vec3 rock = mix(vec3(0.03, 0.033, 0.042), vec3(0.115, 0.105, 0.098), lit) * (0.8 + 0.4 * r0);
    // Neige au-dessus de la limite, sur les deux chaînes lointaines ; elle quitte les parois raides des éperons.
    float snowLine = base + amp * mix(0.42, 0.62, depth * 1.5);
    float snow = i < 2 ? smoothstep(snowLine, snowLine + 0.03, Y + 0.025 * fbm(vec2(X * 14.0, Y * 6.0)) + 0.03 * (r0 - 0.5)) : 0.0;
    snow *= 1.0 - 0.6 * smoothstep(0.7, 1.6, abs(slope)) * smoothstep(0.45, 0.7, r0);
    vec3 snowCol = mix(vec3(0.24, 0.31, 0.46), vec3(0.8, 0.8, 0.81), lit) * (0.85 + 0.25 * r0);
    vec3 surf = mix(rock, snowCol, snow);
    // Forêt : lisière déchiquetée, houppiers en touffes, plus sombre à l’ombre.
    float forest = 1.0 - smoothstep(treeLine - 0.003, treeLine + 0.003, Y + 0.006 * (vnoise(vec2(X * 180.0, seed)) - 0.5));
    float clump = vnoise(vec2(X * 210.0, Y * 170.0) + seed);
    vec3 forC = mix(vec3(0.009, 0.016, 0.015), vec3(0.03, 0.048, 0.032), lit) * (0.55 + 0.9 * clump);
    surf = mix(surf, forC, forest * 0.92);
    // Perspective aérienne, plus dense au pied de chaque chaîne, plus claire du côté du Soleil.
    float foot = exp(-max(Y - base, 0.0) / 0.06) * 0.45;
    vec3 hazeCol = low * 0.85 + vec3(0.12, 0.1, 0.07) * exp(-abs(X0 - (P_sx - 0.5) * uRes.x / hu) * 2.0) * frac;
    vec3 dayCol = mix(surf, hazeCol, clamp(haze + foot * (1.0 - haze), 0.0, 1.0));
    vec3 nightCol = mix(vec3(0.006, 0.008, 0.014), night * 0.6, haze * 0.8);
    // Sommets hors de l’ombre : la lumière de l’horizon rosit la neige.
    nightCol += snow * vec3(0.32, 0.12, 0.08) * dark * (1.0 - depth) * 0.5 * (0.6 + 0.6 * lit);
    col = mix(col, mix(dayCol * (0.25 + 0.75 * frac), nightCol, front), cov);
    // Liseré du ciel sur l’arête.
    col += mix(low * 0.06, vec3(0.08, 0.035, 0.02) * dark, front) * exp(-dh * hu / (2.0 * uScale)) * (1.0 - depth) * cov;
  }

  // Brume de vallée qui dérive lentement entre les crêtes proches.
  float mY = Y - 0.06;
  float mist = fbm(vec2(X0 * 2.2 + uTime * 0.008 + P_pan * 0.2, Y * 9.0)) * exp(-mY * mY / 0.004);
  col += mix(vec3(0.16, 0.2, 0.28) * (0.25 + 0.75 * frac), vec3(0.012, 0.012, 0.02), front) * mist * 0.45;
  return col;
}`,params:[`dark`,`leave`,`sx`,`sy`,`sr`,`d`,`ang`,`pan`,`ground`,`day`],defaults:{dark:0,leave:0,sx:.74,sy:.72,sr:.05,d:.9,ang:160,pan:0,ground:0,day:.8}};export{e as default};