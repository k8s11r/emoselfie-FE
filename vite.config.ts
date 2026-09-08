import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const backendTarget = process.env.VITE_DEV_BACKEND_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      // The backend enforces a same-origin check on mutations, so the dev proxy must keep the
      // browser's Host header instead of rewriting it to the backend address.
      '/api': { target: backendTarget, changeOrigin: false },
      '/media': { target: backendTarget, changeOrigin: false },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: false,
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
});
