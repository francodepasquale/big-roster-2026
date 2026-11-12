// Los productos en 3D. Nunca van como imagen plana sobre el fondo: el recorte queda mal y sin contraste (regla de Tomás).
// Cada packshot transparente (assets/productos) se convierte en un objeto con cuerpo:
//   · la silueta, sacada del alfa, se extruye con poca profundidad; la foto va al frente y el canto toma el color del borde
//   · el borde del alfa se achica 1 px y el color se estira hacia afuera, para que no aparezca el filo blanco o negro
//   · el corte fino lo hace la textura (alphaTest), no la geometría: la silueta es un poco más grande que el producto
//   · contraluz detrás (un halo que separa el borde del negro), sombra de contacto y reflejo en el pedestal
import * as THREE from 'three';

const ALTO = .82, ANCHO = .64, FONDO = .05; // el más alto mide ALTO; el más ancho no pasa de ANCHO (metros)
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
  // Doce píxeles alcanzan para que los mipmaps no mezclen el fondo
  const dist = new Uint8Array(n).fill(255), cola = new Int32Array(n);
  let ini = 0, fin = 0;
  for (let i = 0; i < n; i++) if (a2[i] > 8) { dist[i] = 0; cola[fin++] = i; }
  while (ini < fin) {
    const i = cola[ini++], d = dist[i];
    if (d >= 12) continue;
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
export function prepararProducto(img, { maxTextura = 1024, anisotropia = 8 } = {}) {
  HALO ||= radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  SOMBRA ||= radial('rgba(0,0,0,.85)', 'rgba(0,0,0,0)');
  const tx = prepararTextura(img, maxTextura);
  const lazos = silueta(tx.alfa, tx.w, tx.h);
  const k = Math.min(ALTO / tx.h, ANCHO / tx.w), alto = tx.h * k, ancho = tx.w * k;
  const formas = lazos.map(q => new THREE.Shape(q.map(([u, v]) => new THREE.Vector2(u, v))));
  const geo = new THREE.ExtrudeGeometry(formas, { depth: FONDO, bevelEnabled: false, curveSegments: 1, steps: 1 });
  geo.scale(ancho, alto, 1); geo.translate(-ancho / 2, 0, -FONDO / 2); geo.computeVertexNormals();
  const mapa = new THREE.CanvasTexture(tx.canvas);
  mapa.colorSpace = THREE.SRGBColorSpace; mapa.anisotropy = anisotropia; mapa.generateMipmaps = true; mapa.minFilter = THREE.LinearMipmapLinearFilter;
  const frente = new THREE.MeshStandardMaterial({ map: mapa, emissive: 0xffffff, emissiveMap: mapa, emissiveIntensity: .36, roughness: .36, metalness: 0, alphaTest: .5, envMapIntensity: .7 });
  const canto = new THREE.MeshStandardMaterial({ color: tx.canto.clone().multiplyScalar(.72), roughness: .42, metalness: .15, envMapIntensity: .9 });
  const reflejo = new THREE.MeshBasicMaterial({ map: mapa, transparent: true, opacity: .16, alphaTest: .5, depthWrite: false });
  const reflejoCanto = new THREE.MeshBasicMaterial({ color: tx.canto.clone().multiplyScalar(.4), transparent: true, opacity: .16, depthWrite: false });

  function nuevo() {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(geo, [frente, canto]);
    const espejo = new THREE.Mesh(geo, [reflejo, reflejoCanto]); espejo.scale.y = -1; espejo.renderOrder = -1;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HALO, color: 0xffffff, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.scale.set(ancho * 2.1, alto * 1.45, 1); halo.position.set(0, alto * .5, -FONDO * 2.2);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SOMBRA, transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.scale.set(ancho * 1.5, ancho * .9 + .06, 1); sombra.position.y = .003;
    g.add(halo, sombra, espejo, cuerpo);
    g.userData = { cuerpo, halo, espejo, ancho, alto };
    return g;
  }
  return { ancho, alto, nuevo };
}
