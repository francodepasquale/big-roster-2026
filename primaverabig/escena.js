import * as THREE from 'three';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { flor3D } from './flor.js?v=20261124f';

const FOV = 24, DIST = 10;

export function crearEscena(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;
  const movil = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  escena.environmentIntensity = .5;

  const camara = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  camara.position.set(0, 0, DIST);

  const luz = new THREE.DirectionalLight(0xffffff, 1.35);
  luz.castShadow = true;
  luz.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
  luz.shadow.bias = -.0005;
  luz.shadow.normalBias = .012;
  escena.add(luz, luz.target);
  const relleno = new THREE.DirectionalLight(0xf6e9ff, .35);
  relleno.position.set(3, -2, 4);
  escena.add(relleno);
  escena.add(new THREE.HemisphereLight(0xffffff, 0xcaa3ea, .55));

  const flor = flor3D(THREE);
  const soporte = new THREE.Group();
  const giro = new THREE.Group();
  giro.add(flor.grupo);
  soporte.add(giro);
  escena.add(soporte);

  const sombraMat = new THREE.ShadowMaterial({ color: 0x3b1c63, opacity: .13 });
  sombraMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, flor.uniformes);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade, uFadeDesde; uniform vec2 uRes;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        float sy = 1.0 - gl_FragCoord.y / uRes.y;
        gl_FragColor.a *= 1.0 - uFade * smoothstep(uFadeDesde, 1.02, sy);`);
  };
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sombraMat);
  pared.receiveShadow = true;
  escena.add(pared);

  const estado = {
    x: innerWidth / 2, y: innerHeight / 2, h: innerHeight * .5,
    rx: 0, ry: 0, rz: 0,
    abre: 1, brillo: 0, fade: 0, fadeDesde: .62, sombra: 1, visible: true,
    puntero: 1,
  };
  const puntero = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { puntero.x = e.clientX / innerWidth * 2 - 1; puntero.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  let W = 1, H = 1;
  function medir() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camara.aspect = W / H;
    camara.updateProjectionMatrix();
    flor.uniformes.uRes.value.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
  }
  medir();
  addEventListener('resize', medir);

  const altoVisible = () => 2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  function render(t) {
    const s = altoVisible() / H;
    const e = estado;
    soporte.visible = e.visible && e.h > 2;
    puntero.sx += (puntero.x - puntero.sx) * .06;
    puntero.sy += (puntero.y - puntero.sy) * .06;
    const escala = e.h * s;
    soporte.position.set((e.x - W / 2) * s, -(e.y - H / 2) * s, 0);
    soporte.scale.setScalar(escala);
    giro.rotation.set(
      e.rx + puntero.sy * .16 * e.puntero + Math.sin(t * .37) * .025 * e.puntero,
      e.ry + puntero.sx * .24 * e.puntero + Math.sin(t * .29 + 1) * .035 * e.puntero,
      e.rz,
    );
    flor.abrir(e.abre, t);
    flor.uniformes.uBrillo.value = e.brillo;
    flor.uniformes.uFade.value = e.fade;
    flor.uniformes.uFadeDesde.value = e.fadeDesde;
    const p = soporte.position;
    pared.position.set(p.x, p.y, p.z - escala * .3);
    pared.scale.setScalar(escala * 5);
    pared.visible = e.sombra > .01;
    sombraMat.opacity = .13 * e.sombra;
    luz.position.set(p.x - escala * 1.1, p.y + escala * 1.9, p.z + escala * 3.2);
    luz.target.position.copy(p);
    const c = luz.shadow.camera;
    c.left = c.bottom = -escala * 1.4; c.right = c.top = escala * 1.4;
    c.near = escala * .5; c.far = escala * 8;
    c.updateProjectionMatrix();
    renderer.render(escena, camara);
  }

  function fondo(a, b) {
    flor.uniformes.uFondoA.value.set(a).convertLinearToSRGB();
    flor.uniformes.uFondoB.value.set(b).convertLinearToSRGB();
  }

  return { estado, render, fondo, medir, renderer, flor, camara };
}
