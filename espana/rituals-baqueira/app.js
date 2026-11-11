// Orquesta el deck: scroll suave (Lenis), color de fondo por sección, el gesto de la portada
// (abrir la caja de regalo), el tren de la nieve, el mediakit con sus contadores y barras, la isla y el teclado.
import { createScene } from './scene.js';
import { buildTrain, spin } from './train.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');
if (!reduced) root.classList.add('motion');
gsap.registerPlugin(ScrollTrigger, SplitText);

const COLORS = { arena: '#EFE7DC', tinta: '#1D1C1A', granate: '#7E1426', abeto: '#1E4334', rosa: '#F2DCD5' };
const DARK = { arena: 0, tinta: 1, granate: 1, abeto: 1, rosa: 0 };
const body = document.body;
const narrow = () => innerWidth <= 760;

// ── 1. Escena 3D, con plan B (imagen de la caja) si no hay WebGL o falla la carga
let scene = null;
function noWebGL(err) {
  if (err) console.warn('Sin escena 3D: se muestra la imagen de la caja.', err);
  scene = null;
  root.classList.remove('has-webgl'); root.classList.add('no-webgl');
}
try {
  scene = createScene(document.getElementById('stage'), { reduced });
  root.classList.add('has-webgl');
  window.deckLoading?.track('escena', scene.ready.catch(noWebGL));
  window.deckScene = scene;
} catch (err) {
  noWebGL(err);
  window.deckLoading?.track('escena', Promise.resolve());
}

// ── 2. Scroll suave (con movimiento reducido, scroll nativo)
let lenis = null;
if (!reduced) {
  // Un poco más de inercia que el valor por defecto: el recorrido se siente continuo, sin tirones
  lenis = new Lenis({ lerp: .07, wheelMultiplier: .9, touchMultiplier: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const goTo = (target, duration = 1.4) => lenis ? lenis.scrollTo(target, { duration, easing: t => 1 - Math.pow(1 - t, 4) }) : target.scrollIntoView();

// ── 3. Color de fondo por sección: el fondo vive en <body> y la escena recoge si es claro u oscuro
function setTone(name) {
  body.dataset.tone = name;
  gsap.to(body, { backgroundColor: COLORS[name], duration: reduced ? 0 : 1.2, ease: 'power2.out', overwrite: 'auto' });
  scene?.set({ dark: DARK[name] });
}
document.querySelectorAll('section[data-tone]').forEach(sec => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && setTone(sec.dataset.tone),
}));

// ── 4. Portada: el gesto
const coverOpen = { v: 0 };
const pushCover = () => scene?.set({ coverOpen: coverOpen.v });
if (reduced) {
  coverOpen.v = 1; pushCover();
  ScrollTrigger.create({ trigger: '.cover', start: 'top 55%', end: 'bottom 55%', onToggle: s => s.isActive && setTone('arena') });
} else {
  // La caja entra desde la derecha al centro; el título se va; después llegan las dos frases.
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true } });
  tl.to(['.cover__intro', '.cover .lockup'], { y: -60, autoAlpha: 0, ease: 'power2.in', duration: .26 }, .04)
    .fromTo('.cover__slot', { x: () => narrow() ? 0 : innerWidth * .25 }, { x: 0, ease: 'power3.inOut', duration: .36 }, 0)
    .fromTo('.cover__after .l', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: .16, stagger: .07 }, .64)
    .to({}, { duration: .14 });

  // Al cruzar el punto, la tapa se abre (es un gesto: no se arrastra con el scroll) y el fondo pasa a verde abeto
  let popped = 0;
  const mixC = gsap.utils.interpolate(COLORS.arena, COLORS.abeto);
  ScrollTrigger.create({
    trigger: '.cover', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      if (!self.isActive) return; // al saltar fuera de la portada, manda el color de la sección nueva
      const p = self.progress;
      const want = p > .4 ? 1 : 0;
      if (want !== popped) {
        popped = want;
        gsap.to(coverOpen, { v: want, duration: want ? 2 : 1, ease: want ? 'power3.out' : 'power2.inOut', overwrite: true, onUpdate: pushCover });
      }
      const mix = gsap.parseEase('sine.inOut')(gsap.utils.clamp(0, 1, (p - .42) / .34));
      gsap.killTweensOf(body);
      gsap.set(body, { backgroundColor: mixC(mix) });
      body.dataset.tone = mix > .5 ? 'abeto' : 'arena';
      scene?.set({ dark: mix });
    },
  });
}

// ── 5. El tren de la nieve
const cargo = [...document.querySelectorAll('[data-train="carga"]')].map(el => ({ ...buildTrain(el, 'carga'), x: 0, d: 0, speed: 0, w: 0, on: false, zone: el.closest('section') }));
const measureTrains = () => cargo.forEach(tr => { tr.w = tr.el.getBoundingClientRect().width; });
measureTrains(); addEventListener('resize', () => { measureTrains(); crew.w = 0; });
document.addEventListener('deck:ready', measureTrains, { once: true });
const io = new IntersectionObserver(es => es.forEach(e => cargo.forEach(tr => { if (tr.zone === e.target) tr.on = e.isIntersecting; })));
cargo.forEach(tr => io.observe(tr.zone));
const crew = buildTrain(document.querySelector('[data-train="largo"]'), 'largo');

// Los trenes de carga cruzan solos de derecha a izquierda; el scroll los acelera
cargo.forEach((tr, i) => { tr.x = innerWidth * (i ? .15 : .55); });
if (reduced) cargo.forEach(tr => { tr.el.style.transform = `translate3d(${(innerWidth * .08).toFixed(0)}px,0,0)`; });
else gsap.ticker.add((_, dtMs) => {
  const dt = Math.min(dtMs / 1000, .05);
  const boost = Math.min(Math.abs(lenis?.velocity || 0) * 22, 900);
  cargo.forEach(tr => {
    if (!tr.on) return;
    const base = narrow() ? 46 : 78;
    tr.speed += (base + boost - tr.speed) * (1 - Math.exp(-dt / .35));   // la velocidad sigue al scroll con suavidad
    tr.x -= tr.speed * dt; tr.d += tr.speed * dt;
    if (tr.x < -tr.w - 40) tr.x = innerWidth + 40;
    tr.el.style.transform = `translate3d(${tr.x.toFixed(1)}px,0,0)`;
    spin(tr, tr.d);
  });
});

// El tren largo cruza el mediakit con el scroll
if (!reduced) {
  const crewX = { v: 0 };
  ScrollTrigger.create({
    trigger: '.kit', start: 'top bottom', end: 'bottom top', scrub: 1,
    onUpdate: self => {
      const w = crew.w || (crew.w = crew.el.getBoundingClientRect().width);
      const from = innerWidth, to = -w;
      crewX.v = gsap.utils.interpolate(from, to, self.progress);
      crew.el.style.transform = `translate3d(${crewX.v.toFixed(1)}px,0,0)`;
      spin(crew, from - crewX.v);
    },
  });
}
document.querySelector('.kit__more').addEventListener('click', e => { e.preventDefault(); goTo(document.querySelector('#creadores'), 1.6); });

// ── 6. Títulos por líneas y entradas
function introTitles() {
  if (reduced) return;
  document.querySelectorAll('[data-split]').forEach(el => {
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
    const late = [...document.querySelectorAll('[data-reveal]')].filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });

  // El viaje: se entra atravesando nubes; al abrirse aparece el telesilla a pantalla completa
  const vt = gsap.timeline({ scrollTrigger: { trigger: '.viaje', start: 'top 70%', end: 'bottom bottom', scrub: 1.1 } });
  const out = { ease: 'power2.in', duration: .34 };
  vt.fromTo('.viaje__photo img', { scale: 1.25 }, { scale: 1, ease: 'power2.out', duration: 1 }, 0)
    .to('.c1', { ...out, xPercent: -70, yPercent: -40, scale: 1.5, autoAlpha: 0 }, .02)
    .to('.c2', { ...out, xPercent: 70, yPercent: -45, scale: 1.5, autoAlpha: 0 }, .02)
    .to('.c3', { ...out, xPercent: -80, yPercent: 10, scale: 1.6, autoAlpha: 0 }, .05)
    .to('.c4', { ...out, xPercent: 80, yPercent: 10, scale: 1.6, autoAlpha: 0 }, .05)
    .to('.c5', { ...out, yPercent: -90, scale: 1.8, autoAlpha: 0 }, .08)
    .to('.c6', { ...out, yPercent: 80, scale: 1.7, autoAlpha: 0 }, .08)
    .fromTo('.viaje__title .t1', { xPercent: -40, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: .3 }, .36)
    .fromTo('.viaje__title .t2', { xPercent: 40, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: .3 }, .44)
    .fromTo('.viaje__band', { yPercent: 100 }, { yPercent: 0, ease: 'expo.out', duration: .3 }, .52)
    .fromTo('.viaje__band p', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'expo.out', duration: .26, stagger: .06 }, .58)
    .to({}, { duration: .34 })
    // La franja granate sube y cubre la pantalla: es el fondo de la sección siguiente
    .to(['.viaje__band p', '.viaje__title'], { autoAlpha: 0, y: -40, ease: 'power2.in', duration: .14 }, 1.24)
    .fromTo('.viaje__wipe', { scaleY: 0 }, { scaleY: 1, ease: 'power3.inOut', duration: .34 }, 1.24);

  // La foto de la propuesta se acerca despacio mientras pasa
  gsap.fromTo('.ritual__photo img', { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.ritual__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
}

// ── 7. Contadores: cada cifra sube desde 0 hasta su valor real (el que está escrito en el HTML)
function readNum(el) {
  const m = el.textContent.trim().match(/^(\+?)([\d.,]+)(\s*)([KM%]?)$/);
  const raw = m[2];
  return { el, pre: m[1], sep: m[3], unit: m[4], dec: (raw.split(',')[1] || '').length, val: parseFloat(raw.replace(/\./g, '').replace(',', '.')), o: { v: 0 } };
}
const fmt = n => n.pre + n.o.v.toLocaleString('es-ES', { minimumFractionDigits: n.dec, maximumFractionDigits: n.dec }) + n.sep + n.unit;
const pop = el => gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: .9, ease: 'elastic.out(1, .45)', transformOrigin: '0% 100%' });
function countUp(n, delay, onUpdate, duration = 2) {
  return gsap.to(n.o, { v: n.val, duration, delay, ease: 'power2.out', onUpdate: () => { n.el.textContent = fmt(n); onUpdate?.(); }, onComplete: () => { n.el.textContent = fmt(n); pop(n.el); } });
}
const nums = sel => [...document.querySelectorAll(sel)].map(readNum);

// Edición anterior: los tres reels cuentan y el total se va sumando con ellos hasta +3,3 M
const total = document.querySelector('.anterior__total');
const reelNums = nums('.reel [data-count]');
const paintTotal = () => {
  const sum = reelNums.reduce((a, n) => a + n.o.v * (n.unit === 'K' ? .001 : 1), 0);
  total.textContent = '+' + sum.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
};
const sumNums = nums('.kit__sum [data-count]');
const cardNums = nums('.card [data-count]');
if (!reduced) {
  reelNums.forEach(n => { n.el.textContent = fmt(n); });
  paintTotal();
  gsap.set('.reel__img', { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set('.reel__top', { autoAlpha: 0 });
  ScrollTrigger.create({ trigger: '.anterior', start: 'top 45%', once: true, onEnter: () => {
    reelNums.forEach((n, i) => countUp(n, .3 + i * .5, paintTotal));
    gsap.utils.toArray('.reel__img').forEach((el, i) => gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, delay: .3 + i * .5, ease: 'power2.out' }));
    gsap.fromTo('.reel__top', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .8, stagger: .5, delay: .3, ease: 'expo.out' });
    gsap.delayedCall(.3 + 2 * .5 + 2, () => pop(total));
  } });

  // Mediakit: las sumas cuentan al llegar
  sumNums.forEach(n => { n.el.textContent = fmt(n); });
  ScrollTrigger.create({ trigger: '.kit', start: 'top 50%', once: true, onEnter: () => sumNums.forEach((n, i) => countUp(n, .4 + i * .25)) });

  // Fichas: al entrar cada una, cuentan sus cifras y crecen sus barras (las barras miden el dato real)
  cardNums.forEach(n => { n.el.textContent = fmt(n); });
  gsap.set('.card .bar', { scaleX: 0 });
  gsap.set('.card .split i', { scaleX: 0 });
  document.querySelectorAll('.card').forEach(card => {
    ScrollTrigger.create({ trigger: card, start: 'top 70%', once: true, onEnter: () => {
      cardNums.filter(n => card.contains(n.el)).forEach((n, j) => countUp(n, .2 + j * .08, null, 1.8));
      gsap.to(card.querySelectorAll('.bar'), { scaleX: 1, duration: 1.8, delay: .3, stagger: .2, ease: 'expo.out' });
      gsap.to(card.querySelectorAll('.split i'), { scaleX: 1, duration: 1.6, delay: .6, stagger: .12, ease: 'expo.out' });
      gsap.fromTo(card.querySelector('.card__photo img'), { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
    } });
  });
}

// ── 8. Isla: índice vivo
const island = document.querySelector('.island');
const list = document.getElementById('island-list');
const toggle = island.querySelector('.island__toggle');
const current = island.querySelector('.island__current');
const chapters = [...document.querySelectorAll('[data-chapter]')];
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
  goTo(document.querySelector(a.getAttribute('href')));
}));
chapters.forEach((sec, i) => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => {
    if (!self.isActive) return;
    current.textContent = sec.dataset.chapter;
    links.forEach((a, j) => a.setAttribute('aria-current', i === j));
  },
}));
ScrollTrigger.create({ trigger: '#viaje', start: 'top 90%', onEnter: () => island.classList.add('is-visible'), onLeaveBack: () => island.classList.remove('is-visible') });
if (reduced) island.classList.add('is-visible');

// Teclado para presentar en sala: ← → / AvPág RePág saltan de sección (y de ficha en ficha entre los creadores).
// En la portada, el primer «siguiente» lleva al momento de la caja abierta.
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  e.preventDefault();
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
  const top = el => el.getBoundingClientRect().top + scrollY;
  const cover = chapters[0];
  const stops = [0];
  if (!reduced) stops.push(cover.offsetTop + (cover.offsetHeight - innerHeight) * .9);
  chapters.slice(1).forEach(s => stops.push(top(s)));
  document.querySelectorAll('.card').forEach(c => stops.push(top(c)));
  stops.sort((a, b) => a - b);
  const y = scrollY;
  const next = fwd ? stops.find(s => s > y + 10) : [...stops].reverse().find(s => s < y - 10);
  if (next === undefined) return;
  lenis ? lenis.scrollTo(next, { duration: 1.3, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo(0, next);
});

// ── 9. Arranque cuando el loader llega al 100 %
document.addEventListener('deck:ready', () => {
  lenis?.start();
  introTitles();
  ScrollTrigger.refresh();
}, { once: true });
