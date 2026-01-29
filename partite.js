// formazione.js
import { giocatori, abbreviaNomeFormazione } from "./giocatori.js";
import { mostraAvviso } from "./utils.js";

const firebaseDB = window.firebaseDB;
const divCampo = document.getElementById("campo");
const selectModulo = document.getElementById("moduloFormazione");
const dataInput = document.getElementById("dataPartita");
const votiContainer = document.getElementById("votiContainer");

// Conf dei moduli: definisce le righe (dall'alto "ATT" al basso "POR")
// Ogni riga è un array di oggetti { id, label }
const moduli = {
  "3-2-1": [
    [{ id: "att", label: "PC" }],
    [
      { id: "cen1", label: "CC" },
      { id: "cen2", label: "CC" },
    ],
    [
      { id: "dif3", label: "TS" },
      { id: "dif2", label: "DC" },
      { id: "dif1", label: "TD" },
    ],
    [{ id: "portiere", label: "POR" }],
  ],
  "2-3-1": [
    [{ id: "att", label: "PC" }],
    [
      { id: "cen3", label: "CS" },
      { id: "cen2", label: "CC" },
      { id: "cen1", label: "CD" },
    ],
    [
      { id: "dif2", label: "DS" },
      { id: "dif1", label: "DD" },
    ],
    [{ id: "portiere", label: "POR" }],
  ],
};

function getIdsCorrenti() {
  const modulo = selectModulo.value;
  const config = moduli[modulo];
  const idsTitolari = [];
  config.forEach((riga) => {
    riga.forEach((slot) => idsTitolari.push(slot.id));
  });
  // Aggiungi panchina (sempre statici 1-10)
  const idsPanchina = [];
  for (let i = 1; i <= 10; i++) idsPanchina.push(`p${i}`);

  return [...idsTitolari, ...idsPanchina];
}

// Renderizza il campo in base al modulo
function renderCampo() {
  const modulo = selectModulo.value;
  const config = moduli[modulo];

  // Salva i valori attuali delle select se esistono, per non perderli durante switch (se possibile)
  const valoriAttuali = {};
  const inputs = divCampo.querySelectorAll("select");
  inputs.forEach(el => valoriAttuali[el.id] = el.value);

  divCampo.innerHTML = ""; // Clear

  config.forEach((riga) => {
    const divRiga = document.createElement("div");
    divRiga.className = "linea";
    riga.forEach((slot) => {
      const divPos = document.createElement("div");
      divPos.className = "posizione";

      const select = document.createElement("select");
      select.id = slot.id;
      if (valoriAttuali[slot.id]) select.value = valoriAttuali[slot.id];

      const label = document.createElement("label");
      label.textContent = slot.label;

      divPos.appendChild(select);
      divPos.appendChild(label);
      divRiga.appendChild(divPos);
    });
    divCampo.appendChild(divRiga);
  });

  popolaSelect(); // Ripopola le option delle nuove select create
}

function aggiornaOpzioniSelect() {
  const ids = getIdsCorrenti();
  const selezionati = new Set();
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.value) selezionati.add(el.value);
  });

  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    const valoreCorrente = select.value;
    select.innerHTML = "";

    const opzioneVuota = document.createElement("option");
    opzioneVuota.value = "";
    opzioneVuota.textContent = "-";
    select.appendChild(opzioneVuota);

    giocatori.forEach((nome) => {
      if (!selezionati.has(nome) || nome === valoreCorrente) {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = abbreviaNomeFormazione(nome);
        if (nome === valoreCorrente) opt.selected = true;
        select.appendChild(opt);
      }
    });
  });
}

function popolaSelect() {
  const ids = getIdsCorrenti();
  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.removeEventListener("change", aggiornaOpzioniSelect);
      select.addEventListener("change", aggiornaOpzioniSelect);
    }
  });
  aggiornaOpzioniSelect();
}

function getFormazioneCorrente() {
  const ids = getIdsCorrenti();
  // Troviamo il "punto di stacco" tra titolari e panchina.
  // I titolari sono definiti nel modulo.
  const modulo = selectModulo.value;
  const numTitolari = moduli[modulo].flat().length;

  // Slice safe check
  const titolari = [];
  const panchina = [];

  // Titolari
  for (let i = 0; i < numTitolari; i++) {
    const el = document.getElementById(ids[i]);
    if (el && el.value) titolari.push(el.value);
  }

  // Panchina
  for (let i = numTitolari; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (el && el.value) panchina.push(el.value);
  }

  return { titolari, panchina };
}

function creaSelectVoto(nome, valorePreselezionato = "") {
  let options = '<option value="">-</option>';
  options += `<option value="S.V." ${valorePreselezionato === "S.V." ? "selected" : ""
    }>S.V.</option>`;
  for (let v = 1.0; v <= 10.0; v += 0.25) {
    const voto = Number(v.toFixed(2)).toString();
    const selected = String(valorePreselezionato) === voto ? "selected" : "";
    options += `<option value="${voto}" ${selected}>${voto}</option>`;
  }
  return `<label>Voto</label><select data-nome="${nome}" class="input-voto" style="width: 80px;">${options}</select>`;
}

function creaInputMinuti(nome, valorePreselezionato = "") {
  return `<label>Min</label><input type="number" step="1" min="0" max="120" placeholder="Minuti" value="${valorePreselezionato}" data-nome="${nome}" class="input-minuti" style="width: 80px;" />`;
}

function mostraStatistichePartite(stats) {
  const div = document.createElement("div");
  div.className = "statistiche-container";

  const table = document.createElement("table");
  table.className = "statistiche-tabella";

  const righe = Math.ceil(giocatori.length / 2);
  for (let i = 0; i < righe; i++) {
    const tr = document.createElement("tr");

    [i, i + righe].forEach((index) => {
      const nome = giocatori[index];
      if (!nome) {
        tr.appendChild(document.createElement("td"));
        tr.appendChild(document.createElement("td"));
        return;
      }
      const abbrev = abbreviaNomeFormazione(nome);
      const dati = stats[nome] || { titolare: 0, minuti: 0 };
      const tdNome = document.createElement("td");
      tdNome.className = "stat-nome";
      tdNome.textContent = abbrev;
      const tdStat = document.createElement("td");
      tdStat.className = "stat-valori";
      tdStat.textContent = `Tit: ${dati.titolare} - Min: ${dati.minuti}`;

      tr.appendChild(tdNome);
      tr.appendChild(tdStat);
    });

    table.appendChild(tr);
  }

  const existing = document.querySelector(".statistiche-container");
  if (existing) existing.remove();

  div.appendChild(table);
  const target = document.getElementById("salvaFormazione");
  target.parentNode.insertBefore(div, target);
}

async function calcolaStatistichePartite() {
  const snap = await firebaseDB.ref("partite").once("value");
  const partite = snap.val();
  const stats = {};

  Object.values(partite || {}).forEach((partita) => {
    if (!partita.giocatori) return;

    (partita.titolari || []).forEach((nome) => {
      if (!stats[nome]) stats[nome] = { titolare: 0, minuti: 0 };
      stats[nome].titolare++;
    });

    Object.entries(partita.giocatori).forEach(([nome, dati]) => {
      const key = nome;
      if (!stats[key]) stats[key] = { titolare: 0, minuti: 0 };
      if (!isNaN(dati.minuti)) stats[key].minuti += dati.minuti;
    });
  });

  mostraStatistichePartite(stats);
}

function mostraCampiVoto(titolari = [], panchina = [], voti = {}) {
  const tutti = [...new Set([...titolari, ...panchina])];
  votiContainer.innerHTML = "";

  const squadraBox = document.createElement("div");
  squadraBox.className = "giocatore-box";
  squadraBox.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
      <span style="width: 90px; text-align: left; font-weight: bold;">Squadra</span>
      ${creaSelectVoto("Squadra", voti["Squadra"]?.voto)}
    </div>
    <textarea placeholder="Osservazioni alla squadra" data-nome="squadra" class="input-commento">${voti["Squadra"]?.commento || ""
    }</textarea>
  `;
  votiContainer.appendChild(squadraBox);

  giocatori.forEach((nome) => {
    if (!tutti.includes(nome)) return;
    const div = document.createElement("div");
    div.className = "giocatore-box";
    div.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
  <span style="width: 90px; text-align: left; font-weight: bold;">${abbreviaNomeFormazione(
      nome
    )}</span>
  ${creaSelectVoto(nome, voti[nome]?.voto)}
  ${creaInputMinuti(nome, voti[nome]?.minuti || "")}
</div>
      <textarea placeholder="Commento" data-nome="${nome}" class="input-commento">${voti[nome]?.commento || ""
      }</textarea>
    `;
    votiContainer.appendChild(div);
  });
}

async function caricaFormazione(data) {
  const snap = await firebaseDB.ref(`partite/${data}`).once("value");
  const partita = snap.val();

  const titolari = partita?.titolari || [];
  const panchina = partita?.panchina || [];
  const moduloSalvato = partita?.modulo || "3-2-1";

  selectModulo.value = moduloSalvato;
  renderCampo();

  const ids = getIdsCorrenti();
  const modulo = selectModulo.value;
  const numTitolari = moduli[modulo].flat().length;

  for (let i = 0; i < numTitolari; i++) {
    if (titolari[i] && ids[i]) {
      const el = document.getElementById(ids[i]);
      if (el) el.value = titolari[i];
    }
  }

  const idsPanchina = ids.slice(numTitolari);
  idsPanchina.forEach((id, i) => {
    if (panchina[i]) {
      const el = document.getElementById(id);
      if (el) el.value = panchina[i];
    }
  });

  mostraCampiVoto(titolari, panchina, partita?.giocatori || {});
  aggiornaOpzioniSelect();
}

async function salvaFormazione() {
  const data = dataInput.value;
  if (!data) return mostraAvviso("Inserisci una data", "error");
  const { titolari, panchina } = getFormazioneCorrente();
  const modulo = selectModulo.value;

  await firebaseDB.ref(`partite/${data}`).update({
    data,
    timestamp: new Date().toISOString(),
    tipo: "partita",
    modulo,
    titolari,
    panchina,
  });
  mostraCampiVoto(titolari, panchina);
  mostraAvviso("Formazione salvata");
}

async function salvaPagella() {
  const data = dataInput.value;
  if (!data) return mostraAvviso("Inserisci una data", "error");
  const voti = {};
  let errore = false;

  document.querySelectorAll(".input-voto").forEach((el) => {
    const nome = el.dataset.nome;
    const key = nome;
    const votoVal = el.value;
    if (votoVal === "S.V.") {
      voti[key] = { voto: "S.V.", votoFinale: "S.V." };
    } else {
      const voto = parseFloat(votoVal);
      if (!isNaN(voto)) {
        voti[key] = { voto, votoFinale: voto };
      }
    }
  });

  document.querySelectorAll(".input-minuti").forEach((el) => {
    const nome = el.dataset.nome;
    const key = nome === "squadra" ? "Squadra" : nome;
    const minuti = parseInt(el.value);
    const haVoto = voti[key] !== undefined;
    const haMinuti = !isNaN(minuti);

    if (nome !== "squadra") {
      if (haVoto && !haMinuti) {
        mostraAvviso(
          `Hai inserito un voto per ${nome} ma mancano i minuti`,
          "error"
        );
        errore = true;
      }
      if (!haVoto && haMinuti) {
        mostraAvviso(
          `Hai inserito i minuti per ${nome} ma manca il voto`,
          "error"
        );
        errore = true;
      }
    }

    if (haMinuti) {
      if (!voti[key]) voti[key] = {};
      voti[key].minuti = minuti;
    }
  });

  if (errore) return;

  document.querySelectorAll(".input-commento").forEach((el) => {
    const nome = el.dataset.nome;
    const key = nome === "squadra" ? "Squadra" : nome;
    const commento = el.value;
    if (!voti[key]) voti[key] = {};
    voti[key].commento = commento;
  });

  await firebaseDB.ref(`partite/${data}/giocatori`).set(voti);
  mostraAvviso("Partita salvata");
}

document
  .getElementById("salvaFormazione")
  .addEventListener("click", salvaFormazione);
document.getElementById("salvaPagella").addEventListener("click", salvaPagella);

dataInput.addEventListener("change", () => {
  if (dataInput.value) caricaFormazione(dataInput.value);
});

// Immediate trigger attempt for mobile (checking length)
dataInput.addEventListener("input", () => {
  if (dataInput.value && dataInput.value.length === 10) {
    caricaFormazione(dataInput.value);
  }
});

selectModulo.addEventListener("change", () => {
  renderCampo();
  mostraAvviso("Modulo cambiato. Risistema i giocatori!", "warning");
});

// Init
renderCampo();
calcolaStatistichePartite();
popolaSelect();
