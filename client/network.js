import { io } from 'socket.io-client';

export class Network extends EventTarget {
  constructor() {
    super(); this.socket = io({ autoConnect: false, reconnectionDelay: 600, reconnectionDelayMax: 3500 });
    this.index = 0; this.room = null; this.states = []; this.latency = 0; this.resuming = false;
    try { this.credentials = JSON.parse(sessionStorage.getItem('ddh-session') || 'null'); } catch { this.credentials = null; }
    this.socket.on('connect', async () => {
      this.emit('connection', true);
      if (this.credentials && !this.resuming) {
        this.resuming = true;
        const r = await this.request('room:resume', this.credentials);
        if (r.ok) this.accept(r); else { this.clear(); this.emit('error', r.error); }
        this.resuming = false;
      }
    });
    this.socket.on('disconnect', () => this.emit('connection', false));
    this.socket.on('connect_error', () => this.emit('connection', false));
    this.socket.on('room:state', room => { this.room = room; this.emit('room', room); });
    this.socket.on('room:closed', ({ reason }) => { this.clear(); this.emit('closed', reason); });
    this.socket.on('session:replaced', ({ reason }) => { this.clear(); this.emit('closed', reason); });
    this.socket.on('game:state', state => {
      if (this.states.length && (state.level !== this.states.at(-1).state.level || state.tick < this.states.at(-1).state.tick)) this.states = [];
      this.states.push({ state, arrived: performance.now() });
      if (this.states.length > 12) this.states.shift();
      this.emit('state', state);
    });
    this.socket.connect();
  }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  on(type, fn) { this.addEventListener(type, event => fn(event.detail)); }
  request(event, data = {}) {
    return new Promise(resolve => {
      this.socket.timeout(8000).emit(event, data, (error, response) => resolve(error ? { ok: false, error: 'Connection timed out. Please try again.' } : response));
    });
  }
  accept(result) {
    this.index = result.index; this.credentials = { code: result.code, token: result.token };
    sessionStorage.setItem('ddh-session', JSON.stringify(this.credentials));
    this.room = result.room; this.emit('room', result.room);
  }
  async enter(kind, data) { const r = await this.request(`room:${kind}`, data); if (r.ok) this.accept(r); return r; }
  clear() { this.room = null; this.states = []; this.credentials = null; sessionStorage.removeItem('ddh-session'); }
  async leave() { await this.request('room:leave'); this.clear(); }
  input(value) { if (this.socket.connected && this.room?.phase === 'playing') this.socket.volatile.emit('game:input', value); }
  interpolate() {
    if (!this.states.length) return null;
    const target = performance.now() - 100;
    let a = this.states[0], b = a;
    for (const entry of this.states) { if (entry.arrived <= target) a = entry; else { b = entry; break; } b = entry; }
    const t = a === b ? 1 : Math.min(1, Math.max(0, (target - a.arrived) / (b.arrived - a.arrived)));
    const lerp = (p, q) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
    const angular = (u, v) => { let delta = (v - u + Math.PI * 3) % (Math.PI * 2) - Math.PI; return u + delta * t; };
    const quaternion = (p, q) => {
      const sign = p.x*q.x+p.y*q.y+p.z*q.z+p.w*q.w < 0 ? -1 : 1;
      const r = { x: p.x + (q.x * sign - p.x) * t, y: p.y + (q.y * sign - p.y) * t, z: p.z + (q.z * sign - p.z) * t, w: p.w + (q.w * sign - p.w) * t };
      const n = Math.hypot(r.x, r.y, r.z, r.w) || 1; return { x: r.x/n, y: r.y/n, z: r.z/n, w: r.w/n };
    };
    const newest = this.states.at(-1).state;
    if (newest.events.some(e => e.type === 'respawn' && !a.state.events.some(x => x.id === e.id))) return newest;
    return { ...newest, time: a.state.time + (b.state.time - a.state.time) * t,
      players: newest.players.map((p, i) => ({ ...p, position: lerp(a.state.players[i].position, b.state.players[i].position),
        yaw: angular(a.state.players[i].yaw, b.state.players[i].yaw) })),
      heart: { ...newest.heart, position: lerp(a.state.heart.position, b.state.heart.position), rotation: quaternion(a.state.heart.rotation, b.state.heart.rotation) } };
  }
}
