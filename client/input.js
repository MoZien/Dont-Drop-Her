import { cameraMovement } from '../shared/math.js';

export class Input {
  constructor(canvas, camera, onAction) {
    this.camera = camera; this.onAction = onAction; this.keys = new Set(); this.touch = { x: 0, z: 0, jump: false, balance: false };
    this.enabled = false; this.joystickId = null; this.dragId = null;
    this.releaseControls = () => {};
    window.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat && e.code === 'KeyE' && this.enabled) onAction('grab');
      if (!e.repeat && e.code === 'KeyR' && this.enabled) camera.reset();
      if (!e.repeat && e.code === 'Escape') onAction('pause');
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      if (!this.enabled || this.dragId !== null) return;
      this.dragId = e.pointerId; this.last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.dragId || !this.last) return;
      camera.orbit((e.clientX - this.last.x) * 0.006, (e.clientY - this.last.y) * 0.004);
      this.last = { x: e.clientX, y: e.clientY };
    });
    const end = e => { if (e.pointerId === this.dragId) { this.dragId = null; this.last = null; } };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('wheel', e => { if (this.enabled) { camera.zoom(e.deltaY * 0.01); e.preventDefault(); } }, { passive: false });
  }
  bindControls(root) {
    const joystick = root.querySelector('#joystick');
    if (!joystick || joystick.dataset.bound) return;
    joystick.dataset.bound = 'true';
    const knob = joystick.querySelector('.joystick-knob');
    const move = e => {
      if (e.pointerId !== this.joystickId) return;
      const rect = joystick.getBoundingClientRect(), radius = rect.width * 0.34;
      let x = (e.clientX - rect.left - rect.width / 2) / radius;
      let y = (e.clientY - rect.top - rect.height / 2) / radius;
      const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n; }
      const deadzone = 0.12, strength = Math.min(1, Math.max(0, (n-deadzone)/(1-deadzone)));
      const directionLength = Math.hypot(x,y) || 1;
      this.touch.x = n > deadzone ? x / directionLength * strength : 0; this.touch.z = n > deadzone ? -y / directionLength * strength : 0;
      knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    };
    joystick.addEventListener('pointerdown', e => { e.preventDefault(); if (!this.enabled || this.joystickId !== null) return; this.joystickId = e.pointerId; joystick.setPointerCapture(e.pointerId); move(e); });
    joystick.addEventListener('pointermove', move);
    const end = e => { if (e.pointerId !== this.joystickId) return; this.joystickId = null; this.touch.x = this.touch.z = 0; knob.style.transform = ''; };
    joystick.addEventListener('pointerup', end); joystick.addEventListener('pointercancel', end);
    joystick.addEventListener('lostpointercapture', end);
    const pointerSets = [];
    for (const action of ['jump', 'balance']) {
      const el = root.querySelector(`[data-touch="${action}"]`);
      const pointers = new Set();
      pointerSets.push(pointers);
      el.addEventListener('pointerdown', e => { e.preventDefault(); if (!this.enabled) return; pointers.add(e.pointerId); el.setPointerCapture(e.pointerId); this.touch[action] = true; el.classList.add('held'); });
      const release = e => { pointers.delete(e.pointerId); this.touch[action] = pointers.size > 0; if (!pointers.size) el.classList.remove('held'); };
      el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
    }
    root.querySelector('[data-touch="grab"]').addEventListener('pointerdown', e => { e.preventDefault(); if(this.enabled)this.onAction('grab'); });
    this.releaseControls = () => { knob.style.transform = ''; pointerSets.forEach(s=>s.clear()); root.querySelectorAll('[data-touch]').forEach(el=>el.classList.remove('held')); };
  }
  reset() { this.keys.clear(); this.touch = { x: 0, z: 0, jump: false, balance: false }; this.joystickId = null; this.dragId = null; this.last = null; this.releaseControls(); }
  sample() {
    if (!this.enabled) return { x: 0, z: 0, jump: false, balance: false };
    const k = this.keys;
    const x = this.touch.x + Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft'));
    const z = this.touch.z + Number(k.has('KeyW') || k.has('ArrowUp')) - Number(k.has('KeyS') || k.has('ArrowDown'));
    return { ...cameraMovement(x,z,this.camera.viewYaw ?? this.camera.yaw),
      jump: this.touch.jump || k.has('Space'), balance: this.touch.balance || k.has('ShiftLeft') || k.has('ShiftRight') };
  }
}
