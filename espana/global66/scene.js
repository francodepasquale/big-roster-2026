// Escena 3D · Global66 × BIG
// Dos objetos procedurales, sin modelos ni texturas externas:
//  · la moneda de Global66: borde ondulado, azul metálico, con la onda del logo en relieve en las dos caras.
//    Recorre todo el deck posándose en los huecos [data-obj="coin"] del HTML.
//  · el globo: puntos de tierra reales (land.js) y líneas que salen de Santiago de Chile hacia los países
//    donde están las audiencias de los creadores. Vive en el hueco [data-obj="globe"].
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { LAND } from './land.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // interpolación exponencial, independiente de los fps
const lerp = THREE.MathUtils.lerp;
const DEG = Math.PI / 180;

// Santiago de Chile y los destinos (países de las audiencias, según los paneles de los creadores)
const ORIGIN = [-33.45, -70.67];
export const DESTINOS = [
  ['Argentina', -34.6, -58.4], ['España', 40.4, -3.7], ['México', 19.4, -99.1], ['Estados Unidos', 25.8, -80.2],
  ['Colombia', 4.7, -74.1], ['Rumania', 44.4, 26.1], ['Venezuela', 10.5, -66.9], ['Italia', 41.9, 12.5],
  ['Uruguay', -34.9, -56.2], ['Brasil', -23.5, -46.6],
];
export const ARC_STAGGER = .07, ARC_LEN = .3;     // app.js usa lo mismo para encender cada país

function ll(lat, lon, r = 1) {
  const phi = (90 - lat) * DEG, th = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

// La onda del logo: tres semicírculos (arriba, abajo, arriba)
class Onda extends THREE.Curve {
  constructor(r = .2) { super(); this.r = r; }
  getPoint(t, out = new THREE.Vector3()) {
    const r = this.r, k = Math.min(2.9999, t * 3), i = Math.floor(k), f = k - i;
    const cx = (i - 1) * 2 * r;
    const a = i === 1 ? Math.PI + f * Math.PI : Math.PI - f * Math.PI;
    return out.set(cx + r * Math.cos(a), r * Math.sin(a), 0);
  }
}

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = 1;

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  camera.position.set(0, 0, 14);
  const key = new THREE.DirectionalLight('#FFFFFF', 2.2); key.position.set(-4, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#9FB4FF', 2); rim.position.set(5, 1, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#EAF0FF', '#0A1033', .5));

  const state = { coverSpin: 0, globeP: 0, arcs: 0, vel: 0, px: 0, py: 0 };
  const sm = { px: 0, py: 0 };
  addEventListener('pointermove', e => { state.px = e.clientX / innerWidth - .5; state.py = e.clientY / innerHeight - .5; }, { passive: true });

  let hW = 1, hH = 1;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    hH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    hW = hH * camera.aspect;
  }
  addEventListener('resize', resize); resize();

  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // ── La moneda
  const coin = new THREE.Group();
  const spinner = new THREE.Group(); coin.add(spinner);
  const metal = new THREE.MeshPhysicalMaterial({ color: '#3463F2', metalness: .82, roughness: .26, clearcoat: .7, clearcoatRoughness: .2 });
  const metalHi = new THREE.MeshPhysicalMaterial({ color: '#7E9BFF', metalness: .78, roughness: .2, clearcoat: 1, clearcoatRoughness: .1 });
  const LOBES = 16;
  const scallop = (R, amp, n = 320) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, r = R * (1 + amp * Math.cos(LOBES * a));
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  };
  const T = .16;                                                   // grosor del cuerpo
  const bodyGeo = new THREE.ExtrudeGeometry(scallop(.95, .035), { depth: T, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 5, curveSegments: 12 });
  bodyGeo.translate(0, 0, -T / 2); bodyGeo.computeVertexNormals();
  spinner.add(new THREE.Mesh(bodyGeo, metal));
  const ringShape = scallop(.9, .035); const hole = new THREE.Path(); hole.absarc(0, 0, .76, 0, Math.PI * 2, true); ringShape.holes.push(hole);
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: .03, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 4, curveSegments: 48 });
  const ondaGeo = new THREE.TubeGeometry(new Onda(.2), 180, .05, 14, false);
  const capGeo = new THREE.SphereGeometry(.05, 16, 12);
  for (const side of [1, -1]) {
    const face = new THREE.Group();
    const ring = new THREE.Mesh(ringGeo, metal); ring.position.z = T / 2 + .03; face.add(ring);
    const onda = new THREE.Mesh(ondaGeo, metalHi); onda.scale.z = .6; onda.position.z = T / 2 + .06; face.add(onda);
    for (const x of [-.6, .6]) { const c = new THREE.Mesh(capGeo, metalHi); c.scale.z = .6; c.position.set(x, 0, T / 2 + .06); face.add(c); }
    face.position.y = -.05;
    if (side < 0) face.rotation.y = Math.PI;
    spinner.add(face);
  }
  // Destellos que acompañan a la moneda cuando viaja
  const SP = reduced ? 0 : mobile ? 40 : 70;
  const spPos = new Float32Array(Math.max(SP, 1) * 3);
  const sparks = Array.from({ length: SP }, () => ({ a: Math.random() * 6.28, r: 1.15 + Math.random() * .5, v: .2 + Math.random() * .5, y: (Math.random() - .5) * 1.6, w: Math.random() * 6 }));
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({ size: .06, map: dotTex, color: '#BFD0FF', transparent: true, opacity: .0, depthWrite: false, blending: THREE.AdditiveBlending });
  coin.add(new THREE.Points(spGeo, spMat));
  scene.add(coin);

  // ── El globo
  const globe = new THREE.Group();
  const tilt = new THREE.Group(); globe.add(tilt);
  const earth = new THREE.Group(); tilt.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ color: '#0A1A5E', roughness: .8, metalness: .1, envMapIntensity: .35 })));
  const landPos = new Float32Array(LAND.length / 2 * 3);
  for (let i = 0; i < LAND.length; i += 2) ll(LAND[i], LAND[i + 1], 1.006).toArray(landPos, i / 2 * 3);
  const landGeo = new THREE.BufferGeometry(); landGeo.setAttribute('position', new THREE.BufferAttribute(landPos, 3));
  // El tamaño de los puntos se ajusta a la escala del globo en cada fotograma (los Points no heredan la escala)
  const landMat = new THREE.PointsMaterial({ size: .04, map: dotTex, color: '#B9CBFF', transparent: true, depthWrite: false, alphaTest: .2 });
  earth.add(new THREE.Points(landGeo, landMat));
  // Halo de atmósfera
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.16, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color('#4D7BFF') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(c, f * .9); }',
  }));
  globe.add(halo);
  // Origen: Santiago
  const o = ll(...ORIGIN, 1.01);
  const pinMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const pin = new THREE.Mesh(new THREE.SphereGeometry(.028, 16, 12), pinMat); pin.position.copy(o); earth.add(pin);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const mkRing = (p, mat) => { const r = new THREE.Mesh(new THREE.RingGeometry(.04, .055, 40), mat); r.position.copy(p); r.lookAt(p.clone().multiplyScalar(2)); earth.add(r); return r; };
  const oRing = mkRing(o, ringMat);
  // Arcos
  const arcMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const SEG = 90, RAD = 8;
  const arcs = DESTINOS.map(([, lat, lon], i) => {
    const b = ll(lat, lon, 1.01), a = o.clone();
    const d = a.distanceTo(b);
    const mid = a.clone().add(b).normalize().multiplyScalar(1 + d * .42);
    const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), SEG, .0075, RAD, false);
    const mesh = new THREE.Mesh(geo, arcMat); earth.add(mesh); geo.setDrawRange(0, 0);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 10), pinMat); dot.position.copy(b); dot.scale.setScalar(0); earth.add(dot);
    const rm = ringMat.clone(); const ring = mkRing(b, rm);
    return { geo, dot, ring, rm, i };
  });
  scene.add(globe);

  // ── Seguimiento de huecos: cada objeto se posa en el hueco suyo más visible
  function makeFollower(obj, sel, H_WORLD, ASPECT) {
    return { obj, slots: [...document.querySelectorAll(sel)], H_WORLD, ASPECT, anchor: null, since: 9, placed: false, scale: 1, shown: 0, lastX: 0, lastY: 0, speed: 0 };
  }
  const F = [makeFollower(coin, '[data-obj="coin"]', 2.25, 1), makeFollower(globe, '[data-obj="globe"]', 2.4, 1)];
  function place(f, r) {
    const hPx = Math.min(r.height, r.width / f.ASPECT);
    return { x: ((r.left + r.width / 2) / innerWidth * 2 - 1) * hW, y: -((r.top + r.height / 2) / innerHeight * 2 - 1) * hH, s: (hPx / innerHeight * 2 * hH) / f.H_WORLD };
  }
  function follow(f, dt) {
    let best = null, bestF = 0, bestR = null;
    for (const el of f.slots) {
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      const fr = vis / Math.min(r.height, innerHeight);
      if (fr > bestF) { bestF = fr; best = el; bestR = r; }
    }
    if (bestF < .3) best = null;
    if (best !== f.anchor) { f.anchor = best; f.since = 0; }
    f.since += dt;
    const k = lerp(4, 18, smooth(0, 1.2, f.since));
    if (best) {
      const p = place(f, bestR);
      if (!f.placed || f.shown < .02) { f.obj.position.set(p.x, p.y, 0); f.scale = p.s; f.placed = true; }
      f.obj.position.x = damp(f.obj.position.x, p.x, k, dt);
      f.obj.position.y = damp(f.obj.position.y, p.y, k, dt);
      f.scale = damp(f.scale, p.s, k, dt);
    }
    f.shown = damp(f.shown, best ? 1 : 0, best ? 5 : 8, dt);
    f.obj.scale.setScalar(f.scale * (.6 + .4 * smooth(0, 1, f.shown)) * Math.min(1, f.shown * 1.4));
    f.obj.visible = f.shown > .01;
    const vx = (f.obj.position.x - f.lastX) / Math.max(dt, .001), vy = (f.obj.position.y - f.lastY) / Math.max(dt, .001);
    f.lastX = f.obj.position.x; f.lastY = f.obj.position.y;
    f.speed = damp(f.speed, Math.hypot(vx, vy), 6, dt);
    return { vx, best };
  }

  const clock = new THREE.Clock();
  let running = true, raf = 0, spinA = 0;

  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);

    // Moneda: gira sola despacio; el scroll la acelera; en la portada da vueltas con el gesto
    const fc = F[0]; const { vx, best } = follow(fc, dt);
    const scrollBoost = Math.min(Math.abs(state.vel) * .08, 6);
    if (!reduced) spinA += dt * (.55 + scrollBoost);
    const cover = best?.dataset.spin === 'cover';
    spinner.rotation.y = (reduced ? -.45 : spinA) + (cover ? state.coverSpin * Math.PI * 4 : 0) + sm.px * .5;
    spinner.rotation.x = .12 + sm.py * .25 + (reduced ? 0 : Math.sin(t * .7) * .06);
    coin.rotation.z = damp(coin.rotation.z, THREE.MathUtils.clamp(-vx * .025, -.35, .35), 6, dt);
    coin.position.y += reduced ? 0 : Math.sin(t * 1.1) * .0015;
    spMat.opacity = damp(spMat.opacity, smooth(.6, 4, fc.speed) * .9, 4, dt);
    if (SP) {
      sparks.forEach((s, i) => {
        const a = s.a + t * s.v;
        spPos[i * 3] = Math.cos(a) * s.r; spPos[i * 3 + 1] = s.y + Math.sin(t * 1.3 + s.w) * .1; spPos[i * 3 + 2] = Math.sin(a) * s.r * .6;
      });
      spGeo.attributes.position.needsUpdate = true;
    }

    // Globo: empieza mirando a Chile y gira hacia Europa a medida que salen las líneas
    follow(F[1], dt);
    landMat.size = globe.scale.x * .085;
    const gp = reduced ? .6 : state.globeP;
    const lon = lerp(-72, -38, smooth(0, 1, gp)) + (reduced ? 0 : Math.sin(t * .2) * 2);
    const lat = lerp(-24, 12, smooth(0, 1, gp));
    earth.rotation.y = -(90 + lon) * DEG + sm.px * .15;
    tilt.rotation.x = lat * DEG + sm.py * .08;
    const A = reduced ? 1 : state.arcs;
    arcs.forEach(a => {
      const p = clamp01((A - a.i * ARC_STAGGER) / ARC_LEN);
      a.geo.setDrawRange(0, Math.floor(p * SEG) * RAD * 6);
      const landed = smooth(.92, 1, p);
      a.dot.scale.setScalar(landed);
      const pulse = (t * .8 + a.i * .13) % 1;
      a.ring.scale.setScalar(landed * (1 + pulse * 2.2)); a.rm.opacity = landed * (1 - pulse);
    });
    const op = (t * .8) % 1; oRing.scale.setScalar(1 + op * 2.6); ringMat.opacity = 1 - op;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  });

  renderer.compile(scene, camera);
  const ready = new Promise(res => requestAnimationFrame(() => { renderer.render(scene, camera); res(); }));
  raf = requestAnimationFrame(frame);

  return {
    ready,
    set(values) { Object.assign(state, values); },
    snapshot() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
  };
}
