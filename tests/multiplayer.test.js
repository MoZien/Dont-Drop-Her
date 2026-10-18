import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { createApp } from '../server/app.js';
import { driveCourse } from './driver.js';
import { LEVELS } from '../shared/levels.js';

const event = (socket,name,predicate=()=>true)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(name,handler);reject(new Error(`Timed out waiting for ${name}`));},5000);
  const handler=value=>{if(!predicate(value))return;clearTimeout(timer);socket.off(name,handler);resolve(value);};socket.on(name,handler);
});
const request = (socket,name,data={})=>new Promise((resolve,reject)=>socket.timeout(3000).emit(name,data,(error,response)=>error?reject(error):resolve(response)));
async function fixture() {
  let clock=10000;
  const server=await createApp({tick:false,now:()=>clock});
  await new Promise(resolve=>server.http.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.http.address().port}`;
  const sockets=[];
  const connect=async(options={})=>{const socket=io(url,{forceNew:true,reconnection:false,transports:['websocket'],...options});sockets.push(socket);await event(socket,'connect');return socket;};
  return {server,url,connect,advance(ms){clock+=ms;server.rooms.step();},async close(){sockets.forEach(s=>s.disconnect());await server.close();}};
}

test('two independent clients create, join, ready, synchronize, and advance with both votes',async()=>{
  const f=await fixture();try {
    const a=await f.connect(),b=await f.connect(),third=await f.connect();
    const created=await request(a,'room:create',{profile:{name:'Oliver',color:'#71bfc1'},story:{message:'Our private note',anniversary:'2024-05-10'}});assert.ok(created.ok);assert.match(created.code,/^[A-Z2-9]{6}$/);
    const joined=await request(b,'room:join',{code:created.code.toLowerCase(),profile:{name:'Juniper',appearance:'girl'}});assert.ok(joined.ok);assert.equal(joined.index,1);
    assert.equal((await request(third,'room:join',{code:created.code})).ok,false);
    await request(a,'player:ready');assert.equal(f.server.rooms.rooms.get(created.code).phase,'lobby');
    await request(b,'player:ready');f.advance(4001);assert.equal(f.server.rooms.rooms.get(created.code).phase,'intro');f.advance(6501);
    const room=f.server.rooms.rooms.get(created.code);assert.equal(room.phase,'playing');
    const sa=event(a,'game:state',s=>s.status==='complete'),sb=event(b,'game:state',s=>s.status==='complete');
    const ra=driveCourse(room.sim);assert.ok(ra.complete);f.server.rooms.step();
    const [stateA,stateB]=await Promise.all([sa,sb]);assert.deepEqual(stateA,stateB);assert.equal(stateA.checkpoint,LEVELS[0].checkpoints.length);assert.equal(stateA.status,'complete');
    await request(a,'game:continue');assert.equal(room.phase,'complete');await request(b,'game:continue');assert.equal(room.phase,'intro');assert.equal(room.sim.levelIndex,1);
    for(let level=1;level<LEVELS.length;level++){
      f.advance(6501);assert.ok(driveCourse(room.sim).complete);f.server.rooms.step();assert.equal(room.phase,level===LEVELS.length-1?'victory':'complete');
      if(level<LEVELS.length-1){await request(a,'game:continue');await request(b,'game:continue');}
    }
    assert.equal(room.results.length,LEVELS.length);assert.ok(room.results.every(r=>r.time>0));
    assert.equal(room.story.message,'Our private note');await request(a,'game:continue');await request(b,'game:continue');assert.equal(room.sim.levelIndex,0);assert.equal(room.phase,'intro');assert.deepEqual(room.results,[]);
  } finally {await f.close();}
});

test('disconnection freezes physics, validates private reconnect tokens, and resumes the same player',async()=>{
  const f=await fixture();try{
    const a=await f.connect(),b=await f.connect();const created=await request(a,'room:create');const joined=await request(b,'room:join',{code:created.code});
    await request(a,'player:ready');await request(b,'player:ready');f.advance(4001);f.advance(6501);
    const room=f.server.rooms.rooms.get(created.code);const notice=event(a,'room:state',r=>r.phase==='reconnecting');b.disconnect();const disconnected=await notice;assert.equal(disconnected.phase,'reconnecting');
    const before=room.sim.snapshot();f.advance(5000);assert.deepEqual(room.sim.snapshot(),before);
    const recovered=await f.connect();assert.equal((await request(recovered,'room:resume',{code:created.code,token:'x'.repeat(48)})).ok,false);
    assert.equal((await request(recovered,'room:resume',{code:created.code,token:joined.token})).ok,true);assert.equal(room.phase,'playing');assert.equal(room.players[1].profile.name,'Juniper');
    const pause=await request(a,'game:pause');assert.ok(pause.ok);assert.equal(room.phase,'paused');await request(recovered,'game:pause');assert.equal(room.phase,'playing');
  }finally{await f.close();}
});

test('health, checkpoints, level and completion cannot be written by a client',async()=>{
  const f=await fixture();try{
    const a=await f.connect(),b=await f.connect();const created=await request(a,'room:create');await request(b,'room:join',{code:created.code});
    await request(a,'player:ready');await request(b,'player:ready');f.advance(4001);f.advance(6501);
    await request(a,'game:input',{health:1000,checkpoint:2,level:4,status:'complete',x:1e99,z:1e99});
    const room=f.server.rooms.rooms.get(created.code);assert.equal(room.sim.health,100);assert.equal(room.sim.checkpoint,0);assert.equal(room.sim.levelIndex,0);assert.equal(room.sim.status,'playing');
    assert.ok(Math.hypot(room.sim.inputs[0].x,room.sim.inputs[0].z)<=1.00001);assert.equal((await request(a,'game:continue')).ok,false);
    assert.equal((await request(b,'room:personalize',{message:'Hacked'})).ok,false);
  }finally{await f.close();}
});
test('a valid private token transfers a seat during a stale mobile socket without resetting the game',async()=>{
  const f=await fixture();try {
    const a=await f.connect(),b=await f.connect();const created=await request(a,'room:create');const joined=await request(b,'room:join',{code:created.code});
    await request(a,'player:ready');await request(b,'player:ready');f.advance(4001);f.advance(6501);
    const room=f.server.rooms.rooms.get(created.code),before=room.sim.snapshot();
    const replacement=await f.connect(),replaced=event(b,'session:replaced');
    assert.equal((await request(replacement,'room:resume',{code:created.code,token:joined.token})).ok,true);
    assert.ok((await replaced).reason);assert.equal(room.players[1].socketId,replacement.id);assert.equal(room.phase,'playing');assert.deepEqual(room.sim.snapshot(),before);
  }finally{await f.close();}
});

test('rooms isolate private notes and broadcasts and never expose reconnect tokens',async()=>{
  const f=await fixture();try{
    const a=await f.connect(),b=await f.connect(),other=await f.connect();const r=await request(a,'room:create',{story:{message:'Only for us'}});
    const alien=await request(other,'room:create',{story:{message:'A different couple'}});await request(b,'room:join',{code:r.code});
    assert.notEqual(alien.code,r.code);assert.equal(alien.room.story.message,'A different couple');assert.equal(JSON.stringify(r.room).includes(r.token),false);
    const broadcasts=[];other.on('room:state',state=>broadcasts.push(state));await request(a,'room:personalize',{message:'A secret updated note'});
    await request(other,'player:ready');assert.ok(broadcasts.every(state=>state.code===alien.code));
    const closed=event(b,'room:closed');await request(a,'room:leave');assert.ok((await closed).reason);assert.ok(f.server.rooms.rooms.has(alien.code));
  }finally{await f.close();}
});

test('expired reconnect reservations release the room and stale tokens cannot return',async()=>{
  const f=await fixture();try{
    const a=await f.connect();const r=await request(a,'room:create');a.disconnect();await new Promise(resolve=>setTimeout(resolve,20));f.advance(120001);
    assert.equal(f.server.rooms.rooms.has(r.code),false);const b=await f.connect();assert.equal((await request(b,'room:resume',{code:r.code,token:r.token})).ok,false);
  }finally{await f.close();}
});

test('HTTP health exposes release identity and hostile websocket origins are rejected',async()=>{
  const f=await fixture();try{
    const response=await fetch(`${f.url}/health`);assert.equal(response.status,200);assert.equal((await response.json()).game,'Dont-Drop-Her');assert.equal(response.headers.get('x-powered-by'),null);
    const hostile=io(f.url,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:'https://unrelated.example'}});
    await event(hostile,'connect_error');assert.equal(hostile.connected,false);hostile.disconnect();
  }finally{await f.close();}
});
