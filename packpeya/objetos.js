// Los objetos en 3D: la mochila, la bolsa de papel, la hamburguesa, el repartidor y el celular.
// Cada función devuelve el grupo listo y las piezas que se animan; dónde van lo deciden visor.js y escena.js.
import * as THREE from 'three';

const PACK_RED = '#EE1C45', CYAN = '#3EC1EC', KRAFT = '#c99f68', BAG_RED = '#d22a2d';
export const MOCHILA = { ancho: 1, alto: .8, tapa: .17, fondo: .86 };
export const BOLSA = { ancho: .67, alto: .74, fondo: .27 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
// Las caras de BoxGeometry no comparten vértices: se promedian las normales para que no se vean costuras
function smoothNormals(geo) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, map = new Map();
  const key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i), acc = map.get(k) || [0, 0, 0];
    acc[0] += n.getX(i); acc[1] += n.getY(i); acc[2] += n.getZ(i); map.set(k, acc);
  }
  for (let i = 0; i < p.count; i++) {
    const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
}
// Caja redondeada; con bulge las caras se inflan un poco, como tela acolchada
function roundedBox(w, h, d, r, seg = 6, bulge = 0) {
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = geo.attributes.position;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    o.fromBufferAttribute(p, i);
    c.set(clamp(o.x, -hw, hw), clamp(o.y, -hh, hh), clamp(o.z, -hd, hd));
    v.copy(o).sub(c).normalize().multiplyScalar(r).add(c);
    if (bulge) {
      const fx = 1 - (o.x / (w / 2)) ** 2, fy = 1 - (o.y / (h / 2)) ** 2, fz = 1 - (o.z / (d / 2)) ** 2;
      if (Math.abs(o.z) >= d / 2 - 1e-4) v.z += Math.sign(o.z) * bulge * fx * fy;
      if (Math.abs(o.x) >= w / 2 - 1e-4) v.x += Math.sign(o.x) * bulge * fy * fz;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  smoothNormals(geo);
  return geo;
}
function loopTube(w, h, r, radius, place) {
  const pts = roundedRect(w, h, r).getSpacedPoints(160).map(p => place(p.x, p.y));
  pts.pop();
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 220, radius, 8, true);
}
function canvasTexture(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
const trama = () => canvasTexture(256, (g, s) => {
  const id = g.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4, v = 128 + 38 * Math.sin(x * 1.6) * Math.sin(y * 1.6) + (Math.random() - .5) * 40;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}, 5);
const arrugas = () => canvasTexture(256, (g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const v = Math.random() > .5 ? 255 : 0, x = Math.random() * s, y = Math.random() * s;
    g.strokeStyle = `rgba(${v},${v},${v},.2)`; g.lineWidth = 1 + Math.random() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 90, y + (Math.random() - .5) * 90); g.stroke();
  }
}, 2);
const papel = () => canvasTexture(256, (g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const v = Math.random() > .5 ? 200 : 60;
    g.fillStyle = `rgba(${v},${v},${v},.16)`; g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 7, 1);
  }
}, 2);

export function crearMochila(iso, word) {
  const { ancho: W, alto: H, tapa: L, fondo: D } = MOCHILA, R = .075;
  const group = new THREE.Group(), weave = trama();
  const sheenColor = new THREE.Color('#ff8aa2');
  const tela = extra => new THREE.MeshPhysicalMaterial({ roughness: .78, sheen: .7, sheenRoughness: .6, sheenColor, bumpMap: weave, bumpScale: .55, ...extra });
  const rojo = tela({ color: PACK_RED });
  const gris = new THREE.MeshPhysicalMaterial({ color: '#8d9095', roughness: .4, metalness: .25, bumpMap: weave, bumpScale: .3 });
  const foil = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: .32, bumpMap: arrugas(), bumpScale: 2.2 });
  const foilIn = foil.clone(); foilIn.side = THREE.BackSide;
  const celeste = new THREE.MeshStandardMaterial({ color: CYAN, roughness: .55 });
  const oculto = new THREE.MeshBasicMaterial({ visible: false });

  const cara = dibujar => {
    const map = canvasTexture(1024, (g, s) => {
      g.fillStyle = PACK_RED; g.fillRect(0, 0, s, s);
      g.fillStyle = '#8d9095'; g.fillRect(0, s * .73, s, s * .27);
      dibujar?.(g);
    });
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    return tela({ map });
  };
  const frente = cara(g => { g.drawImage(iso, 312, 120, 400, 321); g.drawImage(word, 182, 480, 660, 171); });
  const lado = cara(g => { g.drawImage(word, 212, 360, 600, 156); });

  // base abierta arriba. Orden de las caras: +x, -x, +y, -y, +z (frente), -z (espalda)
  group.add(new THREE.Mesh(roundedBox(W, H, D, R, 12, .022), [lado, lado, oculto, gris, frente, frente]));
  const forro = new THREE.Mesh(new THREE.BoxGeometry(W - .07, H - .05, D - .07), [foilIn, foilIn, oculto, foilIn, foilIn, foilIn]);
  forro.position.y = .02; group.add(forro);
  const boca = roundedRect(W - .004, D - .004, R); boca.holes.push(roundedRect(W - .07, D - .07, R * .5));
  const borde = new THREE.Mesh(new THREE.ShapeGeometry(boca, 16), rojo);
  borde.rotation.x = -Math.PI / 2; borde.position.y = H / 2 - .004; group.add(borde);

  const inset = R * .29, tubo = (w, h, place, r = .013, m = celeste) => new THREE.Mesh(loopTube(w, h, R * .72, r, place), m);
  group.add(tubo(W - inset * 2, H - inset * 2, (x, y) => new THREE.Vector3(x, y, D / 2 - inset)));
  group.add(tubo(W - inset * 2, H - inset * 2, (x, y) => new THREE.Vector3(x, y, -D / 2 + inset)));
  group.add(tubo(W - inset * 2, D - inset * 2, (x, z) => new THREE.Vector3(x, -H / 2 + inset, z)));
  group.add(tubo(W + .004, D + .004, (x, z) => new THREE.Vector3(x, H / 2 - .035, z), .009, new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: .5, metalness: .3 })));
  const tirador = new THREE.Mesh(new THREE.BoxGeometry(.035, .08, .012), celeste); tirador.position.set(W / 2 - .12, H / 2 - .075, D / 2 + .03); group.add(tirador);
  [-1, 1].forEach(s => {
    const lateral = new THREE.CatmullRomCurve3([[s * (W / 2 + .005), H / 2 - .16, -.22], [s * (W / 2 + .1), H / 2 - .06, -.08], [s * (W / 2 + .1), H / 2 - .06, .08], [s * (W / 2 + .005), H / 2 - .16, .22]].map(p => new THREE.Vector3(...p)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(lateral, 40, .02, 8, false), celeste));
    const espalda = new THREE.CatmullRomCurve3([[s * .2, H / 2 - .1, -D / 2 - .01], [s * .23, .05, -D / 2 - .12], [s * .27, -H / 2 + .12, -D / 2 - .02]].map(p => new THREE.Vector3(...p)));
    const tira = new THREE.Mesh(new THREE.TubeGeometry(espalda, 30, .045, 10, false), rojo); tira.scale.x = .6; group.add(tira);
  });

  // tapa con bisagra atrás, manija celeste arriba
  const bisagra = new THREE.Group(); bisagra.position.set(0, H / 2 + .002, -D / 2); group.add(bisagra);
  const tapa = new THREE.Mesh(roundedBox(W + .012, L, D + .012, R, 10, .012), [rojo, rojo, rojo, foil, rojo, rojo]);
  tapa.position.set(0, L / 2, D / 2); bisagra.add(tapa);
  tapa.add(tubo(W - inset * 2, D - inset * 2, (x, z) => new THREE.Vector3(x, L / 2 - inset, z)));
  const manija = new THREE.Group(); manija.position.y = L / 2; tapa.add(manija);
  const arco = new THREE.CatmullRomCurve3([[-.24, 0, 0], [-.17, .13, 0], [0, .17, 0], [.17, .13, 0], [.24, 0, 0]].map(p => new THREE.Vector3(...p)));
  const correa = new THREE.Mesh(new THREE.TubeGeometry(arco, 40, .03, 10, false), celeste); correa.scale.z = .45; manija.add(correa);
  [-1, 1].forEach(s => { const t = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, .07), celeste); t.position.set(s * .24, .005, 0); manija.add(t); });

  return { group, bisagra, manija, forro };
}

export function crearBolsa(iso, word) {
  const { ancho: W, alto: H, fondo: D } = BOLSA, group = new THREE.Group(), bump = papel();
  const hoja = (color, map) => new THREE.MeshStandardMaterial({ color: map ? '#fff' : color, map: map || null, roughness: .88, bumpMap: bump, bumpScale: .35 });
  const kraft = hoja(KRAFT), kraftIn = hoja('#b98c55'); kraftIn.side = THREE.BackSide;
  const oculto = new THREE.MeshBasicMaterial({ visible: false });
  const teñir = (img, w, h) => { // el logo pasa al color kraft, como la impresión sobre el papel
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'source-in'; g.fillStyle = KRAFT; g.fillRect(0, 0, w, h);
    return c;
  };
  const cara = (w, h, dibujar) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = BAG_RED; g.fillRect(0, 0, w, h); dibujar(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return hoja(null, t);
  };
  const frente = cara(920, 1024, (g, w) => { g.drawImage(teñir(iso, 300, 241), w / 2 - 150, 250, 300, 241); g.drawImage(teñir(word, 600, 156), w / 2 - 300, 540, 600, 156); });
  const lado = cara(380, 1024, (g, w, h) => {
    g.fillStyle = KRAFT; g.fillRect(0, h * .76, w, h * .24);
    g.fillStyle = BAG_RED; g.font = '700 34px Poppins, sans-serif'; g.textAlign = 'center';
    g.fillText('DESCARGÁ', w / 2, h * .86); g.fillText('LA APP', w / 2, h * .86 + 40);
  });
  // pliegue en V de los fuelles
  const fuelle = (w, d) => {
    const geo = new THREE.BoxGeometry(w, H, d, 1, 6, 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (Math.abs(Math.abs(x) - w / 2) < 1e-4) p.setX(i, x - Math.sign(x) * .05 * (1 - Math.abs(z) / (d / 2)));
    }
    geo.computeVertexNormals();
    return geo;
  };
  group.add(new THREE.Mesh(fuelle(W, D), [lado, lado, oculto, kraft, frente, frente]));
  group.add(new THREE.Mesh(fuelle(W - .01, D - .01), [kraftIn, kraftIn, oculto, kraftIn, kraftIn, kraftIn]));
  [1, -1].forEach(s => {
    const z = s * (D / 2 - .004);
    const c = new THREE.CatmullRomCurve3([[-.13, H / 2 - .04, z], [-.115, H / 2 + .08, z], [0, H / 2 + .135, z], [.115, H / 2 + .08, z], [.13, H / 2 - .04, z]].map(p => new THREE.Vector3(...p)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, .011, 8, false), kraft));
  });
  return { group };
}

export function crearHamburguesa() {
  const group = new THREE.Group();
  const mat = (color, roughness = .6) => new THREE.MeshStandardMaterial({ color, roughness });
  const pan = mat('#d9973f', .5);
  const copa = new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), pan);
  copa.scale.y = .62; copa.position.y = .075; group.add(copa);
  const capa = (r, h, color, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat(color)); m.position.y = y; group.add(m); return m; };
  capa(.158, .018, '#58a64a', .062);
  const queso = new THREE.Mesh(new THREE.BoxGeometry(.25, .012, .25), mat('#f2c230', .4)); queso.position.y = .046; queso.rotation.y = .6; group.add(queso);
  capa(.15, .05, '#5b3322', .016);
  capa(.148, .05, '#d9973f', -.036);
  return { group };
}

// El repartidor en moto, con la mochila en la espalda. Mira hacia +z; `ruedas` giran y `luz` es la del frente
export function crearRepartidor(mochila) {
  const group = new THREE.Group(), ruedas = [];
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, ...o });
  const negro = mat('#16171b'), rojo = mat('#e3173e'), blanco = mat('#eef0f2'), piel = mat('#c98f6b');
  const pieza = (geo, m, p, r = [0, 0, 0]) => { const x = new THREE.Mesh(geo, m); x.position.set(...p); x.rotation.set(...r); group.add(x); return x; };
  const capsula = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
  [.62, -.62].forEach(z => {
    const w = pieza(new THREE.TorusGeometry(.24, .075, 12, 30), negro, [0, .31, z], [0, Math.PI / 2, 0]);
    pieza(new THREE.CylinderGeometry(.11, .11, .07, 20), mat('#8a8d93', { metalness: .8 }), [0, .31, z], [0, 0, Math.PI / 2]);
    ruedas.push(w);
  });
  pieza(capsula(.17, .78), rojo, [0, .56, 0], [Math.PI / 2 - .08, 0, 0]); // cuerpo de la moto
  pieza(capsula(.1, .42), negro, [0, .76, -.22], [Math.PI / 2, 0, 0]); // asiento
  pieza(capsula(.05, .42), negro, [0, .72, .55], [.3, 0, 0]); // horquilla
  pieza(capsula(.028, .62), negro, [0, .98, .5], [0, 0, Math.PI / 2]); // manubrio
  pieza(new THREE.BoxGeometry(.12, .05, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, .3, .5) }), [0, .78, -.6]); // luz de atrás
  pieza(new THREE.SphereGeometry(.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6.4, 5) }), [0, .9, .66]); // luz del frente
  pieza(capsula(.2, .36), rojo, [0, 1.2, -.14], [.22, 0, 0]); // torso
  [-1, 1].forEach(s => {
    pieza(capsula(.07, .36), rojo, [s * .2, 1.2, .16], [1.15, 0, s * -.12]); // brazo
    pieza(capsula(.09, .34), negro, [s * .17, .78, .06], [1.2, 0, 0]); // pierna
  });
  pieza(new THREE.SphereGeometry(.17, 24, 18), blanco, [0, 1.62, -.06]); // casco
  pieza(new THREE.SphereGeometry(.13, 20, 14), mat('#101114', { roughness: .15 }), [0, 1.61, .05]); // visor
  pieza(new THREE.CylinderGeometry(.07, .08, .1, 14), piel, [0, 1.46, -.08]);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#2a2430', transparent: true, opacity: .2, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.scale.set(.5, 1.05, 1); sombra.position.y = .02; group.add(sombra);
  mochila.group.scale.setScalar(.56);
  mochila.group.position.set(0, 1.27, -.56);
  mochila.group.rotation.y = Math.PI; // el logo mira para atrás, como en la calle
  group.add(mochila.group);
  return { group, ruedas };
}

// Un celular con pantalla: el material `pantalla` recibe el video
export function crearCelular() {
  const W = .716, H = 1.476, D = .082, R = .118, B = .028, group = new THREE.Group();
  const titanio = new THREE.MeshPhysicalMaterial({ color: '#3d3d41', metalness: 1, roughness: .32, clearcoat: .2 });
  const vidrio = new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: .2, roughness: .45, clearcoat: .6, clearcoatRoughness: .3 });
  // sin el último punto, que repite el primero: con bisel deja una espina en la esquina
  const contorno = new THREE.Shape(roundedRect(W - B * 2, H - B * 2, R - B).getPoints(16).slice(0, -1));
  const cuerpo = new THREE.ExtrudeGeometry(contorno, { depth: D - B * 2, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 8, curveSegments: 40 });
  cuerpo.translate(0, 0, -(D - B * 2) / 2);
  group.add(new THREE.Mesh(cuerpo, [vidrio, titanio]));
  const SW = W - .036, SH = H - .036, geo = new THREE.ShapeGeometry(roundedRect(SW, SH, R - .02), 40);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SW + .5, p.getY(i) / SH + .5);
  const pantalla = new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false });
  const vista = new THREE.Mesh(geo, pantalla); vista.position.z = D / 2 + .001; group.add(vista);
  const isla = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(.205, .06, .03), 16), new THREE.MeshBasicMaterial({ color: '#000' }));
  isla.position.set(0, SH / 2 - .062, D / 2 + .002); group.add(isla);
  return { group, pantalla, aspecto: SW / SH };
}
