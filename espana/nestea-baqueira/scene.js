// Escena 3D · Nestea × BIG
// La lata de Nestea en 3D, construida sobre las dos fotos originales del equipo, sin redibujar el envase:
// un cilindro por revolución con la silueta exacta de la foto (hombro, cuerpo y base) y las fotos proyectadas
// —la de frente en la mitad delantera y la de atrás en la trasera—, con tapa metálica. De frente se ve la foto.
// Viaja por los huecos [data-slot] del HTML. En portada y cierre caen hojas de té.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

// Medidas de las fotos (px). Frente 1254 × 1254, atrás 1199 × 1312
const FR = { W: 1254, H: 1254, cx: 626.5, r: 313.5, top: 51, bot: 1202 };
const BK = { W: 1199, H: 1312, cx: 586.5, r: 340.5, top: 35, bot: 1268 };
// Silueta (media anchura en px de la foto de frente, de arriba abajo), medida en la foto
const PROF = [[51, 12], [70, 230], [91, 271], [131, 277], [171, 296], [211, 312], [251, 313.5], [1091, 313.5], [1131, 304], [1171, 253], [1195, 200], [1202, 160]];
const PX = 1 / 600;

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .8;
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100); camera.position.set(0, 0, 14);
  const key = new THREE.DirectionalLight('#FFFFFF', 2); key.position.set(-4, 6, 8); scene.add(key);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#1A3A6A', .6));

  let hW = 1, hH = 1;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    hH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; hW = hH * camera.aspect;
  }
  addEventListener('resize', resize); resize();

  // ── La lata
  const can = new THREE.Group();
  const body = new THREE.Group(); can.add(body);
  const halfAt = py => { for (let i = 1; i < PROF.length; i++) if (py <= PROF[i][0]) { const [y0, r0] = PROF[i - 1], [y1, r1] = PROF[i]; return r0 + (r1 - r0) * (py - y0) / (y1 - y0); } return PROF[PROF.length - 1][1]; };
  const MID = (FR.top + FR.bot) / 2;
  const yW = py => (MID - py) * PX;
  const NU = 128, NV = 90;
  // Una mitad (frente u = -90°..90°, espalda 90°..270°) con la foto proyectada en ortogonal
  function half(back) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const a = (-.5 + i / NU) * Math.PI;                    // -90°..90° respecto del centro de esa cara
      for (let j = 0; j <= NV; j++) {
        const py = FR.top + (FR.bot - FR.top) * j / NV, r = halfAt(py);
        const s = Math.sin(a), c = Math.cos(a);
        const x = (back ? -1 : 1) * s * r * PX, z = (back ? -1 : 1) * c * r * PX;
        pos.push(x, yW(py), z);
        if (!back) uv.push((FR.cx + s * r) / FR.W, 1 - py / FR.H);
        else { const k = BK.r / FR.r, pyb = BK.top + (py - FR.top) * (BK.bot - BK.top) / (FR.bot - FR.top); uv.push((BK.cx + s * r * k) / BK.W, 1 - pyb / BK.H); }
      }
    }
    const R = NV + 1;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a1 = i * R + j, b1 = a1 + R, c1 = a1 + 1, d1 = b1 + 1; idx.push(a1, c1, b1, b1, c1, d1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const mFront = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .15, envMapIntensity: .5 });
  const mBack = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .15, envMapIntensity: .5 });
  body.add(new THREE.Mesh(half(false), mFront), new THREE.Mesh(half(true), mBack));
  // Tapa: aluminio, con el aro y la anilla
  const alu = new THREE.MeshStandardMaterial({ color: '#C9CED6', roughness: .28, metalness: .9 });
  const lidR = 230 * PX, lidY = yW(70);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(lidR, 64), alu); lid.rotation.x = -Math.PI / 2; lid.position.y = lidY - .012; body.add(lid);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(lidR, .018, 12, 64), alu); ring.rotation.x = Math.PI / 2; ring.position.y = lidY; body.add(ring);
  const tab = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .16, 6, 12), alu); tab.rotation.set(Math.PI / 2, 0, Math.PI / 2); tab.scale.z = .3; tab.position.set(0, lidY - .005, .1); body.add(tab);
  const base = new THREE.Mesh(new THREE.CircleGeometry(160 * PX, 48), alu); base.rotation.x = Math.PI / 2; base.position.y = yW(FR.bot); body.add(base);
  const tex = src => new THREE.TextureLoader().loadAsync(src).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
  const canReady = Promise.all([tex('assets/img/lata-frente.png'), tex('assets/img/lata-atras.png')]).then(([a, b]) => { mFront.map = a; mBack.map = b; mFront.needsUpdate = mBack.needsUpdate = true; });
  scene.add(can);

  // ── Hojas de té que caen (verdes del logo), pocas y lentas
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -.5); leafShape.quadraticCurveTo(.32, 0, 0, .5); leafShape.quadraticCurveTo(-.32, 0, 0, -.5);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 10);
  const leafMat = new THREE.MeshStandardMaterial({ roughness: .5, side: THREE.DoubleSide });
  const LEAF = ['#3E9B2F', '#5DB33A', '#8CC63F', '#2E7D32'].map(c => new THREE.Color(c));
  const MAXL = mobile ? 30 : 60;
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, MAXL);
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const L = Array.from({ length: MAXL }, (_, i) => { leaves.setColorAt(i, LEAF[i % LEAF.length]); return { on: false }; });
  scene.add(leaves);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAXL; i++) leaves.setMatrixAt(i, hide);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  function spawnLeaf() {
    const p = L.find(l => !l.on); if (!p) return;
    Object.assign(p, { on: true, x: (Math.random() * 2 - 1) * hW, y: hH + .8, z: -2 + Math.random() * 4, vy: -(.5 + Math.random() * .5), sw: Math.random() * 6, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, s: .22 + Math.random() * .16 });
  }

  // ── Seguimiento de huecos
  const slots = [...document.querySelectorAll('[data-slot]')];
  const F = { anchor: null, since: 9, placed: false, scale: 1, shown: 0, lastX: 0, yaw: 0, roll: 0 };
  const state = { rain: 0, lift: 0, spin: 0, vel: 0, px: 0, py: 0 };
  const sm = { px: 0, py: 0 };
  addEventListener('pointermove', ev => { state.px = ev.clientX / innerWidth - .5; state.py = ev.clientY / innerHeight - .5; }, { passive: true });
  const CAN_H = (FR.bot - FR.top) * PX * 1.04;
  function follow(dt) {
    let best = null, bestF = 0, bestR = null;
    for (const el of slots) {
      const r = el.getBoundingClientRect(); if (!r.height) continue;
      const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      const fr = vis / Math.min(r.height, innerHeight);
      if (fr > bestF) { bestF = fr; best = el; bestR = r; }
    }
    if (bestF < (mobile ? .6 : .35)) best = null;
    // en móvil no cruza por encima del contenido: se desvanece y aparece en el hueco nuevo
    if (best !== F.anchor) { F.anchor = best; F.since = 0; if (mobile) F.shown = Math.min(F.shown, .01); }
    F.since += dt;
    const k = 3.5 + Math.min(1, F.since / 1.2) * 12;
    if (best) {
      const isCover = best.dataset.slot === 'cover';
      let cx = bestR.left + bestR.width / 2, cy = bestR.top + bestR.height / 2, hp = Math.min(bestR.height, bestR.width / .52);
      if (isCover) { cx += state.lift * (innerWidth / 2 - cx); cy += state.lift * (innerHeight * (mobile ? .62 : .52) - cy); hp *= 1 + state.lift * (mobile ? .1 : -.08); }
      const x = (cx / innerWidth * 2 - 1) * hW, y = -(cy / innerHeight * 2 - 1) * hH, s = (hp / innerHeight * 2 * hH) / CAN_H;
      if (!F.placed || F.shown < .02) { can.position.set(x, y, 0); F.scale = s; F.placed = true; }
      can.position.x = damp(can.position.x, x, k, dt); can.position.y = damp(can.position.y, y, k, dt); F.scale = damp(F.scale, s, k, dt);
      F.yaw = damp(F.yaw, (+best.dataset.yaw || 0) * DEG, 5, dt);
      F.roll = damp(F.roll, (+best.dataset.rot || 0) * DEG, 6, dt);
    }
    F.shown = damp(F.shown, best ? 1 : 0, best ? 6 : 9, dt);
    const vx = (can.position.x - F.lastX) / Math.max(dt, .001); F.lastX = can.position.x;
    return vx;
  }

  const clock = new THREE.Clock();
  let raf = 0, running = true, acc = 0;
  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);
    const vx = follow(dt);
    const sh = clamp01(F.shown);
    can.scale.setScalar(Math.max(.0001, F.scale * (.6 + .4 * sh) * Math.min(1, sh * 1.4)));
    can.visible = sh > .01;
    // en la portada se balancea al ir al centro; en el resto, un balanceo suave
    const spin = F.anchor?.dataset.slot === 'cover' ? Math.sin(state.spin * Math.PI) * .5 : 0;
    body.rotation.y = F.yaw + spin + THREE.MathUtils.clamp((reduced ? 0 : Math.sin(t * .6) * .25) + sm.px * .4, -.55, .55);
    body.rotation.x = .05 + sm.py * .12 + (reduced ? 0 : Math.sin(t * .9) * .025);
    can.rotation.z = damp(can.rotation.z, F.roll + THREE.MathUtils.clamp(-vx * .02, -.25, .25) + Math.max(-.2, Math.min(.2, -state.vel * .004)), 6, dt);
    can.position.y += reduced ? 0 : Math.sin(t * 1.3) * .0018;

    if (!reduced) { acc += dt * state.rain * (mobile ? 1.2 : 2.5); while (acc > 1) { spawnLeaf(); acc--; } }
    L.forEach((p, i) => {
      if (!p.on) return;
      p.y += p.vy * dt; p.x += Math.sin(t * 1.2 + p.sw) * .25 * dt; p.rx += dt * .9; p.rz += dt * .6;
      if (p.y < -hH - 1) { p.on = false; leaves.setMatrixAt(i, hide); return; }
      m4.compose(pv.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx, p.ry, p.rz)), sv.set(p.s, p.s, p.s));
      leaves.setMatrixAt(i, m4);
    });
    leaves.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } });
  renderer.compile(scene, camera);
  const ready = canReady.then(() => new Promise(res => requestAnimationFrame(() => { renderer.render(scene, camera); res(); })));
  raf = requestAnimationFrame(frame);
  return { ready, set(v) { Object.assign(state, v); }, burst() {}, snapshot() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); } };
}
