# SMARTBOOK.md (reindirizzamento)

La documentazione monolitica è stata **suddivisa e spostata** nella cartella `docs/` del monorepo.

## Nuova struttura

| Argomento | Documento |
|-----------|-----------|
| Indice generale | [../../docs/README.md](../../docs/README.md) |
| Formato contenuti (sintassi, file) | [../../docs/content-format.md](../../docs/content-format.md) |
| Viewer (reader) | [../../docs/reader.md](../../docs/reader.md) |
| Formato `.ptsb` | [../../docs/ptsb.md](../../docs/ptsb.md) |
| Builder AI | [../../docs/builder.md](../../docs/builder.md) |
| Deploy produzione | [../DEPLOY.md](../DEPLOY.md) |

## Avvio rapido viewer

```bash
npm install && npm run dev
```

Esempio integrato: `/libro/esempio` — sorgente in `src/content/esempio/`.

## Comandi frequenti

```bash
npm run validate:chapter -- --file src/content/esempio/chapters/02-nel-libro.md --chapter-number 2
npm run pack:ptsb -- --dir src/content/esempio --out esempio.ptsb
npm run test:print      # anteprima stampa (Playwright)
npm run test:e2e        # suite completa
```

---

*Questo file resta per compatibilità con link vecchi. Non aggiungere nuovo contenuto qui — aggiornare `docs/` nella root del monorepo.*
