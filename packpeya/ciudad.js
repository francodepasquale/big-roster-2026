// La ciudad: una maqueta isométrica blanca, con los colores del mapa de PedidosYa (gris claro, calles blancas, plazas
// verde pálido). Todo procedural. Los colores de los shaders van directo en sRGB.
import * as THREE from 'three';

export const CUADRA = 14, CALLE = 5;
export const FONDO = '#e9e5df';
const LOTE = CUADRA - CALLE, LOSA = .3, ESPESOR = 7, RADIO = 36;
// La isla: el pedazo de ciudad que se ve, en cuadras. El recorrido entra con una o dos cuadras de margen
const CUADRAS = { x0: -8, x1: 5, z0: -7, z1: 6 }, BANQUINA = CALLE / 2 + 1;
export const ISLA = { x0: CUADRAS.x0 * CUADRA - BANQUINA, x1: CUADRAS.x1 * CUADRA + BANQUINA, z0: CUADRAS.z0 * CUADRA - BANQUINA, z1: CUADRAS.z1 * CUADRA + BANQUINA };
const SOL = new THREE.Vector2(.62, -.34); // cuánto se corre la sombra por unidad de altura
export const aMundo = ([x, z]) => new THREE.Vector3(x * CUADRA, 0, z * CUADRA);
export const bloqueDe = p => `${Math.floor(p.x / CUADRA)},${Math.floor(p.z / CUADRA)}`;
// La isla tiene las puntas redondeadas: distancia al borde, negativa adentro
const ICX = (ISLA.x0 + ISLA.x1) / 2, ICZ = (ISLA.z0 + ISLA.z1) / 2, IMX = (ISLA.x1 - ISLA.x0) / 2, IMZ = (ISLA.z1 - ISLA.z0) / 2;
const alBorde = (x, z) => {
  const a = Math.abs(x - ICX) - IMX + RADIO, b = Math.abs(z - ICZ) - IMZ + RADIO;
  return Math.hypot(Math.max(a, 0), Math.max(b, 0)) + Math.min(Math.max(a, b), 0) - RADIO;
};
const AL_BORDE = `float alBorde(vec2 p){ vec2 q = abs(p - vec2(${ICX.toFixed(1)}, ${ICZ.toFixed(1)})) - vec2(${(IMX - RADIO).toFixed(1)}, ${(IMZ - RADIO).toFixed(1)}); return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - ${RADIO.toFixed(1)}; }`;
// El modo oscuro: un solo valor (0 claro, 1 noche) que leen todos los materiales de la ciudad
export const NOCHE = { value: 0 };
export const SOMBRA = { value: 1 }; // la sombra de la isla: en la apertura aparece cuando ya salió de la mochila
const OSCURO = `uniform float uNoche; vec3 deNoche(vec3 c){ return mix(c, c * vec3(.17, .19, .31) + vec3(.028, .032, .066), uNoche); }`;
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const CALLES_X = ['Córdoba', 'Viamonte', 'Tucumán', 'Lavalle', 'Corrientes', 'Sarmiento', 'Paraguay', 'Santa Fe', 'Marcelo T. de Alvear'];
const CALLES_Z = ['Av. Pueyrredón', 'Paso', 'Larrea', 'Azcuénaga', 'Ecuador', 'Anchorena', 'Charcas', 'Pasteur', 'Jean Jaurés'];

// Losas, edificios, detalles de techo y autos estacionados salen de una sola malla. tipo: 0 edificio, 1 vereda, 2 plaza, 3 auto
function lotes(reservadas, recorridos) {
  const r = rng(4711), lista = [], arboles = [];
  const lote = (x, y, z, w, d, h, tipo = 0) => lista.push({ x, y, z, w, d, h, tipo, tono: r() });
  const arbol = (x, z, s) => arboles.push({ x, z, s });
  const edificio = (x, z, w, d, h) => {
    lote(x, LOSA, z, w, d, h);
    if (r() < .45) lote(x + (r() - .5) * w * .4, LOSA + h, z + (r() - .5) * d * .4, 1 + r() * 1.3, 1 + r() * 1.3, .5 + r() * .6);
  };
  for (let i = CUADRAS.x0; i < CUADRAS.x1; i++) for (let j = CUADRAS.z0; j < CUADRAS.z1; j++) {
    const cx = (i + .5) * CUADRA, cz = (j + .5) * CUADRA;
    if ([[-1, -1], [-1, 1], [1, -1], [1, 1]].some(([a, b]) => alBorde(cx + a * LOTE / 2, cz + b * LOTE / 2) > -1.5)) continue; // las puntas redondeadas no llevan lote
    const reservado = reservadas.has(`${i},${j}`), plaza = !reservado && r() < .09;
    lote(cx, 0, cz, LOTE, LOTE, LOSA, plaza ? 2 : 1);
    // junto al cordón: nunca se cruzan con el recorrido, que va por el medio de la calle
    if (r() < .26) lote(cx + (r() - .5) * 6, 0, cz + CUADRA / 2 - 1.85, 2.15, 1, .72, 3);
    if (r() < .26) lote(cx + CUADRA / 2 - 1.85, 0, cz + (r() - .5) * 6, 1, 2.15, .72, 3);
    if (reservado) { arbol(cx - 3.3, cz - 3.3, .7); arbol(cx + 3.3, cz + 3.3, .6); continue; }
    if (plaza) { for (let k = 0; k < 11; k++) arbol(cx + (r() - .5) * 7.4, cz + (r() - .5) * 7.4, .75 + r() * .6); continue; }
    // lo que queda entre la cámara y un recorrido es bajo, para que siempre se vea la calle
    const tapa = recorridos.some(p => (cx > p.x && cx - p.x < CUADRA && Math.abs(cz - p.z) < LOTE) || (cz > p.z && cz - p.z < CUADRA && Math.abs(cx - p.x) < LOTE));
    const alto = () => (tapa ? 1.5 + r() * .8 : 2.4 + r() * 4.2 + r() ** 3 * 9 * Math.exp(-(cx * cx + cz * cz) / 16000));
    const m = LOTE - 1.2, f = r();
    if (f < .3) edificio(cx, cz, m, m, alto());
    else if (f < .6) { const w = m / 2 - .2; [-1, 1].forEach(s => edificio(cx + s * (w / 2 + .2), cz, w, m, alto())); }
    else { const w = m / 2 - .2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => edificio(cx + a * (w / 2 + .2), cz + b * (w / 2 + .2), w, w, alto())); }
  }
  return { lista, arboles };
}

function crearLotes({ lista }) {
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDetalle: { value: 1 }, uNoche: NOCHE },
    vertexShader: `attribute vec4 aInfo; varying vec3 vL; varying vec3 vN; varying vec3 vS; varying vec2 vT;
      void main(){ vL = position; vN = normal; vS = aInfo.yzw; vT = vec2(mod(aInfo.x, 4.), floor(aInfo.x / 4.) / 100.); gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uDetalle; ${OSCURO} varying vec3 vL; varying vec3 vN; varying vec3 vS; varying vec2 vT;
      void main(){
        float luces = 0.;
        vec3 c, blanco = vT.y < .72 ? vec3(.995, .99, .982) : vT.y < .87 ? vec3(.985, .962, .94) : vec3(.965, .955, .945);
        float luz = vN.z > .5 ? 1. : .9; // el sol viene de la izquierda: la cara +z es la clara
        if (vT.x > 2.5) {
          vec3 auto = vT.y < .5 ? vec3(.985, .985, .98) : vT.y < .8 ? vec3(.85, .85, .845) : vec3(.74, .735, .73); // sin rojo: el rojo es lo que se toca
          c = auto * (vN.y > .5 ? 1. : vN.z > .5 ? .93 : .8);
        } else if (vT.x > .5) {
          vec3 techo = vT.x > 1.5 ? vec3(.83, .935, .825) : vec3(.925, .92, .91);
          c = vN.y > .5 ? techo : vec3(.79, .785, .78) * luz;
        } else if (vN.y > .5) {
          vec2 e = (.5 - abs(vL.xz)) * vS.xy;
          c = mix(blanco * .96, blanco, step(min(e.x, e.y), .2) * uDetalle + 1. - uDetalle);
        } else {
          float u = vN.z > .5 ? vL.x * vS.x : vL.z * vS.y, y = vL.y * vS.z;
          vec2 f = fract(vec2(u / 1.15, (y - .55) / 1.3));
          float ventana = step(.24, f.x) * step(f.x, .76) * step(.2, f.y) * step(f.y, .7) * step(.55, y) * step(y, vS.z - .3);
          float detalle = max(uDetalle, uNoche * .85);
          c = mix(blanco * luz * .965, vec3(.82, .81, .8) * luz, ventana * .8 * detalle);
          vec2 celda = floor(vec2(u / 1.15, (y - .55) / 1.3));
          luces = ventana * detalle * step(.5, fract(sin(dot(celda + vS.xy * 3.1, vec2(12.9898, 78.233))) * 43758.5453)); // de noche, algunas están prendidas
          c *= mix(.9, 1., smoothstep(0., 1.6, y));
        }
        gl_FragColor = vec4(mix(deNoche(c), vec3(1., .79, .46), luces * uNoche * .92), 1.);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, lista.length), m = new THREE.Matrix4(), info = new Float32Array(lista.length * 4);
  lista.forEach((l, i) => {
    m.makeScale(l.w, l.h, l.d); m.setPosition(l.x, l.y, l.z); mesh.setMatrixAt(i, m);
    info.set([l.tipo + 4 * Math.floor(l.tono * 100), l.w, l.d, l.h], i * 4);
  });
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  mesh.frustumCulled = false;
  return mesh;
}

// Sombras: cada objeto se proyecta al piso en la dirección del sol. El stencil evita que se oscurezcan dos veces
const sombraMat = new THREE.ShaderMaterial({ // lo que cae fuera de la isla no se dibuja
  transparent: true, depthWrite: false, stencilWrite: true, stencilFunc: THREE.NotEqualStencilFunc, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
  uniforms: { uSol: { value: SOL }, uNoche: NOCHE },
  vertexShader: `uniform vec2 uSol; varying vec2 vP; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); w.xz += uSol * w.y; vP = w.xz; w.y = ${(LOSA + .02).toFixed(2)}; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uNoche; varying vec2 vP; ${AL_BORDE} void main(){ if (alBorde(vP) > 0.) discard; gl_FragColor = vec4(mix(vec3(.27, .25, .32), vec3(.02, .02, .05), uNoche), mix(.17, .42, uNoche)); }`,
});
function sombraDe(mesh) {
  const s = new THREE.InstancedMesh(mesh.geometry, sombraMat, mesh.count);
  s.instanceMatrix = mesh.instanceMatrix; s.frustumCulled = false;
  return s;
}

function crearArboles({ arboles }) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true, toneMapped: false }), arboles.length);
  const r = rng(77), m = new THREE.Matrix4(), c = new THREE.Color();
  arboles.forEach((a, i) => {
    m.makeScale(a.s, a.s * 1.25, a.s); m.setPosition(a.x, LOSA + a.s * 1.25, a.z); mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(r() < .5 ? '#bfe3bb' : '#a9d8a6'));
  });
  mesh.frustumCulled = false;
  return mesh;
}

function crearCalles() {
  const medio = (CUADRA / 2).toFixed(1), forma = new THREE.Shape(), a = IMX - RADIO, b = IMZ - RADIO;
  forma.absarc(a, b, RADIO, 0, Math.PI / 2); forma.absarc(-a, b, RADIO, Math.PI / 2, Math.PI);
  forma.absarc(-a, -b, RADIO, Math.PI, Math.PI * 1.5); forma.absarc(a, -b, RADIO, Math.PI * 1.5, Math.PI * 2);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: ESPESOR, bevelEnabled: false, curveSegments: 28 });
  geo.rotateX(-Math.PI / 2); geo.translate(ICX, -ESPESOR, ICZ);
  return new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uNoche: NOCHE },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vN = normal; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${OSCURO} varying vec3 vW; varying vec3 vN;
      float aLaCalle(float v){ return abs(mod(v, ${CUADRA.toFixed(1)} ) - 0.) < ${medio} ? mod(v, ${CUADRA.toFixed(1)}) : ${CUADRA.toFixed(1)} - mod(v, ${CUADRA.toFixed(1)}); }
      void main(){
        if (vN.y < .5) { // el canto de la isla
          float baja = 1. - clamp(-vW.y / ${ESPESOR.toFixed(1)}, 0., 1.) * .09;
          gl_FragColor = vec4(deNoche(vec3(.965, .955, .94) * (.9 + .1 * smoothstep(-.4, .6, vN.z - vN.x)) * baja), 1.);
          return;
        }
        float dx = aLaCalle(vW.x), dz = aLaCalle(vW.z), mitad = ${(CALLE / 2).toFixed(2)};
        vec3 c = vec3(.984, .98, .972);
        float raya = (1. - step(.07, dx)) * step(.5, fract(vW.z / 3.)) * step(mitad, dz) + (1. - step(.07, dz)) * step(.5, fract(vW.x / 3.)) * step(mitad, dx);
        c = mix(c, vec3(.9, .895, .885), raya);
        gl_FragColor = vec4(deNoche(c), 1.);
      }`,
  }));
}

// La sombra de la isla en el aire: un rectángulo difuso, más abajo
function crearSombraIsla() {
  const geo = new THREE.PlaneGeometry(IMX * 2 + 160, IMZ * 2 + 160); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uNoche: NOCHE, uSombra: SOMBRA },
    vertexShader: `varying vec2 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uNoche; uniform float uSombra; varying vec2 vP; ${AL_BORDE} void main(){ float d = alBorde(vP); gl_FragColor = vec4(mix(vec3(.3, .25, .3), vec3(.01, .01, .03), uNoche), mix(.2, .6, uNoche) * uSombra * (1. - smoothstep(-16., 46., d))); }`,
  }));
  mesh.position.set(ICX, -ESPESOR - 24, ICZ);
  return mesh;
}

function crearNombres() {
  const group = new THREE.Group();
  const mat = nombre => {
    const c = document.createElement('canvas'), g = c.getContext('2d'), font = '600 44px Inter, sans-serif';
    g.font = font; c.width = g.measureText(nombre).width + 12; c.height = 60;
    g.font = font; g.fillStyle = '#9a9894'; g.textBaseline = 'middle'; g.fillText(nombre, 6, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return { m: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }), a: c.width / c.height };
  };
  const poner = ({ m, a }, x, z, yaw) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5 * a, 1.5), m);
    p.rotation.order = 'YXZ'; p.rotation.set(-Math.PI / 2, yaw, 0); p.position.set(x, .04, z); group.add(p);
  };
  for (let i = -8; i <= 8; i++) {
    const a = mat(CALLES_X[(i + 9) % CALLES_X.length]), b = mat(CALLES_Z[(i + 9) % CALLES_Z.length]);
    [-5.5, -.5, 3.5].forEach(k => {
      const n = (k + (i % 2) * .9) * CUADRA, adentro = (x, z) => x > ISLA.x0 + 12 && x < ISLA.x1 - 12 && z > ISLA.z0 + 12 && z < ISLA.z1 - 12 && alBorde(x, z) < -14;
      if (adentro(n, i * CUADRA)) poner(a, n, i * CUADRA + 1.25, 0);
      if (adentro(i * CUADRA, n)) poner(b, i * CUADRA + 1.25, n, Math.PI / 2);
    });
  }
  return group;
}

// El recorrido de la moto por las calles: una línea pálida, y en rojo el tramo del viaje que está haciendo
export function crearRuta(puntos) {
  const path = new THREE.CurvePath(), v = puntos.map(aMundo), R = 3.4;
  let from = v[0];
  for (let i = 1; i < v.length; i++) {
    const to = v[i], next = v[i + 1];
    if (!next) { path.add(new THREE.LineCurve3(from, to)); break; }
    const a = to.clone().add(from.clone().sub(to).setLength(R)), b = to.clone().add(next.clone().sub(to).setLength(R));
    path.add(new THREE.LineCurve3(from, a));
    path.add(new THREE.QuadraticBezierCurve3(a, to, b));
    from = b;
  }
  const N = 1800, pts = path.getSpacedPoints(N);
  const ruta = {
    pts, N,
    at(u, out = new THREE.Vector3()) { const f = Math.min(.9999, Math.max(0, u)) * N, i = Math.floor(f); return out.copy(pts[i]).lerp(pts[i + 1], f - i); },
    tangent(u, out = new THREE.Vector3()) { const a = ruta.at(u - .006), b = ruta.at(u + .006); return out.copy(b).sub(a).normalize(); },
    uDe(p) { let best = 0, d = 1e9; pts.forEach((q, i) => { const e = q.distanceToSquared(p); if (e < d) { d = e; best = i; } }); return best / N; },
  };
  const curva = new THREE.CatmullRomCurve3(pts.filter((_, i) => i % 3 === 0 || i === N), false, 'catmullrom', .1);
  ruta.mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uDesde: { value: 0 }, uHasta: { value: 0 }, uVisible: { value: 0 }, uNoche: NOCHE, uMoto: { value: 0 }, uTiempo: { value: 0 }, uPulso: { value: 1 } },
    // la pulsación: ondas que nacen en la moto y corren por el trazo, engordándolo y encendiéndolo a su paso
    vertexShader: `uniform float uMoto; uniform float uTiempo; uniform float uPulso; varying float vU; varying float vOnda;
      void main(){
        vU = uv.x;
        float d = abs(uv.x - uMoto);
        vOnda = uPulso * pow(.5 + .5 * cos(6.2832 * (d * 13. - uTiempo * .9)), 8.) * (.5 + .5 * exp(-d * 3.5));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * .5 * vOnda, 1.);
      }`,
    fragmentShader: `uniform float uDesde; uniform float uHasta; uniform float uVisible; uniform float uNoche; varying float vU; varying float vOnda;
      void main(){
        float viaje = step(min(uDesde, uHasta), vU) * step(vU, max(uDesde, uHasta));
        vec3 base = mix(mix(vec3(1., .78, .85), vec3(.56, .13, .32), uNoche), vec3(.98, 0., .314), viaje);
        gl_FragColor = vec4(mix(base, mix(vec3(.98, 0., .314), vec3(1., .68, .8), viaje), vOnda), uVisible);
      }`,
  });
  ruta.mesh = new THREE.Mesh(new THREE.TubeGeometry(curva, 900, .36, 6, false), ruta.mat);
  ruta.mesh.position.y = .1; ruta.mesh.scale.y = .2; ruta.mesh.renderOrder = 3; ruta.mesh.frustumCulled = false;
  return ruta;
}

// Una casita con techo rojo, y si hay foto, el cartel del creador mirando a la cámara. La casa y el cartel van uno al
// lado del otro, sin tocarse. El cartel se levanta cuando la cámara se acerca (en el mapa, la cara la muestra el pin)
export function crearCasa(centro, tex, rostro) {
  const g = new THREE.Group(), mat = c => new THREE.MeshLambertMaterial({ color: c, toneMapped: false });
  const conFoto = !!tex, cx = conFoto ? 2.7 : 0, cz = conFoto ? -2.7 : 0, s = conFoto ? 3.2 : 5.4;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(s, s * .9, s), mat('#ffffff')); cuerpo.position.set(cx, LOSA + s * .45, cz);
  const techo = new THREE.Mesh(new THREE.ConeGeometry(s * .86, s * .62, 4), mat('#FA0050')); techo.rotation.y = Math.PI / 4; techo.position.set(cx, LOSA + s * .9 + s * .31, cz);
  const puerta = new THREE.Mesh(new THREE.BoxGeometry(s * .26, s * .46, .06), mat('#FA0050')); puerta.position.set(cx, LOSA + s * .23, cz + s / 2 + .03);
  g.add(cuerpo, techo, puerta);
  let cartel = null;
  if (conFoto) {
    // Cartel redondo. La vista isométrica achata lo vertical (cos 35,26° = .816): se estira para que en pantalla sea un círculo
    const R = 4.2, ESTIRO = 1 / .816, alto = (R + .6) * 2 * ESTIRO;
    cartel = new THREE.Group();
    const disco = new THREE.Group(); disco.scale.y = ESTIRO; disco.position.y = alto / 2 + .4;
    const basic = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(R + .6, R + .6, .3, 72), basic('#FA0050')); aro.rotation.x = Math.PI / 2;
    const marco = new THREE.Mesh(new THREE.CylinderGeometry(R + .25, R + .25, .3, 72), basic('#ffffff')); marco.rotation.x = Math.PI / 2; marco.position.z = .04;
    // el recorte cuadrado de la cara, sin deformar
    const [rx, ry, ra, rb] = rostro; tex.repeat.set(ra, rb); tex.offset.set(rx, 1 - ry - rb);
    const foto = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); foto.position.z = .25;
    disco.add(aro, marco, foto);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R * .42, R * .5, .4, 48), basic('#FA0050')); base.position.y = .2;
    cartel.add(disco, base);
    cartel.position.set(-2.6, LOSA, 2.6); cartel.rotation.y = Math.PI / 4;
    g.add(cartel);
  }
  g.position.copy(centro);
  return { group: g, cartel, techo: V3(centro.x + cx, LOSA + s * 1.56, centro.z + cz) };
}

export function crearCiudad(reservadas, recorridos) {
  const group = new THREE.Group(), datos = lotes(reservadas, recorridos), edificios = crearLotes(datos), arboles = crearArboles(datos);
  group.add(crearSombraIsla(), crearCalles(), crearNombres(), edificios, arboles, sombraDe(edificios), sombraDe(arboles));
  return { group, edificios };
}
