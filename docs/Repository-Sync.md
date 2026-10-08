# Standalone repository sync

Updated 2026-10-08. Continue implementation in the standalone repositories below. The monorepo is a private historical backup.

| Repository | Canonical responsibility | Sync result |
|------------|--------------------------|-------------|
| [politost-smartbook](https://github.com/SuperTost100/politost-smartbook) | Reader UI and print | Imported redesign plus saved main-branch fixes |
| [politost-content](https://github.com/SuperTost100/politost-content) | Content spec (`spec/`), parser, renderer, validators, PTSB reader (`packages/content-core`), Python pack CLI (`packages/ptsb-pack`) | content-core 0.4.0, format 1.2, ptsb-pack 1.2.0. Merged with content-format and ptsb-pack on 2026-10-08, then renamed from `politost-content-core` |
| [politost-platform](https://github.com/SuperTost100/politost-platform) | Commercial backend and course books | Extracted into a private repository |
| [politost-smartbook-builder](https://github.com/SuperTost100/politost-smartbook-builder) | Current authoring app | Newer independent implementation; preserved |
| [politost-pyxis](https://github.com/SuperTost100/politost-pyxis) | Desktop study app | Newer independent implementation; preserved |

The archived private `politost-builder` is withdrawn. Do not replace the current Smart Builder with the old Python pipeline.

## Reader provenance

- Redesign source: monorepo `feat/reader-design-system`, commit `0ca7a04`.
- Saved fixes: monorepo `main`, commit `722c3aa`.
- Combined in an isolated checkout. Legal-page controls and consent fixes were preserved while applying the new design-system styles.
- Standalone adjustments: local package paths, public example-only catalog, explicit platform opt-in, generated Pyodide assets excluded from Git, and local documentation links.

A dependency update merged into monorepo main during the sync. Its content-core DOMPurify requirement and lockfile were also carried into the standalone package and reader.

The public reader contains no commercial backend or private course books. Those are in `politost-platform`. Keep licensed books out of public reader commits and public static bundles.

## Shared-package maintenance

The reader includes `packages/content-core/` so a fresh clone can build without the old monorepo. Make parser changes in the content repository, then copy its `packages/content-core` here and run the reader checks. The copy skips the test that compares `CONTENT_FORMAT_VERSION` with `spec/VERSION`, since the spec is not here. The Python platform includes its packaging dependency under `packages/ptsb-pack/`; update that from the content repository's `packages/ptsb-pack`.

content-core releases are tags `content-core-vX.Y.Z` with the npm tarball attached. Smart Builder pins v0.2.1 and Pyxis vendors 0.2.0; both have issues open to move to 0.3.x (politost-smartbook-builder#3, politost-pyxis#35).

Future reader UI work belongs here, rather than in the monorepo design branch. Content-format changes require coordinated parser, reader and builder updates.
