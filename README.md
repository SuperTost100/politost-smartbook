# Politost Smartbook

Open-source web reader for **Smartbooks** — interactive digital textbooks with formulas, exercises, code lab, graphs, and print preview.

**License:** [AGPL-3.0](LICENSE)

## Features

- Builtin demo book (`src/content/esempio/`) + plain `.ptsb` file import (browser-local, IndexedDB)
- Sections: chapters, formulario, exercises, exams, lab (Python/MATLAB), graphs
- Print preview (`/libro/:id/stampa/*`) with Paged.js
- Dark mode, accessibility landmarks, cookie consent

Platform features (auth, DRM, cloud catalog, audit, watermark) are **off by default** via `ReaderConfig` in `src/config/readerConfig.ts`. Encrypted `.ptsb` files show a message that the Politost platform is required.

## Quick start

```bash
npm install
npm run dev   # → http://localhost:5173
```

Open `/libro/esempio` for the demo book.

Optional: set `VITE_ENABLE_PLATFORM_PROXY=true` when running `npm run dev` to proxy `/api` to a local platform server (development only).

## Documentation

| Topic | Doc |
|-------|-----|
| Index | [docs/Home.md](docs/Home.md) |
| Setup | [docs/Getting-Started.md](docs/Getting-Started.md) |
| Authoring | [docs/Content-Format.md](docs/Content-Format.md) |
| `.ptsb` import | [docs/PTSB-Import.md](docs/PTSB-Import.md) |
| Deploy | [docs/Self-Hosting.md](docs/Self-Hosting.md) |
| Architecture | [docs/Architecture.md](docs/Architecture.md) |
| Roadmap | [docs/Roadmap.md](docs/Roadmap.md) |

**[GitHub Wiki](https://github.com/SuperTost100/politost-smartbook/wiki)**

## Development

Active platform work lives in [politost-smartbook-monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo). This repo is the AGPL reader distribution.

## Tests

```bash
npm run test:content
npm run test:print
npm run test:e2e
```

## Structure

```
packages/content-core/   # Parser, renderer, validator
packages/print-engine/   # Paged.js print iframe
src/                     # Viewer app
src/content/esempio/     # Demo smartbook
```

## Related

| Repo | Role |
|------|------|
| [politost-smartbook-monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo) | Monorepo (transition) |
| Politost platform *(private)* | Auth, cloud, license keys |
