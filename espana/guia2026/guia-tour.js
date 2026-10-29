// Tours guiados de los decks de referencia.
// Modo «Recorrido»: el deck real corre en un iframe (mismo dominio) a 1280×800 escalado; un foco ilumina
// la zona de cada paso y oscurece el resto, siguiendo al elemento cuadro a cuadro.
// Modo «Evolución»: línea de tiempo con las iteraciones reales, de la primera idea al diseño final.
// Datos: <script type="application/json" id="tour-data-<id>"> (dentro del HTML, para que vayan cifrados al publicar).

const VW = 1280, VH = 800;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ease = t => 1 - Math.pow(1 - t, 3);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function copyButton(text) {
  return `<div class="code code--prompt"><code>${esc(text)}</code><button class="copy" aria-label="Copiar prompt">Copiar</button></div>`;
}
function wireCopy(root) {
  root.querySelectorAll('.copy:not([data-wired])').forEach(btn => {
    btn.dataset.wired = '1';
    btn.addEventListener('click', async () => {
      const t = btn.parentElement.querySelector('code').innerText.trim();
      try { await navigator.clipboard.writeText(t); } catch {}
      btn.textContent = 'Copiado'; btn.classList.add('is-done');
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('is-done'); }, 1600);
    });
  });
}

class Tour {
  constructor(view) {
    this.view = view;
    this.id = view.dataset.tour;
    const raw = document.getElementById('tour-data-' + this.id);
    this.data = raw ? JSON.parse(raw.textContent) : null;
    this.i = 0; this.mode = 'recorrido'; this.built = false; this.raf = 0;
  }

  build() {
    if (this.built) return; this.built = true;
    const d = this.data;
    if (!d) { this.view.innerHTML = '<div class="card"><p class="muted">Este tour todavía no tiene contenido.</p></div>'; return; }
    this.view.innerHTML = `
      <header class="tour__head">
        <div><p class="eyebrow">Tour guiado</p><h1>${esc(d.titulo)}</h1></div>
        <div class="seg" role="tablist" aria-label="Modo del tour">
          <button role="tab" aria-selected="true" data-mode="recorrido">Recorrido</button>
          <button role="tab" aria-selected="false" data-mode="evolucion">Cómo evolucionó</button>
        </div>
      </header>

      <div class="tour__mode" data-panel="recorrido">
        <div class="tour">
          <div class="stage card">
            <div class="stage__bar">
              <span class="url-demo__dots"><i></i><i></i><i></i></span>
              <span class="stage__url">roster.bigagency.com.ar${esc(this.view.dataset.src)}</span>
              <span class="step-panel__count"></span>
              <div class="dots" role="tablist" aria-label="Pasos"></div>
              <a class="stage__open" href="${esc(this.view.dataset.src)}" target="_blank" rel="noopener">Abrir ↗</a>
            </div>
            <div class="stage__viewport">
              <div class="stage__scaler" style="width:${VW}px;height:${VH}px">
                <iframe title="${esc(d.titulo)}" data-src="${esc(this.view.dataset.src)}"></iframe>
                <div class="spot" aria-hidden="true"><span class="spot__n"></span></div>
                <div class="stage__wait"><span></span>Cargando el deck…</div>
              </div>
              <div class="intro-overlay">
                <div class="intro-overlay__box">
                  <p class="eyebrow">Tour guiado · ${d.pasos.length} pasos</p>
                  <h2>Recorre el deck por dentro.</h2>
                  <p class="muted">Vamos zona por zona: qué es cada cosa, cómo se hizo y el prompt para lograr algo así.</p>
                  <button class="btn btn--accent btn--big" data-start>Empezar el recorrido →</button>
                  <ul class="intro-overlay__hints">
                    <li><kbd>←</kbd><kbd>→</kbd> o el botón <b>Siguiente</b> para avanzar</li>
                    <li>Cierra el globo con <b>×</b> para tocar el deck libremente</li>
                    <li>En <b>Cómo evolucionó</b> ves la idea desde el primer boceto</li>
                  </ul>
                </div>
              </div>
              <button class="resume" data-resume hidden>▶ Seguir el recorrido</button>
              <div class="tip-pop" role="dialog" aria-label="Paso actual">
                <span class="tip-pop__arrow"></span>
                <div class="tip-pop__head"><span class="tip-pop__n"></span><button class="tip-pop__close" aria-label="Ocultar tooltip">×</button></div>
                <b class="tip-pop__title"></b>
                <div class="tip-pop__tabs" role="tablist"></div>
                <div class="tip-pop__body" aria-live="polite"></div>
                <div class="tip-pop__nav"><button class="btn" data-tprev aria-label="Paso anterior">←</button><button class="btn btn--accent" data-tnext>Siguiente →</button></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="tour__mode" data-panel="evolucion" hidden>
        <p class="muted evo__intro">${esc(d.resumen)}</p>
        <div class="evo card">
          <div class="evo__view">
            <figure class="evo__shot"><img alt=""><figcaption class="evo__empty"></figcaption></figure>
            <div class="evo__text"></div>
          </div>
          <div class="evo__track" role="tablist" aria-label="Iteraciones"><span class="evo__line"><i></i></span></div>
          <div class="evo__nav"><button class="btn" data-eprev>← Anterior</button><span class="evo__count"></span><button class="btn btn--accent" data-enext>Siguiente →</button></div>
        </div>
        <h2 class="h2">Cómo se armó, fase por fase</h2>
        <ol class="phases">${(d.proceso || []).map((f, n) => `
          <li class="card"><span class="phases__n">${n + 1}</span><div><h3>${esc(f.fase)}</h3><p class="muted">${esc(f.texto)}</p>${f.pedido ? `<p class="phases__ask"><span>Pedido</span>${esc(f.pedido)}</p>` : ''}</div></li>`).join('')}
        </ol>
      </div>`;

    // Modos
    this.view.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => this.setMode(b.dataset.mode)));

    // Recorrido
    this.iframe = this.view.querySelector('iframe');
    this.spot = this.view.querySelector('.spot');
    this.scaler = this.view.querySelector('.stage__scaler');
    this.viewport = this.view.querySelector('.stage__viewport');
    this.count = this.view.querySelector('.step-panel__count');
    this.view.querySelector('[data-start]').addEventListener('click', () => { this.view.classList.add('is-started'); this.go(0); });
    this.view.querySelector('[data-resume]').addEventListener('click', () => { this.view.classList.remove('no-pop'); this.view.querySelector('[data-resume]').hidden = true; });
    this.dots = this.view.querySelector('.dots');
    this.data.pasos.forEach((p, n) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Paso ${n + 1}: ${p.titulo}`); b.dataset.tip = `${n + 1}. ${p.titulo}`;
      b.addEventListener('click', () => { this.view.classList.add('is-started'); this.go(n); });
      this.dots.append(b);
    });    this.pop = this.view.querySelector('.tip-pop');
    this.view.querySelector('[data-tprev]').addEventListener('click', () => this.go(this.i - 1));
    this.view.querySelector('[data-tnext]').addEventListener('click', () => this.i < this.data.pasos.length - 1 ? this.go(this.i + 1) : this.setMode('evolucion'));
    this.view.querySelector('.tip-pop__close').addEventListener('click', () => { this.view.classList.add('no-pop'); this.view.querySelector('[data-resume]').hidden = false; });
    new ResizeObserver(() => this.fit()).observe(this.viewport.parentElement);
    addEventListener('resize', () => this.fit());
    this.fit();

    // Evolución
    this.buildEvolution();
  }

  fit() {
    const stage = this.viewport.parentElement;
    const w = stage.clientWidth;
    const top = this.viewport.getBoundingClientRect().top;
    const libre = innerHeight - Math.max(0, top) - 20;
    const s = Math.max(.3, Math.min(w / VW, libre > 240 ? libre / VH : w / VW));
    this.scale = s;
    this.scaler.style.transform = `scale(${s})`;
    this.viewport.style.height = (VH * s) + 'px';
    this.viewport.style.width = (VW * s) + 'px';
  }

  async load() {
    if (this.loading) return this.loading;
    const iframe = this.iframe;
    this.loading = new Promise(resolve => {
      iframe.addEventListener('load', async () => {
        const w = iframe.contentWindow;
        this.view.querySelector('.stage__wait').hidden = true; // se ve el propio loader del deck
        // Espera a que el loader del deck termine (máx. 9 s)
        const t0 = performance.now();
        while (performance.now() - t0 < 9000) {
          const doc = w.document, root = doc.documentElement;
          const busy = root.classList.contains('is-loading') || root.classList.contains('is-booting') ||
            [...doc.querySelectorAll('#page-loader,.page-loader,#loader,.loader,#boot,.boot')].some(el => el.offsetParent !== null && getComputedStyle(el).opacity !== '0');
          if (!busy && performance.now() - t0 > 1200) break;
          await sleep(200);
        }
        resolve();
      }, { once: true });
      iframe.src = iframe.dataset.src;
    });
    return this.loading;
  }

  setMode(mode) {
    this.mode = mode;
    this.view.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === mode));
    this.view.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== mode; });
    if (mode === 'recorrido') { this.fit(); this.track(); } else cancelAnimationFrame(this.raf);
  }

  async go(n) {
    const pasos = this.data.pasos;
    this.i = Math.max(0, Math.min(pasos.length - 1, n));
    const p = pasos[this.i];
    this.renderPanel(p);
    [...this.dots.children].forEach((b, j) => { b.setAttribute('aria-selected', j === this.i); b.classList.toggle('is-past', j < this.i); });
    this.spot.classList.add('is-moving');
    await this.load();
    const token = this.token = Symbol();
    const w = this.iframe.contentWindow, doc = w.document;
    try {
      // Acciones «persistentes» de pasos anteriores (p. ej. desbloquear la portada) si se saltó directo a un paso posterior
      this.hechas ??= new Set();
      for (const q of pasos.slice(0, this.i)) {
        if (q.accion?.persistente && !this.hechas.has(q.accion.selector)) {
          const el = doc.querySelector(q.accion.selector);
          if (el) { el.click(); this.hechas.add(q.accion.selector); await sleep(900); }
        }
      }
      if (p.accion?.tipo === 'click') { doc.querySelector(p.accion.selector)?.click(); if (p.accion.persistente) this.hechas.add(p.accion.selector); await sleep(900); }
      const y = this.targetY(p, w, doc);
      if (y != null) await this.scrollTo(w, y, token);
      await sleep(reduced ? 100 : 650);
    } catch (e) { console.warn('Paso del tour', e); }
    if (token !== this.token) return;
    this.spot.classList.remove('is-moving');
    this.track();
  }

  targetY(p, w, doc) {
    const s = p.scroll; if (!s?.selector) return null;
    const el = doc.querySelector(s.selector); if (!el) return null;
    const top = el.getBoundingClientRect().top + w.scrollY;
    if (s.progress != null) return top + s.progress * Math.max(0, el.offsetHeight - w.innerHeight);
    if (s.block === 'center') return top - (w.innerHeight - el.offsetHeight) / 2;
    return top;
  }

  // Scroll animado dentro del deck: así se ven las transiciones reales (no saltos)
  scrollTo(w, y, token) {
    const from = w.scrollY, max = w.document.documentElement.scrollHeight - w.innerHeight;
    const to = Math.max(0, Math.min(max, y)), dist = Math.abs(to - from);
    if (reduced || dist < 4) { w.scrollTo(0, to); return Promise.resolve(); }
    const dur = Math.min(2200, 500 + dist * .35);
    return new Promise(res => {
      const t0 = performance.now();
      const stepFn = now => {
        if (token !== this.token) return res();
        const t = Math.min(1, (now - t0) / dur);
        w.scrollTo(0, from + (to - from) * ease(t));
        t < 1 ? requestAnimationFrame(stepFn) : res();
      };
      requestAnimationFrame(stepFn);
    });
  }

  // El foco sigue al elemento cada cuadro (hay piezas que se mueven)
  track() {
    cancelAnimationFrame(this.raf);
    const p = this.data.pasos[this.i];
    const loop = () => {
      if (this.mode !== 'recorrido' || !this.view.classList.contains('is-active')) return;
      const doc = this.iframe.contentDocument;
      if (doc) {
        let r;
        if (p.zona?.selector === 'viewport' || !p.zona?.selector) r = { left: 24, top: 24, width: VW - 48, height: VH - 48 };
        else {
          const el = doc.querySelector(p.zona.selector);
          if (el) {
            const b = el.getBoundingClientRect(), pad = p.zona.pad ?? 12;
            const left = Math.max(8, b.left - pad), top = Math.max(8, b.top - pad);
            r = { left, top, width: Math.min(VW - 8, b.right + pad) - left, height: Math.min(VH - 8, b.bottom + pad) - top };
          }
        }
        if (r && r.width > 4 && r.height > 4) {
          const st = this.spot.style;
          st.transform = `translate(${r.left}px,${r.top}px)`; st.width = r.width + 'px'; st.height = r.height + 'px';
          this.spot.classList.toggle('is-inside', r.top < 56);
          this.placePop(r);
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  placePop(r) {
    const s = this.scale, pop = this.pop;
    const vw = this.viewport.clientWidth, vh = this.viewport.clientHeight;
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 16, m = 12;
    const z = { l: r.left * s, t: r.top * s, w: r.width * s, h: r.height * s };
    const cx = z.l + z.w / 2, cy = z.t + z.h / 2;
    const clampX = x => Math.max(m, Math.min(vw - pw - m, x)), clampY = y => Math.max(m, Math.min(vh - ph - m, y));
    // Candidatos: a la derecha, abajo, a la izquierda, arriba. Se usa el primero que entra sin tapar la zona.
    const opciones = [
      { side: 'right', x: z.l + z.w + gap, y: clampY(cy - ph / 2), ok: z.l + z.w + gap + pw <= vw - m },
      { side: 'below', x: clampX(cx - pw / 2), y: z.t + z.h + gap, ok: z.t + z.h + gap + ph <= vh - m },
      { side: 'left', x: z.l - gap - pw, y: clampY(cy - ph / 2), ok: z.l - gap - pw >= m },
      { side: 'above', x: clampX(cx - pw / 2), y: z.t - gap - ph, ok: z.t - gap - ph >= m },
    ];
    const o = opciones.find(c => c.ok) || { side: 'inside', x: clampX(z.l + z.w - pw - 16), y: clampY(z.t + z.h - ph - 16) };
    pop.style.transform = `translate(${o.x}px,${o.y}px)`;
    pop.dataset.side = o.side;
    const arrow = pop.querySelector('.tip-pop__arrow');
    if (o.side === 'below' || o.side === 'above') { arrow.style.left = Math.max(18, Math.min(pw - 18, cx - o.x)) + 'px'; arrow.style.top = ''; }
    else { arrow.style.top = Math.max(18, Math.min(ph - 18, cy - o.y)) + 'px'; arrow.style.left = ''; }
  }

  renderPanel(p) {
    const n = this.data.pasos.length, pop = this.pop;
    this.spot.querySelector('.spot__n').textContent = this.i + 1;
    this.count.textContent = `${this.i + 1} / ${n}`;
    pop.querySelector('.tip-pop__n').textContent = `Paso ${this.i + 1} de ${n} · ${p.seccion}`;
    pop.querySelector('.tip-pop__title').textContent = p.titulo;
    // Tres pestañas: por qué está, cómo se hizo (simple) y el prompt para lograrlo
    const tabs = [['porque', 'Por qué', `<p>${esc(p.por_que || p.que_es)}</p>`], ['como', 'Cómo', `<p>${esc(p.como)}</p>`]];
    if (p.prompt) tabs.push(['prompt', 'Prompt', copyButton(p.prompt)]);
    const tabBox = pop.querySelector('.tip-pop__tabs'), body = pop.querySelector('.tip-pop__body');
    const show = k => {
      const t = tabs.find(x => x[0] === k) || tabs[0];
      tabBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.k === t[0]));
      body.innerHTML = t[2]; wireCopy(body); this.tab = t[0];
    };
    tabBox.innerHTML = tabs.map(t => `<button role="tab" data-k="${t[0]}">${t[1]}</button>`).join('');
    tabBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
    show(tabs.some(t => t[0] === this.tab) ? this.tab : 'porque');
    pop.querySelector('[data-tprev]').disabled = this.i === 0;
    pop.querySelector('[data-tnext]').textContent = this.i === n - 1 ? 'Ver cómo evolucionó →' : 'Siguiente →';
    pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
    this.view.classList.remove('no-pop'); this.view.querySelector('[data-resume]').hidden = true;
  }

  buildEvolution() {
    const it = this.data.iteraciones || [];
    const track = this.view.querySelector('.evo__track');
    this.evoI = it.length - 1;
    it.forEach((x, n) => {
      const b = document.createElement('button');
      b.className = 'evo__node'; b.setAttribute('role', 'tab');
      b.innerHTML = `<i></i><span class="evo__date">${esc(x.fecha || '')}</span><span class="evo__title">${esc(x.titulo)}</span>`;
      b.addEventListener('click', () => this.evo(n));
      track.append(b);
    });
    this.view.querySelector('[data-eprev]').addEventListener('click', () => this.evo(this.evoI - 1));
    this.view.querySelector('[data-enext]').addEventListener('click', () => this.evo(this.evoI + 1));
    if (it.length) this.evo(0);
    else this.view.querySelector('.evo').hidden = true;
  }

  evo(n) {
    const it = this.data.iteraciones;
    this.evoI = Math.max(0, Math.min(it.length - 1, n));
    const x = it[this.evoI];
    const img = this.view.querySelector('.evo__shot img'), empty = this.view.querySelector('.evo__empty');
    const shot = this.view.querySelector('.evo__shot');
    if (x.imagen) { img.src = x.imagen; img.alt = `Captura: ${x.titulo}`; img.hidden = false; empty.hidden = true; shot.classList.remove('is-text'); }
    else { img.hidden = true; empty.hidden = false; shot.classList.add('is-text'); empty.innerHTML = `<span>${esc(x.fecha || 'Idea')}</span><b>${esc(x.titulo)}</b>`; }
    this.view.querySelector('.evo__text').innerHTML = `
      <p class="eyebrow">${esc(x.fecha || '')} · Versión ${this.evoI + 1} de ${it.length}</p>
      <h2>${esc(x.titulo)}</h2>
      <div class="kv"><h3>Qué cambió</h3><p>${esc(x.que_cambio)}</p></div>
      ${x.por_que ? `<div class="kv"><h3>Por qué</h3><p>${esc(x.por_que)}</p></div>` : ''}`;
    this.view.querySelectorAll('.evo__node').forEach((b, j) => { b.setAttribute('aria-selected', j === this.evoI); b.classList.toggle('is-past', j <= this.evoI); });
    this.view.querySelector('.evo__line i').style.width = it.length > 1 ? (this.evoI / (it.length - 1) * 100) + '%' : '100%';
    this.view.querySelector('.evo__count').textContent = `${this.evoI + 1} / ${it.length}`;
    this.view.querySelector('[data-eprev]').disabled = this.evoI === 0;
    this.view.querySelector('[data-enext]').disabled = this.evoI === it.length - 1;
    this.view.querySelector('.evo__view').classList.remove('is-in'); void this.view.offsetWidth; this.view.querySelector('.evo__view').classList.add('is-in');
  }

  open() {
    this.build();
    if (!this.data) return;
    if (this.mode !== 'recorrido') return;
    this.fit();
    if (this.view.classList.contains('is-started')) this.go(this.i); else this.load();
  }
  close() { cancelAnimationFrame(this.raf); }
}

const tours = new Map([...document.querySelectorAll('.view--tour')].map(v => [v.id, new Tour(v)]));
let active = null;
function onRoute() {
  const id = (location.hash || '#inicio').slice(1);
  if (active && active.view.id !== id) { active.close(); active = null; }
  document.querySelector('.app').classList.toggle('is-tour', tours.has(id));
  if (tours.has(id)) { active = tours.get(id); requestAnimationFrame(() => active.open()); }
}
addEventListener('hashchange', onRoute);
document.addEventListener('guide:ready', onRoute, { once: true });
onRoute();

// Flechas ← → para avanzar (salvo escribiendo o dentro del deck)
document.addEventListener('keydown', e => {
  if (!active || e.target.closest('input,textarea')) return;
  if (active.mode === 'recorrido') {
    if (e.key === 'ArrowRight' && !active.view.classList.contains('is-started')) { e.preventDefault(); active.view.classList.add('is-started'); return active.go(0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); active.go(active.i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); active.go(active.i - 1); }
  } else {
    if (e.key === 'ArrowRight') { e.preventDefault(); active.evo(active.evoI + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); active.evo(active.evoI - 1); }
  }
});


// ── Decathlon: deck embebido (escalado, interactivo) y antes/después
(() => {
  const view = document.getElementById('decathlon'); if (!view) return;
  const stage = view.querySelector('[data-embed]'), vp = stage.querySelector('.stage__viewport'), sc = stage.querySelector('.stage__scaler'), fr = stage.querySelector('iframe');
  const fit = () => {
    const w = stage.clientWidth, top = vp.getBoundingClientRect().top, libre = innerHeight - Math.max(0, top) - 20;
    const s = Math.max(.3, Math.min(w / VW, libre > 240 ? libre / VH : w / VW));
    sc.style.transform = `scale(${s})`; vp.style.width = VW * s + 'px'; vp.style.height = VH * s + 'px';
  };
  new ResizeObserver(fit).observe(stage); addEventListener('resize', fit);
  const abrir = () => { if (!view.classList.contains('is-active')) return; if (!fr.src) fr.src = fr.dataset.src; requestAnimationFrame(fit); };
  addEventListener('hashchange', abrir); document.addEventListener('guide:ready', abrir, { once: true }); abrir();
  view.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
    view.querySelectorAll('[data-dec]').forEach(x => x.setAttribute('aria-selected', x === b));
    view.querySelectorAll('[data-dec-panel]').forEach(p => { p.hidden = p.dataset.decPanel !== b.dataset.dec; });
    if (b.dataset.dec === 'web') requestAnimationFrame(fit);
  }));
})();
