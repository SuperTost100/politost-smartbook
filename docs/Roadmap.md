# Roadmap

Extraction from the [development monorepo](https://github.com/SuperTost100/politost-smartbook-monorepo). Phases are executed in order.

## Phase A — `content-core`

Extract parser + renderer + chapter validator into a testable package. Zero behavior change in the reader.

**Exit:** `npm run test:content` + `npm run test:e2e` green.

## Phase B — Print (done)

Print preview is inlined in `src/print/` with `ContentFlow variant="print"` and `packages/pagedjs-politost`. No separate `@politost/print-engine` package.

**Exit:** `npm run test:print` + `npm run test:print:unit` green.

## Phase C — Reader vs platform frontend

- **This repo:** builtin catalog, upload, book routes — no `/auth`
- **Platform repo (private):** login, cloud, keys — embeds reader via npm

## Phase D — Platform API

Activation keys, cloud chapter delivery, editorial dashboard. Not in AGPL reader.

## Phase E — Builder split

`smartbook-builder` → separate OSS repo, depends on published `content-core` / `ptsb-spec`.

## Tracking

GitHub Issues on this repo are tagged by phase. Monorepo canonical plan: `docs/rewrite-brief.md`.

## Contributing

1. Pick an open issue labeled `phase-a`, `phase-b`, …
2. Branch from `main`
3. One phase concern per PR
4. All existing e2e tests must pass
