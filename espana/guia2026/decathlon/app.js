// Decathlon × BIG · ¿Nos vamos a Baqueira?
// Orquesta: escena 3D (scene.js), scroll suave (Lenis + ScrollTrigger), visor de las gafas,
// forfait colgante, perfil de la temporada, telesilla del squad, cierre e isla.
import { createScene } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hover = matchMedia('(hover: hover)').matches;
const root = document.documentElement;
root.classList.add('js');
gsap.registerPlugin(ScrollTrigger, SplitText);

// ── Datos del squad (tal cual la propuesta original del 29/10/2026)
const SQUAD = [
  { name: 'Jorge Ramón', handle: 'jorgeramonweb', ig: '451K', tt: '358,8K', bio: 'Actor y creador de humor.', img: 'jorge-ramon' },
  { name: 'Sofi Sea', handle: 'sofiisea', ig: '289K', tt: '413K', bio: 'Viajes y lifestyle.', img: 'sofi-sea' },
  { name: 'Iván', handle: 'ivssss_', ig: '112K', tt: '58,3K', bio: 'Humor y lifestyle.', img: 'ivan' },
  { name: 'María García Pescador', handle: 'marianinigp', ig: '102K', tt: '15,5K', bio: 'Running y experiencias al aire libre.', img: 'maria-garcia-pescador' },
  { name: 'Juli García', handle: 'jugarciaok', ig: '82,2K', tt: '111,3K', bio: 'Humor, lifestyle y viajes.', img: 'juli-garcia' },
  { name: 'Gonza Maass', handle: 'gonzamaass', ig: '23K', tt: '26,8K', bio: 'Humor, vlogs y experiencias.', img: 'gonza-maass' },
];
const gogglesIcon = '<svg viewBox="0 0 40 20" aria-hidden="true"><path fill="currentColor" d="M4 2h32a3 3 0 0 1 3 3v8a5 5 0 0 1-5 5h-8l-3-4h-6l-3 4H6a5 5 0 0 1-5-5V5a3 3 0 0 1 3-3z"/></svg>';
const track = document.querySelector('.lift__track');
SQUAD.forEach((p, i) => {
  const el = document.createElement('article');
  el.className = 'chair';
  el.innerHTML = `
    <span class="chair__grip" aria-hidden="true"></span><span class="chair__arm" aria-hidden="true"></span><span class="chair__bar" aria-hidden="true"></span>
    <div class="flip"><div class="flip__inner">
      <div class="face face--front">
        <div class="chair__photo"><img src="assets/img/${p.img}.webp" alt="${p.name}" width="1110" height="438" loading="lazy"></div>
        <div class="chair__body">
          <h3 class="chair__name">${p.name}</h3>
          <a class="chair__handle" href="https://www.instagram.com/${p.handle}/" target="_blank" rel="noopener">@${p.handle}</a>
          <ul class="chair__nets"><li>Instagram <b>${p.ig}</b></li><li>TikTok <b>${p.tt}</b></li></ul>
          <p class="chair__bio">${p.bio}</p>
          <button class="chair__equip" type="button" aria-pressed="false" aria-label="Equipar a ${p.name} con Decathlon">${gogglesIcon}Equipar</button>
        </div>
      </div>
      <div class="face face--back" inert>
        <div><img src="assets/img/decathlon-blanco.png" alt="Decathlon" width="462" height="305"></div>
        <div>
          <span class="tag">Propuesta</span>
          <h4>${p.name.split(' ')[0]}, equipado por Decathlon</h4>
          <p>Equipamiento de nieve para el viaje. Productos a coordinar con la marca.</p>
        </div>
        <button class="chair__equip" type="button" aria-label="Volver a la ficha de ${p.name}">Volver</button>
      </div>
    </div></div>
    <span class="chair__seat" aria-hidden="true"></span>`;
  track.append(el);
  const front = el.querySelector('.face--front'), back = el.querySelector('.face--back');
  el.querySelectorAll('.chair__equip').forEach(btn => btn.addEventListener('click', () => {
    const on = !el.classList.contains('is-equipped');
    el.classList.toggle('is-equipped', on);
    front.inert = on; back.inert = !on;
    el.querySelector('.face--front .chair__equip').setAttribute('aria-pressed', on);
    (on ? back : front).querySelector('.chair__equip').focus({ preventScroll: true });
    swing.kick(el, on ? 3 : -3);
  }));
});

// ── 1. Escena 3D (con plan B)
let scene = null;
try {
  scene = createScene(document.getElementById('stage'), { reduced });
  window.deckLoading?.track('escena', scene.ready);
} catch (err) {
  console.warn('Sin WebGL: se muestra la imagen de respaldo.', err);
  root.classList.add('no-webgl');
  window.deckLoading?.track('escena', Promise.resolve());
}
const stage = document.querySelector('.stage');

// ── 2. Scroll suave
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

// ── 3a. El squad: telesilla horizontal fijado (escritorio). En móvil, columna con el cable vertical.
// Se crea antes que los disparadores de capítulo para que estos midan la página con el pin ya puesto.
const mm = gsap.matchMedia();
mm.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: { trigger: '.squad', start: 'top top', end: () => '+=' + distance() * 1.15, pin: '.squad__pin', scrub: .8, invalidateOnRefresh: true },
  });
});

// ── 3b. Capítulos: color de fondo, escena, isla
const BG = { cielo: '#e6ebff', nieve: '#f5f7fd', noche: '#101a4a' };
const chapters = [...document.querySelectorAll('[data-chapter]')];
const island = document.querySelector('.island');
const list = document.getElementById('island-list');
const toggle = island.querySelector('.island__toggle');
const current = island.querySelector('.island__current');
const islandNum = island.querySelector('.island__num');
const islandPiste = island.querySelector('.piste');
chapters.forEach((sec, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="#${sec.id}"><i class="piste" data-piste="${sec.dataset.piste}" aria-hidden="true"></i><span>Pista ${String(i + 1).padStart(2, '0')}</span>${sec.dataset.chapter}</a>`;
  list.append(li);
});
const links = [...list.querySelectorAll('a')];
function activate(i) {
  const sec = chapters[i];
  root.style.setProperty('--bg', BG[sec.dataset.bg]);
  stage.style.setProperty('--sky', sec.id === 'portada' ? 1 : 0);
  stage.classList.toggle('is-front', sec.id === 'cierre');
  scene?.set({ section: sec.id });
  current.textContent = sec.dataset.chapter;
  islandNum.textContent = `Pista ${String(i + 1).padStart(2, '0')}`;
  islandPiste.dataset.piste = sec.dataset.piste;
  links.forEach((a, j) => a.setAttribute('aria-current', i === j));
}
const chapterST = chapters.map((sec, i) => ScrollTrigger.create({
  trigger: sec, start: 'top 55%', end: 'bottom 55%',
  onToggle: self => self.isActive && activate(i),
}));
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => island.querySelector('.island__bar').style.setProperty('--p', self.progress.toFixed(4)) });
ScrollTrigger.create({ trigger: '#accion', start: 'top 90%', onEnter: () => island.classList.add('is-visible'), onLeaveBack: () => island.classList.remove('is-visible') });

const setOpen = open => { island.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); };
toggle.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!island.contains(e.target)) setOpen(false); });
const goTo = i => {
  const y = chapterST[i].start + innerHeight * .55 + (chapters[i].id === 'portada' ? 0 : 1);
  lenis ? lenis.scrollTo(Math.max(0, y), { duration: 1.5 }) : scrollTo(0, Math.max(0, y));
};
links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); setOpen(false); goTo(i); }));
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key) || e.target.closest('input,textarea')) return;
  const tops = chapterST.map(st => st.start + innerHeight * .55);
  const y = scrollY + 4;
  let idx = tops.findLastIndex(t => t <= y + innerHeight * .3);
  const fwd = e.key === 'ArrowRight' || e.key === 'PageDown';
  const next = fwd ? idx + 1 : (y - tops[Math.max(0, idx)] > 40 ? idx : idx - 1);
  e.preventDefault();
  goTo(Math.max(0, Math.min(chapters.length - 1, next)));
});

// ── 4. Portada: ponerse las gafas
const visor = document.querySelector('.visor');
const clamp01 = v => Math.min(1, Math.max(0, v));
ScrollTrigger.create({
  trigger: '.cover', start: 'top top', end: 'bottom bottom',
  onUpdate: self => {
    const c = self.progress;
    scene?.set({ cover: c });
    if (reduced) return;
    // el velo sube cuando la lente ya cubre la pantalla y se va cuando la cámara sale al valle
    const on = clamp01((c - .6) / .1) * (1 - clamp01((c - .82) / .14));
    visor.style.opacity = on.toFixed(3);
    visor.style.visibility = on > .001 ? 'visible' : 'hidden';
  },
});
if (!reduced) {
  const st = { trigger: '.cover', start: 'top top', end: 'bottom bottom', scrub: true };
  gsap.timeline({ scrollTrigger: st })
    .to('.cover__copy', { y: -90, opacity: 0, ease: 'power1.in', duration: .24 }, .1)
    .to(['.cover__cue', '.cover__dest'], { opacity: 0, y: 20, duration: .12 }, 0)
    .to('.lockup', { opacity: 0, y: -30, duration: .2 }, .3)
    .to({}, { duration: .4 }, .6);
}
function spinZone(el) {
  let down = false, lx = 0, lt = 0;
  el.addEventListener('pointerdown', e => { down = true; lx = e.clientX; lt = performance.now(); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!down) return;
    const now = performance.now(), dt = Math.max(8, now - lt);
    scene?.spin((e.clientX - lx) / dt * 1.4); lx = e.clientX; lt = now;
  });
  const up = () => { down = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
document.querySelectorAll('[data-spin]').forEach(spinZone);

// ── 5. Titulares por líneas y frase palabra a palabra
function introTitles() {
  if (reduced) return;
  document.querySelectorAll('[data-split]').forEach(el => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 112, rotate: 2.5, transformOrigin: '0 100%', duration: 1.15, stagger: .1, ease: 'expo.out',
        scrollTrigger: el.closest('.cover') ? undefined : { trigger: el, start: 'top 86%' },
      }),
    });
  });
}
document.querySelectorAll('[data-words]').forEach(el => {
  const split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
  if (reduced) return;
  gsap.to(split.words, { opacity: 1, stagger: .5, ease: 'none', scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 50%', scrub: true } });
});

// ── 6. Entradas en curva (como un viraje): diagonales, con un leve giro que se endereza
if (!reduced) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: batch => gsap.to(batch, { opacity: 1, x: 0, y: 0, rotate: 0, duration: 1.05, stagger: .1, ease: 'expo.out', overwrite: true }),
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    const late = [...document.querySelectorAll('[data-reveal]')].filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, x: 0, y: 0, rotate: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });

  // La acción: la foto se abre como una ventana y la imagen se desplaza dentro
  gsap.fromTo('.accion__photo', { clipPath: 'inset(16% 14% 16% 14% round 40px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none',
    scrollTrigger: { trigger: '.accion__photo', start: 'top 95%', end: 'top 30%', scrub: true },
  });
  gsap.fromTo('.accion__photo img', { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.accion__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
}

// ── 7. Física de péndulo compartida: forfait y sillas del telesilla
const swing = (() => {
  const items = new Map(); // el → { th, w, k, c }
  return {
    add(el, k = 16, c = 1.5, max = 1.1) { items.set(el, { th: 0, w: 0, k, c, max, drag: null }); return items.get(el); },
    kick(el, w) { const s = items.get(el); if (s && !reduced) s.w += w; },
    get(el) { return items.get(el); },
    all: items,
    step(dt, accel = 0) {
      items.forEach((s, el) => {
        if (s.drag != null) { const prev = s.th; s.th += (s.drag - s.th) * (1 - Math.exp(-dt * 18)); s.w = (s.th - prev) / dt; }
        else {
          const a = -s.k * Math.sin(s.th) - s.c * s.w - (s.accelScale ?? 1) * accel;
          s.w += a * dt; s.th += s.w * dt;
        }
        s.th = Math.max(-s.max, Math.min(s.max, s.th));
        const deg = (s.th * 57.2958).toFixed(2);
        if (s.last !== deg) { el.style.transform = `rotate(${deg}deg)`; s.last = deg; s.onPaint?.(s.th); }
      });
    },
  };
})();

// Forfait: cuelga de su cordón, se arrastra y responde al cursor y al scroll
const pass = document.querySelector('[data-pass]');
const passSwing = pass.querySelector('.pass__swing');
const passCard = pass.querySelector('.pass__card');
const passState = swing.add(passSwing, 14, 1.1);
passState.onPaint = th => passCard.style.setProperty('--sx', `${50 + th * 120}%`);
passCard.addEventListener('pointermove', e => {
  const r = passCard.getBoundingClientRect();
  passCard.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
  passCard.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
});
if (!reduced) {
  const pivot = () => { const r = pass.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; };
  passSwing.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    passSwing.setPointerCapture(e.pointerId); passSwing.classList.add('is-drag');
    const p = pivot(); passState.drag = -Math.atan2(e.clientX - p.x, Math.max(40, e.clientY - p.y));
  });
  passSwing.addEventListener('pointermove', e => {
    if (passState.drag == null) { if (hover) passState.w += (e.movementX || 0) * .006; return; }
    const p = pivot(); passState.drag = -Math.atan2(e.clientX - p.x, Math.max(40, e.clientY - p.y));
  });
  const release = () => { passState.drag = null; passSwing.classList.remove('is-drag'); };
  passSwing.addEventListener('pointerup', release); passSwing.addEventListener('pointercancel', release);
}

// Sillas: se balancean con la aceleración del telesilla (el scroll horizontal) y al pasar el cursor
const chairs = [...document.querySelectorAll('.chair')];
chairs.forEach((ch, i) => {
  const s = swing.add(ch, 9 + (i % 3) * 1.4, 1.1, .42);
  s.accelScale = .9 + (i % 2) * .25;
  if (hover) ch.addEventListener('pointermove', e => { if (!reduced) s.w += (e.movementX || 0) * .004; });
});

// ── 8. El squad: el telesilla se mueve con el scroll (pin creado al principio, ver §3)
let liftX = 0, liftV = 0;

// Bucle de física (un solo ticker): velocidad del scroll → forfait; aceleración del telesilla → sillas
let lastScroll = scrollY;
gsap.ticker.add((time, deltaMs) => {
  if (reduced) return;
  const dt = Math.min(.05, deltaMs / 1000) || .016;
  const sv = (scrollY - lastScroll) / dt; lastScroll = scrollY;
  if (passState.drag == null) passState.w += Math.max(-.5, Math.min(.5, sv * .00025)) * dt * 60 * .1;
  const x = innerWidth > 760 ? gsap.getProperty(track, 'x') : -scrollY * .35;
  const v = (x - liftX) / dt; const acc = (v - liftV) / dt; liftX = x; liftV = v;
  // la aceleración se aplica a las sillas; el forfait no la siente
  const a = Math.max(-25, Math.min(25, acc * .0007));
  chairs.forEach(ch => { const s = swing.get(ch); if (s.drag == null) s.w += -a * s.accelScale * dt; });
  swing.step(dt);
});

// ── 9. Temporada: contador, reproductor de un solo vertical y perfil de altitud
const fmt = (v, dec) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const bigN = document.querySelector('[data-big]');
if (!reduced) {
  const o = { v: 0 }; bigN.textContent = fmt(0, 1);
  gsap.to(o, { v: parseFloat(bigN.dataset.big), duration: 2.4, ease: 'expo.out', scrollTrigger: { trigger: bigN, start: 'top 85%' }, onUpdate: () => { bigN.textContent = fmt(o.v, 1); } });
}

// Los tres reels pasan en el mismo teléfono, como historias. Datos de la propuesta original.
const REELS = [
  { handle: 'jugarciaok', n: 1.44, dec: 2, u: 'M', label: '1,44 M', views: 1.44 },
  { handle: 'gonzamaass', n: 1.03, dec: 2, u: 'M', label: '1,03 M', views: 1.03 },
  { handle: 'gonzamaass', n: 850, dec: 0, u: 'K', label: '850 K', views: .85 },
];
const player = (() => {
  const el = document.querySelector('[data-player]');
  const slides = [...el.querySelectorAll('.phone__slide')];
  const bars = [...el.querySelectorAll('.phone__stories i')];
  const q = s => el.querySelector(s);
  const DUR = 5.5;
  let idx = 0, t = 0, visible = false, shown = REELS[0].n;
  const counter = { v: REELS[0].n };
  function show(i, user = false) {
    idx = (i + REELS.length) % REELS.length; t = 0;
    const r = REELS[idx];
    slides.forEach((s, j) => s.classList.toggle('is-on', j === idx));
    q('.phone__handle').textContent = '@' + r.handle;
    q('.player__i').textContent = idx + 1;
    q('.player__u').textContent = r.u;
    const link = q('.player__link'); link.textContent = '@' + r.handle; link.href = `https://www.instagram.com/${r.handle}/`;
    document.querySelectorAll('.profile__flag').forEach((f, j) => f.classList.toggle('is-on', j === idx));
    const nEl = q('.player__n');
    if (reduced) { nEl.textContent = fmt(r.n, r.dec); return; }
    gsap.killTweensOf(counter);
    counter.v = REELS[(idx + REELS.length - 1) % REELS.length].u === r.u ? shown : 0;
    gsap.to(counter, { v: r.n, duration: 1.1, ease: 'expo.out', onUpdate: () => { nEl.textContent = fmt(counter.v, r.dec); } });
    shown = r.n;
    if (user) gsap.fromTo(q('.phone'), { scale: .97 }, { scale: 1, duration: .6, ease: 'back.out(2)' });
  }
  el.querySelectorAll('.phone__tap--prev,[data-dir="-1"]').forEach(b => b.addEventListener('click', () => show(idx - 1, true)));
  el.querySelectorAll('.phone__tap--next,[data-dir="1"]').forEach(b => b.addEventListener('click', () => show(idx + 1, true)));
  ScrollTrigger.create({ trigger: el, start: 'top 85%', end: 'bottom 15%', onToggle: s => { visible = s.isActive; } });
  gsap.ticker.add((time, deltaMs) => {
    if (!reduced && visible) { t += deltaMs / 1000 / DUR; if (t >= 1) show(idx + 1); }
    bars.forEach((b, j) => b.style.setProperty('--f', j < idx ? 1 : j > idx ? 0 : reduced ? 1 : Math.min(1, t).toFixed(3)));
  });
  return { show };
})();

// Perfil de la temporada: tres cumbres con altura proporcional a cada reel. Tocar una cumbre abre ese reel.
(() => {
  const vals = REELS.map(r => r.views);
  const max = Math.max(...vals), H = 200, top = 34, xs = [100, 300, 500];
  const peakY = v => H - (v / max) * (H - top);
  const valleys = [[0, H - 18], [200, H - 46], [400, H - 38], [600, H - 14]];
  const pts = [valleys[0]];
  xs.forEach((x, i) => {
    const L = valleys[i], R = valleys[i + 1], py = peakY(vals[i]);
    pts.push([L[0] + (x - L[0]) * .45, L[1] - (L[1] - py) * .38], [x - 8, py + 12], [x, py], [x + 14, py + 18], [x + (R[0] - x) * .55, R[1] - (R[1] - py) * .3], R);
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y.toFixed(1)}`).join('');
  const svg = document.querySelector('.profile__svg');
  svg.querySelector('.profile__line').setAttribute('d', line);
  svg.querySelector('.profile__fill').setAttribute('d', `${line}L600,${H}L0,${H}Z`);
  svg.querySelector('.profile__snow').setAttribute('d', xs.map((x, i) => {
    const py = peakY(vals[i]), d = 16;
    return `M${x - 8 - d * .55},${py + 12 + d * .6}L${x - 8},${py + 12}L${x},${py}L${x + 14},${py + 18}L${x + 14 + d * .45},${py + 18 + d * .7}L${x + 4},${py + 20}L${x - 4},${py + 26}Z`;
  }).join(''));
  const flags = document.querySelector('.profile__flags');
  xs.forEach((x, i) => {
    const f = document.createElement('button'); f.type = 'button'; f.className = 'profile__flag' + (i ? '' : ' is-on');
    f.textContent = REELS[i].label; f.setAttribute('aria-label', `Ver el reel de ${REELS[i].label}`);
    f.style.left = `${x / 6}%`; f.style.top = `${peakY(vals[i]) / H * 100}%`;
    f.addEventListener('click', () => player.show(i, true));
    flags.append(f);
  });
  if (reduced) return;
  const path = svg.querySelector('.profile__line'), len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(['.profile__fill', '.profile__snow', flags], { opacity: 0 });
  gsap.set('.profile__flag', { xPercent: -50, yPercent: -100, x: 0, y: 10 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.profile', start: 'top 85%' } });
  tl.to(path, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' })
    .to('.profile__fill', { opacity: 1, duration: .8 }, .8)
    .to('.profile__snow', { opacity: 1, duration: .6 }, 1.1)
    .to(flags, { opacity: 1, duration: .4 }, 1.1)
    .to('.profile__flag', { y: 0, stagger: .14, duration: .7, ease: 'back.out(1.8)' }, 1.1);
})();

// ── 10. Teléfonos con inclinación al cursor (nunca imprescindible)
if (!reduced && hover) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: .7, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: .7, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - .5) * 16); rx(-((e.clientY - r.top) / r.height - .5) * 16);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

// ── 11. Cierre: ¡Nos vamos! → ventisca y vuelta de gafas. Botón magnético.
ScrollTrigger.create({ trigger: '.cierre__photo', start: 'top 45%', end: 'bottom 55%', onToggle: s => scene?.set({ photo: s.isActive }) });
const go = document.querySelector('[data-go]');
const reply = document.querySelector('.cierre__reply');
const replies = ['Pues a encerar las tablas.', 'Te esperamos en la nieve.', 'Seis creadores, listos para subir.'];
let nReply = 0;
go.addEventListener('click', () => {
  scene?.burst();
  reply.textContent = replies[nReply++ % replies.length];
  if (!reduced) gsap.fromTo(reply, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out' });
});
if (!reduced && hover) {
  const gx = gsap.quickTo(go, 'x', { duration: .6, ease: 'power3' }), gy = gsap.quickTo(go, 'y', { duration: .6, ease: 'power3' });
  go.addEventListener('pointermove', e => { const r = go.getBoundingClientRect(); gx((e.clientX - r.left - r.width / 2) * .3); gy((e.clientY - r.top - r.height / 2) * .4); });
  go.addEventListener('pointerleave', () => { gx(0); gy(0); });
}

// ── 12. Arranque cuando el loader llega al 100 %
document.addEventListener('deck:ready', () => {
  lenis?.start();
  introTitles();
  ScrollTrigger.refresh();
  activate(Math.max(0, chapterST.findIndex(st => st.isActive)));
}, { once: true });
