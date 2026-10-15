const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));

export function setupDeckNavigation({cover,dirt,reducedMotion}){
  const root=document.documentElement;
  const island=document.querySelector('#island');
  const toggle=document.querySelector('#island-toggle');
  const menu=document.querySelector('#island-menu');
  const close=document.querySelector('#island-close');
  const restart=document.querySelector('#restart-deck');
  const backdrop=document.querySelector('#island-backdrop');
  const main=document.querySelector('main');
  const links=[...document.querySelectorAll('.island-item')];
  const sections=links.map(link=>document.querySelector(link.hash));
  const progress=document.querySelector('#island-progress');
  const label=document.querySelector('#island-label');
  const parallax=[...document.querySelectorAll('[data-parallax]')];
  const coverSection=document.querySelector('#inicio');
  const circumference=2*Math.PI*9.5;
  let opened=false,framePending=false,unlockPromise=Promise.resolve(),revealTargets=[];

  root.classList.add('cover-locked');
  root.classList.add('cover-ready');
  history.scrollRestoration='manual';
  if(!location.hash||location.hash==='#inicio')window.scrollTo({top:0,behavior:'instant'});

  function completeCover(){
    document.querySelector('#skip-hero').tabIndex=-1;
    unlockPromise=new Promise(resolve=>setTimeout(()=>{
      root.classList.remove('cover-locked');
      update();resolve();
    },reducedMotion?0:900));
  }
  function openIsland(){
    opened=true;island.classList.add('expanded');backdrop.classList.add('show');
    toggle.setAttribute('aria-expanded','true');menu.inert=false;main.inert=true;
    root.classList.add('index-open');
    setTimeout(()=>{if(opened&&!menu.contains(document.activeElement))close.focus({preventScroll:true});},220);
  }
  function closeIsland({restoreFocus=true}={}){
    opened=false;island.classList.remove('expanded');backdrop.classList.remove('show');
    toggle.setAttribute('aria-expanded','false');menu.inert=true;main.inert=false;
    root.classList.remove('index-open');
    if(restoreFocus)requestAnimationFrame(()=>{if(!opened)toggle.focus({preventScroll:true});});
  }
  toggle.addEventListener('click',openIsland);
  close.addEventListener('click',()=>closeIsland());
  backdrop.addEventListener('click',()=>closeIsland());
  document.addEventListener('keydown',event=>{
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();closeIsland();}
    if(event.key==='Tab'){
      const focusables=[close,...links,restart],first=focusables[0],last=focusables.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });

  async function goTo(target,{focus=false,instant=false}={}){
    if(!target)return;
    if(opened)closeIsland({restoreFocus:false});
    if(target!==coverSection&&!dirt.complete)dirt.reveal();
    if(target!==coverSection)await unlockPromise;
    target.scrollIntoView({behavior:reducedMotion||instant?'instant':'smooth',block:'start'});
    history.replaceState(null,'',`${location.pathname}${location.search}#${target.id}`);
    if(focus){const heading=target.querySelector('h1,h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
    scheduleUpdate();
  }
  document.querySelectorAll('a[href^="#"]').forEach(link=>{
    const target=document.getElementById(link.hash.slice(1));
    if(!target)return;
    link.addEventListener('click',event=>{event.preventDefault();goTo(target,{focus:true});});
  });
  window.addEventListener('hashchange',()=>{
    const target=document.getElementById(location.hash.slice(1));
    if(target)goTo(target);
  });

  function update(){
    framePending=false;
    let active=0;
    sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=innerHeight*.42)active=index;});
    links.forEach((link,index)=>{if(index===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    label.textContent=links[active].textContent;
    const percentage=clamp(scrollY/Math.max(1,root.scrollHeight-innerHeight));
    progress.style.strokeDasharray=circumference;
    progress.style.strokeDashoffset=circumference*(1-percentage);
    // Reveal in the same scroll frame as the index; a fixed opening cover can delay
    // IntersectionObserver delivery when the document first becomes scrollable.
    if(!root.classList.contains('cover-locked'))revealTargets=revealTargets.filter(element=>{
      const b=element.getBoundingClientRect();
      if(b.top<innerHeight*.94&&b.bottom>0){element.classList.add('is-visible');return false;}
      return true;
    });
    if(!reducedMotion){
      const bounds=coverSection.getBoundingClientRect();
      const exit=clamp(-bounds.top/bounds.height);
      // The entire cleaned scene bends and recedes together as it leaves the viewport.
      cover.style.transform=`translate3d(0,${exit*40}px,0) scale(${1-exit*.06})`;
      cover.style.clipPath=exit>0?`inset(0 round ${exit*8}% ${exit*16}% ${exit*7}% ${exit*13}%)`:'none';
      for(const element of parallax){
        const b=element.parentElement.getBoundingClientRect();
        if(b.bottom<0||b.top>innerHeight)continue;
        const travel=clamp((innerHeight*.5-(b.top+b.height*.5))/innerHeight,-1,1);
        element.style.setProperty('--parallax',`${travel*Number(element.dataset.parallax)}px`);
      }
    }
  }
  function scheduleUpdate(){if(!framePending){framePending=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',scheduleUpdate,{passive:true});
  window.addEventListener('resize',scheduleUpdate,{passive:true});

  if(!reducedMotion){
    document.querySelectorAll('[data-reveal-title]').forEach(heading=>{
      const lines=heading.innerHTML.split(/<br\s*\/?\s*>/i);
      heading.replaceChildren(...lines.map((line,index)=>{
        const outer=document.createElement('span'),inner=document.createElement('span');
        outer.className='title-line';inner.className='title-line-inner';
        inner.style.setProperty('--line-delay',`${index*100}ms`);inner.textContent=line;
        outer.append(inner);return outer;
      }));
    });
    root.classList.add('motion-ready');
    revealTargets=[...document.querySelectorAll('[data-reveal],[data-reveal-title],.reel-stack')];
  }
  update();
  // Direct links are an explicit way to skip the opening interaction.
  if(location.hash&&location.hash!=='#inicio')queueMicrotask(()=>goTo(document.getElementById(location.hash.slice(1)),{instant:true}));
  return {completeCover,goTo,update:scheduleUpdate};
}
