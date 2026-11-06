// PedidosYa × BIG · «¡Llegamos!». El mapa es todo: tocar a cada creador va desarrollando su historia, click a click.
import { PERFILES } from './perfiles.js';
import { crearEscena } from './escena.js';
import { crearPedido } from './pedido.js';
import { vidrio } from './vidrio.js';
import { crearMando } from './mando.js';
import { crearMarco } from './marco.js';
import { crearApertura } from './apertura.js';
import { sonar, moto, alternarSonido, sonidoPrendido, sonidoBloqueado, medir, registro, RECETAS } from './sonido.js';

const { gsap } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const foto = p => `assets/fotos/${p.foto}.webp`;
const mobile = () => innerWidth <= 900;
const root = document.documentElement;

let scene = null;
try { scene = crearEscena($('#ciudad'), { reduced }); } catch { root.classList.add('no-webgl'); }

addEventListener('pointermove', e => scene?.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });

let listo = false, marco = null; // listo: terminó la apertura
// En el canto de la ventana: la acción del momento
function pintarRiel() {
  marco?.accion(pedido.accion());
}

// ── La app
const panel = $('.app');
const pedido = crearPedido(panel, PERFILES, {
  elegidos(set) { scene?.elegir(set); },
  perfil: abrirPerfil,
  saltar: ponerPaso,
  seguir: avanzar,
  pedir,
  otra,
  accion: pintarRiel,
  vista(v) { sonar({ lista: 'thup', perfil: 'whoosh', pedido: 'slide' }[v]); if (!reduced) gsap.fromTo(panel.children, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .05, ease: 'expo.out', clearProps: 'all' }); },
});
vidrio(panel);
vidrio($('.mando'), { borde: 10, fuerza: 16, radio: 25 });
vidrio($('.canto'), { borde: 12, fuerza: 22, radio: parseFloat(getComputedStyle(root).getPropertyValue('--vR')), efecto: 'saturate(130%) brightness(1.05)' });
marco = crearMarco($('.riel'), {
  agarrar() { sonar('tic'); },
  enlace() { sonar('enviar'); },
  tema(oscuro) { sonar(oscuro ? 'noche' : 'dia'); if (scene) { const n = { k: 1 - oscuro }; gsap.to(n, { k: +oscuro, duration: reduced ? .01 : .7, ease: 'power2.inOut', onUpdate: () => scene.noche(n.k) }); } },
});
pintarRiel();
const botonSonido = $('.sonido');
botonSonido.setAttribute('aria-pressed', sonidoPrendido());
botonSonido.addEventListener('click', () => {
  if (botonSonido.classList.contains('is-bloqueado')) return sonar('prendido'); // este toque es el que lo destraba: no lo apaga
  botonSonido.setAttribute('aria-pressed', alternarSonido());
});
panel.addEventListener('click', () => panel.classList.remove('is-min'), true);

// ── La moto va adonde la llaman: en cada viaje recorre la línea hasta la casa y toca el timbre
function ir(u, alLlegar) {
  if (!scene) return 0;
  const a = scene.app, duration = reduced ? .01 : clamp(Math.abs(u - a.u) * 4.2, .9, 1.9);
  a.desde = a.u;
  gsap.killTweensOf(a, 'u');
  gsap.to(a, { u, duration, ease: 'power2.inOut', onComplete: alLlegar });
  return duration;
}
const tocarTimbre = () => { if (scene) gsap.fromTo(scene.app, { timbre: .001 }, { timbre: 1, duration: 1.2, ease: 'none' }); };

// ── La historia de cada uno: su video, pide, llega la mochila y se abre la bolsa. Avanza con cada click
const clip = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto' });
clip.setAttribute('muted', ''); clip.setAttribute('playsinline', '');
let perfilOn = null, paso = 0, videoListo = false;
// la pantalla del celular se enciende recién cuando el video de este perfil tiene imagen propia (nunca se ve el cuadro del anterior)
const encender = () => { if (perfilOn !== null) gsap.delayedCall(.08, () => { if (perfilOn !== null) scene?.visor?.pantallaOn(true); }); };
clip.addEventListener('playing', encender); clip.addEventListener('loadeddata', encender);
const clips = new Map(); // cada clip se baja una sola vez
const bajarClip = async src => { // sin clip todavía devuelve null
  if (!clips.has(src)) {
    let url = null;
    try { const r = await fetch(src); if (r.ok && /video/.test(r.headers.get('content-type') || '')) url = URL.createObjectURL(await r.blob()); } catch {}
    clips.set(src, url);
  }
  return clips.get(src);
};
// Perfil sin clip: su foto con un acercamiento lento, 9:16, hasta que se sume el mp4 (mismo nombre en assets/video)
const kb = { id: 0, cv: Object.assign(document.createElement('canvas'), { width: 1080, height: 1920 }), img: null, raf: 0, stream: null };
function fotoEnMovimiento(p) {
  cancelAnimationFrame(kb.raf);
  const id = ++kb.id; // si llega primero el video real, la foto que todavía decodifica no lo pisa
  if (!p) return;
  const dibujar = t => {
    const { cv, img } = kb, g = cv.getContext('2d'), z = 1 + .12 * (.5 - .5 * Math.cos(t / 12000 * Math.PI * 2));
    const k = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight) * z, w = img.naturalWidth * k, h = img.naturalHeight * k;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (cv.width - w) / 2, (cv.height - h) * .3, w, h);
    kb.raf = requestAnimationFrame(dibujar);
  };
  const img = Object.assign(new Image(), { src: foto(p) });
  img.decode().then(() => { if (id !== kb.id || perfilOn === null || PERFILES[perfilOn] !== p) return; kb.img = img; kb.stream ||= kb.cv.captureStream(30); clip.removeAttribute('src'); clip.srcObject = kb.stream; dibujar(0); clip.play().catch(() => {}); }).catch(() => {});
}
const caida = { y: 1.2 }, entrada = { k: 0 }, aviso = $('.aviso');
const posePerfil = () => {
  const m = mobile(), H = innerHeight;
  // en vertical, el celular entra justo entre el riel y el panel, en cualquier alto de pantalla
  const libre = H * .46 - 62, unidad = Math.min(4.6, 4.6 * innerWidth / H * 1.15);
  const tel = m ? { x: -.245, y: .5 - (54 + libre / 2) / H, s: Math.min(.46, libre / H * 4.6 / 1.476 / unidad) } : { x: .03, y: 0, s: .52 };
  return {
    tel: { ...tel, y: tel.y - (1 - entrada.k) * 1.15 }, // el celular sube desde abajo del cuadro
    x: m ? .17 : .3, y: m ? tel.y - .02 : -.1, s: m ? tel.s * .35 : .22, spin: 0, idle: 0,
  };
};
function abrirPerfil(i) {
  perfilOn = i;
  root.classList.toggle('is-perfil', i !== null);
  if (i === null) {
    clip.pause(); fotoEnMovimiento(null); aviso.classList.remove('is-on');
    if (!scene) return;
    gsap.killTweensOf(scene.app, 'perfilK');
    gsap.to(caida, { y: 1.2, duration: .3, ease: 'power2.in', overwrite: true });
    gsap.to(entrada, { k: 0, duration: reduced ? .01 : .4, ease: 'power2.in', overwrite: true, onUpdate: () => scene.visor?.setPose({ ...posePerfil(), y: caida.y }), onComplete: () => scene.mostrarVisor(false) });
    gsap.to(scene.app, { perfilK: 0, seguirK: 0, duration: .8, ease: 'power2.inOut', overwrite: 'auto' });
    return;
  }
  const pf = PERFILES[i];
  clip.pause(); clip.removeAttribute('src'); clip.srcObject = null; clip.load(); // suelta el video del perfil anterior
  scene?.visor?.pantallaOn(false);
  fotoEnMovimiento(pf); // mientras carga el video, el celular muestra la foto: nunca una pantalla negra
  bajarClip(`assets/video/${pf.foto}.mp4`).then(url => {
    if (perfilOn !== i) return;
    if (!url) return; // sin clip queda la foto
    fotoEnMovimiento(null); clip.srcObject = null; clip.src = url;
    if (!reduced) clip.play().catch(() => {});
  });
  caida.y = 1.2;
  $('.perfil__media', panel)?.append(clip);
  paso = 0;
  ponerPaso(0);
  if (!scene) return;
  scene.app.perfil = i;
  if (!videoListo) { scene.visor?.setVideo(clip); videoListo = true; }
  scene.visor?.setFocus('mochila');
  scene.visor?.setPose({ ...posePerfil(), y: caida.y });
  scene.mostrarVisor(true);
  gsap.killTweensOf(scene.app, 'perfilK');
  gsap.to(scene.app, { perfilK: 1, duration: .9, ease: 'power2.inOut' });
  gsap.to(entrada, { k: 1, duration: reduced ? .01 : .85, delay: .3, ease: 'expo.out', overwrite: true });
}
function ponerPaso(k) {
  const antes = paso, a = scene?.app, d = reduced ? .01 : 1;
  paso = k;
  pedido.momento(k);
  aviso.classList.toggle('is-on', k === 1);
  // cada momento suena distinto: el aviso de la app, y al final el cierre de la mochila y el papel de la bolsa
  if (k < antes) sonar('pip');
  else if (k === 1 && antes !== 1) sonar('confirmado');
  else if (k === 3 && antes !== 3) { sonar('cierre', true); gsap.delayedCall(.24 * d, () => sonar('bolsa')); }
  if (!a || perfilOn === null) return;
  const u = scene.uDe(perfilOn);
  // Pide: la cámara sale a seguir a la moto hasta su casa
  if (k === 1) {
    const viaje = ir(u, () => { tocarTimbre(); sonar('bocina'); });
    gsap.to(a, { seguirK: 1, duration: .7 * d, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.fromTo(aviso, { '--go': 0 }, { '--go': 1, duration: viaje, ease: 'none', overwrite: true });
    return;
  }
  gsap.to(a, { seguirK: 0, duration: .7 * d, ease: 'power2.inOut', overwrite: 'auto' });
  // Mochila: la moto ya llegó, suena el timbre y cae
  if (k >= 2 && antes < 2) {
    gsap.killTweensOf(a, 'u'); a.u = u;
    tocarTimbre(); sonar('timbre');
    gsap.delayedCall(.47 * d, () => sonar('golpe'));
    gsap.to(caida, { y: posePerfil().y, duration: .85 * d, delay: .15 * d, ease: 'bounce.out', overwrite: true, onComplete: () => scene.visor?.kick() });
  } else if (k < 2 && antes >= 2) gsap.to(caida, { y: 1.2, duration: .4 * d, ease: 'power2.in', overwrite: true });
}
function avanzar() { if (perfilOn !== null && paso < 3) ponerPaso(paso + 1); }
function pintarPerfil() {
  const v = scene?.visor;
  if (perfilOn === null || !v) return;
  const p = posePerfil();
  v.setPose({ ...p, y: caida.y, open: paso === 3 ? 1 : 0, rise: paso === 3 ? 1 : 0 });
  if (paso === 1) { const r = v.pantallaEnCuadro(); aviso.style.setProperty('--x', `${r.x}px`); aviso.style.setProperty('--y', `${r.y - r.h * .36}px`); aviso.style.setProperty('--w', `${r.w * .9}px`); }
}
addEventListener('keydown', e => {
  if (perfilOn === null) return;
  if (e.key === 'Escape') pedido.ir('lista');
  else if (e.key === 'ArrowRight') avanzar();
});

// ── El pedido
const POSE_VISOR = () => ({ x: mobile() ? 0 : .13, y: mobile() ? .13 : -.06, s: mobile() ? .3 : .32, spin: 0, open: 0, rise: 0, idle: 1 });
function pedir() {
  pedido.ir('seguimiento');
  sonar('confirmado');
  const d = reduced ? .05 : 1, st = { k: 0 };
  let etapa = 0;
  if (!scene) return setTimeout(llego, 900);
  const a = scene.app, desde = a.u, hasta = scene.uHogar;
  gsap.killTweensOf(a, 'u');
  a.desde = a.u;
  gsap.timeline()
    .to(a, { seguirK: 1, duration: .7 * d, ease: 'power2.inOut' }, 0)
    .to(st, {
      k: 1, duration: 3.4 * d, ease: 'none',
      onUpdate() { const x = st.k * 4, i = Math.min(3, Math.floor(x)); if (i !== etapa) { etapa = i; sonar('etapa', i); } pedido.etapa(i, x - i); a.u = desde + (hasta - desde) * smooth(.12, 1, st.k); },
    }, 0)
    .add(() => sonar('bocina'), 3 * d)
    .add(llego);
}
function llego() {
  sonar('timbre');
  tocarTimbre();
  gsap.delayedCall(reduced ? .05 : .4, () => sonar('golpe'));
  gsap.delayedCall(reduced ? .3 : 1.5, () => sonar('logro'));
  root.classList.add('is-llego');
  pedido.ir('llego');
  if (!reduced) gsap.from('.fin span, .caras .cara, .tarjeta .cta, .correo', { y: 16, opacity: 0, duration: .7, stagger: .03, delay: .15, ease: 'expo.out', clearProps: 'transform,opacity' }); // las caras llevan su foto en el estilo: no se borra
  const v = scene?.visor;
  if (!v) return;
  const p = POSE_VISOR(), cae = { y: 1.1 };
  scene.mostrarVisor(true);
  gsap.to(scene.app, { puerta: 1, duration: reduced ? .05 : 1.1, ease: 'power2.inOut' });
  gsap.to(cae, { y: p.y, duration: reduced ? .01 : 1, ease: 'bounce.out', onUpdate: () => v.setPose({ ...p, y: cae.y }), onComplete: () => v.kick() });
}
function otra() {
  root.classList.remove('is-llego');
  scene?.mostrarVisor(false);
  scene?.visor?.setFocus('mochila');
  if (scene) gsap.to(scene.app, { puerta: 0, seguirK: 0, duration: 1, ease: 'power2.inOut' });
}

// El mapa: arrastrar lo mueve, tocar una cara abre su historia
let apuntado = -1;
const puedeElegir = () => listo && scene && ['lista', 'pedido'].includes(panel.dataset.vista);
if (scene) crearMando($('.pantalla'), scene.libre, {
  activo: puedeElegir,
  tocar(x, y) { if (!puedeElegir()) return; const i = scene.pinEn(x, y); if (i >= 0) pedido.abrir(i); },
  alArrastrar() { if (mobile()) panel.classList.add('is-min'); },
});
addEventListener('pointermove', e => {
  if (!puedeElegir()) return;
  const i = e.target.closest('.app, .mando, .tab, .perilla, .sonido') ? -1 : scene.pinEn(e.clientX, e.clientY);
  if (i >= 0 && i !== apuntado) sonar('tic');
  apuntado = i;
  scene.enfocar(i >= 0 ? i : null);
  document.body.style.cursor = i >= 0 ? 'pointer' : '';
}, { passive: true });

// ── El bucle: un solo lugar mueve todo
gsap.ticker.add(() => { pintarPerfil(); scene?.tick(); moto(scene?.app.velocidad ?? 0); botonSonido.classList.toggle('is-bloqueado', sonidoBloqueado()); });

// ── Carga real: fuentes, fotos y escena, contada como el seguimiento de un pedido. Cuando llega, se levanta el rojo
const loader = $('.loader'), etapaCarga = $('.carga__etapa'), barraCarga = $('.carga__barra'), barras = [...barraCarga.querySelectorAll('b')], avisoSonido = $('.carga__sonido');
// Tocar en cualquier parte del cargador destraba el audio: así la apertura se escucha entera
loader.addEventListener('click', () => sonar('prendido'), { once: true });
const tareas = [
  ...['800 40px Poppins', '700 40px Poppins', '500 16px Inter'].map(f => document.fonts.load(f)),
  ...PERFILES.map(p => new Promise(ok => { const i = new Image(); i.onload = i.onerror = ok; i.src = foto(p); })),
  scene?.ready ?? Promise.resolve(),
];
let hechas = 0, vista = 0;
tareas.forEach(t => Promise.resolve(t).catch(() => {}).then(() => { hechas++; }));
const LLEGAMOS = '¡Llegamos!';
const decir = texto => { if (etapaCarga.textContent === texto) return; sonar('etapa', texto === LLEGAMOS ? 3 : 1); etapaCarga.textContent = texto; etapaCarga.classList.remove('is-nueva'); void etapaCarga.offsetWidth; etapaCarga.classList.add('is-nueva'); };
const RITMO_CARGA = 1.25; // velocidad de la pantalla de carga: 1 = la original, 1,25 = un 25 % más rápida
function cargar(_, dt) {
  // avanza con la carga real, pero a un ritmo que deja leer cada etapa y, si hace falta, tocar el aviso de sonido
  const bloqueado = sonidoBloqueado();
  vista = Math.min(hechas / tareas.length, vista + dt * RITMO_CARGA / (bloqueado ? 3800 : 2300));
  if (!bloqueado && !avisoSonido.classList.contains('is-activo')) { avisoSonido.classList.add('is-activo'); avisoSonido.lastElementChild.textContent = 'Sonido activado'; }
  barras.forEach((b, i) => { b.style.width = clamp(vista * 3 - i) * 100 + '%'; });
  barraCarga.setAttribute('aria-valuenow', Math.round(vista * 100));
  decir(vista >= 1 ? LLEGAMOS : vista > .45 ? 'En camino' : 'Armando tu pedido');
  if (vista < 1) return;
  gsap.ticker.remove(cargar);
  gsap.delayedCall(.55 / RITMO_CARGA, () => {
    sonar('telon');
    document.body.classList.remove('is-loading');
    loader.classList.add('is-out');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    scene?.visor?.grab($('.grab'), avanzar, abierta => sonar('cierre', abierta));
    abrir();
  });
}
gsap.ticker.add(cargar);
// La apertura (apertura.js) y después el mapa
function abrir() {
  const fin = () => { listo = true; scene?.libre.activar(true); };
  const alLlegar = () => { root.classList.add('is-app'); sonar('slide'); };
  if (reduced || !scene?.visor) {
    $('.titulo').style.opacity = 0;
    if (scene) Object.assign(scene.app, { apertura: false, isla: null, sombra: 1, motoK: 1, intro: 1 });
    alLlegar();
    return fin();
  }
  // los pines aparecen casi juntos: suena uno de cada dos y las notas se escalonan en una escala que sube
  let primero = 0;
  scene.app.alPin = i => { if (i % 2) return; const ahora = performance.now(); primero ||= ahora; gsap.delayedCall(Math.max(0, primero + i * 50 - ahora) / 1000, () => sonar('pin', i / 2)); };
  const tl = crearApertura(scene, { titulo: $('.titulo'), alLlegar, alTerminar: fin });
  window.__deck.apertura = tl;
}
document.addEventListener('visibilitychange', () => scene?.pause(document.hidden));

// Para revisar el deck con Chrome automatizado
window.__deck = { scene, pedido, sonido: { sonar, medir, registro, recetas: Object.keys(RECETAS) } };
