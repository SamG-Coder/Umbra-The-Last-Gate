import * as T from 'three';
import {ZONES,WALKABLE,CHESTS,TABLETS} from './data.js';
import {seeded} from './rules.js';
import {box,sphere,cyl,cone,ico,beam,mesh,standard,glow,ring,stoneTexture,batchStatic,emblemTexture,makeCharacter} from './models.js';
const vert=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const portalFrag=`uniform float time;uniform vec3 tint;varying vec2 vUv;float noise(vec2 p){return sin(p.x*14.+sin(p.y*13.))*sin(p.y*17.+cos(p.x*8.));}void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float w=sin(a*7.+time*1.7+r*14.)*.05;float edge=pow(max(0.,1.-abs(r-.86+w)*11.),2.);float cloud=(noise(p*2.+time*.07)*.5+.5)*pow(max(0.,1.-r),.65);float swirl=pow(max(0.,sin(a*3.-r*12.+time*1.4)),8.)*.16;float alpha=(1.-smoothstep(.77,1.,r))*(.35+cloud*.55)+edge;vec3 c=tint*(edge*3.8+cloud*.35+swirl)+vec3(.015,.01,.04);gl_FragColor=vec4(c,alpha);}`;
export class Dungeon {
 constructor(scene){this.scene=scene;this.obstacles=[];this.gates=[];this.portals=[];this.flames=[];this.chests=[];this.tablets=[];this.zones=[];this.lights=[];this.runes=[];this.rng=seeded(7321);this.build();}
 build(){
  const tex=stoneTexture(),tile=standard(0xbac2ca,.28,.62);tile.map=tex;tile.bumpMap=tex;tile.bumpScale=.055;tex.repeat.set(5,6);
  this.mat={stone:standard(0x4b5969,.27,.72),darkStone:standard(0x283444,.23,.75),black:standard(0x141e2b,.2,.68),trim:standard(0x8b897e,.65,.41),gold:standard(0xa08761,.77,.32),floor:tile,crystal:glow(0x4b94e8,2.6)};
  const m=this.mat;
  const floorBase=standard(0x192635,.35,.65);
  // The three halls are linked by real, walkable bridges over an abyss.
  for(const zone of ZONES){const group=new T.Group();this.scene.add(group);this.zones.push(group);const {x0,x1,z0,z1,z,accent}=zone;
   box(group,m.darkStone,0,-.44,z,x1-x0+2,.8,z1-z0+2);
   const floor=new T.Mesh(new T.PlaneGeometry(x1-x0,z1-z0),m.floor);floor.rotation.x=-Math.PI/2;floor.position.set(0,.012,(z0+z1)/2);floor.receiveShadow=true;group.add(floor);
   for(const side of [-1,1]){
    const x=side*(x1-.4);box(group,m.darkStone,x,.43,z,.75,.85,z1-z0);box(group,m.trim,x,.9,z,.9,.12,z1-z0);
    // Shallow, dark reflection pools run beside the central aisle.
    const water=new T.Mesh(new T.PlaneGeometry(2.6,z1-z0-3),new T.MeshStandardMaterial({color:0x0a1727,metalness:.82,roughness:.16}));water.rotation.x=-Math.PI/2;water.position.set(side*(x1-2.5),.045,z);group.add(water);
    for(let zz=z1-4;zz>z0+2;zz-=8){this.column(group,side*(x1-3.8),zz,7.8,accent);this.torch(group,side*(x1-5.2),zz,zone.id===2?0xff715b:zone.id===1?0xb891ff:0x61caff);}
   }
   for(let zz=z1-4;zz>z0+2;zz-=8){this.arch(group,0,zz,x1-3.8,4.7,5.6);}
   // Brass inlay, recessed channels and ceremonial floor circles.
   for(const side of [-1,1]){box(group,m.trim,side*3.6,.031,z,.025,.02,z1-z0);box(group,m.darkStone,side*3.75,.032,z,.1,.025,z1-z0);}
   const runeGroup=new T.Group();runeGroup.position.set(0,.033,z-3);group.add(runeGroup);ring(runeGroup,zone.id===2?8:5,accent,.025,.025);ring(runeGroup,zone.id===2?7.6:4.65,accent,.026,.012);
   const et=emblemTexture();const sigil=new T.Mesh(new T.PlaneGeometry(8.2,8.2),new T.MeshBasicMaterial({map:et,color:accent,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}));sigil.rotation.x=-Math.PI/2;sigil.position.set(0,.04,z-3);group.add(sigil);this.runes.push(sigil);
   for(let i=0;i<22;i++){const side=i%2?1:-1;const rx=side*(x1-1-this.rng()*2.8),rz=z0+2+this.rng()*(z1-z0-4),s=.1+this.rng()*.32;ico(group,m.stone,rx,s*.42,rz,s*1.7,s*.65,s);}
   // Gothic end wall is broken around a visible exit, rather than occluding the camera.
   if(zone.id<2){for(const side of [-1,1]){box(group,m.darkStone,side*(4.5+(x1-4.5)/2),2,z0-.1,x1-4.5,4,.9);box(group,m.trim,side*(4.5+(x1-4.5)/2),4.1,z0-.1,x1-4.5,.16,1.03);}this.door(group,zone);}
   const point=new T.PointLight(accent,zone.id===2?60:48,26,2);point.position.set(0,7,z-4);this.scene.add(point);this.lights.push(point);
   batchStatic(group);
  }
  for(const z of [-22,-66]){
   const bridge=new T.Group();this.scene.add(bridge);box(bridge,m.stone,0,-.34,z,9.6,.66,14);box(bridge,m.floor,0,-.015,z,9.1,.03,14);
   for(const side of [-1,1]){box(bridge,m.darkStone,side*4.55,.4,z,.24,.8,14);box(bridge,m.trim,side*4.55,.87,z,.37,.12,14);for(let zz=z-6;zz<=z+6;zz+=3){cyl(bridge,m.darkStone,side*4.55,.63,zz,.25,1.3);ico(bridge,m.crystal,side*4.55,1.5,zz,.12,.24,.12);}}
   batchStatic(bridge);
  }
  // Arrival gate, altar and the giant effigy overlooking the final chamber.
  this.makePortal(0,14.5,0x4e93ff,2.4,'arrival');
  const altar=new T.Group();this.scene.add(altar);altar.position.set(-5,0,11);cyl(altar,m.black,0,.12,0,1.05,.25);cyl(altar,m.stone,0,.55,0,.68,.8);cyl(altar,m.trim,0,.99,0,.79,.12);const crystal=ico(altar,m.crystal,0,1.6,0,.21,.52,.21);this.altarCrystal=crystal;ring(altar,1.2,0x85bcff,.035,.02);this.shrine={x:-5,z:11};
  for(const def of CHESTS)this.makeChest(def);
  for(const def of TABLETS)this.makeTablet(def);
  const throne=new T.Group();this.scene.add(throne);throne.position.z=-105;
  for(let i=0;i<4;i++)box(throne,m.darkStone,0,.10+i*.14,i*.2,10-i*1.2,.21,5-i*.45);
  box(throne,m.black,0,2.4,-1.1,4.8,4.4,1.5);box(throne,m.trim,0,4.65,-1.1,4.9,.16,1.7);
  for(const x of [-2,2]){box(throne,m.darkStone,x,1.9,.2,.8,3.4,2.4);cone(throne,m.trim,x,4.3,-1,.3,2.2);}
  const statue=makeCharacter('boss');statue.root.position.set(0,.7,-107.2);statue.root.scale.setScalar(3.8);statue.mats.armor.color.setHex(0x283443);statue.mats.trim.color.setHex(0x535663);statue.mats.edge.emissive.setHex(0xeb333e);statue.mats.edge.emissiveIntensity=2;this.scene.add(statue.root);this.statue=statue;
  // Seated pose. The actual boss is a separate combatant in front of the throne.
  statue.joints.lleg.rotation.x=-1.2;statue.joints.rleg.rotation.x=-1.2;statue.joints.lknee.rotation.x=1.15;statue.joints.rknee.rotation.x=1.15;statue.joints.larm.rotation.x=-.5;statue.joints.rarm.rotation.x=-.5;
  this.makePortal(0,-108,0xa561ff,6,'throne');
  batchStatic(throne);
  const endLight=new T.PointLight(0xeb4962,90,22,2);endLight.position.set(0,7,-103);this.scene.add(endLight);this.lights.push(endLight);
  this.makeDust();
  // Six real lights; the rest are immutable source definitions. Keeping all torches
  // as PointLights would inflate every material's fragment shader, even at intensity 0.
  this.lightSources = this.lights.map(l=>({position:l.position.clone(), color:l.color.clone(), intensity:l.intensity, distance:l.distance}));
  for(const l of this.lights)this.scene.remove(l);
  this.lights = Array.from({length:6},()=>{const l=new T.PointLight(0xffffff,0,25,2);this.scene.add(l);return l;});
 }
 column(g,x,z,h,accent){const m=this.mat;box(g,m.darkStone,x,.16,z,1.55,.32,1.55);box(g,m.trim,x,.35,z,1.33,.13,1.33);cyl(g,m.stone,x,h*.5,z,.48,h-.6);for(let i=0;i<6;i++){const a=i*Math.PI/3;cyl(g,m.darkStone,x+Math.sin(a)*.45,h*.5,z+Math.cos(a)*.45,.1,h-.7);}for(const y of [.58,h-1,h-.6])cyl(g,m.trim,x,y,z,.57,.1);box(g,m.darkStone,x,h-.2,z,1.3,.35,1.3);const runeMat=glow(accent,1.6);box(g,runeMat,x,2,z+.488,.035,1.15,.018);this.obstacles.push({x,z,r:.83});}
 arch(g,x,z,halfWidth,spring,height){const m=this.mat;for(const side of [-1,1]){let prev=[x+side*halfWidth,spring,z];for(let i=1;i<=12;i++){const t=i/12*Math.PI*.5;const p=[x+side*Math.cos(t)*halfWidth,spring+Math.sin(t)*height,z];beam(g,prev,p,.19,m.stone);beam(g,[prev[0],prev[1]+.14,z+.17],[p[0],p[1]+.14,z+.17],.043,m.trim);prev=p;}}ico(g,m.trim,x,spring+height,z,.26,.4,.3);}
 door(g,zone){const z=zone.gate,m=this.mat;for(const side of [-1,1]){box(g,m.stone,side*4.5,2.6,z,.95,5.2,1.1);cyl(g,m.trim,side*4.5,2.6,z+.59,.11,5.2);}this.arch(g,0,z,4.5,3.5,3.5);
  const barrier=new T.Group();barrier.position.z=z;this.scene.add(barrier);for(let i=-4;i<=4;i++){const mat=glow(zone.accent,1.6);box(barrier,mat,i,.9+Math.abs(i)*.13,0,.035,2.2+Math.abs(i)*.22,.035);}
  const plane=new T.Mesh(new T.PlaneGeometry(8.5,4),new T.MeshBasicMaterial({color:zone.accent,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide}));plane.position.y=2;barrier.add(plane);
  this.gates.push({zone:zone.id,z,x0:-4.8,x1:4.8,open:false,group:barrier,fade:1});
 }
 torch(g,x,z,color){const m=this.mat;cyl(g,m.black,x,.58,z,.14,1.1);cyl(g,m.trim,x,.11,z,.38,.14);const bowl=cone(g,m.trim,x,1.12,z,.33,.25);bowl.rotation.x=Math.PI;
  const flame=new T.Group();flame.position.set(x,1.32,z);const mat=glow(color,3.4);ico(flame,mat,0,.12,0,.11,.35,.11);ico(flame,mat,.06,.1,.03,.055,.22,.07);g.add(flame);flame.traverse(o=>{o.userData.dynamic=true;o.castShadow=false;});this.flames.push(flame);
  const l=new T.PointLight(color,6.5,7,2);l.position.set(x,1.75,z);this.scene.add(l);this.lights.push(l);
 }
 makePortal(x,z,color,size,kind){const group=new T.Group();group.position.set(x,size*.92,z);this.scene.add(group);const mat=new T.ShaderMaterial({uniforms:{time:{value:0},tint:{value:new T.Color(color)}},vertexShader:vert,fragmentShader:portalFrag,transparent:true,side:T.DoubleSide,depthWrite:false});const plane=new T.Mesh(new T.PlaneGeometry(size*2,size*2),mat);group.add(plane);const tor=new T.Mesh(new T.TorusGeometry(size*.87,.1,8,96),this.mat.darkStone);group.add(tor);const rim=new T.Mesh(new T.TorusGeometry(size*.86,.025,6,96),glow(color,3));rim.position.z=.07;group.add(rim);for(let i=0;i<12;i++){const a=i*Math.PI/6;const shard=ico(group,this.mat.stone,Math.sin(a)*size,Math.cos(a)*size,0,.11,.26,.16);shard.rotation.z=-a;}this.portals.push({group,mat,kind});return group;}
 makeChest(def){const m=this.mat,g=new T.Group();g.position.set(def.x,0,def.z);g.rotation.y=def.x<0?.5:-.5;this.scene.add(g);box(g,m.black,0,.34,0,1.08,.56,.7);for(const x of [-.42,.42])box(g,m.trim,x,.37,0,.08,.6,.74);box(g,m.gold,0,.4,.375,.13,.18,.06);
  const lid=new T.Group();lid.position.set(0,.6,-.35);g.add(lid);box(lid,m.darkStone,0,.08,.35,1.1,.16,.74);for(const x of [-.42,.42])box(lid,m.trim,x,.13,.35,.08,.1,.75);const gl=glow(0xf5c77e,1.5);box(g,gl,0,.61,.355,.86,.016,.024);ring(g,.92,0xd9b87a,.045,.013);this.chests.push({...def,group:g,lid,open:false,anim:0});this.obstacles.push({x:def.x,z:def.z,r:.56});}
 makeTablet(def){const g=new T.Group(),m=this.mat;g.position.set(def.x,0,def.z);this.scene.add(g);box(g,m.darkStone,0,.13,0,.98,.25,.8);const slab=box(g,m.stone,0,.85,0,.64,1.35,.25);slab.rotation.x=-.13;for(let i=0;i<5;i++)box(g,glow(0x83d5de,.75),(i%2)*.04,1.25-i*.15,.16,.36-(i%3)*.055,.015,.016);this.tablets.push({...def,group:g});this.obstacles.push({x:def.x,z:def.z,r:.45});}
 makeDust(){const n=650,p=new Float32Array(n*3),sizes=new Float32Array(n);for(let i=0;i<n;i++){p[i*3]=(this.rng()-.5)*36;p[i*3+1]=this.rng()*10;p[i*3+2]=18-this.rng()*131;sizes[i]=this.rng();}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));this.dust=new T.Points(g,new T.PointsMaterial({color:0x7cabc8,size:.04,transparent:true,opacity:.5,depthWrite:false,sizeAttenuation:true,blending:T.AdditiveBlending}));this.scene.add(this.dust);this.dustBase=p.slice();}
 reset(profile){for(const gate of this.gates){gate.open=gate.zone<profile.checkpoint || profile.cleared.includes(gate.zone);gate.fade=gate.open?0:1;gate.group.visible=!gate.open;}for(const c of this.chests){c.open=profile.opened.includes(c.id);c.anim=c.open?1:0;c.lid.rotation.x=-c.anim*1.7;}}
 tick(t,dt,player){
  for(const p of this.portals){p.mat.uniforms.time.value=t;p.group.rotation.z=Math.sin(t*.2)*.018;}
  this.altarCrystal.position.y=1.6+Math.sin(t*2)*.13;this.altarCrystal.rotation.y=t*.5;
  for(let i=0;i<this.flames.length;i++){const f=this.flames[i];f.scale.setScalar(.87+Math.sin(t*8+i*5)*.12);f.rotation.y=t*2+i;}
  for(const gate of this.gates){gate.fade=Math.max(0,gate.fade-(gate.open?dt*1.8:0));gate.group.scale.y=Math.max(.001,gate.fade);gate.group.visible=gate.fade>0;}
  for(const c of this.chests){c.anim=Math.min(1,c.anim+(c.open?dt*2:0));c.lid.rotation.x=-Math.sin(c.anim*Math.PI/2)*1.7;}
  const p=this.dust.geometry.attributes.position;for(let i=0;i<p.count;i++){p.array[i*3]=this.dustBase[i*3]+Math.sin(t*.13+i)*.3;p.array[i*3+1]=(this.dustBase[i*3+1]+t*.085)%10;}p.needsUpdate=true;
  const nearest=this.lightSources.slice().sort((a,b)=>Math.hypot(a.position.x-player.x,a.position.z-player.z)-Math.hypot(b.position.x-player.x,b.position.z-player.z));
  for(let i=0;i<this.lights.length;i++){const l=this.lights[i],s=nearest[i];l.position.copy(s.position);l.color.copy(s.color);l.intensity=s.intensity;l.distance=s.distance;}
 }
 openGate(index){const gate=this.gates[index];if(gate)gate.open=true;}
}
export {WALKABLE};
