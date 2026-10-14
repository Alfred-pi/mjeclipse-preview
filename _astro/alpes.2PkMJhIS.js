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
    float h = base + amp * ridge(X * freq, seed);
    if (Y > h) continue;
    float haze = mix(0.66, 0.03, pow(depth, 0.7));
    // Pente (crête lissée, deux octaves) : la face tournée vers le Soleil est plus claire.
    float e = 0.02;
    float hs0 = vnoise(vec2((X - e) * freq, seed)) * 0.7 + vnoise(vec2((X - e) * freq * 2.07, seed + 3.1)) * 0.3;
    float hs1 = vnoise(vec2((X + e) * freq, seed)) * 0.7 + vnoise(vec2((X + e) * freq * 2.07, seed + 3.1)) * 0.3;
    float slope = (hs1 - hs0) * amp / (2.0 * e);
    float face = clamp(0.5 - 0.9 * slope * sunSide, 0.0, 1.0);
    vec3 rock = mix(vec3(0.035, 0.045, 0.06), vec3(0.075, 0.085, 0.1), face);
    // Neige au-dessus de la limite, sur les deux chaînes lointaines.
    float snowLine = base + amp * mix(0.42, 0.62, depth * 1.5);
    float snow = i < 2 ? smoothstep(snowLine, snowLine + 0.025, Y + 0.025 * fbm(vec2(X * 14.0, Y * 6.0))) : 0.0;
    vec3 snowCol = vec3(0.62, 0.68, 0.78) * (0.45 + 0.75 * face);
    vec3 surf = mix(rock, snowCol, snow);
    // Forêt sombre et dentelée sur les crêtes proches.
    if (i >= 2) surf = mix(surf, vec3(0.012, 0.022, 0.02), 0.7);
    // Perspective aérienne, plus dense au pied de chaque chaîne.
    float foot = exp(-max(Y - base, 0.0) / 0.06) * 0.45;
    vec3 dayCol = mix(surf, low * 0.85, clamp(haze + foot * (1.0 - haze), 0.0, 1.0));
    vec3 nightCol = mix(vec3(0.006, 0.008, 0.014), night * 0.6, haze * 0.8);
    // Sommets hors de l’ombre : la lumière de l’horizon rosit la neige.
    nightCol += snow * vec3(0.32, 0.12, 0.08) * dark * (1.0 - depth) * 0.5;
    col = mix(dayCol * (0.25 + 0.75 * frac), nightCol, front);
    // Liseré du ciel sur l’arête.
    col += mix(low * 0.06, vec3(0.08, 0.035, 0.02) * dark, front) * exp(-(h - Y) * hu / (2.0 * uScale)) * (1.0 - depth);
  }

  // Brume de vallée qui dérive lentement entre les crêtes proches.
  float mY = Y - 0.06;
  float mist = fbm(vec2(X0 * 2.2 + uTime * 0.008 + P_pan * 0.2, Y * 9.0)) * exp(-mY * mY / 0.004);
  col += mix(vec3(0.16, 0.2, 0.28) * (0.25 + 0.75 * frac), vec3(0.012, 0.012, 0.02), front) * mist * 0.45;
  return col;
}`,params:[`dark`,`leave`,`sx`,`sy`,`sr`,`d`,`ang`,`pan`,`ground`,`day`],defaults:{dark:0,leave:0,sx:.74,sy:.72,sr:.05,d:.9,ang:160,pan:0,ground:0,day:.8}};export{e as default};