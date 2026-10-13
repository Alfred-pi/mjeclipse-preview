var e={frag:`
const float PHASE[8] = float[8](1.8, 1.3, 0.82, 0.3, -0.3, -0.82, -1.3, -1.8);

float sdBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 plate(vec2 lp, int i, float px, float lit){
  float fi = float(i);
  // Émulsion argentique : fond sombre, développement légèrement irrégulier.
  float dev = fbm(lp * 6.0 + fi * 3.1);
  float lum = 0.03 + 0.025 * dev;
  // L’éclipse, légèrement décentrée selon la plaque.
  vec2 ec = (vec2(hash12(vec2(fi, 1.0)), hash12(vec2(fi, 2.0))) - 0.5) * vec2(0.18, 0.2) + vec2(0.0, 0.06);
  float er = 0.085;
  vec3 e = eclipseSun((lp - ec) / er, PHASE[i], normalize(vec2(0.9, 0.42)), px / er);
  lum += 1.0 - exp(-dot(e, vec3(0.3, 0.6, 0.1)) * 0.8);
  // Réticule de mesure.
  vec2 g = abs(fract(lp / 0.1 + 0.5) - 0.5) * 0.1;
  float grid = exp(-pow(min(g.x, g.y) / (px * 0.8), 2.0)) * 0.05;
  float cross = exp(-pow(max(g.x, g.y) / 0.012, 2.0)) * exp(-pow(min(g.x, g.y) / (px * 0.9), 2.0)) * 0.25;
  lum += grid + cross;
  // Étoiles repérées : point, cercle et deux traits, comme sur les plaques de 1919.
  for (int k = 0; k < 5; k++) {
    vec2 sp = (vec2(hash12(vec2(fi, float(k) + 10.0)), hash12(vec2(fi, float(k) + 30.0))) - 0.5) * vec2(0.82, 1.0);
    if (length(sp - ec) < 0.18) continue;
    float ds = length(lp - sp);
    lum += 0.9 * exp(-pow(ds / (px * 1.4), 2.0));
    lum += 0.35 * exp(-pow((ds - 0.024) / (px * 0.8), 2.0));
    vec2 dv = abs(lp - sp);
    lum += 0.3 * exp(-pow(dv.y / (px * 0.7), 2.0)) * step(0.034, dv.x) * step(dv.x, 0.052);
  }
  // Rayures et poussières, fixes.
  float sc = hash12(vec2(fi, 77.0));
  vec2 sd = normalize(vec2(sc - 0.5, 1.0));
  lum += 0.06 * exp(-pow(abs(dot(lp - vec2(sc - 0.5, 0.0) * 0.6, vec2(-sd.y, sd.x))) / (px * 0.6), 2.0));
  float dust = hash12(floor(lp / (px * 2.0)) + fi);
  lum += step(0.9993, dust) * 0.4;
  // Étiquette manuscrite au pied de la plaque.
  if (lp.y < -0.5) {
    lum = 0.14 + 0.02 * dev;
    float line = step(abs(lp.y + 0.555) , 0.012) * step(-0.38, lp.x) * step(lp.x, -0.38 + 0.18 + 0.4 * hash12(vec2(fi, 5.0)));
    float ink = smoothstep(0.35, 0.65, vnoise(vec2(lp.x * 90.0, fi))) * line;
    lum -= 0.1 * ink;
  }
  return vec3(0.96, 0.9, 0.8) * lum * lit;
}

vec3 scene(vec2 fc){
  float minD = min(uRes.x, uRes.y);
  vec2 C = vec2(P_cx, P_cy) * uRes + uPar * 0.5;
  // Table lumineuse : fond presque noir, chaud, éclairé par en dessous autour de la plaque centrale.
  float dc = length(fc - C) / (minD * 0.6);
  vec3 col = vec3(0.006, 0.005, 0.005) + vec3(0.060, 0.050, 0.040) * exp(-dc * dc * 1.6);
  float pw = P_size * minD;
  float ph = pw * 1.25;
  float px = 1.0 / pw;
  int i0 = int(floor(P_plate));
  for (int k = -1; k <= 2; k++) {
    int i = i0 + k;
    if (i < 0 || i > 10) continue;
    float off = float(i) - P_plate;
    vec2 pc = C + vec2(off * pw * 1.16, 0.0);
    vec2 lp = (fc - pc) / pw;
    float sd = sdBox(lp, vec2(0.5, 0.625), 0.02);
    float lit = 0.25 + 0.75 * exp(-off * off * 2.5);
    if (i >= 8) {
      // Emplacement vide : contour en pointillé, la table éclairée au travers.
      float dash = step(0.5, fract((lp.x + lp.y) * 14.0));
      col += vec3(0.5, 0.45, 0.38) * exp(-pow(sd / (px * 1.2), 2.0)) * dash * 0.25 * lit;
      continue;
    }
    if (sd > px * 6.0) {
      // Ombre portée de la plaque sur la table.
      col *= 1.0 - 0.35 * exp(-sd / 0.04) * step(0.0, sd);
      continue;
    }
    vec3 pcol = plate(lp, i, px, lit);
    pcol += vec3(0.5, 0.48, 0.44) * exp(-abs(sd) / (px * 1.0)) * 0.12 * lit;
    col = mix(col, pcol, 1.0 - smoothstep(-px, px, sd));
  }
  return col;
}`,params:[`plate`,`cx`,`cy`,`size`,`day`],defaults:{plate:0,cx:.74,cy:.5,size:.5,day:0}};export{e as default};