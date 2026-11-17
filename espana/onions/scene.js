// Escena 3D · ONIONS × BIG
// Dos objetos procedurales, sin modelos ni texturas externas:
//  · la cebolla de ONIONS (la mascota): cuatro capas hechas de gajos que se pueden pelar, brote verde, raíces y carita.
//    Recorre el deck posándose en los huecos [data-obj="onion"]. En el pelado pierde sus capas; en el cierre se rearma.
//  · la botella del champú: cuadrada, ámbar, tapa lila y ONIONS escrito en vertical, con gotas de agua.
//    Vive en los huecos [data-obj="bottle"].
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // interpolación exponencial, independiente de los fps
const lerp = THREE.MathUtils.lerp;

// Perfil de la cebolla (la mascota de ONIONS): bulbo redondo, cuello corto y ancho arriba, base apenas plana.
// Puntos (radio, altura) de abajo arriba, suavizados con una spline. radius(s) da el radio para s ∈ [0, 1].
const Y0 = -1.0, TOP = 1.02, H = TOP - Y0;
const CTRL = [[0, -1.0], [.34, -.985], [.62, -.93], [.84, -.79], [.97, -.57], [1.0, -.32], [.98, -.06], [.93, .2], [.84, .4], [.7, .58], [.52, .74], [.38, .85], [.32, .94], [.3, .99], [.22, 1.015], [0, 1.02]];
const SPL = new THREE.SplineCurve(CTRL.map(([r, y]) => new THREE.Vector2(r, y))).getSpacedPoints(90);
function radius(s) {
  const y = Y0 + s * H;
  for (let i = 1; i < SPL.length; i++) {
    const a = SPL[i - 1], b = SPL[i];
    if (y <= b.y) return lerp(a.x, b.x, clamp01((y - a.y) / Math.max(b.y - a.y, 1e-6)));
  }
  return 0;
}
function profile(k) { return SPL.map(p => new THREE.Vector2(Math.max(p.x * k, .002), p.y * k)); }

// Piel de plastilina: dos bandas por gajo (una clara y otra más oscura) con bordes suaves, más oscura arriba y abajo
function skinTexture(light, dark) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const gx = g.createLinearGradient(0, 0, 256, 0);
  gx.addColorStop(0, dark); gx.addColorStop(.12, light); gx.addColorStop(.38, light); gx.addColorStop(.5, dark); gx.addColorStop(.62, dark); gx.addColorStop(.88, dark); gx.addColorStop(1, dark);
  g.fillStyle = gx; g.fillRect(0, 0, 256, 256);
  const gy = g.createLinearGradient(0, 256, 0, 0);
  gy.addColorStop(0, 'rgba(70,20,80,.28)'); gy.addColorStop(.25, 'rgba(70,20,80,0)'); gy.addColorStop(.72, 'rgba(70,20,80,0)'); gy.addColorStop(1, 'rgba(70,20,80,.3)');
  g.fillStyle = gy; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .7;

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  camera.position.set(0, 0, 14);
  const key = new THREE.DirectionalLight('#FFFFFF', 2.4); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#E9B8FF', 2.2); rim.position.set(5, 2, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#FFF4FB', '#3A1F5C', .6));

  const state = { coverSpin: 0, peel: 0, close: 0, vel: 0, px: 0, py: 0 };
  const sm = { px: 0, py: 0, peel: 0 };
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
    const g = c.getContext('2d'); const gr = g.createRadialGradient(26, 26, 0, 32, 32, 32);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const v3 = new THREE.Vector3();
  // ── La cebolla
  const onion = new THREE.Group();
  const body = new THREE.Group(); onion.add(body);        // gira y rebota
  const LAYERS = [
    { k: 1.00, light: '#D49ED4', dark: '#AC72B1' },
    { k: .90, light: '#E7B9E4', dark: '#D29DD3' },
    { k: .80, light: '#F0CDEC', dark: '#E2B6E1' },
    { k: .70, light: '#F7E0F3', dark: '#EDCBEB' },
  ];
  const PETALS = 6, GROOVES = 12;
  const layers = LAYERS.map((L, li) => {
    const mat = new THREE.MeshStandardMaterial({ map: skinTexture(L.light, L.dark), roughness: .78, metalness: 0, side: THREE.DoubleSide });
    const pts = profile(L.k);
    const petals = [];
    for (let j = 0; j < PETALS; j++) {
      const a0 = j / PETALS * Math.PI * 2, al = Math.PI * 2 / PETALS;
      const geo = new THREE.LatheGeometry(pts, 16, a0, al);
      // Surcos suaves entre bandas, como la mascota
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), z = pos.getZ(v), r = Math.hypot(x, z); if (r < 1e-4) continue;
        const f = 1 - .022 * Math.cos(GROOVES * Math.atan2(x, z));
        pos.setX(v, x * f); pos.setZ(v, z * f);
      }
      geo.computeVertexNormals();
      geo.translate(0, -Y0 * L.k, 0);                       // el gajo gira desde la base
      const pivot = new THREE.Group(); pivot.position.y = Y0 * L.k;
      const mesh = new THREE.Mesh(geo, mat); pivot.add(mesh);
      const ac = a0 + al / 2;                                // centro del gajo
      pivot.userData = { axis: new THREE.Vector3(Math.cos(ac), 0, -Math.sin(ac)), out: new THREE.Vector3(Math.sin(ac), 0, Math.cos(ac)), seed: Math.random() };
      body.add(pivot); petals.push(pivot);
    }
    return { petals, li };
  });
  // Brote: dos hojas gruesas y redondeadas, verde lima
  const leafMat = new THREE.MeshStandardMaterial({ color: '#9EA82A', roughness: .75 });
  const leaves = new THREE.Group(); leaves.position.y = TOP - .12; body.add(leaves);
  for (const [sx, h, w] of [[-1, .92, .3], [1, .8, .26]]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .07, 0, 0), new THREE.Vector3(sx * .1, h * .4, .02), new THREE.Vector3(sx * w * .8, h * .8, 0), new THREE.Vector3(sx * w, h, -.02)]);
    const leaf = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .13, 18, false), leafMat); leaf.scale.z = .78; leaves.add(leaf);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), leafMat); cap.position.copy(curve.getPoint(1)); cap.scale.z = .78; leaves.add(cap);
  }
  // Extras: la raicilla ondulada que sale arriba a la izquierda y las dos patitas
  const roots = new THREE.Group(); body.add(roots);
  const rootPts = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; rootPts.push(new THREE.Vector3(-.2 - u * 1.05, .96 + u * .32 + Math.sin(u * Math.PI * 3) * .07, -.05 + u * .05)); }
  roots.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rootPts), 60, .016, 6, false), new THREE.MeshStandardMaterial({ color: '#D9C28C', roughness: .8 })));
  const legMat = new THREE.MeshStandardMaterial({ color: '#6E3B70', roughness: .75 });
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .16, 6, 16), legMat); leg.position.set(sx * .34, Y0 + .02, .05); roots.add(leg); }
  // Carita: cejas, ojos grandes con brillos, mejillas coral y boca «ω» (se va con la primera capa y vuelve al rearmarse)
  const face = new THREE.Group(); body.add(face);
  const sAt = y => clamp01((y - Y0) / H);
  const onSurface = (y, ang, lift = .0) => { const r = radius(sAt(y)) + lift; return new THREE.Vector3(Math.sin(ang) * r, y, Math.cos(ang) * r); };
  const black = new THREE.MeshPhysicalMaterial({ color: '#170C14', roughness: .15, clearcoat: 1 });
  const white = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const blushMat = new THREE.MeshStandardMaterial({ color: '#FF6F80', roughness: .6 });
  const ink = new THREE.MeshStandardMaterial({ color: '#2A1424', roughness: .5 });
  const EY = .0, EA = .4;
  const front = (p, k = 1.2) => p.clone().add(v3.set(p.x * .5, 0, k));   // mira casi de frente, como la mascota
  for (const sx of [-1, 1]) {
    const p = onSurface(EY, sx * EA, -.005);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 24), black); eye.position.copy(p); eye.scale.set(1, 1.1, .42); eye.lookAt(p.clone().add(v3.set(0, 0, 1))); face.add(eye);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(.058, 16, 12), white); hi.position.copy(p).add(v3.set(-sx * .06, .07, .1)); hi.scale.z = .5; face.add(hi);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), white); hi2.position.copy(p).add(v3.set(-sx * .075, -.06, .09)); face.add(hi2);
    // ceja: arquito fino
    const browPts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; browPts.push(onSurface(EY + .33 + Math.sin(u * Math.PI) * .03 - (sx < 0 ? u : 1 - u) * .015, sx * EA + (u - .5) * .26, .012)); }
    face.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(browPts), 20, .022, 8, false), ink));
    const bp = onSurface(EY - .3, sx * .62, -.02);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 14), blushMat); bl.position.copy(bp); bl.scale.set(1.3, .8, .22); bl.lookAt(bp.clone().add(v3.set(sx * .35, 0, 1))); face.add(bl);
  }
  const W = [[-.16, .035], [-.13, -.025], [-.07, -.045], [-.015, -.012], [0, 0], [.015, -.012], [.07, -.045], [.13, -.025], [.16, .035]];
  const mouth = new THREE.CatmullRomCurve3(W.map(([x, y]) => onSurface(EY - .3 + y, x, .012)));
  face.add(new THREE.Mesh(new THREE.TubeGeometry(mouth, 48, .024, 10, false), ink));
  scene.add(onion);

  // ── La botella
  const bottle = new THREE.Group();
  const bottleBody = new THREE.Group(); bottle.add(bottleBody);
  const rrect = (w, d, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  };
  const BW = .92, BH = 2.5, CH = .55;
  const glassGeo = new THREE.ExtrudeGeometry(rrect(BW, BW, .16), { depth: BH, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 4, curveSegments: 10 });
  glassGeo.rotateX(-Math.PI / 2); glassGeo.translate(0, -BH / 2 - .1, 0);
  const amber = new THREE.MeshPhysicalMaterial({ color: '#C9541E', roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, transmission: mobile ? 0 : .35, thickness: .8, ior: 1.4, attenuationColor: new THREE.Color('#A83A16'), attenuationDistance: 1.2, emissive: '#7A2408', emissiveIntensity: .25 });
  bottleBody.add(new THREE.Mesh(glassGeo, amber));
  const capGeo = new THREE.ExtrudeGeometry(rrect(BW + .06, BW + .06, .18), { depth: CH, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 5, curveSegments: 10 });
  capGeo.rotateX(-Math.PI / 2); capGeo.translate(0, BH / 2 - .02, 0);
  bottleBody.add(new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({ color: '#C9A6F2', roughness: .5, clearcoat: .4 })));
  // ONIONS en vertical, letras finas claras (como en la botella real)
  const label = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
    const g = c.getContext('2d'); g.clearRect(0, 0, 256, 1024);
    g.font = '300 170px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = '#FBE3F2'; g.lineWidth = 5;
    'ONIONS'.split('').forEach((ch, i) => g.strokeText(ch, 128, 100 + i * 165));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(.62, 2.3), new THREE.MeshBasicMaterial({ map: label, transparent: true, depthWrite: false }));
  labelMesh.position.set(0, -.1, BW / 2 + .055); bottleBody.add(labelMesh);
  // Gotas de agua que caen alrededor
  const DROPS = reduced ? 0 : mobile ? 50 : 90;
  const dPos = new Float32Array(Math.max(DROPS, 1) * 3);
  const drops = Array.from({ length: DROPS }, () => ({ x: (Math.random() - .5) * 2.4, z: (Math.random() - .5) * 1.4, y: Math.random() * 4 - 2, v: .8 + Math.random() * 1.6 }));
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dMat = new THREE.PointsMaterial({ size: .07, map: dotTex, color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false });
  bottle.add(new THREE.Points(dGeo, dMat));
  scene.add(bottle);

  // ── Seguimiento de huecos: cada objeto se posa en el hueco suyo más visible
  function makeFollower(obj, sel, H_WORLD, ASPECT) {
    return { obj, slots: [...document.querySelectorAll(sel)], H_WORLD, ASPECT, anchor: null, since: 9, placed: false, scale: 1, shown: 0, lastX: 0, lastY: 0, speed: 0 };
  }
  const F = [makeFollower(onion, '[data-obj="onion"]', 3.45, .78), makeFollower(bottle, '[data-obj="bottle"]', 3.5, .5)];
  function place(f, r) {
    const hPx = Math.min(r.height, r.width / f.ASPECT);
    return { x: ((r.left + r.width / 2) / innerWidth * 2 - 1) * hW, y: -((r.top + r.height / 2) / innerHeight * 2 - 1) * hH, s: (hPx / innerHeight * 2 * hH) / f.H_WORLD };
  }
  function follow(f, dt, gate = 1) {
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
    const g = best?.dataset.gate === 'peel' ? gate : best?.dataset.gate === 'still' && reduced ? 0 : 1;
    f.shown = damp(f.shown, best ? g : 0, best ? 6 : 8, dt);
    const sh = clamp01(f.shown);
    f.obj.scale.setScalar(f.scale * (.6 + .4 * smooth(0, 1, sh)) * Math.min(1, sh * 1.4));
    f.obj.visible = sh > .01;
    const vx = (f.obj.position.x - f.lastX) / Math.max(dt, .001);
    f.lastX = f.obj.position.x;
    f.speed = damp(f.speed, Math.abs(vx), 6, dt);
    return { vx, best };
  }

  const clock = new THREE.Clock();
  let running = true, raf = 0, wob = 0;

  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);

    // Cebolla
    const fo = F[0]; const { vx, best } = follow(fo, dt);
    const spin = best?.dataset.spin;
    // Cuánto está pelada: en el pelado sigue al scroll; en el cierre se rearma; en el resto, entera
    const target = reduced ? 0 : spin === 'peel' ? state.peel : spin === 'cierre' ? 1 - state.close : 0;
    sm.peel = damp(sm.peel, target, spin === 'peel' || spin === 'cierre' ? 14 : 5, dt);
    const P = sm.peel;
    layers.forEach(({ petals, li }) => {
      const a = li * .2, open = smooth(a, a + .3, P), fall = smooth(a + .18, a + .36, P);
      const last = li === layers.length - 1;
      petals.forEach(pv => {
        const d = pv.userData;
        pv.quaternion.setFromAxisAngle(d.axis, open * (1.9 + d.seed * .4));
        pv.position.set(0, LAYERS[li].k * Y0, 0).addScaledVector(d.out, fall * (1.4 + d.seed)).add(v3.set(0, -fall * fall * 2.2, 0));
        const s = last ? 1 - smooth(.62, .9, P) : 1 - fall;
        pv.scale.setScalar(Math.max(s, .0001));
        pv.visible = s > .01;
      });
    });
    const faceS = 1 - smooth(.02, .14, P);
    face.scale.setScalar(Math.max(faceS, .0001)); face.visible = faceS > .01;
    const topS = 1 - smooth(.6, .85, P);
    leaves.scale.setScalar(Math.max(topS, .0001)); roots.scale.setScalar(Math.max(1 - smooth(.08, .3, P), .0001));   // patitas y raicilla se van con la primera capa
    // Movimiento: rebote blando y un balanceo que mira siempre a cámara (en la portada da una vuelta entera)
    const boost = Math.min(Math.abs(state.vel) * .05, 3);
    wob = damp(wob, boost, 4, dt);
    const bob = reduced ? 0 : Math.sin(t * 2.2);
    body.position.y = bob * .05 - .38;   // centra cebolla + brote en su hueco
    body.scale.set(1 - bob * .018 + wob * .01, 1 + bob * .025 - wob * .012, 1 - bob * .018 + wob * .01);
    body.rotation.y = (reduced ? -.12 : Math.sin(t * .6) * .16) + (spin === 'cover' ? state.coverSpin * Math.PI * 2 : 0) + sm.px * .6 + (spin === 'peel' ? P * Math.PI * .8 : 0);
    body.rotation.x = .05 + sm.py * .2;
    onion.rotation.y = Math.atan2(-onion.position.x, camera.position.z);   // de frente a cámara aunque esté a un lado
    onion.rotation.z = damp(onion.rotation.z, THREE.MathUtils.clamp(-vx * .03, -.4, .4) + (reduced ? 0 : Math.sin(t * 1.3) * .03), 6, dt);

    // Botella: aparece cuando la cebolla ya está pelada
    follow(F[1], dt, reduced ? 1 : smooth(.6, .92, state.peel));
    bottleBody.rotation.y = (reduced ? -.5 : -.5 + Math.sin(t * .5) * .35) + sm.px * .5;
    bottleBody.rotation.x = .08 + sm.py * .15;
    bottle.rotation.y = Math.atan2(-bottle.position.x, camera.position.z);
    bottleBody.rotation.z = reduced ? 0 : Math.sin(t * .9) * .04;
    bottleBody.position.y = reduced ? 0 : Math.sin(t * 1.4) * .05;
    if (DROPS) {
      drops.forEach((d, i) => {
        d.y -= d.v * dt; if (d.y < -2.2) { d.y = 2.2; d.x = (Math.random() - .5) * 2.4; }
        dPos[i * 3] = d.x; dPos[i * 3 + 1] = d.y; dPos[i * 3 + 2] = d.z;
      });
      dGeo.attributes.position.needsUpdate = true;
    }

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
