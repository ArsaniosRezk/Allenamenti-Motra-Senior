# Allenamenti Motra

App per gestire allenamenti, formazioni e pagelle di una squadra di calcio a 7.
Sito statico (nessun build), Firebase Realtime Database, PWA installabile,
deploy su Netlify.

## Struttura dei file

| File | Ruolo |
|---|---|
| `index.html` | Pagina unica: le quattro sezioni sono tutte nel DOM |
| `utils.js` | **Configurazione squadre**, avvisi, condivisione immagini, helper |
| `statistiche.js` | Motore di calcolo puro (nessuna dipendenza dal DOM) |
| `index.js` | Avvio, cronologia, tabelle statistiche, scheda giocatore |
| `giocatori.js` | Lettura della rosa e abbreviazione dei nomi |
| `router.js` | Routing via hash (`#stats`, `#cronologia`, `#partita`, `#allenamento`) |
| `partita_spa.js` | Campo, moduli, panchina, pagelle partita |
| `allenamenti_spa.js` | Pagelle allenamento con bonus Atletica/Partitella |
| `sw.js` | Service worker: network-first per il codice, cache-first per immagini e CDN |
| `manifest-<squadra>.json` | Manifest PWA, uno per squadra |

## Dati su Firebase

Un solo progetto Firebase, **un ramo di primo livello per squadra**:

```
sant-antonio/
├── creata          timestamp: fa esistere il ramo anche a rosa vuota
├── rosa/           { chiave: "Nome Cognome" }
├── allenamenti/    chiavi push()
│   └── {id}: { tipo, data, timestamp, giocatori: { "Nome": {
│                 voto, bonusAtletica, bonusPartitella, votoFinale, commento } } }
└── partite/        chiavi = data (YYYY-MM-DD)
    └── {YYYY-MM-DD}: { tipo, data, timestamp, modulo,
                        formazione: { portiere: "Nome", dif1: "Nome", ... },
                        titolari: [...], panchina: [...],
                        giocatori: { "Nome": { voto, votoFinale, minuti, commento } } }

santa-maria/        stessa struttura

senior/             stagione precedente, consultabile con ?team=senior

archivio/           stagioni concluse (al momento vuoto)
```

**A decidere cosa e' consultabile e' il database, non un elenco nel codice.**
Una squadra alla radice si vede; spostata sotto `archivio/` non si vede piu',
e il sito lo dice esplicitamente invece di apparire vuoto.

`formazione` è la mappa posizione → giocatore: è il formato corrente e conserva
le posizioni anche con slot vuoti. `titolari`/`panchina` restano scritti per
compatibilità con i dati già presenti; le partite salvate prima di questo
formato vengono lette dall'array posizionale.

## Pagina di gestione (solo locale)

`gestione-squadre.html` è esclusa dal repository e quindi non finisce sul
sito pubblicato. Va aperta da un server locale:
`http://localhost:3000/gestione-squadre.html`

Permette di creare una squadra (anche senza giocatori), aggiungere e
rimuovere giocatori dalla rosa, archiviare una squadra e cancellarla.

L'archiviazione copia il ramo sotto `archivio/`, lo rilegge e lo confronta,
e **solo se la copia coincide** cancella l'originale. L'eliminazione è
definitiva e chiede di riscrivere il nome della squadra per conferma.

## Come si calcolano i voti

**Allenamento**

```
votoFinale = voto × (1 + (bonusAtletica + bonusPartitella) × 0.05)
MV         = mediaVoti × (0.70 + 0.30 × tassoPresenza)
```

La MV resta sempre nella scala 1-10: chi c'è sempre tiene il voto pieno,
chi non si presenta mai perde al massimo il 30%. Il tasso di presenza è
calcolato **dal primo allenamento in cui il giocatore compare**, così chi
si aggrega a stagione iniziata non eredita assenze non sue.

**Partita**

```
MV = media pura dei voti presi
```

**S.V.** = presente alla partita ma non sceso in campo. Conta come presenza,
non entra nella media e non porta minuti.

**MV3** = media degli ultimi 3 voti in ordine di data, saltando i S.V.

I parametri sono in cima a `statistiche.js` (`PESO_BASE`, `PESO_PRESENZA`, `VOTI_MV3`).

## Gestire due squadre con due link diversi

Il codice è già predisposto: tutti i percorsi Firebase passano da `ID_SQUADRA`.
**Un solo repository, un solo database, due siti Netlify.**

### 1. Nome e colori dei siti dedicati

In `utils.js`, blocco `PRESENTAZIONE`:

| Chiave | Ramo Firebase | Nome mostrato | Manifest |
|---|---|---|---|
| `sant-antonio` | `sant-antonio/` | Motra Sant'Antonio | `manifest-sant-antonio.json` |
| `santa-maria` | `santa-maria/` | Motra Santa Maria | `manifest-santa-maria.json` |

Questa mappa **non decide quali squadre esistono**: serve solo a dare un nome
curato e colori propri alle squadre che hanno un sito dedicato.

Ogni altra squadra alla radice del database resta consultabile con
`?team=<id>` e riceve un nome ricavato dall'id (`senior` diventa
"Motra Senior"), il tema predefinito e `manifest.json`.

`santa-maria` è la squadra predefinita: è la sua che compare aprendo il
sito da un dominio non elencato nella mappa qui sotto.

Le due app installate condividono **la stessa icona** e lo stesso colore di
sfondo: a distinguerle sono il nome sotto l'icona e il colore della barra.
`test-manifest` verifica che resti così.

### 2. Dire a ogni sito qual è la sua squadra

In `utils.js`, nella mappa `SQUADRA_PER_HOST`, decommentare e inserire i
domini Netlify:

```js
const SQUADRA_PER_HOST = {
    "motra-sant-antonio.netlify.app": "sant-antonio",
    "motra-santa-maria.netlify.app": "santa-maria",
};
```

### 3. Creare il secondo sito su Netlify

Netlify → *Add new site* → *Import from Git* → **stesso repository, stesso
branch `main`**, publish directory `.`, nessun comando di build.
Poi *Site configuration* → *Change site name* con il nome usato nella mappa.

Da quel momento ogni push su `main` aggiorna entrambi i siti, ciascuno con la
propria squadra, la propria icona e il proprio nome sulla home screen.

### Provare senza pubblicare

`?team=<id>` forza la squadra su qualunque dominio, anche in locale:
`http://localhost:8000/index.html?team=santa-maria`

### Se un giorno servisse una variabile d'ambiente

`utils.js` legge anche `window.TEAM_ID`, con priorità superiore all'hostname:
basta un `config.js` generato in fase di build. Oggi non serve.

## Sviluppo in locale

Serve un server HTTP (i moduli ES non funzionano da `file://`):

```
npx serve .
```

## Note operative

- **Service worker**: strategia network-first sul codice, quindi un deploy si
  vede al primo ricaricamento. Cambiare `VERSIONE` in `sw.js` solo se serve
  invalidare tutto.
- **Regole Firebase**: il database è in lettura e scrittura aperta. Scelta
  consapevole: il sito è a uso personale.
- **Icona**: `immagini/favicon.svg` pesa circa 340 KB (export Illustrator).
  Vale la pena ottimizzarlo (SVGO) e affiancargli un PNG 512×512 per iOS.
