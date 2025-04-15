// script.js
import { giocatori as listaGiocatori } from "./giocatori.js";
import { mostraAvviso } from "./utils.js";

const firebaseDB = window.firebaseDB;
const giocatoriListDiv = document.getElementById("lista-giocatori");

// Funzione: crea le opzioni voto
function creaSelectVoto(index) {
  let options = '<option value="">-</option>';
  for (let v = 1.0; v <= 10.0; v += 0.25) {
    const voto = v.toFixed(2).replace(".00", "");
    options += `<option value="${voto}">${voto}</option>`;
  }
  return `<select name="voto" data-index="${index}">${options}</select>`;
}

// Funzione: crea un toggle 3 stati
function creaToggle(label, index, type) {
  return `
  <div style="display: flex; gap: 10px; align-items: center;">
    <label style="font-size: 14px;">${label}</label>
    <div class="toggle-3" data-state="0" data-index="${index}" data-type="${type}" aria-label="${label} Bonus">
      <div class="dot"></div>
      <div class="etichetta-toggle">0%</div>
    </div>
  </div>`;
}

// Crea dinamicamente la lista dei giocatori + squadra
listaGiocatori.forEach((nome, index) => {
  const div = document.createElement("div");
  div.className = "giocatore";

  div.classList.add("giocatore-box"); // stile comune

  div.innerHTML = `
    <div class="giocatore-riga">
      <label class="giocatore-nome">${nome}</label>
      ${creaSelectVoto(index)}
    </div>
    <div class="bonus-container">
      ${creaToggle("Atletica", index, "bonusAtletica")}
      ${creaToggle("Partitella", index, "bonusPartitella")}
    </div>
    <textarea name="commento" data-index="${index}" placeholder="Osservazioni" class="commento-area"></textarea>
  `;

  giocatoriListDiv.appendChild(div);
});

// Mostra/nasconde i bonus se allenamento
function aggiornaBonusVisibility() {
  document.querySelectorAll(".bonus-container").forEach((el) => {
    el.style.display = "flex";
  });
}

// Gestione toggle 3 stati con feedback visivo
function aggiornaToggleVisual(toggle) {
  const stato = parseInt(toggle.dataset.state);
  const etichetta = toggle.querySelector(".etichetta-toggle");

  // Rimuove classi precedenti
  toggle.classList.remove("negativo", "neutro", "positivo");

  // Aggiunge classe corretta in base allo stato
  if (stato === -1) {
    toggle.classList.add("negativo");
    if (etichetta) etichetta.textContent = "-5%";
  } else if (stato === 1) {
    toggle.classList.add("positivo");
    if (etichetta) etichetta.textContent = "+5%";
  } else {
    toggle.classList.add("neutro");
    if (etichetta) etichetta.textContent = "0%";
  }
}

document.querySelectorAll(".toggle-3").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    let current = parseInt(toggle.dataset.state);
    const next = current === 1 ? -1 : current + 1;
    toggle.dataset.state = next.toString();
    aggiornaToggleVisual(toggle);
  });
  aggiornaToggleVisual(toggle);
});

// Submit del form
const form = document.getElementById("allenamentoForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dataAllenamento = document.getElementById("dataAllenamento").value;
  const isAllenamento = true;

  const allenamento = {
    tipo: "allenamento",
    data: dataAllenamento,
    timestamp: new Date().toISOString(),
    giocatori: {},
  };

  listaGiocatori.forEach((nome, index) => {
    const votoSelect = document.querySelector(
      `select[name="voto"][data-index="${index}"]`
    );
    const commentoInput = document.querySelector(
      `textarea[name="commento"][data-index="${index}"]`
    );
    const toggleAtletica = document.querySelector(
      `.toggle-3[data-index="${index}"][data-type="bonusAtletica"]`
    );
    const togglePartitella = document.querySelector(
      `.toggle-3[data-index="${index}"][data-type="bonusPartitella"]`
    );

    const voto = parseFloat(votoSelect?.value);
    if (isNaN(voto)) return;

    const bonusAtletica = isAllenamento
      ? parseInt(toggleAtletica?.dataset.state || "0")
      : 0;
    const bonusPartitella = isAllenamento
      ? parseInt(togglePartitella?.dataset.state || "0")
      : 0;
    const bonusPercent = (bonusAtletica + bonusPartitella) * 0.05;
    const votoFinale = parseFloat((voto * (1 + bonusPercent)).toFixed(2));

    if (!isNaN(voto)) {
      allenamento.giocatori[nome] = {
        voto,
        bonusAtletica,
        bonusPartitella,
        votoFinale,
        commento: commentoInput?.value || "",
      };
    }
  });

  const votiValidi = Object.values(allenamento.giocatori).filter(
    (dati) => !isNaN(dati.voto)
  );

  if (votiValidi.length === 0) {
    mostraAvviso("Nessun giocatore ha un voto", "error");
    return;
  }

  try {
    await firebaseDB
      .ref(allenamento.tipo === "partita" ? "partite" : "allenamenti")
      .push(allenamento);
    form.reset();
    document.querySelectorAll(".toggle-3").forEach((toggle) => {
      toggle.dataset.state = "0";
      aggiornaToggleVisual(toggle);
    });
    aggiornaBonusVisibility();
    mostraAvviso("Allenamento salvato", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("Errore nel salvataggio:", err);
    mostraAvviso("Errore nel salvataggio", "error");
  }
});
