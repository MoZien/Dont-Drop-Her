import * as THREE from 'three';
import { clamp } from '../shared/math.js';

export class CameraRig {
  constructor(camera) { this.camera = camera; this.yaw = -0.3; this.pitch = 0.5; this.distance = 10.5; this.target = new THREE.Vector3(0, 1, 2); }
  orbit(x, y) { this.yaw -= x; this.pitch = clamp(this.pitch + y, 0.23, 1.05); }
  zoom(delta) { this.distance = clamp(this.distance + delta, 6, 16); }
  update(state, dt, menu = false) {
    if (menu) {
      const portrait = innerWidth < 720;
      this.camera.position.lerp(new THREE.Vector3(portrait ? 7.7 : 8.8, portrait ? 6 : 5.8, portrait ? -9 : -8), 1 - Math.exp(-dt * 3));
      this.camera.lookAt(portrait ? 0 : -2.5, portrait ? 3.3 : 1.8, 4.2);
      return;
    }
    const p = state.heart.position;
    const target = new THREE.Vector3(p.x, Math.max(-0.3, p.y - 0.2), p.z + 1.2);
    this.target.lerp(target, 1 - Math.exp(-dt * 7));
    const offset = new THREE.Vector3(Math.sin(this.yaw)*this.distance, Math.sin(this.pitch)*this.distance, -Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance);
    this.camera.position.lerp(this.target.clone().add(offset), 1 - Math.exp(-dt * 9));
    this.camera.lookAt(this.target);
  }
}
