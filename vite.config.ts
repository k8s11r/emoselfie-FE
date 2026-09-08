import type { IncomingMessage } from 'node:http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

const backendTarget = process.env.VITE_DEV_BACKEND_TARGET ?? 'http://localhost:8000';

// The session cookie is issued with `Secure`, which production serves over https. Safari
// refuses to store a Secure cookie on a plain http origin — localhost included, unlike
// Chrome — so every authenticated call fails with SESSION_REQUIRED. Drop the attribute
// only for requests the dev server itself answered over http.
// The backend also enforces a same-origin check on mutations, so the dev proxy must keep
// the browser's Host header instead of rewriting it to the backend address.
const devProxy: ProxyOptions = {
  target: backendTarget,
  changeOrigin: false,
  configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
      const cookies = proxyRes.headers['set-cookie'];
      if (!cookies || 'encrypted' in req.socket) return;
      proxyRes.headers['set-cookie'] = cookies.map((cookie) => cookie.replace(/;\s*Secure\b/gi, ''));
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': devProxy,
      '/media': devProxy,
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
