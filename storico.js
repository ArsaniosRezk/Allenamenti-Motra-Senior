// storico.js (modulare)
import { giocatori as listaGiocatori } from "./giocatori.js";
import { abbreviaNome } from "./giocatori.js";
import { mostraAvviso } from "./utils.js";

const giocatori = [...listaGiocatori, "Squadra"];

const storicoDiv = document.getElementById("storicoContainer");
const statsDiv = document.getElementById("statisticheContainer");

const statsAllenamento = {};
const statsPartita = {};
// const ultimoVotoAllenamento = {};
// const ultimoVotoPartita = {};
let numeroAllenamenti = 0;
const assenzeAllenamento = {};
// const eccezioniAssenze = [];

function inizializzaStats() {
  giocatori.forEach((nome) => {
    statsAllenamento[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
    statsPartita[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
    assenzeAllenamento[nome] = 0;
  });
}

function creaCronologia(allenamentiArray) {
  storicoDiv.innerHTML = "";
  const titolo = document.createElement("h3");
  titolo.textContent = "Cronologia";
  storicoDiv.appendChild(titolo);

  // Prima crea tutti gli eventi e memorizzali
  const containers = [];
  const backupUltimoAllenamento = {};
  const backupUltimaPartita = {};

  for (let i = allenamentiArray.length - 1; i >= 0; i--) {
    const all = allenamentiArray[i];
    const container = creaEvento(
      all,
      backupUltimoAllenamento,
      backupUltimaPartita
    );
    containers.unshift(container);
  }

  containers.forEach((c) => storicoDiv.appendChild(c));
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
        .ref("allenamenti")
        .child(all.id)
        .remove()
        .then(() => location.reload());
    }
  });

  const copiaBtn = document.createElement("button");
  copiaBtn.className = "btn-copia";
  copiaBtn.innerHTML = `<i class="fas fa-camera"></i>`;
  copiaBtn.title = "Copia evento come immagine";
  copiaBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Forza modalità screenshot
    container.classList.add("screenshot-mode");

    html2canvas(container).then((canvas) => {
      // Ripristina stile originale
      container.classList.remove("screenshot-mode");

      canvas.toBlob((blob) => {
        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(() => {
            mostraAvviso("Copiato come immagine!", "success");
          })
          .catch(() => {
            mostraAvviso("Errore nella copia.", "error");
          });
      });
    });
  });

  // const modificaBtn = document.createElement("button");
  // modificaBtn.className = "btn-modifica";
  // modificaBtn.innerHTML = `<i class="fas fa-pen-to-square"></i>`;
  // modificaBtn.title = "Modifica evento";
  // modificaBtn.addEventListener("click", (e) => {
  //   e.stopPropagation();
  //   alert("Funzione di modifica non ancora implementata.");
  // });

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
  tdAzioni.colSpan = 2; // Importante: la tabella ha 2 colonne, quindi la uniamo

  // Wrapper per i 3 bottoni affiancati
  const actionsWrapper = document.createElement("div");
  actionsWrapper.className = "azioni-wrapper";
  // actionsWrapper.appendChild(modificaBtn);
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
    const voto =
      all.giocatori?.[nome]?.votoFinale ?? all.giocatori?.[nome]?.voto;
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

      tdNomeVoto.innerHTML = `<strong>${abbreviazione}</strong><br /> ${
        isNaN(voto) ? "-" : voto
      } <span class="freccia ${classe}">${freccia}</span>`;

      tdCommento.textContent = commento;

      const stats =
        tipo === "partita" ? statsPartita[nome] : statsAllenamento[nome];
      stats.presenze++;
      if (!isNaN(voto)) stats.sommaVoti += voto;
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

  const ordinati = Object.entries(statsObj)
    .filter(
      ([nome]) => nome !== "Squadra" || titolo !== "Statistiche Allenamenti"
    )
    .map(([nome, dati]) => {
      const mediaBase = dati.presenze > 0 ? dati.sommaVoti / dati.presenze : 0;
      const penalita = (assenzeAllenamento[nome] || 0) * 0.1;
      const mediaPenalizzata = mediaBase * (1 - penalita);
      const bonus = dati.presenze * 0.05 * mediaBase;
      const media = mediaPenalizzata + bonus;
      return { nome, ...dati, media };
    })
    .sort((a, b) => b.media - a.media);

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
    if (dati.presenze > 0) {
      if (dati.media < 6) classeMedia = "media-bassa";
      else if (dati.media < 7) classeMedia = "media-media";
      else if (dati.media < 8) classeMedia = "media-buona";
      else classeMedia = "media-alta";
    }

    html += `<tr class="${i % 2 === 0 ? "riga-pari" : "riga-dispari"}">
      <td>${dati.nome}</td>
      <td class="centrato">${dati.presenze}</td>
      <td class="centrato ${classeMedia}">${
      dati.presenze === 0 ? "-" : dati.media.toFixed(2)
    }</td>
    </tr>`;
  });

  html += `</tbody></table><br/>`;
  return html;
}

firebaseDB.ref("allenamenti").once("value", (snapshot) => {
  const allenamenti = snapshot.val();
  if (!allenamenti) {
    storicoDiv.innerHTML = "<p>Nessun allenamento o partita registrata.</p>";
    return;
  }
  inizializzaStats();
  const allenamentiArray = Object.keys(allenamenti)
    .map((id) => ({ id, ...allenamenti[id] }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  creaCronologia(allenamentiArray);
  document.getElementById("statisticheAllenamentiContainer").innerHTML =
    creaTabellaStatistiche(statsAllenamento, "Statistiche Allenamenti");

  document.getElementById("statistichePartiteContainer").innerHTML =
    creaTabellaStatistiche(statsPartita, "Statistiche Partite");

  document.querySelectorAll(".btn-copia-statistiche").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bloccoId = btn.getAttribute("data-blocco");
      const blocco = document.getElementById(bloccoId);
      if (!blocco) return;

      // Nasconde temporaneamente il bottone
      btn.style.display = "none";
      blocco.classList.add("screenshot-mode");

      html2canvas(blocco).then((canvas) => {
        blocco.classList.remove("screenshot-mode");
        btn.style.display = ""; // Ripristina bottone

        canvas.toBlob((blob) => {
          navigator.clipboard
            .write([new ClipboardItem({ "image/png": blob })])
            .then(() => mostraAvviso("Copiato come immagine!", "success"))
            .catch(() => mostraAvviso("Errore nella copia.", "error"));
        });
      });
    });
  });
});
