var e={frag:`
const float DECK0 = 0.34;   // dessous des poutres
const float DECK1 = 0.365;   // dessous du tablier
const float DECK2 = 0.43;  // chaussée
const vec2 DOOR = vec2(0.36, 0.0);

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  float hu = min(uRes.y, uRes.x * 1.1);
  float dark = P_dark;
  float front = smoothstep(0.0, 1.0, clamp(dark * 1.9 - (uv.x * 0.7 + (1.0 - uv.y) * 0.25), 0.0, 1.0));

  // Ciel (non zoomé : le Soleil reste à sa place à l’écran)
  vec3 zenith = vec3(0.03, 0.105, 0.40);
  vec3 low = vec3(0.16, 0.29, 0.6);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, uv.y));
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  float R = P_sr * minD;
  float frac = sunFraction(P_d);
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

  // Monde : coordonnées en hauteurs d’écran, origine au pied de la porte, approche par le zoom.
  vec2 doorPx = vec2(uRes.x * 0.5 + DOOR.x * hu, groundY);
  vec2 P = (fc - doorPx + uPar) / (hu * P_zoom) + DOOR;
  // La cité au loin, brumeuse.
  vec2 Pf = (fc - doorPx + uPar * 0.3) / (hu * mix(1.0, P_zoom, 0.4)) + DOOR;
  float cell = floor(Pf.x * 6.0);
  float farTop = 0.1 + 0.08 * hash12(vec2(cell, 2.0)) + 0.025 * step(0.6, hash12(vec2(floor(Pf.x * 17.0), 4.0)));
  if (Pf.y < farTop && Pf.y > 0.0) {
    col = mix(low * 0.42 + daySky * 0.05, vec3(0.02, 0.018, 0.03) + vec3(0.12, 0.05, 0.02) * dark * exp(-Pf.y / 0.1), front) * (0.4 + 0.6 * frac);
    vec2 wg = vec2(Pf.x * 150.0, Pf.y * 100.0);
    if (fract(wg.x) > 0.4 && fract(wg.y) > 0.45 && hash12(floor(wg) + 9.0) < 0.45 * dark) col += vec3(1.0, 0.7, 0.4) * 0.12 * front;
  }

  vec3 concrete = mix(vec3(0.07, 0.075, 0.09) * (0.35 + 0.65 * frac), vec3(0.009, 0.01, 0.016), front);
  // Piles du pont, légèrement évasées vers le haut.
  float pw = 0.05 + 0.012 * clamp(P.y / DECK0, 0.0, 1.0);
  float px = mod(P.x + 0.62, 1.15) - 0.575;
  if (abs(px) < pw && P.y > 0.0 && P.y < DECK0) {
    col = concrete * (0.8 + 0.4 * smoothstep(-pw, pw, px * sign(P_sx - 0.5)));
  }
  // Tablier : poutres, dalle, glissière.
  if (P.y > DECK0 && P.y < DECK2 + 0.02) {
    if (P.y < DECK1) {
      float beam = step(0.5, fract(P.x * 9.0));
      col = concrete * (0.45 + 0.2 * beam);
    } else if (P.y < DECK2) {
      col = concrete * (0.95 + 0.25 * smoothstep(DECK1, DECK2, P.y));
      col += mix(low * 0.05, vec3(0.1, 0.045, 0.02) * dark, front) * smoothstep(DECK2 - 0.006, DECK2, P.y);
    } else {
      // Glissière ajourée.
      float post = step(0.82, fract(P.x * 40.0));
      if (P.y > DECK2 + 0.016 || post > 0.0) col = concrete * 0.9;
    }
  }
  // Voitures sur le pont : phares blancs vers la droite, feux rouges vers la gauche.
  {
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
      float x = (fract(uTime * (0.012 + 0.004 * hash12(vec2(fi, 1.0))) * dir + hash12(vec2(fi, 2.0))) - 0.5) * 3.6 + DOOR.x;
      vec2 dl = (P - vec2(x, DECK2 + 0.009)) * hu * P_zoom / uScale;
      vec3 c = dir > 0.0 ? vec3(1.0, 0.92, 0.8) : vec3(1.0, 0.12, 0.06);
      col += c * (0.35 + 0.65 * front) * (exp(-dot(dl, dl) / 3.0) * 1.2 + exp(-length(dl) / 9.0) * 0.06);
    }
  }
  // Lampadaires sur le pont.
  float lampsOn = P_lamps;
  {
    float lx = P.x / 0.42;
    float li = floor(lx);
    float x0 = (li + 0.5) * 0.42;
    float pole = step(abs(P.x - x0), 0.0025) * step(DECK2, P.y) * step(P.y, DECK2 + 0.08);
    float arm = step(abs(P.y - DECK2 - 0.08), 0.0025) * step(x0, P.x) * step(P.x, x0 + 0.025);
    col = mix(col, concrete * 0.8, max(pole, arm));
    float on = smoothstep(0.0, 0.2, lampsOn - hash12(vec2(li, 3.0)) * 0.6);
    vec2 dl = (P - vec2(x0 + 0.024, DECK2 + 0.076)) * hu * P_zoom / uScale;
    col += vec3(1.0, 0.62, 0.25) * on * (1.6 * exp(-dot(dl, dl) / 4.0) + 0.08 * exp(-length(dl) / 30.0));
  }

  // La maison sous le pont, entre deux piles : façade basse, porte éclairée.
  if (P.x > 0.08 && P.x < 0.7 && P.y > 0.0 && P.y < 0.17) {
    vec3 facade = mix(vec3(0.06, 0.065, 0.08) * (0.3 + 0.7 * frac), vec3(0.012, 0.012, 0.02), front);
    col = facade;
    // Fenêtres du rez : petites, chaudes, inégales.
    vec2 wg = vec2((P.x - 0.08) / 0.062, P.y / 0.05);
    vec2 wid = floor(wg);
    vec2 wf = fract(wg);
    if (wid.y == 1.0 && wf.x > 0.26 && wf.x < 0.74 && wf.y > 0.3 && wf.y < 0.78 && abs(P.x - DOOR.x) > 0.055) {
      float on = smoothstep(0.0, 0.2, P_door - hash12(wid) * 0.8);
      vec3 lamp = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.75, 0.45), hash12(wid + 4.0));
      col += lamp * on * (0.08 + 0.1 * hash12(wid + 9.0)) * (0.8 + 0.2 * wf.y) + (1.0 - on) * low * 0.04;
    }
    // Porte : encadrement sombre, lumière chaude plus forte en bas.
    if (abs(P.x - DOOR.x) < 0.026 && P.y < 0.088) {
      float frame = step(0.021, abs(P.x - DOOR.x)) + step(0.083, P.y);
      vec3 inside = vec3(1.0, 0.62, 0.3) * (0.75 - 0.3 * P.y / 0.088);
      col = frame > 0.0 ? facade * 0.5 : mix(facade * 0.6, inside, P_door);
    }
    // Auvent.
    if (abs(P.x - DOOR.x) < 0.05 && abs(P.y - 0.096) < 0.005) col = facade * 0.6;
  }
  // Halo de la porte sur le sol et la façade.
  vec2 dd = (P - vec2(DOOR.x, 0.02)) * vec2(1.0, 1.6);
  col += vec3(1.0, 0.6, 0.28) * P_door * 0.32 * exp(-dot(dd, dd) / 0.012);
  if (P.y < 0.0) {
    col = mix(vec3(0.035, 0.038, 0.05) * (0.3 + 0.7 * frac), vec3(0.006, 0.006, 0.01), front);
    col += vec3(1.0, 0.6, 0.28) * P_door * 0.25 * exp(-dot(dd, dd) / 0.02);
  }
  return col;
}`,params:[`dark`,`lamps`,`door`,`zoom`,`sx`,`sy`,`sr`,`d`,`ang`,`ground`,`day`],defaults:{dark:0,lamps:0,door:0,zoom:1,sx:.76,sy:.8,sr:.045,d:.8,ang:120,ground:.04,day:.8}};export{e as default};