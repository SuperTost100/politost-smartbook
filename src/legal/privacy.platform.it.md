# Informativa privacy

**Versione:** 2026-09-23

Questa informativa descrive i dati personali trattati da Politost Smartbook, il reader con cui si aprono gli smartbook. Vale per il sito che stai usando e per l'API collegata a questa copia.

## Titolare

Il titolare del trattamento è chi pubblica questa copia di Politost Smartbook. Nel reader il servizio è indicato come Politost.

Non è designato un responsabile della protezione dei dati.

Il recapito per le richieste è in fondo a questa pagina. Se l'operatore non ha ancora inserito un indirizzo email, scrivi a chi ti ha dato l'accesso o il codice di attivazione, per esempio il docente o l'istituto, e chiedi che inoltri la richiesta al titolare.

## A chi è rivolto il reader

Il reader è pensato per studenti e docenti. Se hai meno di 14 anni non creare un account. Non verifichiamo l'età. Un genitore può scrivere al recapito in fondo per chiedere la cancellazione di un account.

I libri pubblici del catalogo si possono aprire senza account e senza accettare questa informativa. Account, licenze e libri protetti richiedono l'accettazione dei [termini](/termini) e di questa informativa.

## Account

Se ti registri con email e password trattiamo:

- l'email, come identificativo dell'account;
- la password, solo in forma di hash. Non la leggiamo in chiaro e non la rimandiamo;
- un identificativo interno dell'account;
- nome visualizzato, se lo imposti;
- lo stato dell'account, per esempio se è attivo.

Se entri con Google riceviamo, secondo il consenso che dai a Google, l'email, l'identificativo dell'account Google e l'esito della verifica email dichiarato da Google. Conserviamo anche i token di accesso e di aggiornamento, cifrati nel database, per mantenere il collegamento. Non inviamo a Google il testo dei libri. L'informativa di Google è su [policies.google.com/privacy](https://policies.google.com/privacy).

All'accettazione salviamo la versione dei termini, la versione di questa informativa, data e ora, e l'indirizzo IP. Se la versione cambia, la nuova accettazione sostituisce la precedente.

Base giuridica: esecuzione del contratto, articolo 6.1.b del GDPR, per darti l'account che hai chiesto. L'accettazione dei termini è un passo di quella richiesta. L'IP sull'accettazione è un legittimo interesse, articolo 6.1.f, a dimostrare quando e da dove è stata data.

## Licenze e codici

Se riscatti un codice salviamo il legame tra il tuo account e quel codice, la data del riscatto, il libro sbloccato e il tipo di licenza, a tempo o senza scadenza. Il codice in chiaro non resta nel database. Ne teniamo un hash e, per l'operatore, una copia cifrata. Una licenza revocata resta registrata con la data di revoca.

Base giuridica: esecuzione del contratto, articolo 6.1.b del GDPR.

## Apertura dei capitoli con licenza

Se hai una licenza e apri un capitolo di un libro concesso in licenza, il server registra identificativo utente, libro, capitolo, azione, data e ora, e indirizzo IP.

Serve a sapere chi ha aperto un libro protetto e a collegare una eventuale copia alla licenza. Non usiamo questo registro per pubblicità o per valutare il rendimento scolastico.

Base giuridica: legittimo interesse, articolo 6.1.f del GDPR, a tutelare i contenuti concessi in licenza. Puoi opporti. Senza questo registro non possiamo continuare a fornire quel libro con licenza, perché il controllo della licenza e la filigrana dipendono da esso.

## Filigrana

Con l'accesso effettuato il reader può disegnare sulla pagina, e sulla versione stampabile, la tua email, un pezzo dell'identificativo account e data e ora. Può inserire anche un segno non visibile legato all'account e al libro.

Chi guarda lo schermo o una stampa vede la filigrana visibile. Non è un cookie e non esce dal dispositivo, salvo che tu condivida la pagina, uno screenshot o un PDF.

Base giuridica: legittimo interesse, articolo 6.1.f, e, per i libri con licenza, esecuzione del contratto.

## File `.ptsb` e libri dal server

I file che importi restano in IndexedDB su quel browser, nel database locale `politost-smartbook`. Non li carichiamo come copia del libro. All'uscita dall'account cancelliamo le copie collegate a quell'utente su quel browser.

Per aprire un file cifrato il browser invia l'identificativo del libro e la chiave avvolta. Il server controlla la licenza e restituisce la chiave di decifratura. Il testo del capitolo non è in quella richiesta.

I libri pubblicati in cloud arrivano dall'API. La richiesta comprende l'identificativo del libro e del capitolo. Se hai fatto l'accesso, la richiesta porta anche il cookie di sessione.

Base giuridica: esecuzione del contratto, o misure precontrattuali se stai solo aprendo un libro pubblico, articolo 6.1.b del GDPR.

Il codice che esegui nel laboratorio Python o nell'interprete di tipo MATLAB resta nel browser. Non lo riceviamo.

## Dati tecnici

Trattiamo anche:

- l'indirizzo IP e l'orario sulle richieste di login e di riscatto codice, in un contatore che limita i tentativi. La finestra di conteggio è di un minuto. La riga può restare nel database come dato operativo. Non la usiamo per ricostruire che cosa hai letto;
- i log di connessione del sito e dell'API, tenuti dall'hosting, con IP, orario e indirizzo della pagina o della chiamata. La durata la decide il fornitore, non il reader;
- i dati descritti nella [cookie policy](/cookie), sul tuo browser.

Base giuridica: legittimo interesse alla sicurezza del servizio, articolo 6.1.f del GDPR.

## Cosa non facciamo

Non vendiamo dati. Non facciamo pubblicità comportamentale. Non usiamo strumenti di statistica di terze parti. Non prendiamo decisioni automatizzate che producano effetti giuridici o che ti riguardino in modo analogo, articolo 22 del GDPR. Non costruiamo un profilo del tuo studio.

## Destinatari

I dati dell'account, delle licenze e del registro di apertura sono accessibili a chi amministra questa copia del reader.

I fornitori dipendono da come è pubblicata questa copia. Un deploy pubblico tipico usa Cloudflare per il sito, Render per l'API e Neon per il database. Un'installazione locale può tenere il database sulla stessa macchina, senza quei fornitori. Google tratta i dati dell'accesso solo se usi «Accedi con Google».

Puoi chiederci l'elenco aggiornato dei fornitori di questa installazione.

## Trasferimenti fuori dallo Spazio economico europeo

Se l'API è su Render, il trattamento avviene di norma negli Stati Uniti. Google tratta i dati dell'OAuth anche fuori dallo Spazio economico europeo. La regione del database Neon la sceglie l'operatore quando crea il progetto, e può essere nell'Unione europea oppure no.

Dove non c'è una decisione di adeguatezza, il trasferimento si basa sulle clausole contrattuali del fornitore. Puoi chiedere al titolare in quale paese sta il database di questa copia.

## Conservazione

Account, accettazione, licenze, riscatti, token Google e registro di apertura dei capitoli restano finché l'account esiste. Non c'è una cancellazione automatica dopo un numero fisso di mesi.

La cancellazione dell'account elimina anche le righe collegate: accettazione, licenze, riscatti, registro di apertura e token Google.

I file importati restano nel browser finché li togli, esci dall'account, o cancelli i dati del sito. Il cookie di sessione scade secondo la durata impostata sul server, oppure quando esci. In sviluppo la durata predefinita è 7 giorni. In produzione il server non accetta una durata di 7 giorni o più, quindi l'operatore ne imposta una più breve. Le preferenze cookie nel browser durano circa 6 mesi.

I log dell'hosting seguono i tempi del fornitore.

## Diritti

Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione, e revocare un consenso, scrivendo al recapito in fondo. La risposta arriva entro un mese, salvo proroga nei casi previsti dal GDPR.

Nel reader non c'è un pulsante «Elimina account». La cancellazione si chiede al titolare. Revocare l'accettazione di termini e informativa comporta la chiusura dell'uso dell'account. I libri pubblici restano apribili senza account.

Hai diritto di proporre reclamo al Garante per la protezione dei dati personali, [www.garanteprivacy.it](https://www.garanteprivacy.it).

## Obbligo o facoltà

Email e password, oppure Google, sono necessari per l'account e per i libri con licenza. Senza questi dati non apriamo quell'accesso. Il registro di apertura è necessario per continuare a fornire un libro con licenza.

Il tema chiaro o scuro è facoltativo. I dettagli sono nella [cookie policy](/cookie).

## Modifiche

La versione è la data in cima. Se cambia, e hai un account, il reader ti chiede di leggere e accettare di nuovo prima di continuare.
