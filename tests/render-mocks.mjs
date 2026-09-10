/** Explicit rendering doubles for headless rules/state tests. NOT a Three.js implementation. */
import {WALKABLE as MAP} from '../src/data.js';
export const WALKABLE=MAP;
export class Vector3{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 clone(){return new Vector3(this.x,this.y,this.z);}
 lerp(v,a){this.x+=(v.x-this.x)*a;this.y+=(v.y-this.y)*a;this.z+=(v.z-this.z)*a;return this;}
 setScalar(s){return this.set(s,s,s);}
}
export class Group{
 constructor(){this.position=new Vector3();this.rotation=new Vector3();this.scale=new Vector3(1,1,1);this.children=[];this.visible=true;}
 add(...objects){this.children.push(...objects);return this;}
 removeFromParent(){}
 lookAt(){}
}
export class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
export class IcosahedronGeometry{dispose(){}}
export function glow(){return {opacity:1,dispose(){}};}
export function ring(g){const m=new Mesh(new IcosahedronGeometry(),glow());g.add(m);return m;}
export function ico(){return new Group();}
export function makeCharacter(){return {root:new Group(),animate(){},flash(){},dispose(){}};}
export class Renderer{constructor(){this.scene=new Group();this.camera=new Group();this.renderer={info:{render:{calls:0,triangles:0}}};}render(){}followLight(){}setQuality(){}resize(){}}
export class Dungeon{
 constructor(){this.obstacles=[];this.gates=[{zone:0,z:-18,x0:-4.8,x1:4.8,open:false},{zone:1,z:-62,x0:-4.8,x1:4.8,open:false}];this.chests=[{id:0,x:-10,z:8,zone:0,open:false}];this.tablets=[{id:0,x:10,z:10}];this.shrine={x:-5,z:11};}
 reset(p){this.gates.forEach(g=>g.open=g.zone<p.checkpoint||p.cleared.includes(g.zone));this.chests.forEach(c=>c.open=p.opened.includes(c.id));}
 openGate(i){this.gates[i].open=true;}
 tick(){}
}
export class Effects{
 constructor(){this.bursts=0;}
 burst(){this.bursts++;}pulse(){}slash(){}mist(){}tick(){}clear(){}release(){}
 telegraph(){return {life:1};}projectile(){return new Group();}
}
export class Sound{start(){}update(){}play(){}tick(){}}
export class Input{constructor(){this.yaw=0;this.pitch=.63;this.distance=11;this.attackHeld=false;this.vector={x:0,z:0};}clear(){this.attackHeld=false;this.vector={x:0,z:0};}movement(){return this.vector;}}
export class UI{
 constructor(){this.modalOpen=false;this.kind='';this.boonCallback=null;this.notices=[];}
 title(){this.close();}play(){this.close();}close(){this.modalOpen=false;this.kind='';}clearTags(){}number(){}banner(){}tick(){}
 toast(t){this.notices.push(t);}pause(){this.modalOpen=true;this.kind='pause';}death(){this.modalOpen=true;this.kind='death';}victory(){this.modalOpen=true;this.kind='victory';}
 chooseBoon(choices,callback){this.modalOpen=true;this.kind='boon';this.choices=choices;this.boonCallback=callback;}
 choose(id){this.close();this.boonCallback(id);}shrine(){this.modalOpen=true;this.kind='shrine';}lore(){this.modalOpen=true;this.kind='lore';}
}
