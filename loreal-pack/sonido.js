// El sonido del desfile: todo sintetizado con Web Audio, nada grabado ni copiado. La interfaz usa los sonidos de Bencho
// (bencho.js); lo propio del desfile (obturadores, luces, pedestal, aplauso, la música y el público) se arma acá.
// Cada acción lleva siempre el mismo sonido.
//
// Efecto       Cuándo                                         Sale de
// tic          una tarjeta del carrusel queda de frente       Bencho buzz
// pip          botones, flechas, la hoja de ruta              Bencho tick
// abre         se abre un perfil                              Bencho glide
// slide        cambia una tarjeta del detalle, llega al pack  Bencho whisk
// thup         se cierra un perfil                            Bencho step
// suelta       soltar la cinta en movimiento                  Bencho drift
// prendido, apagado  el botón de sonido                       Bencho boot y hush
// llamado      cada aviso del cargador                        Bencho perk, y beacon en «Primera salida»
// enviar       escribir a BIG                                 Bencho hail
// Propios: papel (se abre la invitación), luces (se prende o apaga la sala), obturador y rafaga (fotógrafos), pedestal
// (sube el producto de un perfil), salida (cada producto de la portada), contador (las cifras) y aplauso (la vuelta final).
// Voces continuas: publico (murmullo), musica (bombo, platillo y bajo, con un filtro que la abre al salir a escena) y cinta.
//
// Volúmenes: cada efecto tiene el suyo en VOL; medir() los mide sin que suene nada.
// Viene encendido. El navegador no deja sonar nada hasta el primer toque o tecla (el scroll no cuenta): por eso el sobre
// se abre con un toque y el cargador ofrece activarlo.
// Nunca se acumulan sonidos para después, y con la pestaña oculta no suena nada.
import { SOUNDS as BENCHO } from './bencho.js';

const SALIDA = 1.05, MAX_VOCES = 12, PICO = .26;
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx = null, master = null, bus = null, ruido = null, activo = !REDUCIDO, gesto = !!navigator.userActivation?.hasBeenActive;
const vivos = [], ultimo = {};
export const registro = []; // lo último que sonó, para revisar con Chrome automatizado

/* ── piezas ── */
function env(p, t, a, d, g) {
  const ataque = Math.max(a, .001);
  p.setValueAtTime(.0001, t);
  p.linearRampToValueAtTime(Math.min(g, PICO), t + ataque);
  p.exponentialRampToValueAtTime(.0001, t + Math.max(d, ataque + .01));
}
function salida(v, pan, destino = bus) {
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; v.connect(p).connect(destino); } else v.connect(destino);
}
function osc(t, { f, to, glide, type = 'sine', a = .004, d = .15, g = .1, pan = 0, lp = 0, destino }) {
  const o = ctx.createOscillator(), v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || d * .6));
  env(v.gain, t, a, d, g);
  if (lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; o.connect(l).connect(v); } else o.connect(v);
  salida(v, pan, destino);
  o.onended = () => v.disconnect();
  o.start(t); o.stop(t + d + .03);
}
function bufferRuido() {
  if (!ruido) {
    ruido = ctx.createBuffer(1, (ctx.sampleRate * .5) | 0, ctx.sampleRate);
    const c = ruido.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  }
  return ruido;
}
function noise(t, { f = 2000, to, q = 1, type = 'bandpass', a = .003, d = .05, g = .05, pan = 0, destino }) {
  const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), v = ctx.createGain();
  s.buffer = bufferRuido(); s.loop = true;
  b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (to) b.frequency.exponentialRampToValueAtTime(to, t + d);
  env(v.gain, t, a, d, g);
  s.connect(b).connect(v);
  salida(v, pan, destino);
  s.onended = () => v.disconnect();
  s.start(t, Math.random() * .4); s.stop(t + d + .03);
}
// Toca un sonido de Bencho en este motor: bend lo sube o lo baja (1,12 son unos dos semitonos)
function notas(nombre, t0, bend = 1) {
  for (const n of BENCHO[nombre]) {
    const a = t0 + (n.at ?? 0) / 1000, b = a + n.ms / 1000, c = n.glide ? a + n.glide / 1000 : b, v = ctx.createGain();
    let fuente, cola;
    if (n.noise) {
      fuente = ctx.createBufferSource(); fuente.buffer = bufferRuido(); fuente.loop = true;
      cola = ctx.createBiquadFilter(); cola.type = n.noise;
      cola.frequency.setValueAtTime(n.hz * bend, a);
      if (n.q !== undefined) cola.Q.value = n.q;
      fuente.connect(cola);
    } else {
      fuente = cola = ctx.createOscillator();
      fuente.type = n.wave ?? 'sine';
      fuente.frequency.setValueAtTime(n.hz * bend, a);
      if (n.to) fuente.frequency.exponentialRampToValueAtTime(n.to * bend, c);
    }
    if (n.cut) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = n.cut; cola.connect(f); cola = f; }
    const ataque = Math.min((n.atk ?? 4) / 1000, n.ms / 1000 * .6);
    v.gain.setValueAtTime(.0001, a);
    v.gain.exponentialRampToValueAtTime(n.gain ?? .05, a + ataque);
    v.gain.exponentialRampToValueAtTime(.0001, b);
    cola.connect(v); salida(v);
    fuente.onended = () => v.disconnect();
    fuente.start(a); fuente.stop(b + .02);
  }
  return Math.max(...BENCHO[nombre].map(n => (n.at ?? 0) + n.ms)) / 1000;
}
// Un obturador de réflex: espejo que sube, cortina, espejo que baja, y el zumbido corto del flash que se recarga
const disparo = (t, pan = 0, j = 1) => {
  noise(t, { f: 5200 * j, type: 'highpass', q: .7, a: .001, d: .008, g: .16, pan });
  noise(t + .004, { f: 1800 * j, q: 2.5, a: .001, d: .02, g: .09, pan });
  noise(t + .042, { f: 4200 * j, type: 'highpass', q: .7, a: .001, d: .007, g: .11, pan });
  noise(t + .046, { f: 1400 * j, q: 2, a: .001, d: .016, g: .06, pan });
  osc(t + .07, { f: 3400 * j, to: 6200 * j, glide: .16, a: .02, d: .18, g: .006, pan });
};

/* ── los efectos: agendan sus voces desde t, con j = una leve variación de afinación, y devuelven cuánto duran ── */
export const RECETAS = {
  // interfaz
  tic: (t, j) => notas('buzz', t, j),
  pip: (t, j) => notas('tick', t, j),
  abre: (t, j) => notas('glide', t, j),
  slide: (t, j) => notas('whisk', t, j),
  thup: (t, j) => notas('step', t, j),
  suelta: (t, j) => notas('drift', t, j),
  prendido: t => notas('boot', t),
  apagado: t => notas('hush', t),
  enviar: t => notas('hail', t),
  llamado: (t, j, i = 0) => (i >= 3 ? notas('beacon', t) : notas('perk', t, 2 ** (i * 3 / 12))),
  // la invitación sale del sobre: el roce del papel y un par de crujidos
  papel: (t, j) => {
    noise(t, { f: 2400, to: 4800, q: .6, a: .08, d: .5, g: .035 });
    for (let i = 0; i < 9; i++) noise(t + Math.random() * .45, { f: (2600 + Math.random() * 4200) * j, q: 3, a: .001, d: .01 + Math.random() * .02, g: .03 + Math.random() * .04, pan: Math.random() * .4 - .2 });
    return .56;
  },
  // se prenden o se apagan las luces de la sala: el golpe del contactor y el zumbido de los equipos
  luces: (t, j, prende = true) => {
    noise(t, { f: 900, type: 'lowpass', q: .7, a: .002, d: .07, g: .2 });
    osc(t, { f: 120 * j, to: 58, glide: .08, a: .002, d: .2, g: .16 });
    if (prende) osc(t + .02, { f: 100, type: 'sawtooth', a: .12, d: .9, g: .012, lp: 400 });
    return prende ? .95 : .25;
  },
  obturador: (t, j) => { disparo(t, (Math.random() - .5) * .8, j); return .26; },
  // los fotógrafos: n disparos repartidos, como en el foso
  rafaga: (t, j, n = 6) => {
    let s = 0;
    for (let i = 0; i < n; i++) { disparo(t + s, (Math.random() - .5) * 1.4, .9 + Math.random() * .2); s += .05 + Math.random() * .16; }
    return s + .26;
  },
  // sube el pedestal: un barrido grave que se abre y un brillo arriba
  pedestal: (t, j) => {
    osc(t, { f: 52 * j, to: 104 * j, glide: .95, type: 'triangle', a: .35, d: 1.1, g: .14 });
    noise(t, { f: 220, to: 1600, q: .8, a: .6, d: 1.05, g: .05 });
    [1568, 2093, 2637].forEach((f, i) => osc(t + .9 + i * .06, { f: f * j, a: .002, d: .5 - i * .08, g: .03, pan: (i - 1) * .3 }));
    return 1.4;
  },
  contador: (t, j, i = 0) => notas('tick', t, 2 ** (Math.min(i, 12) / 12) * j),
  // una salida del desfile: el producto sube corto y suena una nota que sube con el número de salida
  salida: (t, j, i = 0) => {
    osc(t, { f: 70 * j, to: 140 * j, glide: .45, type: 'triangle', a: .12, d: .55, g: .1 });
    noise(t, { f: 300, to: 2200, q: .8, a: .2, d: .45, g: .035 });
    notas('perk', t + .32, 2 ** ((i % 8) * 2 / 12) * j);
    return .7;
  },
  // el aplauso del final: crece, se sostiene y se apaga
  aplauso: (t, j, largo = 3.6) => {
    const n = Math.round(largo * 70);
    for (let i = 0; i < n; i++) {
      const s = Math.random() * largo, k = s / largo, dens = Math.sin(Math.min(1, k * 2.2) * Math.PI / 2) * (1 - Math.max(0, k - .7) / .3);
      if (Math.random() > dens) continue;
      noise(t + s, { f: 900 + Math.random() * 1900, q: 1 + Math.random(), a: .001, d: .01 + Math.random() * .025, g: .05 + Math.random() * .07, pan: (Math.random() - .5) * 1.6 });
    }
    noise(t, { f: 600, to: 900, q: .5, a: largo * .3, d: largo, g: .03 });
    return largo + .1;
  },
};
// Medidos con medir() el 12/11/2026: la interfaz entre −45 y −33 dB y los efectos del desfile entre −35 y −27
const VOL = {
  tic: 4.4, pip: 1.48, abre: 1.76, slide: 1.9, thup: 1.93, suelta: 2.4, prendido: 1.6, apagado: 3.6, enviar: 1.8,
  llamado: 1.8, papel: 3.4, luces: .9, obturador: 1.9, rafaga: 2.2, pedestal: .62,
  contador: 1.1, aplauso: 4, salida: 1.4,
};
const VARIA = { papel: .1, obturador: .08 };

/* ── el motor ── */
function montar(c) {
  const entrada = c.createGain(), tono = c.createBiquadFilter(), limite = c.createWaveShaper();
  entrada.gain.value = SALIDA;
  tono.type = 'lowpass'; tono.frequency.value = 11000; tono.Q.value = .4;
  const curva = new Float32Array(1025); // limitador suave: no se nota a volumen normal y redondea solo si se apilan voces
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(i / 512 - 1);
  limite.curve = curva;
  // la sala: un eco oscuro y largo, de galpón
  const eco = c.createDelay(.5), oscuro = c.createBiquadFilter(), vuelta = c.createGain(), mezcla = c.createGain();
  eco.delayTime.value = .11; oscuro.type = 'lowpass'; oscuro.frequency.value = 2200; vuelta.gain.value = .38; mezcla.gain.value = .16;
  entrada.connect(tono).connect(limite).connect(c.destination);
  tono.connect(eco).connect(oscuro).connect(vuelta).connect(eco);
  oscuro.connect(mezcla).connect(limite);
  return entrada;
}
function despertar(e) {
  if (e) gesto = true;
  if (!activo) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    master = montar(ctx);
  }
  if (ctx.state !== 'running' && gesto) ctx.resume().then(arrancarVoces, () => {});
  else arrancarVoces();
}
/** Suena si corresponde; devuelve si sonó */
export function sonar(nombre, arg) {
  const receta = RECETAS[nombre];
  if (!receta || !activo || document.hidden || !ctx || ctx.state !== 'running') return false;
  const ahora = performance.now();
  if (ahora - (ultimo[nombre] ?? -1e9) < 55) return false;
  const t = ctx.currentTime;
  for (let i = vivos.length; i--;) if (vivos[i] <= t) vivos.splice(i, 1);
  if (vivos.length >= MAX_VOCES) return false;
  ultimo[nombre] = ahora;
  const out = ctx.createGain();
  out.gain.value = VOL[nombre] ?? 1;
  out.connect(master);
  bus = out;
  const dura = receta(t + .004, 1 + (Math.random() - .5) * (VARIA[nombre] ?? .04), arg);
  vivos.push(t + dura);
  setTimeout(() => out.disconnect(), (dura + 1) * 1000);
  registro.push(nombre); if (registro.length > 120) registro.shift();
  return true;
}

/* ── las voces continuas: siguen un nivel de 0 a 1 que pone la escena ── */
const nivel = { publico: 0, musica: 0, abierta: 0, cinta: 0 };
let voces = null;
function arrancarVoces() {
  if (voces || !ctx || ctx.state !== 'running') return;
  // el público: ruido de voces, una banda media que respira
  const p = ctx.createBufferSource(), pf = ctx.createBiquadFilter(), pf2 = ctx.createBiquadFilter(), pg = ctx.createGain();
  p.buffer = bufferRuido(); p.loop = true; pf.type = 'bandpass'; pf.frequency.value = 650; pf.Q.value = .7;
  pf2.type = 'peaking'; pf2.frequency.value = 1400; pf2.gain.value = 5; pf2.Q.value = 1.4; pg.gain.value = 0;
  p.connect(pf).connect(pf2).connect(pg).connect(master); p.start();
  // la música: su propio bus, con un pasabajos que se abre cuando el desfile sale a escena
  const mf = ctx.createBiquadFilter(), mg = ctx.createGain();
  mf.type = 'lowpass'; mf.frequency.value = 320; mf.Q.value = .9; mg.gain.value = 0;
  mf.connect(mg).connect(master);
  // la cinta: un motor grave
  const c1 = ctx.createOscillator(), c2 = ctx.createOscillator(), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
  c1.type = 'sawtooth'; c2.type = 'sine'; c1.frequency.value = 46; c2.frequency.value = 92; cf.type = 'lowpass'; cf.frequency.value = 160; cg.gain.value = 0;
  c1.connect(cf); c2.connect(cf); cf.connect(cg).connect(master); c1.start(); c2.start();
  voces = { pg, pf, mf, mg, cg, c1, origen: ctx.currentTime + .1, paso: 0 };
  setInterval(secuenciar, 25);
}
const BPM = 118, PASO = 60 / BPM / 2; // corcheas
const BAJO = [55, 55, 0, 55, 65.41, 0, 55, 49, 55, 55, 0, 55, 73.42, 0, 65.41, 49];
function secuenciar() {
  if (!voces || ctx.state !== 'running') return;
  const ahora = ctx.currentTime, apagada = !activo || document.hidden;
  // los niveles siguen a la escena con suavidad
  voces.pg.gain.setTargetAtTime(apagada ? 0 : nivel.publico * .05, ahora, .4);
  voces.pf.frequency.setTargetAtTime(560 + Math.random() * 260, ahora, .5);
  voces.mg.gain.setTargetAtTime(apagada ? 0 : nivel.musica * .45, ahora, .3); // la música va de fondo: los efectos mandan
  voces.mf.frequency.setTargetAtTime(320 + 11000 * nivel.abierta ** 2, ahora, .25);
  voces.cg.gain.setTargetAtTime(apagada ? 0 : nivel.cinta * .05, ahora, .12);
  voces.c1.frequency.setTargetAtTime(40 + nivel.cinta * 18, ahora, .12);
  // la grilla del compás: el paso n suena en origen + n · PASO. Si quedó atrás (pausa, pestaña oculta), se corre entera
  if (voces.origen + voces.paso * PASO < ahora) voces.origen = ahora + .02 - voces.paso * PASO;
  if (apagada || nivel.musica < .01) return;
  while (voces.origen + voces.paso * PASO < ahora + .12) {
    const t = voces.origen + voces.paso * PASO, i = voces.paso % 16;
    if (i % 2 === 0) { // bombo en negras
      osc(t, { f: 150, to: 44, glide: .11, a: .002, d: .34, g: .22, destino: voces.mf });
      noise(t, { f: 180, type: 'lowpass', a: .001, d: .03, g: .05, destino: voces.mf });
    } else noise(t, { f: 9000, type: 'highpass', q: .5, a: .001, d: .035, g: .03, destino: voces.mf }); // platillo a contratiempo
    if (i === 4 || i === 12) noise(t, { f: 1800, q: .9, a: .001, d: .09, g: .05, destino: voces.mf }); // palmas en 2 y 4
    const b = BAJO[i];
    if (b) osc(t, { f: b, type: 'sawtooth', a: .006, d: PASO * .9, g: .07, lp: 420, destino: voces.mf });
    voces.paso++;
  }
}
/** La escena pone el nivel de cada voz (de 0 a 1). musica.abierta va del backstage (apagada, por la pared) a la pasarela */
export function voz(nombre, v) { if (nombre in nivel) nivel[nombre] = Math.max(0, Math.min(1, v)); }
/** El pulso de la música, de 0 a 1 por negra, para que las luces sigan el bombo */
export function pulso() {
  const t = ctx && ctx.state === 'running' && voces ? ctx.currentTime - voces.origen : performance.now() / 1000;
  return ((t / (PASO * 2)) % 1 + 1) % 1;
}

/* ── el control ── */
export function sonidoPrendido() { return activo; }
export const sonidoBloqueado = () => activo && ctx?.state !== 'running';
export function alternarSonido() {
  if (activo) sonar('apagado');
  activo = !activo;
  if (activo) { despertar(); setTimeout(() => sonar('prendido'), 30); }
  return activo;
}
// el navegador deja arrancar el audio recién con un gesto; en cada gesto se lo despierta si quedó dormido
for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(ev, despertar, { capture: true, passive: true });
despertar();

/** Mide sin que suene: energía en 400 ms, pico y duración. nombre puede ser una lista de [efecto, segundo, arg] */
export async function medir(nombre, arg, { largo = 2.4 } = {}) {
  const sr = 44100, c = new OfflineAudioContext(1, sr * largo, sr), antes = [ctx, master, bus, ruido];
  ctx = c; master = montar(c); ruido = null;
  (Array.isArray(nombre) ? nombre : [[nombre, .01, arg]]).forEach(([n, t, a]) => {
    const out = c.createGain(); out.gain.value = VOL[n] ?? 1; out.connect(master); bus = out;
    RECETAS[n](t, 1, a);
  });
  [ctx, master, bus, ruido] = antes;
  const d = (await c.startRendering()).getChannelData(0), vent = sr * .4;
  let pico = 0, mejor = 0, fin = 0, malo = false;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (!Number.isFinite(a)) malo = true; if (a > pico) pico = a; }
  for (let i = 0, s = 0; i < d.length; i++) { s += d[i] * d[i]; if (i >= vent) s -= d[i - vent] * d[i - vent]; if (s > mejor) mejor = s; }
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pico * .00316) fin = i;
  return { nombre, db: +(10 * Math.log10(mejor / vent || 1e-12)).toFixed(1), pico: +(20 * Math.log10(pico || 1e-12)).toFixed(1), ms: Math.round(fin / sr * 1000) - 10, malo };
}
export const ajustarVolumen = (nombre, v) => { VOL[nombre] = v; };
