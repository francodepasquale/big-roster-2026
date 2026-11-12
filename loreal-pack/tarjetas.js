// Las tarjetas apiladas de una dupla: Creador, Producto y La idea (el título y sus cuatro momentos). La activa está abierta y las otras quedan como
// píldoras con su resumen a la derecha (referencia: @abtste11a). Las usa el detalle de cada perfil del carrusel.
// No sabe nada de 3D: avisa qué tarjeta y qué momento se tocaron.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RED = { ig: 'Instagram', tt: 'TikTok', yt: 'YouTube' };
const SALE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13l6-6M8.5 7H13v4.5"/></svg>';
// los videos que prueban la dupla (perfiles.js → videos): YouTube, TikTok o un reel
const enlaceVideo = (v, p) => (v.yt ? `https://www.youtube.com/watch?v=${v.yt}` : v.tt ? `https://www.tiktok.com/@${p.usuario}/video/${v.tt}` : `https://www.instagram.com/reel/${v.ig}/`);
const redDe = v => (v.yt ? 'YouTube' : v.tt ? 'TikTok' : 'Instagram');
// íconos de línea, chicos: dicen de qué es cada tarjeta
const ICONO = {
  creador: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7" r="3.2"/><path d="M3.8 17c.9-3.3 3.3-5 6.2-5s5.3 1.7 6.2 5"/></svg>',
  producto: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7.5" y="2.5" width="5" height="3" rx="1"/><path d="M6.5 7.5c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v8a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z"/></svg>',
  idea: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l1.7 4.4 4.5.4-3.4 3 1 4.6L10 12.8l-3.8 2.4 1-4.6-3.4-3 4.5-.4z"/></svg>',
};
export const seguidores = v => { const m = String(v || '').replace(',', '.').match(/([\d.]+)\s*([KM])?/i); return m ? parseFloat(m[1]) * (m[2]?.toUpperCase() === 'M' ? 1e6 : m[2] ? 1e3 : 1) : 0; };
export const total = p => seguidores(p.ig) + seguidores(p.tt) + seguidores(p.yt);
export const corto = n => (!n ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} M` : `${Math.round(n / 1e3)} K`);

export function crearPila(raiz, { momentos, divisiones, foto, alTocar = () => {}, alMomento = () => {} }) {
  let perfil = null, activa = 0, momento = -1;
  raiz.classList.add('pila');
  const divDe = id => divisiones.find(d => d.id === id);

  function pintar(p) {
    perfil = p;
    const d = divDe(p.division), redes = ['ig', 'tt', 'yt'].filter(r => p[r]), suma = total(p), principal = p.links?.ig || p.links?.tt || p.links?.yt;
    const pruebas = (p.videos || []).slice(0, 2);
    const retrato = p.foto ? `<img class="pila__foto" src="${foto(p)}" alt="" decoding="async">` : `<span class="pila__foto pila__foto--vacia" aria-hidden="true">${esc(p.nombre.split(' ').map(s => s[0]).join(''))}</span>`;
    const items = [
      { id: 'creador', t: 'Creador', r: suma ? `${corto(suma)} seguidores` : `@${p.usuario}`, cuerpo: `
        <div class="pila__persona">${retrato}<div><h3 class="serif">${esc(p.nombre)}</h3><p>${principal ? `<a href="${principal}" target="_blank" rel="noopener">@${esc(p.usuario)}</a>` : `@${esc(p.usuario)}`} · ${esc(p.tag)}</p></div></div>
        ${redes.length ? `<div class="pila__datos">${redes.map(r => `<a href="${p.links?.[r] || '#'}" target="_blank" rel="noopener" aria-label="${RED[r]}: ${esc(p[r])} seguidores"><span>${RED[r]}</span><b>${esc(p[r])}</b></a>`).join('')}</div>` : '<p class="pila__nota">Números en camino.</p>'}
        <p class="pila__texto">${esc(p.bio)}</p>` },
      { id: 'producto', t: 'Producto', r: p.marca, cuerpo: `
        <h3 class="serif">${esc(p.marca)}</h3><p class="pila__linea">${esc(p.linea)}</p>
        <p class="pila__meta">${esc(d.nombre)} · ${esc(p.rubro)}</p>
        <div class="pila__prueba"><p><b>Ya lo hace.</b> ${esc(p.prueba)}</p>
          ${pruebas.length ? `<ul class="pila__videos">${pruebas.map(v => `<li><a href="${enlaceVideo(v, p)}" target="_blank" rel="noopener"><span>${esc(v.t)}</span><small>${redDe(v)}</small>${SALE}</a></li>`).join('')}</ul>` : ''}
        </div>` },
      { id: 'idea', t: 'La idea', r: p.titulo, cuerpo: `
        <h3 class="serif pila__titulo">${esc(p.titulo)}</h3>
        <ol class="pila__momentos">${momentos.map((m, k) => `<li><button type="button" data-m="${k}" aria-pressed="false"><span class="pila__n">${k + 1}</span><span><b>${esc(m)}</b><span>${esc(p.momentos[k])}</span></span></button></li>`).join('')}</ol>` },
    ];
    raiz.innerHTML = items.map((it, k) => `
      <section class="pila__item" data-k="${k}">
        <button type="button" class="pila__cab" data-k="${k}" aria-expanded="false">
          <span class="pila__icono">${ICONO[it.id]}</span><span class="pila__t">${it.t}</span><span class="pila__r">${esc(it.r)}</span>
        </button>
        <div class="pila__cuerpo"><div class="pila__dentro">${it.cuerpo}</div></div>
      </section>`).join('');
    activar(activa, false); marcar(momento);
  }
  function activar(k, avisar = true) {
    activa = k;
    raiz.querySelectorAll('.pila__item').forEach((s, j) => {
      s.classList.toggle('is-abierta', j === k);
      s.querySelector('.pila__cab').setAttribute('aria-expanded', String(j === k));
    });
    if (avisar) alTocar(k);
  }
  function marcar(m) {
    momento = m;
    raiz.querySelectorAll('[data-m]').forEach(b => { const on = +b.dataset.m === m; b.setAttribute('aria-pressed', String(on)); b.closest('li').classList.toggle('is-hecho', m >= 0 && +b.dataset.m < m); });
  }
  raiz.addEventListener('click', e => {
    const m = e.target.closest('[data-m]');
    if (m) { marcar(+m.dataset.m); alMomento(+m.dataset.m); return; }
    const c = e.target.closest('.pila__cab');
    if (c && +c.dataset.k !== activa) activar(+c.dataset.k);
  });
  return { pintar, activar: k => { if (k !== activa) activar(k, false); }, marcar, perfil: () => perfil, activa: () => activa };
}
