// script.js
import { giocatori as listaGiocatori } from "./giocatori.js";

const firebaseDB = window.firebaseDB;
const giocatoriListDiv = document.getElementById("lista-giocatori");

function mostraAvviso(msg, tipo = "success") {
  // Crea il avviso se non esiste
  if (!document.getElementById("avviso")) {
    const avviso = document.createElement("div");
    avviso.id = "avviso";
    document.body.appendChild(avviso);
  }

  const avviso = document.getElementById("avviso");
  avviso.textContent = msg;

  // Rimuove classi precedenti
  avviso.classList.remove("success", "error");

  // Aggiunge la classe in base al tipo
  avviso.classList.add(tipo);

  // Mostra il avviso
  avviso.style.display = "block";

  setTimeout(() => {
    avviso.style.display = "none";
  }, 2000);
}

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
[...listaGiocatori, "Squadra"].forEach((nome, index) => {
  const isSquadra = nome === "Squadra";

  const div = document.createElement("div");
  div.className = isSquadra ? "squadra" : "giocatore";
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
const tipoSelect = document.getElementById("tipoAttivita");
function aggiornaBonusVisibility() {
  const isAllenamento = tipoSelect.value === "allenamento";
  document.querySelectorAll(".bonus-container").forEach((el) => {
    el.style.display = isAllenamento ? "flex" : "none";
  });
  const divSquadra = document.querySelector(".squadra");
  if (divSquadra) divSquadra.style.display = isAllenamento ? "none" : "flex";
}

tipoSelect.addEventListener("change", aggiornaBonusVisibility);
aggiornaBonusVisibility();

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
  const tipoAttivita = tipoSelect.value;
  const isAllenamento = tipoAttivita === "allenamento";

  const allenamento = {
    tipo: tipoAttivita,
    data: dataAllenamento,
    timestamp: new Date().toISOString(),
    giocatori: {},
  };

  [...listaGiocatori, "Squadra"].forEach((nome, index) => {
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

    if (nome === "Squadra" || !isNaN(voto)) {
      allenamento.giocatori[nome] = {
        voto,
        bonusAtletica,
        bonusPartitella,
        votoFinale,
        commento: commentoInput?.value || "",
      };
    }
  });

  if (Object.keys(allenamento.giocatori).length === 0) {
    mostraAvviso("Nessun giocatore ha un voto", "error");
    return;
  }

  try {
    await firebaseDB.ref("allenamenti").push(allenamento);
    form.reset();
    document.querySelectorAll(".toggle-3").forEach((toggle) => {
      toggle.dataset.state = "0";
      aggiornaToggleVisual(toggle);
    });
    aggiornaBonusVisibility();
    mostraAvviso("Pagella salvata!", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("Errore nel salvataggio:", err);
    mostraAvviso("Errore nel salvataggio", "error");
  }
});
