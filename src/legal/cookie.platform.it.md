# Cookie policy

**Versione:** 2026-11-03

PoliTost Smartbook usa un cookie di sessione e, sul tuo browser, alcune chiavi di memoria locale. Non usiamo cookie di profilazione o di statistica.

Tutto quello che segue serve a un servizio che chiedi tu: accedere, ricordare il tema che hai scelto e dove eri arrivato, tenere i libri che importi. Per questo non chiediamo il consenso e non mostriamo un banner.

## Necessari

Senza questi elementi il login non funziona.

**`politost_auth`.** Cookie httpOnly, SameSite Lax. Contiene il token di sessione. Se il sito è in HTTPS il cookie è marcato Secure. Dura quanto impostato sul server. In sviluppo il valore predefinito è 7 giorni. In produzione la durata è più breve di 7 giorni. Si cancella anche con «Esci».

## Preferenze e memoria del browser

Non sono cookie e non tracciano la navigazione fra siti.

**`politost-theme`.** Chiave in localStorage, valore `light` o `dark`. La scriviamo solo quando usi il pulsante del tema, per riaprire il reader con la stessa scelta. Finché non lo usi, il reader segue il tema del sistema.

**`pwa-install-snooze-until`.** Se chiudi l'avviso di installazione sul telefono, salviamo fino a quando non mostrarlo di nuovo. L'intervallo è 14 giorni. Serve solo a non ripetere l'avviso.

**`politost-last-read`.** Chiave in localStorage. Per ogni libro aperto su quel browser salva l'ultimo capitolo letto, con numero e titolo, e, se avevi superato il primo paragrafo, anche il paragrafo a cui eri arrivato, sempre con numero e titolo. Salva inoltre quanto del capitolo hai letto e quando, così la home può proporti «Riprendi» partendo dal libro letto per ultimo. Resta sul browser e non arriva al server. «Rimuovi da questo dispositivo» cancella la posizione di quel libro. «Esci» cancella le posizioni di tutti i libri, così chi usa il browser dopo di te non vede dove eri arrivato.

**IndexedDB `politost-smartbook`.** Contiene i file `.ptsb` che importi. Restano su quel browser. «Rimuovi da questo dispositivo» cancella un libro. Uscendo dall'account cancelliamo le copie collegate al tuo utente.

**Cache `smartbook-static-v4`.** Nelle build di produzione un service worker tiene in cache la shell dell'app, icone e manifest, per riaprire la home se la rete manca. Non mette in cache le chiamate a `/api`, `/auth` o `/users`, e non è un profilo di lettura.

## Analitici

Nessuno. In questa versione non carichiamo Matomo, Google Analytics o altri strumenti di statistica. Se un giorno li aggiungessimo, chiederemmo prima il consenso.

## Terze parti

Il cookie di sessione e la memoria locale sono di questo sito. Non impostiamo cookie di Google, Cloudflare o altri per pubblicità o statistica.

Se usi «Accedi con Google», il passaggio avviene sul dominio di Google, che può impostare cookie propri secondo la sua [informativa](https://policies.google.com/privacy). Al ritorno su PoliTost Smartbook vale di nuovo questa pagina.

## Come cambiare scelta

Per tornare al tema del sistema, o togliere ogni dato locale, cancella i dati del sito dalle impostazioni del browser. Cancellare i dati del sito toglie anche i libri importati su quel browser.

Per chiudere la sessione usa «Esci». Quello cancella `politost_auth` e `politost-last-read`. Non cancella da solo i libri importati di altri account sullo stesso browser. I libri del tuo utente sì, all'uscita.

L'informativa sui dati che escono dal browser è la [privacy](/privacy).
