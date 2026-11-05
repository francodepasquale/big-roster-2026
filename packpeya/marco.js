// La ventana de vidrio y su canto. La ciudad vive adentro; afuera corre un riel que abraza el borde y dobla las esquinas.
// Ahí viven las marcas, la acción del momento y la perilla de claro y oscuro. No sabe de 3D ni del pedido: avisa con `on`.
// Las medidas de la ventana salen de styles.css (--vt, --vr, --vb, --vl, --vR): se cambian solo ahí.
const NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const crear = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
const medida = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
export const leerVentana = () => ({ t: medida('--vt'), r: medida('--vr'), b: medida('--vb'), l: medida('--vl'), R: medida('--vR') });

export function crearMarco(el, on) {
  const { gsap } = window, root = document.documentElement, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = el.querySelector('svg'), perilla = el.querySelector('.perilla'), marca = document.querySelector('.marca');
  const vidrios = svg.querySelector('.vidrios'), trazos = svg.querySelector('.trazos'), textos = svg.querySelector('.textos');
  const arriba = crear('path'), abajo = crear('path'); // guías para medir, no se dibujan
  const esquina = vidrios.appendChild(crear('path', { class: 'esquina' })); // la pestaña de las marcas
  const pista = vidrios.appendChild(crear('path', { class: 'pista' }));
  const estelas = ['estela estela--ancha', 'estela'].map(clase => trazos.appendChild(crear('path', { class: clase })));
  const lienzo = document.createElement('canvas').getContext('2d');
  const anchoDe = texto => { lienzo.font = '600 13.5px Inter, sans-serif'; return lienzo.measureText(texto).width; };

  // Un pedazo de la guía entre dos largos, para que cada pestaña tenga su propia forma y su texto la siga
  const tramo = (guia, a, b) => {
    const n = Math.max(2, Math.ceil((b - a) / 5)), pts = [];
    for (let i = 0; i <= n; i++) { const p = guia.getPointAtLength(a + (b - a) * i / n); pts.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`); }
    return `M${pts.join('L')}`;
  };
  let ids = 0, carril = 36;
  function pestana(clase, alTocar) {
    const id = `tab${ids++}`, forma = vidrios.appendChild(crear('path', { class: `tab ${clase}`, tabindex: 0, role: 'button' }));
    const renglon = svg.querySelector('defs').appendChild(crear('path', { id })); // por acá corre el texto: es tan largo como la pestaña con sus puntas
    const texto = textos.appendChild(crear('text', { class: `tab__texto ${clase}` })), camino = texto.appendChild(crear('textPath', { href: `#${id}`, startOffset: '50%' })), linea = camino.appendChild(crear('tspan', { dy: '4.7' }));
    forma.addEventListener('click', alTocar);
    forma.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alTocar(); } });
    return {
      forma, texto,
      poner(t) { linea.textContent = t; forma.setAttribute('aria-label', t); },
      ubicar(guia, a, b) { forma.setAttribute('d', tramo(guia, a, b)); renglon.setAttribute('d', tramo(guia, a - carril / 2, b + carril / 2)); },
    };
  }
  let accion = { texto: '' };
  const principal = pestana('tab--accion', () => { if (accion.enlace) { on.enlace?.(); location.href = accion.enlace; } else accion.hacer?.(); });

  // ── Geometría: el riel sale de las marcas, dobla arriba a la derecha y baja. La acción dobla la esquina de abajo
  const giro = { sA: 0, sB: 1 };
  function dibujarAccion() {
    const f = principal.forma;
    f.style.display = principal.texto.style.display = innerWidth <= 900 || !accion.texto ? 'none' : '';
    if (f.style.display === 'none') return;
    principal.poner(accion.texto);
    const v = leerVentana(), r = v.R + v.r / 2, medio = 300 + Math.PI * r / 4, largo = Math.max(anchoDe(accion.texto) + 28 - carril, 2);
    principal.ubicar(abajo, medio - largo / 2, medio + largo / 2);
    f.classList.toggle('is-inerte', !accion.hacer && !accion.enlace);
  }
  function dibujar() {
    const v = leerVentana(), W = innerWidth, H = innerHeight, r = v.R + v.r / 2;
    const yT = v.t / 2, xR = W - v.r / 2, yB = H - v.b / 2, cx = W - v.r - v.R, cyT = v.t + v.R, cyB = H - v.b - v.R;
    carril = medida('--carril');
    // Las marcas: doblan el vértice de arriba a la izquierda. En el celular no hay riel a la izquierda y van en línea
    const [peya, big] = [...marca.querySelectorAll('img')].map(i => i.getBoundingClientRect()), punta = carril / 2, aire = W <= 900 ? 9 : 13;
    const finMarcas = W <= 900 ? big.right + aire : peya.right + aire, rI = v.R + v.l / 2;
    esquina.setAttribute('d', W <= 900
      ? `M${peya.left - aire + punta} ${yT}H${finMarcas - punta}`
      : `M${v.l / 2} ${big.bottom + aire - punta}V${v.t + v.R}A${rI} ${rI} 0 0 1 ${v.l + v.R} ${yT}H${finMarcas - punta}`);
    const x0 = finMarcas + 7;
    arriba.setAttribute('d', `M${x0} ${yT}H${cx}A${r} ${r} 0 0 1 ${xR} ${cyT}V${cyB}`);
    abajo.setAttribute('d', `M${cx - 300} ${yB}H${cx}A${r} ${r} 0 0 0 ${xR} ${cyB}V${cyB - 300}`);
    const margen = W <= 900 ? 16 : 30;
    giro.sA = cx - x0 - margen; giro.sB = cx - x0 + Math.PI * r / 2 + margen;
    const d = tramo(arriba, giro.sA, giro.sB);
    pista.setAttribute('d', d); estelas.forEach(e => e.setAttribute('d', d));
    dibujarAccion();
    sucio = true;
  }

  // ── La perilla: sube y baja por el riel estirándose como un líquido. t: 0 claro, 1 oscuro
  const estado = { t: 0 };
  let oscuro = false, ultimo = 0, estira = 0, sucio = true;
  function paso() {
    const s = giro.sA + (giro.sB - giro.sA) * estado.t, vel = s - ultimo;
    ultimo = s;
    estira += (Math.min(Math.abs(vel) * .03, .55) - estira) * .28;
    if (!sucio && Math.abs(vel) < .01 && estira < .002) return;
    sucio = false;
    const p = arriba.getPointAtLength(s), q = arriba.getPointAtLength(s + 1), a = Math.atan2(q.y - p.y, q.x - p.x);
    perilla.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) rotate(${a}rad) scale(${1 + estira},${1 - estira * .42})`;
    const hecho = clamp(estado.t, 0, 1), total = giro.sB - giro.sA;
    estelas.forEach(e => { e.style.strokeDasharray = `${hecho * total} ${total + 1}`; e.style.opacity = hecho > .004 ? 1 : 0; });
  }
  function poner(valor) {
    if (valor === oscuro) return;
    oscuro = valor;
    root.classList.add('is-cambiando');
    setTimeout(() => root.classList.remove('is-cambiando'), 750);
    root.dataset.tema = valor ? 'oscuro' : 'claro';
    perilla.setAttribute('aria-checked', valor);
    on.tema(valor);
  }
  function llevar(valor) {
    poner(valor);
    gsap.to(estado, { t: valor ? 1 : 0, duration: reduced ? .01 : .95, ease: 'elastic.out(1,.62)', overwrite: true });
  }
  // La posición del riel más cercana al puntero
  function cercano(x, y) {
    let mejor = 0, d = Infinity;
    for (let i = -3; i <= 43; i++) {
      const p = arriba.getPointAtLength(giro.sA + (giro.sB - giro.sA) * i / 40), e = Math.hypot(p.x - x, p.y - y);
      if (e < d) { d = e; mejor = i / 40; }
    }
    return mejor;
  }
  let agarrada = false, movido = 0;
  perilla.addEventListener('pointerdown', e => { perilla.setPointerCapture(e.pointerId); agarrada = true; movido = 0; on.agarrar?.(); perilla.classList.add('is-agarrada'); gsap.killTweensOf(estado); });
  perilla.addEventListener('pointermove', e => {
    if (!agarrada) return;
    movido += Math.abs(e.movementX) + Math.abs(e.movementY);
    const t = cercano(e.clientX, e.clientY);
    gsap.to(estado, { t, duration: .22, ease: 'power3.out', overwrite: true });
    if (Math.abs(t - .5) > .08) poner(t > .5);
  });
  const soltar = () => { if (!agarrada) return; agarrada = false; perilla.classList.remove('is-agarrada'); llevar(movido < 5 ? !oscuro : oscuro); };
  perilla.addEventListener('pointerup', soltar);
  perilla.addEventListener('pointercancel', soltar);
  perilla.addEventListener('click', e => { if (e.detail === 0) llevar(!oscuro); }); // con teclado

  addEventListener('resize', dibujar);
  addEventListener('load', dibujar);
  document.fonts.ready.then(dibujar);
  dibujar();
  gsap.ticker.add(paso);

  return {
    accion(a) { accion = a; dibujarAccion(); },
  };
}
