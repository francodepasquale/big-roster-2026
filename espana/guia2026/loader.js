// Loader real 0–100 %: el número solo avanza cuando termina trabajo de verdad
// (cada imagen, las fuentes y la escena 3D). Nada de porcentajes falsos.
// Otras partes pueden sumar tareas con window.guideLoading.track('nombre', promesa).
(() => {
  const root = document.documentElement;
  const overlay = document.getElementById('loader');
  const number = document.getElementById('load-number');
  const bar = overlay.querySelector('[role="progressbar"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const urls = [...new Set([...document.images].map(img => img.currentSrc || img.src).filter(Boolean))];
  const tasks = new Map([...urls, 'fuentes', 'escena'].map(k => [k, false]));
  let target = 0, value = 0, last = performance.now(), frame = 0, closing = false, done = false;

  function release() {
    if (done) return; done = true;
    clearTimeout(window.guideFallback);
    root.classList.remove('is-loading');
    overlay.hidden = true;
    document.dispatchEvent(new Event('guide:ready'));
  }
  function close() {
    if (closing) return; closing = true;
    setTimeout(() => {
      if (reduced) return release();
      overlay.classList.add('is-leaving');
      overlay.addEventListener('transitionend', release, { once: true });
      setTimeout(release, 1300);
    }, reduced ? 0 : 220); // deja ver el 100 un instante
  }
  // El número persigue al objetivo con una curva exponencial: sube suave, nunca a saltos.
  function paint(now) {
    frame = 0;
    const dt = Math.max(0, now - last); last = now;
    value += (target - value) * (1 - Math.exp(-dt / 110));
    if (target - value < .2) value = target;
    const pct = Math.floor(value);
    if (number.textContent !== String(pct)) { number.textContent = pct; bar.setAttribute('aria-valuenow', pct); }
    if (pct === 100) close(); else if (value < target) frame = requestAnimationFrame(paint);
  }
  function settle(key) {
    if (tasks.get(key) || done) return;
    tasks.set(key, true);
    target = Math.floor([...tasks.values()].filter(Boolean).length / tasks.size * 100);
    if (!frame) { last = performance.now(); frame = requestAnimationFrame(paint); }
  }
  function track(key, promise) {
    if (!tasks.has(key)) tasks.set(key, false);
    Promise.resolve(promise).then(() => settle(key), () => settle(key)); // un fallo también cuenta: hay plan B
    return promise;
  }
  window.guideLoading = { track };

  urls.forEach(url => track(url, new Promise((ok, ko) => {
    const img = new Image(); img.onload = () => img.decode().then(ok, ok); img.onerror = ko; img.src = url;
  })));
  track('fuentes', document.fonts.load('800 40px Inter').then(() => document.fonts.ready));
  // Si app.js no llega a avisar de la escena (sin WebGL, error…), la damos por resuelta.
  setTimeout(() => settle('escena'), 9000);
})();
