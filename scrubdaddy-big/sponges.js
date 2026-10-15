import * as THREE from './assets/vendor/three.module.min.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { spongeParts } from './geometry.js';

const loader = new THREE.TextureLoader();
const textureLoads = [];
const assets = new Map();
const geometryCache = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let silhouettes;

function tex(url, color = false, tiled = false) {
  let resolve, reject;
  textureLoads.push(new Promise((yes,no)=>{resolve=yes;reject=no;}));
  const t = loader.load(url,resolve,undefined,()=>{
    // Recover a transient local/network failure before giving up the 3D experience.
    loader.load(url,recovered=>{t.image=recovered.image;t.needsUpdate=true;resolve(t);},undefined,reject);
  });
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (tiled) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function materials(key) {
  if (assets.has(key)) return assets.get(key);
  const source = key === 'resofoam' ? 'daddy' : key;
  const common = { roughness: .94, metalness: 0, envMapIntensity: .1, bumpScale: .012 };
  const face = new THREE.MeshStandardMaterial({
    ...common,
    map: tex(`assets/textures/${source}-color.webp`, true),
    normalMap: tex(`assets/textures/${source}-normal.png`),
    normalScale: new THREE.Vector2(.43,.43),
    bumpMap: tex(`assets/textures/${source}-height.png`),
    color: key === 'resofoam' ? 0xfff0a5 : 0xffffff,
  });
  const side = new THREE.MeshStandardMaterial({
    ...common,
    map: tex(`assets/textures/${source}-side.webp`,true,true),
    normalMap:tex(`assets/textures/${source}-side-normal.png`,false,true),
    normalScale:new THREE.Vector2(.4,.4),
    color: key === 'resofoam' ? 0xfff3b9 : 0xffffff,
  });
  if (key === 'resofoam') {
    // The reverse of Mommy is the finer yellow ResoFoam layer.
    face.map = side.map;
    face.normalMap = side.normalMap;
    face.normalScale.set(.2,.2);
    side.normalScale.set(.25,.25);
  }
  assets.set(key,[face,side]);
  return [face,side];
}

export async function loadSponges(onProgress=()=>{}) {
  const response = await fetch('assets/models/silhouettes.json');
  if (!response.ok) throw new Error('No se pudieron cargar los modelos.');
  silhouettes = await response.json();
  onProgress(.08);
  let prepared=0;
  for (const key of ['daddy','mommy','fiber']) {
    const parts = spongeParts(silhouettes[key],key);
    geometryCache.set(key,parts);
    parts.forEach(p=>materials(p.material));
    onProgress(.08+ ++prepared*.04);
  }
  let loaded=0;
  const results=await Promise.allSettled(textureLoads.map(promise=>promise.finally(()=>{
    onProgress(.2+ ++loaded/textureLoads.length*.8);
  })));
  const failure=results.find(result=>result.status==='rejected');
  if(failure)throw failure.reason;
}

export function makeSponge(key) {
  const group = new THREE.Group();
  for (const part of geometryCache.get(key)) {
    const mesh = new THREE.Mesh(part.geometry, materials(part.material));
    group.add(mesh);
  }
  group.userData.key = key;
  return group;
}

let shadowTexture;
function getShadow() {
  if (!shadowTexture) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64,64,4,64,64,63);
    grad.addColorStop(0,'rgba(34,22,8,.30)');grad.addColorStop(.3,'rgba(34,22,8,.17)');grad.addColorStop(1,'rgba(34,22,8,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
    shadowTexture = new THREE.CanvasTexture(c);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));
}

export class SpongeWorld {
  constructor(element, { mode = 'hero' } = {}) {
    this.element = element; this.mode = mode; this.items = []; this.visible = true; this.spin = 0; this.spinTarget = 0;
    this.canvas = element.querySelector('.sponge-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas:this.canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.7:2));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .74;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1,1,1,-1,1,5000);this.camera.position.z=1800;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room,.04);this.scene.environment = this.environment.texture;
    room.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x7e6a58,.5));
    const key = new THREE.DirectionalLight(0xfffcf0,1.6);key.position.set(-400,500,900);this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff,.35);fill.position.set(600,-60,400);this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff5dc,.7);rim.position.set(100,500,-300);this.scene.add(rim);
    this.resizeObserver = new ResizeObserver(()=>this.resize());this.resizeObserver.observe(element);
    this.intersectionObserver = new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;},{rootMargin:'150px'});this.intersectionObserver.observe(element);
    this.resize();
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();element.classList.remove('webgl-ready');});
    this.canvas.addEventListener('webglcontextrestored',()=>element.classList.add('webgl-ready'));
    element.classList.add('webgl-ready');
  }
  resize() {
    const width=this.element.clientWidth,height=this.element.clientHeight;if (!width||!height)return;
    this.width=width;this.height=height;
    this.renderer.setSize(width,height,false);
    this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
    this.items.forEach(item=>this.layoutItem(item,true));
  }
  add(key,layout,button=null) {
    const object = makeSponge(key); this.scene.add(object);
    const shadow = getShadow(); this.scene.add(shadow);
    const item = {object,shadow,key,layout,button,held:false,drag:null,rest:null,current:{x:0,y:0},velocity:{x:0,y:0},phase:this.items.length*2.8};
    this.items.push(item); this.layoutItem(item,true);this.render(performance.now(),true);return item;
  }
  layoutItem(item,snap=false) {
    const l=item.layout(this.width,this.height);item.home=l;
    const x=item.rest?item.rest.x*this.width:l.x,y=item.rest?item.rest.y*this.height:l.y;
    if(snap){
      item.current.x=x;item.current.y=y;
      if(item.held)item.drag={x,y};
      item.object.scale.setScalar(l.size);
      item.object.rotation.set(l.rx||0,l.ry||0,l.rz||0);
      item.object.position.set(x-this.width/2,this.height/2-y,40+(l.z||0));
    }
    if(item.button){
      item.button.style.left=`${item.current.x}px`;item.button.style.top=`${item.current.y}px`;
      item.button.style.width=`${l.size*1.95}px`;item.button.style.height=`${l.size*1.95}px`;
    }
  }
  change(item,key) {
    const previous=item.object;
    item.object=makeSponge(key);item.object.position.copy(previous.position);item.object.quaternion.copy(previous.quaternion);item.object.scale.copy(previous.scale);
    this.scene.remove(previous);this.scene.add(item.object);item.key=key;
    this.render(performance.now(),true);
  }
  hold(item,x,y){item.held=true;item.drag={x,y};}
  move(item,x,y){item.drag={x,y};}
  release(item){
    // Keep the drop point in relative coordinates, including through viewport changes.
    const p=item.drag||item.current;item.rest={x:p.x/this.width,y:p.y/this.height};
    item.held=false;item.drag=null;
  }
  render(time,force=false) {
    if (!force && (!this.visible || document.hidden)) return;
    const dt=Math.min(50,Math.max(0,time-(this.lastFrame??time-1000/60)));this.lastFrame=time;
    const blend=duration=>reducedMotion?1:1-Math.exp(-dt/duration);
    const follow=blend(65),settle=blend(165),turn=blend(180);
    this.spin+=(this.spinTarget-this.spin)*blend(145);
    for (const item of this.items) {
      const h=item.home;
      const floating=!reducedMotion&&!item.held&&!item.rest;
      const float=floating?Math.sin(time*.00065+item.phase)*6:0;
      const tx=item.held?item.drag.x:item.rest?item.rest.x*this.width:h.x;
      const ty=item.held?item.drag.y:item.rest?item.rest.y*this.height:h.y+float;
      item.velocity.x=tx-item.current.x;item.velocity.y=ty-item.current.y;
      item.current.x+=(tx-item.current.x)*follow;item.current.y+=(ty-item.current.y)*follow;
      const o=item.object;
      o.position.set(item.current.x-this.width/2,this.height/2-item.current.y,40+(h.z||0));
      const scale=h.size*(item.held?.94:1);
      o.scale.x+=(scale-o.scale.x)*settle;o.scale.y+=(scale*(item.held?.98:1)-o.scale.y)*settle;o.scale.z+=(scale*(item.held?.95:1)-o.scale.z)*settle;
      const idle=floating?Math.sin(time*.00045+item.phase)*.035:0;
      const tilt=(speed,limit)=>reducedMotion?0:Math.max(-limit,Math.min(limit,speed));
      const ry=(h.ry||0)+idle+this.spin+(item.held?tilt(item.velocity.x*.007,.2):0);
      const rx=(h.rx||0)+idle+(item.held?tilt(-item.velocity.y*.005,.15):0);
      const rz=(h.rz||0)+idle*.6+(item.held?tilt(-item.velocity.x*.006,.18):0);
      o.rotation.x+=(rx-o.rotation.x)*turn;o.rotation.y+=(ry-o.rotation.y)*turn;o.rotation.z+=(rz-o.rotation.z)*turn;
      // The hit area follows the rendered sponge so it can be picked up where it rests.
      if(item.button){item.button.style.left=`${item.current.x}px`;item.button.style.top=`${item.current.y}px`;}
      item.shadow.position.set(o.position.x+18,o.position.y-h.size*.72,-120);
      item.shadow.scale.set(o.scale.x*2.4,o.scale.y*.73,1);
      item.shadow.material.opacity+=((item.held?.5:.7)-item.shadow.material.opacity)*settle;
    }
    this.renderer.render(this.scene,this.camera);
  }
}
