# Repository status

The reader extraction and design-system migration are complete. Continue reader development in this repository. Shared parser changes and syntax changes belong in the [content repository](https://github.com/SuperTost100/politost-content) (content-core and the spec), and authoring changes in the private [Smart Builder](https://github.com/SuperTost100/politost-smartbook-builder).

See [Repository-Sync.md](Repository-Sync.md) for migration provenance and package update instructions. The old monorepo and withdrawn builder are historical.

## Public launch

Decided in October 2026. This is the scope of the first public site.

- **Free, public books only.** No licensed books, no DRM and no activation keys at launch. Every book on the site is a plain `.ptsb` that anyone can download.
- **No student accounts.** Readers open the site and read. Nothing to sign up for, and no login UI. `VITE_PLATFORM_ENABLED` stays unset, so the reader runs with `defaultReaderConfig` and every platform feature off.
- **More than one author.** Books come in through PRs to a separate books repo, described in [Books repo](Books-Repo.md). Authors need a GitHub account and readers don't.
- **Static hosting on Cloudflare.** Two projects: the reader, a Worker with static assets on `politost.it/reader` ([Self-hosting](Self-Hosting.md#the-public-politost-site)), and the books site, a Pages project on `books.politost.it`. No server, no database.
- **Not Lakebed.** Lakebed v0 allows no npm imports and no CSS files, caps a deploy at 1 MiB and allows 10,000 requests per deploy per day. The reader depends on React, KaTeX, Plotly, Pyodide and Monaco, and `public/` alone is 14 MB. It may suit a small side service later, but it can't host the reader.
- **Other Ping Labs tools, not now.** UploadThing and Shoo (auth) solve problems the launch doesn't have: no uploads to a server and no accounts.

### What comes back later

| Feature | Trigger | Where it lives |
|---------|---------|----------------|
| Student accounts (progress sync, saved notes) | Readers ask for it across devices | politost-platform (private) |
| Licensed books, DRM, activation keys | First paid or restricted book | politost-platform |
| Authoring without git | Authors who don't use git | [Smart Builder](https://github.com/SuperTost100/politost-smartbook-builder) |
| Agent content review on PRs | Regular external PRs | T3 Code webhook task, see [Books repo](Books-Repo.md#optional-agent-content-review) |

Until one of those triggers, the platform code paths (`initCloudBooks`, `ptsbCrypto`, the auth calls in `api.ts`) stay in the reader behind `VITE_PLATFORM_ENABLED`. Don't delete them, and don't build on them.

### Before the site goes public

1. Done: `src/legal/` (privacy, cookie, ToS) describes the public site, with no accounts. The platform texts moved to `*.platform.it.md` and show only when `VITE_PLATFORM_ENABLED=true`.
2. Done: the home page shows the remote catalog plus `esempio`, and an unreachable catalog leaves the builtin books visible. `e2e/remote-books.spec.ts` covers both.
3. Reader CI is green on `main`, including the Playwright suite.
4. Done: the reader is the Worker `politost-reader` on `politost.it/reader`, and the books site is the Pages project `politost-books` on `books.politost.it`. The reader is a Worker, not a Pages project, because Pages can't serve a subfolder of a domain. See [Self-hosting](Self-Hosting.md#the-public-politost-site).
5. Open: the landing page at `politost.it/`. Until it ships, the root answers with Cloudflare error 526, because the old DNS record points at a server without a valid certificate.
