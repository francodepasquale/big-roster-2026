// El sonido del deck: todo sintetizado con Web Audio, nada grabado ni copiado. La interfaz y los avisos usan los 24 sonidos
// de Bencho (bencho.js); lo propio del delivery y de la apertura, que Bencho no tiene, se arma acá con el estilo de
// Cerebro y del portfolio. Cada acción lleva siempre el mismo sonido.
//
// Efecto       Cuándo                                Sale de
// tic          apuntar un pin, agarrar               Bencho buzz
// key          escribir en el buscador               Bencho sigh
// pip          botones                               Bencho tick
// suma, resta  videos (suma sube con cada uno)       Bencho plop y bump
// gota         zoom                                  Bencho float y drape
// whoosh       se abre una historia                  Bencho glide
// slide        cambia el panel                       Bencho whisk
// thup         se cierra                             Bencho step
// centro       centrar el mapa                       Bencho lull
// suelta       soltar el mapa en movimiento          Bencho drift
// prendido, apagado  el botón de sonido              Bencho boot y hush
// confirmado   pedido hecho                          Bencho paid
// etapa        cada paso del seguimiento             Bencho perk, y beacon en el último
// titulo, logro  «Ya llegó», en la apertura y al final  Bencho landed con destellos
// pin          aparecen los pines, en escala         Bencho wisp
// enviar       escribir a BIG                        Bencho hail
// dia, noche   la perilla                            Bencho latch, dos notas y un pájaro o un grillo
// Propios: moto (voz continua según la velocidad), arranque, bocina, timbre, cierre, tapa, golpe, bolsa, telon, caida, sube, vuelo
//
// Volúmenes: cada efecto tiene el suyo en VOL. medir() los mide sin que suene nada.
// Viene encendido en cada visita. El navegador no deja sonar nada hasta el primer toque o tecla: por eso el cargador
// ofrece activarlo y, mientras siga bloqueado (sonidoBloqueado), el botón del riel late.
// Nunca se acumulan sonidos para después, y con la pestaña oculta no suena nada.
import { SOUNDS as BENCHO } from './bencho.js';

const SALIDA = 1.05, MAX_VOCES = 10;
const PICO = .26;

let ctx = null, master = null, bus = null, ruido = null, activo = true, gesto = !!navigator.userActivation?.hasBeenActive;
const vivos = [], ultimo = {};
export const registro = []; // lo último que sonó, para revisar con Chrome automatizado

/* ── piezas ── */
function env(p, t, a, d, g) {
  const ataque = Math.max(a, .001);
  p.setValueAtTime(.0001, t);
  p.linearRampToValueAtTime(Math.min(g, PICO), t + ataque);
  p.exponentialRampToValueAtTime(.0001, t + Math.max(d, ataque + .01));
}
function salida(v, pan) {
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; v.connect(p).connect(bus); } else v.connect(bus);
}
function osc(t, { f, to, glide, type = 'sine', a = .004, d = .15, g = .1, pan = 0, lp = 0 }) {
  const o = ctx.createOscillator(), v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || d * .6));
  env(v.gain, t, a, d, g);
  if (lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; o.connect(l).connect(v); } else o.connect(v);
  salida(v, pan);
  o.onended = () => v.disconnect();
  o.start(t); o.stop(t + d + .03);
}
function noise(t, { f = 2000, to, q = 1, type = 'bandpass', a = .003, d = .05, g = .05, pan = 0 }) {
  if (!ruido) {
    ruido = ctx.createBuffer(1, (ctx.sampleRate * .5) | 0, ctx.sampleRate);
    const c = ruido.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), v = ctx.createGain();
  s.buffer = ruido; s.loop = true;
  b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (to) b.frequency.exponentialRampToValueAtTime(to, t + d);
  env(v.gain, t, a, d, g);
  s.connect(b).connect(v);
  salida(v, pan);
  s.onended = () => v.disconnect();
  s.start(t, Math.random() * .4); s.stop(t + d + .03);
}
// Toca un sonido de Bencho en este motor: bend lo sube o lo baja (1,12 son unos dos semitonos)
function notas(nombre, t0, bend = 1) {
  for (const n of BENCHO[nombre]) {
    const a = t0 + (n.at ?? 0) / 1000, b = a + n.ms / 1000, c = n.glide ? a + n.glide / 1000 : b, v = ctx.createGain();
    let fuente, cola;
    if (n.noise) {
      if (!ruido) noise(a, { d: .01, g: .0002 }); // deja listo el ruido
      fuente = ctx.createBufferSource(); fuente.buffer = ruido; fuente.loop = true;
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
// Una barra de timbre: parciales inarmónicos, como una campanilla de metal
const barra = (t, f, d, g, pan = 0) => {
  osc(t, { f, a: .002, d, g, pan });
  osc(t, { f: f * 2.76, a: .001, d: d * .42, g: g * .3, pan });
  osc(t, { f: f * 5.4, a: .001, d: d * .16, g: g * .1, pan });
  osc(t, { f: f / 2, type: 'triangle', a: .004, d: d * .7, g: g * .2, pan });
};
const destello = (t, notas, paso = .06, g = .05) => {
  notas.forEach((f, i) => osc(t + i * paso, { f, a: .002, d: .5 - i * .05, g, pan: (i - (notas.length - 1) / 2) * .3 }));
  noise(t, { f: 8000, type: 'highpass', q: .5, a: .06, d: .4, g: .014 });
};

/* ── los efectos: agendan sus voces desde t, con j = una leve variación de afinación, y devuelven cuánto duran ── */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
// «Ya llegó» suena igual en la apertura y al final
const yaLlego = t => { const d = notas('landed', t); destello(t + .24, [2093, 2637, 3136], .05, .03); return d; };
export const RECETAS = {
  // interfaz
  tic: (t, j) => notas('buzz', t, j),
  key: (t, j) => notas('sigh', t, j),
  pip: (t, j) => notas('tick', t, j),
  suma: (t, j, n = 1) => notas('plop', t, 2 ** (Math.min(n, 5) * 2 / 12) * j),
  resta: (t, j) => notas('bump', t, j),
  gota: (t, j, sube = true) => (sube ? notas('float', t, 1.12 * j) : notas('drape', t, j)),
  whoosh: (t, j) => notas('glide', t, j),
  slide: (t, j) => notas('whisk', t, j),
  thup: (t, j) => notas('step', t, j),
  centro: (t, j) => notas('lull', t, j),
  suelta: (t, j) => notas('drift', t, j),
  prendido: t => notas('boot', t),
  apagado: t => notas('hush', t),
  // la perilla: un clic doble, dos notas y, de fondo, un grillo o un pájaro
  noche: (t, j) => {
    notas('latch', t, j);
    osc(t + .05, { f: 659.25, type: 'triangle', a: .01, d: .32, g: .08 }); osc(t + .17, { f: 493.88, type: 'triangle', a: .01, d: .5, g: .08 });
    [.34, .41, .48, .72, .79].forEach(s => osc(t + s, { f: 4300, a: .006, d: .05, g: .016, pan: .4 }));
    return .9;
  },
  dia: (t, j) => {
    notas('latch', t, j);
    osc(t + .05, { f: 493.88, type: 'triangle', a: .01, d: .28, g: .08 }); osc(t + .17, { f: 659.25, type: 'triangle', a: .01, d: .5, g: .08 });
    [[.34, 2700, 3500], [.46, 3000, 3900], [.68, 2600, 3300]].forEach(([s, f, to]) => osc(t + s, { f, to, glide: .05, a: .006, d: .08, g: .02, pan: -.4 }));
    return .85;
  },
  // delivery
  confirmado: t => notas('paid', t),
  etapa: (t, j, i = 0) => (i >= 3 ? notas('beacon', t) : notas('perk', t, 2 ** (i * 3 / 12))),
  bocina: t => {
    [[0, .1], [.16, .15]].forEach(([s, d]) => [440, 554.37].forEach(f => osc(t + s, { f, type: 'square', a: .006, d, g: .06, lp: 1700 })));
    return .34;
  },
  timbre: t => { barra(t, 659.25, .85, .2, -.08); barra(t + .36, 523.25, 1.25, .2, .08); return 1.65; },
  cierre: (t, j, abre = true) => {
    const n = 24; let s = t;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), f = (abre ? 1700 + 3700 * k : 5400 - 3700 * k) * j;
      noise(s, { f, q: 6, a: .001, d: .007, g: .15 * (.55 + .45 * Math.sin(k * Math.PI)) });
      s += .0095 + .0075 * (abre ? 1 - k : k);
    }
    noise(t, { f: abre ? 1300 : 3200, to: abre ? 4200 : 1200, q: .8, a: .03, d: s - t + .03, g: .03 });
    return s - t + .05;
  },
  tapa: (t, j) => {
    osc(t, { f: 215 * j, to: 96, glide: .05, a: .002, d: .13, g: .22 });
    noise(t, { f: 1100, type: 'lowpass', q: .6, a: .002, d: .05, g: .11 });
    noise(t + .035, { f: 2600, q: 3, a: .001, d: .012, g: .05 });
    return .15;
  },
  golpe: (t, j) => {
    osc(t, { f: 165 * j, to: 54, glide: .09, a: .002, d: .27, g: .26 });
    osc(t, { f: 310 * j, to: 150, glide: .05, type: 'triangle', a: .002, d: .08, g: .1 });
    noise(t, { f: 420, type: 'lowpass', q: .6, a: .002, d: .09, g: .14 });
    noise(t, { f: 1500, q: .7, a: .002, d: .03, g: .03 });
    osc(t + .13, { f: 120 * j, to: 62, glide: .06, a: .002, d: .12, g: .09 });
    noise(t + .13, { f: 320, type: 'lowpass', d: .05, g: .04 });
    return .32;
  },
  bolsa: (t, j) => {
    noise(t, { f: 3000, to: 5200, q: .7, a: .04, d: .36, g: .03 });
    for (let i = 0; i < 16; i++) noise(t + Math.random() * .36, { f: (2200 + Math.random() * 5000) * j, q: 2 + Math.random() * 3, a: .001, d: .012 + Math.random() * .03, g: .04 + Math.random() * .08, pan: Math.random() * .5 - .25 });
    return .44;
  },
  enviar: t => notas('hail', t),
  // la apertura
  telon: (t, j) => { noise(t, { f: 300, to: 3000, q: .9, a: .28, d: .7, g: .07 }); osc(t + .04, { f: 330 * j, to: 990 * j, glide: .3, a: .08, d: .4, g: .03 }); return .72; },
  // cae girando: un silbido que baja y un soplido por cada media vuelta. Dura hasta el golpe
  caida: t => {
    noise(t, { f: 2600, to: 420, q: 1.4, a: .4, d: .64, g: .05 });
    osc(t, { f: 1250, to: 430, glide: .62, a: .3, d: .64, g: .022 });
    [.06, .24, .44].forEach(s => noise(t + s, { f: 900, to: 2300, q: 1.2, a: .05, d: .14, g: .05 }));
    return .66;
  },
  sube: (t, j) => {
    noise(t, { f: 280, to: 3400, q: 1, a: .75, d: 1.25, g: .075 });
    osc(t, { f: 196 * j, to: 784 * j, glide: .95, type: 'triangle', a: .6, d: 1.2, g: .06 });
    osc(t, { f: 392 * j, to: 1568 * j, glide: .95, a: .65, d: 1.15, g: .028 });
    destello(t + .82, [1568, 2093, 2637], .07, .04);
    return 1.35;
  },
  vuelo: (t, j) => {
    noise(t, { f: 180, to: 1500, q: .8, a: .75, d: 1.35, g: .09 });
    noise(t + .3, { f: 900, to: 300, q: .9, a: .45, d: 1.05, g: .045 });
    osc(t, { f: 92 * j, to: 46, glide: 1.2, a: .55, d: 1.25, g: .09 });
    [.42, .62, .84, 1.1].forEach((s, i) => noise(t + s, { f: 800, to: 2100, q: 1.1, a: .05, d: .16 + i * .03, g: .036, pan: i % 2 ? .3 : -.3 })); // la isla girando
    return 1.45;
  },
  titulo: yaLlego,
  pin: (t, j, i = 0) => notas('wisp', t, PENTA[i % PENTA.length] / PENTA[0] * j),
  logro: yaLlego,
};
// Medidos con medir(), con la interfaz cerca de −37 dB y el delivery de −33 a −26. Bencho va un poco más arriba porque es
// grave y los parlantes de una notebook lo apagan
const VOL = {
  tic: 2.5, key: .84, pip: 1.48, suma: 3, resta: 3.76, gota: 1.35, whoosh: 1.76, slide: 1.9, thup: 1.93, centro: 1.84, suelta: 1.62,
  prendido: 1.6, apagado: 3.6, confirmado: 3.3, etapa: 1.8, bocina: 1.7, cierre: 5.2, bolsa: 4.7, enviar: 1.8,
  telon: 1.6, caida: 1.7, sube: 1.1, titulo: 3.1, logro: 3.1, pin: 4.1,
};
const VARIA = { key: .12, bolsa: .1 };

/* ── el motor ── */
function montar(c) {
  const entrada = c.createGain(), tono = c.createBiquadFilter(), limite = c.createWaveShaper();
  entrada.gain.value = SALIDA;
  tono.type = 'lowpass'; tono.frequency.value = 9000; tono.Q.value = .4;
  // limitador suave: no se nota a volumen normal y redondea solo si se apilan voces
  const curva = new Float32Array(1025);
  for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh(i / 512 - 1);
  limite.curve = curva;
  // la sala de vidrio: un eco corto, oscuro y realimentado
  const eco = c.createDelay(.2), oscuro = c.createBiquadFilter(), vuelta = c.createGain(), mezcla = c.createGain();
  eco.delayTime.value = .037; oscuro.type = 'lowpass'; oscuro.frequency.value = 2800; vuelta.gain.value = .3; mezcla.gain.value = .14;
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
  if (ctx.state !== 'running' && gesto) ctx.resume().catch(() => {});
}
/** Suena si corresponde; devuelve si sonó */
export function sonar(nombre, arg) {
  const receta = RECETAS[nombre];
  if (!receta || !activo || document.hidden || !ctx) return false;
  if (ctx.state !== 'running') { if (gesto) ctx.resume().then(() => { if (ctx.state === 'running') sonar(nombre, arg); }, () => {}); return false; }
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

/* ── la moto: una voz continua que sube y baja con la velocidad (v, de 0 a 1) ── */
let motor = null, apagado = 0;
function armarMotor(destino) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), filtro = ctx.createBiquadFilter(), golpeteo = ctx.createOscillator(), prof = ctx.createGain(), am = ctx.createGain(), g = ctx.createGain(), mezcla = ctx.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; golpeteo.type = 'sine';
  mezcla.gain.value = .22;
  filtro.type = 'lowpass'; filtro.Q.value = 2.2;
  am.gain.value = .72; prof.gain.value = .28; g.gain.value = 0; // el golpeteo de un monocilíndrico
  golpeteo.connect(prof).connect(am.gain);
  o.connect(filtro); o2.connect(mezcla).connect(filtro);
  filtro.connect(am).connect(g).connect(destino);
  return { o, o2, golpeteo, filtro, g, v: -1 };
}
function acelerar(m, v, t, andando = true) {
  const f = 38 + 44 * v;
  m.o.frequency.setTargetAtTime(f, t, .07);
  m.o2.frequency.setTargetAtTime(f * 2.01, t, .07);
  m.golpeteo.frequency.setTargetAtTime(f / 2, t, .07);
  m.filtro.frequency.setTargetAtTime(560 + 1400 * v, t, .07);
  m.g.gain.setTargetAtTime(andando ? .032 + .058 * v : 0, t, andando ? .05 : .13);
}
function detener() {
  if (!motor) return;
  const m = motor; motor = null;
  [m.o, m.o2, m.golpeteo].forEach(n => n.stop());
  m.g.disconnect();
}
export function moto(v) {
  if (!ctx || ctx.state !== 'running') return;
  const andando = v > .02 && activo && !document.hidden;
  if (andando && !motor) { motor = armarMotor(master); [motor.o, motor.o2, motor.golpeteo].forEach(n => n.start()); }
  if (!motor) return;
  if (Math.abs(v - motor.v) < .012) { if (!andando && performance.now() > apagado) detener(); return; }
  motor.v = v;
  acelerar(motor, v, ctx.currentTime, andando);
  if (!andando) apagado = performance.now() + 700;
}
// la moto se enciende: un toque de acelerador
RECETAS.arranque = t => {
  const m = armarMotor(bus);
  [m.o, m.o2, m.golpeteo].forEach(n => { n.start(t); n.stop(t + .66); });
  acelerar(m, .15, t); acelerar(m, .9, t + .1); acelerar(m, .22, t + .3); acelerar(m, 0, t + .46, false);
  return .66;
};
// un viaje entero, solo para medirlo
RECETAS.viaje = t => {
  const m = armarMotor(bus);
  [m.o, m.o2, m.golpeteo].forEach(n => { n.start(t); n.stop(t + 2.2); });
  for (let i = 0; i <= 18; i++) acelerar(m, Math.sin(i / 18 * Math.PI) ** 2, t + i * .1);
  acelerar(m, 0, t + 1.9, false);
  return 2.2;
};

/* ── el control ── */
export function sonidoPrendido() { return activo; }
export const sonidoBloqueado = () => activo && ctx?.state !== 'running';
export function alternarSonido() {
  if (activo) sonar('apagado');
  activo = !activo;
  if (activo) { despertar(); sonar('prendido'); } else moto(0);
  return activo;
}
// el navegador deja arrancar el audio recién con un gesto; en cada gesto se lo despierta si quedó dormido
for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) addEventListener(ev, despertar, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) moto(0); });
despertar(); // si el navegador lo deja, la apertura ya suena

/** Mide sin que suene: energía en 400 ms, pico y duración. nombre puede ser una lista de [efecto, segundo, arg] para medir una mezcla. Con muestras: true devuelve el audio */
export async function medir(nombre, arg, { largo = 2.4, muestras = false } = {}) {
  const sr = 44100, c = new OfflineAudioContext(1, sr * largo, sr), antes = [ctx, master, bus];
  ctx = c; master = montar(c);
  (Array.isArray(nombre) ? nombre : [[nombre, .01, arg]]).forEach(([n, t, a]) => {
    const out = c.createGain(); out.gain.value = VOL[n] ?? 1; out.connect(master); bus = out;
    RECETAS[n](t, 1, a);
  });
  [ctx, master, bus] = antes;
  const d = (await c.startRendering()).getChannelData(0), vent = sr * .4;
  let pico = 0, e = 0, fin = 0, malo = false;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (!Number.isFinite(a)) malo = true; if (a > pico) pico = a; }
  let mejor = 0;
  for (let i = 0, s = 0; i < d.length; i++) { s += d[i] * d[i]; if (i >= vent) s -= d[i - vent] * d[i - vent]; if (s > mejor) mejor = s; }
  e = mejor / vent;
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pico * .00316) fin = i;
  const r = { nombre, db: +(10 * Math.log10(e || 1e-12)).toFixed(1), pico: +(20 * Math.log10(pico || 1e-12)).toFixed(1), ms: Math.round(fin / sr * 1000) - 10, malo };
  if (muestras) r.muestras = Array.from(d);
  return r;
}
export const ajustarVolumen = (nombre, v) => { VOL[nombre] = v; };
