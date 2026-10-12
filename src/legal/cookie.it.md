# Cookie policy

**Versione:** 2026-10-12

Il reader non imposta cookie. Usa solo la memoria del tuo browser, per servizi che chiedi tu: ricordare il tema, dove eri arrivato e i libri che hai aperto o importato. Per questo non chiediamo il consenso e non mostriamo un banner.

## Memoria del browser

Nessuna di queste chiavi arriva al server o traccia la navigazione fra siti.

**`politost-theme`.** Chiave in localStorage, valore `light` o `dark`. La scriviamo solo quando usi il pulsante del tema. Finché non lo usi, il reader segue il tema del sistema.

**`politost-last-read`.** Chiave in localStorage. Per ogni libro aperto salva l'ultimo capitolo e paragrafo letto, con numero e titolo del capitolo, così la home può proporti «Riprendi». «Rimuovi da questo dispositivo» cancella anche la posizione di quel libro.

**`pwa-install-snooze-until`.** Se chiudi l'avviso di installazione sul telefono, salviamo fino a quando non mostrarlo di nuovo. L'intervallo è 14 giorni.

**IndexedDB `politost-smartbook`.** Contiene due cose. I file `.ptsb` che importi, che restano finché usi «Rimuovi da questo dispositivo». Le copie dei libri del catalogo che hai aperto, una per libro, così si riaprono senza rete. Quando esce una versione nuova di un libro, la copia vecchia viene sostituita.

**Cache `smartbook-static-v4`.** Un service worker tiene in cache la struttura dell'app, le icone e il manifest, per aprire il reader anche senza rete.

## Analitici

Nessuno. Non carichiamo Google Analytics, Matomo, Cloudflare Web Analytics o altri strumenti di statistica. Se un giorno li aggiungessimo, chiederemmo prima il consenso.

## Cloudflare

Cloudflare, che ospita il sito, può impostare un cookie tecnico come `__cf_bm` o `cf_clearance` se deve distinguere persone e traffico automatico, per esempio durante un attacco. Serve solo alla sicurezza del sito e non lo usiamo noi. I dettagli sono nella [cookie policy di Cloudflare](https://www.cloudflare.com/cookie-policy/).

## Come cancellare

Per togliere un solo libro usa «Rimuovi da questo dispositivo» sulla sua scheda. Per togliere tutto, cancella i dati del sito dalle impostazioni del browser: spariscono anche i libri importati.

Il resto dell'informativa è nella pagina [privacy](/privacy).
