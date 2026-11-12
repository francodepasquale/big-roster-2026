// La sala del desfile en 3D. Nadie camina: sale la luz, sube el producto y se enciende la pantalla.
// app.js maneja la historia y le pone a la sala un `estado` por cuadro; la sala solo lo dibuja.
//
// Medidas (metros). La pasarela va de z = −26 (la pantalla) a z = 0 (el pedestal y los fotógrafos).
//   pasarela   2,4 × 26, laqueada: refleja de verdad (Reflector), con tiras de LED en los bordes
//   pantalla   LED de 14 × 7,9 en z = −27,6        pedestal   en z = −1,3, sube hasta 0,75
//   gradas     a los dos lados; el público es bokeh de celulares, sin personas
//   cinta      el pack: un óvalo en z = 4,2 que sube del piso, con una tarjeta redondeada por creador
//   invitación en z = 13, antes de entrar
// Imagen: render → brillo (UnrealBloom, a media resolución) → salida con tono neutro.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { EffectComposer } from './assets/vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './assets/vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './assets/vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './assets/vendor/jsm/postprocessing/OutputPass.js';
import { Reflector } from './assets/vendor/jsm/objects/Reflector.js';
import { Pantalla } from './pantalla.js';

const LARGO = 26, ANCHO_P = 2.4, ALTO_P = .25, Z_PEDESTAL = -1.3;
const CINTA = { z: 4.2, rx: 4.6, rz: 2.2, alto: .44 };
const INV = { y: 1.55, z: 13, escala: 1.28 }; // la invitación (sobre + carta), a 1,28 de su tamaño de modelado
const SERIF = "'Bodoni Moda', serif", SANS = "'Inter Tight', sans-serif";
const CALIGRAFIA = "'Pinyon Script', cursive", CARTA = "'Cormorant Garamond', serif"; // las letras de la carta

export function crearSala({ canvas, perfiles, fotos, preparados, video, movil, reducido, salidas = perfiles.length, alFlash = () => {}, alFoco = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('Sin WebGL');
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, movil ? 1.5 : 2);
  const DPR_MIN = movil ? .9 : 1.2;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040404');
  scene.fog = new THREE.FogExp2('#040404', .028);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .22;
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 160);

  // brillo: solo lo muy luminoso (LED, flashes, aros, haces) se abre en un halo
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const brillo = new UnrealBloomPass(new THREE.Vector2(256, 256), .38, .5, .9);
  composer.addPass(brillo);
  composer.addPass(new OutputPass());

  const estado = {
    luz: 0, publico: 0, haces: 0, ola: 0, pasarela: 0, foco: 0, flashes: 0, cinta: 0, color: '#ffffff', ledBrillo: 1, resplandor: 1,
    pedestal: { producto: null, altura: 0 },
    desfile: { lista: [], altura: 0 },
    invitacion: { abre: 0, visible: 1 },
  };
  const BLANCO = new THREE.Color(1, 1, 1), col = new THREE.Color(), colorDupla = new THREE.Color();
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), mtx = new THREE.Matrix4();
  const lerp = THREE.MathUtils.lerp, suave = THREE.MathUtils.smoothstep;
  const textura = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const halo = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return textura(c); })();

  /* ── la sala ── */
  const negro = c => new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0 });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#070707', roughness: .5, metalness: 0, envMapIntensity: .5 }));
  piso.rotation.x = -Math.PI / 2; piso.position.z = -10; scene.add(piso);
  const pasarela = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_P, ALTO_P, LARGO), new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: .14, metalness: 0, envMapIntensity: 1 }));
  pasarela.position.set(0, ALTO_P / 2, -LARGO / 2); scene.add(pasarela);
  // la laca de la pasarela: un espejo oscuro (en el teléfono no, por costo)
  if (!movil) {
    const espejo = new Reflector(new THREE.PlaneGeometry(ANCHO_P - .08, LARGO), { textureWidth: 1024, textureHeight: 1024, color: 0x2a2a2a, clipBias: .003 });
    // el Reflector mezcla en «overlay», que deja los blancos en blanco: se cambia por multiplicar, así el reflejo queda
    // tenue y parejo (se ve la laca, no se lee el texto de la pantalla al revés)
    espejo.material.fragmentShader = espejo.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'gl_FragColor = vec4( base.rgb * color, 1.0 );');
    espejo.material.needsUpdate = true;
    espejo.rotation.x = -Math.PI / 2; espejo.position.set(0, ALTO_P + .0015, -LARGO / 2); scene.add(espejo);
  }
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(60, 22), negro('#050505'));
  fondo.position.set(0, 9, -28.4); scene.add(fondo);

  // tiras de LED en los bordes de la pasarela: la luz que camina las enciende a su paso
  const PASO = .6, POR_LADO = Math.floor((LARGO - .8) / PASO) + 1, LUCES = POR_LADO * 2;
  const luces = new THREE.InstancedMesh(new THREE.BoxGeometry(.024, .01, PASO - .03), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), LUCES);
  const zLuz = new Float32Array(LUCES);
  for (let i = 0; i < LUCES; i++) {
    const lado = i < POR_LADO ? -1 : 1, z = -LARGO + .4 + (i % POR_LADO) * PASO;
    zLuz[i] = z; mtx.makeTranslation(lado * (ANCHO_P / 2 - .03), ALTO_P + .005, z); luces.setMatrixAt(i, mtx); luces.setColorAt(i, col.setScalar(0));
  }
  scene.add(luces);
  const luzOla = new THREE.PointLight(0xffffff, 0, 4.5, 2); luzOla.position.set(0, .55, -LARGO); scene.add(luzOla);

  // gradas y público: puntos de luz desenfocados, como celulares filmando desde la penumbra
  const grada = negro('#0a0a0a');
  for (const lado of [-1, 1]) for (let s = 0; s < 3; s++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(.95, .38 * (s + 1), 23), grada);
    g.position.set(lado * (2.7 + s * .95), .19 * (s + 1), -12.6); scene.add(g);
  }
  const CEL = movil ? 140 : 260, posCel = new Float32Array(CEL * 3), colCel = new Float32Array(CEL * 3), celu = [];
  for (let i = 0; i < CEL; i++) {
    const lado = i % 2 ? 1 : -1, s = Math.floor(Math.random() * 3);
    posCel.set([lado * (2.7 + s * .95 + (Math.random() - .5) * .6), .38 * (s + 1) + .5 + Math.random() * .3, -23.6 + Math.random() * 22], i * 3);
    celu.push({ fase: Math.random() * 6.28, base: .2 + Math.random() * .6, calido: Math.random() < .3, filma: Math.random() < .3 });
  }
  const celGeo = new THREE.BufferGeometry();
  celGeo.setAttribute('position', new THREE.BufferAttribute(posCel, 3)); celGeo.setAttribute('color', new THREE.BufferAttribute(colCel, 3));
  const publico = new THREE.Points(celGeo, new THREE.PointsMaterial({ size: .16, map: halo, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
  scene.add(publico);

  // el techo y los haces que bajan a la pasarela
  const metal = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .45, metalness: .7 });
  for (const x of [-2.2, 2.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, 28), metal); b.position.set(x, 7.2, -13); scene.add(b); }
  for (let z = -25; z <= 0; z += 5) { const b = new THREE.Mesh(new THREE.BoxGeometry(4.6, .14, .14), metal); b.position.set(0, 7.2, z); scene.add(b); }
  const hazMat = new THREE.ShaderMaterial({
    uniforms: { intensidad: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float intensidad; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float borde = pow(abs(dot(vN, vV)), 2.6); float a = pow(vY, 2.) * borde * intensidad * .06; gl_FragColor = vec4(vec3(1.), a); }`,
  });
  const hazGeo = new THREE.CylinderGeometry(.06, 1.05, 6.9, 32, 1, true).translate(0, -3.45, 0);
  for (let z = -23; z <= -4; z += 4.75) { const h = new THREE.Mesh(hazGeo, hazMat); h.position.set(0, 7.1, z); scene.add(h); }
  const hazFoco = new THREE.Mesh(new THREE.CylinderGeometry(.05, .8, 6.2, 32, 1, true).translate(0, -3.1, 0), hazMat.clone());
  hazFoco.position.set(0, 7.1, Z_PEDESTAL); scene.add(hazFoco);

  // luces
  const ambiente = new THREE.HemisphereLight('#c8ccd4', '#050505', 0); scene.add(ambiente);
  const foco = new THREE.SpotLight(0xffffff, 0, 16, .3, .75, 1.6); foco.position.set(0, 7.1, Z_PEDESTAL + .4); foco.target.position.set(0, .8, Z_PEDESTAL); scene.add(foco, foco.target);
  const contra = new THREE.SpotLight(0xffffff, 0, 12, .35, .8, 1.6); contra.position.set(0, 3.4, -6.5); contra.target.position.set(0, 1.1, Z_PEDESTAL); scene.add(contra, contra.target);
  const relleno = new THREE.SpotLight(0xffffff, 0, 16, .45, 1, 1.6); relleno.position.set(3.2, 3, 5); relleno.target.position.set(0, .9, Z_PEDESTAL); scene.add(relleno, relleno.target);
  const luzPantalla = new THREE.PointLight(0xffffff, 0, 20, 1.6); luzPantalla.position.set(0, 3.6, -24); scene.add(luzPantalla);
  const luzFlash = new THREE.PointLight(0xffffff, 0, 14, 1.5); luzFlash.position.set(0, 1.7, 2.4); scene.add(luzFlash);
  const luzCinta = new THREE.SpotLight(0xffffff, 0, 14, .7, .9, 1.4); luzCinta.position.set(0, 5.5, CINTA.z + 4.5); luzCinta.target.position.set(0, .8, CINTA.z + 1.6); scene.add(luzCinta, luzCinta.target);

  /* ── la pantalla LED ── */
  const pantalla = new Pantalla({ fotos, video });
  const texPantalla = textura(pantalla.canvas);
  const ledMat = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: texPantalla }, brillo: { value: 1 }, grilla: { value: new THREE.Vector2(320, 180) } }, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform sampler2D mapa; uniform float brillo; uniform vec2 grilla; varying vec2 vUv;
      void main(){ vec3 c = texture2D(mapa, vUv).rgb; vec2 g = fract(vUv * grilla); float led = smoothstep(.66, .3, length(g - .5));
        c *= mix(.72, 1.06, led); gl_FragColor = vec4(c * brillo, 1.);
        #include <colorspace_fragment>
      }`,
  });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.875), ledMat); led.position.set(0, 4.45, -27.6); scene.add(led);
  const marcoLed = new THREE.Mesh(new THREE.BoxGeometry(14.5, 8.3, .3), metal); marcoLed.position.set(0, 4.45, -27.8); scene.add(marcoLed);
  const muestra = document.createElement('canvas'); muestra.width = muestra.height = 4;
  const mg = muestra.getContext('2d', { willReadFrequently: true }); let cuentaColor = 0;
  const colorPantalla = new THREE.Color(0, 0, 0);

  /* ── los pedestales ── */
  const pieMat = new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: .22, metalness: .3, envMapIntensity: 1, side: THREE.DoubleSide });
  const tapaMat = new THREE.MeshStandardMaterial({ color: '#060606', roughness: .05, metalness: 0, transparent: true, opacity: .8, envMapIntensity: 1.3 });
  class Soporte {
    constructor({ radio, alto, escala }) {
      this.g = new THREE.Group(); this.alto = alto; this.escala = escala;
      this.pie = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio * 1.03, 1, 64, 1, true).translate(0, .5, 0), pieMat);
      this.tapa = new THREE.Mesh(new THREE.CircleGeometry(radio, 64).rotateX(-Math.PI / 2), tapaMat);
      this.aro = new THREE.Mesh(new THREE.TorusGeometry(radio, .006, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      this.prod = new THREE.Group(); this.cache = new Map();
      this.g.add(this.pie, this.tapa, this.aro, this.prod);
      this.actual = null; this.objetivo = null; this.h = 0; this.deseo = 0; this.fase = Math.random() * 6; this.color = new THREE.Color(1, 1, 1);
    }
    poner(i, altura) { this.objetivo = i; this.deseo = i == null ? 0 : altura; }
    cuadro(dt, t) {
      if (this.actual !== this.objetivo) {
        this.h = Math.max(0, this.h - dt * 2.6);
        if (this.h === 0) {
          this.prod.clear();
          if (this.objetivo != null) {
            if (!this.cache.has(this.objetivo)) this.cache.set(this.objetivo, preparados[this.objetivo].nuevo());
            const p = this.cache.get(this.objetivo); p.scale.setScalar(this.escala); this.prod.add(p);
            this.color.set(perfiles[this.objetivo].color).lerp(BLANCO, .55); p.userData.halo.material.color.copy(this.color);
          }
          this.actual = this.objetivo;
        }
      } else this.h += (this.deseo - this.h) * Math.min(1, dt * (reducido ? 20 : 3));
      const s = suave(this.h, 0, 1), arriba = ALTO_P + .015 + s * this.alto;
      this.pie.scale.y = Math.max(.001, arriba - .001); this.pie.visible = s > .002;
      this.tapa.position.y = this.aro.position.y = arriba; this.tapa.visible = this.aro.visible = s > .01;
      this.aro.material.color.setScalar(.2 + .9 * s);
      const p = this.prod.children[0];
      if (p) {
        this.prod.visible = s > .01;
        this.prod.position.y = arriba - (1 - s) * (p.userData.alto * this.escala + .05);
        p.rotation.y = reducido ? 0 : Math.sin(t * .45 + this.fase) * .34;
        p.userData.espejo.visible = s > .6;
      }
    }
  }
  const principal = new Soporte({ radio: .5, alto: .75, escala: 1 });
  principal.g.position.set(0, 0, Z_PEDESTAL); scene.add(principal.g);
  const filas = Array.from({ length: salidas }, () => { const s = new Soporte({ radio: .4, alto: .5, escala: 1.12 }); scene.add(s.g); return s; });
  let ultimaLista = '';
  // las salidas van de atrás (cerca de la pantalla) hacia adelante, centradas en la pasarela; más de 8, en dos filas
  function posicionesDesfile(n, centro = -12.8) {
    const dos = n > 8, paso = n > 1 ? Math.min(3.2, 19.5 / (n - 1)) : 0, largo = paso * (n - 1);
    return Array.from({ length: n }, (_, k) => [dos ? (k % 2 ? .55 : -.55) : 0, centro - largo / 2 + paso * k]);
  }
  function ubicarDesfile(lista, centro) { const ps = posicionesDesfile(lista.length, centro); filas.forEach((s, k) => { if (k < ps.length) s.g.position.set(ps[k][0], 0, ps[k][1]); }); }

  /* ── el foso de los fotógrafos ── */
  const destellos = Array.from({ length: 8 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(.6); s.userData.v = 0; scene.add(s); return s;
  });
  let proximoFlash = 0, flashLuz = 0;
  function disparar() {
    const s = destellos.find(d => d.userData.v <= 0) || destellos[0];
    s.position.set((Math.random() - .5) * 5.2, 1.25 + Math.random() * .7, 1.3 + Math.random() * 1.9);
    s.userData.v = 1; s.scale.setScalar(.07 + Math.random() * .08); // un destello chico: el brillo hace el resto
    luzFlash.position.copy(s.position); flashLuz = 1;
    alFlash();
  }

  /* ── la invitación: un sobre de papel marfil visto de atrás (cuatro solapas con canto, forro negro y un lacre con el
        logo de BIG en relieve) y, adentro, la tarjeta negra. Se inclina con el puntero y un brillo recorre el papel ── */
  const SW = 1.86, SH = 1.2, PUNTA = -SH * .56;
  const papelTex = (() => { // fibras y grano del papel: se usa como color y como relieve, repetido por metro
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d'); g.fillStyle = '#ece8e0'; g.fillRect(0, 0, 1024, 1024);
    const d = g.getImageData(0, 0, 1024, 1024), px = d.data;
    for (let i = 0; i < px.length; i += 4) { const n = (Math.random() - .5) * 14; px[i] += n; px[i + 1] += n; px[i + 2] += n - 1; }
    g.putImageData(d, 0, 0);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024, a = Math.random() * Math.PI, l = 6 + Math.random() * 26;
      g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(120,110,95,.18)'; g.lineWidth = .6 + Math.random() * .8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + (Math.random() - .5) * 6, y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const t = textura(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const forroTex = (() => { // el forro: negro con el nombre de la propuesta en diagonal, apenas visible
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, 512, 512);
    g.save(); g.translate(256, 256); g.rotate(-Math.PI / 6); g.fillStyle = '#191919'; g.font = `500 22px ${SANS}`; g.textAlign = 'center';
    for (let y = -420; y < 420; y += 46) for (let x = -500; x < 500; x += 330) g.fillText("L'ORÉAL GROUPE × BIG", x + (y / 46 % 2 ? 165 : 0), y);
    g.restore();
    const t = textura(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const papel = new THREE.MeshPhysicalMaterial({ color: '#ece7de', map: papelTex, bumpMap: papelTex, bumpScale: .55, roughness: .8, metalness: 0, sheen: .6, sheenRoughness: .55, sheenColor: new THREE.Color('#ffffff'), envMapIntensity: .55 });
  const forro = new THREE.MeshStandardMaterial({ map: forroTex, roughness: .5, metalness: .1, envMapIntensity: .4, side: THREE.BackSide });
  const forroFrente = new THREE.MeshStandardMaterial({ map: forroTex, roughness: .5, metalness: .1, envMapIntensity: .4 });
  const inv = new THREE.Group(); inv.position.set(0, INV.y, INV.z); inv.scale.setScalar(INV.escala); scene.add(inv);
  const sobre = new THREE.Group(); inv.add(sobre);
  // el fondo: de adentro se ve el forro (cuando se abre la solapa), de afuera el papel
  const fondoSobre = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), forroFrente); sobre.add(fondoSobre);
  const dorso = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), papel); dorso.rotation.y = Math.PI; dorso.position.z = -.0008; sobre.add(dorso);
  // cada solapa con un tono apenas distinto (como el papel doblado que recibe la luz de otro ángulo) y un canto que marca el doblez
  const tono = c => { const m = papel.clone(); m.color.set(c); return m; };
  const solapa = (puntos, z, color = '#f1ede5') => {
    const f = new THREE.Shape(); puntos(f);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: .0008, bevelEnabled: true, bevelThickness: .0014, bevelSize: .0035, bevelSegments: 2, curveSegments: 16 }), tono(color));
    m.position.z = z; return { m, f };
  };
  const izq = solapa(f => { f.moveTo(-SW / 2, -SH / 2); f.lineTo(-SW / 2, SH / 2); f.lineTo(-.1, .05); f.quadraticCurveTo(-.03, 0, -.1, -.05); f.lineTo(-SW / 2, -SH / 2); }, .0045, '#ddd7cc');
  const der = solapa(f => { f.moveTo(SW / 2, -SH / 2); f.lineTo(.1, -.05); f.quadraticCurveTo(.03, 0, .1, .05); f.lineTo(SW / 2, SH / 2); f.lineTo(SW / 2, -SH / 2); }, .0045, '#d9d3c8');
  const abajo = solapa(f => { f.moveTo(-SW / 2, -SH / 2); f.lineTo(SW / 2, -SH / 2); f.lineTo(.16, .03); f.quadraticCurveTo(0, .11, -.16, .03); f.lineTo(-SW / 2, -SH / 2); }, .008, '#e7e2d8');
  sobre.add(izq.m, der.m, abajo.m);
  // «Primera fila», impreso en seco sobre la solapa de abajo
  const impreso = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#8f897e'; g.font = `400 64px ${SERIF}`; g.textAlign = 'center'; g.fillText('Primera fila', 512, 86); return textura(c); })();
  const leyenda = new THREE.Mesh(new THREE.PlaneGeometry(.56, .07), new THREE.MeshStandardMaterial({ map: impreso, transparent: true, roughness: .7, metalness: 0, depthWrite: false }));
  leyenda.position.set(0, -SH * .36, .0115); sobre.add(leyenda);
  // la solapa de arriba se abre desde la bisagra; adentro lleva el forro y en la punta, el lacre
  // capas, de atrás hacia adelante: tarjeta < laterales < abajo < arriba, sin cruzarse
  const bisagra = new THREE.Group(); bisagra.position.set(0, SH / 2, .0125); sobre.add(bisagra);
  const arriba = solapa(f => { f.moveTo(-SW / 2, 0); f.lineTo(SW / 2, 0); f.lineTo(.13, PUNTA + .06); f.quadraticCurveTo(0, PUNTA - .03, -.13, PUNTA + .06); f.lineTo(-SW / 2, 0); }, 0);
  const forroSolapa = new THREE.Mesh(new THREE.ShapeGeometry(arriba.f, 16), forro); forroSolapa.position.z = -.0017;
  bisagra.add(arriba.m, forroSolapa);
  const lacre = (() => {
    // la cera: un contorno irregular, como derramada, y un relieve en capas (aro alto, centro hundido, logo en relieve)
    const r = .118, f = new THREE.Shape(), N = 72;
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, rr = r * (1 + Math.sin(a * 3 + .4) * .04 + Math.sin(a * 7 + 1.3) * .025 + Math.sin(a * 13) * .012);
      i ? f.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : f.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const geo = new THREE.ExtrudeGeometry(f, { depth: .008, bevelEnabled: true, bevelThickness: .008, bevelSize: .011, bevelSegments: 6, curveSegments: 8 });
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) if (nor.getZ(i) > .9) uv.setXY(i, pos.getX(i) / (2 * r) + .5, pos.getY(i) / (2 * r) + .5);
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d'), C = 512;
    const radial = g.createRadialGradient(C, C, 0, C, C, 500); // la cera se apila hacia el borde
    radial.addColorStop(0, '#5a5a5a'); radial.addColorStop(.72, '#5f5f5f'); radial.addColorStop(.8, '#d8d8d8'); radial.addColorStop(.9, '#b8b8b8'); radial.addColorStop(1, '#707070');
    g.fillStyle = radial; g.fillRect(0, 0, 1024, 1024);
    g.filter = 'blur(6px)'; g.strokeStyle = '#2c2c2c'; g.lineWidth = 16; g.beginPath(); g.arc(C, C, 372, 0, Math.PI * 2); g.stroke(); g.filter = 'none'; // el canal del sello
    g.save(); g.translate(C, C); g.rotate(-15 * Math.PI / 180); g.scale(1.08, 1.08); g.translate(-205, -233); g.filter = 'blur(2px)'; g.fillStyle = '#e8e8e8'; // el logo, girado 15° a la izquierda, como estampado a mano
    g.fill(new Path2D('M409.52,245.64l-.46-2.58c-9.26-60.88-80.63-99.4-137.14-71.74-88.45,35.5-151.22,123.57-151.14,223.45,0,3.49-.78,6.98-2.6,9.96-9.03,14.8-34.91,11.92-39.67-5.3-.81-2.92-.82-6-.26-8.97,21.94-117.86,112.53-218.09,223.62-260.77.71-.31,1.41-.64,2.1-1,52.05-30.85,35.16-119.08-25.55-127.52-4.12-.76-8.35-1.16-12.68-1.16H0v466.33h410.49c-.73-9.18,1.48-207.5-.97-220.69Z')); g.restore();
    const d = g.getImageData(0, 0, 1024, 1024), px = d.data; // la textura de la cera: un granito fino
    for (let i = 0; i < px.length; i += 4) { const n = (Math.random() - .5) * 10; px[i] += n; px[i + 1] += n; px[i + 2] += n; }
    g.putImageData(d, 0, 0);
    const relieveLacre = new THREE.CanvasTexture(c); relieveLacre.anisotropy = 8;
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#0b0b0b', roughness: .42, metalness: 0, clearcoat: 1, clearcoatRoughness: .14, bumpMap: relieveLacre, bumpScale: 6, envMapIntensity: 1.1 }));
    m.position.set(0, PUNTA + .12, .0055); return m; // su base queda dentro del espesor de la solapa: no asoma por el forro al abrirse
  })();
  bisagra.add(lacre);
  // la carta, adentro, entre el fondo y las solapas: cartón duro negro, con las letras hundidas (letterpress) y rellenas de
  // tinta metálica plateada. Cuatro mapas salen del mismo dibujo: color, rugosidad (verde) y metal (azul) y relieve
  const TJ = { w: 1.8, h: 1.08 }; // casi el ancho del sobre: mientras asoma, no quedan rendijas a los costados
  const CW = 2048, CH = Math.round(2048 * TJ.h / TJ.w);
  const lienzo = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };
  const cColor = lienzo(), cRM = lienzo(), cRelieve = lienzo();
  const texTarjeta = textura(cColor), texRM = new THREE.CanvasTexture(cRM), relieve = new THREE.CanvasTexture(cRelieve);
  texRM.anisotropy = relieve.anisotropy = 8;
  const tarjetaMat = new THREE.MeshStandardMaterial({ map: texTarjeta, roughnessMap: texRM, metalnessMap: texRM, roughness: 1, metalness: 1, bumpMap: relieve, bumpScale: 2.4, envMap: scene.environment, envMapIntensity: 1.25 });
  const cantoTarjeta = new THREE.MeshStandardMaterial({ color: '#1a1918', roughness: .9 });
  const tarjeta = new THREE.Mesh(new THREE.BoxGeometry(TJ.w, TJ.h, .004), [cantoTarjeta, cantoTarjeta, cantoTarjeta, cantoTarjeta, tarjetaMat, cantoTarjeta]);
  tarjeta.position.z = .0015; inv.add(tarjeta);
  const luzTarjeta = new THREE.SpotLight(0xfff4e8, 0, 9, .55, .9, 1.4); luzTarjeta.position.set(1.1, INV.y + 2.1, INV.z + 3); luzTarjeta.target = tarjeta; scene.add(luzTarjeta);
  const brilloPapel = new THREE.PointLight(0xffffff, 0, 4, 1.6); scene.add(brilloPapel); // sigue al puntero: el brillo que recorre el papel y la tinta
  function escribirInvitacion() {
    // 1. las letras, como máscara: blanco donde hay tinta
    const mascara = lienzo(), m = mascara.getContext('2d');
    m.fillStyle = '#000'; m.fillRect(0, 0, CW, CH); m.fillStyle = '#fff'; m.textAlign = 'center'; m.textBaseline = 'alphabetic';
    m.font = `600 44px ${CARTA}`; m.letterSpacing = '10px'; m.fillText("L'ORÉAL GROUPE  ×  BIG", CW / 2, 230);
    m.letterSpacing = '0px'; m.font = `400 300px ${CALIGRAFIA}`; m.fillText('Porque lo valen', CW / 2, 690, CW - 240);
    m.font = `500 58px ${CARTA}`; m.letterSpacing = '6px'; m.fillText('PRIMERA FILA', CW / 2, 900);
    m.font = `500 50px ${CARTA}`; m.letterSpacing = '2px'; m.fillText('un desfile de creadores', CW / 2, 975);
    const tinta = m.getImageData(0, 0, CW, CH).data;
    // 2. el cartón: negro cálido con grano y fibras
    const g = cColor.getContext('2d');
    g.fillStyle = '#141312'; g.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * CW, y = Math.random() * CH, a = Math.random() * Math.PI, l = 8 + Math.random() * 30;
      g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.25)'; g.lineWidth = .8 + Math.random();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const color = g.getImageData(0, 0, CW, CH), cp = color.data;
    const rm = cRM.getContext('2d').createImageData(CW, CH), rp = rm.data;
    const rel = cRelieve.getContext('2d').createImageData(CW, CH), lp = rel.data;
    for (let i = 0; i < cp.length; i += 4) {
      const k = tinta[i] / 255, grano = Math.random();
      // color: el papel con grano; la tinta, plata con una leve variación (el foil nunca es parejo)
      const plata = 196 + (grano - .5) * 30;
      cp[i] = cp[i] * (1 - k) + plata * k + (grano - .5) * 9 * (1 - k); cp[i + 1] = cp[i + 1] * (1 - k) + (plata - 2) * k + (grano - .5) * 9 * (1 - k); cp[i + 2] = cp[i + 2] * (1 - k) + (plata - 4) * k + (grano - .5) * 9 * (1 - k);
      // rugosidad (verde): papel mate 0,86; tinta 0,22 a 0,34. Metal (azul): solo la tinta
      rp[i] = 0; rp[i + 1] = (.86 * (1 - k) + (.22 + grano * .12) * k) * 255; rp[i + 2] = k * 255; rp[i + 3] = 255;
      // relieve: el grano del cartón; las letras, hundidas
      const h = 150 + (grano - .5) * 22 - k * 95;
      lp[i] = lp[i + 1] = lp[i + 2] = h; lp[i + 3] = 255;
    }
    g.putImageData(color, 0, 0); cRM.getContext('2d').putImageData(rm, 0, 0);
    const cr = cRelieve.getContext('2d'); cr.putImageData(rel, 0, 0);
    cr.filter = 'blur(1.5px)'; cr.drawImage(cRelieve, 0, 0); cr.filter = 'none'; // el borde del golpe, suave
    texTarjeta.needsUpdate = texRM.needsUpdate = relieve.needsUpdate = true;
  }
  escribirInvitacion();

  /* ── la cinta del pack: una tarjeta redondeada por creador ── */
  const cinta = new THREE.Group(); cinta.position.set(0, -1.7, CINTA.z); scene.add(cinta);
  const elipse = (rx, rz, n = 120) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * rz); });
  const base = new THREE.Shape(elipse(5.3, 2.85)); base.holes.push(new THREE.Path(elipse(3.9, 1.55).reverse()));
  cinta.add(new THREE.Mesh(new THREE.ExtrudeGeometry(base, { depth: CINTA.alto - .02, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#121212', roughness: .35, metalness: .6, envMapIntensity: 1 })));
  const aroCinta = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(elipse(5.32, 2.87, 160).map(p => new THREE.Vector3(p.x, CINTA.alto - .02, p.y)), true), 320, .006, 6, true), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  cinta.add(aroCinta);
  const LAMAS = movil ? 80 : 120;
  const lamas = new THREE.InstancedMesh(new THREE.BoxGeometry(.13, .018, 1.2), new THREE.MeshStandardMaterial({ color: '#242424', roughness: .28, metalness: .85, envMapIntensity: 1 }), LAMAS);
  cinta.add(lamas);
  const enOvalo = (u, v = new THREE.Vector3()) => { const a = u * Math.PI * 2; return v.set(Math.cos(a) * CINTA.rx, CINTA.alto, Math.sin(a) * CINTA.rz); };
  const tangente = u => { const a = u * Math.PI * 2; return Math.atan2(-Math.sin(a) * CINTA.rx, Math.cos(a) * CINTA.rz); };
  const PERIMETRO = 2 * Math.PI * Math.sqrt((CINTA.rx ** 2 + CINTA.rz ** 2) / 2);
  // la tarjeta de cada creador: redondeada, con un canto fino, la foto a sangre y el nombre en la serif
  const TW = .84, TH = 1.2, TR = .085;
  const tarjetaGeo = (() => {
    const f = new THREE.Shape(), x0 = -TW / 2, y0 = 0;
    f.moveTo(x0 + TR, y0); f.lineTo(x0 + TW - TR, y0); f.quadraticCurveTo(x0 + TW, y0, x0 + TW, y0 + TR);
    f.lineTo(x0 + TW, y0 + TH - TR); f.quadraticCurveTo(x0 + TW, y0 + TH, x0 + TW - TR, y0 + TH);
    f.lineTo(x0 + TR, y0 + TH); f.quadraticCurveTo(x0, y0 + TH, x0, y0 + TH - TR);
    f.lineTo(x0, y0 + TR); f.quadraticCurveTo(x0, y0, x0 + TR, y0);
    const g = new THREE.ExtrudeGeometry(f, { depth: .022, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, .03, -.011);
    // la cara de adelante y la de atrás toman la foto entera: u, v de 0 a 1 sobre el rectángulo
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) if (Math.abs(nor.getZ(i)) > .9) uv.setXY(i, (pos.getX(i) + TW / 2) / TW, (pos.getY(i) - .03) / TH);
    return g;
  })();
  const canto = new THREE.MeshStandardMaterial({ color: '#d8d8d6', roughness: .35, metalness: .2, envMapIntensity: 1 });
  function pintarTarjeta(it) {
    const p = it.p, g = it.lienzo.getContext('2d'), W = 512, H = 732, im = fotos.get(p);
    g.clearRect(0, 0, W, H);
    if (im) { const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), sw = W / k, sh = H / k; g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * .25, sw, sh, 0, 0, W, H); }
    else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(1, '#151515'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = `400 200px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.nombre.split(' ').map(x => x[0]).join(''), W / 2, H * .42); }
    const sombra = g.createLinearGradient(0, H * .52, 0, H); sombra.addColorStop(0, 'rgba(0,0,0,0)'); sombra.addColorStop(1, 'rgba(0,0,0,.78)');
    g.fillStyle = sombra; g.fillRect(0, H * .5, W, H * .5);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `400 52px ${SERIF}`; g.fillText(p.nombre, 34, H - 74, W - 68);
    g.fillStyle = 'rgba(255,255,255,.78)'; g.font = `500 26px ${SANS}`; g.fillText(p.marca, 36, H - 34, W - 72);
    it.tex.needsUpdate = true;
  }
  const items = perfiles.map((p, i) => {
    const g = new THREE.Group(), lienzo = document.createElement('canvas'); lienzo.width = 512; lienzo.height = 732;
    const tex = textura(lienzo);
    const frente = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .45, roughness: .42, metalness: 0, color: 0xffffff, envMapIntensity: .5 });
    const m = new THREE.Mesh(tarjetaGeo, [frente, canto]); m.userData = { tipo: 'caja', i };
    const brilloCaja = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.1), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    brilloCaja.position.set(0, .64, -.06);
    g.add(brilloCaja, m); cinta.add(g);
    const it = { p, g, m, brillo: brilloCaja, lienzo, tex, u: i / perfiles.length, foco: 0, hover: 0 };
    pintarTarjeta(it);
    return it;
  });
  const C = { s: .25, v: 0, agarrada: false, irA: null, vAnt: 0, hover: -1, foco: 0, anclada: false, objetivo: null };

  /* ── API para app.js ── */
  const cam = { pos: new THREE.Vector3(0, INV.y, INV.z + 4.4), mira: new THREE.Vector3(0, INV.y, INV.z), fov: 34, mano: new THREE.Vector2(), manoSuave: new THREE.Vector2() };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tocables = items.map(it => it.m);
  const frente = () => { let mejor = 0, d0 = 9; items.forEach((it, i) => { const d = Math.abs(((it.u + C.s - .25) % 1 + 1.5) % 1 - .5); if (d < d0) { d0 = d; mejor = i; } }); return mejor; };
  const sala = {
    estado, pantalla, escena: scene, camara: camera, renderer,
    tomar(pos, mira, fov) { cam.pos.set(...pos); cam.mira.set(...mira); cam.fov = fov; },
    mano(x, y) { cam.mano.set(x, y); },
    posicionesDesfile,
    tocar(x, y) {
      if (estado.cinta < .9) return null;
      ndc.set(x, y); ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(tocables, false).find(o => o.object.visible);
      return h ? h.object.userData : null;
    },
    cinta: {
      agarrar() { C.agarrada = true; C.irA = null; },
      mover(dxPx) { const d = -dxPx / (innerWidth * (movil ? 1.4 : 2.2)); C.s += d; C.v = lerp(C.v, d * 60, .35); },
      soltar() { C.agarrada = false; C.anclada = false; },
      velocidad: () => Math.abs(C.v),
      hover(i) { C.hover = i; },
      /** Trae la caja i al frente, por el camino más corto */
      irA(i) { let d = (.25 - items[i].u - C.s) % 1; if (d > .5) d -= 1; if (d < -.5) d += 1; C.irA = C.s + d; C.anclada = true; C.objetivo = i; },
      /** La tarjeta siguiente o anterior; devuelve cuál queda de frente */
      paso(dir) { const n = items.length, sig = ((C.objetivo ?? C.foco) + dir + n) % n; sala.cinta.irA(sig); return sig; },
    },
    resize() {
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
      brillo.resolution.set(w / 2, h / 2);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
    cuadro, medirCuadros: () => ({ dpr, info: renderer.info.render }),
  };

  /* ── cada cuadro ── */
  let lucesSuave = 0, publicoSuave = 0, vistaFoco = -1;
  function cuadro(dt, t, pulso = 0) {
    dt = Math.min(dt, .05);
    const e = estado, golpe = Math.exp(-pulso * 7);
    // cámara: la toma, un poco de mano (suavizada) y una respiración mínima
    cam.manoSuave.lerp(cam.mano, Math.min(1, dt * 3));
    const fovEf = camera.aspect < 1 ? Math.min(2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI, 80) : cam.fov;
    camera.position.copy(cam.pos);
    if (!reducido) { camera.position.x += cam.manoSuave.x * .06 + Math.sin(t * .31) * .012; camera.position.y += cam.manoSuave.y * .035 + Math.sin(t * .23) * .01; }
    camera.lookAt(cam.mira);
    if (Math.abs(camera.fov - fovEf) > .01) { camera.fov = fovEf; camera.updateProjectionMatrix(); }

    lucesSuave = lerp(lucesSuave, e.luz, Math.min(1, dt * 4)); publicoSuave = lerp(publicoSuave, e.publico, Math.min(1, dt * 3));
    ambiente.intensity = .05 + lucesSuave * .5;
    hazMat.uniforms.intensidad.value = e.haces * (1 + golpe * .25);
    hazFoco.material.uniforms.intensidad.value = e.foco * 1.3;
    const fx = e.focoEn ? e.focoEn[0] : 0, fz = e.focoEn ? e.focoEn[1] : Z_PEDESTAL, k = Math.min(1, dt * 4);
    foco.position.x = lerp(foco.position.x, fx, k); foco.position.z = lerp(foco.position.z, fz + .4, k);
    foco.target.position.set(foco.position.x, .8, foco.position.z - .4); hazFoco.position.set(foco.position.x, 7.1, foco.position.z - .4);
    contra.target.position.copy(foco.target.position); contra.position.z = foco.position.z - 5.2;
    foco.intensity = e.foco * 70; contra.intensity = e.foco * 55 + e.pedestal.altura * 10; relleno.intensity = e.foco * 14 + lucesSuave * 6;
    ledMat.uniforms.brillo.value = lerp(ledMat.uniforms.brillo.value, e.ledBrillo, Math.min(1, dt * 4));
    brillo.strength = .38 * (e.resplandor ?? 1); // en la invitación casi no hay resplandor: la tinta brilla por reflejo, no por glow

    // la luz que camina
    const cabeza = -LARGO + (LARGO + .4) * e.ola;
    colorDupla.set(e.color).lerp(BLANCO, .6);
    for (let i = 0; i < LUCES; i++) {
      const d = cabeza - zLuz[i];
      let b = e.pasarela * (.25 + .12 * golpe);
      if (e.ola > 0 && d >= 0) b = Math.max(b, .32 + .68 * Math.exp(-d / 1.1));
      luces.setColorAt(i, col.copy(colorDupla).multiplyScalar(b * 1.5));
    }
    luces.instanceColor.needsUpdate = true;
    luzOla.position.z = cabeza; luzOla.intensity = e.ola > 0 && e.ola < 1 ? 2.5 : 0; // baja: si no, quema el producto que sube justo donde llega

    // el público
    for (let i = 0; i < CEL; i++) {
      const c = celu[i], b = publicoSuave * c.base * (c.filma ? 1 : .5 + .5 * Math.sin(t * .7 + c.fase));
      colCel[i * 3] = b * (c.calido ? 1 : .8); colCel[i * 3 + 1] = b * (c.calido ? .86 : .88); colCel[i * 3 + 2] = b * (c.calido ? .7 : 1);
    }
    celGeo.attributes.color.needsUpdate = true;

    // pedestales
    principal.poner(e.pedestal.producto, e.pedestal.altura); principal.cuadro(dt, t);
    const lista = e.desfile.lista, firma = lista.join(',');
    if (firma !== ultimaLista && filas.every(s => s.h < .02)) { ubicarDesfile(lista, e.desfile.centro); ultimaLista = firma; }
    filas.forEach((s, k) => { s.poner(firma === ultimaLista && k < lista.length ? lista[k] : null, e.desfile.alturas ? e.desfile.alturas[k] ?? 0 : e.desfile.altura); s.cuadro(dt, t); });

    // flashes
    if (e.flashes > 0 && !reducido && t > proximoFlash) { disparar(); proximoFlash = t + (-Math.log(1 - Math.random()) / e.flashes); }
    destellos.forEach(s => { s.userData.v = Math.max(0, s.userData.v - dt * 7); s.material.opacity = s.userData.v; });
    flashLuz = Math.max(0, flashLuz - dt * 9); luzFlash.intensity = flashLuz * 9; // ilumina sin quemar el producto

    // la pantalla
    if (pantalla.actualizar(dt)) {
      texPantalla.needsUpdate = true;
      if (++cuentaColor % 8 === 0) { mg.drawImage(pantalla.canvas, 0, 0, 4, 4); const d = mg.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } colorPantalla.setRGB(r / 4080, g / 4080, b / 4080); }
    }
    luzPantalla.color.copy(colorPantalla).lerp(BLANCO, .2); luzPantalla.intensity = 26 * Math.min(1, colorPantalla.r + colorPantalla.g + colorPantalla.b) * e.ledBrillo;

    // la invitación, como una sola pieza que se abre con el scroll (abre: 0 → 1), sin que nada se cruce ni asome:
    //   la solapa se abre y sigue girando hasta plegarse detrás del sobre (queda oculta)
    //   la tarjeta asoma un poco por arriba; después es el sobre el que se desliza hacia abajo y la deja a la vista
    //   recién cuando el sobre ya pasó, la tarjeta se adelanta y baja al centro, de frente
    const a = e.invitacion.abre;
    const solapaAbre = suave(a, 0, .26), asoma = suave(a, .16, .4), seVa = suave(a, .36, .84), despega = suave(a, .64, .92), baja = suave(a, .66, 1);
    inv.visible = e.invitacion.visible > .01;
    if (inv.visible) {
      bisagra.rotation.x = -solapaAbre * Math.PI * 1.9;
      bisagra.position.z = lerp(.0125, -.004, suave(a, .04, .2));
      tarjeta.position.set(0, .3 * asoma * (1 - baja) + .02 * baja, .0015 + .5 * despega);
      tarjeta.rotation.x = -.04 * despega * (1 - baja);
      // el sobre baja derecho (si se inclinara o retrocediera con la tarjeta adentro, el fondo asomaría delante de ella);
      // recién cuando ya pasó, se aleja
      sobre.position.set(0, -1.75 * seVa, -.15 * suave(a, .72, .98)); sobre.visible = seVa < .995;
      const inclina = reducido ? 0 : 1 - .6 * seVa * (1 - baja); // mientras el sobre se va, la pieza se inclina menos
      inv.rotation.y = inclina * (cam.manoSuave.x * .22 + Math.sin(t * .5) * .03);
      inv.rotation.x = inclina * (-cam.manoSuave.y * .14 + Math.sin(t * .4) * .018);
      luzTarjeta.intensity = 10 * e.invitacion.visible;
      brilloPapel.position.set(cam.manoSuave.x * 1.5, INV.y + .3 + cam.manoSuave.y * .9, INV.z + 1.6);
      brilloPapel.intensity = 2.2 * e.invitacion.visible;
    } else { luzTarjeta.intensity = 0; brilloPapel.intensity = 0; }

    // la cinta
    cinta.position.y = lerp(-1.7, 0, THREE.MathUtils.smootherstep(e.cinta, 0, 1));
    cinta.visible = e.cinta > .01;
    luzCinta.intensity = e.cinta * 16;
    aroCinta.material.color.setScalar(.25 + .5 * e.cinta);
    if (cinta.visible) {
      if (C.irA != null) { const d = C.irA - C.s; C.v = d * 6.5; C.s += C.v * dt; if (Math.abs(d) < .0006) { C.s = C.irA; C.irA = null; C.v = 0; C.objetivo = null; } }
      else if (!C.agarrada) {
        C.v *= Math.exp(-dt * 2.4); C.s += C.v * dt;
        // al soltar, frena en la caja más cercana: siempre queda una dupla de frente
        if (Math.abs(C.v) < .03 && !C.anclada) sala.cinta.irA(frente());
      }
      for (let k = 0; k < LAMAS; k++) {
        const u = ((k / LAMAS + C.s) % 1 + 1) % 1; enOvalo(u, v3);
        mtx.makeRotationY(tangente(u) + Math.PI / 2).setPosition(v3.x, CINTA.alto - .005, v3.z); lamas.setMatrixAt(k, mtx);
      }
      lamas.instanceMatrix.needsUpdate = true;
      const f = frente();
      if (f !== C.foco) { C.foco = f; }
      if (vistaFoco !== C.foco && C.irA == null && !C.agarrada) { vistaFoco = C.foco; alFoco(C.foco); }
      camera.getWorldPosition(v4); cinta.worldToLocal(v4);
      items.forEach((it, i) => {
        const u = ((it.u + C.s) % 1 + 1) % 1; enOvalo(u, v3);
        it.foco = lerp(it.foco, C.foco === i && C.irA == null ? 1 : 0, Math.min(1, dt * 5));
        it.g.position.set(v3.x, v3.y + it.foco * .06, v3.z);
        it.g.rotation.y = Math.atan2(v4.x - v3.x, v4.z - v3.z);
        it.hover = lerp(it.hover, C.hover === i ? 1 : 0, Math.min(1, dt * 10));
        const luz = .6 + .4 * it.foco;
        const fr = it.m.material[0]; fr.emissiveIntensity = .12 + .38 * luz + .1 * it.hover; fr.color.setScalar(.3 + .7 * luz);
        it.g.scale.setScalar(1 + .08 * it.foco + .05 * it.hover);
        it.g.position.y += it.hover * .05;
        it.brillo.material.opacity = .1 * it.hover + .16 * it.foco;
      });
    }
    composer.render(dt);
    contarCuadro(dt);
  }

  /* ── calidad: si el equipo no llega a 40 cuadros por segundo, baja la resolución ── */
  let acum = 0, cuadros = 0;
  function contarCuadro(dt) {
    acum += dt; cuadros++;
    if (acum < 2) return;
    const fps = cuadros / acum; acum = 0; cuadros = 0;
    if (fps < 40 && dpr > DPR_MIN) { dpr = Math.max(DPR_MIN, dpr - .25); renderer.setPixelRatio(dpr); sala.resize(); }
  }

  sala.resize();
  return sala;
}
