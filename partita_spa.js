// partita_spa.js
import { giocatori, abbreviaNomeFormazione } from "./giocatori.js";
import { mostraAvviso, ID_SQUADRA, condividiImmagine } from "./utils.js";

const firebaseDB = window.firebaseDB;

const divCampo = document.getElementById("campo");
const selectModulo = document.getElementById("moduloFormazione");
const dataInput = document.getElementById("dataPartita");
const votiContainer = document.getElementById("votiContainer");
const salvaFormazioneBtn = document.getElementById("salvaFormazione");
const salvaPagellaBtn = document.getElementById("salvaPagella");

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
    if (!selectModulo) return [];
    const modulo = selectModulo.value;
    const config = moduli[modulo];
    const idsTitolari = [];
    config.forEach((riga) => {
        riga.forEach((slot) => idsTitolari.push(slot.id));
    });
    const idsPanchina = [];
    for (let i = 1; i <= 10; i++) idsPanchina.push(`p${i}`);
    return [...idsTitolari, ...idsPanchina];
}

function renderCampo() {
    if (!divCampo) return;
    const modulo = selectModulo.value;
    const config = moduli[modulo];

    const valoriAttuali = {};
    const inputs = divCampo.querySelectorAll("select");
    inputs.forEach(el => valoriAttuali[el.id] = el.value);

    divCampo.innerHTML = "";

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

    // Injected Action Buttons
    const btnShare = document.createElement("button");
    btnShare.className = "campo-action-btn btn-pos-left";
    btnShare.innerHTML = '<i class="fas fa-share-nodes"></i>';
    btnShare.id = "actionShare"; // For delegation or selection
    divCampo.appendChild(btnShare);

    const btnSave = document.createElement("button");
    btnSave.className = "campo-action-btn btn-pos-right";
    btnSave.innerHTML = '<i class="fas fa-save"></i>';
    btnSave.id = "actionSave";
    divCampo.appendChild(btnSave);

    popolaSelect();
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
    const modulo = selectModulo.value;
    const numTitolari = moduli[modulo].flat().length;

    const titolari = [];
    const panchina = [];

    for (let i = 0; i < numTitolari; i++) {
        const el = document.getElementById(ids[i]);
        if (el && el.value) titolari.push(el.value);
    }

    for (let i = numTitolari; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el && el.value) panchina.push(el.value);
    }

    return { titolari, panchina };
}

// Unified Card for Partita
function creaPlayerCardPartita(nome, datiVoto = {}) {
    const isSquadra = nome === "Squadra";
    const voto = datiVoto.voto || 1; // Default "parta da 1"
    const isSV = datiVoto.voto === "S.V.";
    let minuti = datiVoto.minuti;

    if (minuti === undefined || minuti === null || minuti === "" || minuti < 1) {
        minuti = 1;
    }
    if (minuti > 50) minuti = 50;

    const commento = datiVoto.commento || "";
    // Full Name
    const displayNome = isSquadra ? "SQUADRA" : nome;
    const safeNome = nome.replace(/\s+/g, '_');
    const displayVoto = isSV ? "S.V." : Number(voto).toFixed(2);

    // Status Toggle
    let boxStatus = "";
    if (!isSquadra) {
        boxStatus = `
        <div style="display:flex; align-items:center;">
            <span class="pc-switch-label">S.V.</span>
            <label class="pc-switch">
                <input type="checkbox" class="cb-sv" data-nome="${nome}" ${isSV ? "checked" : ""}>
                <span class="pc-slider-switch"></span>
            </label>
        </div>`;
    }

    // Minuti Slider
    let boxMinuti = "";
    if (!isSquadra) {
        boxMinuti = `
        <div class="pc-vote-row" style="margin-top:4px;">
            <div class="pc-vote-header">
                <span class="pc-vote-label">Minuti</span>
                <span id="valore-min-${safeNome}" class="pc-vote-value" style="color:#f59e0b; font-size:1rem;">${minuti}'</span>
            </div>
            <div class="pc-slider-wrapper">
                <input type="range" 
                       class="input-minuti-slider pc-slider" 
                       min="1" max="50" step="1" 
                       value="${minuti}" 
                       data-nome="${nome}"
                       ${isSV ? "disabled" : ""}>
            </div>
        </div>`;
    }

    // Collapsing logic
    const contentDisplay = isSV ? 'style="display:none;"' : '';

    return `
    <div class="pc-card ${isSV ? 'disabled' : ''}" id="card-${safeNome}">
        <div class="pc-header">
            <span class="pc-name">${displayNome}</span>
            ${boxStatus}
        </div>

        <div class="pc-body" id="body-${safeNome}" ${contentDisplay}>
            <!-- Voto Slider Row -->
            <div class="pc-vote-row">
                <div class="pc-vote-header">
                    <span class="pc-vote-label">Voto</span>
                    <span id="valore-${safeNome}" class="pc-vote-value">${displayVoto}</span>
                </div>
                <div class="pc-slider-wrapper">
                    <input type="range" 
                           class="input-voto-slider pc-slider" 
                           min="1" max="10" step="0.25" 
                           value="${isSV ? 1 : voto}" 
                           data-nome="${nome}"
                           ${isSV ? "disabled" : ""}>
                </div>
            </div>

            ${boxMinuti}
        </div>

        <div class="pc-footer" id="footer-${safeNome}" ${contentDisplay}>
            <textarea placeholder="Commento..." 
                      data-nome="${nome}" 
                      class="input-commento pc-comment-input">${commento}</textarea>
        </div>
    </div>
    `;
}

// Global delegated listeners for Partite
document.addEventListener('input', (e) => {
    // Voto Slider
    if (e.target.classList.contains('input-voto-slider') && !e.target.classList.contains('input-all')) {
        const val = parseFloat(e.target.value).toFixed(2);
        const nome = e.target.dataset.nome;
        const safeNome = nome.replace(/\s+/g, '_');
        const span = document.getElementById(`valore-${safeNome}`);
        if (span) span.textContent = val;
    }
    // Minuti Slider
    if (e.target.classList.contains('input-minuti-slider')) {
        const val = e.target.value;
        const nome = e.target.dataset.nome;
        const safeNome = nome.replace(/\s+/g, '_');
        const span = document.getElementById(`valore-min-${safeNome}`);
        if (span) span.textContent = val + "'";
    }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('cb-sv')) {
        const isChecked = e.target.checked;
        const nome = e.target.dataset.nome;
        const safeNome = nome.replace(/\s+/g, '_');

        const card = document.getElementById(`card-${safeNome}`);
        const inputs = card.querySelectorAll('input, textarea'); // Select all inputs in this card

        if (isChecked) {
            // S.V. On -> Disable & Collapse
            inputs.forEach(input => {
                if (!input.classList.contains('cb-sv')) input.disabled = true;
            });
            card.querySelector('.pc-body').style.display = 'none';
            card.querySelector('.pc-footer').style.display = 'none';
            card.classList.add('disabled');
        } else {
            // S.V. Off -> Enable & Expand
            inputs.forEach(input => {
                input.disabled = false;
            });
            card.querySelector('.pc-body').style.display = ''; // Revert to CSS (flex)
            card.querySelector('.pc-footer').style.display = 'block';
            card.classList.remove('disabled');
        }
        const sliderVoto = card.querySelector('.input-voto-slider');
        const spanVoto = document.getElementById(`valore-${safeNome}`);
        if (spanVoto && sliderVoto) spanVoto.textContent = parseFloat(sliderVoto.value).toFixed(2);
    }
});

function mostraCampiVoto(titolari = [], panchina = [], voti = {}) {
    votiContainer.innerHTML = "";

    // Squadra Card
    const datiSquadra = voti["Squadra"] || {};
    const divSquadra = document.createElement("div");
    divSquadra.innerHTML = creaPlayerCardPartita("Squadra", datiSquadra);
    votiContainer.appendChild(divSquadra.firstElementChild);

    // Players
    const tutti = [...new Set([...titolari, ...panchina])];

    tutti.forEach((nome) => {
        const div = document.createElement("div");
        div.innerHTML = creaPlayerCardPartita(nome, voti[nome]);
        votiContainer.appendChild(div.firstElementChild);
    });
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
    div.appendChild(table);
    div.appendChild(table);

    // Fix: Insert before #votiContainer since buttons are now absolute or removed
    if (votiContainer) {
        votiContainer.parentNode.insertBefore(div, votiContainer);
    } else {
        // Fallback: append to #page-partita if possible, or after panchina
        const panchina = document.getElementById("div-panchina");
        if (panchina) panchina.parentNode.appendChild(div);
    }
}

async function calcolaStatistichePartite() {
    const snap = await firebaseDB.ref(`${ID_SQUADRA}/partite`).once("value");
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

async function caricaFormazione(data) {
    const snap = await firebaseDB.ref(`${ID_SQUADRA}/partite/${data}`).once("value");
    const partita = snap.val();

    const titolari = partita?.titolari || [];
    const panchina = partita?.panchina || [];
    const moduloSalvato = partita?.modulo || "3-2-1";

    if (selectModulo) selectModulo.value = moduloSalvato;
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

    // Check if match exists and has players
    if (partita && partita.titolari && partita.titolari.length > 0) {
        mostraCampiVoto(titolari, panchina, partita?.giocatori || {});
    } else {
        // If no match data, ensure votes are cleared (and Squadra box removed)
        const container = document.getElementById("votiContainer");
        if (container) container.innerHTML = "";
    }

    // Update button state (Formation vs Pagella)
    if (typeof aggiornaStatoBottone === 'function') aggiornaStatoBottone();
    aggiornaOpzioniSelect();
}

async function salvaFormazione() {
    const data = dataInput.value;
    if (!data) return mostraAvviso("Inserisci una data", "error");
    const { titolari, panchina } = getFormazioneCorrente();
    const modulo = selectModulo.value;

    await firebaseDB.ref(`${ID_SQUADRA}/partite/${data}`).update({
        data,
        timestamp: new Date().toISOString(),
        tipo: "partita",
        modulo,
        titolari,
        panchina,
    });
    mostraCampiVoto(titolari, panchina);
    mostraAvviso("Formazione salvata");
    document.dispatchEvent(new Event("data-update"));
}

async function salvaPagella() {
    const data = dataInput.value;
    if (!data) return mostraAvviso("Inserisci una data", "error");
    const voti = {};
    let errore = false;

    document.querySelectorAll(".pc-card").forEach((card) => {
        const sliderVoto = card.querySelector('.input-voto-slider');
        if (!sliderVoto) return;

        const nome = sliderVoto.dataset.nome;
        const cbSV = card.querySelector('.cb-sv');
        const sliderMinuti = card.querySelector('.input-minuti-slider');
        const commentoInput = card.querySelector('.input-commento');

        // Logic VOTO
        if (cbSV && cbSV.checked) {
            voti[nome] = { voto: "S.V.", votoFinale: "S.V." };
        } else {
            const votoVal = parseFloat(sliderVoto.value);
            voti[nome] = { voto: votoVal, votoFinale: votoVal };
        }

        // Logic COMMENTO
        if (commentoInput) {
            if (!voti[nome]) voti[nome] = {};
            voti[nome].commento = commentoInput.value;
        }

        // Logic MINUTI (exclude squadra)
        if (nome !== "Squadra" && sliderMinuti) {
            const minuti = parseInt(sliderMinuti.value);
            const haMinuti = !isNaN(minuti);

            if (!voti[nome]) voti[nome] = {};
            voti[nome].minuti = minuti;
        }
    });

    if (errore) return;

    await firebaseDB.ref(`${ID_SQUADRA}/partite/${data}/giocatori`).set(voti);
    mostraAvviso("Partita salvata");
    document.dispatchEvent(new Event("data-update"));
}

// Delegated listener for Campo Actions (Share & Save)
if (divCampo) {
    divCampo.addEventListener("click", (e) => {
        const btnShare = e.target.closest("#actionShare");
        const btnSave = e.target.closest("#actionSave");

        if (btnSave) {
            salvaFormazione();
        } else if (btnShare) {
            const campo = document.getElementById("campo");
            campo.classList.add("screenshot-mode");

            // 1. Swap selects with text DIVs for perfect rendering
            const selects = campo.querySelectorAll("select");
            const restoreList = [];

            selects.forEach(sel => {
                const div = document.createElement("div");
                div.className = "screenshot-replacement";
                // Get selected text or placeholder
                const text = sel.options[sel.selectedIndex]?.text || "-";
                div.textContent = text;

                // Insert div, hide select
                sel.parentNode.insertBefore(div, sel);
                sel.style.display = "none";
                restoreList.push({ select: sel, div: div });
            });

            html2canvas(campo, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true
            }).then((canvas) => {
                campo.classList.remove("screenshot-mode");

                // 2. Restore selects
                restoreList.forEach(item => {
                    item.div.remove();
                    item.select.style.display = "";
                });

                canvas.toBlob((blob) => {
                    condividiImmagine(blob, `formazione_${new Date().toISOString().slice(0, 10)}.png`);
                });
            });
        }
    });
}

// if (salvaFormazioneBtn) salvaFormazioneBtn.addEventListener("click", salvaFormazione); // Removed
if (salvaPagellaBtn) salvaPagellaBtn.addEventListener("click", salvaPagella);
if (salvaPagellaBtn) salvaPagellaBtn.addEventListener("click", salvaPagella);
if (dataInput) {
    dataInput.addEventListener("change", () => {
        if (dataInput.value) caricaFormazione(dataInput.value);
    });
    dataInput.addEventListener("input", () => {
        if (dataInput.value && dataInput.value.length === 10) {
            caricaFormazione(dataInput.value);
        }
    });
}
if (selectModulo) {
    selectModulo.addEventListener("change", () => {
        renderCampo();
        mostraAvviso("Modulo cambiato. Rischiera i giocatori!", "warning");
    });
}


// Logic for Dual-Purpose Button
function aggiornaStatoBottone() {
    const btn = document.getElementById("salvaPagella");
    const txt = document.getElementById("salvaPagellaText");
    const container = document.getElementById("votiContainer");

    if (!btn || !txt || !container) return;

    if (container.children.length === 0) {
        // Mode: Save Formation
        txt.textContent = "Salva Formazione";
        // btn.onclick = salvaFormazione; // Better to handle in the listener
    } else {
        // Mode: Save Votes
        txt.textContent = "Salva Pagella";
    }
}

// Global listener with logic switch
if (salvaPagellaBtn) {
    // Remove old listeners if any (by replacing node or just ensure correct logic)
    // Since we are using modules, we can just overwrite the logic if we use a specific function
    salvaPagellaBtn.onclick = async (e) => {
        e.preventDefault();
        const container = document.getElementById("votiContainer");
        if (container && container.children.length === 0) {
            await salvaFormazione(); // This triggers mostraCampiVoto -> content appears
            aggiornaStatoBottone(); // switch state
        } else {
            await salvaPagella();
        }
    };
}

// Hook into state changes
const observerVoti = new MutationObserver(aggiornaStatoBottone);
if (votiContainer) {
    observerVoti.observe(votiContainer, { childList: true });
}

// Initial Logic wrapped in listener
function initPartitaPage() {
    renderCampo(); // Will use loaded `giocatori`
    calcolaStatistichePartite();
    popolaSelect(); // Will use loaded `giocatori`
    aggiornaStatoBottone();
}

// Wait for global data ready event
document.addEventListener("dati-pronti", () => {
    console.log("Partita SPA: Dati pronti ricevuti. Inizializzazione pagina.");
    initPartitaPage();
});

// Also run if data is already loaded (race condition safety)
// Checking if list is populated might be weak if database is empty.
// Better to rely on index.js dispatching.
// OR check current export.
// Since modules run once, if index.js runs first and dispatches before we listen?
// index.js imports partita_spa.js (likely NOT, they are separate scripts in HTML usually? No, index.html doesn't import them).
// index.html likely imports main.js which imports everything? or separate script tags?
// Checked index.html: No script tags shown in snippet.
// Based on project structure, if using modules, usually there is an entry point.
// If imported as modules, execution order is DFS.
// If index.js is the entry, it imports SPAs?
// If they are side-effect imports `import './partita_spa.js'`, they run immediately.
// Then index.js runs.
// So listeners will be set BEFORE index.js calls `avviaApp`. Safe.
