import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const sphere = new THREE.SphereGeometry(1, 20, 14);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const capsule = new THREE.CapsuleGeometry(1, 1, 4, 12);
const box = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
const materials = new Map();
for(const geometry of [sphere,cylinder,capsule,box])geometry.userData.shared=true;
export function material(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials.has(key)) { const m=new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });m.userData.shared=true;materials.set(key,m); }
  return materials.get(key);
}
export function mesh(geometry, mat, scale = [1, 1, 1], position = [0, 0, 0], parent = null) {
  const m = new THREE.Mesh(geometry, mat); m.scale.set(...scale); m.position.set(...position); m.castShadow = true; m.receiveShadow = true;
  parent?.add(m); return m;
}
export const ball = (mat, scale, position, parent) => mesh(sphere, mat, scale, position, parent);
export const rounded = (mat, scale, position, parent) => mesh(box, mat, scale, position, parent);
export const tube = (mat, scale, position, parent) => mesh(cylinder, mat, scale, position, parent);
const limb = (mat, parent) => mesh(capsule, mat, [0.08, 0.21, 0.08], [0, 0, 0], parent);

export function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.8); s.bezierCurveTo(-0.3, -0.55, -0.95, -0.03, -0.95, 0.44);
  s.bezierCurveTo(-0.95, 1.02, -0.25, 1.02, 0, 0.58); s.bezierCurveTo(0.25, 1.02, 0.95, 1.02, 0.95, 0.44);
  s.bezierCurveTo(0.95, -0.03, 0.3, -0.55, 0, -0.8);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.12, bevelThickness: 0.12, curveSegments: 24 });
  geo.translate(0, -0.09, -0.18); geo.computeVertexNormals(); return geo;
}
const heartGeo = heartGeometry();
heartGeo.userData.shared=true;
export function smallHeart(color = '#ff8ca5', size = 1, parent = null) {
  return mesh(heartGeo, material(color, { roughness: 0.36 }), [size, size, size], [0, 0, 0], parent);
}

export class Character {
  constructor(profile) {
    this.group = new THREE.Group(); this.profile = profile;
    this.skin = material('#f2c8af'); this.dark = material('#323442'); this.white = material('#fff9ee');
    const outfit = material(profile.color), hair = material(profile.appearance === 'girl' ? '#694735' : '#4a3630');
    this.root = new THREE.Group(); this.group.add(this.root);
    this.body = rounded(outfit, [0.67, 0.61, 0.41], [0, 0.91, 0], this.root);
    rounded(material('#faf2e3'), [0.37, 0.12, 0.43], [0, 1.13, 0], this.root);
    const badge = smallHeart('#fff1e3', 0.09, this.root); badge.position.set(0.17, 0.93, -0.219);
    for (let i = 0; i < 2; i++) ball(material('#dcc8a4'), [0.03, 0.03, 0.026], [-0.08, 0.9-i*0.11, -0.22], this.root);
    this.head = new THREE.Group(); this.head.position.y = 1.45; this.root.add(this.head);
    ball(this.skin, [0.43, 0.4, 0.38], [0, 0, 0], this.head);
    for (const side of [-1, 1]) {
      ball(this.skin, [0.1, 0.14, 0.1], [side*0.41, -0.015, 0], this.head);
      ball(material('#e8ab99'), [0.056, 0.08, 0.055], [side*0.455, -0.01, -0.025], this.head);
      ball(this.white, [0.112, 0.132, 0.05], [side*0.16, 0.005, -0.336], this.head);
      ball(this.dark, [0.061, 0.076, 0.043], [side*0.155, 0.005, -0.382], this.head);
      ball(this.white, [0.022, 0.023, 0.02], [side*0.15+0.016, 0.036, -0.417], this.head);
      ball(material('#e89996'), [0.095, 0.043, 0.015], [side*0.25, -0.13, -0.321], this.head);
      const brow = rounded(hair, [0.13, 0.035, 0.035], [side*0.16, 0.17, -0.338], this.head); brow.rotation.z = side*0.08;
      (this.brows ??= []).push(brow);
    }
    ball(this.skin, [0.05, 0.052, 0.065], [0, -0.065, -0.375], this.head);
    this.mouth = ball(material('#a85b66'), [0.075, 0.028, 0.02], [0, -0.2, -0.333], this.head);
    ball(hair, [0.435, 0.24, 0.385], [0, 0.25, 0.02], this.head);
    for (let i = 0; i < 5; i++) {
      const tuft = ball(hair, [0.16, 0.13, 0.13], [-0.31+i*0.15, 0.23+Math.sin(i)*0.04, -0.24], this.head);
      tuft.rotation.z = i*0.17;
    }
    if (profile.appearance === 'girl') {
      for (const side of [-1, 1]) {
        ball(hair, [0.16, 0.36, 0.22], [side*0.35, -0.05, 0.1], this.head);
        ball(hair, [0.19, 0.23, 0.19], [side*0.46, 0.12, 0.1], this.head);
        rounded(outfit, [0.08, 0.15, 0.12], [side*0.4, 0.19, 0.07], this.head);
      }
      const skirt = mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.33, 20), outfit, [1,1,1], [0,0.58,0], this.root);
      for (let i=0;i<7;i++) { const pleat = rounded(material(profile.color, { roughness:0.85 }), [.02,.22,.02], [Math.sin(i*0.9)*.36,.55,Math.cos(i*0.9)*.36], this.root); pleat.rotation.y=i*.9; }
      skirt.receiveShadow = true;
    } else {
      const scarf = rounded(material('#f2c078'), [0.52, 0.09, 0.45], [0, 1.2, 0], this.root);
      scarf.rotation.z = 0.08;
      rounded(material('#f2c078'), [.12,.29,.06], [.16,1.03,-.255], this.root);
      ball(hair, [.12,.2,.15], [-.22,.39,.04], this.head).rotation.z=-.6;
    }
    this.legs = [-1,1].map(side => {
      const g = new THREE.Group(); g.position.set(side*0.18, 0.53, 0); this.root.add(g);
      limb(profile.appearance === 'girl' ? this.skin : material('#4a6670'), g).position.set(0,-.22,0);
      rounded(this.white, [.22,.12,.29], [0,-.43,-.05], g);
      rounded(material('#cc976f'), [.23,.05,.3], [0,-.49,-.05], g);
      for(let i=0;i<2;i++) rounded(material('#e5d4bf'), [.14,.014,.02], [0,-.386,-.12+i*.045], g);
      return g;
    });
    this.arms = [-1,1].map(side => {
      const sleeve = ball(outfit, [.16,.19,.16], [side*.38,1.0,0], this.root);
      return { side, sleeve, upper: limb(this.skin,this.root), lower:limb(this.skin,this.root), hand:ball(this.skin,[.1,.11,.1],[side*.5,.7,0],this.root) };
    });
    this.phase = Math.random()*6;
    // Rigid facial and clothing details can share draw calls while the mouth,
    // eyebrows, head, arms and legs retain their independent animation.
    this.batchParts(this.head, new Set([this.mouth,...this.brows]));
    this.batchParts(this.root, new Set([this.body,...this.arms.flatMap(a=>[a.upper,a.lower,a.hand])]));
  }
  batchParts(parent, excluded) {
    const groups = new Map();
    for(const part of parent.children) {
      if(!part.isMesh || excluded.has(part) || !part.geometry.userData.shared)continue;
      const key=part.geometry.uuid+part.material.uuid;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(part);
    }
    for(const parts of groups.values()) {
      if(parts.length<3)continue;
      const batch=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);
      batch.castShadow=true;batch.receiveShadow=true;
      parts.forEach((part,i)=>{part.updateMatrix();batch.setMatrixAt(i,part.matrix);part.removeFromParent();});
      batch.computeBoundingSphere();parent.add(batch);
    }
  }
  update(player, time, state, target = null, menu = false) {
    const speed = menu ? 0 : Math.hypot(player.velocity.x, player.velocity.z);
    this.group.position.set(player.position.x, player.position.y - 0.7, player.position.z);
    this.root.rotation.y = menu ? -0.35 : player.grabbing ? -0.05 : player.yaw + Math.PI;
    const swing = Math.sin(time*9+this.phase)*Math.min(speed*.15,.55);
    this.legs.forEach((leg,i) => { leg.rotation.x = swing*(i ? -1:1); });
    this.root.position.y = Math.abs(Math.sin(time*9+this.phase))*Math.min(.055,speed*.02);
    this.root.rotation.z = state.status === 'broken' ? Math.sin(time*10)*.15 : state.balance*.07*Math.sin(time*6);
    this.root.rotation.x = player.grounded===false ? player.position.y<.35?-.85:.14 : 0;
    this.head.rotation.z = Math.sin(time*1.8+this.phase)*.035;
    this.head.scale.y = Math.sin(time*.7+this.phase)>0.994 ? .96 : 1;
    this.mouth.scale.y = .028 * (state.balance > .55 ? 2.4 : 1);
    this.brows.forEach((b,i)=> b.rotation.z = state.balance > .55 ? (i ? -1:1)*.25 : (i ? 1:-1)*.08);
    if (state.status === 'complete') { this.root.position.y = Math.abs(Math.sin(time*5))*.2; this.root.rotation.y = Math.sin(time*2)*.12; }
    this.group.updateMatrixWorld(true);
    this.arms.forEach(arm => {
      const shoulder = new THREE.Vector3(arm.side*.39,1.01,0);
      let hand = new THREE.Vector3(arm.side*.48,.63,-.05);
      if (player.grabbing && target && arm.side === (player.position.x < state.heart.position.x ? 1 : -1)) {
        hand = this.root.worldToLocal(target.clone());
      } else if(state.status === 'complete') hand.set(arm.side*.64,1.57,0);
      const delta = hand.clone().sub(shoulder); if(delta.length()>.86) hand.copy(shoulder).add(delta.setLength(.86));
      const elbow = shoulder.clone().lerp(hand,.5); elbow.z-=.11;
      for(const [part,start,end] of [[arm.upper,shoulder,elbow],[arm.lower,elbow,hand]]) {
        part.position.copy(start).lerp(end,.5); const direction=end.clone().sub(start);
        part.scale.set(.08,Math.max(.06,direction.length()/3),.08);
        part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      }
      arm.hand.position.copy(hand);
    });
  }
  dispose() {this.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}
}

export class GlassHeart {
  constructor() {
    this.group = new THREE.Group();
    this.glass = new THREE.MeshPhysicalMaterial({ color:'#ff8baa', roughness:.08, metalness:.03, transmission:.65,
      thickness:.8, ior:1.45, transparent:true, opacity:.92, clearcoat:1, clearcoatRoughness:.05, emissive:'#eb4d83', emissiveIntensity:.11 });
    this.mesh = mesh(heartGeo, this.glass, [1,1,1], [0,0,0], this.group);
    const shine = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color:'#ffd4df', transparent:true, opacity:.09, blending:THREE.AdditiveBlending, depthWrite:false }));
    shine.scale.setScalar(1.07); this.group.add(shine); this.shine=shine;
    this.handles = [-1,1].map(side=> {
      const g=new THREE.Group(); g.position.set(side*.94,0,0); this.group.add(g);
      const hoop=mesh(new THREE.TorusGeometry(.16,.035,8,18), material('#eac489',{metalness:.6,roughness:.3}),[1,1,1],[0,0,0],g); hoop.rotation.y=Math.PI/2;
      return g;
    });
    this.cracks = [];
    for(let i=0;i<9;i++) {
      const x=(i%3-1)*.38, y=.42-Math.floor(i/3)*.33;
      const points=[new THREE.Vector3(x,y,.31),new THREE.Vector3(x+.07,y-.14,.35),new THREE.Vector3(x-.055,y-.27,.32),new THREE.Vector3(x+.14,y-.39,.3)];
      const crack=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#fff6ee',transparent:true,opacity:.85}));
      this.group.add(crack); this.cracks.push(crack);
      const back=crack.clone(); back.position.z=-.68; this.group.add(back); this.cracks.push(back);
    }
    const shadowMat = new THREE.MeshBasicMaterial({color:'#865778', transparent:true,opacity:.12,depthWrite:false});
    this.shadow=mesh(new THREE.CircleGeometry(.85,32),shadowMat,[1.2,.6,1],[0,.02,0]); this.shadow.rotation.x=-Math.PI/2;
    this.mesh.castShadow=true;
  }
  update(state,time) {
    this.group.position.set(state.heart.position.x,state.heart.position.y,state.heart.position.z);
    this.group.quaternion.set(state.heart.rotation.x,state.heart.rotation.y,state.heart.rotation.z,state.heart.rotation.w);
    const pulse=state.health<16?1+Math.sin(time*12)*.05:1+Math.sin(time*2)*.013;
    this.mesh.scale.setScalar(pulse); this.shine.scale.setScalar(pulse*1.06);
    this.cracks.forEach((c,i)=>c.visible=state.health<(i<6?70:i<12?40:16));
    this.glass.emissiveIntensity=state.health<16?.2+Math.max(0,Math.sin(time*12))*.35:.11;
    this.group.visible=state.status!=='broken';
    this.shadow.position.set(state.heart.position.x,.018,state.heart.position.z);
  }
}
