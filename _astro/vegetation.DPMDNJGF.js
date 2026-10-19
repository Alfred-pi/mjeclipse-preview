var e=`
vec3 avLin(vec3 c){ return pow(c / 255.0, vec3(2.2)); }
float avNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + 1.0), f.x), f.y);
}
// Ligne de crête : hauteurs tirées toutes les w travées, reliées en pente droite (0 → 1) ; arrondie à l’étage
// par l’appelant, elle donne les marches d’escalier des fresques.
float avRidge(float x, float w, float s){
  float i = floor(x / w);
  return mix(hash12(vec2(i, s)), hash12(vec2(i + 1.0, s)), fract(x / w));
}
// Teintes Pelichrom.
vec3 avPal(int k){
  if (k == 1) return avLin(vec3(206.0, 204.0, 198.0));  // gris clair
  if (k == 2) return avLin(vec3(230.0, 190.0, 70.0));   // jaune
  if (k == 3) return avLin(vec3(236.0, 214.0, 132.0));  // jaune pâle
  if (k == 4) return avLin(vec3(78.0, 124.0, 184.0));   // bleu
  if (k == 5) return avLin(vec3(146.0, 180.0, 214.0));  // bleu clair
  if (k == 6) return avLin(vec3(52.0, 82.0, 136.0));    // bleu foncé
  if (k == 7) return avLin(vec3(74.0, 76.0, 82.0));     // anthracite
  if (k == 8) return avLin(vec3(228.0, 122.0, 46.0));   // orange
  if (k == 9) return avLin(vec3(192.0, 72.0, 46.0));    // rouge orangé
  if (k == 10) return avLin(vec3(204.0, 152.0, 82.0));  // ocre
  if (k == 11) return avLin(vec3(120.0, 82.0, 62.0));   // brun
  return avLin(vec3(236.0, 230.0, 220.0));              // blanc cassé
}

// Lever de soleil (bloc 3) : c panneau (travée, étage) sur toute la barre ; full étages de la barre ; span travées.
// Lecture libre de l’élévation (charte p. 38) et des photos couleur, sans relevé : rez rouge orangé, horizon
// anthracite en escalier, petit demi-disque jaune pâle qui se lève du pied un peu à droite du milieu, relié
// directement aux sept rayons jaune pâle sur fond bleu qui partent du même centre bas vers le toit et les bouts.
// Angles mesurés dans une métrique étirée (travées ramenées aux étages) pour que les rayons couvrent toute la barre ;
// tout est évalué au centre des panneaux, donc chaque limite tombe aux joints, en escalier.
int avSunrise(vec2 c, float full, float span){
  vec2 p = c + 0.5;
  float sx = max(span, 1.0) / 73.0;
  float u = c.x / sx;                       // travée ramenée à 73
  float dx = p.x - span * 0.54;             // centre du soleil un peu à droite du milieu
  // Sol : rez rouge orangé, deux étages aux bouts (plus large à gauche, comme sur la photo).
  if (c.y < 1.0) return 9;
  if (c.y < 2.0 && (u < 17.0 || u > 65.0)) return 9;
  // Disque : environ 14 travées de large, cinq niveaux sur quinze ; proportions réduites d’après la photo.
  float e = length(vec2(dx / (7.2 * sx), p.y / (0.32 * full)));
  if (e < 1.0) return 3;
  // Horizon anthracite : bas au milieu, remonte par paliers vers les bouts.
  float hz = 2.0 + min(floor(abs(dx) / (13.0 * sx)), 2.0);
  if (c.y < hz) return 7;
  // Les rayons rejoignent le disque directement, sans halo bleu ajouté.
  // Rayons : angle depuis la verticale (degrés, + vers la droite), dx étiré pour l’allongement de la barre.
  float a = degrees(atan(dx * full * 1.1 / (0.5 * span), p.y));
  if (a > -8.0 && a < 5.0) return 3;        // vers le haut, un peu à gauche
  if (a > 17.0 && a < 29.0) return 3;       // haut droite
  if (a > 41.0 && a < 57.0) return 3;       // diagonale droite, sort par le bout du toit
  if (a > 66.0 && a < 80.0) return 3;       // bas droite, au-dessus de l’horizon
  if (a > -34.0 && a < -20.0) return 3;     // haut gauche
  if (a > -60.0 && a < -47.0) return 3;     // diagonale gauche
  if (a > -85.0 && a < -72.0) return 3;     // bas gauche
  return 4;
}

// Montagnes : rez rouge, collines jaunes au premier plan, massifs anthracite, ciel bleu en deux bandes, haut blanc.
int avMountains(vec2 c, float full, float seed, float blue){
  if (c.y < 1.0) return 9;
  float hy = 1.0 + floor(avRidge(c.x, 9.0, seed + 1.0) * 3.0);
  if (c.y < hy) return 2;
  float hm = 3.0 + floor(avRidge(c.x, 13.0, seed + 2.0) * max(full * 0.5 - 2.0, 1.0));
  if (c.y < hm) return 7;
  float hs = hm + 1.0 + floor(max(full - 3.0 - hm, 0.0) * blue + (avRidge(c.x, 7.0, seed + 3.0) - 0.5) * 3.0);
  if (c.y < hs) return c.y < hm + 2.0 ? 4 : 5;
  return 0;
}

// Terres : brun, terre cuite, orange, ocre, jaune en strates d’escalier ; haut blanc, quelques nuages bleu clair.
int avEarth(vec2 c, float full, float seed, float blue){
  if (c.y < 1.0) return 11;
  float h1 = 1.0 + floor(avRidge(c.x, 8.0, seed + 1.0) * 3.0);
  if (c.y < h1) return 9;
  float h2 = h1 + 1.0 + floor(avRidge(c.x, 12.0, seed + 2.0) * 3.0);
  if (c.y < h2) return 8;
  float h3 = h2 + 1.0 + floor(avRidge(c.x, 10.0, seed + 3.0) * 2.0);
  if (c.y < h3) return 10;
  float h4 = min(h3 + 1.0 + floor(avRidge(c.x, 15.0, seed + 4.0) * 2.0), full - 3.0);
  if (c.y < h4) return 2;
  return avNoise(vec2(c.x * 0.08, c.y * 0.3) + seed * 2.3) > 1.0 - blue * 0.4 ? 5 : 0;
}

// Nuages : rez rouge, colline anthracite à crête jaune, grands nuages bleus en escalier sur fond blanc.
int avClouds(vec2 c, float full, float seed, float blue){
  if (c.y < 1.0) return 9;
  float hh = 1.0 + floor(avRidge(c.x, 11.0, seed + 1.0) * 4.0);
  if (c.y < hh) return c.y < hh - 2.0 ? 7 : 2;
  float n = avNoise(vec2(c.x * 0.07, c.y * 0.2) + seed * 3.1);
  if (c.y > hh && c.y < full - 1.0 && n > 0.64 - blue * 0.12) return n > 0.75 - blue * 0.1 ? 4 : 5;
  return 0;
}

// g : coordonnées en travées (x) et étages (y) depuis le pied, sur toute la barre ; full : étages de la barre ;
// span : travées de la barre ; seed : identifiant de la barre ; blue : part de bleus du motif (0 → 1).
// Renvoie l’albédo ; win reçoit l’ouverture éclairable (0 mur, 1 vitre), fold la face du pli (0 ou 1).
vec3 avFacade(vec2 g, float full, float span, float seed, float blue, out float win, out float fold){
  vec2 cell = floor(g);
  vec2 f = fract(g);
  // Fresque choisie par barre : le lever de soleil sur la barre de devant (graine 14,8), ailleurs une fresque apparentée.
  int k;
  if (abs(seed - 14.8) < 0.05) k = avSunrise(cell, full, span);
  else {
    float kind = fract(seed * 0.618);
    k = kind < 0.2 ? avMountains(cell, full, seed, blue) : kind < 0.5 ? avEarth(cell, full, seed, blue) : avClouds(cell, full, seed, blue);
  }
  vec3 alb = avPal(k);
  // Fond blanc cassé : quelques panneaux gris chaud ; légère dispersion de teinte d’un panneau à l’autre.
  if (k == 0 && hash12(vec2(cell.x * 0.37, cell.y) + seed) > 0.9) alb = avLin(vec3(214.0, 206.0, 194.0));
  alb *= 0.97 + 0.06 * hash12(cell + seed * 9.0);
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
  // Fresque calée sur la barre entière (tous ses étages, toutes ses travées), pas sur la hauteur du tronçon.
  alb = avFacade(g, floors, span, seed, blue, win, fold);
  // Joint creux entre deux tronçons.
  if (su < 0.012 || su > 0.988) alb *= 0.55;
  // Ombre portée de l’acrotère.
  alb *= mix(0.78, 1.0, smoothstep(0.0, fh * 0.25, top - Y));
  return 1.0;
}
`,t=`
const float NT_PI = 3.14159265;
float ntNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float ntFbm(vec2 p){
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * ntNoise(p); p = p * 2.07 + vec2(13.7, 5.3); a *= 0.5; }
  return s / 0.875;
}
float ntSmin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// Distance à un membre effilé (rayon ra en a, rb en b).
float ntLimb(vec2 p, vec2 a, vec2 b, float ra, float rb){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}

vec4 natTree(vec2 q, float seed, float wind, float pixel, float kind){
  float bro = clamp(kind, 0.0, 1.0);
  float hw = mix(0.22, 0.62, bro);
  if (q.y < -0.05 || q.y > 1.1 || abs(q.x) > hw) return vec4(0.0);
  float r1 = hash12(vec2(seed, 1.7));
  float r2 = hash12(vec2(seed, 4.3));
  float r3 = hash12(vec2(seed, 8.9));
  float aa = max(pixel, 1.0e-4);
  // Détails fins (paquets de feuilles, trous, écorce) seulement quand l’arbre est assez grand à l’écran.
  float lod = 1.0 - smoothstep(0.012, 0.04, aa);
  // Vent : balancement lent de la cime, nul au pied ; légère inclinaison propre à chaque arbre.
  float sway = (sin(wind * 0.7 + seed * 5.1) + 0.4 * sin(wind * 1.31 + seed * 2.3)) * 0.007;
  vec2 p = vec2(q.x - (sway + (r1 - 0.5) * 0.05) * q.y * q.y, q.y);

  // Houppier : pied, demi-largeurs (peuplier wP, feuillu rx × ry), centre du feuillu.
  float cb = mix(0.08 + 0.07 * r2, 0.3 + 0.12 * r2, bro);
  float wP = 0.075 + 0.04 * r3;
  float rx = 0.3 + 0.12 * r3;
  float ry = (1.0 - cb) * 0.5;
  vec2 cc = vec2(0.0, cb + ry * 0.88);
  float dC = 1.0e3;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float h = hash12(vec2(seed + fi * 3.1, 2.9));
    float h2 = hash12(vec2(seed + fi * 5.7, 6.1));
    // Peuplier : touffes empilées le long de l’axe, les plus larges au tiers inférieur.
    float tt = (fi + 0.5) / 8.0;
    float prof = sin(NT_PI * (0.12 + 0.83 * tt));
    vec2 cP = vec2((h2 - 0.5) * wP * 0.8 * prof, mix(cb + 0.06, 0.93, tt));
    float rP = wP * (0.4 + 0.6 * prof) * (0.85 + 0.3 * h);
    // Feuillu : touffes en spirale dans une couronne ovale.
    float an = fi * 2.39996 + r1 * 6.2832;
    float rad = sqrt(tt) * 0.66;
    vec2 cB = cc + vec2(cos(an) * rx, sin(an) * ry * 0.92) * rad;
    float rB = mix(rx, ry, 0.5) * (0.42 + 0.2 * h);
    dC = ntSmin(dC, length(p - mix(cP, cB, bro)) - mix(rP, rB, bro), mix(0.03, 0.06, bro));
  }
  // Peuplier : flèche effilée, flancs presque droits.
  float tip = abs(p.x) - wP * 1.45 * sqrt(clamp((1.02 - p.y) / 0.4, 0.0, 1.0));
  dC = max(dC, mix(tip, -1.0, bro));
  // Bord feuillu : grosses touffes puis petits paquets de feuilles (étirés en hauteur chez le peuplier).
  vec2 ns = mix(vec2(11.0, 5.0), vec2(6.5, 6.5), bro);
  float scl = mix(wP, rx, bro);
  float n1 = ntFbm(p * ns + seed * 7.3);
  float n2 = ntNoise(p * ns * 3.3 + seed * 3.1 + 11.0);
  dC += (n1 - 0.5) * scl * 0.6 + (n2 - 0.5) * scl * 0.2 * lod;

  // Bois : tronc effilé, empattement au pied, cinq charpentières alternées.
  float tTop = mix(0.86, cb + ry, bro);
  float rT = mix(0.016, 0.03, bro) * (0.8 + 0.4 * r3);
  vec2 tTip = vec2((r2 - 0.5) * 0.04, tTop);
  float dW = ntLimb(p, vec2(0.0, -0.05), tTip, rT, rT * 0.3);
  dW -= rT * 0.8 * exp(-max(p.y, 0.0) * 28.0);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float hb = hash12(vec2(seed + fi * 1.9, 13.7));
    float sideB = mod(fi + floor(r1 * 2.0), 2.0) < 0.5 ? -1.0 : 1.0;
    float by = mix(cb * 0.9, tTop * 0.8, (fi + 0.6 * hb) / 5.0);
    vec2 a0 = vec2(tTip.x * (by + 0.05) / (tTop + 0.05), by);
    vec2 dir = normalize(vec2(sideB * mix(0.25, 1.1, bro) * (0.6 + 0.6 * hb), 1.0));
    float len = mix(0.16, 0.34, bro) * (0.65 + 0.45 * hb);
    dW = min(dW, ntLimb(p, a0, a0 + dir * len, rT * 0.5, rT * 0.12));
  }

  // Trous clairsemés près du bord : on y voit les branches ou le fond.
  float n3 = ntNoise(p * ns * 2.2 + seed * 1.9 + 37.0);
  float gap = smoothstep(0.62, 0.8, n3) * smoothstep(-scl * 0.35, -scl * 0.04, dC) * lod;
  float covC = clamp(0.5 - dC / aa, 0.0, 1.0) * (1.0 - gap);
  float covW = clamp(0.5 - dW / aa, 0.0, 1.0);
  if (covC <= 0.0 && covW <= 0.0) return vec4(0.0);

  // Feuillage : vert retenu propre à chaque arbre, plus bleuté chez le peuplier, parfois un peu jaune.
  vec3 leaf = mix(vec3(0.036, 0.062, 0.03), vec3(0.062, 0.082, 0.033), r2);
  leaf = mix(leaf, vec3(0.045, 0.07, 0.048), (1.0 - bro) * 0.45);
  leaf = mix(leaf, vec3(0.1, 0.09, 0.036), step(0.86, r3) * 0.4);
  // Volume : touffes éclairées du côté du soleil (en haut à gauche), creux et dessous dans l’ombre.
  vec2 sd = vec2(-0.55, 0.835);
  float c0 = ntNoise(p * ns * 1.6 + seed * 4.7);
  float c1 = ntNoise((p + sd * 0.025) * ns * 1.6 + seed * 4.7);
  float clump = clamp(0.5 + (c0 - c1) * 3.0, 0.0, 1.0);
  vec2 cr = (p - mix(vec2(0.0, mix(cb, 1.0, 0.45)), cc, bro)) / vec2(scl, ry);
  float sunS = clamp(0.55 + 0.45 * dot(cr, sd), 0.0, 1.0);
  float inner = smoothstep(0.0, scl * 0.5, -dC);
  float under = 1.0 - smoothstep(cb - 0.05, cb + (1.0 - cb) * 0.35, p.y);
  float shade = (0.32 + 0.9 * sunS * mix(0.55, 1.0, clump)) * (1.0 - 0.45 * inner * (1.0 - c0)) * (1.0 - 0.35 * under);
  vec3 leafC = leaf * shade * mix(vec3(0.86, 0.96, 1.12), vec3(1.1, 1.04, 0.86), sunS * clump);
  // Feuilles du bord en contre-jour : un peu plus claires côté soleil.
  leafC *= 1.0 + 0.2 * smoothstep(-scl * 0.08, 0.0, dC) * sunS;
  leafC *= mix(1.0, 0.85 + 0.3 * n2, lod);

  // Écorce : gris clair du peuplier, brun sombre du feuillu ; cylindre éclairé à gauche, ombre du houppier.
  vec3 bark = mix(vec3(0.105, 0.1, 0.09), vec3(0.075, 0.066, 0.056), bro);
  float tx = clamp((p.x - tTip.x * max(p.y, 0.0) / tTop) / rT, -1.0, 1.0);
  bark *= 0.62 + 0.45 * (0.5 - 0.5 * tx);
  bark *= mix(1.0, 0.8 + 0.4 * ntNoise(vec2(p.x * 160.0, p.y * 14.0) + seed), lod);
  bark *= 1.0 - 0.55 * smoothstep(cb - 0.12, cb + 0.05, p.y);
  bark *= 0.7 + 0.3 * smoothstep(0.0, 0.05, p.y);

  float a = covC + covW * (1.0 - covC);
  return vec4((leafC * covC + bark * covW * (1.0 - covC)) / max(a, 1.0e-4), a);
}
`;export{e as n,t};