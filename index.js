// index.js (modificato per gestire "S.V.")
import { giocatori as listaGiocatori } from "./giocatori.js";
import { abbreviaNome } from "./giocatori.js";
import { mostraAvviso, condividiImmagine, ID_SQUADRA } from "./utils.js";

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("Service Worker registrato!"))
      .catch((err) => console.log("Service Worker fallito:", err));
  });
}

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

  /* Modern Event Header */
  const icona = tipo === "partita" ? `<i class="fas fa-futbol"></i>` : `<i class="fas fa-running"></i>`;
  const coloreIcona = tipo === "partita" ? "#3b82f6" : "#10b981"; // Blue vs Green accent

  const headerLeft = document.createElement("div");
  headerLeft.className = "evento-left";
  headerLeft.innerHTML = `
    <div class="evento-icon-box" style="background-color: ${coloreIcona}20; color: ${coloreIcona};">
      ${icona}
    </div>
    <div class="evento-info">
      <span class="evento-tipo">${tipoCapitalizzato}</span>
      <span class="evento-data">${data}</span>
    </div>
  `;

  /* Check if match has votes (is done) or just formation (pending) */
  const haVoti = all.giocatori && Object.keys(all.giocatori).length > 0;
  const isDaSvolgere = tipo === "partita" && !haVoti;

  const headerRight = document.createElement("div");
  headerRight.className = "evento-right";

  const toggleIcon = document.createElement("span");
  toggleIcon.className = "toggle-icon";

  if (isDaSvolgere) {
    toggleIcon.innerHTML = `<span class="badge-pending">Da Svolgere</span>`;
    toggleIcon.style.transform = "none"; // Disable rotation
    toggleIcon.style.fontSize = "0.75rem";
    toggleIcon.style.opacity = "0.8";
  } else {
    toggleIcon.innerHTML = `<i class="fas fa-chevron-down"></i>`;
  }

  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  // headerRight.appendChild(toggleIcon); // Moved below actions

  /* Buttons Logic Moved Here */
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-elimina-icon";
  deleteBtn.innerHTML = `<i class="fas fa-trash"></i>`;
  deleteBtn.title = "Elimina";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Sei sicuro di voler eliminare questo elemento?")) {
      firebaseDB
        .ref(`${ID_SQUADRA}/${tipo === "partita" ? "partite" : "allenamenti"}`)
        .child(all.id)
        .remove()
        .then(() => {
          const genere = tipo === "partita" ? "eliminata" : "eliminato";
          mostraAvviso(`${tipoCapitalizzato} ${genere}`, "success");
          document.dispatchEvent(new Event("data-update"));
        })
        .catch(() => {
          mostraAvviso("Errore durante l'eliminazione", "error");
        });
    }
  });

  const copiaBtn = document.createElement("button");
  copiaBtn.className = "btn-copia-icon";
  copiaBtn.innerHTML = `<i class="fas fa-share-nodes"></i>`;
  copiaBtn.title = "Copia evento come immagine";
  copiaBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    container.classList.add("screenshot-mode");
    // Use hex for dark background to avoid white corners issues if transparency fails
    html2canvas(container, { backgroundColor: null }).then((canvas) => {
      container.classList.remove("screenshot-mode");
      canvas.toBlob((blob) => {
        condividiImmagine(blob, `evento_${all.id}.png`);
      });
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

  const dettaglio = document.createElement("div");
  dettaglio.className = "evento-dettaglio nascosto";

  // Only build table if NOT pending
  if (!isDaSvolgere) {
    const table = document.createElement("table");
    table.className = "mini-tabella";

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
  }

  // Only enable toggle if NOT pending
  if (!isDaSvolgere) {
    header.addEventListener("click", () => {
      const aperto = !dettaglio.classList.contains("nascosto");
      dettaglio.classList.toggle("nascosto");
      container.classList.toggle("expanded"); // Add expanded class for styling
      toggleIcon.style.transform = aperto ? "rotate(0deg)" : "rotate(180deg)";
    });
    header.style.cursor = "pointer"; // Explicitly show pointer
  } else {
    header.style.cursor = "default";
    container.classList.add("pending-event"); // Optional style hooks
  }

  container.appendChild(header);
  container.appendChild(dettaglio);
  return container;
}

function creaTabellaStatistiche(statsObj, titolo) {
  const idTabella =
    titolo === "Allenamenti"
      ? "tabella-allenamenti"
      : "tabella-partite";

  let ordinati = Object.entries(statsObj).map(([nome, dati]) => {
    let mediaBase;
    if (titolo === "Partite") {
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
          <i class="fas fa-share-nodes"></i>
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

  html += `</tbody></table></div>`;
  return html;
}

function caricaDati() {
  Promise.all([
    firebaseDB.ref(`${ID_SQUADRA}/allenamenti`).once("value"),
    firebaseDB.ref(`${ID_SQUADRA}/partite`).once("value"),
  ]).then(([snapAll, snapPar]) => {
    const allenamenti = snapAll.val();
    const partite = snapPar.val();

    // Reset stats
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

    // Clear Containers
    const storicoContainer = document.getElementById("storicoContainer");
    if (storicoContainer) {
      storicoContainer.innerHTML = "<h3>Allenamenti</h3>";

      arrayAllenamenti.forEach((all) => {
        const evento = creaEvento(all, {}, {});
        storicoContainer.appendChild(evento);
      });

      const partiteDiv = document.createElement("div");
      const titoloPartite = document.createElement("h3");
      titoloPartite.textContent = "Partite";
      partiteDiv.appendChild(titoloPartite);
      arrayPartite.forEach((par) => {
        const evento = creaEvento(par, {}, {});
        partiteDiv.appendChild(evento);
      });
      storicoContainer.appendChild(partiteDiv);
    }

    document.getElementById("statisticheAllenamentiContainer").innerHTML =
      creaTabellaStatistiche(statsAllenamento, "Statistiche Allenamenti");
    document.getElementById("statistichePartiteContainer").innerHTML =
      creaTabellaStatistiche(statsPartita, "Statistiche Partite");

    // Re-attach screenshot listeners for new elements
    document.querySelectorAll(".btn-copia-statistiche").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetId = btn.getAttribute("data-blocco");
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          targetElement.classList.add("screenshot-mode");
          // Use hex for dark background
          html2canvas(targetElement, { backgroundColor: null }).then((canvas) => {
            targetElement.classList.remove("screenshot-mode");
            canvas.toBlob((blob) => {
              condividiImmagine(blob, "statistiche.png");
            });
          });
        }
      });
    });
  });
}

// Initial Load
caricaDati();

// Listen for updates
document.addEventListener("data-update", () => {
  console.log("Refreshing data...");
  caricaDati();
});
