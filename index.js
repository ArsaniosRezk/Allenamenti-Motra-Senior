// index.js - avvio app, motore statistiche, cronologia e scheda giocatore
import { giocatori as rosa, caricaGiocatori, abbreviaNome } from "./giocatori.js";
import {
  mostraAvviso,
  catturaECondividi,
  escapeHtml,
  formattaData,
  ID_SQUADRA,
  SQUADRA,
  RAMO_ARCHIVIO,
  applicaIdentitaSquadra,
  segnalaDatiPronti
} from "./utils.js";
import { initRouter } from "./router.js";
import {
  calcolaStatistiche,
  confrontaCrescente,
  dataEvento,
  estraiVoto,
  nomiEvento,
  nuovoRecord,
  mediaFinale,
  mediaUltimi,
  mediaVoti,
  classeMedia,
  VOTI_MV3
} from "./statistiche.js";

applicaIdentitaSquadra();
initRouter();

/* =========================================================
   SERVICE WORKER
   ========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const nuovo = reg.installing;
          if (!nuovo) return;
          nuovo.addEventListener("statechange", () => {
            if (nuovo.state === "installed" && navigator.serviceWorker.controller) {
              mostraAvviso("Aggiornamento disponibile: ricarica la pagina");
            }
          });
        });
      })
      .catch((err) => console.warn("Service Worker fallito:", err));
  });
}

/* =========================================================
   STATO
   ========================================================= */
const stato = {
  allenamenti: [], // ordine decrescente (piu' recenti in alto)
  partite: [],
  statsAllenamento: {},
  statsPartita: {}
};

/* =========================================================
   CRONOLOGIA
   ========================================================= */
function creaEvento(ev, tipo) {
  const tipoCapitalizzato = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  const dataVisibile = formattaData(dataEvento(ev)) || "-";

  const container = document.createElement("div");
  container.className = "evento-container";

  const header = document.createElement("div");
  header.className = "evento-header";

  const icona =
    tipo === "partita"
      ? '<i class="fas fa-futbol"></i>'
      : '<i class="fas fa-running"></i>';
  const coloreIcona = tipo === "partita" ? "#3b82f6" : "#10b981";

  const headerLeft = document.createElement("div");
  headerLeft.className = "evento-left";
  headerLeft.innerHTML =
    '<div class="evento-icon-box" style="background-color: ' +
    coloreIcona +
    "20; color: " +
    coloreIcona +
    ';">' +
    icona +
    '</div><div class="evento-info"><span class="evento-tipo">' +
    tipoCapitalizzato +
    '</span><span class="evento-data">' +
    escapeHtml(dataVisibile) +
    "</span></div>";

  const haVoti = ev.giocatori && Object.keys(ev.giocatori).length > 0;
  const isDaSvolgere = tipo === "partita" && !haVoti;

  const headerRight = document.createElement("div");
  headerRight.className = "evento-right";

  const toggleIcon = document.createElement("span");
  toggleIcon.className = "toggle-icon";
  if (isDaSvolgere) {
    toggleIcon.innerHTML = '<span class="badge-pending">Da Svolgere</span>';
    toggleIcon.style.transform = "none";
    toggleIcon.style.fontSize = "0.75rem";
    toggleIcon.style.opacity = "0.8";
  } else {
    toggleIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }

  const dettaglio = document.createElement("div");
  dettaglio.className = "evento-dettaglio nascosto";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-elimina-icon";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.title = "Elimina";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const cosa = tipo === "partita" ? "questa partita" : "questo allenamento";
    if (!confirm("Vuoi eliminare " + cosa + " del " + dataVisibile + "?")) return;

    const ramo = tipo === "partita" ? "partite" : "allenamenti";
    window.firebaseDB
      .ref(ID_SQUADRA + "/" + ramo)
      .child(ev.id)
      .remove()
      .then(() => {
        mostraAvviso(
          tipoCapitalizzato + (tipo === "partita" ? " eliminata" : " eliminato")
        );
        document.dispatchEvent(new Event("data-update"));
      })
      .catch(() => mostraAvviso("Errore durante l'eliminazione", "error"));
  });

  const copiaBtn = document.createElement("button");
  copiaBtn.className = "btn-copia-icon";
  copiaBtn.innerHTML = '<i class="fas fa-share-nodes"></i>';
  copiaBtn.title = "Condividi come immagine";
  copiaBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Lo screenshot deve mostrare i voti: se il dettaglio e' chiuso lo apre e poi richiude
    const eraChiuso = dettaglio.classList.contains("nascosto");
    if (eraChiuso) dettaglio.classList.remove("nascosto");
    catturaECondividi(container, tipo + "_" + dataEvento(ev) + ".png", {
      dopo: () => {
        if (eraChiuso) dettaglio.classList.add("nascosto");
      }
    });
  });

  const headerActions = document.createElement("div");
  headerActions.className = "header-actions";
  headerActions.appendChild(copiaBtn);
  headerActions.appendChild(deleteBtn);

  headerRight.appendChild(headerActions);
  headerRight.appendChild(toggleIcon);
  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  if (!isDaSvolgere) {
    const table = document.createElement("table");
    table.className = "mini-tabella";

    // `_attesi` lo annota calcolaStatistiche: sono i nomi a cui quell'evento
    // ha contato un "disponibile". Usarlo qui e' l'unico modo perche' la
    // cronologia dica la stessa cosa delle statistiche: chi si e' aggregato
    // dopo non risulta piu' "assente" a eventi che non poteva giocare.
    const daMostrare = ev._attesi || nomiEvento(ev, tipo, rosa);

    daMostrare.forEach((nome, index) => {
      const tr = document.createElement("tr");
      tr.className = index % 2 === 0 ? "riga-pari" : "riga-dispari";

      const dati = ev.giocatori && ev.giocatori[nome];
      const { valore, sv } = estraiVoto(dati);
      const fuoriRosa = nome !== "Squadra" && rosa.indexOf(nome) === -1;

      const tdNomeVoto = document.createElement("td");
      const tdCommento = document.createElement("td");
      tdNomeVoto.classList.add("col-nome");
      tdCommento.classList.add("col-commento");

      let etichetta = abbreviaNome(nome);
      if (fuoriRosa) etichetta += " *";

      if (dati) {
        const direzione = ev._frecce && ev._frecce[nome];
        const freccia = direzione === "su" ? "⬆︎" : direzione === "giu" ? "⬇︎" : "";
        const classeFreccia =
          direzione === "su" ? "migliorato" : direzione === "giu" ? "peggiorato" : "";

        let votoDisplay;
        if (sv) votoDisplay = "S.V.";
        else if (isNaN(valore)) votoDisplay = "-";
        else votoDisplay = valore.toFixed(2).replace(/\.00$/, "");

        const minuti = sv ? 0 : Number(dati.minuti) || 0;
        const dettaglioMinuti =
          tipo === "partita" && nome !== "Squadra" && !sv && minuti > 0
            ? ' <span class="evento-minuti">' + minuti + "'</span>"
            : "";

        tdNomeVoto.innerHTML =
          "<strong>" +
          escapeHtml(etichetta) +
          "</strong><br /> " +
          votoDisplay +
          dettaglioMinuti +
          ' <span class="freccia ' +
          classeFreccia +
          '">' +
          freccia +
          "</span>";
        tdCommento.textContent = dati.commento || "";
      } else {
        tdNomeVoto.innerHTML =
          "<strong>" + escapeHtml(etichetta) + "</strong><br /> assente";
        tdCommento.textContent = "";
      }

      tr.appendChild(tdNomeVoto);
      tr.appendChild(tdCommento);
      table.appendChild(tr);
    });

    dettaglio.appendChild(table);

    header.addEventListener("click", () => {
      const aperto = !dettaglio.classList.contains("nascosto");
      dettaglio.classList.toggle("nascosto");
      container.classList.toggle("expanded");
      toggleIcon.style.transform = aperto ? "rotate(0deg)" : "rotate(180deg)";
    });
    header.style.cursor = "pointer";
  } else {
    header.style.cursor = "default";
    container.classList.add("pending-event");
  }

  container.appendChild(header);
  container.appendChild(dettaglio);
  return container;
}

/* =========================================================
   TABELLE STATISTICHE
   ========================================================= */
function creaTabellaStatistiche(statsObj, tipo) {
  const isPartite = tipo === "partita";
  const titolo = isPartite ? "Statistiche Partite" : "Statistiche Allenamenti";
  const idTabella = isPartite ? "tabella-partite" : "tabella-allenamenti";

  let righe = Object.entries(statsObj).map(([nome, r]) => ({
    nome,
    record: r,
    media: mediaFinale(r, tipo),
    mv3: mediaUltimi(r)
  }));

  if (isPartite) {
    righe.sort((a, b) => {
      if (a.nome === "Squadra") return 1;
      if (b.nome === "Squadra") return -1;
      return b.media - a.media;
    });
  } else {
    righe = righe
      .filter((d) => d.nome !== "Squadra")
      .sort((a, b) => b.media - a.media);
  }

  let html =
    '<div class="statistiche-blocco" id="blocco-' +
    idTabella +
    '"><div class="statistiche-header"><h3>' +
    titolo +
    '</h3><button class="btn-copia-statistiche" data-blocco="blocco-' +
    idTabella +
    '" title="Condividi come immagine"><i class="fas fa-share-nodes"></i></button></div>' +
    '<table class="tabella-statistiche" id="' +
    idTabella +
    '"><thead><tr><th>Giocatore</th><th>P</th><th>MV' +
    VOTI_MV3 +
    "</th><th>MV</th></tr></thead><tbody>";

  righe.forEach((d, i) => {
    const mediaDisplay = d.media > 0 ? d.media.toFixed(2) : "-";
    const mv3Display = isNaN(d.mv3) ? "-" : d.mv3.toFixed(2);
    const presenzeDisplay = d.nome === "Squadra" ? "" : d.record.presenze;

    // Chi non e' piu' in rosa resta in tabella con i suoi voti, ma va
    // riconoscibile: stesso asterisco usato nella cronologia.
    const fuoriRosa = d.nome !== "Squadra" && rosa.indexOf(d.nome) === -1;
    const etichetta = escapeHtml(d.nome) + (fuoriRosa ? " *" : "");
    const titoloNome = fuoriRosa ? ' title="Non fa parte della rosa attuale"' : "";

    const titoloPresenze =
      d.nome === "Squadra"
        ? ""
        : ' title="' + d.record.presenze + " su " + d.record.disponibili + ' disponibili"';

    html +=
      '<tr class="' +
      (i % 2 === 0 ? "riga-pari" : "riga-dispari") +
      '"><td><button type="button" class="btn-dettaglio-giocatore" data-nome="' +
      escapeHtml(d.nome) +
      '"' +
      titoloNome +
      ">" +
      etichetta +
      '</button></td><td class="centrato"' +
      titoloPresenze +
      ">" +
      presenzeDisplay +
      '</td><td class="centrato ' +
      classeMedia(d.mv3, true) +
      '">' +
      mv3Display +
      '</td><td class="centrato ' +
      classeMedia(d.media) +
      '">' +
      mediaDisplay +
      "</td></tr>";
  });

  return html + "</tbody></table></div>";
}

/* =========================================================
   SCHEDA GIOCATORE (modale)
   ========================================================= */
function graficoAndamento(valori, colore) {
  const punti = valori.filter((v) => !isNaN(v));
  if (punti.length < 2) {
    return '<p class="grafico-vuoto">Servono almeno 2 voti per il grafico</p>';
  }

  const W = 300;
  const H = 90;
  const P = 12;
  const min = Math.min.apply(null, punti);
  const max = Math.max.apply(null, punti);
  const range = max - min || 1;

  const coord = punti.map((v, i) => {
    const x = P + (i * (W - 2 * P)) / (punti.length - 1);
    const y = H - P - ((v - min) / range) * (H - 2 * P);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });

  const linea = coord.map((c) => c[0] + "," + c[1]).join(" ");
  const area = P + "," + (H - P) + " " + linea + " " + (W - P) + "," + (H - P);
  const cerchi = coord
    .map((c, i) => {
      const ultimo = i === coord.length - 1;
      return (
        '<circle cx="' +
        c[0] +
        '" cy="' +
        c[1] +
        '" r="' +
        (ultimo ? 4 : 2.5) +
        '" fill="' +
        colore +
        '" ' +
        (ultimo ? 'stroke="var(--sfondo-card)" stroke-width="2"' : "") +
        " />"
      );
    })
    .join("");

  return (
    '<svg class="grafico-voti" viewBox="0 0 ' +
    W +
    " " +
    H +
    '" preserveAspectRatio="none" role="img" aria-label="Andamento degli ultimi ' +
    punti.length +
    ' voti">' +
    '<polygon points="' +
    area +
    '" fill="' +
    colore +
    '" opacity="0.14" />' +
    '<polyline points="' +
    linea +
    '" fill="none" stroke="' +
    colore +
    '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />' +
    cerchi +
    "</svg>" +
    '<div class="grafico-scala"><span>min ' +
    min.toFixed(2) +
    "</span><span>max " +
    max.toFixed(2) +
    "</span></div>"
  );
}

function bloccoScheda(titolo, r, tipo, colore) {
  const media = mediaFinale(r, tipo);
  const mv3 = mediaUltimi(r);
  const base = mediaVoti(r);
  const ultimi = r.storico
    .filter((v) => !v.sv && !isNaN(v.voto))
    .slice(-10)
    .map((v) => v.voto);

  const tiles = [
    { etichetta: "Presenze", valore: r.presenze + "/" + r.disponibili },
    {
      etichetta: "MV",
      valore: media > 0 ? media.toFixed(2) : "-",
      classe: classeMedia(media)
    },
    {
      etichetta: "MV3",
      valore: isNaN(mv3) ? "-" : mv3.toFixed(2),
      classe: classeMedia(mv3, true)
    }
  ];

  if (tipo === "partita") {
    tiles.push({ etichetta: "Minuti", valore: r.minuti });
    tiles.push({ etichetta: "S.V.", valore: r.sv });
  } else {
    tiles.push({
      etichetta: "Assenze",
      valore: Math.max(0, r.disponibili - r.presenze)
    });
    tiles.push({ etichetta: "Media voti", valore: base > 0 ? base.toFixed(2) : "-" });
  }

  const htmlTiles = tiles
    .map(
      (t) =>
        '<div class="scheda-tile"><span class="scheda-tile-label">' +
        t.etichetta +
        '</span><span class="scheda-tile-valore ' +
        (t.classe || "") +
        '">' +
        t.valore +
        "</span></div>"
    )
    .join("");

  const commenti = r.storico
    .filter((v) => v.commento && v.commento.trim() !== "")
    .slice(-4)
    .reverse()
    .map(
      (v) =>
        '<li><span class="scheda-commento-data">' +
        escapeHtml(formattaData(v.data)) +
        '</span><span class="scheda-commento-testo">' +
        escapeHtml(v.commento) +
        "</span></li>"
    )
    .join("");

  return (
    '<section class="scheda-sezione"><h4 style="color:' +
    colore +
    '">' +
    titolo +
    '</h4><div class="scheda-tiles">' +
    htmlTiles +
    "</div>" +
    graficoAndamento(ultimi, colore) +
    (commenti ? '<ul class="scheda-commenti">' + commenti + "</ul>" : "") +
    "</section>"
  );
}

function apriSchedaGiocatore(nome) {
  const overlay = document.getElementById("modal-giocatore");
  const titolo = document.getElementById("modal-nome");
  const corpo = document.getElementById("modal-corpo");
  if (!overlay || !corpo) return;

  const rAll = stato.statsAllenamento[nome] || nuovoRecord();
  const rPar = stato.statsPartita[nome] || nuovoRecord();

  titolo.textContent = nome;
  corpo.innerHTML =
    nome === "Squadra"
      ? bloccoScheda("Partite", rPar, "partita", "#3b82f6")
      : bloccoScheda("Allenamenti", rAll, "allenamento", "#10b981") +
        bloccoScheda("Partite", rPar, "partita", "#3b82f6");

  overlay.classList.remove("hidden");
  document.body.classList.add("modal-aperta");
}

function chiudiScheda() {
  const overlay = document.getElementById("modal-giocatore");
  if (!overlay || overlay.classList.contains("hidden")) return;
  overlay.classList.add("hidden");
  document.body.classList.remove("modal-aperta");
}

document.addEventListener("click", (e) => {
  // e.target puo' essere il documento stesso (click senza elemento a fuoco):
  // li' closest() non esiste e l'handler moriva con un TypeError.
  if (!(e.target instanceof Element)) return;

  const btnGiocatore = e.target.closest(".btn-dettaglio-giocatore");
  if (btnGiocatore) return apriSchedaGiocatore(btnGiocatore.dataset.nome);

  if (e.target.closest(".modal-close")) return chiudiScheda();
  if (e.target.classList.contains("modal-overlay")) return chiudiScheda();

  const btnCopia = e.target.closest(".btn-copia-statistiche");
  if (btnCopia) {
    const target = document.getElementById(btnCopia.dataset.blocco);
    if (target) catturaECondividi(target, btnCopia.dataset.blocco + ".png");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") chiudiScheda();
});

/* =========================================================
   CARICAMENTO E RENDER
   ========================================================= */
function caricaDati() {
  return Promise.all([
    window.firebaseDB.ref(ID_SQUADRA + "/allenamenti").once("value"),
    window.firebaseDB.ref(ID_SQUADRA + "/partite").once("value")
  ])
    .then(([snapAll, snapPar]) => {
      const allenamenti = snapAll.val() || {};
      const partite = snapPar.val() || {};

      const arrayAllenamenti = Object.entries(allenamenti).map(([id, val]) =>
        Object.assign({ id, tipo: "allenamento" }, val)
      );
      const arrayPartite = Object.entries(partite).map(([id, val]) =>
        Object.assign({ id, tipo: "partita" }, val)
      );

      // Il calcolo va fatto dal piu' vecchio al piu' recente: serve
      // per le frecce di miglioramento e per l'MV3.
      arrayAllenamenti.sort(confrontaCrescente);
      arrayPartite.sort(confrontaCrescente);

      const risultato = calcolaStatistiche(arrayAllenamenti, arrayPartite, rosa);
      stato.statsAllenamento = risultato.statsAll;
      stato.statsPartita = risultato.statsPar;

      // La cronologia si mostra invece dal piu' recente
      stato.allenamenti = arrayAllenamenti.slice().reverse();
      stato.partite = arrayPartite.slice().reverse();

      renderStorico();
      renderStatistiche();

      /* Gli altri moduli hanno bisogno degli stessi dati: senza questo
         evento partita_spa.js si riscaricava per conto suo l'intero ramo
         partite a ogni salvataggio, raddoppiando il traffico e potendo
         leggere uno stato diverso da quello appena disegnato qui. */
      document.dispatchEvent(
        new CustomEvent("dati-ricaricati", {
          detail: { allenamenti: arrayAllenamenti, partite: arrayPartite }
        })
      );
    })
    .catch((err) => {
      console.error("Errore caricamento dati:", err);
      mostraAvviso("Errore nel caricamento dei dati", "error");
    });
}

function messaggioVuoto(testo) {
  const p = document.createElement("p");
  p.className = "lista-vuota";
  p.textContent = testo;
  return p;
}

function sezioneStorico(titolo, eventi, tipo, testoVuoto) {
  const sezione = document.createElement("div");
  const h3 = document.createElement("h3");
  h3.textContent = titolo;
  sezione.appendChild(h3);

  if (eventi.length === 0) {
    sezione.appendChild(messaggioVuoto(testoVuoto));
  } else {
    eventi.forEach((ev) => sezione.appendChild(creaEvento(ev, tipo)));
  }
  return sezione;
}

function renderStorico() {
  const contenitore = document.getElementById("storicoContainer");
  if (!contenitore) return;

  contenitore.innerHTML = "";
  contenitore.appendChild(
    sezioneStorico(
      "Allenamenti",
      stato.allenamenti,
      "allenamento",
      "Nessun allenamento registrato"
    )
  );
  contenitore.appendChild(
    sezioneStorico("Partite", stato.partite, "partita", "Nessuna partita registrata")
  );
}

function renderStatistiche() {
  const divAll = document.getElementById("statisticheAllenamentiContainer");
  const divPar = document.getElementById("statistichePartiteContainer");
  if (divAll) divAll.innerHTML = creaTabellaStatistiche(stato.statsAllenamento, "allenamento");
  if (divPar) divPar.innerHTML = creaTabellaStatistiche(stato.statsPartita, "partita");
}

/* =========================================================
   SQUADRA NON CONSULTABILE
   ---------------------------------------------------------
   A decidere cosa e' consultabile e' il database: una squadra
   alla radice si vede, una spostata sotto archivio/ no.
   Senza questo controllo una squadra archiviata apparirebbe
   semplicemente vuota, senza spiegare il perche'.
   ========================================================= */
function squadraSenzaDati() {
  return (
    rosa.length === 0 &&
    stato.allenamenti.length === 0 &&
    stato.partite.length === 0
  );
}

/* C'e' qualcosa sotto questo percorso?

   Con l'SDK la domanda costava il download dell'INTERA squadra: per sapere
   se un ramo esiste si scaricavano rosa, allenamenti e partite. La REST con
   ?shallow=true risponde con le sole chiavi di primo livello. Se non e'
   raggiungibile si ripiega sull'SDK, che almeno da' la risposta giusta. */
async function ramoEsiste(percorso) {
  const app = window.firebaseDB && window.firebaseDB.app;
  const base = app && app.options && app.options.databaseURL;
  if (base) {
    try {
      const risposta = await fetch(
        base.replace(/\/$/, "") + "/" + percorso + ".json?shallow=true"
      );
      if (risposta.ok) return (await risposta.json()) != null;
    } catch (err) {
      console.warn("Lettura shallow non riuscita per", percorso, err);
    }
  }
  const snap = await window.firebaseDB.ref(percorso).once("value");
  return snap.val() != null;
}

function mostraAvvisoSquadra(titolo, testo) {
  const banner = document.getElementById("avviso-squadra");
  if (!banner) return;
  banner.innerHTML =
    "<strong>" + escapeHtml(titolo) + "</strong>" + escapeHtml(testo);
  banner.classList.remove("hidden");
}

async function verificaSquadra() {
  const banner = document.getElementById("avviso-squadra");
  if (banner) banner.classList.add("hidden");

  // Se c'e' anche un solo dato la squadra e' viva: nessuna verifica da fare
  if (!squadraSenzaDati()) return;

  let archiviata = false;
  let esiste = false;
  try {
    [archiviata, esiste] = await Promise.all([
      ramoEsiste(RAMO_ARCHIVIO + "/" + ID_SQUADRA),
      ramoEsiste(ID_SQUADRA)
    ]);
  } catch (err) {
    console.error("Verifica squadra non riuscita:", err);
    return;
  }

  if (archiviata) {
    return mostraAvvisoSquadra(
      SQUADRA.nome + " e' archiviata",
      "I dati sono conservati sotto " + RAMO_ARCHIVIO + "/" + ID_SQUADRA +
      " e non sono consultabili dal sito. Per rivederli va riportata fuori " +
      "dall'archivio dalla pagina di gestione."
    );
  }

  // Squadra viva ma ancora senza nulla dentro: e' il caso normale subito
  // dopo la creazione, non un errore.
  if (esiste) {
    return mostraAvvisoSquadra(
      SQUADRA.nome + " non ha ancora dati",
      "La squadra esiste ma la rosa e' vuota e non ci sono allenamenti ne' " +
      "partite. Aggiungi i giocatori dalla pagina di gestione."
    );
  }

  // Nessun ramo con questo id: quasi sempre un ?team= sbagliato o un
  // dominio non ancora mappato in SQUADRA_PER_HOST.
  mostraAvvisoSquadra(
    "Nessuna squadra \"" + ID_SQUADRA + "\"",
    "Sul database non esiste un ramo con questo id. Controlla l'indirizzo " +
    "(?team=<id>) oppure creala dalla pagina di gestione."
  );
}

/* =========================================================
   AVVIO
   ========================================================= */
/* Senza rete le letture di Firebase non si risolvono ne' falliscono:
   restano appese. Senza questo limite il finally non partiva mai e
   l'app mostrava lo scheletro di caricamento all'infinito. */
const TIMEOUT_AVVIO = 12000;

function conTimeout(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, rifiuta) =>
      setTimeout(() => rifiuta(new Error("timeout")), ms)
    )
  ]);
}

async function avviaApp() {
  try {
    await conTimeout(caricaGiocatori(), TIMEOUT_AVVIO);

    // Segnala agli altri moduli che la rosa e' disponibile
    segnalaDatiPronti();

    await conTimeout(caricaDati(), TIMEOUT_AVVIO);
    await conTimeout(verificaSquadra(), TIMEOUT_AVVIO);
  } catch (err) {
    console.error("Errore avvio app:", err);
    // Gli altri moduli aspettano il segnale: senza, Partita e Allenamento
    // resterebbero inerti anche potendo almeno disegnare l'interfaccia.
    segnalaDatiPronti();
    mostraAvviso(
      err && err.message === "timeout"
        ? "Nessuna connessione: dati non disponibili"
        : "Errore caricamento dati iniziali",
      "error"
    );
  } finally {
    document.body.classList.remove("loading");
  }
}

avviaApp();

document.addEventListener("data-update", async () => {
  await caricaDati();
  // Cancellando l'ultimo evento la squadra puo' diventare vuota: senza
  // questa seconda verifica il banner compariva solo ricaricando la pagina.
  await verificaSquadra();
});
