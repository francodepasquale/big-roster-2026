// El sonido del deck: todo sintetizado con Web Audio, sin archivos. La interfaz usa los sonidos de Bencho (bencho.js);
// lo propio del festival se arma acá. Cada acción lleva siempre el mismo sonido.
//
// Efecto       Cuándo                                                   Sale de
// pip          botones, el índice, los links                            Bencho tick
// paso         cambio de capítulo (más grave hacia atrás)               Bencho whisk
// cinta        una cinta de la flor se dibuja o se despliega            propio: un roce de tela que sube
// flor         la flor termina de abrirse                               propio: arpegio suave (Fa maj9)
// cosa         se prende cada una de las tres cosas del desafío         Bencho plop, sube de tono
// nombre       el line-up pasa de un creador al otro                    Bencho tick, afinado por fila
// dia          el calendario pasa un día                                Bencho tick, sube con los días
// reel         el teléfono pasa al video siguiente                      Bencho glide
// vivo         empieza la transmisión (En vivo)                         propio: el público que crece
// tic, caja    la inversión cuenta y termina                            Bencho tick y paid
// prendido, apagado  el botón de sonido                                 Bencho boot y hush
// enviar       escribir a BIG                                           Bencho hail
//
// Además hay un ambiente continuo (ambiente(nivel)): 0 silencio, 1 un colchón de acordes, 2 el festival (bombo lejano
// y público, durante En vivo). Viene encendido, pero el navegador no deja sonar nada hasta el primer toque o tecla
// (la rueda no cuenta). Nunca se acumulan sonidos para después, y con la pestaña oculta no suena nada.
import { SOUNDS as BENCHO } from './bencho.js';

const SALIDA = 1.05, MAX_VOCES = 14, PICO = .26;
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
function osc(t, { f, to, glide, type = 'sine', a = .004, d = .15, g = .1, lp = 0, destino }) {
  const o = ctx.createOscillator(), v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || d * .6));
  env(v.gain, t, a, d, g);
  if (lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; o.connect(l).connect(v); } else o.connect(v);
  v.connect(destino || bus);
  o.onended = () => v.disconnect();
  o.start(t); o.stop(t + d + .05);
}
function bufferRuido() {
  if (!ruido) {
    ruido = ctx.createBuffer(1, (ctx.sampleRate * 2) | 0, ctx.sampleRate);
    const c = ruido.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  }
  return ruido;
}
function noise(t, { f = 2000, to, q = 1, type = 'bandpass', a = .003, d = .05, g = .05, destino }) {
  const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), v = ctx.createGain();
  s.buffer = bufferRuido(); s.loop = true;
  b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (to) b.frequency.exponentialRampToValueAtTime(to, t + d);
  env(v.gain, t, a, d, g);
  s.connect(b).connect(v);
  v.connect(destino || bus);
  s.onended = () => v.disconnect();
  s.start(t, Math.random() * 1.5); s.stop(t + d + .05);
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
    cola.connect(v); v.connect(bus);
    fuente.onended = () => v.disconnect();
    fuente.start(a); fuente.stop(b + .02);
  }
  return Math.max(...BENCHO[nombre].map(n => (n.at ?? 0) + n.ms)) / 1000;
}
const semi = n => 2 ** (n / 12);

/* ── los efectos: agendan sus voces desde t, con j = una leve variación de afinación, y devuelven cuánto duran ── */
export const RECETAS = {
  pip: (t, j) => notas('tick', t, j),
  paso: (t, j, dir = 1) => notas('whisk', t, (dir > 0 ? 1 : .84) * j),
  // una cinta que se desliza: roce de tela que sube, con un brillo suave arriba
  cinta: (t, j, i = 0) => {
    const b = semi([0, 3, 5, 7, 10, 12][i % 6]) * j;
    noise(t, { f: 700 * b, to: 3200 * b, q: 1.4, a: .09, d: .42, g: .045 });
    osc(t + .05, { f: 698 * b, to: 1046 * b, glide: .3, type: 'sine', a: .05, d: .5, g: .022 });
    return .6;
  },
  // la flor abierta: un arpegio de Fa con novena, suave, como el ding de una pantalla que se enciende
  flor: (t, j) => {
    [349.2, 440, 523.3, 659.3, 784, 1046.5].forEach((f, k) => {
      osc(t + k * .085, { f: f * j, type: 'sine', a: .012, d: 1.6 - k * .12, g: .05 - k * .004 });
      osc(t + k * .085, { f: f * 2.005 * j, type: 'sine', a: .02, d: .7, g: .008 });
    });
    return 1.9;
  },
  cosa: (t, j, i = 0) => notas('plop', t, semi([0, 4, 7][i] ?? 0) * j),
  nombre: (t, j, fila = 1) => notas('tick', t, semi([0, 7, 4, 2, 0][fila] ?? 0) * j),
  dia: (t, j, i = 0) => notas('tick', t, semi(Math.min(i, 14) * .5) * j * .9),
  reel: (t, j) => notas('glide', t, j),
  globo: (t, j) => notas('plop', t, 1.26 * j),
  // el arco de Disney+ barriendo la pantalla: un soplido luminoso que sube y un brillo que se abre
  arco: (t, j) => {
    noise(t, { f: 380 * j, to: 4200 * j, q: .8, a: .5, d: 1.6, g: .05 });
    osc(t + .2, { f: 523.3 * j, to: 1046.5 * j, glide: 1.2, type: 'sine', a: .4, d: 1.7, g: .03 });
    [1318.5, 1568, 2093].forEach((f, k) => osc(t + 1.1 + k * .07, { f: f * j, type: 'sine', a: .01, d: 1.1, g: .018 }));
    return 2.3;
  },
  // empieza la transmisión: el público crece y se apaga, con dos golpes de bombo lejanos
  vivo: (t, j) => {
    noise(t, { f: 900, to: 1500, q: .6, a: .7, d: 2.4, g: .07 });
    noise(t + .2, { f: 2600, to: 3800, q: 1.2, a: .5, d: 1.9, g: .025 });
    [0, .51].forEach(k => osc(t + .25 + k, { f: 120 * j, to: 46, glide: .14, type: 'sine', a: .003, d: .42, g: .16, lp: 400 }));
    return 2.6;
  },
  tic: (t, j, i = 0) => notas('tick', t, semi(Math.min(i, 12)) * j),
  caja: (t, j) => { notas('paid', t, j); return .7; },
  prendido: t => notas('boot', t),
  apagado: t => notas('hush', t),
  enviar: t => notas('hail', t),
};
const VOL = { pip: 1.4, paso: 1.7, cinta: 1.3, flor: 1.1, cosa: 1.6, nombre: 1.05, dia: .95, reel: 1.6, globo: 1.4, vivo: 1.2, tic: 1, caja: 1.6, prendido: 1.6, apagado: 3.4, enviar: 1.8 };
const VARIA = { cosa: .02, dia: .01, nombre: .01 };

/* ── el motor ── */
let reverb = null;
function montar(c) {
  const entrada = c.createGain(), tono = c.createBiquadFilter(), limite = c.createWaveShaper();
  entrada.gain.value = SALIDA;
  tono.type = 'lowpass'; tono.frequency.value = 12000; tono.Q.value = .4;
  const curva = new Float32Array(1025); // limitador suave: no se nota a volumen normal y redondea si se apilan voces
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(i / 512 - 1);
  limite.curve = curva;
  entrada.connect(tono).connect(limite).connect(c.destination);
  // una sala chica y clara (dos ecos cruzados con un poco de pérdida) para el ambiente y la flor
  reverb = c.createGain(); reverb.gain.value = 1;
  const salidaRev = c.createGain(); salidaRev.gain.value = .32;
  [[.137, .41], [.191, .38], [.263, .33]].forEach(([dt, fb]) => {
    const d = c.createDelay(.5), l = c.createBiquadFilter(), g = c.createGain();
    d.delayTime.value = dt; l.type = 'lowpass'; l.frequency.value = 2600; g.gain.value = fb;
    reverb.connect(d); d.connect(l).connect(g).connect(d); l.connect(salidaRev);
  });
  salidaRev.connect(limite);
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
  if (ctx.state === 'running') arrancarAmbiente();
  else if (gesto) ctx.resume().then(arrancarAmbiente).catch(() => {});
}
/** Suena si corresponde; devuelve si sonó */
export function sonar(nombre, arg) {
  const receta = RECETAS[nombre];
  if (!receta || !activo || document.hidden || !ctx || ctx.state !== 'running') return false;
  const ahora = performance.now();
  if (ahora - (ultimo[nombre] ?? -1e9) < 60) return false;
  const t = ctx.currentTime;
  for (let i = vivos.length; i--;) if (vivos[i] <= t) vivos.splice(i, 1);
  if (vivos.length >= MAX_VOCES) return false;
  ultimo[nombre] = ahora;
  const out = ctx.createGain();
  out.gain.value = VOL[nombre] ?? 1;
  out.connect(master);
  if (nombre === 'flor' || nombre === 'cinta' || nombre === 'arco') out.connect(reverb);
  bus = out;
  const dura = receta(t + .004, 1 + (Math.random() - .5) * (VARIA[nombre] ?? .03), arg);
  vivos.push(t + dura);
  setTimeout(() => out.disconnect(), (dura + 1.5) * 1000);
  registro.push(nombre); if (registro.length > 120) registro.shift();
  return true;
}

/* ── el ambiente ── */
// Un colchón de acordes (Fa maj9, Re m9, Si♭ maj7, Do 6/9), cuatro segundos cada uno, y durante En vivo el festival
// de fondo: bombo a 118 BPM, platillo cerrado y el murmullo del público
const ACORDES = [[174.6, 261.6, 329.6, 392, 440], [146.8, 220, 261.6, 349.2, 329.6], [116.5, 233.1, 293.7, 349.2, 440], [130.8, 196, 293.7, 329.6, 440]];
const BPM = 118;
let nivel = 0, nivelSonando = -1, amb = null, reloj = null, proxAcorde = 0, acorde = 0, proxPulso = 0, pulso = 0;
function arrancarAmbiente() {
  if (!ctx || amb) return;
  amb = { pad: ctx.createGain(), fiesta: ctx.createGain(), publico: ctx.createGain(), filtro: ctx.createBiquadFilter() };
  amb.pad.gain.value = 0; amb.fiesta.gain.value = 0; amb.publico.gain.value = 0;
  amb.filtro.type = 'lowpass'; amb.filtro.frequency.value = 900; amb.filtro.Q.value = .5;
  amb.pad.connect(amb.filtro).connect(master); amb.filtro.connect(reverb);
  amb.fiesta.connect(master);
  // el público: ruido filtrado que respira
  const s = ctx.createBufferSource(); s.buffer = bufferRuido(); s.loop = true;
  const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 1100; b.Q.value = .5;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .17; lg.gain.value = .35;
  const resp = ctx.createGain(); resp.gain.value = .65;
  lfo.connect(lg).connect(resp.gain);
  s.connect(b).connect(resp).connect(amb.publico).connect(master);
  s.start(); lfo.start();
  proxAcorde = proxPulso = ctx.currentTime + .1;
  reloj = setInterval(agendar, 90);
  aplicarNivel();
}
function agendar() {
  if (!ctx || ctx.state !== 'running' || !activo || document.hidden) return;
  const hasta = ctx.currentTime + .35;
  while (proxAcorde < hasta) {
    if (nivel > 0) for (const [k, f] of ACORDES[acorde % 4].entries()) {
      for (const desafino of [-.004, .004]) {
        const o = ctx.createOscillator(), v = ctx.createGain();
        o.type = k === 0 ? 'sine' : 'triangle';
        o.frequency.value = f * (1 + desafino);
        const g = k === 0 ? .05 : .018;
        v.gain.setValueAtTime(.0001, proxAcorde);
        v.gain.linearRampToValueAtTime(g, proxAcorde + 1.3);
        v.gain.setValueAtTime(g, proxAcorde + 3.4);
        v.gain.linearRampToValueAtTime(.0001, proxAcorde + 5.6);
        o.connect(v).connect(amb.pad);
        o.onended = () => v.disconnect();
        o.start(proxAcorde); o.stop(proxAcorde + 5.7);
      }
    }
    acorde++; proxAcorde += 4;
  }
  const negra = 60 / BPM;
  while (proxPulso < hasta) {
    if (nivel > 1) {
      const t = proxPulso;
      if (pulso % 2 === 0) osc(t, { f: 110, to: 44, glide: .12, type: 'sine', a: .002, d: .38, g: .2, lp: 320, destino: amb.fiesta });
      else noise(t, { f: 7800, type: 'highpass', q: .7, a: .001, d: .045, g: .02, destino: amb.fiesta });
    }
    pulso++; proxPulso += negra / 2;
  }
}
function aplicarNivel() {
  if (!amb) return;
  const t = ctx.currentTime;
  const objetivo = activo && !document.hidden ? nivel : 0;
  amb.pad.gain.setTargetAtTime(objetivo > 0 ? (objetivo > 1 ? .55 : .8) : 0, t, .9);
  amb.filtro.frequency.setTargetAtTime(objetivo > 1 ? 1700 : 900, t, 1.2);
  amb.fiesta.gain.setTargetAtTime(objetivo > 1 ? .7 : 0, t, .8);
  amb.publico.gain.setTargetAtTime(objetivo > 1 ? .045 : 0, t, 1.1);
  nivelSonando = objetivo;
}
/** 0 silencio · 1 acordes · 2 el festival (En vivo) */
export function ambiente(n) {
  nivel = n;
  if (nivelSonando !== (activo ? n : 0)) aplicarNivel();
}

/* ── el control ── */
export function sonidoPrendido() { return activo; }
/** Prendido pero el navegador todavía no lo deja sonar (falta un toque o una tecla) */
export const sonidoBloqueado = () => activo && ctx?.state !== 'running';
export function alternarSonido() {
  if (activo) sonar('apagado');
  activo = !activo;
  if (activo) { despertar(); setTimeout(() => sonar('prendido'), 30); }
  aplicarNivel();
  return activo;
}
document.addEventListener('visibilitychange', aplicarNivel);
// el navegador deja arrancar el audio recién con un gesto; en cada gesto se lo despierta si quedó dormido
for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(ev, despertar, { capture: true, passive: true });
despertar();
