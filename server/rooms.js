import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Simulation } from './simulation.js';
import { idleInput, sanitizeInput } from '../shared/math.js';
import { LEVELS } from '../shared/levels.js';

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const colorPalette = ['#ee789a', '#71bfc1', '#a994dc', '#edb66f', '#88b986', '#699de0'];
const cleanText = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
export function profile(raw = {}, index = 0) {
  return { name: cleanText(raw.name, 20) || (index ? 'Juniper' : 'Oliver'),
    color: colorPalette.includes(raw.color) ? raw.color : colorPalette[index],
    appearance: ['boy', 'girl'].includes(raw.appearance) ? raw.appearance : (index ? 'girl' : 'boy') };
}
export function personalize(raw = {}) {
  const date = cleanText(raw.anniversary, 10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
  return { anniversary: validDate ? date : '', message: cleanText(raw.message, 240) };
}
const equalToken = (a, b) => typeof a === 'string' && typeof b === 'string' && /^[a-f0-9]{48}$/.test(b) && a.length === b.length
  && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class Rooms {
  constructor(io, { now = Date.now, maxRooms = 64 } = {}) {
    this.io = io; this.now = now; this.maxRooms = maxRooms;
    this.rooms = new Map(); this.members = new Map();
    this.reconnectMs = 120_000;
  }
  attach(socket) {
    let count = 0, since = this.now();
    const rate = () => { if (this.now() - since >= 1000) { count = 0; since = this.now(); } return ++count < 90; };
    const action = (name, handler) => socket.on(name, (data, ack) => {
      if (typeof data === 'function') { ack = data; data = {}; }
      const reply = typeof ack === 'function' ? ack : () => {};
      if (!rate()) return reply({ ok: false, error: 'Take a breath, then try again.' });
      try { reply(handler(data || {})); }
      catch { reply({ ok: false, error: 'That did not work. Please try again.' }); }
    });
    action('room:create', data => this.create(socket, data));
    action('room:join', data => this.join(socket, data));
    action('room:resume', data => this.resume(socket, data));
    action('room:leave', () => { this.leave(socket); return { ok: true }; });
    action('player:profile', data => this.withMember(socket, (room, p) => {
      if (room.phase !== 'lobby') return { ok: false, error: 'Customize in the lobby.' };
      p.profile = profile(data, p.index); p.ready = false; this.broadcast(room); return { ok: true };
    }));
    action('room:personalize', data => this.withMember(socket, (room, p) => {
      if (p.index !== 0 || room.phase !== 'lobby') return { ok: false, error: 'The host can edit your story in the lobby.' };
      room.story = personalize(data); this.broadcast(room); return { ok: true };
    }));
    action('player:ready', () => this.withMember(socket, (room, p) => {
      if (room.phase !== 'lobby') return { ok: false, error: 'The adventure is already starting.' };
      p.ready = !p.ready;
      if (room.players.length === 2 && room.players.every(p => p.ready && p.connected)) {
        room.phase = 'countdown'; room.deadline = this.now() + 4000;
      }
      this.broadcast(room); return { ok: true };
    }));
    action('game:input', data => this.withMember(socket, (room, p) => {
      if (room.phase === 'playing') room.sim?.input(p.index, sanitizeInput(data));
      return { ok: true };
    }));
    action('game:grab', () => this.withMember(socket, (room, p) => {
      if (room.phase === 'playing') room.sim?.grab(p.index); return { ok: true };
    }));
    action('game:pause', () => this.withMember(socket, (room, p) => {
      if (room.phase === 'playing') { room.phase = 'paused'; room.pausedBy = p.profile.name; room.players.forEach(p => room.sim.input(p.index, idleInput())); }
      else if (room.phase === 'paused' && room.players.every(p => p.connected)) { room.phase = 'playing'; }
      this.broadcast(room); return { ok: true };
    }));
    action('game:continue', () => this.withMember(socket, (room, p) => {
      if (room.phase !== 'complete' && room.phase !== 'victory') return { ok: false, error: 'Finish the level together first.' };
      p.vote = true;
      if (room.players.length === 2 && room.players.every(p => p.vote && p.connected)) {
        const next = room.phase === 'victory' ? 0 : room.sim.levelIndex + 1;
        if(room.phase==='victory')room.results=[];
        room.sim.dispose(); room.sim = new Simulation(next);
        room.players.forEach(p => { p.vote = false; p.restartVote = false; }); room.phase = 'intro'; room.deadline = this.now() + 6500;
      }
      this.broadcast(room); return { ok: true };
    }));
    action('game:restart', () => this.withMember(socket, (room, p) => {
      if (!room.sim || !['paused', 'playing'].includes(room.phase)) return { ok: false, error: 'Restart from the pause menu.' };
      p.restartVote = true;
      if (room.players.length === 2 && room.players.every(p => p.restartVote && p.connected)) {
        room.sim.resetAtCheckpoint(); room.sim.emit('respawn', 'A fresh start, together.'); room.phase = 'playing';
        room.players.forEach(p => p.restartVote = false);
      }
      this.broadcast(room); return { ok: true };
    }));
    socket.on('disconnect', () => this.disconnect(socket));
  }
  withMember(socket, fn) {
    const member = this.members.get(socket.id);
    if (!member) return { ok: false, error: 'Join a room first.' };
    const room = this.rooms.get(member.code);
    if (!room) return { ok: false, error: 'This room has expired.' };
    room.activity = this.now();
    return fn(room, room.players[member.index]);
  }
  newPlayer(socket, raw, index) {
    return { index, socketId: socket.id, token: randomBytes(24).toString('hex'), profile: profile(raw, index),
      connected: true, ready: false, vote: false, restartVote: false, disconnectedAt: 0 };
  }
  result(room, p) { return { ok: true, code: room.code, token: p.token, index: p.index, room: this.publicRoom(room) }; }
  bind(socket, room, p) { socket.join(room.code); this.members.set(socket.id, { code: room.code, index: p.index }); }
  create(socket, data) {
    if (this.members.has(socket.id)) return { ok: false, error: 'Leave your current room first.' };
    if (this.rooms.size >= this.maxRooms) return { ok: false, error: 'The garden is full. Try again in a little while.' };
    let code;
    do { code = Array.from(randomBytes(6), n => codeAlphabet[n % codeAlphabet.length]).join(''); } while (this.rooms.has(code));
    const p = this.newPlayer(socket, data.profile, 0);
    const room = { code, players: [p], story: personalize(data.story), results:[], phase: 'lobby', sim: null, activity: this.now(), created: this.now() };
    this.rooms.set(code, room); this.bind(socket, room, p); this.broadcast(room); return this.result(room, p);
  }
  join(socket, data) {
    if (this.members.has(socket.id)) return { ok: false, error: 'Leave your current room first.' };
    const code = cleanText(data.code, 6).toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'We could not find that room. Check the six-letter code.' };
    if (room.players.length >= 2) return { ok: false, error: 'This love story already has two players.' };
    if (room.phase !== 'lobby') return { ok: false, error: 'This adventure has already started.' };
    const p = this.newPlayer(socket, data.profile, 1); room.players.push(p); room.activity = this.now();
    this.bind(socket, room, p); this.broadcast(room); return this.result(room, p);
  }
  resume(socket, data) {
    if (this.members.has(socket.id)) return { ok: false, error: 'You are already in a room.' };
    const room = this.rooms.get(cleanText(data.code, 6).toUpperCase());
    const p = room?.players.find(p => equalToken(p.token, data.token));
    if (!p || (!p.connected && this.now() - p.disconnectedAt > this.reconnectMs)) return { ok: false, error: 'Your room has expired. Start a new adventure.' };
    if (p.connected) {
      // A mobile browser can establish a new connection before the old radio's
      // socket times out. Possession of the private token transfers that seat.
      const old=this.io.sockets.sockets.get(p.socketId);this.members.delete(p.socketId);
      old?.emit('session:replaced',{reason:'Your adventure continued in another tab.'});old?.leave(room.code);old?.disconnect(true);
    }
    p.connected = true; p.socketId = socket.id; room.activity = this.now();
    this.bind(socket, room, p);
    if (room.phase === 'reconnecting' && room.players.every(p => p.connected)) {
      room.phase = room.previousPhase || 'playing';
      if (['intro', 'countdown'].includes(room.phase)) room.deadline = this.now() + 4000;
    }
    this.broadcast(room); if (room.sim) this.io.to(room.code).emit('game:state', room.sim.snapshot());
    return this.result(room, p);
  }
  publicRoom(room) {
    return { code: room.code, phase: room.phase, story: room.story, results:room.results, level: room.sim?.levelIndex || 0,
      countdown: Math.max(0, Math.ceil(((room.deadline || 0) - this.now()) / 1000)), pausedBy: room.pausedBy,
      players: room.players.map(p => ({ index: p.index, profile: p.profile, connected: p.connected, ready: p.ready,
        vote: p.vote, restartVote: p.restartVote })),
      reconnectUntil: room.phase === 'reconnecting' ? Math.min(...room.players.filter(p => !p.connected).map(p => p.disconnectedAt + this.reconnectMs)) : null };
  }
  broadcast(room) { this.io.to(room.code).emit('room:state', this.publicRoom(room)); }
  disconnect(socket) {
    const member = this.members.get(socket.id); if (!member) return;
    const room = this.rooms.get(member.code); this.members.delete(socket.id); if (!room) return;
    const p = room.players[member.index]; p.connected = false; p.disconnectedAt = this.now();
    if (room.phase !== 'lobby' && room.phase !== 'reconnecting') { room.previousPhase = room.phase; room.phase = 'reconnecting'; }
    room.sim?.input(p.index, idleInput()); this.broadcast(room);
  }
  leave(socket) {
    const member = this.members.get(socket.id); if (!member) return;
    const room = this.rooms.get(member.code); socket.leave(member.code); this.members.delete(socket.id);
    if (!room) return;
    if (room.phase === 'lobby' && member.index === 1) { room.players.pop(); room.players[0].ready = false; this.broadcast(room); }
    else this.close(room, 'Your partner left the adventure. Create a new room to start again.');
  }
  close(room, reason) {
    this.io.to(room.code).emit('room:closed', { reason });
    room.players.forEach(p => { this.members.delete(p.socketId); this.io.sockets.sockets.get(p.socketId)?.leave(room.code); });
    room.sim?.dispose(); this.rooms.delete(room.code);
  }
  step() {
    for (const room of this.rooms.values()) {
      const expired = room.players.some(p => !p.connected && this.now() - p.disconnectedAt > this.reconnectMs);
      if (expired || this.now() - room.activity > 1000 * 60 * 90 || (room.phase === 'lobby' && this.now() - room.created > 1000 * 60 * 30)) {
        this.close(room, 'This room has expired. Your next love story is one click away.'); continue;
      }
      if (room.phase === 'countdown' && this.now() >= room.deadline && room.players.length === 2 && room.players.every(p => p.connected)) {
        room.sim = new Simulation(); room.phase = 'intro'; room.deadline = this.now() + 6500; this.broadcast(room);
      } else if (room.phase === 'intro' && this.now() >= room.deadline) { room.phase = 'playing'; this.broadcast(room); }
      if (room.phase === 'playing') {
        room.sim.step();
        if (room.sim.status === 'complete') {
          room.results.push({level:room.sim.levelIndex,time:room.sim.time,deaths:room.sim.deaths,health:Math.round(room.sim.health)});
          this.io.to(room.code).emit('game:state', room.sim.snapshot()); room.lastTickSent = room.sim.tick;
          room.phase = room.sim.levelIndex === LEVELS.length-1 ? 'victory' : 'complete'; this.broadcast(room);
        }
      }
      if (room.sim && room.sim.tick % 3 === 0 && room.lastTickSent !== room.sim.tick) {
        this.io.to(room.code).volatile.emit('game:state', room.sim.snapshot()); room.lastTickSent = room.sim.tick;
      }
    }
  }
  dispose() { for (const room of [...this.rooms.values()]) this.close(room, 'The server is restarting. Please create a new room.'); }
}
