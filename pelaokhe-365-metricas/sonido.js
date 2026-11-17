// El sonido del deck: todo sintetizado con Web Audio, sin archivos. La interfaz usa los sonidos de Bencho (bencho.js);
// lo propio de la campaña (la caja registradora, el giro del 365) se arma acá.
// Cada acción lleva siempre el mismo sonido.
//
// Efecto       Cuándo                                              Sale de
// pip          botones, la isla, los links                         Bencho tick
// paso         cambio de escena (más grave hacia atrás)            Bencho whisk
// reel         pasa de un reel al otro en el teléfono              Bencho glide
// tic          las cifras grandes mientras cuentan                 Bencho tick, sube de tono
// caja         una cifra grande termina de contar                  Bencho paid + campana de caja registradora
// noti         entra una captura de comentarios                    Bencho plop
// giro         el 365 da una vuelta                                propio: un soplido
// prendido, apagado  el botón de sonido                            Bencho boot y hush
// enviar       escribir a BIG                                      Bencho hail
//
// Viene encendido. El navegador no deja sonar nada hasta el primer toque o tecla (la rueda no cuenta).
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
function salida(v, destino = bus) { v.connect(destino); }
function osc(t, { f, to, glide, type = 'sine', a = .004, d = .15, g = .1, lp = 0 }) {
  const o = ctx.createOscillator(), v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || d * .6));
  env(v.gain, t, a, d, g);
  if (lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; o.connect(l).connect(v); } else o.connect(v);
  salida(v);
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
function noise(t, { f = 2000, to, q = 1, type = 'bandpass', a = .003, d = .05, g = .05 }) {
  const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), v = ctx.createGain();
  s.buffer = bufferRuido(); s.loop = true;
  b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (to) b.frequency.exponentialRampToValueAtTime(to, t + d);
  env(v.gain, t, a, d, g);
  s.connect(b).connect(v);
  salida(v);
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

/* ── los efectos: agendan sus voces desde t, con j = una leve variación de afinación, y devuelven cuánto duran ── */
export const RECETAS = {
  pip: (t, j) => notas('tick', t, j),
  paso: (t, j, dir = 1) => notas('whisk', t, (dir > 0 ? 1 : .84) * j),
  reel: (t, j) => notas('glide', t, j),
  tic: (t, j, i = 0) => notas('tick', t, 2 ** (Math.min(i, 12) / 12) * j),
  noti: (t, j) => notas('plop', t, j),
  prendido: t => notas('boot', t),
  apagado: t => notas('hush', t),
  enviar: t => notas('hail', t),
  // la caja registradora: el golpe del cajón, la campana y el «pago aprobado» de Bencho
  caja: (t, j) => {
    noise(t, { f: 1500, q: 2.5, a: .001, d: .045, g: .12 });
    noise(t + .03, { f: 3800, type: 'highpass', q: .7, a: .001, d: .02, g: .06 });
    osc(t, { f: 170 * j, to: 80, glide: .07, type: 'triangle', a: .002, d: .14, g: .12 });
    [[2093, .06, 1.3], [2637, .045, 1.1], [4186, .02, .8], [5588, .009, .5]].forEach(([f, g, d]) => osc(t + .08, { f: f * j, a: .002, d, g }));
    notas('paid', t + .12, j);
    return 1.5;
  },
  // el 365 da una vuelta: un soplido que sube y baja
  giro: (t, j) => {
    noise(t, { f: 500 * j, to: 2600 * j, q: .9, a: .18, d: .55, g: .05 });
    noise(t + .3, { f: 2600 * j, to: 900 * j, q: .9, a: .05, d: .4, g: .03 });
    return .75;
  },
};
const VOL = { pip: 1.48, paso: 1.9, reel: 1.76, tic: 1.1, noti: 1.6, prendido: 1.6, apagado: 3.6, enviar: 1.8, caja: .9, giro: 2.2 };
const VARIA = { noti: .06 };

/* ── el motor ── */
function montar(c) {
  const entrada = c.createGain(), tono = c.createBiquadFilter(), limite = c.createWaveShaper();
  entrada.gain.value = SALIDA;
  tono.type = 'lowpass'; tono.frequency.value = 11000; tono.Q.value = .4;
  const curva = new Float32Array(1025); // limitador suave: no se nota a volumen normal y redondea solo si se apilan voces
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(i / 512 - 1);
  limite.curve = curva;
  // un eco corto y claro, de local
  const eco = c.createDelay(.3), claro = c.createBiquadFilter(), vuelta = c.createGain(), mezcla = c.createGain();
  eco.delayTime.value = .07; claro.type = 'lowpass'; claro.frequency.value = 3800; vuelta.gain.value = .28; mezcla.gain.value = .1;
  entrada.connect(tono).connect(limite).connect(c.destination);
  tono.connect(eco).connect(claro).connect(vuelta).connect(eco);
  claro.connect(mezcla).connect(limite);
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
  if (ctx.state !== 'running' && gesto) ctx.resume().catch(() => {});
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

/* ── el control ── */
export function sonidoPrendido() { return activo; }
/** Prendido pero el navegador todavía no lo deja sonar (falta un toque o una tecla) */
export const sonidoBloqueado = () => activo && ctx?.state !== 'running';
/** Si ya hubo un gesto: los videos pueden sonar */
export const hayGesto = () => gesto || !!navigator.userActivation?.hasBeenActive;
export function alternarSonido() {
  if (activo) sonar('apagado');
  activo = !activo;
  if (activo) { despertar(); setTimeout(() => sonar('prendido'), 30); }
  return activo;
}
// el navegador deja arrancar el audio recién con un gesto; en cada gesto se lo despierta si quedó dormido
for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(ev, despertar, { capture: true, passive: true });
despertar();
