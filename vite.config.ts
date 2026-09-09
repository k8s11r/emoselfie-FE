import type { IncomingMessage } from 'node:http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';

const backendTarget = process.env.VITE_DEV_BACKEND_TARGET ?? 'http://localhost:8000';

// True when the browser reached the dev server over https, directly or through a tunnel
// that terminates TLS for us (Cloudflare sets X-Forwarded-Proto).
function browserUsedHttps(req: IncomingMessage): boolean {
  const forwarded = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return 'encrypted' in req.socket || proto?.split(',')[0].trim() === 'https';
}

// The session cookie is issued with `Secure`, which production serves over https. Safari
// refuses to store a Secure cookie on a plain http origin — localhost included, unlike
// Chrome — so every authenticated call fails with SESSION_REQUIRED. Drop the attribute
// only when the browser itself is on http; an https tunnel keeps the cookie as issued.
// The backend also enforces a same-origin check on mutations, so the dev proxy must keep
// the browser's Host header instead of rewriting it to the backend address.
const devProxy: ProxyOptions = {
  target: backendTarget,
  changeOrigin: false,
  configure: (proxy) => {
    proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
      const cookies = proxyRes.headers['set-cookie'];
      if (!cookies || browserUsedHttps(req)) return;
      proxyRes.headers['set-cookie'] = cookies.map((cookie) => cookie.replace(/;\s*Secure\b/gi, ''));
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // Quick Tunnel hostnames change on every run, so allow the whole suffix instead of
    // pinning one. Vite blocks unknown Host headers by default.
    allowedHosts: ['.trycloudflare.com', '.workers.dev'],
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
