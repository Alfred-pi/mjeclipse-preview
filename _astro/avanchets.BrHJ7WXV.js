var e={frag:`
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

vec3 panel(float n, float blue){
  vec3 cream = vec3(0.78, 0.74, 0.64);
  vec3 ochre = vec3(0.80, 0.56, 0.26);
  vec3 terra = vec3(0.66, 0.29, 0.17);
  vec3 sky = vec3(0.50, 0.66, 0.82);
  vec3 c = cream;
  if (n > 0.5) c = mix(ochre, sky, blue);
  if (n > 0.64) c = mix(terra, vec3(0.36, 0.52, 0.74), blue);
  if (n > 0.77) c = vec3(0.86, 0.85, 0.82);
  return c;
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
    if (X < b.x || X > b.y) continue;
    float top = b.z + b.w + b2.x * (X - b.x);
    // Locaux techniques sur le toit.
    float box = step(fract(X * 6.0 + float(i) * 0.37), 0.14) * 0.014;
    if (Y < -0.02 || Y > top + box) continue;
    float fh = (top - b.z) / 14.0;
    float bw = 0.021;
    vec2 g = vec2((X - b.x) / bw, (Y - b.z) / fh);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec3 alb;
    if (Y > top) {
      alb = vec3(0.32, 0.22, 0.17);
    } else {
      // Grands motifs : mosaïque de panneaux par blocs de 3 travées × 2 étages.
      vec2 blk = floor(vec2(cell.x / 3.0, cell.y / 2.0));
      float n = vnoise(blk * vec2(0.42, 0.55) + float(i) * 7.3) * 0.65 + vnoise(blk * vec2(0.12, 0.2) + float(i) * 3.1) * 0.35;
      alb = panel(n, b2.z);
      // Façade plissée : séparations entre logements toutes les trois travées, en léger retrait.
      bool wall = mod(cell.x, 3.0) < 0.22;
      // Garde-corps colorés en bande continue à chaque étage, loggias sombres au-dessus.
      if (wall) alb = mix(alb, vec3(0.82, 0.8, 0.76), 0.5) * 0.8;
      else if (f.y < 0.1) alb = vec3(0.86, 0.85, 0.82);
      else if (f.y > 0.46) alb *= 0.36;
    }
    vec3 dayC = alb * lightCol * 0.55;
    // Perspective aérienne : les barres lointaines se fondent dans le ciel.
    dayC = mix(dayC, low * (0.25 + 0.75 * frac), depth * 0.45);
    vec3 nightC = alb * vec3(0.012, 0.013, 0.02) * (1.0 - depth * 0.4) + vec3(0.18, 0.08, 0.03) * dark * exp(-max(top - Y, 0.0) * hu / (3.0 * uScale)) * 0.3;
    col = mix(dayC, nightC, front);
    // Fenêtres allumées dans les loggias.
    if (Y <= top && cell.y >= 0.0 && f.y > 0.52 && f.y < 0.92 && f.x > 0.12 && f.x < 0.88 && mod(cell.x, 3.0) >= 0.22) {
      float h = hash12(cell + float(i) * 13.1);
      float on = smoothstep(h, h + 0.035, P_win * 0.6);
      float k = hash12(cell + float(i) * 7.7 + 2.0);
      vec3 lamp = k > 0.84 ? vec3(0.55, 0.7, 1.0) * (0.8 + 0.2 * sin(uTime * (4.0 + 6.0 * k) + h * 40.0)) : mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.82, 0.55), k);
      col += lamp * on * (0.12 + 0.3 * hash12(cell + 5.0)) * (1.0 - depth * 0.5);
    }
  }

  // Peupliers et arbres devant la cité, qui bougent un peu au vent.
  float trees = 0.035 + 0.03 * fbm(vec2(X0 * 9.0, 1.0));
  float pi = floor(X0 / 0.16);
  float ph = hash12(vec2(pi, 2.0));
  float px = (pi + 0.3 + 0.4 * ph) * 0.16;
  float pH = 0.1 + 0.09 * hash12(vec2(pi, 5.0));
  float py = clamp(Y / pH, 0.0, 1.0);
  float sway = sin(uTime * 0.9 + pi) * 0.003 * py * py;
  float poplar = (ph > 0.35 && Y > 0.0 && Y < pH && abs(X0 - px - sway) < 0.022 * sqrt(sin(PI * clamp(py * 0.95 + 0.05, 0.0, 1.0)))) ? 1.0 : 0.0;
  if (Y < trees || poplar > 0.0) {
    float leaf = 0.75 + 0.5 * vnoise(vec2(X0 * 160.0, Y * 160.0));
    col = mix(vec3(0.05, 0.085, 0.04) * leaf * lightCol * 1.4, vec3(0.004, 0.006, 0.008), front);
  }

  // Route au pied, réverbères et voitures.
  float roadY = groundY - 0.012 * hu;
  if (fc.y < groundY) col = mix(vec3(0.07, 0.075, 0.085) * lightCol, vec3(0.006, 0.006, 0.01), front);
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
}`,params:[`dark`,`win`,`sx`,`sy`,`sr`,`d`,`ang`,`ground`,`day`],defaults:{dark:0,win:0,sx:.74,sy:.72,sr:.07,d:.9,ang:100,ground:0,day:.8}};export{e as default};