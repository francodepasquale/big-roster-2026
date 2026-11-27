import*as e from"three";const R=`
varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,A=`
uniform sampler2D tEscena; uniform float uUmbral;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tEscena, vUv).rgb;
  float l = dot(c, vec3(.2126, .7152, .0722));
  float k = smoothstep(uUmbral, uUmbral + .6, l);
  gl_FragColor = vec4(c * k, 1.);
}`,C=`
uniform sampler2D tFuente; uniform vec2 uPaso;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tFuente, vUv).rgb * .227027;
  s += (texture2D(tFuente, vUv + uPaso * 1.384615).rgb + texture2D(tFuente, vUv - uPaso * 1.384615).rgb) * .316216;
  s += (texture2D(tFuente, vUv + uPaso * 3.230769).rgb + texture2D(tFuente, vUv - uPaso * 3.230769).rgb) * .070270;
  gl_FragColor = vec4(s, 1.);
}`,W=`
uniform sampler2D tEscena, tHalo1, tHalo2, tFondo, tAltura;
uniform float uFoco, uDesenfoque;
uniform vec2 uResolucion;
uniform float uSemilla, uGrano, uHalacion, uExposicion, uNegro, uTemperatura, uSaturacion, uVineta;
uniform float uRevelado, uFuga, uFugaAngulo, uDia;
uniform float uOficina, uPersiana;
varying vec2 vUv;

float hash(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float luma(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
// curva de pel\xEDcula: pie suave y hombro largo (luces que no se queman de golpe)
vec3 curva(vec3 x) {
  x = max(x, 0.);
  vec3 a = x * (x * 2.38 + .02);
  vec3 b = x * (x * 2.22 + .62) + .18;
  return clamp(a / b, 0., 1.);
}
vec3 aSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }

void main() {
  vec2 uv = vUv;
  vec3 c = texture2D(tEscena, uv).rgb;

  // profundidad de campo: lo que qued\xF3 abajo del objeto desprendido se ablanda (la interfaz no pasa por ac\xE1)
  if (uDesenfoque > .001) {
    float y = texture2D(tAltura, uv).r;
    float coc = uDesenfoque * smoothstep(.02, .16, uFoco - y);
    c = mix(c, texture2D(tFondo, uv).rgb, coc);
  }

  // halaci\xF3n: el brillo se derrama rojizo alrededor de las luces altas
  vec3 h = texture2D(tHalo1, uv).rgb * .6 + texture2D(tHalo2, uv).rgb * .9;
  c += h * vec3(1., .42, .2) * uHalacion;

  // temperatura del d\xEDa: < 0 fresco de ma\xF1ana, > 0 dorado de tarde (suave: el color lo da la luz, no un filtro)
  c *= mix(vec3(.98, 1., 1.03), vec3(1.05, .99, .93), clamp(uTemperatura * .5 + .5, 0., 1.));

  // exposici\xF3n y curva
  c = curva(c * uExposicion);
  // un poco m\xE1s de contraste en los medios
  c = mix(c, c * c * (3. - 2. * c), .2);

  // virado partido muy leve: sombras apenas fr\xEDas, luces tibias
  float l = luma(c);
  c = mix(c, c * vec3(.96, 1.0, 1.04), (1. - smoothstep(.05, .5, l)) * .5);
  c = mix(c, c * vec3(1.02, 1.0, .96), smoothstep(.5, 1., l) * .5);
  // saturaci\xF3n y vibrancia (sube m\xE1s lo que est\xE1 apagado)
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float s = uSaturacion * mix(1., 1.05, smoothstep(.1, .6, l)) + .28 * (1. - smoothstep(.0, .45, sat));
  c = mix(vec3(luma(c)), c, s);
  // negros apenas levantados
  c = c * (1. - uNegro) + uNegro * vec3(1., .95, .9);

  // revelado: la foto instant\xE1nea va de un gris verdoso plano a la imagen
  if (uRevelado < 1.) {
    float r = uRevelado;
    float lv = luma(c);
    vec3 verdoso = mix(vec3(.11, .14, .11), vec3(.55, .6, .5), smoothstep(.0, 1., lv));
    vec3 plano = vec3(.155, .185, .15);
    vec3 v1 = mix(plano, verdoso, smoothstep(.05, .5, r));
    c = mix(v1, c, smoothstep(.35, 1., r));
  }

  // modo oficina: luz de tubo fluorescente, fr\xEDa, plana y sin color
  if (uOficina > .001) {
    float lo = luma(c);
    vec3 tubo = mix(vec3(.5), vec3(lo), .78) * vec3(.94, .99, 1.05) * .93 + vec3(.0, .006, .014);
    c = mix(c, tubo, uOficina);
  }
  // las persianas: bandas de sombra suaves, en diagonal, como la luz que entra entre las tablillas. Al abrirse, la
  // sombra de cada tablilla se afina hasta desaparecer
  if (uPersiana > .001) {
    vec2 q = gl_FragCoord.xy / uResolucion.y;
    float d = dot(q, vec2(.21, .978)) * 13.;
    float banda = fract(d);
    float sombra = uPersiana * .6;
    float borde = .07;
    float k = smoothstep(sombra - borde, sombra + borde, banda) * (1. - smoothstep(1. - borde * .6, 1., banda));
    c *= mix(.56, 1., mix(1., k, smoothstep(0., .25, uPersiana)));
  }

  // vi\xF1eta suave, c\xE1lida
  vec2 p = (uv - .5) * vec2(uResolucion.x / uResolucion.y, 1.);
  float vin = smoothstep(.35, 1.25, length(p) * 1.12);
  c *= 1. - vin * uVineta * vec3(.92, 1., 1.08);

  // fuga de luz: un manch\xF3n naranja y rosado que entra por un borde (solo en las transiciones)
  if (uFuga > .001) {
    vec2 dir = vec2(cos(uFugaAngulo), sin(uFugaAngulo));
    float borde = dot(uv - .5, dir) + .5;
    float lat = dot(uv - .5, vec2(-dir.y, dir.x));
    float k = smoothstep(.25, 1.15, borde) * exp(-lat * lat * 3.2);
    vec3 fc = mix(vec3(1., .38, .16), vec3(1., .78, .42), smoothstep(.5, 1.1, borde));
    c = 1. - (1. - c) * (1. - fc * k * uFuga);
  }

  // grano: un azar nuevo por cuadro de pel\xEDcula, fijo a la grilla de la pantalla (no se desliza)
  vec2 px = floor(gl_FragCoord.xy);
  float g1 = hash(vec3(px, uSemilla)) - .5;
  float g2 = hash(vec3(floor(px * .5), uSemilla + 17.)) - .5;
  float g = g1 * .7 + g2 * .55;
  float lg = luma(c);
  float amp = uGrano * (.55 + 1.6 * lg * (1. - lg));
  c += g * amp * vec3(1., .97, .94);

  gl_FragColor = vec4(aSRGB(clamp(c, 0., 1.)), 1.);
}`;function _(r,{muestras:z=4}={}){const c=new e.WebGLRenderTarget(2,2,{type:e.HalfFloatType,samples:z,depthBuffer:!0}),s={type:e.HalfFloatType,depthBuffer:!1},f=new e.WebGLRenderTarget(2,2,s),l=new e.WebGLRenderTarget(2,2,s),p=new e.WebGLRenderTarget(2,2,s),x=new e.WebGLRenderTarget(2,2,s),U=new e.BufferGeometry;U.setAttribute("position",new e.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));const q=new e.OrthographicCamera(-1,1,1,-1,0,1),D=new e.Mesh(U);D.frustumCulled=!1;const E=new e.Scene;E.add(D);const h=new e.WebGLRenderTarget(2,2,{type:e.HalfFloatType,depthBuffer:!0}),i=new e.WebGLRenderTarget(2,2,s),v=new e.WebGLRenderTarget(2,2,s),H=new e.ShaderMaterial({vertexShader:`#include <common>
      varying float vY;
      void main() {
        #include <begin_vertex>
        #include <project_vertex>
        vec4 w = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          w = instanceMatrix * w;
        #endif
        vY = (modelMatrix * w).y;
      }`,fragmentShader:"varying float vY; void main() { gl_FragColor = vec4(vY, 0., 0., 1.); }",side:e.DoubleSide}),b=new e.ShaderMaterial({vertexShader:R,fragmentShader:"uniform sampler2D tFuente; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tFuente, vUv).rgb, 1.); }",uniforms:{tFuente:{value:null}},depthTest:!1,depthWrite:!1}),G=new e.ShaderMaterial({vertexShader:R,fragmentShader:A,uniforms:{tEscena:{value:c.texture},uUmbral:{value:1.05}},depthTest:!1,depthWrite:!1}),M=new e.ShaderMaterial({vertexShader:R,fragmentShader:C,uniforms:{tFuente:{value:null},uPaso:{value:new e.Vector2}},depthTest:!1,depthWrite:!1}),n={tEscena:{value:c.texture},tHalo1:{value:f.texture},tHalo2:{value:p.texture},uResolucion:{value:new e.Vector2(1,1)},uSemilla:{value:0},uGrano:{value:.034},uHalacion:{value:.3},uExposicion:{value:1.03},uNegro:{value:.014},uTemperatura:{value:0},uSaturacion:{value:1.16},uVineta:{value:.15},uRevelado:{value:1},uFuga:{value:0},uFugaAngulo:{value:0},uDia:{value:.5},tFondo:{value:v.texture},tAltura:{value:h.texture},uFoco:{value:0},uDesenfoque:{value:0},uOficina:{value:0},uPersiana:{value:0}},P=new e.ShaderMaterial({vertexShader:R,fragmentShader:W,uniforms:n,depthTest:!1,depthWrite:!1});function g(a,t){D.material=a,r.setRenderTarget(t),r.render(E,q)}function d(a,t,o,u){M.uniforms.tFuente.value=a.texture,M.uniforms.uPaso.value.set(o,u),g(M,t)}n.tHalo1.value=l.texture,n.tHalo2.value=x.texture;let F=2,S=2;return{objetivo:c,u:n,medir(a,t){F=a,S=t,c.setSize(a,t);const o=Math.max(2,a>>2),u=Math.max(2,t>>2),y=Math.max(2,a>>3),w=Math.max(2,t>>3);f.setSize(o,u),l.setSize(o,u),p.setSize(y,w),x.setSize(y,w),n.uResolucion.value.set(a,t);const m=Math.max(2,a>>1),T=Math.max(2,t>>1);h.setSize(m,T),i.setSize(m,T),v.setSize(m,T)},alturas(a,t){if(n.uDesenfoque.value<.001)return;const o=r.shadowMap.autoUpdate,u=a.background;r.shadowMap.autoUpdate=!1,a.overrideMaterial=H,a.background=new e.Color(-10,0,0),r.setRenderTarget(h),r.render(a,t),a.overrideMaterial=null,a.background=u,r.shadowMap.autoUpdate=o},componer(){const a=Math.max(2,F>>2),t=Math.max(2,S>>2),o=Math.max(2,F>>3),u=Math.max(2,S>>3);if(n.uDesenfoque.value>.001){const y=Math.max(2,F>>1),w=Math.max(2,S>>1);b.uniforms.tFuente.value=c.texture,g(b,i);for(const m of[1,2.2])d(i,v,m*1.9/y,0),d(v,i,0,m*1.9/w);b.uniforms.tFuente.value=i.texture,g(b,v)}g(G,l),d(l,f,1.2/a,0),d(f,l,0,1.2/t),d(l,p,1.6/o,0),d(p,x,0,1.6/u),g(P,null)},liberar(){[c,f,l,p,x,h,i,v].forEach(a=>a.dispose())}}}export{_ as crearPelicula};
