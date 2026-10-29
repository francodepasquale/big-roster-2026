// Guía del kit BIG España, en formato app: vistas por sección (hash), asistentes de pasos con progreso,
// símbolo BIG en 3D en la portada, liquid glass con reflejo que sigue al cursor y descargas cifradas.
import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const main = document.getElementById('main');

// ── Sistema operativo
const isWin = /Win/i.test(navigator.userAgentData?.platform || navigator.platform || '');
function setOS(os) {
  root.dataset.os = os;
  document.querySelectorAll('.os__btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.os === os));
  try { localStorage.setItem('guia-os', os); } catch {}
}
setOS((() => { try { return localStorage.getItem('guia-os'); } catch { return null; } })() || (isWin ? 'win' : 'mac'));
document.querySelectorAll('.os__btn').forEach(b => b.addEventListener('click', () => setOS(b.dataset.os)));

// ── Copiar al portapapeles
document.querySelectorAll('.copy').forEach(btn => {
  btn.setAttribute('aria-label', 'Copiar');
  btn.addEventListener('click', async () => {
    const text = btn.parentElement.querySelector('code').innerText.trim();
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    btn.textContent = 'Copiado'; btn.classList.add('is-done');
    setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('is-done'); }, 1800);
  });
});

// ── Progreso guardado en este navegador
const store = (() => { try { return JSON.parse(localStorage.getItem('guia-progreso') || '{}'); } catch { return {}; } })();
const save = () => { try { localStorage.setItem('guia-progreso', JSON.stringify(store)); } catch {} };
function paintProgress(id, total) {
  const done = (store[id] || []).length;
  document.querySelectorAll(`[data-progress="${id}"]`).forEach(el => { el.textContent = `${done}/${total}`; el.classList.toggle('is-done', done === total); });
  document.querySelectorAll(`[data-progress-text="${id}"]`).forEach(el => { el.textContent = done === total ? 'Completo' : `${done} de ${total} pasos`; });
  document.querySelectorAll(`[data-meter="${id}"]`).forEach(el => { el.style.width = (done / total * 100) + '%'; });
}

// ── Asistentes: lista de pasos a la izquierda, un paso a la vez a la derecha
document.querySelectorAll('[data-wizard]').forEach(wiz => {
  const id = wiz.dataset.wizard;
  const steps = [...wiz.querySelectorAll('.step')];
  store[id] = (store[id] || []).filter(n => n < steps.length);

  const list = document.createElement('ol'); list.className = 'wizard__list'; list.setAttribute('role', 'tablist');
  const panel = document.createElement('div'); panel.className = 'wizard__panel card';
  steps.forEach(s => panel.append(s));
  const foot = document.createElement('div'); foot.className = 'wizard__foot';
  foot.innerHTML = `<button class="btn" data-prev>← Anterior</button><span class="spacer"></span>
    <button class="wizard__done" aria-pressed="false"><i aria-hidden="true"></i>Hecho</button>
    <button class="btn btn--accent" data-next>Siguiente →</button>`;
  panel.append(foot);
  wiz.append(list, panel);

  const buttons = steps.map((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button role="tab" aria-selected="false"><span class="wizard__n">${i + 1}</span><span>${s.dataset.step}</span></button>`;
    list.append(li); return li.querySelector('button');
  });
  const done = foot.querySelector('.wizard__done'), prev = foot.querySelector('[data-prev]'), next = foot.querySelector('[data-next]');
  let current = 0;
  function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, j) => s.classList.toggle('is-active', j === current));
    buttons.forEach((b, j) => { b.setAttribute('aria-selected', j === current); b.classList.toggle('is-done', store[id].includes(j)); });
    done.setAttribute('aria-pressed', store[id].includes(current));
    prev.style.visibility = current === 0 ? 'hidden' : 'visible';
    next.textContent = current === steps.length - 1 ? 'Terminar ✓' : 'Siguiente →';
    paintProgress(id, steps.length);
  }
  function mark(i, value) {
    const set = new Set(store[id]); value ? set.add(i) : set.delete(i);
    store[id] = [...set].sort((a, b) => a - b); save();
  }
  buttons.forEach((b, i) => b.addEventListener('click', () => show(i)));
  done.addEventListener('click', () => { mark(current, !store[id].includes(current)); show(current); });
  prev.addEventListener('click', () => { show(current - 1); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  next.addEventListener('click', () => {
    mark(current, true);
    if (current < steps.length - 1) show(current + 1); else show(current);
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  // Abrir en el primer paso pendiente
  show(Math.max(0, [...steps.keys()].find(i => !store[id].includes(i)) ?? 0));
});

// ── Vistas (navegación por #hash)
const views = [...document.querySelectorAll('.view')];
const navLinks = [...document.querySelectorAll('.nav a')];
let scene = null;
function route() {
  const id = (location.hash || '#inicio').slice(1);
  const view = views.find(v => v.id === id) || views[0];
  views.forEach(v => v.classList.toggle('is-active', v === view));
  navLinks.forEach(a => a.dataset.view === view.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.title = `${view.dataset.title} · Kit BIG España`;
  main.scrollTo({ top: 0 }); scrollTo({ top: 0 });
  scene?.show(view.id === 'inicio');
}
addEventListener('hashchange', route);

// ── Reflejo especular del vidrio: sigue al cursor en cada tarjeta
if (!reduced && matchMedia('(hover: hover)').matches) {
  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.card'); if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

// ── Descargas. En la versión publicada con contraseña cada archivo está cifrado (descargas/<archivo>.cifrado:
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
  link.setAttribute('aria-busy', 'true'); link.textContent = 'Preparando…';
  try {
    const hk = await crypto.subtle.importKey('raw', unhex(clave).slice(0, 32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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

// ── Símbolo BIG en 3D dentro de la tarjeta de portada
function createScene(canvas) {
  const box = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100); camera.position.z = 9;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7e8cff, 1.8); rim.position.set(-5, -2, -4); scene.add(rim);

  const d = document.getElementById('big-path').getAttribute('d');
  const shapes = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths.flatMap(p => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 90, bevelEnabled: true, bevelSize: 10, bevelThickness: 12, bevelSegments: 6, curveSegments: 24 });
  geo.center(); geo.rotateX(Math.PI); geo.scale(.0068, .0068, .0068);
  // Protagonista: naranja BIG brillante. Copias pequeñas de vidrio alrededor (transmisión = liquid glass en 3D).
  const hero = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xff761e, roughness: .28, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .8 }));
  scene.add(hero);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xfff1e6, metalness: 0, roughness: .06, transparent: true, opacity: .42, clearcoat: 1, clearcoatRoughness: .05, iridescence: .7, iridescenceIOR: 1.3, envMapIntensity: 1.6, depthWrite: false });
  const COUNT = reduced ? 4 : 9;
  const minis = new THREE.InstancedMesh(geo, glass, COUNT); scene.add(minis);
  const seeds = Array.from({ length: COUNT }, (_, i) => ({ a: i / COUNT * Math.PI * 2, r: 2.2 + (i % 3) * .5, y: (Math.random() - .5) * 3, s: .22 + Math.random() * .14, v: .12 + Math.random() * .12 }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

  const state = { px: 0, py: 0 }, smooth = { px: 0, py: 0 };
  addEventListener('pointermove', ev => { state.px = ev.clientX / innerWidth - .5; state.py = ev.clientY / innerHeight - .5; }, { passive: true });
  function resize() {
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box); resize();

  const clock = new THREE.Clock(); let raf = 0, running = true, visible = true;
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function frame() {
    raf = 0; if (!running || !visible) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    smooth.px = damp(smooth.px, state.px, 3, dt); smooth.py = damp(smooth.py, state.py, 3, dt);
    hero.rotation.y = -.5 + (reduced ? 0 : Math.sin(t * .45) * .35) + smooth.px * .8;
    hero.rotation.x = .1 + smooth.py * .35;
    hero.position.y = reduced ? 0 : Math.sin(t * .8) * .08;
    hero.position.x = box.clientWidth < 500 ? 0 : .6;
    seeds.forEach((d, i) => {
      const a = d.a + t * d.v * (reduced ? 0 : 1);
      p.set(Math.cos(a) * d.r, d.y + Math.sin(t * .6 + i) * .15, Math.sin(a) * d.r * .7 - .5);
      e.set(t * d.v, a, .3); q.setFromEuler(e); s.setScalar(d.s);
      minis.setMatrixAt(i, m.compose(p, q, s));
    });
    minis.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (running && visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', () => { running = !document.hidden; wake(); });
  const ready = new Promise(res => requestAnimationFrame(() => { resize(); renderer.compile(scene, camera); renderer.render(scene, camera); res(); }));
  raf = requestAnimationFrame(frame);
  return { ready, show(v) { visible = v; if (v) { resize(); wake(); } } };
}
try { scene = createScene(document.getElementById('stage')); window.guideLoading?.track('escena', scene.ready); }
catch (err) { console.warn('Sin WebGL', err); window.guideLoading?.track('escena', Promise.resolve()); }

route();
document.addEventListener('guide:ready', () => route(), { once: true });
