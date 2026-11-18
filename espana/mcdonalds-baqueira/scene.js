// Escena 3D · McDonald's × BIG
// El paquete de papas en 3D construido sobre las fotos originales del equipo, sin redibujarlo:
//  · el cartón es un volumen de cuatro caras (frente, espalda y dos laterales) con las medidas, los pliegues y la
//    «sonrisa» medidos en las fotos (pack-data.js). La foto de frente se proyecta sobre el frente y los laterales
//    delanteros; la de atrás, sobre la espalda y los laterales traseros. De frente se ve exactamente la foto.
//  · las papas son las de la foto, recortadas por encima del borde del cartón, en un bloque con la forma del paquete
//    (frente, costados y espalda) pegado por dentro al cartón: de frente es la foto y al girar llenan el paquete.
// Además: papas sueltas que caen despacio y la explosión hacia la cámara.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { PACK } from './pack-data.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

// Medidas del paquete en las fotos (1254 × 1254 px): bordes del cartón rojo por fila, de la boca a la base
const IMG = 1254, S = 1 / 600, C0 = 627;          // px → unidades
const CART = { yTop: 482, yBot: 1136, lTop: 266, lBot: 332, rTop: 950, rBot: 874 };
const BACK_DX = -7;                                 // la foto de atrás está 7 px corrida respecto de la de frente
const DEPTH = .5;                                   // profundidad del cartón (≈ 42 % del ancho)
const BOW = .045;                                   // las caras se curvan un poco hacia fuera
const X = px => (px - C0) * S, Y = py => (C0 - py) * S;
const edgeL = py => CART.lTop + (CART.lBot - CART.lTop) * (py - CART.yTop) / (CART.yBot - CART.yTop);
const edgeR = py => CART.rTop + (CART.rBot - CART.rTop) * (py - CART.yTop) / (CART.yBot - CART.yTop);
const halfW = py => (edgeR(py) - edgeL(py)) / 2 * S;
// curvatura de una cara según x (0 en los bordes del cartón, máxima en el centro)
const bowAt = (x, py) => { const hw = halfW(Math.min(Math.max(py, CART.yTop), CART.yBot)); const u = Math.min(1, Math.abs(x) / hw); return BOW * (1 - u * u); };

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .7;
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100); camera.position.set(0, 0, 14);
  const key = new THREE.DirectionalLight('#FFFFFF', 2.2); key.position.set(-4, 6, 8); scene.add(key);
  const rimL = new THREE.DirectionalLight('#FFE2A8', 1.2); rimL.position.set(5, 2, -4); scene.add(rimL);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#8A3A20', .6));

  let hW = 1, hH = 1;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    hH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; hW = hH * camera.aspect;
  }
  addEventListener('resize', resize); resize();

  // ── Una papa: bastón de sección cuadrada con aristas redondeadas, puntas algo más tostadas
  function roundedFry(w = .074, r = .02) {
    const g = new THREE.BoxGeometry(w, 1, w, 3, 10, 3), p = g.attributes.position, col = [], v = new THREE.Vector3(), inner = new THREE.Vector3();
    const hw = w / 2 - r, hl = .5 - r;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      inner.set(THREE.MathUtils.clamp(v.x, -hw, hw), THREE.MathUtils.clamp(v.y, -hl, hl), THREE.MathUtils.clamp(v.z, -hw, hw));
      const d = v.clone().sub(inner); if (d.lengthSq() > 0) d.setLength(r);
      v.copy(inner).add(d); p.setXYZ(i, v.x, v.y + .5, v.z);
      const tip = Math.abs(v.y) > .44 ? .82 : 1; col.push(tip, tip * .95, tip * .9);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }
  const fryGeo = roundedFry();
  const fryMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: 0 });
  // colores medidos en las fotos
  const FRY = ['#F9B418', '#FAB91F', '#FCC74D', '#F2A201', '#F6B12A'].map(c => new THREE.Color(c));
  const fryColor = () => FRY[Math.floor(Math.random() * FRY.length)];
  const tone = new THREE.Color();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();

  // ── El paquete
  const pack = new THREE.Group();
  const body = new THREE.Group(); pack.add(body);
  const IMG = 1254, PX = 1 / 600, SF = PACK.SF, YB = 1134;
  const ev = (f, y) => f[0] * y + f[1];
  const center = (d, y) => (ev(d.edgeL, y) + ev(d.edgeR, y)) / 2;
  const width = (d, y) => ev(d.edgeR, y) - ev(d.edgeL, y);
  // s ∈ [-1, 1]: borde izquierdo → pliegue → pliegue → borde derecho, en px de la foto
  const sToPx = (d, s, y) => {
    const eL = ev(d.edgeL, y), eR = ev(d.edgeR, y), fL = ev(d.foldL, y), fR = ev(d.foldR, y);
    if (s < -SF) return eL + (s + 1) / (1 - SF) * (fL - eL);
    if (s > SF) return fR + (s - SF) / (1 - SF) * (eR - fR);
    return fL + (s + SF) / (2 * SF) * (fR - fL);
  };
  const topAt = (d, s) => { const t = (s + 1) / 2 * (d.top.length - 1), i = Math.min(d.top.length - 2, Math.floor(t)), k = t - i; return d.top[i] * (1 - k) + d.top[i + 1] * k; };
  const PF = PACK.frente, Bk = PACK.atras;
  const SIDE_TOP = topAt(PF, -1);                                          // altura del borde en los laterales (px)
  const yW = py => (627 - py) * PX;                                       // px de la foto → altura en el mundo
  const half = py => width(PF, py) / 2 * PX;
  const hd = py => .155 + (.2 - .155) * (YB - py) / (YB - SIDE_TOP);     // media profundidad del cartón
  const zOf = (s, py) => Math.abs(s) <= SF ? hd(py) : hd(py) * (1 - Math.abs(s)) / (1 - SF);
  // equivalencia de alturas entre la foto de atrás y la de frente (alinea base y borde superior)
  const BTOP = Bk.top[0], bToF = pyb => YB + (pyb - YB) * (YB - SIDE_TOP) / (YB - BTOP);
  const NS = 96, NR = 40;
  function shell(back) {
    const pos = [], uv = [], col = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const s = -1 + 2 * i / NS;
      const topF = back ? SIDE_TOP : topAt(PF, s);
      for (let r = 0; r <= NR; r++) {
        const py = YB + (topF - YB) * r / NR;                       // altura en px de la foto de frente
        let x, z, u, v;
        if (!back) {
          const px = sToPx(PF, s, py);
          x = (px - center(PF, py)) * PX; z = zOf(s, py); u = px / IMG; v = 1 - py / IMG;
        } else {
          const pyb = YB + (py - YB) * (YB - BTOP) / (YB - SIDE_TOP);
          const px = sToPx(Bk, -s, pyb), k = width(PF, py) / width(Bk, pyb);
          x = -(px - center(Bk, pyb)) * PX * k; z = -zOf(s, py); u = px / IMG; v = 1 - pyb / IMG;
        }
        pos.push(x, yW(py), z); uv.push(u, v);
        const band = (topF - py) > -38 ? 1 : 0;                   // franja amarilla interior junto al borde
        col.push(band ? .91 : .5, band ? .66 : .03, band ? .02 : .06);
      }
    }
    const R = NR + 1;
    for (let i = 0; i < NS; i++) for (let r = 0; r < NR; r++) {
      const a1 = i * R + r, b1 = a1 + R, c1 = a1 + 1, d1 = b1 + 1;
      back ? idx.push(a1, c1, b1, b1, c1, d1) : idx.push(a1, b1, c1, b1, d1, c1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const outFront = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, side: THREE.FrontSide });
  const outBack = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, side: THREE.FrontSide });
  const inner = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.BackSide });
  const gF = shell(false), gB = shell(true);
  body.add(new THREE.Mesh(gF, outFront), new THREE.Mesh(gB, outBack), new THREE.Mesh(gF, inner), new THREE.Mesh(gB, inner));
  // base
  { const pts = [[-1, 1], [-SF, 1], [SF, 1], [1, 1], [SF, -1], [-SF, -1]].map(([s0, side]) => new THREE.Vector2((sToPx(PF, s0, YB) - center(PF, YB)) * PX, side * zOf(s0, YB)));
    pts.splice(3, 0); const sh = new THREE.Shape([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]]);
    const base = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#6E0710', side: THREE.DoubleSide, toneMapped: false }));
    base.rotation.x = Math.PI / 2; base.position.y = yW(YB); body.add(base); }
  // Las papas: un bloque con la forma del paquete (frente, costados y espalda) que sigue por encima del borde,
  // con las papas de la foto proyectadas de frente. Pegado por dentro al cartón: de frente es la foto; al girar,
  // los costados del bloque también son papas, sin huecos.
  const friesMat = new THREE.MeshBasicMaterial({ alphaTest: .4, toneMapped: false, side: THREE.DoubleSide });
  function friesBlock(back) {
    const PYB = 780, PYT = 60, NRf = 56, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const s = -1 + 2 * i / NS;
      for (let r = 0; r <= NRf; r++) {
        const py = PYB + (PYT - PYB) * r / NRf;
        const px = sToPx(PF, back ? -s : s, py);
        const x = (back ? -1 : 1) * (px - center(PF, py)) * PX * .975;
        const z = (back ? -1 : 1) * zOf(back ? -s : s, py) * .93;
        pos.push(x, yW(py), z); uv.push(px / IMG, 1 - py / IMG);
      }
    }
    const R = NRf + 1;
    for (let i = 0; i < NS; i++) for (let r = 0; r < NRf; r++) { const a1 = i * R + r, b1 = a1 + R, c1 = a1 + 1, d1 = b1 + 1; back ? idx.push(a1, c1, b1, b1, c1, d1) : idx.push(a1, b1, c1, b1, d1, c1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  body.add(new THREE.Mesh(friesBlock(false), friesMat), new THREE.Mesh(friesBlock(true), friesMat));
  // detrás, la foto entera de las papas en un plano central: completa las puntas que asoman más allá del bloque
  { const g = new THREE.PlaneGeometry(IMG * PX, IMG * PX); g.translate(-(center(PF, 600) - 627) * PX, 0, 0); body.add(new THREE.Mesh(g, friesMat)); }
  const tex = src => new THREE.TextureLoader().loadAsync(src).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
  const packReady = Promise.all([tex('assets/img/pack-carton-frente.png'), tex('assets/img/pack-carton-atras.png'), tex('assets/img/pack-papas.png')]).then(([a1, b1, c1]) => {
    outFront.map = a1; outBack.map = b1; friesMat.map = c1; [outFront, outBack, friesMat].forEach(m => { m.needsUpdate = true; });
  });
  body.position.y = -.02;
  scene.add(pack);

  // ── Papas sueltas: lluvia (pocas, lentas) y explosión (muchas, hacia la cámara)
  const MAXF = mobile ? 90 : 160;
  const loose = new THREE.InstancedMesh(fryGeo, fryMat, MAXF);
  loose.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const P = Array.from({ length: MAXF }, (_, i) => { loose.setColorAt(i, fryColor()); return { on: false }; });
  loose.count = MAXF; scene.add(loose);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAXF; i++) loose.setMatrixAt(i, hide);
  const free = () => P.find(p => !p.on);
  function spawnRain() {
    const p = free(); if (!p) return;
    Object.assign(p, { on: true, burst: false, x: (Math.random() * 2 - 1) * hW * 1.1, y: hH + 1.2, z: -3 + Math.random() * 5, vx: (Math.random() - .5) * .3, vy: -(1.1 + Math.random() * 1.1), vz: 0, g: 0,
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: (Math.random() - .5) * 1.5, wy: (Math.random() - .5) * 1.5, wz: (Math.random() - .5) * 1.5, len: .55 + Math.random() * .25, s: .75 + Math.random() * .25 });
  }
  function burst(n) {
    const scale = pack.scale.x;
    for (let i = 0; i < n; i++) {
      const p = free(); if (!p) return;
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 7;
      Object.assign(p, { on: true, burst: true, x: pack.position.x + (Math.random() - .5) * .6 * scale, y: pack.position.y + .3 * scale, z: pack.position.z + .2,
        vx: Math.cos(a) * sp * .85, vy: 9 + Math.random() * 9, vz: 1 + Math.random() * 4, g: -24,
        rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: (Math.random() - .5) * 12, wy: (Math.random() - .5) * 12, wz: (Math.random() - .5) * 12, len: .55 + Math.random() * .3, s: Math.min(1.1, Math.max(.75, scale * .5)) });
    }
    punch = 1;
  }

  // ── Seguimiento de huecos
  const slots = [...document.querySelectorAll('[data-slot]')];
  const F = { anchor: null, since: 9, placed: false, scale: 1, shown: 0, lastX: 0, yaw: 0, roll: 0 };
  const state = { rain: 0, lift: 0, drop: 0, tilt: 0, spin: 0, vel: 0, px: 0, py: 0 };
  const sm = { px: 0, py: 0 };
  addEventListener('pointermove', ev => { state.px = ev.clientX / innerWidth - .5; state.py = ev.clientY / innerHeight - .5; }, { passive: true });
  const PACK_H = 1.75;                              // alto del paquete con papas, en unidades
  function follow(dt) {
    let best = null, bestF = 0, bestR = null;
    for (const el of slots) {
      const r = el.getBoundingClientRect(); if (!r.height) continue;
      const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      const fr = vis / Math.min(r.height, innerHeight);
      if (fr > bestF) { bestF = fr; best = el; bestR = r; }
    }
    if (bestF < (mobile ? .6 : .35)) best = null;
    // en móvil no viaja por encima del contenido: se desvanece y aparece directamente en el hueco nuevo
    if (best !== F.anchor) { F.anchor = best; F.since = 0; if (mobile) F.shown = Math.min(F.shown, .01); }
    F.since += dt;
    const k = 3.5 + Math.min(1, F.since / 1.2) * 12;
    if (best) {
      const isCover = best.dataset.slot === 'cover';
      let cx = bestR.left + bestR.width / 2, cy = bestR.top + bestR.height / 2, hp = Math.min(bestR.height, bestR.width);
      if (isCover) { cx += state.lift * (innerWidth / 2 - cx); cy = mobile ? cy + state.lift * (innerHeight * .5 - cy) + state.drop * innerHeight * .22 : cy + state.drop * innerHeight * .3 - state.lift * hp * .05; hp *= (1 + state.lift * (mobile ? .35 : .25)) * (1 - state.drop * .45); }
      const x = (cx / innerWidth * 2 - 1) * hW, y = -(cy / innerHeight * 2 - 1) * hH, s = (hp / innerHeight * 2 * hH) / PACK_H;
      if (!F.placed || F.shown < .02) { pack.position.set(x, y, 0); F.scale = s; F.placed = true; }
      pack.position.x = damp(pack.position.x, x, k, dt); pack.position.y = damp(pack.position.y, y, k, dt); F.scale = damp(F.scale, s, k, dt);
      F.yaw = damp(F.yaw, (+best.dataset.yaw || 0) * DEG, 5, dt);
      F.roll = damp(F.roll, ((+best.dataset.rot || 0) + (isCover ? state.tilt : 0)) * DEG, 6, dt);
    }
    F.shown = damp(F.shown, best ? 1 : 0, best ? 6 : 9, dt);
    const vx = (pack.position.x - F.lastX) / Math.max(dt, .001); F.lastX = pack.position.x;
    return vx;
  }

  const clock = new THREE.Clock();
  let raf = 0, running = true, punch = 0, rainAcc = 0;
  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);
    const vx = follow(dt);
    punch = damp(punch, 0, 5, dt);
    const sh = clamp01(F.shown);
    pack.scale.setScalar(Math.max(.0001, F.scale * (.6 + .4 * sh) * Math.min(1, sh * 1.4) * (1 + punch * .12)));
    pack.visible = sh > .01;
    body.rotation.y = THREE.MathUtils.clamp(F.yaw + (F.anchor?.dataset.slot === 'cover' ? Math.sin(state.spin * Math.PI) * .45 : 0) + (reduced ? 0 : Math.sin(t * .7) * .2) + sm.px * .35, -.62, .62);
    body.rotation.x = .06 + sm.py * .15 + (reduced ? 0 : Math.sin(t * .9) * .03);
    pack.rotation.z = damp(pack.rotation.z, F.roll + THREE.MathUtils.clamp(-vx * .02, -.3, .3) + Math.max(-.25, Math.min(.25, -state.vel * .004)), 6, dt);
    pack.position.y += reduced ? 0 : Math.sin(t * 1.4) * .002;

    // Papas sueltas
    if (!reduced) { rainAcc += dt * state.rain * (mobile ? 1.6 : 5); while (rainAcc > 1) { spawnRain(); rainAcc--; } }
    P.forEach((p, i) => {
      if (!p.on) return;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.burst) p.vz *= Math.exp(-dt * .6);
      p.rx += p.wx * dt; p.ry += p.wy * dt; p.rz += p.wz * dt;
      p.life = (p.life || 0) + dt;
      if (p.y < -hH - 3 || p.z > 12 || (p.burst && p.life > 1.8)) { p.on = false; p.life = 0; loose.setMatrixAt(i, hide); return; }
      m4.compose(pv.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx, p.ry, p.rz)), sv.set(p.s, p.len * p.s, p.s));
      loose.setMatrixAt(i, m4);
    });
    loose.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } });
  renderer.compile(scene, camera);
  const ready = packReady.then(() => new Promise(res => requestAnimationFrame(() => { renderer.render(scene, camera); res(); })));
  raf = requestAnimationFrame(frame);
  return {
    ready,
    set(v) { Object.assign(state, v); },
    burst,
    snapshot() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
  };
}
