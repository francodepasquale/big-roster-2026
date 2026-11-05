// Vidrio líquido: el borde del panel refracta lo que tiene detrás, como una lente.
// Solo Chromium acepta filtros SVG en backdrop-filter; en los demás queda el desenfoque de styles.css.
let n = 0;

export function vidrio(el, { borde = 16, fuerza = 34, radio = 30, efecto = 'blur(7px) saturate(165%)' } = {}) {
  if (!navigator.userAgentData?.brands?.some(b => /Chrom/.test(b.brand))) return;
  const id = `vidrio${n++}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB" x="0" y="0">
    <feImage result="mapa" preserveAspectRatio="none" x="0" y="0"/><feDisplacementMap in="SourceGraphic" in2="mapa" scale="${fuerza * 2}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.append(svg);
  const filtro = svg.querySelector('filter'), imagen = svg.querySelector('feImage');

  // Mapa de desplazamiento: cada píxel cerca del borde empuja hacia adentro, cada vez más fuerte
  function pintar() {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    const k = .5, W = Math.ceil(w * k), H = Math.ceil(h * k), B = borde * k, R = radio * k;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), id2 = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const qx = Math.abs(x + .5 - W / 2) - (W / 2 - R), qy = Math.abs(y + .5 - H / 2) - (H / 2 - R);
      const ax = Math.max(qx, 0), ay = Math.max(qy, 0), largo = Math.hypot(ax, ay);
      const dist = qx > 0 && qy > 0 ? R - largo : R - Math.max(qx, qy);
      const t = Math.max(0, 1 - dist / B), m = t * t;
      let nx = 0, ny = 0;
      if (qx > 0 && qy > 0) { nx = ax / (largo || 1); ny = ay / (largo || 1); } else if (qx > qy) nx = 1; else ny = 1;
      const sx = x + .5 < W / 2 ? 1 : -1, sy = y + .5 < H / 2 ? 1 : -1, i = (y * W + x) * 4;
      id2.data[i] = 128 + sx * nx * m * 127; id2.data[i + 1] = 128 + sy * ny * m * 127; id2.data[i + 2] = 128; id2.data[i + 3] = 255;
    }
    g.putImageData(id2, 0, 0);
    imagen.setAttribute('href', c.toDataURL()); imagen.setAttribute('width', w); imagen.setAttribute('height', h);
    filtro.setAttribute('width', w); filtro.setAttribute('height', h);
    el.style.backdropFilter = `url(#${id}) ${efecto}`;
  }
  let espera = 0;
  new ResizeObserver(() => { clearTimeout(espera); espera = setTimeout(pintar, 90); }).observe(el);
  pintar();
}
