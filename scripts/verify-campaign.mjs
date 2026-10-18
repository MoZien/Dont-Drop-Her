import { io } from 'socket.io-client';
import { LEVELS } from '../shared/levels.js';
import { courseInputs } from '../tests/course-pilot.js';

// Real-network, input-only release probe. It has no access to a server world,
// debug endpoint, health edit, teleport, checkpoint edit, or level shortcut.
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:3000';
if(!['http:','https:'].includes(new URL(url).protocol))throw new Error('An HTTP game URL is required.');
const clients=[0,1].map(()=>io(url,{forceNew:true,transports:['websocket'],reconnection:false,timeout:60000}));
const request=(socket,event,data={})=>new Promise((resolve,reject)=>socket.timeout(10000).emit(event,data,(error,value)=>error?reject(error):value.ok?resolve(value):reject(new Error(value.error))));
const connected=socket=>new Promise((resolve,reject)=>{if(socket.connected)return resolve();socket.once('connect',resolve);socket.once('connect_error',reject);});
let state=null,room=null,currentLevel=-1,pilotMemory={},advancing=false,finish,fail,closed=false;
const snapshots=[new Map(),new Map()],results=[],grabAt=[0,0];let matchingSnapshots=0;
const completion=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
const timeout=setTimeout(()=>fail(new Error('The online campaign did not finish within twelve minutes.')),720000);
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
    if(!state||state.checkpoint!==LEVELS[state.level].checkpoints.length||state.status!=='complete')throw new Error('A chapter completed without verified shared checkpoints.');
    results.push({level:LEVELS[value.level].title,seconds:Math.round(state.time),health:state.health,checkpoints:state.checkpoint,deaths:state.deaths});
    console.log(JSON.stringify(results.at(-1)));
    if(value.phase==='victory'){if(results.length!==LEVELS.length)throw new Error('The full campaign was not completed.');finish();return;}
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
  console.log('Two independent online clients connected. Carrying all eight chapters through real physics.');
  timer=setInterval(()=>{
    if(!state||room?.phase!=='playing'||state.status!=='playing')return;
    if(state.level!==currentLevel){currentLevel=state.level;pilotMemory={};}
    const inputs=courseInputs(state,LEVELS[state.level],pilotMemory);
    inputs.forEach((input,i)=>clients[i].emit('game:input',input));
    state.players.forEach((p,i)=>{
      if(!p.grabbing&&Math.hypot(p.position.x-state.heart.position.x,p.position.z-state.heart.position.z)<2.1&&Date.now()-grabAt[i]>600){grabAt[i]=Date.now();clients[i].emit('game:grab');}
    });
  },1000/30);
  await completion;
  if(matchingSnapshots<20)throw new Error('Insufficient matching client snapshots.');
  console.log(JSON.stringify({result:'PASS',chapters:results.length,matchingAuthoritativeSnapshots:matchingSnapshots,url}));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{closed=true;clearInterval(timer);clearTimeout(timeout);if(clients[0].connected)await request(clients[0],'room:leave').catch(()=>{});clients.forEach(socket=>socket.disconnect());}
