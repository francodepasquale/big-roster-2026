import * as THREE from 'three';
import {RoomEnvironment} from './assets/vendor/RoomEnvironment.js';
import {createModels} from './models.js';

const mix=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;

export async function mountScenes(state){
  if(new URLSearchParams(location.search).has('static')){document.body.classList.add('no-webgl');return;}
  const models=await createModels();
  const records=[...document.querySelectorAll('.scene-slot')].map(slot=>({
    slot,type:slot.dataset.scene,visible:false,ready:false,dead:false,width:0,height:0,documentTop:0,
    pointer:{x:0,y:0},px:0,py:0,caps:[],beans:null,frames:0
  }));
  const metrics={frames:0,drawCalls:0,triangles:0,activeScenes:0,fpsLimit:null};
  let raf=0,last=performance.now(),time=0,disposed=false;

  function positionOpeningBeans(r){
    const compact=innerWidth<=760;
    const sources=[[-3.3,-1.2],[-1.24,-1.1],[1.24,-1.1],[3.3,-1.2],[-1.24,1.1],[1.24,1.1]];
    const destinations=compact?[[-4,2.1,1],[-2.4,3.6,1.3],[1.8,3.8,1.1],[3.8,2.6,.8],[-3.2,-.8,1],[3.4,-.5,1.1]]:
      [[-.8,2.5,1],[.7,3.1,1.5],[2.4,2.7,1.2],[4.4,1.4,.8],[1.1,-1.7,1.2],[3.5,-2.2,1.1]];
    r.beans.items.forEach((bean,index)=>{
      bean.expanded??=new THREE.Vector3();
      if(index<24){
        const angle=index*2.399963,radius=Math.sqrt((index+.5)/24);
        const dx=Math.cos(angle)*radius*(compact?1.05:1.65),dy=Math.sin(angle)*radius*(compact?1:.78);
        bean.base.set((compact?-3.1:-4.8)+dx,(compact?-3.7:-2.35)+dy,(index%5-2)*.25);
        bean.expanded.set((compact?-2.8:-5.9)+dx*(compact?2.35:2.25),(compact?-.95:-3.25)+dy*1.1,.2+(index%4)*.18);
      }else if(index<32){
        const progress=(index-24)/7;
        bean.base.set(mix(compact?-1:-2,compact?3.6:4.8,progress),
          (compact?-3.2:-1.65)-Math.sin(progress*Math.PI)*.75+(index%2)*.25,(index%3-1)*.3);
        bean.expanded.set((compact?3.6:4.5)+Math.sin(progress*Math.PI)*.25,(compact?2.5:2.6)-progress*(compact?4.3:5.7),.25);
      }else{
        const order=index-32;
        bean.spawn??=new THREE.Vector3();bean.spawn.set(...sources[order],-.1);
        bean.base.copy(bean.spawn);bean.expanded.set(...destinations[order]);bean.order=order;
      }
    });
  }
  function resize(r){
    const rect=r.slot.getBoundingClientRect();r.width=rect.width;r.height=rect.height;r.documentTop=rect.top+scrollY;
    if(!r.ready||!r.width||!r.height)return;
    r.renderer.setSize(r.width,r.height,false);
    const aspect=r.width/r.height;
    const viewHeight=r.type==='character'?Math.max(3.4,3.4/aspect):r.type==='collection'?Math.max(10,10.4/aspect):r.type==='hero'?Math.max(8,7/aspect):Math.max(7.4,6.4/aspect);
    r.camera.aspect=aspect;r.camera.position.z=viewHeight/(2*Math.tan(THREE.MathUtils.degToRad(16)));r.camera.updateProjectionMatrix();
    if(r.type==='collection')positionOpeningBeans(r);
    render(r,0,true);wake();
  }
  function initialize(r){
    if(r.ready||r.dead)return;
    try{
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
      renderer.domElement.setAttribute('aria-hidden','true');r.slot.append(renderer.domElement);r.renderer=renderer;
      const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
      r.environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
      const scene=new THREE.Scene();scene.environment=r.environment.texture;scene.environmentIntensity=.7;
      const key=new THREE.DirectionalLight(0xfff7e6,1.6);key.position.set(-3,5,7);scene.add(key);
      const fill=new THREE.DirectionalLight(0xb8d5ff,.7);fill.position.set(5,0,3);scene.add(fill);
      scene.add(new THREE.AmbientLight(0xffffff,.5));
      r.scene=scene;r.camera=new THREE.PerspectiveCamera(32,1,.1,100);r.camera.position.z=14;
      if(r.type==='collection'){
        r.box=models.presentationBox(scene);r.beans=models.beans(scene,38,5.4);
        r.box.caps.forEach(c=>{c.userData.lift=0;});
        r.picks=[...r.slot.querySelectorAll('.capsule-pick')];
      }else if(r.type==='hero'){
        const placements=[[0,-.25,1.3,1.43,-.83,-.13,-.20],[-2.25,2,-.4,.82,-.82,.25,.24],[2.25,1.8,-1,.71,-.84,-.35,-.22]];
        placements.forEach(([x,y,z,s,rx,ry,rz],i)=>{
          const mesh=models.capsule(i);mesh.position.set(x,y,z);mesh.scale.setScalar(s);mesh.rotation.set(rx,ry,rz);scene.add(mesh);
          r.caps.push({mesh,base:mesh.position.clone(),rotation:mesh.rotation.clone()});
        });r.beans=models.beans(scene,36,3.6);
      }else if(r.type==='concept'){
        const mesh=models.capsule(1);mesh.scale.setScalar(1.6);mesh.rotation.set(-.62,-.15,.2);scene.add(mesh);r.caps=[{mesh}];r.beans=models.beans(scene,24,2.85);
      }else if(r.type==='character'){
        const mesh=models.capsule(models.names.indexOf(r.slot.dataset.character));mesh.rotation.set(-.8,-.12,.16);scene.add(mesh);r.caps=[{mesh}];
      }
      r.ready=true;
      attachCapsuleDrag(r);
      renderer.domElement.addEventListener('webglcontextlost',event=>{
        event.preventDefault();r.dead=true;r.ready=false;r.slot.classList.remove('scene-ready');renderer.domElement.hidden=true;
      });
      resize(r);
    }catch(error){
      r.dead=true;r.ready=false;r.slot.classList.remove('scene-ready');r.renderer?.domElement.remove();
      console.warn('Esta escena utiliza su render de respaldo.',error);
    }
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function attachCapsuleDrag(r){
    const capsules=r.box?r.box.caps:r.caps.map(c=>c.mesh);
    if(!capsules.length)return;
    r.slot.classList.add('is-grabbable');
    r.slot.addEventListener('pointerdown',event=>{
      if(event.button!==0||!r.ready||(r.box&&r.box.open<.65))return;
      const rect=r.slot.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      r.scene.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,r.camera);
      const hit=raycaster.intersectObjects(capsules.flatMap(c=>c.userData.pickMeshes),false)[0];
      if(!hit)return;
      const capsule=capsules.find(c=>c.userData.pickMeshes.includes(hit.object));
      const capture=event.target.closest('.capsule-pick')??r.slot;
      r.drag={capsule,x:event.clientX,y:event.clientY,start:capsule.userData.spin.target,id:event.pointerId,capture,moved:false};
      capture.setPointerCapture(event.pointerId);r.slot.classList.add('is-dragging');wake();
    });
    r.slot.addEventListener('pointermove',event=>{
      if(!r.drag||event.pointerId!==r.drag.id)return;
      r.drag.moved ||= Math.hypot(event.clientX-r.drag.x,event.clientY-r.drag.y)>6;
      if(r.drag.moved)r.drag.capsule.userData.spin.target=clamp(r.drag.start+(event.clientX-r.drag.x)*.0045,-.65,.65);wake();
    },{passive:true});
    const release=event=>{
      if(!r.drag||event.pointerId!==r.drag.id)return;
      const drag=r.drag;
      if(drag.moved&&r.type==='collection')state.suppressPickUntil=performance.now()+250;
      r.drag=null;r.slot.classList.remove('is-dragging');
      if(drag.capture.hasPointerCapture(event.pointerId))drag.capture.releasePointerCapture(event.pointerId);
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>r.slot.addEventListener(type,release));
  }
  function spin(c,smoothing){
    const rotation=c.userData.spin;rotation.angle=mix(rotation.angle,rotation.target,smoothing);return rotation.angle;
  }
  const projected=new THREE.Vector3();
  function placeChoices(r){
    if(!state.canChoose)return;
    r.box.root.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);
    r.box.caps.forEach((capsule,index)=>{
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const [x,y,z] of [[-1.23,0,0],[1.23,0,0],[0,1.23,0],[0,-1.23,-.35]]){
        projected.set(x,y,z).applyMatrix4(capsule.matrixWorld).project(r.camera);
        const px=(projected.x+1)*r.width/2,py=(1-projected.y)*r.height/2;
        left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
      }
      const button=r.picks[index];
      button.style.left=`${((left+right)/2).toFixed(2)}px`;button.style.top=`${((top+bottom)/2).toFixed(2)}px`;
      button.style.width=`${Math.max(48,right-left).toFixed(2)}px`;button.style.height=`${Math.max(48,bottom-top).toFixed(2)}px`;
    });
  }
  function render(r,dt,force=false){
    if(!r.ready||r.dead||(!r.visible&&!force))return;
    const drift=state.paused?0:1,smoothing=state.paused?1:1-Math.exp(-dt*12);
    r.px=mix(r.px,state.paused?0:r.pointer.x,smoothing);r.py=mix(r.py,state.paused?0:r.pointer.y,smoothing);
    const progress=r.type==='collection'?0:clamp((innerHeight/2-(r.documentTop-scrollY+r.height/2))/innerHeight,-1,1);
    if(r.type==='collection'){
      const box=r.box;
      box.open=state.openProgress;
      const boxViewHeight=Math.max(mix(7.6,10,box.open),10.4/r.camera.aspect);
      r.camera.position.z=boxViewHeight/(2*Math.tan(THREE.MathUtils.degToRad(16)));
      r.camera.position.x=innerWidth>760?mix(-1.1,-2.65,state.choiceProgress):0;r.camera.position.y=box.open*.9;
      box.hinge.rotation.x=-box.open*2.05;
      box.caps.forEach((c,i)=>{
        const id=models.names[i],chosen=state.profile===id&&state.canChoose,hovered=state.selectorHover===id&&state.canChoose;
        c.userData.lift=mix(c.userData.lift,chosen?.85:hovered?.4:0,smoothing);
        c.position.z=-.02+box.open*(1.4+(i===1?.25:0))+c.userData.lift;
        c.position.y=box.open*.1+Math.sin(time*.6+i*2)*.045*box.open*drift+c.userData.lift*.08;
        c.scale.setScalar(.85+c.userData.lift*.10);
        c.rotation.set(-.16*box.open+r.py*.06*box.open,((i-1)*.15)*box.open+r.px*.08*box.open+spin(c,smoothing),((i-1)*.1)*box.open);
      });
      box.root.rotation.set(-.48+r.py*.04,-.08+r.px*.08,-.06);
      box.root.position.y=-.05-box.open*.35;
      placeChoices(r);
    }else if(r.type==='hero'){
      r.caps.forEach(({mesh,base,rotation},i)=>{
        mesh.position.y=base.y+Math.sin(time*.6+i*2)*.16*drift-progress*.25*drift;
        mesh.rotation.set(rotation.x+Math.sin(time*.45+i)*.07*drift+r.py*.055,
          rotation.y+Math.sin(time*.35+i)*.14*drift+r.px*.11+spin(mesh,smoothing),rotation.z+Math.sin(time*.3+i)*.06*drift);
      });
    }else if(r.type==='concept'){
      const c=r.caps[0].mesh;c.rotation.set(-.8+progress*.3*drift+r.py*.08,
        -.15+progress*.7*drift+Math.sin(time*.4)*.12*drift+r.px*.17+spin(c,smoothing),.2+Math.sin(time*.3)*.1*drift);
      c.position.y=Math.sin(time*.5)*.13*drift;
    }else if(r.type==='character'){
      const c=r.caps[0].mesh;c.rotation.y=-.12+r.px*.3+spin(c,smoothing);c.rotation.x=-.8+r.py*.08;c.rotation.z=.16+Math.sin(time*.5)*.06*drift;
    }
    if(r.beans){
      const {items,dummy,bodies,seams}=r.beans;
      const spread=r.box?THREE.MathUtils.smoothstep(state.openProgress,.08,1):0;
      if(r.box)r.box.root.updateMatrixWorld(true);
      items.forEach((b,i)=>{
        let reveal=1,travel=0;
        if(b.spawn){
          travel=THREE.MathUtils.smoothstep(state.openProgress,.18+b.order*.055,.9+b.order*.015);
          reveal=THREE.MathUtils.smoothstep(travel,0,.18);
          dummy.position.copy(b.spawn).applyMatrix4(r.box.root.matrixWorld).lerp(b.expanded,travel);
          const arc=Math.sin(travel*Math.PI);
          dummy.position.y+=arc*.9;dummy.position.z+=arc*1.15;
        }else{
          dummy.position.copy(b.base);
          if(b.expanded)dummy.position.lerp(b.expanded,spread);
        }
        dummy.position.x+=Math.sin(time*.36+b.phase)*(.14+spread*.12)*drift+r.px*.08;
        dummy.position.y+=Math.cos(time*.42+b.phase)*(.18+spread*.12)*drift+progress*.3*drift;
        dummy.rotation.set(b.rotation.x+Math.sin(time*.25)*.45+r.py*.08+travel,
          b.rotation.y+Math.sin(time*.18)*.55+r.px*.12,b.rotation.z+time*.12+travel*2.4+spread*.35);
        dummy.scale.setScalar(b.scale*Math.max(.0001,reveal));dummy.updateMatrix();
        bodies.setMatrixAt(i,dummy.matrix);seams.setMatrixAt(i,dummy.matrix);
      });bodies.instanceMatrix.needsUpdate=true;seams.instanceMatrix.needsUpdate=true;
    }
    r.renderer.render(r.scene,r.camera);r.slot.classList.add('scene-ready');r.frames++;
    metrics.drawCalls+=r.renderer.info.render.calls;metrics.triangles+=r.renderer.info.render.triangles;
  }
  // Every visible scene renders on every browser animation frame. No FPS limiter.
  // Canvases belong to their sections, so native scrolling moves geometry and type together.
  function tick(now){
    raf=0;if(disposed||document.hidden)return;
    const dt=Math.min((now-last)/1000,.05);last=now;if(!state.paused)time+=dt;
    metrics.drawCalls=0;metrics.triangles=0;metrics.activeScenes=0;
    for(const r of records)if(r.visible&&r.ready&&!r.dead){render(r,dt);metrics.activeScenes++;}
    metrics.frames++;
    if(!state.paused&&metrics.activeScenes)raf=requestAnimationFrame(tick);
  }
  function wake(){
    if(!raf&&!disposed&&!document.hidden&&records.some(r=>r.visible&&r.ready&&!r.dead)){
      last=performance.now();raf=requestAnimationFrame(tick);
    }
  }
  const visibility=new IntersectionObserver(entries=>{
    for(const entry of entries){const r=records.find(r=>r.slot===entry.target);r.visible=entry.isIntersecting;if(r.visible)initialize(r);}
    wake();
  });
  const preload=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){const r=records.find(r=>r.slot===entry.target);initialize(r);preload.unobserve(entry.target);}
  },{rootMargin:'200px'});
  const resizes=new ResizeObserver(entries=>{for(const entry of entries)resize(records.find(r=>r.slot===entry.target));});
  records.forEach(r=>{
    visibility.observe(r.slot);preload.observe(r.slot);resizes.observe(r.slot);
    const hitArea=r.type==='character'?r.slot.closest('.character-visual'):r.slot;
    hitArea.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||state.paused)return;
      const rect=hitArea.getBoundingClientRect();
      r.pointer.x=clamp(((event.clientX-rect.left)/rect.width-.5)*2,-1,1);
      r.pointer.y=clamp(((event.clientY-rect.top)/rect.height-.5)*2,-1,1);wake();
    },{passive:true});
    hitArea.addEventListener('pointerleave',()=>{r.pointer.x=0;r.pointer.y=0;wake();});
  });
  document.addEventListener('lavazza:change',wake);
  document.addEventListener('lavazza:layout',()=>{
    records.forEach(r=>{r.documentTop=r.slot.getBoundingClientRect().top+scrollY;});wake();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});
  addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);});
  addEventListener('pageshow',()=>{disposed=false;wake();});
  // The loader waits for mountScenes, so render the visible stage before resolving.
  for(const record of records){
    const rect=record.slot.getBoundingClientRect();
    if(rect.top<innerHeight&&rect.bottom>0){record.visible=true;initialize(record);}
  }
  wake();
  window.lavazzaScene={records,state,metrics,ready:true};
}
