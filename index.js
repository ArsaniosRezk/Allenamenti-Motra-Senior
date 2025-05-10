// index.js (modificato per gestire "S.V.")
import { giocatori as listaGiocatori } from "./giocatori.js";
import { abbreviaNome } from "./giocatori.js";
import { mostraAvviso } from "./utils.js";

const giocatori = [...listaGiocatori, "Squadra"];

const storicoDiv = document.getElementById("storicoContainer");
const statsDiv = document.getElementById("statisticheContainer");

const statsAllenamento = {};
const statsPartita = {};
let numeroAllenamenti = 0;
const assenzeAllenamento = {};

function inizializzaStats() {
  giocatori.forEach((nome) => {
    statsAllenamento[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
    statsPartita[nome] = {
      presenze: 0,
      sommaVoti: 0,
      media: 0,
      minuti: 0,
      _conteggioMedia: 0,
    };
    assenzeAllenamento[nome] = 0;
  });
}

function creaEvento(all, backupUltimoAllenamento, backupUltimaPartita) {
  const tipo = all.tipo || "allenamento";
  if (tipo === "allenamento") numeroAllenamenti++;

  const tipoCapitalizzato = tipo.charAt(0).toUpperCase() + tipo.slice(1);

  let data = all.data || new Date(all.timestamp).toLocaleDateString("it-IT");
  if (all.data) {
    const [yyyy, mm, dd] = all.data.split("-");
    data = `${dd}/${mm}/${yyyy}`;
  }

  const container = document.createElement("div");
  container.className = "evento-container";

  const header = document.createElement("div");
  header.className = "evento-header";

  const label = document.createElement("span");
  label.textContent = `${tipoCapitalizzato} ${data}`;

  const toggleIcon = document.createElement("span");
  toggleIcon.className = "toggle-icon";
  toggleIcon.textContent = "+";

  const leftGroup = document.createElement("div");
  leftGroup.className = "evento-left";
  leftGroup.appendChild(label);
  leftGroup.appendChild(toggleIcon);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-elimina";
  deleteBtn.innerHTML = `<i class="fas fa-trash"></i>`;
  deleteBtn.title = "Elimina";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Sei sicuro di voler eliminare questo elemento?")) {
      firebaseDB
        .ref(`${tipo === "partita" ? "partite" : "allenamenti"}`)
        .child(all.id)
        .remove()
        .then(() => {
          const genere = tipo === "partita" ? "eliminata" : "eliminato";
          mostraAvviso(`${tipoCapitalizzato} ${genere}`, "success");
          setTimeout(() => location.reload(), 1000);
        })
        .catch(() => {
          mostraAvviso("Errore durante l'eliminazione", "error");
        });
    }
  });

  const copiaBtn = document.createElement("button");
  copiaBtn.className = "btn-copia";
  copiaBtn.innerHTML = `<i class="fas fa-camera"></i>`;
  copiaBtn.title = "Copia evento come immagine";
  copiaBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    container.classList.add("screenshot-mode");
    html2canvas(container).then((canvas) => {
      container.classList.remove("screenshot-mode");
      canvas.toBlob((blob) => {
        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(() => mostraAvviso("Copiato come immagine", "success"))
          .catch(() => mostraAvviso("Errore nella copia", "error"));
      });
    });
  });

  const dettaglio = document.createElement("div");
  dettaglio.className = "evento-dettaglio nascosto";

  const table = document.createElement("table");
  table.className = "mini-tabella";

  const rigaAzioni = document.createElement("tr");
  rigaAzioni.className = "riga-azioni";
  const numeroRighe = table.querySelectorAll("tr").length;
  rigaAzioni.className =
    numeroRighe % 2 === 0
      ? "riga-pari riga-azioni"
      : "riga-dispari riga-azioni";

  const tdAzioni = document.createElement("td");
  tdAzioni.colSpan = 2;

  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "azioni-wrapper";
  actionsWrapper.appendChild(copiaBtn);
  actionsWrapper.appendChild(deleteBtn);

  tdAzioni.appendChild(actionsWrapper);
  rigaAzioni.appendChild(tdAzioni);
  table.appendChild(rigaAzioni);

  giocatori.forEach((nome, index) => {
    if (tipo === "allenamento" && nome.trim().toLowerCase() === "squadra")
      return;

    const tr = document.createElement("tr");
    tr.className = index % 2 === 0 ? "riga-pari" : "riga-dispari";

    const presente = all.giocatori && all.giocatori[nome] !== undefined;
    const votoRaw =
      all.giocatori?.[nome]?.votoFinale ?? all.giocatori?.[nome]?.voto;
    const voto = votoRaw === "S.V." ? NaN : parseFloat(votoRaw);
    const minuti = all.giocatori?.[nome]?.minuti;
    const commento = all.giocatori?.[nome]?.commento || "";
    const abbreviazione = abbreviaNome(nome);

    const tdNomeVoto = document.createElement("td");
    const tdCommento = document.createElement("td");
    tdNomeVoto.classList.add("col-nome");
    tdCommento.classList.add("col-commento");

    if (presente) {
      const ultimoVoti =
        tipo === "partita" ? backupUltimaPartita : backupUltimoAllenamento;
      const votoPrecedente = ultimoVoti[nome];
      let freccia = "",
        classe = "";
      if (!isNaN(voto) && !isNaN(votoPrecedente)) {
        if (voto > votoPrecedente) {
          freccia = "⬆︎";
          classe = "migliorato";
        } else if (voto < votoPrecedente) {
          freccia = "⬇︎";
          classe = "peggiorato";
        }
      }
      ultimoVoti[nome] = voto;

      const votoDisplay =
        votoRaw === "S.V." ? "S.V." : isNaN(voto) ? "-" : voto;
      tdNomeVoto.innerHTML = `<strong>${abbreviazione}</strong><br /> ${votoDisplay} <span class="freccia ${classe}">${freccia}</span>`;
      tdCommento.textContent = commento;

      const stats =
        tipo === "partita" ? statsPartita[nome] : statsAllenamento[nome];
      stats.presenze++;

      if (tipo === "partita") {
        if (!isNaN(minuti)) stats.minuti += minuti;
        if (!isNaN(voto)) {
          stats.sommaVoti += voto;
          stats._conteggioMedia++;
        }
      } else {
        if (!isNaN(voto)) stats.sommaVoti += voto;
      }
    } else {
      tdNomeVoto.innerHTML = `<strong>${abbreviazione}</strong><br /> assente`;
      tdCommento.textContent = "";
      if (tipo === "allenamento") assenzeAllenamento[nome]++;
    }

    tr.appendChild(tdNomeVoto);
    tr.appendChild(tdCommento);
    table.appendChild(tr);
  });

  dettaglio.appendChild(table);

  header.appendChild(leftGroup);
  header.addEventListener("click", () => {
    const aperto = !dettaglio.classList.contains("nascosto");
    dettaglio.classList.toggle("nascosto");
    toggleIcon.textContent = aperto ? "+" : "−";
  });

  container.appendChild(header);
  container.appendChild(dettaglio);
  return container;
}

function creaTabellaStatistiche(statsObj, titolo) {
  const idTabella =
    titolo === "Statistiche Allenamenti"
      ? "tabella-allenamenti"
      : "tabella-partite";

  let ordinati = Object.entries(statsObj).map(([nome, dati]) => {
    let mediaBase;
    if (titolo === "Statistiche Partite") {
      const conteggioMedia = dati._conteggioMedia || 0;
      mediaBase = conteggioMedia > 0 ? dati.sommaVoti / conteggioMedia : 0;
    } else {
      mediaBase = dati.presenze > 0 ? dati.sommaVoti / dati.presenze : 0;
    }

    let media;
    if (titolo === "Statistiche Partite") {
      media = mediaBase;
    } else {
      const penalita = (assenzeAllenamento[nome] || 0) * 0.1;
      const mediaPenalizzata = mediaBase * (1 - penalita);
      const bonus = dati.presenze * 0.05 * mediaBase;
      media = mediaPenalizzata + bonus;
    }

    return { nome, ...dati, media };
  });

  if (titolo === "Statistiche Partite") {
    ordinati = ordinati.sort((a, b) => {
      if (a.nome === "Squadra") return 1;
      if (b.nome === "Squadra") return -1;
      return b.media - a.media;
    });
  } else {
    ordinati = ordinati
      .filter((d) => d.nome !== "Squadra")
      .sort((a, b) => b.media - a.media);
  }

  let html = `
    <div class="statistiche-blocco" id="blocco-${idTabella}">
      <div class="statistiche-header">
        <h3>${titolo}</h3>
        <button class="btn-copia-statistiche" data-blocco="blocco-${idTabella}" title="Copia come immagine">
          <i class="fas fa-camera"></i>
        </button>
      </div>
      <table class="tabella-statistiche" id="${idTabella}">
        <thead><tr><th>Giocatore</th><th>P</th><th>MV</th></tr></thead>
        <tbody>`;

  ordinati.forEach((dati, i) => {
    let classeMedia = "";
    let mediaDisplay = "-";
    let presenzeDisplay = dati.nome === "Squadra" ? "" : dati.presenze;

    if (dati.presenze > 0 && dati.media > 0) {
      mediaDisplay = dati.media.toFixed(2);
      if (dati.media < 6) classeMedia = "media-bassa";
      else if (dati.media < 7) classeMedia = "media-media";
      else if (dati.media < 8) classeMedia = "media-buona";
      else classeMedia = "media-alta";
    }

    html += `<tr class="${i % 2 === 0 ? "riga-pari" : "riga-dispari"}">
            <td>${dati.nome}</td>
            <td class="centrato">${presenzeDisplay}</td>
            <td class="centrato ${classeMedia}">${mediaDisplay}</td>
          </tr>`;
  });

  html += `</tbody></table><br/>`;
  return html;
}

Promise.all([
  firebaseDB.ref("allenamenti").once("value"),
  firebaseDB.ref("partite").once("value"),
]).then(([snapAll, snapPar]) => {
  const allenamenti = snapAll.val();
  const partite = snapPar.val();
  inizializzaStats();

  const arrayAllenamenti = allenamenti
    ? Object.entries(allenamenti).map(([id, val]) => ({ id, ...val }))
    : [];

  const arrayPartite = partite
    ? Object.entries(partite).map(([id, val]) => ({
        id,
        tipo: "partita",
        ...val,
      }))
    : [];

  arrayAllenamenti.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  arrayPartite.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  document.getElementById("storicoContainer").innerHTML =
    "<h3>Cronologia Allenamenti</h3>";
  arrayAllenamenti.forEach((all) => {
    const evento = creaEvento(all, {}, {});
    document.getElementById("storicoContainer").appendChild(evento);
  });

  const partiteDiv = document.createElement("div");
  const titoloPartite = document.createElement("h3");
  titoloPartite.textContent = "Cronologia Partite";
  partiteDiv.appendChild(titoloPartite);
  arrayPartite.forEach((par) => {
    const evento = creaEvento(par, {}, {});
    partiteDiv.appendChild(evento);
  });
  document.getElementById("storicoContainer").appendChild(partiteDiv);

  document.getElementById("statisticheAllenamentiContainer").innerHTML =
    creaTabellaStatistiche(statsAllenamento, "Statistiche Allenamenti");
  document.getElementById("statistichePartiteContainer").innerHTML =
    creaTabellaStatistiche(statsPartita, "Statistiche Partite");
});
