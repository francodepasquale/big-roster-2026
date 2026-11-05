// La apertura. La isla está guardada en la mochila como una bandeja, a la medida de la boca:
// 1. cae girando y se abre; 2. la bandeja sube entera y queda flotando encima, sin tocar nada;
// 3. recién ahí se cierra la tapa y la isla da una vuelta entera mientras la cámara se acerca y la mochila se va por abajo.
// Todo sale de un solo estado (`e`): pintar() lo traduce a la pose de la mochila y al plano de la ciudad.
// Las medidas van en fracciones del alto de pantalla, desde el centro y con arriba positivo.
import { MOCHILA } from './objetos.js';
import { sonar } from './sonido.js';

const LADO_ISLA = 189;           // el lado de la isla, en unidades de la ciudad
const BANDEJA = .74;             // el lado de la bandeja, en unidades de la mochila: entra en la boca (.79)
const VISTA = Math.cos(.6155);   // cuánto se ve de una altura en la vista isométrica
const lerp = (a, b, t) => a + (b - a) * t;

export function crearApertura(scene, { titulo, alLlegar, alTerminar }) {
  const { gsap } = window, a = scene.app, v = scene.visor;
  const piso = -.11; // dónde apoya la mochila
  const e = { giro: -Math.PI * 2, y: .8, sq: -.09, open: 0, boca: 0, lift: -.72, zoom: 0, baja: 0 };
  let hecho = false;

  function pintar() {
    if (hecho) return;
    const m = v.medidas(), tamano = innerWidth <= 900 ? .35 : .27, q = tamano * m.unit / m.h; // alto de pantalla por unidad de mochila
    const fin = scene.portada(), s0 = LADO_ISLA / (BANDEJA * q), z = (s0 / fin.s) ** e.zoom;
    const altura = (e.lift + MOCHILA.alto / 2) * VISTA * q; // del centro de la mochila a la bandeja
    const x = fin.ox, y = lerp(piso + altura, fin.oy, e.zoom);
    const yMochila = y - altura * z - e.baja, aplasta = e.sq * MOCHILA.alto / 2 * VISTA * q; // se aplasta contra el piso
    const cae = Math.max(e.y - piso, 0);
    v.setPose({ x, y: yMochila + cae - aplasta, suelo: yMochila, s: tamano * z ** .75, sq: e.sq, boca: e.boca, open: e.open, quieta: true, spin: e.giro, idle: 0 });
    a.isla = e.open > 0 || e.lift > 0 ? { s: s0 / z, ox: x, oy: y } : null; // cerrada todavía no se ve
  }

  gsap.set(titulo, { opacity: 0 });
  pintar();
  const tl = gsap.timeline({ delay: .3, onUpdate: pintar })
    // cae, se estira en el aire y se aplasta al llegar
    .to(e, { y: piso, duration: .85, ease: 'power1.in' })
    .to(e, { giro: 0, duration: .9, ease: 'sine.out' }, '<')
    .add(() => sonar('caida'), .2)
    .to(e, { sq: .17, duration: .06, ease: 'power1.out', onStart: () => sonar('golpe'), onComplete: () => v.kick() }, .85)
    .to(e, { sq: 0, duration: .8, ease: 'elastic.out(1,.35)' })
    // se abre: adentro se ve la bandeja, al fondo
    .to(e, { open: 1, duration: .42, ease: 'power2.out', onStart: () => sonar('cierre', true) }, '-=.45')
    .to(e, { boca: 1, duration: .4 }, '<')
    // sube entera; la mochila acusa el empujón
    .addLabel('sube', '+=.25')
    .to(e, { lift: 1.02, duration: 1.3, ease: 'back.out(1.15)', onStart: () => sonar('sube') }, 'sube')
    .to(e, { sq: .07, duration: .14, ease: 'power2.out' }, 'sube')
    .to(e, { sq: 0, duration: .6, ease: 'elastic.out(1,.4)' }, 'sube+=.14')
    // ya pasó por encima de la tapa: se cierra y la cámara se acerca
    .addLabel('crece', 'sube+=1.25')
    .add(() => { a.frente = false; }, 'crece')
    .to(e, { open: 0, duration: .32, ease: 'power2.in' }, 'crece')
    .to(e, { boca: 0, duration: .3 }, 'crece')
    .to(e, { sq: .06, duration: .08, ease: 'power2.out', onStart: () => sonar('tapa') }, 'crece+=.32') // suena justo cuando la tapa toca
    .to(e, { sq: 0, duration: .5, ease: 'elastic.out(1,.4)' }, 'crece+=.4')
    .to(a, { giro: Math.PI * 2, duration: 1.72, ease: 'power2.inOut', onComplete: () => { a.giro = 0; } }, 'crece+=.02')
    .to(e, { zoom: 1, duration: 1.6, ease: 'power3.inOut', onStart: () => sonar('vuelo') }, 'crece+=.15')
    .to(e, { baja: .6, duration: 1.25, ease: 'power2.in' }, 'crece+=.4')
    .to(a, { sombra: .55, duration: .5 }, 'sube+=.55')
    .to(a, { sombra: 1, duration: .9, ease: 'power1.inOut' }, 'crece+=.7')
    .to(a, { motoK: 1, duration: .55, ease: 'back.out(2)' }, 'crece+=1.45')
    .add(() => { pintar(); hecho = true; a.apertura = false; a.isla = null; }, 'crece+=1.76')
    // el título, y baja al mapa
    .fromTo(titulo, { yPercent: 18, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: 'expo.out', onStart: () => sonar('titulo') }, 'crece+=1.3')
    .to(titulo, { yPercent: -10, opacity: 0, duration: .55, ease: 'power2.in', onStart: () => sonar('arranque') }, '+=.5')
    .to(a, { intro: 1, duration: 1.4, ease: 'power2.inOut' }, '<')
    .add(alLlegar, '<.6')
    .add(alTerminar);
  return tl;
}
