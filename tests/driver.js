import { courseInputs } from './course-pilot.js';

export function driveCourse(sim,maxSeconds=240) {
  const memory={},trail=[];
  for(let tick=0;tick<maxSeconds*60;tick++){
    const state=sim.snapshot();
    if(tick%180===0)trail.push({t:Math.round(sim.time),z:Math.round(state.heart.position.z*10)/10,hp:Math.round(state.health),deaths:state.deaths});
    if(state.status==='complete')return{complete:true,seconds:sim.time,deaths:sim.deaths,trail};
    if(state.status==='playing'){
      courseInputs(state,sim.level,memory).forEach((input,i)=>sim.input(i,input));
      state.players.forEach((p,i)=>{if(!p.grabbing&&Math.hypot(p.position.x-state.heart.position.x,p.position.z-state.heart.position.z)<2.1)sim.grab(i);});
    }
    sim.step();
  }
  return{complete:false,state:sim.snapshot(),trail};
}
