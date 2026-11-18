// Orquesta el deck: scroll suave (Lenis), color por sección, LA LATA DE NESTEA en 3D que recorre toda la presentación
// (se posa en los huecos [data-slot]), las hojas que caen, el gesto de la portada (la lata va al centro y da una vuelta),
// contadores, la isla y el teclado.
import { createScene } from './scene.js';
{
  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.add('js');
  if (!reduced) root.classList.add('motion');
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });   // la barra del navegador del móvil no recalcula todo al aparecer/desaparecer
  // Escena 3D (la lata). Sin WebGL: la foto de la lata en cada hueco
  let scene = null;
  try {
    scene = createScene(document.getElementById('stage'), { reduced });
    root.classList.add('has-webgl');
    window.deckLoading?.track('escena', scene.ready.catch(() => {}));
    window.deckScene = scene;
  } catch (err) {
    console.warn('Sin escena 3D: se muestra la lata en imagen.', err);
    root.classList.add('no-webgl');
    window.deckLoading?.track('escena', Promise.resolve());
  }

  const COLORS = { nieve: '#F5F8FC', noche: '#0B1A33', azul: '#0A4FA3', verde: '#2E8B3A', amarillo: '#F6D02F' };
  const body = document.body;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const narrow = () => innerWidth <= 760;
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

  // ── Scroll suave
  let lenis = null, vel = 0;
  if (!reduced) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true });
    lenis.on('scroll', e => { ScrollTrigger.update(); scene?.set({ vel: e.velocity }); });
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const ease4 = t => 1 - Math.pow(1 - t, 4);
  const goTo = (target, duration = 1.4) => lenis ? lenis.scrollTo(target, { duration, easing: ease4 }) : (typeof target === 'number' ? scrollTo(0, target) : target.scrollIntoView());

  // ── Color de fondo y lluvia por sección
  const state = { rain: .5, lift: 0, spin: 0 };
  const push = () => scene?.set(state);
  function setTone(name, rain, id) {
    body.dataset.tone = name;
    gsap.to(body, { backgroundColor: COLORS[name], duration: reduced ? 0 : .9, ease: 'expo.out', overwrite: 'auto' });
    if (narrow() && !['portada', 'cierre'].includes(id)) rain = 0;   // en móvil solo llueve en portada y cierre
    gsap.to(state, { rain, duration: 1.2, ease: 'power2.out', overwrite: 'auto', onUpdate: push });
  }
  $$('section[data-tone]').forEach(sec => ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: self => self.isActive && setTone(sec.dataset.tone, +(sec.dataset.rain || 0), sec.id),
  }));

  // ── Portada: el título se va y la lata va al centro y da una vuelta entera
  if (!reduced) {
    const ct = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: .8 }, onUpdate: push });
    ct.to(['.cover__intro', '.cover .lockup', '.cover__cue'], { y: -70, autoAlpha: 0, ease: 'power2.in', duration: .22 }, .04)
      .to(state, { lift: 1, duration: .34, ease: 'power3.inOut' }, 0)
      .to(state, { spin: 1, duration: .5, ease: 'power2.inOut' }, .05)
      .to('.cover__land', { yPercent: 30, ease: 'none', duration: 1 }, 0)
      .fromTo('.cover__after .l', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, stagger: .07, duration: .14, ease: 'power3.out' }, .6)
      .to({}, { duration: .2 });
    // El viaje
    const vt = gsap.timeline({ scrollTrigger: { trigger: '.viaje', start: 'top 70%', end: 'bottom bottom', scrub: .7 } });
    vt.fromTo('.viaje__photo img', { scale: 1.2 }, { scale: 1, ease: 'power2.out', duration: 1 }, 0)
      .fromTo('.viaje__title .t1', { xPercent: -30, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: .3 }, .2)
      .fromTo('.viaje__title .t2', { xPercent: 30, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: 'expo.out', duration: .3 }, .3)
      .fromTo('.viaje__band', { yPercent: 100 }, { yPercent: 0, ease: 'expo.out', duration: .3 }, .42)
      .fromTo('.viaje__band p', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'expo.out', duration: .26, stagger: .06 }, .48)
      .to({}, { duration: .3 });
    // Los momentos: cada foto se acerca y el texto entra al llegar
    $$('.moment').forEach(m => {
      gsap.fromTo(m.querySelector('.moment__photo img'), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(m.querySelectorAll('.moment__text > *'), { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 55%' } });
    });
    gsap.fromTo('.cierre__photo img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cierre', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.fromTo('.cierre__title .l', { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.cierre', start: 'top 45%' } });
  }

  // ── Títulos por líneas y entradas
  function introTitles() {
    if (reduced) return;
    gsap.from('.cover__title .l', { yPercent: 70, autoAlpha: 0, duration: 1.3, stagger: .12, ease: 'expo.out', delay: .1 });
    $$('[data-split]').forEach(el => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
      });
    });
  }
  if (!reduced) {
    ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'expo.out', overwrite: true }) });
    ScrollTrigger.addEventListener('scrollEnd', () => {
      const late = $$('[data-reveal]').filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
      if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
    });
  }

  // ── Contadores de seguidores
  function readNum(el) {
    const m = el.textContent.trim().match(/^(\+?)([\d.,]+)(\s*)([KM]?)$/);
    if (!m) return null;
    return { el, pre: m[1], sep: m[3], unit: m[4], dec: (m[2].split(',')[1] || '').length, val: parseFloat(m[2].replace(/\./g, '').replace(',', '.')), o: { v: 0 } };
  }
  const fmt = n => { const [i, d] = n.o.v.toFixed(n.dec).split('.'); return n.pre + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '') + n.sep + n.unit; };
  if (!reduced) {
    $$('.member').forEach((m, i) => {
      const ns = [...m.querySelectorAll('[data-count]')].map(readNum).filter(Boolean);
      ns.forEach(n => { n.el.textContent = fmt(n); });
      ScrollTrigger.create({ trigger: m, start: 'top 82%', once: true, onEnter: () => {
        ns.forEach((n, j) => gsap.to(n.o, { v: n.val, duration: 1.8, delay: .2 + (i % 3) * .12 + j * .15, ease: 'power2.out', onUpdate: () => { n.el.textContent = fmt(n); }, onComplete: () => { n.el.textContent = fmt(n); } }));
        gsap.fromTo(m.querySelector('.member__photo img'), { scale: 1.25 }, { scale: 1, duration: 1.6, delay: (i % 3) * .12, ease: 'expo.out' });
      } });
    });
  }

  // ── Isla
  const island = $('.island');
  const list = $('#island-list');
  const toggle = island.querySelector('.island__toggle');
  const current = island.querySelector('.island__current');
  const chapters = $$('[data-chapter]');
  chapters.forEach(sec => { const li = document.createElement('li'); li.innerHTML = `<a href="#${sec.id}">${sec.dataset.chapter}</a>`; list.append(li); });
  const links = [...list.querySelectorAll('a')];
  const setOpen = open => { island.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); };
  toggle.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', e => { if (!island.contains(e.target)) setOpen(false); });
  links.forEach(a => a.addEventListener('click', e => { e.preventDefault(); setOpen(false); goTo($(a.getAttribute('href'))); }));
  chapters.forEach((sec, i) => ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: self => {
    if (!self.isActive) return;
    current.textContent = sec.dataset.chapter;
    links.forEach((a, j) => a.setAttribute('aria-current', i === j));
  } }));
  ScrollTrigger.create({ trigger: '#viaje', start: 'top 90%', onEnter: () => island.classList.add('is-visible'), onLeaveBack: () => island.classList.remove('is-visible') });
  if (reduced) island.classList.add('is-visible');

  // Teclado: ← → / AvPág RePág, una parada por pantalla
  document.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
    const top = el => el.getBoundingClientRect().top + scrollY;
    const stops = [0, ...$$('main > section').slice(1).map(top)];
    if (!reduced) {
      const c = $('.cover'); stops.push(top(c) + (c.offsetHeight - innerHeight) * .85);
      const v = $('.viaje'); stops.push(top(v) + v.offsetHeight - innerHeight);
      const h = $('.casa'); stops.push(top(h) + h.offsetHeight - innerHeight);
    }
    stops.sort((a, b) => a - b);
    const y = scrollY;
    const next = fwd ? stops.find(s => s > y + 10) : [...stops].reverse().find(s => s < y - 10);
    if (next === undefined) return;
    lenis ? lenis.scrollTo(next, { duration: 1.3, easing: ease4 }) : scrollTo(0, next);
  });

  document.addEventListener('deck:ready', () => { lenis?.start(); introTitles(); ScrollTrigger.refresh(); }, { once: true });
}
