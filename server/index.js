import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const instance = await createApp({ dev: process.argv.includes('--dev') });
instance.http.listen(port, '0.0.0.0', () => console.log(`DON'T DROP HER! is ready at http://localhost:${port}`));
let stopping = false;
const shutdown = async () => { if (stopping) return; stopping = true; await instance.close(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
