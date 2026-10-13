import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'safari15',
    sourcemap: false,
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('/three/')) return 'three';
      if (id.includes('/socket.io') || id.includes('/engine.io')) return 'socket';
    } } },
  },
});
