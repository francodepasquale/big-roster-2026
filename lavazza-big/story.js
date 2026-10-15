// Lines rise behind masks; text opens a space for each editorial object.
// Measured only at setup/resize. Playback uses compositor transforms and opacity.
export async function mountStory(state){
  await document.fonts.ready;
  const records=[...document.querySelectorAll('[data-indent]')].map(element=>({element,source:element.querySelector('.statement-source'),played:false,animations:[]}));

  function build(record){
    const {element,source}=record;
    record.animations.forEach(animation=>animation.cancel());record.animations=[];
    element.querySelector('.statement-lines')?.remove();
    const measure=document.createElement('span');measure.className='statement-measure';measure.setAttribute('aria-hidden','true');
    const tokens=[];
    for(const node of source.childNodes){
      if(node.nodeType===Node.TEXT_NODE){
        for(const word of node.textContent.trim().split(/\s+/).filter(Boolean)){
          const token=document.createElement('span');token.className='statement-token';token.textContent=word;tokens.push(token);
        }
      }else if(node.matches?.('[data-story-object]')){
        const token=node.cloneNode(true);token.classList.add('statement-token');tokens.push(token);
      }
    }
    // Keep each inserted picture beside the word that introduces it, even on phones.
    for(let i=0;i<tokens.length;i++){
      if(i)measure.append(' ');
      const token=tokens[i],next=tokens[i+1];
      if(!token.dataset.storyObject&&next?.dataset.storyObject){
        const pair=document.createElement('span');pair.className='statement-keep';pair.append(token,' ',next);measure.append(pair);i++;
      }else measure.append(token);
    }
    element.append(measure);
    const origin=measure.getBoundingClientRect(),lines=[];let top=-Infinity;
    for(const token of tokens){
      const rect=token.getBoundingClientRect();
      if(Math.abs(rect.top-top)>2){lines.push([]);top=rect.top;}
      lines.at(-1).push({token,left:rect.left-origin.left,width:rect.width});
    }
    const visual=document.createElement('span');visual.className='statement-lines';visual.setAttribute('aria-hidden','true');
    for(const items of lines){
      const mask=document.createElement('span');mask.className='statement-mask';
      const line=document.createElement('span');line.className='statement-line';mask.append(line);visual.append(mask);
      let run=null,gap=0;
      items.forEach(({token,left,width},index)=>{
        if(token.dataset.storyObject){
          run=null;
          const object=token.cloneNode(true);object.classList.remove('statement-token');object.style.left=`${left}px`;line.append(object);
          // At first the next words sit in this gap; then slide right as the image appears.
          gap+=(items[index+1]?.left??left+width)-left;
        }else{
          if(!run){run=document.createElement('span');run.className='statement-run';run.style.left=`${left}px`;run.dataset.gap=String(gap);line.append(run);}
          run.textContent+=(run.textContent?' ':'')+token.textContent;
        }
      });
    }
    measure.remove();source.classList.add('sr-only');element.append(visual);element.classList.add('is-typeset');
    element.classList.toggle('has-revealed',record.played||state.paused);
  }
  function reveal(record){
    if(record.played)return;record.played=true;record.element.classList.add('has-revealed');
    if(state.paused)return;
    const options={duration:850,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'};
    let objectIndex=0;
    record.element.querySelectorAll('.statement-line').forEach((line,index)=>{
      const stagger=index*70;
      record.animations.push(line.animate([{transform:'translateY(112%)'},{transform:'translateY(0)'}],{...options,delay:stagger}));
      for(const run of line.querySelectorAll('.statement-run'))if(+run.dataset.gap){
        record.animations.push(run.animate([{transform:`translateX(-${run.dataset.gap}px)`},{transform:'translateX(0)'}],{...options,duration:900,delay:520+stagger}));
      }
      for(const image of line.querySelectorAll('.statement-object')){
        record.animations.push(image.animate([{opacity:0,transform:'scale(.8) rotate(-16deg)'},{opacity:1,transform:'scale(1) rotate(-8deg)'}],{...options,duration:650,delay:1050+objectIndex++*180}));
      }
    });
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){const record=records.find(r=>r.element===entry.target);reveal(record);observer.unobserve(entry.target);}
  },{threshold:.18,rootMargin:'0px 0px -8% 0px'});
  records.forEach(build);
  const observe=()=>records.forEach(record=>observer.observe(record.element));
  if(document.documentElement.classList.contains('is-loading'))document.addEventListener('lavazza:ready',observe,{once:true});else observe();
  let width=innerWidth,resizeTimer=0;
  addEventListener('resize',()=>{
    if(width===innerWidth)return;width=innerWidth;
    clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
      records.forEach(build);document.dispatchEvent(new Event('lavazza:reflow'));
    },120);
  },{passive:true});
  document.addEventListener('lavazza:change',()=>{
    if(state.paused)records.forEach(record=>{record.animations.forEach(animation=>animation.finish());record.element.classList.add('has-revealed');});
  });
}
