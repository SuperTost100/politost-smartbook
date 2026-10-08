# Politost Smartbook — Wiki

Open-source **reader** for interactive digital textbooks (Smartbooks).

| Repo | Role |
|------|------|
| [politost-smartbook](https://github.com/SuperTost100/politost-smartbook) | This reader (AGPL-3.0) |
| [politost-content](https://github.com/SuperTost100/politost-content) | Content format spec, content-core (bundled in `packages/content-core/`) and the ptsb-pack CLI |
| [politost-smartbook-builder](https://github.com/SuperTost100/politost-smartbook-builder) | Smart Builder, which writes smartbooks |

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
- Print preview as an A4 sheet, printed or saved as PDF by the browser (`/libro/:id/stampa/*`)
- No Politost account required for public/local content

## What lives elsewhere (commercial platform)

Login, cloud catalog, license keys, DRM CEK unwrap, and editorial dashboard are **not** part of this OSS repo. They will live in the Politost platform product.

## License

[GNU AGPL-3.0](https://github.com/SuperTost100/politost-smartbook/blob/main/LICENSE)
