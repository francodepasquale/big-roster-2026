// Orquesta el deck: scroll suave (Lenis), color de fondo por sección, el gesto de la portada
// (destapar → del día en pistas al après-ski), las botellas de los creadores, la isla y el teclado.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');
if (!reduced) root.classList.add('motion');
gsap.registerPlugin(ScrollTrigger, SplitText);

const COLORS = { nieve: '#F7F8FA', noche: '#1C0F0A', rojo: '#CC0000' };
const DUSK = { nieve: 0, noche: 1, rojo: .5 };
const body = document.body;

// ── 1. Escena 3D, con plan B (packshot real) si no hay WebGL o falla la carga
let scene = null;
function noWebGL(err) {
  if (err) console.warn('Sin escena 3D: se muestra el packshot.', err);
  scene = null;
  root.classList.remove('has-webgl'); root.classList.add('no-webgl');
}
try {
  scene = createScene(document.getElementById('stage'), { reduced });
  root.classList.add('has-webgl');
  window.deckLoading?.track('escena', scene.ready.catch(noWebGL));
} catch (err) {
  noWebGL(err);
  window.deckLoading?.track('escena', Promise.resolve());
}

// ── 2. Scroll suave (con movimiento reducido, scroll nativo)
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

// ── 3. Color de fondo por sección: el fondo vive en <body> y la escena recoge el tono
function setTone(name, fizz = 0) {
  body.dataset.tone = name;
  gsap.to(body, { backgroundColor: COLORS[name], duration: reduced ? 0 : .9, ease: 'expo.out', overwrite: 'auto' });
  scene?.set({ dusk: DUSK[name], fizz });
}
document.querySelectorAll('section[data-tone]').forEach(sec => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && setTone(sec.dataset.tone, +(sec.dataset.fizz || 0)),
}));

// Paisaje de la portada: fijo detrás de la botella mientras dura la portada, y se va con ella al salir
const coverEl = document.querySelector('.cover');
const backdrop = document.querySelector('.backdrop');
const night = document.querySelector('.backdrop__night');
const dayImg = document.querySelector('.backdrop__day');
const fog = document.querySelector('.backdrop__fog');
gsap.ticker.add(() => {
  const r = coverEl.getBoundingClientRect();
  const y = Math.min(0, r.bottom - innerHeight);
  backdrop.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  backdrop.style.visibility = r.bottom > 0 ? 'visible' : 'hidden';
  fog.style.opacity = gsap.utils.clamp(0, 1, -y / (innerHeight * .35)).toFixed(3); // al salir, la noche se funde con la nube
});

// ── 4. Portada: el gesto
const coverOpen = { v: 0 };
const pushCover = () => scene?.set({ coverOpen: coverOpen.v });
if (reduced) {
  coverOpen.v = 1; pushCover();
  ScrollTrigger.create({ trigger: '.cover', start: 'top 55%', end: 'bottom 55%', onToggle: s => s.isActive && setTone('nieve') });
} else {
  const narrow = () => innerWidth <= 760;
  // La botella entra desde la derecha al centro; el título se va; después llegan las dos frases.
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: .8, invalidateOnRefresh: true } });
  tl.to(['.cover__intro', '.cover .lockup', '.cover__cue'], { y: -60, autoAlpha: 0, ease: 'power2.in', duration: .26 }, .04)
    .fromTo('.cover__slot', { x: () => narrow() ? 0 : innerWidth * .23 }, { x: 0, ease: 'power3.inOut', duration: .36 }, 0)
    .fromTo('.cover__after .l', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: .16, stagger: .07 }, .64)
    .to({}, { duration: .14 });

  // El «pop»: al cruzar el punto, la chapa salta (no se arrastra con el scroll: es un gesto)
  let popped = 0;
  const day = gsap.utils.interpolate(COLORS.nieve, COLORS.noche);
  ScrollTrigger.create({
    trigger: '.cover', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      if (!self.isActive) return; // al saltar fuera de la portada, manda el color de la sección nueva
      const p = self.progress;
      const want = p > .42 ? 1 : 0;
      if (want !== popped) {
        popped = want;
        gsap.to(coverOpen, { v: want, duration: want ? 1.4 : .8, ease: want ? 'expo.out' : 'power3.inOut', overwrite: true, onUpdate: pushCover });
      }
      // Del blanco de pista a la noche del après-ski, justo después de destapar
      const mix = gsap.parseEase('power2.inOut')(gsap.utils.clamp(0, 1, (p - .44) / .28));
      gsap.killTweensOf(body);
      gsap.set(body, { backgroundColor: day(mix) });
      body.dataset.tone = mix > .5 ? 'noche' : 'nieve';
      night.style.opacity = mix.toFixed(3);              // la montaña de día deja paso al pueblo iluminado
      gsap.set(dayImg, { scale: 1 + p * .08, transformOrigin: '50% 100%' });
      scene?.set({ dusk: mix, fizz: mix * .5 });
    },
  });
}

// ── 5. Títulos por líneas y entradas
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
    start: 'top 90%',
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'expo.out', overwrite: true }),
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    const late = [...document.querySelectorAll('[data-reveal]')].filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });

  // El viaje: se entra atravesando nubes; al abrirse aparece el telesilla a pantalla completa
  const vt = gsap.timeline({ scrollTrigger: { trigger: '.viaje', start: 'top 70%', end: 'bottom bottom', scrub: .7 } });
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
    // La franja roja sube y cubre la pantalla: es el fondo de la sección siguiente
    .to(['.viaje__band p', '.viaje__title'], { autoAlpha: 0, y: -40, ease: 'power2.in', duration: .14 }, 1.24)
    .fromTo('.viaje__wipe', { scaleY: 0 }, { scaleY: 1, ease: 'power3.inOut', duration: .34 }, 1.24);

  // El paisaje sube un poco al terminar de cargar
  document.addEventListener('deck:ready', () => gsap.from(dayImg, { yPercent: 14, duration: 2.2, ease: 'expo.out' }), { once: true });

}

// ── Contadores: cada cifra sube desde 0 hasta su valor real (el que está escrito en el HTML)
function readNum(el) {
  const m = el.textContent.trim().match(/^(\+?)([\d.,]+)(\s*)([KM]?)$/);
  const raw = m[2];
  return { el, pre: m[1], sep: m[3], unit: m[4], dec: (raw.split(',')[1] || '').length, val: parseFloat(raw.replace(/\./g, '').replace(',', '.')), o: { v: 0 } };
}
const fmt = n => n.pre + n.o.v.toLocaleString('es-ES', { minimumFractionDigits: n.dec, maximumFractionDigits: n.dec }) + n.sep + n.unit;
const pop = el => gsap.fromTo(el, { scale: 1.14 }, { scale: 1, duration: .9, ease: 'elastic.out(1, .45)', transformOrigin: '0% 100%' });
function countUp(n, delay, onUpdate) {
  return gsap.to(n.o, { v: n.val, duration: 2, delay, ease: 'power2.out', onUpdate: () => { n.el.textContent = fmt(n); onUpdate?.(); }, onComplete: () => { n.el.textContent = fmt(n); pop(n.el); } });
}

// Edición anterior: los tres reels cuentan y el total se va sumando con ellos hasta +3,3 M
const total = document.querySelector('.anterior__total');
const reelNums = [...document.querySelectorAll('.reel [data-count]')].map(readNum);
const paintTotal = () => {
  const sum = reelNums.reduce((a, n) => a + n.o.v * (n.unit === 'K' ? .001 : 1), 0);
  total.textContent = '+' + sum.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
};
const crewNums = [...document.querySelectorAll('.member [data-count]')].map(readNum);
if (!reduced) {
  reelNums.forEach(n => { n.el.textContent = fmt(n); });
  paintTotal();
  gsap.set('.reel__img', { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set('.reel__top', { autoAlpha: 0 });
  ScrollTrigger.create({ trigger: '.anterior', start: 'top 45%', once: true, onEnter: () => {
    reelNums.forEach((n, i) => countUp(n, .3 + i * .5, paintTotal));
    // Cada columna crece desde la base al ritmo de su contador
    gsap.utils.toArray('.reel__img').forEach((el, i) => gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, delay: .3 + i * .5, ease: 'power2.out' }));
    gsap.fromTo('.reel__top', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .8, stagger: .5, delay: .3, ease: 'expo.out' });
    gsap.delayedCall(.3 + 2 * .5 + 2, () => pop(total));
  } });
  crewNums.forEach(n => { n.el.textContent = fmt(n); });
  ScrollTrigger.batch('.member', { start: 'top 82%', once: true, onEnter: batch => batch.forEach((m, i) => {
    crewNums.filter(n => m.contains(n.el)).forEach((n, j) => countUp(n, .25 + i * .14 + j * .2));
    gsap.fromTo(m.querySelector('.member__photo img'), { scale: 1.35 }, { scale: 1, duration: 1.8, delay: i * .14, ease: 'expo.out' });
  }) });
}

// ── 6. Los seis creadores: al llegar, cada botella se destapa por turnos; al pasar por un perfil, su botella sube
const members = [...document.querySelectorAll('.member')];
const rowOpen = members.map(() => ({ v: 0 }));
function rows(to) {
  rowOpen.forEach((o, i) => gsap.to(o, {
    v: to, duration: to ? 1.3 : .6, delay: to ? i * .16 : 0, ease: to ? 'expo.out' : 'power2.inOut', overwrite: true,
    onUpdate: () => scene?.setRow(i, { open: o.v }),
  }));
}
if (reduced) members.forEach((_, i) => scene?.setRow(i, { open: 1 }));
else ScrollTrigger.create({ trigger: '.crew__grid', start: 'top 62%', onEnter: () => rows(1), onLeaveBack: () => rows(0) });
members.forEach((m, i) => {
  const on = () => scene?.setRow(i, { hover: 1 }), off = () => scene?.setRow(i, { hover: 0 });
  m.addEventListener('pointerenter', on); m.addEventListener('pointerleave', off);
  m.addEventListener('focusin', on); m.addEventListener('focusout', off);
});

// ── 7. Isla: índice vivo
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
const goTo = (target, duration = 1.4) => lenis ? lenis.scrollTo(target, { duration, easing: t => 1 - Math.pow(1 - t, 4) }) : target.scrollIntoView();
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

// Teclado para presentar en sala: ← → / AvPág RePág saltan de sección.
// En la portada, el primer «siguiente» lleva al momento del après-ski (la botella destapada).
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  e.preventDefault();
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
  const cover = chapters[0];
  const stops = [0];
  if (!reduced) stops.push(cover.offsetTop + (cover.offsetHeight - innerHeight) * .9);
  chapters.slice(1).forEach(s => stops.push(s.offsetTop));
  const y = scrollY;
  const next = fwd ? stops.find(s => s > y + 10) : [...stops].reverse().find(s => s < y - 10);
  if (next === undefined) return;
  lenis ? lenis.scrollTo(next, { duration: 1.3, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo(0, next);
});

// ── 8. Arranque cuando el loader llega al 100 %
document.addEventListener('deck:ready', () => {
  lenis?.start();
  introTitles();
  ScrollTrigger.refresh();
}, { once: true });
