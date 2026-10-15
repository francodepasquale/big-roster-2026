const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function random(seed=73){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

export class Foam {
  constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.bubbles=[];this.last=0;this.resize();}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(devicePixelRatio,1.7);this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
  emit(x,y,distance=12) {
    const count=Math.min(20,Math.max(5,Math.ceil(distance*.34)));
    for(let i=0;i<count;i++){
      if(this.bubbles.length>440)this.bubbles.shift();
      const a=Math.random()*Math.PI*2,r=Math.random()*44;
      this.bubbles.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,r:4+Math.random()*19,vx:(Math.random()-.5)*.8,vy:-.1-Math.random()*.7,born:performance.now(),age:0,life:850+Math.random()*950,pearl:Math.random()>.74});
    }
  }
  burst(x,y){for(let i=0;i<9;i++)this.emit(x+(Math.random()-.5)*200,y+(Math.random()-.5)*160,35);}
  frame(time){
    const dt=Math.min(40,time-(this.last||time));this.last=time;
    if(!this.bubbles.length)return;
    const c=this.ctx;c.clearRect(0,0,this.w,this.h);
    this.bubbles=this.bubbles.filter(b=>b.age<b.life);
    for(const b of this.bubbles){
      b.age=time-b.born;b.x+=b.vx*dt/16;b.y+=b.vy*dt/16;
      const life=b.age/b.life,alpha=clamp((1-life)*2,0,1);
      const r=b.r*(.8+Math.min(.2,life));
      c.globalAlpha=alpha;
      const g=c.createRadialGradient(b.x-r*.3,b.y-r*.4,r*.03,b.x,b.y,r);
      if(b.pearl){g.addColorStop(0,'rgba(255,255,255,.42)');g.addColorStop(.7,'rgba(235,232,255,.18)');g.addColorStop(.92,'rgba(255,255,255,.86)');g.addColorStop(1,'rgba(177,194,235,.32)');}
      else {g.addColorStop(0,'#fff');g.addColorStop(.65,'#fafdff');g.addColorStop(.9,'#e3e9f4');g.addColorStop(1,'rgba(205,216,232,.48)');}
      c.beginPath();c.arc(b.x,b.y,r,0,Math.PI*2);c.fillStyle=g;c.fill();
      c.beginPath();c.arc(b.x-r*.28,b.y-r*.32,r*.3,Math.PI*1.05,Math.PI*1.85);c.strokeStyle='rgba(255,255,255,.95)';c.lineWidth=1.4;c.stroke();
    }
    c.globalAlpha=1;
  }
}

export class DirtLayer {
  constructor(container,{target,kind='hero',completionThreshold=.71,onProgress=()=>{},onComplete=()=>{}}) {
    this.container=container;this.target=target;this.kind=kind;this.onProgress=onProgress;this.onComplete=onComplete;
    this.completionThreshold=completionThreshold;
    this.canvas=container.querySelector('.dirt-canvas');this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});
    this.mini=document.createElement('canvas');this.mini.width=120;this.mini.height=80;this.mc=this.mini.getContext('2d',{willReadFrequently:true});
    this.strokes=[];this.complete=false;this.lastSample=0;this.previous=null;this.baseline=1;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
  }
  resize(){
    const r=this.container.getBoundingClientRect();if(!r.width||!r.height)return;
    this.w=r.width;this.h=r.height;this.dpr=Math.min(devicePixelRatio,1.6);
    this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.draw();
    for(const s of this.strokes)this.erase(s.x*this.w,s.y*this.h,s.r*Math.min(this.w,this.h),null);
    if(this.complete)this.ctx.clearRect(0,0,this.w,this.h);
  }
  setScene(kind,target,state){
    this.kind=kind;this.target=target;this.strokes=state?.strokes?[...state.strokes]:[];this.complete=state?.complete||false;this.previous=null;
    this.canvas.style.opacity='1';this.canvas.style.transition='none';this.resize();
    this.sample(true);
  }
  getState(){return {strokes:[...this.strokes],complete:this.complete};}
  bounds(){const a=this.container.getBoundingClientRect(),b=this.target.getBoundingClientRect();return{x:b.left-a.left,y:b.top-a.top,w:b.width,h:b.height};}
  draw(){
    const c=this.ctx,b=this.bounds(),r=random(this.kind==='hero'?19:51);
    c.globalCompositeOperation='source-over';c.clearRect(0,0,this.w,this.h);
    c.save();
    if(this.kind==='cover'){
      // An opaque dirty surface: the title only appears where a sponge has passed.
      const base=c.createLinearGradient(0,0,this.w,this.h);
      base.addColorStop(0,'#c4b7a1');base.addColorStop(.46,'#b4a48c');base.addColorStop(1,'#c6b59a');
      c.fillStyle=base;c.fillRect(0,0,this.w,this.h);
      for(let i=0;i<38;i++){
        const x=r()*this.w,y=r()*this.h,rad=(.08+r()*.19)*this.w;
        const g=c.createRadialGradient(x,y,0,x,y,rad);
        g.addColorStop(0,`rgba(100,70,39,${.08+r()*.2})`);g.addColorStop(.65,'rgba(117,79,38,.06)');g.addColorStop(1,'rgba(130,91,49,0)');
        c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2);
      }
      // Broad, irregular chocolate/coffee stains and splashes, not a uniform overlay.
      for(const [cx,cy,scale]of [[.14,.30,.21],[.57,.65,.27],[.89,.48,.18]]){
        const x=this.w*cx,y=this.h*cy,s=Math.min(this.w,this.h)*scale;
        c.save();c.translate(x,y);c.rotate(r()*2);
        const g=c.createRadialGradient(-s*.28,-s*.18,0,0,0,s*1.4);
        g.addColorStop(0,'rgba(141,89,45,.82)');g.addColorStop(.6,'rgba(112,69,34,.91)');g.addColorStop(1,'rgba(92,56,28,.82)');
        c.fillStyle=g;c.beginPath();
        c.moveTo(-s*.98,-s*.08);c.bezierCurveTo(-s*1.25,-s*.75,-s*.5,-s*.6,-s*.2,-s*.68);
        c.bezierCurveTo(s*.2,-s*.94,s*.27,-s*.35,s*.72,-s*.32);c.bezierCurveTo(s*1.34,-s*.43,s*1.22,s*.16,s*.78,s*.32);
        c.bezierCurveTo(s*.95,s*.8,s*.3,s*.69,s*.04,s*.51);c.bezierCurveTo(-s*.2,s*.88,-s*.66,s*.5,-s*.58,s*.27);
        c.bezierCurveTo(-s*.87,s*.36,-s*1.23,s*.27,-s*.98,-s*.08);c.fill();
        c.beginPath();c.ellipse(-s*.3,-s*.28,s*.36,s*.09,-.28,0,Math.PI*2);c.fillStyle='rgba(237,188,126,.11)';c.fill();
        for(let j=0;j<15;j++){const a=r()*Math.PI*2,dist=s*(.7+r()*.75);c.beginPath();c.ellipse(Math.cos(a)*dist,Math.sin(a)*dist,s*(.012+r()*.045),s*(.015+r()*.04),r(),0,Math.PI*2);c.fillStyle=`rgba(107,65,29,${.3+r()*.5})`;c.fill();}
        c.restore();
      }
      for(const [cx,cy,size]of [[.4,.27,.085],[.78,.83,.11],[.09,.89,.07]]){
        const x=this.w*cx,y=this.h*cy,s=Math.min(this.w,this.h)*size;
        for(let j=0;j<4;j++){c.beginPath();c.ellipse(x+j*1.7,y+j*.9,s+j*1.5,s*.83+j,r()*.2,.12,Math.PI*1.97);c.strokeStyle=`rgba(99,61,30,${.13-j*.025})`;c.lineWidth=4+j*2;c.stroke();}
      }
      for(let i=0;i<13000;i++){
        c.fillStyle=r()>.45?`rgba(57,39,24,${.02+r()*.12})`:`rgba(255,239,209,${.03+r()*.09})`;
        c.fillRect(r()*this.w,r()*this.h,.5+r()*1.4,.5+r()*1.4);
      }
    }else if(this.kind==='hero'){
      // Organic coffee/grease marks, with translucent edges and tiny droplets.
      const stainWidth=Math.min(b.w,this.w<700?this.w*.79:b.w*.88);
      for(let i=0;i<20;i++){
        const x=b.x+stainWidth*(.1+r()*.8),y=b.y+b.h*(.3+r()*.4);
        const rad=Math.max(20,stainWidth*(.06+r()*.12));
        const grad=c.createRadialGradient(x,y,rad*.15,x,y,rad);
        grad.addColorStop(0,`rgba(112,72,30,${.2+r()*.25})`);grad.addColorStop(.75,'rgba(125,84,40,.24)');grad.addColorStop(1,'rgba(125,84,40,0)');
        c.fillStyle=grad;c.beginPath();c.ellipse(x,y,rad,rad*(.35+r()*.45),r()*.6,0,Math.PI*2);c.fill();
      }
      c.beginPath();c.ellipse(b.x+stainWidth*.7,b.y+b.h*.47,stainWidth*.14,stainWidth*.13,-.25,.15,Math.PI*1.93);c.lineWidth=6;c.strokeStyle='rgba(112,69,29,.43)';c.stroke();
    }else{
      c.beginPath();
      if(this.kind==='counter')c.roundRect(b.x+15,b.y+15,b.w-30,b.h-30,32);
      else c.ellipse(b.x+b.w/2,b.y+b.h/2,b.w*.39,b.h*.39,0,0,Math.PI*2);
      c.clip();
      for(let i=0;i<28;i++){
        const x=b.x+b.w*(.12+r()*.76),y=b.y+b.h*(.14+r()*.72),rad=12+r()*45;
        const g=c.createRadialGradient(x,y,rad*.22,x,y,rad);
        const color=this.kind==='sink'?'151,60,64':this.kind==='counter'?'119,66,27':'127,65,23';
        g.addColorStop(0,`rgba(${color},.87)`);g.addColorStop(.7,`rgba(${color},.73)`);g.addColorStop(1,`rgba(${color},.04)`);
        c.fillStyle=g;c.beginPath();c.ellipse(x,y,rad,rad*(.5+r()*.8),r()*3,0,Math.PI*2);c.fill();
      }
      // Rings and small droplets keep the mess recognisable as coffee / cooking / makeup.
      for(let i=0;i<5;i++){
        const x=b.x+b.w*(.26+r()*.48),y=b.y+b.h*(.25+r()*.5);
        c.beginPath();c.ellipse(x,y,22+r()*30,18+r()*22,r()*3,0,Math.PI*1.8);c.lineWidth=3+r()*7;c.strokeStyle='rgba(99,49,21,.45)';c.stroke();
      }
    }
    for(let i=0;i<(this.kind==='hero'?600:1200);i++){
      const x=b.x+r()*b.w,y=b.y+r()*b.h;
      if(this.kind==='hero' && (y<b.y+b.h*.25||y>b.y+b.h*.8))continue;
      c.fillStyle=`rgba(97,65,29,${.08+r()*.27})`;c.beginPath();c.arc(x,y,.3+r()*2,0,Math.PI*2);c.fill();
    }
    c.restore();this.baseline=this.alphaSum()||1;
  }
  alphaSum(){this.mc.clearRect(0,0,120,80);this.mc.drawImage(this.canvas,0,0,120,80);const d=this.mc.getImageData(0,0,120,80).data;let total=0;for(let i=3;i<d.length;i+=4)total+=d[i];return total;}
  erase(x,y,r,previous){
    const c=this.ctx;c.save();c.globalCompositeOperation='destination-out';
    const points=previous?Math.ceil(Math.hypot(x-previous.x,y-previous.y)/(r*.32)):1;
    for(let i=1;i<=points;i++){
      const px=previous?previous.x+(x-previous.x)*i/points:x,py=previous?previous.y+(y-previous.y)*i/points:y;
      const g=c.createRadialGradient(px,py,r*.68,px,py,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g;c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
    }
    c.restore();
  }
  scrub(x,y,r=58){
    if(this.complete)return;
    this.lastPoint={x,y};
    this.erase(x,y,r,this.previous);
    if(this.previous){
      const n=Math.ceil(Math.hypot(x-this.previous.x,y-this.previous.y)/(r*.35));
      for(let i=1;i<n;i++)this.strokes.push({x:(this.previous.x+(x-this.previous.x)*i/n)/this.w,y:(this.previous.y+(y-this.previous.y)*i/n)/this.h,r:r/Math.min(this.w,this.h)});
    }
    this.strokes.push({x:x/this.w,y:y/this.h,r:r/Math.min(this.w,this.h)});this.previous={x,y};
    const t=performance.now();if(t-this.lastSample>90){this.sample();this.lastSample=t;}
  }
  end(){this.previous=null;this.sample();}
  sample(force=false){
    const fraction=this.complete?1:clamp(1-this.alphaSum()/this.baseline,0,1);
    this.onProgress(Math.round(clamp(this.kind==='cover'?fraction/this.completionThreshold:fraction,0,1)*100));
    if(!this.complete&&fraction>this.completionThreshold&&!force)this.reveal();
  }
  reveal(){
    if(this.complete)return;this.complete=true;
    if(this.kind==='cover'){
      this.canvas.style.setProperty('--wash-x',`${(this.lastPoint?.x??this.w/2)/this.w*100}%`);
      this.canvas.style.setProperty('--wash-y',`${(this.lastPoint?.y??this.h/2)/this.h*100}%`);
      this.canvas.classList.add('rinsing');
      this.canvas.style.transition='opacity .3s .6s';
    }else this.canvas.style.transition='opacity .65s';
    this.canvas.style.opacity='0';
    this.onProgress(100);this.onComplete();
  }
  reset(){this.complete=false;this.strokes=[];this.previous=null;this.lastPoint=null;this.canvas.classList.remove('rinsing');this.canvas.style.transition='none';this.canvas.style.opacity='1';this.draw();this.onProgress(0);}
}

export function bindSpongeDrag({button,container,world,item,dirt,foam,onStart=()=>{}}){
  let held=false,pointerId=null,last=null,offset={x:0,y:0};
  const coords=e=>{const r=container.getBoundingClientRect();return{x:(e.clientX-r.left)*container.clientWidth/r.width,y:(e.clientY-r.top)*container.clientHeight/r.height};};
  const start=e=>{
    if(held||(e.button!==0&&e.pointerType==='mouse'))return;e.preventDefault();
    const p=coords(e),r=button.getBoundingClientRect();
    const center=world?{...item.current}:coords({clientX:r.left+r.width/2,clientY:r.top+r.height/2});
    offset={x:center.x-p.x,y:center.y-p.y};held=true;pointerId=e.pointerId;last=center;
    if(e.isTrusted)button.setPointerCapture(pointerId);
    button.setAttribute('aria-pressed','true');container.classList.add('is-scrubbing');
    world?.hold(item,center.x,center.y);onStart();foam.emit(center.x,center.y,20);
  };
  const move=e=>{
    if(!held||e.pointerId!==pointerId)return;e.preventDefault();const p=coords(e);
    const edge=world?item.home.size*.55:Math.min(button.offsetWidth,button.offsetHeight)*.28;
    p.x=clamp(p.x+offset.x,edge,container.clientWidth-edge);p.y=clamp(p.y+offset.y,edge,container.clientHeight-edge);
    const d=Math.hypot(p.x-last.x,p.y-last.y);
    world?.move(item,p.x,p.y);
    if(!world){button.style.left=`${p.x/container.clientWidth*100}%`;button.style.top=`${p.y/container.clientHeight*100}%`;}
    const radius=dirt.kind==='cover'?Math.min(dirt.w,dirt.h)*.135:(innerWidth<700?43:62);
    dirt.scrub(p.x,p.y,radius);if(d>2)foam.emit(p.x,p.y,d);last=p;
  };
  const end=e=>{
    if(!held|| (e&&e.pointerId!==pointerId))return;held=false;dirt.end();world?.release(item);
    button.setAttribute('aria-pressed','false');container.classList.remove('is-scrubbing');
    if(button.hasPointerCapture?.(pointerId))button.releasePointerCapture(pointerId);
    pointerId=null;
  };
  button.addEventListener('pointerdown',start);button.addEventListener('pointermove',move);
  button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);button.addEventListener('lostpointercapture',end);
  window.addEventListener('blur',()=>end());
  button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();dirt.reveal();const b=dirt.bounds();foam.burst(b.x+b.w/2,b.y+b.h/2);}});
  return {cancel:()=>end()};
}
