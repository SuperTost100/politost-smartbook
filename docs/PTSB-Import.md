# PTSB Import

`.ptsb` is a portable smartbook package (ZIP plain or encrypted container).

## Variants

| Magic | Type | Reader behavior |
|-------|------|-----------------|
| `PK` | Plain ZIP | Opens offline after upload |
| `PTSB` | Encrypted | Requires platform CEK when DRM enabled |

## Package contents

```
ptsb.json
smartbook.json
chapters/*.md
esercizi.md, esami.md, ide.json, grafici.json  # optional
assets/*
```

## Import in the reader

1. Home → drag & drop or select `.ptsb`
2. Parse + validate structure
3. Store in **IndexedDB** (browser-local, no sync)
4. Book appears with **Importato** badge

| Case | Result |
|------|--------|
| Same `id` as builtin book | Upload rejected |
| Plain `.ptsb` | Works without login |
| Encrypted `.ptsb` | Needs platform integration (CEK from server) |

## Create a plain package

```bash
npm run pack:ptsb -- --dir src/content/esempio --out esempio.ptsb
```

For encrypted packs and CLI validation, use **[ptsb-pack](https://github.com/SuperTost100/politost-smartbook-monorepo/tree/main/ptsb-pack)** in the monorepo.

## Security note

Client-side DRM is **deterrent**, not absolute protection. Adequate for controlled educational distribution with server-side licensing.
