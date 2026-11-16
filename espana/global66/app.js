// Orquesta el deck: scroll suave (Lenis), color por sección, la moneda en la portada, el globo que sale de Chile,
// los recortes de prensa que giran, contadores y barras de los perfiles, el vuelo entre nubes, el sobre que se abre,
// la isla y el teclado.
import { createScene, DESTINOS, ARC_STAGGER, ARC_LEN } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');
if (!reduced) root.classList.add('motion');
gsap.registerPlugin(ScrollTrigger, SplitText);

const COLORS = { cielo: '#DCE6FF', noche: '#0A1033', papel: '#EEEAE2', azul: '#0D3AD3', blanco: '#FFFFFF', lavanda: '#B7BFEC' };
const body = document.body;
const narrow = () => innerWidth <= 760;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ── 1. Escena 3D, con plan B (imágenes de la moneda y del globo) si no hay WebGL
let scene = null;
function noWebGL(err) {
  if (err) console.warn('Sin escena 3D: se muestran las imágenes de respaldo.', err);
  scene = null;
  root.classList.remove('has-webgl'); root.classList.add('no-webgl');
}
try {
  scene = createScene($('#stage'), { reduced });
  root.classList.add('has-webgl');
  window.deckLoading?.track('escena', scene.ready.catch(noWebGL));
  window.deckScene = scene;
} catch (err) {
  noWebGL(err);
  window.deckLoading?.track('escena', Promise.resolve());
}

// ── 2. Scroll suave
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .075, wheelMultiplier: .9, touchMultiplier: 1.2, smoothWheel: true });
  lenis.on('scroll', e => { ScrollTrigger.update(); scene?.set({ vel: e.velocity }); });
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const ease4 = t => 1 - Math.pow(1 - t, 4);
const goTo = (target, duration = 1.4) => lenis ? lenis.scrollTo(target, { duration, easing: ease4 }) : target.scrollIntoView();

// ── 3. Color de fondo por sección (el fondo vive en <body>)
function setTone(name) {
  body.dataset.tone = name;
  gsap.to(body, { backgroundColor: COLORS[name], duration: reduced ? 0 : 1.1, ease: 'power2.out', overwrite: 'auto' });
}
$$('section[data-tone]').forEach(sec => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && setTone(sec.dataset.tone),
}));

// ── 4. Portada: la moneda va al centro y da vueltas; el cielo se hace de noche para entrar al globo
if (!reduced) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true,
    onUpdate: self => scene?.set({ coverSpin: self.progress }) } });
  tl.to(['.cover__intro', '.cover .lockup', '.cover__hint'], { y: -70, autoAlpha: 0, ease: 'power2.in', duration: .3, stagger: .03 }, .05)
    .to('.cover__slot', { x: () => narrow() ? 0 : -(innerWidth * .5 - innerWidth * .04 - innerWidth * .22), y: () => narrow() ? -innerHeight * .2 : 0, scale: 1.12, ease: 'power3.inOut', duration: .5 }, 0)
    .to('.clouds--cover .cl1', { xPercent: -40, yPercent: -30, scale: 1.6, ease: 'power1.in', duration: 1 }, 0)
    .to('.clouds--cover .cl2', { xPercent: 40, yPercent: -40, scale: 1.7, ease: 'power1.in', duration: 1 }, 0)
    .to('.clouds--cover .cl3', { yPercent: -70, scale: 2, ease: 'power1.in', duration: 1 }, 0)
    .to('.clouds--cover .cl4', { xPercent: 30, yPercent: -40, autoAlpha: 0, ease: 'power1.in', duration: .6 }, 0);

  const mixC = gsap.utils.interpolate(COLORS.cielo, COLORS.noche);
  ScrollTrigger.create({
    trigger: '.cover', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      if (!self.isActive) return;
      const mix = gsap.parseEase('sine.inOut')(gsap.utils.clamp(0, 1, (self.progress - .55) / .4));
      gsap.killTweensOf(body);
      gsap.set(body, { backgroundColor: mixC(mix) });
      body.dataset.tone = mix > .5 ? 'noche' : 'cielo';
    },
  });
}

// ── 5. Audiencias: las líneas salen (de Santiago) y cada país se enciende cuando llega la suya
const countryEls = $$('.chile__list li');
const arcEnd = name => { const i = DESTINOS.findIndex(d => d[0] === name); return i < 0 ? 0 : i * ARC_STAGGER + ARC_LEN; };
const ARC_TOTAL = (DESTINOS.length - 1) * ARC_STAGGER + ARC_LEN;
if (!reduced) {
  gsap.set(countryEls, { autoAlpha: 0, y: 16 });
  const lit = new Set();
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.chile', start: 'top top', end: 'bottom bottom', scrub: 1,
    onUpdate: self => {
      const p = self.progress;
      const arcs = gsap.utils.clamp(0, 1, (p - .12) / .72) * ARC_TOTAL;
      scene?.set({ globeP: p, arcs });
      countryEls.forEach(li => {
        const on = arcs >= arcEnd(li.textContent) * .98 && p > .1;
        if (on !== lit.has(li)) { on ? lit.add(li) : lit.delete(li); gsap.to(li, { autoAlpha: on ? 1 : 0, y: on ? 0 : 16, duration: .7, ease: 'expo.out', overwrite: true }); }
      });
    } } });
  ct.fromTo('.chile__h', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: .1, ease: 'power3.out' }, 0)
    .to({}, { duration: .9 }, .1);
}

// ── 6. Prensa (transición): páginas reales del reel de Global66 que entran y salen con zoom in / zoom out,
// alguna de un latigazo. Corto: no frena el recorrido.
if (!reduced) {
  const pages = $$('.page');
  pages.forEach((p, i) => gsap.set(p, { zIndex: i + 1, autoAlpha: 0 }));
  const pt = gsap.timeline({ scrollTrigger: { trigger: '.prensa', start: 'top 60%', end: 'bottom bottom', scrub: .8 } });
  const STEP = .7;
  pages.forEach((p, i) => {
    const at = i * STEP, zin = i % 2 === 0, last = i === pages.length - 1;
    const rot = [-4, 3, -2, 4, 0][i];
    // entrada: desde lejos (zoom in) o desde muy cerca (zoom out); la cuarta, de un latigazo lateral
    const from = i === 3 ? { x: () => innerWidth, skewX: -14, scale: 1.05, rotation: rot + 10, filter: 'blur(16px)', autoAlpha: 1 }
      : zin ? { scale: .2, rotation: rot - 14, filter: 'blur(8px)', autoAlpha: 0 } : { scale: 3, rotation: rot + 10, filter: 'blur(18px)', autoAlpha: 0 };
    pt.fromTo(p, from, { x: 0, skewX: 0, scale: 1, rotation: rot, filter: 'blur(0px)', autoAlpha: 1, ease: 'expo.out', duration: .4 }, at);
    // salida: la siguiente ya está entrando
    pt.to(p, last
      ? { scale: 4.5, filter: 'blur(14px)', autoAlpha: 0, ease: 'power2.in', duration: .55 }
      : zin ? { scale: 3.2, filter: 'blur(16px)', autoAlpha: 0, ease: 'power2.in', duration: .4 } : { scale: .25, rotation: rot - 20, filter: 'blur(6px)', autoAlpha: 0, ease: 'power2.in', duration: .4 }, at + .55);
  });
}

// ── 7. Contadores: cada cifra sube desde 0 hasta su valor real (el que está escrito en el HTML)
function readNum(el) {
  const m = el.textContent.trim().match(/^([+≈]?)([\d.,]+)(\s*)(mil|[KM%]?)$/);
  const raw = m[2];
  return { el, pre: m[1], sep: m[3], unit: m[4], dec: (raw.split(',')[1] || '').length, val: parseFloat(raw.replace(/\./g, '').replace(',', '.')), o: { v: 0 } };
}
// Formato español: punto de miles (también en 2.062) y coma decimal
const fmt = n => { const [i, d] = n.o.v.toFixed(n.dec).split('.'); return n.pre + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '') + n.sep + n.unit; };
const pop = el => gsap.fromTo(el, { scale: 1.08 }, { scale: 1, duration: .9, ease: 'elastic.out(1, .45)', transformOrigin: '0% 100%' });
function countUp(n, delay, duration = 2) {
  return gsap.to(n.o, { v: n.val, duration, delay, ease: 'power2.out', onUpdate: () => { n.el.textContent = fmt(n); }, onComplete: () => { n.el.textContent = fmt(n); pop(n.el); } });
}
const nums = root => [...root.querySelectorAll('[data-count]')].map(readNum);

if (!reduced) {
  const kitNums = nums($('.kit'));
  kitNums.forEach(n => { n.el.textContent = fmt(n); });
  ScrollTrigger.create({ trigger: '.kit', start: 'top 55%', once: true, onEnter: () => kitNums.forEach((n, i) => countUp(n, .3 + i * .25, 2.2)) });

  $$('.pf').forEach(pf => {
    const ns = nums(pf); ns.forEach(n => { n.el.textContent = fmt(n); });
    const lead = ns.filter(n => n.el.closest('.pf__lead'));
    const aud = ns.filter(n => n.el.closest('.aud'));
    const grow = pf.querySelectorAll('.bars i');
    if (grow.length) gsap.set(grow, { scaleX: 0 });
    // La foto entra destapándose de abajo arriba
    const ph = pf.querySelector('.pf__photo img');
    gsap.set(ph, { clipPath: 'inset(100% 0% 0% 0% round 28px)' });
    ScrollTrigger.create({ trigger: pf, start: 'top 65%', once: true, onEnter: () => {
      gsap.to(ph, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.out' });
      gsap.fromTo(ph, { scale: 1.15 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
    } });
    ScrollTrigger.create({ trigger: pf, start: 'top 60%', once: true, onEnter: () => lead.forEach((n, j) => countUp(n, .2 + j * .07, 1.8)) });
    const audEl = pf.querySelector('.aud');
    if (audEl) ScrollTrigger.create({ trigger: audEl, start: 'top 85%', once: true, onEnter: () => {
      aud.forEach((n, j) => countUp(n, .2 + j * .1, 1.6));
      gsap.from(audEl.querySelectorAll('.aud__col'), { y: 40, autoAlpha: 0, duration: 1.2, stagger: .1, ease: 'expo.out' });
      gsap.to(audEl.querySelectorAll('.bars i'), { scaleX: 1, duration: 1.4, delay: .3, stagger: .035, ease: 'expo.out' });
    } });
  });
}
$('.kit__more').addEventListener('click', e => { e.preventDefault(); goTo($('#fran'), 1.6); });

// ── 8. Títulos por líneas y entradas
function introTitles() {
  if (reduced) return;
  $$('[data-split]').forEach(el => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 110, duration: 1.2, stagger: .1, ease: 'expo.out',
        scrollTrigger: el.closest('.cover') ? undefined : { trigger: el, start: 'top 85%' },
      }),
    });
  });
}
if (!reduced) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.4, stagger: .1, ease: 'power3.out', overwrite: true }),
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    const late = $$('[data-reveal]').filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });

  // ── 9. Nubes: se vuela a través de ellas hasta la frase de Global66 (de su propio reel)
  const fly = $$('.cf');
  const seeds = [[-.9, -.5, 1], [.9, -.4, 1.2], [-.6, .6, .9], [.7, .6, 1.1], [0, -.9, 1.3], [0, .2, .8]];
  const nt = gsap.timeline({ scrollTrigger: { trigger: '.nubes', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  fly.forEach((c, i) => {
    const [x, y, s] = seeds[i];
    nt.fromTo(c, { xPercent: x * 20, yPercent: y * 20, scale: .35 * s, autoAlpha: 0 },
      { xPercent: x * 160, yPercent: y * 150, scale: 3.4 * s, autoAlpha: 1, ease: 'power2.in', duration: .7 }, .05 + i * .05);
    nt.to(c, { autoAlpha: 0, duration: .12, ease: 'none' }, .66 + i * .05);
  });
  nt.fromTo('.nubes__title .l', { autoAlpha: 0, y: 70, scale: .9 }, { autoAlpha: 1, y: 0, scale: 1, ease: 'expo.out', duration: .2, stagger: .08 }, .55)
    .to({}, { duration: .15 });

  // ── 10. El sobre: el sello se parte, la solapa se abre y sale la carta
  const et = gsap.timeline({ scrollTrigger: { trigger: '.cierre', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  et.fromTo('.env', { y: '-4vh', rotation: -2, scale: .94 }, { y: '12vh', rotation: 0, scale: 1, ease: 'power2.out', duration: .18 }, 0)
    .to('.seal__half--l', { xPercent: -60, yPercent: 40, rotation: -35, autoAlpha: 0, ease: 'power2.in', duration: .14 }, .1)
    .to('.seal__half--r', { xPercent: 60, yPercent: 50, rotation: 30, autoAlpha: 0, ease: 'power2.in', duration: .14 }, .1)
    .fromTo('.env__flap', { rotationX: 0 }, { rotationX: 180, ease: 'power2.inOut', duration: .2 }, .2)
    .set('.env__flap', { zIndex: 0 }, .31)
    .set('.env__back', { zIndex: 0 }, .31)
    .fromTo('.env__letter', { yPercent: 0, zIndex: 1 }, { yPercent: -62, ease: 'power2.out', duration: .2 }, .38)
    .set('.env__letter', { zIndex: 4 }, .58)
    .to('.env__letter', { yPercent: -4, scale: 1.12, ease: 'power3.inOut', duration: .2 }, .6)
    .to(['.env__front', '.env__flap', '.env__back'], { y: '30vh', autoAlpha: 0, ease: 'power2.in', duration: .16 }, .64)
    .to({}, { duration: .12 });
}

// ── 11. Isla: índice vivo, y la marca de Global66 arriba a la izquierda fuera de la portada
const island = $('.island');
const list = $('#island-list');
const toggle = island.querySelector('.island__toggle');
const current = island.querySelector('.island__current');
const chapters = $$('[data-chapter]');
chapters.forEach(sec => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="#${sec.id}">${sec.dataset.chapter}</a>`;
  list.append(li);
});
const links = [...list.querySelectorAll('a')];
const setOpen = open => { island.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); };
toggle.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!island.contains(e.target)) setOpen(false); });
links.forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); setOpen(false);
  goTo($(a.getAttribute('href')));
}));
$('.brand').addEventListener('click', e => { e.preventDefault(); goTo(0, 1.8); });
chapters.forEach((sec, i) => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => {
    if (!self.isActive) return;
    current.textContent = sec.dataset.chapter;
    links.forEach((a, j) => a.setAttribute('aria-current', i === j));
  },
}));
const brand = $('.brand');
ScrollTrigger.create({ trigger: '#chile', start: 'top 90%', onEnter: () => { island.classList.add('is-visible'); brand.classList.add('is-visible'); }, onLeaveBack: () => { island.classList.remove('is-visible'); brand.classList.remove('is-visible'); } });
if (reduced) { island.classList.add('is-visible'); brand.classList.add('is-visible'); }

// Teclado para presentar en sala: ← → / AvPág RePág. En las secciones con recorrido (portada, globo, prensa,
// nubes, sobre) hay paradas intermedias para ver cada momento.
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  e.preventDefault();
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
  const top = el => el.getBoundingClientRect().top + scrollY;
  const stops = [0];
  const along = (sel, fr) => { const s = $(sel); fr.forEach(f => stops.push(top(s) + (s.offsetHeight - innerHeight) * f)); };
  chapters.slice(1).forEach(s => stops.push(top(s)));
  stops.push(top($('.prop')));
  if (!reduced) {
    along('.cover', [.75]); along('.chile', [.95]); along('.nubes', [1]); along('.cierre', [.35, 1]);
  }
  stops.sort((a, b) => a - b);
  const y = scrollY;
  const next = fwd ? stops.find(s => s > y + 10) : [...stops].reverse().find(s => s < y - 10);
  if (next === undefined) return;
  lenis ? lenis.scrollTo(next, { duration: 1.3, easing: ease4 }) : scrollTo(0, next);
});

// ── 12. Arranque cuando el loader llega al 100 %
document.addEventListener('deck:ready', () => {
  lenis?.start();
  introTitles();
  ScrollTrigger.refresh();
}, { once: true });
