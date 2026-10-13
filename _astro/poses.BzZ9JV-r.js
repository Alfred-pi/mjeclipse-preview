var e={frag:`
const int N = 13;

vec2 posePos(int i){
  float u = float(i) / float(N - 1);
  vec2 p;
  if (uMobile > 0.5) {
    p = vec2(mix(0.16, 0.84, u), mix(0.18, 0.86, u) + 0.06 * sin(u * PI));
  } else {
    p = vec2(mix(0.08, 0.92, u), 0.26 + 0.46 * (1.0 - pow(2.0 * u - 1.0, 2.0)));
  }
  return (p + vec2(P_pan, P_lift)) * uRes;
}

vec3 scene(vec2 fc){
  vec2 uv = fc / uRes;
  float minD = min(uRes.x, uRes.y);
  // Ciel nocturne, horizon encore chaud ; sol en silhouette.
  vec3 col = mix(vec3(0.010, 0.016, 0.040), vec3(0.003, 0.004, 0.012), smoothstep(0.0, 0.85, uv.y));
  float ridge = 0.075 + 0.025 * fbm(vec2(uv.x * 3.0, 1.7)) + 0.01 * vnoise(vec2(uv.x * 22.0, 3.1));
  if (uMobile > 0.5) ridge *= 0.75;
  col += vec3(0.20, 0.08, 0.03) * exp(-max(uv.y - ridge, 0.0) / 0.05) * 0.6 + vec3(0.06, 0.04, 0.06) * exp(-max(uv.y - ridge, 0.0) / 0.25);

  // Filés d’étoiles autour du pôle céleste (hors écran, en haut à gauche).
  vec2 pole = vec2(-0.12, 1.22) * uRes + uPar * 3.0;
  vec2 rp = fc - pole;
  float rr = length(rp);
  float th = atan(rp.y, rp.x);
  float ringW = uScale * 9.0;
  float ring = floor(rr / ringW);
  float sectors = 9.0;
  float sec = floor((th + PI) / TAU * sectors);
  float h = hash12(vec2(ring, sec));
  if (h > 0.6) {
    float rc = (ring + 0.5 + (hash12(vec2(ring, sec + 9.0)) - 0.5) * 0.5) * ringW;
    float a0 = -PI + (sec + hash12(vec2(sec, ring + 3.0)) * 0.6) / sectors * TAU;
    float len = P_trail * (0.6 + 0.4 * hash12(vec2(ring, sec + 2.0)));
    float da = th - a0;
    float along = clamp(da / max(len, 1e-3), 0.0, 1.0);
    float inArc = step(0.0, da) * step(da, len);
    float dist = abs(rr - rc);
    float mag = pow(hash12(vec2(ring + 4.0, sec)), 3.0);
    float w = 0.6 + 0.9 * mag;
    vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), hash12(vec2(sec, ring)));
    // La tête de l’arc (la position actuelle de l’étoile) est un peu plus brillante.
    float head = exp(-pow((da - len) * rc / (uScale * 3.0), 2.0));
    col += tint * (0.02 + 0.5 * mag) * (inArc * (0.35 + 0.65 * along) + head) * exp(-dist * dist / (w * w * uScale * uScale + 0.2)) * smoothstep(ridge, ridge + 0.06, uv.y);
  }

  // Les poses successives du Soleil.
  float R = minD * mix(0.026, 0.036, uMobile);
  for (int i = 0; i < N; i++) {
    float shown = clamp(P_n - float(i), 0.0, 1.0);
    if (shown <= 0.0) continue;
    vec2 c = posePos(i);
    vec2 q = (fc - c) / R;
    if (dot(q, q) > 900.0) continue;
    float u = float(i) / float(N - 1);
    float s = 2.0 * u - 1.0;
    float d = sign(s) * 1.95 * pow(abs(s), 1.25);
    // Le déclenchement : la pose qui vient d’apparaître s’allume plus fort, puis se pose.
    float flash = 1.0 + 1.6 * exp(-(P_n - float(i)) * 2.2);
    col += eclipseSun(q, d, normalize(vec2(1.0, 0.35)), 1.0 / R) * shown * flash * 0.55;
  }
  return col;
}`,params:[`n`,`trail`,`pan`,`lift`,`day`],defaults:{n:0,trail:.02,pan:0,lift:0,day:0}};export{e as default};