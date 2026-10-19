# Cookie policy

**Versione:** 2026-10-19

PoliTost Smartbook usa un cookie di sessione e, sul tuo browser, alcune chiavi di memoria locale. Se configurati, Google Analytics e gli annunci Google richiedono le scelte di consenso descritte sotto.

Tutto quello che segue serve a un servizio che chiedi tu: accedere, ricordare il tema che hai scelto e dove eri arrivato, tenere i libri che importi. Questi elementi tecnici non richiedono il consenso per statistiche o pubblicità.

## Necessari

Senza questi elementi il login non funziona.

**`politost_auth`.** Cookie httpOnly, SameSite Lax. Contiene il token di sessione. Se il sito è in HTTPS il cookie è marcato Secure. Dura quanto impostato sul server. In sviluppo il valore predefinito è 7 giorni. In produzione la durata è più breve di 7 giorni. Si cancella anche con «Esci».

## Preferenze e memoria del browser

Non sono cookie e non tracciano la navigazione fra siti.

**`politost-theme`.** Chiave in localStorage, valore `light` o `dark`. La scriviamo solo quando usi il pulsante del tema, per riaprire il reader con la stessa scelta. Finché non lo usi, il reader segue il tema del sistema.

**`pwa-install-snooze-until`.** Se chiudi l'avviso di installazione sul telefono, salviamo fino a quando non mostrarlo di nuovo. L'intervallo è 14 giorni. Serve solo a non ripetere l'avviso.

**`politost-last-read`.** Chiave in localStorage. Per ogni libro aperto su quel browser salva l'ultimo capitolo e paragrafo letto, con numero e titolo del capitolo, così la home può proporti «Riprendi». Resta sul browser e non arriva al server. «Rimuovi da questo dispositivo» e l'uscita dall'account cancellano anche la posizione dei libri che tolgono.

**IndexedDB `politost-smartbook`.** Contiene i file `.ptsb` che importi. Restano su quel browser. «Rimuovi da questo dispositivo» cancella un libro. Uscendo dall'account cancelliamo le copie collegate al tuo utente.

**Cache `smartbook-static-v4`.** Nelle build di produzione un service worker tiene in cache la shell dell'app, icone e manifest, per riaprire la home se la rete manca. Non mette in cache le chiamate a `/api`, `/auth` o `/users`, e non è un profilo di lettura.

## Statistiche e pubblicità

Se Google Analytics è configurato, chiediamo il consenso prima di caricare il suo script. La scelta viene salvata per 180 giorni in `politost-privacy-v1`, in localStorage. `politost_reader_ga` e `politost_reader_ga_<identificativo>` distinguono i browser e le sessioni. Impostiamo una durata massima di 180 giorni senza rinnovo automatico. I cookie sono limitati all’host e al percorso di questa copia del reader. La revoca elimina i cookie Analytics accessibili su questo sito e ricarica la pagina per fermare lo script.

Se AdSense è configurato, il suo gestore del consenso certificato contatta Google per mostrare e ricordare le scelte. Può usare cookie come `FCCDCF` e `FCNEC`. Dopo il consenso richiesto, gli annunci possono usare ulteriori cookie, come `__gads`, `__gpi` e `IDE`, con le durate e finalità indicate da Google. Non tentiamo di cancellare cookie di altri domini. Vedi la [descrizione dei cookie Google](https://policies.google.com/technologies/cookies).

Puoi rifiutare le statistiche e gli annunci e continuare a leggere. "Preferenze privacy" riapre la scelta sulle statistiche. Dentro un libro, il pulsante sul consenso pubblicitario riapre il messaggio Google. Se Google è bloccato, gli annunci non partono e compare una promozione di PoliTost.

## Preferenze della barra

In sessionStorage, `politost-support-dismissed` ricorda la chiusura della promozione per la sessione della scheda. `politost-support-book`, `politost-support-current` e `politost-support-next` mantengono la promozione stabile nel libro e alternano Pyxis, Telegram e TikTok all'apertura successiva. Non sono identificativi pubblicitari e non li inviamo al server.

## Terze parti

Il cookie di sessione e le preferenze tecniche sono di questo sito. I servizi Google facoltativi sono descritti sopra.

Se usi «Accedi con Google», il passaggio avviene sul dominio di Google, che può impostare cookie propri secondo la sua [informativa](https://policies.google.com/privacy). Al ritorno su PoliTost Smartbook vale di nuovo questa pagina.

## Come cambiare scelta

Per tornare al tema del sistema, o togliere ogni dato locale, cancella i dati del sito dalle impostazioni del browser. Cancellare i dati del sito toglie anche i libri importati su quel browser.

Per chiudere la sessione usa «Esci». Quello cancella `politost_auth`. Non cancella da solo i libri importati di altri account sullo stesso browser. I libri del tuo utente sì, all'uscita.

L'informativa sui dati che escono dal browser è la [privacy](/privacy).
