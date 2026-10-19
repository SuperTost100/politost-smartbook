import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** `VITE_BASE_PATH=/reader` serves the app from a subfolder. Vite wants a leading and trailing slash. */
function basePath(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

export default defineConfig(({ mode }) => ({
  base: basePath(loadEnv(mode, rootDir, 'VITE_').VITE_BASE_PATH),
  plugins: [react()],
  resolve: {
    alias: {
      '@politost/content-core': path.resolve(rootDir, 'packages/content-core/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  worker: {
    format: 'es',
  },
  build: {
    assetsInlineLimit(filePath) {
      if (filePath.endsWith('.svg')) return false;
      // An inlined font is a data: URL, which the CSP (font-src 'self') blocks.
      if (/\.(woff2?|ttf)$/.test(filePath)) return false;
    },
    // No manualChunks. Monaco and Plotly are already behind dynamic imports
    // (the lab and the graphs). A named chunk absorbs a module the entry also
    // needs, so the library downloads that chunk before it can render.
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8001',
      '/users': 'http://localhost:8001',
      // API auth only — do not proxy SPA routes (/auth, /auth/callback, …)
      '/auth/jwt': 'http://localhost:8001',
      '/auth/register': 'http://localhost:8001',
      '/auth/google': 'http://localhost:8001',
    },
  },
}));
