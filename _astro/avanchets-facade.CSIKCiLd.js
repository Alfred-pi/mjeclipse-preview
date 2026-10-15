var e=`
vec3 avLin(vec3 c){ return pow(c / 255.0, vec3(2.2)); }
// Terre : rouille, brun, kaki, ocre sable, orange, rouge.
vec3 avEarth(float h){
  if (h < 0.24) return avLin(vec3(156.0, 86.0, 62.0));
  if (h < 0.42) return avLin(vec3(104.0, 68.0, 44.0));
  if (h < 0.6) return avLin(vec3(168.0, 150.0, 112.0));
  if (h < 0.78) return avLin(vec3(214.0, 194.0, 148.0));
  if (h < 0.95) return avLin(vec3(205.0, 128.0, 72.0));
  return avLin(vec3(186.0, 64.0, 52.0));
}
// Ciel : blanc cassé, gris clair, bleu ciel, bleu soutenu ; blue = part de bleus de la barre.
vec3 avSky(float h, float blue){
  if (h < blue * 0.45) return avLin(vec3(96.0, 148.0, 205.0));
  if (h < blue) return avLin(vec3(165.0, 199.0, 228.0));
  if (h < blue + (1.0 - blue) * 0.55) return avLin(vec3(228.0, 225.0, 220.0));
  return avLin(vec3(198.0, 193.0, 188.0));
}

// g : coordonnées en travées (x) et étages (y) depuis le pied de la barre ; floors : nombre d’étages ;
// seed : identifiant de la barre ; blue : part de bleus dans le ciel du motif (0 → 1).
// Renvoie l’albédo ; win reçoit la vitre (0 mur, 1 fenêtre), fold la face du pli (0 ou 1).
vec3 avFacade(vec2 g, float floors, float seed, float blue, out float win, out float fold){
  vec2 cell = floor(g);
  vec2 f = fract(g);
  // Aplats en escalier : par colonnes de deux à quatre travées, la « terre » monte plus ou moins haut,
  // portée par une grande ondulation à l’échelle de la barre (le paysage du motif).
  float cw = 3.0 + floor(hash12(vec2(floor(cell.x / 9.0), seed + 3.0)) * 4.0);
  float col = floor(cell.x / cw);
  float wave = 0.6 + 0.24 * sin(cell.x * 0.08 + seed * 2.3) + 0.1 * sin(cell.x * 0.23 + seed);
  float earthTop = floor(floors * clamp(wave + (hash12(vec2(col, seed)) - 0.5) * 0.3, 0.2, 0.95));
  float bandTop = earthTop - 2.0 - floor(hash12(vec2(col, seed + 9.0)) * 5.0);
  float skyCol = floor((cell.x + 1.0) / (cw + 1.0));
  vec3 alb;
  if (cell.y >= earthTop) alb = avSky(hash12(vec2(skyCol, seed + 5.0)), blue);
  else if (cell.y >= bandTop) alb = avEarth(hash12(vec2(col, seed + 7.0)));
  else alb = avEarth(hash12(vec2(floor((cell.x + 2.0) / (cw + 1.0)), seed + 11.0)) * 0.62);
  // Façade pliée : deux travées par face, éclairages alternés, arête plus claire.
  fold = mod(floor(cell.x / 2.0), 2.0);
  alb *= mix(1.0, 0.8, fold);
  if (mod(cell.x, 2.0) < 0.5 && f.x < 0.05) alb *= 1.12;
  // Joints des panneaux.
  if (f.x > 0.97 || f.y < 0.035) alb *= 0.86;
  // Fenêtre carrée, cadre blanc, store beige plus ou moins baissé.
  win = 0.0;
  vec2 w = abs(f - vec2(0.5, 0.55));
  if (w.x < 0.19 && w.y < 0.17) {
    alb = avLin(vec3(232.0, 230.0, 226.0));
    if (w.x < 0.155 && w.y < 0.135) {
      float lowered = min(hash12(cell + seed * 17.0) * 1.3, 1.0);
      bool blind = (f.y - 0.415) / 0.27 > 1.0 - lowered;
      alb = blind ? avLin(vec3(206.0, 186.0, 146.0)) : avLin(vec3(92.0, 104.0, 120.0));
      win = 1.0;
    }
  }
  return alb;
}

// Créneaux du toit : cages d’escalier toutes les six travées environ (blanc, brun ou ocre).
// x : travées ; renvoie la hauteur de la cage en étages (0 hors cage) et sa couleur dans c.
float avTower(float x, float seed, out vec3 c){
  float id = floor(x / 6.0);
  float u = fract(x / 6.0);
  float h = hash12(vec2(id, seed + 21.0));
  c = h < 0.5 ? avLin(vec3(222.0, 218.0, 212.0)) : (h < 0.8 ? avLin(vec3(104.0, 64.0, 46.0)) : avLin(vec3(200.0, 170.0, 116.0)));
  float w0 = 0.3 + 0.15 * hash12(vec2(id, seed + 23.0));
  return (u > w0 && u < w0 + 0.4) ? 1.15 : 0.0;
}
`;export{e as t};