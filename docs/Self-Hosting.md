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

For a subfolder, see [Subfolder](#subfolder).

## Builtin books

Add folders under `src/content/<book-id>/` before build. Each needs `smartbook.json` + at least one chapter.

**Do not** bake licensed material into `src/content/` — distribute encrypted `.ptsb` instead.

## Environment variables

| Variable | When |
|----------|------|
| _(none)_ | OSS self-host, plain books + upload only |
| `VITE_BASE_PATH` | Serve the app from a subfolder, e.g. `/reader`. Default `/` |
| `VITE_BOOKS_URL` | Base URL of a books site that serves `catalog.json`, see [Books repo](Books-Repo.md) |
| `VITE_PLATFORM_ENABLED=true` | Explicitly enable the private platform integration |
| `VITE_API_URL` | Platform API base URL |

The build reads them from the environment and from `.env` files such as `.env.local`. The public PoliTost site sets `VITE_BASE_PATH` and `VITE_BOOKS_URL` and nothing else. See [Roadmap](Roadmap.md#public-launch).

### Subfolder

With `VITE_BASE_PATH=/reader`, every URL the app writes starts with `/reader/`: scripts, icons, the manifest, Pyodide, the service worker and its scope, and the router. Your host must serve `dist/` under that path and answer unknown paths below it with `/reader/index.html`.

### Books site

With `VITE_BOOKS_URL`, the home page fetches `catalog.json` from that site and lists its books next to the builtin ones. A book's `.ptsb` downloads when someone opens it. The reader checks its size and sha256 against the catalog, refuses encrypted packages, and keeps a copy in IndexedDB so the book reopens offline. If the catalog can't be fetched, the home page shows the builtin and imported books only.

The same `id` can come from several places. The reader opens the imported copy first, then the books site, then the builtin one, so an author can test a local `.ptsb` over the published book.

## Headers

`scripts/generate-headers.mjs` writes `public/_headers` at build time, including the Content Security Policy. Hosts that read `_headers` (Netlify, Cloudflare Pages) apply it as is. On other hosts, send the same headers yourself.

The lab needs `'wasm-unsafe-eval'` in `script-src`, because Pyodide compiles WebAssembly. Monaco, Pyodide and the numpy and matplotlib wheels all come from the site itself, so the policy allows no CDN.

## The public PoliTost site

`npm run deploy:politost` builds with `VITE_BASE_PATH=/reader` and `VITE_BOOKS_URL=https://books.politost.it`, then deploys the Cloudflare Worker `politost-reader` from [`deploy/politost/`](../deploy/politost/wrangler.jsonc). wrangler must be logged in to the PoliTost Cloudflare account.

- The Worker owns only the routes `politost.it/reader` and `politost.it/reader/*`. The landing page at `politost.it/` is a separate project. Routes take precedence over custom domains on the same host, so the landing page can't shadow the reader.
- Files are static assets under `/reader/`, served without running the Worker. The Worker only answers paths with no file: HTML requests get the app's `index.html`, anything else a 404.
- `workers.dev` and preview URLs are off. The reader is reachable only on `politost.it/reader`.

## Platform integration (optional)

Hosted PoliTost product adds auth, cloud catalog, and license keys on top of this reader. That stack is **not** AGPL reader scope.

For full platform deploy (API + DB + OAuth), see the private platform documentation.
