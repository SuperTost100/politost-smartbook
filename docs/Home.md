# Politost Smartbook — Wiki

Open-source **reader** for interactive digital textbooks (Smartbooks).

| Repo | Role |
|------|------|
| [politost-smartbook](https://github.com/SuperTost100/politost-smartbook) | This reader (AGPL-3.0) |
| [politost-smartbook-monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo) | Development monorepo (viewer + builder + ptsb-pack) until split completes |

## Quick links

- [Getting Started](Getting-Started.md)
- [Content Format](Content-Format.md)
- [PTSB Import](PTSB-Import.md)
- [Print Preview](Print.md)
- [Self-Hosting](Self-Hosting.md)
- [Architecture](Architecture.md)
- [Roadmap](Roadmap.md)

## What the reader does

- Renders smartbooks from **builtin folders** (`src/content/`) or **uploaded `.ptsb`** files
- Sections: chapters, formulario, exercises, exams, lab (Python/MATLAB), graphs (Plotly)
- Print preview via Paged.js (`/libro/:id/stampa/*`)
- No Politost account required for public/local content

## What lives elsewhere (commercial platform)

Login, cloud catalog, license keys, DRM CEK unwrap, and editorial dashboard are **not** part of this OSS repo. They will live in the Politost platform product.

## License

[GNU AGPL-3.0](https://github.com/SuperTost100/politost-smartbook/blob/main/LICENSE)
