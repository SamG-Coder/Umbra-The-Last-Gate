export const ZONES = [
 {id:0,name:'THE FORSAKEN NAVE',subtitle:'Where the unchosen are buried',z:0,x0:-14,x1:14,z0:-17,z1:18,accent:0x4bbdf2,rank:'E',gate:-18,checkpoint:{x:0,z:12},enemies:[['knight',-4,2],['knight',4,-2],['hound',-5,-7],['hound',5,-9],['knight',0,-12],['mage',8,-12]]},
 {id:1,name:'THE SUNKEN CHOIR',subtitle:'Even their prayers learned to hunt',z:-43,x0:-17,x1:17,z0:-61,z1:-27,accent:0x8b69ff,rank:'C',gate:-62,checkpoint:{x:0,z:-29},enemies:[['knight',-6,-36],['hound',5,-37],['mage',-10,-44],['mage',10,-47],['brute',0,-48],['hound',-6,-53],['knight',7,-55]]},
 {id:2,name:'THRONE OF THE HOLLOW KING',subtitle:'No one leaves this place unchanged',z:-86,x0:-18,x1:18,z0:-109,z1:-71,accent:0xe85858,rank:'S',gate:null,checkpoint:{x:0,z:-73},enemies:[['knight',-7,-81],['knight',7,-81],['mage',-9,-92],['boss',0,-99]]}
];
export const WALKABLE = [
 ...ZONES.map(z=>({x0:z.x0,x1:z.x1,z0:z.z0-.9,z1:z.z1+.9})),
 {x0:-4.8,x1:4.8,z0:-29,z1:-15}, {x0:-4.8,x1:4.8,z0:-73,z1:-59}
];
export const ENEMIES = {
 knight:{name:'Hollow sentinel',hp:100,damage:17,speed:2.25,range:2.35,xp:34,gold:12,radius:.6,scale:1,windup:.7,recovery:1.05,color:0x91c7e6},
 hound:{name:'Grave stalker',hp:66,damage:14,speed:3.65,range:1.85,xp:28,gold:10,radius:.55,scale:.95,windup:.6,recovery:.9,color:0x9d87ff},
 mage:{name:'Choir of ash',hp:83,damage:19,speed:1.5,range:13,xp:43,gold:18,radius:.6,scale:1,windup:1.1,recovery:2.6,color:0xcf84ff},
 brute:{name:'Oathless executioner',hp:225,damage:29,speed:1.55,range:3.3,xp:85,gold:35,radius:1,scale:1.5,windup:1.05,recovery:1.65,color:0xe88958},
 boss:{name:'VAEL, THE HOLLOW KING',hp:2400,damage:30,speed:2.3,range:4.2,xp:280,gold:220,radius:1.25,scale:2.25,windup:1,recovery:1.7,color:0xf35b63}
};
export const LORE = [
 {title:'The first name',text:'We called them gates. We thought they were doors. A door does not remember the people who pass through it. This place remembers every one of us.'},
 {title:'A king without a kingdom',text:'Vael was the first to refuse his death. The shadows knelt, and he mistook their obedience for love. He built a throne from every name he could no longer remember.'},
 {title:'The unchosen',text:'The System did not choose you because you were strong. It chose you because you kept walking. There is a difference. Do not let the crown make you forget it.'}
];
export const CHESTS = [{id:0,x:-10,z:8,zone:0},{id:1,x:10,z:-13,zone:0},{id:2,x:-13,z:-51,zone:1},{id:3,x:13,z:-37,zone:1},{id:4,x:13,z:-101,zone:2}];
export const TABLETS = [{id:0,x:10,z:10},{id:1,x:-12,z:-34},{id:2,x:-13,z:-100}];
export const SKILLS = {
 attack:{name:'Twin Fang',key:'LMB',cooldown:.38,cost:0,icon:'sword',desc:'Three-strike combo. Hold to keep attacking.'},
 dash:{name:'Shadow Step',key:'SPACE',cooldown:1.35,cost:25,icon:'dash',desc:'Evade through danger. Uses stamina, grants brief invulnerability.'},
 rift:{name:'Rift Cleave',key:'Q',cooldown:5,cost:23,icon:'rift',desc:'A wide, piercing wave of shadow. Deals 2.2× weapon damage.'},
 extract:{name:'Extract',key:'E',cooldown:1,cost:12,icon:'hand',desc:'Bind a fallen enemy within 5 metres to your shadow roster.'},
 army:{name:'Arise',key:'R',cooldown:24,cost:38,icon:'crown',desc:'Summon your collected shadows for 24 seconds.'},
 potion:{name:'Recovery',key:'1',cooldown:1,cost:0,icon:'drop',desc:'Restore 55% health. Refills when you reach a new checkpoint.'}
};
