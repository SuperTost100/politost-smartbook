# Politost Smartbook

Open-source web reader for **Smartbooks** — interactive digital textbooks with formulas, exercises, code lab, graphs, and print preview.

**License:** [AGPL-3.0](LICENSE)

## Features

- Builtin books from `src/content/` + `.ptsb` file import (browser-local)
- Sections: chapters, formulario, exercises, exams, lab (Python/MATLAB), graphs
- Print preview (`/libro/:id/stampa/*`) with Paged.js
- Dark mode, accessibility landmarks, cookie consent

## Quick start

```bash
npm install
npm run dev   # → http://localhost:5173
```

Open `/libro/esempio` for the demo book.

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

**[GitHub Wiki](https://github.com/SuperTost100/politost-smartbook/wiki)** — enable via *Wiki → Create the first page*, then sync from `docs/`.

## Development monorepo

Active development lives in [politost-smartbook-monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo) until the rewrite split lands here.

## Tests

```bash
npm run test:content
npm run test:print
npm run test:e2e
```

## Related

| Repo | Role |
|------|------|
| [politost-smartbook-monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo) | Monorepo (transition) |
| Politost platform *(private)* | Auth, cloud, license keys |
