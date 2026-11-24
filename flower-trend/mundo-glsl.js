export const COMUN=`
uniform float uTiempo;
uniform float uNoche;
uniform float uVice;
uniform float uNeonF;
uniform float uViento;
uniform float uPulso;
uniform float uVentanas;
uniform float uFarolas;
uniform float uBanda;
uniform float uSolVis;
uniform vec3 uSol;
uniform vec3 uLuz;
uniform vec3 uSolColor;
uniform vec3 uCenit;
uniform vec3 uMedio;
uniform vec3 uBajo;
uniform vec3 uHorizonte;
uniform vec3 uHorizonte2;
uniform vec3 uHalo;
uniform vec3 uAmbCielo;
uniform vec3 uAmbSuelo;
uniform vec3 uCalido;
uniform vec4 uNiebla;
uniform vec3 uNeonPal[6];
uniform sampler2D tRuido;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

vec3 gradienteCielo(vec3 d) {
  float h = max(d.y, 0.0);
  vec2 a = normalize(d.xz + vec2(1e-5));
  float az = max(dot(a, normalize(uSol.xz)), 0.0);
  vec3 hz = mix(uHorizonte2, uHorizonte, pow(az, 9.0));
  vec3 c = mix(hz, uBajo, smoothstep(0.0, uBanda, h));
  c = mix(c, uMedio, smoothstep(uBanda * 0.5, 0.3, h));
  return mix(c, uCenit, smoothstep(0.2, 0.75, h));
}

vec3 haloSol(vec3 d) {
  vec2 a = normalize(d.xz + vec2(1e-5));
  vec2 b = normalize(uSol.xz);
  float az = max(dot(a, b), 0.0);
  float s = max(dot(d, uSol), 0.0);
  float h = max(d.y, 0.0);
  return uHalo * (pow(az, 16.0) * exp(-h * 9.0) * 0.45 + pow(az, 3.0) * exp(-h * 14.0) * 0.12 + pow(s, 12.0) * 0.22 + pow(s, 160.0) * 0.55);
}

vec3 cieloBase(vec3 d) { return gradienteCielo(d) + haloSol(d); }

vec3 colorNiebla(vec3 d) {
  vec3 q = vec3(d.x, clamp(d.y, 0.0, 0.08) * 0.35, d.z);
  return gradienteCielo(q) + haloSol(q) * 0.6;
}

vec3 niebla(vec3 col, vec3 wp) {
  vec3 v = wp - cameraPosition;
  float dist = length(v);
  vec3 d = v / max(dist, 1e-4);
  float f = 1.0 - exp(-dist * uNiebla.x);
  f *= mix(1.0, exp(-max(wp.y, 0.0) * uNiebla.y), 0.75);
  f = clamp(f, 0.0, uNiebla.z);
  return mix(col, colorNiebla(d), f);
}

vec3 iluminar(vec3 alb, vec3 N, vec3 wp) {
  float ndl = dot(N, uLuz);
  float dif = clamp((ndl + 0.32) / 1.32, 0.0, 1.0);
  dif = dif * dif * (3.0 - 2.0 * dif);
  vec3 amb = mix(uAmbSuelo, uAmbCielo, clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
  float zona = smoothstep(-48.0, -28.0, wp.x) * (1.0 - smoothstep(14.0, 22.0, wp.x)) * smoothstep(-575.0, -545.0, wp.z);
  float bajo = exp(-max(wp.y, 0.0) * 0.26) * uFarolas * 0.55 * zona;
  vec3 l = amb + uSolColor * dif + uCalido * bajo * (0.4 + 0.6 * max(-N.y, 0.0) + 0.3 * (1.0 - abs(N.y)));
  return alb * l;
}

float neonParpadeo(float semilla, float clase) {
  float t = uTiempo;
  float f = 1.0;
  if (clase > 0.5) {
    float k = floor(t * 9.0 + semilla * 31.0);
    float r = fract(sin(k * 12.9898 + semilla * 78.233) * 43758.5453);
    f = r > 0.94 ? 0.25 : 1.0;
  }
  return f * (1.0 + 0.32 * uPulso) * (0.94 + 0.06 * sin(t * 2.0 + semilla * 6.0));
}
`,CIELO_V=`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  p.z = p.w * 0.99999;
  gl_Position = p;
}`,CIELO_F=`
varying vec3 vDir;
uniform float uDiscoR;
uniform float uRendijas;
uniform float uCobertura;
uniform float uEstrellas;
uniform vec3 uNubeLuz;
uniform vec3 uNubeSol;
uniform vec3 uNubeSombra;
uniform vec3 uDiscoA;
uniform vec3 uDiscoB;
uniform float uCiudadBrillo;

float capaNubes(vec2 p) {
  float n = texture2D(tRuido, p).r * 0.56;
  n += texture2D(tRuido, p * 2.63 + vec2(0.31, 0.17)).r * 0.29;
  #ifndef MOVIL
  n += texture2D(tRuido, p * 6.71 + vec2(0.77, 0.41)).g * 0.15;
  #else
  n += 0.075;
  #endif
  return n;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float hh = max(h, 0.0);
  vec3 c = cieloBase(d);
  float s = dot(d, uSol);
  float sp = max(s, 0.0);

  // resplandor de ciudad sobre el horizonte de noche
  float az = atan(d.x, -d.z);
  float ciudad = smoothstep(0.32, 0.08, abs(az - 0.85)) + smoothstep(0.42, 0.1, abs(az + 0.32)) * 0.8;
  c += vec3(0.42, 0.08, 0.32) * ciudad * exp(-hh * 22.0) * uCiudadBrillo;

  // nubes en capa plana, estiradas en x
  vec2 base = d.xz / (hh + 0.1);
  vec2 p = base * vec2(0.05, 0.17) + vec2(uTiempo * 0.0009, 0.0);
  float n = capaNubes(p);
  vec2 haciaSol = normalize(uSol.xz) * vec2(0.05, 0.17) * 0.32;
  float n2 = capaNubes(p + haciaSol);
  float dens = smoothstep(uCobertura, uCobertura + 0.18, n);
  dens *= smoothstep(-0.002, 0.06, h) * (1.0 - 0.7 * smoothstep(0.42, 0.9, hh));
  float borde = clamp((n - n2) * 7.0 + 0.4, 0.0, 1.0);
  vec3 luz = mix(uNubeLuz, uNubeSol, pow(sp, 6.0));
  float k = clamp(borde * 0.62 + pow(sp, 4.0) * 0.4 + (1.0 - smoothstep(0.0, 0.3, hh)) * 0.22, 0.0, 1.0);
  vec3 cn = mix(uNubeSombra, luz, k);
  cn += uHalo * pow(sp, 30.0) * 0.5 * borde;
  c = mix(c, cn, dens * 0.9);

  // estrellas
  vec3 q = d * 300.0;
  vec3 ci = floor(q);
  vec3 f = fract(q) - 0.5;
  vec3 r = hash33(ci);
  float e = step(0.986, r.x);
  vec3 off = (r.yzx - 0.5) * 0.45;
  float dd = length(f - off);
  float b = e * smoothstep(0.32, 0.0, dd) * (0.35 + 2.6 * r.y * r.y * r.y);
  b *= 0.7 + 0.3 * sin(uTiempo * (1.3 + r.z * 3.0) + r.y * 40.0);
  b *= smoothstep(0.04, 0.3, h) * (1.0 - dens);
  c += vec3(0.82, 0.84, 1.0) * b * uEstrellas;

  // disco solar
  float ang = acos(clamp(s, -1.0, 1.0));
  float rr = ang / uDiscoR;
  float aa = 0.01 / uDiscoR + fwidth(rr);
  float disco = 1.0 - smoothstep(1.0 - aa, 1.0, rr);
  vec3 arriba = normalize(vec3(0.0, 1.0, 0.0) - uSol * uSol.y);
  float yy = dot(d - uSol, arriba) / uDiscoR;
  float fr = fwidth(yy) * 1.5;
  vec3 cd = mix(uDiscoB, uDiscoA, smoothstep(-0.9, 0.7, yy));
  float franja = mix(1.0, smoothstep(0.42 - fr, 0.42 + fr, fract(yy * 4.2 + 0.1)), step(yy, -0.05));
  disco *= mix(1.0, franja, uRendijas);
  disco *= smoothstep(-0.0012, 0.0012, h);
  disco *= 1.0 - dens * 0.6;
  c = mix(c, cd, disco);
  // corona cercana
  c += uDiscoB * 0.09 * exp(-max(rr - 1.0, 0.0) * 2.2) * (1.0 - disco) * smoothstep(-0.002, 0.01, h);

  c = mix(c, colorNiebla(d), smoothstep(0.0, -0.004, h));
  gl_FragColor = vec4(c, 1.0);
}`,SUP_V=`
attribute vec3 aCol;
attribute vec4 aMat;
attribute vec4 aVen;
varying vec3 vW;
varying vec3 vN;
varying vec3 vCol;
varying vec4 vMat;
varying vec4 vVen;
varying vec2 vUv;
#ifdef AUTOS
attribute vec4 aMov;
varying float vFade;
uniform float uTiempo;
#endif
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  vCol = aCol;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  #ifdef USE_INSTANCING_COLOR
    if (aMat.x < 0.5) vCol *= instanceColor;
  #endif
  vec4 w = modelMatrix * p;
  #ifdef AUTOS
    // aMov: z0, velocidad, zMin, zMax
    float largo = aMov.w - aMov.z;
    float z = aMov.z + mod(aMov.x + aMov.y * uTiempo - aMov.z, largo);
    w.z += z;
    float borde = min(z - aMov.z, aMov.w - z);
    vFade = smoothstep(0.0, 45.0, borde);
  #endif
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vMat = aMat;
  vVen = aVen;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,SUP_F=`
varying vec3 vW;
varying vec3 vN;
varying vec3 vCol;
varying vec4 vMat;
varying vec4 vVen;
varying vec2 vUv;
#ifdef AUTOS
varying float vFade;
#endif
#ifdef REFLEJO
uniform float uPlanoY;
#endif

float caja1(float x, float a, float b, float aa) {
  return smoothstep(a - aa, a + aa, x) * (1.0 - smoothstep(b - aa, b + aa, x));
}

void main() {
  #ifdef REFLEJO
  if (vW.y < uPlanoY) discard;
  #endif
  #ifdef AUTOS
  if (vFade < 0.999) {
    float umbral = hash12(floor(gl_FragCoord.xy));
    if (umbral > vFade) discard;
  }
  #endif
  float tipo = vMat.x;
  vec2 fw = fwidth(vUv);
  vec4 rzF = texture2D(tRuido, vUv * vec2(0.017, 0.011) + vMat.y * 0.37);
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 alb = vCol;
  vec3 col;

  if (tipo > 8.5) {
    // tubo de ne\xF3n
    vec3 nc = uNeonPal[int(vMat.z + 0.5)];
    float f = neonParpadeo(vMat.y, vMat.w);
    vec3 apagado = iluminar(mix(nc, vec3(1.0), 0.65) * 0.55, N, vW);
    vec3 enc = (nc * 3.2 + vec3(0.9)) * f;
    col = mix(apagado, enc, clamp(uNeonF, 0.0, 1.6));
    gl_FragColor = vec4(niebla(col, vW), 1.0);
    return;
  }
  if (tipo > 5.5 && tipo < 6.5) {
    // emisivos: z = clase
    float clase = vMat.z;
    vec3 e = vec3(0.0);
    vec3 dia = iluminar(alb, N, vW);
    if (clase < 0.5) { // farola
      e = vec3(1.0, 0.72, 0.42) * 3.2 * uFarolas;
      dia = iluminar(vec3(0.75, 0.62, 0.8), N, vW);
    } else if (clase < 1.5) { // faro delantero
      e = vec3(1.0, 0.9, 0.75) * 4.0 * uFarolas;
    } else if (clase < 2.5) { // luz trasera
      e = vec3(1.0, 0.08, 0.12) * (0.6 + 2.6 * uFarolas);
    } else if (clase < 3.5) { // ventana de yate
      e = vec3(1.0, 0.75, 0.5) * 1.6 * uVentanas;
    } else if (clase < 4.5) { // baliza roja
      float b = step(0.55, fract(uTiempo * 0.7 + vMat.y));
      e = vec3(1.0, 0.05, 0.05) * 5.0 * b * smoothstep(0.2, 0.6, uNoche);
    } else if (clase < 5.5) { // piscina
      e = vec3(0.15, 0.75, 0.9) * (0.25 + 1.4 * uFarolas);
      dia = iluminar(vec3(0.2, 0.75, 0.85), N, vW);
    } else { // linterna del faro, haz giratorio
      float giro = pow(max(cos(uTiempo * 1.6 - atan(vN.z, vN.x)), 0.0), 6.0);
      e = vec3(1.0, 0.85, 0.6) * (0.5 + 5.0 * giro) * smoothstep(0.15, 0.6, uNoche);
      dia = iluminar(vec3(0.9, 0.85, 0.75), N, vW);
    }
    col = dia + e;
    gl_FragColor = vec4(niebla(col, vW), 1.0);
    return;
  }

  // sombra de cornisa y oclusi\xF3n baja
  vec3 luz = iluminar(alb, N, vW);
  col = luz;
  float h = vW.y;

  if (tipo > 0.5 && tipo < 3.5) {
    float bw = vVen.x, fh = vVen.y, gh = vVen.z, np = vVen.w;
    float u = vUv.x, v = vUv.y;
    vec3 R = reflect(-V, N);
    R.y = abs(R.y) * 0.6 + 0.02;
    vec3 cielo = cieloBase(normalize(R));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    if (v > gh) {
      float fy = (v - gh) / fh;
      float piso = floor(fy);
      float ly = fract(fy);
      if (piso < np) {
        float aaY = fw.y / fh * 0.8;
        // sombra bajo la cornisa superior de cada piso
        col *= 1.0 - 0.32 * smoothstep(0.7, 0.98, ly) * (0.35 + 0.65 * uSolVis);
        float win = 0.0;
        float bx = u / bw;
        float bay = floor(bx);
        float lx = fract(bx);
        float aaX = fw.x / bw * 0.8;
        float marco = 0.0;
        if (tipo < 1.5) {
          win = caja1(lx, 0.2, 0.8, aaX) * caja1(ly, 0.2, 0.74, aaY);
          marco = caja1(lx, 0.15, 0.85, aaX) * caja1(ly, 0.15, 0.79, aaY);
          // parteluz
          win *= 1.0 - 0.75 * caja1(lx, 0.485, 0.515, aaX);
        } else if (tipo < 2.5) {
          win = caja1(ly, 0.26, 0.7, aaY);
          marco = caja1(ly, 0.21, 0.75, aaY);
          win *= 1.0 - 0.8 * caja1(lx, 0.0, 0.06, aaX);
        } else {
          // torre lejana: grilla fina
          float bx2 = u / 4.2;
          float fy2 = (v - gh) / 6.8;
          bay = floor(bx2);
          piso = floor(fy2);
          lx = fract(bx2);
          ly = fract(fy2);
          aaX = fw.x / 4.2 * 0.8;
          aaY = fw.y / 6.8 * 0.8;
          win = caja1(lx, 0.22, 0.78, aaX) * caja1(ly, 0.3, 0.7, aaY);
        }
        // lejos: patr\xF3n promedio para evitar moir\xE9
        float lejos = smoothstep(0.3, 0.6, max(aaX, aaY));
        float hs = hash12(vec2(bay, piso) + vMat.y * 13.7);
        float hs2 = fract(hs * 41.3);
        float enc = smoothstep(hs, hs + 0.06, uVentanas * (tipo > 2.5 ? 0.7 : 0.56));
        enc = mix(enc, uVentanas * (0.12 + 0.3 * smoothstep(0.3, 0.8, rzF.g)), lejos);
        win = mix(win, 0.42, lejos);
        vec3 interior = mix(vec3(1.0, 0.64, 0.34), vec3(1.0, 0.5, 0.72), step(0.82, hs2));
        interior = mix(interior, vec3(0.5, 0.85, 1.0), step(0.93, hs2));
        vec3 vidrio = mix(vec3(0.045, 0.035, 0.1), cielo * 0.8, 0.22 + 0.65 * fres);
        vidrio *= 0.75 + 0.5 * hs2;
        vec3 cv = vidrio + interior * enc * (tipo > 2.5 ? 0.85 : 1.1);
        col = mix(col, col * 1.2 + alb * 0.03, clamp(marco - win, 0.0, 1.0) * (1.0 - lejos));
        col = mix(col, cv, win);
      } else {
        // pretil: banda lisa con l\xEDnea
        col *= 1.0 - 0.18 * caja1(v - gh - np * fh, 0.0, 0.25, fw.y);
      }
    } else {
      // planta baja: vidriera
      float bx = u / 2.4;
      float lx = fract(bx);
      float aaX = fw.x / 2.4 * 0.8;
      float aaY = fw.y * 0.8;
      float win = caja1(v, 0.35, gh - 0.85, aaY) * (1.0 - 0.85 * caja1(lx, 0.0, 0.05, aaX));
      float hs = hash12(vec2(floor(bx), vMat.y * 7.1));
      vec3 vidrio = mix(vec3(0.06, 0.04, 0.1), cielo * 0.6, 0.2 + 0.5 * fres);
      vec3 calido = vec3(1.0, 0.62, 0.36) * (0.14 + 0.72 * uFarolas) * (0.45 + 0.8 * hs);
      col = mix(col, vidrio + calido, win);
      col *= 1.0 - 0.25 * caja1(v, gh - 0.85, gh - 0.55, aaY);
      col *= 1.0 - 0.22 * (1.0 - smoothstep(0.32, 0.4, v));
    }
    // derrame de ne\xF3n en la fachada
    vec3 nc = uNeonPal[int(vMat.z + 0.5)];
    float lyy = fract((v - gh) / fh);
    float dl = min(abs(lyy - 0.97), lyy + 0.03) * fh;
    float banda = vMat.w > 0.5 ? exp(-dl * 1.1) : exp(-max(gh + np * fh - v, 0.0) * 0.35);
    float baja = exp(-max(v - 1.0, 0.0) * 0.25);
    col += nc * uNeonF * (0.012 + 0.17 * banda + 0.07 * baja) * alb * smoothstep(0.1, 0.65, uNoche);
  } else if (tipo > 3.5 && tipo < 4.5) {
    // toldo a rayas
    float r = step(0.5, fract(vUv.x / 0.55));
    vec3 a2 = mix(alb, vec3(0.92, 0.88, 0.86), r);
    col = iluminar(a2, N, vW);
    col *= 1.0 - 0.35 * step(N.y, -0.2);
    col += a2 * uCalido * uFarolas * 0.25;
  } else if (tipo > 4.5 && tipo < 5.5) {
    // estuco liso con vi\xF1eteado vertical
    col *= 0.92 + 0.08 * smoothstep(0.0, 6.0, h);
  } else if (tipo > 6.5 && tipo < 7.5) {
    // agua de piscina / vidrio de yate
    vec3 R = reflect(-V, N);
    col = mix(alb * 0.5, cieloBase(normalize(vec3(R.x, abs(R.y), R.z))), 0.5);
  }

  // borde c\xE1lido en siluetas a contraluz
  float contra = pow(max(dot(-V, uSol), 0.0), 4.0) * pow(1.0 - abs(dot(N, V)), 3.0);
  col += uSolColor * contra * 0.35 * uSolVis;

  gl_FragColor = vec4(niebla(col, vW), 1.0);
}`,PALMA_V=`
attribute vec4 aPalma; // x tipo (0 tronco, 1 hoja, 2 falda), y s en hoja, z h en tronco, w \xEDndice
attribute vec4 aInst;  // x fase, y tono, z altura, w libre
uniform float uTiempo;
uniform float uViento;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
varying vec4 vP;
varying float vTono;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  float fase = aInst.x;
  float hh = aPalma.z;
  float s = aPalma.y;
  float t = uTiempo;
  float rafaga = 0.6 + 0.4 * sin(t * 0.37 + fase * 0.5);
  float va = sin(t * 0.95 + fase) * 0.65 + sin(t * 2.3 + fase * 1.7) * 0.25;
  vec2 dirV = normalize(vec2(0.85, 0.5));
  float tronco = hh * hh * (0.35 + 0.65 * va) * uViento * 0.55 * aInst.z * rafaga;
  float hoja = s * s * uViento * (0.55 + 0.45 * sin(t * 3.1 + fase * 2.0 + aPalma.w * 1.9)) * 0.9 * rafaga;
  w.xz += dirV * (tronco + hoja * 0.8);
  w.y += hoja * 0.35 * sin(t * 3.7 + aPalma.w * 2.3 + fase) - hoja * 0.15;
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vUv = uv;
  vP = aPalma;
  vTono = aInst.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,PALMA_F=`
uniform sampler2D tHoja;
uniform vec3 uPalTronco;
uniform vec3 uPalHoja;
uniform vec3 uPalHojaAlta;
uniform vec3 uPalBorde;
varying vec3 vW;
varying vec3 vN;
varying vec2 vUv;
varying vec4 vP;
varying float vTono;
#ifdef REFLEJO
uniform float uPlanoY;
#endif
void main() {
  #ifdef REFLEJO
  if (vW.y < uPlanoY) discard;
  #endif
  float tipo = vP.x;
  float aT = texture2D(tHoja, vUv).a;
  #ifdef A2C
    float aS = clamp((aT - 0.5) / max(fwidth(aT), 1e-4) + 0.5, 0.0, 1.0);
  #else
    float aS = step(0.5, aT);
  #endif
  float esHoja = step(0.5, tipo) * step(tipo, 1.5);
  float a = mix(1.0, aS, esHoja);
  if (a < 0.02) discard;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  float hacia = max(dot(-V, uSol), 0.0);
  float contra = pow(hacia, 4.0);
  vec3 col;
  if (esHoja < 0.5) {
    float anillo = 0.86 + 0.14 * smoothstep(0.3, 0.5, abs(fract(vUv.y * 3.4) - 0.5));
    vec3 base = uPalTronco * anillo * (0.9 + 0.2 * vTono);
    if (tipo > 1.5) base = uPalHoja * 0.9;
    col = iluminar(base, N, vW);
    float rim = pow(1.0 - abs(dot(N, V)), 3.0);
    col += uPalBorde * rim * (0.12 + 0.5 * contra) * uSolVis * 0.55;
  } else {
    float s = vP.y;
    vec3 base = mix(uPalHoja, uPalHojaAlta, clamp(N.y * 0.5 + 0.5, 0.0, 1.0) * 0.7 + 0.2 * (1.0 - s));
    base *= 0.88 + 0.24 * vTono;
    col = iluminar(base, N, vW);
    // transl\xFAcidas a contraluz: tinte c\xE1lido leve
    col += uPalBorde * base * contra * 2.2 * uSolVis;
    col += uPalBorde * pow(hacia, 40.0) * 0.18 * uSolVis;
  }
  gl_FragColor = vec4(niebla(col, vW), a);
}`,SUELO_V=`
varying vec3 vW;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,SUELO_F=`
varying vec3 vW;
varying vec3 vN;
uniform sampler2D tReflejo;
uniform mat4 uMatReflejo;
uniform sampler2D tMapa;
uniform sampler2D tNeonSuelo;
uniform vec4 uMapaRect;   // x0, z0, 1/(x1-x0), 1/(z1-z0)
uniform vec4 uCalles;     // z de calles transversales
uniform float uMojado;

float caja1(float x, float a, float b, float aa) {
  return smoothstep(a - aa, a + aa, x) * (1.0 - smoothstep(b - aa, b + aa, x));
}

vec3 reflejo(vec2 uv, float lod, float largo) {
  vec3 c = textureLod(tReflejo, uv, lod).rgb * 0.28;
  c += textureLod(tReflejo, uv + vec2(0.0, largo * 0.35), lod).rgb * 0.24;
  c += textureLod(tReflejo, uv - vec2(0.0, largo * 0.35), lod).rgb * 0.2;
  c += textureLod(tReflejo, uv + vec2(0.0, largo), lod + 0.6).rgb * 0.16;
  c += textureLod(tReflejo, uv - vec2(0.0, largo), lod + 0.6).rgb * 0.12;
  return c;
}

void main() {
  float x = vW.x, z = vW.z;
  vec3 N = normalize(vN);
  vec3 vv = cameraPosition - vW;
  float dist = length(vv);
  vec3 V = vv / dist;
  vec2 mp = vec2((x - uMapaRect.x) * uMapaRect.z, (z - uMapaRect.y) * uMapaRect.w);
  float enMapa = step(0.0, mp.x) * step(mp.x, 1.0) * step(0.0, mp.y) * step(mp.y, 1.0);
  vec4 m0 = texture2D(tMapa, clamp(mp, 0.0, 1.0));
  vec3 ns = texture2D(tNeonSuelo, clamp(mp, 0.0, 1.0)).rgb * enMapa;
  vec4 m = mix(vec4(1.0, 0.0, 0.0, 1.0), m0, enMapa);
  vec4 rz = texture2D(tRuido, vW.xz * 0.05);
  vec4 rz2 = texture2D(tRuido, vW.xz * 0.37);
  vec4 rzc = texture2D(tRuido, vW.xz * vec2(0.11, 0.06) + 0.37);

  float aa = fwidth(x) + fwidth(z);
  float dc = min(min(abs(z - uCalles.x), abs(z - uCalles.y)), min(abs(z - uCalles.z), abs(z - uCalles.w)));
  float zFin = -480.0;

  vec3 alb;
  float mojado = 0.0;
  float rugoso = 1.0;
  float pintura = 0.0;
  float asfalto = 0.0;

  if (N.y < 0.6) {
    // bordillo o malec\xF3n
    alb = vec3(0.78, 0.66, 0.7);
    if (vW.y < -0.05) alb = vec3(0.42, 0.36, 0.48) * (0.8 + 0.3 * rz2.r);
    mojado = 0.0;
  } else if (z < zFin - 14.0 && z > -561.0 && x < 7.0) {
    // parque del final
    float sendero = caja1(abs(x + 1.0), -1.0, 3.0, aa) + caja1(abs(z + 528.0), -1.0, 2.2, aa);
    alb = mix(vec3(0.36, 0.5, 0.44) * (0.85 + 0.3 * rz.g), vec3(0.93, 0.75, 0.68), clamp(sendero, 0.0, 1.0));
  } else if ((x > -9.0 && x < 7.0) || (z < zFin && z > zFin - 14.0 && x < 7.0) || (x <= -9.0 && dc < 6.0 && x > -30.0)) {
    // asfalto
    asfalto = 1.0;
    alb = vec3(0.135, 0.11, 0.2) * (0.82 + 0.3 * rz.r + 0.1 * rz2.g);
    mojado = uMojado;
    rugoso = 1.0;
    if (x > -9.0 && x < 7.0 && z > zFin) {
      // l\xEDneas
      float aaL = aa * 0.7;
      float centro = caja1(x, -0.24, -0.1, aaL) + caja1(x, 0.1, 0.24, aaL);
      float tramos = step(0.45, fract(z / 9.0));
      float carril = (caja1(x, -3.42, -3.28, aaL) + caja1(x, 3.28, 3.42, aaL)) * tramos;
      float borde = caja1(x, -6.68, -6.54, aaL) + caja1(x, 6.42, 6.56, aaL);
      float cruce = 0.0;
      for (int i = 0; i < 4; i++) {
        float zc = i == 0 ? uCalles.x : (i == 1 ? uCalles.y : (i == 2 ? uCalles.z : uCalles.w));
        float dz = z - zc;
        cruce += caja1(dz, 7.0, 11.0, aaL) * step(0.5, fract(x / 1.3));
        centro *= 1.0 - caja1(dz, -6.0, 11.0, 0.0);
        carril *= 1.0 - caja1(dz, -6.0, 11.0, 0.0);
      }
      pintura = clamp(centro, 0.0, 1.0);
      vec3 amarillo = vec3(1.0, 0.72, 0.25);
      alb = mix(alb, amarillo * 0.85, pintura);
      float blanco = clamp(carril + borde + cruce, 0.0, 1.0);
      alb = mix(alb, vec3(0.86, 0.82, 0.84), blanco * (0.8 + 0.2 * rz2.r));
      pintura = max(pintura, blanco);
    }
    // charcos
    float charco = smoothstep(0.66, 0.7, rzc.g + rz2.r * 0.12);
    mojado = mix(mojado, 0.92, charco * smoothstep(0.15, 0.7, uMojado));
    rugoso = mix(1.0, 0.2, charco);
  } else if (x >= 7.0 && x < 15.5) {
    // paseo
    vec2 t = vW.xz / vec2(0.9, 0.9);
    vec2 f = abs(fract(t) - 0.5);
    float junta = 1.0 - smoothstep(0.44, 0.47, max(f.x, f.y));
    float hs = hash12(floor(t));
    alb = mix(vec3(0.86, 0.6, 0.6), vec3(0.95, 0.74, 0.66), hs) * (0.62 + 0.38 * junta);
    mojado = uMojado * 0.22;
  } else if (x >= 15.5 && z > -441.0) {
    // arena
    float ond = sin(x * 2.1 + rz.r * 6.0 + z * 0.15) * 0.5 + 0.5;
    alb = vec3(0.98, 0.74, 0.58) * (0.86 + 0.1 * ond + 0.08 * rz2.g);
    float humedo = smoothstep(-0.02, -0.11, vW.y);
    alb *= 1.0 - 0.38 * humedo;
    mojado = humedo * 0.85;
    rugoso = 0.6;
  } else if (x <= -9.0 && x > -30.0) {
    // vereda de hoteles
    vec2 t = vW.xz / vec2(1.2, 1.2);
    vec2 f = abs(fract(t) - 0.5);
    float junta = 1.0 - smoothstep(0.45, 0.48, max(f.x, f.y));
    float hs = hash12(floor(t) + 3.0);
    alb = mix(vec3(0.93, 0.78, 0.78), vec3(0.98, 0.86, 0.8), hs) * (0.66 + 0.34 * junta);
    mojado = uMojado * 0.25;
  } else {
    // ciudad de atr\xE1s: calles en grilla
    vec2 g = abs(fract(vW.xz / vec2(64.0, 80.0)) - 0.5);
    float calle = step(0.42, max(g.x, g.y));
    alb = mix(vec3(0.62, 0.5, 0.6), vec3(0.2, 0.16, 0.26), calle) * (0.85 + 0.2 * rz.r);
    mojado = uMojado * 0.4 * calle;
  }

  // luz
  float sol = mix(1.0, m.r, uSolVis);
  vec3 amb = uAmbCielo * 0.95 + uAmbSuelo * 0.15;
  vec3 col = alb * (amb + uSolColor * (0.1 + 0.62 * sol * smoothstep(-0.1, 0.4, N.y)));
  col = mix(col, col * vec3(0.78, 0.7, 1.05), (1.0 - sol) * uSolVis * 0.6);
  // farolas, vidrieras, ne\xF3n
  col += alb * uCalido * (m.g * 1.7 + m.b * 0.9) * uFarolas;
  col += alb * ns * uNeonF * 2.2;

  // reflejo mojado
  if (mojado > 0.01 && N.y > 0.6) {
    vec2 nrm = (rz2.zw - 0.5) * 0.06 * rugoso;
    vec4 pc = uMatReflejo * vec4(vW.x, 0.0, vW.z, 1.0);
    vec2 uv = pc.xy / pc.w + nrm;
    float largo = 0.03 * rugoso;
    vec3 refl = reflejo(uv, 1.0 + 2.0 * rugoso, largo);
    float fres = 0.04 + 0.96 * pow(1.0 - max(V.y, 0.0), 5.0);
    float k = mojado * fres * (1.0 - pintura * 0.6);
    col = mix(col, refl, clamp(k, 0.0, 0.9));
  }
  gl_FragColor = vec4(niebla(col, vW), 1.0);
}`,MAR_V=SUELO_V,MAR_F=`
varying vec3 vW;
varying vec3 vN;
uniform sampler2D tReflejo;
uniform mat4 uMatReflejo;
uniform vec3 uAgua;
uniform vec3 uAguaClara;
uniform float uOlas;

void main() {
  vec3 vv = cameraPosition - vW;
  float dist = length(vv);
  vec3 V = vv / dist;
  float t = uTiempo;
  vec2 p = vW.xz;
  vec2 q1 = p * 0.013 + vec2(t * 0.0035, t * 0.005);
  vec2 q2 = p * 0.047 + vec2(-t * 0.008, t * 0.006);
  vec2 q3 = p * 0.15 + vec2(t * 0.011, -t * 0.014);
  vec2 d1x = dFdx(q1), d1y = dFdy(q1);
  vec2 d2x = dFdx(q2), d2y = dFdy(q2);
  vec2 d3x = dFdx(q3), d3y = dFdy(q3);
  float lim = 0.02;
  vec4 n1 = textureGrad(tRuido, q1, d1x * min(1.0, lim / max(length(d1x), 1e-6)), d1y * min(1.0, lim / max(length(d1y), 1e-6)));
  vec4 n2 = textureGrad(tRuido, q2, d2x * min(1.0, lim / max(length(d2x), 1e-6)), d2y * min(1.0, lim / max(length(d2y), 1e-6)));
  vec4 n3 = textureGrad(tRuido, q3, d3x * min(1.0, lim / max(length(d3x), 1e-6)), d3y * min(1.0, lim / max(length(d3y), 1e-6)));
  vec2 g = (n1.zw - 0.5) * 0.8 + (n2.zw - 0.5) * 0.8 + (n3.zw - 0.5) * 0.7;
  g += vec2(cos(p.x * 0.21 + p.y * 0.07 + t * 1.3), cos(p.y * 0.17 - p.x * 0.05 + t * 1.1)) * 0.1;
  float amp = uOlas;
  vec3 N = normalize(vec3(-g.x * amp, 1.0, -g.y * amp));

  // reflejo plano con estiramiento vertical
  vec4 pc = uMatReflejo * vec4(vW.x, 0.0, vW.z, 1.0);
  vec2 uv = pc.xy / pc.w;
  vec2 vh = normalize(V.xz + vec2(1e-5));
  float adelante = dot(N.xz, vh);
  float lado = N.x * vh.y - N.z * vh.x;
  float esc = 1.0 / (1.0 + dist * 0.0025);
  uv += vec2(lado * 0.04, adelante * 0.7) * (0.45 + 0.55 * esc) * amp;
  float lodR = 0.6 + 1.6 * smoothstep(40.0, 600.0, dist);
  vec3 refl = textureLod(tReflejo, uv, lodR).rgb;
  // estelas: luces lejanas se estiran hacia el observador
  float largo = 0.018 * amp * (0.4 + 0.6 * smoothstep(80.0, 900.0, dist));
  vec3 estela = textureLod(tReflejo, uv + vec2(0.0, largo), lodR + 0.5).rgb * 0.45
              + textureLod(tReflejo, uv + vec2(0.0, largo * 2.2), lodR + 1.0).rgb * 0.3
              + textureLod(tReflejo, uv - vec2(0.0, largo), lodR + 0.5).rgb * 0.25;
  refl = mix(refl, max(refl, estela), 0.35 + 0.5 * uNoche);
  float fres = 0.025 + 0.975 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  fres = mix(fres, 0.9, smoothstep(300.0, 2500.0, dist));
  vec3 agua = mix(uAguaClara, uAgua, smoothstep(0.0, 120.0, dist)) * (0.7 + 0.4 * n2.r);
  agua *= uAmbCielo * 1.6 + uSolColor * 0.25 + 0.04;
  float cresta = smoothstep(0.5, 0.85, n3.r * 0.55 + n2.r * 0.45) * amp;
  vec3 col = mix(agua, refl, fres * (1.0 - 0.35 * cresta));

  // destellos del sol
  vec3 R = reflect(-V, N);
  float lejos = smoothstep(80.0, 1500.0, dist);
  float brillo = pow(max(dot(R, uSol), 0.0), mix(900.0, 60.0, lejos));
  float chispa = smoothstep(0.55, 0.9, n3.r * 0.6 + n2.g * 0.5);
  col += uHalo * brillo * mix(14.0, 2.2, lejos) * (0.35 + 0.65 * chispa) * uSolVis * uVice;

  // espuma en la orilla (playa en x 15.5 a 37.5)
  float playaY = vW.x < 37.5 ? 0.05 - 0.17 * (vW.x - 15.5) / 22.0 : -0.12 - 0.08 * (vW.x - 37.5);
  float prof = -0.12 - playaY;
  if (vW.z > -441.0 && vW.x > 15.0) {
    float ola = sin(t * 0.9 + vW.z * 0.02 + n1.r * 4.0) * 0.5 + 0.5;
    float espuma = smoothstep(0.24 + ola * 0.2, 0.0, prof) * smoothstep(0.3, 0.6, n3.g + ola * 0.3);
    col = mix(col, (uAmbCielo + uSolColor * 0.5) * 1.1, espuma * 0.75);
  }
  // borde del plano: se funde con el horizonte
  float horiz = length(vW.xz - cameraPosition.xz);
  col = niebla(col, vW);
  col = mix(col, colorNiebla(-V), smoothstep(2400.0, 3800.0, horiz));
  gl_FragColor = vec4(col, 1.0);
}`,LETRERO_V=`
varying vec3 vW;
varying vec2 vUv;
varying vec3 vN;
attribute vec4 aLet; // x color ne\xF3n, y semilla, z clase parpadeo
varying vec4 vLet;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vLet = aLet;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,LETRERO_F=`
uniform sampler2D tLetreros;
varying vec3 vW;
varying vec2 vUv;
varying vec3 vN;
varying vec4 vLet;
#ifdef REFLEJO
uniform float uPlanoY;
#endif
void main() {
  #ifdef REFLEJO
  if (vW.y < uPlanoY) discard;
  #endif
  vec4 m = texture2D(tLetreros, vUv);
  vec3 N = normalize(vN);
  vec3 nc = uNeonPal[int(vLet.x + 0.5)];
  float f = neonParpadeo(vLet.y, vLet.z);
  vec3 placa = iluminar(vec3(0.16, 0.08, 0.3), N, vW);
  vec3 letra = iluminar(vec3(1.0, 0.86, 0.66), N, vW);
  vec3 col = mix(placa, letra, m.r);
  float on = clamp(uNeonF, 0.0, 1.6);
  col = mix(col, col * 0.35, smoothstep(0.0, 1.0, on) * 0.8);
  col += nc * m.b * on * 0.9 * f;
  col = mix(col, (nc * 3.6 + vec3(1.0)) * f, m.g * clamp(on * 1.5, 0.0, 1.0));
  col = mix(col, iluminar(mix(nc, vec3(1.0), 0.6) * 0.7, N, vW), m.g * (1.0 - clamp(on * 1.5, 0.0, 1.0)));
  gl_FragColor = vec4(niebla(col, vW), 1.0);
}`,HALO_V=`
attribute vec4 aHalo; // xyz centro, w tama\xF1o
attribute vec3 aHaloCol;
varying vec2 vUv;
varying vec3 vC;
varying vec3 vW;
void main() {
  vec3 c = aHalo.xyz;
  vec3 der = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 arr = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 w = c + (der * position.x + arr * position.y) * aHalo.w;
  vW = c;
  vUv = position.xy;
  vC = aHaloCol;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,HALO_F=`
varying vec2 vUv;
varying vec3 vC;
varying vec3 vW;
void main() {
  float r = length(vUv);
  float a = exp(-r * r * 5.0) * 0.8 + exp(-r * 14.0) * 0.6;
  a *= 1.0 - smoothstep(0.8, 1.0, r);
  float dist = length(vW - cameraPosition);
  float f = 1.0 - exp(-dist * uNiebla.x);
  gl_FragColor = vec4(vC * a * uFarolas * (1.0 - f * 0.85), 1.0);
}`,PAJARO_V=`
attribute float aAla;
attribute vec4 aVuelo;  // fase, radio, velocidad angular, fase de aleteo
attribute vec4 aCentro; // xyz centro de giro, w escala
uniform float uTiempo;
uniform float uDia;
varying vec3 vW;
void main() {
  float a = aVuelo.x + uTiempo * aVuelo.z;
  vec3 c = aCentro.xyz + vec3(cos(a) * aVuelo.y, sin(uTiempo * 0.4 + aVuelo.w) * 1.5, sin(a) * aVuelo.y * 0.6);
  vec3 fw = normalize(vec3(-sin(a), 0.0, cos(a) * 0.6));
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 p = position;
  float aleteo = sin(uTiempo * 7.0 + aVuelo.w * 3.0);
  p.y += aAla * aleteo * 0.32;
  p *= aCentro.w * uDia;
  vec3 w = c + rt * p.x + vec3(0.0, p.y, 0.0) + fw * p.z;
  vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`,PAJARO_F=`
varying vec3 vW;
void main() {
  vec3 col = uAmbCielo * 0.18 + vec3(0.06, 0.03, 0.1);
  gl_FragColor = vec4(niebla(col, vW), 1.0);
}`;
