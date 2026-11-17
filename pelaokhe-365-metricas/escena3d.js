// El 365 en 3D: la gota del logo extruida, roja y laqueada, con el «365» en relieve blanco adelante y atrás.
// Sale del logo vectorizado (logo365.js). Flota sobre el deck y en cada escena va a su ancla: un elemento del HTML con
// [data-ancla-365] que marca dónde va y de qué alto. Mover el ancla en el CSS mueve el 365; no hay posiciones a mano acá.
// Proyecta una sombra suave sobre una pared invisible, como una calcomanía que flota sobre la página.
import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { SILUETA, NUMEROS } from './logo365.js';

const ALTO_SVG = 4376;          // el alto del logo en unidades del SVG: el 365 mide 1 de alto en la escena
const ESPESOR = .15, BISEL = .028;
const RELIEVE = .035, BISEL_NUM = .007;
const FOV = 30, DIST = 10;

function extruir(svg, profundidad, bisel) {
  const k = 1 / ALTO_SVG;
  const formas = new SVGLoader().parse(svg).paths.flatMap(p => SVGLoader.createShapes(p));
  const g = new THREE.ExtrudeGeometry(formas, {
    depth: profundidad / k, bevelEnabled: true, bevelThickness: bisel / k, bevelSize: bisel * .85 / k,
    bevelSegments: 6, curveSegments: 36,
  });
  // a unidades de escena (1 = alto del logo). El SVG tiene la y hacia abajo: se invierte y, y también z para no dar
  // vuelta las caras (el frente queda en +z)
  g.applyMatrix4(new THREE.Matrix4().makeScale(k, -k, -k));
  return g;
}

export function crearEscena(canvas, { movil = false, reducido = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  camara.position.set(0, 0, DIST);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  escena.environmentIntensity = .85;

  // luz principal arriba a la izquierda: hace la sombra
  const luz = new THREE.DirectionalLight(0xffffff, 2.1);
  luz.castShadow = true;
  luz.shadow.mapSize.set(movil ? 512 : 1024, movil ? 512 : 1024);
  luz.shadow.radius = 14; luz.shadow.blurSamples = 20; luz.shadow.bias = -.0004;
  escena.add(luz, luz.target);
  escena.add(new THREE.HemisphereLight(0xffffff, 0xe6e0e0, .7));

  // la pared que recibe la sombra (no se ve: solo la sombra)
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x3a0a10, opacity: .2 }));
  pared.position.z = -.55; pared.receiveShadow = true;
  escena.add(pared);

  /* ── la pieza ── */
  const gota = extruir(SILUETA, ESPESOR, BISEL);
  gota.computeBoundingBox();
  const centro = gota.boundingBox.getCenter(new THREE.Vector3());
  gota.translate(-centro.x, -centro.y, -centro.z);
  gota.computeBoundingBox();
  const caja = gota.boundingBox, frente = caja.max.z;
  // degradé del logo: claro arriba a la derecha, oscuro abajo a la izquierda
  {
    const pos = gota.attributes.position, col = new Float32Array(pos.count * 3);
    const claro = new THREE.Color('#E8101C'), oscuro = new THREE.Color('#8E0F09'), c = new THREE.Color();
    const w = caja.max.x - caja.min.x, h = caja.max.y - caja.min.y;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - caja.min.x) / w, v = (pos.getY(i) - caja.min.y) / h;
      const t = THREE.MathUtils.smoothstep(u * .55 + v * .45, .05, .95);
      c.copy(oscuro).lerp(claro, t); col.set([c.r, c.g, c.b], i * 3);
    }
    gota.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const laca = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .34, metalness: 0, clearcoat: 1, clearcoatRoughness: .07, sheen: .15, sheenColor: new THREE.Color('#ff6070') });
  const blanco = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, clearcoat: .8, clearcoatRoughness: .12, emissive: 0xffffff, emissiveIntensity: .06 });

  const numeros = extruir(NUMEROS, RELIEVE, BISEL_NUM);
  numeros.translate(-centro.x, -centro.y, 0);
  numeros.computeBoundingBox();
  numeros.translate(0, 0, frente - numeros.boundingBox.min.z - .006);

  const pieza = new THREE.Group();
  const cuerpo = new THREE.Mesh(gota, laca);
  const adelante = new THREE.Mesh(numeros, blanco);
  const atras = adelante.clone(); atras.rotation.y = Math.PI; // de atrás también se lee bien, no espejado
  for (const m of [cuerpo, adelante, atras]) { m.castShadow = true; pieza.add(m); }
  const giroGrupo = new THREE.Group(); giroGrupo.add(pieza);
  escena.add(giroGrupo);

  /* ── a dónde va ── */
  let ancla = null, oculto = true, vh = 1, vw = 1;
  const actual = { x: 0, y: -4, s: .6, rx: 0, ry: 0, rz: 0 };
  const objetivo = { x: 0, y: -4, s: .6, rx: 0, ry: 0, rz: 0 };
  let giroExtra = 0, giroHecho = 0, mano = [0, 0], manoSuave = [0, 0];

  function medirVista() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h; camara.updateProjectionMatrix();
    vh = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); vw = vh * camara.aspect;
  }
  function leerAncla() {
    if (oculto || !ancla) { objetivo.y = vh / 2 + objetivo.s * 1.7; objetivo.x = vw * .32; return; } // bien afuera, con sombra y todo
    const r = ancla.getBoundingClientRect(), W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight;
    if (!r.height) return;
    objetivo.x = ((r.left + r.width / 2) / W * 2 - 1) * vw / 2;
    objetivo.y = -((r.top + r.height / 2) / H * 2 - 1) * vh / 2;
    objetivo.s = r.height / H * vh;
  }

  /* ── cada cuadro ── */
  let antes = performance.now(), corriendo = true, t = 0;
  const suave = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));
  function cuadro(ahora) {
    if (!corriendo) return;
    requestAnimationFrame(cuadro);
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora; t += dt;
    leerAncla();
    const tau = reducido ? .12 : .42;
    for (const k of ['x', 'y', 's', 'rx', 'rz']) actual[k] = suave(actual[k], objetivo[k], dt, k === 's' ? tau * 1.2 : tau);
    actual.ry = suave(actual.ry, objetivo.ry, dt, tau);
    giroHecho = suave(giroHecho, giroExtra, dt, reducido ? .05 : .55);
    manoSuave[0] = suave(manoSuave[0], mano[0], dt, .25); manoSuave[1] = suave(manoSuave[1], mano[1], dt, .25);

    const flota = reducido ? 0 : Math.sin(t * 1.1) * .018 * actual.s;
    giroGrupo.position.set(actual.x, actual.y + flota, 0);
    giroGrupo.scale.setScalar(Math.max(.001, actual.s));
    const balanceo = reducido ? 0 : Math.sin(t * .7) * .16;
    giroGrupo.rotation.set(
      actual.rx - manoSuave[1] * .22,
      actual.ry + balanceo + manoSuave[0] * .3 + giroHecho * Math.PI * 2,
      actual.rz + (reducido ? 0 : Math.sin(t * .9 + 1) * .03));

    // la luz sigue a la pieza, así la sombra queda siempre cerca y nítida
    const s = actual.s;
    luz.position.set(actual.x - 1.6 * s, actual.y + 2.4 * s, 4.2 * s);
    luz.target.position.set(actual.x, actual.y, -.55);
    const sc = luz.shadow.camera; sc.left = -1.6 * s; sc.right = 1.6 * s; sc.top = 1.6 * s; sc.bottom = -1.6 * s; sc.near = .1; sc.far = 12 * s + 4;
    sc.updateProjectionMatrix();

    renderer.render(escena, camara);
  }
  medirVista();
  requestAnimationFrame(cuadro);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) corriendo = false;
    else if (!corriendo) { corriendo = true; antes = performance.now(); requestAnimationFrame(cuadro); }
  });

  return {
    /** Va al ancla (un elemento con tamaño) o se esconde arriba. inclinacion: [rx, ry, rz] en radianes */
    ir(el, { inclinacion = [0, 0, 0] } = {}) {
      oculto = !el; ancla = el;
      [objetivo.rx, objetivo.ry, objetivo.rz] = inclinacion;
      if (oculto) objetivo.rz = -.5;
    },
    /** Da n vueltas completas (se suman si llega otra en el medio) */
    girar(n = 1) { if (!reducido) giroExtra += n; },
    /** Saltea la animación: aparece directo en su ancla */
    plantar() { leerAncla(); Object.assign(actual, objetivo); },
    mano(x, y) { mano = [x, y]; },
    resize: medirVista,
  };
}
