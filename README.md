# Squadre Motra

App per gestire allenamenti, formazioni e pagelle di una squadra di calcio a 7.
Un solo codice serve più squadre, ognuna con il proprio sito.

Sito statico senza passaggi di build, dati su Firebase Realtime Database,
installabile come app sul telefono (PWA), pubblicato su Netlify.

---

## Indice

1. [Avviare il progetto in locale](#1-avviare-il-progetto-in-locale)
2. [Come è fatto](#2-come-è-fatto)
3. [I dati su Firebase](#3-i-dati-su-firebase)
4. [Gestire le squadre](#4-gestire-le-squadre)
5. [Come si calcolano i voti](#5-come-si-calcolano-i-voti)
6. [Verificare e regolare i valori arbitrari](#6-verificare-e-regolare-i-valori-arbitrari)
7. [Pubblicare le squadre su siti diversi](#7-pubblicare-le-squadre-su-siti-diversi)
8. [Manutenzione](#8-manutenzione)

---

## 1. Avviare il progetto in locale

Serve un server HTTP: i moduli JavaScript non funzionano aprendo il file
con doppio clic (`file://`), il browser li blocca.

```bash
cd "Allenamenti-Motra-Senior"
npm start          # equivale a: npx serve .
```

Poi apri l'indirizzo che compare, di solito `http://localhost:3000`.

| Indirizzo | Cosa mostra |
|---|---|
| `http://localhost:3000` | la squadra predefinita (Santa Maria) |
| `http://localhost:3000/?team=sant-antonio` | Sant'Antonio |
| `http://localhost:3000/?team=senior` | la stagione precedente |
| `http://localhost:3000/gestione-squadre.html` | la pagina di gestione squadre |

`?team=<id>` funziona con qualunque squadra presente sul database e serve
proprio a provare in locale quello che online sarà deciso dal dominio.

**Attenzione:** in locale scrivi sul **database vero**, non su una copia.
Quello che salvi provando compare subito sui siti pubblicati.

Va bene qualunque server statico, se non vuoi `npx`:

```bash
python -m http.server 3000
```

---

## 2. Come è fatto

| File | Ruolo |
|---|---|
| `index.html` | Pagina unica: le quattro sezioni sono tutte nel DOM |
| `utils.js` | **Configurazione squadre**, avvisi, condivisione immagini, helper |
| `statistiche.js` | **Motore di calcolo puro**, nessuna dipendenza dal DOM |
| `index.js` | Avvio, cronologia, tabelle statistiche, scheda giocatore |
| `giocatori.js` | Lettura della rosa e abbreviazione dei nomi |
| `router.js` | Navigazione via hash (`#stats`, `#cronologia`, `#partita`, `#allenamento`) |
| `partita_spa.js` | Campo, moduli, panchina, pagelle partita |
| `allenamenti_spa.js` | Pagelle allenamento con bonus Atletica/Partitella |
| `sw.js` | Service worker (funzionamento offline e aggiornamenti) |
| `manifest-<squadra>.json` | Manifest PWA, uno per squadra |
| `netlify.toml` | Configurazione di pubblicazione, uguale per tutti i siti |
| `verifica-parametri.mjs` | Strumento per regolare i parametri di calcolo |
| `package.json` | Nessuna dipendenza: serve solo a dichiarare i moduli ES a Node |
| `gestione-squadre.html` | Pagina di servizio, **esclusa dal repository** |

`style.css` non carica il font: Inter arriva da un `<link>` in
`index.html`. Stava in un `@import` messo dopo la prima regola, posizione
in cui le specifiche CSS impongono al browser di ignorarlo — il font non è
mai stato caricato. Il service worker tiene in cache anche
`fonts.googleapis.com` e `fonts.gstatic.com`, come già faceva per gli altri
CDN.

Le quattro sezioni dell'app sono tutte già nel DOM e `router.js` mostra
quella giusta in base all'hash. Questo fa funzionare il tasto Indietro del
telefono, che altrimenti chiuderebbe l'app.

Il calcolo è **separato dal disegno**: `statistiche.js` non tocca il DOM e
riceve i dati come argomenti. Serve a poterlo verificare senza browser
(vedi il [capitolo 6](#6-verificare-e-regolare-i-valori-arbitrari)).

---

## 3. I dati su Firebase

Un solo progetto Firebase. **Ogni squadra è un ramo di primo livello.**

```
santa-maria/
├── creata          timestamp: fa esistere il ramo anche a rosa vuota
├── rosa/           { chiave: "Nome Cognome" }
├── allenamenti/    chiavi generate automaticamente
│   └── {id}: { tipo, data, timestamp,
│               giocatori: { "Nome": { voto, bonusAtletica,
│                            bonusPartitella, votoFinale, commento } } }
└── partite/        chiavi = data della partita (YYYY-MM-DD)
    └── {YYYY-MM-DD}: { tipo, data, timestamp, modulo,
                        formazione: { portiere: "Nome", dif1: "Nome", ... },
                        titolari: [...], panchina: [...],
                        giocatori: { "Nome": { voto, votoFinale,
                                     minuti, commento } } }

sant-antonio/       stessa struttura
senior/             stagione precedente

archivio/           stagioni concluse, stessa struttura per squadra
```

### La regola della visibilità

**A decidere cosa è consultabile è il database, non un elenco nel codice.**

| Dove sta la squadra | Sui siti |
|---|---|
| Alla radice | **Consultabile** |
| Sotto `archivio/` | **Non consultabile**, con avviso esplicito |

Una squadra archiviata non appare vuota e basta: l'app se ne accorge e lo
dice. Il controllo parte solo quando la squadra risulta senza dati, quindi
nel caso normale non c'è nessuna lettura in più.

### Note sul formato

Gli **allenamenti** hanno una chiave generata da Firebase e la data in un
campo; le **partite** hanno la data come chiave. Per questo l'allenamento
si cerca scorrendo il ramo: il confronto usa `dataEvento()`, non il campo
`data` grezzo, così anche i record salvati senza data restano
raggiungibili dal loro `timestamp`. Cercandoli per `data` non si trovavano
mai e sceglierne la data nel calendario creava un doppione.

`formazione` è la mappa posizione → giocatore ed è il formato corrente:
conserva le posizioni anche quando uno slot resta vuoto. `titolari` e
`panchina` continuano a essere scritti per compatibilità, e le partite
salvate prima di questo formato vengono lette dall'array posizionale.

L'array posizionale va letto nell'ordine con cui fu scritto, che è
`IDS_LEGACY` in `partita_spa.js`:

```js
["portiere", "dif1", "dif2", "dif3", "cen1", "cen2", "att"]
```

È **l'esatto contrario** dell'ordine piatto di `moduli["3-2-1"]`, che parte
dall'attacco. Rileggendo quei record sull'ordine nuovo ogni partita di
primavera 2025 usciva capovolta, con il portiere schierato da centravanti.
Lo schema di allora (1 portiere, 3 difensori, 2 centrocampisti, 1 attaccante)
è proprio il 3-2-1, quindi il modulo predefinito va bene.

**Voti dei record vecchi.** Le prime pagelle salvavano solo `votoFinale`,
senza `voto`; alcune voci di partita non hanno né l'uno né l'altro (erano
convocati mai valutati). Chi legge un voto deve quindi ripiegare su
`votoFinale` quando `voto` manca — dove ci sono entrambi vince `voto`, che è
il valore grezzo senza bonus e quindi quello dello slider. Una voce senza
nessuno dei due viene presentata come `S.V.`, che è già il nome che l'app dà
a quello stato. Senza queste due regole gli slider ripartivano da 6.00 e il
primo salvataggio sostituiva i voti veri con dei 6.

**Chi non è più in rosa.** Il form dell'allenamento disegna una scheda per
ogni giocatore della rosa *attuale*, e il salvataggio usa `.set()`, che
rimpiazza l'intero nodo. I voti degli ex giocatori vengono quindi tenuti da
parte al caricamento (`estraiFuoriRosa()`) e rimessi nel record al
salvataggio: è ciò che rende vera la promessa fatta nella pagina di gestione.
La pagina Partita ottiene lo stesso risultato con `nomiSelezionabili()`.

La rosa può essere salvata come oggetto o come array: entrambe le forme
vengono lette correttamente.

**Il nome del giocatore è la chiave** che collega voti e presenze alla
persona. Rinominarlo sul database spezza il collegamento con lo storico:
per l'app diventa un giocatore diverso.

---

## 4. Gestire le squadre

Tutto si fa da `gestione-squadre.html`, che gira **solo in locale**: è
esclusa dal repository (`.gitignore`) e quindi non finisce mai sui siti
pubblicati.

```bash
npx serve .
# poi http://localhost:3000/gestione-squadre.html
```

All'apertura scegli una squadra esistente oppure ne crei una nuova.

| Azione | Cosa fa |
|---|---|
| **Crea squadra** | Nuovo ramo sul database, con o senza giocatori |
| **Aggiungi giocatore** | Lo mette nella rosa |
| **Rimuovi giocatore** | Lo toglie dalla rosa, **senza cancellare il suo storico** |
| **Archivia squadra** | La sposta sotto `archivio/`: sparisce dai siti, i dati restano |
| **Elimina squadra** | Cancella rosa, allenamenti e partite. Definitivo |

L'archiviazione copia il ramo, lo rilegge e lo confronta, e **cancella
l'originale solo se la copia coincide**. Se qualcosa va storto a metà si
ferma e avvisa, senza perdere niente.

L'eliminazione chiede di **riscrivere il nome della squadra**: un semplice
"sei sicuro?" sarebbe troppo facile da premere per sbaglio.

Rimuovendo un giocatore dalla rosa, le sue vecchie presenze e i suoi voti
restano nello storico e continuano a comparire nelle statistiche,
contrassegnati con un asterisco.

> Il nome della squadra diventa una chiave Firebase: solo minuscole,
> numeri e trattini. `archivio` è riservato.

---

## 5. Come si calcolano i voti

### Allenamento

```
votoFinale = voto × (1 + (bonusAtletica + bonusPartitella) × 0.05)
MV         = mediaVoti × (PESO_BASE + PESO_PRESENZA × tassoPresenza)
```

I due toggle Atletica e Partitella hanno tre stati (−5% / 0% / +5%) e si
sommano: al massimo ±10% sul voto della seduta.

La MV resta sempre nella scala 1-10: chi c'è sempre tiene il voto pieno,
chi non si presenta mai perde al massimo il 30%.

Il tasso di presenza parte **dal primo allenamento in cui il giocatore
compare**, così chi si aggrega a stagione iniziata non eredita assenze che
non gli competono.

Da quel momento in poi però contano **tutti** gli allenamenti, anche per
chi non è più in rosa: altrimenti risulterebbe presente al 100% e la sua
MV non verrebbe mai corretta, scavalcando in classifica chi c'è ancora.

### Partita

```
MV = media dei voti effettivamente presi
```

Nessuna correzione: in partita la presenza la decide l'allenatore, non il
giocatore.

**S.V.** significa presente ma non sceso in campo. Conta come presenza,
non entra nella media e non porta minuti. Anche i vecchi record salvati
con un minuto vengono letti come zero.

Lo slider dei minuti parte da **0**: un giocatore schierato ma mai entrato
si può registrare con un voto e zero minuti, senza per forza marcarlo S.V.
Prima il minimo era 1 e uno zero già salvato tornava a video come 1'.

### Il bottone di salvataggio in Partita

Il bottone grande in fondo cambia funzione da solo:

| Cosa mostra | Cosa salva |
|---|---|
| **Salva Formazione** | non ci sono ancora pagelle a video: scrive campo, panchina e modulo |
| **Salva Pagella** | pagelle a video e formazione già allineata al database: scrive solo i voti |
| **Salva Tutto** | pagelle a video ma campo ritoccato dopo: scrive prima la formazione, poi i voti |

Il terzo caso è il motivo del confronto: prima, una volta comparse le
pagelle, il bottone salvava soltanto i voti e le modifiche al campo
sparivano senza dirlo. L'iconcina dentro al campo salva sempre e solo la
formazione.

### MV3

Media degli ultimi `VOTI_MV3` voti **in ordine di data**, saltando i S.V.
Serve a vedere il momento di forma, indipendentemente dalla stagione.

L'ordinamento è per data dell'evento, non per momento del salvataggio:
inserire in ritardo una partita vecchia non la manda in cima.

---

## 6. Verificare e regolare i valori arbitrari

Alcuni numeri nel codice sono scelte, non verità. Sono tutti in un punto
solo del rispettivo file e cambiarli è previsto.

### I parametri di calcolo

In cima a `statistiche.js`:

| Costante | Valore | Cosa controlla |
|---|---|---|
| `PESO_BASE` | `0.7` | quota di voto che **non** dipende dalla presenza |
| `PESO_PRESENZA` | `0.3` | quota che la presenza può far guadagnare |
| `VOTI_MV3` | `3` | quanti voti recenti entrano nell'MV3 |

I due pesi vanno cambiati **in coppia**, perché la loro somma sia 1:
solo così con presenza piena la MV coincide con la media dei voti.
Alzando `PESO_PRESENZA` conta di più la costanza, abbassandolo conta di
più il rendimento.

### Come si verificano

```bash
npm run verifica                      # oppure: node verifica-parametri.mjs
node verifica-parametri.mjs 7.5 25    # media voti 7.5, stagione di 25 allenamenti
```

Legge i valori veri da `statistiche.js` e stampa la tabella dell'effetto,
quanto pesa una singola seduta, e due controlli di coerenza fatti girando
il **motore di calcolo vero**, non una formula riscritta:

```
MV ALLENAMENTI  (media voti 7.00, stagione di 20 allenamenti)

Presenze    Tasso         MV   Fascia colore
  ----------------------------------------------
  20/20     100%        7.00   buona
  16/20     80%         6.58   media
  12/20     60%         6.16   media
  8/20      40%         5.74   bassa
  4/20      20%         5.32   bassa
  0/20      0%             -   nessuna

PESO DI UNA SINGOLA SEDUTA
  venire o non venire sposta la MV di 0.105 punti (1.5% del voto)
```

Modifica le costanti, rilancia il comando e vedi subito come si muove la
classifica prima di toccare i dati veri.

Nota che il peso di una seduta **si diluisce**: è un rapporto, quindi a
ottobre un'assenza pesa molto e a maggio quasi niente. È inevitabile con
qualunque formula basata su percentuali, ed è anche corretto.

### Gli altri valori regolabili

| Valore | Dove | Significato |
|---|---|---|
| `0.05` | `allenamenti_spa.js` | passo dei bonus Atletica/Partitella (5%) |
| `VOTO_DEFAULT` | `partita_spa.js`, `allenamenti_spa.js` | voto di partenza delle schede (6) |
| `MINUTI_MIN` / `MINUTI_MAX` | `partita_spa.js` | estremi dello slider minuti (0 e 50) |
| `MINUTI_DEFAULT` | `partita_spa.js` | minuti di partenza di una scheda nuova (1) |
| `moduli` | `partita_spa.js` | moduli disponibili e nomi dei ruoli: le `<option>` del menù le genera il codice da questa mappa |
| soglie `6` / `7` / `8` | `statistiche.js`, `classeMedia` | dove cambia il colore delle celle |
| `TIMEOUT_AVVIO` | `index.js` | quanto si aspetta il database prima di arrendersi (12 s) |
| `min`/`max`/`step` degli slider voto | `partita_spa.js`, `allenamenti_spa.js` | scala 1-10 a passi di 0,25 |
| `3000` | `utils.js` | durata in millisecondi degli avvisi |
| `VERSIONE` | `sw.js` | versione della cache del service worker |

I colori delle fasce stanno in `colors.css`. Le tinte usate nelle tabelle
sono **piene e già fuse sullo sfondo** (`--media-*-piena`): servono così
perché html2canvas, che genera le immagini condivise, non sa disegnare le
trasparenze sovrapposte né i box-shadow.

---

## 7. Pubblicare le squadre su siti diversi

**Un repository, un branch, un database. Due siti.**
A distinguerli è soltanto il dominio da cui arriva la richiesta.

### Come l'app capisce quale squadra mostrare

In ordine di priorità, in `utils.js`:

1. `?team=<id>` nell'indirizzo — per le prove
2. `window.TEAM_ID` — se un giorno userai una variabile d'ambiente
3. **il dominio**, tramite `SQUADRA_PER_HOST` — il meccanismo di produzione
4. la squadra predefinita, `SQUADRA_DEFAULT`

```js
const SQUADRA_PER_HOST = {
    "motra-sant-antonio.netlify.app": "sant-antonio",
    "motra-santa-maria.netlify.app": "santa-maria"
};
```

Nella mappa vanno **solo i domini di produzione**. Le anteprime Netlify
(`deploy-preview-42--motra-sant-antonio.netlify.app`, oppure
`nome-branch--motra-santa-maria.netlify.app`) le riconosce `squadraDaHost()`,
che toglie il prefisso fino all'ultimo `--` prima di cercare. Senza quel
passaggio ogni anteprima ripiegava su `SQUADRA_DEFAULT`, e l'anteprima del
sito Sant'Antonio mostrava i dati di Santa Maria.

### Nome e manifest dei siti

Il blocco `PRESENTAZIONE` in `utils.js` **non decide quali squadre
esistono**: dà solo un nome curato e un manifest proprio a chi ha un sito
dedicato.

| Chiave | Nome mostrato | Manifest |
|---|---|---|
| `santa-maria` | Motra Santa Maria | `manifest-santa-maria.json` |
| `sant-antonio` | Motra Sant'Antonio | `manifest-sant-antonio.json` |

`santa-maria` è la squadra predefinita.

**Il colore è uno solo per tutte le squadre**: `#1f2937`, definito da
`TEMA_PREDEFINITO` in `utils.js` e ripetuto nel `theme_color` dei manifest
e nel `<meta name="theme-color">` di `index.html`. Se lo cambi vanno
aggiornati tutti e tre. Una voce di `PRESENTAZIONE` può ancora
sovrascriverlo con `tema`, ma oggi nessuna lo fa.

`index.html` dichiara di proposito il manifest **neutro** (`manifest.json`)
e il tema predefinito: è `applicaIdentitaSquadra()` a sostituirli con
quelli giusti. Cablando lì una delle due squadre, il sito dell'altra
scaricava comunque prima il manifest sbagliato — e il browser legge il
manifest proprio nel momento dell'installazione.

Ogni altra squadra alla radice del database resta consultabile con
`?team=<id>` e riceve un nome ricavato dall'id — `senior` diventa
"Motra Senior" — più il tema predefinito e `manifest.json`.

Le due app installate sul telefono **condividono icona, colori e sfondo**:
a distinguerle è soltanto il nome sotto l'icona.

Ogni manifest dedicato porta la squadra nel proprio `start_url`
(`./index.html?team=santa-maria#stats`). Serve a chi installa l'app da un
indirizzo `?team=` invece che dal dominio dedicato: senza, l'app installata
ripartiva dalla squadra predefinita.

### L'icona dell'app

`immagini/favicon.svg` è dichiarata `any` e `maskable` insieme, quindi è
costruita per reggere entrambi gli usi:

```
865 x 865
├── <rect> di sfondo pieno         evita il bordo bianco che Android
│                                  aggiunge alle icone non mascherabili
└── <g scale(0.8)>  il logo        sta nell'80% centrale, la zona che
                                   tutte le maschere garantiscono visibile
```

Quel **80% non è decorativo**: Android ritaglia l'icona a cerchio, goccia o
quadrato stondato a seconda del telefono, e solo il cerchio centrale
all'80% è sempre al sicuro. Ingrandendo il logo oltre quella soglia gli
angoli vengono tagliati; rimpicciolendolo ricompare il bordo bianco largo.

Cambiando l'icona va anche alzata `VERSIONE` in `sw.js`, altrimenti chi ha
già visitato il sito continua a vedere quella vecchia: le immagini sono in
cache. Sul telefono può servire disinstallare e reinstallare l'app, perché
il lanciatore memorizza l'icona al momento dell'installazione.

### Pubblicare un nuovo sito

Netlify → *Add new site* → *Import an existing project* → GitHub →
**lo stesso repository**.

| Campo | Valore |
|---|---|
| Branch to deploy | `main` |
| Build command | *vuoto* |
| Publish directory | `.` |

Non serve compilare nulla a mano: `netlify.toml` imposta già tutto ed è
uguale per entrambi i siti. Poi *Site configuration* → *Change site name*
con il nome usato in `SQUADRA_PER_HOST`.

Da quel momento ogni push su `main` aggiorna tutti i siti, ciascuno con la
propria squadra.

### Aggiungere una terza squadra

1. Creala dalla pagina di gestione (crea il ramo sul database)
2. Aggiungi una voce in `PRESENTAZIONE` con nome e manifest
3. Copia un manifest esistente cambiando `id`, `name`, `short_name`, `start_url`
4. Aggiungi il file alla lista `SHELL` in `sw.js`
5. Aggiungi il dominio in `SQUADRA_PER_HOST`
6. Crea il sito su Netlify e rinominalo

Solo il punto 1 è obbligatorio: senza gli altri la squadra è comunque
raggiungibile con `?team=<id>`.

> I nomi dei siti sono scritti nel codice. Se rinomini un sito su Netlify
> e non aggiorni la mappa, quel sito mostrerà la squadra predefinita.

---

## 8. Manutenzione

### Aggiornamenti che non si vedono

Il service worker usa **network-first** sul codice: un deploy si vede al
primo ricaricamento. `netlify.toml` forza inoltre la riconvalida di
`sw.js`, `index.html`, JS e CSS, che hanno nomi fissi senza impronta.

Il worker nuovo **non si attiva da solo** (niente `skipWaiting`): resta in
attesa finché la pagina non viene ricaricata. È quello che l'avviso
"Aggiornamento disponibile: ricarica la pagina" promette all'utente, ed è
il motivo dei due ricaricamenti descritti qui sotto.

Se un telefono resta indietro, di solito basta ricaricare due volte: la
prima scarica il service worker nuovo, la seconda lo usa. Cambia
`VERSIONE` in `sw.js` solo se serve buttare via tutta la cache.

### Regole Firebase

Il database è **in lettura e scrittura aperta**, senza autenticazione.
Scelta consapevole: il sito è a uso personale. Chi conosce l'indirizzo può
leggere e modificare tutto.

`netlify.toml` aggiunge `X-Content-Type-Options`, `X-Frame-Options` e
`Referrer-Policy`. Volutamente **nessuna Content-Security-Policy**: andrebbe
scritta su misura per Firebase, cdnjs e lo script inline in `index.html`, e
una CSP sbagliata rompe il sito in silenzio. Va provata su un deploy di
anteprima prima di metterla.

### Quante letture costa una schermata

`index.js` è l'unico che legge gli elenchi completi: dopo ogni lettura emette
`dati-ricaricati` con allenamenti e partite già in memoria, e `partita_spa.js`
ci aggancia il riepilogo titolarità/minuti. Prima se li rileggeva per conto
suo a ogni salvataggio, quindi ogni salvataggio scaricava due volte l'intero
ramo `partite` e i due pezzi di schermata potevano mostrare stati diversi.

Allo stesso modo `verificaSquadra()` chiede se un ramo esiste via REST con
`?shallow=true`: con l'SDK la stessa domanda costava il download dell'intera
squadra. E la ricerca dell'allenamento per data non viene più ripetuta al
salvataggio se è già stata fatta al cambio data.

### Cose da sistemare, prima o poi

- `immagini/favicon.svg` pesa circa 330 KB (export da Illustrator, 1123
  tracciati, nessun raster). Vale la pena passarlo in SVGO e affiancargli un
  PNG 512x512 per iOS, che non supporta le icone SVG. Ridurne la precisione a
  mano è un rischio grafico: meglio uno strumento.
- L'SDK Firebase è la versione `compat` 9.6.1, deprecata. Funziona, ma
  prima o poi conviene passare alla v10 modulare.
- Offline l'app si apre ma resta senza dati: il database ha bisogno della
  rete. Le letture di Firebase in quel caso non falliscono, restano appese:
  per questo l'avvio ha un `TIMEOUT_AVVIO`, altrimenti lo scheletro di
  caricamento non sparirebbe mai.
- La ricerca dell'allenamento per data scorre tutto il ramo `allenamenti`.
  Una query `orderByChild("data")` sarebbe più economica ma perderebbe i
  record salvati senza `data`, che oggi si trovano tramite `dataEvento()`.
- Le partite salvate con più di 10 in panchina non hanno abbastanza select a
  video: adesso l'app lo dice con un avviso invece di troncare in silenzio,
  ma i posti restano 10.

### Backup

Il database non ha copie automatiche. Per farne una:

```bash
curl -s "https://allenamenti-motra-senior-default-rtdb.europe-west1.firebasedatabase.app/.json" > backup.json
```

I file `backup-*.json` sono esclusi da git.
