var e={frag:`
// Barres d’immeubles du premier plan : x0, x1 (unités de hauteur, centrées), hauteur.
const int NB = 9;
const vec3 BLD[NB] = vec3[NB](
  vec3(-1.46, -1.06, 0.17), vec3(-1.09, -0.70, 0.23), vec3(-0.73, -0.41, 0.19),
  vec3(-0.43, 0.02, 0.26), vec3(0.00, 0.31, 0.21), vec3(0.29, 0.63, 0.24),
  vec3(0.61, 0.89, 0.18), vec3(0.87, 1.21, 0.22), vec3(1.19, 1.52, 0.16)
);

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  float hu = min(uRes.y, uRes.x * 1.1);
  float dark = P_dark;
  // Front de l’ombre : il arrive par la gauche (l’ouest) et par le haut du ciel.
  float front = smoothstep(0.0, 1.0, clamp(dark * 1.9 - (uv.x * 0.7 + (1.0 - uv.y) * 0.25), 0.0, 1.0));

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

  // Étoiles, seulement dans la partie du ciel déjà dans l’ombre.
  vec2 st = (fc + uPar) / (uScale * 34.0);
  vec2 ci = floor(st);
  float hs = hash12(ci + 3.7);
  if (hs > 0.955) {
    vec2 off = (vec2(hash12(ci + 1.1), hash12(ci + 8.2)) - 0.5) * 0.7;
    float dd = length(fract(st) - 0.5 - off) * 34.0 * uScale;
    float tw = 1.0 + 0.25 * sin(uTime * (1.5 + 3.0 * hs) + hs * 50.0);
    col += front * front * vec3(0.85, 0.9, 1.0) * (0.05 + 0.6 * pow(hash12(ci + 5.5), 4.0)) * tw * exp(-dd * dd / (0.8 * uScale * uScale + 0.3)) * smoothstep(0.12, 0.35, hz);
  }

  // Soleil éclipsé
  float a = radians(P_ang);
  col += eclipseSun((fc - sc) / R, P_d, vec2(cos(a), sin(a)), 1.0 / R) * mix(0.55, 1.0, front);

  // Cité en arrière-plan : silhouettes brumeuses.
  float X = (fc.x - uRes.x * 0.5 + uPar.x * 0.4) / hu;
  float Y = (fc.y - groundY) / hu;
  float cell = floor(X * 7.0);
  float farTop = 0.13 + 0.09 * hash12(vec2(cell, 2.0)) + 0.03 * step(0.6, hash12(vec2(floor(X * 19.0), 4.0)));
  if (Y < farTop) {
    vec3 haze = mix(low * 0.4 + daySky * 0.05, vec3(0.020, 0.018, 0.030) + vec3(0.12, 0.05, 0.02) * dark * exp(-Y / 0.1), front);
    col = haze;
    // Quelques fenêtres lointaines.
    vec2 wg = vec2(X * 160.0, Y * 110.0);
    float wh = hash12(floor(wg) + 9.0);
    if (fract(wg.x) > 0.4 && fract(wg.y) > 0.45 && wh < 0.5 * P_win) col += vec3(1.0, 0.7, 0.4) * 0.12 * front;
  }

  // Barres des Avanchets : gradins, coursives, fenêtres.
  float Xn = (fc.x - uRes.x * 0.5 + uPar.x) / hu;
  for (int i = 0; i < NB; i++) {
    vec3 b = BLD[i];
    if (Xn < b.x || Xn > b.y) continue;
    float w = b.y - b.x;
    float setback = step(b.x + w * 0.16, Xn) * step(Xn, b.y - w * 0.16);
    float top = b.z - 0.03 * (1.0 - setback);
    if (Y > top) continue;
    vec3 facade = mix(vec3(0.050, 0.056, 0.074), vec3(0.007, 0.008, 0.014), front) * (0.85 + 0.3 * hash12(vec2(float(i), 6.0)));
    float fh = 0.021;
    float cw = 0.017;
    float lx = (Xn - b.x) / cw;
    float ly = Y / fh;
    vec2 cid = floor(vec2(lx, ly));
    vec2 f = fract(vec2(lx, ly));
    // Coursives : un filet plus clair à chaque étage.
    facade += vec3(0.020, 0.022, 0.028) * (1.0 - front * 0.7) * step(f.y, 0.12);
    // Arête du toit éclairée par l’horizon.
    facade += vec3(0.20, 0.10, 0.05) * dark * exp(-(top - Y) * hu / 2.0) * 0.4;
    col = facade;
    // Cages d’escalier : bandes verticales sans fenêtres.
    bool stair = fract((lx + float(i) * 3.0) / 11.0) < 0.1;
    if (!stair && cid.y >= 1.0 && cid.y < floor(top / fh) && f.x > 0.14 && f.x < 0.86 && f.y > 0.36 && f.y < 0.78) {
      float h = hash12(cid + float(i) * 13.1);
      float on = smoothstep(h, h + 0.035, P_win * 0.62);
      float k = hash12(cid + float(i) * 7.7 + 2.0);
      vec3 lamp = k > 0.82 ? vec3(0.55, 0.70, 1.0) * (0.8 + 0.2 * sin(uTime * (4.0 + 6.0 * k) + h * 40.0)) : mix(vec3(1.0, 0.62, 0.30), vec3(1.0, 0.82, 0.55), k);
      col += lamp * on * (0.16 + 0.34 * hash12(cid + 5.0));
      // Vitre éteinte : reflet du ciel.
      col += (1.0 - on) * mix(low * 0.12, vec3(0.006, 0.008, 0.016), front);
    }
  }

  // Réverbères au pied des immeubles.
  float lampsOn = smoothstep(0.5, 0.75, dark);
  if (lampsOn > 0.0 && Y < 0.06) {
    float lx = Xn / 0.11;
    float li = floor(lx);
    vec2 lp = vec2((li + 0.5) * 0.11, 0.022);
    float on = smoothstep(0.0, 0.15, lampsOn - hash12(vec2(li, 3.0)) * 0.8);
    float dl = length((vec2(Xn, Y) - lp) * hu) / uScale;
    col += vec3(1.0, 0.55, 0.18) * on * (1.4 * exp(-dl * dl / 3.0) + 0.06 * exp(-dl / 18.0));
  }
  if (Y < 0.0) col = mix(vec3(0.03, 0.035, 0.05), vec3(0.006, 0.006, 0.01), front);
  return col;
}`,params:[`dark`,`win`,`sx`,`sy`,`sr`,`d`,`ang`,`ground`,`day`],defaults:{dark:0,win:0,sx:.74,sy:.72,sr:.07,d:.9,ang:100,ground:0,day:.8}};export{e as default};