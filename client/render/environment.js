import * as THREE from 'three';
import { LEVELS, poseAt } from '../../shared/levels.js';
import { ball, rounded, tube, material, mesh, smallHeart } from './models.js';

const cone = new THREE.ConeGeometry(1,1,8);
const crystal = new THREE.OctahedronGeometry(1);
const petal = new THREE.SphereGeometry(1,8,6);
const stem = new THREE.CylinderGeometry(.014,.018,.35,4);
for(const geometry of [cone,crystal,petal,stem])geometry.userData.shared=true;
const random = seed => { let n=seed; return ()=> { n=(n*1664525+1013904223)>>>0; return n/4294967296; }; };
const line = (points,color,parent,width=.035) => {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve,points.length*8,width,5,false),material(color),[1,1,1],[0,0,0],parent);
};

export class Environment {
  constructor(scene,index=0) {
    this.scene=scene;this.level=LEVELS[index];this.index=index;this.group=new THREE.Group();scene.add(this.group);
    this.dynamic=[];this.pads=[];this.flags=[];this.bobbing=[];this.lanterns=[];
    const theme=this.level.theme;scene.background=new THREE.Color(theme.sky);scene.fog=new THREE.Fog(theme.fog,25,85);
    const path=material(theme.path,{roughness:index===3?.25:.85,metalness:index===3?.12:0});
    const edge=material(index===0?'#b99168':index===3?'#7dbacc':theme.dark);
    for(const def of this.level.surfaces) {
      const g=new THREE.Group();this.group.add(g);const pose=poseAt(def,0);g.position.copy(pose.position);g.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);
      if(def.spin){const radius=Math.max(def.w,def.d)/2;tube(path,[radius,def.h,radius],[0,0,0],g);tube(edge,[radius+.04,.12,radius+.04],[0,-.2,0],g);for(let i=0;i<8;i++){const a=i*Math.PI/4;const stripe=rounded(material('#e6c58f'),[radius*.9,.026,.08],[Math.sin(a)*radius*.5,.26,Math.cos(a)*radius*.5],g);stripe.rotation.y=a+Math.PI/2;}}
      else {rounded(path,[def.w,def.h,def.d],[0,0,0],g);rounded(edge,[def.w+.08,.12,def.d+.06],[0,-.2,0],g);}
      if(index===0 || index===2) {
        const plankMat=material(index===0?'#c3a681':'#9c7b60');
        for(let z=-def.d/2+.35;z<def.d/2;z+=.72) rounded(plankMat,[def.w-.12,.025,.035],[0,.257,z],g);
      }
      if(!def.spin)for(const side of [-1,1]) rounded(material(index===3?'#e0f7f9':'#ffeac7'),[.055,.023,def.d-.25],[side*(def.w/2-.1),.268,0],g);
      if(def.w<4.6 && (index===0 || index===2)) {
        for(const side of [-1,1]) {
          for(let z=-def.d/2+.4;z<def.d/2;z+=2) { tube(edge,[.07,1.2,.07],[side*(def.w/2+.04),.36,z],g);ball(material('#dfc498'),[.095,.095,.095],[side*(def.w/2+.04),.97,z],g); }
          line([[side*def.w/2,.86,-def.d/2+.35],[side*def.w/2,.56,0],[side*def.w/2,.86,def.d/2-.35]],index===2?'#d4bd94':'#e6c394',g,.045);
        }
      }
      if(def.collapse) {
        for(let z=-def.d/2+.2;z<def.d/2;z+=.65) rounded(material('#e5b266'),[def.w-.12,.04,.42],[0,.27,z],g);
      }
      if(def.motion || def.spin || def.sway || def.collapse) this.dynamic.push({def,group:g});
    }
    this.water=mesh(new THREE.PlaneGeometry(120,170,36,50),new THREE.MeshStandardMaterial({color:theme.water,transparent:true,opacity:.8,roughness:.28,metalness:.18}),[1,1,1],[0,-2.3,32],this.group);
    this.water.rotation.x=-Math.PI/2;this.water.castShadow=false;
    const waterPositions=this.water.geometry.attributes.position;this.waterBase=Float32Array.from(waterPositions.array);
    const rand=random(42+index);
    for(let z=-6;z<75;z+=7) {
      for(const side of [-1,1]) {
        const island=new THREE.Group(); island.position.set(side*(7+rand()*3),-1,z);this.group.add(island);
        ball(material(theme.land),[4.5,1.4,5.3],[0,0,0],island);
        ball(material(index===0?'#589476':theme.dark),[4.3,2.1,5.1],[0,-1.1,0],island);
        if(index===0) { this.tree(island,-1,.8,0,1+rand()*.35);this.flowers(island,rand,22); }
        if(index===1) this.kitchenProp(island,z,side);
        if(index===2) { for(let i=0;i<5;i++) ball(material('#f4f1fb'),[1.8+rand(),.8,1.5],[i*.7-1.4,.7+rand()*.3,0],island); }
        if(index===3) { this.pine(island,-.7,.8,0);this.pine(island,1.6,.8,1.3,.7);for(let i=0;i<3;i++)mesh(crystal,material('#b5ecf9',{metalness:.2,roughness:.25}),[.25,.9,.25],[rand()*3-1,.9,rand()*3-1],island); }
        if(index===4) this.castleTower(island,side);
      }
    }
    if(index===0) {
      for(const side of [-1,1]) {
        for(const z of [1,7,26,44,57,63]) {
          this.tree(this.group,side*4.7,0,z,.67);
          const g=new THREE.Group();g.position.set(side*3.1,.1,z-1);this.group.add(g);this.flowers(g,rand,12);
        }
      }
    }
    const spawnArch=this.arch(0,-.1,7,theme.accent,true); this.group.add(spawnArch);
    this.gate=this.arch(0,0,this.level.gateZ,theme.accent,false);this.group.add(this.gate);
    this.gateBars=new THREE.Group();this.gate.add(this.gateBars);
    for(let i=-3;i<=3;i++) rounded(material(theme.dark,{metalness:.4}),[.07,2.1,.07],[i*.45,1.3,0],this.gateBars);
    this.level.pads.forEach((pad,i)=>{
      const g=new THREE.Group();g.position.set(pad.x,.025,pad.z);this.group.add(g);
      const base=mesh(new THREE.CylinderGeometry(.73,.8,.07,40),material(i?'#ee92ac':'#83c7c3',{emissive:i?'#ee92ac':'#83c7c3',emissiveIntensity:.3}),[1,1,1],[0,0,0],g);
      const ring=mesh(new THREE.TorusGeometry(.63,.035,6,40),material('#fff5d5',{emissive:'#fff5d5',emissiveIntensity:.4}),[1,1,1],[0,.052,0],g);ring.rotation.x=Math.PI/2;
      const h=smallHeart('#fff6df',.19,g);h.rotation.x=-Math.PI/2;h.position.y=.08;this.pads.push({g,base,ring});
    });
    this.level.checkpoints.forEach((z,i)=>{
      for(const side of [-1,1]) {
        tube(material('#ad8c6a'),[.045,2.4,.045],[side*2.6,1.2,z],this.group);
        const flagMat=material('#fff0c9').clone();flagMat.userData.shared=false;
        const flag=rounded(flagMat,[.64,.46,.03],[side*2.6+side*.3,2.03,z],this.group);this.flags.push({flag,index:i});
        const h=smallHeart(theme.accent,.13,this.group);h.position.set(side*2.6+side*.3,2.03,z-.035);
        ball(material('#edbe79'),[.11,.11,.11],[side*2.6,2.45,z],this.group);
      }
      const ring=mesh(new THREE.TorusGeometry(1.7,.025,6,48),material('#ffedb0',{emissive:'#ffda84',emissiveIntensity:.3}),[1,1,1],[0,.035,z],this.group);ring.rotation.x=-Math.PI/2;
    });
    this.level.obstacles.forEach(def=>{
      const g=new THREE.Group();this.group.add(g);g.position.set(def.x,def.y,def.z);
      const accent=material(theme.accent);
      if(def.type==='pot') {
        mesh(new THREE.CylinderGeometry(.55,.37,1,20),material('#d08a75'),[1,1,1],[0,-.16,0],g);
        mesh(new THREE.TorusGeometry(.52,.055,8,20),material('#eab299'),[1,1,1],[0,.34,0],g).rotation.x=Math.PI/2;
        this.flowers(g,rand,5,1,.4);
      } else if(def.type==='roller') {
        tube(material('#dbaf79'),[.33,4.5,.33],[0,0,0],g).rotation.z=Math.PI/2;
        for(const side of[-1,1])tube(material('#b27b5e'),[.13,.5,.13],[side*2.45,0,0],g).rotation.z=Math.PI/2;
      } else if(def.type==='spoon') {
        rounded(material('#c6bcb2',{metalness:.75,roughness:.25}),[.16,2.5,.12],[0,.8,0],g);
        ball(material('#c6bcb2',{metalness:.75,roughness:.25}),[.37,.6,.12],[0,-.6,0],g);g.rotation.z=.12;
      } else if(def.type==='snowball') {
        ball(material('#f3fbfa'),[def.w/2,def.h/2,def.d/2],[0,0,0],g);
        for(let i=0;i<6;i++)ball(material('#d9eef1'),[.04,.045,.03],[Math.sin(i)*.5,Math.cos(i)*.3,-.48],g);
      } else if(def.type==='pendulum') {
        line([[0,5,0],[0,1.3,0],[0,.4,0]],theme.dark,g,.035);ball(material('#e7ba80',{metalness:.65,roughness:.3}),[.5,.55,.5],[0,0,0],g);
        smallHeart(theme.accent,.27,g).position.z=-.43;
      } else if(def.type==='timedGate') {
        rounded(material('#705c84',{metalness:.4}),[def.w,def.h,def.d],[0,0,0],g);
        for(let i=-3;i<=3;i++)rounded(material('#d6b78d',{metalness:.5}),[.05,def.h,.45],[i*.9,0,0],g);
      } else if(def.type==='spinner') {
        rounded(accent,[def.w,def.h,def.d],[0,0,0],g);for(const side of[-1,1])ball(material('#ffe0a0'),[.28,.28,.28],[side*def.w/2,0,0],g);
      } else { rounded(accent,[def.w,def.h,def.d],[0,0,0],g); smallHeart('#fff1d6',.2,g).position.z=-.55; }
      this.dynamic.push({def,group:g});
    });
    for(const s of this.level.slippery || []) {
      const puddle=mesh(new THREE.CircleGeometry(1,32),material('#f3c466',{roughness:.1,metalness:.18}),[2.4,s.d/2,1],[0,.018,s.z],this.group);puddle.rotation.x=-Math.PI/2;
    }
    const finish=this.arch(0,0,this.level.finish+1.7,theme.accent,true);this.group.add(finish);
    this.pedestal=new THREE.Group();this.pedestal.position.set(0,0,this.level.finish+.5);this.group.add(this.pedestal);
    tube(material('#e7d5af',{metalness:.2}),[.72,.25,.72],[0,.13,0],this.pedestal);
    tube(material('#fff0c9',{emissive:'#ffe4a1',emissiveIntensity:.2}),[.58,.18,.58],[0,.32,0],this.pedestal);
    if(index===4) {
      const floating=smallHeart('#ffb5d0',.32,this.pedestal);floating.position.y=1.3;this.bobbing.push(floating);
      for(let i=0;i<12;i++) { const star=mesh(crystal,material('#ffe4a2',{emissive:'#ffdc95',emissiveIntensity:.6}),[.11,.2,.11],[Math.cos(i)*3,3+(i%3),Math.sin(i)*3],this.pedestal);this.bobbing.push(star); }
    }
    // Atmospheric motes are one draw call for the whole level.
    const motePositions=new Float32Array(180*3);
    for(let i=0;i<180;i++)motePositions.set([(rand()-.5)*24,rand()*5+.3,rand()*75-5],i*3);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(motePositions,3));
    this.motes=new THREE.Points(geometry,new THREE.PointsMaterial({color:index===3?'#ffffff':'#fff5ca',size:.06,transparent:true,opacity:.6,depthWrite:false}));this.group.add(this.motes);
    this.batchStatic();
  }
  arch(x,y,z,color,flowers) {
    const g=new THREE.Group();g.position.set(x,y,z);
    const stone=material(this.index===4?'#c5a4cf':'#ebd7b0');
    for(const side of[-1,1]) { tube(stone,[.13,2.7,.13],[side*2.25,1.3,0],g);rounded(stone,[.6,.22,.6],[side*2.25,.1,0],g); }
    line([[-2.25,2.65,0],[-1.9,3.3,0],[0,3.9,0],[1.9,3.3,0],[2.25,2.65,0]],this.index===4?'#dbc195':'#dec5a2',g,.12);
    const h=smallHeart(color,.36,g);h.position.set(0,3.48,-.08);
    if(flowers)for(let i=0;i<20;i++) {
      const angle=Math.PI*i/19;const x=Math.cos(angle)*2.22,y=2.65+Math.sin(angle)*1.1;
      ball(material(i%3?'#689b75':'#aac391'),[.17,.24,.11],[x,y,0],g);
      if(i%2===0){ball(material(color),[.16,.13,.15],[x,y,-.16],g);ball(material('#ffe6c8'),[.05,.05,.05],[x,y,-.28],g);}
    }
    return g;
  }
  tree(parent,x,y,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    tube(material('#a07e63'),[.19,2.6,.19],[0,1.15,0],g);
    const rand=random(Math.round((z+200)*11));
    for(let i=0;i<7;i++) {
      const a=i*2.4;ball(material(['#82b49a','#9ac4a0','#6ea88b'][i%3]),[1.1,.9,1.1],[Math.sin(a)*.7,2.6+rand()*.6,Math.cos(a)*.6],g);
      if(i%2===0)ball(material('#f6b6c4'),[.09,.09,.09],[Math.sin(a)*1.5,2.5,Math.cos(a)],g);
    }
  }
  flowers(parent,rand,count,spread=2.5,height=.0) {
    const stems=new THREE.InstancedMesh(stem,material('#619276'),count);
    const petals=new THREE.InstancedMesh(petal,material('#f0a7b8'),count*5);const centers=new THREE.InstancedMesh(petal,material('#ffdb96'),count);
    const d=new THREE.Object3D();for(let i=0;i<count;i++) {
      const x=(rand()-.5)*spread,z=(rand()-.5)*spread,y=height+.23+rand()*.12;
      d.position.set(x,y-.12,z);d.scale.set(1,1,1);d.updateMatrix();stems.setMatrixAt(i,d.matrix);
      for(let j=0;j<5;j++){const a=j/5*Math.PI*2;d.position.set(x+Math.sin(a)*.09,y+.09,z+Math.cos(a)*.09);d.scale.set(.07,.035,.075);d.updateMatrix();petals.setMatrixAt(i*5+j,d.matrix);}
      d.position.set(x,y+.12,z);d.scale.set(.044,.025,.044);d.updateMatrix();centers.setMatrixAt(i,d.matrix);
    }parent.add(stems,petals,centers);
  }
  pine(parent,x,y,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    tube(material('#6a8290'),[.14,1.2,.14],[0,.5,0],g);
    for(let i=0;i<3;i++){mesh(cone,material('#92bac7'),[1.2-i*.25,1.6,1.2-i*.25],[0,1.3+i*.6,0],g);mesh(cone,material('#edf8f4'),[1.04-i*.22,1.2,1.04-i*.22],[0,1.55+i*.6,0],g);}
  }
  kitchenProp(parent,z,side) {
    const g=new THREE.Group();g.position.set(0,.6,0);parent.add(g);
    if(Math.round(z/7)%3===0) {
      const mugMat=material('#e29384');tube(mugMat,[1.6,3,1.6],[0,1.5,0],g);
      tube(material('#765143'),[1.4,.02,1.4],[0,3.02,0],g);
      const handle=mesh(new THREE.TorusGeometry(.85,.19,10,24),mugMat,[1,1,1],[side*1.65,1.8,0],g);handle.rotation.y=Math.PI/2;
      smallHeart('#ffe5cc',.55,g).position.set(0,1.6,-1.53);
    }else if(Math.round(z/7)%3===1) {
      rounded(material('#88b5ac'),[3.3,.7,4.5],[0,.35,0],g);rounded(material('#fff2d5'),[3.1,.55,4.3],[0,.36,0],g);
      for(let i=0;i<5;i++)line([[-1.3,.66,-1.5+i*.6],[0,.76,-1.5+i*.6],[1.3,.66,-1.5+i*.6]],'#d8bda5',g,.018);
    }else {mesh(new THREE.CylinderGeometry(1.9,1.2,1.8,24),material('#99c0c5',{metalness:.3}),[1,1,1],[0,.9,0],g);ball(material('#e7d4b1'),[1.75,.2,1.75],[0,1.8,0],g);}
  }
  castleTower(parent,side) {
    const g=new THREE.Group();g.position.set(0,.5,0);parent.add(g);
    tube(material('#ab98bd'),[1.4,5.5,1.4],[0,2.75,0],g);
    mesh(cone,material('#795d96',{metalness:.2}),[2,2.9,2],[0,6.7,0],g);
    for(let i=0;i<4;i++){rounded(material('#dcc3df'),[.25,.4,.25],[Math.sin(i*Math.PI/2)*1.3,5.45,Math.cos(i*Math.PI/2)*1.3],g);}
    for(let i=0;i<3;i++) {rounded(material('#594c78'),[.56,.85,.06],[0,1.5+i*1.4,-1.4],g);rounded(material('#edc98b',{emissive:'#eabf7a',emissiveIntensity:.45}),[.37,.62,.02],[0,1.5+i*1.4,-1.44],g);}
    const flag=rounded(material('#f2a6c5'),[1.1,.55,.03],[side*.55,8.5,0],g);this.bobbing.push(flag);
  }
  batchStatic() {
    // Original modeled details share geometries and materials, so hundreds of
    // leaves, planks and petals become a handful of GPU instanced draw calls.
    const excluded=new Set([...this.dynamic.map(d=>d.group),this.gateBars,...this.bobbing,...this.flags.map(f=>f.flag)]);
    const groups=new Map();this.group.updateMatrixWorld(true);
    this.group.traverse(object=>{
      if(!object.isMesh||!object.geometry.userData.shared||!object.material.userData.shared)return;
      for(let ancestor=object;ancestor&&ancestor!==this.group;ancestor=ancestor.parent)if(excluded.has(ancestor))return;
      const key=object.geometry.uuid+object.material.uuid;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(object);
    });
    const matrix=new THREE.Matrix4(),worldMatrix=new THREE.Matrix4();
    for(const objects of groups.values()) {
      const count=objects.reduce((sum,o)=>sum+(o.isInstancedMesh?o.count:1),0);if(count<3)continue;
      const instances=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,count);instances.castShadow=true;instances.receiveShadow=true;
      let index=0;
      for(const object of objects) {
        if(object.isInstancedMesh){for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);worldMatrix.copy(object.matrixWorld).multiply(matrix);instances.setMatrixAt(index++,worldMatrix);}object.dispose();}
        else instances.setMatrixAt(index++,object.matrixWorld);
        object.removeFromParent();
      }
      instances.computeBoundingSphere();instances.instanceMatrix.needsUpdate=true;this.group.add(instances);
    }
  }
  update(state,time,dt) {
    this.dynamic.forEach(({def,group})=> {const pose=poseAt(def,state.time,state.collapse[def.id]??null);group.position.copy(pose.position);group.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);});
    this.gateBars.position.y=THREE.MathUtils.lerp(this.gateBars.position.y,state.gateOpen?3:0,Math.min(1,dt*5));
    this.pads.forEach(p=> {p.base.material.emissiveIntensity=state.gateOpen?.6:.2+state.padCharge*.6;p.ring.rotation.z=time*.25;});
    this.flags.forEach(({flag,index})=>flag.material.color.set(index<state.checkpoint?'#abe3bb':'#fff0c9'));
    this.bobbing.forEach((m,i)=> {m.rotation.y=time*.4+i;m.position.y+=Math.sin(time*1.8+i)*dt*.13;});
    this.motes.position.x=Math.sin(time*.15)*.5;
    if(Math.floor(time*20)%3===0){const p=this.water.geometry.attributes.position;for(let i=0;i<p.count;i++)p.array[i*3+2]=Math.sin(this.waterBase[i*3]*.27+time*.8)*.09+Math.cos(this.waterBase[i*3+1]*.34+time)*.08;p.needsUpdate=true;}
  }
  dispose() {
    this.scene.remove(this.group);
    const geometries=new Set(),materials=new Set();
    this.group.traverse(object=>{if(object.isInstancedMesh)object.dispose();if(object.geometry&&!object.geometry.userData.shared)geometries.add(object.geometry);if(object.material&&!object.material.userData.shared)materials.add(object.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
}
