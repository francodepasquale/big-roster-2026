// Director de la presentación: la pelota recorre la página y cada escena se abre desde donde aterriza.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 760px)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const params = new URLSearchParams(location.search);

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
// Escribe un estilo solo si cambió: evita recalcular estilos en cada cuadro.
const styleCache = new WeakMap();
function setStyle(el, prop, value) {
  let cache = styleCache.get(el);
  if (!cache) styleCache.set(el, cache = {});
  if (cache[prop] === value) return;
  cache[prop] = value;
  if (prop.startsWith('--')) el.style.setProperty(prop, value); else el.style[prop] = value;
}
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

// La sección entrante toma la pelota cuando su borde superior pasa del 86% al 30% de la pantalla.
const ENTER = 0.86, LAND = 0.3;
const TONES = {portada: 0x1a2c63, idea: 0xb07a08, recreo: 0x3a2a50, pelao: 0x8a7a5a, previa: 0x1a2c63, teaser: 0x2a3a44,
  draft: 0x3a2050, ultimo: 0x4a3018, equipaciones: 0x4a2a1a, pretemporada: 0x2a4a52, cara: 0x2a4a52, evento: 0x2a4a52,
  marca: 0x9a7008, pitazo: 0x6a4a40};

const state = {paused: reducedMotion.matches, ready: false, ball: null, staticMode: params.has('static'),
  intro: null, hop: null, replay: false, hintShown: false, interacted: false};
const view = {w: innerWidth, h: innerHeight};

const stations = $$('.station').map((el, index) => {
  const stage = $('.stage', el);
  const ring = document.createElement('span');
  ring.className = 'wipe-ring';
  ring.setAttribute('aria-hidden', 'true');
  stage.after(ring);
  return {el, index, id: el.id, stage, ring, spots: $$('.ball-spot', el), track: el.dataset.track || 'spot',
    open: false, wipe: null, rect: null, spot: null, anchorImg: null, objectPosition: [0.5, 0.5], pathLength: 0};
});
const byId = Object.fromEntries(stations.map(station => [station.id, station]));
const cover = byId.portada;

/* ---------- Medidas ---------- */
const timeline = {el: $('.timeline'), svg: $('.bounce'), chapters: $$('.chapter'), samples: [], landings: [], ballLength: 1,
  drawLength: 1, radius: 20, normalAngle: Math.PI / 2, active: -1, drawn: -1};
let stops = [];

function layout() {
  view.w = innerWidth;
  view.h = innerHeight;
  for (const station of stations) {
    station.spot = station.spots.find(spot => spot.getClientRects().length > 0) || null;
    station.anchorImg = station.spot?.dataset.img ? $(station.spot.dataset.img, station.el) : null;
    if (station.anchorImg) {
      station.objectPosition = getComputedStyle(station.anchorImg).objectPosition.split(' ')
        .map(value => value.endsWith('%') ? parseFloat(value) / 100 : 0.5);
    }
  }
  layoutTimeline();
  computeStops();
  state.ball?.resize(view.w, view.h);
}

function layoutTimeline() {
  const tl = timeline;
  const box = tl.el.getBoundingClientRect();
  const W = box.width, H = box.height;
  if (!W || !H) return;
  const rects = tl.chapters.map(chapter => chapter.getBoundingClientRect());
  let points, end, normal, amplitudes;
  if (!narrow.matches) {
    tl.radius = clamp(W * 0.023, 17, 38);
    const floor = rects[0].top - box.top - 18;
    points = rects.map(rect => [rect.left - box.left + tl.radius, floor - tl.radius]);
    end = [W - tl.radius, floor - tl.radius];
    normal = [0, -1];
    const available = floor - tl.radius * 2 - 6;
    amplitudes = [0.2, 0.3, 0.42, 0.56, 0.74, 0.94].map(f => f * available);
    tl.base = [0, floor, W, floor];
    tl.normalAngle = Math.PI / 2;
  } else {
    tl.radius = 13;
    const wall = W - 6;
    points = rects.map(rect => [wall - tl.radius, rect.top - box.top + rect.height / 2]);
    end = [wall - tl.radius, points[5][1] + (points[5][1] - points[4][1])];
    normal = [-1, 0];
    amplitudes = [0.22, 0.34, 0.46, 0.6, 0.78, 1].map(f => f * W * 0.3);
    tl.base = [wall, 0, wall, H];
    tl.normalAngle = Math.PI;
  }
  const draw = [], ball = [], landings = [];
  let length = 0, previous = null;
  for (let k = 0; k < 6; k++) {
    landings.push(length);
    const a = points[k], b = k < 5 ? points[k + 1] : end;
    const steps = 56;
    for (let j = k === 0 ? 0 : 1; j <= steps; j++) {
      const s = j / steps, bump = 4 * s * (1 - s) * amplitudes[k];
      const x = lerp(a[0], b[0], s) + normal[0] * bump, y = lerp(a[1], b[1], s) + normal[1] * bump;
      if (previous) length += Math.hypot(x - previous[0], y - previous[1]);
      const point = {x, y, length};
      draw.push(point);
      if (k < 5 || s <= 0.5) ball.push(point);
      previous = [x, y];
    }
  }
  tl.samples = ball;
  tl.landings = landings;
  tl.ballLength = ball.at(-1).length;
  tl.drawLength = length;
  const d = 'M' + draw.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L');
  tl.svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);
  $('.bounce-track', tl.svg).setAttribute('d', d);
  $('.bounce-done', tl.svg).setAttribute('d', d);
  const mask = $('.bounce-mask-path', tl.svg);
  mask.setAttribute('d', d);
  mask.style.strokeDasharray = `${length} ${length}`;
  const base = $('.bounce-base', tl.svg);
  ['x1', 'y1', 'x2', 'y2'].forEach((name, i) => base.setAttribute(name, tl.base[i].toFixed(1)));
  tl.drawn = -1;
}

function computeStops() {
  stops = [];
  for (const station of stations) {
    const top = station.el.getBoundingClientRect().top + scrollY;
    // En las fotos con sangrado, la parada centra el contenido en la pantalla.
    const bleed = photoBleed(station);
    stops.push(Math.round(top + bleed));
    if (station.track === 'path') {
      const travel = station.el.offsetHeight - view.h;
      timeline.landings.slice(1).forEach(length => stops.push(Math.round(top + (0.08 + 0.84 * length / timeline.ballLength) * travel)));
      stops.push(Math.round(top + 0.93 * travel));
    }
    if (station.el.dataset.steps) {
      const travel = station.el.offsetHeight - view.h, steps = +station.el.dataset.steps;
      for (let k = 1; k < steps; k++) stops.push(Math.round(top + (EQUIP_START + EQUIP_SPAN * k / (steps - 1)) * travel));
    }
  }
}

// Las fotos con sangrado (solo en escritorio) son más altas que la pantalla: se centra su contenido.
function photoBleed(station) {
  if (!station || station === cover || narrow.matches || !station.el.classList.contains('photo-station')) return 0;
  return Math.max(0, (station.stage.offsetHeight - view.h) / 2);
}

/* ---------- Dónde debería estar la pelota ---------- */
function anchorPoint(img, u, v, objectPosition) {
  // La caja del contenedor no incluye escalas animadas de la imagen: la pelota no persigue un blanco que se mueve.
  const box = img.parentElement && img.parentElement.classList.contains('photo') ? img.parentElement : img;
  const rect = box.getBoundingClientRect();
  const iw = img.naturalWidth || +img.getAttribute('width'), ih = img.naturalHeight || +img.getAttribute('height');
  const scale = Math.max(rect.width / iw, rect.height / ih);
  const w = iw * scale, h = ih * scale;
  return {x: rect.left + (rect.width - w) * objectPosition[0] + u * w, y: rect.top + (rect.height - h) * (objectPosition[1] ?? 0.5) + v * h, w};
}

function stationState(station, out) {
  out.shadow = 0;
  out.contact = 0;
  out.axisAngle = null;
  out.tone = TONES[station.id];
  if (station.track === 'path') return pathState(station, out);
  const spot = station.spot;
  if (!spot) return null;
  if (station.anchorImg) {
    const p = anchorPoint(station.anchorImg, +spot.dataset.u, +spot.dataset.v, station.objectPosition);
    out.x = p.x; out.y = p.y;
    out.r = clamp(+spot.dataset.r * p.w, +(spot.dataset.min || 16), +(spot.dataset.max || 420));
  } else {
    const rect = spot.getBoundingClientRect();
    out.x = rect.left + rect.width / 2;
    out.y = rect.top + rect.height / 2;
    out.r = rect.width / 2;
  }
  out.shadow = +(spot.dataset.shadow || 0);
  return out;
}

function pathPoint(length) {
  const samples = timeline.samples;
  let lo = 0, hi = samples.length - 1;
  if (length <= 0) return samples[0];
  if (length >= samples[hi].length) return samples[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].length < length) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi], t = (length - a.length) / Math.max(1e-6, b.length - a.length);
  return {x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)};
}

function pathState(station, out) {
  if (!timeline.samples.length) return null;
  const travel = Math.max(1, station.rect.height - view.h);
  const progress = clamp(-station.rect.top / travel);
  const q = clamp((progress - 0.08) / 0.84);
  const length = q * timeline.ballLength;
  const point = pathPoint(length);
  const box = timeline.el.getBoundingClientRect();
  out.x = box.left + point.x;
  out.y = box.top + point.y;
  out.r = timeline.radius;
  let contact = 0;
  for (const landing of timeline.landings) contact = Math.max(contact, Math.exp(-Math.pow((length - landing) / (timeline.radius * 1.5), 2)));
  out.contact = q > 0.995 ? 0 : contact;
  out.axisAngle = timeline.normalAngle;
  station.pathLength = length;
  return out;
}

function blend(a, b, t, out) {
  const e = easeInOut(t), arc = Math.sin(Math.PI * e);
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  out.x = lerp(a.x, b.x, e);
  out.y = lerp(a.y, b.y, e) - arc * Math.min(view.h * 0.24, 40 + distance * 0.32);
  out.r = lerp(a.r, b.r, e) * (1 + 0.22 * arc);
  out.shadow = lerp(a.shadow, b.shadow, e) * (1 - arc);
  out.contact = 0;
  out.axisAngle = null;
  out.tone = e < 0.5 ? a.tone : b.tone;
  return out;
}

/* ---------- Revelado circular desde la pelota ---------- */
const onOpen = {};

function openStation(station, origin, animate) {
  if (station.open) return;
  station.open = true;
  station.el.classList.add('is-open');
  onOpen[station.id]?.(station);
  if (!animate || state.paused || !origin) return;
  const rect = station.stage.getBoundingClientRect();
  const ox = origin.x - rect.left, oy = origin.y - rect.top;
  const radius = Math.hypot(Math.max(ox, rect.width - ox), Math.max(oy, rect.height - oy)) + 24;
  station.wipe = {start: performance.now(), ox, oy, radius, duration: 1050};
  station.stage.style.clipPath = `circle(0px at ${ox}px ${oy}px)`;
}

function closeStation(station) {
  station.open = false;
  station.wipe = null;
  station.stage.style.clipPath = '';
  station.ring.style.opacity = '0';
  station.el.classList.remove('is-open');
}

function updateWipes(now) {
  for (const station of stations) {
    const wipe = station.wipe;
    if (!wipe) continue;
    const t = clamp((now - wipe.start) / wipe.duration);
    const radius = wipe.radius * easeOut(t);
    station.stage.style.clipPath = `circle(${radius.toFixed(1)}px at ${wipe.ox.toFixed(1)}px ${wipe.oy.toFixed(1)}px)`;
    const ring = station.ring.style;
    ring.width = ring.height = `${(radius * 2).toFixed(1)}px`;
    ring.transform = `translate(${(wipe.ox - radius).toFixed(1)}px,${(wipe.oy - radius).toFixed(1)}px)`;
    ring.opacity = String(Math.max(0, 1 - t * 1.15));
    if (t >= 1) {
      station.wipe = null;
      station.stage.style.clipPath = '';
      ring.opacity = '0';
      ring.width = ring.height = '0px';
    }
  }
}

/* ---------- Lata del evento ---------- */
const canSpot = $('.can-spot');
const can = {angle: 0, velocity: 0, appear: 0, spin: 0, drag: null};
function canState(dt, time) {
  const station = byId.marca;
  if (!canSpot || !station.open) {can.appear = 0; return null;}
  const rect = canSpot.getBoundingClientRect();
  if (rect.bottom < -80 || rect.top > view.h + 80) return null;
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  let reached = true;
  if (station.wipe) {
    const stage = station.stage.getBoundingClientRect();
    const radius = station.wipe.radius * easeOut(clamp((performance.now() - station.wipe.start) / station.wipe.duration));
    reached = Math.hypot(x - stage.left - station.wipe.ox, y - stage.top - station.wipe.oy) < radius;
  }
  if (reached) {
    if (can.appear === 0 && !state.paused) can.spin = -Math.PI * 2;
    can.appear = state.paused ? 1 : Math.min(1, can.appear + dt / 0.85);
  }
  station.el.classList.toggle('can-in', can.appear > 0.4);
  if (!can.drag) {
    can.angle += can.velocity * dt;
    can.velocity *= Math.exp(-dt * 2.2);
    // Sin empuje, vuelve a mostrar el logo de frente.
    if (Math.abs(can.velocity) < 0.35) can.angle += (Math.round(can.angle / (2 * Math.PI)) * 2 * Math.PI - can.angle) * (1 - Math.exp(-dt * 1.6));
  }
  can.spin *= Math.exp(-dt * 2.4);
  const e = can.appear - 1;
  const pop = can.appear >= 1 ? 1 : 1 + 2.7 * e * e * e + 1.7 * e * e;
  const idle = state.paused ? 0 : Math.sin(time * 0.5) * 0.19;
  return {x, y, h: rect.height, appear: Math.max(0, pop), angle: can.angle + can.spin + idle};
}
if (canSpot) {
  canSpot.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    can.drag = {id: event.pointerId, x: event.clientX, t: performance.now()};
    can.velocity = 0;
    canSpot.setPointerCapture(event.pointerId);
  });
  canSpot.addEventListener('pointermove', event => {
    if (!can.drag || event.pointerId !== can.drag.id) return;
    const now = performance.now(), radius = canSpot.getBoundingClientRect().width / 2 || 1;
    const delta = (event.clientX - can.drag.x) / radius;
    can.angle += delta;
    can.velocity = delta / Math.max((now - can.drag.t) / 1000, 1 / 240);
    can.drag.x = event.clientX;
    can.drag.t = now;
  });
  const releaseCan = event => {
    if (!can.drag || event.pointerId !== can.drag.id) return;
    if (performance.now() - can.drag.t > 90) can.velocity = 0;
    can.velocity = clamp(can.velocity, -18, 18);
    can.drag = null;
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canSpot.addEventListener(type, releaseCan));
}

/* ---------- Parallax de portada ---------- */
// La foto y el título se mueven a distinto ritmo con el mouse y con el scroll. La pelota está
// anclada a la foto, así que acompaña a la mano.
const coverPhoto = $('.cover-photo'), coverTitle = $('.cover-title');
const pointer = {x: 0, y: 0, sx: 0, sy: 0};
addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  pointer.x = event.clientX / innerWidth * 2 - 1;
  pointer.y = event.clientY / innerHeight * 2 - 1;
}, {passive: true});
function coverParallax(dt) {
  const top = cover.el.getBoundingClientRect().top;
  if (top < -view.h * 1.2 || state.paused) {
    if (state.paused) { setStyle(coverPhoto, 'transform', ''); setStyle(coverTitle, 'transform', ''); }
    return;
  }
  const k = 1 - Math.exp(-dt / 0.35);
  pointer.sx += (pointer.x - pointer.sx) * k;
  pointer.sy += (pointer.y - pointer.sy) * k;
  const scrolled = Math.max(0, -top);
  setStyle(coverPhoto, 'transform', `translate3d(${(-pointer.sx * 9).toFixed(1)}px,${(-pointer.sy * 6 + scrolled * 0.16).toFixed(1)}px,0) scale(1.04)`);
  setStyle(coverTitle, 'transform', `translate3d(${(pointer.sx * 14).toFixed(1)}px,${(pointer.sy * 9 - scrolled * 0.12).toFixed(1)}px,0)`);
}

/* ---------- Bucle principal ---------- */
const A = {}, B = {}, T = {};
const D = {x: 0, y: 0, r: 0, shadow: 0, vx: 0, vy: 0, tone: TONES.portada};
const motion = {squash: 0, squashVelocity: 0, angle: 0, lastH: 1, lastIndex: 0, lastSpeed: 0, cssAngle: 0};
const shadow = $('#ball-shadow'), cssBall = $('#css-ball'), hit = $('#ball-hit');
const islandLabel = $('#island-label'), islandProgress = $('#island-progress');
let last = performance.now(), clock = 0, currentChapter = -1, initialized = false, interfaceDt = 0.016;

function introState(now, target) {
  const intro = state.intro;
  const t = clamp((now - intro.start) / 1700);
  if (t >= 1) {
    state.intro = null;
    if (!state.hintShown && finePointer.matches && scrollY < 40) {
      state.hintShown = true;
      setTimeout(() => {
        if (state.interacted || scrollY >= 40) return;
        cover.el.style.setProperty('--hx', `${Math.round(D.x + D.r * 0.78)}px`);
        cover.el.style.setProperty('--hy', `${Math.round(D.y - D.r * 0.78)}px`);
        cover.el.classList.add('show-hint');
      }, 500);
    }
    return target;
  }
  // 0–78%: vuelo en arco desde abajo a la derecha. 78–100%: cae en la palma y rebota apenas.
  const flight = clamp(t / 0.78), e = 1 - Math.pow(1 - flight, 3);
  const sx = view.w * 1.1, sy = view.h * 1.2;
  let x = lerp(sx, target.x, e), y = lerp(sy, target.y, e) - Math.sin(Math.PI * e) * view.h * 0.28, r = target.r * lerp(1.6, 1, e);
  if (t > 0.78) {
    const k = (t - 0.78) / 0.22;
    y = target.y - Math.sin(Math.PI * k) * target.r * 0.22 * (1 - k);
    x = target.x; r = target.r;
  }
  return {x, y, r, shadow: 0, contact: 0, axisAngle: null, tone: target.tone};
}

function impulse(amount, angle) {
  if (state.paused) return;
  motion.squash = Math.max(motion.squash, amount);
  motion.squashVelocity = 0;
  if (angle != null) motion.angle = angle;
}

function hopOffset(now) {
  const hop = state.hop;
  if (!hop) return 0;
  const t = (now - hop.start) / 1000;
  const bounces = [[0, 0.5, 1], [0.5, 0.82, 0.36], [0.82, 1, 0.12]];
  for (const [a, b, amp] of bounces) {
    if (t < b) {
      const u = (t - a) / (b - a);
      if (!hop.landed[a] && u > 0.97) {hop.landed[a] = true; impulse(0.22 * amp + 0.06, Math.PI / 2);}
      return -Math.sin(Math.PI * u) * hop.height * amp;
    }
  }
  state.hop = null;
  return 0;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  clock += dt;
  const vh = view.h;
  coverParallax(dt);
  for (const station of stations) station.rect = station.el.getBoundingClientRect();

  let index = 0;
  for (let k = 0; k < stations.length; k++) if (stations[k].rect.top <= vh * ENTER) index = k;
  const current = stations[index];
  const h = index > 0 ? clamp((vh * ENTER - current.rect.top) / (vh * (ENTER - LAND))) : 1;
  const b = stationState(current, B);
  let target = b;
  if (h < 1 && index > 0) {
    const a = stationState(stations[index - 1], A);
    target = a && b ? blend(a, b, h, T) : (b || a);
  }

  if (state.ready) {
    if (h >= 0.9) {
      for (let k = 0; k < index; k++) openStation(stations[k], null, false);
      openStation(current, b, true);
    }
    if (state.replay && scrollY < 2) restart();
  }
  updateWipes(now);

  if (target && state.ready) {
    if (state.intro) target = introState(now, target);
    const follow = !initialized || state.paused || state.intro ? 1 : 1 - Math.exp(-dt / 0.07);
    const px = D.x, py = D.y;
    D.x = lerp(D.x, target.x, follow);
    D.y = lerp(D.y, target.y, follow);
    D.r = lerp(D.r, target.r, follow);
    D.shadow = lerp(D.shadow, target.shadow || 0, follow);
    D.tone = target.tone ?? D.tone;
    D.vx = initialized ? (D.x - px) / dt : 0;
    D.vy = initialized ? (D.y - py) / dt : 0;
    initialized = true;
  }
  const speed = Math.hypot(D.vx, D.vy);
  // Aterrizaje al terminar el pase entre secciones: aplastamiento proporcional a la velocidad.
  if (index === motion.lastIndex && motion.lastH < 0.985 && h >= 0.985) impulse(clamp(motion.lastSpeed / 2600, 0.07, 0.22), Math.atan2(-D.vy, D.vx));
  motion.lastH = h;
  motion.lastIndex = index;
  motion.lastSpeed = speed;
  if (speed > 60) motion.angle = Math.atan2(-D.vy, D.vx);
  motion.squashVelocity += (-motion.squash * 380 - motion.squashVelocity * 15) * dt;
  motion.squash += motion.squashVelocity * dt;
  const stretch = state.paused ? 0 : clamp((speed - 160) / 5200, 0, 0.14);
  const contact = state.paused ? 0 : (target?.contact || 0) * 0.16;
  let along = 1 + stretch - motion.squash, perp = 1 - stretch * 0.5 + motion.squash * 0.55, axisAngle = motion.angle;
  if (contact > motion.squash && target?.axisAngle != null) {
    along = 1 - contact; perp = 1 + contact * 0.55; axisAngle = target.axisAngle;
  }
  const lift = state.paused ? 0 : hopOffset(now);
  const ballY = D.y + lift;

  if (state.ball && !state.ball.dead) {
    state.ball.render({x: D.x, y: ballY, r: state.ready ? D.r : 0, vx: D.vx, vy: D.vy, dt, time: clock, paused: state.paused,
      along, perp, axisAngle, hover: hit.matches(':hover') || hit.classList.contains('is-dragging'), tone: D.tone,
      can: state.ready ? canState(dt, clock) : null,
      spin: index === 0 && h >= 1 && !state.intro && !state.paused && !hit.classList.contains('is-dragging') ? 1.7 : 0});
  } else if (state.ready) {
    if (!root.classList.contains('no-webgl')) root.classList.add('no-webgl');
    motion.cssAngle += state.paused ? 0 : (D.vx * dt) / Math.max(D.r, 1);
    // Sin WebGL, la pelota también se endereza para mostrar el nombre al quedar quieta.
    if (!drag && speed < 120) motion.cssAngle += (Math.round(motion.cssAngle / (2 * Math.PI)) * 2 * Math.PI - motion.cssAngle) * (1 - Math.exp(-dt * 2.6));
    setStyle(cssBall, 'transform', `translate3d(${D.x.toFixed(1)}px,${ballY.toFixed(1)}px,0) rotate(${motion.cssAngle.toFixed(3)}rad) scale(${(D.r / 200).toFixed(4)})`);
  }
  if (D.shadow > 0.01 && state.ready) {
    const fade = 1 - clamp(-lift / (D.r * 1.5));
    setStyle(shadow, 'opacity', (D.shadow * (0.35 + 0.65 * fade)).toFixed(3));
    setStyle(shadow, 'transform', `translate3d(${D.x.toFixed(1)}px,${(D.y + D.r * 0.94).toFixed(1)}px,0) scale(${(D.r * 2.2 * (0.7 + 0.3 * fade) / 200).toFixed(4)},${(D.r * 0.42 / 200).toFixed(4)})`);
  } else setStyle(shadow, 'opacity', '0');

  const live = state.ready && !state.intro && h >= 0.98 && speed < 90 && D.r > 18 && ballY > 0 && ballY < vh && !islandOpen();
  hit.classList.toggle('is-live', live);
  setStyle(hit, 'transform', `translate3d(${D.x.toFixed(1)}px,${ballY.toFixed(1)}px,0) scale(${(D.r / 100).toFixed(3)})`);

  interfaceDt = dt;
  updateInterface(index, h, current);
}

function updateInterface(index, h, current) {
  const chapter = h >= 0.5 ? index : Math.max(0, index - 1);
  if (chapter !== currentChapter) {
    currentChapter = chapter;
    islandLabel.textContent = stations[chapter].el.dataset.chapter;
    $$('#island-list a').forEach((link, k) => k === chapter ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
  }
  const fraction = scrollY / Math.max(1, root.scrollHeight - view.h);
  setStyle(islandProgress, 'strokeDashoffset', (62.832 * (1 - fraction)).toFixed(2));
  const out = index === 0 ? 0 : index === 1 ? h : 1;
  setStyle(cover.el, '--out', out.toFixed(3));
  if (out > 0.08 && cover.el.classList.contains('show-hint')) cover.el.classList.remove('show-hint');

  const previa = byId.previa;
  if (previa.rect.top < view.h && previa.rect.bottom > 0 && timeline.samples.length) {
    if (current !== previa) pathState(previa, A);
    const length = previa.pathLength;
    let active = 0;
    timeline.landings.forEach((landing, k) => {if (length >= landing - 2) active = k;});
    if (active !== timeline.active) {
      timeline.active = active;
      timeline.chapters.forEach((chapterEl, k) => {
        chapterEl.classList.toggle('is-active', k === active);
        chapterEl.classList.toggle('is-done', k < active);
      });
      $('#previa-current').textContent = String(active + 1);
    }
    if (Math.abs(length - timeline.drawn) > 0.5) {
      timeline.drawn = length;
      $('.bounce-mask-path').style.strokeDashoffset = String(timeline.drawLength - length);
    }
  }
  tickers(current);
  updateEquip(interfaceDt);
}

/* ---------- Relojes de las escenas ---------- */
const timecode = $('#timecode'), draftClock = $('#draft-clock');
let timecodeFrames = 14 * 60 * 24 + 8 * 24, clockSeconds = 600, clockTick = 0, timecodeTick = 0;
function visible(station) {return station.open && station.rect.bottom > 0 && station.rect.top < view.h;}
function tickers() {
  const now = performance.now();
  if (state.paused) return;
  if (visible(byId.teaser) && now - timecodeTick > 1000 / 24) {
    timecodeTick = now;
    timecodeFrames++;
    const f = timecodeFrames % 24, s = Math.floor(timecodeFrames / 24) % 60, m = Math.floor(timecodeFrames / 1440) % 60;
    timecode.textContent = `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }
  if (visible(byId.draft) && now - clockTick > 1000) {
    clockTick = now;
    clockSeconds = clockSeconds <= 0 ? 600 : clockSeconds - 1;
    draftClock.textContent = `${Math.floor(clockSeconds / 60)}:${String(clockSeconds % 60).padStart(2, '0')}`;
  }
}

/* ---------- Escenas ---------- */
const pyq = $('.pyq');
function runPanYQueso() {
  pyq.classList.remove('is-run');
  void pyq.offsetWidth;
  pyq.classList.add('is-run');
}
onOpen.recreo = runPanYQueso;
$('.pyq-replay').addEventListener('click', runPanYQueso);

// Las equipaciones: la sección queda fija y cada lámpara ilumina su camiseta según el scroll.
// Etapas: Villano, Vieja Gloria, El que no quería venir, Estratega y, al final, las cuatro.
const kits = $$('.kit'), kitItems = $$('.kits li'), kitLights = $$('.kit-light'), lamps = $$('.lamp');
const lockerEl = $('.locker'), kitCaption = $('.kit-caption');
const kitCaptionName = $('#kit-caption-name'), kitCaptionDesc = $('#kit-caption-desc');
const EQUIP_STAGES = 5, EQUIP_START = 0.06, EQUIP_SPAN = 0.84;
const kitLevels = [1, 0, 0, 0], kitDark = {value: 0.74};
let kitOverride = null, kitCaptionIndex = -1, kitDrawn = '';
const smoothstep = t => t * t * (3 - 2 * t);
function equipTargets(progress) {
  const weights = [];
  if (kitOverride != null) {
    for (let k = 0; k < EQUIP_STAGES; k++) weights.push(k === kitOverride ? 1 : 0);
  } else {
    const q = clamp((progress - EQUIP_START) / EQUIP_SPAN) * (EQUIP_STAGES - 1);
    for (let k = 0; k < EQUIP_STAGES; k++) weights.push(1 - smoothstep(clamp((Math.abs(q - k) - 0.22) / 0.56)));
  }
  const all = weights[4];
  return {
    lamps: [0, 1, 2, 3].map(i => clamp(weights[i] + all)),
    dark: 0.76 * (weights[0] + weights[1] + weights[2] + weights[3]) + 0.48 * all,
    all
  };
}
function updateEquip(dt) {
  const station = byId.equipaciones;
  const rect = station.rect;
  if (!rect || rect.bottom < -50 || rect.top > view.h + 50) return;
  const travel = Math.max(1, rect.height - view.h);
  const target = equipTargets(clamp(-rect.top / travel));
  const follow = state.paused ? 1 : 1 - Math.exp(-dt / 0.07);
  target.lamps.forEach((value, i) => {kitLevels[i] += (value - kitLevels[i]) * follow;});
  kitDark.value += (target.dark - kitDark.value) * follow;
  const key = kitLevels.map(v => v.toFixed(3)).join() + kitDark.value.toFixed(3);
  if (key === kitDrawn) return;
  kitDrawn = key;
  lockerEl.style.setProperty('--dark', kitDark.value.toFixed(3));
  kitLevels.forEach((level, i) => {
    const value = level.toFixed(3);
    kitLights[i].style.setProperty('--l', value);
    lamps[i].style.setProperty('--l', value);
    kitItems[i].style.setProperty('--a', value);
  });
  // Pie de foto en celular: la camiseta más iluminada; con las cuatro encendidas, se oculta.
  let best = 0;
  kitLevels.forEach((level, i) => {if (level > kitLevels[best]) best = i;});
  if (best !== kitCaptionIndex) {
    kitCaptionIndex = best;
    kitCaptionName.textContent = kits[best].querySelector('.kit-name').textContent;
    kitCaptionDesc.textContent = kits[best].querySelector('.kit-desc').textContent;
  }
  setStyle(kitCaption, 'opacity', (1 - target.all).toFixed(3));
}
function setKitOverride(index) {
  kitOverride = index;
  kits.forEach((kit, k) => kit.setAttribute('aria-pressed', String(k === index)));
}
kits.forEach((kit, index) => {
  kit.addEventListener('pointerenter', event => {if (event.pointerType === 'mouse') setKitOverride(index);});
  kit.addEventListener('pointerleave', event => {if (event.pointerType === 'mouse') setKitOverride(null);});
  kit.addEventListener('focus', () => setKitOverride(index));
  kit.addEventListener('blur', () => setKitOverride(null));
  kit.addEventListener('click', () => setKitOverride(kitOverride === index && !finePointer.matches ? null : index));
});
addEventListener('scroll', () => {if (kitOverride != null && !kits.includes(document.activeElement)) setKitOverride(null);}, {passive: true});

// Cada ojota cae al piso y queda ahí: se van acumulando con cada tiro.
const ojota = $('.ojota'), ojotaPile = [];
function throwOjota() {
  const station = byId.pretemporada;
  if (state.paused) return;
  const img = $('.photo img', station.el), stage = station.stage.getBoundingClientRect();
  const position = getComputedStyle(img).objectPosition.split(' ').map(value => parseFloat(value) / 100);
  const size = ojota.getBoundingClientRect().width || 60;
  const landing = {u: 0.08 + Math.random() * 0.36, v: 0.87 + Math.random() * 0.1, turn: 900 + Math.random() * 520};
  const at = (u, v) => {
    const p = anchorPoint(img, u, v, position);
    return {x: clamp(p.x - stage.left, size, stage.width - size), y: clamp(p.y - stage.top, size, stage.height - size * 0.6)};
  };
  const from = at(0.7, 0.36), mid = at(0.38, 0.19), pass = at(0.16, 0.3), end = at(landing.u, landing.v);
  const point = p => `${(p.x - size / 2).toFixed(1)}px,${(p.y - size).toFixed(1)}px`;
  const clone = ojota.cloneNode(true);
  clone.classList.add('is-thrown');
  ojota.after(clone);
  const finalRotate = landing.turn;
  const flight = clone.animate([
    {transform: `translate(${point(from)}) rotate(-30deg) scale(.55)`, opacity: 0},
    {opacity: 1, offset: 0.06},
    {transform: `translate(${point(mid)}) rotate(380deg) scale(1)`, opacity: 1, offset: 0.36},
    {transform: `translate(${point(pass)}) rotate(700deg) scale(1.06)`, opacity: 1, offset: 0.62, easing: 'cubic-bezier(.5,0,.9,.6)'},
    {transform: `translate(${point(end)}) rotate(${finalRotate}deg) scale(1)`, opacity: 1, offset: 0.9},
    {transform: `translate(${point({x: end.x, y: end.y - size * 0.18})}) rotate(${finalRotate + 12}deg) scale(1)`, opacity: 1, offset: 0.95},
    {transform: `translate(${point(end)}) rotate(${finalRotate + 8}deg) scale(1)`, opacity: 1}
  ], {duration: 1500, easing: 'cubic-bezier(.33,.08,.42,1)', fill: 'forwards'});
  flight.finished.then(() => {
    // Queda apoyada en el piso, en porcentaje del escenario para que siga en su lugar al redimensionar.
    clone.style.left = `${((end.x - size / 2) / stage.width * 100).toFixed(2)}%`;
    clone.style.top = `${((end.y - size) / stage.height * 100).toFixed(2)}%`;
    clone.style.transform = `rotate(${(finalRotate + 8) % 360}deg)`;
    clone.style.opacity = '1';
    flight.cancel();
  }).catch(() => {});
  ojotaPile.push(clone);
  if (ojotaPile.length > 16) ojotaPile.shift().remove();
}
function clearOjotas() {while (ojotaPile.length) ojotaPile.pop().remove();}
onOpen.pretemporada = () => setTimeout(throwOjota, 900);
$('.ojota-btn').addEventListener('click', throwOjota);

$$('.sticker').forEach(sticker => {
  sticker.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || state.paused) return;
    const rect = sticker.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5, y = (event.clientY - rect.top) / rect.height - 0.5;
    sticker.style.setProperty('--tx', `${(x * 16).toFixed(2)}deg`);
    sticker.style.setProperty('--ty', `${(-y * 16).toFixed(2)}deg`);
    sticker.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    sticker.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  sticker.addEventListener('pointerleave', () => {
    ['--tx', '--ty'].forEach(name => sticker.style.setProperty(name, '0deg'));
  });
});

/* ---------- La pelota en la mano ---------- */
let drag = null;
function hop() {
  if (state.paused || state.hop) return;
  state.hop = {start: performance.now(), height: Math.min(D.r * 0.95, 120), landed: {}};
}
function markInteraction() {
  state.interacted = true;
  cover.el.classList.remove('show-hint');
}
hit.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  markInteraction();
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, lx: event.clientX, ly: event.clientY, t: performance.now(), lt: performance.now(), moved: false};
  hit.setPointerCapture(event.pointerId);
  hit.classList.add('is-dragging');
  state.ball?.grab();
});
hit.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const now = performance.now();
  drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6;
  if (drag.moved) {
    state.ball?.drag(event.clientX - drag.lx, event.clientY - drag.ly, D.r, (now - drag.lt) / 1000);
    motion.cssAngle += (event.clientX - drag.lx) / Math.max(D.r, 1);
  }
  drag.lx = event.clientX;
  drag.ly = event.clientY;
  drag.lt = now;
});
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const tap = !drag.moved && performance.now() - drag.t < 350 && event.type === 'pointerup';
  drag = null;
  hit.classList.remove('is-dragging');
  state.ball?.release();
  if (tap) hop();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => hit.addEventListener(type, endDrag));
hit.addEventListener('click', event => {if (event.detail === 0) {markInteraction(); hop();}});
hit.addEventListener('keydown', event => {
  const spins = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
  if (!spins[event.key]) return;
  event.preventDefault();
  event.stopPropagation();
  markInteraction();
  state.ball?.kick(...spins[event.key]);
});

/* ---------- Índice tipo isla ---------- */
const island = $('#island'), trigger = $('#island-trigger'), menu = $('#island-menu'), backdrop = $('#island-backdrop'), list = $('#island-list');
stations.forEach((station, k) => {
  const link = document.createElement('a');
  link.href = `#${station.id}`;
  const number = document.createElement('span');
  number.className = 'n';
  number.textContent = String(k).padStart(2, '0');
  const label = document.createElement('span');
  label.textContent = station.el.dataset.chapter;
  link.append(number, label);
  list.append(link);
});
function islandOpen() {return island.classList.contains('expanded');}
function setIsland(open, restoreFocus = true) {
  island.classList.toggle('expanded', open);
  trigger.setAttribute('aria-expanded', String(open));
  trigger.tabIndex = open ? -1 : 0;
  menu.inert = !open;
  menu.setAttribute('aria-hidden', String(!open));
  backdrop.hidden = !open;
  if (open) $('#island-close').focus({preventScroll: true});
  else if (restoreFocus) trigger.focus({preventScroll: true});
}
trigger.addEventListener('click', () => setIsland(true));
$('#island-close').addEventListener('click', () => setIsland(false));
backdrop.addEventListener('click', () => setIsland(false));
function goTo(hash) {
  const target = $(hash);
  if (!target) return;
  const bleed = photoBleed(stations.find(item => item.el === target));
  scrollTo({top: target.getBoundingClientRect().top + scrollY + bleed, behavior: state.paused ? 'instant' : 'smooth'});
  history.replaceState(null, '', hash);
}
list.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  setIsland(false, false);
  goTo(link.getAttribute('href'));
  trigger.focus({preventScroll: true});
});
$$('.chapter a, .skip-link').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  goTo(link.getAttribute('href'));
}));
document.addEventListener('keydown', event => {
  if (islandOpen()) {
    if (event.key === 'Escape') {event.preventDefault(); setIsland(false);}
    if (event.key === 'Tab') {
      const controls = [...menu.querySelectorAll('button,a')];
      if (event.shiftKey && document.activeElement === controls[0]) {event.preventDefault(); controls.at(-1).focus();}
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) {event.preventDefault(); controls[0].focus();}
    }
    return;
  }
  // Control remoto de presentación: avanzar y retroceder por escenas y rebotes.
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !state.ready) return;
  const direction = {PageDown: 1, ArrowRight: 1, PageUp: -1, ArrowLeft: -1}[event.key];
  if (!direction || document.activeElement?.closest?.('input,textarea,select')) return;
  event.preventDefault();
  const y = scrollY;
  let target = direction > 0 ? stops.find(stop => stop > y + 4) : [...stops].reverse().find(stop => stop < y - 4);
  if (target == null) target = direction > 0 ? root.scrollHeight : 0;
  scrollTo({top: target, behavior: state.paused ? 'instant' : 'smooth'});
});

/* ---------- Movimiento y reinicio ---------- */
function updateMotion() {
  document.body.classList.toggle('motion-paused', state.paused);
  const toggle = $('#motion-toggle');
  toggle.setAttribute('aria-pressed', String(state.paused));
  toggle.textContent = state.paused ? 'Activar movimiento' : 'Pausar movimiento';
  if (state.paused) {
    stations.forEach(station => {if (station.wipe) {station.wipe = null; station.stage.style.clipPath = ''; station.ring.style.opacity = '0';}});
  }
}
$('#motion-toggle').addEventListener('click', () => {state.paused = !state.paused; updateMotion();});
reducedMotion.addEventListener('change', event => {state.paused = event.matches; updateMotion();});
updateMotion();

$('#replay').addEventListener('click', () => {
  state.replay = true;
  scrollTo({top: 0, behavior: state.paused ? 'instant' : 'smooth'});
});
function restart() {
  state.replay = false;
  stations.forEach(station => {if (station !== cover) closeStation(station);});
  cover.el.classList.remove('is-open', 'show-hint');
  void cover.el.offsetWidth;
  cover.el.classList.add('is-open');
  state.hintShown = false;
  state.interacted = false;
  timeline.active = -1;
  timeline.drawn = -1;
  currentChapter = -1;
  kitDrawn = '';
  can.appear = 0;
  byId.marca.el.classList.remove('can-in');
  clearOjotas();
  setKitOverride(null);
  if (!state.paused) {state.intro = {start: performance.now()}; state.ball?.kick(-1, 0.4, 16);}
}

/* ---------- Arranque ---------- */
let resizeFrame = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(layout);
}, {passive: true});
narrow.addEventListener('change', layout);

const layoutReady = document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => {layout(); resolve();})));
const ballReady = (async () => {
  if (state.staticMode) throw new Error('Vista estática solicitada');
  const {createBall} = await import('./ball.js');
  const ball = await createBall($('#ball-canvas'));
  ball.resize(view.w, view.h);
  ball.warm();
  state.ball = ball;
})().catch(error => {
  root.classList.add('no-webgl');
  if (!state.staticMode) console.warn('La pelota se muestra sin WebGL.', error);
});
window.uepLoading?.track('ball', ballReady);
window.uepLoading?.track('layout', layoutReady);

document.addEventListener('uep:ready', () => {
  layout();
  hit.hidden = false;
  state.ready = true;
  openStation(cover, null, false);
  if (scrollY < view.h * 0.4 && !state.paused) {
    state.intro = {start: performance.now()};
    state.ball?.kick(-1, 0.4, 16);
  }
}, {once: true});

requestAnimationFrame(frame);
window.ultimoEnPie = {state, stations, layout, timeline, get stops() {return stops;}, D, can};
