// allenamenti_spa.js - inserimento e modifica delle pagelle di allenamento
import { giocatori as listaGiocatori } from "./giocatori.js";
import { dataEvento } from "./statistiche.js";
import {
    mostraAvviso,
    escapeHtml,
    quandoDatiPronti,
    ID_SQUADRA
} from "./utils.js";

const giocatoriListDiv = document.getElementById("lista-giocatori");
const form = document.getElementById("allenamentoForm");
const dataInput = document.getElementById("dataAllenamento");

// Id del record aperto: se valorizzato si aggiorna, altrimenti se ne crea uno nuovo
let allenamentoEsistenteId = null;

/* Voto di partenza di ogni scheda. Era 1: salvando senza toccare gli
   slider si assegnava il minimo a tutta la rosa. */
const VOTO_DEFAULT = 6;

/* =========================================================
   RENDER
   ========================================================= */
function creaToggle(label, index, type) {
    return (
        '<div class="pc-toggle-box">' +
        '<label class="pc-toggle-label">' + label + "</label>" +
        '<div class="toggle-3" data-state="0" data-index="' + index +
        '" data-type="' + type + '" role="button" tabindex="0" aria-label="' + label + ' bonus">' +
        '<div class="dot"></div><div class="etichetta-toggle">0%</div>' +
        "</div></div>"
    );
}

function creaPlayerCardAllenamento(nome, index) {
    return (
        '<div class="pc-card" id="card-all-' + index + '">' +
        '<div class="pc-header">' +
        '<span class="pc-name">' + escapeHtml(nome) + "</span>" +
        '<div class="pc-switch-box">' +
        '<span class="pc-switch-label">Presente</span>' +
        '<label class="pc-switch">' +
        '<input type="checkbox" class="cb-presente" data-index="' + index + '" checked>' +
        '<span class="pc-slider-switch"></span>' +
        "</label></div></div>" +
        '<div class="pc-body" id="body-all-' + index + '">' +
        '<div class="pc-vote-row">' +
        '<div class="pc-vote-header">' +
        '<span class="pc-vote-label">Voto</span>' +
        '<span id="valore-all-' + index + '" class="pc-vote-value">' +
        VOTO_DEFAULT.toFixed(2) + "</span>" +
        "</div>" +
        '<div class="pc-slider-wrapper">' +
        '<input type="range" class="input-voto-slider pc-slider input-all" min="1" max="10" step="0.25" value="' +
        VOTO_DEFAULT + '" data-index="' + index + '">' +
        "</div></div>" +
        '<div class="pc-extras-row">' +
        creaToggle("Atletica", index, "bonusAtletica") +
        creaToggle("Partitella", index, "bonusPartitella") +
        "</div></div>" +
        '<div class="pc-footer" id="footer-all-' + index + '">' +
        '<textarea placeholder="Commento..." name="commento" data-index="' + index +
        '" class="input-commento pc-comment-input"></textarea>' +
        "</div></div>"
    );
}

function initAllenamenti() {
    if (!giocatoriListDiv) return;

    if (listaGiocatori.length === 0) {
        giocatoriListDiv.innerHTML =
            '<p class="lista-vuota">Nessun giocatore in rosa (' +
            escapeHtml(ID_SQUADRA) +
            "/rosa)</p>";
        return;
    }

    giocatoriListDiv.innerHTML = listaGiocatori
        .map((nome, index) => creaPlayerCardAllenamento(nome, index))
        .join("");

    document.querySelectorAll("#lista-giocatori .toggle-3").forEach(aggiornaToggleVisual);
}

/* =========================================================
   SLIDER DEL VOTO
   ---------------------------------------------------------
   Delegato, cosi' sopravvive al re-render della lista.
   Le schede allenamento indirizzano il numero per data-index
   (`valore-all-N`), quelle partita per nome: e' il motivo per cui
   l'handler in partita_spa.js scarta le slider con classe
   `input-all` e questo deve stare qui.
   ========================================================= */
document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("input-all")) return;
    const span = document.getElementById("valore-all-" + e.target.dataset.index);
    if (span) span.textContent = parseFloat(e.target.value).toFixed(2);
});

/* =========================================================
   TOGGLE A 3 STATI (-5% / 0% / +5%)
   ========================================================= */
function aggiornaToggleVisual(toggle) {
    const stato = parseInt(toggle.dataset.state, 10) || 0;
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

function ciclaToggle(toggle) {
    const corrente = parseInt(toggle.dataset.state, 10) || 0;
    toggle.dataset.state = String(corrente === 1 ? -1 : corrente + 1);
    aggiornaToggleVisual(toggle);
}

// Delegato: sopravvive al re-render della lista giocatori
document.addEventListener("click", (e) => {
    const toggle = e.target.closest("#lista-giocatori .toggle-3");
    if (toggle) ciclaToggle(toggle);
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const toggle = e.target.closest("#lista-giocatori .toggle-3");
    if (!toggle) return;
    e.preventDefault();
    ciclaToggle(toggle);
});

/* =========================================================
   STATO DELLE CARD
   ========================================================= */
function impostaPresenza(index, presente) {
    const card = document.getElementById("card-all-" + index);
    const body = document.getElementById("body-all-" + index);
    const footer = document.getElementById("footer-all-" + index);
    const cb = document.querySelector('.cb-presente[data-index="' + index + '"]');

    if (cb) cb.checked = presente;
    if (body) body.style.display = presente ? "flex" : "none";
    if (footer) footer.style.display = presente ? "block" : "none";
    if (card) card.classList.toggle("disabled", !presente);
}

function impostaVoto(index, voto) {
    const slider = document.querySelector('.input-all[data-index="' + index + '"]');
    const span = document.getElementById("valore-all-" + index);
    const valore = isNaN(parseFloat(voto)) ? VOTO_DEFAULT : parseFloat(voto);
    if (slider) slider.value = valore;
    if (span) span.textContent = valore.toFixed(2);
}

function impostaToggle(index, type, valore) {
    const toggle = document.querySelector(
        '.toggle-3[data-index="' + index + '"][data-type="' + type + '"]'
    );
    if (!toggle) return;
    toggle.dataset.state = String(parseInt(valore, 10) || 0);
    aggiornaToggleVisual(toggle);
}

function impostaCommento(index, testo) {
    const area = document.querySelector(
        'textarea[name="commento"][data-index="' + index + '"]'
    );
    if (area) area.value = testo || "";
}

function resetForm() {
    listaGiocatori.forEach((_, index) => {
        impostaPresenza(index, true);
        impostaVoto(index, VOTO_DEFAULT);
        impostaToggle(index, "bonusAtletica", 0);
        impostaToggle(index, "bonusPartitella", 0);
        impostaCommento(index, "");
    });
}

document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("cb-presente")) return;
    impostaPresenza(e.target.dataset.index, e.target.checked);
});

/* =========================================================
   CARICAMENTO PER DATA
   ========================================================= */
async function trovaAllenamentoPerData(data) {
    const snap = await window.firebaseDB.ref(ID_SQUADRA + "/allenamenti").once("value");
    const allenamenti = snap.val();
    if (!allenamenti) return null;

    // Si confronta dataEvento(), non d.data: i record salvati senza data
    // (ce n'e' almeno uno sul database) sono comunque raggiungibili tramite
    // il timestamp. Cercandoli per d.data non si trovavano mai e sceglierne
    // la data nel calendario creava un doppione invece di aprirli.
    const trovati = Object.entries(allenamenti).filter(([, d]) => dataEvento(d) === data);
    if (trovati.length === 0) return null;
    if (trovati.length > 1) {
        console.warn("Attenzione: " + trovati.length + " allenamenti con data " + data);
    }
    return { id: trovati[0][0], dati: trovati[0][1] };
}

/* Cambiando data velocemente le letture possono tornare fuori ordine:
   solo l'ultima richiesta ha il diritto di riempire il form. Senza questo
   controllo la risposta vecchia lasciava allenamentoEsistenteId puntato al
   record di un'altra data, e il salvataggio successivo lo sovrascriveva. */
let letturaCorrente = 0;

async function caricaAllenamento(data) {
    if (!data) return;

    const richiesta = ++letturaCorrente;
    resetForm();
    allenamentoEsistenteId = null;

    let trovato = null;
    try {
        trovato = await trovaAllenamentoPerData(data);
    } catch (err) {
        console.error("Errore caricamento allenamento:", err);
        if (richiesta === letturaCorrente) {
            mostraAvviso("Errore nel caricamento dell'allenamento", "error");
        }
        return;
    }

    // Nel frattempo l'utente ha scelto un'altra data: questa risposta e' vecchia
    if (richiesta !== letturaCorrente) return;
    if (!trovato) return;

    allenamentoEsistenteId = trovato.id;
    const giocatoriDati = trovato.dati.giocatori || {};

    listaGiocatori.forEach((nome, index) => {
        const dati = giocatoriDati[nome];
        if (!dati) return impostaPresenza(index, false);

        impostaPresenza(index, true);
        impostaVoto(index, dati.voto);
        impostaToggle(index, "bonusAtletica", dati.bonusAtletica);
        impostaToggle(index, "bonusPartitella", dati.bonusPartitella);
        impostaCommento(index, dati.commento);
    });

    mostraAvviso("Allenamento esistente caricato");
}

/* =========================================================
   SALVATAGGIO
   ========================================================= */
function raccogliAllenamento(data) {
    const allenamento = {
        tipo: "allenamento",
        data,
        timestamp: new Date().toISOString(),
        giocatori: {}
    };

    listaGiocatori.forEach((nome, index) => {
        const cb = document.querySelector('.cb-presente[data-index="' + index + '"]');
        if (!cb || !cb.checked) return; // assente: non finisce nel record

        const slider = document.querySelector('.input-all[data-index="' + index + '"]');
        const voto = parseFloat(slider && slider.value);
        if (isNaN(voto)) return;

        const stato = (type) => {
            const t = document.querySelector(
                '.toggle-3[data-index="' + index + '"][data-type="' + type + '"]'
            );
            return t ? parseInt(t.dataset.state, 10) || 0 : 0;
        };

        const bonusAtletica = stato("bonusAtletica");
        const bonusPartitella = stato("bonusPartitella");
        const bonusPercent = (bonusAtletica + bonusPartitella) * 0.05;
        const votoFinale = parseFloat((voto * (1 + bonusPercent)).toFixed(2));

        const area = document.querySelector(
            'textarea[name="commento"][data-index="' + index + '"]'
        );

        allenamento.giocatori[nome] = {
            voto,
            bonusAtletica,
            bonusPartitella,
            votoFinale,
            commento: area ? area.value : ""
        };
    });

    return allenamento;
}

/* Finche' non c'e' una data non si mostra la lista giocatori:
   il campo data si evidenzia e al suo posto compare un invito discreto. */
function aggiornaStatoData() {
    const pagina = document.getElementById("page-allenamento");
    if (pagina) pagina.classList.toggle("attesa-data", !(dataInput && dataInput.value));
}

if (form) {
    if (dataInput) {
        dataInput.addEventListener("change", (e) => {
            aggiornaStatoData();
            if (e.target.value) caricaAllenamento(e.target.value);
            else resetForm();
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = dataInput ? dataInput.value : "";
        if (!data) return mostraAvviso("Inserisci una data", "error");

        const allenamento = raccogliAllenamento(data);
        if (Object.keys(allenamento.giocatori).length === 0) {
            return mostraAvviso("Nessun giocatore presente con un voto", "error");
        }

        try {
            // Se il record non e' gia' aperto si ricontrolla per data:
            // evita di creare un duplicato salvando due volte di seguito.
            if (!allenamentoEsistenteId) {
                const trovato = await trovaAllenamentoPerData(data);
                if (trovato) allenamentoEsistenteId = trovato.id;
            }

            if (allenamentoEsistenteId) {
                await window.firebaseDB
                    .ref(ID_SQUADRA + "/allenamenti/" + allenamentoEsistenteId)
                    .set(allenamento);
                mostraAvviso("Allenamento aggiornato");
            } else {
                const nuovo = await window.firebaseDB
                    .ref(ID_SQUADRA + "/allenamenti")
                    .push(allenamento);
                // Si conserva l'id: un secondo salvataggio aggiorna, non duplica
                allenamentoEsistenteId = nuovo.key;
                mostraAvviso("Allenamento salvato");
            }

            document.dispatchEvent(new Event("data-update"));
        } catch (err) {
            console.error("Errore nel salvataggio:", err);
            mostraAvviso("Errore nel salvataggio", "error");
        }
    });
}

/* =========================================================
   AVVIO
   ========================================================= */
quandoDatiPronti(() => {
    initAllenamenti();

    // Nessuna data preimpostata: la sceglie l'utente, cosi' non si rischia
    // di salvare per sbaglio sulla giornata di oggi.
    aggiornaStatoData();
    if (dataInput && dataInput.value) caricaAllenamento(dataInput.value);
});
