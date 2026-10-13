import { io } from 'socket.io-client';
import { LEVELS, poseAt } from '../shared/levels.js';
import { clamp } from '../shared/math.js';

// Real-network, input-only release probe. It has no access to a server world,
// debug endpoint, health edit, teleport, checkpoint edit, or level shortcut.
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:3000';
if(!['http:','https:'].includes(new URL(url).protocol))throw new Error('An HTTP game URL is required.');
const clients=[0,1].map(()=>io(url,{forceNew:true,transports:['websocket'],reconnection:false,timeout:60000}));
const request=(socket,event,data={})=>new Promise((resolve,reject)=>socket.timeout(10000).emit(event,data,(error,value)=>error?reject(error):value.ok?resolve(value):reject(new Error(value.error))));
const connected=socket=>new Promise((resolve,reject)=>{if(socket.connected)return resolve();socket.once('connect',resolve);socket.once('connect_error',reject);});
let state=null,room=null,jumpUntil=0,lastJump=-2,waitUntil=0,currentLevel=-1,advancing=false,finish,fail,closed=false;
const snapshots=[new Map(),new Map()],results=[],grabAt=[0,0];let matchingSnapshots=0;
const completion=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
const timeout=setTimeout(()=>fail(new Error('The online campaign did not finish within eight minutes.')),480000);
let timer;
clients.forEach((socket,index)=>socket.on('game:state',snapshot=>{
  const key=snapshot.level+':'+snapshot.tick;
  snapshots[index].set(key,JSON.stringify({players:snapshot.players,heart:snapshot.heart,health:snapshot.health,checkpoint:snapshot.checkpoint}));
  const other=snapshots[1-index].get(key);
  if(other){if(other!==snapshots[index].get(key))fail(new Error('The clients received different authoritative worlds.'));matchingSnapshots++;}
  while(snapshots[index].size>80)snapshots[index].delete(snapshots[index].keys().next().value);
  if(index===0)state=snapshot;
}));
clients[0].on('room:state',async value=>{
  room=value;
  if(value.phase==='reconnecting')return fail(new Error('A verification client disconnected.'));
  if(!['complete','victory'].includes(value.phase)||advancing)return;
  advancing=true;
  try {
    if(!state||state.checkpoint!==2||state.status!=='complete')throw new Error('A chapter completed without verified shared checkpoints.');
    results.push({level:LEVELS[value.level].title,seconds:Math.round(state.time),health:state.health,checkpoints:state.checkpoint,deaths:state.deaths});
    console.log(JSON.stringify(results.at(-1)));
    if(value.phase==='victory'){if(results.length!==5)throw new Error('The full campaign was not completed.');finish();return;}
    await request(clients[0],'game:continue');await request(clients[1],'game:continue');
    advancing=false;
  }catch(error){fail(error);}
});
clients.forEach(socket=>socket.on('room:closed',data=>{if(!closed)fail(new Error(data.reason));}));

try {
  await Promise.all(clients.map(connected));
  const created=await request(clients[0],'room:create',{profile:{name:'QA Oliver',appearance:'boy',color:'#71bfc1'}});
  await request(clients[1],'room:join',{code:created.code,profile:{name:'QA Juniper',appearance:'girl',color:'#ee789a'}});
  await request(clients[0],'player:ready');await request(clients[1],'player:ready');
  console.log('Two independent online clients connected. Carrying all five chapters through real physics.');
  timer=setInterval(()=>{
    if(!state||room?.phase!=='playing'||state.status!=='playing')return;
    if(state.level!==currentLevel){currentLevel=state.level;jumpUntil=0;lastJump=-2;waitUntil=0;}
    const level=LEVELS[state.level],time=state.time,z=(state.players[0].position.z+state.players[1].position.z)/2;
    const surfaces=level.surfaces.map(s=>({...s,...poseAt(s,time,state.collapse[s.id]??null).position}));
    const support=surfaces.filter(s=>z>=s.z-s.d/2-.08&&z<s.z+s.d/2).sort((a,b)=>a.z+a.d/2-b.z-b.d/2)[0];
    if(support){const end=support.z+support.d/2,next=surfaces.filter(s=>s.z-s.d/2>end-.05).sort((a,b)=>a.z-a.d/2-b.z+b.d/2)[0];
      if(next&&end-z<.85&&next.z-next.d/2>end+.05&&time-lastJump>.85){jumpUntil=time+.18;lastJump=time;}}
    for(const obstacle of level.obstacles.filter(o=>['roller','spinner'].includes(o.type))){const pose=poseAt(obstacle,time).position;if(pose.z-z>0&&pose.z-z<1.6&&time-lastJump>1.4){jumpUntil=time+.18;lastJump=time;}}
    const gate=level.obstacles.find(o=>o.type==='timedGate');
    if(gate&&gate.z-z>0&&gate.z-z<2.5&&time%gate.period>gate.period*.58-1.4)waitUntil=time+(gate.period-time%gate.period)+.3;
    const recovering=state.players.some(p=>!p.grabbing);
    state.players.forEach((player,i)=>{
      const side=i?1:-1,pos=player.position;
      const targetZ=recovering?state.heart.position.z:state.gateOpen?level.finish+1:11.5;
      const targetX=(recovering?state.heart.position.x:0)+side*1.12;
      clients[i].emit('game:input',{x:clamp((targetX-pos.x)*2,-.8,.8),z:time<waitUntil?0:clamp((targetZ-pos.z)*1.7,-1,1),balance:!support?.collapse,jump:time<jumpUntil});
      if(!player.grabbing&&Math.hypot(pos.x-state.heart.position.x,pos.z-state.heart.position.z)<2.1&&Date.now()-grabAt[i]>600){grabAt[i]=Date.now();clients[i].emit('game:grab');}
    });
  },1000/30);
  await completion;
  if(matchingSnapshots<20)throw new Error('Insufficient matching client snapshots.');
  console.log(JSON.stringify({result:'PASS',chapters:results.length,matchingAuthoritativeSnapshots:matchingSnapshots,url}));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{closed=true;clearInterval(timer);clearTimeout(timeout);if(clients[0].connected)await request(clients[0],'room:leave').catch(()=>{});clients.forEach(socket=>socket.disconnect());}
