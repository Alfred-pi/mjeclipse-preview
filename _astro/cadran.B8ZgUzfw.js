var e={frag:`
const float LAT = 0.8063; // 46,2°
// Angle (depuis le nord, sens horaire) de la ligne horaire h sur un cadran horizontal.
float hourAngle(float h){ return atan(sin(LAT) * tan((h - 12.0) * PI / 12.0)); }
float sunAlt(float h){ return sin(clamp((h - 6.0) / 15.0, 0.0, 1.0) * PI) * 0.95 - 0.12; }

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float maxD = max(uRes.x, uRes.y);
  float hr = P_hour;
  float alt = sunAlt(hr);
  // Fin d’éclipse en ouverture (ecl → 0) : la lumière revient, l’ombre se durcit.
  float sunI = smoothstep(-0.02, 0.22, alt) * (1.0 - 0.9 * P_ecl);
  // Couleur de la lumière : fraîche le matin, neutre à midi, dorée le soir.
  vec3 light = mix(vec3(1.0, 0.62, 0.36), vec3(1.0, 0.95, 0.88), smoothstep(0.05, 0.6, alt));
  light = mix(light, vec3(0.86, 0.92, 1.0), smoothstep(13.0, 9.0, hr) * 0.4);
  vec3 ambient = mix(vec3(0.010, 0.013, 0.030), vec3(0.045, 0.055, 0.085), sunI);

  // Plan du cadran, vu en légère plongée.
  vec2 C = vec2(P_cx, P_cy) * uRes + uPar * 0.6;
  float R = P_rad * maxD;
  vec2 p = (fc - C) / R;
  p.y /= P_tilt;
  float rho = length(p);
  float th = atan(p.x, p.y); // 0 = nord (haut), sens horaire

  // Pierre : grain fixe, assombrie vers les bords de l’écran.
  float grain = fbm(fc / (uScale * 90.0) + 2.0) * 0.6 + fbm(fc / (uScale * 14.0)) * 0.4;
  vec3 stone = mix(vec3(0.020, 0.022, 0.030), vec3(0.070, 0.066, 0.064), grain);
  vec3 col = stone * (ambient * 9.0 + light * sunI * 0.55);
  col *= 1.0 - 0.45 * smoothstep(0.4, 1.2, length(uv - 0.5));

  // Gravures en laiton : anneaux, lignes horaires (6 h → 18 h) et demi-heures.
  float px = 1.0 / R;
  float lw = px * 1.1 * uScale;
  vec3 brass = vec3(0.95, 0.72, 0.42);
  float eng = 0.0;
  eng += exp(-pow((rho - 0.96) / (lw * 1.6), 2.0));
  eng += exp(-pow((rho - 0.90) / lw, 2.0)) * 0.6;
  eng += exp(-pow((rho - 0.30) / lw, 2.0)) * 0.5;
  if (rho > 0.30 && rho < 0.96) {
    for (int k = 0; k <= 24; k++) {
      float h = 6.0 + float(k) * 0.5;
      float a = hourAngle(h);
      bool full = fract(h) < 0.01;
      float r0 = full ? 0.30 : 0.80;
      if (rho < r0) continue;
      float dA = abs(sin(th - a)) * rho;
      if (cos(th - a) < 0.0) continue;
      eng += exp(-pow(dA / (lw * (full ? 1.0 : 0.7)), 2.0)) * (full ? 1.0 : 0.55);
    }
  }
  // Rose minuscule au centre.
  eng += exp(-pow((rho - 0.05) / lw, 2.0)) * 0.6;
  vec3 engraving = brass * eng * (0.06 + 0.5 * sunI);

  // Ombre du style : coin effilé vers la ligne de l’heure, longue au lever et au coucher.
  float a = hourAngle(hr);
  vec2 sdir = vec2(sin(a), cos(a));
  float along = dot(p, sdir);
  float perp = abs(dot(p, vec2(-sdir.y, sdir.x)));
  float L = clamp(0.32 / max(tan(max(alt, 0.02)), 0.01), 0.35, 1.25);
  float width = 0.035 * (1.0 - clamp(along / L, 0.0, 1.0)) + 0.004;
  float pen = (0.004 + 0.03 * clamp(along, 0.0, 2.0)) * (1.0 + 3.0 * P_ecl);
  float shadow = step(0.0, along) * (1.0 - smoothstep(width - pen, width + pen, perp)) * (1.0 - smoothstep(L * 0.92, L, along));
  col += engraving;
  col *= 1.0 - 0.72 * shadow * sunI;
  // Style (gnomon) : fine lame éclairée.
  float blade = step(0.0, along) * step(along, 0.32) * exp(-pow(perp / (lw * 1.4), 2.0));
  col += brass * blade * (0.15 + 0.8 * sunI);

  // Lumière rasante du soir, et le soir venu, la lueur de la porte de la maison.
  float evening = smoothstep(17.5, 20.5, hr);
  vec2 door = vec2(0.08, 0.12) * uRes;
  float dd = length(fc - door) / (uScale * 520.0);
  col += vec3(1.0, 0.6, 0.28) * evening * (0.16 * exp(-dd * dd * 2.0) + 0.02 * exp(-dd));
  col += engraving * evening * 0.6 * exp(-dd * 0.8);
  return col;
}`,params:[`hour`,`cx`,`cy`,`rad`,`tilt`,`ecl`,`day`],defaults:{hour:10.5,cx:.74,cy:.5,rad:.36,tilt:.62,ecl:0,day:.6}};export{e as default};