// Escena 3D de «Función completa»: una sala de cine entera de fondo (butacas rojas, pantalla con la película,
// telones, el haz del proyector con polvo y las luces de sala), el celular de la portada con el reel de Damián
// y la mochila térmica de PedidosYa, que llega en «La entrega» y se abre con luz adentro, como un botín.
// app.js la maneja con: setSection(id), setHero(p), setArrival(a, after), setEnd(e, fin), pointer(x, y), setVelocity(v).
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const RED = '#FA0050';
const PACK_RED = '#EE1C45';
const CYAN = '#3EC1EC';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInCubic = t => t * t * t;
const easeOutBack = (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function planarUV(geo, w, h) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / w + .5; uv[i * 2 + 1] = p.getY(i) / h + .5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
// Caja redondeada; con bulge > 0 las caras se inflan un poco (tela acolchada). Normales suaves sin costuras.
function roundedBox(w, h, d, r, seg = 6, bulge = 0) {
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = geo.attributes.position;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    o.fromBufferAttribute(p, i);
    c.set(clamp(o.x, -hw, hw), clamp(o.y, -hh, hh), clamp(o.z, -hd, hd));
    v.copy(o).sub(c).normalize().multiplyScalar(r).add(c);
    if (bulge) {
      const fx = 1 - Math.pow(o.x / (w / 2), 2), fy = 1 - Math.pow(o.y / (h / 2), 2), fz = 1 - Math.pow(o.z / (d / 2), 2);
      if (Math.abs(o.z) >= d / 2 - 1e-4) v.z += Math.sign(o.z) * bulge * fx * fy;
      if (Math.abs(o.x) >= w / 2 - 1e-4) v.x += Math.sign(o.x) * bulge * fy * fz;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  smoothNormals(geo);
  return geo;
}
// Promedia las normales de los vértices que comparten posición (las caras de BoxGeometry no comparten vértices)
function smoothNormals(geo) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, map = new Map();
  const key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i), acc = map.get(k) || [0, 0, 0];
    acc[0] += n.getX(i); acc[1] += n.getY(i); acc[2] += n.getZ(i); map.set(k, acc);
  }
  for (let i = 0; i < p.count; i++) {
    const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
}

// Haz de luz: planos cruzados alrededor del eje, con estrías que se mueven (se lee desde cualquier ángulo)
function makeShaft(color, rTop, rBottom, len, { planes = 4, fadeStart = .25, fadeEnd = 1 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uTime: { value: 0 }, uTop: { value: rTop / rBottom }, uFade: { value: new THREE.Vector2(fadeStart, fadeEnd) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uTop; uniform vec2 uFade; varying vec2 vUv;
      void main(){
        float v = 1. - vUv.y;
        float halfW = mix(uTop, 1., v);
        float xr = (vUv.x - .5) * 2. / halfW;
        float x = abs(xr);
        if (x > 1.) discard;
        float edge = pow(1. - x, 1.6);
        float along = smoothstep(0., .02, v) * (1. - smoothstep(uFade.x, uFade.y, v));
        float streak = .68 + .32 * sin(xr * 23. + uTime * .5) * sin(xr * 9. - uTime * .33 + 1.7);
        float flick = .94 + .06 * sin(uTime * 23.) * sin(uTime * 7.1);
        float a = edge * along * streak * flick * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  for (let i = 0; i < planes; i++) {
    const geo = new THREE.PlaneGeometry(rBottom * 2, len, 1, 1);
    geo.translate(0, -len / 2, 0);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = i / planes * Math.PI;
    m.renderOrder = 3;
    group.add(m);
  }
  group.userData.mat = mat;
  return group;
}
function aim(obj, from, to) {
  obj.position.copy(from);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
}
function radialTexture(color, stops = [[0, 1], [.25, .45], [1, 0]]) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  const col = new THREE.Color(color), rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  stops.forEach(([o, a]) => grd.addColorStop(o, `rgba(${rgb},${a})`));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.setScalar(size);
  return s;
}
function loadImage(src) {
  return new Promise((ok, ko) => { const img = new Image(); img.onload = () => ok(img); img.onerror = ko; img.src = src; });
}
// Trama fina para la tela y la alfombra (sirve de bumpMap)
function weaveTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), id = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4, v = 128 + 38 * Math.sin(x * 1.6) * Math.sin(y * 1.6) + (Math.random() - .5) * 40;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return t;
}
// Tubo cerrado que sigue un rectángulo redondeado (los ribetes celestes de la mochila)
function loopTube(w, h, r, radius, place) {
  const pts = roundedRect(w, h, r).getSpacedPoints(160).map(p => place(p.x, p.y));
  pts.pop();
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 220, radius, 8, true);
}

export function createScene(canvas, { reduced = false, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const DPR_MAX = Math.min(devicePixelRatio, mobile ? 1.25 : 1.5);
  renderer.setPixelRatio(DPR_MAX);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor('#070508', 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#070508', 10, 36);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .22;

  const FOV = mobile ? 44 : 34;
  const camera = new THREE.PerspectiveCamera(FOV, 1, .01, 90);
  scene.add(camera);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const view = { w: 1, h: 1, aspect: 1, mobile };
  const visible = d => { const h = 2 * d * tanHalf; return { h, w: h * view.aspect }; };

  // ═════ LA SALA ═════
  const SCREEN = { w: 12.4, h: 5.2, y: 4.3, z: -12 };
  const ROWS = 9, ROW_D = 1.2, STEP = .34, ROW0 = -6.4;
  const rowZ = r => ROW0 + r * ROW_D, rowY = r => r * STEP;
  // Materiales livianos (Lambert) para la sala: ocupa toda la pantalla y es fondo; el terciopelo se sugiere con un emisivo leve
  const velvet = new THREE.MeshLambertMaterial({ color: '#86081f', emissive: '#16000a' });
  const curtainMat = new THREE.MeshLambertMaterial({ color: '#6a0520', emissive: '#120005', side: THREE.DoubleSide });
  const dark = new THREE.MeshLambertMaterial({ color: '#120d11' });
  const wallMat = new THREE.MeshLambertMaterial({ color: '#170b10' });
  const carpetTex = weaveTexture(); carpetTex.repeat.set(30, 30);
  const carpet = new THREE.MeshLambertMaterial({ color: '#1a1015', bumpMap: carpetTex, bumpScale: .4 });

  const hall = new THREE.Group(); scene.add(hall);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  // piso, gradas, paredes, techo
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 22), carpet); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2); hall.add(floor);
  const steps = new THREE.InstancedMesh(new THREE.BoxGeometry(16, 1, ROW_D), carpet, ROWS);
  for (let r = 1; r <= ROWS; r++) {
    const isBack = r === ROWS, hgt = rowY(isBack ? ROWS - 1 : r);
    m4.compose(pv.set(0, hgt / 2, isBack ? rowZ(ROWS - 1) + ROW_D * 1.6 : rowZ(r)), q.identity(), sv.set(1, hgt, isBack ? 2.2 : 1));
    steps.setMatrixAt(r - 1, m4);
  }
  hall.add(steps);
  const wallGeo = new THREE.PlaneGeometry(22, 10);
  const wl = new THREE.Mesh(wallGeo, wallMat); wl.rotation.y = Math.PI / 2; wl.position.set(-8, 5, -2); hall.add(wl);
  const wr = new THREE.Mesh(wallGeo, wallMat); wr.rotation.y = -Math.PI / 2; wr.position.set(8, 5, -2); hall.add(wr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMat); back.rotation.y = Math.PI; back.position.set(0, 5, 7.6); hall.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), dark); front.position.set(0, 5, -12.6); hall.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), dark); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 9.6, -2); hall.add(ceil);
  // paneles acústicos y apliques de luz en las paredes laterales
  const panelMat = new THREE.MeshLambertMaterial({ color: '#2a0912' });
  const PANELS = 13, panels = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, 5.2, 1.02), panelMat, PANELS * 2);
  const sconceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd7a0'), toneMapped: false });
  const sconceColor = new THREE.Color('#ffd7a0');
  const sconces = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .55, .2), sconceMat, PANELS * 2);
  const sconceGlows = [];
  let si = 0;
  for (let i = 0; i < PANELS; i++) {
    const z = -11 + i * 1.32;
    [-1, 1].forEach((side, k) => {
      m4.compose(pv.set(side * 7.92, 3.7, z), q.identity(), sv.set(1, 1, 1)); panels.setMatrixAt(i * 2 + k, m4);
      if (i < PANELS - 1 && i % 2 === 0) {
        m4.compose(pv.set(side * 7.84, 6.7, z + .66), q.identity(), sv.set(1, 1, 1)); sconces.setMatrixAt(si++, m4);
        const g = glowSprite('#ffc98e', 1.7); g.position.set(side * 7.7, 6.7, z + .66); hall.add(g); sconceGlows.push(g);
      }
    });
  }
  sconces.count = si; hall.add(panels, sconces);
  // luces de los escalones del pasillo
  const stepLights = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .035, .04), sconceMat, ROWS * 2);
  for (let r = 0; r < ROWS; r++) [-1, 1].forEach((side, k) => { m4.compose(pv.set(side * .74, rowY(r) + .04, rowZ(r) - ROW_D / 2 + .03), q.identity(), sv.set(1, 1, 1)); stepLights.setMatrixAt(r * 2 + k, m4); });
  hall.add(stepLights);
  // butacas de terciopelo rojo (dos bloques de 7 con pasillo central)
  const SEATS_PER_SIDE = 7, SEAT_W = .64;
  const nSeats = ROWS * SEATS_PER_SIDE * 2;
  const seatBack = new THREE.InstancedMesh(roundedBox(.56, .78, .13, .05, 4), velvet, nSeats);
  const seatCush = new THREE.InstancedMesh(roundedBox(.54, .15, .5, .05, 4), velvet, nSeats);
  const armMat = new THREE.MeshLambertMaterial({ color: '#100a0c' });
  const seatArm = new THREE.InstancedMesh(roundedBox(.07, .66, .56, .025, 2), armMat, ROWS * (SEATS_PER_SIDE + 1) * 2);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .14);
  let bi = 0, ai = 0;
  for (let r = 0; r < ROWS; r++) {
    const y = rowY(r), z = rowZ(r) + .05;
    [-1, 1].forEach(side => {
      for (let s = 0; s < SEATS_PER_SIDE; s++) {
        const x = side * (.95 + s * SEAT_W);
        m4.compose(pv.set(x, y + .9, z + .27), tilt, sv.set(1, 1, 1)); seatBack.setMatrixAt(bi, m4);
        m4.compose(pv.set(x, y + .46, z), q.identity(), sv.set(1, 1, 1)); seatCush.setMatrixAt(bi, m4);
        bi++;
      }
      for (let s = 0; s <= SEATS_PER_SIDE; s++) {
        const x = side * (.95 - SEAT_W / 2 + s * SEAT_W);
        m4.compose(pv.set(x, y + .33, z + .04), q.identity(), sv.set(1, 1, 1)); seatArm.setMatrixAt(ai++, m4);
      }
    });
  }
  hall.add(seatBack, seatCush, seatArm);
  // escenario, pantalla (con la película) y telones
  const stage = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 2.6), dark); stage.position.set(0, .7, -11.3); hall.add(stage);
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w + 3, SCREEN.h + 2), new THREE.MeshBasicMaterial({ color: '#030203' })); mask.position.set(0, SCREEN.y, SCREEN.z - .02); hall.add(mask);
  const film = document.createElement('video');
  Object.assign(film, { muted: true, loop: true, playsInline: true, preload: 'auto' });
  film.setAttribute('muted', ''); film.setAttribute('playsinline', '');
  film.src = 'assets/video/pantalla.mp4';
  const filmTex = new THREE.VideoTexture(film); filmTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: filmTex, toneMapped: false, fog: false, color: new THREE.Color(.82, .8, .78) });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), screenMat); screenMesh.position.set(0, SCREEN.y, SCREEN.z); hall.add(screenMesh);
  function curtain(w, h, folds) {
    const g = new THREE.PlaneGeometry(w, h, Math.round(w * 26), 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin(x * folds) * .16 + Math.sin(x * folds * .37 + 1.3) * .06 + (y / h) * .04);
    }
    g.computeVertexNormals();
    return new THREE.Mesh(g, curtainMat);
  }
  // los telones se montan sobre los bordes de la pantalla (y bien pegados a ella) para que nunca se vean sus cantos
  // los pliegues se mueven ±0,22 en profundidad: con z = -11,55 ningún pliegue queda detrás de la pantalla (z = -12)
  const cl = curtain(3, 8, 7.5); cl.position.set(-7.25, 4, -11.55); hall.add(cl);
  const cr = curtain(3, 8, 7.5); cr.position.set(7.25, 4, -11.55); hall.add(cr);
  const cv = curtain(16, 1.9, 6.2); cv.position.set(0, 7.55, -11.5); hall.add(cv);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(16, .5, .9), dark); sill.position.set(0, SCREEN.y - SCREEN.h / 2 - .2, -11.6); hall.add(sill);

  // luces de la sala
  scene.add(new THREE.HemisphereLight('#3a1824', '#050305', .35));
  const screenLight = new THREE.SpotLight('#d6dcff', 90, 34, .95, 1, 1.15);
  screenLight.position.set(0, SCREEN.y, SCREEN.z + .5); screenLight.target.position.set(0, 1.2, 4); scene.add(screenLight, screenLight.target);
  const houseL = new THREE.PointLight('#ffc48a', 10, 14, 1.4); houseL.position.set(-6.8, 6.4, -2); scene.add(houseL);
  const houseR = new THREE.PointLight('#ffc48a', 10, 14, 1.4); houseR.position.set(6.8, 6.4, -2); scene.add(houseR);

  // proyector: ventanita de la cabina atrás, haz hacia la pantalla y polvo en el aire
  const booth = new THREE.Vector3(0, 7.3, 7.5);
  const boothWin = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .55), new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false, fog: false })); boothWin.rotation.y = Math.PI; boothWin.position.copy(booth).add(new THREE.Vector3(0, 0, .05)); hall.add(boothWin);
  const lens = glowSprite('#fff4e0', 1.6); lens.position.copy(booth); hall.add(lens);
  const screenCenter = new THREE.Vector3(0, SCREEN.y, SCREEN.z);
  const BEAM_LEN = booth.distanceTo(screenCenter);
  const beam = makeShaft('#fff1dc', .08, 6.6, BEAM_LEN, { fadeStart: .55, fadeEnd: 1.05 });
  aim(beam, booth, screenCenter); hall.add(beam);

  const DUST = mobile ? 500 : 1000;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3] = (Math.random() - .5) * 13; dPos[i * 3 + 1] = 1.5 + Math.random() * 7.5; dPos[i * 3 + 2] = -11.5 + Math.random() * 18.5;
    dSeed[i] = Math.random();
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('seed', new THREE.BufferAttribute(dSeed, 1));
  const beamDir = screenCenter.clone().sub(booth).normalize();
  const dMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uApex: { value: booth.clone() }, uDir: { value: beamDir }, uLen: { value: BEAM_LEN }, uR: { value: 6.6 }, uOpacity: { value: 1 }, uPx: { value: renderer.getPixelRatio() }, uGlow: { value: new THREE.Vector3(0, -50, 0) }, uGlowK: { value: 0 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform vec3 uApex; uniform vec3 uDir; uniform float uLen; uniform float uR; uniform float uPx; uniform vec3 uGlow; uniform float uGlowK;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * .11 + seed * 31.) * .4;
        p.y += cos(uTime * .09 + seed * 17.) * .3;
        p.z += sin(uTime * .07 + seed * 11.) * .35;
        vec3 q = p - uApex; float t = dot(q, uDir);
        float r = max(t, 0.) / uLen * uR;
        float off = length(q - uDir * t);
        float inBeam = (1. - smoothstep(r * .3, r, off)) * step(0., t);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vec4 gw = viewMatrix * vec4(uGlow, 1.);
        float nearGlow = uGlowK * (1. - smoothstep(0., 1.8, distance(mv.xyz, gw.xyz)));
        vA = .05 + inBeam * .75 + nearGlow;
        gl_PointSize = (1.3 + seed * 2.4) * uPx * (7. / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uOpacity; varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA * uOpacity; gl_FragColor = vec4(vec3(1., .95, .88) * a, a); }`,
  });
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; scene.add(dust);

  // ═════ OBJETOS EN PRIMER PLANO (van con la cámara) ═════
  const fg = new THREE.Group(); camera.add(fg);
  const key = new THREE.SpotLight('#fff1dc', 55, 30, .6, .8, 1.3); key.position.set(-3.4, 3.4, 1.5); key.target.position.set(.6, 0, -6); camera.add(key, key.target);
  const rim = new THREE.PointLight(RED, 30, 10, 1.6); rim.position.set(2.8, .5, -7.4); camera.add(rim);
  const fillL = new THREE.DirectionalLight('#c6d4ff', .45); fillL.position.set(-2, 1, 2); fillL.target.position.set(0, 0, -6); camera.add(fillL, fillL.target);

  // El celular (iPhone) con el reel de Damián
  const W = .716, H = 1.476, D = .082, R = .118, B = .028;
  const phone = new THREE.Group();
  const titanium = new THREE.MeshPhysicalMaterial({ color: '#3d3d41', metalness: 1, roughness: .32, clearcoat: .2 });
  const backGlass = new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: .2, roughness: .45, clearcoat: .6, clearcoatRoughness: .3 });
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(W - B * 2, H - B * 2, R - B), { depth: D - B * 2, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 8, curveSegments: 40 });
  bodyGeo.translate(0, 0, -(D - B * 2) / 2);
  phone.add(new THREE.Mesh(bodyGeo, [backGlass, titanium]));
  const SW = W - .036, SH = H - .036;
  const screenGeo = planarUV(new THREE.ShapeGeometry(roundedRect(SW, SH, R - .02), 40), SW, SH);
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto' });
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  video.src = 'assets/video/damian-gancho.mp4';
  const vTex = new THREE.VideoTexture(video); vTex.colorSpace = THREE.SRGBColorSpace;
  const pScreen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: vTex, toneMapped: false, fog: false }));
  pScreen.position.z = D / 2 + .0008; phone.add(pScreen);
  const glass = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: .06, transparent: true, opacity: .2, envMapIntensity: 1.6 }));
  glass.position.z = D / 2 + .0016; phone.add(glass);
  const isl = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(.205, .06, .03), 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  isl.position.set(0, SH / 2 - .062, D / 2 + .0022); phone.add(isl);
  const btn = (h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.014, h, .026), titanium); m.position.set(x, y, 0); phone.add(m); };
  btn(.2, W / 2 + .004, .22); btn(.1, -W / 2 - .004, .36); btn(.1, -W / 2 - .004, .22); btn(.06, -W / 2 - .004, .5);
  const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(.3, .3, .075), { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 3 }), backGlass);
  bump.position.set(W / 2 - .2, H / 2 - .2, -D / 2 - .016); phone.add(bump);
  fg.add(phone);

  // La mochila térmica de PedidosYa: roja, ribetes celestes, franja gris abajo, logo blanco derecho,
  // manija celeste arriba, tapa con cierre que se abre y forro plateado adentro.
  const pack = new THREE.Group();
  const PW = 1, PB = .8, PL = .17, PD = .86, PR = .075; // ancho, alto de la base, alto de la tapa, fondo, radio
  const weave = weaveTexture();
  const sheenRed = new THREE.Color('#ff8aa2');
  const fabric = (map, rough) => new THREE.MeshPhysicalMaterial({ map, roughnessMap: rough, roughness: 1, metalness: 0, sheen: .7, sheenRoughness: .6, sheenColor: sheenRed, bumpMap: weave, bumpScale: .55 });
  const plainRed = new THREE.MeshPhysicalMaterial({ color: PACK_RED, roughness: .78, sheen: .7, sheenRoughness: .6, sheenColor: sheenRed, bumpMap: weave, bumpScale: .55 });
  const greyBand = new THREE.MeshPhysicalMaterial({ color: '#8d9095', roughness: .4, metalness: .25, bumpMap: weave, bumpScale: .3 });
  const foilTex = (() => { // forro térmico plateado arrugado
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const v = Math.random() > .5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},.2)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath();
      const x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 90, y + (Math.random() - .5) * 90); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
  })();
  const foil = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: .32, bumpMap: foilTex, bumpScale: 2.2, envMapIntensity: 1.4 });
  const foilIn = foil.clone(); foilIn.side = THREE.BackSide;
  foil.emissive = new THREE.Color('#ff9a3c'); foilIn.emissive = new THREE.Color('#ffa94a');
  foil.emissiveIntensity = foilIn.emissiveIntensity = 0;
  const piping = new THREE.MeshStandardMaterial({ color: CYAN, roughness: .55 });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  // Base abierta arriba. Orden de caras: [+x, -x, +y (abierta), -y, +z frente, -z espalda]
  const base = new THREE.Mesh(roundedBox(PW, PB, PD, PR, 12, .022), [plainRed, plainRed, hidden, greyBand, plainRed, plainRed]);
  pack.add(base);
  const lining = new THREE.Mesh(new THREE.BoxGeometry(PW - .07, PB - .05, PD - .07), [foilIn, foilIn, hidden, foilIn, foilIn, foilIn]);
  lining.position.y = .02; pack.add(lining);
  // borde de la boca: cierra el espacio entre la tela de afuera y el forro
  const collarShape = roundedRect(PW - .004, PD - .004, PR);
  collarShape.holes.push(roundedRect(PW - .07, PD - .07, PR * .5));
  const collar = new THREE.Mesh(new THREE.ShapeGeometry(collarShape, 16), plainRed);
  collar.rotation.x = -Math.PI / 2; collar.position.y = PB / 2 - .004; pack.add(collar);
  // ribetes: frente, espalda, contorno de abajo y el cierre de la boca
  const inset = PR * .29;
  pack.add(new THREE.Mesh(loopTube(PW - inset * 2, PB - inset * 2, PR * .72, .013, (x, y) => new THREE.Vector3(x, y, PD / 2 - inset)), piping));
  pack.add(new THREE.Mesh(loopTube(PW - inset * 2, PB - inset * 2, PR * .72, .013, (x, y) => new THREE.Vector3(x, y, -PD / 2 + inset)), piping));
  pack.add(new THREE.Mesh(loopTube(PW - inset * 2, PD - inset * 2, PR * .72, .013, (x, z) => new THREE.Vector3(x, -PB / 2 + inset, z)), piping));
  const zipper = new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: .5, metalness: .3 });
  pack.add(new THREE.Mesh(loopTube(PW + .004, PD + .004, PR, .009, (x, z) => new THREE.Vector3(x, PB / 2 - .035, z)), zipper));
  const pull = new THREE.Mesh(new THREE.BoxGeometry(.035, .08, .012), piping); pull.position.set(PW / 2 - .12, PB / 2 - .075, PD / 2 + .03); pack.add(pull);
  // manijas laterales celestes
  [-1, 1].forEach(side => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(side * (PW / 2 + .005), PB / 2 - .16, -.22), new THREE.Vector3(side * (PW / 2 + .1), PB / 2 - .06, -.08), new THREE.Vector3(side * (PW / 2 + .1), PB / 2 - .06, .08), new THREE.Vector3(side * (PW / 2 + .005), PB / 2 - .16, .22)]);
    pack.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, .02, 8, false), piping));
  });
  // tiras de la espalda (mochila)
  [-1, 1].forEach(side => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(side * .2, PB / 2 - .1, -PD / 2 - .01), new THREE.Vector3(side * .23, .05, -PD / 2 - .12), new THREE.Vector3(side * .27, -PB / 2 + .12, -PD / 2 - .02)]);
    const s = new THREE.Mesh(new THREE.TubeGeometry(c, 30, .045, 10, false), plainRed); s.scale.x = .6; pack.add(s);
  });
  // tapa con bisagra atrás: arriba roja, abajo plateada
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, PB / 2 + .002, -PD / 2); pack.add(lidPivot);
  const lid = new THREE.Mesh(roundedBox(PW + .012, PL, PD + .012, PR, 10, .012), [plainRed, plainRed, plainRed, foil, plainRed, plainRed]);
  lid.position.set(0, PL / 2, PD / 2); lidPivot.add(lid);
  lid.add(new THREE.Mesh(loopTube(PW - inset * 2, PD - inset * 2, PR * .72, .013, (x, z) => new THREE.Vector3(x, PL / 2 - inset, z)), piping));
  const handle = new THREE.Group(); handle.position.set(0, PL / 2, 0); lid.add(handle);
  const hc = new THREE.CatmullRomCurve3([new THREE.Vector3(-.24, 0, 0), new THREE.Vector3(-.17, .13, 0), new THREE.Vector3(0, .17, 0), new THREE.Vector3(.17, .13, 0), new THREE.Vector3(.24, 0, 0)]);
  const strap = new THREE.Mesh(new THREE.TubeGeometry(hc, 40, .03, 10, false), piping); strap.scale.z = .45; handle.add(strap);
  [-1, 1].forEach(s => { const tab = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, .07), piping); tab.position.set(s * .24, .005, 0); handle.add(tab); });
  // la luz de adentro (el botín)
  const boxGlow = makeShaft('#ffdca0', .46, 1.7, 4.6, { fadeStart: .15, fadeEnd: 1 });
  boxGlow.rotation.x = Math.PI; boxGlow.position.y = PB / 2; pack.add(boxGlow);
  const boxHalo = glowSprite('#ffc878', 3.8); boxHalo.position.y = PB / 2 + .3; pack.add(boxHalo);
  const boxLight = new THREE.PointLight('#ffe2b8', 0, 6, 1.3); boxLight.position.set(0, PB / 2 - .12, 0); pack.add(boxLight);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(PW - .08, PD - .08), new THREE.MeshBasicMaterial({ map: radialTexture('#ffd08a', [[0, 1], [.45, .55], [1, 0]]), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.y = PB / 2 - .06; pack.add(mouth);
  pack.visible = false;
  fg.add(pack);

  // Texturas de la mochila (frente, costados, espalda) con el logo derecho de las mochilas actuales
  const bandH = .27;
  const packTex = draw => {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    const r = document.createElement('canvas'); r.width = r.height = 256; const rg = r.getContext('2d');
    g.fillStyle = PACK_RED; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#8d9095'; g.fillRect(0, 1024 * (1 - bandH), 1024, 1024 * bandH);
    rg.fillStyle = '#d0d0d0'; rg.fillRect(0, 0, 256, 256); rg.fillStyle = '#5a5a5a'; rg.fillRect(0, 256 * (1 - bandH), 256, 256 * bandH);
    draw?.(g);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    return fabric(map, new THREE.CanvasTexture(r));
  };
  const logosReady = Promise.all([loadImage('assets/img/peya-iso-derecho.svg'), loadImage('assets/img/peya-wordmark-derecho.svg')]).then(([iso, word]) => {
    const frontT = packTex(g => { g.drawImage(iso, 512 - 200, 120, 400, 321); g.drawImage(word, 512 - 330, 480, 660, 171); });
    const sideT = packTex(g => { g.drawImage(word, 512 - 300, 360, 600, 156); });
    const backT = packTex();
    base.material = [sideT, sideT, hidden, greyBand, frontT, backT];
    paintBag(iso, word);
  }).catch(() => {});

  // La bolsa de papel de PedidosYa: roja, logo impreso color kraft, fuelles con pliegue, manijas de papel,
  // adentro kraft. Sale de la mochila cuando se abre (el botín) y en el cierre queda parada al lado.
  const bag = new THREE.Group();
  const GW = .67, GH = .74, GD = .27, KRAFT = '#c99f68', BAG_RED = '#d22a2d';
  const paperBump = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { const v = Math.random() > .5 ? 200 : 60; g.fillStyle = `rgba(${v},${v},${v},.16)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 7, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
  })();
  const paper = (color, map) => new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : color, map: map || null, roughness: .88, metalness: 0, bumpMap: paperBump, bumpScale: .35 });
  const kraftMat = paper(KRAFT), kraftIn = paper('#b98c55'); kraftIn.side = THREE.BackSide;
  const bagRed = paper(BAG_RED);
  // pliegue en V de los fuelles: los costados se hunden hacia el centro
  const crease = (geo, w, d, depth) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (Math.abs(Math.abs(x) - w / 2) < 1e-4) p.setX(i, x - Math.sign(x) * depth * (1 - Math.abs(z) / (d / 2)));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const bagOuter = new THREE.Mesh(crease(new THREE.BoxGeometry(GW, GH, GD, 1, 6, 2), GW, GD, .05), [bagRed, bagRed, hidden, kraftMat, bagRed, bagRed]);
  const bagInner = new THREE.Mesh(crease(new THREE.BoxGeometry(GW - .01, GH - .008, GD - .01, 1, 6, 2), GW - .01, GD - .01, .05), [kraftIn, kraftIn, hidden, kraftIn, kraftIn, kraftIn]);
  bag.add(bagOuter, bagInner);
  const cordMat = paper(KRAFT);
  [1, -1].forEach(side => {
    const zc = side * (GD / 2 - .004);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-.13, GH / 2 - .04, zc), new THREE.Vector3(-.115, GH / 2 + .08, zc), new THREE.Vector3(0, GH / 2 + .135, zc), new THREE.Vector3(.115, GH / 2 + .08, zc), new THREE.Vector3(.13, GH / 2 - .04, zc)]);
    bag.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, .011, 8, false), cordMat));
  });
  bag.visible = false;
  fg.add(bag);
  function paintBag(iso, word) {
    const tint = (img, w, h) => { // el logo blanco pasado a color kraft (como la impresión sobre el papel)
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'source-in'; g.fillStyle = KRAFT; g.fillRect(0, 0, w, h);
      return c;
    };
    const face = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.fillStyle = BAG_RED; g.fillRect(0, 0, w, h);
      draw(g, w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      return paper(null, t);
    };
    const frontM = face(920, 1024, (g, w) => {
      g.drawImage(tint(iso, 300, 241), w / 2 - 150, 250, 300, 241);
      g.drawImage(tint(word, 600, 156), w / 2 - 300, 540, 600, 156);
    });
    const sideM = face(380, 1024, (g, w, h) => {
      g.fillStyle = KRAFT; g.fillRect(0, h * .76, w, h * .24);
      g.fillStyle = BAG_RED; g.font = '900 34px Archivo, sans-serif'; g.textAlign = 'center';
      g.fillText('DESCARGÁ', w / 2, h * .86); g.fillText('LA APP', w / 2, h * .86 + 40);
    });
    bagOuter.material = [sideM, sideM, hidden, kraftMat, frontM, frontM];
  }

  // ═════ CÁMARA: un punto de vista de la sala por sección ═════
  const SHOTS = {
    portada: [[0, 4.7, 5.8], [0, 3.9, -12]],
    idea: [[-2.6, 4.0, 3.2], [1.2, 3.3, -12]],
    damian: [[6.4, 3.1, .4], [-1.6, 1.7, -4.8]],
    formato: [[-3.4, 3.4, 2.4], [1.6, 3.5, -12]],
    guion: [[0, 4.6, 5.4], [0, 3.9, -12]],
    serie: [[-5.4, 3.3, 1.4], [-8, 3.6, -5.5]],
    claves: [[0, 7, 6.4], [0, 3.4, -12]],
    produccion: [[4.4, 3.4, -.6], [-2.2, 2.2, -8.5]],
    cierre: [[0, 3.9, .8], [0, 4, -12]],
  };
  const camPos = new THREE.Vector3(...SHOTS.portada[0]), camLook = new THREE.Vector3(...SHOTS.portada[1]);
  const tgtPos = camPos.clone(), tgtLook = camLook.clone();
  camera.position.copy(camPos); camera.lookAt(camLook);

  // Estado: valores objetivo (los manda app.js) y actuales (se acercan con inercia)
  const target = { beam: 1, house: .85, screen: .85, hero: 0, arrival: 0, after: 0, end: 0, fin: 0, section: 'portada', vel: 0, packOn: true };
  const cur = { beam: 1, house: .85, screen: .85, hero: 0, arrival: 0, after: 0, end: 0, fin: 0, vel: 0, px: 0, py: 0, drag: 0 };
  const ptr = { x: 0, y: 0 };
  let dragX = 0, dragging = false, lastX = 0, handleSwing = 0, handleVel = 0, landed = false;

  function layout() {
    const w = innerWidth, h = innerHeight;
    view.w = w; view.h = h; view.aspect = w / h; view.mobile = w <= 900;
    renderer.setSize(w, h, false);
    camera.aspect = view.aspect; camera.updateProjectionMatrix();
    dMat.uniforms.uPx.value = renderer.getPixelRatio();
  }
  layout();
  addEventListener('resize', layout);

  addEventListener('pointerdown', e => { if (target.section === 'cierre' && !e.target.closest('a,button,.hud,.island')) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('pointermove', e => { if (dragging) { dragX += (e.clientX - lastX) * .008; lastX = e.clientX; } });

  const clock = new THREE.Clock();
  let running = true, firstFrame = null;
  const firstFramePromise = new Promise(ok => { firstFrame = ok; });
  const tmp = new THREE.Vector3();

  let dpr = DPR_MAX;
  const stats = { cpu: 0, dpr: DPR_MAX };
  // Resolución adaptable: mide el promedio en ventanas de 2 s; baja si queda por debajo de ~40 cuadros por segundo
  // dos ventanas seguidas, y vuelve a subir cuando sobra margen. Los saltos de carga no cuentan.
  let winT = 0, winN = 0, slowWins = 0, fastWins = 0;
  const adaptFrom = performance.now() + 4000;
  function adapt(dtRaw) {
    if (performance.now() < adaptFrom || dtRaw > .1) return;
    winT += dtRaw; winN++;
    if (winT < 2) return;
    const fps = winN / winT; winT = 0; winN = 0;
    if (fps < 40) { slowWins++; fastWins = 0; } else if (fps > 57) { fastWins++; slowWins = 0; } else { slowWins = fastWins = 0; }
    if (slowWins >= 2 && dpr > .75) { dpr = Math.max(.75, dpr - .25); slowWins = 0; renderer.setPixelRatio(dpr); layout(); }
    else if (fastWins >= 4 && dpr < DPR_MAX) { dpr = Math.min(DPR_MAX, dpr + .25); fastWins = 0; renderer.setPixelRatio(dpr); layout(); }
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const fStart = performance.now();
    const dtRaw = clock.getDelta();
    adapt(dtRaw);
    const dt = Math.min(dtRaw, .05), t = clock.elapsedTime;
    const k = reduced ? 30 : 4.2;
    cur.beam = damp(cur.beam, target.beam, 2.2, dt);
    cur.house = damp(cur.house, target.house, 1.6, dt);
    cur.screen = damp(cur.screen, target.screen, 2, dt);
    cur.hero = target.hero; // va pegado al scroll de la página (Lenis ya lo suaviza)
    cur.arrival = damp(cur.arrival, target.arrival, k * .9, dt);
    cur.after = damp(cur.after, target.after, k, dt);
    cur.end = damp(cur.end, target.end, k, dt);
    cur.fin = damp(cur.fin, target.fin, k, dt);
    cur.vel = damp(cur.vel, target.vel, 5, dt);
    cur.px = damp(cur.px, ptr.x, 2.4, dt); cur.py = damp(cur.py, ptr.y, 2.4, dt);
    cur.drag = damp(cur.drag, dragX, 6, dt);

    // cámara: viaja entre puntos de vista de la sala, con un poco de paralaje del cursor
    const camK = reduced ? 30 : 1.5, sway = reduced ? 0 : 1;
    camPos.x = damp(camPos.x, tgtPos.x, camK, dt); camPos.y = damp(camPos.y, tgtPos.y, camK, dt); camPos.z = damp(camPos.z, tgtPos.z, camK, dt);
    camLook.x = damp(camLook.x, tgtLook.x, camK, dt); camLook.y = damp(camLook.y, tgtLook.y, camK, dt); camLook.z = damp(camLook.z, tgtLook.z, camK, dt);
    camera.position.set(camPos.x + cur.px * .35 * sway, camPos.y - cur.py * .2 * sway + Math.sin(t * .4) * .03 * sway, camPos.z);
    tmp.copy(camLook); tmp.y += cur.vel * -.6;
    camera.lookAt(tmp);

    // sala: luces de sala, pantalla, haz y polvo
    const flick = reduced ? 1 : .9 + .1 * Math.sin(t * 17) * Math.sin(t * 5.3);
    sconceMat.color.copy(sconceColor).multiplyScalar(.25 + 1.6 * cur.house);
    sconceGlows.forEach(g => { g.material.opacity = .12 + .55 * cur.house; });
    houseL.intensity = houseR.intensity = 3 + 16 * cur.house;
    screenLight.intensity = 70 * flick;
    beam.userData.mat.uniforms.uTime.value = t;
    beam.userData.mat.uniforms.uOpacity.value = .085 * cur.beam * flick;
    lens.material.opacity = .9 * cur.beam;
    dMat.uniforms.uTime.value = reduced ? 0 : t;
    dMat.uniforms.uOpacity.value = .55 + .45 * cur.beam;
    if (film.paused) film.play().catch(() => {});

    const vis = visible(6), mob = view.mobile;

    // portada: el celular y la mochila suben con la página, como un swipe (sin zoom ni corte)
    const hp = cur.hero, lift = hp * vis.h;
    const coverOn = hp < .999; // con 1 la portada ya se fue: el celular y la mochila quedan fuera de cuadro
    phone.visible = coverOn;
    if (coverOn) {
      const s = mob ? .7 : 1.25;
      const bob = reduced ? 0 : Math.sin(t * .9) * .035;
      phone.scale.setScalar(s);
      phone.position.set(mob ? -vis.w * .1 : vis.w * .21, (mob ? -vis.h * .2 : -.03) + bob + lift, -6);
      phone.rotation.set(-.1 + cur.py * .12, -.5 + cur.px * .2 + cur.vel * .2, .06);
      if (video.paused) video.play().catch(() => {});
    } else if (!video.paused) video.pause();

    // la mochila: cae al lado del celular en cámara lenta, rebota como tela, se abre la tapa, sale la luz
    // y de adentro sube la bolsa de PedidosYa (el botín). Después queda al lado del celular.
    const a = cur.arrival, af = cur.after, en = cur.end;
    const inArrival = target.section === 'guion' && target.packOn && a > .02;
    const inEnd = target.section === 'cierre' && en > .01;
    pack.visible = coverOn || inArrival || inEnd;
    bag.visible = false;
    let glowK = 0, bagRise = 0;
    if (coverOn) {
      const sc = mob ? .4 : .6, bob = reduced ? 0 : Math.sin(t * .8 + 1.4) * .03;
      pack.scale.setScalar(sc);
      pack.position.set(mob ? vis.w * .23 : vis.w * .33, (mob ? -vis.h * .3 : -vis.h * .245) + bob + lift, -5.4);
      pack.rotation.set(.3 + cur.py * .06, -.62 + cur.px * .22 + cur.vel * .25 + (reduced ? 0 : Math.sin(t * .35) * .1), 0);
      lidPivot.rotation.x = 0;
    } else if (inArrival) {
      const drop = clamp((a - .04) / .46), land = easeOutCubic(drop);
      const squash = drop > .82 ? Math.sin((drop - .82) / .18 * Math.PI) : 0;
      const sc = (mob ? .52 : .82) * lerp(1, mob ? .9 : .8, easeOutCubic(af));
      const px = mob ? vis.w * .24 : vis.w * lerp(.19, .215, af);
      const yLand = mob ? vis.h * .12 : -vis.h * lerp(.03, .06, af);
      pack.scale.set(sc * (1 + .05 * squash), sc * (1 - .08 * squash), sc * (1 + .05 * squash));
      pack.position.set(px, lerp(vis.h * .78, yLand, land), -6);
      pack.rotation.set(lerp(.2, .46, land) + Math.sin(drop * Math.PI) * .2, lerp(-2.3, -.5, land) + cur.vel * .3, Math.sin(drop * Math.PI) * -.15);
      if (drop >= .999 && !landed) { landed = true; handleVel += 2.2; }
      if (drop < .9) landed = false;
      lidPivot.rotation.x = -1.78 * easeOutBack(smooth(.52, .8, a), 1.1);
      glowK = smooth(.6, .86, a) * (1 - .45 * af);
      // la bolsa sube desde adentro de la mochila y queda flotando arriba, girando despacio
      const rise = smooth(.64, .97, a);
      bagRise = rise;
      if (rise > .001) {
        bag.visible = true;
        const r = easeOutCubic(rise), bob = reduced ? 0 : Math.sin(t * 1.3) * .02, BS = 1.25;
        bag.scale.setScalar(sc * BS * lerp(.5, 1, r));
        bag.position.set(px - lerp(0, .34, r) * sc, pack.position.y + lerp(-.2, PB / 2 + GH * BS / 2 + .02, r) * sc + bob, -6 + lerp(0, .5, r) * sc);
        bag.rotation.set(lerp(.35, .1, r), pack.rotation.y + lerp(0, .5, r) + (reduced ? 0 : Math.sin(t * .6) * .16), (reduced ? 0 : Math.sin(t * .9) * .04));
      }
    } else if (inEnd) {
      const e = easeOutCubic(en);
      const sc = (mob ? .32 : .6) * lerp(.7, 1, e);
      pack.scale.setScalar(sc);
      pack.position.set(mob ? -vis.w * .26 : -vis.w * .34, lerp(-vis.h * .9, mob ? -vis.h * .16 : -vis.h * .3, e), -6.6);
      pack.rotation.set(.22, -.5 + t * (reduced ? 0 : .12) + cur.drag, 0);
      lidPivot.rotation.x = -1.9;
      glowK = e;
      // la bolsa, parada al lado de la mochila
      bag.visible = true;
      bag.scale.setScalar(sc);
      const ry = pack.rotation.y;
      const ox = (PW / 2 + GW / 2 + .1) * sc;
      bag.position.set(pack.position.x + Math.cos(ry) * ox, pack.position.y + (GH / 2 - PB / 2) * sc, pack.position.z - Math.sin(ry) * ox);
      bag.rotation.set(.22, ry + .35, 0);
    }
    // manija: péndulo amortiguado (se mueve sola cuando la mochila aterriza)
    handleVel += (-handleSwing * 40 - handleVel * 4.5) * dt; handleSwing += handleVel * dt;
    handle.rotation.x = reduced ? 0 : handleSwing * .5;
    mouth.material.opacity = glowK;
    foilIn.emissiveIntensity = glowK * 1.8; foil.emissiveIntensity = glowK * .6;
    boxGlow.userData.mat.uniforms.uTime.value = t;
    boxGlow.userData.mat.uniforms.uOpacity.value = glowK * 2.2 * (1 - .78 * bagRise); // cuando sale la bolsa, la luz se calma y se ve el logo
    screenMat.color.setScalar(cur.screen * (1 - .5 * glowK * (inArrival ? 1 : 0)));
    boxHalo.material.opacity = glowK;
    boxLight.intensity = glowK * 26;
    if (pack.visible) { pack.updateMatrixWorld(true); dMat.uniforms.uGlow.value.setFromMatrixPosition(boxHalo.matrixWorld); }
    dMat.uniforms.uGlowK.value = pack.visible ? glowK * .8 : 0;
    rim.intensity = 30 * (.5 + .5 * Math.max(cur.beam, glowK));

    renderer.render(scene, camera);
    stats.cpu = stats.cpu * .95 + (performance.now() - fStart) * .05; stats.dpr = dpr;
    if (firstFrame) { firstFrame(); firstFrame = null; }
  }
  frame();

  const whenData = v => new Promise(ok => { if (v.readyState >= 2) return ok(); v.addEventListener('loadeddata', ok, { once: true }); setTimeout(ok, 6000); });
  video.play().catch(() => {}); film.play().catch(() => {});
  const ready = Promise.all([firstFramePromise, whenData(video), whenData(film), logosReady]);

  // [haz, luces de sala, brillo de la pantalla]: las luces bajan cuando empieza «la película» y suben al final;
  // la pantalla se atenúa detrás de las secciones con texto para que se lea
  const LIGHTS = {
    portada: [1, .85, .85], idea: [.8, .6, .34], damian: [.55, .75, .34], formato: [.7, .4, .4], guion: [.9, .2, .45],
    serie: [.4, .9, .38], claves: [1, .45, .3], produccion: [.5, .8, .3], cierre: [.7, 1, .42],
  };
  return {
    ready,
    stats,
    setSection(id) {
      target.section = id;
      const shot = SHOTS[id] || SHOTS.guion;
      const m = view.mobile ? 1.25 : 1; // en vertical la cámara se aleja un poco para que entre la sala
      tgtPos.set(shot[0][0] * m, shot[0][1], shot[0][2] + (view.mobile ? 1.6 : 0));
      tgtLook.set(...shot[1]);
      const [b, h, sc] = LIGHTS[id] || [.6, .6, .4];
      target.beam = b; target.house = h; target.screen = sc;
    },
    setHero(p) { target.hero = clamp(p); },
    setArrival(a, after = 0, on = true) { target.arrival = clamp(a); target.after = clamp(after); target.packOn = on; },
    setEnd(e, fin = 0) { target.end = clamp(e); target.fin = clamp(fin); },
    pointer(x, y) { ptr.x = x; ptr.y = y; },
    setVelocity(v) { target.vel = clamp(v, -1, 1); },
    pause(state) { running = !state; if (state) { video.pause(); film.pause(); } },
  };
}
