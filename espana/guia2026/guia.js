// Guía del kit BIG España: escena 3D con el símbolo BIG extruido, scroll suave, revelados, isla y utilidades.
import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const { gsap, ScrollTrigger, Lenis } = window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');
gsap.registerPlugin(ScrollTrigger);

// ── Sistema operativo (cambia los comandos de Mac/Windows)
const isWin = /Win/i.test(navigator.userAgentData?.platform || navigator.platform || '');
function setOS(os) {
  root.dataset.os = os;
  document.querySelectorAll('.os__btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.os === os));
  ScrollTrigger.refresh();
}
setOS(isWin ? 'win' : 'mac');
document.querySelectorAll('.os__btn').forEach(b => b.addEventListener('click', () => setOS(b.dataset.os)));

// ── Copiar al portapapeles
document.querySelectorAll('.copy').forEach(btn => btn.addEventListener('click', async () => {
  const text = btn.parentElement.querySelector('code').innerText.trim();
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  btn.textContent = 'Copiado'; btn.classList.add('is-done');
  setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('is-done'); }, 1800);
}));

// ── Descargas. En la versión publicada con contraseña, cada archivo está cifrado (descargas/<archivo>.cifrado:
// 16 bytes de IV + AES-256-CTR). La clave sale de la que se escribió al entrar (la guarda la pantalla de clave).
const LLAVE = 'big-clave:' + location.pathname.replace(/[^/]*$/, '');
const clave = (() => { try { return localStorage.getItem(LLAVE) || sessionStorage.getItem(LLAVE); } catch { return null; } })();
const cifrado = !!clave;
const unhex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const tamano = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.round(n / 1e3) + ' KB';

document.querySelectorAll('[data-size]').forEach(async el => {
  try {
    const r = await fetch('descargas/' + el.dataset.size + (cifrado ? '.cifrado' : ''), { method: 'HEAD' });
    const n = +r.headers.get('content-length') - (cifrado ? 16 : 0);
    if (n > 0) el.textContent = tamano(n);
  } catch {}
});

async function descargarCifrado(link) {
  const nombre = link.getAttribute('href').split('/').pop();
  const original = link.innerHTML;
  link.setAttribute('aria-busy', 'true'); link.textContent = 'Preparando descarga…';
  try {
    const bits = unhex(clave);
    const hk = await crypto.subtle.importKey('raw', bits.slice(0, 32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const k = await crypto.subtle.sign('HMAC', hk, new TextEncoder().encode('descargas'));
    const aes = await crypto.subtle.importKey('raw', k, 'AES-CTR', false, ['decrypt']);
    const buf = new Uint8Array(await (await fetch('descargas/' + nombre + '.cifrado')).arrayBuffer());
    const plano = await crypto.subtle.decrypt({ name: 'AES-CTR', counter: buf.slice(0, 16), length: 64 }, aes, buf.slice(16));
    const url = URL.createObjectURL(new Blob([plano]));
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error(err); alert('No se pudo descargar. Recarga la página y vuelve a intentarlo.');
  } finally { link.innerHTML = original; link.removeAttribute('aria-busy'); }
}
if (cifrado) document.querySelectorAll('a[href^="descargas/"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); descargarCifrado(a); }));

// ── Escena 3D: el símbolo BIG en volumen, girando con el scroll, rodeado de pequeñas copias
function createScene(canvas) {
  const mobile = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // respeta mejor los colores de marca
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xfffbdf, 0x33419a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7e8cff, 2); rim.position.set(-5, -2, -4); scene.add(rim);

  const d = document.getElementById('big-path').getAttribute('d');
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = svg.paths.flatMap(p => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 90, bevelEnabled: true, bevelSize: 10, bevelThickness: 12, bevelSegments: 6, curveSegments: 24 });
  geo.center(); geo.rotateX(Math.PI); geo.scale(.0062, .0062, .0062); // el SVG crece hacia abajo: lo giramos (sin espejar, para no invertir las caras)

  const hero = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xff761e, roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .7 }));
  scene.add(hero);

  const COUNT = reduced ? 10 : mobile ? 12 : 34;
  const minis = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ roughness: .35, clearcoat: .7 }), COUNT);
  const palette = [0xfffbdf, 0x33419a, 0xff761e, 0xe8f29c, 0x7e3f98].map(c => new THREE.Color(c));
  const seeds = Array.from({ length: COUNT }, (_, i) => ({ r: 1.6 + Math.random() * 2.4, a: Math.random() * 6.28, y: (Math.random() - .5) * 5, s: .12 + Math.random() * .16, v: .08 + Math.random() * .22, z: (mobile ? -3 : -1) - Math.random() * 3 }));
  seeds.forEach((_, i) => minis.setColorAt(i, palette[i % palette.length]));
  scene.add(minis);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

  const state = { cover: 0, page: 0, px: 0, py: 0 }, smooth = { ...state };
  addEventListener('pointermove', ev => { state.px = ev.clientX / innerWidth - .5; state.py = ev.clientY / innerHeight - .5; }, { passive: true });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.position.z = innerWidth < 760 ? 13 : 10; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock(); let raf = 0, running = true, visible = true;
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function frame() {
    raf = 0; if (!running || !visible) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    for (const k in smooth) smooth[k] = damp(smooth[k], state[k], k.length > 2 ? 6 : 3, dt);
    const c = smooth.cover, narrow = innerWidth < 760;
    hero.position.set(narrow ? 1.3 : THREE.MathUtils.lerp(2.5, 3.3, c), narrow ? THREE.MathUtils.lerp(-3.4, -2.4, c) : THREE.MathUtils.lerp(.1, .5, c), 0);
    hero.rotation.y = -.45 + (reduced ? 0 : Math.sin(t * .5) * .18) + c * Math.PI * 2 + smooth.px * .6;
    hero.rotation.x = .12 + smooth.py * .3;
    hero.scale.setScalar((narrow ? .7 : 1) * THREE.MathUtils.lerp(1, .82, c));
    seeds.forEach((d, i) => {
      const a = d.a + t * d.v * (reduced ? 0 : 1) + c * 1.5;
      p.set(hero.position.x * .85 + Math.cos(a) * d.r, d.y + Math.sin(t * d.v * 2 + i) * .2 - c * 1.5, d.z + Math.sin(a) * 1.2);
      e.set(t * d.v, a + t * d.v, 0); q.setFromEuler(e); s.setScalar(d.s);
      minis.setMatrixAt(i, m.compose(p, q, s));
    });
    minis.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } });
  const ready = new Promise(res => requestAnimationFrame(() => { renderer.compile(scene, camera); renderer.render(scene, camera); res(); }));
  raf = requestAnimationFrame(frame);
  return { ready, set: v => Object.assign(state, v), show(v) { visible = v; if (v && running && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } } };
}

let scene = null;
try { scene = createScene(document.getElementById('stage')); window.guideLoading?.track('escena', scene.ready); }
catch (err) { console.warn('Sin WebGL', err); window.guideLoading?.track('escena', Promise.resolve()); }

// ── Scroll suave
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
// Enlaces internos con scroll suave
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault(); setOpen(false);
  lenis ? lenis.scrollTo(target, { duration: 1.4 }) : target.scrollIntoView();
}));

ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => { scene?.set({ page: self.progress }); document.querySelector('.island__bar').style.setProperty('--p', self.progress.toFixed(4)); } });
ScrollTrigger.create({ trigger: '.cover', start: 'top top', end: 'bottom bottom', onUpdate: self => scene?.set({ cover: self.progress }) });
// Los bloques de color tapan el lienzo: fuera de la portada dejamos de pintar (batería y fluidez)
ScrollTrigger.create({ trigger: '.cover', start: 'top bottom', end: 'bottom top', onToggle: self => scene?.show(self.isActive) });

if (!reduced) {
  gsap.to('.cover__backtype', { xPercent: -25, ease: 'none', scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.cover__sticky > :not(.lockup):not(.cover__backtype)', { yPercent: -30, opacity: 0, ease: 'none', stagger: .04, scrollTrigger: { trigger: '.cover', start: '30% top', end: '75% top', scrub: true } });
}

// Títulos por líneas: partimos por <br> (sin dependencias) y cada línea sube desde una máscara
document.querySelectorAll('[data-split]').forEach(el => {
  el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="split-line" style="display:block"><span style="display:inline-block">${l.trim()}</span></span>`).join('');
  if (reduced) return;
  gsap.from(el.querySelectorAll('.split-line > span'), { yPercent: 110, duration: 1.1, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
});
if (!reduced) {
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, stagger: .1, ease: 'expo.out', overwrite: true }) });

  // Red de seguridad: tras un salto brusco (ancla, enlace con #), revela lo que ya quedó a la vista
  ScrollTrigger.addEventListener('scrollEnd', () => {
    const late = [...document.querySelectorAll('[data-reveal]')].filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * .9);
    if (late.length) gsap.to(late, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'expo.out', overwrite: true });
  });
}

// Tilt de las tarjetas de decks
if (!reduced && matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(card, 'rotationY', { duration: .6, ease: 'power3' });
    card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 10); rx(-((e.clientY - r.top) / r.height - .5) * 10); });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

// ── Isla
const island = document.querySelector('.island'), list = document.getElementById('island-list');
const toggle = island.querySelector('.island__toggle'), current = island.querySelector('.island__current');
const chapters = [...document.querySelectorAll('[data-chapter]')];
chapters.forEach((sec, i) => { const li = document.createElement('li'); li.innerHTML = `<a href="#${sec.id}"><span>${String(i + 1).padStart(2, '0')}</span>${sec.dataset.chapter}</a>`; list.append(li); });
const links = [...list.querySelectorAll('a')];
function setOpen(open) { island.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); }
toggle.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', e => { if (!island.contains(e.target)) setOpen(false); });
links.forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); setOpen(false);
  const t = document.querySelector(a.getAttribute('href')); lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView();
}));
chapters.forEach((sec, i) => ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: self => { if (!self.isActive) return; current.textContent = sec.dataset.chapter; links.forEach((a, j) => a.setAttribute('aria-current', i === j)); } }));
ScrollTrigger.create({ trigger: '#estilo', start: 'top 90%', onEnter: () => island.classList.add('is-visible'), onLeaveBack: () => island.classList.remove('is-visible') });

// ── Arranque: la portada entra cuando el loader llega a 100
document.addEventListener('guide:ready', () => {
  lenis?.start();
  if (!reduced) {
    gsap.from('.cover__title .line > span', { yPercent: 110, duration: 1.2, stagger: .1, ease: 'expo.out' });
    gsap.from(['.cover__kicker', '.cover__sub', '.cover__actions', '.lockup'], { opacity: 0, y: 24, duration: 1, stagger: .08, delay: .25, ease: 'expo.out' });
  }
  ScrollTrigger.refresh();
  if (location.hash) { const t = document.querySelector(location.hash); t && setTimeout(() => (lenis ? lenis.scrollTo(t, { immediate: true }) : t.scrollIntoView()), 50); }
}, { once: true });
