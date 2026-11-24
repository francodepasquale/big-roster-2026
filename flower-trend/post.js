import*as o from"three";import{EffectComposer as p}from"./assets/vendor/addons/postprocessing/EffectComposer.js";import{RenderPass as d}from"./assets/vendor/addons/postprocessing/RenderPass.js";import{UnrealBloomPass as x}from"./assets/vendor/addons/postprocessing/UnrealBloomPass.js";import{ShaderPass as S}from"./assets/vendor/addons/postprocessing/ShaderPass.js";import{OutputPass as h}from"./assets/vendor/addons/postprocessing/OutputPass.js";const g={uniforms:{tDiffuse:{value:null},uSat:{value:1},uContraste:{value:1},uVineta:{value:.2},uFlash:{value:0},uAberr:{value:0},uSplit:{value:1},uSombra:{value:new o.Vector3(.022,0,.05)},uLuz:{value:new o.Vector3(.05,.018,-.012)}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float uSat, uContraste, uVineta, uFlash, uAberr, uSplit;
    uniform vec3 uSombra, uLuz;
    varying vec2 vUv;
    void main(){
      vec2 c = vUv - .5;
      float d = length(c);
      vec2 off = c * uAberr * (.35 + d);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(.2126, .7152, .0722));
      col = mix(vec3(l), col, uSat);
      col = (col - .18) * uContraste + .18;
      col += uSombra * (1. - smoothstep(0., .32, l)) * uSplit + uLuz * smoothstep(.4, 1.3, l) * uSplit;
      col *= 1. - uVineta * smoothstep(.28, .95, d);
      col += uFlash * vec3(1., .9, .95);
      gl_FragColor = vec4(max(col, 0.), 1.);
    }`};export function crearPost(a,v,{movil:f=!1}={}){const t=a.getSize(new o.Vector2),i=a.getPixelRatio(),m=new o.WebGLRenderTarget(Math.max(1,t.x*i),Math.max(1,t.y*i),{type:o.HalfFloatType,samples:f?0:4}),e=new p(a,m);v.forEach(({escena:r,camara:s},u)=>{const l=new d(r,s);u>0&&(l.clear=!1,l.clearDepth=!0),e.addPass(l)});const c=new x(new o.Vector2(t.x,t.y),.6,.5,.85);e.addPass(c);const n=new S(g);return e.addPass(n),e.addPass(new h),{composer:e,bloom:c,uni:n.uniforms,medir(r,s,u){e.setPixelRatio(u),e.setSize(r,s)}}}
