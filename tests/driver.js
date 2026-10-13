import { clamp } from '../shared/math.js';
import { poseAt } from '../shared/levels.js';

// Input-only course runner: no teleports, health edits, or checkpoint writes.
export function driveCourse(sim, maxSeconds = 150) {
  let padDone = false, jumpUntil = 0, lastJump = -2, waitingUntil = 0;
  const trail = [];
  for (let tick = 0; tick < maxSeconds * 60; tick++) {
    const state = sim.snapshot();
    if (tick % 180 === 0) trail.push({ t: Math.round(sim.time), z: Math.round(state.heart.position.z*10)/10, hp: state.health, deaths: state.deaths });
    if (sim.status === 'complete') return { complete: true, seconds: sim.time, deaths: sim.deaths, trail };
    if (sim.status === 'broken') { sim.step(); continue; }
    const z = (state.players[0].position.z+state.players[1].position.z)/2;
    padDone = sim.gateOpen;
    let targetZ = padDone ? sim.level.finish + 1 : 11.5;
    let jump = false;
    const surfaces = sim.level.surfaces.map(s=>({...s,...poseAt(s,sim.time).position}));
    const support = surfaces.filter(s=>z >= s.z-s.d/2-.08 && z < s.z+s.d/2).sort((a,b)=>a.z+a.d/2-b.z-b.d/2)[0];
    if (support) {
      const end = support.z+support.d/2;
      const next=surfaces.filter(s=>s.z-s.d/2 > end-.05).sort((a,b)=>a.z-a.d/2-b.z+b.d/2)[0];
      if(next && end-z<.8 && next.z-next.d/2>end+.05 && sim.time-lastJump>.85){jumpUntil=sim.time+.15;lastJump=sim.time;}
    }
    const rolling=sim.level.obstacles.filter(o=>['roller','spinner'].includes(o.type));
    for(const obstacle of rolling) {
      const pose=poseAt(obstacle,sim.time).position;
      if(pose.z-z>0 && pose.z-z<1.55 && sim.time-lastJump>1.4){jumpUntil=sim.time+.15;lastJump=sim.time;}
    }
    const gate=sim.level.obstacles.find(o=>o.type==='timedGate');
    if(gate && gate.z-z>0 && gate.z-z<2.5) {
      if(sim.time%gate.period>gate.period*.58-1.4)waitingUntil=sim.time+(gate.period-sim.time%gate.period)+.3;
    }
    jump=sim.time<jumpUntil;
    sim.players.forEach((p,i)=> {
      const pos=p.body.translation();
      const targetX=p.side*1.12;
      const dz=targetZ-pos.z;
      sim.input(i,{x:clamp((targetX-pos.x)*2,-.8,.8),z:sim.time<waitingUntil?0:clamp(dz*1.7,-1,1),balance:!support?.collapse,jump});
      if(!p.grabbing && Math.hypot(pos.x-state.heart.position.x,pos.z-state.heart.position.z)<2)sim.grab(i);
    });
    sim.step();
  }
  return { complete:false,state:sim.snapshot(),trail };
}
