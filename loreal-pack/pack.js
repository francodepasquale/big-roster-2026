// El pack, en dos etapas:
//   1. el carrusel: la cinta con los 17 es lo único que se ve, con un título y dos flechas.
//   2. el detalle: al tocar una tarjeta, su video corre en la pantalla de la sala y su producto sube a la tarima,
//      adelante. Al lado, sus tarjetas: Creador, Producto y La idea (el título y sus cuatro momentos). Se cierra con ×,
//      con Esc o volviendo al carrusel; las flechas pasan a la salida anterior o a la siguiente.
// No sabe nada de 3D.
import { crearPila } from './tarjetas.js';
const CRUZ = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';
const ANT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4.5L6.5 10l5.5 5.5"/></svg>';
const SIG = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5l5.5 5.5L8 15.5"/></svg>';

export function crearPack({ raiz, perfiles, divisiones, momentos, foto, sonar, alAbrir, alCerrar, alPaso, alMomento, sinCinta = false }) {
  let abierto = null;
  const marcas = new Set(perfiles.map(p => p.marca)).size;
  raiz.innerHTML = `
    <div class="pack__cab">
      <h2 class="serif titulo">El pack.</h2>
      <p class="bajada">${perfiles.length} creadores, ${marcas} marcas del grupo. Tocá una tarjeta para ver su salida.</p>
    </div>
    <div class="pack__control vidrio-pill" role="toolbar" aria-label="Recorrer el pack">
      <button type="button" class="redondo" data-paso="-1" aria-label="Anterior">${ANT}</button>
      <button type="button" class="redondo" data-paso="1" aria-label="Siguiente">${SIG}</button>
    </div>
    <div class="detalle" aria-hidden="true">
      <div class="detalle__panel vidrio" role="dialog" aria-label="La salida" data-lenis-prevent>
        <div class="detalle__barra">
          <button type="button" class="redondo" data-paso="-1" aria-label="Anterior">${ANT}</button>
          <button type="button" class="redondo" data-paso="1" aria-label="Siguiente">${SIG}</button>
          <button type="button" class="redondo detalle__cerrar" data-cerrar aria-label="Volver al carrusel">${CRUZ}</button>
        </div>
        <div class="detalle__pila"></div>
      </div>
    </div>`;
  const detalle = raiz.querySelector('.detalle');
  const pila = crearPila(raiz.querySelector('.detalle__pila'), { momentos, divisiones, foto, alTocar: () => sonar('slide'), alMomento: k => { sonar('pip'); alMomento(abierto, k); } });

  function abrir(i) {
    const nuevo = abierto == null;
    abierto = i; pila.marcar(-1); pila.pintar(perfiles[i]); pila.activar(0);
    detalle.classList.add('is-abierto'); detalle.setAttribute('aria-hidden', 'false'); raiz.classList.add('con-detalle');
    if (nuevo) { sonar('abre'); raiz.querySelector('[data-cerrar]').focus({ preventScroll: true }); }
    alAbrir(i);
  }
  function cerrar({ sonido = true } = {}) {
    if (abierto == null) return;
    abierto = null;
    detalle.classList.remove('is-abierto'); detalle.setAttribute('aria-hidden', 'true'); raiz.classList.remove('con-detalle');
    if (sonido) sonar('thup');
    alCerrar();
  }
  raiz.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.paso) { sonar('pip'); const i = alPaso(+b.dataset.paso); if ((abierto != null || sinCinta) && i != null) abrir(i); } // sin 3D no hay cinta: las flechas abren la salida
    else if ('cerrar' in b.dataset) cerrar();
  });
  return { abrir, cerrar, abierto: () => abierto, pila };
}
