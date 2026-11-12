// L'Oréal Groupe × BIG · «Primera fila». El hilo conductor: carga, navegación, hoja de ruta, cámara, sonido y lo que pasa
// en cada capítulo. La sala 3D (sala.js) solo dibuja el `estado` que se le pone acá. La interfaz está en pack.js (el
// carrusel y el detalle de cada perfil) y tarjetas.js (las tarjetas del detalle).
//
// El recorrido: Invitación → El desfile (la portada: cinco productos que suben solos) → El pack (el carrusel; al tocar
// una tarjeta, su video en la pantalla y su producto en la tarima) → ¿Hablamos?. Cada <section class="escena"> tiene una
// toma de cámara (TOMAS) y un estado de la sala (ESTADOS) que dependen del avance p (0 → 1) mientras está fija. Al entrar
// la siguiente, cámara y sala pasan de una a otra durante una pantalla de scroll.
//
// La navegación: el deck se mueve entre paradas (data-paradas). Cada movimiento entre paradas es un viaje animado cuya
// duración sale de lo que pasa en el tramo (RITMO): el sobre se abre en ~2,8 s, el desfile corre en ~9 s y los cambios de
// capítulo duran ~1,5 s. Cualquier gesto (rueda, toque, tecla, la píldora «siguiente») dispara el viaje a la parada
// siguiente en esa dirección, y el usuario puede tomar el control en cualquier momento.
import { crearSala } from './sala.js';
import { cargarImagen, prepararModelo } from './producto.js';
import { total } from './tarjetas.js';
import { crearPack } from './pack.js';
import * as S from './sonido.js';

const P = window.PERFILES, DIV = window.DIVISIONES, MOM = window.MOMENTOS, CONTACTO = window.CONTACTO;
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVIL = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mezclar = (a, b, t) => a + (b - a) * t;
const lin = (a, b, t) => a.map((v, i) => mezclar(v, b[i], t));
const toma = (A, B, t) => ({ pos: lin(A.pos, B.pos, t), mira: lin(A.mira, B.mira, t), fov: mezclar(A.fov, B.fov, t) });
const apaisado = () => innerWidth / innerHeight > 1;
const foto = p => `assets/fotos/${p.foto}.webp`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = p => norm(p.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); // el link de cada perfil: #juli-savioli
const ETAPAS = ['Cinco minutos', 'Luces', 'Música', 'Primera salida'];
// las salidas de la portada: las elige perfiles.js (PORTADA); si falta alguna, se usan las primeras del pack
const PORTADA = (() => { const xs = (window.PORTADA || []).map(n => P.findIndex(p => p.nombre === n)).filter(i => i >= 0); return xs.length ? xs : [0, 1, 2, 3, 4]; })();

/* ── el ritmo de la navegación ── */
const RITMO = { inicio: 2.8, show: 9, pack: 0, contacto: 0 }; // segundos para recorrer cada capítulo hacia adelante
const TRANSICION = 1.5;                                       // segundos para pasar de un capítulo al siguiente
const ATRAS = .35;                                            // hacia atrás, todo va más rápido
// la píldora «siguiente»: qué dice en cada parada (capítulo:parada)
const CARTELES = { 'inicio:0': 'Abrir la invitación', 'show:5': 'Ver el pack' };
const PAUSA_DESFILE = 2.4; // segundos quieto en un producto antes de que el desfile pase solo al siguiente
// para los viajes largos: arranca y frena suave, y en el medio va parejo (que el desfile no se acelere ni se frene)
const io = x => (1 - Math.cos(Math.PI * clamp(x))) / 2;
// del sobre a la sala, en un solo gesto: abre el sobre, se queda un momento en la carta (f = dónde está la carta en el tramo) y entra
const curvaSobre = f => t => (t < .46 ? f * curvaPaso(t / .46) : t < .58 ? f : f + (1 - f) * io((t - .58) / .42));
// un paso: acelera en el primer 12 % (así el gesto se nota al instante) y aterriza largo y suave
const curvaPaso = t => { const r = .12, v = 1 / (r / 2 + (1 - r) / 3); return t < r ? v * t * t / (2 * r) : v * r / 2 + v * (1 - r) / 3 * (1 - ((1 - t) / (1 - r)) ** 3); };
const curvaPareja = t => { const r = .16, v = 1 / (1 - r); return t < r ? v * t * t / (2 * r) : t > 1 - r ? 1 - v * (1 - t) ** 2 / (2 * r) : v * (t - r / 2); };

/* ── los clips: uno por creador, recién cuando se necesita, para la pantalla de la sala ── */
const videos = new Map();
function video(p) {
  if (!p?.clip) return null;
  if (!videos.has(p)) {
    const v = document.createElement('video');
    Object.assign(v, { className: 'clip', muted: true, playsInline: true, loop: true, preload: 'auto', src: `assets/video/${p.clip}.mp4` });
    v.setAttribute('playsinline', ''); $('.videos-ocultos').append(v); videos.set(p, v);
  }
  return videos.get(p);
}

/* ── carga real, contada como el backstage antes de salir ── */
const fotos = new Map(), preparados = [];
async function cargar() {
  const etapa = $('.cargador__etapa'), barra = $('.cargador__barra i'), num = $('.cargador__n');
  const tareas = [
    () => Promise.all([document.fonts.load('400 100px "Bodoni Moda"'), document.fonts.load('500 16px "Inter Tight"'), document.fonts.load('600 16px "Inter Tight"'),
      document.fonts.load('400 100px "Pinyon Script"'), document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('500 40px "Cormorant Garamond"')]),
    ...P.filter(p => p.foto).map(p => async () => { fotos.set(p, await cargarImagen(foto(p))); }),
    ...P.map((p, i) => async () => {
      const im = await cargarImagen(`assets/productos/${p.producto}.webp`);
      await new Promise(r => requestAnimationFrame(r));
      preparados[i] = prepararModelo(p.producto, im, { maxTextura: MOVIL ? 640 : 1024, anisotropia: MOVIL ? 4 : 8 });
    }),
  ];
  let hechas = 0, mostrado = 0, etapaVista = -1;
  const pintar = () => {
    const real = hechas / tareas.length;
    mostrado = Math.min(real, mostrado + .012 + (real - mostrado) * .08);
    barra.style.transform = `scaleX(${mostrado})`; num.textContent = Math.round(mostrado * 100);
    const e = Math.min(3, Math.floor(mostrado * 4 - .001));
    if (e > etapaVista) { etapaVista = e; etapa.textContent = ETAPAS[Math.max(0, e)]; S.sonar('llamado', e); }
    if (mostrado < 1) requestAnimationFrame(pintar);
  };
  requestAnimationFrame(pintar);
  for (const t of tareas) { await t(); hechas++; }
  await new Promise(r => { const espera = () => (mostrado >= 1 ? r() : requestAnimationFrame(espera)); espera(); });
  await new Promise(r => setTimeout(r, REDUCIDO ? 0 : 420));
}

/* ── la portada: el primer producto sube solo, de cerca; los demás, a medida que la cámara se aleja ── */
const SUBIDA = { espera: .7, dura: .9 }; // segundos: cuándo arranca el primero y cuánto tarda en subir
const alturaPortada = (k, t, p) => (k === 0 ? Math.max(suave(t - SUBIDA.espera, 0, SUBIDA.dura), suave(p, 0, .06)) : suave(p, .1 + (k - 1) * .12, .22 + (k - 1) * .12));
const CENTRO_PORTADA = -8.6; // la fila de productos: de z −15 (el primero, que sale del fondo) a −2,2
// la cámara sigue siempre al producto que está saliendo: un foco que avanza parejo de uno al siguiente (en el medio de
// cada subida) y una distancia que solo crece. Así se aleja sin ir y venir y nunca pierde al que sube
const focoPortada = p => clamp((p - .1) / .12, 0, PORTADA.length - 1);

/* ── las tomas: dónde está la cámara en cada capítulo ── */
let detalleT = 0, salaRef = null;
const TOMAS = {
  // el sobre: la cámara sube con la tarjeta mientras sale y después se acerca a la tarjeta de frente
  inicio: p => {
    const a = clamp(p * 1.25), arriba = .46 * suave(a, .2, .6) * (1 - suave(a, .68, 1)), cerca = suave(a, .62, 1);
    const lejos = apaisado() ? 17.6 : 19.2, final = apaisado() ? 16.6 : 17.7;
    return { pos: [0, 1.55 + arriba, mezclar(lejos, final, cerca)], mira: [0, 1.55 + arriba + .02 * cerca, mezclar(13, 13.65, cerca)], fov: 34 };
  },
  // el desfile: de cerca sobre la primera tarima; se aleja hacia atrás sin volver nunca, mirando siempre al producto que
  // sale, y al final se abre de frente para la vuelta final
  show: p => {
    const pos = salaRef?.posicionesDesfile(PORTADA.length, CENTRO_PORTADA) ?? PORTADA.map((_, k) => [0, -15 + k * 3.2]);
    const f = focoPortada(p), i = Math.min(PORTADA.length - 2, Math.floor(f)), u = suave(f - i, 0, 1);
    const x = mezclar(pos[i][0], pos[i + 1][0], u), z = mezclar(pos[i][1], pos[i + 1][1], u);
    const d = mezclar(2.5, 4.6, suave(p, .02, .5)), lado = apaisado() ? .55 : .3;
    const sigue = { pos: [x + d * lado, 1.1 + d * .16, z + d * .84], mira: [x - .2 * lado, .95, z - 1.2], fov: mezclar(36, 38, suave(p, 0, .5)) };
    const abierta = { pos: [0, 2.2, 5.6], mira: [0, 1.5, -18], fov: 40 };
    return toma(sigue, abierta, suave(p, .6, .9));
  },
  // el pack: la cinta de frente; con un perfil abierto, la cámara va a la tarima con la pantalla detrás. La toma del
  // detalle va un poco más alta y casi de frente: el producto queda más abajo y delante de la pantalla, y la pantalla
  // (con su nombre y su marca) entra entera, corrida hacia el centro
  pack: () => {
    const cinta = apaisado() ? { pos: [0, 2.1, 10.4], mira: [0, .95, 4.4], fov: 36 } : { pos: [0, 2.9, 11.9], mira: [0, -.1, 4.4], fov: 36 };
    const tarima = apaisado() ? { pos: [.6, 1.5, 1.6], mira: [-.3, 1.5, -2.8], fov: 34 } : { pos: [.4, 1.5, 1.8], mira: [-.1, .5, -2.8], fov: 34 };
    return toma(cinta, tarima, suave(detalleT, 0, 1));
  },
  contacto: () => TOMAS.pack(), // la cámara no se mueve: el cierre es un bloque plano que tapa la sala
};

/* ── el estado de la sala en cada capítulo ── */
let reloj = 0, packFoco = 0, detalle = null, momentoPack = null, t0Portada = 0;
const base = () => ({
  luz: 0, publico: 0, haces: 0, ola: 0, pasarela: 0, foco: 0, flashes: 0, cinta: 0, color: '#ffffff', ledBrillo: 1, resplandor: 1, focoEn: null,
  pedestal: { producto: null, altura: 0 }, desfile: { lista: [], altura: 0 }, invitacion: { abre: 1, visible: 0 },
  pantalla: { tipo: 'apagada' }, voces: { publico: 0, musica: 0, abierta: 0 },
});
// los cuatro momentos de una idea, en la sala: t es el tiempo desde que se tocó el momento
function momento(e, p, i, m, t) {
  if (m === 0) Object.assign(e, { luz: .42, publico: .7, haces: .4, pasarela: .3, pedestal: { producto: i, altura: 1 }, pantalla: { tipo: p.clip ? 'clip' : 'foto', perfil: p }, voces: { publico: .5, musica: .3, abierta: .08 } });
  if (m === 1) Object.assign(e, { luz: .07, publico: .18, haces: .06, pasarela: .06, ledBrillo: .55, foco: .2, pedestal: { producto: i, altura: 0 }, pantalla: { tipo: 'foto', perfil: p, oscura: true }, voces: { publico: .14, musica: .55, abierta: .03 } });
  if (m === 2) Object.assign(e, { luz: .16, publico: .3, haces: .5, ola: suave(t, 0, 2.4), pasarela: .15, foco: suave(t, 1, 2), pedestal: { producto: i, altura: suave(t, .9, 2.4) }, pantalla: { tipo: 'titulo', texto: p.marca, sub: p.linea }, voces: { publico: .25, musica: .8, abierta: .55 } });
  if (m === 3) Object.assign(e, { luz: .5, publico: 1, haces: 1, ola: 1, pasarela: .8, foco: .8, flashes: t < 3 ? 9 : 2.5, pedestal: { producto: i, altura: 1 }, pantalla: { tipo: p.clip ? 'clip' : 'foto', perfil: p }, voces: { publico: .45, musica: 1, abierta: 1 } });
  return e;
}
const olaHasta = z => clamp((z + 26) / 26.4); // la luz que camina, hasta el pedestal en z
const ESTADOS = {
  inicio: p => ({ ...base(), resplandor: .08, invitacion: { abre: clamp(p * 1.25), visible: 1 }, voces: { publico: .1 * p, musica: .12 * p, abierta: 0 } }),
  show: p => {
    const t = reloj - t0Portada, pos = salaRef?.posicionesDesfile(PORTADA.length, CENTRO_PORTADA) ?? PORTADA.map(() => [0, -12]);
    const alturas = PORTADA.map((_, k) => alturaPortada(k, t, p));
    // la que está subiendo ahora: su luz recorre la pasarela y los fotógrafos disparan
    let k = -1; alturas.forEach((h, j) => { if (h > .02) k = j; });
    const z = k >= 0 ? pos[k][1] : -26, antes = k > 0 ? olaHasta(pos[k - 1][1]) : 0, enCurso = k >= 0 && alturas[k] < .98;
    const final = p > .72;
    return { ...base(), fase: final ? 'final' : 'desfile',
      luz: mezclar(.12, .5, suave(t, 0, 1.6)) + (final ? .08 : 0), publico: mezclar(.3, 1, suave(t, 0, 2)), haces: final ? 1 : .7, pasarela: .3, foco: k >= 0 ? .32 : 0,
      focoEn: k >= 0 ? pos[k] : null, color: k >= 0 ? P[PORTADA[k]].color : '#ffffff',
      ola: k < 0 ? 0 : enCurso ? mezclar(antes, olaHasta(z), suave(alturas[k], 0, .6)) : 1,
      flashes: final ? 10 : enCurso ? 6 : 2, desfile: { lista: PORTADA, alturas, centro: CENTRO_PORTADA },
      // la pantalla solo dice «Primera fila»; apagada en el plano cerrado del primer producto (quedaría cortada) y en la
      // vuelta final, donde manda el título
      pantalla: final || p < .12 ? { tipo: 'apagada' } : { tipo: 'titulo', texto: 'Primera fila', sub: "L'Oréal Groupe × BIG" },
      voces: { publico: final ? .85 : .55, musica: mezclar(.5, 1, suave(t, 0, 2)), abierta: mezclar(.3, 1, suave(t, 0, 2)) } };
  },
  pack: () => {
    const abierta = detalle != null, p = P[abierta ? detalle : packFoco];
    const e = { ...base(), luz: .36, publico: .45, haces: .35, ola: 1, pasarela: .4, foco: .1, cinta: 1 - detalleT * .96, color: p.color, ledBrillo: .9, voces: { publico: .3, musica: .45, abierta: .45 } };
    if (abierta) { // su video en la pantalla y su producto en la tarima, adelante
      Object.assign(e, { luz: .38, publico: .6, haces: .5, foco: .9, pedestal: { producto: detalle, altura: detalleT > .3 ? 1 : 0 }, pantalla: { tipo: p.clip ? 'clip' : 'foto', perfil: p }, voces: { publico: .35, musica: .4, abierta: .35 } });
      if (momentoPack) { momento(e, p, detalle, momentoPack.k, reloj - momentoPack.t0); e.cinta = 1 - detalleT * .96; }
    }
    return e;
  },
  contacto: () => ({ ...ESTADOS.pack(), luz: .12, publico: .2, haces: .1, voces: { publico: .1, musica: .25, abierta: .2 } }),
};
function fundir(a, b, t) { // lo numérico se funde; lo discreto cambia a mitad de camino
  if (t <= 0 || !b) return a;
  const r = t < .5 ? { ...a } : { ...b };
  for (const k of ['luz', 'publico', 'haces', 'ola', 'pasarela', 'foco', 'flashes', 'cinta', 'ledBrillo', 'resplandor']) r[k] = mezclar(a[k], b[k], t);
  r.voces = Object.fromEntries(Object.keys(a.voces).map(k => [k, mezclar(a.voces[k], b.voces[k], t)]));
  r.invitacion = { abre: t < .5 ? a.invitacion.abre : b.invitacion.abre, visible: mezclar(a.invitacion.visible, b.invitacion.visible, t) };
  return r;
}

/* ── arranque ── */
async function iniciar() {
  const canvas = $('canvas.sala'), siguiente = $('.siguiente'), show = $('#show');
  let activa = null, previa = {}, arrastre = null, hoverCaja = -1, hudVisible = null;
  let paradaActual = 0, ultimoMovimiento = 0, viajeHasta = 0, viajeDir = 0, viajeCola = true, autoDesde = -9, ultimaActividad = 0, ultimoAutoPaso = 0, pasoMudo = -9;
  let tAbre = 0, pausaLenis = false, ruedaDetalle = 0, cartelTexto = null, telonVisto = -1;
  try { await cargar(); } catch (err) { console.error(err); }

  let sala;
  try {
    sala = crearSala({ canvas, perfiles: P, fotos, preparados, video, movil: MOVIL, reducido: REDUCIDO, salidas: PORTADA.length,
      alFlash: () => S.sonar('obturador'),
      // la tarjeta que queda de frente; el giro automático del carrusel no suena
      alFoco: i => { packFoco = i; if (activa === 'pack' && detalle == null && reloj - pasoMudo > 2.5) S.sonar('tic'); } });
  } catch (err) {
    console.warn('Sin 3D:', err); document.body.classList.add('sin-3d');
    const nada = () => {};
    sala = { estado: base(), pantalla: { poner: nada }, cinta: new Proxy({}, { get: () => nada }), tomar: nada, mano: nada, tocar: () => null, resize: nada, cuadro: nada, posicionesDesfile: n => Array.from({ length: n }, () => [0, -12]) };
  }
  salaRef = sala;
  const sin3d = document.body.classList.contains('sin-3d');
  if (sin3d) RITMO.show = 2; // sin sala no hay desfile que mirar: el capítulo muestra directo el título y las cifras

  // scroll: Lenis, suave pero preciso; con movimiento reducido, el del navegador
  history.scrollRestoration = 'manual';
  // La rueda y el dedo nunca mueven la página: cada gesto (una pasada, con toda su inercia) cuenta como un paso, y el paso es
  // un viaje animado a la parada siguiente. Así el scroll no puede trabarse ni pelearse con las animaciones. Lo que pesa es
  // cuánto hay que mover para que el gesto cuente: poco en general, más en el desfile y mucho para salir del carrusel
  const enDesfile = y => { const sh = escena('show'); return y > sh.top - 2 && y < yParada(sh, 1) + 2; };
  const dentroDeUnPanel = ev => ev.composedPath?.().some(n => n.hasAttribute?.('data-lenis-prevent'));
  // cuánto tiene que mover un gesto para contar. Con la rueda alcanza con poco (un roce no llega); con el dedo cuenta lo que
  // recorre. Salir del carrusel al cierre pide un gesto largo, a propósito
  const fuerza = (dir, dedo) => {
    if (dir > 0 && activa === 'pack') return dedo ? 220 : 180;
    return dedo ? 36 : 12;
  };
  // La rueda y el trackpad llegan como un chorro de eventos: el empujón del dedo y después la inercia, que se apaga sola.
  // Un gesto nuevo es un chorro que arranca después de una pausa, o uno que vuelve a crecer cuando la inercia ya se estaba
  // apagando (el dedo empujó otra vez, sin soltar el chorro). La inercia sola nunca cuenta como otro paso
  const nuevoGesto = (t, dir) => ({ t, dir, acum: 0, armado: true, hist: [], pico: 0, decayo: false, disparo: -1e9 });
  const prom = (h, n) => { const v = h.slice(-n); return v.reduce((a, b) => a + b, 0) / v.length; };
  let gesto = nuevoGesto(-1e9, 0);
  const lenis = !REDUCIDO && window.Lenis ? new window.Lenis({ lerp: .09, smoothWheel: true,
    virtualScroll: ({ deltaX, deltaY, event: ev }) => {
      if (dentroDeUnPanel(ev)) return true; // el panel del detalle scrollea solo
      if (ev.cancelable) ev.preventDefault();
      if (detalle != null || (arrastre && Math.abs(arrastre.total) > 12)) return false; // con un perfil abierto, el gesto lo cierra (más abajo); arrastrando la cinta, no cuenta
      if (Math.abs(deltaX) > Math.abs(deltaY)) return false; // un gesto de costado no es un paso
      const ahora = performance.now(), dir = Math.sign(deltaY), dedo = ev.type.startsWith('touch'), m = Math.abs(deltaY);
      if (ev.type === 'touchstart') { gesto = nuevoGesto(ahora, 0); return false; }
      if (!dir || ev.type === 'touchend') return false;
      if (dir !== gesto.dir || (!dedo && ahora - gesto.t > 220)) gesto = nuevoGesto(ahora, dir); // un chorro nuevo (o el otro sentido)
      gesto.t = ahora;
      if (!dedo) {
        const h = gesto.hist; h.push(m); if (h.length > 50) h.shift();
        const ya = prom(h, 5); gesto.pico = Math.max(gesto.pico, ya);
        if (ya < gesto.pico * .55) gesto.decayo = true; // la inercia se está apagando
        if (!gesto.armado && gesto.decayo && h.length > 10 && ya > prom(h, 40) * 1.2 + .4 && ahora - gesto.disparo > 350) { gesto.armado = true; gesto.acum = 0; } // vuelve a crecer: otro empujón
      }
      if (!gesto.armado) return false;
      gesto.acum += m;
      if (gesto.acum > fuerza(dir, dedo)) { Object.assign(gesto, { armado: false, decayo: false, pico: gesto.hist.length ? prom(gesto.hist, 5) : 0, disparo: ahora }); paso(dir); }
      return false;
    } }) : null;
  const posicion = () => (lenis ? lenis.animatedScroll : scrollY);
  const saltar = y => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y));
  window.__deck = { sala, S, P, PORTADA, lenis, foco: () => packFoco };

  // el pack: el carrusel, y el detalle de cada perfil al tocarlo. Con un perfil abierto, la página queda fija (un scroll lo
  // cierra) y la dirección cambia a #su-nombre, para poder mandar el link de una dupla
  const pasar = d => { if (sin3d) { packFoco = ((detalle ?? packFoco) + d + P.length) % P.length; return packFoco; } return sala.cinta.paso(d); };
  const ponerHash = h => history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
  const pack = crearPack({
    raiz: $('.fijo--pack'), perfiles: P, divisiones: DIV, momentos: MOM, foto, sonar: S.sonar, sinCinta: sin3d,
    alAbrir: i => {
      detalle = i; momentoPack = null; packFoco = i; tAbre = reloj; ruedaDetalle = 0;
      if (!sin3d) sala.cinta.irA(i);
      const v = video(P[i]); if (v) v.currentTime = 0;
      lenis?.stop(); ponerHash(slug(P[i])); audioClip();
      setTimeout(() => { if (detalle === i) S.sonar('pedestal'); }, 380);
    },
    alCerrar: () => { detalle = null; momentoPack = null; if (!pausaLenis) lenis?.start(); ponerHash(''); audioClip(); },
    alPaso: pasar,
    alMomento: (i, k) => { momentoPack = { k, t0: reloj }; if (k === 1) S.sonar('luces', false); if (k === 3) { S.sonar('rafaga', 8); S.sonar('luces', true); } },
  });
  armarCifras();
  $('[data-correo]').href = `mailto:${CONTACTO}?subject=${encodeURIComponent("Primera fila · L'Oréal Groupe × BIG")}&body=${encodeURIComponent('Hola, BIG.\n\nQueremos hablar de Primera fila.\n')}`;

  // capítulos y paradas
  const escenas = $$('.escena').map(el => ({ el, id: el.id, capitulo: el.dataset.capitulo, toma: TOMAS[el.id], paradas: (el.dataset.paradas || '0').split(',').map(Number), top: 0, alto: 0 }));
  const escena = id => escenas.find(x => x.id === id);
  let vh = innerHeight, paradas = [];
  const yParada = (s, q) => s.top + q * Math.max(0, s.alto - vh);
  const medir = () => {
    vh = innerHeight; escenas.forEach(s => { s.top = s.el.offsetTop; s.alto = s.el.offsetHeight; });
    paradas = escenas.flatMap(s => s.paradas.map(q => yParada(s, q))).sort((a, b) => a - b);
    sala.resize();
  };
  addEventListener('resize', medir);
  new ResizeObserver(medir).observe(document.body);
  medir();
  // ¿en qué parada estamos? { id, k } o null si está entre dos
  const paradaEn = y => { for (const s of escenas) for (let k = 0; k < s.paradas.length; k++) if (Math.abs(yParada(s, s.paradas[k]) - y) < 3) return { id: s.id, k }; return null; };

  /* ── los viajes: de una parada a otra, animados ── */
  // cuánto tarda un tramo: lo que dura cada capítulo que atraviesa (RITMO) más las transiciones entre capítulos
  const solape = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
  function costo(desde, hasta) {
    const a = Math.min(desde, hasta), b = Math.max(desde, hasta);
    let s = 0;
    for (const e of escenas) {
      const i0 = e.top, i1 = e.top + Math.max(0, e.alto - vh);
      if (i1 > i0) s += solape(a, b, i0, i1) / (i1 - i0) * RITMO[e.id];
      s += solape(a, b, i1, e.top + e.alto) / vh * TRANSICION;
    }
    return s;
  }
  function viajar(destino, { rapido = false } = {}) {
    if (detalle != null) pack.cerrar({ sonido: false });
    const desde = posicion();
    paradaActual = destino; viajeDir = Math.sign(destino - desde);
    if (Math.abs(destino - desde) < 2) return;
    if (!lenis) { scrollTo({ top: destino, behavior: REDUCIDO ? 'auto' : 'smooth' }); return; }
    const ini = escena('inicio'), carta = yParada(ini, 1), sh = escena('show');
    if (!rapido && destino > desde && desde < carta - 2 && destino >= sh.top - 2) { // del sobre a la sala: un gesto, lento y con pausa en la carta
      const f = (carta - desde) / (destino - desde), dur = mezclar(2.8, 5.4, clamp((carta - desde) / Math.max(1, carta - ini.top)));
      viajeHasta = reloj + dur; viajeCola = false; lenis.scrollTo(destino, { duration: dur, easing: curvaSobre(f), force: true }); return;
    }
    if (enDesfile(desde) && enDesfile(destino)) { // de producto a producto
      const dur = clamp(Math.abs(destino - desde) / Math.max(1, sh.alto - vh) * 9, 1.1, 2.1) * (destino < desde ? .6 : 1);
      viajeHasta = reloj + dur; viajeCola = true; lenis.scrollTo(destino, { duration: dur, easing: curvaPaso, force: true }); return;
    }
    const dur = clamp(costo(desde, destino) * (destino < desde ? ATRAS : 1), 1, rapido ? 2.6 : 12);
    viajeHasta = reloj + dur; viajeCola = true; lenis.scrollTo(destino, { duration: dur, easing: dur > 3.2 ? curvaPareja : curvaPaso, force: true });
  }
  const avanzar = (dir = 1) => {
    const y = posicion(), q = dir > 0 ? paradas.find(v => v > y + 4) : [...paradas].reverse().find(v => v < y - 4);
    if (q != null) viajar(q);
  };
  // un paso por gesto. Si el deck ya va para ese lado, el gesto no espera: en el viaje del sobre a la sala lo apura (se
  // saltea la pausa en la carta) y en el resto suma la parada siguiente sin frenar. Cada gesto suma una sola parada
  const paso = dir => {
    ultimaActividad = reloj;
    if (reloj < viajeHasta && dir === viajeDir && lenis) {
      if (reloj - autoDesde < .8) return; // el desfile recién arrancó solo: ese gesto ya está cumplido
      if (!viajeCola) { const dur = clamp((viajeHasta - reloj) * .4, 1, 2); viajeHasta = reloj + dur; viajeCola = true; lenis.scrollTo(paradaActual, { duration: dur, easing: curvaPaso, force: true }); return; }
      const q = dir > 0 ? paradas.find(v => v > paradaActual + 4) : [...paradas].reverse().find(v => v < paradaActual - 4);
      if (q != null) viajar(q);
      return;
    }
    avanzar(dir);
  };
  window.__deck.viajar = viajar; window.__deck.irAParada = (id, k = 0) => { const s = escena(id); if (s) viajar(yParada(s, s.paradas[k] ?? 0), { rapido: true }); };

  // si la página se mueve por otro lado (la barra del navegador, Inicio/Fin), al quedar quieta va a la parada más cercana
  let quieto = null;
  const asentar = () => {
    if (!lenis || arrastre || detalle != null || reloj < viajeHasta || window.__deck.sinParadas) return; // __deck.sinParadas: para revisar puntos intermedios
    const y = posicion();
    if (paradaEn(y)) return;
    viajar(paradas.reduce((m, q) => (Math.abs(q - y) < Math.abs(m - y) ? q : m), paradas[0]));
  };
  if (lenis) lenis.on('scroll', () => { ultimoMovimiento = reloj; clearTimeout(quieto); quieto = setTimeout(asentar, 200); });
  else addEventListener('scroll', () => { ultimoMovimiento = reloj; }, { passive: true });

  // la hoja de ruta y los links internos: viajes rápidos
  const ruta = $('.ruta');
  ruta.innerHTML = escenas.map(s => `<button type="button" data-ir="${s.id}">${s.capitulo}</button>`).join('') + '<span class="ruta__movil"><small></small><b></b><i></i></span>';
  const botonesRuta = $$('button', ruta), movilRuta = $('.ruta__movil', ruta);
  const irCapitulo = id => { const s = escena(id); if (s) { S.sonar('pip'); viajar(yParada(s, s.paradas[0]), { rapido: true }); } };
  ruta.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) irCapitulo(b.dataset.ir); });
  document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a) { e.preventDefault(); irCapitulo(a.getAttribute('href').slice(1)); } });
  // la píldora «siguiente» y el sobre: un toque lleva a la próxima parada (y, de paso, habilita el sonido)
  siguiente.addEventListener('click', () => { S.sonar('pip'); avanzar(1); });
  canvas.addEventListener('click', () => { if (activa === 'inicio') avanzar(1); });

  // teclado: ↑ ↓ (y espacio) de parada en parada; en el pack, ← → recorren, Enter abre la de frente y Esc cierra
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea') || e.altKey || e.metaKey || e.ctrlKey) return;
    if (activa === 'pack') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const i = pasar(e.key === 'ArrowRight' ? 1 : -1); if ((detalle != null || sin3d) && i != null) pack.abrir(i); return; }
      if (e.key === 'Enter' && detalle == null && !e.target.closest('button, a')) { e.preventDefault(); pack.abrir(packFoco); return; }
      if (e.key === 'Escape' && detalle != null) { pack.cerrar(); return; }
      if (detalle != null) return;
    }
    const sig = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button, a'));
    const ant = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!sig && !ant) return;
    e.preventDefault(); avanzar(sig ? 1 : -1);
  });

  // con un perfil abierto, scrollear (o deslizar) sobre la sala vuelve al carrusel; la página no se mueve hasta que pasa la inercia
  function cerrarPorGesto() { ruedaDetalle = 0; pausaLenis = true; pack.cerrar(); setTimeout(() => { pausaLenis = false; if (detalle == null) lenis?.start(); }, 700); }
  addEventListener('wheel', e => {
    if (detalle == null || e.target.closest?.('.detalle__panel')) return;
    ruedaDetalle += e.deltaY;
    if (Math.abs(ruedaDetalle) > 90 && reloj - tAbre > .8) cerrarPorGesto();
  }, { passive: true });
  let toqueY = null;
  addEventListener('touchstart', e => { toqueY = detalle != null && !e.target.closest('.detalle__panel') ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener('touchmove', e => { if (toqueY != null && Math.abs(e.touches[0].clientY - toqueY) > 70 && reloj - tAbre > .8) { toqueY = null; cerrarPorGesto(); } }, { passive: true });

  // el puntero: inclina el sobre, mueve un poco la cámara y, en el carrusel, toca y arrastra la cinta
  for (const ev of ['pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, () => { ultimaActividad = reloj; }, { passive: true });
  const ndc = e => [e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)];
  addEventListener('pointermove', e => {
    sala.mano(...ndc(e));
    if (activa !== 'pack' || detalle != null) return;
    ultimaActividad = reloj;
    if (arrastre) { // un dedo que va para arriba o abajo no arrastra la cinta: es un paso (lo cuenta el scroll)
      const dx = e.clientX - arrastre.x, dy = Math.abs(e.clientY - arrastre.y0); arrastre.x = e.clientX;
      if (!arrastre.vertical && arrastre.total < 12 && dy > arrastre.total + 10) arrastre.vertical = true;
      if (!arrastre.vertical) { arrastre.total += Math.abs(dx); sala.cinta.mover(dx); }
      return;
    }
    if (e.target !== canvas) { if (hoverCaja !== -1) { hoverCaja = -1; sala.cinta.hover(-1); } return; }
    const h = sala.tocar(...ndc(e)), i = h ? h.i : -1;
    canvas.style.cursor = h ? 'pointer' : 'grab';
    if (i !== hoverCaja) { hoverCaja = i; sala.cinta.hover(i); }
  });
  canvas.addEventListener('pointerdown', e => {
    if (activa !== 'pack' || detalle != null || e.button > 0) return;
    arrastre = { x: e.clientX, y0: e.clientY, total: 0, vertical: false }; sala.cinta.agarrar(); canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  });
  const soltar = e => {
    if (!arrastre) return;
    const recorrido = arrastre.total, vertical = arrastre.vertical || Math.abs(e.clientY - arrastre.y0) > 10; arrastre = null; sala.cinta.soltar(); canvas.style.cursor = 'grab';
    if (recorrido < 6 && !vertical) { const h = sala.tocar(...ndc(e)); if (h?.tipo === 'caja') pack.abrir(h.i); }
    else if (sala.cinta.velocidad() > .05) S.sonar('suelta');
  };
  canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);

  // el sonido
  const botonSonido = $('.sonido');
  const pintarSonido = () => { botonSonido.setAttribute('aria-pressed', String(S.sonidoPrendido())); botonSonido.classList.toggle('is-bloqueado', S.sonidoBloqueado()); };
  botonSonido.addEventListener('click', () => { S.alternarSonido(); pintarSonido(); audioClip(); });
  setInterval(pintarSonido, 600); pintarSonido();
  // el video del perfil abierto suena con su audio (la música baja); el resto, mudo. En el desfile manda la música
  function audioClip() {
    const suena = activa === 'pack' && detalle != null ? P[detalle] : null;
    videos.forEach((v, p) => { v.muted = !(p === suena && S.sonidoPrendido()); v.volume = .85; });
  }
  const conAudio = () => S.sonidoPrendido() && [...videos.values()].some(v => !v.muted && !v.paused);

  // de dónde arranca: del sobre o, con un link #pack o #nombre-del-creador, directo en el pack (y con ese perfil abierto)
  // (también si el link se pega con el deck ya abierto: ahí el navegador no recarga, solo cambia el #)
  function irAlPedido(alCargar) {
    const pedido = decodeURIComponent(location.hash.slice(1)), i = P.findIndex(p => slug(p) === pedido);
    if (pedido !== 'pack' && i < 0) return false;
    const y = escena('pack').top;
    if (alCargar) saltar(y); else viajar(y, { rapido: true });
    paradaActual = y;
    if (i >= 0 && i !== detalle) setTimeout(() => pack.abrir(i), alCargar ? 0 : 900);
    return true;
  }
  addEventListener('hashchange', () => irAlPedido(false));
  if (!irAlPedido(true)) { saltar(0); ponerHash(''); }
  document.body.classList.remove('is-cargando');
  medir();

  /* ── cada cuadro ── */
  let antes = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora; reloj += dt;
    lenis?.raf(ahora);
    detalleT = mezclar(detalleT, detalle != null ? 1 : 0, Math.min(1, dt * (REDUCIDO ? 30 : 3.2)));
    const y = posicion();
    let k = 0;
    for (let i = 0; i < escenas.length; i++) if (escenas[i].top <= y + 1) k = i;
    const a = escenas[k], b = escenas[k + 1];
    const largo = a.alto - vh, p = largo > 0 ? clamp((y - a.top) / largo) : 1;
    const tr = b ? suave(clamp((y - (b.top - vh)) / vh), 0, 1) : 0;
    const id = tr < .5 || !b ? a.id : b.id;
    if (id !== activa) cambioDeCapitulo(activa, id);
    pintarRuta(y, id);

    const tA = a.toma(p), tB = b ? b.toma(0) : tA;
    sala.tomar(lin(tA.pos, tB.pos, tr), lin(tA.mira, tB.mira, tr), mezclar(tA.fov, tB.fov, tr));
    const eA = ESTADOS[a.id](p), eB = b ? ESTADOS[b.id](0) : null, e = fundir(eA, eB, tr);
    Object.assign(sala.estado, { luz: e.luz, publico: e.publico, haces: e.haces, ola: e.ola, pasarela: e.pasarela, foco: e.foco, flashes: e.flashes, cinta: e.cinta, color: e.color, ledBrillo: e.ledBrillo, resplandor: e.resplandor, focoEn: e.focoEn });
    sala.estado.pedestal = e.pedestal; sala.estado.desfile = e.desfile; sala.estado.invitacion = e.invitacion;
    sala.pantalla.poner(e.pantalla);
    // el telón del cierre sube con el scroll entre el pack y «¿Hablamos?»
    const telon = Math.round((a.id === 'contacto' ? 1 : b?.id === 'contacto' ? clamp((y - (b.top - vh)) / vh) : 0) * 1000) / 1000;
    if (telon !== telonVisto) { telonVisto = telon; document.body.style.setProperty('--cierre', telon); document.body.classList.toggle('en-cierre', telon > .6); }
    if (a.id === 'show') pintarFase(sin3d ? { ...eA, fase: 'final' } : eA);

    // lo que se automatiza: el desfile corre solo después del primer producto, y el carrusel gira si nadie lo toca
    const parada = paradaEn(y), quietoHace = reloj < viajeHasta ? 0 : reloj - Math.max(ultimoMovimiento, viajeHasta);
    if (parada?.id === 'show' && parada.k < 5 && lenis && reloj - t0Portada > 2.6 && quietoHace > PAUSA_DESFILE && reloj - ultimaActividad > PAUSA_DESFILE) { autoDesde = reloj; avanzar(1); }
    if (activa === 'pack' && detalle == null && !arrastre && hoverCaja < 0 && !sin3d && !REDUCIDO && reloj - ultimaActividad > 5 && reloj - ultimoAutoPaso > 4.2 && quietoHace > 1) { ultimoAutoPaso = pasoMudo = reloj; sala.cinta.paso(1); }
    pintarSiguiente(parada, quietoHace);

    S.voz('publico', e.voces.publico); S.voz('musica', e.voces.musica * (conAudio() ? .35 : 1)); S.voz('abierta', e.voces.abierta);
    S.voz('cinta', e.cinta * Math.min(1, (sala.cinta.velocidad?.() || 0) * 30));
    disparadores(a.id, p, eA);

    sala.cuadro(dt, reloj, S.pulso());
    requestAnimationFrame(cuadro);
  }
  // la hoja de ruta: solo se toca el DOM cuando cambia algo
  let rutaId = null, avanceRuta = -1;
  function pintarRuta(y, id) {
    const idx = escenas.findIndex(s => s.id === id), s = escenas[idx];
    if (id !== rutaId) {
      rutaId = id;
      botonesRuta.forEach((b, i) => { b.classList.toggle('is-activo', i === idx); b.classList.toggle('is-hecho', i < idx); });
      $('small', movilRuta).textContent = `${idx + 1}/${escenas.length}`; $('b', movilRuta).textContent = s.capitulo;
    }
    const avance = Math.round(clamp((y - s.top + vh * .5) / Math.max(vh, s.alto)) * 100) / 100;
    if (avance !== avanceRuta) { avanceRuta = avance; ruta.style.setProperty('--avance', avance); }
  }
  // la píldora «siguiente»: aparece cuando el deck está quieto en una parada que espera un gesto
  function pintarSiguiente(parada, quietoHace) {
    const clave = parada ? `${parada.id}:${parada.k}` : null;
    let texto = CARTELES[clave] || null;
    if (!lenis && clave?.startsWith('show:') && parada.k < 5) texto = 'Siguiente salida'; // sin animaciones, el desfile no avanza solo
    const ver = !!texto && detalle == null && quietoHace > (clave === 'inicio:0' ? 1.2 : 1.6);
    if (texto && texto !== cartelTexto) { cartelTexto = texto; $('.siguiente__t', siguiente).textContent = texto; }
    if (ver !== siguiente.classList.contains('is-visible')) { siguiente.classList.toggle('is-visible', ver); siguiente.tabIndex = ver ? 0 : -1; siguiente.setAttribute('aria-hidden', String(!ver)); }
  }
  // la portada: la vuelta final (título y cifras) aparece al final del recorrido
  function pintarFase(e) {
    if (show.dataset.fase !== e.fase) show.dataset.fase = e.fase;
    if (e.fase === 'final') rodarCifras();
  }
  // los sonidos que marcan cambios: se disparan una vez al cruzar cada umbral
  function disparadores(id, p, e) {
    const marca = (clave, valor) => { const cambio = previa[clave] !== undefined && previa[clave] !== valor; previa[clave] = valor; return cambio; };
    if (id === 'inicio' && marca('papel', p > .2) && p > .2) S.sonar('papel');
    // la portada: cada producto que empieza a subir suena y, al llegar arriba, disparan los fotógrafos
    if (id === 'show') PORTADA.forEach((_, k) => {
      const h = e.desfile.alturas[k];
      if (marca(`sube${k}`, h > .05) && h > .05) S.sonar('salida', k);
      if (marca(`foto${k}`, h > .8) && h > .8) S.sonar('rafaga', 4);
    });
    const final = id === 'show' && e.fase === 'final';
    if (marca('aplauso', final) && final) { S.sonar('aplauso', 4.2); S.sonar('rafaga', 10); }
  }
  function cambioDeCapitulo(de, a) {
    activa = a;
    escenas.forEach(s => s.el.classList.toggle('is-activa', s.id === a));
    canvas.style.cursor = a === 'pack' ? 'grab' : a === 'inicio' ? 'pointer' : '';
    if (a === 'pack') S.sonar('slide');
    if (de === 'pack') { sala.cinta.hover(-1); hoverCaja = -1; pack.cerrar({ sonido: false }); }
    // la barra de arriba (marca, hoja de ruta y sonido) aparece recién con el carrusel: el sobre y el desfile van limpios
    const hud = a === 'pack' || a === 'contacto';
    if (hud !== hudVisible) { hudVisible = hud; document.body.classList.toggle('sin-hud', !hud); }
    // al entrar al desfile por el principio (desde el sobre o con la hoja de ruta), la portada arranca de nuevo
    if (a === 'show') {
      const s = escena('show');
      if ((posicion() - s.top) / Math.max(1, s.alto - vh) < .05) { t0Portada = reloj; PORTADA.forEach((_, k) => { previa[`sube${k}`] = previa[`foto${k}`] = undefined; }); S.sonar('luces', true); }
    }
    audioClip();
  }
  requestAnimationFrame(cuadro);
}

/* ── las cifras de la vuelta final: el pack entero ── */
function armarCifras() {
  const suma = P.reduce((t, p) => t + total(p), 0), marcas = new Set(P.map(p => p.marca)).size;
  const cifras = [[`${Math.floor(suma / 1e6)} M`, 'de seguidores'], [String(P.length), 'creadores'], [String(marcas), 'marcas del grupo']];
  $('.cifras').innerHTML = cifras.map(([n, t]) => `<div class="cifra"><b data-n="${esc(n)}" aria-label="${esc(n)}">${n.split('').map(c => (/\d/.test(c) ? `<span class="rueda" aria-hidden="true"><span>${'0123456789'.split('').map(d => `<i>${d}</i>`).join('')}</span></span>` : `<span aria-hidden="true">${c === ' ' ? '&nbsp;' : esc(c)}</span>`)).join('')}</b><span>${esc(t)}</span></div>`).join('');
}
let cifrasRodaron = false;
function rodarCifras() {
  if (cifrasRodaron) return; cifrasRodaron = true;
  $$('.cifra b').forEach((b, f) => {
    const digitos = b.dataset.n.replace(/\D/g, '').split('');
    $$('.rueda > span', b).forEach((s, j) => setTimeout(() => { s.style.transform = `translateY(${-digitos[j] * 10}%)`; S.sonar('contador', f * 2 + j); }, REDUCIDO ? 0 : 400 + f * 160 + j * 90));
  });
}
$('[data-correo]')?.addEventListener('click', () => S.sonar('enviar'));
$('[data-activar-sonido]')?.addEventListener('click', e => { const b = e.currentTarget; b.lastChild.textContent = 'Sonido activado'; b.disabled = true; });

iniciar();
