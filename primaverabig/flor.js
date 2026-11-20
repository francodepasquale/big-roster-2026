import { FLOR } from './flor-datos.js';

export { FLOR };
const MARGEN = 6;
let cuenta = 0;

export const COLORES = Object.fromEntries(FLOR.petalos.map(p => [p.id, [p.grad[0][2], p.grad[1][2]]]));

const caja = () => {
  const [x0, y0, x1, y1] = FLOR.caja;
  return [x0 - MARGEN, y0 - MARGEN, x1 - x0 + 2 * MARGEN, y1 - y0 + 2 * MARGEN];
};

export function svgFlor({ dibujo = false, mono = false, clase = '', titulo = '' } = {}) {
  const id = 'flor' + (++cuenta);
  const [vx, vy, vw, vh] = caja();
  let defs = '', cuerpo = '';
  if (!mono) FLOR.petalos.forEach((p, k) => {
    const [a, b] = p.grad;
    defs += `<linearGradient id="${id}-g${k}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><stop offset="0" stop-color="${a[2]}"/><stop offset="1" stop-color="${b[2]}"/></linearGradient>`;
  });
  for (const pz of FLOR.piezas) {
    let mascara = '';
    if (dibujo) {
      const d = 'M' + pz.linea.map(q => q.join(' ')).join('L');
      defs += `<mask id="${id}-m${pz.i}" maskUnits="userSpaceOnUse" x="${vx}" y="${vy}" width="${vw}" height="${vh}">`
        + `<path d="${d}" fill="none" stroke="#fff" stroke-width="${(FLOR.ancho * 2.3).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></mask>`;
      mascara = ` mask="url(#${id}-m${pz.i})"`;
    }
    cuerpo += `<path data-pieza="${pz.i}" d="${pz.d}" fill="${mono ? 'currentColor' : `url(#${id}-g${pz.petalo})`}"${mascara}/>`;
  }
  const rotulo = titulo ? `role="img" aria-label="${titulo}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="flor ${clase}" viewBox="${vx} ${vy} ${vw} ${vh}" ${rotulo}><defs>${defs}</defs>${cuerpo}</svg>`;
}

const ORDEN = (() => {
  const lista = [];
  FLOR.petalos.forEach((p, k) => {
    const largos = p.piezas.map(i => FLOR.piezas.find(z => z.i === i).largo);
    const total = largos[0] + largos[1];
    const t0 = k * .115, dur = .42;
    lista.push({ i: p.piezas[0], desde: t0, hasta: t0 + dur * largos[0] / total });
    lista.push({ i: p.piezas[1], desde: t0 + dur * largos[0] / total, hasta: t0 + dur });
  });
  return lista;
})();

export function dibujar(svg, p) {
  const fin = ORDEN.reduce((m, o) => Math.max(m, o.hasta), 0);
  for (const o of ORDEN) {
    const v = Math.min(1, Math.max(0, (p * fin - o.desde) / (o.hasta - o.desde)));
    const tramo = svg.querySelector(`mask[id$="-m${o.i}"] path`);
    if (tramo) tramo.setAttribute('stroke-dashoffset', (1 - v).toFixed(4));
  }
}

const K = 1 / (FLOR.caja[3] - FLOR.caja[1]);
const CX = (FLOR.caja[0] + FLOR.caja[2]) / 2, CY = (FLOR.caja[1] + FLOR.caja[3]) / 2;
const A3 = (x, y) => [(x - CX) * K, -(y - CY) * K];
const ANCHO = FLOR.ancho * K;
export const PROPORCION = (FLOR.caja[2] - FLOR.caja[0]) / (FLOR.caja[3] - FLOR.caja[1]);

const CINTA = {
  grosor: ANCHO * .44,
  canto: ANCHO * .17,
  hundir: ANCHO * .9,
  subir: ANCHO * .38,
  radio: ANCHO * 2.1,
  cerrada: 1.32,
};

function forma(THREE, d) {
  const s = new THREE.Shape();
  const nums = t => t.trim().split(/[\s,]+/).map(Number);
  for (const [, c, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const v = args ? nums(args) : [];
    if (c === 'M') s.moveTo(...A3(v[0], v[1]));
    else if (c === 'L') s.lineTo(...A3(v[0], v[1]));
    else if (c === 'C') s.bezierCurveTo(...A3(v[0], v[1]), ...A3(v[2], v[3]), ...A3(v[4], v[5]));
  }
  return s;
}

function soldar(THREE, geo, zMax) {
  const pos = geo.getAttribute('position');
  const mapa = new Map(), nuevos = [], indice = [], tapa = new Map();
  const q = 1e5, eps = zMax * 1e-3;
  for (let t = 0; t < pos.count; t += 3) {
    let lado = 0;
    const z0 = pos.getZ(t), z1 = pos.getZ(t + 1), z2 = pos.getZ(t + 2);
    if (Math.abs(z0 - zMax) < eps && Math.abs(z1 - zMax) < eps && Math.abs(z2 - zMax) < eps) lado = 1;
    else if (Math.abs(z0 + zMax) < eps && Math.abs(z1 + zMax) < eps && Math.abs(z2 + zMax) < eps) lado = -1;
    for (let k = 0; k < 3; k++) {
      const i = t + k, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const clave = `${lado}|${Math.round(x * q)}|${Math.round(y * q)}|${Math.round(z * q)}`;
      let j = mapa.get(clave);
      if (j === undefined) { j = nuevos.length / 3; mapa.set(clave, j); nuevos.push(x, y, z); if (lado) tapa.set(j, lado); }
      indice.push(j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(nuevos, 3));
  g.setIndex(indice);
  return { geo: g, tapa: [...tapa.entries()] };
}

export function flor3D(THREE) {
  const uniformes = {
    uBrillo: { value: 0 },
    uFade: { value: 0 },
    uFadeDesde: { value: .62 },
    uFondoA: { value: new THREE.Color(0xc8a2ec) },
    uFondoB: { value: new THREE.Color(0xf3dded) },
    uRes: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: .4, metalness: 0, clearcoat: .4, clearcoatRoughness: .28,
  });
  material.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniformes);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uBrillo, uFade, uFadeDesde; uniform vec3 uFondoA, uFondoB; uniform vec2 uRes;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vColor.rgb * uBrillo;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float sy = 1.0 - gl_FragCoord.y / uRes.y;
        vec3 fondo = mix(uFondoA, uFondoB, smoothstep(0.0, 0.6, sy));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fondo, uFade * smoothstep(uFadeDesde, 1.02, sy));`);
  };

  const grupo = new THREE.Group();
  grupo.name = 'flor';
  const color = new THREE.Color(), ca = new THREE.Color(), cb = new THREE.Color();
  const petalos = FLOR.petalos.map((p, k) => {
    const [bx, by] = A3(...p.bisagra);
    const dir = new THREE.Vector2(p.eje[0], -p.eje[1]).normalize();
    const eje = new THREE.Vector3(-dir.y, dir.x, 0);
    const g = new THREE.Group();
    g.position.set(bx, by, 0);
    g.userData = { eje, k };
    grupo.add(g);
    const [[ax, ay, cA], [bx2, by2, cB]] = p.grad;
    ca.set(cA); cb.set(cB);
    const gx = bx2 - ax, gy = by2 - ay, gl2 = gx * gx + gy * gy;
    for (const i of p.piezas) {
      const pz = FLOR.piezas.find(z => z.i === i);
      const ext = new THREE.ExtrudeGeometry(forma(THREE, pz.d), {
        depth: CINTA.grosor, bevelEnabled: true, bevelThickness: CINTA.canto, bevelSize: CINTA.canto,
        bevelOffset: -CINTA.canto, bevelSegments: 6, curveSegments: 8, steps: 1,
      });
      ext.translate(0, 0, -CINTA.grosor / 2);
      const { geo, tapa } = soldar(THREE, ext, CINTA.grosor / 2 + CINTA.canto);
      ext.dispose();
      const pos = geo.getAttribute('position');
      const cols = new Float32Array(pos.count * 3);
      const abajo = FLOR.cruces.filter(c => c.abajo === i), arriba = FLOR.cruces.filter(c => c.arriba === i);
      const desnivel = (x, y) => {
        const px = x / K + CX, py = -y / K + CY;
        let dz = i === 6 ? -CINTA.hundir * .7 : 0;
        for (const c of abajo) { const d = Math.hypot(px - c.en[0], py - c.en[1]) * K; dz -= CINTA.hundir * Math.exp(-((d / CINTA.radio) ** 2)); }
        for (const c of arriba) { const d = Math.hypot(px - c.sobre[0], py - c.sobre[1]) * K; dz += CINTA.subir * Math.exp(-((d / CINTA.radio) ** 2)); }
        return dz;
      };
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v);
        pos.setZ(v, pos.getZ(v) + desnivel(x, y));
        const px = x / K + CX, py = -y / K + CY;
        const t = Math.min(1, Math.max(0, ((px - ax) * gx + (py - ay) * gy) / gl2));
        color.copy(ca).lerp(cb, t);
        cols[v * 3] = color.r; cols[v * 3 + 1] = color.g; cols[v * 3 + 2] = color.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      const nor = geo.getAttribute('normal'), e = ANCHO * .05;
      for (const [v, signo] of tapa) {
        const x = pos.getX(v), y = pos.getY(v);
        const gxz = (desnivel(x + e, y) - desnivel(x - e, y)) / (2 * e), gyz = (desnivel(x, y + e) - desnivel(x, y - e)) / (2 * e);
        const n = new THREE.Vector3(-gxz * signo, -gyz * signo, signo).normalize();
        nor.setXYZ(v, n.x, n.y, n.z);
      }
      geo.translate(-bx, -by, 0);
      const malla = new THREE.Mesh(geo, material);
      malla.castShadow = true;
      malla.receiveShadow = true;
      g.add(malla);
    }
    return g;
  });

  function abrir(v, t = 0) {
    for (const g of petalos) {
      const { eje, k } = g.userData;
      const retraso = k * .07;
      const a = Math.min(1, Math.max(0, (v - retraso) / (1 - .35)));
      const suave = a * a * (3 - 2 * a);
      const respira = Math.sin(t * .9 + k * 1.1) * .018 * v;
      g.quaternion.setFromAxisAngle(eje, (1 - suave) * CINTA.cerrada + respira);
      const s = .55 + .45 * suave;
      g.scale.setScalar(s);
    }
  }
  abrir(1);
  return { grupo, material, uniformes, abrir, petalos };
}
