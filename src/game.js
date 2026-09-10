import * as T from 'three';
import {Renderer} from './render.js';
import {Dungeon,WALKABLE} from './world.js';
import {makeCharacter,ring,glow,ico} from './models.js';
import {Effects} from './effects.js';
import {Sound} from './audio.js';
import {SaveStore} from './save.js';
import {Input} from './input.js';
import {UI} from './ui.js';
import {ZONES,ENEMIES,SKILLS} from './data.js';
import {freshProfile,stats,gainXP,clamp,damp,distance,angleDelta,inArc,moveCircle,rollLoot,seeded,BOONS,RARITIES} from './rules.js';

const FORWARD = a => ({x:Math.sin(a),z:Math.cos(a)});
const AIM = (a,b) => Math.atan2(b.x-a.x,b.z-a.z);
const length = v => Math.hypot(v.x,v.z);

/** Gameplay owns time and state; render objects are views of those states. */
export class Game {
  constructor(canvas) {
    this.store=new SaveStore(); this.profile=freshProfile(); this.stat=stats(this.profile);
    this.view=new Renderer(canvas,this.store.settings); this.world=new Dungeon(this.view.scene);
    this.fx=new Effects(this.view.scene); this.sound=new Sound(this.store.settings);
    this.playerModel=makeCharacter('player'); this.view.scene.add(this.playerModel.root);
    this.rng=seeded(Date.now()); this.mode='title'; this.time=0; this.zone=0;
    this.enemies=[]; this.shadows=[]; this.projectiles=[]; this.hazards=[]; this.cleared=new Set();
    this.armyTime=0; this.hitStop=0; this.shake=0; this.hurt=0; this.fps=60;
    this.serial=0; this.saveTimer=0; this.killTimer=0; this.deathTimer=0;
    this.clearTimer=-1; this.interaction=null; this.lastDeathTip='';
    this.player=this.newPlayer({x:0,z:12});this.playerModel.root.position.set(0,0,12);this.playerModel.root.rotation.y=Math.PI;
    this.ui=new UI(this); this.input=new Input(this,canvas);
    this.cameraTarget=new T.Vector3(0,1.5,10); this.cameraPosition=new T.Vector3(7,7,22);
    this.world.reset(this.profile); this.spawnHalls(); this.ui.title();
    window.addEventListener('pagehide',()=>this.save());
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.input.clear();document.getElementById('fatal-message').textContent='The browser lost its graphics context. Your latest hunter checkpoint is saved. Reload to continue; use Medium or Low if this happens again.';document.getElementById('fatal').classList.remove('hidden');this.save();});
  }
  newPlayer(pos) {
    return {pos:{...pos},angle:Math.PI,hp:this.stat.maxHP,mana:this.stat.maxMana,stamina:100,
      potions:3,cooldowns:{dash:0,rift:0,extract:0,army:0,potion:0},
      attackTimer:0,attackDuration:.44,attackHit:false,combo:0,comboGap:2,cast:0,
      dashTime:0,dashVector:{x:0,z:-1},invuln:0,hitChain:0,chainTime:0,speed:0,stepTime:0};
  }
  destroyActors() {
    for(const e of [...this.enemies,...this.shadows]){e.model.root.removeFromParent();e.model.dispose();if(e.remnant)this.fx.release(e.remnant);}
    this.enemies=[];this.shadows=[];
    for(const p of this.projectiles)this.fx.release(p.mesh);
    this.projectiles=[];this.hazards=[];this.fx.clear();this.armyTime=0;
  }
  start(continueSave=false) {
    this.sound.start();this.destroyActors();
    this.profile=continueSave?(this.store.load()||freshProfile()):freshProfile();
    this.stat=stats(this.profile);this.cleared=new Set(this.profile.cleared);
    this.zone=this.profile.checkpoint;this.player=this.newPlayer(ZONES[this.zone].checkpoint);
    this.mode='playing';this.killTimer=0;this.deathTimer=0;this.clearTimer=-1;this.shake=this.hurt=this.hitStop=0;
    this.input.clear();this.input.yaw=0;this.world.reset(this.profile);this.spawnHalls();
    this.cameraTarget.set(this.player.pos.x,1.3,this.player.pos.z);
    this.cameraPosition.set(this.player.pos.x,8,this.player.pos.z+11);this.ui.play();
    this.ui.banner('THE SYSTEM HAS CHOSEN YOU',ZONES[this.zone].name,ZONES[this.zone].subtitle,3.5);
    if(!continueSave)this.ui.toast('WASD to move · hold LMB to attack · SPACE to dodge','',6);
    if(!this.store.available)this.ui.toast('Browser storage unavailable. Export your hunter from the record menu.','danger',7);
    if(this.cleared.has(2)){this.mode='won';this.ui.victory();}
    this.save();
  }
  spawnHalls() {
    for(const zone of ZONES){if(this.cleared.has(zone.id))continue;for(const [kind,x,z] of zone.enemies)this.spawnEnemy(kind,x,z,zone.id);}
  }
  spawnEnemy(kind,x,z,zone=this.zone) {
    const d=ENEMIES[kind],scale=1+this.profile.cycle*.32;
    const model=makeCharacter(kind);model.root.scale.setScalar(d.scale);model.root.position.set(x,0,z);this.view.scene.add(model.root);
    const e={id:++this.serial,kind,zone,pos:{x,z},home:{x,z},angle:0,model,hp:Math.round(d.hp*scale),maxHP:Math.round(d.hp*scale),
      radius:d.radius,height:(kind==='hound'?1.3:2.1)*d.scale,phase:1,active:false,dead:false,
      state:'idle',timer:0,recovery:0,stagger:0,flash:0,speed:0,attackAnim:0,deathTime:0,extracted:false,
      target:this.player,attackIndex:0,pattern:'cleave',telegraph:null,remnant:null,emission:0};
    this.enemies.push(e);return e;
  }
  save(){if(this.mode!=='title')this.store.save(this.profile);}
  toTitle(){this.save();this.input.clear();this.mode='title';this.ui.title();}
  retry(){this.start(true);}
  ascend(){const p=this.profile;p.cycle++;p.checkpoint=0;p.cleared=[];p.opened=[];p.boons=[];this.store.save(p);this.start(true);}
  refreshStats(){this.stat=stats(this.profile);this.player.hp=Math.min(this.player.hp,this.stat.maxHP);this.player.mana=Math.min(this.player.mana,this.stat.maxMana);}
  restore(){this.player.hp=this.stat.maxHP;this.player.mana=this.stat.maxMana;this.player.stamina=100;this.player.potions=3;}
  spendAttribute(key){if(!Object.hasOwn(this.profile.attributes,key)||this.profile.points<=0)return;this.profile.points--;this.profile.attributes[key]++;const old=this.stat.maxHP;this.refreshStats();this.player.hp+=this.stat.maxHP-old;this.save();this.sound.play('level');}
  equip(index){const item=this.profile.inventory[index];if(!item)return;const old=this.profile.equipment[item.slot];this.profile.equipment[item.slot]=item;this.profile.inventory[index]=old;this.refreshStats();this.sound.play('loot');this.save();}
  releaseShadow(index){if(index<0||index>=this.profile.shadows.length)return;this.profile.shadows.splice(index,1);const actor=this.shadows[index];if(actor){this.fx.burst(actor.pos.x,1,actor.pos.z,0x9d80ff,18,2,.05,-1);actor.model.root.removeFromParent();actor.model.dispose();this.shadows.splice(index,1);}if(!this.shadows.length)this.armyTime=0;this.save();}
  sell(index){const item=this.profile.inventory[index];if(!item)return;this.profile.inventory.splice(index,1);this.profile.gold+=6+item.rarity*7;this.sound.play('loot');this.save();}
  move(pos,dx,dz,r=.48){moveCircle(pos,{x:dx,z:dz},r,WALKABLE,this.world.obstacles,this.world.gates);}
  closestEnemy(origin,range=6){let best=null,dist=range;for(const e of this.enemies){if(e.dead||e.zone!==this.zone)continue;const d=distance(origin,e.pos);if(d<dist){best=e;dist=d;}}return best;}
  faceTarget(range=6){const e=this.closestEnemy(this.player.pos,range);if(e)this.player.angle=AIM(this.player.pos,e.pos);return e;}
  action(action) {
    if(this.mode!=='playing'||this.ui.modalOpen)return;
    this.sound.start();const p=this.player,s=this.stat;
    if(action==='interact'){this.interact();return;}
    if(action==='attack'){
      if(p.attackTimer>0||p.dashTime>0)return;
      const target=this.faceTarget(4.8);p.combo=p.comboGap>1?0:(p.combo+1)%3;p.comboGap=0;
      p.attackDuration=[.42,.43,.59][p.combo]*s.cooldown;p.attackTimer=p.attackDuration;p.attackHit=false;
      p.mana=Math.min(s.maxMana,p.mana+1);this.sound.play('slash',p.combo);
      if(target&&distance(p.pos,target.pos)>1.65){const f=FORWARD(p.angle);this.move(p.pos,f.x*.36,f.z*.36);}
      return;
    }
    const skill=SKILLS[action];if(!skill)return;
    if(p.cooldowns[action]>0)return;
    if(action==='dash'){
      if(p.stamina<25){this.feedback('Not enough stamina');return;}
      let v=this.input.movement();if(length(v)<.15)v=FORWARD(p.angle);const n=length(v)||1;
      p.dashVector={x:v.x/n,z:v.z/n};p.dashTime=.24;p.invuln=Math.max(p.invuln,.34);p.stamina-=25;
      p.attackTimer=0;p.cooldowns.dash=skill.cooldown*s.cooldown;this.sound.play('dash');
      this.fx.pulse(p.pos.x,p.pos.z,0x82a9ff,1.5,.3);return;
    }
    if(action==='potion'){
      if(p.potions<=0){this.feedback('No potions. Clear a hall or visit the shrine.');return;}
      if(p.hp>=s.maxHP-1){this.feedback('Health is already full');return;}
      p.potions--;p.cooldowns.potion=1;const heal=Math.min(s.maxHP-p.hp,s.maxHP*.55);p.hp+=heal;
      this.ui.number(p.pos.x,2,p.pos.z,'+'+Math.round(heal),'heal');this.fx.burst(p.pos.x,1,p.pos.z,0x6effba,32,2,.055,-1);this.sound.play('potion');return;
    }
    if(p.mana<skill.cost){this.feedback('Not enough essence');return;}
    if(action==='extract'){
      const corpse=this.enemies.filter(e=>e.dead&&!e.extracted&&e.deathTime<120&&distance(e.pos,p.pos)<5).sort((a,b)=>distance(a.pos,p.pos)-distance(b.pos,p.pos))[0];
      if(!corpse){this.feedback('Stand near a fallen enemy to extract its shadow');return;}
      if(this.profile.shadows.length>=s.shadowLimit){this.feedback('Shadow roster is full. Dismiss a shadow in the hunter record.');return;}
      corpse.extracted=true;if(corpse.remnant){this.fx.release(corpse.remnant);corpse.remnant=null;}
      this.profile.shadows.push(corpse.kind==='boss'?'brute':corpse.kind);p.mana-=skill.cost;p.cooldowns.extract=1;p.cast=.7;
      this.fx.burst(corpse.pos.x,.2,corpse.pos.z,0xa683ff,55,3,.065,-2);this.fx.pulse(corpse.pos.x,corpse.pos.z,0xb298ff,3,1);
      this.sound.play('extract');this.ui.banner('SHADOW EXTRACTION',ENEMIES[corpse.kind].name,'Bound to your will. Press R to call your legion.',2.4);this.save();return;
    }
    if(action==='army'){
      if(!this.profile.shadows.length){this.feedback('Extract a fallen enemy with E first');return;}
      this.dismissArmy();p.mana-=skill.cost;p.cooldowns.army=skill.cooldown*s.cooldown;p.cast=1;
      this.armyTime=24;const roster=this.profile.shadows.slice(0,s.shadowLimit);
      roster.forEach((kind,i)=>{
        const a=i*Math.PI*2/roster.length,pos={...p.pos};this.move(pos,Math.sin(a)*1.8,Math.cos(a)*1.8,.4);
        const model=makeCharacter(kind,true);model.root.scale.setScalar(Math.min(1.18,ENEMIES[kind].scale));model.root.position.set(pos.x,0,pos.z);this.view.scene.add(model.root);
        this.shadows.push({pos,model,kind,hp:85+this.profile.level*12,maxHP:85+this.profile.level*12,angle:0,dead:false,cooldown:.2+i*.12,attack:0,speed:0});
        this.fx.burst(pos.x,.1,pos.z,0x986fff,25,2,.07,-2);
      });
      this.fx.pulse(p.pos.x,p.pos.z,0xaa83ff,7,1.1);this.sound.play('army');this.ui.banner('THE DEAD ANSWER','ARISE','Your legion joins the hunt.',1.6);this.shake=.13;return;
    }
    if(action==='rift'){
      this.faceTarget(16);p.mana-=skill.cost;p.cooldowns.rift=skill.cooldown*s.cooldown;p.cast=.55;
      const f=FORWARD(p.angle),pos={x:p.pos.x+f.x*.6,z:p.pos.z+f.z*.6};
      this.spawnProjectile(pos,p.angle,'player',s.damage*2.15,16,1.45,0xaab7ff,1.65);
      this.fx.slash(p.pos.x,p.pos.z,p.angle,2,4.2,0xaa9dff);this.sound.play('rift');this.shake=.09;
    }
  }
  feedback(text){if(this.feedbackTimer>0)return;this.feedbackTimer=.85;this.ui.toast(text,'',2);}
  spawnProjectile(pos,angle,source,damage,speed=9,life=2,color=0xe291ff,radius=.45){
    const mesh=this.fx.projectile(pos.x,1.05,pos.z,color,source==='player'?.32:.16);
    this.projectiles.push({pos:{...pos},angle,source,damage,speed,life,mesh,radius,hits:new Set(),color,trail:0});
  }
  hitEnemy(e,raw,source='player',forceCrit=false){
    if(e.dead)return;
    const crit=source==='player'&&(forceCrit||this.rng()<this.stat.crit),amount=Math.max(1,Math.round(raw*(crit?2:1)));
    e.hp=Math.max(0,e.hp-amount);e.active=true;e.flash=.17;
    if(e.kind!=='boss'&&e.state!=='windup')e.stagger=Math.max(e.stagger,.18);
    this.ui.number(e.pos.x,e.height*.85,e.pos.z,amount,source==='shadow'?'shadow':crit?'crit':'');
    this.fx.burst(e.pos.x,1,e.pos.z,source==='shadow'?0xa886ff:crit?0xffd49b:0x8bccff,crit?19:9,2.8,.055,4);
    if(source==='player'){
      const p=this.player;p.hp=Math.min(this.stat.maxHP,p.hp+amount*this.stat.lifesteal);p.hitChain++;p.chainTime=3.2;
      this.profile.bestCombo=Math.max(this.profile.bestCombo,p.hitChain);this.hitStop=Math.max(this.hitStop,crit?.045:.026);
      this.shake=Math.max(this.shake,crit?.1:.045);this.sound.play('hit',crit?1:0);
    }
    if(e.hp<=0)this.killEnemy(e);
  }
  killEnemy(e){
    if(e.dead)return;e.dead=true;e.active=false;e.deathTime=0;if(e.telegraph)e.telegraph.life=0;
    const d=ENEMIES[e.kind];this.profile.kills++;this.profile.gold+=Math.round(d.gold*(1+this.profile.cycle*.15));
    this.player.mana=Math.min(this.stat.maxMana,this.player.mana+10);
    this.fx.burst(e.pos.x,.6,e.pos.z,e.kind==='boss'?0xe394ed:0xa19bff,e.kind==='boss'?95:35,3.7,.07,-.2);
    const levels=gainXP(this.profile,Math.round(d.xp*(1+this.profile.cycle*.2)));
    if(levels){this.refreshStats();this.player.hp=this.stat.maxHP;this.player.mana=this.stat.maxMana;this.sound.play('level');this.ui.banner('LEVEL UP',`LEVEL ${this.profile.level}`,'Health and essence restored. Spend attribute points with TAB.',2.5);this.fx.pulse(this.player.pos.x,this.player.pos.z,0xd5c6ff,5,1);}
    if(e.kind==='brute'||e.kind==='boss'||this.rng()<.24)this.awardLoot(rollLoot(this.rng,e.zone+this.profile.cycle,e.kind==='boss'));
    if(e.kind==='boss'){
      this.killTimer=3;this.shake=.4;this.sound.play('victory');this.ui.banner('THE HOLLOW CROWN IS BROKEN','MONARCH SLAIN','The gate belongs to you.',3);
      // The monarch's remaining guards dissolve without triggering extra reward loops.
      for(const other of this.enemies){if(other!==e&&!other.dead&&other.zone===2){other.dead=true;other.deathTime=0;if(other.telegraph)other.telegraph.life=0;}}
    }else if(this.profile.kills===1)this.ui.toast('A shadow remains. Stand nearby and press E to claim it.','purple',6);
    this.save();
  }
  awardLoot(item){
    if(this.profile.inventory.length>=30){this.profile.gold+=10+item.rarity*10;this.ui.toast('Inventory full — drop converted to crystals','gold');}
    else{this.profile.inventory.push(item);this.ui.toast(`${RARITIES[item.rarity]} loot · ${item.name} · TAB to equip`,item.rarity>=3?'purple':'gold',4.5);}
    this.sound.play('loot');
  }
  damagePlayer(raw,attacker='a guardian'){
    const p=this.player;if(this.mode!=='playing'||p.invuln>0||p.hp<=0)return;
    const modifier={story:.55,normal:1,hard:1.4}[this.store.settings.difficulty]||1;
    const amount=Math.max(1,Math.round(raw*(1+this.profile.cycle*.22)*modifier*100/(100+this.stat.armor*3)));
    p.hp=Math.max(0,p.hp-amount);p.invuln=.48;p.hitChain=0;p.chainTime=0;
    this.ui.number(p.pos.x,2.2,p.pos.z,'−'+amount,'hurt');this.hurt=.8;this.shake=.2;this.sound.play('hurt');
    this.fx.burst(p.pos.x,1,p.pos.z,0xf78b9d,17,2.7,.05,3);
    if(p.hp<=0){this.mode='dead';this.deathTimer=1.4;this.profile.deaths++;this.profile.gold=Math.floor(this.profile.gold*.9);
      this.input.clear();this.lastDeathTip=`${attacker} ended this attempt. Dodge through the red attack marker just before it fills. Your shadows can take pressure off you; potions restore more than half your health.`;this.save();}
  }
  damageTarget(target,raw,name){if(target===this.player)this.damagePlayer(raw,name);else if(target&&!target.dead){target.hp-=raw;this.fx.burst(target.pos.x,1,target.pos.z,0xb99cff,7,2,.045,1);if(target.hp<=0){target.dead=true;target.model.root.visible=false;}}}
  targetFor(e){let target=this.player,best=distance(e.pos,this.player.pos);for(const a of this.shadows){if(a.dead)continue;const d=distance(e.pos,a.pos)*.82;if(d<best){best=d;target=a;}}return target;}
  beginEnemyAttack(e,target){
    const d=ENEMIES[e.kind];e.target=target;e.state='windup';e.angle=AIM(e.pos,target.pos);e.attackIndex++;
    e.pattern=e.kind==='mage'?'bolt':e.kind==='hound'?'lunge':e.kind==='brute'?'slam':'cleave';
    if(e.kind==='boss'){
      const patterns=e.phase===1?['cleave','cleave','nova']:e.phase===2?['cleave','sigils','nova','bolts']:['sigils','cleave','bolts','nova'];
      e.pattern=patterns[(e.attackIndex-1)%patterns.length];
    }
    e.timer=d.windup*(e.kind==='boss'&&e.phase===3?.86:1);e.aim={...target.pos};e.origin={...e.pos};
    const radius=e.pattern==='nova'?6.2:e.pattern==='slam'?3.4:e.pattern==='bolt'?1:e.pattern==='sigils'?2.1:d.range;
    if(e.pattern==='sigils'){
      for(let i=0;i<3;i++){const a=i*2.1,offset=i===0?0:3.2;const pos={x:target.pos.x+Math.sin(a)*offset,z:target.pos.z+Math.cos(a)*offset};this.hazards.push({pos,radius:2.1,timer:1.25+i*.32,damage:d.damage,source:e.name||d.name});this.fx.telegraph(pos.x,pos.z,2.1,1.25+i*.32,0xe874b3);}
    }else{
      const pos=e.pattern==='bolt'?e.aim:e.origin;e.telegraph=this.fx.telegraph(pos.x,pos.z,radius,e.timer,e.kind==='boss'?0xe7749c:0xf08065);
    }
    if(e.kind==='boss'||e.kind==='brute')this.sound.play('warning');
  }
  executeEnemyAttack(e){
    const d=ENEMIES[e.kind],all=[this.player,...this.shadows.filter(a=>!a.dead)];
    if(e.pattern==='bolt')this.spawnProjectile(e.pos,AIM(e.pos,e.aim),'enemy',d.damage,8.4,2.5,0xdb8cff,.5);
    else if(e.pattern==='bolts'){
      const count=e.phase===3?12:9;for(let i=0;i<count;i++)this.spawnProjectile(e.pos,i*Math.PI*2/count+e.angle,'enemy',d.damage*.8,6.8,2.7,0xf782b9,.45);
      this.fx.pulse(e.pos.x,e.pos.z,0xe689c5,7,.7);
    }else if(e.pattern==='nova'||e.pattern==='slam'){
      const radius=e.pattern==='nova'?6.2:3.4;this.fx.pulse(e.origin.x,e.origin.z,0xf38b87,radius,.45);this.fx.burst(e.origin.x,.1,e.origin.z,0xf59786,45,5,.09,5);
      for(const target of all)if(distance(e.origin,target.pos)<radius+.3)this.damageTarget(target,d.damage*1.2,d.name);
      this.shake=Math.max(this.shake,.2);
    }else if(e.pattern==='lunge'){
      const v=FORWARD(e.angle);const start={...e.pos};this.move(e.pos,v.x*2.1,v.z*2.1,e.radius);
      for(const target of all)if(distance(e.pos,target.pos)<2.05||inArc(start,e.angle,target.pos,3.3,1))this.damageTarget(target,d.damage,d.name);
      this.fx.slash(e.pos.x,e.pos.z,e.angle,0,2,0xbe84ec);
    }else if(e.pattern==='cleave'){
      this.fx.slash(e.pos.x,e.pos.z,e.angle,e.kind==='boss'?2:0,d.range,0xf1948b);
      for(const target of all)if(inArc(e.origin,e.angle,target.pos,d.range+.3,e.kind==='boss'?Math.PI*1.35:Math.PI*1.15))this.damageTarget(target,d.damage,d.name);
    }
    e.state='recover';e.timer=d.recovery*(e.kind==='boss'&&e.phase===3?.78:1);e.attackAnim=.42;e.telegraph=null;
  }
  updateEnemy(e,dt){
    const d=ENEMIES[e.kind];e.speed=0;e.flash=Math.max(0,e.flash-dt);e.model.flash(e.flash>0?.8:0);
    if(e.dead){
      e.deathTime+=dt;e.model.animate(this.time,0,0,0,e.deathTime);e.model.root.visible=e.deathTime<1.2;
      if(!e.extracted&&e.deathTime>1.1&&e.deathTime<120){
        if(!e.remnant){e.remnant=new T.Group();e.remnant.position.set(e.pos.x,0,e.pos.z);this.view.scene.add(e.remnant);ring(e.remnant,.65,0xb19dff,.05,.02);const shard=new T.Mesh(new T.IcosahedronGeometry(1,0),glow(0x9c77ff,2));shard.scale.set(.1,.26,.1);shard.position.y=.35;e.remnant.add(shard);}
        e.remnant.rotation.y=this.time;e.emission-=dt;if(e.emission<0&&distance(e.pos,this.player.pos)<18){e.emission=.2;this.fx.mist(e.pos.x,e.pos.z,0xaa88ff,2);}
      }else if(e.remnant){this.fx.release(e.remnant);e.remnant=null;}
      return;
    }
    if(e.zone!==this.zone||this.killTimer>0){e.model.animate(this.time,0);return;}
    let target=this.targetFor(e),dist=distance(e.pos,target.pos);
    if(dist<13.5)e.active=true;
    if(!e.active){e.model.animate(this.time,0);return;}
    if(e.kind==='boss'){
      const phase=e.hp/e.maxHP<.33?3:e.hp/e.maxHP<.66?2:1;
      if(phase>e.phase){e.phase=phase;this.ui.banner('VAEL, THE HOLLOW KING',phase===2?'THE CROWN AWAKENS':'NO MORE MERCY','Watch the floor. His reach has changed.',2.3);this.fx.pulse(e.pos.x,e.pos.z,0xe276c6,8,1);this.sound.play('warning');}
    }
    e.attackAnim=Math.max(0,e.attackAnim-dt);e.stagger=Math.max(0,e.stagger-dt);
    if(e.stagger>0&&e.state!=='windup')return;
    if(e.state==='windup'){
      e.timer-=dt;if(e.timer<=0)this.executeEnemyAttack(e);
    }else if(e.state==='recover'){
      e.timer-=dt;if(e.timer<=0)e.state='chase';
    }else{
      e.angle+=angleDelta(e.angle,AIM(e.pos,target.pos))*Math.min(1,dt*7);
      const attackRange=e.kind==='boss'?4.0:e.kind==='mage'?12:d.range-.18;
      if(dist<=attackRange)this.beginEnemyAttack(e,target);
      else{
        const v=FORWARD(e.angle);const speed=d.speed*(e.kind==='boss'&&e.phase===3?1.3:1);const before={...e.pos};
        this.move(e.pos,v.x*speed*dt,v.z*speed*dt,e.radius);
        e.speed=distance(before,e.pos)/Math.max(dt,.001);
        // A small deterministic tangent avoids actors deadlocking against a pillar.
        if(e.speed<.2&&dist>attackRange){const side=e.id%2?1:-1;this.move(e.pos,v.z*side*speed*dt,-v.x*side*speed*dt,e.radius);}
      }
    }
    e.model.root.position.set(e.pos.x,0,e.pos.z);e.model.root.rotation.y=e.angle;
    e.model.animate(this.time,e.speed,e.attackAnim>0?1-e.attackAnim/.42:0,0,0,e.state==='windup'?.5:0);
  }
  dismissArmy(){for(const a of this.shadows){this.fx.burst(a.pos.x,.7,a.pos.z,0x9a82ff,10,1.5,.06,-1);a.model.root.removeFromParent();a.model.dispose();}this.shadows=[];this.armyTime=0;}
  updateShadows(dt){
    if(this.armyTime>0){this.armyTime-=dt;if(this.armyTime<=0){this.dismissArmy();this.ui.toast('Your legion returns to the shadows','purple',2);return;}}
    for(let i=0;i<this.shadows.length;i++){
      const a=this.shadows[i];if(a.dead)continue;a.cooldown-=dt;a.attack=Math.max(0,a.attack-dt);a.speed=0;
      const enemy=this.closestEnemy(a.pos,12);let target;
      if(enemy){target=enemy.pos;a.angle=AIM(a.pos,target);if(distance(a.pos,target)<2.15&&a.cooldown<=0){a.cooldown=.8+(a.kind==='brute'?.3:0);a.attack=.4;this.hitEnemy(enemy,this.stat.shadowDamage*(a.kind==='brute'?1.6:1),'shadow');this.fx.slash(a.pos.x,a.pos.z,a.angle,0,2,0xa987ff);}}
      else{const angle=i*2.4;target={x:this.player.pos.x+Math.sin(angle)*1.6,z:this.player.pos.z+Math.cos(angle)*1.6};a.angle=AIM(a.pos,target);}
      if(distance(a.pos,target)>(enemy?1.8:1)){const v=FORWARD(a.angle);this.move(a.pos,v.x*4.8*dt,v.z*4.8*dt,.4);a.speed=4.8;}
      if(distance(a.pos,this.player.pos)>22){a.pos={...this.player.pos};this.fx.pulse(a.pos.x,a.pos.z,0xab87ff,1,.3);}
      a.model.root.position.set(a.pos.x,0,a.pos.z);a.model.root.rotation.y=a.angle;a.model.animate(this.time,a.speed,a.attack>0?1-a.attack/.4:0);
    }
  }
  updateProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i],v=FORWARD(p.angle);p.life-=dt;
      // Swept substeps keep fast rifts and bolts from skipping a target at low FPS.
      const steps=Math.ceil(p.speed*dt/.3),step=dt/Math.max(1,steps);
      for(let k=0;k<steps&&p.life>0;k++){
        p.pos.x+=v.x*p.speed*step;p.pos.z+=v.z*p.speed*step;
        if(!WALKABLE.some(r=>p.pos.x>r.x0&&p.pos.x<r.x1&&p.pos.z>r.z0&&p.pos.z<r.z1)||this.world.gates.some(g=>!g.open&&Math.abs(p.pos.z-g.z)<.4)||this.world.obstacles.some(o=>distance(p.pos,o)<o.r*.8)){p.life=0;break;}
        if(p.source==='player'){
          for(const e of this.enemies)if(!e.dead&&e.zone===this.zone&&!p.hits.has(e.id)&&distance(p.pos,e.pos)<p.radius+e.radius){p.hits.add(e.id);this.hitEnemy(e,p.damage);}
        }else{
          for(const a of [this.player,...this.shadows.filter(a=>!a.dead)])if(distance(p.pos,a.pos)<p.radius+.45){this.damageTarget(a,p.damage,'a spellcaster');p.life=0;break;}
        }
      }
      p.mesh.position.set(p.pos.x,1.05,p.pos.z);p.mesh.rotation.y+=dt*5;p.trail-=dt;
      if(p.trail<0){p.trail=.05;this.fx.burst(p.pos.x,1,p.pos.z,p.color,p.source==='player'?4:1,.3,.045,-.2);}
      if(p.life<=0){this.fx.burst(p.pos.x,1,p.pos.z,p.color,8,2,.045,1);this.fx.release(p.mesh);this.projectiles.splice(i,1);}
    }
    for(let i=this.hazards.length-1;i>=0;i--){const h=this.hazards[i];h.timer-=dt;if(h.timer>0)continue;this.fx.pulse(h.pos.x,h.pos.z,0xf090c9,h.radius,.4);this.fx.burst(h.pos.x,.15,h.pos.z,0xea92dc,32,4,.065,-.3);for(const target of [this.player,...this.shadows.filter(a=>!a.dead)])if(distance(h.pos,target.pos)<h.radius+.3)this.damageTarget(target,h.damage,h.source);this.hazards.splice(i,1);}
  }
  updatePlayer(dt){
    const p=this.player,s=this.stat;for(const key in p.cooldowns)p.cooldowns[key]=Math.max(0,p.cooldowns[key]-dt);
    p.invuln=Math.max(0,p.invuln-dt);p.cast=Math.max(0,p.cast-dt);p.comboGap+=dt;p.chainTime-=dt;if(p.chainTime<=0)p.hitChain=0;
    p.mana=Math.min(s.maxMana,p.mana+s.manaRegen*dt);p.stamina=Math.min(100,p.stamina+(p.dashTime>0?0:27)*dt);
    if(p.attackTimer>0){p.attackTimer=Math.max(0,p.attackTimer-dt);const progress=1-p.attackTimer/p.attackDuration;
      if(progress>.28&&!p.attackHit){p.attackHit=true;this.fx.slash(p.pos.x,p.pos.z,p.angle,p.combo,p.combo===2?3.4:2.8);
        for(const e of this.enemies)if(!e.dead&&e.zone===this.zone&&inArc(p.pos,p.angle,e.pos,(p.combo===2?3.35:2.9)+e.radius*.25,Math.PI*1.35)){
          this.hitEnemy(e,s.damage*(p.combo===2?1.65:1));if(e.kind!=='boss'){const f=FORWARD(p.angle);this.move(e.pos,f.x*.22,f.z*.22,e.radius);}
        }
      }
    }
    if(this.input.attackHeld)this.action('attack');
    const before={...p.pos};
    if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);this.move(p.pos,p.dashVector.x*21*dt,p.dashVector.z*21*dt);this.fx.mist(p.pos.x,p.pos.z,0x8d9bfa,2);}
    else{
      const move=this.input.movement(),n=length(move);if(n>.07){const speed=s.speed*(p.attackTimer>0?.58:1);this.move(p.pos,move.x*speed*dt,move.z*speed*dt);if(p.attackTimer<=0&&p.cast<=0)p.angle+=angleDelta(p.angle,Math.atan2(move.x,move.z))*Math.min(1,dt*18);}
    }
    p.speed=distance(before,p.pos)/Math.max(dt,.001);p.stepTime-=dt;
    if(p.speed>1&&p.stepTime<=0&&p.dashTime<=0){p.stepTime=.32;this.sound.play('step');}
    this.playerModel.root.position.set(p.pos.x,0,p.pos.z);this.playerModel.root.rotation.y=p.angle;
    this.playerModel.animate(this.time,Math.min(8,p.speed),p.attackTimer>0?1-p.attackTimer/p.attackDuration:0,p.combo,0,p.cast);
    this.playerModel.flash(p.invuln>.38?.22:0);
  }
  updateProgress(dt){
    const p=this.player,zone=p.pos.z<-70?2:p.pos.z<-26?1:0;
    if(zone!==this.zone){this.zone=zone;this.ui.banner(`GATE DEPTH / 0${zone+1}`,ZONES[zone].name,ZONES[zone].subtitle,3);if(zone>this.profile.checkpoint){this.profile.checkpoint=zone;this.restore();this.ui.toast('Checkpoint reached · health, essence and potions restored','gold',4);this.save();}}
    if(this.killTimer>0){this.killTimer-=dt;if(this.killTimer<=0){this.profile.victories++;this.cleared.add(2);this.profile.cleared=[...this.cleared];this.mode='won';this.save();this.ui.victory();}return;}
    if(!this.cleared.has(zone)&&zone<2&&!this.enemies.some(e=>e.zone===zone&&!e.dead)){
      if(this.clearTimer<0)this.clearTimer=1;else this.clearTimer-=dt;
      if(this.clearTimer<=0){this.clearTimer=-1;const choices=BOONS.map(b=>({b,r:this.rng()})).sort((a,b)=>a.r-b.r).slice(0,3).map(x=>x.b);
        this.ui.chooseBoon(choices,id=>{this.profile.boons.push(id);this.cleared.add(zone);this.profile.cleared=[...this.cleared];this.refreshStats();this.restore();this.world.openGate(zone);this.ui.banner('SEAL BROKEN','THE WAY OPENS','Your strength is no longer yours alone.',2.4);this.sound.play('level');this.save();});
      }
    }else this.clearTimer=-1;
    this.interaction=null;let near=2.6;
    const consider=(pos,data,r=2.6)=>{const d=distance(p.pos,pos);if(d<r&&d<near){near=d;this.interaction=data;}};
    for(const c of this.world.chests)if(!c.open)consider(c,{kind:'chest',object:c,label:'Open forgotten coffer'});
    for(const t of this.world.tablets)consider(t,{kind:'lore',object:t,label:'Read the memory'});
    consider(this.world.shrine,{kind:'shrine',label:'Use the hunter’s shrine'},2.6);
  }
  interact(){const i=this.interaction;if(!i)return;
    if(i.kind==='chest'){const c=i.object;if(c.open)return;c.open=true;this.profile.opened.push(c.id);this.profile.gold+=20+c.zone*10;this.awardLoot(rollLoot(this.rng,c.zone+this.profile.cycle,c.id===4));this.fx.burst(c.x,.65,c.z,0xffd593,36,2.4,.045,-1);this.player.potions=Math.min(3,this.player.potions+1);this.ui.toast('Coffer claimed · crystals and a recovery potion','gold');this.save();this.interaction=null;}
    if(i.kind==='lore'){if(!this.profile.lore.includes(i.object.id)){this.profile.lore.push(i.object.id);this.profile.gold+=10;this.save();}this.ui.lore(i.object.id);}
    if(i.kind==='shrine')this.ui.shrine();
  }
  updateCamera(dt){
    const p=this.player;
    if(this.mode==='title'){
      const z=this.profile.checkpoint>0?-82:7;const a=Math.sin(this.time*.08)*.25;
      this.view.camera.position.set(-10+Math.sin(a)*5,6.5,z+16);this.view.camera.lookAt(0,2.4,z-5);return;
    }
    const input=this.input,d=input.distance,pitch=input.pitch,yaw=input.yaw;
    const target=new T.Vector3(p.pos.x,1.25,p.pos.z-.5);this.cameraTarget.lerp(target,1-Math.exp(-dt*9));
    const desired=new T.Vector3(this.cameraTarget.x+Math.sin(yaw)*d*Math.cos(pitch),this.cameraTarget.y+Math.sin(pitch)*d,this.cameraTarget.z+Math.cos(yaw)*d*Math.cos(pitch));
    this.cameraPosition.lerp(desired,1-Math.exp(-dt*8));this.view.camera.position.copy(this.cameraPosition);
    if(this.store.settings.shake&&this.shake>0){this.view.camera.position.x+=(this.rng()-.5)*this.shake;this.view.camera.position.y+=(this.rng()-.5)*this.shake*.6;}
    this.view.camera.lookAt(this.cameraTarget);this.view.followLight(p.pos);
  }
  tick(realDT){
    const dt=Math.min(.04,Math.max(0,realDT));this.time+=dt;this.feedbackTimer=Math.max(0,(this.feedbackTimer||0)-dt);
    this.hurt=Math.max(0,this.hurt-dt*2.5);this.shake=Math.max(0,this.shake-dt*.9);
    if(this.mode==='playing'&&!this.ui.modalOpen){
      const sim=this.hitStop>0?dt*.18:dt;this.hitStop=Math.max(0,this.hitStop-dt);
      this.profile.playtime+=sim;this.updatePlayer(sim);for(const e of this.enemies)this.updateEnemy(e,sim);
      this.updateShadows(sim);this.updateProjectiles(sim);
      if(this.mode==='playing')this.updateProgress(sim);
      this.fx.tick(sim);this.saveTimer+=dt;if(this.saveTimer>8){this.saveTimer=0;this.save();}
      this.sound.tick(this.enemies.some(e=>e.active&&!e.dead)?1:0);
    }else if(this.mode==='dead'){
      this.deathTimer-=dt;this.playerModel.animate(this.time,0,0,0,Math.max(.01,1.4-this.deathTimer));this.fx.tick(dt);
      if(this.deathTimer<=0&&!this.ui.modalOpen)this.ui.death();
    }else if(this.mode==='title'){
      this.playerModel.animate(this.time,0);for(const e of this.enemies)if(!e.dead)e.model.animate(this.time,0);this.fx.tick(dt);
    }else if(this.mode==='won')this.fx.tick(dt);
    this.updateCamera(dt);this.world.tick(this.time,dt,this.player.pos);this.ui.tick(dt);this.view.render(this.time,this.hurt);
  }
}
