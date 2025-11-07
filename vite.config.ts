import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      'stellarx402': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});

