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
const analyticsEnabled = /^G-[A-Z0-9]+$/.test(env.VITE_GA4_ID ?? '');
const adsEnabled = /^ca-pub-\d{16}$/.test(env.VITE_ADSENSE_CLIENT ?? '') && env.VITE_GOOGLE_CMP_ENABLED === 'true';
const analyticsOrigins = analyticsEnabled ? ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'] : [];
const adOrigins = adsEnabled ? ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.googleadservices.com', 'https://*.google.com', 'https://*.gstatic.com', 'https://*.googleusercontent.com'] : [];
const scriptSrc = ["'self'", "'wasm-unsafe-eval'", ...(analyticsEnabled ? ['https://www.googletagmanager.com'] : []), ...adOrigins].join(' ');
const frameSrc = ["'self'", ...adOrigins].join(' ');
const connectSrc = ["'self'", apiUrl, booksOrigin, ...analyticsOrigins, ...adOrigins].filter(Boolean).join(' ');
const imgSrc = ["'self'", 'data:', 'blob:', booksOrigin, ...analyticsOrigins, ...adOrigins].filter(Boolean).join(' ');

const headers = `/*
  Content-Security-Policy: default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src ${imgSrc}; connect-src ${connectSrc}; frame-src ${frameSrc}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, '_headers'), headers);
console.log('Generated public/_headers');
