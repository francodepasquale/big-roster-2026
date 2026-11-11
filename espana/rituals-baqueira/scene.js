// Escena 3D · Rituals × BIG
// Caja de regalo granate con cinta dorada y la baldosa del logo de Rituals en el frente. Geometría procedural.
// La tapa se abre con el scroll de la portada (con su lazo): dentro asoman papeles de seda de colores
// y una bruma The Ritual of Sakura, y salen destellos dorados.
// La caja no tiene coordenadas fijas: se posa en los huecos [data-box] del HTML (portada, propuesta, cierre)
// y viaja entre ellos; cada hueco dice si la caja va abierta (data-open="1"), cerrada ("0") o según el scroll.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const LOGO = 'assets/img/rituals-baldosa.webp';
const W = 2.3, D = 1.6, HB = 1.35, HL = .4, LIP = .05;   // ancho, fondo, alto del cuerpo, alto de la tapa
const BASE = -1.05;                                       // la base de la caja (el grupo se centra en su alto total)
const H_WORLD = 2.15, ASPECT = 1.42;                      // alto y proporción aproximados en pantalla
const LIGHT_SNOW = new THREE.Color('#D8CAB6'), DARK_SNOW = new THREE.Color('#FFFFFF');

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // interpolación exponencial, independiente de los fps
const lerp = THREE.MathUtils.lerp;

function loadTexture(src) {
  return new Promise((ok, ko) => new THREE.TextureLoader().load(src, ok, undefined, ko));
}

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;   // el relleno se recorta en el borde de la caja: nunca asoma por fuera

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .75;

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  camera.position.set(0, 0, 14);

  const key = new THREE.DirectionalLight('#FFF1DF', 1.8); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#E8C3BE', 1.2); rim.position.set(5, 2, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#FFF8EE', '#3a1a12', .6));

  // ── Estado: lo escribe app.js (scroll y tono de sección) y el puntero
  const state = { coverOpen: 0, dark: 0, px: 0, py: 0 };
  const sm = { dark: 0, px: 0, py: 0 };
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
    gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();

  // ── Nieve en todo el recorrido (fuera con movimiento reducido)
  const SNOW = reduced ? 0 : mobile ? 240 : 520;
  const snowPos = new Float32Array(SNOW * 3), snowV = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    snowPos[i * 3] = (Math.random() - .5) * 2 * (hW + 2);
    snowPos[i * 3 + 1] = (Math.random() - .5) * 2 * (hH + 1);
    snowPos[i * 3 + 2] = -5 + Math.random() * 7;
    snowV[i] = .22 + Math.random() * .5;
  }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ size: mobile ? .085 : .07, map: dotTex, color: LIGHT_SNOW.clone(), transparent: true, depthWrite: false });
  if (SNOW) scene.add(new THREE.Points(snowGeo, snowMat));

  // ── La caja
  const box = new THREE.Group();

  // Papel de la caja: granate con un relieve de rombos finos (el aspa del logo), dibujado en canvas
  const paperTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#5A0D1B'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#681526'; g.lineWidth = 3;
    for (let i = -256; i <= 512; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
      g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 1.6);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const paper = new THREE.MeshPhysicalMaterial({ map: paperTex, roughness: .55, sheen: 1, sheenColor: new THREE.Color('#D88A96'), sheenRoughness: .45, clearcoat: .25, clearcoatRoughness: .4 });
  const inside = new THREE.MeshStandardMaterial({ color: '#F3E6D6', roughness: .9 });      // fondo de papel crema
  const gold = new THREE.MeshPhysicalMaterial({ color: '#CDA668', metalness: .9, roughness: .26, clearcoat: .7 });

  // Caja con cantos redondeados: un rectángulo redondeado extruido hacia arriba, con bisel
  function roundedBox(w, h, d, r = .07, bev = .03) {
    const sw = w - bev * 2, sd = d - bev * 2, x = -sw / 2, y = -sd / 2;
    const sh = new THREE.Shape();
    sh.moveTo(x + r, y); sh.lineTo(x + sw - r, y); sh.quadraticCurveTo(x + sw, y, x + sw, y + r);
    sh.lineTo(x + sw, y + sd - r); sh.quadraticCurveTo(x + sw, y + sd, x + sw - r, y + sd);
    sh.lineTo(x + r, y + sd); sh.quadraticCurveTo(x, y + sd, x, y + sd - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.translate(0, -(h - bev * 2) / 2, 0);
    return g;
  }

  // Cuerpo: la tapa de arriba del sólido hace de fondo de papel crema (se ve al abrir)
  const body = new THREE.Mesh(roundedBox(W, HB, D), [inside, paper]);
  body.position.y = BASE + HB / 2;
  box.add(body);

  // Cinta vertical sobre el cuerpo (frente, atrás) y horizontal alrededor
  const RB = .2, RT = .016, RX = -W * .22;
  const ribV = new THREE.Mesh(new THREE.BoxGeometry(RB, HB, D + RT * 2), gold); ribV.position.set(RX, body.position.y, 0); box.add(ribV);
  const ribH = new THREE.Mesh(new THREE.BoxGeometry(W + RT * 2, RB * .8, D + RT * 2), gold); ribH.position.set(0, BASE + HB * .2, 0); box.add(ribH);

  // Logo en el frente, a la derecha de la cinta
  const logoMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55 });
  const LS = .66;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(LS, LS), logoMat);
  logo.position.set(W * .19, BASE + .86, D / 2 + .006);
  box.add(logo);

  // ── Relleno: papeles de seda, productos Rituals y detalles de Navidad.
  // Viven dentro de la caja cerrada (el cuerpo los tapa) y suben al abrir.
  const Y0 = BASE + HB;                       // altura del borde
  const fill = new THREE.Group(); box.add(fill);
  const crumple = (w, h, seed, amp = 1) => {
    const g = new THREE.PlaneGeometry(w, h, 18, 14), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const edge = 1 - Math.min(1, Math.hypot(x / w, y / h) * 1.5);
      const z = Math.sin(x * 8 + seed) * Math.cos(y * 6 - seed * 2) * .06 + Math.sin(x * 19 + y * 13 + seed) * .022 + Math.abs(Math.sin(x * 4 - y * 3 + seed)) * .05;
      p.setZ(i, z * amp * (.45 + edge));
      p.setY(i, y + Math.sin(x * 5 + seed) * .035);
    }
    g.computeVertexNormals(); return g;
  };
  const tissueMat = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .8, sheen: .8, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .6, side: THREE.DoubleSide });
  const TISSUE = ['#F2C4BE', '#E9B04F', '#E7A9A4', '#F6E3D3', '#C9707E', '#F4D6D0', '#D9B36E'];
  // Cama de papel que tapa todo el fondo
  const bed = new THREE.Mesh(crumple(W * .96, D * .92, 3.1, 1.4), tissueMat('#F0CFC8'));
  bed.rotation.x = -Math.PI / 2; bed.position.y = Y0 + .03; fill.add(bed);
  // Hojas sueltas que asoman por los bordes y entre los productos
  const sheets = [
    [-.62, .05, .35, -.5, 1.1], [-.38, -.32, .55, .35, 1], [-.08, .36, .3, -.2, 1.1], [.36, -.34, .5, .5, 1],
    [.6, .08, .38, .6, 1.05], [.12, -.04, .45, .1, 1.15], [-.5, .4, .28, -.9, .9], [.5, .42, .3, 1.1, .9],
    [-.2, -.1, .6, 2.1, 1.05], [.28, .2, .5, -1.6, 1], [-.66, -.36, .4, .9, .85], [.66, -.3, .42, -.7, .85],
    [-.8, .2, .5, 1.4, .8], [.82, -.05, .5, -1.3, .8],
  ];
  sheets.forEach(([x, z, lean, turn, s], i) => {
    const m = new THREE.Mesh(crumple(.9 * s, .78 * s, i * 1.7), tissueMat(TISSUE[i % TISSUE.length]));
    m.position.set(x * W * .4, Y0 - .02, z * D * .36);
    m.rotation.set(-Math.PI / 2 + (z < 0 ? -1 : 1) * lean + (z < 0 ? .45 : -.45), turn, x * .4);
    fill.add(m);
  });

  // Productos (formas sencillas, con la baldosa del logo como etiqueta)
  const label = (size, y, r) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(size, size), logoMat); l.position.set(0, y, r + .003); return l; };
  const pops = [];
  const put = (obj, x, y, z, rx = 0, ry = 0, rz = 0) => { obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); obj.userData.y = y; obj.userData.rz = rz; fill.add(obj); pops.push(obj); return obj; };

  // The Ritual of Sakura: bruma en frasco rosado, tapón blanco
  const mist = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: '#F3BEB9', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .92 });
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, 1.05, 48), glass); mb.position.y = .525; mist.add(mb);
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(.12, .19, .06, 48), glass); ms.position.y = 1.08; mist.add(ms);
  const mc = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .32, 48), new THREE.MeshPhysicalMaterial({ color: '#FBFAF7', roughness: .3, clearcoat: .7 })); mc.position.y = 1.27; mist.add(mc);
  mist.add(label(.17, .8, .19));
  put(mist, .3, Y0 - .55, .02, -.06, .3, -.1);

  // Vela perfumada: vaso oscuro con tapa dorada
  const candle = new THREE.Group();
  const cg = new THREE.Mesh(new THREE.CylinderGeometry(.27, .25, .46, 48), new THREE.MeshPhysicalMaterial({ color: '#2B2421', roughness: .25, clearcoat: 1, clearcoatRoughness: .1 })); cg.position.y = .23; candle.add(cg);
  const cl = new THREE.Mesh(new THREE.CylinderGeometry(.285, .285, .06, 48), gold); cl.position.y = .49; candle.add(cl);
  candle.add(label(.2, .26, .26));
  put(candle, -.62, Y0 - .1, -.3, .05, -.25, .12);

  // Espuma de ducha: lata rosada con tapón blanco redondeado
  const foam = new THREE.Group();
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .72, 40), new THREE.MeshPhysicalMaterial({ color: '#E9AFAE', metalness: .35, roughness: .3, clearcoat: .8 })); fb.position.y = .36; foam.add(fb);
  const fc = new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#FBFAF7', roughness: .3, clearcoat: .6 })); fc.position.y = .72; fc.scale.y = 1.2; foam.add(fc);
  foam.add(label(.14, .45, .15));
  put(foam, .8, Y0 - .38, -.24, -.1, -.4, -.28);

  // Crema corporal: tarro ancho blanco con tapa rosa
  const jar = new THREE.Group();
  const jb = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, 48), new THREE.MeshPhysicalMaterial({ color: '#F7F1EA', roughness: .35, clearcoat: .5 })); jb.position.y = .1; jar.add(jb);
  const jl = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .1, 48), new THREE.MeshPhysicalMaterial({ color: '#E7B4AF', roughness: .3, clearcoat: .6 })); jl.position.y = .24; jar.add(jl);
  put(jar, -.12, Y0 - .1, .36, .22, 0, .08);

  // Bolas de Navidad
  const ballMat = c => new THREE.MeshPhysicalMaterial({ color: c, metalness: .7, roughness: .18, clearcoat: 1 });
  [[-.9, .1, .32, '#CDA668'], [.05, .12, -.42, '#8E1A2E'], [.6, .08, .4, '#CDA668'], [-.32, .1, -.45, '#E8C3BE']].forEach(([x, y, z, c]) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 20), ballMat(c)));
    const k = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .05, 16), gold); k.position.y = .14; g.add(k);
    put(g, x, Y0 + y, z, .3, 0, .4);
  });

  // Flores de cerezo (Sakura): cinco pétalos y el centro dorado
  const petalGeo = new THREE.SphereGeometry(.055, 16, 10); petalGeo.scale(1, .28, .62); petalGeo.translate(.05, 0, 0);
  const petalMat = new THREE.MeshPhysicalMaterial({ color: '#F6C9CF', roughness: .5, sheen: 1, sheenColor: new THREE.Color('#ffffff') });
  const coreGeo = new THREE.SphereGeometry(.022, 10, 8);
  [[-.75, .2, -.05], [-.3, .16, .12], [.62, .18, .12], [.15, .2, .3], [-.05, .17, -.22], [.95, .14, .1], [-.55, .2, .42]].forEach(([x, y, z], i) => {
    const f = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(petalGeo, petalMat); p.rotation.y = k * Math.PI * 2 / 5; f.add(p); }
    f.add(new THREE.Mesh(coreGeo, gold));
    put(f, x, Y0 + y, z, .4 * Math.sin(i * 2.3), i, .3 * Math.cos(i));
  });

  // Ramitas de abeto
  const needleGeo = new THREE.ConeGeometry(.018, .16, 5); needleGeo.rotateZ(Math.PI / 2); needleGeo.translate(.08, 0, 0);
  const needleMat = new THREE.MeshStandardMaterial({ color: '#2E5A43', roughness: .7 });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5A3B26', roughness: .8 });
  [[-.8, -.3, .35, .6], [.78, .3, -.35, -.5]].forEach(([x, z, rz, ry]) => {
    const sp = new THREE.Group();
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .7, 8), stemMat); st.position.y = .35; sp.add(st);
    for (let k = 0; k < 22; k++) {
      const n = new THREE.Mesh(needleGeo, needleMat);
      n.position.y = .08 + k * .028; n.rotation.set(0, k * 2.4, .5 + (k % 2) * .25 - k * .012); n.scale.setScalar(1 - k * .02);
      sp.add(n);
    }
    put(sp, x * W * .45, Y0 - .3, z * D * .45, 0, ry, rz);
  });

  // Rizos de cinta dorada y rosa que saltan fuera
  [[-.25, .2, '#CDA668', 0], [.5, -.15, '#E8C3BE', 2], [-.7, -.05, '#CDA668', 4]].forEach(([x, z, c, ph]) => {
    const pts = [];
    for (let k = 0; k <= 60; k++) { const t = k / 60; pts.push(new THREE.Vector3(Math.cos(t * 9 + ph) * .1 * (1 - t * .3) + t * .3, t * .55, Math.sin(t * 9 + ph) * .1)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .012, 6), new THREE.MeshPhysicalMaterial({ color: c, metalness: .8, roughness: .25 }));
    tube.scale.set(1, 1, .35);
    put(tube, x, Y0 - .05, z, 0, ph, -.3);
  });

  // Tapa: pivota en el canto trasero superior para abrirse como una tapa de verdad
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, BASE + HB, -D / 2 - LIP);
  const lid = new THREE.Group(); lid.position.set(0, 0, D / 2 + LIP); lidPivot.add(lid);
  const lidBox = new THREE.Mesh(roundedBox(W + LIP * 2, HL, D + LIP * 2, .08, .035), [paper, paper]); lidBox.position.y = HL / 2 - .12; lid.add(lidBox);
  const lidRibA = new THREE.Mesh(new THREE.BoxGeometry(RB, HL + RT * 2, D + LIP * 2 + RT * 2), gold); lidRibA.position.set(RX, lidBox.position.y, 0); lid.add(lidRibA);
  // Lazo: dos lazadas (toros aplastados), el nudo y dos caídas
  const bowY = lidBox.position.y + HL / 2;
  const loopGeo = new THREE.TorusGeometry(.26, .06, 14, 40);
  [-1, 1].forEach(s => {
    const loop = new THREE.Mesh(loopGeo, gold);
    loop.position.set(RX + s * .25, bowY + .16, 0);
    loop.rotation.set(Math.PI / 2 * .25, s * .5, s * .9);
    loop.scale.set(1, .62, 1);
    lid.add(loop);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.12, .02, .5), gold);
    tail.position.set(RX + s * .12, bowY + .01, .28); tail.rotation.set(0, s * .5, 0);
    lid.add(tail);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), gold); knot.position.set(RX, bowY + .1, 0); knot.scale.set(1.2, .8, 1); lid.add(knot);
  box.add(lidPivot);

  // Plano de recorte en el borde de la caja: todo el relleno por debajo del borde no se dibuja.
  // Los materiales del relleno se clonan para no recortar la cinta ni el logo de fuera.
  const rimPlane = new THREE.Plane(), clipped = new Map();
  fill.traverse(o => {
    if (!o.isMesh) return;
    if (!clipped.has(o.material)) { const m = o.material.clone(); m.clippingPlanes = [rimPlane]; clipped.set(o.material, m); }
    o.material = clipped.get(o.material);
  });
  const nV = new THREE.Vector3(), pV = new THREE.Vector3(), nM = new THREE.Matrix3();
  function updateRim() {
    box.updateMatrixWorld();
    nM.getNormalMatrix(box.matrixWorld);
    nV.set(0, 1, 0).applyMatrix3(nM).normalize();
    pV.set(0, BASE + HB - .005, 0).applyMatrix4(box.matrixWorld);
    rimPlane.setFromNormalAndCoplanarPoint(nV, pV);
  }

  // Vapor y nieve que salen de la caja al abrirse y se desvanecen (una bocanada por apertura)
  const PUFF = reduced ? 0 : mobile ? 34 : 60;
  const puffTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const puffPos = new Float32Array(Math.max(PUFF, 1) * 3), puffCol = new Float32Array(Math.max(PUFF, 1) * 4);
  const puffGeo = new THREE.BufferGeometry();
  puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
  puffGeo.setAttribute('color', new THREE.BufferAttribute(puffCol, 4));
  const puffMat = new THREE.PointsMaterial({ size: .5, map: puffTex, vertexColors: true, transparent: true, depthWrite: false });
  const puffPts = new THREE.Points(puffGeo, puffMat); puffPts.visible = false; puffPts.renderOrder = 2; box.add(puffPts);
  // Copos que saltan con la bocanada
  const FLK = reduced ? 0 : mobile ? 40 : 70;
  const flkPos = new Float32Array(Math.max(FLK, 1) * 3), flkCol = new Float32Array(Math.max(FLK, 1) * 4);
  const flkGeo = new THREE.BufferGeometry();
  flkGeo.setAttribute('position', new THREE.BufferAttribute(flkPos, 3));
  flkGeo.setAttribute('color', new THREE.BufferAttribute(flkCol, 4));
  const flkPts = new THREE.Points(flkGeo, new THREE.PointsMaterial({ size: .085, map: dotTex, vertexColors: true, transparent: true, depthWrite: false }));
  flkPts.visible = false; flkPts.renderOrder = 3; box.add(flkPts);
  let burstT = 99, lastOpen = 0;
  const puffs = [], flakes = [];
  function burst() {
    burstT = 0;
    puffs.length = 0; flakes.length = 0;
    for (let i = 0; i < PUFF; i++) puffs.push({ x: (Math.random() - .5) * W * .8, z: (Math.random() - .5) * D * .7, vy: .7 + Math.random() * .9, vx: (Math.random() - .5) * .7, vz: (Math.random() - .5) * .5, life: 1.6 + Math.random() * 1.1, d: Math.random() * .35 });
    for (let i = 0; i < FLK; i++) flakes.push({ x: (Math.random() - .5) * W * .7, z: (Math.random() - .5) * D * .6, vy: 1.4 + Math.random() * 1.6, vx: (Math.random() - .5) * 1.6, vz: (Math.random() - .5) * 1, life: 1.4 + Math.random() * 1, d: Math.random() * .25 });
  }
  function stepBurst(dt) {
    if (burstT > 4) { puffPts.visible = flkPts.visible = false; return; }
    burstT += dt;
    puffPts.visible = flkPts.visible = true;
    const y0 = BASE + HB;
    puffs.forEach((p, i) => {
      const t = Math.max(0, burstT - p.d), k = Math.min(1, t / p.life);
      const ease = 1 - Math.pow(1 - k, 2);                       // suben rápido y se frenan
      puffPos[i * 3] = p.x + p.vx * ease; puffPos[i * 3 + 1] = y0 + .05 + p.vy * ease * 1.3; puffPos[i * 3 + 2] = p.z + p.vz * ease;
      const a = t <= 0 ? 0 : Math.sin(Math.PI * Math.min(1, k * 1.15)) * .8;   // aparece y se desvanece
      puffCol.set([1, .985, .97, a], i * 4);
    });
    flakes.forEach((f, i) => {
      const t = Math.max(0, burstT - f.d), k = Math.min(1, t / f.life);
      flkPos[i * 3] = f.x + f.vx * t * .6; flkPos[i * 3 + 1] = y0 + f.vy * t - .9 * t * t + .05; flkPos[i * 3 + 2] = f.z + f.vz * t * .6;
      flkCol.set([1, 1, 1, t <= 0 ? 0 : (1 - k) * .95], i * 4);
    });
    puffMat.size = .6 + burstT * .35;
    puffGeo.attributes.position.needsUpdate = puffGeo.attributes.color.needsUpdate = true;
    flkGeo.attributes.position.needsUpdate = flkGeo.attributes.color.needsUpdate = true;
  }

  // Destellos dorados que salen de la caja al abrirla
  const SP = reduced ? 0 : mobile ? 60 : 110;
  const spPos = new Float32Array(Math.max(SP, 1) * 3);
  const sparks = Array.from({ length: SP }, () => ({ p: Math.random(), v: .18 + Math.random() * .3, x: (Math.random() - .5) * W * .8, z: (Math.random() - .5) * D * .7, w: Math.random() * 6 }));
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({ size: .09, map: dotTex, color: '#E8C98F', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const spPoints = new THREE.Points(spGeo, spMat); box.add(spPoints);

  scene.add(box);
  box.scale.setScalar(0);

  const slots = [...document.querySelectorAll('[data-box]')];
  let anchor = null, sinceSwitch = 9, placed = false, scale = 1, open = 0, lastX = 0, shown = 0;

  // Salida con rebote (back-out): sube, se pasa un poco y se asienta
  const backOut = x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function applyOpen(o) {
    lidPivot.rotation.x = -1.9 * o;                // la tapa se abre hacia atrás
    lidPivot.position.y = BASE + HB + .55 * Math.sin(Math.PI * clamp01(o * 1.15)) * .5;
    // Los papeles suben primero; después cada producto sale por turnos con un pequeño rebote.
    // Lo que queda por debajo del borde lo recorta el plano: nada asoma fuera de la caja.
    fill.position.y = lerp(-.7, 0, smooth(.12, .6, o));
    fill.visible = o > .02;
    pops.forEach((p, i) => {
      const e = backOut(clamp01((o - .28 - (i % 9) * .035) / .5));
      p.position.y = p.userData.y - 1.2 * (1 - e);
      p.rotation.z = p.userData.rz + (1 - e) * (i % 2 ? .5 : -.5);
    });
  }

  // Hueco del HTML → posición y escala en la escena (plano z = 0)
  function place(r) {
    const hPx = Math.min(r.height, r.width / ASPECT);
    const cy = r.bottom - hPx / 2;
    return { x: ((r.left + r.width / 2) / innerWidth * 2 - 1) * hW, y: -(cy / innerHeight * 2 - 1) * hH, s: (hPx / innerHeight * 2 * hH) / H_WORLD };
  }

  const clock = new THREE.Clock();
  let running = true, raf = 0;

  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.dark = damp(sm.dark, state.dark, 3, dt);
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);
    snowMat.color.lerpColors(LIGHT_SNOW, DARK_SNOW, sm.dark);

    if (SNOW) {
      for (let i = 0; i < SNOW; i++) {
        const j = i * 3;
        snowPos[j + 1] -= snowV[i] * dt;
        snowPos[j] += Math.sin(t * .6 + i) * .0025;
        if (snowPos[j + 1] < -hH - 1.2) { snowPos[j + 1] = hH + 1.2; snowPos[j] = (Math.random() - .5) * 2 * (hW + 2); }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    // ¿En qué hueco se posa la caja? El más visible; si ninguno, se esconde abajo.
    let best = null, bestF = 0, bestR = null;
    for (const el of slots) {
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      const f = vis / Math.min(r.height, innerHeight);
      if (f > bestF) { bestF = f; best = el; bestR = r; }
    }
    if (bestF < .3) best = null;
    if (best !== anchor) { anchor = best; sinceSwitch = 0; }
    sinceSwitch += dt;

    // Si la caja está oculta, aparece directamente en su hueco (crece en el sitio, sin cruzar el contenido).
    // Si ya se ve, sigue al hueco con interpolación exponencial: va pegada al scroll, sin tirones.
    const k = lerp(4, 18, smooth(0, 1.2, sinceSwitch));
    if (best) {
      const p = place(bestR);
      const target = best.dataset.open === 'scroll' ? state.coverOpen : +best.dataset.open;
      if (!placed || shown < .02) { box.position.set(p.x, p.y, 0); scale = p.s; placed = true; open = best.dataset.open === 'scroll' ? target : 0; }
      box.position.x = damp(box.position.x, p.x, k, dt);
      box.position.y = damp(box.position.y, p.y, k, dt);
      scale = damp(scale, p.s, k, dt);
      open = damp(open, target, target > open ? 2.6 : 6, dt);   // abrir, sin prisa; cerrar, más rápido
    }
    shown = damp(shown, best ? 1 : 0, best ? 5 : 8, dt);
    box.scale.setScalar(scale * (.6 + .4 * smooth(0, 1, shown)) * Math.min(1, shown * 1.4));
    const vx = (box.position.x - lastX) / Math.max(dt, .001); lastX = box.position.x;
    box.rotation.y = -.5 + (reduced ? 0 : Math.sin(t * .4) * .12) + sm.px * .45;
    box.rotation.x = .2 + sm.py * .1;
    box.rotation.z = damp(box.rotation.z, THREE.MathUtils.clamp(-vx * .02, -.22, .22), 6, dt);
    box.visible = shown > .01;
    applyOpen(open);
    updateRim();
    if (open > .3 && lastOpen <= .3 && PUFF) burst();     // una bocanada cada vez que se abre
    lastOpen = open;
    stepBurst(dt);

    // Destellos: suben desde la boca de la caja solo cuando está abierta
    const glow = smooth(.25, .8, open);
    spMat.opacity = glow;
    sparks.forEach((s, i) => {
      const life = (s.p + t * s.v * .5) % 1;
      spPos[i * 3] = s.x * (1 + life * .5) + Math.sin(t * 1.5 + s.w) * .06;
      spPos[i * 3 + 1] = BASE + HB + life * 2.1;
      spPos[i * 3 + 2] = s.z * (1 + life * .4);
    });
    spGeo.attributes.position.needsUpdate = true;
    spMat.size = .09 * (.7 + .3 * Math.sin(t * 6));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  });

  const ready = loadTexture(LOGO).then(tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    logoMat.map = tex; logoMat.needsUpdate = true;
    renderer.compile(scene, camera);
    return new Promise(res => requestAnimationFrame(() => { renderer.render(scene, camera); res(); }));
  });
  raf = requestAnimationFrame(frame);

  return {
    ready,
    set(values) { Object.assign(state, values); },
    // Para generar la imagen de respaldo (plan B sin WebGL)
    snapshot() { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
  };
}
