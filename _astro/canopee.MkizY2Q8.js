var e={frag:`
float gapsAt(vec2 fc){
  vec2 cp = (fc + uPar * 2.0) / (uScale * 300.0);
  cp += vec2(0.05 * sin(uTime * 0.23), 0.04 * cos(uTime * 0.19)) * P_wind;
  float warp = vnoise(cp * 1.7 + uTime * 0.04) - 0.5;
  return fbm(cp + vec2(warp, -warp) * 0.6);
}
float areaAt(vec2 fc){
  vec2 f = vec2(P_fx, P_fy) * uRes;
  float fd = length(fc - f) / (max(uRes.x, uRes.y) * P_spread);
  return exp(-fd * fd * 1.8);
}

vec3 scene(vec2 fc){
  float L = P_light;
  vec2 uv = fc / uRes;
  // Sol : pavé sombre au crépuscule de l’éclipse, grain fixe très léger.
  vec3 ground = mix(vec3(0.006, 0.010, 0.024), vec3(0.030, 0.026, 0.024), L);
  ground *= 0.78 + 0.44 * fbm(fc / (uScale * 140.0) + 5.0);
  ground += vec3(0.010, 0.016, 0.040) * (1.0 - uv.y) * (1.0 - L);
  vec3 warm = mix(vec3(0.70, 0.78, 1.0), vec3(1.0, 0.80, 0.56), L);

  float area = areaAt(fc);
  float gaps = smoothstep(0.40, 0.74, gapsAt(fc));
  // Lumière diffuse des trouées, très douce.
  vec3 col = ground + warm * gaps * area * 0.035 * (0.3 + L);

  float cell = uScale * mix(66.0, 52.0, uMobile);
  vec2 g = (fc + uPar) / cell;
  vec2 gi = floor(g);
  float a = radians(P_ang);
  vec2 dir = vec2(cos(a), sin(a));
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = gi + vec2(float(i), float(j));
      float h1 = hash12(c);
      if (hash12(c + 91.7) < 0.3) continue;
      float h2 = hash12(c + 17.3);
      float h3 = hash12(c + 41.9);
      vec2 sway = vec2(sin(uTime * (0.5 + h1 * 0.7) + h2 * TAU), cos(uTime * (0.4 + h3 * 0.6) + h1 * TAU)) * 0.16 * P_wind;
      vec2 ctr = (c + 0.5 + (vec2(h2, h3) - 0.5) * 0.8 + sway) * cell - uPar;
      float lit = smoothstep(0.5, 0.74, gapsAt(ctr)) * areaAt(ctr);
      if (lit < 0.01) continue;
      float rr = cell * (0.12 + 0.32 * h1 * h1);
      vec2 q = fc - ctr;
      q.y /= 0.8;
      float blur = rr * (0.05 + 0.14 * h3) + 0.8;
      float sunD = length(q);
      float sun = 1.0 - smoothstep(rr - blur, rr + blur, sunD);
      // Image inversée par le sténopé : la Lune mord du côté opposé.
      float moon = 1.0 - smoothstep(rr * 1.025 - blur, rr * 1.025 + blur, length(q + dir * P_d * rr));
      float spot = sun * (1.0 - moon);
      // Petite auréole autour de chaque tache.
      float halo = exp(-max(sunD - rr, 0.0) / (rr * 0.5)) * 0.05;
      col += warm * (spot * (0.2 + 0.95 * h2 * h2) + halo * sunFraction(P_d)) * lit * (0.25 + 1.05 * L);
    }
  }
  return col;
}`,params:[`d`,`light`,`fx`,`fy`,`spread`,`ang`,`wind`,`day`],defaults:{d:1.8,light:1,fx:.72,fy:.5,spread:.55,ang:200,wind:1,day:.6}};export{e as default};