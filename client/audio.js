// All music and effects are original procedural compositions. No downloaded audio.
export class AudioSystem {
  constructor() {
    this.volume = Number(localStorage.getItem('ddh-volume') ?? 0.35);
    this.muted = localStorage.getItem('ddh-muted') === 'true'; this.context = null; this.note = 0; this.lastBeat = 0;
  }
  unlock() {
    try {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const context = new Context(),master=context.createGain();master.connect(context.destination);
      this.context=context;this.master=master;this.setVolume(this.volume);
      this.musicTimer = setInterval(() => this.music(), 550);
    }
    // Resume only after a user gesture, but never make gameplay await it.
    // Safari can leave this promise pending while audio is interrupted.
    this.context.resume().catch(()=>{});
    } catch { /* Sound is optional; another gesture can retry. */ }
  }
  setVolume(v) { this.volume = v; localStorage.setItem('ddh-volume', String(v)); if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.context.currentTime, 0.06); }
  toggle() { this.muted = !this.muted; localStorage.setItem('ddh-muted', String(this.muted)); this.setVolume(this.volume); }
  tone(frequency, duration = 0.2, gain = 0.18, type = 'sine', delay = 0) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime + delay, osc = this.context.createOscillator(), envelope = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.002, gain), now + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration); osc.connect(envelope); envelope.connect(this.master);
    osc.start(now); osc.stop(now + duration + 0.03);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
  }
  noise(duration, gain, highpass = 1200) {
    if (!this.context || this.context.state !== 'running') return;
    const count = Math.floor(this.context.sampleRate * duration), buffer = this.context.createBuffer(1, count, this.context.sampleRate);
    const channel = buffer.getChannelData(0); for (let i = 0; i < count; i++) channel[i] = (Math.random()*2-1)*(1-i/count);
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), envelope = this.context.createGain();
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = highpass; envelope.gain.value = gain;
    source.connect(filter); filter.connect(envelope); envelope.connect(this.master); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
  music() {
    const melody = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 349.23, 440, 523.25, 440, 392, 329.63, 293.66, 261.63];
    this.tone(melody[this.note++ % melody.length], 1.3, 0.025, 'triangle');
    if (this.note % 4 === 0) { this.tone(130.81, 2.2, 0.018); this.tone(196, 2.2, 0.012); }
  }
  event(type) {
    if (type === 'jump') { this.tone(250, 0.13, 0.07); this.tone(420, 0.13, 0.04, 'sine', 0.08); }
    if (type === 'crack') { this.noise(0.16, 0.16, 2500); this.tone(1650, 0.2, 0.05); }
    if (type === 'break') { this.noise(0.95, 0.32, 2300); [2100, 1600, 2400, 900, 1300].forEach((f, i) => this.tone(f, 0.7, 0.05, 'triangle', i*0.05)); this.tone(180, 0.5, 0.06, 'sawtooth', 0.3); }
    if (['checkpoint', 'gate', 'complete'].includes(type)) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.6, 0.08, 'triangle', i*0.12));
    if (type === 'respawn') this.tone(392, 0.7, 0.05);
  }
  update(state, now) {
    if (!state || !this.context) return;
    if (state.health < 16 && now - this.lastBeat > 680) { this.lastBeat = now; this.tone(65, 0.17, 0.18); this.tone(58, 0.2, 0.14, 'sine', 0.18); }
    if (now - (this.lastStep || 0) > 320 && state.players.some(p => p.grounded && Math.hypot(p.velocity.x, p.velocity.z) > 0.8)) { this.lastStep = now; this.noise(0.035, 0.028, 400); }
    if (state.level >= 2 && now - (this.lastWind || 0) > 2300) { this.lastWind = now; this.noise(1.8, 0.009, 120); }
    if (state.level === 0 && now - (this.lastWater || 0) > 2100) { this.lastWater = now; this.noise(1.6, 0.008, 750); }
  }
}
