var e=`
vec3 avLin(vec3 c){ return pow(c / 255.0, vec3(2.2)); }
float avNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + 1.0), f.x), f.y);
}
// Motif : t de 0 (terre) à 1 (ciel) ; sky = la part haute du motif tire vers le bleu (sinon sable).
vec3 avMotif(float t, bool sky){
  if (t < 0.16) return avLin(vec3(122.0, 82.0, 58.0));
  if (t < 0.34) return avLin(vec3(176.0, 92.0, 66.0));
  if (t < 0.52) return avLin(vec3(214.0, 128.0, 72.0));
  if (t < 0.66) return avLin(vec3(205.0, 160.0, 100.0));
  if (t < 0.74 || !sky) return avLin(vec3(222.0, 192.0, 150.0));
  if (t < 0.88) return avLin(vec3(160.0, 192.0, 218.0));
  return avLin(vec3(112.0, 150.0, 196.0));
}

// g : coordonnées en travées (x) et étages (y) depuis le pied ; floors : étages du tronçon ;
// seed : identifiant de la barre ; blue : part de bleus dans le haut du motif (0 → 1).
// Renvoie l’albédo ; win reçoit l’ouverture éclairable (0 mur, 1 vitre), fold la face du pli (0 ou 1).
vec3 avFacade(vec2 g, float floors, float seed, float blue, out float win, out float fold){
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float hgt = clamp(cell.y / max(floors, 1.0), 0.0, 1.0);
  // Fond : blanc cassé, quelques panneaux gris chaud.
  vec3 alb = hash12(vec2(cell.x * 0.37, cell.y) + seed) > 0.9 ? avLin(vec3(214.0, 206.0, 194.0)) : avLin(vec3(236.0, 230.0, 220.0));
  // Motif géant : un champ lent sur la barre, seuillé panneau par panneau (bords en escalier comme sur les photos).
  float m = avNoise(vec2(cell.x * 0.055, cell.y * 0.1) + seed * 7.1) * 0.7 + avNoise(vec2(cell.x * 0.18, cell.y * 0.3) + seed * 3.3) * 0.3;
  m += (hash12(cell + seed * 5.0) - 0.5) * 0.14;
  if (m > 0.49) {
    bool sky = avNoise(vec2(cell.x * 0.03, 4.0) + seed) < blue;
    float t = (sky ? 0.3 : 0.12) + hgt * 0.62 + (avNoise(vec2(cell.x * 0.05, cell.y * 0.09) + seed * 2.0 + 11.0) - 0.5) * 0.9 + (hash12(cell + seed) - 0.5) * 0.08;
    alb = avMotif(clamp(t, 0.0, 1.0), sky);
  }
  // Façade pliée : deux travées par face, l’une à l’ombre.
  fold = mod(floor(cell.x / 2.0), 2.0);
  float shade = mix(1.0, 0.86, fold);
  // Joints des panneaux.
  if (f.y < 0.035 || f.x > 0.975) shade *= 0.9;
  // Ouverture : loggia profonde (garde-corps dans la couleur du panneau) ou fenêtre (store beige plus ou moins baissé).
  win = 0.0;
  if (abs(f.x - 0.5) < 0.39 && f.y > 0.36 && f.y < 0.92) {
    float k = hash12(vec2(floor(cell.x / 3.0) + 0.5, seed));
    bool loggia = abs(mod(cell.x, 3.0) - floor(k * 3.0)) < 0.5;
    float v = (f.y - 0.36) / 0.56;
    if (loggia) {
      // Ombre portée de la dalle du dessus, garde-corps plein en bas.
      vec3 deep = avLin(vec3(104.0, 98.0, 90.0)) * mix(1.0, 0.62, smoothstep(0.4, 1.0, v));
      alb = v < 0.32 ? alb * 0.82 : deep;
      win = v < 0.32 ? 0.0 : 0.6;
    } else {
      float lowered = min(hash12(cell + seed * 17.0) * 1.4, 1.0);
      alb = v > 1.0 - lowered * 0.7 ? avLin(vec3(200.0, 182.0, 146.0)) : avLin(vec3(88.0, 94.0, 102.0));
      if (abs(f.x - 0.5) > 0.36 || f.y < 0.39) alb = avLin(vec3(226.0, 222.0, 214.0));
      win = 1.0;
    }
  }
  return alb * shade;
}

// Une barre en élévation. b : x0, x1, pied, hauteur (unités de scène) ; slope : pente du toit (perspective) ;
// roofD : toit vu d’en haut (0 à hauteur d’œil). Renvoie 1 si le point touche la barre, l’albédo (ombres de forme
// comprises), l’ouverture éclairable et la cellule g (travée, étage) pour l’allumage des fenêtres.
float avBar(vec4 b, float slope, float X, float Y, float roofD, float seed, float blue, out vec3 alb, out float win, out vec2 g){
  alb = vec3(0.0); win = 0.0; g = vec2(-1.0);
  if (X < b.x || X > b.y || Y < b.z - 0.02) return 0.0;
  float floors = floor(b.w / 0.0205 + 0.5);
  float fh = (b.w + slope * (X - b.x)) / floors;
  float bx = (X - b.x) / 0.0205;
  float span = (b.y - b.x) / 0.0205;
  // Tronçons de dix travées, de zéro à trois étages plus bas : la silhouette « en montagnes ».
  float off = floor(hash12(vec2(seed, 31.0)) * 10.0);
  float seg = floor((bx + off) / 10.0);
  float su = fract((bx + off) / 10.0);
  float sf = floors - floor(hash12(vec2(seg, seed + 33.0)) * 4.0);
  float top = b.z + fh * sf;
  float par = top + fh * 0.32;
  float roof = par + roofD;
  // Édicule brun-rouge (ou gris) au milieu de chaque tronçon.
  float hb = hash12(vec2(seg, seed + 35.0));
  float box = abs(su - 0.45 - 0.1 * hb) < 0.085 ? fh * 0.8 : 0.0;
  if (Y > roof + box) return 0.0;
  if (Y > roof) {
    alb = hb < 0.7 ? avLin(vec3(150.0, 88.0, 64.0)) : avLin(vec3(200.0, 196.0, 190.0));
    if (su - 0.45 - 0.1 * hb > 0.035) alb *= 0.72;
    return 1.0;
  }
  if (Y > par) { alb = avLin(vec3(150.0, 146.0, 140.0)); return 1.0; }
  if (Y > top) { alb = avLin(vec3(206.0, 202.0, 196.0)) * (Y < top + fh * 0.06 ? 0.7 : 1.0); return 1.0; }
  g = vec2(bx, (Y - b.z) / fh);
  // Pignons pleins aux extrémités : ocre, sable ou terre cuite, à l’ombre.
  if (bx < 1.2 || span - bx < 1.2) {
    float hp = hash12(vec2(seed, 37.0));
    alb = (hp < 0.5 ? avLin(vec3(205.0, 160.0, 100.0)) : hp < 0.9 ? avLin(vec3(222.0, 192.0, 150.0)) : avLin(vec3(176.0, 92.0, 66.0))) * 0.74;
    if (fract(g.y) < 0.04) alb *= 0.9;
    return 1.0;
  }
  float fold;
  alb = avFacade(g, sf, seed, blue, win, fold);
  // Joint creux entre deux tronçons.
  if (su < 0.012 || su > 0.988) alb *= 0.55;
  // Ombre portée de l’acrotère.
  alb *= mix(0.78, 1.0, smoothstep(0.0, fh * 0.25, top - Y));
  return 1.0;
}
`;export{e as t};