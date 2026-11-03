// Seguimiento del pedido. Sigue la tarjeta de estado de referencia (materiales/referencia/order-status-card-inspora.mp4):
// el botón corre por la barra, se achica y cambia de ícono en cada etapa, y el texto se funde con desenfoque.
// La etapa la decide app.js según la sección; el avance (0–1) sale del scroll.

const STAGES = [
  { title: 'Confirmamos tu pedido', sub: 'Función completa · Damián × PedidosYa' },
  { title: 'Preparando tu pedido', sub: 'Estamos eligiendo la película' },
  { title: 'Juan Pablo ya está en camino', sub: 'Tu pedido salió del local' },
  { title: 'Está llegando', sub: 'Juan Pablo está en la puerta' },
  { title: '¡Llegó tu pedido!', sub: 'Que disfrutes la función' },
];

export function createHud(el, { gsap, reduced = false }) {
  const title = el.querySelector('.hud__title');
  const sub = el.querySelector('.hud__sub');
  const min = el.querySelector('.hud__min');
  const segs = [...el.querySelectorAll('.hud__seg')];
  const knob = el.querySelector('.hud__knob');
  const icons = [...el.querySelectorAll('.hud__ico')];
  const confetti = el.querySelector('.hud__confetti');
  const stars = [...el.querySelectorAll('.hud__stars button')];
  const question = el.querySelector('.hud__rate-q');

  // Franja horaria real, a partir de la hora de quien mira la presentación
  const fmt = d => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const now = Date.now();
  el.querySelector('.hud__range').textContent = `${fmt(new Date(now + 18 * 6e4))} – ${fmt(new Date(now + 28 * 6e4))}`;

  let stage = 0, shownMin = 18, arrived = false, rated = false;

  // Si las etapas cambian muy rápido (un salto con la isla), todo lo viejo sale y solo queda el último texto
  function swap(box, text) {
    const olds = [...box.querySelectorAll('span')];
    if (olds.length && olds[olds.length - 1].textContent === text) return;
    const next = document.createElement('span');
    next.textContent = text;
    box.append(next);
    olds.forEach(old => {
      gsap.killTweensOf(old);
      if (reduced) return old.remove();
      gsap.to(old, { y: -12, opacity: 0, filter: 'blur(6px)', duration: .4, ease: 'power2.in', onComplete: () => old.remove() });
    });
    if (!reduced) gsap.fromTo(next, { y: 12, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .7, delay: .12, ease: 'expo.out' });
  }

  let iconTl = null, iconTarget = 0;
  function showIcon(i) { icons.forEach((s, j) => s.classList.toggle('is-on', j === i)); }
  function setIcon(i) {
    if (i === iconTarget) return;
    iconTarget = i;
    if (reduced) return showIcon(i);
    iconTl?.kill();
    iconTl = gsap.timeline()
      .to(knob, { scale: .42, duration: .22, ease: 'power2.in' })
      .add(() => showIcon(iconTarget))
      .to(knob, { scale: 1, duration: .6, ease: 'back.out(2.6)' });
  }

  function burst() {
    if (reduced) return;
    const colors = ['#FA0050', '#141414', '#FA0050', '#d6d2cc'];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement('i');
      c.style.background = colors[i % colors.length];
      confetti.append(c);
      const x = (Math.random() - .5) * 420, y = -90 - Math.random() * 170;
      gsap.timeline({ onComplete: () => c.remove() })
        .set(c, { x: 0, y: 30, rotation: Math.random() * 180, scale: .6 + Math.random() * .6 })
        .to(c, { x, y, rotation: '+=' + (Math.random() * 360 - 180), duration: .7 + Math.random() * .3, ease: 'power3.out' })
        .to(c, { y: y + 160 + Math.random() * 80, opacity: 0, duration: 1.1, ease: 'power1.in' });
    }
  }

  function setStage(i) {
    if (i === stage) return;
    stage = i;
    swap(title, STAGES[i].title);
    swap(sub, STAGES[i].sub);
    setIcon(i);
    const isArrived = i === STAGES.length - 1;
    if (isArrived !== arrived) {
      arrived = isArrived;
      el.classList.toggle('is-arrived', arrived);
      if (arrived) burst();
    }
  }

  // p: avance del pedido 0–1 · s: etapa 0–4
  function update(p, s) {
    p = Math.min(1, Math.max(0, p));
    knob.style.setProperty('--p', p.toFixed(4));
    segs.forEach((seg, i) => seg.style.setProperty('--f', Math.min(1, Math.max(0, p * 4 - i)).toFixed(3)));
    const m = Math.max(1, Math.ceil(18 * (1 - p)));
    if (m !== shownMin) { shownMin = m; min.textContent = m; }
    setStage(s);
  }

  stars.forEach((b, i) => b.addEventListener('click', () => {
    stars.forEach((s, j) => s.classList.toggle('is-on', j <= i));
    if (!rated) { rated = true; swap(question, i >= 3 ? '¡Gracias por venir a la función!' : 'Gracias. Lo charlamos.'); }
    if (i >= 3) burst();
  }));
  // swap() necesita un <span> adentro
  question.innerHTML = `<span>${question.textContent}</span>`;
  question.style.position = 'relative';

  return {
    update,
    show(on) { el.classList.toggle('is-visible', on); el.inert = !on; },
    get arrived() { return arrived; },
  };
}
