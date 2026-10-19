# Cookie policy

**Versione:** 2026-10-19

Il reader usa la memoria del browser per libri e preferenze. Le promozioni di PoliTost non impostano cookie di tracciamento. Google Analytics e gli annunci Google, se configurati, hanno scelte di consenso separate.

## Memoria del browser

Le chiavi tecniche elencate qui restano nel browser e non tracciano la navigazione fra siti.

**`politost-theme`.** Chiave in localStorage, valore `light` o `dark`. La scriviamo solo quando usi il pulsante del tema. Finché non lo usi, il reader segue il tema del sistema.

**`politost-last-read`.** Chiave in localStorage. Per ogni libro aperto salva l'ultimo capitolo e paragrafo letto, con numero e titolo del capitolo, così la home può proporti «Riprendi». «Rimuovi da questo dispositivo» cancella anche la posizione di quel libro.

**`pwa-install-snooze-until`.** Se chiudi l'avviso di installazione sul telefono, salviamo fino a quando non mostrarlo di nuovo. L'intervallo è 14 giorni.

**IndexedDB `politost-smartbook`.** Contiene due cose. I file `.ptsb` che importi, che restano finché usi «Rimuovi da questo dispositivo». Le copie dei libri del catalogo che hai aperto, una per libro, così si riaprono senza rete. Quando esce una versione nuova di un libro, la copia vecchia viene sostituita.

**Cache `smartbook-static-v4`.** Un service worker tiene in cache la struttura dell'app, le icone e il manifest, per aprire il reader anche senza rete.

## Statistiche e pubblicità

Se Google Analytics è configurato, chiediamo il consenso prima di caricare il suo script. La scelta viene salvata per 180 giorni in `politost-privacy-v1`, in localStorage. `politost_reader_ga` e `politost_reader_ga_<identificativo>` distinguono i browser e le sessioni. Impostiamo una durata massima di 180 giorni senza rinnovo automatico. I cookie sono limitati all’host e al percorso di questa copia del reader. La revoca elimina i cookie Analytics accessibili su questo sito e ricarica la pagina per fermare lo script.

Se AdSense è configurato, il suo gestore del consenso certificato contatta Google per mostrare e ricordare le scelte. Può usare cookie come `FCCDCF` e `FCNEC`. Dopo il consenso richiesto, gli annunci possono usare ulteriori cookie, come `__gads`, `__gpi` e `IDE`, con le durate e finalità indicate da Google. Non tentiamo di cancellare cookie di altri domini. Vedi la [descrizione dei cookie Google](https://policies.google.com/technologies/cookies).

Puoi rifiutare le statistiche e gli annunci e continuare a leggere. "Preferenze privacy" riapre la scelta sulle statistiche. Dentro un libro, il pulsante sul consenso pubblicitario riapre il messaggio Google. Se Google è bloccato, gli annunci non partono e compare una promozione di PoliTost.

## Preferenze della barra

In sessionStorage, `politost-support-dismissed` ricorda la chiusura della promozione per la sessione della scheda. `politost-support-book`, `politost-support-current` e `politost-support-next` mantengono la promozione stabile nel libro e alternano Pyxis, Telegram e TikTok all'apertura successiva. Non sono identificativi pubblicitari e non li inviamo al server.

## Cloudflare

Cloudflare, che ospita il sito, può impostare un cookie tecnico come `__cf_bm` o `cf_clearance` se deve distinguere persone e traffico automatico, per esempio durante un attacco. Serve solo alla sicurezza del sito e non lo usiamo noi. I dettagli sono nella [cookie policy di Cloudflare](https://www.cloudflare.com/cookie-policy/).

## Come cancellare

Per togliere un solo libro usa «Rimuovi da questo dispositivo» sulla sua scheda. Per togliere tutto, cancella i dati del sito dalle impostazioni del browser: spariscono anche i libri importati.

Il resto dell'informativa è nella pagina [privacy](/privacy).
