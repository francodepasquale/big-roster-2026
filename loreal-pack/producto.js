// Los productos en 3D. Nunca van como imagen plana sobre el fondo: el recorte queda mal y sin contraste (regla de Tomás).
// Cada packshot transparente (assets/productos) se convierte en un volumen de verdad, con la foto proyectada de frente:
//   · torno: los envases redondos se tornean con el contorno de la foto (z < 1 los aplasta: frascos ovalados)
//   · barra: frascos planos y cajas; cada fila es un rectángulo redondeado del ancho de la foto y el espesor del producto
//   · modelos a mano (MODELOS): cuando la foto no sirve, como el Kiehl's abierto y con sombra
//   · el color del borde se estira hacia afuera, así los cantos toman el color del producto y no el fondo
//   · contraluz detrás (un halo que separa el borde del negro), sombra de contacto y reflejo en el pedestal
// La forma de cada producto está en FORMAS, al final del archivo.
import * as THREE from 'three';

const ALTO = .82, ANCHO = .64; // el más alto mide ALTO; el más ancho no pasa de ANCHO (metros)
const FILAS = 110; // resolución de la grilla con la que se saca la silueta

export const cargarImagen = url => new Promise((ok, mal) => {
  const im = new Image(); im.decoding = 'async';
  im.onload = () => ok(im); im.onerror = () => mal(new Error(`No cargó ${url}`));
  im.src = url;
});

/* ── la textura: recorte al contenido, alfa achicado 1 px y color estirado hacia lo transparente ── */
function prepararTextura(img, maxAlto) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  const g0 = c0.getContext('2d', { willReadFrequently: true });
  g0.drawImage(img, 0, 0);
  const todo = g0.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (todo[(y * W + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const m = 6; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  const k = Math.min(1, maxAlto / (y1 - y0 + 1)), w = Math.round((x1 - x0 + 1) * k), h = Math.round((y1 - y0 + 1) * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data, n = w * h;
  // alfa achicado 1 px: mínimo de 3 × 3, en dos pasadas (horizontal y vertical)
  const a = new Uint8Array(n), t = new Uint8Array(n), a2 = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = p[i * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; t[i] = x === 0 || x === w - 1 ? 0 : Math.min(a[i - 1], a[i], a[i + 1]); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; a2[i] = y === 0 || y === h - 1 ? 0 : Math.min(t[i - w], t[i], t[i + w]); }
  // color estirado: desde el borde hacia afuera, cada píxel transparente copia el color del vecino lleno más cercano.
  // 48 píxeles: los cantos del volumen toman el color del borde y los mipmaps no mezclan el fondo
  const dist = new Uint8Array(n).fill(255), cola = new Int32Array(n);
  let ini = 0, fin = 0;
  for (let i = 0; i < n; i++) if (a2[i] > 8) { dist[i] = 0; cola[fin++] = i; }
  while (ini < fin) {
    const i = cola[ini++], d = dist[i];
    if (d >= 48) continue;
    const x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0 || dist[j] !== 255) continue;
      dist[j] = d + 1; p[j * 4] = p[i * 4]; p[j * 4 + 1] = p[i * 4 + 1]; p[j * 4 + 2] = p[i * 4 + 2];
      cola[fin++] = j;
    }
  }
  // el color del canto: el promedio del borde, un poco más oscuro
  let er = 0, eg = 0, eb = 0, en = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (a2[i] > 200 && (a2[i - 1] < 60 || a2[i + 1] < 60 || a2[i - w] < 60 || a2[i + w] < 60)) { er += p[i * 4]; eg += p[i * 4 + 1]; eb += p[i * 4 + 2]; en++; }
  }
  for (let i = 0; i < n; i++) p[i * 4 + 3] = a2[i];
  g.putImageData(d, 0, 0);
  const canto = en ? new THREE.Color(er / en / 255, eg / en / 255, eb / en / 255) : new THREE.Color(.3, .3, .3);
  return { canvas: c, alfa: a2, w, h, canto };
}

/* ── la silueta: grilla del alfa → contornos exteriores por los bordes de las celdas → simplificados y suavizados ── */
function silueta(alfa, w, h) {
  const gh = FILAS, gw = Math.max(4, Math.round(FILAS * w / h)), sx = w / gw, sy = h / gh;
  let celda = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let s = 0, cnt = 0;
    const xa = Math.floor(i * sx), xb = Math.max(xa + 1, Math.floor((i + 1) * sx)), ya = Math.floor(j * sy), yb = Math.max(ya + 1, Math.floor((j + 1) * sy));
    for (let y = ya; y < yb; y += 2) for (let x = xa; x < xb; x += 2) { s += alfa[y * w + x]; cnt++; }
    celda[j * gw + i] = s / cnt > 90 ? 1 : 0;
  }
  // un poco más grande que el producto: el borde fino lo corta la textura
  const dil = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let v = 0;
    for (let dj = -1; dj <= 1 && !v; dj++) for (let di = -1; di <= 1 && !v; di++) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < gw && jj < gh && celda[jj * gw + ii]) v = 1;
    }
    dil[j * gw + i] = v;
  }
  celda = dil;
  const lleno = (i, j) => i >= 0 && j >= 0 && i < gw && j < gh && celda[j * gw + i] === 1;
  // aristas de borde, en sentido horario en pantalla: arriba, derecha, abajo, izquierda
  const salen = new Map(), clave = (x, y) => y * (gw + 1) + x;
  const arista = (ax, ay, bx, by) => { const k = clave(ax, ay); if (!salen.has(k)) salen.set(k, []); salen.get(k).push([bx, by]); };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    if (!lleno(i, j)) continue;
    if (!lleno(i, j - 1)) arista(i, j, i + 1, j);
    if (!lleno(i + 1, j)) arista(i + 1, j, i + 1, j + 1);
    if (!lleno(i, j + 1)) arista(i + 1, j + 1, i, j + 1);
    if (!lleno(i - 1, j)) arista(i, j + 1, i, j);
  }
  const lazos = [];
  for (const [k0, lista] of salen) {
    while (lista.length) {
      const pts = [[k0 % (gw + 1), Math.floor(k0 / (gw + 1))]];
      let [x, y] = lista.pop(), dx = x - pts[0][0], dy = y - pts[0][1], guard = 0;
      while (!(x === pts[0][0] && y === pts[0][1]) && guard++ < 100000) {
        pts.push([x, y]);
        const opc = salen.get(clave(x, y));
        if (!opc || !opc.length) break;
        // en las esquinas que se tocan en diagonal, girar a la derecha separa los objetos
        let elegido = 0;
        if (opc.length > 1) {
          const der = opc.findIndex(([bx, by]) => (bx - x) === -dy && (by - y) === dx);
          elegido = der >= 0 ? der : 0;
        }
        const [nx, ny] = opc.splice(elegido, 1)[0];
        dx = nx - x; dy = ny - y; x = nx; y = ny;
      }
      if (pts.length > 8) lazos.push(pts);
    }
  }
  // a coordenadas de textura (u, v), con v hacia arriba; quedan los exteriores, los huecos los corta la textura
  const area = q => { let s = 0; for (let i = 0; i < q.length; i++) { const [a, b] = q[i], [c2, d2] = q[(i + 1) % q.length]; s += a * d2 - c2 * b; } return s / 2; };
  const uv = lazos.map(q => q.map(([x, y]) => [x / gw, 1 - y / gh]));
  const signo = Math.sign(area(uv.reduce((m, q) => (Math.abs(area(q)) > Math.abs(area(m)) ? q : m), uv[0])));
  return uv.filter(q => Math.sign(area(q)) === signo && Math.abs(area(q)) > 6 / (gw * gh)).map(q => suavizar(simplificar(q, .7 / gh)));
}
function simplificar(q, eps) { // Ramer–Douglas–Peucker sobre un lazo cerrado
  const rdp = (pts) => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let mx = 0, mi = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > mx) { mx = d; mi = i; } }
    return mx > eps ? [...rdp(pts.slice(0, mi + 1)).slice(0, -1), ...rdp(pts.slice(mi))] : [pts[0], pts[pts.length - 1]];
  };
  let lejos = 0, d0 = 0;
  for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[0][0], q[i][1] - q[0][1]); if (d > d0) { d0 = d; lejos = i; } }
  return [...rdp(q.slice(0, lejos + 1)).slice(0, -1), ...rdp([...q.slice(lejos), q[0]]).slice(0, -1)];
}
function suavizar(q) { // una pasada de Chaikin
  const r = [];
  for (let i = 0; i < q.length; i++) {
    const [ax, ay] = q[i], [bx, by] = q[(i + 1) % q.length];
    r.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75]);
  }
  return r;
}

/* ── texturas compartidas: el halo del contraluz y la sombra de contacto ── */
function radial(interior, exterior) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, interior); gr.addColorStop(.45, interior.replace(/[\d.]+\)$/, m => `${parseFloat(m) * .45})`)); gr.addColorStop(1, exterior);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let HALO = null, SOMBRA = null;

/**
 * Prepara un producto: geometría, materiales y medidas. Lo pesado se hace una vez; después se clona para cada pedestal.
 * @returns {{ ancho:number, alto:number, nuevo:() => THREE.Group }}
 */
export function prepararProducto(img, { maxTextura = 1024, anisotropia = 8, forma = { tipo: 'losa', fondo: .3 } } = {}) {
  HALO ||= radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  SOMBRA ||= radial('rgba(0,0,0,.85)', 'rgba(0,0,0,0)');
  const tx = prepararTextura(img, maxTextura);
  const k = Math.min(ALTO / tx.h, ANCHO / tx.w), alto = tx.h * k, ancho = tx.w * k; // metros por píxel de la textura
  const mapa = new THREE.CanvasTexture(tx.canvas);
  mapa.colorSpace = THREE.SRGBColorSpace; mapa.anisotropy = anisotropia; mapa.generateMipmaps = true; mapa.minFilter = THREE.LinearMipmapLinearFilter;
  // la foto se proyecta de frente sobre el volumen: cada vértice toma el píxel que tiene delante
  const proyectar = geo => {
    const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / ancho + .5; uv[i * 2 + 1] = pos.getY(i) / alto; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    return geo;
  };
  const geos = forma.tipo === 'torno' ? torno(tx, k, ancho, forma.z ?? 1) : forma.tipo === 'barra' ? barra(tx, k, ancho, forma.fondo ?? .3, forma.n ?? 6) : [losa(tx, k, ancho, alto, forma.fondo ?? .3)];
  geos.forEach(proyectar);
  const fondo = Math.max(...geos.map(g => { g.computeBoundingBox(); return g.boundingBox.max.z - g.boundingBox.min.z; }));
  const piel = new THREE.MeshPhysicalMaterial({ map: mapa, emissive: 0xffffff, emissiveMap: mapa, emissiveIntensity: .3, roughness: .34, metalness: 0, clearcoat: .45, clearcoatRoughness: .25, envMapIntensity: .75 });
  const reflejo = new THREE.MeshBasicMaterial({ map: mapa, transparent: true, opacity: .16, depthWrite: false });
  const pielDoble = piel.clone(); pielDoble.side = THREE.DoubleSide;

  function nuevo() {
    const g = new THREE.Group(), cuerpo = new THREE.Group(), espejo = new THREE.Group();
    for (const geo of geos) { cuerpo.add(new THREE.Mesh(geo, forma.tipo === 'losa' ? pielDoble : piel)); espejo.add(new THREE.Mesh(geo, reflejo)); }
    espejo.scale.y = -1; espejo.renderOrder = -1;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HALO, color: 0xffffff, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.set(ancho * 2.1, alto * 1.45, 1); halo.position.set(0, alto * .5, -fondo / 2 - .06);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SOMBRA, transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.scale.set(ancho * 1.5, Math.max(ancho * .9, fondo * 1.6) + .06, 1); sombra.position.y = .003;
    g.add(halo, sombra, espejo, cuerpo);
    g.userData = { cuerpo, halo, espejo, ancho, alto };
    return g;
  }
  return { ancho, alto, nuevo };
}

/* ── torno: los envases redondos. Cada objeto de la foto (separado por columnas vacías) se tornea con el contorno de la foto:
   en cada fila, el radio es la distancia del eje al borde más cercano (así lo que sobresale de un lado, una boquilla o un
   moño, no deforma el cuerpo). z < 1 lo aplasta de adelante hacia atrás (frascos ovalados) ── */
function torno(tx, k, ancho, zEsc) {
  const { alfa, w, h } = tx, lleno = (x, y) => alfa[y * w + x] > 128;
  const cols = []; for (let x = 0; x < w; x++) { let n = 0; for (let y = 0; y < h; y += 2) if (lleno(x, y)) n++; cols.push(n > 1); }
  const rangos = []; let ini = -1, vacias = 0;
  for (let x = 0; x <= w; x++) {
    if (x < w && cols[x]) { if (ini < 0) ini = x; vacias = 0; }
    else if (ini >= 0 && (++vacias > Math.max(3, w * .01) || x === w)) { rangos.push([ini, x - vacias]); ini = -1; vacias = 0; }
  }
  const FILAS_T = 140, paso = h / FILAS_T, geos = [];
  for (const [xa, xb] of rangos) {
    if (xb - xa < w * .04) continue;
    const filas = [];
    for (let j = 0; j <= FILAS_T; j++) {
      const y = Math.min(h - 1, Math.round(j * paso)); let l = -1, r = -1;
      for (let x = xa; x <= xb; x++) if (lleno(x, y)) { if (l < 0) l = x; r = x; }
      filas.push({ y, l, r });
    }
    const anchos = filas.filter(f => f.l >= 0).map(f => f.r - f.l), maxA = Math.max(...anchos);
    const medios = filas.filter(f => f.l >= 0 && f.r - f.l > maxA * .35).map(f => (f.l + f.r) / 2).sort((a, b) => a - b);
    const c = medios[medios.length >> 1] ?? (xa + xb) / 2;
    let radios = filas.map(f => (f.l < 0 ? 0 : Math.max(0, Math.min(f.r - c, c - f.l) + .5)));
    radios = radios.map((r, i) => (r === 0 ? 0 : (radios[Math.max(0, i - 1)] || r) * .25 + r * .5 + (radios[Math.min(radios.length - 1, i + 1)] || r) * .25));
    // de abajo hacia arriba, en metros; cierra arriba y abajo en el eje
    const pts = [], abajo = filas.map((f, i) => [f, radios[i]]).filter(([, r]) => r > 0);
    if (!abajo.length) continue;
    const yA = (h - abajo[abajo.length - 1][0].y) * k, yB = (h - abajo[0][0].y) * k;
    pts.push(new THREE.Vector2(0, yA));
    for (let i = abajo.length - 1; i >= 0; i--) pts.push(new THREE.Vector2(abajo[i][1] * k, (h - abajo[i][0].y) * k));
    pts.push(new THREE.Vector2(0, yB));
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.scale(1, 1, zEsc); geo.translate((c - w / 2) * k, 0, 0);
    geos.push(geo);
  }
  return geos;
}

/* ── barra: frascos planos y cajas. Cada fila de la foto es un anillo con sección de rectángulo redondeado (superelipse de
   exponente n: más alto, esquinas más vivas) del ancho de esa fila y el espesor del producto ── */
function barra(tx, k, ancho, fondoRel, n) {
  const { alfa, w, h } = tx, lleno = (x, y) => alfa[y * w + x] > 128, FILAS_B = 160, N = 64, D = ancho * fondoRel;
  const filas = [];
  // en cada fila, el tramo lleno que contiene el eje (o el más cercano): lo que está separado por aire no se rellena
  const cs = []; for (let y = 0; y < h; y += 4) { let l = -1, r = -1; for (let x = 0; x < w; x++) if (lleno(x, y)) { if (l < 0) l = x; r = x; } if (l >= 0) cs.push((l + r) / 2); }
  cs.sort((a, b) => a - b); const eje = cs[cs.length >> 1] ?? w / 2;
  for (let j = 0; j <= FILAS_B; j++) {
    const y = Math.min(h - 1, Math.round(j * (h - 1) / FILAS_B)), tramos = []; let l = -1;
    for (let x = 0; x <= w; x++) { const v = x < w && lleno(x, y); if (v && l < 0) l = x; if (!v && l >= 0) { tramos.push([l, x - 1]); l = -1; } }
    if (!tramos.length) continue;
    const dist = ([a, b]) => (eje < a ? a - eje : eje > b ? eje - b : 0), [ta, tb] = tramos.reduce((m, t) => (dist(t) < dist(m) ? t : m));
    filas.push({ y: (h - y) * k, x0: (ta - w / 2) * k, x1: (tb + 1 - w / 2) * k });
  }
  filas.reverse(); // de abajo hacia arriba
  const pos = [], idx = [], e = 2 / n, sg = v => Math.sign(v) * Math.abs(v) ** e;
  const anillo = f => { const c = (f.x0 + f.x1) / 2, rx = (f.x1 - f.x0) / 2, rz = Math.min(D / 2, rx); for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; pos.push(c + rx * sg(Math.sin(a)), f.y, rz * sg(Math.cos(a))); } };
  filas.forEach(anillo);
  for (let j = 0; j < filas.length - 1; j++) for (let i = 0; i < N; i++) { const a = j * N + i, b = j * N + (i + 1) % N, c2 = a + N, d2 = b + N; idx.push(a, b, c2, b, d2, c2); }
  // tapas: el anillo repetido (para que el canto no se suavice con la tapa) y un centro
  for (const [f, arriba] of [[filas[0], false], [filas[filas.length - 1], true]]) {
    const base = pos.length / 3; anillo(f); pos.push((f.x0 + f.x1) / 2, f.y, 0); const ctr = base + N;
    for (let i = 0; i < N; i++) { const a = base + i, b = base + (i + 1) % N; if (arriba) idx.push(a, ctr, b); else idx.push(a, b, ctr); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  return [geo];
}

/* ── losa: lo plano de verdad (perfumes de frasco plano, cajas). La silueta con espesor real y cantos redondeados ── */
function losa(tx, k, ancho, alto, fondoRel) {
  const lazos = silueta(tx.alfa, tx.w, tx.h);
  const D = Math.max(.04, ancho * fondoRel), b = Math.min(.018, D * .12);
  const formas = lazos.map(q => new THREE.Shape([...q].reverse().map(([u, v]) => new THREE.Vector2((u - .5) * ancho, v * alto))));
  const geo = new THREE.ExtrudeGeometry(formas, { depth: D - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * .6, bevelOffset: -b * .6, bevelSegments: 3, curveSegments: 1, steps: 1 });
  geo.translate(0, 0, -(D - 2 * b) / 2);
  return geo;
}

/* las formas de cada producto (por su archivo en assets/productos). Sin entrada, va como losa */
const FORMAS = {
  'armani-acqua-di-gio': { tipo: 'barra', fondo: .42, n: 6 }, 'azzaro-wanted': { tipo: 'torno' }, 'cerave-crema-hidratante': { tipo: 'torno' },
  'elvive-glycolic-gloss': { tipo: 'torno', z: .5 }, 'excellence-creme': { tipo: 'barra', fondo: .3, n: 14 }, 'garnier-nutrisse': { tipo: 'barra', fondo: .3, n: 14 },
  'kerastase-elixir-ultime': { tipo: 'torno', z: .72 }, 'lancome-la-vie-est-belle': { tipo: 'barra', fondo: .42, n: 6 }, 'loreal-infaillible': { tipo: 'barra', fondo: .5, n: 5 },
  'lp-absolut-repair': { tipo: 'torno', z: .62 }, 'lrp-anthelios': { tipo: 'barra', fondo: .38, n: 4 }, 'maybelline-sky-high': { tipo: 'torno' },
  'men-expert': { tipo: 'torno', z: .68 }, 'nyx-butter-gloss': { tipo: 'torno' }, 'vichy-mineral-89': { tipo: 'torno' }, 'ysl-y-edp': { tipo: 'barra', fondo: .36, n: 8 },
};

/* ── modelos hechos a mano: productos cuya foto no sirve para extruir (abiertos, con sombra pegada, en perspectiva) ──
   Tienen la misma forma de salida que prepararProducto, así el pedestal no se entera */
const MODELOS = { 'kiehls-ultra-facial-cream': poteKiehls };
export function prepararModelo(slug, img, opciones) {
  return MODELOS[slug] ? MODELOS[slug](opciones) : prepararProducto(img, { ...opciones, forma: FORMAS[slug] });
}

// La etiqueta de un pote: solo la tinta, sobre transparente. Se pega alrededor del cuerpo y el frente queda en el medio
function etiquetaKiehls(anchoPx, altoPx) {
  const c = document.createElement('canvas'); c.width = anchoPx; c.height = altoPx;
  const g = c.getContext('2d'), cx = anchoPx / 2, S = altoPx / 400, SERIF = '"Times New Roman", Times, "Liberation Serif", serif';
  g.translate(cx, 0); g.scale(1.18, 1.18); g.translate(-cx, -40 * S); // la etiqueta llena casi todo el alto del cuerpo
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#161514'; g.strokeStyle = '#161514';
  // KIEHL'S entre dos filetes, con SINCE y 1851 a los lados
  g.font = `700 ${78 * S}px ${SERIF}`; const wK = g.measureText("KIEHL'S").width;
  g.lineWidth = 4 * S; g.beginPath(); g.moveTo(cx - wK / 2 - 4 * S, 92 * S); g.lineTo(cx + wK / 2 + 4 * S, 92 * S); g.moveTo(cx - wK / 2 - 4 * S, 186 * S); g.lineTo(cx + wK / 2 + 4 * S, 186 * S); g.stroke();
  g.fillText("KIEHL'S", cx, 172 * S);
  g.font = `700 ${22 * S}px ${SERIF}`; g.letterSpacing = `${3 * S}px`;
  g.fillText('SINCE', cx - wK / 2 - 62 * S, 160 * S); g.fillText('1851', cx + wK / 2 + 58 * S, 160 * S); g.letterSpacing = '0px';
  // el nombre con su subrayado rojo
  g.font = `700 ${46 * S}px ${SERIF}`; const wN = g.measureText('ULTRA FACIAL CREAM').width;
  g.fillStyle = '#2b2a28'; g.fillText('ULTRA FACIAL CREAM', cx, 238 * S);
  g.fillStyle = '#d0202a'; g.fillRect(cx - wN / 2, 247 * S, wN, 3.2 * S);
  g.fillStyle = '#161514'; g.font = `italic 700 ${21 * S}px ${SERIF}`;
  g.fillText('24-Hour, Daily Lightweight Hydrating Formula', cx, 278 * S);
  g.fillText('with 4.5% Squalane and Glacial Glycoprotein', cx, 302 * S);
  g.font = `400 ${15.5 * S}px ${SERIF}`;
  ['Our unique, fast-absorbing cream provides water replenishment throughout the day',
    'for continuous comfort and moisture-balanced, healthy-looking skin. Formulated with',
    'Squalane and Glacial Glycoprotein, it helps strengthen the skin barrier.'].forEach((l, i) => g.fillText(l, cx, (330 + i * 19) * S));
  // al costado, el contenido
  g.textAlign = 'left'; g.font = `700 ${17 * S}px ${SERIF}`;
  g.fillText('1.7 fl. oz.', cx + 330 * S, 214 * S); g.fillText('50 ml', cx + 330 * S, 236 * S);
  return c;
}
function tapaKiehls(px) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), m = px / 2, SERIF = '"Times New Roman", Times, "Liberation Serif", serif';
  g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, px, px);
  g.fillStyle = '#161514'; g.strokeStyle = '#161514'; g.textAlign = 'center';
  g.font = `700 ${px * .13}px ${SERIF}`; const w = g.measureText("KIEHL'S").width;
  g.lineWidth = px * .008; g.beginPath(); g.moveTo(m - w / 2, m - px * .1); g.lineTo(m + w / 2, m - px * .1); g.moveTo(m - w / 2, m + px * .07); g.lineTo(m + w / 2, m + px * .07); g.stroke();
  g.fillText("KIEHL'S", m, m + px * .045);
  g.font = `700 ${px * .04}px ${SERIF}`; g.fillText('SINCE 1851', m, m + px * .14);
  return c;
}
// un perfil torneado con los cantos redondeados: [radio, alto] desde el centro de abajo hasta el centro de arriba
function perfilRedondo(r, h, rb, rt, n = 6) {
  const p = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; p.push(new THREE.Vector2(r - rb + Math.cos(a) * rb, rb + Math.sin(a) * rb)); }
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; p.push(new THREE.Vector2(r - rt + Math.cos(a) * rt, h - rt + Math.sin(a) * rt)); }
  p.push(new THREE.Vector2(0, h));
  return p;
}
function poteKiehls({ anisotropia = 8, maxTextura = 1024 } = {}) {
  HALO ||= radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  SOMBRA ||= radial('rgba(0,0,0,.85)', 'rgba(0,0,0,0)');
  const R = .3, H = .31, RT = .304, HT = .155, JUNTA = .012; // el cuerpo, la tapa y la junta entre los dos (metros)
  const blanco = new THREE.MeshPhysicalMaterial({ color: '#f2f1ed', roughness: .32, clearcoat: .55, clearcoatRoughness: .25, emissive: '#ffffff', emissiveIntensity: .1, envMapIntensity: .9 });
  const tapaBlanca = new THREE.MeshPhysicalMaterial({ color: '#f6f5f1', roughness: .26, clearcoat: .7, clearcoatRoughness: .18, emissive: '#ffffff', emissiveIntensity: .1, envMapIntensity: 1 });
  const junta = new THREE.MeshStandardMaterial({ color: '#bdbab3', roughness: .5 });
  // la etiqueta: un trozo de cilindro (el frente, 160°) apenas más grande que el cuerpo, con la tinta sola. La textura tiene
  // la proporción del trozo, así las letras no se estiran
  const ARCO = Math.PI * 160 / 180, ALTO_ET = H * .8, altoEt = Math.min(maxTextura, 1024), anchoEt = Math.round(altoEt * (R * ARCO) / ALTO_ET);
  const mapa = new THREE.CanvasTexture(etiquetaKiehls(anchoEt, altoEt)); mapa.colorSpace = THREE.SRGBColorSpace; mapa.anisotropy = anisotropia;
  const tinta = new THREE.MeshStandardMaterial({ map: mapa, transparent: true, roughness: .45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mapaTapa = new THREE.CanvasTexture(tapaKiehls(Math.min(maxTextura, 512))); mapaTapa.colorSpace = THREE.SRGBColorSpace; mapaTapa.anisotropy = anisotropia;
  const tapaArriba = new THREE.MeshPhysicalMaterial({ map: mapaTapa, roughness: .26, clearcoat: .7, emissive: '#ffffff', emissiveMap: mapaTapa, emissiveIntensity: .1 });

  const geoCuerpo = new THREE.LatheGeometry(perfilRedondo(R, H, .035, .01), 96);
  const geoEtiqueta = new THREE.CylinderGeometry(R + .0015, R + .0015, ALTO_ET, 64, 1, true, -ARCO / 2, ARCO).translate(0, H * .47, 0);
  const geoJunta = new THREE.CylinderGeometry(R - .012, R - .012, JUNTA, 96).translate(0, H + JUNTA / 2, 0);
  const geoTapa = new THREE.LatheGeometry(perfilRedondo(RT, HT, .012, .03), 96).translate(0, H + JUNTA, 0);
  const geoArriba = new THREE.CircleGeometry(RT - .03, 96).rotateX(-Math.PI / 2).translate(0, H + JUNTA + HT + .0008, 0);
  const alto = H + JUNTA + HT, ancho = RT * 2;
  const piezas = [[geoCuerpo, blanco], [geoEtiqueta, tinta], [geoJunta, junta], [geoTapa, tapaBlanca], [geoArriba, tapaArriba]];

  function nuevo() {
    const g = new THREE.Group(), cuerpo = new THREE.Group(), espejo = new THREE.Group();
    for (const [geo, mat] of piezas) {
      cuerpo.add(new THREE.Mesh(geo, mat));
      const m2 = mat.clone(); m2.transparent = true; m2.opacity = (mat.opacity ?? 1) * .16; m2.depthWrite = false; m2.clearcoat = 0;
      espejo.add(new THREE.Mesh(geo, m2));
    }
    espejo.scale.y = -1; espejo.renderOrder = -1;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HALO, color: 0xffffff, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.set(ancho * 2.1, alto * 1.6, 1); halo.position.set(0, alto * .5, -R - .05);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SOMBRA, transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.scale.set(ancho * 1.5, ancho * 1.5, 1); sombra.position.y = .003;
    g.add(halo, sombra, espejo, cuerpo);
    g.userData = { cuerpo, halo, espejo, ancho, alto };
    return g;
  }
  return { ancho, alto, nuevo };
}
