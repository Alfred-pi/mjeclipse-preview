var e=`
float gBar(vec2 p, vec2 a, vec2 b, float w){
  vec2 ba = b - a;
  float l = length(ba);
  vec2 u = ba / l, o = p - (a + b) * 0.5;
  vec2 d = abs(vec2(dot(o, u), dot(o, vec2(-u.y, u.x)))) - vec2(l * 0.5, w);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float gTri(vec2 p, vec2 p0, vec2 p1, vec2 p2){
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))),
               vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
// Rectangle aux coins coupés (octogone).
float gOct(vec2 p, vec2 h, float c){
  vec2 o = abs(p), d = o - h;
  return max(length(max(d, 0.0)) + min(max(d.x, d.y), 0.0), (o.x + o.y - h.x - h.y + c) * 0.7071);
}
// La lettre e passe devant d, séparée par un liseré de largeur g.
float gOver(float d, float e, float g){ return min(max(d, g - e), e); }
float tag1220(vec2 q){
  if (q.x < -0.8 || q.x > 4.4 || q.y < -0.8 || q.y > 5.0) return 1e3;
  q.x -= q.y * 0.07;
  // « 20 » du haut, le « 0 » à pans coupés et pointe.
  float d = gBar(q, vec2(1.7, 4.0), vec2(2.45, 4.0), 0.17);
  d = min(d, gBar(q, vec2(2.45, 4.17), vec2(2.45, 3.3), 0.17));
  d = min(d, gBar(q, vec2(2.55, 3.4), vec2(1.75, 2.6), 0.18));
  d = min(d, gBar(q, vec2(1.62, 2.5), vec2(2.6, 2.5), 0.16));
  float z = abs(gOct(q - vec2(3.12, 3.3), vec2(0.33, 0.82), 0.3)) - 0.17;
  z = min(z, gTri(q, vec2(3.2, 4.1), vec2(3.6, 3.9), vec2(3.75, 4.55)));
  d = gOver(d, z, 0.08);
  // « 2 » du bas, base prolongée en flèche.
  float t = gBar(q, vec2(1.6, 2.0), vec2(2.75, 2.0), 0.2);
  t = min(t, gBar(q, vec2(2.75, 2.2), vec2(2.75, 1.35), 0.2));
  t = min(t, gBar(q, vec2(2.88, 1.45), vec2(1.62, 0.3), 0.22));
  t = min(t, gBar(q, vec2(1.45, 0.18), vec2(3.0, 0.18), 0.18));
  t = min(t, gTri(q, vec2(2.95, 0.0), vec2(2.95, 0.42), vec2(3.4, 0.0)));
  d = gOver(d, t, 0.08);
  // Grand « 1 » : fût, pied, drapeau, couronne à trois pointes.
  float o = gBar(q, vec2(0.95, 0.0), vec2(0.95, 3.3), 0.26);
  o = min(o, gBar(q, vec2(0.1, 0.17), vec2(1.38, 0.17), 0.17));
  o = min(o, gBar(q, vec2(0.4, 2.95), vec2(0.95, 3.3), 0.16));
  o = min(o, gBar(q, vec2(0.62, 3.56), vec2(1.45, 3.56), 0.09));
  o = min(o, gTri(q, vec2(0.58, 3.5), vec2(0.9, 3.5), vec2(0.6, 4.02)));
  o = min(o, gTri(q, vec2(0.84, 3.5), vec2(1.2, 3.5), vec2(1.04, 4.3)));
  o = min(o, gTri(q, vec2(1.12, 3.5), vec2(1.48, 3.5), vec2(1.45, 4.02)));
  return gOver(d, o, 0.08);
}
`;export{e as t};