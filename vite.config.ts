import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/plotly.js') || id.includes('node_modules/react-plotly.js')) {
            return 'plotly';
          }
          if (id.includes('node_modules/monaco-editor') || id.includes('node_modules/@monaco-editor')) {
            return 'monaco';
          }
          if (id.includes('node_modules/pagedjs')) {
            return 'paged';
          }
        },
      },
    },
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
});
