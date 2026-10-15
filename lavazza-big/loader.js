// Preload the presentation's image assets and wait for fonts, text and opening 3D.
// No artificial loading percentage: the animated number only follows settled work.
(()=>{
  const root=document.documentElement,overlay=document.querySelector('#page-loader');
  const number=document.querySelector('#load-number'),progress=document.querySelector('#load-progress'),bar=document.querySelector('#load-bar');
  const urls=[...new Set([...document.images].map(image=>image.currentSrc||image.src))];
  const tasks=new Map([...urls,'fonts','scene','story'].map(key=>[key,false]));
  const failures=[],history=[{percent:0,time:performance.now()}];
  let target=0,value=0,last=performance.now(),frame=0,closing=false,finished=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const regions=[...document.querySelectorAll('main,.island-wrap')];
  regions.forEach(element=>{element.inert=true;element.dataset.loadingInert='';});
  document.querySelector('main').setAttribute('aria-busy','true');

  function release(){
    if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(window.lavazzaLoadFallback);clearTimeout(timeout);
    root.classList.remove('is-loading','is-revealing');overlay.hidden=true;
    regions.forEach(element=>{element.inert=false;delete element.dataset.loadingInert;});
    document.querySelector('main').removeAttribute('aria-busy');
    document.dispatchEvent(new Event('lavazza:ready'));resolveReady();
  }
  function close(){
    if(closing)return;closing=true;
    // Let 100% register, then reveal the already rendered presentation.
    setTimeout(()=>{
      root.classList.add('is-revealing');overlay.classList.add('is-leaving');
      if(reduced)release();else{
        overlay.addEventListener('transitionend',release,{once:true});setTimeout(release,650);
      }
    },reduced?0:180);
  }
  function paint(now){
    frame=0;
    const dt=Math.max(0,now-last);last=now;
    value+= (target-value)*(1-Math.exp(-dt/105));
    if(target-value<.15)value=target;
    const percent=Math.floor(value);
    if(number.textContent!==String(percent)){
      number.textContent=String(percent);progress.setAttribute('aria-valuenow',String(percent));history.push({percent,time:now});
    }
    bar.style.transform=`scaleX(${value/100})`;
    if(percent===100)close();else if(value<target)frame=requestAnimationFrame(paint);
  }
  function settle(key,error){
    if(tasks.get(key)||finished)return;
    tasks.set(key,true);if(error)failures.push({key,message:String(error.message||error)});
    target=Math.floor([...tasks.values()].filter(Boolean).length/tasks.size*100);
    if(!frame){last=performance.now();frame=requestAnimationFrame(paint);}
  }
  function track(key,promise){
    Promise.resolve(promise).then(()=>settle(key),error=>settle(key,error));return promise;
  }
  // Resolve failed or unavailable resources too, so a fallback can always be shown.
  const timeout=setTimeout(()=>{
    for(const [key,done] of tasks)if(!done)settle(key,new Error('Tiempo de carga agotado'));
  },16000);
  window.lavazzaLoading={track,ready,tasks,failures,history,get percentage(){return Math.floor(value);},get finished(){return finished;}};
  for(const url of urls){
    track(url,new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>image.decode().then(resolve,reject);image.onerror=()=>reject(new Error('No se pudo cargar la imagen'));image.src=url;
    }));
  }
  track('fonts',Promise.all([document.fonts.load('550 24px Inter'),document.fonts.load('32px LavazzaIcons')]).then(()=>document.fonts.ready));
})();
