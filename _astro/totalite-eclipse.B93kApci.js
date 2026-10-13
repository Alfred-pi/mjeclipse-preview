var e=[[6e-4,23,1.3],[5e-4,37,4.1],[45e-5,59,2.2],[35e-5,83,5],[28e-5,127,.7],[22e-5,173,3.3],[16e-5,251,1.9]],t=1.025,n=.62,r=e.map(([e,t,n])=>`${e.toFixed(5)}*sin(${t.toFixed(1)}*a+${n.toFixed(2)})`).join(`+`),i=`#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,a=`#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;      // taille du canevas (px)
uniform vec2 uSun;      // centre du Soleil (px, origine en bas à gauche)
uniform float uR;       // rayon solaire (px)
uniform vec2 uMoon;     // décalage de la Lune (R)
uniform float uE;       // exposition
uniform float uF;       // fraction de photosphère visible
uniform float uScale;   // px par « pixel de référence » (min(res)/900)
uniform float uCorona;  // 0 quand la couronne est invisible : on évite son coût
uniform int uEmN;
uniform vec4 uEm[24];   // éblouissement : xy (R), z amplitude affichée
uniform vec3 uStar;     // anneau de diamant : xy (R), z amplitude
uniform float uGlow;    // halo élargi tant que le croissant reste large
uniform float uFade;    // ouverture de l’intro (0 → 1)
uniform float uDay;     // lumière du jour perçue (0 nuit de totalité → 1 plein jour), adaptée comme un œil
uniform float uTot;     // crépuscule de totalité : étoiles, planètes, lueur d’horizon (0 → 1)
uniform float uTime;    // temps lent (s) : scintillement, rotation diurne, respiration de la couronne
uniform vec2 uPar;      // parallaxe du ciel (px) : défilement et pointeur
uniform float uBands;   // ombres volantes, juste avant et après la totalité (0 → 1)

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;
const float SUN = 1.0e6;
const float RM = ${t.toFixed(4)};

// Protubérances : angle de position, demi-largeur (rad), hauteur (R), forme (0 boucle → 1 nuage)
const vec4 PROM[3] = vec4[3](
  vec4(2.62, 0.045, 0.050, 0.3),
  vec4(4.05, 0.060, 0.038, 1.0),
  vec4(0.55, 0.035, 0.060, 0.7)
);

float limb(float a){ return ${r}; }

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Bruit de valeur périodique en x (angle autour du Soleil).
float pnoise(vec2 p, float per){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float i0 = mod(i.x, per);
  float i1 = mod(i.x + 1.0, per);
  float a = hash12(vec2(i0, i.y));
  float b = hash12(vec2(i1, i.y));
  float c = hash12(vec2(i0, i.y + 1.0));
  float d = hash12(vec2(i1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p, float per){
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * pnoise(p, per);
    p *= 2.0;
    per *= 2.0;
    a *= 0.5;
  }
  return s / 0.875;
}

// Couronne K+F : profil de Baumbach, jets fins étirés le long de lignes de champ superradiales,
// streamers en casque près de l’équateur solaire, plumes polaires fines.
vec3 corona(float r, float th){
  float rr = max(r, 1.0);
  float B = 0.0532 * pow(rr, -2.5) + 1.425 * pow(rr, -7.0) + 2.565 * pow(rr, -17.0);
  float Bv = 4.04 * pow(B / 4.04, 0.8);

  float a = th - 0.42;                    // équateur solaire incliné
  float ca = cos(a);
  float sa = sin(a);
  float lat = asin(clamp(sa, -1.0, 1.0));
  float s = abs(lat) / (0.5 * PI);        // 0 équateur → 1 pôle
  float k = 1.0 + 1.8 * (1.0 - 1.0 / rr); // expansion superradiale
  float lat0 = sign(sa) * pow(s, 1.0 / k) * 0.5 * PI;
  float th0 = ca >= 0.0 ? lat0 : PI - lat0;
  float u = fract(th0 / TAU);
  float lr = log(rr);

  float t = uTime;
  // Les jets ondulent très lentement ; la structure dérive vers l’extérieur.
  u = fract(u + 0.0016 * sin(t * 0.21 + lr * 5.0 + u * 31.0) + 0.0008 * sin(t * 0.13 + u * 97.0));
  float rays = fbm3(vec2(u * 64.0, lr * 1.4 - t * 0.008), 64.0);
  float fine = pnoise(vec2(u * 260.0, lr * 0.8 - t * 0.005), 260.0);
  // Jets fins mais peu contrastés près du limbe ; la structure ne se lit qu’au loin.
  float contrast = smoothstep(1.0, 1.6, rr);
  float streak = mix(1.0, 0.35 + 1.9 * pow(rays, 2.0), 0.35 + 0.5 * contrast);
  streak *= 1.0 + mix(0.12, 0.3, s) * (fine - 0.5) * 2.0 * contrast;

  // Streamers en casque : bulbe large près du limbe, tige étroite au loin.
  float m = 1.0 + 1.4 * (rr - 1.0);
  float side = ca >= 0.0 ? 0.0 : 19.0;
  float hn = pnoise(vec2(lat * m * 2.2 + side + 5.0, lr * 0.5 + 2.0), 1.0e4);
  float helm = smoothstep(0.45, 0.95, hn) * exp(-pow(lat * m / 0.75, 2.0));

  float shape = mix(1.0, 0.3, pow(s, 1.5) * smoothstep(1.0, 1.8, rr));
  float breath = 1.0 + 0.035 * sin(t * 0.52) + 0.02 * sin(t * 0.23 + 1.3);
  float I = Bv * streak * shape * (1.0 + 3.2 * helm * smoothstep(1.0, 1.5, rr)) * breath;
  vec3 tint = mix(vec3(1.0, 0.97, 0.94), vec3(0.88, 0.92, 1.0), smoothstep(1.0, 3.0, rr));
  return I * tint;
}

vec3 prominences(float th, float h){
  float tot = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 P = PROM[i];
    float da = atan(sin(th - P.x), cos(th - P.x));
    if (abs(da) > P.y * 1.7) continue;
    vec2 e = vec2(da / P.y, h / P.z);
    float n = fbm3(vec2(da * 70.0 + float(i) * 13.0 + 0.5 * sin(uTime * 0.7 + float(i)), h * 45.0 - uTime * 0.04), 1.0e4);
    float ring = exp(-pow((length(e) - 0.78) / 0.2, 2.0));
    float cloud = (1.0 - smoothstep(0.15, 1.0, length(e * vec2(0.9, 1.0)))) * n;
    float body = mix(ring * (0.15 + 1.4 * n * n), cloud * 1.5, P.w);
    tot += body * body * smoothstep(0.0, 0.003, h);
  }
  return tot * 16.0 * vec3(1.0, 0.16, 0.28);
}

vec3 aces(vec3 c){
  const mat3 IN = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(
    vec3( 1.60475, -0.10208, -0.00327),
    vec3(-0.53108,  1.10813, -0.07276),
    vec3(-0.07367, -0.00605,  1.07602));
  c = IN * (c / 0.6);
  vec3 a = c * (c + 0.0245786) - 0.000090537;
  vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
  return clamp(OUT * (a / b), 0.0, 1.0);
}

vec3 toSrgb(vec3 c){
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, 12.92 * c, step(c, vec3(0.0031308)));
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float px = 1.0 / uR;
  vec2 q = (fc - uSun) * px;
  float r = length(q);
  float th = atan(q.y, q.x);

  // Lune : limbe montagneux, bord net (≈ 1 px).
  vec2 qm = q - uMoon;
  float dm = length(qm);
  float rm = RM + limb(atan(qm.y, qm.x));
  float aa = 0.7 * px + 0.0003;
  float vis = smoothstep(rm - aa, rm + aa, dm);

  vec3 L = vec3(0.0);

  // Photosphère avec assombrissement centre-bord, limbe plus chaud.
  float disc = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
  if (disc > 0.0) {
    float mu = sqrt(max(0.0, 1.0 - r * r));
    float ld = 1.0 - ${n.toFixed(2)} * (1.0 - mu);
    L += SUN * ld * disc * vis * vec3(1.0, 0.90 + 0.06 * mu, 0.78 + 0.12 * mu);
  }

  float h = r - 1.0;
  if (uCorona > 0.5) {
    // Au-delà de ~7 R, la couronne est invisible à l’écran : on évite son calcul.
    if (r < 7.0) L += vis * (1.0 - disc) * corona(r, th);
    // Chromosphère : frange rose très fine, hérissée de spicules.
    if (h > -2.0 * px && h < 0.02) {
      float sp = pnoise(vec2(fract(th / TAU) * 520.0, h * 90.0 - uTime * 0.06), 520.0);
      float chrom = exp(-max(h, 0.0) / (0.0024 + 0.0034 * sp)) * smoothstep(-px, px, h);
      L += vis * chrom * 26.0 * vec3(1.0, 0.13, 0.26);
    }
    if (h > 0.0 && h < 0.12) L += vis * prominences(th, h);
  }

  // Ciel, en unités d’affichage (hors exposition du Soleil) : bleu de jour qui s’assombrit et refroidit
  // avec le croissant, puis nuit de totalité avec lueur d’horizon orangée tout autour.
  float v = fc.y / uRes.y;
  vec3 zenith = vec3(0.030, 0.105, 0.400);
  vec3 low = vec3(0.140, 0.280, 0.620);
  vec3 daySky = mix(low, zenith, smoothstep(0.0, 0.9, v));
  // Auréole : le ciel s’éclaircit autour du Soleil.
  float ds0 = length(fc - uSun) / uScale;
  daySky += vec3(0.28, 0.33, 0.40) * exp(-ds0 / 260.0);
  vec3 cool = mix(vec3(0.62, 0.70, 1.05), vec3(1.0), uDay);
  vec3 S = daySky * cool * uDay;
  float t = uTime;
  vec2 sp0 = fc + uPar;
  // Voiles d’altitude : cirrus très légers, étirés et lents, visibles seulement de jour.
  if (uDay > 0.02) {
    vec2 cp = vec2(sp0.x / (uScale * 900.0) + t * 0.003, sp0.y / (uScale * 70.0) + t * 0.001);
    float ci = fbm3(cp + vec2(0.0, 0.6 * pnoise(cp * vec2(0.5, 0.2), 1.0e4)), 1.0e4);
    float veil = smoothstep(0.6, 0.9, ci) * smoothstep(0.35, 0.95, v);
    S += vec3(0.30, 0.33, 0.38) * veil * 0.06 * uDay;
  }
  // Ombres volantes : ondulations fines et rapides du ciel juste avant et après la totalité.
  if (uBands > 0.001) {
    vec2 bp = fc / uScale;
    float wob = pnoise(vec2(bp.x * 0.004 + t * 0.4, bp.y * 0.004), 1.0e4);
    float band = sin(dot(bp, vec2(0.34, 0.94)) * 0.11 + t * 4.2 + wob * 5.0);
    S *= 1.0 + 0.06 * uBands * band;
  }
  float tw = uTot;
  float pulse = 1.0 + 0.07 * sin(t * 0.35) + 0.04 * sin(t * 0.13 + fc.x / uRes.x * 6.0);
  S += vec3(0.0035, 0.0050, 0.0120)
     + tw * (vec3(0.060, 0.034, 0.050) * exp(-v / 0.20)
           + (vec3(0.420, 0.170, 0.050) * exp(-v / 0.055)
           + vec3(0.300, 0.230, 0.120) * exp(-v / 0.018)) * pulse);
  if (tw > 0.01) {
    // Planètes (Vénus, Jupiter).
    float dv = length(fc - (uSun + vec2(-2.4, 1.05) * uR)) / uScale;
    S += tw * vec3(1.0, 0.97, 0.9) * 1.6 * exp(-dv * dv / 1.4);
    float dj = length(fc - (uSun + vec2(3.1, -1.25) * uR)) / uScale;
    S += tw * vec3(1.0, 0.94, 0.84) * 0.8 * exp(-dj * dj / 1.2);
    // Étoiles : rotation diurne lente autour d’un pôle hors écran, parallaxe, scintillement atmosphérique
    // différencié (plus fort et coloré près de l’horizon).
    vec2 pole = vec2(-0.35 * uRes.x, 1.75 * uRes.y);
    float ang = t * 0.0011;
    float ca = cos(ang), sa = sin(ang);
    vec2 rp = sp0 - pole;
    vec2 sfc = vec2(ca * rp.x - sa * rp.y, sa * rp.x + ca * rp.y) + pole;
    vec2 sc = sfc / (uScale * 40.0);
    vec2 cell = floor(sc);
    float hs = hash12(cell + 11.3);
    if (hs > 0.955) {
      vec2 off = (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * 0.7;
      float dd = length(fract(sc) - 0.5 - off) * 40.0 * uScale;
      float mag = pow(hash12(cell + 1.9), 4.0);
      float low = 1.0 - smoothstep(0.08, 0.5, v);
      float f1 = 1.3 + 3.0 * hash12(cell + 5.3);
      float f2 = 2.1 + 4.0 * hash12(cell + 9.1);
      float amp = mix(0.10, 0.55, low) * (0.6 + 0.4 * (1.0 - mag));
      float twk = 1.0 + amp * (0.6 * sin(t * f1 + hs * 40.0) + 0.4 * sin(t * f2 + hs * 77.0));
      float chroma = 0.45 * low * sin(t * (f1 + 1.7) + hs * 13.0);
      vec3 sc3 = vec3(0.86, 0.9, 1.0) * vec3(1.0 + chroma, 1.0, 1.0 - chroma);
      S += vis * tw * sc3 * max(twk, 0.0) * (0.10 + 1.6 * mag) * exp(-dd * dd / (0.7 * uScale * uScale + 0.3)) * smoothstep(0.05, 0.3, v);
    }
    // Étoiles filantes : rares (au plus une toutes les ~11 s), brèves et discrètes.
    float P = 11.0;
    float slot = floor(t / P);
    float hm = hash12(vec2(slot, 4.7));
    if (hm > 0.45) {
      float t0 = slot * P + hash12(vec2(slot, 1.3)) * (P - 1.2);
      float life = (t - t0) / 0.75;
      if (life > 0.0 && life < 1.0) {
        vec2 start = vec2(hash12(vec2(slot, 2.9)) * 0.8 + 0.15, 0.55 + hash12(vec2(slot, 6.1)) * 0.4) * uRes;
        vec2 dir = normalize(vec2(-0.82 + 0.3 * hash12(vec2(slot, 8.3)), -0.5));
        float len = 170.0 * uScale;
        vec2 head = start + dir * len * 1.6 * life;
        vec2 rel = fc - head;
        float along = dot(rel, -dir);
        float perp = abs(dot(rel, vec2(-dir.y, dir.x)));
        float trail = step(0.0, along) * (1.0 - smoothstep(0.0, len, along));
        float env = sin(3.14159 * life);
        float w = 0.7 * uScale + 0.3;
        S += tw * vec3(0.9, 0.94, 1.0) * 0.5 * env * trail * trail * exp(-perp * perp / (w * w));
      }
    }
  }

  // Éblouissement (diffusion œil/optique) : déjà en unités d’affichage.
  vec3 G = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    if (i >= uEmN) break;
    vec4 em = uEm[i];
    float ds = length(q - em.xy) * uR / uScale;
    G += em.z * (vec3(1.0, 0.97, 0.92) / (1.0 + ds * ds * 0.012)
      + vec3(0.86, 0.9, 1.0) * 0.12 * uGlow / (1.0 + ds * ds / (2000.0 * uGlow))
      + vec3(0.78, 0.86, 1.0) * 0.008 * exp(-ds / 260.0));
  }

  // Anneau de diamant : aigrettes de diffraction discrètes.
  if (uStar.z > 0.001) {
    vec2 dp = (q - uStar.xy) * uR / uScale;
    vec3 sp = vec3(0.0);
    for (int k = 0; k < 4; k++) {
      float ang = 0.21 + float(k) * PI * 0.25;
      vec2 dir = vec2(cos(ang), sin(ang));
      float along = abs(dot(dp, dir));
      float perp = abs(dot(dp, vec2(-dir.y, dir.x)));
      float w = 0.8 + along * 0.01;
      float core = exp(-perp * perp / (w * w));
      vec3 len = vec3(130.0, 115.0, 100.0) * ((k == 0 || k == 2) ? 1.0 : 0.45);
      sp += core / (1.0 + along / len) * exp(-along / (len * 2.0));
    }
    float al = length(dp);
    G += uStar.z * (sp * 0.32 + 1.4 / (1.0 + al * al * 0.02) + 0.12 * exp(-al / 70.0));
  }

  vec3 col = toSrgb(aces((L * uE + G + S) * uFade));
  // Dither triangulaire fixe (anti-banding), sans grain animé.
  float n1 = hash12(fc);
  float n2 = hash12(fc.yx + 3.1);
  col += (n1 + n2 - 1.0) / 255.0;
  outColor = vec4(col, 1.0);
}`,o=Math.PI*2,s=1e6,c=1.5,l=26e5,u=(()=>{let e=Math.hypot(1,.55);return[1/e,.55/e]})(),d=e.reduce((e,[t])=>e+t,0),f=4096,p=new Float32Array(4097);for(let t=0;t<=f;t++){let n=t/f*o,r=0;for(let[t,i,a]of e)r+=t*Math.sin(i*n+a);p[t]=r}var m=e=>{let t=e/o%1;t<0&&(t+=1);let n=t*f,r=n|0,i=n-r;return p[r]*(1-i)+p[r+1]*i},h=48,g=6,_=28,v=288,y=new Float32Array(v),b=new Float32Array(v);for(let e=0;e<v;e++){let t=(e+.5)/v*o;y[e]=Math.cos(t),b[e]=Math.sin(t)}var x=new Float32Array(_),S=new Float32Array(_),C=0;for(let e=0;e<_;e++){let t=(e+.5)/_,r=1-(1-t)**3,i=3*(1-t)**2/_,a=Math.sqrt(Math.max(0,1-r*r));x[e]=r,S[e]=r*i*(o/v)*(1-n*(1-a)),C+=S[e]*v}var w=h/24;function T(e){let n=new Float32Array(72),r=u[0]*e,i=u[1]*e,a=t-d-1e-4,o=t+d+1e-4,s=a*a,c=o*o,l=0;for(let e=0;e<v;e++){let t=Math.floor(e/g/w)*3,a=y[e],o=b[e];for(let e=0;e<_;e++){let u=x[e]*a,d=x[e]*o,f=u-r,p=d-i,h=f*f+p*p;if(h<s||h<c&&Math.sqrt(h)<1.025+m(Math.atan2(p,f)))continue;let g=S[e];n[t]+=g,n[t+1]+=g*u,n[t+2]+=g*d,l+=g}}let f=0;for(let e=0;e<24;e++)n[e*3]>n[f*3]&&(f=e);return{W:l/C,groups:n,maxIndex:f}}var E=e=>Math.min(1,Math.max(0,e)),D=e=>1/(32e4*e+5),O=e=>e<=0?0:E((Math.log10(.003)-Math.log10(e))/1.2)*E((Math.log10(e)+7)/1.2),k=e=>E((e/.45)**.3);function A(e,t){let n=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:`high-performance`});if(!n)return null;let r=(e,t)=>{let r=n.createShader(e);if(n.shaderSource(r,t),n.compileShader(r),!n.getShaderParameter(r,n.COMPILE_STATUS))throw Error(n.getShaderInfoLog(r)??`shader`);return r},o=n.createProgram();try{if(n.attachShader(o,r(n.VERTEX_SHADER,i)),n.attachShader(o,r(n.FRAGMENT_SHADER,a)),n.linkProgram(o),!n.getProgramParameter(o,n.LINK_STATUS))throw Error(n.getProgramInfoLog(o)??`link`)}catch(e){return console.warn(`[totalité] WebGL indisponible, repli conservé.`,e),null}n.useProgram(o),n.bindVertexArray(n.createVertexArray());let d=e=>n.getUniformLocation(o,e),f={res:d(`uRes`),sun:d(`uSun`),R:d(`uR`),moon:d(`uMoon`),E:d(`uE`),F:d(`uF`),day:d(`uDay`),tot:d(`uTot`),time:d(`uTime`),par:d(`uPar`),bands:d(`uBands`),glow:d(`uGlow`),fade:d(`uFade`),scale:d(`uScale`),corona:d(`uCorona`),emN:d(`uEmN`),em:d(`uEm`),star:d(`uStar`)},p=new Float32Array(96),m=1,h=1,g=16.7,_=0,v=0,y=NaN,b=T(.006),x=Math.log(D(0)),S=!1,w=1,A={key:``};function j(){let t=Math.max(1,e.clientWidth*e.clientHeight);h=Math.min(window.devicePixelRatio||1,c,Math.sqrt(l/t))*m;let r=Math.max(1,Math.round(e.clientWidth*h)),i=Math.max(1,Math.round(e.clientHeight*h));(e.width!==r||e.height!==i)&&(e.width=r,e.height=i),n.viewport(0,0,r,i),A.key=``}function M(t,r,i,a,o,c){let l=e.width,d=e.height,m=Math.min(l,d);t!==y&&(b=T(t),y=t);let g=(b.W*i*s)**.4*(1-.45*E((b.W-.05)/.5)),_=0;for(let e=0;e<24;e++){let t=b.groups[e*3];t<=0||(p[_*4]=b.groups[e*3+1]/t,p[_*4+1]=b.groups[e*3+2]/t,p[_*4+2]=b.W>0?2.6*(t/C/b.W)*g:0,p[_*4+3]=0,_++)}let v=b.groups[b.maxIndex*3],x=b.W>0?v/C/b.W:0;n.uniform2f(f.res,l,d),n.uniform2f(f.sun,r.x*h,d-r.y*h),n.uniform1f(f.R,r.r*h),n.uniform2f(f.moon,u[0]*t,u[1]*t),n.uniform1f(f.E,i),n.uniform1f(f.F,b.W),n.uniform1f(f.glow,1+1.6*E((b.W-.002)/.15)),n.uniform1f(f.fade,a),n.uniform1f(f.day,o),n.uniform1f(f.time,c.t),n.uniform2f(f.par,c.px*h,-c.py*h),n.uniform1f(f.bands,O(b.W)),n.uniform1f(f.tot,E(1-o/.14)),n.uniform1f(f.scale,m/900),n.uniform1f(f.corona,+(i>4e-4)),n.uniform1i(f.emN,_),n.uniform4fv(f.em,p),n.uniform3f(f.star,v>0?b.groups[b.maxIndex*3+1]/v:0,v>0?b.groups[b.maxIndex*3+2]/v:0,b.W>0?1.5*x*x*g:0),n.drawArrays(n.TRIANGLES,0,3)}function N(e){g+=(e*1e3-g)*.1,g>21?_++:_=0,g<12.5?v++:v=0,_>20&&m>.5?(m=Math.max(.5,m*.85),_=0,j()):v>150&&m<1&&(m=Math.min(1,m*1.1),v=0,j())}let P=e=>{e.preventDefault(),t()};return e.addEventListener(`webglcontextlost`,P),{frame(t,n,r,i,a,o,s){N(n);let c=Number.isFinite(a)?(t-a)/1e3:1/0,l=!S&&c<1;r!==y&&(b=T(r),y=r);let u=Math.log(D(b.W)),d=k(b.W),f=1;if(o.still)S=!0,x=u,w=d;else if(l){let e=1-(1-E(c/1))**3;x=u+Math.log(1.8)*(1-e),w=d,f=e}else{S=!0;let e=u>x?.45:.16;x+=(u-x)*(1-Math.exp(-n/e)),Math.abs(u-x)<.01&&(x=u),w+=(d-w)*(1-Math.exp(-n/.3)),Math.abs(d-w)<.002&&(w=d)}let p=Math.exp(x),m=`${r}|${p}|${f}|${w}|${i.x}|${i.y}|${i.r}|${e.width}|${o.t}|${o.px}|${o.py}`;return s&&m!==A.key&&(M(r,i,p,f,w,o),A.key=m),l||x!==u||w!==d},resize:j,dispose(){e.removeEventListener(`webglcontextlost`,P)},stats:()=>({quality:m,frameMs:g}),daylight:()=>w}}export{A as createEclipse};