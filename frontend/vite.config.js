import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Backend origin for local development. Override with BACKEND_ORIGIN if you run
// the API somewhere else; keep the port in sync with backend/.env (PORT).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:5100';

const devProxy = {
  '/api': { target: BACKEND_ORIGIN, changeOrigin: true },
  '/uploads': { target: BACKEND_ORIGIN, changeOrigin: true }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // `@/…` alias used by shadcn/ui components. Mirrored in jsconfig.json so the
  // editor resolves it too.
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src')
    }
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173, // 3000 collides with an unrelated Docker container already bound to that host port
    host: true, // listen on the LAN too, not just localhost — lets a phone on the same Wi-Fi reach this dev server via the computer's local IP
    proxy: devProxy
  },
  // `vite preview` serves the production build and previously had no proxy, so
  // /api requests 404'd against the static server.
  preview: {
    port: 4173,
    host: true,
    proxy: devProxy
  }
});
