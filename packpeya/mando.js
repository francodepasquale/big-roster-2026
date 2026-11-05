// Los controles del mapa: arrastrar, pellizcar, rueda, teclado y botones. No sabe de 3D: le habla a `libre`, en escena.js.
// Rueda o dos dedos en el trackpad: mueven. Pellizco, Ctrl + rueda, doble clic o + y −: acercan.
import { sonar } from './sonido.js';

export function crearMando(pantalla, libre, { activo, tocar, alArrastrar }) {
  const root = document.documentElement, dedos = new Map();
  let movido = 0, pinza = 0, vx = 0, vy = 0, antes = 0, agarro = false;
  const propio = e => e.target.closest('.app, .mando, .grab, .tab, .perilla, .sonido');
  const acercar = (f, x, y) => { sonar('gota', f < 1); libre.acercar(f, x, y); };
  const centrar = () => { sonar('slide'); libre.centrar(); };

  pantalla.addEventListener('pointerdown', e => {
    if (propio(e) || !activo()) return;
    pantalla.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movido = pinza = vx = vy = 0; antes = e.timeStamp; agarro = false;
    if (activo()) libre.agarrar(true);
    root.classList.add('is-agarrado');
  });
  pantalla.addEventListener('pointermove', e => {
    const d = dedos.get(e.pointerId);
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    movido += Math.abs(dx) + Math.abs(dy);
    if (!activo()) return;
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinza) libre.acercar(pinza / dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinza = dist; movido = 99;
      return libre.mover(dx / 2, dy / 2);
    }
    if (movido > 5) { if (!agarro) sonar('tic'); agarro = true; alArrastrar(); }
    libre.mover(dx, dy);
    const dt = Math.max(e.timeStamp - antes, 1) / 1000; antes = e.timeStamp;
    vx = vx * .7 + dx / dt * .3; vy = vy * .7 + dy / dt * .3;
  });
  const soltar = e => {
    if (!dedos.delete(e.pointerId)) return;
    if (dedos.size) { pinza = 0; return; }
    root.classList.remove('is-agarrado');
    if (activo()) libre.agarrar(false);
    if (movido < 6) return tocar(e.clientX, e.clientY);
    if (activo() && e.timeStamp - antes < 90) libre.soltar(vx, vy); // si soltó en movimiento, sigue por inercia
  };
  pantalla.addEventListener('pointerup', soltar);
  pantalla.addEventListener('pointercancel', soltar);

  pantalla.addEventListener('wheel', e => {
    if (!activo() || propio(e)) return;
    e.preventDefault();
    if (e.ctrlKey) libre.acercar(Math.exp(e.deltaY * .012), e.clientX, e.clientY);
    else libre.mover(-e.deltaX, -e.deltaY);
  }, { passive: false });
  pantalla.addEventListener('dblclick', e => { if (activo() && !propio(e)) acercar(.55, e.clientX, e.clientY); });

  const FLECHAS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  addEventListener('keydown', e => {
    if (!activo() || e.target.matches('input')) return;
    if (FLECHAS[e.key]) { e.preventDefault(); libre.empujar(...FLECHAS[e.key]); }
    else if (e.key === '+' || e.key === '=') acercar(.7);
    else if (e.key === '-') acercar(1.4);
    else if (e.key === '0') centrar();
  });

  const acciones = { mas: () => acercar(.6), menos: () => acercar(1.65), centro: centrar };
  document.querySelector('.mando').addEventListener('click', e => acciones[e.target.closest('button')?.dataset.mapa]?.());
}
