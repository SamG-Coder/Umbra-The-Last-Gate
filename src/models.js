import * as T from 'three';
import {seeded,lerp,clamp} from './rules.js';
const G = {
 box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,12,8),ico:new T.IcosahedronGeometry(1,0),
 cylinder:new T.CylinderGeometry(1,1,1,12),cone:new T.ConeGeometry(1,1,8),torus:new T.TorusGeometry(1,.035,5,64)
};
export function mesh(geometry,material,parent,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
export const box=(p,m,x,y,z,sx,sy,sz)=>mesh(G.box,m,p,x,y,z,sx,sy,sz);
export const sphere=(p,m,x,y,z,sx,sy=sx,sz=sx)=>mesh(G.sphere,m,p,x,y,z,sx,sy,sz);
export const cyl=(p,m,x,y,z,r,h)=>mesh(G.cylinder,m,p,x,y,z,r,h,r);
export const cone=(p,m,x,y,z,r,h)=>mesh(G.cone,m,p,x,y,z,r,h,r);
export const ico=(p,m,x,y,z,sx,sy=sx,sz=sx)=>mesh(G.ico,m,p,x,y,z,sx,sy,sz);
export function standard(color,metalness=.15,roughness=.65){return new T.MeshStandardMaterial({color,metalness,roughness});}
export function glow(color,intensity=2){return new T.MeshStandardMaterial({color:0x151e2c,emissive:color,emissiveIntensity:intensity,roughness:.35,metalness:.5});}
export function ring(parent,r,color=0x66baff,y=.025,width=.025){const m=new T.Mesh(new T.RingGeometry(r-width,r+width,96),new T.MeshBasicMaterial({color,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=y;parent.add(m);return m;}
export function beam(parent,a,b,r,mat){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);const m=cyl(parent,mat,...av.clone().add(bv).multiplyScalar(.5).toArray(),r,delta.length());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function shapeMesh(points,depth,mat,parent,bevel=.025){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel});g.translate(0,0,-depth/2);return mesh(g,mat,parent);}
export function sword(parent,body,edge,big=false){const g=new T.Group();parent.add(g);const len=big?1.72:1.12,w=big?.16:.085;
 const blade=shapeMesh([[-w,.13],[-w,len*.78],[0,len],[w,len*.8],[w,.13]],.045,body,g,.012);
 shapeMesh([[-.012,.17],[-.011,len*.82],[0,len*.96],[.011,len*.82],[.012,.17]],.007,edge,g,.002).position.z=.043;
 box(g,body,0,.1,0,w*3.9,.085,.115);box(g,edge,0,.1,.062,w*2,.021,.007);
 cyl(g,body,0,-.08,0,.048,.26);ico(g,edge,0,-.22,0,.068,.05,.058);
 return g;
}
export function makeCharacter(kind='player',isShadow=false){
 const root=new T.Group(),rig=new T.Group();root.add(rig);const player=kind==='player',boss=kind==='boss',mage=kind==='mage',hound=kind==='hound';
 const tint=isShadow?0x6779ff:player?0x7d9bff:boss?0xf14762:mage?0xca77ff:kind==='brute'?0xf6a669:0x79cbea;
 const mats={armor:standard(isShadow?0x151b39:player?0x182539:0x263140,.63,.34),trim:standard(player?0x688394:0x819099,.78,.27),dark:standard(0x080e19,.05,.88),cloth:standard(isShadow?0x171133:player?0x152337:0x202133,.08,.93),skin:standard(0xc2a6a3,.04,.7),edge:glow(tint,isShadow?2.6:2.1)};
 const joints={},cape=[];
 if(hound){
  sphere(rig,mats.armor,0,.78,0,.48,.44,.82);sphere(rig,mats.dark,0,.75,.65,.32,.33,.42);ico(rig,mats.armor,0,.94,.9,.3,.3,.34);cone(rig,mats.dark,-.24,1.23,.57,.115,.37).rotation.z=.3;cone(rig,mats.dark,.24,1.23,.57,.115,.37).rotation.z=-.3;
  for(const x of [-1,1]){box(rig,mats.edge,x*.185,1,.95,.085,.05,.04);cone(rig,mats.trim,x*.14,.66,1,.055,.22).rotation.x=Math.PI;}
  for(let i=0;i<5;i++)cone(rig,i%2?mats.edge:mats.armor,0,1.18,-.55+i*.24,.17,.38+i*.025).rotation.x=-.3;
  for(let i=0;i<4;i++){const leg=new T.Group();leg.position.set(i%2===0?-.36:.36,.72,i<2?.5:-.5);rig.add(leg);cyl(leg,mats.dark,0,-.21,0,.11,.45);sphere(leg,mats.armor,0,-.2,0,.14,.19,.15);box(leg,mats.trim,0,-.61,.11,.2,.12,.35);joints['leg'+i]=leg;}
  beam(rig,[0,.95,-.65],[0,1.15,-1.4],.07,mats.armor);
 }else{
  // Tapered body and overlapping plate shapes establish a readable silhouette at gameplay distance.
  const chest=shapeMesh([[-.25,.04],[-.34,.43],[-.29,.62],[.29,.62],[.34,.43],[.25,.04]],.3,mats.armor,rig,.055);chest.position.y=.94;
  shapeMesh([[-.21,.09],[0,-.035],[.21,.09],[.18,.36],[0,.47],[-.18,.36]],.035,mats.trim,rig,.009).position.set(0,1.08,.235);
  shapeMesh([[-.018,0],[0,-.08],[.018,0],[.015,.36],[0,.4],[-.015,.36]],.025,mats.edge,rig,.003).position.set(0,1.16,.262);
  for(let i=0;i<3;i++)box(rig,mats.dark,0,1.02+i*.08,.02,.51-i*.025,.05,.4);
  box(rig,mats.trim,0,.99,.238,.12,.1,.06);sphere(rig,mats.dark,0,1.64,0,.12,.13,.12);
  const head=new T.Group();head.position.y=1.84;rig.add(head);joints.head=head;
  if(player){
   sphere(head,mats.skin,0,0,.015,.17,.225,.16);sphere(head,mats.dark,0,.11,-.025,.19,.18,.175);
   for(let i=0;i<8;i++){const hair=cone(head,mats.dark,-.16+i*.044,.15,.13,.072,.22+(i%3)*.035);hair.rotation.z=-.5+i*.12;hair.rotation.x=.7;}
   for(const x of [-1,1]){box(head,mats.edge,x*.073,.005,.165,.06,.02,.01);box(rig,mats.dark,x*.19,1.58,-.01,.16,.22,.3).rotation.z=x*.28;}
  }else{
   ico(head,mats.armor,0,0,0,.225,.28,.215);box(head,mats.dark,0,-.015,.189,.32,.12,.06);box(head,mats.edge,0,.012,.223,.28,.035,.022);shapeMesh([[-.08,.09],[0,-.2],[.08,.09]],.07,mats.trim,head,.009).position.set(0,-.03,.205);
   for(const x of [-1,1]){const horn=cone(head,boss?mats.trim:mats.armor,x*.24,.21,0,.085,boss?.58:.3);horn.rotation.z=-x*.35;}
  }
  if(boss){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;cone(head,i%2?mats.trim:mats.edge,Math.sin(a)*.19,.35,Math.cos(a)*.19,.037,.28+(i%2)*.16);}cyl(head,mats.trim,0,.23,0,.225,.08);}
  for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.16,.96,0);rig.add(leg);sphere(leg,mats.dark,0,-.24,0,.145,.3,.145);const knee=new T.Group();knee.position.y=-.46;leg.add(knee);sphere(knee,mats.armor,0,0,.04,.16,.13,.18);box(knee,mats.armor,0,-.22,.025,.225,.36,.245);box(knee,mats.dark,0,-.39,.1,.23,.16,.43);box(knee,mats.trim,0,-.35,.29,.23,.085,.07);joints[side===1?'rleg':'lleg']=leg;joints[side===1?'rknee':'lknee']=knee;
   const arm=new T.Group();arm.position.set(side*.42,1.48,0);rig.add(arm);ico(arm,mats.armor,0,.02,0,.225,.19,.26);if(!player){for(let i=0;i<(boss?3:1);i++)cone(arm,i===1?mats.edge:mats.trim,side*(.07+i*.08),.2,0,.035,.19+i*.05).rotation.z=-side*.55;}
   cyl(arm,mats.dark,0,-.23,0,.105,.39);const fore=new T.Group();fore.position.y=-.38;arm.add(fore);ico(fore,mats.armor,0,-.1,0,.14,.24,.135);box(fore,mats.edge,side*.112,-.1,.045,.013,.21,.026);sphere(fore,mats.dark,0,-.31,0,.11,.12,.1);
   const hand=new T.Group();hand.position.set(0,-.33,0);fore.add(hand);joints[side===1?'rarm':'larm']=arm;joints[side===1?'rfore':'lfore']=fore;
   if(!mage && (player||side===1)) {const sw=sword(hand,mats.trim,mats.edge,boss||kind==='brute');sw.rotation.x=2.4;sw.rotation.z=side*.14;joints[side===1?'rsword':'lsword']=sw;}
   if(mage && side===1){cyl(hand,mats.trim,0,.12,.1,.035,1.6);ico(hand,mats.edge,0,.97,.1,.19,.26,.19);const orbit=new T.Mesh(new T.TorusGeometry(.23,.024,5,24),mats.trim);orbit.position.set(0,.97,.1);hand.add(orbit);}
  }
  // Five articulated cloth strips, rather than a rigid cone, give the coat movement.
  for(let i=0;i<5;i++){const strip=new T.Group();strip.position.set((i-2)*.12,1.48,-.24);rig.add(strip);const points=[[-.075,0],[-.11,-1.25-(i%2)*.09],[.11,-1.21-(i%2)*.09],[.075,0]];const c=shapeMesh(points,.017,mats.cloth,strip,.002);c.rotation.x=.15;box(strip,mats.edge,0,-1.12,-.03,.017,.15,.012);cape.push(strip);}
  if(mage){for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const piece=shapeMesh([[-.12,0],[-.25,-.9],[0,-1.02],[.25,-.9],[.12,0]],.015,mats.cloth,rig,.005);piece.position.set(Math.sin(a)*.2,.95,Math.cos(a)*.2);piece.rotation.y=a;piece.rotation.x=-.24;}joints.lleg.visible=false;joints.rleg.visible=false;}
 }
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d');const gr=ctx.createRadialGradient(32,32,3,32,32,32);gr.addColorStop(0,'rgba(0,0,0,0.52)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);const contact=new T.Mesh(new T.PlaneGeometry(hound?2.2:1.6,hound?2.2:1.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.023;root.add(contact);contact.castShadow=false;
 if(isShadow){const aura=ring(root,.65,tint,.045,.021);aura.material.opacity=.44;}
 const baseEmissive=mats.edge.emissiveIntensity;
 return {root,rig,mats,joints,cape,kind,isShadow,
  animate(time,speed=0,attack=0,combo=0,dying=0,cast=0){
   const stride=time*(player?11:8),walk=clamp(speed/4,0,1),swing=Math.sin(stride)*walk;
   rig.position.y=(hound?.02:mage?.25:0)+Math.abs(Math.sin(stride))*walk*.045+(mage?Math.sin(time*2.2)*.09:Math.sin(time*2)*.014);
   rig.rotation.z=Math.sin(stride*.5)*walk*.028;rig.rotation.x=walk*.055;
   if(hound){for(let i=0;i<4;i++)joints['leg'+i].rotation.x=Math.sin(stride+(i%3)*Math.PI)*walk*.66;rig.rotation.x+=Math.sin(attack*Math.PI)*.4;}
   else{
    joints.lleg.rotation.x=swing*.61;joints.rleg.rotation.x=-swing*.61;joints.lknee.rotation.x=Math.max(0,-swing)*.65;joints.rknee.rotation.x=Math.max(0,swing)*.65;
    joints.larm.rotation.x=-swing*.3;joints.rarm.rotation.x=swing*.3;joints.larm.rotation.z=.08;joints.rarm.rotation.z=-.08;joints.rarm.rotation.y=0;joints.larm.rotation.y=0;
    joints.rfore.rotation.x=-.12;joints.lfore.rotation.x=-.12;
    if(attack>0){const s=Math.sin(attack*Math.PI);rig.rotation.y=(combo%2===0?1:-1)*Math.sin(attack*Math.PI*2)*.65;joints.rarm.rotation.x=-1.5*s;joints.rarm.rotation.z=-.4-s*.9;joints.rarm.rotation.y=-s*1.6;joints.rfore.rotation.x=-s*.7;if(player){joints.larm.rotation.x=-1.4*s;joints.larm.rotation.z=.4+s*.7;joints.larm.rotation.y=s*1.7;}}
    else rig.rotation.y=0;
    if(cast>0){joints.larm.rotation.x=-1.9*cast;joints.rarm.rotation.x=-1.9*cast;joints.larm.rotation.z=.35*cast;joints.rarm.rotation.z=-.35*cast;}
    for(let i=0;i<cape.length;i++){cape[i].rotation.x=.12+walk*.45+Math.sin(time*5+i*.7)*(.06+walk*.12);cape[i].rotation.z=Math.sin(time*3+i)*.055;}
   }
   if(dying>0){rig.rotation.x=-Math.min(Math.PI*.5,dying*2);rig.position.y=-Math.min(1.4,Math.max(0,dying-1)*.4);}
   mats.edge.emissiveIntensity=baseEmissive*(.85+Math.sin(time*3)*.15);
  },
  flash(amount){mats.armor.emissive.setHex(isShadow?0x5577ff:0xffffff);mats.armor.emissiveIntensity=amount;},
  dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(!o.isMesh)return;if(o.geometry&&!Object.values(G).includes(o.geometry))geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();contact.material.map.dispose();for(const m of materials)m.dispose();}
 };
}
export function stoneTexture(seed=8){
 const rand=seeded(seed),c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#25313a';ctx.fillRect(0,0,512,512);
 for(let row=0;row<4;row++)for(let col=-1;col<5;col++){
  const x=col*128+(row%2)*64,y=row*128,v=Math.floor(70+rand()*28);ctx.fillStyle=`rgb(${v-12},${v-4},${v+3})`;ctx.fillRect(x+2,y+2,124,124);
  ctx.strokeStyle='rgba(180,198,207,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+4,y+124);ctx.lineTo(x+4,y+4);ctx.lineTo(x+124,y+4);ctx.stroke();
  for(let k=0;k<3;k++){ctx.strokeStyle='rgba(12,24,31,.3)';ctx.lineWidth=.4+rand();ctx.beginPath();let px=x+rand()*128,py=y+rand()*128;ctx.moveTo(px,py);for(let j=0;j<5;j++){px+=(rand()-.5)*20;py+=(rand()-.5)*24;ctx.lineTo(px,py);}ctx.stroke();}
 }
 const img=ctx.getImageData(0,0,512,512);for(let i=0;i<img.data.length;i+=4){const n=(rand()-.5)*15;img.data[i]+=n;img.data[i+1]+=n;img.data[i+2]+=n;}ctx.putImageData(img,0,0);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;return tex;
}
/** Merge static meshes by material to keep the cathedral affordable without a build-time tool. */
export function batchStatic(root){
 root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert();const groups=new Map(),remove=[];
 root.traverse(o=>{if(!o.isMesh||o.userData.dynamic||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial)return;let b=groups.get(o.material);if(!b){b={p:[],n:[],uv:[],ix:[],count:0,shadow:false};groups.set(o.material,b);}const g=o.geometry,p=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=g.getAttribute('uv'),v=new T.Vector3(),normal=new T.Vector3(),localMatrix=new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld),nm=new T.Matrix3().getNormalMatrix(localMatrix);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(localMatrix);b.p.push(v.x,v.y,v.z);if(norm){normal.fromBufferAttribute(norm,i).applyMatrix3(nm).normalize();b.n.push(normal.x,normal.y,normal.z);}else b.n.push(0,1,0);b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}if(g.index)for(let i=0;i<g.index.count;i++)b.ix.push(g.index.getX(i)+b.count);else for(let i=0;i<p.count;i++)b.ix.push(i+b.count);b.count+=p.count;b.shadow ||= o.castShadow;remove.push(o);});
 for(const o of remove)o.removeFromParent();
 for(const [mat,b]of groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.ix);g.computeBoundingSphere();const m=new T.Mesh(g,mat);m.castShadow=b.shadow;m.receiveShadow=true;root.add(m);}
}
export function emblemTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.translate(128,128);ctx.strokeStyle='#86d5ff';ctx.lineWidth=2;for(const r of [116,109,82,77]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}for(let i=0;i<16;i++){ctx.save();ctx.rotate(i*Math.PI/8);ctx.fillStyle='#a4dfff';ctx.fillRect(-2,-106,4,10);ctx.restore();}for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,-72);ctx.lineTo(62,36);ctx.lineTo(-62,36);ctx.closePath();ctx.stroke();ctx.restore();}ctx.beginPath();ctx.moveTo(-20,16);ctx.lineTo(-27,-19);ctx.lineTo(-11,-6);ctx.lineTo(0,-30);ctx.lineTo(11,-6);ctx.lineTo(27,-19);ctx.lineTo(20,16);ctx.closePath();ctx.stroke();const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
