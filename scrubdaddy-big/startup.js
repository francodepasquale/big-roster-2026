// Every percentage comes from a completed startup task. Smoothing only trails it.
const root=document.documentElement;
const loader=document.querySelector('#boot-loader');
const progress=document.querySelector('#boot-progress');
const number=document.querySelector('#boot-number');
const main=document.querySelector('main');
const island=document.querySelector('.island-wrap');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const weights={modules:12,fonts:8,images:10,sponges:60,renderer:10};
const stages=Object.fromEntries(Object.keys(weights).map(key=>[key,0]));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let target=0,shown=0,lastTime=null,animation=null,frameTimeout=null,failed=false,finished=false;
let reachedHundred;
const hundred=new Promise(resolve=>{reachedHundred=resolve;});

main.inert=true;island.inert=true;main.setAttribute('aria-busy','true');
// A slow connection can be retried, but never uncovers a half-loaded scene.
const slowTimer=setTimeout(()=>root.classList.add('boot-slow'),20000);

function report(stage,fraction){
  if(failed||finished)return;
  stages[stage]=Math.max(stages[stage],Math.min(1,Math.max(0,fraction)));
  target=Object.entries(weights).reduce((sum,[key,weight])=>sum+stages[key]*weight,0);
}

function tick(time){
  const dt=Math.max(0,time-(lastTime??time-1000/60));lastTime=time;
  shown=reducedMotion?target:shown+(target-shown)*(1-Math.exp(-dt/100));
  if(target===100&&shown>99.9)shown=100;
  const value=Math.floor(shown);
  if(number.textContent!==String(value)){
    number.textContent=String(value);progress.setAttribute('aria-valuenow',String(value));
  }
  if(shown===100){reachedHundred();return;}
  scheduleTick();
}
function scheduleTick(){
  // Hidden tabs can suspend animation frames; loading must still finish there.
  frameTimeout=setTimeout(()=>{cancelAnimationFrame(animation);tick(performance.now());},120);
  animation=requestAnimationFrame(time=>{clearTimeout(frameTimeout);tick(time);});
}
scheduleTick();

try{
  const {initializeDeck}=await import('./app.js');
  if(!document.querySelector('link[rel="stylesheet"]').sheet)throw new Error('No se pudo cargar el diseño de la portada.');
  report('modules',1);
  await initializeDeck(report);
  await hundred;
  clearTimeout(slowTimer);root.classList.remove('boot-slow');
  await delay(reducedMotion?0:160);
  root.classList.add('boot-revealing');
  await delay(reducedMotion?0:700);
  finished=true;
  loader.hidden=true;root.classList.remove('boot-loading','boot-revealing');
  main.inert=false;island.inert=false;main.removeAttribute('aria-busy');
  document.querySelector('#live-announcement').textContent='Experiencia lista. Agarrá una esponja para limpiar la portada.';
}catch(error){
  failed=true;cancelAnimationFrame(animation);clearTimeout(frameTimeout);clearTimeout(slowTimer);
  root.classList.add('boot-error');
  progress.setAttribute('aria-label','No se pudo completar la carga');
  console.warn('No se pudo preparar la experiencia.',error);
}
