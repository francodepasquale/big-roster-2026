// El tren de la nieve · ilustración propia en SVG (no es la del sitio de Rituals: solo comparte la idea).
// Locomotora + vagones con cajas de regalo: «carga» (3 vagones) en portada y cierre, «largo» (6) en el mediakit.
const C = { abeto: '#1E4334', tinta: '#1D1C1A', oro: '#C9A36A', granate: '#7E1426', arena: '#EFE7DC', rosa: '#E8C3BE' };
const H = 122;

const wheel = (cx, r) => `<g class="wheel">
  <circle cx="${cx}" cy="${117 - r}" r="${r}" fill="${C.tinta}"/>
  <rect x="${cx - r * .82}" y="${117 - r - 1.6}" width="${r * 1.64}" height="3.2" fill="${C.oro}"/>
  <rect x="${cx - 1.6}" y="${117 - r * 1.82}" width="3.2" height="${r * 1.64}" fill="${C.oro}"/>
  <circle cx="${cx}" cy="${117 - r}" r="${r * .32}" fill="${C.oro}"/></g>`;

function loco(x) {
  return `<g transform="translate(${x} 0)">
    <g class="smoke" fill="#FFFFFF"><circle class="puff p1" cx="48" cy="8" r="9"/><circle class="puff p2" cx="58" cy="4" r="7"/><circle class="puff p3" cx="40" cy="2" r="6"/></g>
    <path d="M40 44 L36 16 L66 16 L62 44Z" fill="${C.tinta}"/>
    <rect x="32" y="11" width="38" height="8" rx="3" fill="${C.tinta}"/>
    <rect x="26" y="42" width="116" height="48" rx="24" fill="${C.abeto}"/>
    <rect x="62" y="42" width="7" height="48" fill="${C.oro}"/>
    <rect x="98" y="42" width="7" height="48" fill="${C.oro}"/>
    <rect x="134" y="12" width="88" height="78" rx="6" fill="${C.abeto}"/>
    <rect x="126" y="4" width="104" height="12" rx="5" fill="${C.tinta}"/>
    <rect x="150" y="26" width="56" height="34" rx="5" fill="${C.oro}"/>
    <circle cx="22" cy="64" r="8" fill="${C.oro}"/>
    <rect x="14" y="88" width="214" height="10" rx="3" fill="${C.tinta}"/>
    <path d="M14 92 L2 112 L30 112 L30 92Z" fill="${C.tinta}"/>
    ${wheel(62, 17)}${wheel(108, 17)}${wheel(192, 13)}
  </g>`;
}

const wagonBase = () => `<rect x="-14" y="90" width="18" height="6" fill="${C.tinta}"/>
  <rect x="0" y="88" width="176" height="10" rx="3" fill="${C.tinta}"/>${wheel(38, 13)}${wheel(138, 13)}`;

const ribbon = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>
  <rect x="${x + w / 2 - 4}" y="${y}" width="8" height="${h}" fill="${C.oro}"/>
  <circle cx="${x + w / 2 - 6}" cy="${y - 4}" r="5" fill="${C.oro}"/><circle cx="${x + w / 2 + 6}" cy="${y - 4}" r="5" fill="${C.oro}"/>`;

const CARGO = [
  [[16, 30, 56, 40, C.granate], [82, 44, 40, 26, C.rosa], [130, 22, 36, 48, C.tinta]],
  [[14, 40, 44, 30, C.rosa], [66, 18, 50, 52, C.granate], [124, 38, 42, 32, C.arena]],
  [[18, 26, 46, 44, C.tinta], [74, 40, 48, 30, C.granate], [130, 30, 36, 40, C.rosa]],
];
function cargo(x, i) {
  return `<g transform="translate(${x} 0)">${CARGO[i % 3].map(b => ribbon(...b)).join('')}
    <rect x="4" y="66" width="168" height="24" rx="4" fill="${C.abeto}"/><rect x="4" y="74" width="168" height="4" fill="${C.oro}"/>${wagonBase()}</g>`;
}

const LOCO_W = 236, WAGON_W = 192;
export function buildTrain(el, kind) {
  const n = kind === 'largo' ? 6 : 3;
  const cars = Array.from({ length: n }, (_, i) => cargo(LOCO_W + i * WAGON_W, i));
  const w = LOCO_W + cars.length * WAGON_W - 10;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="presentation" focusable="false">${loco(0)}${cars.join('')}</svg>`;
  el.style.setProperty('--ratio', w / H);
  return { el, wheels: [...el.querySelectorAll('.wheel')], ratio: w / H };
}

// Las ruedas giran según lo recorrido: dist en px de pantalla, escala px por unidad del SVG
export function spin(train, dist) {
  if (!train.unitPx) { train.unitPx = train.el.getBoundingClientRect().height / H || 1; addEventListener('resize', () => { train.unitPx = 0; }, { once: true }); }
  const unitPx = train.unitPx;
  train.wheels.forEach(w => {
    const r = parseFloat(w.firstElementChild.getAttribute('r'));
    w.style.transform = `rotate(${(-dist / unitPx / r) * 57.2958}deg)`;
  });
}
