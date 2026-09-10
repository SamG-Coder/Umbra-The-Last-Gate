import * as T from 'three';
const vs=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const extractFS=`uniform sampler2D source;varying vec2 vUv;void main(){vec3 c=texture2D(source,vUv).rgb;float b=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.85,1.65,b),1.);}`;
const blurFS=`uniform sampler2D source;uniform vec2 direction;varying vec2 vUv;void main(){vec3 c=texture2D(source,vUv).rgb*.227027;c+=texture2D(source,vUv+direction*1.384615).rgb*.316216;c+=texture2D(source,vUv-direction*1.384615).rgb*.316216;c+=texture2D(source,vUv+direction*3.230769).rgb*.070270;c+=texture2D(source,vUv-direction*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}`;
const finalFS=`uniform sampler2D source;uniform sampler2D bloom;uniform float bloomStrength;uniform float time;uniform float hurt;uniform float exposure;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
void main(){vec3 c=texture2D(source,vUv).rgb+texture2D(bloom,vUv).rgb*bloomStrength;c=srgb(aces(c*exposure));float vignette=(1.-smoothstep(.25,.88,length((vUv-.5)*vec2(1.0,.85))));c*=mix(.6,1.,vignette);c+=sin(dot(vUv,vec2(12.9898,78.233))+time*2.)*.0025;float red=(1.-vignette)*hurt;c=mix(c,vec3(.8,.025,.07),red*.6);gl_FragColor=vec4(c,1.);}`;
export class Renderer {
 constructor(canvas,settings){
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});const r=this.renderer;
  r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.12;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.info.autoReset=false;
  this.scene=new T.Scene();this.scene.background=new T.Color(0x09111f);this.scene.fog=new T.FogExp2(0x101b2b,.020);
  this.camera=new T.PerspectiveCamera(51,1,.1,180);this.camera.position.set(10,8,24);
  this.scene.add(new T.HemisphereLight(0x94b6dc,0x202039,1.55));this.scene.add(new T.AmbientLight(0x879abd,.20));
  this.sun=new T.DirectionalLight(0xc7dbff,2.6);this.sun.position.set(-13,25,12);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-23,right:23,top:24,bottom:-24,near:.5,far:65});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00018;this.sun.shadow.radius=2;this.scene.add(this.sun,this.sun.target);
  const rim=new T.DirectionalLight(0x6987ff,1.1);rim.position.set(7,8,-12);this.scene.add(rim);
  // Local, original environment capture: broad light panels create readable metal reflections.
  const env=new T.Scene();env.background=new T.Color(0x28364e);for(const [x,y,z,w,h,c,i]of [[-5,5,0,4,6,0x9baec8,2],[5,3,-2,3,8,0x517ad2,2],[0,7,1,8,3,0xb1c0d1,1.5],[0,1,6,7,2,0x4a4c69,1]]){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(i),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);env.add(p);}const pmrem=new T.PMREMGenerator(r);this.envTarget=pmrem.fromScene(env,.15,.1,100);this.scene.environment=this.envTarget.texture;pmrem.dispose();env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  const floating=r.extensions.has('EXT_color_buffer_float');const type=floating?T.HalfFloatType:T.UnsignedByteType;
  this.target=new T.WebGLRenderTarget(1,1,{type,depthBuffer:true});this.a=new T.WebGLRenderTarget(1,1,{type,depthBuffer:false});this.b=this.a.clone();
  this.postScene=new T.Scene();this.postCamera=new T.Camera();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),null);this.postScene.add(this.quad);
  const material=(fragmentShader,uniforms)=>new T.ShaderMaterial({vertexShader:vs,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped:false});
  this.extract=material(extractFS,{source:{value:null}});this.blur=material(blurFS,{source:{value:null},direction:{value:new T.Vector2()}});this.final=material(finalFS,{source:{value:this.target.texture},bloom:{value:this.a.texture},bloomStrength:{value:.45},time:{value:0},hurt:{value:0},exposure:{value:1.12}});
  this.setQuality(settings.quality);
 }
 setQuality(level){this.quality=level;this.post=level!=='low';const dpr=window.devicePixelRatio||1;this.ratio=Math.min(dpr,{low:1,medium:1.25,high:1.7,ultra:2}[level]||1.5);this.renderer.setPixelRatio(this.ratio);this.renderer.shadowMap.enabled=level!=='low';const res=level==='ultra'?4096:level==='medium'?1024:2048;this.sun.shadow.mapSize.set(res,res);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}const samples=level==='ultra'?4:level==='high'?2:0;if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}this.resize();}
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const rw=Math.max(1,Math.floor(w*this.ratio)),rh=Math.max(1,Math.floor(h*this.ratio));this.target.setSize(rw,rh);this.a.setSize(Math.max(1,Math.floor(rw/3)),Math.max(1,Math.floor(rh/3)));this.b.setSize(this.a.width,this.a.height);}
 pass(material,target){this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.postScene,this.postCamera);}
 render(time,hurt=0){const r=this.renderer;r.info.reset();if(!this.post){r.setRenderTarget(null);r.render(this.scene,this.camera);return;}
  r.setRenderTarget(this.target);r.render(this.scene,this.camera);this.extract.uniforms.source.value=this.target.texture;this.pass(this.extract,this.a);
  for(let i=0;i<(this.quality==='medium'?1:2);i++){const spread=i?2.2:1;this.blur.uniforms.source.value=this.a.texture;this.blur.uniforms.direction.value.set(spread/this.a.width,0);this.pass(this.blur,this.b);this.blur.uniforms.source.value=this.b.texture;this.blur.uniforms.direction.value.set(0,spread/this.a.height);this.pass(this.blur,this.a);}
  this.final.uniforms.time.value=time;this.final.uniforms.hurt.value=hurt;this.pass(this.final,null);
 }
 followLight(pos){this.sun.position.set(pos.x-13,25,pos.z+12);this.sun.target.position.set(pos.x,0,pos.z);this.sun.target.updateMatrixWorld();}
}
