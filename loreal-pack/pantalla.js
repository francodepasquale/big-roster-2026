// La pantalla LED del fondo de la pasarela. Es un lienzo 2D que se usa como textura en la sala (sala.js le pone la
// grilla de píxeles). Muestra un estado por vez y pasa de uno a otro con un fundido:
//   { tipo: 'apagada' }
//   { tipo: 'titulo', texto, sub }          palabras grandes en la serif
//   { tipo: 'clip', perfil }                el video vertical del creador, con su nombre y su marca
//   { tipo: 'foto', perfil, oscura }        lo mismo con la foto (mientras carga el clip, o si no hay)
// Se dibuja en 1280 × 720 con coordenadas de 1600 × 900. Con un clip, solo redibuja cuando el video trae un cuadro nuevo.
// Nunca muestra una pantalla negra mientras carga un video: dibuja la foto hasta que hay cuadro.
const W = 1600, H = 900, ESCALA = .8, FUNDIDO = .45;
// el nombre y la marca van en el tercio de arriba: en el detalle, el producto tapa la parte de abajo de la pantalla
const FILA = 262;
const SERIF = "'Bodoni Moda', serif", SANS = "'Inter Tight', sans-serif";

export class Pantalla {
  constructor({ fotos, video }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * ESCALA; this.canvas.height = H * ESCALA;
    this.g = this.canvas.getContext('2d');
    this.fotos = fotos; this.video = video;
    this.actual = { tipo: 'apagada' }; this.anterior = null; this.t = 1; this.sucio = true; this.reloj = 0; this.cuadroNuevo = false;
  }
  poner(estado) {
    if (igual(estado, this.actual)) return;
    this.anterior = this.actual; this.actual = estado; this.t = 0; this.sucio = true;
    this.videos(estado);
  }
  videos(estado) { // reproduce el clip que se ve, pausa el resto y avisa cuando hay un cuadro nuevo
    const quiero = estado.tipo === 'clip' ? this.video(estado.perfil) : null;
    for (const v of document.querySelectorAll('video.clip')) {
      if (v === quiero) {
        if (v.paused) v.play().catch(() => {});
        if (v.requestVideoFrameCallback && !v._avisa) { v._avisa = true; const avisar = () => { if (v === this.video(this.actual.perfil)) this.cuadroNuevo = true; v.requestVideoFrameCallback(avisar); }; v.requestVideoFrameCallback(avisar); }
      } else if (!v.paused) v.pause();
    }
  }
  /** Devuelve true si cambió el dibujo (para subir la textura) */
  actualizar(dt) {
    this.reloj += dt;
    const e = this.actual, conVideo = e.tipo === 'clip';
    if (this.t < 1) { this.t = Math.min(1, this.t + dt / FUNDIDO); this.sucio = true; }
    if (conVideo && (this.cuadroNuevo || !this.video(e.perfil)?.requestVideoFrameCallback)) this.sucio = true;
    if (!this.sucio) return false;
    this.cuadroNuevo = false;
    const g = this.g;
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (this.t < 1 && this.anterior) { g.globalAlpha = 1 - this.t; this.dibujar(this.anterior); }
    g.globalAlpha = this.t; this.dibujar(e);
    g.globalAlpha = 1;
    this.sucio = false;
    return true;
  }
  dibujar(e) {
    const g = this.g, alfa = g.globalAlpha;
    g.textBaseline = 'alphabetic';
    switch (e.tipo) {
      case 'titulo': {
        g.fillStyle = '#fff'; g.textAlign = 'center';
        g.font = `400 ${e.sub ? 170 : 200}px ${SERIF}`;
        g.fillText(e.texto, W / 2, H / 2 + (e.sub ? 10 : 60), W - 160);
        if (e.sub) { g.font = `500 46px ${SANS}`; g.fillStyle = '#a8a8a8'; g.fillText(e.sub, W / 2, H / 2 + 120, W - 200); }
        break;
      }
      case 'clip': case 'foto': {
        const p = e.perfil, v = e.tipo === 'clip' ? this.video(p) : null, w = H * 9 / 16, x = (W - w) / 2;
        const cuadro = v && v.readyState >= 2 ? v : this.fotos.get(p);
        if (cuadro) {
          g.globalAlpha = alfa * .16; cubrir(g, cuadro, x - w - 28, 0, w, H); cubrir(g, cuadro, x + w + 28, 0, w, H);
          g.globalAlpha = alfa * (e.oscura ? .4 : 1); cubrir(g, cuadro, x, 0, w, H);
          g.globalAlpha = alfa;
        } else iniciales(g, p, x, 0, w, H);
        g.fillStyle = '#fff';
        g.textAlign = 'right'; g.font = `400 66px ${SERIF}`;
        partir(p.nombre, 2).forEach((l, i, ls) => g.fillText(l, x - 70, FILA + (i - (ls.length - 1) / 2) * 74 + 20));
        g.textAlign = 'left'; g.font = `500 44px ${SANS}`;
        g.fillText(p.marca, x + w + 70, FILA - 6, W - (x + w + 100));
        g.font = `400 34px ${SANS}`; g.fillStyle = '#a8a8a8';
        g.fillText(p.linea, x + w + 70, FILA + 44, W - (x + w + 100));
        break;
      }
      default: break;
    }
  }
}
function cubrir(g, im, x, y, w, h) {
  const iw = im.videoWidth || im.naturalWidth, ih = im.videoHeight || im.naturalHeight;
  if (!iw || !ih) return;
  const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
  g.drawImage(im, (iw - sw) / 2, (ih - sh) * .35, sw, sh, x, y, w, h);
}
function iniciales(g, p, x, y, w, h) {
  g.fillStyle = '#161616'; g.fillRect(x, y, w, h);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 ${Math.round(w * .38)}px ${SERIF}`;
  g.fillText(p.nombre.split(' ').map(s => s[0]).join('').slice(0, 2), x + w / 2, y + h / 2);
  g.textBaseline = 'alphabetic';
}
function partir(texto, max) {
  const ps = texto.split(' ');
  if (ps.length < 2 || texto.length < 11) return [texto];
  const mitad = Math.ceil(ps.length / 2);
  return [ps.slice(0, mitad).join(' '), ps.slice(mitad).join(' ')].slice(0, max);
}
function igual(a, b) {
  if (a.tipo !== b.tipo) return false;
  return a.texto === b.texto && a.sub === b.sub && a.perfil === b.perfil && a.oscura === b.oscura;
}
