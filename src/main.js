import {Game} from './game.js';

const status=document.getElementById('loading-status');
status.textContent='Carving the cathedral and awakening its guardians…';
await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const game=new Game(document.getElementById('game'));
window.addEventListener('resize',()=>game.view.resize());
let last=performance.now(),frames=0,elapsed=0,stopped=false;
function frame(now){
  if(stopped)return;
  const dt=Math.min(.1,(now-last)/1000);last=now;frames++;elapsed+=dt;
  if(elapsed>.5){game.fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
  try{game.tick(dt);}catch(error){
    stopped=true;console.error(error);game.save();
    document.getElementById('fatal-message').textContent=`The game encountered an error: ${error.message}. Your last checkpoint is saved. Reload to try again.`;
    document.getElementById('fatal').classList.remove('hidden');return;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Opt-in development access. This is absent from normal play.
if(new URLSearchParams(location.search).has('dev'))window.umbra=game;
