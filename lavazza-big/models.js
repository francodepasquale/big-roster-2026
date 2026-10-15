import * as THREE from 'three';

// Original capsule, foil, crimp, coffee bean and presentation-box geometry.
// Geometry and lid artworks are shared by every scene; each view has its own canvas.
export async function createModels() {
  const TAU=Math.PI*2,names=['enzo','dante','rocco'];
  const loader=new THREE.TextureLoader();
  const textures=await Promise.all(names.map(name=>loader.loadAsync(`assets/textures/${name}-lid.webp`)));
  textures.forEach(texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;});
  const materials={
    body:new THREE.MeshStandardMaterial({color:0x101115,roughness:.29,metalness:.32}),
    edge:new THREE.MeshStandardMaterial({color:0xd0d3d6,roughness:.23,metalness:.92}),
    bean:new THREE.MeshStandardMaterial({color:0x321709,roughness:.68,metalness:0}),
    seam:new THREE.MeshStandardMaterial({color:0x201009,roughness:.9}),
    navy:new THREE.MeshStandardMaterial({color:0x0c2561,roughness:.65,metalness:.08}),
    insert:new THREE.MeshStandardMaterial({color:0x07132b,roughness:.95}),
    ceramic:new THREE.MeshStandardMaterial({color:0xf1e8d3,roughness:.18,metalness:.08}),
    coffee:new THREE.MeshStandardMaterial({color:0x48200c,roughness:.17,metalness:.03}),
    crema:new THREE.MeshStandardMaterial({color:0xc48840,roughness:.42})
  };
  const lidMaterials=textures.map(map=>new THREE.MeshStandardMaterial({map,roughness:.53,metalness:.06}));
  const bodyGeometry=new THREE.LatheGeometry([
    new THREE.Vector2(0,-1.08),new THREE.Vector2(.72,-1.08),new THREE.Vector2(.8,-1.04),
    new THREE.Vector2(.87,-.91),new THREE.Vector2(1.045,-.08),new THREE.Vector2(1.07,-.025),new THREE.Vector2(1.12,-.015)
  ],96);
  bodyGeometry.rotateX(Math.PI/2);
  const rimGeometry=new THREE.TorusGeometry(1.15,.038,12,96);
  const lidGeometry=new THREE.CircleGeometry(1.16,96);
  const baseRingGeometry=new THREE.TorusGeometry(.79,.017,8,64);
  function capsule(index) {
    const group=new THREE.Group();
    const body=new THREE.Mesh(bodyGeometry,materials.body);group.add(body);
    const rim=new THREE.Mesh(rimGeometry,materials.edge);rim.position.z=.005;group.add(rim);
    const lid=new THREE.Mesh(lidGeometry,lidMaterials[index]);lid.position.z=.026;group.add(lid);
    const ring=new THREE.Mesh(baseRingGeometry,materials.body);ring.position.z=-1.055;group.add(ring);
    // Small repeated crimp marks make the thin metal lip catch the light.
    const crimpGeo=new THREE.BoxGeometry(.013,.05,.016);
    const crimps=new THREE.InstancedMesh(crimpGeo,materials.edge,84);
    const dummy=new THREE.Object3D();
    for(let i=0;i<84;i++){const a=i/84*TAU;dummy.position.set(Math.cos(a)*1.15,Math.sin(a)*1.15,.008);dummy.rotation.z=a-Math.PI/2;dummy.updateMatrix();crimps.setMatrixAt(i,dummy.matrix);}
    group.add(crimps);group.userData.lid=lid;
    group.userData.pickMeshes=[body,lid];
    group.userData.spin={target:0,angle:0};
    return group;
  }
  // A deformed bean with a recessed cleft, rather than an oval image on a plane.
  const beanGeometry=new THREE.SphereGeometry(1,32,24);
  const pos=beanGeometry.attributes.position;
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const bend=.07*Math.sin(y*3.4);
    const groove=z>0 ? .12*Math.exp(-Math.pow((x-bend)/.13,2))*Math.max(0,1-y*y) : 0;
    const noise=.008*Math.sin(x*45+y*31)*Math.sin(y*27+z*51);
    pos.setXYZ(i,x*.30+bend*.11,y*.46,(z*.22-groove)+noise);
  }
  beanGeometry.computeVertexNormals();
  const cleftCurve=new THREE.CatmullRomCurve3(Array.from({length:19},(_,i)=>{
    const y=-.37+i/18*.74;return new THREE.Vector3(.018*Math.sin(y*7),y,.12*Math.sqrt(Math.max(0,1-(y/.46)**2)));
  }));
  const cleftGeo=new THREE.TubeGeometry(cleftCurve,24,.009,5,false);
  function beans(scene,count,spread=4) {
    const bodies=new THREE.InstancedMesh(beanGeometry,materials.bean,count);
    const seams=new THREE.InstancedMesh(cleftGeo,materials.seam,count);
    bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    seams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bodies.frustumCulled=false;seams.frustumCulled=false;
    scene.add(bodies,seams);
    const items=Array.from({length:count},(_,i)=>{
      const angle=i*2.399963,radius=spread*(.65+(i%4)*.13);
      return {base:new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius*.74,(i%5-2)*.55),
        rotation:new THREE.Euler(Math.sin(i)*.65,Math.cos(i*1.4)*.7,i*.8),scale:.42+(i%6)*.10,phase:i*1.7};
    });
    return {bodies,seams,items,dummy:new THREE.Object3D()};
  }
  function labelTexture() {
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=750;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0b245d';ctx.fillRect(0,0,1536,750);
    ctx.strokeStyle='#7689b1';ctx.lineWidth=2;ctx.strokeRect(35,35,1466,680);
    ctx.fillStyle='#f3efe5';ctx.textAlign='center';
    ctx.font='72px LavazzaIcons';ctx.fillText('\ue900',768,190);
    ctx.font='600 136px Inter, sans-serif';ctx.fillText('CAFÉ CON',768,375);ctx.fillText('CARÁCTER.',768,510);
    ctx.font='22px Inter, sans-serif';ctx.fillText('INTENSO   /   DOLCE   /   ROTONDO',768,628);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
  }
  await document.fonts.ready;
  const boxLabel=labelTexture();
  const labelMaterial=new THREE.MeshStandardMaterial({map:boxLabel,roughness:.7,metalness:.02});
  const boxLabelPlane=new THREE.PlaneGeometry(7.55,3.55);
  const insideCanvas=document.createElement('canvas');insideCanvas.width=1200;insideCanvas.height=560;
  const insideCtx=insideCanvas.getContext('2d');
  insideCtx.fillStyle='#091d49';insideCtx.fillRect(0,0,1200,560);
  insideCtx.fillStyle='#f3efe5';insideCtx.textAlign='center';
  insideCtx.font='110px Georgia';insideCtx.fillText('Un caffè.',600,255);insideCtx.fillText('Tre caratteri.',600,375);
  insideCtx.font='18px Inter';insideCtx.fillText('LAVAZZA BLUE  /  CAFÉ CON CARÁCTER',600,455);
  const insideTexture=new THREE.CanvasTexture(insideCanvas);insideTexture.colorSpace=THREE.SRGBColorSpace;
  const insideMaterial=new THREE.MeshStandardMaterial({map:insideTexture,roughness:.8});

  // A molded insert with real openings and tapered wells, sized to the seated cups.
  const capsuleCenters=[-2.48,0,2.48],trayTop=-.12;
  const trayOutline=new THREE.Shape();
  trayOutline.moveTo(-3.77,-1.77);trayOutline.lineTo(3.77,-1.77);
  trayOutline.lineTo(3.77,1.77);trayOutline.lineTo(-3.77,1.77);trayOutline.closePath();
  capsuleCenters.forEach(x=>{
    const opening=new THREE.Path();opening.absarc(x,0,1.07,0,TAU,true);trayOutline.holes.push(opening);
  });
  const trayGeometry=new THREE.ShapeGeometry(trayOutline,48);
  // The profile runs into the well, so its normals face the cavity interior.
  const recessGeometry=new THREE.LatheGeometry([
    new THREE.Vector2(1.07,0),new THREE.Vector2(1.055,.014),new THREE.Vector2(1.035,.012),
    new THREE.Vector2(1.02,-.008),new THREE.Vector2(1.0,-.05),new THREE.Vector2(.96,-.14),
    new THREE.Vector2(.78,-.76),new THREE.Vector2(.74,-.86),new THREE.Vector2(.69,-.88),new THREE.Vector2(0,-.88)
  ],96);
  recessGeometry.rotateX(Math.PI/2);
  const recessPosition=recessGeometry.attributes.position,colors=[];
  const rimColor=new THREE.Color(0x25385e),wallColor=new THREE.Color(0x101a30),floorColor=new THREE.Color(0x02050d);
  const recessColor=new THREE.Color();
  for(let i=0;i<recessPosition.count;i++){
    const depth=THREE.MathUtils.clamp(-recessPosition.getZ(i)/.88,0,1);
    if(depth<.18)recessColor.copy(rimColor).lerp(wallColor,depth/.18);
    else recessColor.copy(wallColor).lerp(floorColor,(depth-.18)/.82);
    colors.push(recessColor.r,recessColor.g,recessColor.b);
  }
  recessGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const recessMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.02});

  function presentationBox(scene) {
    const root=new THREE.Group();scene.add(root);
    const bottom=new THREE.Mesh(new THREE.BoxGeometry(7.8,3.8,.22),materials.navy);bottom.position.z=-1.13;root.add(bottom);
    const insert=new THREE.Mesh(trayGeometry,materials.insert);insert.position.z=trayTop;root.add(insert);
    const recesses=new THREE.InstancedMesh(recessGeometry,recessMaterial,3),recessMatrix=new THREE.Matrix4();
    capsuleCenters.forEach((x,index)=>{recessMatrix.makeTranslation(x,0,trayTop);recesses.setMatrixAt(index,recessMatrix);});
    recesses.instanceMatrix.needsUpdate=true;root.add(recesses);
    [[0,1.84,7.8,.13],[0,-1.84,7.8,.13],[-3.84,0,.13,3.68],[3.84,0,.13,3.68]].forEach(([x,y,w,h])=>{const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,1.3),materials.navy);wall.position.set(x,y,-.56);root.add(wall);});
    const caps=names.map((_,i)=>{const c=capsule(i);c.scale.setScalar(.85);c.position.set(capsuleCenters[i],0,-.02);root.add(c);return c;});
    const hinge=new THREE.Group();hinge.position.set(0,1.9,.17);root.add(hinge);
    const cover=new THREE.Mesh(new THREE.BoxGeometry(7.8,3.8,.13),materials.navy);cover.position.y=-1.9;hinge.add(cover);
    const label=new THREE.Mesh(boxLabelPlane,labelMaterial);label.position.set(0,-1.9,.071);hinge.add(label);
    const inner=new THREE.Mesh(new THREE.PlaneGeometry(7.5,3.5),insideMaterial);inner.rotation.set(0,Math.PI,Math.PI);inner.position.set(0,-1.9,-.071);hinge.add(inner);
    root.rotation.set(-.48,-.08,-.06);root.position.y=-.05;
    return {root,hinge,caps,insert,recesses,open:0};
  }

  return {capsule,beans,presentationBox,names,lidMaterials};
}
