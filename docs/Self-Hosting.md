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
| Node version | 20+ |

## Builtin books

Add folders under `src/content/<book-id>/` before build. Each needs `smartbook.json` + at least one chapter.

**Do not** bake licensed material into `src/content/` — distribute encrypted `.ptsb` instead.

## Environment variables

| Variable | When |
|----------|------|
| *(none)* | OSS self-host, plain books + upload only |
| `VITE_API_URL` | Only if wrapping with Politost platform (auth/DRM) |

## Headers

`public/_headers` is processed at build for CSP. Regenerated via `scripts/generate-headers.mjs`.

## Platform integration (optional)

Hosted Politost product adds auth, cloud catalog, and license keys on top of this reader. That stack is **not** AGPL reader scope.

For full platform deploy (API + DB + OAuth), see the monorepo `DEPLOY.md` until the platform repo splits out.
