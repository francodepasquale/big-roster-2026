const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = {paused:reducedMotion.matches,storyProgress:0,openProgress:0,choiceProgress:0,canChoose:false,profile:null,selectorHover:null,suppressPickUntil:0};
const invalidate = () => document.dispatchEvent(new Event('lavazza:change'));
const opening=$('#inicio'),sticky=$('.opening-sticky'),chapters=$$('[data-chapter]'),islandLinks=$$('.island-menu-list a');
const headline=$('.opening-headline'),backtype=$('.opening-backtype'),question=$('.opening-question'),picks=$('.capsule-picks'),profilePanel=$('#profile-panel');
const clamp=value=>Math.min(1,Math.max(0,value));
const range=(value,start,end)=>clamp((value-start)/(end-start));
const ease=value=>value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;
let chapterPositions=[],openingTravel=1,stageHeight=innerHeight,currentChapter=-1,scrollFrame=0;
function setBoxProgress(progress){
  state.storyProgress=progress;
  state.openProgress=ease(range(progress,.04,.70));
  state.choiceProgress=ease(range(progress,.30,.78));
  const exit=ease(range(progress,.02,.49)),white=ease(range(progress,.23,.76));
  const enter=ease(range(progress,.48,.80));
  headline.style.transform=`translate3d(0,${-stageHeight*.7*exit}px,0)`;
  headline.style.opacity=String(1-exit);
  backtype.style.transform=`translate3d(-50%,${-stageHeight*.85*exit}px,0)`;
  backtype.style.opacity=String(.07*(1-exit));
  sticky.style.setProperty('--white-progress',String(white));
  sticky.style.setProperty('--choice-opacity',String(enter));
  sticky.style.setProperty('--choice-offset',`${(1-enter)*100}px`);
  sticky.style.color=`rgb(${[243,239,229].map((v,i)=>Math.round(v+([7,30,87][i]-v)*white)).join(' ')})`;
  const canChoose=progress>=.80;
  if(state.canChoose!==canChoose){
    state.canChoose=canChoose;picks.inert=!canChoose;
    picks.setAttribute('aria-hidden',String(!canChoose));question.setAttribute('aria-hidden',String(!canChoose));
    profilePanel.inert=!canChoose;
    sticky.classList.toggle('is-choosing',canChoose);
    if(!canChoose)state.selectorHover=null;
  }
  $('.box-fallback').style.setProperty('--open',String(state.openProgress));
  invalidate();
}
function updateScroll(){
  scrollFrame=0;
  setBoxProgress(Math.min(1,Math.max(0,(scrollY-opening.offsetTop)/openingTravel)));
  let active=0;
  chapterPositions.forEach((top,index)=>{if(top<=scrollY+innerHeight*.42)active=index;});
  if(active!==currentChapter){
    currentChapter=active;$('#island-label').textContent=chapters[active].dataset.chapter;
    islandLinks.forEach((link,index)=>index===active?link.setAttribute('aria-current','location'):link.removeAttribute('aria-current'));
  }
  const fraction=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);
  $('#island-progress').style.strokeDashoffset=String(62.832*(1-fraction));
}
function measure(){
  stageHeight=sticky.offsetHeight;openingTravel=Math.max(1,opening.offsetHeight-stageHeight);
  $('#perfiles').style.top=`${openingTravel*.86}px`;
  chapterPositions=chapters.map(section=>section.getBoundingClientRect().top+scrollY);
  updateScroll();
  document.dispatchEvent(new Event('lavazza:layout'));
}
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});
addEventListener('resize',measure,{passive:true});
document.addEventListener('lavazza:reflow',measure);
document.fonts.ready.then(measure);measure();

const profiles={
  enzo:{variety:'Intenso',title:'Una presencia <br>que se siente.',taste:'Intenso y cremoso.',name:'Enzo'},
  dante:{variety:'Dolce',title:'Una pausa <br>que te abraza.',taste:'Dulce y aromático.',name:'Dante'},
  rocco:{variety:'Rotondo',title:'Todo, en su <br>punto justo.',taste:'Equilibrado y aterciopelado.',name:'Rocco'}
};
function setProfile(id){
  const p=profiles[id];if(!p||!state.canChoose)return;
  state.profile=id;sticky.dataset.profile=id;sticky.classList.add('has-selection');
  $$('.capsule-pick').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.choice===id)));
  profilePanel.hidden=false;
  $('#profile-title').innerHTML=p.title;
  $('#profile-taste').textContent=p.taste;
  const characterLink=$('#profile-character-link');
  characterLink.href='#idea';characterLink.textContent=`De este sabor nace ${p.name} →`;
  if(!state.paused)profilePanel.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
  invalidate();
}
$$('.capsule-pick').forEach((button,index,all)=>{
  button.addEventListener('click',event=>{
    if(event.detail&&performance.now()<state.suppressPickUntil)return;
    setProfile(button.dataset.choice);
  });
  button.addEventListener('pointerenter',()=>{state.selectorHover=button.dataset.choice;invalidate();});
  button.addEventListener('pointerleave',()=>{state.selectorHover=null;invalidate();});
  button.addEventListener('focus',()=>{state.selectorHover=button.dataset.choice;invalidate();});
  button.addEventListener('blur',()=>{state.selectorHover=null;invalidate();});
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:-1)+3)%3;
    all[next].focus();
  });
});
$('#clear-choice').addEventListener('click',()=>{
  const selected=state.profile;state.profile=null;state.selectorHover=null;
  profilePanel.hidden=true;sticky.classList.remove('has-selection');delete sticky.dataset.profile;
  $$('.capsule-pick').forEach(button=>button.setAttribute('aria-pressed','false'));
  $(`[data-choice="${selected}"]`)?.focus({preventScroll:true});invalidate();
});

const island=$('#island'),trigger=$('#island-trigger'),menu=$('#island-menu'),backdrop=$('#island-backdrop');
function setIsland(open,restoreFocus=true){
  island.classList.toggle('expanded',open);trigger.setAttribute('aria-expanded',String(open));trigger.tabIndex=open?-1:0;
  menu.inert=!open;menu.setAttribute('aria-hidden',String(!open));backdrop.hidden=!open;
  if(open)$('#island-close').focus({preventScroll:true});else if(restoreFocus)trigger.focus({preventScroll:true});
}
trigger.addEventListener('click',()=>setIsland(true));
$('#island-close').addEventListener('click',()=>setIsland(false));
backdrop.addEventListener('click',()=>setIsland(false));
islandLinks.forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();setIsland(false,false);
  $(link.getAttribute('href')).scrollIntoView({behavior:state.paused?'instant':'smooth'});
  history.replaceState(null,'',link.getAttribute('href'));trigger.focus({preventScroll:true});
}));
document.addEventListener('keydown',event=>{
  if(!island.classList.contains('expanded'))return;
  if(event.key==='Escape'){event.preventDefault();setIsland(false);}
  if(event.key==='Tab'){
    const controls=[...menu.querySelectorAll('button,a')];
    if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  }
});
function updateMotion(){
  document.body.classList.toggle('motion-paused',state.paused);
  $('#motion-toggle').setAttribute('aria-pressed',String(state.paused));
  $('#motion-toggle').textContent=state.paused?'Activar movimiento':'Pausar movimiento';invalidate();
}
$('#motion-toggle').addEventListener('click',()=>{state.paused=!state.paused;updateMotion();});
reducedMotion.addEventListener('change',event=>{state.paused=event.matches;updateMotion();});updateMotion();
const sceneReady=import('./scene.js').then(module=>module.mountScenes(state)).catch(error=>{
  document.body.classList.add('no-webgl');console.warn('Se muestran los renders de respaldo.',error);
});
const storyReady=import('./story.js').then(module=>module.mountStory(state)).then(measure).catch(error=>console.warn('El texto se presenta sin animación.',error));
window.lavazzaLoading?.track('scene',sceneReady);
window.lavazzaLoading?.track('story',storyReady);
document.addEventListener('lavazza:ready',measure,{once:true});
window.lavazzaPresentation={state,measure,updateScroll,setProfile};
