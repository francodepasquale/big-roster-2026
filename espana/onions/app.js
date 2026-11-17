// Orquesta el deck: scroll suave (Lenis), color por sección, la cebolla que gira en la portada, el pelado capa por
// capa hasta la botella, contadores de las creadoras, la cebolla que se rearma en el cierre, la isla y el teclado.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');
if (!reduced) root.classList.add('motion');
gsap.registerPlugin(ScrollTrigger, SplitText);

const COLORS = { lila: '#CDB2F4', uva: '#3A1F5C', rosa: '#F6C3DF', crema: '#FBF5FF' };
const body = document.body;
const narrow = () => innerWidth <= 760;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ── 1. Escena 3D, con plan B (imágenes de la cebolla y la botella) si no hay WebGL
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
const goTo = (target, duration = 1.4) => lenis ? lenis.scrollTo(target, { duration, easing: ease4 }) : (typeof target === 'number' ? scrollTo(0, target) : target.scrollIntoView());

// ── 3. Color de fondo por sección (el fondo vive en <body>)
function setTone(name) {
  body.dataset.tone = name;
  gsap.to(body, { backgroundColor: COLORS[name], duration: reduced ? 0 : 1.1, ease: 'power2.out', overwrite: 'auto' });
}
$$('section[data-tone]').forEach(sec => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && setTone(sec.dataset.tone),
}));

// ── 4. Portada: la cebolla va al centro y da una vuelta; el lila se vuelve rosa para entrar al pelado
if (!reduced) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true,
    onUpdate: self => scene?.set({ coverSpin: self.progress }) } });
  tl.to(['.cover__intro', '.cover .lockup', '.cover__hint'], { y: -70, autoAlpha: 0, ease: 'power2.in', duration: .3, stagger: .03 }, .05)
    .to('.cover__slot', { x: () => narrow() ? 0 : -(innerWidth * .5 - innerWidth * .03 - innerWidth * .23), y: () => narrow() ? -innerHeight * .2 : 0, scale: 1.1, ease: 'power3.inOut', duration: .5 }, 0)
    .to('.cover .bubbles', { yPercent: -40, ease: 'none', duration: 1 }, 0);

  const mixC = gsap.utils.interpolate(COLORS.lila, COLORS.rosa);
  ScrollTrigger.create({
    trigger: '.cover', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      if (!self.isActive) return;
      const mix = gsap.parseEase('sine.inOut')(gsap.utils.clamp(0, 1, (self.progress - .6) / .38));
      gsap.killTweensOf(body);
      gsap.set(body, { backgroundColor: mixC(mix) });
      body.dataset.tone = mix > .5 ? 'rosa' : 'lila';
    },
  });
}

// ── 5. Pelado: cada capa se abre y cae; debajo aparece la botella. Las frases acompañan cada capa.
if (!reduced) {
  const lines = $$('.peel__h .l');
  gsap.set(lines, { autoAlpha: 0, y: 40 });
  const pt = gsap.timeline({ scrollTrigger: { trigger: '.peel', start: 'top top', end: 'bottom bottom', scrub: 1,
    onUpdate: self => scene?.set({ peel: gsap.utils.clamp(0, 1, (self.progress - .06) / .8) }) } });
  pt.to(lines[0], { autoAlpha: 1, y: 0, duration: .1, ease: 'power3.out' }, .06)
    .to(lines[0], { autoAlpha: 0, y: -40, duration: .08, ease: 'power2.in' }, .3)
    .to(lines[1], { autoAlpha: 1, y: 0, duration: .1, ease: 'power3.out' }, .4)
    .to(lines[1], { autoAlpha: 0, y: -40, duration: .08, ease: 'power2.in' }, .56)
    .to(lines[2], { autoAlpha: 1, y: 0, duration: .1, ease: 'power3.out' }, .62)
    .to({}, { duration: .28 }, .72);
}

// ── 5b. Transición: la cebolla cortada en anillos se abre desde el centro, del más grande al último (lila),
// que llena la pantalla y ya es el fondo de la primera creadora
if (!reduced) {
  const rings = $$('.rings__set i');
  gsap.set(rings, { scale: 0 });
  const rt = gsap.timeline({ scrollTrigger: { trigger: '.rings', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  rings.forEach((r, i) => rt.to(r, { scale: 1, ease: 'power2.in', duration: .5 }, .05 + i * .07));
  rt.fromTo('.rings__h', { scale: .4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'back.out(1.6)', duration: .25 }, .3)
    .to('.rings__h', { scale: 1.6, autoAlpha: 0, ease: 'power2.in', duration: .2 }, .78);
}

// ── 6. Contadores: cada cifra sube desde 0 hasta su valor real (el que está escrito en el HTML)
function readNum(el) {
  const m = el.textContent.trim().match(/^(\+?)([\d.,]+)(\s*)(mil|[KM%]?)$/);
  if (!m) return null;
  const raw = m[2];
  return { el, pre: m[1], sep: m[3], unit: m[4], dec: (raw.split(',')[1] || '').length, val: parseFloat(raw.replace(/\./g, '').replace(',', '.')), o: { v: 0 } };
}
// Formato español: punto de miles y coma decimal
const fmt = n => { const [i, d] = n.o.v.toFixed(n.dec).split('.'); return n.pre + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '') + n.sep + n.unit; };
const pop = el => gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: .9, ease: 'elastic.out(1, .4)', transformOrigin: '0% 100%' });
function countUp(n, delay, duration = 2) {
  return gsap.to(n.o, { v: n.val, duration, delay, ease: 'power2.out', onUpdate: () => { n.el.textContent = fmt(n); }, onComplete: () => { n.el.textContent = fmt(n); pop(n.el); } });
}
const nums = root => [...root.querySelectorAll('[data-count]')].map(readNum).filter(Boolean);

if (!reduced) {
  $$('.pf').forEach(pf => {
    const ns = nums(pf); ns.forEach(n => { n.el.textContent = fmt(n); });
    // La foto entra destapándose de abajo arriba, con un rebote suave
    const ph = pf.querySelector('.pf__photo img');
    gsap.set(ph, { clipPath: 'inset(100% 0% 0% 0% round 40px)' });
    ScrollTrigger.create({ trigger: pf, start: 'top 65%', once: true, onEnter: () => {
      gsap.to(ph, { clipPath: 'inset(0% 0% 0% 0% round 40px)', duration: 1.5, ease: 'expo.out' });
      gsap.fromTo(ph, { scale: 1.15 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
      gsap.from(pf.querySelectorAll('.net'), { y: 40, autoAlpha: 0, duration: 1.1, stagger: .1, delay: .2, ease: 'back.out(1.6)' });
      ns.forEach((n, j) => countUp(n, .35 + j * .08, 1.8));
    } });
  });
}

// ── 7. Títulos por líneas y entradas
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
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.3, stagger: .1, ease: 'back.out(1.4)', overwrite: true }),
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    const late = $$('[data-reveal]').filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });

  // ── 8. Cierre: la cebolla vuelve a armarse capa a capa y aparece la pregunta
  gsap.set('.cierre__copy > *', { autoAlpha: 0, y: 40 });
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.cierre', start: 'top bottom', end: 'bottom bottom', scrub: 1,
    onUpdate: self => scene?.set({ close: gsap.utils.clamp(0, 1, (self.progress - .1) / .55) }) } });
  ct.to({}, { duration: .6 })
    .to('.cierre__copy > *', { autoAlpha: 1, y: 0, stagger: .08, duration: .2, ease: 'power3.out' }, .6)
    .to({}, { duration: .15 });
}

// ── 9. Isla: índice vivo, y la mascota arriba a la izquierda fuera de la portada
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
ScrollTrigger.create({ trigger: '#pelado', start: 'top 90%', onEnter: () => { island.classList.add('is-visible'); brand.classList.add('is-visible'); }, onLeaveBack: () => { island.classList.remove('is-visible'); brand.classList.remove('is-visible'); } });
if (reduced) { island.classList.add('is-visible'); brand.classList.add('is-visible'); }

// Teclado para presentar en sala: ← → / AvPág RePág, con paradas dentro del pelado y del cierre
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  e.preventDefault();
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
  const top = el => el.getBoundingClientRect().top + scrollY;
  const stops = [0];
  const along = (sel, fr) => { const s = $(sel); fr.forEach(f => stops.push(top(s) + (s.offsetHeight - innerHeight) * f)); };
  chapters.slice(1).forEach(s => stops.push(top(s)));
  if (!reduced) {
    along('.cover', [.8]); along('.peel', [.2, .45, .95]); along('.rings', [.5]); along('.cierre', [1]);
  }
  stops.sort((a, b) => a - b);
  const y = scrollY;
  const next = fwd ? stops.find(s => s > y + 10) : [...stops].reverse().find(s => s < y - 10);
  if (next === undefined) return;
  lenis ? lenis.scrollTo(next, { duration: 1.3, easing: ease4 }) : scrollTo(0, next);
});

// ── 10. Arranque cuando el loader llega al 100 %
document.addEventListener('deck:ready', () => {
  lenis?.start();
  introTitles();
  ScrollTrigger.refresh();
}, { once: true });
