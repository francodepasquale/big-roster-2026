// Pelao Khe × 365 · «Invertí en disfrutar» · resultados de campaña
//
// Una sola pantalla fija con escenas. Un gesto = un paso: la rueda, el trackpad o el dedo nunca mueven la página; cada
// gesto (una pasada con toda su inercia) lleva a la escena siguiente o a la anterior. También ↓ ↑ → ←, espacio,
// AvPág/RePág, la isla de abajo y los links #id (por ejemplo …/#numeros).
//
// Todo lo que es dato sale de datos.js: las tablas de cada reel, los totales, el gráfico, las lecturas y los textos con
// números se arman acá. Lo que está en null no se muestra y lo que depende de eso se recalcula solo. Los reels sin
// captura de estadísticas se estiman (`estimar`, más abajo) y sus números van con ≈.
//
// Actores que persisten entre escenas:
//   el 365 en 3D (escena3d.js): va al [data-ancla-365] de cada escena; si la escena no tiene, se esconde arriba
//   el teléfono: va al [data-ancla-telefono] de las escenas de reels y pasa de un reel al otro como en Instagram
import { crearEscena } from './escena3d.js';
import * as S from './sonido.js';

const C = window.CAMPANA;
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVIL = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── números ── */
const nf = new Intl.NumberFormat('es-AR');
const dec = (v, d) => v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
// [número, unidad] según el formato: n (cantidades), M2 (millones con dos decimales), % (porcentaje), s (segundos), $ (pesos)
function partes(v, f = 'n') {
  if (v == null || Number.isNaN(v)) return null;
  if (f === '%') return [dec(v, v < 10 ? 2 : 1), ' %'];
  if (f === '%1') return [dec(v, 1), ' %']; // porcentajes de Instagram, que vienen con un decimal
  if (f === 's') return [dec(v, 1), ' s'];
  if (f === 'dh') return [dec(v / 86400, 1), ' días'];
  if (f === '$') return ['$ ' + nf.format(Math.round(v)), ''];
  if (f === 'M2' && v >= 1e6) return [dec(v / 1e6, 2), ' M'];
  if (v >= 1e6) return [dec(v / 1e6, 1).replace(/,0$/, ''), ' M'];
  if (v >= 1e5) return [nf.format(Math.round(v / 1e3)), ' mil'];
  return [nf.format(Math.round(v)), ''];
}
const PENDIENTE = '<span class="pendiente">A confirmar</span>';
// aprox: el número es estimado y va con ≈ adelante
// (el ≈ va dibujado: las tipografías del deck no lo traen)
const APROX = '<span class="aprox"><svg viewBox="0 0 24 20" aria-hidden="true"><path d="M3 8c3-3.2 6-3.2 9 0s6 3.2 9 0M3 15c3-3.2 6-3.2 9 0s6 3.2 9 0" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg><span class="solo-lector">aproximadamente </span></span>';
const valor = (v, f, aprox) => { const p = partes(v, f); return p ? `${aprox ? APROX : ''}${p[0]}<span class="unidad">${p[1]}</span>` : PENDIENTE; };
const texto = (v, f, aprox) => { const p = partes(v, f); return p ? (aprox ? '≈ ' : '') + p.join('') : 'A confirmar'; };
// una cifra que cuenta al entrar su escena (si hay dato)
const cifra = (v, f = 'n', clase = '', attrs = '', aprox = false) => (v == null ? `<b class="cifra ${clase} is-pendiente">${PENDIENTE}</b>`
  : `<b class="cifra ${clase}${aprox ? ' is-estimado' : ''}" data-cifra="${v}" data-formato="${f}"${aprox ? ' data-aprox="1"' : ''} ${attrs}>${valor(v, f, aprox)}</b>`);
const PALABRA = ['ningún', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];
const palabra = n => PALABRA[n] ?? String(n);
const fecha = s => { const [d, m, a] = s.split('/').map(Number); return new Date(a, m - 1, d); };
const dias = (desde, hasta) => Math.round((fecha(hasta) - fecha(desde)) / 864e5);

/* ── las cuentas de la campaña ── */
const METRICAS = [
  { k: 'alcance', nombre: 'Espectadores' },
  { k: 'meGusta', nombre: 'Me gusta' },
  { k: 'comentarios', nombre: 'Comentarios' },
  { k: 'compartidos', nombre: 'Compartidos' },
  { k: 'reposteos', nombre: 'Reposteos' },
  { k: 'guardados', nombre: 'Guardados' },
  { k: 'noSeguidores', nombre: 'Interacciones de no seguidores', f: '%1' },
  { k: 'tiempoTotal', nombre: 'Tiempo de reproducción', f: 'dh' },
  { k: 'nuevosSeguidores', nombre: 'Nuevos seguidores' },
];
const INTERACCIONES = ['meGusta', 'comentarios', 'compartidos', 'reposteos', 'guardados'];
const NOMBRE = Object.fromEntries([['reproducciones', 'Visualizaciones'], ...METRICAS.map(m => [m.k, m.nombre])]);

/* ── los reels sin captura: lo público de Instagram y el resto estimado ── */
// La base son los reels con captura. Para cada métrica se toma la relación promedio que tuvieron esos reels (entre su
// captura y lo público, o entre dos métricas de la captura) y se aplica a lo público del reel sin captura. Lo público
// se leyó el mismo día que las capturas, así que el estimado ya tiene en cuenta los días que lleva publicado cada uno.
// Me gusta y comentarios no se estiman: van los públicos.
const BASE = C.reels.filter(r => r.metricas && r.publicos);
const media = (f) => { const vs = BASE.map(f).filter(v => v != null && Number.isFinite(v)); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; };
const div = (a, b) => (a != null && b ? a / b : null);
const FACTOR = {
  reproducciones: media(r => div(r.metricas.reproducciones, r.publicos.reproducciones)), // visualizaciones por visualización pública
  alcance: media(r => div(r.metricas.alcance, r.metricas.reproducciones)),               // espectadores por visualización
  compartidos: media(r => div(r.metricas.compartidos, r.publicos.meGusta)),              // por me gusta público
  reposteos: media(r => div(r.metricas.reposteos, r.publicos.meGusta)),
  guardados: media(r => div(r.metricas.guardados, r.publicos.meGusta)),
  noSeguidores: media(r => r.metricas.noSeguidores),                                     // el promedio
  tiempoTotal: media(r => div(r.metricas.tiempoTotal, r.metricas.reproducciones)),       // segundos por visualización
  nuevosSeguidores: media(r => div(r.metricas.nuevosSeguidores, r.metricas.reproducciones)),
};
const por = (v, k, redondeo = 1) => (v == null || FACTOR[k] == null ? null : Math.round(v * FACTOR[k] / redondeo) * redondeo);
const SIN_CAPTURA = C.reels.filter(r => !r.metricas && r.publicos && r.reales?.reproducciones == null);
const REPARTO = C.totalReproducciones && SIN_CAPTURA.length ? {
  resto: C.totalReproducciones - BASE.reduce((s, r) => s + r.metricas.reproducciones, 0),
  publicas: SIN_CAPTURA.reduce((s, r) => s + r.publicos.reproducciones, 0),
} : null;
function estimar(r) {
  const p = r.publicos;
  // si se sabe el total de la campaña, lo que falta para llegar se reparte entre los reels sin captura según sus
  // visualizaciones públicas; si no, las públicas × la relación de los reels con captura
  const rep = r.reales?.reproducciones ?? (REPARTO ? Math.round(REPARTO.resto * p.reproducciones / REPARTO.publicas / 1000) * 1000 : por(p.reproducciones, 'reproducciones', 1000));
  const m = {
    reproducciones: rep,
    alcance: por(rep, 'alcance', 1000),
    meGusta: p.meGusta ?? null,
    comentarios: p.comentarios ?? null,
    compartidos: por(p.meGusta, 'compartidos'),
    reposteos: por(p.meGusta, 'reposteos'),
    guardados: por(p.meGusta, 'guardados'),
    noSeguidores: por(1, 'noSeguidores', .1),
    tiempoTotal: por(rep, 'tiempoTotal'),
    nuevosSeguidores: por(rep, 'nuevosSeguidores'),
  };
  r.metricas = m;
  r.estimados = new Set(Object.keys(m).filter(k => m[k] != null && k !== 'meGusta' && k !== 'comentarios' && r.reales?.[k] == null));
}
for (const r of C.reels) { if (!r.metricas && r.publicos && BASE.length) estimar(r); else r.estimados ??= new Set(); }
if (C.reels.some(r => !r.metricas)) C.reels = C.reels.filter(r => r.metricas); // sin captura ni datos públicos: no entra

const R = C.reels, M = r => r.metricas;
const est = (r, k) => r.estimados.has(k);
const ESTIMADOS = R.filter(r => r.estimados.size);
// la tasa es estimada si lo es alguna de sus partes; un total, si lo es el dato de algún reel
const estTasa = r => est(r, 'reproducciones') || INTERACCIONES.some(k => est(r, k));
const estTot = k => (k === 'reproducciones' && C.totalReproducciones ? false : R.some(r => est(r, k)));
// suma de la campaña: solo si todos los reels tienen el dato
const total = k => (R.every(r => M(r)[k] != null) ? R.reduce((s, r) => s + M(r)[k], 0) : null);
// interacciones con lo que haya, y cuáles entran
function interacciones(m) {
  const hay = INTERACCIONES.filter(k => m[k] != null);
  return { suma: hay.length ? hay.reduce((s, k) => s + m[k], 0) : null, hay, faltan: INTERACCIONES.filter(k => m[k] == null) };
}
const tasa = m => { const i = interacciones(m).suma; return i != null && m.reproducciones ? i / m.reproducciones * 100 : null; };
const lista = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
const minus = k => NOMBRE[k].toLowerCase();
const TOT = Object.fromEntries(['reproducciones', 'alcance', 'tiempoTotal', 'nuevosSeguidores', ...INTERACCIONES].map(k => [k, total(k)]));
if (C.totalReproducciones) TOT.reproducciones = C.totalReproducciones; // el total real de la campaña
// % de interacciones de no seguidores en la campaña: ponderado por las interacciones de cada reel
const TOT_NO_SEG = R.every(r => M(r).noSeguidores != null && interacciones(M(r)).suma)
  ? R.reduce((s, r) => s + M(r).noSeguidores * interacciones(M(r)).suma, 0) / R.reduce((s, r) => s + interacciones(M(r)).suma, 0) : null;
const TOT_INT = interacciones(TOT);
const TOT_TASA = tasa(TOT);
const CPM = C.inversion != null && TOT.reproducciones ? C.inversion / TOT.reproducciones * 1000 : null;
// «el doble de», «1,8 veces los»
function veces(x, sustantivo, articulo) {
  if (x >= 1.9 && x < 2.15) return `el doble de ${sustantivo}`;
  if (x >= 2.85 && x < 3.15) return `el triple de ${sustantivo}`;
  return `${dec(x, 1)} veces ${articulo} ${sustantivo}`;
}

/* ── íconos que son interfaz (no decoración) ── */
const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHIP = `<span class="pill__chip">${FLECHA}</span>`;
const CHIP_LUPA = '<span class="pill__chip"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15 15 4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>';
const IG = {
  corazon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.4-4.5-9.2-9C1.7 8.4 3.5 5 6.9 5c2 0 3.3 1.1 5.1 3 1.8-1.9 3.1-3 5.1-3 3.4 0 5.2 3.4 4.1 6.3-1.8 4.5-9.2 9-9.2 9z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  comentario: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 16.8A8.7 8.7 0 1 0 17 20l3.9 1.1z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3 2.8 10.4l7.3 2.9M21.5 3l-7.4 18.3-4-8M21.5 3 10.1 13.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>',
};

/* ── armar lo que depende de los datos ── */
function armarReels() {
  const tabla = r => {
    const m = M(r), t = tasa(m), ii = interacciones(m);
    const filas = METRICAS.filter(x => m[x.k] != null).map(x => `<div class="fila"><dt>${x.nombre}</dt><dd>${cifra(m[x.k], x.f, '', '', est(r, x.k))}</dd></div>`).join('');
    return `<div class="tabla__hero">${cifra(m.reproducciones, 'n', 'cifra--xl', '', est(r, 'reproducciones'))}<span>visualizaciones${est(r, 'reproducciones') ? ' estimadas' : ''}</span></div>
      <dl class="tabla__filas">${filas}
        <div class="fila fila--tasa"><dt>Tasa de interacción<small>${t == null ? '' : ii.faltan.length ? `${lista(ii.hay.map(minus))} sobre visualizaciones` : 'sobre visualizaciones'}</small></dt><dd>${cifra(t, '%', '', '', estTasa(r))}</dd></div>
      </dl>`;
  };
  const fuente = r => (r.estimados.size ? C.FUENTES.estimados : C.FUENTES.publicas);
  const boton = (r, i) => (r.estimados.size
    ? `<button class="pill pill--tinta" type="button" data-captura="${i}" aria-haspopup="dialog">Cómo se estimó ${CHIP_LUPA}</button>`
    : `<button class="pill pill--tinta" type="button" data-captura="${i}" aria-haspopup="dialog">Ver captura ${CHIP_LUPA}</button>`);
  const html = R.map((r, i) => `
    <section class="escena escena--reel" id="reel-${esc(r.id)}" data-capitulo="Los reels" data-reel="${i}" aria-label="Reel ${esc(r.titulo)}">
      <div class="escena__cuerpo"><div class="rejilla rejilla--reel">
        <div class="reel__texto">
          <h2 class="titulo" data-r>${esc(r.titulo)}</h2>
          <div class="panel reel__copy" data-r>
            <p class="cita">«${esc(r.copy)}»</p>
            <p>${esc(r.mensaje)}</p>
            <p class="nota">Publicado el ${esc(r.publicado)}, ${dias(r.publicado, C.corte)} días antes de la medición · ${Math.round(r.duracion)} segundos</p>
          </div>
          <div class="reel__botones" data-r>
            <a class="pill" href="${esc(r.url)}" target="_blank" rel="noopener">Ver en Instagram ${CHIP}</a>
            ${boton(r, i)}
          </div>
        </div>
        <div class="ancla-telefono" data-ancla-telefono><span class="ancla ancla--reel" data-ancla-365></span></div>
        <div class="panel tabla" data-r>${tabla(r)}<p class="fuente">${esc(fuente(r))}</p></div>
      </div></div>
    </section>`).join('');
  $('#portada').insertAdjacentHTML('afterend', html);
}

function armarTelefono() {
  const tel = $('.telefono');
  $('.telefono__cinta', tel).innerHTML = R.map((r, i) => `
    <article class="reel" aria-label="${esc(r.titulo)}">
      <video src="${esc(r.video)}" poster="${esc(r.portada)}" muted playsinline loop preload="auto" data-i="${i}"></video>
      <div class="reel__ui" aria-hidden="true">
        <div class="reel__acciones">
          <span>${IG.corazon}<small>${texto(M(r).meGusta)}</small></span>
          <span>${IG.comentario}<small>${texto(M(r).comentarios)}</small></span>
          <span>${IG.enviar}</span>
        </div>
        <div class="reel__pie">
          <span class="reel__usuario"><img src="assets/fotos/portada.webp" alt="">${esc(C.creador.usuario)}</span>
          <p>${esc(r.copy)}</p>
        </div>
      </div>
    </article>`).join('');
}


function armarNumeros() {
  $('[data-slot="total-reproducciones"]').outerHTML = cifra(TOT.reproducciones, 'n', 'cifra--xxl', 'data-hero="1"', estTot('reproducciones'));
  $('[data-slot="portada-total"]').outerHTML = cifra(TOT.reproducciones, 'n', 'cifra--xl', '', estTot('reproducciones'));
  $$('[data-n-reels]').forEach(el => { const w = palabra(R.length); el.textContent = el.hasAttribute('data-mayuscula') ? w[0].toUpperCase() + w.slice(1) : w; });
  const noSeg = R.map(r => M(r).noSeguidores).filter(v => v != null);
  const cards = [
    // (los espectadores no se suman: quien vio dos reels contaría dos veces; están en la tabla de cada reel)
    ...INTERACCIONES.map(k => ({ nombre: NOMBRE[k], v: TOT[k], aprox: estTot(k) })),
    { nombre: 'Interacciones', v: TOT_INT.suma, aprox: INTERACCIONES.some(estTot), nota: TOT_INT.suma != null && TOT_INT.faltan.length ? lista(TOT_INT.hay.map(minus)) : '' },
    { nombre: 'Tasa de interacción', v: TOT_TASA, f: '%', aprox: R.some(estTasa), nota: 'sobre visualizaciones' },
    { nombre: 'Interacciones de no seguidores', v: TOT_NO_SEG, f: '%1', aprox: estTot('noSeguidores'),
      nota: noSeg.length !== R.length ? '' : R.length === 2 ? noSeg.map(v => texto(v, '%1')).join(' y ') + ' por reel' : `de ${texto(Math.min(...noSeg), '%1')} a ${texto(Math.max(...noSeg), '%1')} por reel` },
    { nombre: 'Tiempo de reproducción', v: TOT.tiempoTotal, f: 'dh', aprox: estTot('tiempoTotal') },
    { nombre: 'Nuevos seguidores', v: TOT.nuevosSeguidores, aprox: estTot('nuevosSeguidores') },
    { nombre: 'Costo por mil visualizaciones', v: CPM, f: '$', aprox: estTot('reproducciones'), nota: CPM == null ? 'con la inversión' : '' },
  ];
  // lo que no tiene dato no se muestra (Tomás, 17/11/2026: nada de «A confirmar» en el deck)
  $('[data-slot="totales"]').innerHTML = cards.filter(c => c.v != null).map(c => `
    <div class="total panel panel--sm">${cifra(c.v, c.f, '', '', c.aprox)}<span>${c.nombre}${c.nota ? `<small>${esc(c.nota)}</small>` : ''}</span></div>`).join('');

  // reel por reel: una fila por métrica con dato en todos los reels; cada fila con su propia escala (no hay un eje común).
  // Las barras estimadas van rayadas (además del ≈ en el número)
  const filas = ['reproducciones', 'meGusta', 'comentarios', 'compartidos'].filter(k => R.every(r => M(r)[k] != null));
  $('[data-slot="grafico"]').closest('.grafico').classList.toggle('grafico--cuatro', R.length > 2);
  $('[data-slot="leyenda"]').innerHTML = R.map((r, i) => `<span class="leyenda__item"><i class="serie serie--${i}"></i>${esc(r.titulo)}</span>`).join('')
    + (ESTIMADOS.length ? '<span class="leyenda__item"><i class="serie serie--estimada"></i>Estimado</span>' : '');
  $('[data-slot="grafico"]').innerHTML = filas.map(k => {
    const max = Math.max(...R.map(r => M(r)[k]));
    return `<div class="grafico__fila"><span class="grafico__nombre" style="grid-row: span ${R.length}">${NOMBRE[k]}</span>${R.map((r, i) => {
      const v = M(r)[k], e = est(r, k);
      return `<div class="grafico__barra" data-tip="${esc(r.titulo)} · ${e ? '≈ ' : ''}${nf.format(v)} ${minus(k)}${e ? ' (estimado)' : ''}"><i class="serie serie--${i}${e ? ' is-estimada' : ''}" style="--w:${(v / max * 100).toFixed(2)}%"></i><b>${valor(v, 'n', e)}</b></div>`;
    }).join('')}</div>`;
  }).join('');

  // la lectura sale de los datos: el más visto contra el segundo, y el que más conversó (solo entre reels con captura)
  // (la comparación es entre reels con visualizaciones medidas: entre estimados no se afirma quién ganó)
  const medidosV = R.filter(r => !est(r, 'reproducciones'));
  const orden = (medidosV.length > 1 ? medidosV : [...R]).sort((x, y) => M(y).reproducciones - M(x).reproducciones);
  const [mas, seg] = orden, ratio = M(mas).reproducciones / M(seg).reproducciones;
  const cm = M(mas).comentarios, cs = M(seg).comentarios;
  const deTodos = R.every(r => M(r).reproducciones <= M(mas).reproducciones);
  let lec, genAlFinal = null;
  if (orden.length > 2) { // el ranking, con el de beneficios generales aparte
    const gen = orden.find(r => r.beneficio === 'general');
    const resto = orden.filter(r => r !== mas && r !== gen);
    lec = `«${mas.titulo}» fue el más visto (${texto(M(mas).reproducciones)}), seguido por ${lista(resto.map(r => `«${r.titulo}» (${texto(M(r).reproducciones)})`))}`;
    if (gen && gen !== mas) { lec += `. «${gen.titulo}», con beneficios generales, tuvo ${texto(M(gen).reproducciones)}`; genAlFinal = gen; }
  } else {
    lec = `«${mas.titulo}» fue el más visto${deTodos ? '' : ' de los reels con captura'}, con ${veces(ratio, 'visualizaciones', 'las')} que «${seg.titulo}»`;
    if (cm != null && cs != null && cm > cs) lec += ` y ${veces(cm / cs, 'comentarios', 'los')}`;
  }
  const medidos = R.filter(r => !estTasa(r) && tasa(M(r)) != null);
  const conv = medidos.length > 1 ? medidos.reduce((x, y) => (tasa(M(y)) > tasa(M(x)) ? y : x)) : null;
  if (conv && conv !== mas && !estTasa(mas)) lec += conv === genAlFinal
    ? `, pero fue el que más conversó por cada visualización: ${texto(tasa(M(conv)), '%')}, contra ${texto(tasa(M(mas)), '%')} de «${mas.titulo}»`
    : `. «${conv.titulo}» conversó más por cada visualización: ${texto(tasa(M(conv)), '%')} contra ${texto(tasa(M(mas)), '%')}`;
  $('[data-slot="lectura"]').textContent = lec + '.';
  $('[data-slot="fuentes"]').textContent = `${C.FUENTES.publicas} ${C.FUENTES.pendientes}${ESTIMADOS.length ? ` ${C.FUENTES.estimados}` : ''}`;
  return { mas, seg, ratio, conv };
}

function armarPublico() {
  // tres gráficos: sexo, edad y país, con los reels que tienen captura (el público no se ve sin entrar a la cuenta, y
  // repetir el promedio en barras no dice nada: para los otros lo dice el texto). Cada uno con su escala (el máximo del
  // gráfico). El color de cada reel es el mismo que en «En números»
  const RP = R.filter(r => r.publico);
  if (!RP.length) return;
  const grupos = [['sexo', 'Sexo'], ['edad', 'Edad'], ['pais', 'País']].filter(([k]) => RP.every(r => r.publico?.[k]));
  const serie = r => R.indexOf(r);
  const leyenda = RP.map(r => `<span class="leyenda__item"><i class="serie serie--${serie(r)}"></i>${esc(r.titulo)}</span>`).join('');
  $('[data-slot="publico"]').innerHTML = grupos.map(([k, nombre], g) => {
    const filas = RP[0].publico[k].map(([etq]) => etq);
    const max = Math.max(...RP.flatMap(r => r.publico[k].map(([, v]) => v)));
    return `<div class="panel grafico grafico--publico" data-r style="--r:${g + 1}">
      <h3 class="grafico__titulo">${nombre}</h3><div class="leyenda">${leyenda}</div>
      <div class="grafico__filas">${filas.map(etq => `<div class="grafico__fila"><span class="grafico__nombre" style="grid-row: span ${RP.length}">${esc(etq)}</span>${RP.map(r => {
        const v = r.publico[k].find(([e]) => e === etq)?.[1] ?? 0;
        return `<div class="grafico__barra" data-tip="${esc(r.titulo)} · ${esc(etq)}: ${texto(v, '%1')}"><i class="serie serie--${serie(r)}" style="--w:${(v / max * 100).toFixed(2)}%"></i><b>${texto(v, '%1')}</b></div>`;
      }).join('')}</div>`).join('')}</div></div>`;
  }).join('');
  $('[data-slot="publico-fuente"]').textContent = `${C.FUENTES.publicas} Público: las cuentas que vieron cada reel.`;
  // la lectura: lo que más pesa en cada gráfico, con el rango de los reels medidos
  const top = k => { const etq = RP[0].publico[k].reduce((a, b) => (b[1] > a[1] ? b : a))[0]; const vs = RP.map(r => r.publico[k].find(([e]) => e === etq)[1]).sort((a, b) => a - b); return [etq, vs]; };
  const rango = vs => (vs[0] === vs.at(-1) ? texto(vs[0], '%1') : `entre ${dec(vs[0], 1)} y ${texto(vs.at(-1), '%1')}`);
  if (grupos.length === 3) {
    const [sx, sxv] = top('sexo'), [ed, edv] = top('edad'), [pa, pav] = top('pais');
    const e2 = RP.map(r => r.publico.edad.filter(([e]) => e === '25-34' || e === '35-44').reduce((s, [, v]) => s + v, 0)).sort((a, b) => a - b);
    const sin = R.filter(r => !r.publico);
    const quienes = sin.length ? `de los ${palabra(RP.length)} reels con estadísticas` : `de los ${palabra(RP.length)} reels`;
    let t = `El público ${quienes} es casi el mismo: ${sx.toLowerCase()} (${rango(sxv)}), de ${ed.replace('-', ' a ')} años (${rango(edv)}; de 25 a 44, ${rango(e2)}) y de ${pa} (${rango(pav)}).`;
    if (sin.length) t += ` Para ${lista(sin.map(r => `«${r.titulo}»`))} se estima el mismo.`;
    $('[data-slot="publico-texto"]').textContent = t;
  }
}

function armarConversacion() {
  const cv = C.conversacion;
  $('[data-slot="conversacion-texto"]').textContent = TOT.comentarios != null
    ? `${nf.format(TOT.comentarios)} comentarios entre los ${palabra(R.length)} reels. Estos dos muestran cómo la marca entró en la charla.`
    : 'Estos dos comentarios muestran cómo la marca entró en la charla.';
  const datos = [
    { nombre: 'Comentarios', v: TOT.comentarios },
    { nombre: 'Nombran a 365', v: cv.mencionan365 },
    { nombre: 'Comentarios positivos', v: cv.positivos, f: '%' },
    { nombre: 'Respuestas del Pelao', v: cv.respuestasCreador },
  ];
  const conDato = datos.filter(d => d.v != null);
  if (conDato.length < 2) $('[data-slot="conversacion"]').remove(); // solo comentarios: ya lo dice el texto
  else $('[data-slot="conversacion"]').innerHTML = conDato.map(d => `<div class="dato panel panel--sm">${cifra(d.v, d.f)}<span>${d.nombre}</span></div>`).join('');
  $('[data-slot="capturas"]').innerHTML = C.comentarios.map((c, i) => `
    <figure class="captura" data-r style="--r:${i * 2 + 1}">
      <img src="${esc(c.imagen)}" width="${c.ancho}" height="${c.alto}" alt="${esc(c.alt)}" loading="eager">
      <figcaption class="panel panel--sm"><b>${esc(c.titulo)}</b>${esc(c.texto)}</figcaption>
    </figure>`).join('');
}

function armarAprendizajes(lec) {
  const { mas, seg, ratio, conv } = lec;
  const pm = M(mas).reproducciones, ps = M(seg).reproducciones;
  const sm = M(mas).nuevosSeguidores;
  const seguidoresDe = (x, y) => (M(x).nuevosSeguidores != null && M(y).nuevosSeguidores != null && !est(x, 'nuevosSeguidores') && !est(y, 'nuevosSeguidores')
    ? ` «${x.titulo}» sumó ${nf.format(M(x).nuevosSeguidores)} seguidores nuevos, contra ${nf.format(M(y).nuevosSeguidores)}.` : '');
  // beneficio concreto contra general: los reels con `beneficio: 'general'` en datos.js contra el resto
  const gen = R.find(r => r.beneficio === 'general'), conc = R.filter(r => r !== gen);
  const primera = gen && conc.length && conc.every(r => !est(r, 'reproducciones'))
    ? (() => {
      const prom = conc.reduce((s2, r) => s2 + M(r).reproducciones, 0) / conc.length;
      return { titulo: 'El beneficio concreto rinde más', dato: `${valor(prom)} <span class="contra">contra</span> ${valor(M(gen).reproducciones)}`,
        texto: `${conc.length > 1 ? `Los ${palabra(conc.length)} reels con un descuento concreto (${lista(conc.map(r => r.beneficio))}) promediaron` : `«${conc[0].titulo}» tuvo`} ${texto(prom)} visualizaciones, ${veces(prom / M(gen).reproducciones, 'visualizaciones', 'las').replace(/^(el (doble|triple)) de visualizaciones$/, '$1')} que «${gen.titulo}», el de beneficios generales.${seguidoresDe(mas, gen)}` };
    })()
    : { titulo: `«${mas.titulo}», el más visto`, dato: `${valor(pm, 'n', est(mas, 'reproducciones'))} <span class="contra">contra</span> ${valor(ps, 'n', est(seg, 'reproducciones'))}`,
      texto: `Tuvo ${veces(ratio, 'visualizaciones', 'las')} que «${seg.titulo}».${seguidoresDe(mas, seg)}` };
  const tarjetas = [
    primera,
    { titulo: 'La marca entra en la charla', dato: '«ALGUIEN CON 365 por acá?»', cita: true,
      texto: 'En los comentarios, 365 aparece como la respuesta a un plan: ir al cine, hacer las compras. Lo dice la comunidad, no el aviso.' },
  ];
  // el que más conversó, entre los reels con captura (la tasa de los estimados es estimada)
  if (conv && conv !== mas && !estTasa(mas)) {
    const tc = tasa(M(conv)), tm = tasa(M(mas));
    tarjetas.push({ titulo: `«${conv.titulo}» conversó más`, dato: `${valor(tc, '%')} <span class="contra">contra</span> ${valor(tm, '%')}`,
      texto: `Con menos visualizaciones, sumó más me gusta y comentarios por cada una que «${mas.titulo}». Un formato abre la puerta y el otro hace hablar.` });
  }
  $('[data-slot="aprendizajes"]').innerHTML = tarjetas.map((t, i) => `
    <article class="tarjeta panel" data-r style="--r:${i + 1}">
      <p class="tarjeta__dato${t.cita ? ' tarjeta__dato--cita' : ''}">${t.dato}</p>
      <h3>${esc(t.titulo)}</h3>
      <p>${esc(t.texto)}</p>
    </article>`).join('');
  const faltan = ['alcance', 'compartidos', 'reposteos', 'guardados', 'tiempoTotal'].filter(k => R.some(r => M(r)[k] == null)).map(minus);
  const falta = $('[data-slot="falta"]');
  const partesFalta = [];
  if (faltan.length) partesFalta.push(`Para cerrar el informe faltan las estadísticas de la cuenta: ${lista(faltan)}.`);
  if (partesFalta.length) falta.textContent = partesFalta.join(' '); else falta.remove();
}



/* ── el cargador: cuenta trabajo terminado, nada más ── */
async function cargar(alAvanzar) {
  const tareas = [];
  const sumar = (peso, promesa) => tareas.push({ peso, promesa: Promise.resolve(promesa).catch(() => {}) });
  for (const f of ['900 1em Archivo', '400 1em Inter', '600 1em Inter', '1em Graduate']) sumar(1, document.fonts.load(f));
  const imgs = new Set([...$$('img')].map(i => i.currentSrc || i.src).concat(R.map(r => r.portada)));
  for (const src of imgs) sumar(1, new Promise(ok => { const im = new Image(); im.onload = im.onerror = ok; im.src = src; }));
  for (const v of $$('.telefono video')) sumar(3, new Promise(ok => { if (v.readyState >= 2) ok(); else { v.addEventListener('loadeddata', ok, { once: true }); v.addEventListener('error', ok, { once: true }); } }));
  const totalPeso = tareas.reduce((s, t) => s + t.peso, 0);
  let hecho = 0;
  tareas.forEach(t => t.promesa.then(() => { hecho += t.peso; alAvanzar(hecho / totalPeso); }));
  await Promise.race([Promise.all(tareas.map(t => t.promesa)), new Promise(ok => setTimeout(ok, 15000))]);
}

/* ── todo ── */
async function iniciar() {
  armarReels(); armarTelefono();
  const lec = armarNumeros();
  armarPublico(); armarConversacion(); armarAprendizajes(lec);

  const ESC = $$('.escena');
  ESC.forEach(e => { $$('[data-r]', e).forEach((el, i) => { if (!el.style.getPropertyValue('--r')) el.style.setProperty('--r', i); }); e.inert = true; e.setAttribute('aria-hidden', 'true'); });

  // el cargador
  const pct = $('.cargador__pct'), llenado = $('#llenado rect');
  let mostrado = 0;
  const pintar = p => { mostrado = Math.max(mostrado, p); pct.textContent = `${Math.round(mostrado * 100)} %`; llenado.setAttribute('y', String(4376 * (1 - mostrado))); };
  pintar(0);

  // el 365 en 3D (si no hay WebGL, el logo plano hace lo mismo)
  let insignia;
  try { insignia = crearEscena($('canvas.lienzo'), { movil: MOVIL, reducido: REDUCIDO }); }
  catch (err) { console.warn('Sin 3D:', err); document.body.classList.add('sin-3d'); insignia = insigniaPlana(); }

  await cargar(pintar);

  /* ── escenas y capítulos ── */
  let actual = -1, enViaje = false, cola = 0, ultimaActividad = performance.now();
  const capitulos = [];
  ESC.forEach((e, i) => { const c = e.dataset.capitulo; if (!capitulos.some(x => x.nombre === c)) capitulos.push({ nombre: c, i }); });
  const isla = $('.isla'), islaLista = $('.isla__lista', isla), islaSig = $('.isla__siguiente', isla);
  islaLista.innerHTML = capitulos.map(c => `<button type="button" data-ir="${c.i}">${esc(c.nombre)}</button>`).join('');

  const tel = $('.telefono'), cinta = $('.telefono__cinta'), videos = $$('video', tel);
  let anclaTelefono = $('[data-ancla-telefono]');

  function ir(i, { inmediato = false } = {}) {
    i = clamp(i, 0, ESC.length - 1);
    if (i === actual) return;
    const dir = i > actual ? 1 : -1, previa = ESC[actual], nueva = ESC[i];
    if (previa) {
      previa.classList.remove('is-activa');
      previa.classList.add(dir > 0 ? 'is-sale-arriba' : 'is-sale-abajo');
      previa.inert = true; previa.setAttribute('aria-hidden', 'true');
      setTimeout(() => previa.classList.remove('is-sale-arriba', 'is-sale-abajo'), 1000);
    }
    nueva.style.setProperty('--desde', dir);
    nueva.classList.remove('is-sale-arriba', 'is-sale-abajo');
    if (inmediato) nueva.classList.add('sin-transicion');
    nueva.classList.add('is-activa'); nueva.inert = false; nueva.removeAttribute('aria-hidden');
    if (inmediato) requestAnimationFrame(() => requestAnimationFrame(() => nueva.classList.remove('sin-transicion')));
    $('.escena__cuerpo', nueva)?.scrollTo(0, 0);
    const antes = actual; actual = i;
    document.body.dataset.escena = nueva.id;
    history.replaceState(null, '', i === 0 ? location.pathname + location.search : `#${nueva.id}`);
    enViaje = true;
    setTimeout(() => { enViaje = false; if (cola) { const d = cola; cola = 0; paso(d); } }, REDUCIDO ? 250 : 700);
    if (!inmediato && antes >= 0) S.sonar('paso', dir);
    entrar(nueva, ESC[antes]);
    pintarIsla();
  }
  function paso(dir) {
    ultimaActividad = performance.now(); isla.classList.remove('is-sugiere');
    if (enViaje) { if (!cola) cola = dir; return; } // un gesto en pleno viaje suma uno, nunca más
    ir(actual + dir);
  }

  // lo que pasa al entrar a cada escena
  const contadas = new WeakSet();
  let timersEscena = [];
  function entrar(e, previa) {
    timersEscena.forEach(clearTimeout); timersEscena = [];
    const despues = (ms, fn) => timersEscena.push(setTimeout(fn, REDUCIDO ? 0 : ms));
    // el 365
    const ancla = $('[data-ancla-365]', e);
    const inc = (e.dataset.inclinacion || '0,0,0').split(',').map(Number);
    insignia.ir(ancla, { inclinacion: inc });
    // el teléfono
    const k = e.dataset.reel != null ? +e.dataset.reel : -1;
    if (k >= 0) anclaTelefono = $('[data-ancla-telefono]', e);
    const kPrevio = previa?.dataset.reel != null ? +previa.dataset.reel : -1;
    tel.dataset.estado = k >= 0 ? 'visible' : ESC.indexOf(e) < ESC.findIndex(x => x.dataset.reel != null) ? 'abajo' : 'arriba';
    if (k >= 0) { cinta.style.setProperty('--reel', k); if (kPrevio >= 0 && kPrevio !== k) { S.sonar('reel'); insignia.girar(1); } }
    ubicarTelefono();
    sonidoVideos(k);
    // las cifras cuentan
    $$('[data-cifra]', e).forEach((el, n) => {
      if (contadas.has(el)) return; contadas.add(el);
      el.innerHTML = valor(0, el.dataset.formato, el.dataset.aprox);
      despues(420 + n * 60, () => contar(el, el.dataset.hero ? () => { S.sonar('caja'); insignia.girar(1); } : null));
    });
    // capturas: cada una entra con su aviso
    if (e.id === 'conversacion') $$('.captura', e).forEach(c => despues(330 + (+c.style.getPropertyValue('--r') || 0) * 90, () => S.sonar('noti')));
  }

  /* ── cifras que cuentan ── */
  function contar(el, alTerminar) {
    const fin = +el.dataset.cifra, f = el.dataset.formato, aprox = el.dataset.aprox;
    if (REDUCIDO) { el.innerHTML = valor(fin, f, aprox); alTerminar?.(); return; }
    const grande = !!alTerminar, dur = grande ? 1800 : 1100, t0 = performance.now();
    let tic = -1;
    const cuadro = ahora => {
      const k = clamp((ahora - t0) / dur), e = k === 1 ? 1 : 1 - 2 ** (-10 * k);
      el.innerHTML = valor(fin * e, f, aprox);
      if (grande) { const n = Math.floor(e * 12); if (n !== tic) { tic = n; S.sonar('tic', n); } }
      if (k < 1) requestAnimationFrame(cuadro); else alTerminar?.();
    };
    requestAnimationFrame(cuadro);
  }

  /* ── el teléfono ── */
  function ubicarTelefono() {
    if (!anclaTelefono) return;
    // se mide la posición sin la transformación de entrada o salida de la escena (el teléfono hace su propio viaje)
    const escena = anclaTelefono.closest('.escena'), r = anclaTelefono.getBoundingClientRect();
    const tf = getComputedStyle(escena).transform, m = new DOMMatrixReadOnly(tf === 'none' ? undefined : tf);
    const y = r.top - m.m42;
    const fuera = tel.dataset.estado === 'abajo' ? innerHeight * 1.05 : tel.dataset.estado === 'arriba' ? -innerHeight * 1.05 : 0;
    tel.style.setProperty('--tx', `${r.left - m.m41}px`);
    tel.style.setProperty('--ty', `${y + fuera}px`);
    tel.style.setProperty('--tw', `${r.width}px`);
    tel.style.setProperty('--th', `${r.height}px`);
  }
  function sonidoVideos(k = +(ESC[actual]?.dataset.reel ?? -1)) {
    videos.forEach((v, i) => {
      if (i === k) {
        v.muted = !(S.sonidoPrendido() && S.hayGesto());
        const p = v.play(); if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
      } else v.pause();
    });
    tel.classList.toggle('is-muteado', k >= 0 && videos[k]?.muted);
  }
  // un toque en el teléfono: si estaba mudo por falta de gesto, ahora suena; si sonaba, pausa o sigue
  tel.addEventListener('click', () => {
    const k = +(ESC[actual]?.dataset.reel ?? -1), v = videos[k]; if (!v) return;
    if (v.muted && S.sonidoPrendido()) { sonidoVideos(k); return; }
    if (v.paused) v.play().catch(() => {}); else v.pause();
  });
  // el primer gesto habilita el sonido del reel que se está viendo
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => setTimeout(() => sonidoVideos(), 0), { once: true, capture: true });

  /* ── la isla ── */
  function pintarIsla() {
    const cap = ESC[actual].dataset.capitulo;
    $$('button', islaLista).forEach(b => {
      const activo = ESC[+b.dataset.ir].dataset.capitulo === cap;
      b.classList.toggle('is-activo', activo);
      if (activo) { b.setAttribute('aria-current', 'step'); if (MOVIL) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: REDUCIDO ? 'auto' : 'smooth' }); }
      else b.removeAttribute('aria-current');
    });
    const sig = ESC[actual + 1];
    const etiqueta = !sig ? 'Volver al inicio' : sig.dataset.capitulo === cap ? 'Siguiente reel' : 'Seguir';
    $('.isla__texto', islaSig).textContent = etiqueta;
    islaSig.setAttribute('aria-label', etiqueta);
    islaSig.classList.toggle('is-ultimo', !sig);
    document.body.classList.toggle('en-portada', actual === 0);
  }
  islaLista.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) { S.sonar('pip'); ir(+b.dataset.ir); } });
  islaSig.addEventListener('click', () => { S.sonar('pip'); if (actual === ESC.length - 1) ir(0); else paso(1); });
  setInterval(() => {
    const quieto = performance.now() - ultimaActividad > 2600 && !enViaje;
    isla.classList.toggle('is-sugiere', quieto);
  }, 300);

  /* ── los gestos: un gesto = un paso ── */
  // ¿el gesto es para scrollear adentro de la escena? (pasa solo si el contenido no entra en la pantalla)
  const scrolleable = (ev, dir) => {
    const c = ev.target.closest?.('.escena__cuerpo');
    if (!c || c.scrollHeight <= c.clientHeight + 2) return false;
    return dir > 0 ? c.scrollTop + c.clientHeight < c.scrollHeight - 2 : c.scrollTop > 2;
  };
  // La rueda y el trackpad llegan como un chorro de eventos: el empujón del dedo y después la inercia, que se apaga sola.
  // Un gesto nuevo es un chorro que arranca después de una pausa, o uno que vuelve a crecer cuando la inercia ya se estaba
  // apagando (el dedo empujó otra vez). La inercia sola nunca cuenta como otro paso. Sale del deck de L'Oréal, con un
  // cambio: «vuelve a crecer» se mide contra los 5 eventos de justo antes, no contra los últimos 40 (con una cola larga de
  // 1 px, el promedio largo quedaba bajo y la inercia que se apagaba contaba como otro empujón)
  const nuevoGesto = (t, dir) => ({ t, dir, acum: 0, armado: true, hist: [], pico: 0, decayo: false, disparo: -1e9 });
  const prom = (h, n) => { const v = h.slice(-n); return v.reduce((a, b) => a + b, 0) / v.length; };
  let gesto = nuevoGesto(-1e9, 0);
  addEventListener('wheel', ev => {
    if (ev.ctrlKey || visor.open) return; // zoom con pellizco, o la captura abierta (scrollea ella)
    const ahora = performance.now(), dir = Math.sign(ev.deltaY), m = Math.abs(ev.deltaY) * (ev.deltaMode === 1 ? 16 : 1);
    ultimaActividad = ahora;
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) || !dir) { ev.preventDefault(); return; }
    if (dir !== gesto.dir || ahora - gesto.t > 220) gesto = nuevoGesto(ahora, dir);
    gesto.t = ahora;
    if (scrolleable(ev, dir)) { Object.assign(gesto, { armado: false, decayo: false, disparo: ahora }); return; } // scrollea el contenido; la inercia de este chorro no cuenta como paso
    ev.preventDefault();
    const h = gesto.hist; h.push(m); if (h.length > 50) h.shift();
    const ya = prom(h, 5); gesto.pico = Math.max(gesto.pico, ya);
    if (ya < gesto.pico * .55) gesto.decayo = true;
    // otro empujón = el promedio corto vuelve a crecer contra el de justo antes (la inercia que se apaga nunca crece)
    if (!gesto.armado && gesto.decayo && h.length > 10 && ya > prom(h.slice(0, -5), 5) * 1.25 + .5 && ahora - gesto.disparo > 350) { gesto.armado = true; gesto.acum = 0; }
    if (!gesto.armado) return;
    gesto.acum += m;
    if (gesto.acum > 12) { Object.assign(gesto, { armado: false, decayo: false, pico: prom(h, 5), disparo: ahora }); paso(dir); }
  }, { passive: false });
  // el dedo: una pasada vertical de 36 px es un paso
  let toque = null;
  addEventListener('touchstart', e => { const t = e.touches[0]; toque = { x: t.clientX, y: t.clientY, hecho: false, cuerpo: e.target.closest?.('.escena__cuerpo'), top: e.target.closest?.('.escena__cuerpo')?.scrollTop ?? 0 }; ultimaActividad = performance.now(); }, { passive: true });
  addEventListener('touchmove', e => {
    if (!toque || toque.hecho || visor.open) return;
    const t = e.touches[0], dy = toque.y - t.clientY, dx = toque.x - t.clientX;
    if (Math.abs(dy) < 36 || Math.abs(dx) > Math.abs(dy)) return;
    const dir = Math.sign(dy), c = toque.cuerpo;
    if (c && c.scrollHeight > c.clientHeight + 2) { // si el contenido scrollea, primero scrollea; el paso pide llegar al borde
      const enBorde = dir > 0 ? c.scrollTop + c.clientHeight >= c.scrollHeight - 2 && toque.top + c.clientHeight >= c.scrollHeight - 2 : c.scrollTop <= 2 && toque.top <= 2;
      if (!enBorde) return;
    }
    toque.hecho = true; paso(dir);
  }, { passive: true });
  addEventListener('touchend', () => { toque = null; }, { passive: true });

  // teclado
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea') || e.altKey || e.metaKey || e.ctrlKey || visor.open) return;
    ultimaActividad = performance.now();
    const enBoton = e.target.closest('button, a, [role="button"]');
    if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.key) || (e.key === ' ' && !enBoton)) { e.preventDefault(); paso(1); }
    else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); paso(-1); }
    else if (e.key === 'Home') { e.preventDefault(); ir(0); }
    else if (e.key === 'End') { e.preventDefault(); ir(ESC.length - 1); }
  });
  // links internos (#id)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const i = ESC.findIndex(x => x.id === a.getAttribute('href').slice(1));
    if (i >= 0) { e.preventDefault(); ir(i); }
  });
  addEventListener('hashchange', () => { const i = ESC.findIndex(x => `#${x.id}` === location.hash); if (i >= 0) ir(i); });

  // el puntero inclina un poco el 365
  if (!MOVIL) addEventListener('pointermove', e => insignia.mano(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), { passive: true });

  // tooltips del gráfico
  const tip = $('.tip');
  addEventListener('pointermove', e => {
    const b = e.target.closest?.('[data-tip]');
    if (!b) { tip.classList.remove('is-visible'); return; }
    tip.textContent = b.dataset.tip; tip.classList.add('is-visible');
    const w = tip.offsetWidth;
    tip.style.transform = `translate(${clamp(e.clientX - w / 2, 8, innerWidth - w - 8)}px, ${e.clientY - 46}px)`;
  }, { passive: true });

  // el sonido
  const botonSonido = $('.sonido');
  const pintarSonido = () => { botonSonido.setAttribute('aria-pressed', String(S.sonidoPrendido())); botonSonido.classList.toggle('is-bloqueado', S.sonidoBloqueado()); };
  botonSonido.addEventListener('click', () => { S.alternarSonido(); pintarSonido(); sonidoVideos(); });
  setInterval(pintarSonido, 600); pintarSonido();

  addEventListener('resize', () => { insignia.resize(); ubicarTelefono(); });

  /* ── arranque: del cargador a la escena pedida ── */
  const pedido = ESC.findIndex(x => `#${x.id}` === location.hash);
  pintar(1);
  insignia.ir($('.cargador__logo')); insignia.plantar();
  document.body.classList.add('is-listo');
  setTimeout(() => {
    document.body.classList.remove('is-cargando');
    ir(Math.max(0, pedido), { inmediato: true });
    if (pedido <= 0) setTimeout(() => insignia.girar(1), REDUCIDO ? 0 : 250);
  }, REDUCIDO ? 0 : 450);

  /* ── la captura de las estadísticas de cada reel: la fuente de sus números ── */
  const visor = $('.visor'), visorCuerpo = $('.visor__cuerpo', visor);
  // un reel sin captura: lo público y cómo se estimó el resto (con los números del cálculo)
  function comoSeEstimo(r) {
    const m = M(r), p = r.publicos, base = BASE.map(b => `«${esc(b.titulo)}»`);
    const fila = (nombre, v, f = 'n', nota = '', aprox = false) => `<div class="fila"><dt>${nombre}${nota ? `<small>${nota}</small>` : ''}</dt><dd><b class="cifra${aprox ? ' is-estimado' : ''}">${valor(v, f, aprox)}</b></dd></div>`;
    const rv = BASE.map(b => b.metricas.reproducciones / b.publicos.reproducciones);
    const cada100 = k => `${dec(FACTOR[k] * 100, 1)} por cada 100 me gusta`;
    const filas = [
      ['reproducciones', 'Visualizaciones', REPARTO
        ? `del total de la campaña (${texto(C.totalReproducciones)}) menos lo de los reels con captura, repartido según las visualizaciones públicas`
        : `las públicas × ${dec(FACTOR.reproducciones, 1)} (en los reels con captura, de ${dec(Math.min(...rv), 1)} a ${dec(Math.max(...rv), 1)})`],
      ['alcance', 'Espectadores', `${dec(FACTOR.alcance * 100, 0)} % de las visualizaciones`],
      ['compartidos', 'Compartidos', cada100('compartidos')],
      ['reposteos', 'Reposteos', cada100('reposteos')],
      ['guardados', 'Guardados', cada100('guardados')],
      ['noSeguidores', 'Interacciones de no seguidores', 'el promedio de los reels con captura', '%1'],
      ['tiempoTotal', 'Tiempo de reproducción', `${dec(FACTOR.tiempoTotal, 1)} segundos por visualización`, 'dh'],
      ['nuevosSeguidores', 'Nuevos seguidores', `${dec(FACTOR.nuevosSeguidores * 1e5, 1)} cada 100 mil visualizaciones`],
    ].filter(([k]) => est(r, k));
    const diasBase = BASE.map(b => String(dias(b.publicado, C.corte)));
    return `<div class="visor__estimado">
      <p>Este reel no tiene captura de estadísticas. Lo real, al ${esc(C.corte)}: ${r.reales?.reproducciones != null ? 'las visualizaciones (de la cuenta) y ' : ''}los me gusta y comentarios públicos de Instagram.</p>
      <dl class="tabla__filas">${r.reales?.reproducciones != null ? fila('Visualizaciones', m.reproducciones) : fila('Visualizaciones públicas', p.reproducciones)}${fila('Me gusta', p.meGusta)}${fila('Comentarios', p.comentarios)}</dl>
      <p>Esos van tal cual. El resto sale de cómo les fue a ${lista(base)}, medidos el mismo día:</p>
      <dl class="tabla__filas">${filas.map(([k, nombre, nota, f]) => fila(nombre, m[k], f, nota, true)).join('')}</dl>
      <p>Como todo se midió el mismo día, el estimado ya tiene en cuenta que este reel lleva menos tiempo publicado: ${dias(r.publicado, C.corte)} días, contra ${lista(diasBase)}.</p>
    </div>`;
  }
  function abrirCaptura(i) {
    const r = R[i];
    if (r.estimados.size) {
      visorCuerpo.innerHTML = comoSeEstimo(r);
      visorCuerpo.scrollTo?.(0, 0); $('.visor__panel', visor).scrollTo?.(0, 0);
      $('.visor__titulo', visor).textContent = `Cómo se estimó «${r.titulo}»`;
      $('.visor__nota', visor).textContent = '';
      S.sonar('pip'); visor.showModal(); return;
    }
    const caps = r.capturas || [];
    visorCuerpo.innerHTML = caps.length
      ? caps.map((src, n) => `<img src="${esc(src)}" alt="Captura ${n + 1} de ${caps.length} de las estadísticas de Instagram del reel ${esc(r.titulo)}" loading="lazy">`).join('')
      : `<p class="visor__falta">Falta sumar la captura de las estadísticas de este reel.</p>`;
    visorCuerpo.scrollTo?.(0, 0); $('.visor__panel', visor).scrollTo?.(0, 0);
    $('.visor__titulo', visor).textContent = `Estadísticas de «${r.titulo}»`;
    $('.visor__nota', visor).textContent = caps.length ? `Capturas del perfil de @${C.creador.usuario} en Instagram${r.fechaCaptura ? `, ${r.fechaCaptura}` : ''}.` : '';
    S.sonar('pip'); visor.showModal();
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-captura]'); if (b) abrirCaptura(+b.dataset.captura); });
  $('.visor__cerrar', visor).addEventListener('click', () => visor.close());
  visor.addEventListener('click', e => { if (e.target === visor) visor.close(); }); // tocar afuera cierra
  visor.addEventListener('close', () => { ultimaActividad = performance.now(); });

  window.__deck = { ir, paso, actual: () => actual, escenas: ESC.map(e => e.id), insignia, S, datos: C };
}

// sin WebGL: el logo plano sigue a las mismas anclas
function insigniaPlana() {
  const img = document.createElement('img');
  img.src = 'assets/img/logo365.svg'; img.alt = ''; img.className = 'insignia-plana';
  document.body.appendChild(img);
  let ancla = null;
  const seguir = () => {
    if (ancla) { const r = ancla.getBoundingClientRect(); img.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.height}px;height:${r.height}px;opacity:1`; }
    else img.style.opacity = '0';
    requestAnimationFrame(seguir);
  };
  requestAnimationFrame(seguir);
  return { ir(el) { ancla = el; }, girar() {}, plantar() {}, mano() {}, resize() {} };
}

iniciar().catch(err => { console.error(err); document.body.classList.remove('is-cargando'); });
