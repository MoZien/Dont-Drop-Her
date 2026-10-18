import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraRig } from '../camera.js';
import { Character, GlassHeart } from './models.js';
import { Environment } from './environment.js';
import { Particles } from './particles.js';

export class World {
  constructor(canvas) {
    this.canvas=canvas;this.scene=new THREE.Scene();this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
    this.camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,140);this.camera.position.set(8,6,-9);this.rig=new CameraRig(this.camera);
    this.ambient=new THREE.HemisphereLight('#fffaeb','#709789',1.5);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff0da',2.4);this.sun.position.set(-8,14,-4);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-13;this.sun.shadow.camera.right=13;this.sun.shadow.camera.top=13;this.sun.shadow.camera.bottom=-13;
    this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=38;this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.035;this.scene.add(this.sun,this.sun.target);
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.envMap=pmrem.fromScene(room,.04);this.scene.environment=this.envMap.texture;this.scene.environmentIntensity=.3;room.dispose();pmrem.dispose();
    this.heart=new GlassHeart();this.scene.add(this.heart.group,this.heart.shadow);
    this.playerMarker=new THREE.Mesh(new THREE.RingGeometry(.42,.5,32),new THREE.MeshBasicMaterial({color:'#fff5c4',transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide}));
    this.playerMarker.rotation.x=-Math.PI/2;this.scene.add(this.playerMarker);this.localPlayer=0;
    this.particles=new Particles(this.scene);this.characters=[];this.level=-1;this.loadLevel(0);
    this.setProfiles([{name:'Oliver',color:'#71bfc1',appearance:'boy'},{name:'Juniper',color:'#ee789a',appearance:'girl'}]);
    this.frames=0;this.frameTime=0;this.autoLow=false;this.quality=localStorage.getItem('ddh-quality')||'auto';this.applyQuality();
    window.addEventListener('resize',()=>this.resize());this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onContextLost?.();});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  resize() { this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix(); }
  loadLevel(index) { if(this.level===index)return;this.environment?.dispose();this.environment=new Environment(this.scene,index);this.level=index;
    this.sun.color.set(index>=6?'#d2dfff':'#fff0da');this.ambient.intensity=index>=6?1.15:1.5;document.body.dataset.level=String(index); }
  setProfiles(profiles) {
    const key=JSON.stringify(profiles);if(this.profileKey===key)return;this.profileKey=key;
    this.characters.forEach(c=>{this.scene.remove(c.group);c.dispose();});this.characters=profiles.map(p=>new Character(p));this.characters.forEach(c=>this.scene.add(c.group));
  }
  setQuality(value) {this.quality=value;this.autoLow=false;this.frames=0;this.frameTime=0;localStorage.setItem('ddh-quality',value);this.applyQuality();}
  applyQuality() {
    const low=this.quality==='low'||this.autoLow;
    const mobile=matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:this.quality==='high'?2:mobile?1.25:1.6));
    this.renderer.shadowMap.enabled=!low;
    // Any nonzero transmission causes an additional scene render. Omit that
    // pass on low quality while retaining the polished glass highlights.
    this.heart.glass.transmission=low?0:.65;this.heart.glass.opacity=low?1:.92;this.heart.glass.needsUpdate=true;
    this.heart.shine.visible=!low;
    this.renderer.setSize(innerWidth,innerHeight);
  }
  render(state,dt,time,menu=false) {
    if(!state) state={level:0,time,status:'playing',health:100,balance:.02,checkpoint:0,gateOpen:false,padCharge:0,collapse:{},
      players:[{position:{x:-1.12,y:.7,z:2},velocity:{x:0,y:0,z:0},grabbing:true,yaw:0},{position:{x:1.12,y:.7,z:2},velocity:{x:0,y:0,z:0},grabbing:true,yaw:0}],
      heart:{position:{x:0,y:1.8+Math.sin(time*1.4)*.025,z:2},rotation:{x:0,y:0,z:Math.sin(time)*.012,w:1}}};
    this.loadLevel(state.level);this.heart.update(state,time);this.heart.group.updateMatrixWorld(true);
    this.characters.forEach((c,i)=> {const handle=this.heart.handles[i].getWorldPosition(new THREE.Vector3());c.update(state.players[i],time,state,handle,menu,dt);});
    const mine=state.players[this.localPlayer];this.playerMarker.visible=!menu&&!!mine?.grounded;
    if(mine)this.playerMarker.position.set(mine.position.x,mine.position.y-.68,mine.position.z);
    this.environment.update(state,time,dt);this.particles.update(dt,time);this.rig.update(state,dt,menu);
    this.environment.updateSightlines(this.camera,state,menu);
    const z=state.heart.position.z;this.sun.position.set(-8,14,z-6);this.sun.target.position.set(0,0,z);
    this.renderer.render(this.scene,this.camera);
    // A passive rendering marker lets end-to-end tests distinguish the actual
    // 3D scene from an HTML overlay over a cleared canvas.
    this.canvas.dataset.renderedView=menu?'menu':'game';
    this.canvas.dataset.visibleTriangles=String(this.renderer.info.render.triangles);
    this.canvas.dataset.cameraFinite=String(this.camera.position.toArray().every(Number.isFinite));
    if(this.quality==='auto'&&!this.autoLow){this.frameTime+=dt;this.frames++;if(this.frameTime>3&&this.frames>12){if(this.frameTime/this.frames>.035){this.autoLow=true;this.applyQuality();}this.frames=0;this.frameTime=0;}}
  }
  event(event) { if(['break','checkpoint','gate','complete'].includes(event.type))this.particles.burst(event.position||this.heart.group.position,event.type); }
}
