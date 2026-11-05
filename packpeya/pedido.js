// La app: el panel con el que se elige, se arma y se sigue el pedido. Vistas: lista, perfil, pedido, seguimiento y llegó.
// No sabe nada de 3D: avisa con `on` y app.js mueve la ciudad.
import { CONTACTO } from './perfiles.js';
import { sonar } from './sonido.js';

const ICON = {
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-3.2 1.7-4.8 4.9-4.9 1.2-.1 1.6-.1 4.8-.1zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
  tt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 2c.3 2.5 1.7 4 4.2 4.2v3.2c-1.5.1-2.9-.4-4.1-1.2v6.3c0 8-8.7 10.5-12.2 4.8-2.2-3.7-.8-10.2 6.3-10.5v3.4c-.5.1-1.1.2-1.6.4-1.6.5-2.5 1.5-2.2 3.3.5 3.4 6.7 4.4 6.2-2.2V2h3.4z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.3V8.7l5.8 3.3-5.8 3.3z"/></svg>',
};
const RED = { ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
const ETAPAS = ['Confirmado', 'Preparando', 'En camino', 'Llegando'];
const MOMENTOS = ['Su video', 'Pide', 'Mochila', 'Bolsa'];
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.6l4 4L18 8"/></svg>';
const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const VOLVER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const foto = p => `assets/fotos/${p.foto}.webp`;
const redes = p => ['ig', 'tt', 'yt'].filter(r => p[r]).map(r => `<span>${ICON[r]}${p[r]}</span>`).join('');
const contador = (i, n) => `<div class="stepper" data-i="${i}"><button type="button" data-d="-1" aria-label="Sacar">−</button><b>${n}</b><button type="button" data-d="1" aria-label="Sumar">+</button></div>`;
const plural = n => `${n} ${n === 1 ? 'video' : 'videos'}`;

export function crearPedido(el, perfiles, on) {
  const videos = perfiles.map(() => 1); // cuántos videos de cada perfil
  let filtro = '', actual = 0, momento = -1, etapaActual = 0;
  const total = () => videos.reduce((a, b) => a + b, 0);
  const elegidos = () => new Set(videos.flatMap((n, i) => (n ? [i] : [])));
  // El mail sale con el pedido escrito
  function correo() {
    const lista = perfiles.flatMap((p, i) => (videos[i] ? [`- ${p.nombre}: ${plural(videos[i])}`] : []));
    const cuerpo = `Hola, BIG.\n\nQuiero avanzar con este pedido para PedidosYa:\n\n${lista.join('\n')}\n\nTotal: ${plural(total())}`;
    return `mailto:${CONTACTO}?subject=${encodeURIComponent('PedidosYa × BIG: Ya llegó')}&body=${encodeURIComponent(cuerpo)}`;
  }
  const fila = (p, i) => `<li class="row${videos[i] ? '' : ' is-off'}" data-i="${i}">
    <img src="${foto(p)}" alt="" width="52" height="52">
    <div class="row__t"><b>${p.nombre}</b><span class="row__r">${redes(p)}</span></div>
    ${videos[i] ? contador(i, videos[i]) : `<button class="add" type="button" data-add="${i}" aria-label="Sumar a ${p.nombre}">+</button>`}
  </li>`;

  const vistas = {
    lista() {
      el.innerHTML = `<div class="tarjeta">
        <header><label class="buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Buscar perfiles" aria-label="Buscar perfiles" value="${filtro}"></label></header>
        <ul class="lista"></ul>
      </div>
      <footer class="pie"><span class="pie__n"></span><button class="ir" type="button" data-ir="pedido">Ver pedido ${FLECHA}</button></footer>`;
      const input = el.querySelector('input');
      input.addEventListener('input', () => { sonar('key'); filtro = input.value; pintarLista(); });
      pintarLista();
    },
    perfil() {
      const p = perfiles[actual];
      el.innerHTML = `<div class="tarjeta">
        <header class="t__top">
          <button class="back" type="button" data-ir="lista" aria-label="Volver">${VOLVER}</button>
          <span class="anillo"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/><circle class="anillo__v" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b>1</b></span>
          <div class="t__id"><h2>${p.nombre}</h2><p><span class="chip"></span><a class="t__usuario" href="${p.links.ig}" target="_blank" rel="noopener">@${p.usuario}</a></p></div>
          <img class="t__foto" src="${foto(p)}" alt="" width="44" height="44">
        </header>
        <p class="t__bio">${p.bio}</p>
        <ul class="t__redes">${['ig', 'tt', 'yt'].filter(r => p[r]).map(r => `<li><a href="${p.links[r]}" target="_blank" rel="noopener" aria-label="${RED[r]}">${ICON[r]}<b>${p[r]}</b></a></li>`).join('')}<li class="t__eng"><b>${p.eng}</b><span>engagement</span></li></ul>
        <ol class="pasos">${MOMENTOS.map((m, k) => `<li class="paso"><button type="button" data-m="${k}"><i class="check">${CHECK}</i><span>${m}</span></button><div class="paso__t"><p>${p.momentos[k]}</p></div></li>`).join('')}</ol>
        <div class="perfil__media"></div>
      </div>
      <footer class="pie"></footer>`;
      momento = -1;
      pintarPie();
    },
    pedido() {
      el.innerHTML = `<div class="tarjeta">
        <header class="t__top t__top--simple"><button class="back" type="button" data-ir="lista" aria-label="Volver">${VOLVER}</button><h2>Tu pedido</h2></header>
        <ul class="lista">${perfiles.map((p, i) => (videos[i] ? fila(p, i) : '')).join('')}</ul>
        <dl class="suma"><div><dt>Videos</dt><dd>${total()}</dd></div><div><dt>Inversión</dt><dd>A confirmar</dd></div></dl>
      </div>
      <footer class="pie pie--cta"><button class="cta" type="button" data-pedir ${total() ? '' : 'disabled'}>Hacer pedido</button></footer>`;
    },
    seguimiento() {
      el.innerHTML = `<div class="tarjeta">
        <header class="t__top t__top--simple"><h2 class="etapa">${ETAPAS[0]}</h2></header>
        <div class="barra">${ETAPAS.map(() => '<i><b></b></i>').join('')}</div>
      </div>
      <footer class="pie"><span class="pie__n">${plural(total())}</span></footer>`;
    },
    llego() {
      el.innerHTML = `<div class="tarjeta">
        <h2 class="fin"><span>Ya llegó.</span><span>¿Hablamos?</span></h2>
        <div class="caras">${perfiles.map((p, i) => (videos[i] ? `<img src="${foto(p)}" alt="${p.nombre}" width="42" height="42">` : '')).join('')}</div>
        <a class="cta" href="${correo()}">Escribir a BIG</a>
      </div>
      <footer class="pie"><span class="pie__n">${plural(total())}</span><button class="ir" type="button" data-otra>Otro pedido ${FLECHA}</button></footer>`;
    },
  };
  function pintarLista() {
    const q = filtro.trim().toLowerCase(), ul = el.querySelector('.lista'), n = el.querySelector('.pie__n'), ir2 = el.querySelector('[data-ir="pedido"]');
    if (ul) ul.innerHTML = perfiles.map((p, i) => (!q || `${p.nombre} ${p.tag}`.toLowerCase().includes(q) ? fila(p, i) : '')).join('');
    if (n) n.textContent = plural(total());
    if (ir2) ir2.disabled = !total();
  }
  function pintarPie() {
    const pie = el.querySelector('.pie'), chip = el.querySelector('.chip'), n = videos[actual];
    if (chip) { chip.textContent = n ? 'Sumado' : 'Sin sumar'; chip.classList.toggle('is-on', n > 0); }
    if (!pie) return;
    if (momento < MOMENTOS.length - 1) { pie.innerHTML = `${n ? contador(actual, n) : `<span class="pie__n">${plural(total())}</span>`}<button class="ir ir--seguir" type="button" data-seguir>Seguir ${FLECHA}</button>`; return; }
    pie.innerHTML = n ? `${contador(actual, n)}<button class="ir" type="button" data-ir="pedido">Ver pedido ${FLECHA}</button>` : `<span class="pie__n">${plural(total())}</span><button class="ir" type="button" data-add="${actual}">Sumar al pedido ${FLECHA}</button>`;
  }
  function cambiar(i, d) {
    const antes = videos[i];
    videos[i] = Math.max(0, Math.min(5, videos[i] + d));
    if (videos[i] !== antes) sonar(d > 0 ? 'suma' : 'resta', videos[i]);
    on.elegidos(elegidos());
    const v = el.dataset.vista;
    if (v === 'pedido') ir('pedido'); else if (v === 'perfil') pintarPie(); else pintarLista();
    on.accion?.();
  }
  function ir(v) {
    const antes = el.dataset.vista;
    if (antes === 'perfil' && v !== 'perfil') on.perfil(null);
    el.dataset.vista = v; vistas[v]();
    if (antes !== v) on.vista?.(v);
    on.accion?.();
  }
  function abrir(i) { actual = i; ir('perfil'); on.perfil(i); }

  el.addEventListener('click', e => {
    const t = e.target.closest('button'), row = e.target.closest('.row');
    if (e.target.closest('a.cta')) return sonar('enviar');
    if (t?.dataset.ir) return ir(t.dataset.ir);
    if (t?.dataset.add) return cambiar(+t.dataset.add, 1);
    if (t?.dataset.d) return cambiar(+t.closest('.stepper').dataset.i, +t.dataset.d);
    if (t?.dataset.pedir !== undefined) return on.pedir();
    if (t?.dataset.otra !== undefined) { ir('lista'); return on.otra(); }
    if (t?.dataset.m) return on.saltar(+t.dataset.m);
    if (t?.dataset.seguir !== undefined) return on.seguir();
    if (row && !t) abrir(+row.dataset.i);
  });

  ir('lista');
  return {
    ir, abrir, etapas: ETAPAS, momentos: MOMENTOS.length,
    // La acción del momento, la que va en el canto de la ventana
    accion() {
      const v = el.dataset.vista, n = total();
      if (v === 'perfil') return { texto: `Sumar a ${perfiles[actual].nombre}`, hacer: () => cambiar(actual, 1) };
      if (v === 'pedido') return n ? { texto: 'Hacer pedido', hacer: on.pedir } : { texto: 'Tu pedido' };
      if (v === 'seguimiento') return { texto: ETAPAS[etapaActual] };
      if (v === 'llego') return { texto: 'Escribir a BIG', enlace: correo() };
      return { texto: `Tu pedido · ${plural(n)}`, hacer: () => ir('pedido') };
    },
    // En qué momento de su historia está
    momento(k) {
      const v = el.querySelector('.anillo__v');
      if (!v) return;
      momento = k;
      v.style.strokeDashoffset = 100 - (k + 1) / MOMENTOS.length * 100;
      el.querySelector('.anillo b').textContent = k + 1;
      el.querySelectorAll('.paso').forEach((p, j) => { p.classList.toggle('is-on', j === k); p.classList.toggle('is-ok', j < k); });
      pintarPie();
    },
    etapa(i, k) {
      const t = el.querySelector('.etapa'); if (!t) return;
      t.textContent = ETAPAS[i];
      if (i !== etapaActual) { etapaActual = i; on.accion?.(); }
      el.querySelectorAll('.barra b').forEach((b, j) => { b.style.width = (j < i ? 100 : j === i ? k * 100 : 0) + '%'; });
    },
  };
}
