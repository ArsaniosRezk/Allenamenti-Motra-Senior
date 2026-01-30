// allenamenti_spa.js
import { giocatori as listaGiocatori } from "./giocatori.js";
import { mostraAvviso, ID_SQUADRA } from "./utils.js";

const firebaseDB = window.firebaseDB;
const giocatoriListDiv = document.getElementById("lista-giocatori");
const form = document.getElementById("allenamentoForm");

// Unified Card for Allenamento - Refined
function creaPlayerCardAllenamento(nome, index) {
    // Full name used ("mettili completi")
    return `
    <div class="pc-card" id="card-all-${index}">
        <div class="pc-header">
            <span class="pc-name">${nome}</span>
            <!-- Modern Present Toggle -->
             <div style="display:flex; align-items:center;">
                <span class="pc-switch-label">Presente</span>
                <label class="pc-switch">
                    <input type="checkbox" class="cb-presente" data-index="${index}" checked>
                    <span class="pc-slider-switch"></span>
                </label>
            </div>
        </div>

        <div class="pc-body" id="body-all-${index}">
            <!-- Voto Slider Row -->
            <div class="pc-vote-row">
                <div class="pc-vote-header">
                    <span class="pc-vote-label">Voto</span>
                    <span id="valore-all-${index}" class="pc-vote-value">1.00</span>
                </div>
                <div class="pc-slider-wrapper">
                    <input type="range" 
                           class="input-voto-slider pc-slider input-all" 
                           min="1" max="10" step="0.25" 
                           value="1" 
                           data-index="${index}">
                </div>
            </div>

            <!-- Extras (Bonus Toggles) -->
            <div class="pc-extras-row">
                ${creaToggle("Atletica", index, "bonusAtletica")}
                ${creaToggle("Partitella", index, "bonusPartitella")}
            </div>
        </div>

        <div class="pc-footer" id="footer-all-${index}">
            <textarea placeholder="Commento..." 
                      name="commento"
                      data-index="${index}" 
                      class="input-commento pc-comment-input commento-area"></textarea>
        </div>
    </div>
    `;
}

// Global delegated listeners for allenamenti
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-all')) {
        const index = e.target.dataset.index;
        const val = parseFloat(e.target.value).toFixed(2);
        const span = document.getElementById(`valore-all-${index}`);
        if (span) span.textContent = val;
    }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('cb-presente')) {
        const index = e.target.dataset.index;
        const card = document.getElementById(`card-all-${index}`);
        const body = document.getElementById(`body-all-${index}`);
        const footer = document.getElementById(`footer-all-${index}`);

        if (e.target.checked) {
            body.style.display = "flex";
            footer.style.display = "block";
            card.classList.remove('disabled');
        } else {
            body.style.display = "none";
            footer.style.display = "none";
            card.classList.add('disabled');
        }
    }
});


// Funzione: crea un toggle 3 stati
// Keep logic but ensure style matches context if needed (handled by CSS scale)
function creaToggle(label, index, type) {
    return `
  <div style="display: flex; gap: 8px; align-items: center;">
    <label style="font-size: 0.75rem; font-weight:bold; color:var(--testo-muted);">${label}</label>
    <div class="toggle-3" data-state="0" data-index="${index}" data-type="${type}" aria-label="${label} Bonus">
      <div class="dot"></div>
      <div class="etichetta-toggle">0%</div>
    </div>
  </div>`;
}

function initAllenamenti() {
    if (!giocatoriListDiv) return;
    giocatoriListDiv.innerHTML = "";

    // Crea dinamicamente la lista dei giocatori
    listaGiocatori.forEach((nome, index) => {
        const div = document.createElement("div");
        div.innerHTML = creaPlayerCardAllenamento(nome, index);
        giocatoriListDiv.appendChild(div.firstElementChild);
    });

    // Re-attach toggle listeners
    document.querySelectorAll(".toggle-3").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            let current = parseInt(toggle.dataset.state);
            const next = current === 1 ? -1 : current + 1;
            toggle.dataset.state = next.toString();
            aggiornaToggleVisual(toggle);
        });
        aggiornaToggleVisual(toggle);
    });
}

// Gestione toggle 3 stati con feedback visivo
function aggiornaToggleVisual(toggle) {
    const stato = parseInt(toggle.dataset.state);
    const etichetta = toggle.querySelector(".etichetta-toggle");

    toggle.classList.remove("negativo", "neutro", "positivo");

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

// Submit del form
// Variabile globale per tracciare se stiamo modificando un allenamento esistente
let allenamentoEsistenteId = null;

async function caricaAllenamento(dataSelezionata) {
    if (!dataSelezionata) return;

    // Reset form to clean state first (default values)
    // But keep the date!
    const savedDate = dataSelezionata;

    // Reset visuals default
    document.querySelectorAll(".cb-presente").forEach(cb => {
        cb.checked = true;
        const index = cb.dataset.index;
        const body = document.getElementById(`body-all-${index}`);
        const footer = document.getElementById(`footer-all-${index}`);
        const card = document.getElementById(`card-all-${index}`);
        if (body) body.style.display = "flex";
        if (footer) footer.style.display = "block";
        if (card) card.classList.remove('disabled');
    });
    document.querySelectorAll(".input-all").forEach(sl => {
        sl.value = 1;
        const index = sl.dataset.index;
        const span = document.getElementById(`valore-all-${index}`);
        if (span) span.textContent = "1.00";
    });
    document.querySelectorAll(".toggle-3").forEach((toggle) => {
        toggle.dataset.state = "0";
        aggiornaToggleVisual(toggle);
    });
    document.querySelectorAll("textarea[name='commento']").forEach(tx => tx.value = "");

    // Query Firebase
    try {
        const snap = await firebaseDB.ref(`${ID_SQUADRA}/allenamenti`).once("value");
        const allenamenti = snap.val();
        if (!allenamenti) return;

        let allenamentoTrovato = null;
        let idTrovato = null;

        // Search by date (filtering client-side as structure is push-id based)
        for (const [id, dati] of Object.entries(allenamenti)) {
            if (dati.data === savedDate) {
                allenamentoTrovato = dati;
                idTrovato = id;
                break;
            }
        }

        if (allenamentoTrovato) {
            allenamentoEsistenteId = idTrovato;
            mostraAvviso("Allenamento esistente caricato!", "success");

            // Populate Form
            const giocatoriDati = allenamentoTrovato.giocatori || {};

            listaGiocatori.forEach((nome, index) => {
                const datiGiocatore = giocatoriDati[nome];

                const card = document.getElementById(`card-all-${index}`);
                const presenceCb = document.querySelector(`.cb-presente[data-index="${index}"]`);
                const slider = document.querySelector(`.input-all[data-index="${index}"]`);
                const commentoInput = document.querySelector(`textarea[name="commento"][data-index="${index}"]`);
                const toggleAtletica = document.querySelector(`.toggle-3[data-index="${index}"][data-type="bonusAtletica"]`);
                const togglePartitella = document.querySelector(`.toggle-3[data-index="${index}"][data-type="bonusPartitella"]`);
                const spanValore = document.getElementById(`valore-all-${index}`);

                if (datiGiocatore) {
                    // Presente
                    if (presenceCb) {
                        presenceCb.checked = true;
                        // Force UI Update directly
                        const body = document.getElementById(`body-all-${index}`);
                        const footer = document.getElementById(`footer-all-${index}`);
                        if (body) body.style.display = "flex";
                        if (footer) footer.style.display = "block";
                        if (card) card.classList.remove('disabled');
                    }

                    // Voto
                    if (slider) {
                        slider.value = datiGiocatore.voto;
                        if (spanValore) spanValore.textContent = Number(datiGiocatore.voto).toFixed(2);
                    }

                    // Toggles
                    if (toggleAtletica) {
                        toggleAtletica.dataset.state = (datiGiocatore.bonusAtletica || 0).toString();
                        aggiornaToggleVisual(toggleAtletica);
                    }
                    if (togglePartitella) {
                        togglePartitella.dataset.state = (datiGiocatore.bonusPartitella || 0).toString();
                        aggiornaToggleVisual(togglePartitella);
                    }

                    // Commento
                    if (commentoInput) commentoInput.value = datiGiocatore.commento || "";

                } else {
                    // Assente in this record -> unchecked
                    if (presenceCb) {
                        presenceCb.checked = false;
                        // Force UI Update directly
                        const body = document.getElementById(`body-all-${index}`);
                        const footer = document.getElementById(`footer-all-${index}`);
                        if (body) body.style.display = "none";
                        if (footer) footer.style.display = "none";
                        if (card) card.classList.add('disabled');
                    }
                }
            });

        } else {
            allenamentoEsistenteId = null; // New entry
            // mostraAvviso("Nessun allenamento trovato per questa data.", "success");
        }
    } catch (e) {
        console.error("Errore caricamento allenamento", e);
    }
}


if (form) {
    // Add Listener for Date Change
    const dataInput = document.getElementById("dataAllenamento");
    if (dataInput) {
        dataInput.addEventListener("change", (e) => {
            caricaAllenamento(e.target.value);
        });
    }

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

        let hasVotes = false;

        listaGiocatori.forEach((nome, index) => {
            // Check presence
            const presenceCb = document.querySelector(`.cb-presente[data-index="${index}"]`);
            if (!presenceCb || !presenceCb.checked) return; // Skip absent players

            const slider = document.querySelector(
                `.input-all[data-index="${index}"]`
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

            const voto = parseFloat(slider?.value);
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
                hasVotes = true;
                allenamento.giocatori[nome] = {
                    voto,
                    bonusAtletica,
                    bonusPartitella,
                    votoFinale,
                    commento: commentoInput?.value || "",
                };
            }
        });

        if (!hasVotes) {
            mostraAvviso("Nessun giocatore ha un voto (o segnato presente)", "error");
            return;
        }

        try {
            if (allenamentoEsistenteId) {
                // UPDATE existing
                await firebaseDB.ref(`${ID_SQUADRA}/allenamenti/${allenamentoEsistenteId}`).update(allenamento);
                mostraAvviso("Allenamento aggiornato!", "success");
            } else {
                // CREATE new
                await firebaseDB.ref(`${ID_SQUADRA}/allenamenti`).push(allenamento);
                mostraAvviso("Allenamento salvato", "success");
            }

            // Refresh global data
            document.dispatchEvent(new Event("data-update"));

            // Reset (optional, or keep data visible? Usually reset for next input)
            // If we reset, we lose the context of what we just edited.
            // But traditionally forms reset. User can always reload date to see it again.
            // Let's reset but maybe clear the date? Or keep date?
            // Resetting form clears date too usually.
            form.reset();
            allenamentoEsistenteId = null;

            // Reset visual state
            document.querySelectorAll(".cb-presente").forEach(cb => {
                cb.checked = true;
                const index = cb.dataset.index;
                const body = document.getElementById(`body-all-${index}`);
                const footer = document.getElementById(`footer-all-${index}`);
                const card = document.getElementById(`card-all-${index}`);
                if (body) body.style.display = "flex";
                if (footer) footer.style.display = "block";
                if (card) card.classList.remove('disabled');
            });
            document.querySelectorAll(".input-all").forEach(sl => {
                sl.value = 1;
                const index = sl.dataset.index;
                const span = document.getElementById(`valore-all-${index}`);
                if (span) span.textContent = "1.00";
            });

            document.querySelectorAll(".toggle-3").forEach((toggle) => {
                toggle.dataset.state = "0";
                aggiornaToggleVisual(toggle);
            });

            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            console.error("Errore nel salvataggio:", err);
            mostraAvviso("Errore nel salvataggio", "error");
        }
    });
}

initAllenamenti();
