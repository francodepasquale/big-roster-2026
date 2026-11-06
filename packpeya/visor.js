// La mochila, la bolsa y el celular para mirar de cerca, también en vista isométrica: se giran arrastrando y se tocan.
// Se dibujan encima de la ciudad.
import * as THREE from 'three';
import { MOCHILA, BOLSA, crearMochila, crearBolsa, crearHamburguesa, crearCelular } from './objetos.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, to, lambda, dt) => lerp(cur, to, 1 - Math.exp(-lambda * dt));
const easeOut = t => 1 - (1 - t) ** 3;
const overshoot = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

export function crearVisor(renderer, env, { iso, word, reduced = false }) {
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentIntensity = .8;
  const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-3, 5, 6); scene.add(key);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 40); camera.position.z = 10;
  const view = { w: 1, h: 4.6, unit: 1 };
  function layout() {
    view.w = view.h * innerWidth / innerHeight; view.unit = Math.min(view.h, view.w * 1.15);
    camera.left = -view.w / 2; camera.right = view.w / 2; camera.top = view.h / 2; camera.bottom = -view.h / 2; camera.updateProjectionMatrix();
  }
  layout();
  addEventListener('resize', layout);
  const mochila = crearMochila(iso, word), bolsa = crearBolsa(iso, word), burger = crearHamburguesa();
  bolsa.group.add(burger.group);
  const celular = crearCelular();
  scene.add(mochila.group, bolsa.group, celular.group);
  const lienzo = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), pincel = lienzo.getContext('2d'), halo = pincel.createRadialGradient(64, 64, 0, 64, 64, 64);
  halo.addColorStop(0, 'rgba(58,50,56,.34)'); halo.addColorStop(.55, 'rgba(58,50,56,.16)'); halo.addColorStop(1, 'rgba(58,50,56,0)');
  pincel.fillStyle = halo; pincel.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzo), transparent: true, depthWrite: false, toneMapped: false }));
  sombra.position.z = -2; scene.add(sombra);
  // la penumbra del interior: hace que lo que está adentro se lea adentro
  const fondoBoca = new THREE.Mesh(new THREE.PlaneGeometry(MOCHILA.ancho - .07, MOCHILA.fondo - .07), new THREE.MeshBasicMaterial({ color: '#1a1216', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  fondoBoca.rotation.x = -Math.PI / 2; fondoBoca.position.y = MOCHILA.alto / 2 - .02; mochila.group.add(fondoBoca);

  // pose: dónde está todo (la manda app.js). x, y: fracción del cuadro desde el centro; s: tamaño; spin: giro; open y rise: tapa y bolsa
  let pose = { x: 0, y: 2, s: .4, spin: 0, open: 0, rise: 0, idle: 0 };
  const mitad = new THREE.Plane();
  const want = { open: 0, burger: 0, focus: 0 }; // lo que pide quien interactúa
  const cur = { open: 0, rise: 0, burger: 0, focus: 0, px: 0, py: 0 };
  const turn = { x: 0, y: 0, vel: 0, held: false, to: null }; // `to`: vuelve de frente por el camino más corto
  const ptr = { x: 0, y: 0 };
  const spring = { swing: 0, swingVel: 0, hop: 0, hopVel: 0 };
    const attach = new THREE.Vector3();

  function tick(dt, t) {
    if (!mochila) return;
    cur.open = pose.quieta ? pose.open : damp(cur.open, Math.max(pose.open, want.open), 7, dt); // quieta: la apertura la mueve con precisión
    cur.rise = damp(cur.rise, Math.max(pose.rise, want.open), 4.5, dt);
    cur.burger = damp(cur.burger, want.burger, 6, dt);
    cur.focus = damp(cur.focus, want.focus, 4.5, dt);
    cur.px = damp(cur.px, ptr.x, 3, dt); cur.py = damp(cur.py, ptr.y, 3, dt);
    if (turn.to !== null) {
      turn.y = damp(turn.y, turn.to, 5, dt);
      if (Math.abs(turn.y - turn.to) < .01) turn.to = null;
    } else if (!turn.held) {
      turn.y += (turn.vel + (reduced ? 0 : pose.idle * .22)) * dt;
      turn.vel *= Math.exp(-2.6 * dt);
      turn.x = damp(turn.x, 0, 1.6, dt);
    }
    spring.swingVel += (-spring.swing * 42 - spring.swingVel * 4.5) * dt; spring.swing += spring.swingVel * dt;
    spring.hopVel += (-spring.hop * 90 - spring.hopVel * 9) * dt; spring.hop += spring.hopVel * dt;

    const sc = pose.s * view.unit, f = easeOut(clamp(cur.focus));
    const cx = pose.x * view.w, cy = pose.y * view.h;
    const bob = reduced ? 0 : Math.sin(t * 1.1) * .012 * view.unit * pose.idle;
    const px = pose.quieta ? 0 : cur.px, py = pose.quieta ? 0 : cur.py; // quieta: exacta a la vista de la ciudad
    const rx = .6155 + turn.x + py * .05, ry = -.785 + pose.spin + turn.y + px * .1; // isométrica, de arranque

    const sq = pose.sq ?? 0;
    mochila.group.scale.set(sc * (1 + sq * .5), sc * (1 - sq), sc * (1 + sq * .5));
    fondoBoca.material.opacity = (pose.boca ?? 0) * .3;
    fondoBoca.visible = fondoBoca.material.opacity > .004;
    mochila.group.position.set(cx - f * view.w * .95, cy + bob, 0);
    mochila.group.rotation.set(rx, ry, 0);
    mochila.bisagra.rotation.x = -1.85 * overshoot(clamp(cur.open));
    mochila.manija.rotation.x = reduced ? 0 : spring.swing * .5;
    mochila.group.updateMatrixWorld(true);
    // la sombra queda en el piso: mientras cae, se concentra a medida que llega
    const piso = pose.suelo ?? pose.y, aire = clamp((pose.y - piso) * 1.1);
    sombra.visible = Math.abs(piso) < .55 || pose.suelo !== undefined;
    sombra.material.opacity = 1 - aire;
    sombra.position.x = cx; sombra.position.y = piso * view.h - sc * .82; sombra.scale.set(sc * .85 * (1 + aire * .5), sc * .24 * (1 + aire * .5), 1);

    // el celular con el video del perfil
    celular.group.visible = !!pose.tel;
    if (pose.tel) {
      celular.group.scale.setScalar(pose.tel.s * view.unit);
      celular.group.position.set(pose.tel.x * view.w, pose.tel.y * view.h, -1);
      celular.group.rotation.set(0, 0, 0); // siempre recto, sin inclinación ni balanceo: la pantalla coincide exacta con el video
    }

    // la bolsa sale de adentro de la mochila; con foco, va al centro
    const r = easeOut(clamp(cur.rise));
    bolsa.group.visible = r > .02 || f > .02;
    if (bolsa.group.visible) {
      attach.set(-.05, lerp(0, MOCHILA.alto / 2 + BOLSA.alto / 2 + .03, r), 0);
      mochila.group.localToWorld(attach);
      bolsa.group.position.set(lerp(attach.x, cx, f), lerp(attach.y, cy - .04 * view.unit, f) + spring.hop * view.unit, lerp(attach.z, 0, f));
      bolsa.group.scale.setScalar(sc * Math.max(lerp(.5, 1.1, r), lerp(.5, 1.55, f)));
      bolsa.group.rotation.set(lerp(rx, .14 + turn.x, f), lerp(ry + .42, ry + .2, f), 0);
      const b = overshoot(clamp(cur.burger));
      burger.group.visible = cur.burger > .02;
      burger.group.position.y = lerp(.1, BOLSA.alto / 2 + .17, b);
      burger.group.rotation.y = t * .6;
      burger.group.scale.setScalar(1.1);
    }
  }

  // Tocar: la mochila se abre y saca la bolsa; la bolsa salta y saca la hamburguesa
  let alTocar = null, alAbrir = null;
  function tap() {
    spring.swingVel += 2.4;
    if (pose.tel) return alTocar?.(); // en una historia, tocar la hace avanzar
    if (want.focus) { want.burger = want.burger ? 0 : 1; spring.hopVel += 1.3; } else { want.open = want.open ? 0 : 1; alAbrir?.(!!want.open); }
  }
  // Una zona de la página que gira los objetos: arrastrar gira, tocar interactúa; también con el teclado
  function grab(el, tocar, abrir) {
    alTocar = tocar; alAbrir = abrir;
    let x = 0, y = 0, moved = 0;
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); x = e.clientX; y = e.clientY; moved = 0; turn.held = true; turn.vel = 0; turn.to = null; el.classList.add('is-held'); });
    el.addEventListener('pointermove', e => {
      if (!turn.held) return;
      const dx = e.clientX - x, dy = e.clientY - y; x = e.clientX; y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      turn.y += dx * .011; turn.x = clamp(turn.x + dy * .006, -.9, .9); turn.vel = dx * .55;
    });
    const up = () => { if (!turn.held) return; turn.held = false; el.classList.remove('is-held'); if (moved < 6) tap(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') turn.vel -= 3; else if (e.key === 'ArrowRight') turn.vel += 3;
      else if (e.key === 'Enter' || e.key === ' ') tap(); else return;
      e.preventDefault();
    });
  }

  return {
    scene, camera, tick, grab, tap,
    setPose(p) { pose = { open: 0, rise: 0, ...p }; },
    pointer(x, y) { ptr.x = x; ptr.y = y; },
    setFocus(cual) { const bolsaOn = cual === 'bolsa'; want.focus = bolsaOn ? 1 : 0; want.open = bolsaOn ? 1 : 0; want.burger = 0; this.face(); },
    face() { turn.vel = 0; turn.to = Math.round(turn.y / (Math.PI * 2)) * Math.PI * 2; },
    kick() { spring.swingVel += 2.4; },
    pantallaOn(on) { celular.pantalla.color.set(on ? '#ffffff' : '#000000'); }, // en negro mientras carga el video de otro perfil: no se ve el cuadro anterior
    medidas() { return view; },
    // Lo que tapa a la isla cuando sale: solo la mitad de adelante de la mochila, sin el forro ni la tapa
    dibujarFrente() {
      const ocultos = [mochila.forro, mochila.bisagra, fondoBoca, sombra, celular.group, bolsa.group], antes = ocultos.map(o => o.visible);
      ocultos.forEach(o => { o.visible = false; });
      mitad.normal.set(1, 0, 1).normalize().applyQuaternion(mochila.group.quaternion);
      mitad.constant = -mitad.normal.dot(mochila.group.position);
      renderer.clippingPlanes = [mitad];
      renderer.render(scene, camera);
      renderer.clippingPlanes = [];
      ocultos.forEach((o, i) => { o.visible = antes[i]; });
    },
    // dónde está la pantalla del celular, en píxeles
    pantallaEnCuadro() {
      const { x, y, s } = pose.tel, k = innerHeight / view.h, sc = s * view.unit;
      return { x: (x * view.w + view.w / 2) * k, y: (view.h / 2 - y * view.h) * k, w: .68 * sc * k, h: 1.44 * sc * k };
    },
    setVideo(video) { // recorta el 9:16 del clip para que entre en la pantalla sin deformarse
      const tex = new THREE.VideoTexture(video), k = celular.aspecto / (9 / 16);
      tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.x = k; tex.offset.x = (1 - k) / 2;
      celular.pantalla.map = tex; celular.pantalla.color.set('#ffffff'); celular.pantalla.needsUpdate = true;
    },
  };
}
