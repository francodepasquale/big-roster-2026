// Cargador: la cuenta regresiva del comienzo de una película (5, 4, 3, 2, 1), con barrido, grano, rayas,
// polvo, parpadeo y la tira de película corriendo a los costados. Es real: el número solo baja cuando terminó
// de cargar su parte (fotos, fuentes, videos y la sala 3D). Cada número dura al menos un barrido.
// Otras partes suman tareas con window.deckLoading.track('nombre', promesa).
(() => {
  const root = document.documentElement;
  const overlay = document.getElementById('loader');
  const frameEl = overlay.querySelector('.leader__frame');
  const sweep = overlay.querySelector('.leader__sweep');
  const numEl = document.getElementById('load-number');
  const pctEl = document.getElementById('load-pct');
  const bar = overlay.querySelector('[role="progressbar"]');
  const fx = overlay.querySelector('.leader__fx');
  const g = fx.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const urls = [...new Set([...document.images].map(img => img.currentSrc || img.src).filter(Boolean))];
  const tasks = new Map([...urls, 'fuentes', 'escena'].map(k => [k, false]));
  let target = 0, value = 0, last = performance.now(), done = false, closing = false, shownNum = 5;
  const PER_NUMBER = reduced ? .25 : .8; // segundos mínimos por número

  // grano, rayas y polvo dibujados a 24 cuadros por segundo
  const noise = document.createElement('canvas'); noise.width = 200; noise.height = 120;
  const ng = noise.getContext('2d'), nid = ng.createImageData(200, 120);
  let scratches = [], fxLast = 0;
  function sizeFx() { fx.width = Math.round(innerWidth / 2); fx.height = Math.round(innerHeight / 2); }
  sizeFx(); addEventListener('resize', sizeFx);
  function drawFx(now) {
    if (now - fxLast < 41) return; fxLast = now;
    for (let i = 0; i < nid.data.length; i += 4) { const v = Math.random() * 255; nid.data[i] = nid.data[i + 1] = nid.data[i + 2] = v; nid.data[i + 3] = 46; }
    ng.putImageData(nid, 0, 0);
    g.clearRect(0, 0, fx.width, fx.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(noise, 0, 0, fx.width, fx.height);
    if (Math.random() < .3) scratches.push({ x: Math.random() * fx.width, life: 2 + Math.random() * 6, a: .15 + Math.random() * .35, w: Math.random() < .2 ? 2 : 1 });
    scratches = scratches.filter(s => s.life-- > 0);
    scratches.forEach(s => { g.fillStyle = `rgba(20,18,16,${s.a})`; g.fillRect(s.x + (Math.random() - .5) * 2, 0, s.w, fx.height); });
    for (let i = 0; i < 3; i++) if (Math.random() < .35) {
      g.fillStyle = Math.random() < .7 ? 'rgba(15,13,12,.55)' : 'rgba(255,252,240,.5)';
      g.beginPath(); g.ellipse(Math.random() * fx.width, Math.random() * fx.height, 1 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, Math.PI * 2); g.fill();
    }
    // parpadeo y vaivén de la ventanilla del proyector
    frameEl.style.filter = `brightness(${(.9 + Math.random() * .14).toFixed(3)})`;
    frameEl.style.transform = `translate(${((Math.random() - .5) * 3).toFixed(1)}px,${((Math.random() - .5) * 2).toFixed(1)}px)`;
  }

  function release() {
    if (done) return; done = true;
    clearTimeout(window.deckFallback);
    root.classList.remove('is-loading');
    overlay.hidden = true;
    document.dispatchEvent(new Event('deck:ready'));
  }
  // Después del 1: destello blanco, un instante de negro y empieza la película
  function close() {
    if (closing) return; closing = true;
    if (reduced) { root.classList.remove('is-loading'); document.dispatchEvent(new Event('deck:reveal')); return release(); }
    overlay.classList.add('is-flash');
    setTimeout(() => { overlay.classList.add('is-black'); }, 140);
    setTimeout(() => { root.classList.remove('is-loading'); overlay.classList.add('is-leaving'); document.dispatchEvent(new Event('deck:reveal')); }, 520);
    setTimeout(release, 1500);
  }

  function tick(now) {
    if (done) return;
    requestAnimationFrame(tick);
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    // el valor persigue al objetivo, pero nunca más rápido que un número por barrido
    const maxStep = 20 / PER_NUMBER * dt;
    value = Math.min(target, value + Math.min(maxStep, Math.max(.02, (target - value) * .12)));
    const n = Math.max(1, 5 - Math.floor(Math.min(value, 99.999) / 20));
    const angle = value >= 100 ? 360 : (value % 20) / 20 * 360;
    sweep.style.setProperty('--a', angle.toFixed(1) + 'deg');
    if (n !== shownNum) { shownNum = n; numEl.textContent = n; }
    const pct = Math.floor(value);
    if (pctEl.textContent !== String(pct)) { pctEl.textContent = pct; bar.setAttribute('aria-valuenow', pct); }
    if (!reduced) drawFx(now);
    if (value >= 100 && !closing) setTimeout(close, 180);
  }
  requestAnimationFrame(tick);
  if (reduced) drawFx(performance.now() + 100);

  function settle(key) {
    if (tasks.get(key) || done) return;
    tasks.set(key, true);
    target = Math.floor([...tasks.values()].filter(Boolean).length / tasks.size * 100);
  }
  function track(key, promise) {
    if (!tasks.has(key)) tasks.set(key, false);
    Promise.resolve(promise).then(() => settle(key), () => settle(key)); // un fallo también cuenta: hay plan B
    return promise;
  }
  window.deckLoading = { track };

  urls.forEach(url => track(url, new Promise((ok, ko) => {
    const img = new Image(); img.onload = () => (img.decode ? img.decode().then(ok, ok) : ok()); img.onerror = ko; img.src = url;
  })));
  track('fuentes', Promise.all(['900 40px Archivo', '40px Damion', '40px Graduate', '800 40px Inter'].map(f => document.fonts.load(f))).then(() => document.fonts.ready));
  // Si app.js no llega a avisar de la escena (sin WebGL, error…), la damos por resuelta.
  setTimeout(() => settle('escena'), 12000);
})();
