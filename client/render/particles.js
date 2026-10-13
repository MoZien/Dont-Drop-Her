import * as THREE from 'three';

export class Particles {
  constructor(scene) {
    this.max=220; this.particles=[]; this.geometry=new THREE.BufferGeometry();
    this.positions=new Float32Array(this.max*3); this.colors=new Float32Array(this.max*3);
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
    this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=32;
    const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'#ffffff'); gradient.addColorStop(.25,'#ffffff'); gradient.addColorStop(1,'#ffffff00'); ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
    this.points=new THREE.Points(this.geometry,new THREE.PointsMaterial({size:.14,map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending}));
    this.points.frustumCulled=false;scene.add(this.points);
    this.shards=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.13),new THREE.MeshPhysicalMaterial({color:'#ffafd0',roughness:.1,metalness:.15,transparent:true,opacity:.78}),64);
    this.shards.count=0; this.shardData=[]; this.shards.frustumCulled=false;scene.add(this.shards); this.dummy=new THREE.Object3D();
  }
  burst(position,kind='spark') {
    const count=kind==='complete'?140:kind==='break'?65:35;
    for(let i=0;i<count;i++) {
      const color=new THREE.Color(kind==='complete'?['#ffd899','#ff9fc4','#a4ece0','#fff6d7'][i%4]:'#ffd1df');
      this.particles.push({x:position.x,y:position.y,z:position.z,vx:(Math.random()-.5)*5,vy:Math.random()*5+1,vz:(Math.random()-.5)*5,life:1.3+Math.random()*1.8,color});
    }
    this.particles=this.particles.slice(-this.max);
    if(kind==='break') {
      this.shardData=Array.from({length:64},()=>({position:new THREE.Vector3(position.x+(Math.random()-.5)*1.5,position.y+(Math.random()-.5),position.z+(Math.random()-.5)*.4),velocity:new THREE.Vector3((Math.random()-.5)*5,Math.random()*3,(Math.random()-.5)*5),life:3,spin:Math.random()*6}));
    }
  }
  update(dt,time) {
    this.particles=this.particles.filter(p=>p.life>0);
    this.particles.forEach((p,i)=>{p.life-=dt;p.vy-=dt*2;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      this.positions.set([p.x,p.y,p.z],i*3);this.colors.set([p.color.r*Math.min(1,p.life),p.color.g*Math.min(1,p.life),p.color.b*Math.min(1,p.life)],i*3);});
    this.geometry.setDrawRange(0,this.particles.length);this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;
    this.shardData=this.shardData.filter(p=>p.life>0);
    this.shardData.forEach((p,i)=>{p.life-=dt;p.velocity.y-=dt*7;p.position.addScaledVector(p.velocity,dt);this.dummy.position.copy(p.position);
      this.dummy.rotation.set(time*p.spin,time*p.spin*.4,0);this.dummy.scale.setScalar(Math.min(1,p.life));this.dummy.updateMatrix();this.shards.setMatrixAt(i,this.dummy.matrix);});
    this.shards.count=this.shardData.length;this.shards.instanceMatrix.needsUpdate=true;
  }
}
