import { CREADORES, ETAPAS, PIEZAS, DISTRIBUCION, ENTREGABLES, PLAN, PASOS } from './datos.js?v=20261124';
import { svgFlor, dibujar, COLORES } from './flor.js?v=20261124';
import * as S from './sonido.js?v=20261124';

const gsap = window.gsap;
const REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const M = REDUCIDO ? 0 : 1;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);
const tramoDe = (u, a, b) => clamp((u - a) / (b - a));
const esMovil = () => innerWidth <= 760;
const reloj = () => performance.now() / 1000;
const escritos = new WeakMap();
function poner(el, prop, val) {
  let m = escritos.get(el);
  if (!m) escritos.set(el, m = {});
  if (m[prop] === val) return;
  m[prop] = val;
  if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
}
let silencioHasta = 0;
const sonar = (nombre, arg) => { if (reloj() >= silencioHasta) S.sonar(nombre, arg); };

function partirTitulos() {
  for (const t of $$('[data-partir]')) {
    const texto = t.innerHTML.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    t.setAttribute('aria-label', texto);
    t.innerHTML = t.innerHTML.split(/<br\s*\/?>/).map(l => l.trim().split(/\s+/).map(p => `<span class="p" aria-hidden="true"><span class="p__i">${p}</span></span>`).join(' ')).join('<br>');
  }
}

const ORDEN_CREADORES = Object.keys(CREADORES);

function armarLineup() {
  const cont = $('.lineup__nombres');
  const filas = [1, 2, 3, 4].map(n => el('p', `lineup__fila lineup__fila--${n}`));
  for (const id of ORDEN_CREADORES) {
    const c = CREADORES[id];
    const n = el('span', 'nombre', `<span class="nombre__t">${c.nombre}</span><span class="nombre__n">${c.seguidores}</span>`);
    n.dataset.c = id;
    filas[c.fila - 1].append(n);
  }
  cont.append(...filas);
  const ficha = $('.ficha');
  ficha.innerHTML = `<div class="ficha__fotos">${ORDEN_CREADORES.map(id => `<img src="${CREADORES[id].foto}" alt="${CREADORES[id].nombre}" data-c="${id}" decoding="async">`).join('')}</div>
    <figcaption class="ficha__pie"><span class="ficha__nombre"></span><span class="ficha__dato"><b></b> seguidores en Instagram</span></figcaption>`;
}

const DIAS = Array.from({ length: 14 }, (_, d) => {
  const fecha = new Date(2026, 10, 22 + d);
  return { d, n: fecha.getDate(), sem: 'DLMMJVS'[fecha.getDay()], mes: fecha.getDate() === 22 ? 'nov' : fecha.getDate() === 1 ? 'dic' : '' };
});
const etapaDe = id => ETAPAS.find(e => e.id === id);

function miniCalendario(etapa) {
  return `<div class="mini-cal" aria-hidden="true">${DIAS.map(x => `<i class="${x.d >= etapa.desde && x.d <= etapa.hasta ? 'si' : ''}"><b>${x.n}</b></i>`).join('')}</div>`;
}

function armarArco() {
  const svg = $('.portada__arco'), W = innerWidth, H = innerHeight, movil = esMovil();
  const cx = W * (movil ? .5 : .55), cy = H * (movil ? .9 : .95), rx = W * (movil ? .62 : .48), ry = H * (movil ? .42 : .69);
  const t0 = Math.PI * (movil ? 1.02 : 1.133), t1 = Math.PI * (movil ? 1.9 : 1.93), n = 110, grueso = Math.max(7, Math.min(W, H) * .03);
  const punto = t => [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  const fuera = [], dentro = [], centro = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, t = t0 + (t1 - t0) * f, [x, y] = punto(t);
    const [x2, y2] = punto(t + .001), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1;
    const nx = dy / l, ny = -dx / l, w = (.6 + grueso * f ** 1.4) / 2;
    fuera.push(`${(x + nx * w).toFixed(1)},${(y + ny * w).toFixed(1)}`);
    dentro.unshift(`${(x - nx * w).toFixed(1)},${(y - ny * w).toFixed(1)}`);
    centro.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const forma = `M${fuera.join('L')}L${dentro.join('L')}Z`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs>
      <linearGradient id="arco-luz" gradientUnits="userSpaceOnUse" x1="${punto(t0)[0]}" y1="0" x2="${punto(t1)[0]}" y2="0">
        <stop offset="0" stop-color="#2f6bff" stop-opacity="0"/><stop offset=".3" stop-color="#3b7bff" stop-opacity=".9"/><stop offset=".7" stop-color="#8fd3ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      <filter id="arco-brillo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(grueso * 1.1).toFixed(1)}"/></filter>
      <mask id="arco-avance" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
        <path d="M${centro.join('L')}" fill="none" stroke="#fff" stroke-width="${grueso * 6}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${$('#arco-avance path')?.getAttribute('stroke-dashoffset') ?? 1}"/>
      </mask></defs>
    <g mask="url(#arco-avance)"><path d="${forma}" fill="url(#arco-luz)" filter="url(#arco-brillo)" transform="translate(0 ${grueso * .2})" opacity=".95"/><path d="${forma}" fill="url(#arco-luz)"/></g>`;
}
addEventListener('pointermove', e => {
  if (!DOM.vidrios || !ESTADO.portadaVisible) return;
  for (const v of DOM.vidrios) {
    const r = v.getBoundingClientRect();
    v.style.setProperty('--px', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
    v.style.setProperty('--py', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
  }
}, { passive: true });
function armarCaras() {
  $('.portada__caras').innerHTML = ORDEN_CREADORES.map((id, k) => {
    const x = k / (ORDEN_CREADORES.length - 1) * 2 - 1;
    return `<span class="cara" title="${CREADORES[id].nombre}" style="--y:${((x * x - 1) * 4.5).toFixed(2)}vh;z-index:${k}"><img src="${CREADORES[id].foto}" alt="${CREADORES[id].nombre}"><i></i></span>`;
  }).join('');
}

const videoDe = id => CREADORES[id].foto.replace('fotos/', 'video/').replace('.webp', '.mp4');
const AVATAR_BIG = '<span class="av-c av-c--big"><svg viewBox="0 0 1162.87 1320.36" aria-hidden="true"><use href="#logo-b"/></svg></span>';

const DIBUJO = {
  reel: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" class="lleno"/></svg>',
  story: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4.2"/><path d="M5.5 20c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/><path d="M3 3.5h18" class="fino"/></svg>',
  recap: '<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"/><path d="M5 9.5h14M5 14.5h14M9.5 5v14M14.5 5v14" class="fino"/></svg>',
};
const NOMBRE_CARTA = { reel: n => `${n} Reel${n > 1 ? 's' : ''}`, story: n => `${n} stor${n > 1 ? 'ies' : 'y'}`, recap: () => 'Recap' };
function mazo(tipo, n) {
  return `<div class="mazo mazo--${tipo}" style="--n:${n}" title="${NOMBRE_CARTA[tipo](n)}">
    <div class="mazo__cartas">${Array.from({ length: n }, (_, i) => `<span class="carta" style="--i:${i}">${DIBUJO[tipo]}</span>`).join('')}</div>
    <span class="mazo__n">${NOMBRE_CARTA[tipo](n)}</span></div>`;
}

function armarCampana() {
  $('.resumen__etapas').innerHTML = ETAPAS.map(e => {
    const [a, b] = COLORES[e.color];
    return `<article class="panel etapa-r" style="--a:${a};--b:${b}">
      <h3 class="serif etapa-r__nombre">${e.nombre}</h3>
      <p class="etapa-r__fechas">${e.fechas}</p>
      ${miniCalendario(e)}
      <p class="etapa-r__texto">${e.resumen}</p>
      <div class="entrega">
        <div class="entrega__mesa">${e.cartas.map(([tipo, n], k) => `${k ? '<span class="entrega__mas" aria-hidden="true">+</span>' : ''}${mazo(tipo, n)}`).join('')}</div>
      </div>
    </article>`;
  }).join('');
  $('.etapa').innerHTML = ETAPAS.map(e => `<div class="etapa__item" data-etapa="${e.id}">
      <h3 class="serif etapa__nombre">${e.nombre}.</h3>
    </div>`).join('');
  const avatarDe = id => id === 'big' ? AVATAR_BIG : `<span class="av-c"><img src="${CREADORES[id].foto}" alt=""></span>`;
  $('.guion').innerHTML = PIEZAS.map(p => {
    return `<article class="panel guion__pieza" data-pieza="${p.id}">
      <div class="guion__quien"><span class="guion__caras">${p.creadores.map(avatarDe).join('')}</span><span>${p.quien}</span></div>
      <h4 class="serif guion__titulo">${p.titulo}</h4>
      <div class="guion__datos"><p>${p.formato}</p><p>${p.cuando}</p></div>
    </article>`;
  }).join('');
  $('.chat').innerHTML = PIEZAS.map(p => {
    const yo = p.creadores[p.creadores.length - 1];
    const globo = (l, texto, deCreador) => `<div class="globo ${deCreador ? 'globo--creador' : 'globo--big'}" data-l="${l}">
        ${deCreador ? avatarDe(yo) : AVATAR_BIG}<p class="globo__t${deCreador ? ' serif' : ''}">${texto}</p></div>`;
    const lineas = [globo(0, p.gancho.cita ? `“${p.gancho.texto}”` : p.gancho.texto, p.gancho.cita), globo(1, p.pasa, false), globo(2, p.cierre.cita ? `“${p.cierre.texto}”` : p.cierre.texto, p.cierre.cita)];
    return `<div class="chat__pieza" data-pieza="${p.id}">${lineas.join('')}<div class="escribe" aria-hidden="true"><i></i><i></i><i></i></div></div>`;
  }).join('');
  const iconos = `<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.6c0 5.6-7.5 10.2-7.5 10.2z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M20 11.6a8 8 0 0 1-11.7 7.1L4 20l1.3-4.1A8 8 0 1 1 20 11.6z"/></svg>
    <svg viewBox="0 0 24 24"><path d="M21 3.5 10.2 13.8M21 3.5l-6.8 17-4-6.7-6.7-4z"/></svg>`;
  $('.telefono__cinta').innerHTML = PIEZAS.map(p => {
    const id = p.creadores[0];
    const video = p.placa
      ? `<div class="reel__video reel__video--placa"><img src="${CREADORES[id].foto}" alt=""></div>`
      : `<div class="reel__video"><video src="${videoDe(id)}" poster="${CREADORES[id].foto}" muted loop playsinline preload="none"></video></div>`;
    const usuarios = `<b>${CREADORES[id].usuario}</b>`;
    const avatar = `<span class="reel__avatar"><img src="${CREADORES[id].foto}" alt=""></span>`;
    const texto = p.gancho.cita ? `“${p.gancho.texto}”` : p.titulo;
    return `<div class="reel" data-pieza="${p.id}">
      ${video}
      <div class="reel__sombra"></div>
      <p class="reel__texto"><span>${texto}</span></p>
      <div class="reel__acciones">${iconos}</div>
      <div class="reel__pie">${avatar}<span class="reel__quien">${usuarios}<small>con Disney+ y Primavera Sound</small></span></div>
      <div class="reel__barra"><i></i></div>
    </div>`;
  }).join('');
  const conPieza = new Set(PIEZAS.filter(p => Number.isInteger(p.dia)).map(p => p.dia));
  $('.calendario').innerHTML = `
    <div class="calendario__dias">${DIAS.map(x => `<div class="dia${conPieza.has(x.d) ? ' dia--pieza' : ''}" data-d="${x.d}"><span class="dia__sem">${x.sem}</span><span class="dia__n">${x.n}</span><span class="dia__mes">${x.mes}</span></div>`).join('')}</div>
    <div class="calendario__cintas">${ETAPAS.map(e => { const [a, b] = COLORES[e.color]; return `<div class="cinta" data-etapa="${e.id}" style="grid-column:${e.desde + 1} / ${e.hasta + 2};--t0:${e.desde === 0 ? -.5 : e.desde - .12};--t1:${e.id === 'vivo' ? e.desde + .5 : e.hasta + .5};--a:${a};--b:${b}"><i></i><span>${e.nombre}</span></div>`; }).join('')}</div>`;
}

function armarDistribucion() {
  const ber = CREADORES.ber.foto, nacho = CREADORES.nacho.foto, renata = CREADORES.renata.foto;
  const mini = {
    collab: `<div class="mini mini--collab">
        <div class="avatares"><img src="${ber}" alt=""><span class="av av--disney"><svg><use href="#logo-disney-claro"/></svg></span><span class="av av--ps">${svgFlor()}</span></div>
        <p><b>${CREADORES.ber.usuario}</b>, <b>Disney+</b> y <b>Primavera Sound</b></p>
      </div>`,
    link: `<div class="mini mini--link">
        <div class="mini-historia"><img src="${renata}" alt=""><span class="mini-historia__link"><svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"/></svg>Ver en vivo</span><i class="toque"></i></div>
      </div>`,
    ads: `<div class="mini mini--ads">
        <div class="anuncio"><img src="${nacho}" alt=""><p><b>${CREADORES.nacho.usuario}</b><span>Publicidad · con Disney+</span></p></div>
        <div class="ventana" aria-hidden="true">${[22, 23, 24, 25, 26, 27, 28, 29].map(n => `<i class="${n >= 26 ? 'si' : ''}">${n}</i>`).join('')}</div>
      </div>`,
    tiktok: `<div class="mini mini--tiktok"><div class="abanico">${PIEZAS.map((p, i) => `<img src="${CREADORES[p.creadores[0]].foto}" alt="" style="--i:${i}">`).join('')}<span class="abanico__recap" style="--i:${PIEZAS.length}">${AVATAR_BIG}</span></div></div>`,
  };
  $('.canales').innerHTML = DISTRIBUCION.map(d => `<article class="panel canal" data-canal="${d.id}">
      ${mini[d.id]}
      <h3 class="canal__titulo">${d.titulo}</h3>
      <p class="canal__texto">${d.texto}</p>
      <p class="canal__quien">${d.quien}</p>
    </article>`).join('');
}

function armarInversion() {
  const monto = $('.monto__n');
  monto.innerHTML = '12.000'.split('').map(c => c === '.' ? '<span class="monto__punto">.</span>' : `<span class="rodillo"><span class="rodillo__tira">${'0123456789'.split('').map(n => `<span>${n}</span>`).join('')}</span></span>`).join('');
  $('.entregables').innerHTML = ENTREGABLES.map(e => `<li class="entregable"><span class="entregable__t">${e.texto}</span><span class="entregable__n">${e.n}</span></li>`).join('');
}

function armarPasos() {
  $('.plan').innerHTML = `<div class="plan__linea"><i></i></div>` + PLAN.map((p, i) => `<div class="hito${i === 0 ? ' hito--primero' : i === PLAN.length - 1 ? ' hito--ultimo' : ''}" style="--x:${i / (PLAN.length - 1)}"><span class="hito__punto"></span><span class="hito__cuando">${p.cuando}</span><span class="hito__texto">${p.texto}</span></div>`).join('');
  $('.pasos__lista').innerHTML = PASOS.map(p => `<li class="panel paso"><h3 class="paso__titulo">${p.titulo}</h3><p class="paso__texto">${p.texto}</p></li>`).join('');
}

function ajustarLineup() {
  const cartel = $('.lineup__cartel'), cs = getComputedStyle(cartel);
  const ancho = cartel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let anterior = Infinity;
  $$('.lineup__fila').forEach((f, i) => {
    f.style.setProperty('--fila', '100px');
    const medida = f.offsetWidth || 1;
    const tope = i === 0 ? innerHeight * (esMovil() ? .07 : .1) : anterior * .86;
    const tam = Math.min(100 * ancho / medida * .97, tope);
    f.style.setProperty('--fila', tam.toFixed(2) + 'px');
    anterior = tam;
  });
}

const cargador = $('.cargador');
const florCarga = el('div', 'flor-carga');
florCarga.innerHTML = svgFlor({ dibujo: true });
$('.cargador__flor').append(florCarga);
const svgCarga = florCarga.firstElementChild;
let avance = 0, avanceVisto = 0, petaloSonado = -1;

function tarea(promesa, peso) {
  return Promise.resolve(promesa).catch(e => console.warn('carga', e)).finally(() => { avance += peso; });
}
function imagenes(urls) {
  return Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = () => (i.decode ? i.decode().catch(() => {}).finally(r) : r()); i.src = u; })));
}
async function inyectarLogos() {
  const r = await fetch('assets/img/logos.svg');
  const caja = el('div'); caja.innerHTML = await r.text();
  document.body.prepend(caja.firstElementChild);
}

let unidad = innerHeight;
const TRAMOS = {};
let TOTAL = 0;
function medirTramos() {
  const sonda = el('div'); sonda.style.cssText = 'position:absolute;top:0;height:100vh;width:1px;visibility:hidden';
  document.body.append(sonda); unidad = sonda.offsetHeight || innerHeight; sonda.remove();
  let s = 0;
  for (const t of $$('.tramo')) {
    const l = parseFloat(getComputedStyle(t).getPropertyValue('--largo')) / 100;
    TRAMOS[t.dataset.tramo] = { s, l, el: t };
    s += l;
  }
  TOTAL = s;
}
const en = (nombre, f) => TRAMOS[nombre].s + f * TRAMOS[nombre].l;

const CAMP = { resumen: 1.36, pieza: .4, parada: .26, globos: [.04, .11, .18] };
function piezasEn() {
  return PIEZAS.map((p, k) => ({ p, s: CAMP.resumen + k * CAMP.pieza, d: CAMP.pieza }));
}
let TIEMPOS = [];

let GUION = null;
function armarGuion() {
  if (GUION) { GUION.revert(); GUION.kill(); }
  const G = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const capa = n => $(`.capa.${n}`);
  const entra = (n, a, b) => G.fromTo(capa(n), { autoAlpha: 0 }, { autoAlpha: 1, duration: b - a, immediateRender: true }, a);
  const sale = (n, a, b) => G.fromTo(capa(n), { autoAlpha: 1 }, { autoAlpha: 0, duration: b - a, immediateRender: false }, a);
  const sube = (sel, a, b, extra = {}) => G.fromTo(sel, { yPercent: 115 * M, autoAlpha: M ? 1 : 0 }, { yPercent: 0, autoAlpha: 1, duration: b - a, ease: 'power3.out', stagger: (b - a) * .08, immediateRender: true, ...extra }, a);
  const aparece = (sel, a, b, y = 40) => G.fromTo(sel, { autoAlpha: 0, y: y * M }, { autoAlpha: 1, y: 0, duration: b - a, ease: 'power2.out', immediateRender: true }, a);

  const P0 = en('portada', 0);
  G.set(capa('portada'), { autoAlpha: 1 }, 0);
  G.to('.portada__arco', { autoAlpha: 0, y: -90 * M, duration: en('portada', .7) - en('portada', .38), ease: 'power2.in' }, en('portada', .38));
  G.to('.portada__caras', { autoAlpha: 0, y: -70 * M, duration: en('portada', .7) - en('portada', .36), ease: 'power2.in' }, en('portada', .36));
  G.to(['.portada__pie', '.portada__seguir'], { autoAlpha: 0, y: 80 * M, duration: en('portada', .7) - en('portada', .35), ease: 'power2.in' }, en('portada', .35));
  G.set(capa('portada'), { autoAlpha: 0 }, en('portada', .8));
  void P0;

  entra('desafio', en('portada', .6), en('portada', .7));
  aparece('.desafio__panel', en('desafio', .06), en('desafio', .2));
  G.to('.desafio .desafio__pregunta', { scale: esMovil() ? .82 : .62, y: () => -(innerHeight * (esMovil() ? .015 : .03)) * M, duration: en('desafio', .58) - en('desafio', .42), ease: 'power2.inOut', transformOrigin: '0% 0%' }, en('desafio', .42));
  G.to('.desafio__panel', { autoAlpha: 0, y: -30 * M, duration: en('desafio', .46) - en('desafio', .38), ease: 'power2.in' }, en('desafio', .38));
  aparece('.desafio__tres', en('desafio', .5), en('desafio', .6), 30);
  aparece('.ficha-disney', en('desafio', .46), en('desafio', .62), 120);
  [.62, .72, .82].forEach((f, i) => {
    G.fromTo(`.desafio__tres .cosa[data-cosa="${i}"]`, { '--prendida': 0 }, { '--prendida': 1, duration: en('desafio', f + .06) - en('desafio', f), immediateRender: true }, en('desafio', f));
    G.fromTo(`.ficha-disney [data-cosa="${i}"]`, { autoAlpha: 0, y: 14 * M }, { autoAlpha: 1, y: 0, duration: en('desafio', f + .06) - en('desafio', f), ease: 'power2.out', immediateRender: true }, en('desafio', f));
  });
  G.fromTo('#arco-trazo path', { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: en('desafio', .92) - en('desafio', .83), ease: 'power1.inOut', immediateRender: true }, en('desafio', .83));
  sale('desafio', en('desafio', .95), en('lineup', .04));
  G.to(['.desafio .desafio__pregunta', '.desafio__tres'], { y: '-=60', duration: en('lineup', .04) - en('desafio', .93), ease: 'power2.in' }, en('desafio', .93));

  entra('lineup', en('desafio', .97), en('lineup', .05));
  aparece('.lineup__cartel', en('desafio', .98), en('lineup', .1), 90);
  aparece('.lineup__titulo', en('lineup', .02), en('lineup', .12), 30);
  G.fromTo('.lineup .nombre', { autoAlpha: 0, y: 26 * M }, { autoAlpha: 1, y: 0, duration: en('lineup', .16) - en('lineup', .04), stagger: .035, ease: 'power2.out', immediateRender: true }, en('lineup', .04));
  aparece('.ficha', en('lineup', .08), en('lineup', .17), 60);
  sale('lineup', en('lineup', .93), en('lineup', .995));
  G.to('.lineup__cartel', { y: -80 * M, duration: en('lineup', .995) - en('lineup', .92), ease: 'power2.in' }, en('lineup', .92));

  const C = TRAMOS.campana;
  const c = f => C.s + f;
  entra('campana', en('lineup', .95), c(.05));
  sube('.resumen__titulo .p__i', en('lineup', .97), c(.2));
  G.fromTo('.etapa-r', { autoAlpha: 0, y: 70 * M }, { autoAlpha: 1, y: 0, duration: .32, stagger: .1, ease: 'power2.out', immediateRender: true }, c(.12));
  G.fromTo('.etapa-r .mini-cal i.si', { scaleX: 0 }, { scaleX: 1, duration: .3, stagger: .02, ease: 'power2.out', immediateRender: true }, c(.3));
  G.fromTo('.etapa-r .mazo', { '--abre': 0 }, { '--abre': 1, duration: .28, stagger: .04, ease: 'back.out(1.6)', immediateRender: true }, c(.38));
  G.to('.resumen', { autoAlpha: 0, y: -70 * M, duration: .28, ease: 'power2.in' }, c(1.04));
  aparece('.calendario', c(1.1), c(1.36), 60);
  aparece('.telefono', c(1.12), c(1.4), 90);
  aparece('.etapa', c(1.14), c(1.38), 30);
  TIEMPOS = piezasEn().map(t => ({ ...t, a: c(t.s), b: c(t.s + t.d) }));
  for (const [k, t] of TIEMPOS.entries()) {
    const sel = [`.guion__pieza[data-pieza="${t.p.id}"]`, `.chat__pieza[data-pieza="${t.p.id}"]`];
    const entrada = k === 0 ? t.a - .12 : t.a - .05;
    G.fromTo(sel, { autoAlpha: 0, y: 26 * M }, { autoAlpha: 1, y: 0, duration: .14, stagger: .03, ease: 'power2.out', immediateRender: true }, entrada);
    if (k < TIEMPOS.length - 1) G.to(sel, { autoAlpha: 0, y: -22 * M, duration: .1, ease: 'power2.in' }, t.b - .1);
  }
  for (const e of ETAPAS) {
    const propias = TIEMPOS.filter(t => t.p.etapa === e.id);
    const a = propias[0].a, b = propias[propias.length - 1].b;
    const sel = `.etapa__item[data-etapa="${e.id}"]`;
    G.fromTo(sel, { autoAlpha: 0, y: 30 * M }, { autoAlpha: 1, y: 0, duration: .16, ease: 'power2.out', immediateRender: true }, e.id === 'previa' ? c(1.18) : a - .1);
    if (e.id !== 'repeticion') G.to(sel, { autoAlpha: 0, y: -24 * M, duration: .1, ease: 'power2.in' }, b - .12);
  }
  const fin = TIEMPOS[TIEMPOS.length - 1].b;
  G.to(['.recorre .telefono', '.recorre .guion', '.recorre .chat', '.recorre .etapa', '.calendario'], { autoAlpha: 0, y: -50 * M, duration: .24, stagger: .03, ease: 'power2.in' }, fin + .02);
  sale('campana', fin + .2, C.s + C.l - .02);

  entra('distribucion', en('distribucion', 0) - .1, en('distribucion', .04));
  sube('.distribucion .titulo .p__i', en('distribucion', -.04), en('distribucion', .16));
  G.fromTo('.canal', { autoAlpha: 0, y: 110 * M, rotation: i => (i - 1.5) * 3 * M }, { autoAlpha: 1, y: 0, rotation: 0, duration: en('distribucion', .34) - en('distribucion', .08), stagger: .07, ease: 'power3.out', immediateRender: true }, en('distribucion', .08));
  G.fromTo('.mini--collab .avatares > *', { scale: .4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .14, stagger: .05, ease: 'back.out(2)', immediateRender: true }, en('distribucion', .3));
  const mitad = PIEZAS.length / 2;
  G.fromTo('.abanico > *', { rotation: 0, x: 0 }, { rotation: i => (i - mitad) * 7, x: i => (i - mitad) * (esMovil() ? 9 : 13), duration: .3, ease: 'power2.out', immediateRender: true }, en('distribucion', .34));
  G.fromTo('.ventana i.si', { scaleY: .2, autoAlpha: .3 }, { scaleY: 1, autoAlpha: 1, duration: .16, stagger: .04, ease: 'power2.out', immediateRender: true }, en('distribucion', .36));
  G.to('.canal', { autoAlpha: 0, y: -60 * M, duration: .22, stagger: .04, ease: 'power2.in' }, en('distribucion', .86));
  sale('distribucion', en('distribucion', .94), en('inversion', .02));

  entra('inversion', en('inversion', 0) - .08, en('inversion', .04));
  aparece('.inversion .titulo', en('inversion', -.04), en('inversion', .12), 40);
  aparece('.monto', en('inversion', .02), en('inversion', .14), 50);
  G.fromTo(estadoMonto, { v: 0 }, { v: 1, duration: en('inversion', .44) - en('inversion', .06), immediateRender: true }, en('inversion', .06));
  aparece('.inversion__sub', en('inversion', .1), en('inversion', .22), 30);
  G.fromTo('.entregable', { autoAlpha: 0, x: 90 * M }, { autoAlpha: 1, x: 0, duration: .2, stagger: .055, ease: 'power3.out', immediateRender: true }, en('inversion', .14));
  G.to(['.inversion__izq', '.inversion__der'], { autoAlpha: 0, y: -60 * M, duration: .22, stagger: .05, ease: 'power2.in' }, en('inversion', .88));
  sale('inversion', en('inversion', .95), en('pasos', .02));

  entra('pasos', en('pasos', 0) - .08, en('pasos', .03));
  sube('.pasos__titulo .p__i', en('pasos', -.04), en('pasos', .16));
  aparece('.plan', en('pasos', .06), en('pasos', .16), 40);
  G.fromTo(estadoPlan, { v: 0 }, { v: 1, duration: en('pasos', .5) - en('pasos', .14), immediateRender: true }, en('pasos', .14));
  aparece('.pasos__lista', en('pasos', .5), en('pasos', .58), 30);
  G.fromTo('.pasos__lista li', { autoAlpha: 0, y: 40 * M }, { autoAlpha: 1, y: 0, duration: .14, stagger: .05, ease: 'power2.out', immediateRender: true }, en('pasos', .53));
  G.to(['.pasos__titulo', '.plan', '.pasos__lista'], { autoAlpha: 0, y: -60 * M, duration: .2, stagger: .04, ease: 'power2.in' }, en('pasos', .9));
  sale('pasos', en('pasos', .97), en('cierre', .05));

  entra('cierre', en('cierre', 0), en('cierre', .1));
  sube('.cierre__titulo .p__i', en('cierre', .05), en('cierre', .3));
  aparece('.lockup--cierre', en('cierre', .2), en('cierre', .36), 30);
  aparece('.cierre .boton', en('cierre', .28), en('cierre', .42), 30);
  aparece('.cierre__pie', en('cierre', .32), en('cierre', .46), 20);

  G.set({}, {}, TOTAL);
  GUION = G;
}

const estadoMonto = { v: 0 };
const estadoPlan = { v: 0 };

let CLAVES_FLOR = [];
function armarClavesFlor() {
  const c = f => TRAMOS.campana.s + f;
  const T = TIEMPOS;
  const k = (u, ancla, o = {}) => ({ u, ancla, rx: 0, ry: 0, rz: 0, abre: 1, fade: 0, fadeDesde: .62, sombra: 1, brillo: 0, esc: 1, puntero: 1, ...o });
  CLAVES_FLOR = [
    k(0, 'portada', { rx: -.38, fade: 1, fadeDesde: .58 }),
    k(en('portada', .42), 'portada', { rx: -.38, fade: 1, fadeDesde: .58 }),
    k(en('desafio', .16), 'desafio', { rx: .16, ry: -.62, rz: .12 }),
    k(en('desafio', .42), 'desafio', { rx: .08, ry: -.32, rz: .05 }),
    k(en('desafio', .6), 'arte', { puntero: .3, sombra: .45 }),
    k(en('desafio', .93), 'arte', { puntero: .3, sombra: .45 }),
    k(en('lineup', .1), 'lineup', { rx: -.25, ry: .3, rz: -.25, fade: .55, fadeDesde: .5, puntero: .5 }),
    k(en('lineup', .9), 'lineup', { rx: -.1, ry: -.3, rz: .35, fade: .55, fadeDesde: .5, puntero: .5 }),
    k(c(.3), 'resumen', { rx: .1, ry: -.3, rz: .2 }),
    k(c(1.02), 'resumen', { rx: .1, ry: .3, rz: -.2 }),
    k(c(1.3), 'rueda', { puntero: 0, sombra: .25 }),
    k(T[T.length - 1].b, 'rueda', { puntero: 0, sombra: .25 }),
    k(en('distribucion', .16), 'distribucion', { rx: .2, ry: -.4, rz: .15, puntero: .6 }),
    k(en('distribucion', .86), 'distribucion', { rx: .1, ry: .4, rz: -.25, puntero: .6 }),
    k(en('inversion', .14), 'inversion', { rx: -.15, ry: .45, rz: -.1 }),
    k(en('inversion', .86), 'inversion', { rx: .05, ry: -.45, rz: .2 }),
    k(en('pasos', .14), 'rueda-plan', { puntero: 0, sombra: .25 }),
    k(en('pasos', .7), 'rueda-plan', { puntero: 0, sombra: .25 }),
    k(en('pasos', .9), 'rueda-plan', { puntero: 0, sombra: .25 }),
    k(en('cierre', .3), 'cierre', { rx: -.2, ry: 0, fade: 0 }),
    k(TOTAL, 'cierre', { rx: -.2, ry: 0, fade: 0 }),
  ];
}

const DIA = ['#cba5ee', '#f4dfee'], NOCHE = ['#04082a', '#16297a'];
let tramoNoche = [0, 0, 0, 0];
function armarNoche() {
  const vivo = TIEMPOS.filter(t => t.p.etapa === 'vivo');
  const a = vivo[0].a, b = vivo[vivo.length - 1].b;
  tramoNoche = [a - .07, a + .1, b - .06, b + .14];
}
const noche = u => Math.min(tramoDe(u, tramoNoche[0], tramoNoche[1]), 1 - tramoDe(u, tramoNoche[2], tramoNoche[3]));

const mezclarColor = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
  return '#' + [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
};

let diaActual = 0;
const ANCLAS = {
  rueda() {
    const dias = DOM.dias;
    if (!dias?.length) return null;
    const d = clamp(diaActual, -0.6, 13), i = clamp(Math.floor(d), 0, 13), f = d - Math.floor(d);
    const r1 = dias[i].getBoundingClientRect(), r2 = dias[Math.min(13, i + 1)].getBoundingClientRect();
    const paso = r2.left - r1.left || r1.width;
    const cal = DOM.calendario.getBoundingClientRect();
    const h = clamp(innerHeight * (esMovil() ? .052 : .074), 34, 76);
    const x = d < 0 ? r1.left + r1.width / 2 + d * paso : r1.left + r1.width / 2 + f * paso;
    return { x, y: cal.top - h * .62, h, rz: -(x / (h * .5)) * .9 };
  },
  'rueda-plan'() {
    const linea = DOM.planLinea; if (!linea) return null;
    const r = linea.getBoundingClientRect();
    const h = clamp(innerHeight * (esMovil() ? .055 : .085), 34, 84);
    if (r.height > r.width) {
      const y = r.top + r.height * estadoPlan.v;
      return { x: r.left - h * .2, y, h, rz: -(y / (h * .5)) * .9 };
    }
    const x = r.left + r.width * estadoPlan.v;
    return { x, y: r.top + r.height / 2 - h * .66, h, rz: -(x / (h * .5)) * .9 };
  },
};
const anclas = new Map();
function ancla(nombre) {
  if (ANCLAS[nombre]) return ANCLAS[nombre]();
  let a = anclas.get(nombre);
  if (a === undefined) { a = $(`[data-ancla="${nombre}"]`); anclas.set(nombre, a); }
  if (!a) return null;
  const r = a.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, rz: 0 };
}

function estadoFlor(u) {
  let i = CLAVES_FLOR.findIndex(k => k.u > u);
  if (i === -1) i = CLAVES_FLOR.length;
  const A = CLAVES_FLOR[Math.max(0, i - 1)], B = CLAVES_FLOR[Math.min(i, CLAVES_FLOR.length - 1)];
  const t = A === B ? 0 : suave(tramoDe(u, A.u, B.u));
  const ra = ancla(A.ancla) || ancla(B.ancla), rb = ancla(B.ancla) || ra;
  if (!ra) return null;
  const mix = p => lerp(A[p], B[p], t);
  return {
    x: lerp(ra.x, rb.x, t), y: lerp(ra.y, rb.y, t), h: lerp(ra.h * A.esc, rb.h * B.esc, t),
    rx: mix('rx'), ry: mix('ry'), rz: mix('rz') + lerp(ra.rz || 0, rb.rz || 0, t) * M,
    abre: mix('abre'), fade: mix('fade'), fadeDesde: mix('fadeDesde'), sombra: mix('sombra'), puntero: mix('puntero') * M,
  };
}

const ESTADO = { capitulo: null, cosas: -1, creador: -1, pieza: -1, dia: -99, noche: false, monto: 0, hitos: -1, fase: [], suena: null, fondo: '', portadaVisible: true };
const DOM = {};

function actualizarDesafio(u) {
  const f = tramoDe(u, TRAMOS.desafio.s, TRAMOS.desafio.s + TRAMOS.desafio.l);
  const n = [.62, .72, .82].filter(x => f >= x + .03).length;
  if (n !== ESTADO.cosas) {
    if (n > ESTADO.cosas && ESTADO.cosas >= 0) sonar('cosa', n - 1);
    if (n === 3 && ESTADO.cosas === 2) setTimeout(() => sonar('flor'), 260);
    ESTADO.cosas = n;
  }
}

const fichaFotos = () => $$('.ficha__fotos img');
function actualizarLineup(u) {
  const f = tramoDe(u, en('lineup', .16), en('lineup', .9));
  const N = ORDEN_CREADORES.length;
  const i = u < en('lineup', .12) ? -1 : Math.min(N - 1, Math.floor(f * N));
  if (i === ESTADO.creador) return;
  const antes = ESTADO.creador;
  ESTADO.creador = i;
  $$('.lineup .nombre').forEach(n => n.classList.toggle('is-activo', n.dataset.c === ORDEN_CREADORES[i]));
  if (i < 0) return;
  const id = ORDEN_CREADORES[i], c = CREADORES[id];
  const dir = i > antes ? 1 : -1;
  for (const img of fichaFotos()) {
    const es = img.dataset.c === id, previa = img.dataset.c === ORDEN_CREADORES[antes];
    gsap.killTweensOf(img);
    gsap.set(img, { zIndex: es ? 2 : previa ? 1 : 0 });
    if (es) gsap.fromTo(img, { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', scale: 1.14 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: REDUCIDO ? 0 : .75, ease: 'expo.out' });
    else if (!previa) gsap.set(img, { clipPath: 'inset(100% 0% 0% 0%)' });
  }
  const nombre = $('.ficha__nombre'), dato = $('.ficha__dato b');
  gsap.fromTo([nombre, dato.parentElement], { yPercent: 60 * dir * M, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: REDUCIDO ? 0 : .45, ease: 'power3.out', stagger: .05 });
  nombre.textContent = c.nombre;
  dato.textContent = c.seguidores;
  sonar('nombre', c.fila);
}

let videoActual = -1;
const videoSuena = () => S.sonidoPrendido() && !S.sonidoBloqueado();
function reproducir(k) {
  if (k !== videoActual) {
    DOM.videos.forEach((vs, i) => vs.forEach(v => { if (i !== k && !v.paused) v.pause(); }));
    if (k >= 0) {
      DOM.videos[k].forEach(v => {
        v.preload = 'auto';
        try { v.currentTime = 0; } catch {}
        v.play().catch(() => {});
      });
    }
    DOM.videos[k + 1]?.forEach(v => { if (v.preload === 'none') v.preload = 'metadata'; });
    videoActual = k;
    ESTADO.suena = null;
  }
  const suena = videoSuena();
  if (k >= 0 && suena !== ESTADO.suena) {
    ESTADO.suena = suena;
    DOM.videos[k].forEach(v => { v.muted = !suena; });
  }
}

function actualizarCampana(u) {
  let k = -1;
  for (let i = 0; i < TIEMPOS.length; i++) if (u >= TIEMPOS[i].a - .05) k = i;
  const reels = DOM.reels;
  const cinta = DOM.cinta;
  let pos = 0;
  if (k >= 0) {
    const t = TIEMPOS[k];
    const desliz = suave(tramoDe(u, t.a - .05, t.a + .1));
    pos = k - 1 + desliz;
    if (k === 0) pos = 0;
  }
  poner(cinta, 'transform', `translate3d(0, ${(-pos * 100).toFixed(3)}%, 0)`);
  reels.forEach((r, i) => {
    const t = TIEMPOS[i];
    poner(r, '--f', tramoDe(u, t.a, t.b).toFixed(4));
  });
  if (k >= 0) {
    const t = TIEMPOS[k];
    const umbrales = CAMP.globos.map(x => t.a + x);
    const vistos = umbrales.filter(x => u >= x).length;
    const escribe = umbrales.some(x => u < x && u > x - .05);
    const clave = vistos * 2 + (escribe ? 1 : 0);
    if (ESTADO.fase[k] !== clave) {
      const subio = ((ESTADO.fase[k] ?? 0) >> 1) < vistos;
      ESTADO.fase[k] = clave;
      DOM.chats[k].querySelectorAll('.globo').forEach(g => {
        const n = +g.dataset.l;
        g.classList.toggle('is-ve', n < vistos);
        g.classList.toggle('is-ahora', n < vistos);
      });
      DOM.chats[k].querySelector('.escribe').classList.toggle('is-ve', escribe);
      if (subio && vistos > 0 && ESTADO.pieza === k) sonar('globo');
    }
  }
  if (k !== ESTADO.pieza) {
    if (ESTADO.pieza >= 0) { DOM.chats[ESTADO.pieza].querySelector('.escribe').classList.remove('is-ve'); ESTADO.fase[ESTADO.pieza] = undefined; }
    if (ESTADO.pieza >= 0 && k >= 0) sonar('reel');
    ESTADO.pieza = k;
    document.body.dataset.pieza = k >= 0 ? PIEZAS[k].id : '';
  }
  const enCampana = k >= 0 && u < TIEMPOS[TIEMPOS.length - 1].b + .2;
  reproducir(enCampana ? k : -1);
  const desde = ETAPAS[0].desde, C0 = TRAMOS.campana.s;
  let dia = -0.6;
  if (k >= 0) {
    const t = TIEMPOS[k], antes = k > 0 ? TIEMPOS[k - 1].p.dia : desde;
    dia = lerp(antes, t.p.dia, suave(tramoDe(u, t.a - .08, t.a + .14)));
  } else if (u > C0 + 1.1) {
    dia = lerp(-0.6, desde, suave(tramoDe(u, C0 + 1.12, TIEMPOS[0].a - .08)));
  }
  diaActual = dia;
  poner(DOM.calendario, '--dia', dia.toFixed(3));
  const entero = Math.floor(dia + .5);
  if (entero !== ESTADO.dia) {
    DOM.dias.forEach(d => { const n = +d.dataset.d; d.classList.toggle('is-hoy', n === entero || (dia > 6.2 && dia < 6.8 && (n === 6 || n === 7))); d.classList.toggle('is-paso', n < entero); });
    if (ESTADO.dia > -99 && entero >= 0 && u > C0 + 1.15) sonar('dia', entero);
    ESTADO.dia = entero;
  }
}

const CIFRAS = [1, 2, 0, 0, 0], VUELTAS = [0, 1, 2, 2, 3];
function actualizarMonto() {
  const v = estadoMonto.v;
  let movimiento = 0;
  DOM.rodillos.forEach((r, i) => {
    const t = clamp((v - i * .06) / (1 - .24));
    const e = 1 - (1 - t) ** 3;
    const x = (CIFRAS[i] + 10 * VUELTAS[i]) * e;
    poner(r, 'transform', `translate3d(0, ${(-(x % 10) * 10).toFixed(2)}%, 0)`);
    movimiento += Math.floor(x);
  });
  if (movimiento !== ESTADO.monto) {
    if (movimiento > ESTADO.monto && ESTADO.monto >= 0) sonar(v >= 1 ? 'caja' : 'tic', movimiento % 12);
    ESTADO.monto = movimiento;
  }
}

function actualizarPlan() {
  const v = estadoPlan.v;
  poner(DOM.plan, '--v', v.toFixed(4));
  const n = PLAN.filter((p, i) => i / (PLAN.length - 1) <= v + .004).length;
  if (n !== ESTADO.hitos) {
    $$('.hito').forEach((h, i) => h.classList.toggle('is-paso', i < n));
    if (n > ESTADO.hitos && ESTADO.hitos >= 0) sonar('dia', n * 2);
    ESTADO.hitos = n;
  }
}

function actualizarCapitulo(u) {
  let actual = null;
  for (const [nombre, t] of Object.entries(TRAMOS)) if (u >= t.s - .06) actual = nombre;
  document.body.classList.toggle('con-barra', u > en('portada', .74) && u < en('cierre', .2));
  document.body.classList.toggle('con-isla', u > en('portada', .74));
  if (actual !== ESTADO.capitulo) {
    const antes = ESTADO.capitulo;
    ESTADO.capitulo = actual;
    $('.isla__capitulo').textContent = TRAMOS[actual]?.el.dataset.capitulo || NOMBRE_CAPITULO[actual] || '';
    $$('.isla__lista a').forEach(a => a.toggleAttribute('aria-current', a.dataset.tramo === actual));
    if (antes) sonar('paso', Object.keys(TRAMOS).indexOf(actual) > Object.keys(TRAMOS).indexOf(antes) ? 1 : -1);
  }
  const t = TRAMOS[actual];
  if (t) poner(DOM.anillo, 'strokeDashoffset', (ANILLO * (1 - clamp((u - t.s) / t.l))).toFixed(2));
  ESTADO.portadaVisible = u < en('portada', .8);
}

function actualizarNoche(u) {
  const n = noche(u);
  const a = mezclarColor(DIA[0], NOCHE[0], n), b = mezclarColor(DIA[1], NOCHE[1], n);
  if (a + b !== ESTADO.fondo) {
    ESTADO.fondo = a + b;
    poner(DOM.fondo, '--fondo-a', a);
    poner(DOM.fondo, '--fondo-b', b);
    escena?.fondo(a, b);
  }
  const es = n > .5;
  if (es !== ESTADO.noche) {
    ESTADO.noche = es;
    document.body.classList.toggle('es-noche', es);
    $('meta[name="theme-color"]').content = es ? NOCHE[0] : '#cfa9ee';
    if (es) sonar('vivo');
  }
  return n;
}

let lenis = null;
const isla = $('.isla'), islaBoton = $('.isla__pildora'), islaMenu = $('.isla__menu'), islaFondo = $('.isla-fondo');
const islaAbierta = () => isla.classList.contains('is-abierta');
function abrirIsla(abrir, devolverFoco = true) {
  isla.classList.toggle('is-abierta', abrir);
  islaBoton.setAttribute('aria-expanded', String(abrir));
  islaBoton.tabIndex = abrir ? -1 : 0;
  islaMenu.inert = !abrir;
  islaMenu.setAttribute('aria-hidden', String(!abrir));
  islaFondo.hidden = !abrir;
  if (abrir) { lenis?.stop(); $('.isla__cerrar').focus({ preventScroll: true }); }
  else { lenis?.start(); if (devolverFoco) islaBoton.focus({ preventScroll: true }); }
  S.sonar(abrir ? 'pip' : 'paso', -1);
}
function armarIndice() {
  $('.isla__flor').innerHTML = svgFlor();
  const lista = $('.isla__lista');
  lista.innerHTML = [{ id: 'inicio', dataset: { tramo: 'portada', capitulo: 'Portada' } }, ...$$('.tramo[data-capitulo]'), { id: 'cierre', dataset: { tramo: 'cierre', capitulo: '¿Hablamos?' } }]
    .map(t => `<a href="#${t.id}" data-tramo="${t.dataset.tramo}">${t.dataset.capitulo}</a>`).join('');
  lista.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    abrirIsla(false, false);
    irA(a.getAttribute('href').slice(1));
  });
  islaBoton.addEventListener('click', () => abrirIsla(true));
  $('.isla__cerrar').addEventListener('click', () => abrirIsla(false));
  islaFondo.addEventListener('click', () => abrirIsla(false));
  $('.barra__marca').addEventListener('click', e => { e.preventDefault(); irA('inicio'); });
}
const NOMBRE_CAPITULO = { portada: 'Portada', cierre: '¿Hablamos?' };
const ANILLO = 62.832;
function primeraParada(n) {
  const t = TRAMOS[n];
  if (!t || n === 'portada') return 0;
  return PARADAS.find(p => p >= t.s - .001 && p < t.s + t.l) ?? t.s;
}
function saltar(u, inmediato = false) {
  S.sonar('paso', u >= (lenis ? lenis.animatedScroll : scrollY) / unidad ? 1 : -1);
  if (inmediato || !lenis) {
    paradaActual = u;
    silencioHasta = reloj() + .4;
    if (lenis) lenis.scrollTo(u * unidad, { immediate: true, force: true }); else scrollTo(0, u * unidad);
    return;
  }
  ir(u, true);
  silencioHasta = viajeHasta + .15;
}
function irA(id, inmediato = false) {
  const t = $$('.tramo').find(x => x.id === id); if (!t) return;
  saltar(primeraParada(t.dataset.tramo), inmediato);
}
const curvaPaso = t => { const r = .12, v = 1 / (r / 2 + (1 - r) / 3); return t < r ? v * t * t / (2 * r) : v * r / 2 + v * (1 - r) / 3 * (1 - ((1 - t) / (1 - r)) ** 3); };
let paradaActual = 0, viajeHasta = 0, viajeDir = 0;
function duracion(desde, hasta) {
  const d = Math.abs(hasta - desde);
  const pieza = TIEMPOS.some(t => hasta > t.a - .1 && hasta <= t.b) && d < 1.2;
  const base = pieza ? 1.25 + d * 1.1 : .95 + d * .55;
  return clamp(base * (hasta < desde ? .65 : 1), .8, 3);
}
function ir(u, rapido = false) {
  const y = u * unidad;
  paradaActual = u;
  if (lenis && !REDUCIDO) {
    const desde = lenis.animatedScroll / unidad;
    viajeDir = Math.sign(u - desde);
    const dur = rapido ? clamp(.6 + Math.abs(u - desde) * .12, .8, 2.2) : duracion(desde, u);
    viajeHasta = reloj() + dur;
    lenis.scrollTo(y, { duration: dur, easing: curvaPaso, force: true, lock: false });
  } else scrollTo(0, y);
}
let PARADAS = [];
function armarParadas() {
  const L = TRAMOS.lineup;
  PARADAS = [
    0,
    en('desafio', .33), en('desafio', .7), en('desafio', .8), en('desafio', .95),
    ...ORDEN_CREADORES.map((_, i, l) => L.s + (.16 + (i + .55) * (.74 / l.length)) * L.l),
    en('campana', .95 / TRAMOS.campana.l),
    ...TIEMPOS.map(t => t.a + CAMP.parada),
    en('distribucion', .6), en('inversion', .6), en('pasos', .51), en('pasos', .8), en('cierre', .75),
  ].sort((a, b) => a - b);
}
function paso(dir, teclado = false) {
  if (!document.body.classList.contains('listo')) { saltarIntro(); return; }
  const u = (lenis ? lenis.animatedScroll : scrollY) / unidad;
  const viajando = lenis && reloj() < viajeHasta && dir === viajeDir;
  if (viajando && !teclado && viajeHasta - reloj() > .35) return;
  const desde = viajando ? paradaActual : u;
  const sig = dir > 0 ? PARADAS.find(p => p > desde + .02) : [...PARADAS].reverse().find(p => p < desde - .02);
  if (sig !== undefined) ir(sig);
}
const nuevoGesto = (t, dir) => ({ t, dir, acum: 0, armado: true, hist: [], pico: 0, decayo: false, disparo: -1e9 });
const prom = (h, n) => { const v = h.slice(-n); return v.reduce((a, b) => a + b, 0) / v.length; };
let gesto = nuevoGesto(-1e9, 0);
function virtualScroll({ deltaX, deltaY, event: ev }) {
  if (ev.cancelable && (ev.type === 'wheel' || ev.type === 'touchmove')) ev.preventDefault();
  if (islaAbierta() || document.body.classList.contains('is-cargando')) return false;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return false;
  const ahora = performance.now(), dir = Math.sign(deltaY), dedo = ev.type.startsWith('touch'), m = Math.abs(deltaY);
  if (ev.type === 'touchstart') { gesto = nuevoGesto(ahora, 0); return false; }
  if (!dir || ev.type === 'touchend') return false;
  if (dir !== gesto.dir || (!dedo && ahora - gesto.t > 220)) gesto = nuevoGesto(ahora, dir);
  gesto.t = ahora;
  if (!dedo) {
    const h = gesto.hist; h.push(m); if (h.length > 50) h.shift();
    const ya = prom(h, 5); gesto.pico = Math.max(gesto.pico, ya);
    if (ya < gesto.pico * .55) gesto.decayo = true;
    if (!gesto.armado && gesto.decayo && h.length > 10 && ya > prom(h, 40) * 1.2 + .4 && ahora - gesto.disparo > 350) { gesto.armado = true; gesto.acum = 0; }
  }
  if (!gesto.armado) return false;
  gesto.acum += m;
  if (gesto.acum > (dedo ? 36 : 12)) { Object.assign(gesto, { armado: false, decayo: false, pico: gesto.hist.length ? prom(gesto.hist, 5) : 0, disparo: ahora }); paso(dir); }
  return false;
}
let quieto = null;
function asentar() {
  if (!lenis || reloj() < viajeHasta || islaAbierta() || window.__deck.sinParadas) return;
  const u = lenis.animatedScroll / unidad;
  const cerca = PARADAS.reduce((m, q) => (Math.abs(q - u) < Math.abs(m - u) ? q : m), PARADAS[0]);
  if (Math.abs(cerca - u) > .01) ir(cerca, true);
}
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea')) return;
  if (islaAbierta()) {
    if (e.key === 'Escape') { e.preventDefault(); abrirIsla(false); }
    if (e.key === 'Tab') {
      const controles = [...islaMenu.querySelectorAll('button, a')];
      if (e.shiftKey && document.activeElement === controles[0]) { e.preventDefault(); controles.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === controles.at(-1)) { e.preventDefault(); controles[0].focus(); }
    }
    return;
  }
  if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.key) || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); paso(1, true); }
  else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key) || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); paso(-1, true); }
  else if (e.key === 'Home') { e.preventDefault(); if (document.body.classList.contains('listo')) saltar(0); else saltarIntro(); }
  else if (e.key === 'End') { e.preventDefault(); if (document.body.classList.contains('listo')) saltar(PARADAS.at(-1)); else saltarIntro(); }
});

function pintarSonido() {
  const on = S.sonidoPrendido();
  $('.sonido').setAttribute('aria-pressed', String(on));
  document.body.classList.toggle('sin-sonido', !on);
  document.body.classList.toggle('sonido-bloqueado', S.sonidoBloqueado());
}
$('.sonido').addEventListener('click', () => { S.alternarSonido(); pintarSonido(); });
$('[data-activar-sonido]').addEventListener('click', e => {
  e.currentTarget.classList.add('is-listo');
  e.currentTarget.lastChild.textContent = 'Sonido activado';
  setTimeout(() => { S.sonar('prendido'); pintarSonido(); }, 60);
});
$('[data-correo]').addEventListener('click', () => S.sonar('enviar'));
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => setTimeout(pintarSonido, 120), { passive: true });

let escena = null, plana = null;
let intro = REDUCIDO ? 1 : 0;

function cuadro(time) {
  if (lenis) lenis.raf(time * 1000);
  const y = lenis ? lenis.scroll : scrollY;
  const u = y / unidad;
  if (GUION) GUION.time(clamp(u, 0, GUION.duration()));
  actualizarCapitulo(u);
  actualizarDesafio(u);
  actualizarLineup(u);
  actualizarCampana(u);
  actualizarMonto();
  actualizarPlan();
  const n = actualizarNoche(u);
  const f = estadoFlor(u);
  if (f) {
    const i = suave(intro);
    f.y += (1 - i) * innerHeight * .42 * M;
    f.abre *= REDUCIDO ? 1 : Math.min(1, intro * 1.08);
    f.brillo = n * .62;
    if (escena) { Object.assign(escena.estado, f); escena.render(time); }
    else if (plana) moverPlana(f);
  }
}

function moverPlana(f) {
  const w = f.h * 1.094;
  plana.style.transform = `translate3d(${f.x - w / 2}px, ${f.y - f.h / 2}px, 0) rotate(${f.rz}rad) scale(${.7 + .3 * f.abre})`;
  plana.style.width = w + 'px';
  plana.style.height = f.h + 'px';
}

async function arrancar() {
  partirTitulos();
  armarLineup();
  armarCampana();
  armarDistribucion();
  armarInversion();
  armarPasos();
  armarIndice();
  armarCaras();
  armarArco();
  DOM.cinta = $('.telefono__cinta');
  DOM.reels = $$('.reel');
  DOM.reels.forEach((r, i) => r.style.setProperty('--i', i));
  DOM.videos = DOM.reels.map(r => [...r.querySelectorAll('video')]);
  DOM.fondo = $('.fondo');
  DOM.plan = $('.plan');
  DOM.vidrios = $$('.vidrio');
  DOM.chats = $$('.chat__pieza');
  DOM.anillo = $('.isla__avance .lleno');
  DOM.calendario = $('.calendario');
  DOM.dias = $$('.calendario .dia');
  DOM.rodillos = $$('.rodillo__tira');
  DOM.planLinea = $('.plan__linea');

  const fotos = Object.values(CREADORES).map(c => c.foto);
  const tareas = [
    tarea(inyectarLogos(), .14),
    tarea(Promise.all([
      document.fonts.load('400 40px "Roboto Serif Cond"'), document.fonts.load('400 20px "Libre Franklin"'),
      document.fonts.load('800 20px "Libre Franklin"'), document.fonts.load('400 14px "DM Mono"'),
    ]), .14),
    tarea(imagenes(fotos), .32),
    tarea(import('./escena.js?v=20261124').then(m => {
      escena = m.crearEscena($('.tres'));
      if (!escena) throw new Error('sin WebGL');
    }).catch(() => {
      document.body.classList.add('sin-webgl');
      plana = $('.flor-plana');
      plana.innerHTML = svgFlor();
    }), .4),
  ];
  const t0 = performance.now();
  await new Promise(listo => {
    Promise.all(tareas).then(() => { avance = 1; });
    (function dibujarCarga() {
      const minimo = REDUCIDO ? 1 : Math.min(1, (performance.now() - t0) / 2300);
      const objetivo = Math.min(avance, minimo);
      avanceVisto += (objetivo - avanceVisto) * (REDUCIDO ? 1 : .085);
      if (objetivo >= 1 && avanceVisto > .995) avanceVisto = 1;
      dibujar(svgCarga, avanceVisto);
      $('.cargador__n').textContent = Math.round(avanceVisto * 100);
      const petalo = Math.floor(avanceVisto * 6.2);
      if (petalo > petaloSonado && petalo <= 6) { petaloSonado = petalo; if (petalo > 0) S.sonar('cinta', petalo - 1); }
      if (avanceVisto >= 1) return listo();
      requestAnimationFrame(dibujarCarga);
    })();
  });

  ajustarLineup();
  medirTramos();
  armarGuion();
  armarClavesFlor();
  armarNoche();
  armarParadas();
  if (!REDUCIDO && window.Lenis) {
    history.scrollRestoration = 'manual';
    lenis = new window.Lenis({ lerp: .1, smoothWheel: true, autoRaf: false, virtualScroll });
    lenis.on('scroll', () => { clearTimeout(quieto); quieto = setTimeout(asentar, 220); });
    lenis.stop();
  }
  gsap.ticker.add(cuadro);
  gsap.ticker.lagSmoothing(0);
  let tTam = 0;
  addEventListener('resize', () => { clearTimeout(tTam); tTam = setTimeout(rearmar, 160); });

  const destino = location.hash && location.hash !== '#inicio' && $$('.tramo').some(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : null;
  const presentada = presentar();
  if (destino) saltarIntro();
  await presentada;
  lenis?.start();
  document.body.classList.add('listo');
  if (destino) irA(destino, true);
  addEventListener('hashchange', () => irA(location.hash.slice(1)));
}

let introSalida = null, introTL = null;
function saltarIntro() {
  silencioHasta = reloj() + .3;
  introSalida?.progress(1);
  introTL?.progress(1);
}
function rearmar() {
  const u = (lenis ? lenis.animatedScroll : scrollY) / unidad;
  armarArco(); ajustarLineup(); medirTramos(); armarGuion(); armarClavesFlor(); armarNoche(); armarParadas();
  const cerca = PARADAS.reduce((m, q) => (Math.abs(q - u) < Math.abs(m - u) ? q : m), PARADAS[0]);
  const destino = reloj() < viajeHasta ? paradaActual : (Math.abs(cerca - u) < .05 ? cerca : u);
  paradaActual = destino;
  if (lenis) { lenis.resize(); lenis.scrollTo(destino * unidad, { immediate: true, force: true }); } else scrollTo(0, destino * unidad);
}
function presentar() {
  return new Promise(listo => {
    const dur = REDUCIDO ? 0 : 1;
    const salida = introSalida = gsap.timeline();
    salida.to(['.cargador__n', '.cargador__sonido'], { autoAlpha: 0, scale: .6, duration: .4 * dur, ease: 'power2.in' }, 0);
    salida.to(florCarga, { scale: .15, autoAlpha: 0, duration: .65 * dur, ease: 'back.in(1.6)' }, .05);
    salida.call(() => { cargador.style.visibility = 'hidden'; document.body.classList.remove('is-cargando'); portada(); }, [], .72 * dur);
    function portada() {
    const tl = introTL = gsap.timeline({ onComplete: listo });
    tl.to('.fondo', { opacity: 1, duration: .6 * dur }, 0);
    tl.set('.portada__arco', { autoAlpha: 1 }, 0);
    const subida = { v: 0 };
    tl.to(subida, { v: 1, duration: 2.2 * dur, ease: 'power2.out', onUpdate() { intro = subida.v; } }, .1 * dur);
    tl.call(() => sonar('flor'), [], 1 * dur);
    tl.fromTo('#arco-avance path', { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.6 * dur, ease: 'power2.inOut' }, 1.9 * dur);
    tl.call(() => sonar('arco'), [], 1.9 * dur);
    tl.fromTo('.portada__pregunta .p__i', { yPercent: 110 * M }, { yPercent: 0, duration: 1.1 * dur, ease: 'expo.out', stagger: .05 }, 3.2 * dur);
    tl.fromTo('.cara', { autoAlpha: 0, scale: .3 * (M || 1) }, { autoAlpha: 1, scale: 1, duration: .55 * dur, ease: 'back.out(2.4)', stagger: { each: .09 * dur, onStart() { sonar('globo'); } } }, 3.7 * dur);
    tl.fromTo('.cara i', { opacity: .9, scale: .9 }, { opacity: 0, scale: 1.25, duration: .7 * dur, ease: 'power2.out', stagger: .09 * dur }, 3.85 * dur);
    tl.fromTo('.portada__panel', { autoAlpha: 0, y: 40 * M, scale: .96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1 * dur, ease: 'power3.out' }, 4.3 * dur);
    tl.fromTo('.portada__seguir', { autoAlpha: 0 }, { autoAlpha: 1, duration: .6 * dur }, 5 * dur);
    }
  });
}

window.__deck = {
  get lenis() { return lenis; }, get escena() { return escena; }, TRAMOS, en, ir, paso, irA, saltar, S, rearmar,
  get u() { return (lenis ? lenis.scroll : scrollY) / unidad; }, get PARADAS() { return PARADAS; }, get TIEMPOS() { return TIEMPOS; },
};

arrancar();
