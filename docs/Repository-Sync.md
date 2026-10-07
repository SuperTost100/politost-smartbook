# Standalone repository sync

Updated 2026-10-07. Continue implementation in the standalone repositories below. The monorepo is a private historical backup.

| Repository | Canonical responsibility | Sync result |
|------------|--------------------------|-------------|
| [politost-smartbook](https://github.com/SuperTost100/politost-smartbook) | Reader UI and print | Imported redesign plus saved main-branch fixes |
| [politost-content-core](https://github.com/SuperTost100/politost-content-core) | Parser, renderer, validators, PTSB reader | Already current at 0.2.0 |
| [politost-content-format](https://github.com/SuperTost100/politost-content-format) | Content specification | Already current at format 1.1; corrected builder link |
| [politost-ptsb-pack](https://github.com/SuperTost100/politost-ptsb-pack) | Python pack CLI | Already current; corrected integration links |
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

The reader includes `packages/content-core/` so a fresh clone can build without the old monorepo. Make parser changes in the standalone content-core repository, then update this copy and run the reader checks. The Python platform includes its packaging dependency under `packages/ptsb-pack/`; update that from the standalone ptsb-pack repository.

Smart Builder pins content-core v0.2.0. Pyxis vendors the same package version. Their parser source matches the current standalone content-core source; no dependency replacement was needed for this migration.

Future reader UI work belongs here, rather than in the monorepo design branch. Content-format changes require coordinated parser, reader and builder updates.
