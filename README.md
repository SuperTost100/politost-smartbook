# Politost Smartbook (Reader)

Viewer web per smartbook interattivi: capitoli, formulario, esercizi, laboratorio, grafici, stampa.

## Avvio

```bash
npm install
npm run dev          # → http://localhost:5173
```

Con API auth/DRM: vedi [server/README.md](server/README.md).

## Comandi

```bash
npm run build
npm run validate:chapter -- --file src/content/esempio/chapters/02-nel-libro.md --chapter-number 2
npm run pack:ptsb -- --dir src/content/esempio --out ../esempio.ptsb
```

## Documentazione

| Documento | Contenuto |
|-----------|-----------|
| [**docs/reader.md**](../docs/reader.md) | Viewer: UI, architettura, stampa, auth |
| [**docs/content-format.md**](../docs/content-format.md) | Sintassi capitoli, `smartbook.json` |
| [**docs/ptsb.md**](../docs/ptsb.md) | Pacchetti `.ptsb` |
| [DEPLOY.md](DEPLOY.md) | Deploy Cloudflare + Render + Neon |
| [docs/SMARTBOOK.md](docs/SMARTBOOK.md) | Reindirizzamento (link legacy) |

Indice monorepo: [../docs/README.md](../docs/README.md)

## Esempio

- Builtin: `src/content/esempio/` → `/libro/esempio`
- Pacchetto: `../esempio.ptsb`

## Struttura

```
src/content/     # Smartbook integrati
src/lib/         # loader, parser, ptsb
src/print/       # Anteprima stampa
server/          # FastAPI auth + DRM
```
