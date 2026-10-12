# Books repo

Status: proposal. Nothing here is built yet.

Public smartbooks move out of this repo into `SuperTost100/politost-books`. Anyone can open a PR there to add or fix a book. CI validates and packs each book, and on merge publishes the packages plus a `catalog.json`. The reader fetches that catalog at runtime, so a new book never needs a reader deploy.

No accounts, no backend. Everything is static files.

Launch scope (free books, no accounts) is in [Roadmap](Roadmap.md#public-launch). Reader deploy settings are in [Self-Hosting](Self-Hosting.md).

## Why

Today books live in `src/content/<id>/` and Vite bakes them into the build (`import.meta.glob` in `src/lib/loader.ts`). That has three problems once other people write books:

- A book PR is a PR against the app. Reviewers see content and code in one place.
- Contributors need the full reader toolchain (Pyodide copy, Playwright, Vite) to add a chapter.
- Every typo fix redeploys the reader.

## Repo layout

```text
politost-books/
├── books/
│   ├── analisi-1/
│   │   ├── smartbook.json        # id must equal the folder name; version required
│   │   ├── chapters/
│   │   │   ├── 01-limiti.md
│   │   │   └── 02-derivate.md
│   │   ├── esercizi.md           # optional
│   │   ├── esami.md              # optional
│   │   ├── ide.json              # optional
│   │   ├── grafici.json          # optional
│   │   ├── cover.svg             # optional, shown on the home page
│   │   └── assets/
│   └── fisica-1/
│       └── ...
├── scripts/
│   ├── check.ts                  # validate every book (or only changed ones)
│   └── build.ts                  # pack every book, write dist/catalog.json
├── .github/
│   ├── workflows/
│   │   ├── check.yml             # on pull_request
│   │   └── publish.yml           # on push to main
│   ├── CODEOWNERS                # books/analisi-1/ @author
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md               # how to write a book, how to preview it
├── LICENSE                       # code: MIT
├── LICENSE-CONTENT               # books: CC BY-SA 4.0 unless the book says otherwise
└── package.json
```

`package.json` depends on content-core through the tarball attached to its release in [politost-content](https://github.com/SuperTost100/politost-content), since it is not on npm:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "check": "tsx scripts/check.ts",
    "build": "tsx scripts/build.ts"
  },
  "devDependencies": {
    "@politost/content-core": "https://github.com/SuperTost100/politost-content/releases/download/content-core-v0.4.0/politost-content-core-0.4.0.tgz",
    "tsx": "^4.22.4"
  }
}
```

The release tag pins the format. Bumping it is a deliberate PR, and CI then revalidates every book against the new rules.

## What `check.ts` enforces

Per book folder:

1. `smartbook.json` parses, and `id` equals the folder name.
2. `version` is present and semver. `validateBookMeta` already checks the shape, and here it becomes mandatory.
3. `validateBundle` passes. That is the same call `scripts/pack-ptsb.ts` makes today, and it covers chapters, exercises, exams and asset references.
4. The packed size stays under `PTSB_ZIP_LIMITS` (50 MB compressed, 5 MB per file, 200 files). The reader rejects anything bigger, so CI must reject it first.
5. If any file in the book changed relative to `main`, `version` must be higher than on `main`. Packages are cached forever by version, so an unchanged version would serve stale content.
6. No book id appears twice across the repo.

Errors print as GitHub annotations (`::error file=...,line=...::msg`), so they appear inline on the PR diff.

## Packing

`build.ts` packs each book the same way `pack-ptsb.ts` does now: a plain ZIP with a `ptsb.json` manifest. It writes:

```text
dist/
├── catalog.json
├── books/
│   ├── analisi-1@1.2.0.ptsb
│   └── fisica-1@0.3.0.ptsb
├── covers/
│   └── analisi-1.svg
└── _headers
```

To avoid two copies of the packing code, move the body of `scripts/pack-ptsb.ts` into content-core (in politost-content) as `packBook(files): Uint8Array`. The reader script and the books repo then both call it. The Python `ptsb-pack` CLI in politost-content stays for encrypted packages.

### `catalog.json`

```json
{
  "catalogVersion": 1,
  "generatedAt": "2026-10-07T09:00:00Z",
  "books": [
    {
      "id": "analisi-1",
      "title": "Analisi 1",
      "subject": "Matematica",
      "authors": ["Mario Rossi"],
      "version": "1.2.0",
      "specVersion": "1.2",
      "chapters": 12,
      "package": "books/analisi-1@1.2.0.ptsb",
      "bytes": 834221,
      "sha256": "9f2c…",
      "cover": "covers/analisi-1.svg"
    }
  ]
}
```

The catalog is small and lists only metadata. The reader downloads a package when someone opens that book, not at startup.

### `_headers` on the books site

```text
/catalog.json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300

/books/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/octet-stream

/covers/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=86400
```

## CI

### `check.yml`, on every PR

Runs with `pull_request`, never `pull_request_target`. PRs from forks get a read-only token and no secrets, which is fine because nothing here needs them.

```yaml
name: check
on:
  pull_request:
    paths: ['books/**', 'scripts/**', 'package*.json']

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0              # check.ts diffs against origin/main for the version-bump rule
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run check -- --base origin/${{ github.base_ref }}
      - run: npm run build -- --only-changed --base origin/${{ github.base_ref }}
      - uses: actions/upload-artifact@v4
        with:
          name: preview-packages
          path: dist/books/*.ptsb
          retention-days: 14
```

To preview a book, a reviewer downloads the artifact and drops the `.ptsb` into the reader's upload button. That path already exists and needs no new code.

### `publish.yml`, on push to `main`

```yaml
name: publish
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: publish
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=politost-books --branch=main
```

It publishes to its own Cloudflare Pages project, for example `books.politost.it`. The reader stays a separate project. Old `name@version.ptsb` files drop out of the next deploy, which is fine: the catalog only points at current versions, and the reader keeps its cached copy until the catalog lists a newer version.

### Optional: agent content review

CI can't check whether an explanation is correct or an exercise is solvable. A T3 Code scheduled task with a webhook trigger can. Point a GitHub webhook (`pull_request`, signed with a secret) at the task URL. The task checks out the PR, reads the changed chapters and posts one review comment. It advises and never blocks merge. Add this once PRs actually start arriving.

## Reader changes

All in this repo.

1. **Config.** Add `VITE_BOOKS_URL`, e.g. `https://books.politost.it`. If it's unset, the reader behaves exactly as it does today (builtin plus upload), so self-hosters lose nothing.
2. **CSP.** `scripts/generate-headers.mjs` appends `VITE_BOOKS_URL` to `connect-src` and `img-src`, next to `VITE_API_URL`.
3. **`src/lib/remoteCatalog.ts` (new).**
   - `initRemoteBooks()` fetches `catalog.json` and registers entries in a new `remoteRegistry` in `loader.ts`, with `source: 'remote'`. Skip entries whose `specVersion` is newer than `CONTENT_FORMAT_VERSION`, or show them with a "update the reader" notice.
   - `ensureRemoteBook(id)` fetches the package, checks `bytes` and `sha256` (`crypto.subtle.digest`), then calls `parsePtsbFile(new File([blob], name))`. That's the same parser the upload button uses, with the same zip limits. Reject `encrypted` packages, since remote books are public only.
   - Cache packages in IndexedDB keyed by `id@version`. `ptsbStore.ts` already does this for uploads, so reuse it with a separate store name. Opening a book a second time works offline.
4. **`loader.ts`.** `loadBundle` and `getCatalog` gain the remote registry. Precedence is uploaded > remote > builtin, so an author can test a local `.ptsb` over the published one.
5. **`App.tsx`.** Call `initRemoteBooks()` next to `initBuiltinBooks()`. A failed catalog fetch logs and leaves the home page with builtin books only.
6. **`src/content/`.** Keep `esempio` as the builtin demo and offline fallback. Every other book lives in the books repo.

`initCloudBooks` and the `cloud` source stay as they are. They belong to the licensed platform path.

## Order of work

1. Move packing into content-core (`packBook`) in politost-content, release `content-core-v0.5.0`, and copy it into `packages/content-core/` here as [Repository sync](Repository-Sync.md) describes.
2. Create `politost-books` with `esempio` copied in, `check.ts`, `build.ts` and both workflows. Deploy to Pages.
3. Reader: `VITE_BOOKS_URL`, CSP, `remoteCatalog.ts`, loader precedence, e2e test against a fixture catalog served by Playwright.
4. Write `CONTRIBUTING.md` for authors: folder layout, `npm run check`, how to preview with the upload button.
5. Later, once PRs come in: the agent review webhook.
