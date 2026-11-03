// Hablemos de Cine × PedidosYa · «Función completa»
// Orquesta: escena 3D (scene.js), scroll pesado (Lenis + ScrollTrigger), seguimiento del pedido (hud.js),
// el vertical de su formato, el guion fijado con la llegada, los afiches de la serie, los créditos y la isla.
import { createScene } from './scene.js';
import { createHud } from './hud.js';

const { gsap, ScrollTrigger, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = matchMedia('(max-width: 900px)');
const root = document.documentElement;
root.classList.add('js');
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ── Grano de película (textura generada, sin archivos)
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'), id = g.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  root.style.setProperty('--noise', `url(${c.toDataURL()})`);
})();

// ── Videos: se cargan cuando hacen falta y solo suena (se reproduce) el que está en pantalla
const load = v => { if (v && !v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
const play = v => { if (!v) return; load(v); const p = v.play(); if (p) p.catch(() => {}); };
const pause = v => { if (v && !v.paused) v.pause(); };

// ── 1. Escena 3D (con plan B)
let scene = null;
try {
  scene = createScene($('#stage'), { reduced, mobile: mobileMQ.matches });
  window.deckLoading?.track('escena', scene.ready);
} catch (err) {
  console.warn('Sin WebGL: se muestra el celular en plano.', err);
  root.classList.add('no-webgl');
  play($('.cover__fallback video'));
  window.deckLoading?.track('escena', Promise.resolve());
}

// ── 2. Scroll suave pero preciso: frena enseguida, sin arrastrar
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .13, wheelMultiplier: 1, touchMultiplier: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
// La velocidad del scroll inclina celulares y afiches (sensación de peso)
let vel = 0, lastVel = 0;
const tiltEls = $$('.poster');
gsap.ticker.add(() => {
  const raw = lenis ? lenis.velocity : 0;
  vel += (clamp(raw / 55, -1, 1) - vel) * .1;
  // la inclinación solo se escribe en los elementos que la usan (no en <html>, que recalcularía toda la página)
  if (Math.abs(vel - lastVel) > .004) { lastVel = vel; const v = vel.toFixed(3); tiltEls.forEach(el => el.style.setProperty('--v', v)); }
  scene?.setVelocity(vel);
});
addEventListener('pointermove', e => scene?.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });

// ── Seguimiento del pedido
const hud = createHud($('#hud'), { gsap, reduced });

// ── 3. Portada: se va con el scroll como un swipe; el celular y la mochila 3D suben junto con la página
const coverCue = $('.cover__cue'), coverBrands = $('.cover__brands');
const coverST = ScrollTrigger.create({
  trigger: '#portada', start: 'top top', end: 'bottom top',
  onUpdate: self => scene?.setHero(self.progress),
});

// ── 4. La idea: palabra por palabra, desde el desenfoque
const ideaText = $('.idea__text');
(function splitWords(node) {
  [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.append(part);
        else { const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.append(w); }
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) splitWords(n);
  });
})(ideaText);
gsap.fromTo($$('.w', ideaText), { opacity: 0, y: '.35em', filter: 'blur(6px)' }, {
  opacity: 1, y: 0, filter: 'blur(0px)', stagger: .1, ease: 'none',
  scrollTrigger: { trigger: '.idea', start: 'top 72%', end: 'center 42%', scrub: .4 },
});
const ideaST = ScrollTrigger.create({ trigger: '#idea', start: 'top bottom', end: 'top 30%' });

// ── 5. Damián: la foto se desliza apenas y las cifras cuentan
if (!reduced) gsap.fromTo('.damian__card img', { yPercent: 4 }, { yPercent: -4, ease: 'none', scrollTrigger: { trigger: '.damian', start: 'top bottom', end: 'bottom top', scrub: .5 } });
const nf = new Intl.NumberFormat('es-AR');
$$('.num[data-count]').forEach(el => {
  const to = +el.dataset.count, o = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => gsap.to(o, { v: to, duration: reduced ? 0 : 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = nf.format(Math.round(o.v)); } }),
  });
});

// ── 6. Su formato: un solo vertical que pasa sus clips en el mismo lugar
const fsteps = $$('.fstep'), fclips = $$('.fclip'), fbars = $$('.stories i');
let fIndex = -1;
function setFormat(i) {
  if (i === fIndex) return; fIndex = i;
  fsteps.forEach((s, j) => s.classList.toggle('is-on', j === i));
  fclips.forEach((v, j) => { v.classList.toggle('is-on', j === i); j === i ? play(v) : pause(v); });
  load(fclips[i + 1]); // se precarga solo el clip que sigue
}
const formatST = ScrollTrigger.create({
  trigger: '#formato', start: 'top top', end: () => '+=' + innerHeight * 2.6, pin: '.format__pin', scrub: true,
  onUpdate: self => {
    const x = self.progress * 4;
    setFormat(Math.min(3, Math.floor(x)));
    fbars.forEach((b, j) => b.style.setProperty('--f', clamp(x - j).toFixed(3)));
  },
  onToggle: self => { if (!self.isActive) fclips.forEach(pause); else play(fclips[Math.max(0, fIndex)]); },
});
ScrollTrigger.create({ trigger: '#formato', start: 'top 200%', once: true, onEnter: () => { load(fclips[0]); load(fclips[1]); } });


// ── 8. Así se ve: guion fijado. Cada plano tiene su tramo; «La entrega» es el más largo.
const cine = $('.cine'), beats = $$('.beat'), shots = $$('.shot'), phoneWrap = $('.cine__phone');
const tcEl = $('.cine__tc'), reel = $('.iphone__screen', phoneWrap);
const WEIGHTS = [1, 1, 1.2, 1.7, 1.2, 1.1, 2.8, 1.2, 1.2];
const STARTS = [0, 9, 14, 34, 40, 50, 53, 60, 68, 75]; // segundos del reel
const ARRIVE_AT = .62; // dentro de «La entrega», cuando el pedido se da por entregado
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);
const appShot = $('.shot--app'), typed = $('.app__typed', appShot), typedText = typed.dataset.text;
const live = $('.live'), liveMin = $('.live__min'), heistVideo = $('.shot--heist video');
let beatIndex = -1, ringing = false, lastArrival = 0, lastAfter = 0;
const fmtTC = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function setBeat(i) {
  if (i === beatIndex) return; beatIndex = i;
  beats.forEach((b, j) => b.classList.toggle('is-on', j === i));
  shots.forEach((s, j) => {
    s.classList.toggle('is-on', j === i);
    const v = $('video', s);
    if (v) j === i ? play(v) : pause(v);
  });
  [i + 1, i + 2].forEach(n => shots[n] && load($('video', shots[n]))); // precarga los dos planos que siguen
  if (heistVideo) heistVideo.playbackRate = .45;
}
function beatAt(progress) {
  let x = progress * TOTAL, i = 0;
  while (i < WEIGHTS.length - 1 && x > WEIGHTS[i]) { x -= WEIGHTS[i]; i++; }
  return [i, clamp(x / WEIGHTS[i])];
}
const beatProgressAt = (i, s) => (WEIGHTS.slice(0, i).reduce((a, b) => a + b, 0) + WEIGHTS[i] * s) / TOTAL;

const guionST = ScrollTrigger.create({
  trigger: '.cine', start: 'top top', end: () => '+=' + innerHeight * (mobileMQ.matches ? .75 : .85) * TOTAL, pin: true, scrub: true,
  onToggle: self => {
    root.classList.toggle('is-cinema', self.isActive);
    // fuera del guion la mochila y la bolsa desaparecen enseguida (no vuelven a subir)
    scene?.setArrival(lastArrival, lastAfter, self.isActive);
    if (!self.isActive) shots.forEach(s => pause($('video', s)));
    else { const v = $('video', shots[Math.max(0, beatIndex)]); play(v); }
  },
  onUpdate: self => {
    const [i, s] = beatAt(self.progress);
    setBeat(i);
    // reloj del reel
    const sec = lerp(STARTS[i], STARTS[i + 1], s);
    tcEl.textContent = fmtTC(sec);
    reel.style.setProperty('--reel', (sec / 75).toFixed(4));
    // Pide: escribe, aparece el resultado, toca «Hacer pedido» y se confirma
    if (i === 3) {
      typed.textContent = typedText.slice(0, Math.round(smooth(.02, .4, s) * typedText.length));
      appShot.style.setProperty('--res', smooth(.32, .5, s).toFixed(3));
      const tap = smooth(.56, .64, s) * (1 - smooth(.7, .76, s));
      appShot.style.setProperty('--tap', tap.toFixed(3));
      appShot.style.setProperty('--press', tap.toFixed(3));
      appShot.style.setProperty('--done', smooth(.7, .88, s).toFixed(3));
    }
    // Sigue: el seguimiento en la esquina avanza
    if (i === 4) {
      live.style.setProperty('--lp', (.18 + s * .7).toFixed(3));
      liveMin.textContent = `${Math.max(1, Math.round(4 - s * 3))} min`;
    }
    // Timbre: el teléfono tiembla
    const ring = i === 5 && s > .12 && s < .92;
    if (ring !== ringing) { ringing = ring; phoneWrap.classList.toggle('is-ringing', ring); }
    // La entrega: la caja cae, se abre y llega el pedido
    const arrival = i < 6 ? 0 : i === 6 ? s : 1;
    const after = i < 7 ? 0 : i === 7 ? smooth(0, .55, s) : 1;
    lastArrival = arrival; lastAfter = after;
    // desde «La entrega» el celular queda al lado de la mochila
    cine.classList.toggle('is-arrival', i === 6);
    cine.classList.toggle('is-pack', i >= 6);
    scene?.setArrival(arrival, after, true);
    paintHud();
  },
});
ScrollTrigger.create({ trigger: '#guion', start: 'top 200%', once: true, onEnter: () => [0, 1, 2].forEach(n => load($('video', shots[n]))) });

// ── 9. La serie: afiches en horizontal (escritorio). En móvil, uno abajo del otro.
const mm = gsap.matchMedia();
mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
  const track = $('.series__track'), head = $('.series__head');
  const distance = () => Math.max(0, track.scrollWidth - (innerWidth - head.offsetWidth));
  gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: { trigger: '#serie', start: 'top top', end: () => '+=' + distance() * 1.1, pin: '.series__pin', scrub: .4, invalidateOnRefresh: true },
  });
});

// ── 10. Títulos de los afiches: entran justo al ancho del afiche
function fitPosters() {
  $$('.poster__title').forEach(t => {
    t.style.fontSize = '';
    const w = t.parentElement.clientWidth * .88, sw = t.scrollWidth;
    if (sw > w) t.style.fontSize = (parseFloat(getComputedStyle(t).fontSize) * w / sw).toFixed(2) + 'px';
  });
}
fitPosters();
addEventListener('resize', fitPosters);
document.fonts?.ready.then(fitPosters);

// ── 11. Cierre: suben las luces de la sala, vuelve la mochila abierta y queda la firma
const endPin = $('.end__pin');
const endST = ScrollTrigger.create({
  trigger: '#cierre', start: 'top top', end: () => '+=' + innerHeight * 1.2, pin: '.end__pin', scrub: true,
  onUpdate: self => {
    const p = self.progress;
    const fin = smooth(.02, .45, p);
    endPin.style.setProperty('--fin', fin.toFixed(3));
    scene?.setEnd(smooth(0, .4, p), fin);
  },
});

// ── Avance del pedido: de «La idea» a «La entrega». Cada etapa coincide con una parte del deck.
let anchors = [], hudOff = 0;
function measureAnchors() {
  const arrive = guionST.start + (guionST.end - guionST.start) * beatProgressAt(6, ARRIVE_AT);
  const ring = guionST.start + (guionST.end - guionST.start) * beatProgressAt(5, 0);
  hudOff = guionST.start + (guionST.end - guionST.start) * beatProgressAt(7, .08);
  anchors = [
    [ideaST.start + innerHeight * .4, 0, 0],
    [formatST.start, .3, 1],
    [guionST.start - innerHeight * .6, .55, 2],
    [ring, .9, 3],
    [arrive, 1, 4],
  ];
}
function paintHud() {
  if (!anchors.length) return;
  const y = scrollY;
  let p = 0, stage = 0;
  for (let k = 0; k < anchors.length; k++) {
    const [ay, ap, as] = anchors[k];
    if (y >= ay) { stage = as; p = ap; const nx = anchors[k + 1]; if (nx) p = lerp(ap, nx[1], clamp((y - ay) / (nx[0] - ay))); }
  }
  hud.update(p, stage);
  // visible desde la idea hasta que llega el pedido; vuelve en el cierre para calificar la función
  const inTrack = y >= anchors[0][0] - innerHeight * .3 && y < hudOff;
  const inEnd = y >= endST.start + (endST.end - endST.start) * .3;
  hud.show(inTrack || (inEnd && hud.arrived) || (inEnd && stage === 4));
  $('#hud').classList.toggle('is-end', inEnd);
}
ScrollTrigger.addEventListener('refresh', () => { measureAnchors(); paintHud(); });
(lenis || window).addEventListener?.('scroll', paintHud);
if (lenis) lenis.on('scroll', paintHud);

// ── 12. Capítulos: escena 3D e isla
const chapters = $$('[data-chapter]');
const island = $('.island'), list = $('#island-list'), toggle = $('.island__toggle'), current = $('.island__current');
chapters.forEach(sec => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="#${sec.id}">${sec.dataset.chapter}</a>`;
  list.append(li);
});
const links = $$('a', list);
// Cuánto se oscurece la sala detrás del texto en cada sección (para que se lea bien)
const SHADE = { portada: .18, idea: .5, damian: .5, formato: .42, guion: .38, serie: .5, claves: .55, produccion: .55, cierre: .35 };
function activate(i) {
  const sec = chapters[i];
  scene?.setSection(sec.id);
  root.style.setProperty('--shade', SHADE[sec.id] ?? .45);
  current.textContent = sec.dataset.chapter;
  links.forEach((a, j) => a.setAttribute('aria-current', i === j));
}
const chapterST = chapters.map((sec, i) => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && activate(i),
}));
ScrollTrigger.create({ trigger: '#idea', start: 'top 85%', onEnter: () => island.classList.add('is-visible'), onLeaveBack: () => island.classList.remove('is-visible') });

const setOpen = open => { island.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); };
toggle.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!island.contains(e.target)) setOpen(false); });
const chapterY = i => {
  const id = chapters[i].id;
  if (id === 'portada') return 0;
  if (id === 'guion') return guionST.start + 2;
  return chapterST[i].start + innerHeight * .55 + 2;
};
const goTo = i => { const y = Math.max(0, chapterY(i)); lenis ? lenis.scrollTo(y, { duration: 2.2, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo(0, y); };
links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); setOpen(false); goTo(i); }));
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  e.preventDefault();
  const y = scrollY + 4, ys = chapters.map((_, i) => chapterY(i));
  let i = ys.findIndex(v => v > y);
  if (i < 0) i = chapters.length;
  goTo(['ArrowRight', 'PageDown'].includes(e.key) ? Math.min(chapters.length - 1, i) : Math.max(0, i - 2));
});

// ── 13. Aparecer al entrar en pantalla
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  const el = en.target, sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
  el.style.transitionDelay = `${Math.max(0, sibs.indexOf(el)) * 90}ms`;
  el.classList.add('is-in'); io.unobserve(el);
}), { threshold: .2, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach(el => io.observe(el));

// ── 14. Arranque: la portada entra cuando se apaga el loader
function intro() {
  if (reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.cover__word', { yPercent: 70, opacity: 0, filter: 'blur(14px)', duration: 1.4 })
    .from('.cover h1 .script', { scale: .6, rotate: -18, opacity: 0, duration: 1.3 }, .25)
    .from([coverBrands, coverCue], { opacity: 0, duration: 1 }, .7);
}
let started = false;
function start() {
  if (started) return; started = true;
  intro();
  lenis?.start();
  ScrollTrigger.refresh();
}
document.addEventListener('deck:reveal', start, { once: true });
document.addEventListener('deck:ready', () => { start(); ScrollTrigger.refresh(); }, { once: true });
addEventListener('load', () => ScrollTrigger.refresh());
document.addEventListener('visibilitychange', () => scene?.pause(document.hidden));

// Acceso para revisar el deck desde la consola o con Chrome automatizado
window.__deck = { lenis, scene, hud, st: { coverST, formatST, guionST, endST }, beatProgressAt };
