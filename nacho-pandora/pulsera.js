import*as e from"three";import{crearGeoCorazon as Ne,FORMA_BROCHE as qe,anchoEnAltura as ke}from"./corazon.js?v=20261125c";import{pintarBroche as Ue,sombraAro as We}from"./texturas.js?v=20261125c";import{crearCharms as Ze}from"./charms.js?v=20261125c";const U=3.12,V=2.68,oe=.15,he=new e.Color(.97,.965,.955),Te=(o,c,u)=>o<c?c:o>u?u:o,F=(o,c,u)=>{const l=Te((u-o)/(c-o),0,1);return l*l*(3-2*l)},Qe=o=>o<.5?4*o*o*o:1-Math.pow(-2*o+2,3)/2,Se=o=>1-Math.pow(1-o,3),_=4096,R=new Float64Array(_+1);{let o=0;R[0]=0;for(let c=1;c<=_;c++){const u=(c-.5)/_*Math.PI*2;o+=Math.hypot(U*Math.cos(u),V*Math.sin(u))*(Math.PI*2/_),R[c]=o}}const b=R[_];function W(o){o=(o%b+b)%b;let c=0,u=_;for(;u-c>1;){const M=c+u>>1;R[M]<=o?c=M:u=M}const l=(o-R[c])/(R[u]-R[c]);return(c+l)/_*Math.PI*2}const He={ancho:1.12,alto:1,grosor:.68},T=.58,Z=.46,ct=.232,Be=.24,Q={beta:.44,lift:.2,largoDoblez:3.6},Ke=`
uniform float uA;
uniform float uB;
uniform float uAbre;
uniform float uBeta;
uniform float uLift;
uniform float uPhi0;
uniform float uPhi1;
uniform vec2 uPiv;
vec3 curvaPulsera(float phi) {
  vec3 p = vec3(uA * sin(phi), 0.0, uB * cos(phi));
  float w = 1.0 - smoothstep(uPhi0, uPhi1, phi);
  float ang = uBeta * uAbre * w;
  vec2 d = p.xz - uPiv;
  float c = cos(ang), s = sin(ang);
  p.x = uPiv.x + d.x * c + d.y * s;
  p.z = uPiv.y - d.x * s + d.y * c;
  p.y += uLift * uAbre * w;
  return p;
}
void marcoPulsera(float phi, out vec3 C, out vec3 T, out vec3 N, out vec3 Bv) {
  C = curvaPulsera(phi);
  T = normalize(curvaPulsera(phi + 0.0015) - curvaPulsera(phi - 0.0015));
  N = normalize(cross(T, vec3(0.0, 1.0, 0.0)));
  Bv = cross(N, T);
}
`;function it({movil:o=!1,aniso:c=8}={}){const u=new e.Object3D;u.matrixAutoUpdate=!1;const l=new e.Object3D;u.add(l);const M=Ne({forma:qe,...He,nA:o?128:180,nR:o?22:30}),P=M.userData.forma,v=ke(P,0),g=v+.015,D=g+T/2,S=g+.3,ze=b-S,ne=[b/3,2*b/3],H=g+T,E=[b-(H+.64),b-(H+1.72),H+1.72,H+.64],re=g-.32,fe=W(S-.05),K=W(S+Q.largoDoblez),I=new e.Vector2(U*Math.sin(K),V*Math.cos(K)),se={uA:{value:U},uB:{value:V},uAbre:{value:0},uBeta:{value:Q.beta},uLift:{value:Q.lift},uPhi0:{value:fe},uPhi1:{value:K},uPiv:{value:I},uPaso:{value:.108},uEntradas:{value:5},uCurva:{value:.85},uRelieve:{value:.0125},uRadioC:{value:oe},uEscalaMundo:{value:1}},Je=new e.Vector3;function O(t,a,r=new e.Vector3){let n=U*Math.sin(t),s=V*Math.cos(t),i=0;if(a>0){const m=1-F(fe,K,t);if(m>0){const y=Q.beta*a*m,d=n-I.x,A=s-I.y,k=Math.cos(y),ae=Math.sin(y);n=I.x+d*k+A*ae,s=I.y-d*ae+A*k,i+=Q.lift*a*m}}return r.set(n,i,s)}const j=new e.Vector3,ce=new e.Vector3,_e=new e.Vector3(0,1,0);function B(t,a,r,n,s,i){const m=W(t);O(m,a,r),O(m+.0015,a,j),O(m-.0015,a,ce),n.subVectors(j,ce).normalize(),s.crossVectors(n,_e).normalize(),i.crossVectors(s,n)}const ie=new e.Matrix4;function X(t,a,r,n,s=1){s>0?ie.makeBasis(a,r,n):ie.makeBasis(j.copy(a).negate(),r,ce.copy(n).negate()),t.quaternion.setFromRotationMatrix(ie)}const L=new e.MeshStandardMaterial({color:he,metalness:1,roughness:.13}),me=new e.MeshStandardMaterial({color:1907999,metalness:.6,roughness:.6}),z=o?520:900,x=o?14:22,$=new Float32Array((z+1)*(x+1)*3),ve=new Float32Array((z+1)*(x+1)),we=new Float32Array((z+1)*(x+1)),Me=new Float32Array((z+1)*(x+1)),ge=[],p=new e.Vector3,w=new e.Vector3,h=new e.Vector3,f=new e.Vector3;for(let t=0;t<=z;t++){const a=S+(ze-S)*t/z,r=W(a);B(a,0,p,w,h,f);for(let n=0;n<=x;n++){const s=n/x*Math.PI*2,i=t*(x+1)+n,m=Math.cos(s),y=Math.sin(s);$[i*3]=p.x+oe*(m*h.x+y*f.x),$[i*3+1]=p.y+oe*(m*h.y+y*f.y),$[i*3+2]=p.z+oe*(m*h.z+y*f.z),ve[i]=r,we[i]=a,Me[i]=s}}for(let t=0;t<z;t++)for(let a=0;a<x;a++){const r=t*(x+1)+a,n=r+1,s=r+(x+1),i=s+1;ge.push(r,s,n,n,s,i)}const C=new e.BufferGeometry;C.setAttribute("position",new e.BufferAttribute($,3)),C.setAttribute("aPhi",new e.BufferAttribute(ve,1)),C.setAttribute("aS",new e.BufferAttribute(we,1)),C.setAttribute("aTh",new e.BufferAttribute(Me,1)),C.setIndex(ge),C.computeVertexNormals(),C.computeBoundingSphere(),C.boundingSphere.radius+=1.5;const J=new e.MeshStandardMaterial({color:he,metalness:1,roughness:.15});J.onBeforeCompile=t=>{Object.assign(t.uniforms,se),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
${Ke}
attribute float aPhi;
attribute float aS;
attribute float aTh;
uniform float uRadioC;
varying float vS;
varying float vTh;
varying vec3 vTanV;`).replace("#include <beginnormal_vertex>",`
vec3 cC, cT, cN, cB;
marcoPulsera(aPhi, cC, cT, cN, cB);
vec3 objectNormal = cos(aTh) * cN + sin(aTh) * cB;
vS = aS;
vTh = aTh;
vTanV = normalize((modelViewMatrix * vec4(cT, 0.0)).xyz);`).replace("#include <begin_vertex>","vec3 transformed = cC + uRadioC * objectNormal;"),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
uniform float uPaso;
uniform float uEntradas;
uniform float uCurva;
uniform float uRelieve;
uniform float uRadioC;
uniform float uEscalaMundo;
varying float vS;
varying float vTh;
varying vec3 vTanV;
// perfil de cada escama: placa convexa, apenas m\xE1s alta del lado de arriba de la ranura
float escama(float f) { return smoothstep(0.0, 0.2, f) * (1.0 - 0.45 * f) * (1.0 - smoothstep(0.94, 1.0, f)); }`).replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
// fase de las escamas: avanza con el largo (s), gira en h\xE9lice (entradas) y se curva en arco hacia el lado de afuera-arriba
float cadP = vS / uPaso + uEntradas * vTh / 6.2831853 + uCurva * cos(vTh - 0.8);
float cadF = fract(cadP);
float cadPix = length(fwidth(vViewPosition));
float cadDet = 1.0 - smoothstep(0.16, 0.42, cadPix / (uPaso * uEscalaMundo));`).replace("#include <color_fragment>",`#include <color_fragment>
float cadCav = mix(0.42, 1.0, smoothstep(0.0, 0.045, cadF) * (1.0 - smoothstep(0.97, 1.0, cadF)));
diffuseColor.rgb *= mix(0.965, cadCav, cadDet);`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor + 0.08, roughnessFactor, cadDet);`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
{
  vec3 Tn = normalize(vTanV - normal * dot(normal, vTanV));
  vec3 Th = cross(normal, Tn);
  float e = 0.015;
  float dh = (escama(clamp(cadF + e, 0.0, 1.0)) - escama(clamp(cadF - e, 0.0, 1.0))) / (2.0 * e);
  float dpdth = uEntradas / 6.2831853 - uCurva * sin(vTh - 0.8);
  vec3 gp = Tn / uPaso + Th * (dpdth / uRadioC);
  normal = normalize(normal - cadDet * uRelieve * dh * gp);
}`)},J.customProgramCacheKey=()=>"cadena-serpiente-v3";const ye=new e.Mesh(C,J);ye.frustumCulled=!1,l.add(ye);const Y=Ue(P,o?1024:2048);for(const t of Object.values(Y))t.anisotropy=c;const ue=new e.MeshStandardMaterial({color:he,metalness:1,roughness:1,map:Y.map,roughnessMap:Y.rugosidad,bumpMap:Y.relieve,bumpScale:1}),Pe=new e.Mesh(M,ue);Pe.position.set(0,0,V),l.add(Pe);const Re=new e.CylinderGeometry(.092,.092,.2,24).rotateZ(Math.PI/2);for(const t of[1,-1]){const a=new e.Mesh(Re,me);a.position.set(t*(v-.115),0,V),l.add(a)}const xe=new e.LatheGeometry(Xe(),o?28:40).rotateZ(-Math.PI/2),De=new e.LatheGeometry($e(),o?28:40).rotateZ(-Math.PI/2).translate(-Z/2,0,0),Fe=new e.CylinderGeometry(.1,.1,.26,20).rotateZ(Math.PI/2).translate(-.13,0,0),G=new e.Group;G.add(new e.Mesh(xe,L)),G.add(new e.Mesh(Fe,L));const ee=new e.Mesh(xe,L);l.add(G,ee);const Ee=ne.map(()=>{const t=new e.Mesh(De,L);return l.add(t),t}),N=Ze({movil:o,aniso:c});for(const t of N)t.grupo.visible=!1,l.add(t.grupo);const Ie=We(512,U/8.6,V/8.6,.05,10,[0,V/8.6]),te=new e.Mesh(new e.PlaneGeometry(8.6,8.6).rotateX(-Math.PI/2),new e.MeshBasicMaterial({color:3942954,alphaMap:Ie,transparent:!0,opacity:0,depthWrite:!1}));te.position.y=-.62,te.renderOrder=-10,l.add(te);const q=[];for(let t=0;t<64;t++){const a=t/64*Math.PI*2;O(a,0,p);const r=Math.sin(a),n=Math.cos(a);q.push(new e.Vector3(p.x+r*.2,.46,p.z+n*.2),new e.Vector3(p.x+r*.2,-.46,p.z+n*.2)),q.push(new e.Vector3(p.x-r*.18,0,p.z-n*.18))}for(const t of[-.56,.56])for(const a of[-.5,.5])for(const r of[V-.34,V+.34])q.push(new e.Vector3(t,a,r));const Oe=new e.Box3().setFromPoints(q).getCenter(new e.Vector3),et=new e.Quaternion;function je(t){B(b-D,0,p,w,h,f),ee.position.copy(p),X(ee,w,f,h,-1),ee.position.addScaledVector(j.copy(w),T/2),B(D,t,p,w,h,f),G.position.copy(p).addScaledVector(w,-T/2),X(G,w,f,h,1),Ee.forEach((a,r)=>{B(ne[r],t,p,w,h,f),a.position.copy(p),X(a,w,f,h,1)})}const Le=t=>{let a=0;for(const r of ne){const n=(t-r)/.62;Math.abs(n)<1&&(a+=(1-n*n)*(1-n*n))}return a},Ve=new e.Quaternion,tt=new e.Quaternion,at=new e.Euler;function be(t,a,r,n={}){const s=N[t];B(a,r,p,w,h,f);const i=n.salto||0;s.grupo.position.copy(p).addScaledVector(h,.18*i).addScaledVector(f,.3*i),X(s.grupo,w,f,h,1),Ve.setFromAxisAngle(j.set(1,0,0),(n.rueda||0)+s.inclinacion),s.grupo.quaternion.multiply(Ve)}let Ce=1;const le=[L,me,J,ue];for(const t of N)le.push(...t.materiales);return{raiz:u,giro:l,puntos:q,centro:Oe,sombra:te,largo:b,sCharms:E,curva:O,marco:B,vueltaCharm(t){const a=Math.max(1,Math.min(4,Math.round(t)))-1,r=W(E[a]),n=.22-Math.atan2(Math.sin(r),Math.cos(r));return Math.atan2(Math.sin(n),Math.cos(n))},actualizar({charms:t=0,escala:a=1,t:r=0}){se.uEscalaMundo.value=a,ue.bumpScale=.009*a;for(const d of N)d.actualizar&&d.actualizar({escala:a,t:r});const n=Te(t,0,4),s=Math.min(4,Math.floor(n+1e-6)),i=s>=4?0:n-s,m=i>1e-4,y=m?F(0,.15,i)*(1-F(.86,.99,i)):0;se.uAbre.value=y,je(y);for(let d=0;d<4;d++){const A=N[d];if(d<s)A.grupo.visible=!0,A.grupo.scale.setScalar(1),be(d,E[d],y);else if(d===s&&m){const k=F(.05,.3,i),ae=F(.28,.86,i),Ae=F(.02,.2,i);A.grupo.visible=Ae>.002,A.grupo.scale.setScalar(.35+.65*Se(Ae));const pe=re+(E[d]-re)*Qe(ae),Ge=(E[d]-pe)*.55;if(be(d,pe,y,{salto:Le(pe),rueda:Ge}),k<1){B(re,y,p,w,h,f);const de=1-Se(k);A.grupo.position.addScaledVector(w,-1.7*de).addScaledVector(h,.55*de).addScaledVector(f,.55*de)}}else A.grupo.visible=!1}},opacidad(t){if(!(Math.abs(t-Ce)<1e-4)){Ce=t;for(const a of le)a.userData.opacidadBase===void 0&&(a.userData.opacidadBase=a.opacity,a.userData.transparenteBase=a.transparent,a.userData.depthWriteBase=a.depthWrite),a.transparent=t<.999||a.userData.transparenteBase,a.opacity=a.userData.opacidadBase*t,a.depthWrite=a.userData.depthWriteBase}},materiales:le}}function Xe(){const o=[];o.push(new e.Vector2(0,0)),o.push(new e.Vector2(.15,0)),o.push(new e.Vector2(.195,.006)),o.push(new e.Vector2(.222,.03)),o.push(new e.Vector2(.232,.06));const c=.075,u=T-.035,l=5,M=(u-c)/l;for(let P=0;P<l;P++)for(let v=0;v<=12;v++){const g=v/12,D=.2+.032*Math.pow(Math.sin(Math.PI*g),.42);o.push(new e.Vector2(D,c+M*(P+g)))}return o.push(new e.Vector2(.2,T-.02)),o.push(new e.Vector2(.18,T-.004)),o.push(new e.Vector2(.152,T)),o.push(new e.Vector2(0,T)),o}function $e(){const o=[new e.Vector2(0,0),new e.Vector2(.158,0)],c=60;for(let u=0;u<=c;u++){const l=u/c,M=l*Z,P=Math.min(M,Z-M),v=.06;let g=P<v?Be-v+Math.sqrt(Math.max(0,v*v-(v-P)*(v-P))):Be;g=Math.max(.158,g);for(const D of[.3,.7]){const S=(l-D)/.05;Math.abs(S)<1&&(g-=.016*Math.cos(S*Math.PI/2)**2)}o.push(new e.Vector2(g,M))}return o.push(new e.Vector2(.158,Z),new e.Vector2(0,Z)),o}export{U as A,V as B,b as LARGO,oe as RC,it as crearPulsera,W as phiDeS};
