import { loadSponges, SpongeWorld } from './sponges.js';
import { DirtLayer, Foam, bindSpongeDrag } from './cleaning.js';
import { setupDeckNavigation } from './navigation.js';

export async function initializeDeck(onProgress=()=>{}){
const $ = (selector,root=document)=>root.querySelector(selector);
const $$ = (selector,root=document)=>[...root.querySelectorAll(selector)];
const scenes = JSON.parse($('#scenes-data').textContent);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const states = new Map();
let currentScene=0, sceneWorld=null, sceneItem=null, sceneDrag=null, modelWorld=null, modelItem=null;
const worlds=[], foams=[];
const announce=message=>{$('#live-announcement').textContent=message;};

const nextFrame=()=>new Promise(resolve=>{
  const timer=setTimeout(()=>{cancelAnimationFrame(frame);resolve();},120);
  const frame=requestAnimationFrame(()=>{clearTimeout(timer);resolve();});
});
const fontsReady=(async()=>{
  await Promise.allSettled([document.fonts.load('800 16px Display'),document.fonts.load('400 16px Inter'),document.fonts.load('600 16px Inter')]);
  await document.fonts.ready;onProgress('fonts',1);
})();
const openingImages=$$('#inicio img');let imagesLoaded=0;
const imagesReady=Promise.all(openingImages.map(async image=>{
  try{await image.decode();}catch{image.src=image.currentSrc||image.src;await image.decode();}
  onProgress('images',++imagesLoaded/openingImages.length);
}));
let textureTimeout;
const spongesReady=Promise.race([
  loadSponges(progress=>onProgress('sponges',progress)),
  new Promise((_,reject)=>{textureTimeout=setTimeout(()=>reject(new Error('La carga 3D superó el tiempo de espera.')),30000);})
]).then(()=>({ok:true}),error=>({ok:false,error})).finally(()=>clearTimeout(textureTimeout));
await Promise.all([fontsReady,imagesReady]);

const hero=$('#hero-playground'),game=$('#scene-game');
const heroFoam=new Foam($('.foam-canvas',hero)),gameFoam=new Foam($('.foam-canvas',game));
foams.push(heroFoam,gameFoam);
let navigation;
const heroDirt=new DirtLayer(hero,{
  target:hero,kind:'cover',completionThreshold:.56,
  onProgress:p=>{$('#hero-progress-number').textContent=`${p}%`;$('#hero-progress-bar').style.width=`${p}%`;},
  onComplete:()=>{
    hero.classList.add('hero-complete');announce('El lado alegre del lío. Idea revelada.');
    navigation?.completeCover();
    const b=heroDirt.bounds();heroFoam.burst(b.x+b.w*.5,b.y+b.h*.5);
  }
});
navigation=setupDeckNavigation({cover:hero,dirt:heroDirt,reducedMotion});
const sceneDirt=new DirtLayer(game,{
  target:$('#wash-object'),kind:'sink',
  onProgress:p=>{$('#scene-progress-label').textContent=`${p}% limpio`;$('#scene-progress-bar').style.width=`${p}%`;},
  onComplete:()=>{
    game.classList.add('complete');$('#clean-reveal').setAttribute('aria-hidden','false');
    const scene=scenes[currentScene];$('#scene-done').textContent=`✓ ${scene.result}`;
    states.set(currentScene,sceneDirt.getState());updateCount();
    announce(`${scene.name}: ${scene.result}`);
    const b=sceneDirt.bounds();gameFoam.burst(b.x+b.w/2,b.y+b.h/2);
    $('#reveal-scene').disabled=true;
  }
});

$('#skip-hero').addEventListener('click',()=>heroDirt.reveal());
$$('[data-restart]').forEach(button=>button.addEventListener('click',()=>{
  // Remove any section link so the new page starts with the dirty, locked cover.
  history.replaceState(null,'',`${location.pathname}${location.search}`);
  location.reload();
}));
$('#reveal-scene').addEventListener('click',()=>sceneDirt.reveal());
$('#reset-scene').addEventListener('click',()=>{
  sceneDirt.reset();game.classList.remove('complete');$('#clean-reveal').setAttribute('aria-hidden','true');
  states.delete(currentScene);updateCount();$('#reveal-scene').disabled=false;
  announce('La escena vuelve a estar sucia. Podés limpiar otra vez.');
});

function updateCount(){
  const count=[...states.values()].filter(s=>s.complete).length;
  $('#scene-count').textContent=`${count} DE 4 LÍOS RESUELTOS`;
  $$('[data-scene]').forEach((b,i)=>b.classList.toggle('is-done',!!states.get(i)?.complete));
}

function chooseScene(index,{scroll=false,focus=false}={}){
  if(index<0||index>=scenes.length)return;
  sceneDrag?.cancel();states.set(currentScene,sceneDirt.getState());currentScene=index;
  const s=scenes[index],panel=$('#scene-panel');
  panel.style.setProperty('--scene-color',s.color);panel.style.setProperty('--scene-accent',s.accent);
  panel.setAttribute('aria-labelledby',`scene-tab-${index}`);
  $$('[data-scene]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
  $('#scene-photo').src=s.photo;$('#scene-photo').alt=s.name;
  for(const [id,key]of [['scene-name','name'],['scene-title','title'],['scene-story','story'],['scene-product','product'],['scene-surface','surface'],['scene-benefit','benefit']])$('#'+id).textContent=s[key];
  $('#scene-product-image').src=`assets/${s.sponge}-cutout.webp`;
  $('.sponge-fallback',$('#grab-scene')).src=`assets/${s.sponge}-cutout.webp`;
  $('#wash-object').className=`wash-object ${s.kind}`;
  $('#clean-reveal').replaceChildren(...s.reveal.split('\n').flatMap((line,i)=>i?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));
  const star=document.createElement('span');star.textContent='✦';$('#clean-reveal').append(star);
  const state=states.get(index);
  game.classList.toggle('complete',!!state?.complete);$('#clean-reveal').setAttribute('aria-hidden',String(!state?.complete));
  $('#scene-done').textContent=state?.complete?`✓ ${s.result}`:'';$('#reveal-scene').disabled=!!state?.complete;
  sceneDirt.setScene(s.kind,$('#wash-object'),state);
  if(sceneWorld&&sceneItem)sceneWorld.change(sceneItem,s.sponge);
  if(scroll)navigation.goTo($('#experiencia'));
  if(focus)$(`#scene-tab-${index}`).focus({preventScroll:true});
  updateCount();
}

$$('[data-scene]').forEach(b=>{
  b.addEventListener('click',()=>chooseScene(Number(b.dataset.scene)));
  b.addEventListener('keydown',e=>{
    let next=currentScene;
    if(e.key==='ArrowRight')next=(currentScene+1)%4;
    else if(e.key==='ArrowLeft')next=(currentScene+3)%4;
    else if(e.key==='Home')next=0;
    else if(e.key==='End')next=3;
    else return;
    e.preventDefault();chooseScene(next,{focus:true});
  });
});
$$('[data-scene-link]').forEach(b=>b.addEventListener('click',()=>chooseScene(Number(b.dataset.sceneLink),{scroll:true})));
$('#next-scene').addEventListener('click',()=>chooseScene((currentScene+1)%4));

const products={
  daddy:{name:'Scrub Daddy Original',description:'Firme con agua fría. Suave con agua tibia.',source:'https://scrubdaddy.com.ar/productos/scrub-daddy-original1/'},
  mommy:{name:'Scrub Mommy',description:'Un lado para frotar. Otro para absorber y hacer espuma.',source:'https://scrubdaddy.com.ar/productos/scrub-mommy/'},
  fiber:{name:'La sonrisa de fibra',description:'Modelo de la referencia compartida. Producto y uso a confirmar.',source:null},
};
let rotation=0,productKey='daddy';
function setRotation(value){
  rotation=value;if(modelWorld)modelWorld.spinTarget=rotation;
  const degrees=((Math.round(rotation*180/Math.PI)%360)+360)%360;
  $('#model-angle').textContent=`${degrees}°`;$('#model-drag').setAttribute('aria-valuenow',String(degrees));
}
$$('[data-product]').forEach(b=>b.addEventListener('click',()=>{
  productKey=b.dataset.product;const p=products[productKey];
  $$('[data-product]').forEach(o=>{const selected=o===b;o.classList.toggle('active',selected);o.setAttribute('aria-pressed',String(selected));});
  $('#product-name').textContent=p.name;$('#product-description').textContent=p.description;
  $('#model-fallback').src=`assets/${productKey}-cutout.webp`;$('#model-fallback').alt=p.name;
  $('#product-source').hidden=!p.source;if(p.source)$('#product-source').href=p.source;
  if(modelWorld&&modelItem)modelWorld.change(modelItem,productKey);setRotation(0);
}));
$('#rotate-model').addEventListener('click',()=>setRotation(rotation+Math.PI/2));
$('#reset-model').addEventListener('click',()=>setRotation(0));
const slider=$('#model-drag');let rotateDrag=null;
slider.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;rotateDrag={x:e.clientX,base:rotation,id:e.pointerId};if(e.isTrusted)slider.setPointerCapture(e.pointerId);});
slider.addEventListener('pointermove',e=>{if(!rotateDrag||e.pointerId!==rotateDrag.id)return;setRotation(rotateDrag.base+(e.clientX-rotateDrag.x)*.013);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])slider.addEventListener(type,()=>{rotateDrag=null;});
slider.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setRotation(rotation+(e.key==='ArrowRight'?1:-1)*Math.PI/12);}else if(e.key==='Home'){e.preventDefault();setRotation(0);}});

const resizeObserver=new ResizeObserver(()=>{heroFoam.resize();gameFoam.resize();});resizeObserver.observe(hero);resizeObserver.observe(game);

try{
  const loaded=await spongesReady;if(!loaded.ok)throw loaded.error;
  await nextFrame();
  const heroWorld=new SpongeWorld(hero);worlds.push(heroWorld);
  const daddy=heroWorld.add('daddy',(w,h)=>w<761?{x:w*.25,y:h*.69,size:Math.min(w*.22,h*.15),rx:.13,ry:-.37,rz:-.18}:{x:w*.15,y:h*.71,size:Math.min(w*.14,h*.19),rx:.11,ry:-.37,rz:-.17},$('#grab-daddy'));
  const mommy=heroWorld.add('mommy',(w,h)=>w<761?{x:w*.79,y:h*.22,size:Math.min(w*.18,h*.12),rx:.13,ry:.45,rz:.22,z:-40}:{x:w*.85,y:h*.25,size:Math.min(w*.115,h*.16),rx:.18,ry:.48,rz:.22,z:-30},$('#grab-mommy'));
  const fiber=heroWorld.add('fiber',(w,h)=>w<761?{x:w*.78,y:h*.70,size:Math.min(w*.175,h*.12),rx:.12,ry:-.35,rz:.18,z:-50}:{x:w*.85,y:h*.76,size:Math.min(w*.10,h*.14),rx:.15,ry:-.4,rz:.15,z:-45},$('#grab-fiber'));
  for(const [button,item]of [[$('#grab-daddy'),daddy],[$('#grab-mommy'),mommy],[$('#grab-fiber'),fiber]])bindSpongeDrag({button,container:hero,world:heroWorld,item,dirt:heroDirt,foam:heroFoam,onStart:()=>hero.classList.add('has-scrubbed')});
  onProgress('renderer',.5);await nextFrame();

  sceneWorld=new SpongeWorld(game,{mode:'scene'});worlds.push(sceneWorld);
  sceneItem=sceneWorld.add(scenes[currentScene].sponge,(w,h)=>({x:w*.81,y:h*.71,size:Math.min(91,w*.205),rx:.06,ry:-.4,rz:.2}),$('#grab-scene'));
  sceneDrag=bindSpongeDrag({button:$('#grab-scene'),container:game,world:sceneWorld,item:sceneItem,dirt:sceneDirt,foam:gameFoam});
  onProgress('renderer',.7);await nextFrame();

  modelWorld=new SpongeWorld($('#model-showcase'),{mode:'model'});worlds.push(modelWorld);
  modelItem=modelWorld.add(productKey,(w,h)=>({x:w*.5,y:h*.42,size:Math.min(w*.32,h*.34),rx:.1,ry:-.38,rz:-.1}));
  document.body.dataset.rendering='webgl';
}catch(error){
  console.warn('3D no disponible; se mantiene la experiencia con imágenes de producto.',error);
  document.body.dataset.rendering='fallback';
  // Preserve cleaning and content access on devices without WebGL.
  if(!hero.classList.contains('webgl-ready'))for(const button of [$('#grab-daddy'),$('#grab-mommy'),$('#grab-fiber')])bindSpongeDrag({button,container:hero,world:null,item:null,dirt:heroDirt,foam:heroFoam,onStart:()=>hero.classList.add('has-scrubbed')});
  if(!sceneWorld)sceneDrag=bindSpongeDrag({button:$('#grab-scene'),container:game,world:null,item:null,dirt:sceneDirt,foam:gameFoam});
  onProgress('sponges',1);
}

// Upload textures, compile materials and paint complete scenes behind the loader.
worlds.forEach(world=>world.render(performance.now(),true));
onProgress('renderer',.9);
await nextFrame();await nextFrame();
function frame(time){
  if(!document.hidden){worlds.forEach(world=>world.render(time));foams.forEach(foam=>foam.frame(time));}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.body.dataset.ready='true';
onProgress('renderer',1);
}
