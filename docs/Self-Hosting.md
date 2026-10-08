# Self-Hosting

Deploy the reader as a **static site**. No backend required for public books and plain `.ptsb` uploads.

## Build

```bash
npm ci
npm run build
```

Output: `dist/` (includes self-hosted Pyodide in `dist/pyodide/` after `prebuild`).

The build also needs network access once. `scripts/copy-pyodide.mjs` downloads the Pyodide wheels for numpy, matplotlib and their dependencies (12 files, 12.6 MB) from jsDelivr, checks each against the sha256 in `pyodide-lock.json`, and keeps them in `node_modules/.cache/pyodide-packages/`. Later builds use that cache until `npm ci` clears `node_modules`. They end up in `dist/pyodide/`, and a browser downloads them only when a script imports numpy or matplotlib.

If the download fails, `npm run build` stops. To build without the two libraries, for example offline, set `SMARTBOOK_LAB_PACKAGES=0`. The lab still runs plain Python, and an import of numpy gives an error.

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
| _(none)_ | OSS self-host, plain books + upload only |
| `VITE_PLATFORM_ENABLED=true` | Explicitly enable the private platform integration |
| `VITE_API_URL` | Platform API base URL |

## Headers

`scripts/generate-headers.mjs` writes `public/_headers` at build time, including the Content Security Policy. Hosts that read `_headers` (Netlify, Cloudflare Pages) apply it as is. On other hosts, send the same headers yourself.

The lab needs `'wasm-unsafe-eval'` in `script-src`, because Pyodide compiles WebAssembly. Monaco, Pyodide and the numpy and matplotlib wheels all come from the site itself, so the policy allows no CDN.

## Platform integration (optional)

Hosted Politost product adds auth, cloud catalog, and license keys on top of this reader. That stack is **not** AGPL reader scope.

For full platform deploy (API + DB + OAuth), see the private platform documentation.
