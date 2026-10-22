// Pelota oficial en 3D: un único lienzo fijo sobre la página.
// La posición, el tamaño y la deformación los decide app.js; acá viven el material,
// la luz, el giro (rodado, arrastre con inercia y acomodo para mostrar el nombre) y la estela.
import * as THREE from 'three';
import {RoomEnvironment} from './assets/vendor/RoomEnvironment.js';
import {createCan, CAN} from './can.js';

const GHOSTS = 5;
const REST = new THREE.Euler(-0.08, 0.14, 0);

export async function createBall(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'high-performance'});
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(18, 1, 10, 30000);
  const key = new THREE.DirectionalLight(0xfff0d6, 2.7);
  key.position.set(-1.1, 1.45, 1.55);
  const rim = new THREE.DirectionalLight(0xc4d8ff, 2.3);
  rim.position.set(1.5, 0.85, -1.05);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a1410, 0.6);
  scene.add(key, rim, hemi);

  const loader = new THREE.TextureLoader();
  const [color, surface, canLabel, canLid] = await Promise.all([
    loader.loadAsync('assets/textures/ball-color.webp'),
    loader.loadAsync('assets/textures/ball-surface.webp'),
    loader.loadAsync('assets/textures/can-label.webp').catch(() => null),
    loader.loadAsync('assets/textures/can-lid.webp').catch(() => null)
  ]);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  color.colorSpace = THREE.SRGBColorSpace;
  surface.colorSpace = THREE.NoColorSpace;
  color.anisotropy = surface.anisotropy = anisotropy;

  const material = new THREE.MeshPhysicalMaterial({
    map: color, roughness: 1, roughnessMap: surface, bumpMap: surface, bumpScale: 1.1,
    clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xff9a80)
  });
  const geometry = new THREE.SphereGeometry(1, 160, 112);
  // holder deforma en el eje del movimiento; counter anula ese giro para no torcer la pelota.
  const holder = new THREE.Group(), counter = new THREE.Group(), spinner = new THREE.Group();
  spinner.add(new THREE.Mesh(geometry, material));
  counter.add(spinner);
  holder.add(counter);
  scene.add(holder);

  // Lata del evento: misma escena, misma luz.
  let can = null;
  if (canLabel && canLid) {
    for (const texture of [canLabel, canLid]) {texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy;}
    can = createCan(canLabel, canLid);
    can.pivot.position.y = -CAN.center;
    can.group.visible = false;
    scene.add(can.group);
  }

  const ghostGeometry = new THREE.SphereGeometry(1, 48, 32);
  const ghosts = Array.from({length: GHOSTS}, () => {
    const mesh = new THREE.Mesh(ghostGeometry, new THREE.MeshBasicMaterial({map: color, transparent: true, opacity: 0, depthWrite: false}));
    mesh.renderOrder = -1;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
  const history = [];

  const q = new THREE.Quaternion().setFromEuler(REST);
  const omega = new THREE.Vector3();
  const axis = new THREE.Vector3(), step = new THREE.Quaternion(), rest = new THREE.Quaternion(), euler = new THREE.Euler();
  const tone = new THREE.Color(0x3a1410), toneTarget = new THREE.Color();
  let width = 1, height = 1, dragging = false, hover = 0, drawn = false, dead = false;
  const dragSamples = [];
  let spinAngle = 0, spinRate = 0;

  canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); dead = true;});

  function resize(w, h) {
    width = w; height = h;
    const pixels = w * h;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(5.2e6 / Math.max(1, pixels))));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0, h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.near = camera.position.z * 0.3;
    camera.far = camera.position.z * 2;
    camera.updateProjectionMatrix();
  }

  function rotate(dx, dy, radius, factor = 1) {
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-4 || radius < 1) return;
    // Rodar sobre la página: el frente acompaña la dirección del movimiento.
    axis.set(dy, dx, 0).normalize();
    step.setFromAxisAngle(axis, distance / radius * factor);
    q.premultiply(step);
  }

  function integrate(frame) {
    const {dt, time, paused} = frame;
    if (!dragging) rotate(frame.vx * dt, frame.vy * dt, frame.r, 1);
    const spin = omega.length();
    if (spin > 1e-3) {
      axis.copy(omega).divideScalar(spin);
      step.setFromAxisAngle(axis, spin * dt);
      q.premultiply(step);
      omega.multiplyScalar(Math.exp(-dt * 1.6));
    }
    if (!dragging) {
      const speed = Math.hypot(frame.vx, frame.vy);
      const calm = Math.max(0, 1 - speed / 260) * Math.max(0, 1 - spin / 5);
      const wobble = paused ? 0 : 1;
      // El frente mira a la cámara desde cualquier punto de la pantalla, con un leve vaivén.
      const depth = camera.position.z;
      const facingY = -Math.atan2(frame.x - width / 2, depth), facingX = Math.atan2(height / 2 - frame.y, depth);
      // Giro continuo sobre el eje vertical (portada): al apagarse, vuelve a mostrar el nombre.
      spinRate += ((frame.spin || 0) - spinRate) * (1 - Math.exp(-dt * 1.5));
      if (frame.spin) spinAngle += spinRate * dt;
      else spinAngle += (Math.round(spinAngle / (2 * Math.PI)) * 2 * Math.PI - spinAngle) * (1 - Math.exp(-dt * 2));
      euler.set(REST.x + facingX + Math.sin(time * 0.7) * 0.035 * wobble, REST.y + facingY + spinAngle + Math.sin(time * 0.42) * 0.13 * wobble, Math.sin(time * 0.5) * 0.025 * wobble);
      rest.setFromEuler(euler);
      q.slerp(rest, 1 - Math.exp(-dt * (frame.spin ? 6 : 2.3) * calm));
    }
    q.normalize();
  }

  function place(object, x, y) {
    object.position.set(x - width / 2, height / 2 - y, 0);
  }

  function render(frame) {
    if (dead) return false;
    integrate(frame);
    hover += ((frame.hover ? 1 : 0) - hover) * (1 - Math.exp(-frame.dt * 10));
    toneTarget.set(frame.tone || 0x3a1410);
    tone.lerp(toneTarget, 1 - Math.exp(-frame.dt * 3));
    hemi.groundColor.copy(tone);

    history.unshift({t: frame.time, x: frame.x, y: frame.y, r: frame.r, q: q.clone()});
    while (history.length && frame.time - history[history.length - 1].t > 0.4) history.pop();

    const margin = frame.r * 1.6;
    const visible = frame.r > 0.5 && frame.x > -margin && frame.x < width + margin && frame.y > -margin && frame.y < height + margin;
    const canFrame = can && frame.can && frame.can.appear > 0.001 ? frame.can : null;
    if (can) can.group.visible = !!canFrame;
    if (canFrame) {
      place(can.group, canFrame.x, canFrame.y);
      can.group.scale.setScalar(canFrame.h / CAN.height * canFrame.appear);
      can.group.rotation.set(0.17, 0, -0.09);
      can.pivot.rotation.y = canFrame.angle - Math.atan2(canFrame.x - width / 2, camera.position.z);
    }
    holder.visible = visible;
    if (!visible && !canFrame) {
      if (drawn) {renderer.clear(); drawn = false;}
      return false;
    }
    place(holder, frame.x, frame.y);
    holder.rotation.z = frame.axisAngle || 0;
    counter.rotation.z = -(frame.axisAngle || 0);
    const size = frame.r * (1 + hover * 0.04);
    holder.scale.set(size * (frame.along || 1), size * (frame.perp || 1), size * (frame.perp || 1));
    spinner.quaternion.copy(q);

    const speed = Math.hypot(frame.vx, frame.vy);
    const trail = frame.paused || !visible ? 0 : Math.min(1, Math.max(0, (speed - 700) / 1800));
    ghosts.forEach((ghost, index) => {
      const sample = history.find(entry => frame.time - entry.t >= (index + 1) * 0.045);
      ghost.visible = trail > 0.01 && !!sample;
      if (!ghost.visible) return;
      place(ghost, sample.x, sample.y);
      ghost.position.z = -frame.r * 0.2 * (index + 1);
      ghost.scale.setScalar(sample.r * 0.98);
      ghost.quaternion.copy(sample.q);
      ghost.material.opacity = trail * (0.3 - index * 0.05);
    });
    renderer.render(scene, camera);
    drawn = true;
    return true;
  }

  return {
    resize,
    render,
    // Primer render fuera de cámara para compilar shaders durante la carga.
    warm() {
      const keep = holder.position.clone();
      holder.position.set(0, 0, 0);
      holder.scale.setScalar(Math.min(width, height) * 0.2);
      if (can) {can.group.visible = true; can.group.scale.setScalar(40); place(can.group, width / 2, height / 2);}
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
      renderer.clear();
      if (can) can.group.visible = false;
      holder.position.copy(keep);
    },
    grab() {dragging = true; omega.set(0, 0, 0); dragSamples.length = 0;},
    drag(dx, dy, radius, dt) {
      rotate(dx, dy, radius, 1);
      dragSamples.push({dx, dy, dt: Math.max(dt, 1 / 240), radius, t: performance.now()});
      while (dragSamples.length && performance.now() - dragSamples[0].t > 90) dragSamples.shift();
    },
    release() {
      dragging = false;
      let sx = 0, sy = 0, st = 0, radius = 1;
      for (const s of dragSamples) {sx += s.dx; sy += s.dy; st += s.dt; radius = s.radius;}
      if (st > 0 && performance.now() - (dragSamples.at(-1)?.t || 0) < 80) {
        const vx = sx / st, vy = sy / st, speed = Math.hypot(vx, vy);
        if (speed > 30) omega.set(vy, vx, 0).normalize().multiplyScalar(Math.min(26, speed / radius));
      }
      dragSamples.length = 0;
    },
    kick(dx, dy, strength = 9) {
      const length = Math.hypot(dx, dy) || 1;
      omega.addScaledVector(new THREE.Vector3(dy / length, dx / length, 0), strength);
    },
    get dead() {return dead;},
    info() {
      return {calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio()};
    }
  };
}
