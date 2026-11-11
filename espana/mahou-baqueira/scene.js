// Escena 3D · Mahou × BIG
// La botella Mahou Cinco Estrellas se construye por revolución a partir de la silueta del packshot real,
// y el propio packshot se proyecta de frente: la etiqueta es la de verdad, no se redibuja.
// La chapa es una pieza aparte que salta al destapar. Gotas de condensación, nieve y burbujas acompañan.
// La botella no tiene coordenadas fijas: se posa en los huecos [data-bottle] del HTML (portada,
// après-ski, cierre) y viaja entre ellos. Los seis huecos de los creadores llevan cada uno su botella.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const SRC = 'assets/img/mahou-botella.webp';
const CAP_ROW = 34;      // fila del packshot donde termina la chapa
const H_WORLD = 3.6;     // alto de la botella en unidades de escena
const DAY_KEY = new THREE.Color('#EEF3FF'), DUSK_KEY = new THREE.Color('#FFB36B');
const DAY_SNOW = new THREE.Color('#A9BCCF'), DUSK_SNOW = new THREE.Color('#F7F8FA');

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // interpolación exponencial, independiente de los fps
const lerp = THREE.MathUtils.lerp;

function loadImage(src) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => img.decode().then(() => ok(img), () => ok(img));
    img.onerror = ko; img.src = src;
  });
}

// Lee la silueta del packshot (alfa) fila a fila: de ahí sale el perfil de revolución.
function readSilhouette(img) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, W, H).data;
  const rows = new Array(H).fill(null);
  let top = -1, bottom = -1, sumC = 0, n = 0, maxHalf = 0;
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 140) { if (l < 0) l = x; r = x; }
    if (l >= 0) { rows[y] = [l, r]; if (top < 0) top = y; bottom = y; sumC += (l + r) / 2; n++; maxHalf = Math.max(maxHalf, (r - l + 1) / 2); }
  }
  const ppu = (bottom - top) / H_WORLD, mid = (top + bottom) / 2;
  const half = row => { const rr = rows[Math.max(top, Math.min(bottom, Math.round(row)))]; return rr ? (rr[1] - rr[0] + 1) / 2 / ppu : 0; };
  return { W, H, cx: sumC / n, ppu, mid, top, bottom, half, toY: row => (mid - row) / ppu, aspect: (maxHalf * 2 / ppu) / H_WORLD };
}

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .7;

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, 14);

  const key = new THREE.DirectionalLight(DAY_KEY, 1.4); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcc0000, .8); rim.position.set(4, 1, -4); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xffffff, 0x1c0f0a, .5); scene.add(fill);

  // ── Estado: lo escribe app.js (scroll, tono de sección, hover) y el puntero
  const state = { coverOpen: 0, dusk: 0, fizz: 0, px: 0, py: 0, rowOpen: [0, 0, 0, 0, 0, 0], rowHover: [0, 0, 0, 0, 0, 0] };
  const sm = { dusk: 0, fizz: 0, px: 0, py: 0 };
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

  // ── Nieve: puntos que caen en todo el recorrido (fuera con movimiento reducido)
  const SNOW = reduced ? 0 : mobile ? 320 : 760;
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  { const g = dot.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const snowPos = new Float32Array(SNOW * 3), snowV = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    snowPos[i * 3] = (Math.random() - .5) * 2 * (hW + 2);
    snowPos[i * 3 + 1] = (Math.random() - .5) * 2 * (hH + 1);
    snowPos[i * 3 + 2] = -5 + Math.random() * 7;
    snowV[i] = .25 + Math.random() * .55;
  }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ size: mobile ? .09 : .075, map: new THREE.CanvasTexture(dot), color: DAY_SNOW.clone(), transparent: true, depthWrite: false });
  const snow = new THREE.Points(snowGeo, snowMat);
  if (SNOW) scene.add(snow);

  // ── Burbujas que suben por toda la pantalla en algunas secciones (cada sección dice cuántas: data-fizz)
  // Cada burbuja es un aro blanco con su brillo (dibujado en canvas), para que se lea igual sobre rojo, noche o nieve
  const FIELD = reduced ? 0 : mobile ? 34 : 70;
  const bub = document.createElement('canvas'); bub.width = bub.height = 128;
  { const g = bub.getContext('2d');
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(44, 42, 13, 8, -.7, 0, Math.PI * 2); g.fill(); }
  const fieldPos = new Float32Array(FIELD * 3);
  const fieldGeo = new THREE.BufferGeometry(); fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
  const fieldMat = new THREE.PointsMaterial({ size: mobile ? .62 : .55, map: new THREE.CanvasTexture(bub), transparent: true, opacity: 0, depthWrite: false });
  const fieldMesh = new THREE.Points(fieldGeo, fieldMat);
  const field = Array.from({ length: FIELD }, () => ({ x: Math.random() * 2 - 1, y: Math.random(), z: -4 + Math.random() * 6, v: .05 + Math.random() * .12, w: Math.random() * 6 }));
  scene.add(fieldMesh);

  // ── Botellas (se crean cuando llega el packshot)
  let S = null, glass = null, bodyGeo = null, capGeo = null, capBase = null, mouthY = 0;
  let hero = null, droplets = null, bubbles = null;
  const rows = [];
  const heroSlots = [...document.querySelectorAll('[data-bottle="hero"]')];
  const rowSlots = [...document.querySelectorAll('[data-bottle="row"]')];
  let heroAnchor = null, sinceSwitch = 9;

  function projectUV(geo) {
    // Proyección frontal del packshot: cada vértice toma el píxel que tiene delante.
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = S.cx + pos.getX(i) * S.ppu * .985, py = S.mid - pos.getY(i) * S.ppu;
      uv.setXY(i, px / S.W, 1 - py / S.H);
    }
    uv.needsUpdate = true;
  }

  function build(img) {
    S = readSilhouette(img);
    // Textura: el packshot sobre el tono del vidrio, para que el borde de la silueta no deje halos.
    const tc = document.createElement('canvas'); tc.width = S.W; tc.height = S.H;
    const tg = tc.getContext('2d'); tg.fillStyle = '#2a140a'; tg.fillRect(0, 0, S.W, S.H); tg.drawImage(img, 0, 0);
    const tex = new THREE.CanvasTexture(tc);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    glass = new THREE.MeshPhysicalMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: .42,
      roughness: .26, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide,
    });

    const V = (x, y) => new THREE.Vector2(Math.max(x, .0005), y);
    const body = [V(0, S.toY(S.bottom))];
    for (let row = S.bottom; row > CAP_ROW + 2; row -= 4) body.push(V(S.half(row), S.toY(row)));
    const lip = S.half(CAP_ROW + 4);
    mouthY = S.toY(CAP_ROW + 2);
    body.push(V(lip, mouthY), V(lip * .72, mouthY + .004), V(lip * .64, mouthY - .3), V(0, mouthY - .34));
    bodyGeo = new THREE.LatheGeometry(body, mobile ? 64 : 96);
    projectUV(bodyGeo);

    const cap = [V(0, S.toY(CAP_ROW + 2))];
    for (let row = CAP_ROW + 2; row >= S.top; row -= 2) cap.push(V(S.half(row) * 1.015, S.toY(row)));
    cap.push(V(0, S.toY(S.top)));
    capGeo = new THREE.LatheGeometry(cap, 48);
    projectUV(capGeo);
    const capY = S.toY((CAP_ROW + S.top) / 2);
    capGeo.translate(0, -capY, 0);
    capBase = new THREE.Vector3(0, capY, 0);

    hero = makeBottle(); scene.add(hero.group);
    hero.group.position.y = -hH - 4;

    // Gotas de condensación: la botella sale fría de la nevera y las gotas resbalan despacio
    const N = mobile ? 60 : 110;
    droplets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, metalness: 0, clearcoat: 1, transparent: true, opacity: .26, depthWrite: false }), N);
    droplets.userData.d = Array.from({ length: N }, () => ({
      y: lerp(S.toY(S.bottom - 30), S.toY(420), Math.random()), phi: (Math.random() - .5) * 2.6,
      s: .009 + Math.random() * .018, v: Math.random() < .25 ? .02 + Math.random() * .05 : 0,
    }));
    hero.group.add(droplets);

    // Burbujas y espuma que suben de la boca al destapar
    const B = reduced ? 0 : 46;
    bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xF7F8FA, roughness: .35, emissive: 0xF7F8FA, emissiveIntensity: .25 }), Math.max(B, 1));
    bubbles.userData.b = Array.from({ length: B }, () => ({ p: Math.random(), v: .28 + Math.random() * .4, x: (Math.random() - .5), z: (Math.random() - .5), s: .02 + Math.random() * .045, w: Math.random() * 6 }));
    bubbles.count = B;
    hero.group.add(bubbles);

    rowSlots.forEach(() => { const b = makeBottle(); b.group.visible = false; scene.add(b.group); rows.push(b); });
  }

  function makeBottle() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, glass);
    const cap = new THREE.Mesh(capGeo, glass); cap.position.copy(capBase);
    group.add(body, cap);
    return { group, cap, open: 0, hover: 0, placed: false, s: 1 };
  }

  // Chapa: un salto corto y sale volando girando. open 0 → cerrada, 1 → ya no está.
  function applyCap(b) {
    const o = b.open;
    const lift = .2 * smooth(0, .1, o) + 7.5 * Math.pow(clamp01((o - .1) / .9), 1.6);
    b.cap.position.set(capBase.x + 1.1 * o, capBase.y + lift, capBase.z + .4 * o);
    b.cap.rotation.set(2.8 * o, 0, -3.6 * o);
    b.cap.visible = o < .985;
  }

  // Hueco del HTML → posición y escala en la escena (plano z = 0). La base de la botella se apoya abajo.
  function place(r) {
    const hPx = Math.min(r.height, r.width / S.aspect);
    const cy = r.bottom - hPx / 2;
    return { x: ((r.left + r.width / 2) / innerWidth * 2 - 1) * hW, y: -(cy / innerHeight * 2 - 1) * hH, s: (hPx / innerHeight * 2 * hH) / H_WORLD };
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  let running = true, raf = 0, lastX = 0;

  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.dusk = damp(sm.dusk, state.dusk, 3, dt);
    sm.fizz = damp(sm.fizz, state.fizz, 2.5, dt);
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);
    const d = sm.dusk;

    // Luz: del blanco de pista al ámbar del après-ski
    key.color.lerpColors(DAY_KEY, DUSK_KEY, d);
    key.intensity = lerp(1.4, 1.8, d);
    rim.intensity = lerp(.6, 1.6, d);
    snowMat.color.lerpColors(DAY_SNOW, DUSK_SNOW, d);

    if (SNOW) {
      for (let i = 0; i < SNOW; i++) {
        const j = i * 3;
        snowPos[j + 1] -= snowV[i] * dt;
        snowPos[j] += Math.sin(t * .6 + i) * .0025;
        if (snowPos[j + 1] < -hH - 1.2) { snowPos[j + 1] = hH + 1.2; snowPos[j] = (Math.random() - .5) * 2 * (hW + 2); }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    fieldMesh.visible = FIELD > 0 && sm.fizz > .005;
    if (fieldMesh.visible) {
      fieldMat.opacity = Math.min(1, sm.fizz * 1.2);
      field.forEach((b, i) => {
        b.y += b.v * dt;
        if (b.y > 1) { b.y -= 1; b.x = Math.random() * 2 - 1; }
        fieldPos[i * 3] = b.x * hW * 1.1 + Math.sin(t * 1.3 + b.w) * .1;
        fieldPos[i * 3 + 1] = lerp(-hH - 1, hH + 1, b.y);
        fieldPos[i * 3 + 2] = b.z;
      });
      fieldGeo.attributes.position.needsUpdate = true;
    }

    if (hero) {
      glass.emissiveIntensity = lerp(.42, .55, d);

      // ¿En qué hueco se posa la botella? El más visible; si ninguno, se esconde abajo.
      let best = null, bestF = 0, bestR = null;
      for (const el of heroSlots) {
        const r = el.getBoundingClientRect();
        if (!r.height) continue;
        const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        const f = vis / Math.min(r.height, innerHeight);
        if (f > bestF) { bestF = f; best = el; bestR = r; }
      }
      if (bestF < .3) best = null;
      if (best !== heroAnchor) { heroAnchor = best; sinceSwitch = 0; }
      sinceSwitch += dt;

      const g = hero.group;
      const k = lerp(3.2, 22, smooth(0, 1.3, sinceSwitch));
      if (best) {
        const p = place(bestR);
        if (!hero.placed) { g.position.set(p.x, -hH - 4, 0); hero.s = p.s; hero.placed = true; }
        g.position.x = damp(g.position.x, p.x, k, dt);
        g.position.y = damp(g.position.y, p.y, k, dt);
        hero.s = damp(hero.s, p.s, k, dt);
        const target = best.dataset.open === 'scroll' ? state.coverOpen : 1;
        hero.open = damp(hero.open, target, 30, dt);
      } else {
        g.position.y = damp(g.position.y, -hH - 4, 7, dt);
      }
      g.scale.setScalar(hero.s);
      const vx = (g.position.x - lastX) / Math.max(dt, .001); lastX = g.position.x;
      g.rotation.y = (reduced ? 0 : Math.sin(t * .45) * .2) + sm.px * .5;
      g.rotation.x = sm.py * .1;
      g.rotation.z = damp(g.rotation.z, THREE.MathUtils.clamp(-vx * .02, -.25, .25), 6, dt);
      g.visible = g.position.y > -hH - 3.5;
      applyCap(hero);

      // Gotas
      droplets.userData.d.forEach((dr, i) => {
        if (!reduced && dr.v) { dr.y -= dr.v * dt; if (dr.y < S.toY(S.bottom - 30)) dr.y = S.toY(420); }
        const r = S.half(S.mid - dr.y * S.ppu) + .004;
        pv.set(r * Math.sin(dr.phi), dr.y, r * Math.cos(dr.phi));
        q.setFromAxisAngle(Y, dr.phi);
        sv.set(dr.s, dr.s * 1.25, dr.s * .45);
        droplets.setMatrixAt(i, m4.compose(pv, q, sv));
      });
      droplets.instanceMatrix.needsUpdate = true;

      // Burbujas: solo con la botella abierta
      const fizz = smooth(.2, .6, hero.open);
      bubbles.userData.b.forEach((b, i) => {
        const life = (b.p + t * b.v * .5) % 1;
        pv.set(b.x * (.04 + life * .32) + Math.sin(t * 2 + b.w) * .02, mouthY + .04 + life * 1.5, b.z * (.04 + life * .2));
        sv.setScalar(b.s * Math.sin(life * Math.PI) * fizz + 1e-4);
        bubbles.setMatrixAt(i, m4.compose(pv, q.identity(), sv));
      });
      bubbles.instanceMatrix.needsUpdate = true;

      // Las seis botellas de los creadores: pegadas a su hueco
      rows.forEach((b, i) => {
        const r = rowSlots[i].getBoundingClientRect();
        const on = r.bottom > -60 && r.top < innerHeight + 60 && r.height > 0;
        b.group.visible = on;
        if (!on) { b.placed = false; return; }
        const p = place(r);
        b.hover = damp(b.hover, state.rowHover[i], 8, dt);
        b.open = damp(b.open, state.rowOpen[i], 30, dt);
        b.group.position.set(p.x, p.y + b.hover * .07 * H_WORLD * p.s, 0);
        b.group.scale.setScalar(p.s);
        b.group.rotation.y = (reduced ? 0 : Math.sin(t * .6 + i) * .08) + b.hover * .55;
        b.group.rotation.z = b.hover * -.06;
        applyCap(b);
      });
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  });

  const ready = loadImage(SRC).then(img => {
    build(img);
    renderer.compile(scene, camera);
    return new Promise(res => requestAnimationFrame(() => { renderer.render(scene, camera); res(); }));
  });
  raf = requestAnimationFrame(frame);

  return {
    ready,
    set(values) { Object.assign(state, values); },
    setRow(i, values) { if ('open' in values) state.rowOpen[i] = values.open; if ('hover' in values) state.rowHover[i] = values.hover; },
  };
}
