import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics, Simulation } from '../server/simulation.js';
import { LEVELS } from '../shared/levels.js';
import { idleInput, sanitizeInput } from '../shared/math.js';
import { profile, personalize } from '../server/rooms.js';
import { driveCourse } from './driver.js';

before(async()=>initPhysics());
const run = (sim, steps, inputs = [idleInput(),idleInput()]) => {for(let i=0;i<steps;i++){inputs.forEach((input,p)=>sim.input(p,input));sim.step();}};

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
test('the shared heart remains healthy while both carriers stand still in all five worlds',()=>{
  for(let level=0;level<5;level++){const s=new Simulation(level);run(s,360);assert.equal(s.health,100);assert.ok(s.heart.translation().y>1.5);assert.equal(s.status,'playing');s.dispose();}
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
  s.checkpoint=1;s.damage(100,'test impact');assert.equal(s.status,'broken');run(s,220);assert.equal(s.status,'playing');assert.equal(s.health,100);assert.ok(Math.abs(s.heart.translation().z-24)<.3);assert.ok(s.players.every(p=>p.grabbing));s.dispose();
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
