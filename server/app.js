import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { Rooms } from './rooms.js';
import { initPhysics } from './simulation.js';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

export async function createApp({ dev = false, now, tick = true } = {}) {
  await initPhysics();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: dev ? false : {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'"], workerSrc: ["'self'", 'blob:'], mediaSrc: ["'self'", 'blob:'], objectSrc: ["'none'"],
      upgradeInsecureRequests: null },
  }, crossOriginEmbedderPolicy: false }));
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 8192, pingInterval: 15_000, pingTimeout: 25_000,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      let allowed = !origin;
      try { allowed ||= new URL(origin).host === req.headers.host || new URL(origin).host === req.headers['x-forwarded-host']; } catch { /* invalid origin */ }
      callback(null, allowed);
    },
  });
  const rooms = new Rooms(io, { now });
  io.on('connection', socket => rooms.attach(socket));
  app.get('/health', (req, res) => res.set('Cache-Control', 'no-store').json({ ok: true, game: 'Dont-Drop-Her',
    version, commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'local', instanceMode: 'single' }));
  let vite;
  if (dev) {
    const { createServer: createVite } = await import('vite');
    vite = await createVite({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist, { maxAge: '1h', setHeaders: (res, path) => { if (path.endsWith('index.html')) res.set('Cache-Control', 'no-cache'); } }));
    app.get('/{*path}', (req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  let interval;
  if (tick) {
    let last = performance.now(), accumulator = 0;
    interval = setInterval(() => {
      const current = performance.now(); accumulator += Math.min(100, current - last); last = current;
      let steps = 0;
      while (accumulator >= 1000 / 60 && steps++ < 5) { rooms.step(); accumulator -= 1000 / 60; }
    }, 8);
    interval.unref();
  }
  return { app, http, io, rooms,
    async close() { clearInterval(interval); rooms.dispose(); await vite?.close(); await new Promise(r => io.close(r)); } };
}
