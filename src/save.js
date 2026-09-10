import {sanitiseProfile} from './rules.js';
const KEY = 'umbra-last-gate-v1';
export const DEFAULT_SETTINGS = {quality:'high',volume:.42,music:true,shake:true,damageNumbers:true,difficulty:'normal',showFPS:false};
export class SaveStore {
 constructor(){this.available=true;this.error=null;this.settings={...DEFAULT_SETTINGS};try{const v=JSON.parse(localStorage.getItem(KEY+'-settings')||'null');if(v&&typeof v==='object'){for(const k of Object.keys(DEFAULT_SETTINGS))if(typeof v[k]===typeof DEFAULT_SETTINGS[k])this.settings[k]=v[k];if(!['low','medium','high','ultra'].includes(this.settings.quality))this.settings.quality='high';if(!['story','normal','hard'].includes(this.settings.difficulty))this.settings.difficulty='normal';this.settings.volume=Math.max(0,Math.min(1,this.settings.volume));}}catch{this.available=false;}}
 load(){try{return sanitiseProfile(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return null;}}
 save(profile){try{localStorage.setItem(KEY,JSON.stringify(profile));this.error=null;return true;}catch(e){this.available=false;this.error=e.message;return false;}}
 saveSettings(){try{localStorage.setItem(KEY+'-settings',JSON.stringify(this.settings));}catch{this.available=false;}}
 clear(){try{localStorage.removeItem(KEY);}catch{}}
 export(profile){const blob=new Blob([JSON.stringify({game:'umbra-the-last-gate',profile},null,2)],{type:'application/json'});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='Umbra-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 async import(file){if(!file||file.size>250000)throw new Error('Choose an Umbra save file smaller than 250 KB.');const obj=JSON.parse(await file.text());const profile=sanitiseProfile(obj.profile);if(obj.game!=='umbra-the-last-gate'||!profile)throw new Error('This is not a valid Umbra save.');return profile;}
}
