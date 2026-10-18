import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics, Simulation } from '../server/simulation.js';
import { LEVELS } from '../shared/levels.js';
import { idleInput, sanitizeInput, cameraMovement } from '../shared/math.js';
import * as THREE from 'three';
import { CameraRig } from '../client/camera.js';
import { Character } from '../client/render/models.js';
import { AudioSystem } from '../client/audio.js';
import { profile, personalize } from '../server/rooms.js';
import { driveCourse } from './driver.js';
import { courseInputs } from './course-pilot.js';

before(async()=>initPhysics());
const run = (sim, steps, inputs = [idleInput(),idleInput()]) => {for(let i=0;i<steps;i++){inputs.forEach((input,p)=>sim.input(p,input));sim.step();}};

test('keyboard and joystick directions match the actual rendered camera after orbiting',()=>{
  for(const yaw of [0,.4,Math.PI/2,-.7]) {
    const camera=new THREE.PerspectiveCamera(),rig=new CameraRig(camera);rig.yaw=yaw;
    for(let i=0;i<5;i++)rig.update({heart:{position:{x:0,y:1.8,z:10}}},1,false);
    camera.updateMatrixWorld();const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
    const forward=camera.getWorldDirection(new THREE.Vector3());forward.y=0;forward.normalize();
    const moveRight=cameraMovement(1,0,yaw),moveForward=cameraMovement(0,1,yaw);
    assert.ok(Math.hypot(moveRight.x-right.x,moveRight.z-right.z)<1e-6);
    assert.ok(Math.hypot(moveForward.x-forward.x,moveForward.z-forward.z)<1e-6);
    assert.ok(Math.hypot(...Object.values(cameraMovement(1,1,yaw)))<=1.00001);
  }
});
test('controls follow the visible camera throughout an unfinished orbit transition',()=>{
  const camera=new THREE.PerspectiveCamera(42,1.7),rig=new CameraRig(camera);
  const state={heart:{position:{x:0,y:1.8,z:2}}};
  rig.update(state,1);rig.orbit(1.8,0);rig.update(state,1/60);camera.updateMatrixWorld();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
  const move=cameraMovement(1,0,rig.viewYaw);
  assert.ok(Math.hypot(move.x-right.x,move.z-right.z)<1e-6);
  assert.ok(Math.abs(rig.viewYaw-rig.yaw)>.1);
  rig.reset();assert.equal(rig.yaw,0);
});
test('portrait camera framing keeps both carriers inside the central play area',()=>{
  for(const aspect of [390/844,390/664,844/390,1280/720]){
    const camera=new THREE.PerspectiveCamera(42,aspect),rig=new CameraRig(camera);
    for(let i=0;i<10;i++)rig.update({heart:{position:{x:0,y:1.8,z:2}}},1);
    camera.updateMatrixWorld();
    for(const x of [-1.65,1.65])for(const y of [0,2.1]){
      const screen=new THREE.Vector3(x,y,2).project(camera);
      assert.ok(Math.abs(screen.x)<.85,`carrier clipped at aspect ${aspect}`);
      assert.ok(Math.abs(screen.y)<.6,`carrier hidden behind the HUD or controls at ${aspect}`);
    }
  }
});
test('character facial reactions retain the small mouth geometry without vertical spikes',()=>{
  for(const appearance of ['boy','girl']){
    const character=new Character({appearance,color:'#71bfc1'});
    const player={position:{x:-1.12,y:.7,z:2},velocity:{x:0,y:0,z:0},grabbing:false,grounded:true,yaw:0};
    for(const balance of [0,.8]){
      character.update(player,1,{status:'playing',balance,heart:{position:{x:0,y:1.8,z:2}}});
      character.group.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(character.mouth);
      assert.ok(bounds.max.y-bounds.min.y<.15);
      assert.ok(bounds.min.y>1&&bounds.max.y<1.5);
    }
    character.dispose();
  }
});
test('both carrying characters face their direction of travel and reach the physical handle',()=>{
  for(const side of[-1,1])for(const yaw of[0,Math.PI/2,Math.PI,-Math.PI/2]){
    const c=new Character({appearance:side<0?'boy':'girl',color:'#71bfc1'});
    const p={position:{x:side*1.12,y:.7,z:2},velocity:{x:Math.sin(yaw)*2,y:0,z:Math.cos(yaw)*2},grabbing:true,grounded:true,yaw};
    const state={status:'playing',balance:0,heart:{position:{x:0,y:1.72,z:2}}},handle=new THREE.Vector3(side*.94,1.72,2);
    for(let i=0;i<120;i++)c.update(p,i/60,state,handle,false,1/60);
    c.group.updateMatrixWorld(true);
    const facing=new THREE.Vector3(0,0,-1).applyQuaternion(c.root.quaternion);facing.y=0;facing.normalize();
    assert.ok(facing.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))>.99);
    assert.ok(Math.min(...c.arms.map(a=>a.hand.getWorldPosition(new THREE.Vector3()).distanceTo(handle)))<.04);
    c.dispose();
  }
});
test('walking uses bent knees, smooth turning and a gait that settles when movement stops',()=>{
  const c=new Character({appearance:'boy',color:'#71bfc1'}),state={status:'playing',balance:0,heart:{position:{x:0,y:1.72,z:2}}};
  const p={position:{x:-1.12,y:.7,z:2},velocity:{x:3,y:0,z:0},grabbing:false,grounded:true,yaw:Math.PI/2};
  const before=c.facing;c.update(p,0,state,null,false,1/60);assert.ok(Math.abs(c.facing-before)<.4);
  for(let i=0;i<60;i++)c.update(p,i/60,state,null,false,1/60);
  assert.ok(c.legs.some(l=>Math.abs(l.shin.quaternion.x-l.thigh.quaternion.x)>.02));
  p.velocity={x:0,y:0,z:0};for(let i=0;i<120;i++)c.update(p,2+i/60,state,null,false,1/60);
  assert.ok(c.speed<.001);c.dispose();
});
test('opening the cooperative arch saves a checkpoint and standing there does not reset the room',()=>{
  const s=new Simulation(),memory={};
  for(let tick=0;tick<800&&!s.gateOpen;tick++){courseInputs(s.snapshot(),s.level,memory).forEach((v,i)=>s.input(i,v));s.step();}
  assert.ok(s.gateOpen);assert.equal(s.checkpoint,1);run(s,1800);
  assert.equal(s.deaths,0);assert.equal(s.health,100);assert.ok(s.players.every(p=>Math.abs(p.body.translation().z-11.5)<1));
  s.damage(100,'regression: an accident after opening the arch');run(s,220);
  assert.equal(s.status,'playing');assert.equal(s.checkpoint,1);assert.ok(s.gateOpen);
  assert.ok(Math.abs(s.heart.translation().z-s.level.checkpoints[0])<.3);s.dispose();
});
test('fractional sustained strain accumulates instead of being silently discarded',()=>{
  const s=new Simulation();for(let i=0;i<200;i++)s.damage(.05,'sustained strain');
  assert.ok(Math.abs(s.health-90)<1e-6);s.damage(NaN,'invalid');s.damage(Infinity,'invalid');assert.ok(Number.isFinite(s.health));s.dispose();
});
test('every arch checkpoint respawns onto a safe place to stand and regroup',()=>{
  for(let i=0;i<LEVELS.length;i++){
    const s=new Simulation(i);s.checkpoint=1;s.gateOpen=true;s.resetAtCheckpoint();run(s,600);
    assert.equal(s.deaths,0,LEVELS[i].title);assert.ok(s.players.every(p=>p.grounded),LEVELS[i].title);assert.ok(s.health>99,LEVELS[i].title);s.dispose();
  }
});
test('an unresolved browser audio-resume promise never blocks starting gameplay',()=>{
  const previousWindow=globalThis.window,previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let audio;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});
  globalThis.window={AudioContext:class { constructor(){this.currentTime=0;this.state='suspended';this.destination={};}createGain(){return{connect(){},gain:{setTargetAtTime(){}}};}resume(){return new Promise(()=>{});} }};
  try {audio=new AudioSystem();assert.equal(audio.unlock(),undefined);assert.ok(audio.context);}
  finally {clearInterval(audio?.musicTimer);globalThis.window=previousWindow;if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else delete globalThis.localStorage;}
});

test('inputs are finite, normalized, and cannot set health or progress',()=>{
  assert.deepEqual(sanitizeInput({x:Infinity,z:NaN,health:0,checkpoint:4,jump:'yes'}),idleInput());
  const input=sanitizeInput({x:99,z:99,jump:true,balance:true});assert.ok(Math.hypot(input.x,input.z)<=1.00001);assert.ok(input.jump);assert.equal(input.health,undefined);
});
test('personal data has bounded text, approved appearance, and color values',()=>{
  assert.equal(profile({name:'x'.repeat(200),color:'javascript:evil',appearance:'dragon'}).name.length,20);
  assert.equal(profile({name:'',color:'javascript:evil',appearance:'dragon'}).appearance,'boy');
  assert.equal(personalize({message:'a'.repeat(400),anniversary:'evil'}).message.length,240);
  assert.equal(personalize({anniversary:'evil'}).anniversary,'');
});
test('the shared heart remains healthy while both carriers stand still in all eight worlds',()=>{
  for(let level=0;level<LEVELS.length;level++){const s=new Simulation(level);run(s,360);assert.equal(s.health,100);assert.ok(s.heart.translation().y>1.5);assert.equal(s.status,'playing');s.dispose();}
});
test('coordinated movement carries one heart and excessive pulling creates instability',()=>{
  const s=new Simulation();run(s,240,[{x:0,z:1,balance:true,jump:false},{x:0,z:1,balance:true,jump:false}]);
  assert.ok(s.heart.translation().z>6);assert.ok(s.health>95);const stable=s.balance;
  run(s,90,[{x:-1,z:0,balance:false,jump:false},{x:1,z:0,balance:false,jump:false}]);
  assert.ok(s.balance>stable+.15 || s.health<90 || s.status==='broken');s.dispose();
});
test('one player cannot open the cooperative arch',()=>{
  const s=new Simulation();run(s,420,[{x:0,z:1,balance:true,jump:false},idleInput()]);assert.equal(s.gateOpen,false);assert.equal(s.checkpoint,0);assert.notEqual(s.status,'complete');s.dispose();
});
test('a grounded partner can rescue a briefly dangling carrier when both balance',()=>{
  const s=new Simulation();run(s,60);s.players[0].body.setTranslation({x:-3.8,y:.25,z:2},true);
  run(s,180,[{x:0,z:0,jump:false,balance:true},{x:0,z:0,jump:false,balance:true}]);
  assert.equal(s.deaths,0);assert.ok(s.players[0].grounded);assert.ok(s.players[0].body.translation().y>.65);s.dispose();
});
test('releasing both handles causes a fall and break with a full checkpoint respawn',()=>{
  const s=new Simulation();s.grab(0);s.grab(1);run(s,300);assert.ok(s.deaths>0||s.health<100);
  s.checkpoint=2;s.damage(100,'test impact');assert.equal(s.status,'broken');run(s,220);assert.equal(s.status,'playing');assert.equal(s.health,100);assert.ok(Math.abs(s.heart.translation().z-24)<.3);assert.ok(s.players.every(p=>p.grabbing));s.dispose();
});
test('completion requires both players holding the heart on the finish platform',()=>{
  const s=new Simulation();s.gateOpen=true;
  s.heart.setTranslation({x:0,y:1.8,z:63},true);
  s.players.forEach((p,i)=>{p.body.setTranslation({x:p.side*1.12,y:.75,z:63},true);p.grabbing=i===0;});
  run(s,90);assert.notEqual(s.status,'complete');s.resetAtCheckpoint();s.dispose();
});
for(let level=0;level<LEVELS.length;level++)test(`both players can finish ${LEVELS[level].title} using movement inputs only`,()=>{
  const s=new Simulation(level);const result=driveCourse(s);s.dispose();assert.equal(result.complete,true,JSON.stringify(result));
});
