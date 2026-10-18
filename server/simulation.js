import RAPIER from '@dimforge/rapier3d-compat';
import { LEVELS, poseAt } from '../shared/levels.js';
import { clamp, distance, idleInput, length, rotate, sub } from '../shared/math.js';

let ready;
export async function initPhysics() { ready ??= RAPIER.init(); await ready; }
const DT = 1 / 60;
const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const messages = [
  'Love is patient. Glass is considerably less patient.',
  'That was a very ambitious trust fall.',
  'The heart called. It would like a gentler relationship.',
  'A little less chaos. A little more together.',
  'Good news: your love comes with a checkpoint.',
];

export class Simulation {
  constructor(levelIndex = 0) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.time = 0;
    this.tick = 0;
    this.health = 100;
    this.checkpoint = 0;
    this.gateOpen = false;
    this.padCharge = 0;
    this.padOccupancy = [false,false]; this.padMiss = 0; this.padProtection = false;
    this.status = 'playing';
    this.breakTimer = 0;
    this.balance = 0;
    this.events = [];
    this.eventCounter = 0;
    this.damageCooldown = 0;
    this.finishCharge = 0;
    this.deaths = 0;
    this.collapse = new Map();
    this.inputs = [idleInput(), idleInput()];
    this.lastInput = [0, 0];
    this.world = new RAPIER.World(vector(0, -9.81, 0));
    this.world.timestep = DT;
    this.world.integrationParameters.numSolverIterations = 8;
    this.queue = new RAPIER.EventQueue(true);
    this.environment = [];
    this.level.surfaces.forEach(def => this.createEnvironment(def, true));
    this.level.obstacles.forEach(def => this.createEnvironment(def, false));
    this.createEnvironment({ id: 'team-gate', x: 0, y: 1.2, z: this.level.gateZ, w: 9, h: 2.4, d: 0.35 }, false);
    this.players = [-1, 1].map((side, i) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(side * 1.12, 0.76, 2)
        .lockRotations().setLinearDamping(1.4).setCcdEnabled(true));
      const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.35, 0.35).setMass(8)
        .setFriction(this.level.friction).setRestitution(0).setCollisionGroups(0x00020001), body);
      return { body, collider, grabbing: true, grounded: true, jumpHeld: false, jumpCooldown: 0, fallTime: 0, dangerTime: 0, rescueTime: 0, yaw: 0, side, index: i };
    });
    this.heart = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.82, 2)
      .setLinearDamping(2.6).setAngularDamping(5).setCcdEnabled(true));
    this.heartCollider = this.world.createCollider(RAPIER.ColliderDesc.roundCuboid(0.78, 0.53, 0.26, 0.14)
      .setMass(4).setFriction(0.45).setRestitution(0.1).setCollisionGroups(0x00040001)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(100), this.heart);
    this.resetAtCheckpoint();
  }

  createEnvironment(def, surface) {
    const pose = poseAt(def, 0);
    const dynamic = !!(def.motion || def.spin || def.sway || def.collapse || ['timedGate','geyser'].includes(def.type));
    const descriptor = dynamic ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed();
    const body = this.world.createRigidBody(descriptor.setTranslation(pose.position.x, pose.position.y, pose.position.z)
      .setRotation(pose.rotation));
    const shape = surface && def.spin ? RAPIER.ColliderDesc.cylinder(def.h / 2, Math.max(def.w, def.d) / 2) : RAPIER.ColliderDesc.cuboid(def.w / 2, def.h / 2, def.d / 2);
    const collider = this.world.createCollider(shape
      .setFriction(surface ? this.level.friction : 0.4).setCollisionGroups(0x00010006), body);
    this.environment.push({ def, body, collider, surface, dynamic });
  }

  input(index, input) {
    this.inputs[index] = input;
    this.lastInput[index] = this.time;
  }
  grab(index) {
    if (this.status !== 'playing') return;
    const player = this.players[index];
    if (player.grabbing) player.grabbing = false;
    else if (distance(player.body.translation(), this.heart.translation()) < 2.65) player.grabbing = true;
    else this.emit('hint', 'Get closer to the heart to take your handle.');
  }
  emit(type, message, extra = {}) {
    this.events.push({ id: ++this.eventCounter, type, message, ...extra });
    if (this.events.length > 12) this.events.shift();
  }

  support(player) {
    const p = player.body.translation();
    for (const env of this.environment) {
      if (!env.surface || !env.collider.isEnabled()) continue;
      const s = env.body.translation(),q=env.body.rotation(),normal=rotate(vector(0,1,0),q);
      const height=s.y+env.def.h/(2*normal.y)-(normal.x*(p.x-s.x)+normal.z*(p.z-s.z))/normal.y;
      const local=rotate(sub(vector(p.x,height,p.z),s),{x:-q.x,y:-q.y,z:-q.z,w:q.w});
      const inBounds = env.def.spin ? Math.hypot(local.x,local.z) < Math.max(env.def.w, env.def.d) / 2 + 0.32
        : Math.abs(local.x) < env.def.w / 2 + 0.32 && Math.abs(local.z) < env.def.d / 2 + 0.32;
      if (inBounds && Math.abs(p.y - 0.7 - height) < 0.23) return env;
    }
    return null;
  }

  damage(amount, reason) {
    if (this.status !== 'playing' || !Number.isFinite(amount) || amount <= 0) return;
    const before = this.health;
    this.health = clamp(this.health - amount, 0, 100);
    if (Math.floor(before / 30) !== Math.floor(this.health / 30)) this.emit('crack', reason);
    if (this.health <= 0) {
      this.status = 'broken';
      this.breakTimer = 3.5;
      this.deaths++;
      this.emit('break', messages[(this.deaths - 1) % messages.length], { position: this.heart.translation() });
    }
  }

  resetAtCheckpoint() {
    const z = this.checkpoint ? this.level.checkpoints[this.checkpoint - 1] : this.level.spawn.z;
    this.players.forEach(p => {
      p.body.setTranslation(vector(p.side * 1.12, 0.83, z), true);
      p.body.setLinvel(vector(), true);
      p.body.setAngvel(vector(), true);
      p.grabbing = true; p.fallTime = 0; p.dangerTime = 0; p.rescueTime = 0; p.jumpHeld = false; p.yaw = 0;
    });
    this.heart.setTranslation(vector(0, 1.85, z), true);
    this.heart.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.heart.setLinvel(vector(), true);
    this.heart.setAngvel(vector(), true);
    this.inputs = [idleInput(), idleInput()];
    this.health = 100; this.balance = 0; this.finishCharge = 0;
    this.padMiss=0;this.padOccupancy=[false,false];this.padProtection=false;
    this.collapse.clear();
    if (this.checkpoint) this.gateOpen = true;
    this.status = 'playing';
    this.damageCooldown = 0.25;
  }

  step() {
    this.tick++;
    if (this.status === 'complete') return;
    if (this.status === 'broken') {
      this.breakTimer -= DT;
      if (this.breakTimer > 2.85) { this.world.timestep = DT * 0.22; this.world.step(this.queue); }
      if (this.breakTimer <= 0) { this.resetAtCheckpoint(); this.emit('respawn', 'Back together. You have got this.'); }
      return;
    }
    this.time += DT;
    this.world.timestep = DT;
    this.damageCooldown = Math.max(0, this.damageCooldown - DT);
    this.environment.forEach(env => {
      if (env.def.id === 'team-gate') env.collider.setEnabled(!this.gateOpen);
      if (!env.dynamic) return;
      const pose = poseAt(env.def, this.time, this.collapse.get(env.def.id) ?? null);
      env.body.setNextKinematicTranslation(pose.position);
      env.body.setNextKinematicRotation(pose.rotation);
    });
    const heartPosition = this.heart.translation();
    const activeInputs=this.inputs.map((input,i)=>this.time-this.lastInput[i]>.3?idleInput():input);
    const bothBalance = activeInputs.every(i => i.balance) && this.players.every(p => p.grabbing);
    this.padProtection=this.players.every((p,i)=>p.grabbing&&!!this.support(p)
      &&Math.hypot(p.body.translation().x-this.level.pads[i].x,p.body.translation().z-this.level.pads[i].z)<1.1
      &&Math.hypot(activeInputs[i].x,activeInputs[i].z)<.15);
    const heavy = this.level.heavy && heartPosition.z > this.level.heavy.from && heartPosition.z < this.level.heavy.to;
    let tension = 0;
    this.players.forEach((player, i) => {
      const input = activeInputs[i];
      const position = player.body.translation();
      const velocity = player.body.linvel();
      const support = this.support(player);
      player.grounded = !!support;
      if (support?.def.collapse && !this.collapse.has(support.def.id)) {
        this.collapse.set(support.def.id, this.time);
        this.emit('hint', 'These boards have commitment issues. Keep moving!');
      }
      const slipping = this.level.friction < 0.1 || this.level.slippery?.some(s => Math.abs(position.z - s.z) < s.d / 2);
      const speed = (input.balance ? 2.5 : 4) * (heavy ? 0.85 : 1);
      const acceleration = slipping && !input.balance ? 3 : 13;
      const movingSupport = support?.dynamic ? support.body.velocityAtPoint(position) : vector();
      const belt=support?.def.conveyor || vector();
      player.body.applyImpulse(vector(
        clamp((input.x * speed + movingSupport.x + belt.x*(input.balance?.45:1) - velocity.x) * acceleration * DT * 8, -2.7, 2.7),
        0,
        clamp((input.z * speed + movingSupport.z + belt.z*(input.balance?.45:1) - velocity.z) * acceleration * DT * 8, -2.7, 2.7)), true);
      player.jumpCooldown = Math.max(0, player.jumpCooldown - DT);
      if (input.jump && !player.jumpHeld && player.grounded && !player.jumpCooldown) {
        player.body.applyImpulse(vector(0, 8 * 7.1, 0), true);
        player.jumpCooldown = 0.65; this.emit('jump', '', { player: i });
      }
      player.jumpHeld = input.jump;
      if (Math.hypot(input.x, input.z) > 0.05) player.yaw = Math.atan2(input.x, input.z);
      if (player.grabbing) {
        const offset = rotate(vector(player.side * 0.92, 0, 0), this.heart.rotation());
        const anchor = { x: heartPosition.x + offset.x, y: heartPosition.y + offset.y, z: heartPosition.z + offset.z };
        const target = vector(position.x - player.side * 0.18, position.y + 1.2, position.z);
        const delta = sub(target, anchor);
        const heartPointVel = this.heart.velocityAtPoint(anchor);
        const damping = sub(velocity, heartPointVel);
        const k = heavy ? 73 : 100;
        let force = vector(delta.x * k + damping.x * 12, delta.y * k + damping.y * 10, delta.z * k + damping.z * 12);
        const magnitude = length(force);
        if (magnitude > 120) force = vector(force.x * 120 / magnitude, force.y * 120 / magnitude, force.z * 120 / magnitude);
        this.heart.applyImpulseAtPoint(vector(force.x * DT, force.y * DT, force.z * DT), anchor, true);
        player.body.applyImpulse(vector(-force.x * DT * 0.55, Math.min(0, -force.y * DT * 0.1), -force.z * DT * 0.55), true);
        tension = Math.max(tension, length(delta));
        if (length(delta) > 3.2) { player.grabbing = false; this.emit('hint', 'A hand slipped! Get close and grab again.'); }
      }
      if (player.grounded) player.rescueTime = 0;
      if (player.grabbing && !player.grounded && position.y < 0.6 && position.y > -1.6 && player.rescueTime < 1.4
        && bothBalance && this.players[1-i].grounded) {
        const partnerPosition=this.players[1-i].body.translation(); player.rescueTime+=DT;
        player.body.applyImpulse(vector(clamp(partnerPosition.x-position.x,-2,2)*DT*12, DT*8*30, (partnerPosition.z-position.z)*DT*12), true);
        if (this.time-(this.lastRescue || -5)>3) { this.lastRescue=this.time; this.emit('hint', 'Hold Balance together. Pull your person back to safety!'); }
      }
      if (position.y < -1.8) player.fallTime += DT; else player.fallTime = 0;
      if (!player.grounded && position.y < 0.25) player.dangerTime += DT; else player.dangerTime = 0;
      if (player.dangerTime > 4) this.damage(100, 'That rescue needed a little more teamwork.');
      if (player.fallTime > 0.65 || position.y < -7) this.damage(100, 'One very dramatic fall.');
    });
    if (bothBalance || this.padProtection) {
      const q = this.heart.rotation(), av = this.heart.angvel();
      this.heart.applyTorqueImpulse(vector((-q.x * 40 - av.x * 10) * DT, -av.y * 2 * DT, (-q.z * 40 - av.z * 10) * DT), true);
      if (tension < 0.55 && this.health < 100 && this.players.every(p=>p.grounded&&Math.hypot(p.body.linvel().x,p.body.linvel().z)<.4)) this.health = Math.min(100, this.health + DT * 3);
    }
    if (this.level.wind) {
      const wind = Math.sin(this.time * 0.83) * this.level.wind;
      this.heart.applyImpulse(vector(wind * DT * (bothBalance ? 0.25 : 1), 0, 0), true);
    }
    const q = this.heart.rotation();
    this.balance = clamp(Math.max(Math.abs(q.x), Math.abs(q.z)) * 1.5 + Math.max(0, tension - 0.25) * 0.5, 0, 1);
    if (!this.damageCooldown && !this.padProtection && tension > 1.25) this.damage((tension - 1.25) * DT * (bothBalance ? 4 : 12), 'Easy on the handles!');
    if (!this.damageCooldown && !this.padProtection && this.balance > 0.9) this.damage(DT * 6, 'Tilt happens. Try balancing together.');
    this.world.step(this.queue);
    this.queue.drainContactForceEvents(event => {
      if (event.collider1() !== this.heartCollider.handle && event.collider2() !== this.heartCollider.handle) return;
      const force = event.totalForceMagnitude();
      if (!this.damageCooldown && !this.padProtection && force > 180) { this.damage(clamp((force - 180) * 0.012, 1, 35), 'Careful! Glass and obstacles do not get along.'); this.damageCooldown = 0.4; }
    });
    const hp = this.heart.translation();
    if (hp.y < -2.5) this.damage(100, 'Gravity wanted a hug.');
    const bothGrabbing = this.players.every(p => p.grabbing);
    this.padOccupancy = this.players.map((p, i) => {
      const pos = p.body.translation(), pad = this.level.pads[i];
      return Math.hypot(pos.x - pad.x, pos.z - pad.z) < (this.padOccupancy[i]?1.05:.85) && p.grounded;
    });
    const onPads=this.padOccupancy.every(Boolean);
    if (!this.gateOpen) {
      this.padMiss=onPads&&bothGrabbing?0:this.padMiss+DT;
      this.padCharge = clamp(this.padCharge + (onPads && bothGrabbing ? DT : this.padMiss>.4 ? -DT*.6:0), 0, 1.15);
      if (this.padCharge >= 1.15) {
        this.gateOpen = true;this.checkpoint=1;this.health=100;this.damageCooldown=1.2;
        this.emit('gate', 'Arch open. Progress saved! Take your time, then cross together.',{position:hp});
      }
    }
    if (bothGrabbing && this.gateOpen) {
      const next = this.level.checkpoints[this.checkpoint];
      if (next && hp.z > next && this.players.every(p => p.grounded && Math.abs(p.body.translation().z - next) < 3)) {
        this.checkpoint++; this.health = 100;
        this.emit('checkpoint', 'A little breather. Heart repaired. Progress saved.', { checkpoint: this.checkpoint });
      }
      if (hp.z > this.level.finish && hp.z < this.level.finish + 2 && bothBalance
        && this.players.every(p => p.grounded && Math.abs(p.body.translation().z-this.level.finish-.5)<2)
        && Math.abs(hp.x) < .8 && this.health > 0) this.finishCharge += DT;
      else this.finishCharge = 0;
      if (this.finishCharge > 1) {
        this.status = 'complete';
        this.heart.setTranslation(vector(0,1.08,this.level.finish+.5),true);
        this.heart.setRotation({x:0,y:0,z:0,w:1},true);this.heart.setLinvel(vector(),true);this.heart.setAngvel(vector(),true);
        this.players.forEach(p=>{p.grabbing=false;p.body.setLinvel(vector(),true);});
        this.emit('complete', this.levelIndex === LEVELS.length-1 ? 'You carried your love all the way home.' : 'A little teamwork. A lot of heart.');
      }
    }
  }

  snapshot() {
    return {
      tick: this.tick, time: this.time, level: this.levelIndex, status: this.status,
      health: Math.round(this.health * 10) / 10, balance: this.balance, checkpoint: this.checkpoint,
      gateOpen: this.gateOpen, padCharge: this.padCharge, padOccupancy:this.padOccupancy, deaths: this.deaths,
      players: this.players.map(p => ({ position: p.body.translation(), velocity: p.body.linvel(), yaw: p.yaw,
        grabbing: p.grabbing, grounded: p.grounded })),
      heart: { position: this.heart.translation(), rotation: this.heart.rotation(), velocity: this.heart.linvel() },
      collapse: Object.fromEntries(this.collapse), events: this.events,
    };
  }
  dispose() { this.queue.free(); this.world.free(); }
}
