# Self-Hosting

Deploy the reader as a **static site**. No backend required for public books and plain `.ptsb` uploads.

## Build

```bash
npm ci
npm run build
```

Output: `dist/` (includes self-hosted Pyodide in `dist/pyodide/` after `prebuild`).

## Static hosts

Works on Cloudflare Pages, Netlify, GitHub Pages, nginx, any CDN.

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22.13+ |

## Builtin books

Add folders under `src/content/<book-id>/` before build. Each needs `smartbook.json` + at least one chapter.

**Do not** bake licensed material into `src/content/` — distribute encrypted `.ptsb` instead.

## Environment variables

| Variable | When |
|----------|------|
| *(none)* | OSS self-host, plain books + upload only |
| `VITE_PLATFORM_ENABLED=true` | Explicitly enable the private platform integration |
| `VITE_API_URL` | Platform API base URL |

## Headers

`scripts/generate-headers.mjs` writes `public/_headers` at build time, including the Content Security Policy. Hosts that read `_headers` (Netlify, Cloudflare Pages) apply it as is. On other hosts, send the same headers yourself.

The lab needs `'wasm-unsafe-eval'` in `script-src`, because Pyodide compiles WebAssembly. Monaco is bundled with the app, so the policy allows no CDN.

## Platform integration (optional)

Hosted Politost product adds auth, cloud catalog, and license keys on top of this reader. That stack is **not** AGPL reader scope.

For full platform deploy (API + DB + OAuth), see the private platform documentation.
