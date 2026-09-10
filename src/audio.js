/** Original procedural score and sound design. No audio downloads, no autoplay before consent. */
export class Sound {
 constructor(settings){this.settings=settings;this.ctx=null;this.nextBeat=0;this.beat=0;this.intensity=0;this.rng=31;}
 start(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.settings.volume;this.master.connect(this.ctx.destination);this.fx=this.ctx.createGain();this.fx.gain.value=.7;this.fx.connect(this.master);this.music=this.ctx.createGain();this.music.gain.value=.18;this.music.connect(this.master);const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){this.rng=(1664525*this.rng+1013904223)>>>0;data[i]=(this.rng/4294967296)*2-1;}this.noise=buffer;this.nextBeat=this.ctx.currentTime+.1;}this.ctx.resume().catch(()=>{});this.update();}catch{this.ctx=null;}}
 update(){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.settings.volume,this.ctx.currentTime,.1);this.music.gain.setTargetAtTime(this.settings.music?.16:0,this.ctx.currentTime,.25);}
 tone(freq,duration,vol=.15,type='sine',when=0,target=null,endFreq=null){if(!this.ctx)return;const c=this.ctx,t=Math.max(c.currentTime,c.currentTime+when),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(target||this.fx);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 hiss(duration=.14,volume=.12,freq=1600){if(!this.ctx)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.7;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);s.connect(f);f.connect(g);g.connect(this.fx);s.start();s.stop(c.currentTime+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
 play(name,variant=0){if(!this.ctx)return;
  if(name==='slash'){this.hiss(.13,.25,2300+variant*600);this.tone(220+variant*30,.12,.13,'triangle',0,null,65);}
  else if(name==='hit'){this.tone(100,.16,.22,'triangle',0,null,32);this.hiss(.09,.28,700);this.tone(1400,.12,.055,'sine');}
  else if(name==='hurt'){this.tone(80,.3,.3,'sawtooth',0,null,35);this.hiss(.18,.2,300);}
  else if(name==='dash'){this.hiss(.26,.22,2400);this.tone(180,.2,.11,'sine',0,null,580);}
  else if(name==='rift'){this.hiss(.5,.22,1200);this.tone(70,.5,.28,'triangle',0,null,380);this.tone(740,.6,.06,'sine');}
  else if(name==='extract'||name==='army'){for(let i=0;i<4;i++)this.tone([146.83,220,293.66,440][i],1.3,.12,'sine',i*.09);this.hiss(.6,.1,350);}
  else if(name==='level'||name==='loot'||name==='victory'){for(let i=0;i<5;i++)this.tone([293.66,440,587.33,659.25,880][i],1,.10,'sine',i*.11);}
  else if(name==='warning'){this.tone(110,.3,.11,'sine');this.tone(116.54,.3,.1,'sine');}
  else if(name==='ui')this.tone(740,.07,.035,'sine');
  else if(name==='potion'){this.tone(520,.35,.1,'sine',0,null,1040);this.hiss(.25,.05,3500);}
  else if(name==='step')this.hiss(.045,.025,180);
 }
 tick(combat=0){if(!this.ctx||this.ctx.state!=='running')return;this.intensity=combat;const t=this.ctx.currentTime;if(t>this.nextBeat+1)this.nextBeat=t;while(this.nextBeat<t+.12){const when=this.nextBeat-t,notes=[73.416,65.406,58.270,65.406],root=notes[Math.floor(this.beat/8)%4];if(this.beat%4===0){this.tone(root,3.2,.11,'sine',when,this.music);this.tone(root*1.5,3.1,.055,'triangle',when,this.music);}if(this.beat%2===0)this.tone(root*[4,6,5.3333,8][Math.floor(this.beat/2)%4],1.65,.025,'sine',when,this.music);if(combat>0&&this.beat%2===0)this.tone(55,.22,.14,'sine',when,this.music,25);this.beat++;this.nextBeat+=.47;}}
}
