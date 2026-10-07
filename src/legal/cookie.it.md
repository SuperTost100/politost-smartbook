# Cookie policy

**Versione:** 2026-09-23

Politost Smartbook usa un cookie di sessione e, sul tuo browser, alcune chiavi di memoria locale. Non usiamo cookie di profilazione o di statistica.

Il banner chiede il consenso per le categorie facoltative. Puoi riaprirlo dal pulsante in fondo a questa pagina.

## Necessari

Questi elementi non richiedono consenso. Senza, il login o il ricordo della scelta non funzionano.

**`politost_auth`.** Cookie httpOnly, SameSite Lax. Contiene il token di sessione. Se il sito è in HTTPS il cookie è marcato Secure. Dura quanto impostato sul server. In sviluppo il valore predefinito è 7 giorni. In produzione la durata è più breve di 7 giorni. Si cancella anche con «Esci».

**`cc_cookie`.** Non è un cookie. È una chiave in localStorage scritta dal banner. Ricorda le categorie che hai scelto, un identificativo della scelta e la data. Dura circa 6 mesi, poi il banner si ripresenta.

## Funzionali

Si attivano solo se nel banner scegli «Accetta tutti» oppure accendi la categoria Funzionali.

**`politost-theme`.** Chiave in localStorage, valore `light` o `dark`. Se hai già un tema salvato da prima, il reader lo applica ancora. Lo riscriviamo solo con i funzionali accesi. Se rifiuti o spegni i funzionali, cancelliamo questa chiave. Al caricamento successivo il reader segue il tema del sistema.

## Altra memoria del browser

Non sono cookie e non tracciano la navigazione fra siti.

**`pwa-install-snooze-until`.** Se chiudi l'avviso di installazione sul telefono, salviamo fino a quando non mostrarlo di nuovo. L'intervallo è 14 giorni. Serve solo a non ripetere l'avviso.

**IndexedDB `politost-smartbook`.** Contiene i file `.ptsb` che importi. Restano su quel browser. «Rimuovi da questo dispositivo» cancella un libro. Uscendo dall'account cancelliamo le copie collegate al tuo utente.

**Cache `smartbook-static-v1`.** Nelle build di produzione un service worker tiene in cache la shell dell'app, icone e manifest, per riaprire la home se la rete manca. Non mette in cache le chiamate a `/api`, `/auth` o `/users`, e non è un profilo di lettura.

## Analitici

La categoria è nel banner ed è spenta. In questa versione non carichiamo Matomo, Google Analytics o altri strumenti di statistica. Accettarla non attiva nulla.

## Terze parti

Il cookie di sessione e la memoria locale sono di questo sito. Non impostiamo cookie di Google, Cloudflare o altri per pubblicità o statistica.

Se usi «Accedi con Google», il passaggio avviene sul dominio di Google, che può impostare cookie propri secondo la sua [informativa](https://policies.google.com/privacy). Al ritorno su Politost Smartbook vale di nuovo questa pagina.

## Come cambiare scelta

Usa «Gestisci preferenze» qui sotto, oppure cancella i dati del sito dalle impostazioni del browser. Cancellare i dati del sito toglie anche i libri importati su quel browser.

Per chiudere la sessione usa «Esci». Quello cancella `politost_auth`. Non cancella da solo i libri importati di altri account sullo stesso browser. I libri del tuo utente sì, all'uscita.

L'informativa sui dati che escono dal browser è la [privacy](/privacy).
