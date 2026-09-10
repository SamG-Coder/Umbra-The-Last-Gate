/** Deterministic, renderer-independent game rules. Distances are metres; timers are seconds. */
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const distance = (a, b) => Math.hypot(a.x-b.x, a.z-b.z);
export const angleDelta = (a, b) => Math.atan2(Math.sin(b-a), Math.cos(b-a));
export function seeded(seed = 87314) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const nextLevelXP = level => Math.round(65 + Math.pow(Math.max(1, level), 1.35) * 33);
export function gainXP(profile, amount) {
  profile.xp += Math.max(0, amount); let levels = 0;
  while (profile.xp >= nextLevelXP(profile.level) && profile.level < 99) {
    profile.xp -= nextLevelXP(profile.level); profile.level++; profile.points += 2; levels++;
  }
  return levels;
}
export function stats(profile) {
  const a = profile.attributes, w = profile.equipment.weapon, armor = profile.equipment.armor;
  const boons = profile.boons || [];
  const count = id => boons.filter(b => b === id).length;
  return {
    maxHP: 150 + (profile.level-1)*12 + a.vitality*18 + count('vitality')*45,
    maxMana: 100 + a.spirit*12 + count('reservoir')*30,
    maxStamina: 100,
    damage: (22 + a.strength*4 + w.power) * (1 + count('fury')*.2),
    armor: armor.power + a.vitality*.55,
    speed: 6.0 + count('celerity')*.65,
    crit: Math.min(.65, .12 + a.agility*.022 + count('precision')*.12),
    manaRegen: 5.8 + a.spirit*.6 + count('reservoir')*1.6,
    lifesteal: count('hunger')*.035,
    shadowDamage: 11 + a.spirit*2 + count('dominion')*7,
    shadowLimit: Math.min(6, 3 + Math.floor(a.spirit/4) + count('dominion')),
    cooldown: Math.max(.45, 1 - a.agility*.018 - count('celerity')*.1),
    potionHealing: .55
  };
}
export function applyDamage(raw, armor=0) { return Math.max(1, Math.round(Math.max(0, raw) * (100 / (100 + Math.max(0, armor)*3)))); }
export function inArc(origin, facing, target, range, arc = Math.PI*1.25) {
  const d = distance(origin, target); if (d > range) return false;
  return d < .65 || Math.abs(angleDelta(facing, Math.atan2(target.x-origin.x, target.z-origin.z))) <= arc*.5;
}
export function moveCircle(pos, delta, radius, walkable, obstacles, gates=[]) {
  // Small steps prevent high-speed dashes tunnelling through pillars or sealed gates.
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x,delta.z)/.22));
  const sx = delta.x/steps, sz = delta.z/steps;
  const legal = (x,z) => {
    if (!walkable.some(r => x >= r.x0+radius && x <= r.x1-radius && z >= r.z0+radius && z <= r.z1-radius)) return false;
    for (const o of obstacles) if (Math.hypot(x-o.x,z-o.z) < radius+o.r) return false;
    for (const g of gates) if (!g.open && Math.abs(z-g.z)<radius+.32 && x>g.x0-radius && x<g.x1+radius) return false;
    return true;
  };
  for (let i=0;i<steps;i++) { if (legal(pos.x+sx,pos.z)) pos.x+=sx; if (legal(pos.x,pos.z+sz)) pos.z+=sz; }
  return pos;
}
export const BOONS = [
 {id:'fury',name:'Killing intent',tag:'OFFENCE',desc:'Deal 20% more weapon damage. Your third strike becomes devastating.',icon:'sword'},
 {id:'hunger',name:'Blood covenant',tag:'SUSTAIN',desc:'Restore 3.5% of all damage you deal as health.',icon:'drop'},
 {id:'dominion',name:'Sovereign’s will',tag:'SHADOWS',desc:'Command one additional shadow. Shadows deal +7 damage.',icon:'crown'},
 {id:'celerity',name:'Phantom step',tag:'AGILITY',desc:'Move faster. Skill and dodge cooldowns are reduced by 10%.',icon:'dash'},
 {id:'vitality',name:'Refuse the grave',tag:'SURVIVAL',desc:'Gain 45 maximum health and immediately restore your health.',icon:'heart'},
 {id:'reservoir',name:'Abyssal reservoir',tag:'ESSENCE',desc:'Gain 30 maximum essence and regenerate essence faster.',icon:'rift'},
 {id:'precision',name:'Executioner’s eye',tag:'CRITICAL',desc:'Gain 12% critical strike chance. Critical hits deal double damage.',icon:'eye'}
];
export function freshProfile() { return {
  version: 1, level: 1, xp: 0, points: 0, gold: 0, cycle: 0, checkpoint: 0,
  attributes: {strength:0, vitality:0, agility:0, spirit:0}, boons:[],
  equipment: {weapon:{id:'starter-blade',slot:'weapon',name:'Hunter’s twin blades',rarity:0,power:0},armor:{id:'starter-coat',slot:'armor',name:'Threadbare hunter’s coat',rarity:0,power:2}},
  inventory:[], shadows:[], opened:[], cleared:[], kills:0, bestCombo:0, victories:0, deaths:0, playtime:0, lore:[],
}; }
export const RARITIES = ['Worn','Tempered','Rare','Epic','Relic'];
export const RARITY_COLORS = ['#a8b6c5','#9ccbac','#71b9ff','#b58bff','#e4bf75'];
export function rollLoot(rng, tier=0, guaranteed=false) {
  const rarity = guaranteed ? Math.min(4,2+tier) : clamp(Math.floor(rng()*3)+Math.floor(tier/2),0,4);
  const slot = rng() < .65 ? 'weapon' : 'armor';
  const names = slot === 'weapon' ? ['Graveglass daggers','Nightsunder','Oathbreaker’s edge','Moonless promise','The king’s silence'] : ['Duskweave mantle','Hollow sentinel plate','Shroud of the fallen','The forsaken oath','Vestment of midnight'];
  return {id:`${slot}-${Math.floor(rng()*1e9)}`,slot,name:names[rarity],rarity,power:Math.round((slot==='weapon'?4:3)+rarity*(slot==='weapon'?6:3)+tier*2)};
}
export function sanitiseProfile(raw) {
  const p = freshProfile();
  if (!raw || raw.version !== 1 || typeof raw !== 'object') return null;
  const finite = (v,d,lo,hi) => Number.isFinite(v) ? clamp(Math.floor(v),lo,hi) : d;
  for (const key of ['level','xp','points','gold','cycle','checkpoint','kills','bestCombo','victories','deaths','playtime']) p[key] = finite(raw[key],p[key],key==='level'?1:0,key==='checkpoint'?2:key==='level'?99:key==='cycle'?50:1e8);
  for (const k of Object.keys(p.attributes)) p.attributes[k] = finite(raw.attributes?.[k],0,0,200);
  const item = x => x && typeof x==='object' && ['weapon','armor'].includes(x.slot) && typeof x.name==='string' && x.name.length<=70 && typeof x.id==='string' && x.id.length<=100 && Number.isFinite(x.power);
  const clean = x => ({id:x.id,slot:x.slot,name:x.name,rarity:finite(x.rarity,0,0,4),power:finite(x.power,0,0,500)});
  for (const k of ['weapon','armor']) if (item(raw.equipment?.[k]) && raw.equipment[k].slot===k) p.equipment[k]=clean(raw.equipment[k]);
  p.inventory = Array.isArray(raw.inventory) ? raw.inventory.filter(item).slice(0,30).map(clean) : [];
  p.boons = Array.isArray(raw.boons) ? raw.boons.filter(x=>BOONS.some(b=>b.id===x)).slice(0,100) : [];
  p.shadows = Array.isArray(raw.shadows) ? raw.shadows.filter(x=>['knight','hound','mage','brute','boss'].includes(x)).slice(0,6) : [];
  p.opened = Array.isArray(raw.opened) ? raw.opened.filter(Number.isInteger).slice(0,30) : [];
  p.cleared = Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter(x=>Number.isInteger(x)&&x>=0&&x<=2))] : [];
  p.lore = Array.isArray(raw.lore) ? raw.lore.filter(Number.isInteger).slice(0,20) : [];
  return p;
}
