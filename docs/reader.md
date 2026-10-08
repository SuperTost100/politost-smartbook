# Reader — politost-smartbook

Il **reader** è l’applicazione web con cui studenti e docenti aprono gli smartbook: catalogo, lettura capitoli, formulario, esercizi, laboratorio, grafici e stampa PDF.

Codice: cartella [standalone reader](../).

Formato dei contenuti: [content-format](https://github.com/SuperTost100/politost-content/blob/main/spec/content-format.md).
Pacchetti distribuiti: [ptsb.md](ptsb.md).

---

## Indice

1. [Esperienza utente](#1-esperienza-utente)
2. [Avvio e comandi](#2-avvio-e-comandi)
3. [Caricamento libri](#3-caricamento-libri)
4. [Architettura](#4-architettura)
5. [Parsing e rendering](#5-parsing-e-rendering)
6. [Sezioni interattive](#6-sezioni-interattive)
7. [Stampa](#7-stampa)
8. [Autenticazione e licenze](#8-autenticazione-e-licenze)
9. [Sviluppo e test](#9-sviluppo-e-test)

---

## 1. Esperienza utente

### Home

- Elenco smartbook **integrati** (`src/content/`) e **importati** (`.ptsb` da IndexedDB)
- Upload drag-and-drop di file `.ptsb`
- Il libro dimostrativo **Guida di esempio** (`/libro/esempio`) è il primo in catalogo
- «Riprendi» sulla scheda di un libro già aperto riporta all'ultimo capitolo e paragrafo letto (`src/lib/readingPosition.ts`, chiave `politost-last-read` in localStorage)

### Navigazione libro

| Sezione | URL |
|---------|-----|
| Capitoli | `/libro/<id>/capitolo/<chapter-id>` |
| Formulario | `/libro/<id>/formulario` |
| Esercizi | `/libro/<id>/esercizi` |
| Prove d'esame | `/libro/<id>/esami` |
| Laboratorio | `/libro/<id>/laboratorio` |
| Grafici | `/libro/<id>/grafici` |

Barra paragrafi sticky nei capitoli; formulario generato dalle formule numerate nei `.md`.

### Mobile (≤768px)

Breakpoint contract in `global.css` (`dvh`, `safe-area-inset`). Landscape phones (`max-height: 520px`) use the same layout.

| Feature | Mobile behavior |
|---------|-----------------|
| Capitoli | Inline chapter picker under section tabs; section nav hides on scroll |
| Formulario / Esercizi / Esami | Full-width; no horizontal page scroll |
| Laboratorio / Grafici | Hidden from section nav (desktop-only) |
| Upload `.ptsb` | Large tap target; no drag-and-drop |
| PWA | `manifest.webmanifest` + minimal service worker; install banner on phone |

**Manual device checklist** (before release):

1. iOS Safari — open `/libro/esempio`, scroll chapter, open formulario, upload `.ptsb` from Files
2. Android Chrome — same flow; verify install banner → Add to Home Screen
3. Landscape phone — chrome compacts; chapter picker stays under header

```bash
npx playwright test e2e/mobile.spec.ts --project=mobile   # local only; reader-ci does not run this spec
```

---

## 2. Avvio e comandi

### Solo viewer

```bash
cd politost-smartbook
npm install
npm run dev
```

→ <http://localhost:5173>

First `npm install` copies Pyodide — wait for `Copied pyodide assets`, then start the dev server.

### Viewer + API (auth, DRM)

```bash
# Terminale 1
cd politost-smartbook/server
python3 -m venv .venv && source .venv/bin/activate
pip install -e . -e ../packages/ptsb-pack
cp .env.example .env
uvicorn main:app --reload --port 8001

# Terminale 2
cd politost-smartbook
npm run dev
```

Il proxy Vite inoltra `/api` e `/auth` verso `:8001`.

### Comandi utili

```bash
npm run build
npm run validate:chapter -- --file src/content/esempio/chapters/02-nel-libro.md --chapter-number 2
npm run pack:ptsb -- --dir src/content/esempio --out esempio.ptsb
npm run test:print
npm run test:e2e
```

---

## 3. Caricamento libri

Due sorgenti unite in `src/lib/loader.ts`:

| Sorgente | Quando | Persistenza |
|----------|--------|-------------|
| **Builtin** | Cartelle `src/content/*/smartbook.json` | Build-time (`import.meta.glob`) |
| **Upload** | File `.ptsb` dalla home | IndexedDB (`ptsbStore.ts`) |

Flusso upload:

1. Parse ZIP / container PTSB (`src/lib/ptsb.ts`, plain packages through `readPtsb` helpers in `@politost/content-core`)
2. Validazione capitoli
3. Salvataggio in IndexedDB
4. Registro runtime `registerUploadedBook()`

Regole:

- Stesso `id` di un builtin → upload rifiutato
- `.ptsb` cifrato senza login → messaggio di accesso richiesto
- Ricaricando la pagina i libri importati restano (solo quel browser)

Dettaglio formato: [ptsb.md](ptsb.md).

---

## 4. Architettura

```text
politost-smartbook/
├── src/
│   ├── content/           # Smartbook integrati
│   ├── lib/
│   │   ├── loader.ts      # Catalogo builtin + upload
│   │   ├── parser.ts      # Markdown → AST
│   │   ├── ptsb.ts        # Import pacchetti
│   │   └── validateChapter.ts
│   ├── components/        # UI lettura (ContentFlow, esercizi, …)
│   ├── print/             # Anteprima stampa (foglio A4, routes, bodies)
│   ├── pages/             # Home, SmartbookPage, Auth, Legal
│   └── context/AuthContext.tsx
├── server/                # FastAPI — auth, licenze, content-key
└── scripts/               # validate-chapter, pack-ptsb
```

### Stack

| Area | Tecnologia |
|------|------------|
| UI | React 19, TypeScript, Vite 8 |
| Routing | React Router 7 |
| Formule | KaTeX |
| Editor lab | Monaco, incluso nel bundle (`src/lib/monacoSetup.ts`) |
| Grafici | Plotly.js |
| Python | Pyodide in `public/pyodide/`, in un worker (`src/workers/pythonWorker.ts`) |
| MATLAB | `matlabRunner.ts` (interprete didattico) |
| Unzip `.ptsb` | fflate |

---

## 5. Parsing e rendering

```text
chapters/*.md
  → parseChapterMarkdown()
  → paragrafi, formule, immagini
  → preprocessContent() (hover, link ref:)
  → ContentFlow (schermo o stampa)
```

```text
esercizi.md / esami.md
  → parseExercises()
  → blocchi exercise + hint + solution
```

Il **formulario** non ha file dedicato: aggrega `chapter.formulas` da tutti i capitoli.

### Spaziatura inline

Il parser (`renderContent.ts`) spezza il testo attorno a grassetto (`**…**`), link `[[link:…]]` e riferimenti formula `[[hover:…]]`. Gli spazi **prima e dopo** questi elementi vanno mantenuti nel sorgente `.md` e nel rendering (`renderInlineFragment` conserva gli spazi ai bordi di ogni frammento).

---

## 6. Sezioni interattive

### Laboratorio

- Python via Web Worker + Pyodide (`src/workers/pythonWorker.ts`)
- MATLAB/Octave: interprete locale limitato
- Configurazione snippet: `ide.json`, vedi [Content-Format.md](Content-Format.md#lab-idejson)

### Grafici

- Tab da `grafici.json`
- Tipo `function`: campionamento espressioni → Plotly
- Tipo `plotly`: config nativa

---

## 7. Stampa

Capitoli/esercizi con `printable: true` espongono **Versione stampabile**.

| Contenuto | URL anteprima |
|-----------|---------------|
| Capitolo | `/libro/<id>/stampa/capitolo/<chapter-id>` |
| Formulario | `/libro/<id>/stampa/formulario` |
| Esercizi | `/libro/<id>/stampa/esercizi` |
| Esami | `/libro/<id>/stampa/esami` |

Implementazione in `src/print/`:

- `PrintPage.tsx` — shell e toolbar
- `PrintDocument.tsx` — il foglio A4: intestazioni e numeri di pagina in `@page`, filigrana per le copie con licenza; la stampa è quella del browser (`window.print()`)
- `bodies/` — capitolo, formulario, esercizi
- Rendering testuale condiviso: `ContentFlow variant="print"`

In stampa: hint/soluzioni sempre visibili; laboratorio e grafici non stampabili.

```bash
npm run test:print   # Playwright: capitolo, formulario ed esercizi del libro esempio, PDF A4
npm run test:e2e     # full suite (includes print)
```

---

## 8. Autenticazione e licenze

| `access` in smartbook.json | Login | Licenza server |
|----------------------------|-------|----------------|
| `public` | Opzionale | No |
| `licensed` | Obbligatorio per `.ptsb` cifrati | Sì |

- Login email/password o Google OAuth
- API: [`server/README.md`](https://github.com/SuperTost100/politost-platform/blob/main/server/README.md)
- Endpoint DRM: `POST /api/books/{id}/content-key`
- Watermark utente su contenuti licenziati

Libri in `src/content/` sono pubblici nel bundle (non usare per materiale riservato — distribuire come `.ptsb` cifrato).

Deploy: [DEPLOY.md](../DEPLOY.md).

---

## 9. Sviluppo e test

| Test | Comando |
|------|---------|
| Stampa | `npm run test:print` |
| E2E Playwright | `npm run test:e2e` |
| Mobile E2E (iPhone 13) | `npx playwright test e2e/mobile.spec.ts --project=mobile` |
| Validazione capitolo | `npm run validate:chapter` |

Aggiungere un builtin: nuova cartella sotto `src/content/` — nessuna modifica a `loader.ts` se `smartbook.json` è valido.

Testi legali pubblicati nel reader: `politost-smartbook/src/legal/`. La versione accettata in account è `src/legal/versions.json`. Il recapito del titolare è `contactEmail` in quel file. Prima di un lancio pubblico il titolare deve far rileggere i testi a un legale e inserire il proprio indirizzo.
