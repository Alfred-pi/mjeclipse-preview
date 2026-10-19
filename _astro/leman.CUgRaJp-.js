var e={frag:`
float HU;
float HZ;

// Crête du Jura, longue et douce, avec le Salève à droite.
float shore(float X){
  float jura = 0.035 + 0.03 * vnoise(vec2(X * 1.3 + 4.0, 1.0)) + 0.008 * vnoise(vec2(X * 9.0, 2.0));
  float saleve = 0.07 * exp(-pow((X - 0.95) / 0.32, 4.0)) * (0.92 + 0.08 * vnoise(vec2(X * 12.0, 3.0)));
  return max(jura, saleve);
}

vec3 skyCol(vec2 fc, float frac){
  vec2 uv = fc / uRes;
  float y = max(fc.y / uRes.y - HZ, 0.0) / max(1.0 - HZ, 0.1);
  vec3 dayC = mix(vec3(0.20, 0.34, 0.62), vec3(0.03, 0.11, 0.40), smoothstep(0.0, 0.9, y));
  vec3 duskC = mix(vec3(0.95, 0.40, 0.12), vec3(0.34, 0.20, 0.36), smoothstep(0.0, 0.35, y));
  duskC = mix(duskC, vec3(0.03, 0.05, 0.16), smoothstep(0.3, 1.0, y));
  vec3 c = mix(dayC, duskC, P_dusk);
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  c += mix(vec3(0.28, 0.33, 0.4), vec3(0.9, 0.42, 0.12), P_dusk) * exp(-length(fc - sc) / (uScale * mix(260.0, 360.0, P_dusk))) * (0.25 + 0.75 * frac);
  // L’éclipse assombrit tout le ciel : à 30 % de photosphère, la lumière tombe nettement.
  return c * (0.2 + 0.8 * frac) * mix(1.0, 0.55, P_dusk * P_dusk);
}

// Tout ce qui est au-dessus de l’eau : ciel, Soleil, rive, jet d’eau, lumières.
vec3 above(vec2 fc, float frac, bool mirror){
  float minD = min(uRes.x, uRes.y);
  vec3 col = skyCol(fc, frac);
  float night = P_dusk * (1.0 - frac * 0.6);
  // Étoiles au zénith quand la lumière baisse.
  if (!mirror) {
    vec2 st = fc / (uScale * 34.0);
    vec2 ci = floor(st);
    float hs = hash12(ci + 3.7);
    if (hs > 0.96) {
      vec2 off = (vec2(hash12(ci + 1.1), hash12(ci + 8.2)) - 0.5) * 0.7;
      float dd = length(fract(st) - 0.5 - off) * 34.0 * uScale;
      col += vec3(0.85, 0.9, 1.0) * 0.4 * pow(hash12(ci + 5.5), 3.0) * night * night * smoothstep(0.55, 0.9, fc.y / uRes.y) * exp(-dd * dd / (0.8 * uScale * uScale + 0.3));
    }
  }
  if (!mirror) {
    col = shootingStars(col, fc, smoothstep(0.6, 1.0, P_dusk));
    col = birds(col, fc, (1.0 - 0.6 * P_dusk) * frac, 0.5, HZ + 0.18);
    col = airplane(col, fc, P_dusk * 0.85, 0.65, vec2(-0.05, HZ + 0.2), vec2(1.05, 0.9), 42.0);
  }
  vec2 sc = vec2(P_sx, P_sy) * uRes;
  float R = P_sr * minD;
  float a = radians(P_ang);
  // Le Soleil bas rougit.
  vec3 tint = mix(vec3(1.0), vec3(1.0, 0.62, 0.34), smoothstep(0.25, 1.0, P_dusk));
  col += eclipseSun((fc - sc) / R, P_d, vec2(cos(a), sin(a)), 1.0 / R) * tint;
  float X = (fc.x - uRes.x * 0.5) / HU;
  float Y = (fc.y - HZ * uRes.y) / HU;
  float h = shore(X);
  // Jet d’eau : une colonne fine, l’écume poussée par le vent.
  float jx = -0.32;
  float jh = 0.15;
  float t = clamp(Y / jh, 0.0, 1.2);
  float dx = X - jx - 0.035 * t * t;
  float w = 0.0018 + 0.012 * t * t;
  float spray = exp(-dx * dx / (w * w)) * smoothstep(1.15, 0.6, t + 0.15 * vnoise(vec2(dx * 300.0, Y * 80.0 - uTime * 0.8))) * step(0.0, Y);
  vec3 jet = mix(vec3(0.8, 0.82, 0.86) * (0.35 + 0.65 * frac), vec3(0.9, 0.55, 0.3) * 0.6, P_dusk) * (1.0 - 0.5 * night) + vec3(0.7, 0.8, 1.0) * 0.5 * P_lights;
  col = mix(col, jet, spray * 0.75);
  // Rive et crête.
  if (Y < h) {
    vec3 hzSky = skyCol(vec2(fc.x, HZ * uRes.y), frac);
    vec3 ridgeCol = mix(hzSky * 0.5, vec3(0.04, 0.03, 0.06), 0.4 + 0.5 * P_dusk);
    // Pentes boisées du Jura : combes plus sombres le long de la pente, brume plus claire au pied.
    float fold = vnoise(vec2(X * 26.0 + Y * 9.0, Y * 55.0)) * 0.65 + vnoise(vec2(X * 90.0, Y * 140.0)) * 0.35;
    ridgeCol *= (0.8 + 0.32 * fold) * mix(1.0, 0.7, smoothstep(h - 0.02, h, Y));
    col = mix(ridgeCol, hzSky * 0.62, 0.35 * exp(-max(Y, 0.0) / 0.012));
    // Rive boisée : bosquets et parcs au bord de l’eau, d’un vert sourd voilé par l’air du lac.
    float wood = 0.004 + 0.006 * vnoise(vec2(X * 30.0, 5.0)) + 0.003 * vnoise(vec2(X * 140.0, 6.0));
    float wc = clamp((wood - Y) * HU + 0.5, 0.0, 1.0);
    vec3 woodCol = vec3(0.03, 0.046, 0.034) * (0.25 + 0.75 * frac) * (0.65 + 0.55 * vnoise(vec2(X * 320.0, Y * 520.0)));
    woodCol = mix(mix(woodCol, hzSky * 0.4, 0.3), vec3(0.02, 0.016, 0.03), 0.25 + 0.6 * P_dusk);
    col = mix(col, woodCol, wc);
    // Lumières de la ville au pied de la crête.
    if (Y < 0.012) {
      vec2 g = vec2(X * 220.0, Y * 420.0);
      vec2 id = floor(g);
      float k = hash12(id + 2.0);
      float on = step(k, 0.14 * P_lights);
      float dl = length(fract(g) - 0.5);
      col += mix(vec3(1.0, 0.7, 0.4), vec3(0.8, 0.9, 1.0), step(0.85, hash12(id + 7.0))) * on * smoothstep(0.45, 0.1, dl) * 0.9;
    }
  }
  return col;
}

vec3 scene(vec2 fc){
  HU = min(uRes.y, uRes.x * 1.1);
  HZ = P_hz;
  float frac = sunFraction(P_d);
  float hzPx = HZ * uRes.y;
  if (fc.y >= hzPx) return above(fc, frac, false);

  // Le lac : houle fine poussée par la bise, crêtes parallèles à la rive et resserrées vers l’horizon. La pente des
  // vagues vers l’observateur étire les reflets verticalement ; Fresnel : miroir au loin, eau plus sombre au pied.
  float dy = (hzPx - fc.y) / HU;
  float z = 1.0 / (dy + 0.015);
  float X = (fc.x - uRes.x * 0.5) / HU;
  vec2 wp = vec2(X * z * 1.1 + 0.25 * sin(z * 0.6), z * 2.4 + uTime * 0.05);
  float w0 = fbm(wp);
  float wave = w0 - 0.5;
  float tilt = (fbm(wp + vec2(0.0, 0.3)) - w0) / 0.3;
  float wob = wave * (0.002 + dy * 0.025) * HU;
  vec2 m = vec2(fc.x + wob, hzPx + (hzPx - fc.y) * 0.9 + tilt * (0.5 + dy * 30.0) * uScale);
  float fres = clamp(mix(0.82, 0.24, smoothstep(0.0, 0.4, dy)) - 0.08 * tilt, 0.12, 0.95);
  vec3 body = vec3(0.014, 0.032, 0.038) * (0.2 + 0.8 * frac) * (1.0 - 0.6 * P_dusk);
  vec3 col = mix(body, above(m, frac, true) * 0.8, fres);
  // Reflets des lumières de la rive, brisés par les rides.
  float lx = X * 220.0 + wave * 3.0;
  float lid = floor(lx);
  float lon = step(hash12(vec2(lid, 3.0) + 2.0), 0.14 * P_lights);
  float broken = smoothstep(0.45, 0.75, vnoise(vec2(X * 40.0, dy * 260.0 * (1.0 + dy * 6.0) + uTime * 0.3)));
  float streak = lon * smoothstep(0.5, 0.2, abs(fract(lx) - 0.5)) * broken * exp(-dy / 0.06);
  col += vec3(1.0, 0.68, 0.38) * streak * 0.22;
  // Chemin de lumière sous le Soleil : facettes tournées vers lui, qui dérivent avec la houle, sans scintillement.
  float sxw = (P_sx - 0.5) * uRes.x / HU;
  float pd = (X - sxw - wave * 0.03) / (0.02 + dy * 0.3);
  float path = exp(-pd * pd);
  float facet = smoothstep(0.2, 0.75, 0.5 - 0.45 * tilt + 0.6 * wave);
  vec3 gl = mix(vec3(1.0, 0.92, 0.8), vec3(1.0, 0.55, 0.22), P_dusk);
  col += gl * path * (0.12 + 1.5 * facet * facet) * frac * exp(-dy / 0.45);
  // Voiliers qui glissent au large, feu de mât au crépuscule.
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float far = hash12(vec2(fi, 9.0));
    float bx = (fract(uTime * (0.0025 + 0.002 * hash12(vec2(fi, 4.0))) + hash12(vec2(fi, 5.0))) * 1.3 - 0.15) * uRes.x;
    float bdy = (0.012 + 0.05 * far) * HU;
    float s = (7.0 + 9.0 * far) * uScale;
    vec2 p = (fc - vec2(bx, hzPx - bdy)) / s;
    float sail = step(0.0, p.y) * step(p.y, 1.7) * step(-0.05, p.x) * step(p.x, 0.85 * (1.0 - p.y / 1.7));
    float jib = step(0.0, p.y) * step(p.y, 1.3) * step(p.x, -0.1) * step(-0.6 * (1.0 - p.y / 1.3), p.x);
    float hull = step(-0.28, p.y) * step(p.y, -0.02) * step(abs(p.x - 0.1), 0.85 + p.y);
    vec3 sailC = mix(vec3(0.9, 0.9, 0.88), vec3(0.95, 0.6, 0.38), P_dusk) * (0.25 + 0.75 * frac) * (1.0 - 0.6 * P_dusk);
    col = mix(col, sailC, max(sail, jib * 0.85));
    col = mix(col, vec3(0.06, 0.06, 0.08), hull);
    col += vec3(1.0, 0.9, 0.7) * P_lights * glowPt(length(fc - vec2(bx, hzPx - bdy + 1.75 * s)) / uScale, 1.0);
  }
  // Le lac s’assombrit vers le bord.
  col *= mix(1.0, 0.8, smoothstep(0.0, 0.5, dy));
  return col;
}`,params:[`dusk`,`lights`,`sx`,`sy`,`sr`,`d`,`ang`,`hz`,`day`],defaults:{dusk:0,lights:0,sx:.7,sy:.78,sr:.045,d:.8,ang:150,hz:.34,day:.8}};export{e as default};