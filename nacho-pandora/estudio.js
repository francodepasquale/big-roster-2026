import*as e from"three";import{RectAreaLightUniformsLib as b}from"./assets/vendor/addons/lights/RectAreaLightUniformsLib.js";const h=13,g=[[.08,.18,.2,.3,.05,.05,.07,.3],[.22,.8,.13,.26,.06,.06,.045,1.7],[.36,.1,.09,.22,.045,.08,.06,2.4],[.5,.92,.17,.2,.05,.04,.055,4.1],[.62,.2,.11,.24,.06,.07,.05,5.3],[.78,.08,.16,.28,.055,.05,.065,.9],[.93,.3,.21,.3,.05,.045,.04,3.3],[.88,.78,.14,.26,.06,.065,.05,2],[.7,.95,.1,.22,.045,.055,.075,6],[.04,.62,.12,.24,.055,.06,.05,4.6],[.3,.48,.07,.16,.04,.085,.065,1.1],[.97,.55,.09,.2,.04,.07,.06,3.8],[.15,.4,.06,.18,.035,.09,.08,5.7]],w=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,y=`
precision highp float;
uniform sampler2D tEscena;
uniform sampler2D tBrillo;
uniform float uBrilloFuerza;
uniform float uExposicion;
uniform float uTransparente;
uniform vec2 uRes;
uniform float uTiempo;
uniform vec3 uArriba;
uniform vec3 uAbajo;
uniform vec3 uTinte;
uniform float uFuerza;
uniform vec4 uD1[${h}];
uniform vec4 uD2[${h}];
varying vec2 vUv;

vec3 neutral(vec3 color) {
  const float INI = 0.8 - 0.04;
  const float DES = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= off;
  float pico = max(color.r, max(color.g, color.b));
  if (pico < INI) return color;
  float d = 1.0 - INI;
  float np = 1.0 - d * d / (pico + d - INI);
  color *= np / pico;
  float g = 1.0 - 1.0 / (DES * (pico - np) + 1.0);
  return mix(color, vec3(np), g);
}

vec3 aSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 fondo(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float m = min(asp, 1.0);
  vec2 q = (uv - 0.5) * vec2(asp, 1.0) / m;
  // degrad\xE9 de estudio
  float k = smoothstep(0.0, 1.0, uv.y);
  vec3 col = mix(uAbajo, uArriba, k * k * (3.0 - 2.0 * k));
  // tinte apenas perceptible abajo cuando hay ambiente
  col = mix(col, col * mix(vec3(1.0), uTinte * 0.55 + 0.45, 0.35), uFuerza * (1.0 - uv.y) * 0.45);
  // vi\xF1eteo suave hacia el rubor
  vec2 qv = (uv - 0.5) * vec2(asp, 1.0);
  float vig = smoothstep(0.42, 1.3, length(qv * vec2(0.85 / max(asp, 1.0) * 1.6, 1.15)));
  col *= 1.0 - vig * vec3(0.075, 0.095, 0.1);
  // bokeh: luces de fiesta fuera de foco
  float t = uTiempo;
  for (int i = 0; i < ${h}; i++) {
    vec4 a = uD1[i];
    vec4 b = uD2[i];
    vec2 c = vec2((a.x - 0.5) * asp, a.y - 0.5) / m;
    c += b.x * vec2(sin(t * b.y + b.w), cos(t * b.z + b.w * 1.7));
    float r = a.z;
    float d = length(q - c);
    float suave = r * 0.32;
    float disco = 1.0 - smoothstep(r - suave, r + suave * 0.35, d);
    float borde = smoothstep(r - suave * 1.4, r - suave * 0.15, d) * disco;
    float al = a.w * uFuerza * (0.86 + 0.14 * sin(t * 0.27 + b.w * 3.0));
    vec3 dc = mix(uTinte, vec3(1.0), 0.30 + 0.28 * fract(b.w * 1.37));
    col = mix(col, dc, clamp(al * (disco * 0.8 + borde * 0.38), 0.0, 1.0));
    col += al * disco * 0.025;
  }
  return clamp(col, 0.0, 0.985);
}

void main() {
  vec4 s = texture2D(tEscena, vUv);
  float a = clamp(s.a, 0.0, 1.0);
  vec3 obj = a > 1e-4 ? s.rgb / a : vec3(0.0);
  obj = neutral(max(obj, 0.0) * uExposicion);
  vec3 b = texture2D(tBrillo, vUv).rgb * uBrilloFuerza;
  vec3 brillo = 1.0 - exp(-b * uExposicion);
  float tramado = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  if (uTransparente > 0.5) {
    // alfa premultiplicado en sRGB (para exportar con fondo transparente)
    float ab = max(brillo.r, max(brillo.g, brillo.b));
    float aOut = clamp(a + ab * (1.0 - a), 0.0, 1.0);
    vec3 c = aSRGB(obj) * a + aSRGB(brillo) * (1.0 - a);
    gl_FragColor = vec4(c, aOut);
    return;
  }
  vec3 col = mix(fondo(vUv), obj, a);
  col = col + brillo * (1.0 - col);
  gl_FragColor = vec4(aSRGB(col) + tramado, 1.0);
}`;function S(u,i){const r=[],t=[];for(const[a,s,v,o,p,m,d,x]of g)r.push(new e.Vector4(a,s,v,o)),t.push(new e.Vector4(p,m,d,x));const c={tEscena:{value:null},tBrillo:{value:null},uBrilloFuerza:{value:1},uExposicion:{value:1},uTransparente:{value:0},uRes:{value:new e.Vector2(1,1)},uTiempo:{value:0},uArriba:{value:new e.Color("#FBF8F7")},uAbajo:{value:new e.Color("#F1E6E3")},uTinte:{value:new e.Color("#A64DFF")},uFuerza:{value:0},uD1:{value:r},uD2:{value:t}},l=new e.ShaderMaterial({vertexShader:w,fragmentShader:y,uniforms:c,depthTest:!1,depthWrite:!1});class n extends u{constructor(){super(),this.needsSwap=!1,this.fsQuad=new i(l),this.uniforms=c}render(s,v,o){c.tEscena.value=o.texture,s.setRenderTarget(this.renderToScreen?null:v),this.fsQuad.render(s)}dispose(){l.dispose(),this.fsQuad.dispose()}}return new n}function D(u,{suelo:i=[.3,.285,.28],horizonte:r=[.92,.9,.89],franja:t=0,banderas:c=!0}={}){const l=new e.Scene,n=new e.Mesh(new e.SphereGeometry(60,48,24),new e.ShaderMaterial({side:e.BackSide,depthWrite:!1,vertexShader:"varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:`varying vec3 vD; void main(){
        float y = vD.y;
        vec3 suelo = vec3(${i.map(o=>o.toFixed(3)).join(", ")});
        vec3 hor = vec3(${r.map(o=>o.toFixed(3)).join(", ")});
        vec3 cielo = vec3(1.25, 1.23, 1.22);
        vec3 c = y < 0.0 ? mix(hor, suelo, smoothstep(0.0, 0.35, -y)) : mix(hor, cielo, smoothstep(0.0, 0.7, y));
        // franja oscura apenas bajo el horizonte (el reflejo gris que recorre la plata en las fotos de producto)
        c *= 1.0 - ${t.toFixed(3)} * exp(-pow((y + 0.12) / 0.09, 2.0));
        gl_FragColor = vec4(c, 1.0); }`}));l.add(n);const a=(o,p,m,d,x=16777215)=>{const f=new e.Mesh(new e.PlaneGeometry(o,p),new e.MeshBasicMaterial({color:new e.Color(x).multiplyScalar(m),side:e.DoubleSide}));return f.position.set(...d),f.lookAt(0,0,0),l.add(f),f};a(16,16,3.6,[0,22,-2]),a(3.5,26,6,[-20,5,4]),a(3.5,26,4.5,[20,5,2]),a(26,12,2,[0,6,22]),a(20,3,3.2,[0,12,-20]),c&&(a(8,26,.035,[-15,0,15],1842204),a(8,26,.035,[15,0,15],1842204),a(30,4,.05,[0,-3,-22],2500134));const s=new e.PMREMGenerator(u),v=s.fromScene(l,.025,.1,120);return s.dispose(),l.traverse(o=>{o.isMesh&&(o.geometry.dispose(),o.material.dispose())}),v.texture}function A(u){b.init();const i=new e.RectAreaLight(16777215,0,26,60);i.position.set(-58,16,-112),i.lookAt(-6,0,-74);const r=new e.RectAreaLight(16777215,0,26,60);r.position.set(58,8,-108),r.lookAt(6,0,-74);const t=new e.RectAreaLight(16777215,0,70,14);t.position.set(0,52,-100),t.lookAt(0,0,-76),u.add(i,r,t);const c=new e.Color;return{actualizar(l,n){c.copy(l),i.color.copy(c),r.color.copy(c),t.color.copy(c),i.intensity=7*n,r.intensity=5.5*n,t.intensity=2.2*n}}}export{D as crearEntorno,A as crearLuces,S as crearPaseFinal};
