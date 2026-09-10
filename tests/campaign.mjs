/** Deterministic gameplay simulation. Rendering/audio/input UI are test doubles. */
import {Game} from '../src/game.js';
import {distance,seeded} from '../src/rules.js';
import {ZONES,CHESTS,TABLETS} from '../src/data.js';
const mem=new Map();globalThis.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};
globalThis.window={addEventListener(){}};
globalThis.document={getElementById(){return {textContent:'',classList:{add(){},remove(){}}};}};
const g=new Game({addEventListener(){}});g.start(false);g.rng=seeded(417);
// The same physical pillar/chest/tablet layout as the rendered Dungeon.
g.world.obstacles=[];
for(const zone of ZONES)for(const side of [-1,1])for(let z=zone.z1-4;z>zone.z0+2;z-=8)g.world.obstacles.push({x:side*(zone.x1-3.8),z,r:.83});
for(const c of CHESTS)g.world.obstacles.push({x:c.x,z:c.z,r:.56});
for(const t of TABLETS)g.world.obstacles.push({x:t.x,z:t.z,r:.45});
const log=[];let lastZone=0,lastKills=0,retries=0,frame=0,stuck=0,prior={...g.player.pos};
const dt=1/60;
for(;frame<60*480;frame++){
 if(g.mode==='won')break;
 if(g.mode==='dead'){log.push({at:frame/60,event:'death',zone:g.zone,kills:g.profile.kills});if(retries++>=2)break;g.retry();continue;}
 if(g.ui.kind==='boon'){const priority=['hunger','fury','dominion','vitality','celerity','precision','reservoir'];const choice=[...g.ui.choices].sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id))[0];g.ui.choose(choice.id);}
 while(g.profile.points>0)g.spendAttribute(g.profile.attributes.strength>g.profile.attributes.vitality+2?'vitality':'strength');
 for(let i=0;i<g.profile.inventory.length;i++){const item=g.profile.inventory[i];if(item.power>g.profile.equipment[item.slot].power)g.equip(i);}
 const p=g.player;
 if(g.profile.shadows.length<g.stat.shadowLimit)g.action('extract');
 if(g.profile.shadows.length&&g.closestEnemy(p.pos,10))g.action('army');
 if(p.hp<g.stat.maxHP*.5)g.action('potion');
 const threat=g.enemies.find(e=>!e.dead&&e.active&&e.state==='windup'&&e.timer<.13&&distance(e.origin,p.pos)<(e.pattern==='nova'?6.6:e.kind==='boss'?4.7:3.6));
 const spell=g.hazards.find(h=>h.timer<.13&&distance(h.pos,p.pos)<h.radius+.4);
 const nearest=g.closestEnemy(p.pos,100);
 let dest=nearest?.pos;
 if(g.cleared.has(g.zone)&&g.zone<2)dest=ZONES[g.zone+1].checkpoint;
 if(dest){const dx=dest.x-p.pos.x,dz=dest.z-p.pos.z,n=Math.hypot(dx,dz);g.input.vector=n>(nearest&&!g.cleared.has(g.zone)?1.9:.3)?{x:dx/n,z:dz/n}:{x:0,z:0};}
 if(threat||spell){const target=threat?.pos||spell.pos;let dx=p.pos.x-target.x,dz=p.pos.z-target.z;const n=Math.hypot(dx,dz)||1;g.input.vector={x:dx/n,z:dz/n};g.action('dash');}
 if(nearest&&distance(nearest.pos,p.pos)<11)g.action('rift');
 g.input.attackHeld=!!nearest&&distance(nearest.pos,p.pos)<4;
 if(distance(prior,p.pos)<.0001&&Math.hypot(g.input.vector.x,g.input.vector.z)>.5)stuck++;else stuck=0;
 if(stuck>30){const a=frame*.1;g.input.vector={x:Math.cos(a),z:Math.sin(a)};if(stuck>90)stuck=0;}
 prior={...p.pos};g.tick(dt);
 if(lastZone!==g.zone){log.push({at:frame/60,event:'checkpoint',zone:g.zone,hp:p.hp,level:g.profile.level});lastZone=g.zone;}
 if(lastKills!==g.profile.kills){log.push({at:frame/60,event:'kill',kills:g.profile.kills,hp:p.hp,level:g.profile.level});lastKills=g.profile.kills;}
}
const result={kind:'Headless deterministic campaign; no graphics rendered',seed:417,difficulty:g.store.settings.difficulty,simulationSeconds:frame/60,outcome:g.mode,level:g.profile.level,kills:g.profile.kills,deaths:g.profile.deaths,shadows:g.profile.shadows.length,hp:g.player.hp,checkpoint:g.profile.checkpoint,log};
console.log(JSON.stringify(result,null,2));
if(g.mode!=='won')process.exitCode=1;
