// La escena: arte isométrico. La cámara es ortográfica y se mueve con desplazamiento y zoom: solo rota en la apertura.
// Quien mira mueve el mapa y la moto va adonde la llama.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { PERFILES, rostroDe } from './perfiles.js';
import { CUADRA, FONDO, ISLA, NOCHE, SOMBRA, aMundo, crearCiudad, crearRuta, crearCasa, bloqueDe } from './ciudad.js';
import { crearMochila, crearRepartidor } from './objetos.js';
import { crearVisor } from './visor.js';
import { leerVentana } from './marco.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const rebote = t => { t = clamp(t) - 1; return 1 + 2.7 * t * t * t + 1.7 * t * t; }; // crece, se pasa un poco y vuelve
const damp = (cur, to, l, dt) => lerp(cur, to, 1 - Math.exp(-l * dt));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const loadImage = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// Isométrica verdadera: 45° de giro y 35,26° de inclinación
const ISO = V(1, 1, 1).normalize(), DERECHA = V(1, 0, -1).normalize(), ARRIBA = V(-1, 0, -1).normalize().multiplyScalar(Math.sqrt(3));
const CENTRO = V((ISLA.x0 + ISLA.x1) / 2, 0, (ISLA.z0 + ISLA.z1) / 2);
const ESQUINAS = [[ISLA.x0, ISLA.z0], [ISLA.x0, ISLA.z1], [ISLA.x1, ISLA.z0], [ISLA.x1, ISLA.z1]].map(([x, z]) => V(x, 0, z));
const aPantalla = p => [(p.x - p.z) / Math.SQRT2, -(p.x + p.z) / Math.sqrt(6)]; // un punto del piso, en unidades de pantalla
const VERTICAL = V(0, 1, 0);
const CERCA_MAX = 36; // el zoom más cercano, en alto visible
const CAMBIO = 64; // de este zoom para adentro, los pines dan lugar a los carteles
const PIN = { movil: .046, escritorio: .076 }; // alto del pin, en fracción del cuadro
// Un zigzag parejo: con 16 creadores, cada dos cuadras, los pines no se pisan. La casa del pedido queda al final
const RECORRIDO = [[-6, -5], [2, -5], [2, -2], [-5, -2], [-5, 1], [3, 1], [3, 4], [-4, 4]];

export function crearEscena(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
  const DPR = Math.min(devicePixelRatio, 2), DPR_MIN = Math.min(DPR, innerWidth <= 900 ? 1 : 1.5); // HD; solo un celular lento baja de 1,5
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(FONDO, 1);
  renderer.autoClear = false; // se dibuja en capas: ciudad, moto, velo y objetos

  const scene = new THREE.Scene();
  const cielo = new THREE.HemisphereLight('#ffffff', '#dfe6da', 2.5); scene.add(cielo);
  const sol = new THREE.DirectionalLight('#ffffff', 1.4); sol.position.set(-40, 60, 50); scene.add(sol);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1400);

  // La moto va en su propia capa, encima de la ciudad: nunca la tapa un edificio
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const capa = new THREE.Scene();
  capa.environment = env; capa.environmentIntensity = .7;
  const solCapa = new THREE.DirectionalLight('#ffffff', 1.5); solCapa.position.set(-30, 50, 40); capa.add(solCapa);
  const marca = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false }));
  const aro = new THREE.Mesh(new THREE.RingGeometry(.92, 1.06, 56), new THREE.MeshBasicMaterial({ color: '#FA0050', transparent: true, depthWrite: false, toneMapped: false }));
  marca.add(disco, aro); marca.rotation.x = -Math.PI / 2; capa.add(marca);

  // ── El recorrido y las casas. Cada casa queda del lado lejano de la calle: la moto pasa por delante
  const ruta = crearRuta(RECORRIDO);
  const paradas = PERFILES.map(p => {
    const punto = aMundo(p.lugar), u = ruta.uDe(punto), T = ruta.tangent(u, V());
    const N = Math.abs(T.x) > Math.abs(T.z) ? V(0, 0, -1) : V(-1, 0, 0);
    return { punto, u, bloque: punto.clone().addScaledVector(N, CUADRA / 2) };
  });
  const hogarLugar = aMundo([-3.5, 4]), hogarBloque = aMundo([-3.5, 3.5]), localBloque = aMundo([-6.5, -5.5]), uHogar = ruta.uDe(hogarLugar);
  const reservadas = new Set([...paradas.map(q => bloqueDe(q.bloque)), bloqueDe(hogarBloque), bloqueDe(localBloque)]);
  const ciudad = crearCiudad(reservadas, ruta.pts.filter((_, i) => i % 12 === 0));
  const hogar = crearCasa(hogarBloque), local = crearCasa(localBloque);
  scene.add(ciudad.group, ruta.mesh, hogar.group, local.group);

  // ── Pines en forma de gota, como los de la app
  const anillos = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: '#FA0050', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 4; scene.add(m); return m;
  });
  function gota(dibujar) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.scale(2, 2);
    g.shadowColor = 'rgba(40,30,40,.28)'; g.shadowBlur = 28; g.shadowOffsetY = 10; g.fillStyle = '#fff';
    g.beginPath(); g.arc(128, 104, 92, Math.PI * .8, Math.PI * .2); g.lineTo(128, 240); g.closePath(); g.fill();
    g.shadowColor = 'transparent';
    g.save(); g.beginPath(); g.arc(128, 104, 78, 0, 7); g.clip(); dibujar(g); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const cara = (img, [x, y, a, b]) => gota(g => g.drawImage(img, x * img.width, y * img.height, a * img.width, b * img.height, 50, 26, 156, 156));
  const icono = casita => gota(g => {
    g.fillStyle = '#FA0050'; g.fillRect(40, 20, 176, 170); g.fillStyle = '#fff'; g.beginPath();
    if (casita) { g.moveTo(128, 56); g.lineTo(184, 106); g.lineTo(166, 106); g.lineTo(166, 152); g.lineTo(90, 152); g.lineTo(90, 106); g.lineTo(72, 106); g.closePath(); }
    else { g.rect(78, 66, 100, 26); g.rect(88, 92, 80, 60); }
    g.fill();
  });
  const pin = (tex, pos) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0, toneMapped: false }));
    s.center.set(.5, .05); s.position.copy(pos); s.renderOrder = 5; scene.add(s);
    return { s, pos, k: 0, hover: 1 };
  };
  const pines = [], carteles = [];
  let pinHogar = null, pinLocal = null, moto = null, visor = null;
  const ready = Promise.all([
    loadImage('assets/img/peya-iso-derecho.svg'), loadImage('assets/img/peya-wordmark-derecho.svg'), document.fonts.load('700 34px Poppins'), document.fonts.load('600 44px Inter'),
    ...PERFILES.map(p => loadImage(`assets/fotos/${p.foto}.webp`)),
  ]).then(([iso, word, , , ...fotos]) => {
    fotos.forEach((img, i) => {
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true;
      const casa = crearCasa(paradas[i].bloque, tex, rostroDe(PERFILES[i]));
      scene.add(casa.group); carteles.push(casa.cartel);
      pines.push(pin(cara(img, rostroDe(PERFILES[i])), casa.techo));
    });
    pinHogar = pin(icono(true), hogar.techo); pinLocal = pin(icono(false), local.techo);
    moto = crearRepartidor(crearMochila(iso, word));
    capa.add(moto.group);
    visor = crearVisor(renderer, env, { iso, word, reduced });
    renderer.compile(scene, camera); renderer.compile(capa, camera); renderer.compile(visor.scene, visor.camera);
  });

  // velo: al abrir un perfil o al llegar, la ciudad se aclara y los objetos quedan adelante
  const veloMat = new THREE.MeshBasicMaterial({ color: '#fbfaf8', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const velo = new THREE.Scene(), veloCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  velo.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veloMat));

  // ── Tamaño y calidad
  const view = { aspect: 1, v: leerVentana() };
  const movil = () => innerWidth <= 900;
  const pinAlto = () => (movil() ? PIN.movil : PIN.escritorio);
  function layout() { renderer.setSize(innerWidth, innerHeight, false); view.aspect = innerWidth / innerHeight; view.v = leerVentana(); }
  layout();
  addEventListener('resize', layout);
  let dpr = DPR, winT = 0, winN = 0, lentas = 0, rapidas = 0;
  const desde = performance.now() + 5000;
  function adaptar(dt) { // baja la resolución si el equipo no llega; la vuelve a subir cuando sobra
    if (performance.now() < desde || dt > .1) return;
    winT += dt; winN++;
    if (winT < 2) return;
    const fps = winN / winT; winT = winN = 0;
    if (fps < 28) { lentas++; rapidas = 0; } else if (fps > 45) { rapidas++; lentas = 0; } else lentas = rapidas = 0;
    if (lentas >= 3 && dpr > DPR_MIN) { dpr -= .25; lentas = 0; renderer.setPixelRatio(dpr); layout(); }
    else if (rapidas >= 2 && dpr < DPR) { dpr += .25; rapidas = 0; renderer.setPixelRatio(dpr); layout(); }
  }

  // ── Planos: qué punto del piso se mira, a qué tamaño (alto visible), y dónde cae en pantalla (ox, oy: fracción del cuadro)
  const toma = (p, s, ox = 0, oy = 0) => ({ c: p.clone().addScaledVector(DERECHA, -ox * s * view.aspect).addScaledVector(ARRIBA, -oy * s), s });
  const mezcla = (a, b, t) => ({ c: a.c.clone().lerp(b.c, t), s: a.s * (b.s / a.s) ** t });
  const lote = (i, ox = 0) => {
    const q = paradas[i], m = movil();
    return toma(q.bloque.clone().lerp(q.punto, .4), m ? 44 : 39, m ? 0 : ox, m ? .1 : .03);
  };
  // La isla entera, en el medio de la ventana, también en vertical
  const portada = () => ({ s: 205 * Math.max(1, (1.6 / view.aspect) ** .96), ox: (view.v.l - view.v.r) / 2 / innerWidth, oy: (view.v.b - view.v.t) / 2 / innerHeight });
  // Lo que la ventana y el panel dejan libre, en fracciones del cuadro
  function area() {
    const { t, r, b, l } = view.v, W = innerWidth, H = innerHeight, panel = movil() ? 0 : 420;
    return { x: (l + panel) / W, y: t / H, w: (W - l - r - panel) / W, h: movil() ? .5 - t / H : (H - t - b) / H };
  }
  // Plano en el que esos puntos entran enteros en el área libre, con lugar arriba para los pines
  function encuadre(puntos, pin) {
    const a = area(), pts = puntos.map(aPantalla), sx = pts.map(p => p[0]), sy = pts.map(p => p[1]);
    const x0 = Math.min(...sx), x1 = Math.max(...sx), y0 = Math.min(...sy), y1 = Math.max(...sy);
    const s = Math.max((x1 - x0) / (a.w * view.aspect * .92 - pin), (y1 - y0) / (a.h * .9 - pin));
    const cx = (x0 + x1) / 2, cy = (y0 + y1 + pin * s) / 2;
    const centro = V((cx * Math.SQRT2 - cy * Math.sqrt(6)) / 2, 0, (-cy * Math.sqrt(6) - cx * Math.SQRT2) / 2);
    return toma(centro, s, a.x + a.w / 2 - .5, .5 - a.y - a.h / 2);
  }
  // En escritorio entra la isla entera. En vertical entran las casas, y alejando se llega a la isla entera
  const mapa = () => (movil() ? encuadre([...paradas.map(q => q.bloque), hogarBloque, localBloque], PIN.movil) : encuadre(ESQUINAS, 0));
  // ── La app. u: dónde está la moto en el recorrido; desde: dónde arrancó el viaje
  const app = { giro: 0, apertura: true, frente: true, isla: null, sombra: 0, motoK: 0, intro: 0, u: .022, desde: .022, foco: null, // arranca estacionada a un costado del local
    perfil: 0, perfilK: 0, seguirK: 0, puerta: 0, timbre: 0, elegidos: new Set(PERFILES.map((_, i) => i)) };
  const clock = new THREE.Clock();
  const fondoDia = new THREE.Color(FONDO), fondoNoche = new THREE.Color('#12151f'), veloDia = new THREE.Color('#fbfaf8'), veloNoche = new THREE.Color('#10131c');
  const desdePortada = () => { const p = portada(); return toma(CENTRO, p.s, p.ox, p.oy); };
  const cam = { c: CENTRO.clone(), s: 215 };
  // El mapa libre: x, y es cuánto se movió (unidades de pantalla) y z cuánto se acercó (1 = el plano del mapa)
  const libre = { on: false, volver: false, agarrado: false, fuera: false, x: 0, y: 0, z: 1, vx: 0, vy: 0, base: 215 };
  function aplicarLibre(c, dt) {
    libre.base = c.s;
    if (!libre.on || libre.volver) {
      libre.x = damp(libre.x, 0, 6, dt); libre.y = damp(libre.y, 0, 6, dt); libre.z = damp(libre.z, 1, 6, dt); libre.vx = libre.vy = 0;
      if (Math.abs(libre.x) + Math.abs(libre.y) + Math.abs(libre.z - 1) < .01) libre.volver = false;
    } else if (!libre.agarrado) {
      const f = Math.exp(-4.2 * dt);
      libre.x += libre.vx * dt; libre.y += libre.vy * dt; libre.vx *= f; libre.vy *= f;
    }
    // el centro del área libre no se va de la isla: lo que se pasa vuelve solo
    const a = area(), s = c.s * libre.z, [bx, by] = aPantalla(c.c), ox = (a.x + a.w / 2 - .5) * s * view.aspect, oy = (.5 - a.y - a.h / 2) * s;
    const pts = ESQUINAS.map(aPantalla), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const rx = Math.max((x1 - x0 - s * view.aspect * a.w) / 2, 0) + 30, ry = Math.max((y1 - y0 - s * a.h) / 2, 0) + 30;
    const tx = clamp(bx + libre.x + ox, (x0 + x1) / 2 - rx, (x0 + x1) / 2 + rx) - bx - ox, ty = clamp(by + libre.y + oy, (y0 + y1) / 2 - ry, (y0 + y1) / 2 + ry) - by - oy;
    libre.fuera = Math.abs(libre.x - tx) + Math.abs(libre.y - ty) > .01;
    if (libre.on && !libre.agarrado) { libre.x = damp(libre.x, tx, 9, dt); libre.y = damp(libre.y, ty, 9, dt); }
    return { c: c.c.clone().addScaledVector(DERECHA, libre.x).addScaledVector(ARRIBA, libre.y), s };
  }
  const q = V(), T = V(), Tprev = V(1, 0, 0);
  let running = true, ultimoU = app.u, sentido = 1, inclinacion = 0, visorOn = false;

  function tick() {
    if (!running) return;
    const dtRaw = clock.getDelta(), dt = Math.min(dtRaw, .05), t = clock.elapsedTime;
    adaptar(dtRaw);
    if (!moto) return;
    const enMapa = app.intro > .9;

    // la moto: va por el medio de la calle y se inclina en las curvas
    ruta.at(app.u, q); ruta.tangent(app.u, T);
    const paso = app.u - ultimoU; ultimoU = app.u;
    if (Math.abs(paso) > 1e-6) sentido = Math.sign(paso);
    app.velocidad = clamp(Math.abs(paso) / Math.max(dt, .001) * 3.4); // el motor la escucha
    T.multiplyScalar(sentido);
    const giro = Math.atan2(Tprev.x * T.z - Tprev.z * T.x, Tprev.dot(T)); Tprev.copy(T);
    inclinacion = damp(inclinacion, clamp(giro * 14, -.42, .42), 9, dt);
    moto.group.position.copy(q);
    moto.group.lookAt(q.clone().add(T));
    moto.group.rotateZ(inclinacion);
    moto.ruedas.forEach(w => { w.rotation.z -= paso * 900; });

    // el recorrido: pálido en el mapa, rojo en el viaje
    const u = ruta.mat.uniforms;
    u.uDesde.value = app.desde; u.uHasta.value = app.u; u.uMoto.value = app.u; u.uTiempo.value = t; u.uPulso.value = reduced ? 0 : 1;
    u.uVisible.value = smooth((cam.s - 56) / 30) * (1 - app.puerta) * (1 - app.perfilK * (1 - app.seguirK)) * smooth((app.intro - .5) * 2);
    ruta.mesh.visible = u.uVisible.value > .01;

    // timbre
    anillos.forEach((a, k) => {
      const f = clamp(app.timbre * 1.6 - k * .6);
      a.material.opacity = app.timbre > 0 && app.timbre < 1 ? (1 - f) * .9 : 0;
      a.position.copy(q).setY(.3); a.scale.setScalar(1.4 + f * 6);
    });

    // cámara
    let c = aplicarLibre(mezcla(desdePortada(), mapa(), smooth(app.intro)), dt);
    if (app.isla) c = toma(CENTRO, app.isla.s, app.isla.ox, app.isla.oy); // la apertura manda el plano: ver apertura.js
    if (app.perfilK > .001) c = mezcla(c, movil() ? toma(paradas[app.perfil].bloque, 44, 0, -.28) : lote(app.perfil, .06), smooth(app.perfilK)); // la casa queda detrás del celular o del panel
    // siguiendo a la moto: en una historia va al costado del celular; en el pedido, al costado del panel
    const costado = app.perfilK > .5 ? (movil() ? [.15, .26] : [.23, 0]) : (movil() ? [0, .18] : [.13, 0]);
    if (app.seguirK > .001) c = mezcla(c, toma(q, movil() ? 92 : 78, ...costado), smooth(app.seguirK));
    if (app.puerta > .001) c = mezcla(c, toma(hogarBloque, 40, movil() ? 0 : .13, movil() ? .18 : 0), smooth(app.puerta));
    const k = reduced || app.isla ? 1 : 1 - Math.exp(-(libre.agarrado ? 32 : 9) * dt);
    cam.c.lerp(c.c, k); cam.s = lerp(cam.s, c.s, k);
    const h = cam.s / 2, w = h * view.aspect;
    camera.left = -w; camera.right = w; camera.top = h; camera.bottom = -h; camera.updateProjectionMatrix();
    // la apertura hace girar la isla: la cámara da la vuelta alrededor de su centro, y CENTRO no se mueve del cuadro
    const centro = cam.c.clone(), mirada = ISO.clone();
    if (app.giro) { centro.sub(CENTRO).applyAxisAngle(VERTICAL, app.giro).add(CENTRO); mirada.applyAxisAngle(VERTICAL, app.giro); }
    camera.position.copy(centro).addScaledVector(mirada, 500);
    camera.lookAt(centro);

    ciudad.edificios.material.uniforms.uDetalle.value = 1 - smooth((cam.s - 58) / 60); // de lejos, solo volúmenes blancos

    // la moto crece cuando la cámara se aleja: siempre se la ve, y una marca redonda la ubica en el mapa
    const entregada = 1 - smooth((Math.max(app.perfilK * (1 - app.seguirK), app.puerta) - .35) / .5); // entregó: se va y deja lugar a la mochila
    moto.group.scale.setScalar(Math.max(1.9, cam.s / (movil() ? 62 : 38)) * Math.max(.001, entregada * app.motoK)); // en la apertura aparece cuando la isla ya salió
    moto.group.visible = entregada > .01;
    const lejosK = smooth((cam.s - 62) / 40);
    marca.position.copy(q).setY(.1); marca.scale.setScalar(cam.s * (movil() ? .02 : .027) * Math.max(.001, app.motoK));
    disco.material.opacity = lejosK * .92; aro.material.opacity = lejosK;
    marca.visible = lejosK > .01;

    // cerca se ve el cartel con la foto; lejos, el pin con la cara. Nunca los dos, y ninguno se queda a mitad de camino
    const deCerca = cam.s <= CAMBIO, explorando = libre.on && !app.perfilK && !app.puerta;
    carteles.forEach(x => {
      x.userData.k = damp(x.userData.k ?? 0, explorando && deCerca ? 1 : 0, 10, dt);
      const k = rebote(x.userData.k);
      x.visible = k > .01; x.scale.set(1, Math.max(.001, k), 1);
    });
    const presentes = (1 - app.perfilK) * smooth((app.intro - .5) * 2);
    const tam = cam.s * pinAlto() * Math.min(1, libre.z ** -.5); // lejos de todo, los pines ceden lugar
    pines.forEach((x, i) => {
      const on = !deCerca && presentes > i / pines.length * .9 ? 1 : 0; // aparecen de a uno
      if (on && !x.visto) { x.visto = true; app.alPin?.(i); }
      x.k = damp(x.k, on, 11, dt);
      x.hover = damp(x.hover, app.foco === i ? 1.16 : 1, 12, dt);
      x.s.material.opacity = clamp(x.k * 1.4) * (app.elegidos.has(i) ? 1 : .45);
      x.s.scale.setScalar(tam * x.k * x.hover);
      x.s.visible = x.k > .01;
    });
    [pinHogar, pinLocal].forEach(x => {
      x.k = damp(x.k, enMapa ? 1 : 0, 9, dt);
      const v = x.k * (1 - Math.max(app.perfilK, app.puerta)); x.s.material.opacity = v; x.s.scale.setScalar(tam * .8 * x.k); x.s.visible = v > .01;
    });

    // En la apertura la isla se dibuja entre la mochila y su frente: así sale de adentro
    renderer.clear();
    if (app.apertura) { visor.tick(dt, t); renderer.render(visor.scene, visor.camera); renderer.clearDepth(); }
    scene.visible = !app.apertura || !!app.isla; capa.visible = app.motoK > .01;
    SOMBRA.value = app.sombra;
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(capa, camera);
    veloMat.opacity = Math.max(app.puerta * .95, app.perfilK * .6 * (1 - app.seguirK * .85));
    if (veloMat.opacity > .001) renderer.render(velo, veloCam);
    if (app.apertura && app.frente) { renderer.clearDepth(); visor.dibujarFrente(); }
    else if (visorOn && !app.apertura) {
      visor.tick(dt, t);
      renderer.clearDepth();
      renderer.render(visor.scene, visor.camera);
    }
  }

  return {
    ready, tick, app, uHogar,
    get visor() { return visor; },
    uDe: i => paradas[i].u,
    // 0 de día, 1 de noche. La ciudad lee NOCHE en sus materiales
    noche(k) {
      NOCHE.value = k;
      cielo.intensity = lerp(2.5, .95, k); sol.intensity = lerp(1.4, .35, k);
      renderer.setClearColor(fondoDia.clone().lerp(fondoNoche, k), 1);
      veloMat.color.copy(veloDia).lerp(veloNoche, k);
    },
    libre: {
      activar(on) { libre.on = on; libre.agarrado = false; },
      agarrar(on) { libre.agarrado = on; libre.volver = false; if (on) libre.vx = libre.vy = 0; },
      mover(dx, dy) { const k = cam.s / innerHeight * (libre.fuera ? .35 : 1); libre.volver = false; libre.x -= dx * k; libre.y += dy * k; },
      soltar(vx, vy) { const k = cam.s / innerHeight; libre.vx = -vx * k; libre.vy = vy * k; },
      empujar(x, y) { libre.volver = false; libre.vx += x * cam.s * .4; libre.vy += y * cam.s * .4; },
      centrar() { libre.volver = true; },
      // acerca o aleja dejando quieto el punto bajo el puntero
      acercar(f, x = innerWidth / 2, y = innerHeight / 2) {
        const techo = encuadre(ESQUINAS, 0).s * 1.1 / libre.base, z = clamp(libre.z * f, CERCA_MAX / libre.base, Math.max(techo, 1.15)), r = z / libre.z, s = libre.base * libre.z;
        libre.volver = false;
        libre.x += (x / innerWidth - .5) * s * view.aspect * (1 - r); libre.y += (.5 - y / innerHeight) * s * (1 - r); libre.z = z;
      },
    },
    mostrarVisor(on) { visorOn = on; },
    pointer(x, y) { visor?.pointer(x, y); },
    portada,
    enfocar(i) { app.foco = i; },
    elegir(set) { app.elegidos = set; },
    // el perfil bajo el puntero: su pin de lejos, su casa y su cartel de cerca
    pinEn(x, y) {
      const v = V(), alto = pinAlto() * innerHeight, cerca = cam.s <= CAMBIO, px = innerHeight / cam.s;
      let mejor = -1, d = cerca ? 11 * px : Math.max(alto * .5, 22);
      pines.forEach((pp, i) => {
        v.copy(cerca ? paradas[i].bloque : pp.pos).project(camera);
        const e = Math.hypot((v.x + 1) / 2 * innerWidth - x, (1 - v.y) / 2 * innerHeight - (cerca ? 5 * px : alto * .6) - y);
        if (e < d) { d = e; mejor = i; }
      });
      return mejor;
    },
    pause(s) { running = !s; },
  };
}
