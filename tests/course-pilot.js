import { clamp } from '../shared/math.js';
import { poseAt,routeCenter } from '../shared/levels.js';

// This QA-only driver has the same movement/grab intentions as human players.
export function courseInputs(state,level,memory) {
  const time=state.time,z=(state.players[0].position.z+state.players[1].position.z)/2;
  const surfaces=level.surfaces.map(def=>({...def,...poseAt(def,time,state.collapse[def.id]??null).position}));
  const support=surfaces.filter(s=>z>=s.z-s.d/2-.08&&z<s.z+s.d/2).sort((a,b)=>a.z+a.d/2-b.z-b.d/2)[0];
  let targetZ=state.gateOpen?level.finish+.65:level.pads[0].z;
  let center=state.gateOpen?routeCenter(level,z+1):0,fast=!!support?.collapse;
  const mover=surfaces.find(s=>s.motion?.axis==='x'&&z>s.z-s.d/2-1.2&&z<s.z+s.d/2+.3);
  if(mover)center=mover.x;
  if(support){
    const end=support.z+support.d/2,next=surfaces.filter(s=>s.z-s.d/2>end-.05).sort((a,b)=>a.z-a.d/2-b.z+b.d/2)[0];
    if(next&&end-z<.9&&next.z-next.d/2>end+.05&&time-(memory.lastJump??-2)>.85){memory.jumpUntil=time+.18;memory.lastJump=time;}
  }
  for(const def of level.obstacles){
    const distance=poseAt(def,time).position.z-z;
    if(['roller','spinner'].includes(def.type)&&distance>0&&distance<1.7&&time-(memory.lastJump??-2)>1.3){memory.jumpUntil=time+.18;memory.lastJump=time;}
    if(['timedGate','geyser'].includes(def.type)&&def.z-z>1.2&&def.z-z<4.8){
      const phase=(time+(def.phase||0))%def.period,openFor=def.period*(def.duty??.58);
      if(phase>openFor-1.9)targetZ=Math.min(targetZ,def.z-3.4);
    }
    if(['timedGate','geyser'].includes(def.type)&&Math.abs(def.z-z)<2.7)fast=true;
  }
  if(state.players.some(p=>!p.grabbing)){center=state.heart.position.x;targetZ=state.heart.position.z;}
  return state.players.map((p,i)=>({x:clamp((center+(i?1:-1)*1.12-p.position.x)*2,-.9,.9),
    z:clamp((targetZ-p.position.z)*1.7,-1,1),balance:!fast||z>level.finish-3,jump:time<(memory.jumpUntil||0)}));
}
