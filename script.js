const giocatori = [
  "Alessandro Botrous",
  "Alessandro Tawadrous",
  "Amir Atef",
  "Antonios Girgis",
  "Armia Rezk",
  "Arsanios Rezk",
  "Bisho Karim",
  "Ishak Salib",
  "Kirollos Youssef",
  "Kirolos Shehata",
  "Kirullos Soliman",
  "Marco Salib",
  "Matteo Boles",
  "Mino Basem",
  "Peter Melek",
  "Tamer Mekkar",
];

const firebaseDB = window.firebaseDB;
const giocatoriListDiv = document.getElementById("giocatoriList");

// Crea dinamicamente la lista dei giocatori
[...giocatori, "Squadra"].forEach((nome, index) => {
  const isSquadra = nome === "Squadra";

  const div = document.createElement("div");
  div.className = isSquadra ? "squadra" : "giocatore";
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.marginBottom = "15px";
  div.style.padding = "10px";
  div.style.borderRadius = "8px";
  div.style.backgroundColor = "#e8e8e8";

  let options = '<option value="">-</option>';
  for (let v = 1.0; v <= 10.0; v += 0.25) {
    const voto = v.toFixed(2).replace(".00", "");
    options += `<option value="${voto}">${voto}</option>`;
  }

  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="flex: 1; font-weight: bold;">${nome}</span>
      ${
        !isSquadra
          ? `<span style="margin-right: 4px; font-size: 14px;">Presenza</span>
      <label class="switch">
        <input type="checkbox" name="presenze" data-index="${index}">
        <span class="slider round"></span>
      </label>`
          : ""
      }
      <select name="voto" data-index="${index}" style="width: 60px;">
        ${options}
      </select>
    </div>
    <div class="bonus-container" style="display: flex; justify-content: space-between; margin-top: 5px; align-items: center;">
      <div style="display: flex; gap: 10px; align-items: center;">
        <label style="font-size: 14px;">Atletica</label>
        <div class="toggle-3" data-state="0" data-index="${index}" data-type="bonusAtletica">
          <div class="dot"></div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <label style="font-size: 14px;">Partitella</label>
        <div class="toggle-3" data-state="0" data-index="${index}" data-type="bonusPartitella">
          <div class="dot"></div>
        </div>
      </div>
    </div>
    <textarea name="commento" data-index="${index}" placeholder="Osservazioni" style="margin-top: 5px; width: 100%; resize: vertical; min-height: 40px;"></textarea>
  `;

  giocatoriListDiv.appendChild(div);
});

// Gestione toggle 3 stati
const tipoSelect = document.getElementById("tipoAttivita");
const aggiornaBonusVisibility = () => {
  const isAllenamento = tipoSelect.value === "allenamento";
  document.querySelectorAll(".bonus-container").forEach((el) => {
    el.style.display = isAllenamento ? "flex" : "none";
  });
};
if (tipoSelect) {
  tipoSelect.addEventListener("change", aggiornaBonusVisibility);
  aggiornaBonusVisibility();
}

document.querySelectorAll(".toggle-3").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    let current = parseInt(toggle.dataset.state);
    const next = current === 1 ? -1 : current + 1;
    toggle.dataset.state = next.toString();

    toggle.style.backgroundColor =
      next === -1 ? "#e74c3c" : next === 1 ? "#2ecc71" : "#ccc";
  });
});

// Submit
document
  .getElementById("allenamentoForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const dataAllenamento = document.getElementById("dataAllenamento").value;
    const tipoAttivita = document.getElementById("tipoAttivita").value;

    const allenamento = {
      tipo: tipoAttivita,
      data: dataAllenamento,
      timestamp: new Date().toISOString(),
      giocatori: {},
    };

    const isAllenamento = tipoAttivita === "allenamento";

    [...giocatori, "Squadra"].forEach((nome, index) => {
      const presenzaInput = document.querySelector(
        `input[name="presenze"][data-index="${index}"]`
      );

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

      const bonusAtletica = isAllenamento
        ? parseInt(toggleAtletica?.dataset.state || "0")
        : 0;
      const bonusPartitella = isAllenamento
        ? parseInt(togglePartitella?.dataset.state || "0")
        : 0;

      const voto = parseFloat(votoSelect?.value);
      const bonusPercent = (bonusAtletica + bonusPartitella) * 0.05;
      const votoFinale = isNaN(voto)
        ? null
        : parseFloat((voto * (1 + bonusPercent)).toFixed(2));

      if (nome === "Squadra" || (presenzaInput && presenzaInput.checked)) {
        allenamento.giocatori[nome] = {
          voto: isNaN(voto) ? null : voto,
          bonusAtletica,
          bonusPartitella,
          votoFinale,
          commento: commentoInput?.value || "",
        };
      }
    });

    if (Object.keys(allenamento.giocatori).length === 0) {
      document.getElementById("messaggio").textContent =
        "Nessun giocatore presente: non salvato.";
      return;
    }

    try {
      await firebaseDB.ref("allenamenti").push(allenamento);
      document.getElementById("messaggio").textContent = "Dati salvati!";
      document.getElementById("allenamentoForm").reset();

      // Resetta tutti i toggle al centro (stato 0)
      document.querySelectorAll(".toggle-3").forEach((toggle) => {
        toggle.dataset.state = "0";
        toggle.style.backgroundColor = "#ccc";
      });
    } catch (err) {
      console.error("Errore nel salvataggio:", err);
      document.getElementById("messaggio").textContent =
        "Errore nel salvataggio.";
    }
  });
