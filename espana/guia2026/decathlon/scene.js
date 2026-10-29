// Escena 3D de «¿Nos vamos a Baqueira?»
// Protagonista: unas gafas de esquí con lente espejada que refleja Baqueira (la foto real hace de entorno).
// Alrededor: una cordillera procedural de nieve, pinos instanciados y nieve que el cursor sopla.
// app.js le pasa el capítulo activo y el progreso de la portada; aquí todo se interpola con damp().
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

// Contorno de la lente (superelipse con puente nasal). Lo usa también el visor SVG de la portada.
export function lensOutline(n = 180, a = 1, b = .5) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3.6);
    let y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3.1);
    if (s < 0) y += b * .46 * Math.exp(-Math.pow(x / (a * .2), 2)) - b * .1 * Math.pow(Math.abs(x / a), 4);
    else y -= b * .08 * Math.pow(Math.abs(x / a), 3);
    pts.push([x, y]);
  }
  return pts;
}

// ── Ruido para la cordillera (determinista: siempre la misma montaña)
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ridged(x, y) {
  let f = 0, amp = .55, freq = 1, prev = 1;
  for (let o = 0; o < 5; o++) {
    let n = 1 - Math.abs(vnoise(x * freq, y * freq) * 2 - 1); n *= n;
    f += n * amp * prev; prev = n; freq *= 2.07; amp *= .5;
  }
  return f;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function heightAt(x, z) {
  const far = smooth(2, -24, z);                       // 0 cerca de la cámara, 1 al fondo
  let h = ridged(x * .085 + 3.1, z * .085 + 1.7) * (1 + far * 7.2);
  h += 5.2 * Math.exp(-((x - 7) ** 2 + (z + 21) ** 2) / 40);   // la cumbre principal, a la derecha
  h += 3.6 * Math.exp(-((x + 11) ** 2 + (z + 25) ** 2) / 50);
  h -= 1.6 * Math.exp(-((x / 7.5) ** 2)) * (1 - far);    // valle central (las pistas)
  return Math.max(0, h);
}

export function createScene(canvas, { reduced = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const fogDay = new THREE.Color('#e3e8ff'), fogNight = new THREE.Color('#101a4a');
  scene.fog = new THREE.Fog(fogDay.clone(), 22, 78);

  const camera = new THREE.PerspectiveCamera(35, 1, .1, 120);
  const camPos = new THREE.Vector3(0, 2.6, 14), camLook = new THREE.Vector3(0, 1.6, -6);

  const hemi = new THREE.HemisphereLight('#e6ebff', '#3643ba', 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e6', 2.6); sun.position.set(9, 10, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight('#8f9aff', 1.4); rim.position.set(-6, 3, -6); scene.add(rim);

  // ── Cordillera: un plano desplazado con sombreado facetado y color por pendiente
  const mountains = new THREE.Group(); scene.add(mountains);
  const W = 64, D = 40, SX = mobile ? 120 : 180, SZ = mobile ? 76 : 110;
  const terrainGeo = new THREE.PlaneGeometry(W, D, SX, SZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -14);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  terrainGeo.computeVertexNormals();
  const cols = new Float32Array(pos.count * 3);
  const snow = new THREE.Color('#f6f8ff'), shade = new THREE.Color('#c3cbf6'), rock = new THREE.Color('#2a3592'), tmp = new THREE.Color();
  const nrm = terrainGeo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i), h = pos.getY(i);
    const snowy = smooth(.6, .82, ny + h * .01);
    tmp.copy(rock).lerp(shade, smooth(.35, .6, ny)).lerp(snow, snowy);
    cols.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92, envMapIntensity: .35, transparent: true });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  mountains.add(terrain);

  // Pinos: dos pisos de cono instanciados (dos llamadas de dibujo para cientos de árboles)
  const TREES = reduced ? 220 : mobile ? 320 : 620;
  const treeMat = new THREE.MeshStandardMaterial({ color: '#141d5e', flatShading: true, roughness: 1, transparent: true });
  const lower = new THREE.InstancedMesh(new THREE.ConeGeometry(.34, .8, 6).translate(0, .4, 0), treeMat, TREES);
  const upper = new THREE.InstancedMesh(new THREE.ConeGeometry(.24, .62, 6).translate(0, .86, 0), treeMat, TREES);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let placed = 0, guard = 0, seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (placed < TREES && guard++ < 20000) {
    const x = (rnd() - .5) * 52, z = 4 - rnd() * 22;
    const h = heightAt(x, z), hx = heightAt(x + .3, z) - h, hz = heightAt(x, z + .3) - h;
    const slope = Math.hypot(hx, hz) / .3;
    if (slope > .9 || h > 3.4 || (x < 1.2 && x > -17 + z * .2)) continue; // el lado del titular queda despejado: nieve virgen
    const sc = .6 + rnd() * .9;
    q.setFromAxisAngle(v3.set(0, 1, 0), rnd() * 6.28);
    m4.compose(v3.set(x, h - .05, z), q, s3.set(sc, sc * (.9 + rnd() * .5), sc));
    lower.setMatrixAt(placed, m4); upper.setMatrixAt(placed, m4); placed++;
  }
  lower.count = upper.count = placed;
  mountains.add(lower, upper);
  mountains.position.y = -2.4;

  // ── Las gafas
  const goggles = new THREE.Group(); scene.add(goggles);
  const R = 1.55; // radio de la curvatura de la lente
  const bend = geo => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), th = x / R;
      p.setX(i, (R + z) * Math.sin(th)); p.setZ(i, (R + z) * Math.cos(th) - R);
    }
    geo.computeVertexNormals(); return geo;
  };
  const shapeFrom = (k, dx = 0) => new THREE.Shape(lensOutline(220, 1.1 * k, .5 * k).map(([x, y]) => new THREE.Vector2(x + dx, y)));
  const outer = shapeFrom(1.1); outer.holes.push(new THREE.Path(lensOutline(220, 1.1 * .93, .5 * .93).map(([x, y]) => new THREE.Vector2(x, y))));
  const frameGeo = bend(new THREE.ExtrudeGeometry(outer, { depth: .16, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 3, curveSegments: 1 }).translate(0, 0, -.1));
  const frameMesh = new THREE.Mesh(frameGeo, new THREE.MeshPhysicalMaterial({ color: '#f3f5fb', roughness: .38, clearcoat: .6, clearcoatRoughness: .3 }));
  const foamShape = shapeFrom(1.02);
  const foam = new THREE.Mesh(bend(new THREE.ExtrudeGeometry(foamShape, { depth: .22, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -.36)),
    new THREE.MeshStandardMaterial({ color: '#101a4a', roughness: 1, transparent: true }));

  // Lente: malla subdividida y curvada, recortada con una máscara alfa con la forma exacta
  const maskC = document.createElement('canvas'); maskC.width = 512; maskC.height = 256;
  const mg = maskC.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, 512, 256); mg.fillStyle = '#fff'; mg.beginPath();
  lensOutline(220, 1.07, .49).forEach(([x, y], i) => { const px = 256 + x / 1.32 * 256, py = 128 - y / .66 * 128; i ? mg.lineTo(px, py) : mg.moveTo(px, py); });
  mg.fill();
  const lensMask = new THREE.CanvasTexture(maskC);
  const lensGeo = bend(new THREE.PlaneGeometry(2.4 * 1.1, 1.2 * 1.1, 96, 32).translate(0, 0, .04));
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: '#8d99ff', metalness: 1, roughness: .07, alphaMap: lensMask, alphaTest: .05, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    iridescence: 1, iridescenceIOR: 1.75, iridescenceThicknessRange: [220, 820], clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5,
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);

  // Cinta con la marca, rodeando la cabeza por detrás
  const strapC = document.createElement('canvas'); strapC.width = 2048; strapC.height = 128;
  const sg = strapC.getContext('2d');
  const drawStrap = () => {
    sg.fillStyle = '#3643ba'; sg.fillRect(0, 0, 2048, 128);
    sg.fillStyle = '#101a4a'; sg.fillRect(0, 0, 2048, 12); sg.fillRect(0, 116, 2048, 12);
    sg.fillStyle = '#f5f7fd'; sg.font = '900 46px Archivo, "Arial Black", sans-serif'; sg.textBaseline = 'middle'; sg.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      sg.fillText(i % 2 ? 'BAQUEIRA 2026' : 'DECATHLON', 256 + i * 512, 66);
      sg.beginPath(); sg.arc(512 + i * 512, 64, 7, 0, 7); sg.fill(); // separador
    }
  };
  drawStrap();
  const strapTex = new THREE.CanvasTexture(strapC); strapTex.colorSpace = THREE.SRGBColorSpace; strapTex.anisotropy = 8;
  document.fonts.load('900 46px Archivo').then(() => { drawStrap(); strapTex.needsUpdate = true; });
  const strapPts = [], strapUv = [], strapIdx = [], SEG = 90, cz = -.42, rx = 1.18, rz = 1.32, sh = .2;
  for (let i = 0; i <= SEG; i++) {
    const phi = 1.5 + (Math.PI * 2 - 3) * (i / SEG);
    const x = rx * Math.sin(phi), z = cz + rz * Math.cos(phi);
    strapPts.push(x, sh, z, x, -sh, z); strapUv.push(i / SEG, 1, i / SEG, 0); // u crece de derecha a izquierda de la cabeza: se lee bien desde fuera
    if (i < SEG) { const a = i * 2; strapIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const strapGeo = new THREE.BufferGeometry();
  strapGeo.setAttribute('position', new THREE.Float32BufferAttribute(strapPts, 3));
  strapGeo.setAttribute('uv', new THREE.Float32BufferAttribute(strapUv, 2));
  strapGeo.setIndex(strapIdx); strapGeo.computeVertexNormals();
  const strap = new THREE.Mesh(strapGeo, new THREE.MeshStandardMaterial({ map: strapTex, roughness: .7, side: THREE.DoubleSide, transparent: true }));
  const clipGeo = new THREE.BoxGeometry(.1, .46, .24);
  const clipMat = new THREE.MeshStandardMaterial({ color: '#101a4a', roughness: .5, metalness: .3, transparent: true });
  const clipL = new THREE.Mesh(clipGeo, clipMat), clipR = clipL.clone();
  clipL.position.set(-1.16, 0, -.36); clipR.position.set(1.16, 0, -.36);
  goggles.add(foam, frameMesh, lens, strap, clipL, clipR);

  // ── Nieve: puntos con sprite suave (núcleo blanco y borde azul, se ve sobre fondo claro y oscuro)
  const FLAKES = reduced ? 500 : mobile ? 1300 : 2600;
  const fp = new Float32Array(FLAKES * 3), fv = new Float32Array(FLAKES * 3), fs = new Float32Array(FLAKES), fw = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    fp[i * 3] = (Math.random() - .5) * 30; fp[i * 3 + 1] = Math.random() * 18 - 6; fp[i * 3 + 2] = 14 - .6 - Math.random() * 24;
    fs[i] = .035 + Math.pow(Math.random(), 2.2) * .11; fw[i] = Math.random() * 6.28;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  snowGeo.setAttribute('aSize', new THREE.BufferAttribute(fs, 1));
  const snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 600 }, uCore: { value: new THREE.Color('#ffffff') }, uEdge: { value: new THREE.Color('#9aa6f0') }, uOpacity: { value: .95 } },
    vertexShader: `attribute float aSize; uniform float uScale; varying float vFade;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / -mv.z; vFade = clamp((-mv.z - .4) / 1.6, 0., 1.); }`,
    fragmentShader: `uniform vec3 uCore; uniform vec3 uEdge; uniform float uOpacity; varying float vFade;
      void main(){ vec2 p = gl_PointCoord - .5; float d = length(p); if (d > .5) discard;
        gl_FragColor = vec4(mix(uEdge, uCore, smoothstep(.46, .12, d)), smoothstep(.5, .2, d) * uOpacity * vFade);
        #include <colorspace_fragment>
      }`,
  });
  const snowPts = new THREE.Points(snowGeo, snowMat); snowPts.frustumCulled = false; snowPts.renderOrder = 5;
  scene.add(snowPts);

  // ── Estado: lo escribe app.js; smooth lo persigue con interpolación exponencial
  const state = { section: 'portada', cover: 0, px: 0, py: 0, pv: 0, photo: false };
  const sm = { cover: 0, mount: 1, night: 0, gx: 1.72, gy: 3.05, gz: 7.4, gs: .84, gry: -.6, px: 0, py: 0, camz: 14, camy: 2.6, lookY: 2.5, lookZ: -6 };
  let spin = 0, spinVel = 0, lastPx = 0, lastPy = 0;
  const pointerNdc = new THREE.Vector2(9, 9);
  addEventListener('pointermove', ev => {
    state.px = ev.clientX / innerWidth - .5; state.py = ev.clientY / innerHeight - .5;
    pointerNdc.set(state.px * 2, -state.py * 2);
    state.pv = Math.min(4, state.pv + Math.hypot(state.px - lastPx, state.py - lastPy) * 18);
    lastPx = state.px; lastPy = state.py;
  }, { passive: true });

  let envTex = null;
  const ready = new Promise(res => {
    new THREE.TextureLoader().load('assets/img/cierre-montana.webp', tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
      envTex = pmrem.fromEquirectangular(tex).texture; lensMat.envMap = envTex; lensMat.needsUpdate = true; tex.dispose();
      requestAnimationFrame(() => { renderer.compile(scene, camera); renderer.render(scene, camera); res(); });
    }, undefined, () => res());
  });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    snowMat.uniforms.uScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }
  addEventListener('resize', resize); resize();

  const ray = new THREE.Raycaster(), fwd = new THREE.Vector3(), tgt = new THREE.Vector3(), w = new THREE.Vector3(), qa = new THREE.Quaternion(), eu = new THREE.Euler();
  const clock = new THREE.Clock();
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeIO = t => { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  let running = true, raf = 0, burst = 0;

  function targets(t) {
    const narrow = innerWidth < 760, sec = state.section, c = state.cover;
    const T = { mount: 0, night: 0, gs: 0, camz: 14, camy: 2.6, lookY: 2.5, lookZ: -6, gx: 0, gy: 2.4, gz: 7, gry: -.4 };
    if (sec === 'portada') {
      T.mount = 1;
      // la cámara avanza un poco mientras llegan las gafas y, al atravesarlas, vuela hacia el valle
      const fly = easeIO((c - .7) / .3);
      T.camz = 14 - easeIO(c / .55) * .6 - fly * 13; T.camy = 2.6 - fly * 1.5; T.lookY = 2.5 - fly * 1.2; T.lookZ = -6 - fly * 12;
    } else if (sec === 'cierre') {
      // en móvil las gafas solo aparecen cuando la foto del cierre ocupa la pantalla, para no tapar el texto
      T.night = 1; T.gs = narrow ? (state.photo ? .56 : 0) : 1;
      T.gx = narrow ? 0 : 2.05; T.gy = narrow ? 1.9 : 2.1; T.gz = 7.2; T.gry = -.35;
    } else if (sec === 'temporada') {
      T.night = 1;
    }
    return T;
  }

  function frame() {
    raf = 0; if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sm.cover = damp(sm.cover, state.cover, 9, dt);
    const T = targets(t);
    // dentro de la portada el seguimiento es rápido (va con el scroll); entre capítulos, más pausado
    const k = state.section === 'portada' ? 7 : 3.2;
    for (const key in T) sm[key] = damp(sm[key], T[key], key === 'gs' && T.gs === 0 ? 14 : k, dt);
    sm.px = damp(sm.px, state.px, 3, dt); sm.py = damp(sm.py, state.py, 3, dt);
    state.pv = damp(state.pv, 0, 2.5, dt);

    // Portada: a = las gafas van al centro; p = la cámara las atraviesa. Todo sale de sm.cover (ya suavizado),
    // sin un segundo suavizado: así las gafas quedan clavadas al eje de la cámara y no se descentran.
    const inCover = state.section === 'portada';
    const a = inCover ? easeIO((sm.cover - .16) / .38) : 0;
    const p = inCover ? Math.min(1, Math.max(0, (sm.cover - .54) / .28)) : 0;
    const free = 1 - a; // el cursor deja de mover cámara y gafas mientras te las pones
    camPos.set(sm.px * .5 * free, sm.camy - sm.py * .25 * free, sm.camz);
    camera.position.copy(camPos);
    camera.lookAt(tgt.set(sm.px * .2 * free, sm.lookY, sm.lookZ));

    // cordillera: aparece/desaparece con un fundido y un leve descenso
    terrainMat.opacity = treeMat.opacity = sm.mount;
    mountains.visible = sm.mount > .01;
    mountains.position.y = -2.4 - (1 - sm.mount) * 2.5;
    scene.fog.color.lerpColors(fogDay, fogNight, sm.night);
    hemi.intensity = THREE.MathUtils.lerp(1.2, .7, sm.night);
    snowMat.uniforms.uEdge.value.set(sm.night > .5 ? '#c9d0ff' : '#8f9cf0');
    snowMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(.95, .8, sm.night);

    // gafas
    spinVel *= Math.exp(-2.2 * dt); spin += spinVel * dt;
    if (!reduced && Math.abs(spinVel) < .05) spin = damp(spin, Math.round(spin / (Math.PI * 2)) * Math.PI * 2, 1.5, dt);
    const idle = reduced ? 0 : Math.sin(t * .45) * .12;
    const bob = reduced ? 0 : Math.sin(t * .9) * .07;
    if (inCover) {
      const narrow = innerWidth < 760;
      const rest = narrow ? [0, 1.55, 7.4, .58, -.18] : [1.72, 3.05, 7.4, .84, -.62];
      // distancia a la cámara: 3,4 (centradas, se ven enteras) → detrás de la cámara. Acelera al final, como al ponértelas.
      const d = 3.4 - 4.4 * Math.pow(p, 1.7);
      camera.getWorldDirection(fwd);
      v3.copy(camPos).addScaledVector(fwd, d);
      sm.gx = THREE.MathUtils.lerp(rest[0], v3.x, a);
      sm.gy = THREE.MathUtils.lerp(rest[1] + bob, v3.y, a);
      sm.gz = THREE.MathUtils.lerp(rest[2], v3.z, a);
      sm.gs = d < -.5 ? 0 : THREE.MathUtils.lerp(rest[3], narrow ? .36 : 1, a); // en móvil caben enteras antes de atravesarlas
      sm.gry = rest[4];
      // orientación: la pose de reposo (con cursor e inercia) se funde con la de la cámara
      qa.setFromEuler(eu.set(.1 + sm.py * .3, rest[4] + idle + sm.px * .6 + spin, Math.sin(t * .6) * .03));
      goggles.quaternion.copy(qa).slerp(camera.quaternion, a);
      goggles.position.set(sm.gx, sm.gy, sm.gz);
    } else {
      goggles.position.set(sm.gx, sm.gy + bob, sm.gz);
      goggles.rotation.set(.1 + sm.py * .3, sm.gry + idle + sm.px * .6 + spin, Math.sin(t * .6) * .03);
    }
    goggles.visible = sm.gs > .01;
    goggles.scale.setScalar(Math.max(.0001, sm.gs));
    // al acercarse, la lente se aclara (se ve el valle a través) y lo de detrás (espuma, cinta) se retira
    const clear = smooth(.56, .7, inCover ? sm.cover : 0), back = 1 - smooth(.52, .62, inCover ? sm.cover : 0);
    lensMat.opacity = 1 - .9 * clear;
    foam.material.opacity = strap.material.opacity = clipMat.opacity = back;
    foam.visible = strap.visible = clipL.visible = clipR.visible = back > .01;

    // nieve
    if (!reduced || burst > 0) {
      ray.setFromCamera(pointerNdc, camera);
      const o = ray.ray.origin, dir = ray.ray.direction;
      const gust = .6 + state.pv * 2.6;
      const wind = Math.sin(t * .2) * .25 + .15;
      for (let i = 0; i < FLAKES; i++) {
        const j = i * 3;
        let x = fp[j], y = fp[j + 1], z = fp[j + 2];
        w.set(x - o.x, y - o.y, z - o.z);
        const along = w.dot(dir);
        if (along > 0) {
          const dx = w.x - dir.x * along, dy = w.y - dir.y * along, dz = w.z - dir.z * along;
          const d = Math.hypot(dx, dy, dz), r = .5 + along * .07;
          if (d < r && d > 1e-4) { const f = (1 - d / r) * gust * 6 * dt / d; fv[j] += dx * f; fv[j + 1] += dy * f; fv[j + 2] += dz * f; }
        }
        const fall = .45 + fs[i] * 6;
        const decay = Math.exp(-1.6 * dt);
        fv[j] *= decay; fv[j + 1] *= decay; fv[j + 2] *= decay;
        x += (fv[j] + wind + Math.sin(t * .8 + fw[i]) * .18) * dt;
        y += (fv[j + 1] - fall) * dt;
        z += fv[j + 2] * dt;
        // envolver alrededor de la cámara: la nieve nunca se acaba
        if (y < camPos.y - 8) y += 18; else if (y > camPos.y + 12) y -= 18;
        if (x < camPos.x - 15) x += 30; else if (x > camPos.x + 15) x -= 30;
        if (z > camPos.z - .5) z -= 24; else if (z < camPos.z - 24.5) z += 24;
        fp[j] = x; fp[j + 1] = y; fp[j + 2] = z;
      }
      snowGeo.attributes.position.needsUpdate = true;
      burst = Math.max(0, burst - dt);
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);

  return {
    ready,
    set(values) { Object.assign(state, values); },
    spin(v) { spinVel += v; },
    burst() {
      burst = 4; spinVel += Math.PI * 4;
      for (let i = 0; i < FLAKES; i++) { fv[i * 3] += (Math.random() - .5) * 8; fv[i * 3 + 1] += 4 + Math.random() * 9; fv[i * 3 + 2] += (Math.random() - .5) * 4; }
    },
  };
}
