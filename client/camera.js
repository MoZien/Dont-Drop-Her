import * as THREE from 'three';
import { clamp } from '../shared/math.js';

export class CameraRig {
  constructor(camera) { this.camera = camera; this.yaw = 0; this.viewYaw = 0; this.pitch = 0.58; this.distance = 11.5; this.target = new THREE.Vector3(0, 1, 2); }
  reset() { this.yaw = 0; this.pitch = 0.58; this.distance = 11.5; }
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
    const target = new THREE.Vector3(p.x, Math.max(-0.3, p.y - 0.65), p.z + 0.6);
    this.target.lerp(target, 1 - Math.exp(-dt * 7));
    // Keep both carriers and the next landing visible in a narrow phone view.
    const distance = this.distance / Math.sqrt(Math.min(1, this.camera.aspect || 1));
    const offset = new THREE.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch)*distance, Math.sin(this.pitch)*distance, -Math.cos(this.yaw)*Math.cos(this.pitch)*distance);
    this.camera.position.lerp(this.target.clone().add(offset), 1 - Math.exp(-dt * 9));
    this.camera.lookAt(this.target);
    this.viewYaw = Math.atan2(this.camera.position.x-this.target.x, this.target.z-this.camera.position.z);
  }
}
