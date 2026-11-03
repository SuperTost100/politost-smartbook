import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Same sources as the build: the environment first, then .env files such as .env.local.
const env = loadEnv('production', root, 'VITE_');
const apiUrl = (env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
// The reader fetches catalog.json and the .ptsb packages from the books site.
const booksOrigin = (env.VITE_BOOKS_URL ?? '').trim() ? new URL(env.VITE_BOOKS_URL.trim()).origin : '';
const connectSrc = ["'self'", apiUrl, booksOrigin].filter(Boolean).join(' ');
const imgSrc = ["'self'", 'data:', 'blob:', booksOrigin].filter(Boolean).join(' ');

const headers = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src ${imgSrc}; connect-src ${connectSrc}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, '_headers'), headers);
console.log('Generated public/_headers');
