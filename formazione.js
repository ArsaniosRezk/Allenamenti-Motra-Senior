// formazione.js
import { giocatori, abbreviaNomeFormazione } from "./giocatori.js";
import { mostraAvviso } from "./utils.js";

const firebaseDB = window.firebaseDB;

const ids = [
  "portiere",
  "dif1",
  "dif2",
  "dif3",
  "cen1",
  "cen2",
  "att",
  "p1",
  "p2",
  "p3",
  "p4",
  "p5",
  "p6",
  "p7",
  "p8",
  "p9",
  "p10",
];

const dataInput = document.getElementById("dataPartita");
const votiContainer = document.getElementById("votiContainer");

function aggiornaOpzioniSelect() {
  const selezionati = new Set();
  ids.forEach((id) => {
    const val = document.getElementById(id).value;
    if (val) selezionati.add(val);
  });

  ids.forEach((id) => {
    const select = document.getElementById(id);
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
  ids.forEach((id) => {
    const select = document.getElementById(id);
    select.addEventListener("change", aggiornaOpzioniSelect);
  });
  aggiornaOpzioniSelect();
}

function getFormazioneCorrente() {
  const titolari = ids
    .slice(0, 7)
    .map((id) => document.getElementById(id).value)
    .filter((v) => v);
  const panchina = ids
    .slice(7)
    .map((id) => document.getElementById(id).value)
    .filter((v) => v);
  return { titolari, panchina };
}

function creaSelectVoto(nome, valorePreselezionato = "") {
  let options = '<option value="">-</option>';
  for (let v = 1.0; v <= 10.0; v += 0.25) {
    const voto = v.toFixed(2).replace(".00", "");
    const selected = voto === String(valorePreselezionato) ? "selected" : "";
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

  div.appendChild(table);
  const target = document.getElementById("salvaFormazione");
  target.parentNode.insertBefore(div, target);
}

async function calcolaStatistichePartite() {
  const snap = await firebaseDB.ref("partite").once("value");
  const partite = snap.val();
  const stats = {};

  Object.values(partite || {}).forEach((partita) => {
    if (!partita.giocatori) return; // ⛔ Salta partite senza pagella

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

  // Box per la squadra
  const squadraBox = document.createElement("div");
  squadraBox.className = "giocatore-box";
  squadraBox.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between;">
      <span style="width: 90px; text-align: left; font-weight: bold;">Squadra</span>
      ${creaSelectVoto("Squadra", voti["Squadra"]?.voto)}
    </div>
    <textarea placeholder="Osservazioni alla squadra" data-nome="squadra" class="input-commento">${
      voti["Squadra"]?.commento || ""
    }</textarea>
  `;
  votiContainer.appendChild(squadraBox);

  // Box per ogni giocatore
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
      <textarea placeholder="Commento" data-nome="${nome}" class="input-commento">${
      voti[nome]?.commento || ""
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

  const mappaID = ["portiere", "dif1", "dif2", "dif3", "cen1", "cen2", "att"];
  mappaID.forEach((id, i) => {
    document.getElementById(id).value = titolari[i] || "";
  });
  ids.slice(7).forEach((id, i) => {
    document.getElementById(id).value = panchina[i] || "";
  });

  mostraCampiVoto(titolari, panchina, partita?.giocatori || {});
}

async function salvaFormazione() {
  const data = dataInput.value;
  if (!data) return mostraAvviso("Inserisci una data", "error");
  const { titolari, panchina } = getFormazioneCorrente();
  await firebaseDB.ref(`partite/${data}`).update({
    data,
    timestamp: new Date().toISOString(),
    tipo: "partita",
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
    const voto = parseFloat(el.value);
    if (!isNaN(voto)) {
      voti[key] = { voto, votoFinale: voto };
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

popolaSelect();
calcolaStatistichePartite();
