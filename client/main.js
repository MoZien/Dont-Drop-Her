import './styles.css';
import { World } from './render/world.js';
import { Network } from './network.js';
import { Input } from './input.js';
import { AudioSystem } from './audio.js';
import { UI } from './ui.js';

const root=document.getElementById('app');
try {
  const world=new World(document.getElementById('world'));
  const audio=new AudioSystem();
  const network=new Network();
  const ui=new UI(root,network,audio,world);
  const input=new Input(world.canvas,world.rig,action=> {if(action==='pause'&&root.querySelector('.modal-backdrop'))ui.action('close-modal');else if(action==='pause'&&network.room)ui.action('pause');else if(action==='grab')network.request('game:grab');});
  ui.onScreen=screen=> {input.enabled=screen==='playing';if(!input.enabled)input.reset();input.bindControls(root);};
  world.onContextLost=()=>ui.toast('The graphics paused. If they do not return, refresh to reconnect to your room.');
  let last=performance.now(),lastSend=0,lastTick=0,previousLevel=-1,lastEvent=0,lastCelebration=0;
  network.on('state',state=>{
    if(state.level!==previousLevel || state.tick<lastTick){lastEvent=0;previousLevel=state.level;}lastTick=state.tick;
    for(const event of state.events){if(event.id<=lastEvent)continue;lastEvent=event.id;audio.event(event.type);world.event(event);if(event.message&&!['break','complete','jump'].includes(event.type))ui.toast(event.message);}
  });
  const loop=now=>{
    requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
    const state=network.interpolate();const phase=network.room?.phase;
    const menu=!phase||['lobby','countdown'].includes(phase)||ui.screen==='setup';
    world.render(menu?null:state,dt,now/1000,menu);
    if(now-lastSend>1000/30){lastSend=now;network.input(input.sample());}
    if(phase==='victory'&&now-lastCelebration>2000){lastCelebration=now;world.particles.burst(world.heart.group.position,'complete');}
    audio.update(phase==='playing'?state:null,now);ui.tick();
  };
  requestAnimationFrame(loop);
  document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
  document.addEventListener('contextmenu',e=>{if(!['INPUT','TEXTAREA'].includes(e.target.tagName))e.preventDefault();});
} catch(error) {
  console.error(error);
  const wrapper=document.createElement('div');wrapper.className='fatal';
  wrapper.innerHTML=`<div><h1>A little graphics hiccup.</h1><p>This adventure needs WebGL. Try a current Safari, Chrome, or Firefox browser with graphics acceleration enabled.</p><button class="button primary" id="retry">Try again</button></div>`;
  document.body.append(wrapper);wrapper.querySelector('#retry').addEventListener('click',()=>location.reload());
}
