// partita_spa.js - formazione in campo e pagelle della partita
import { giocatori, abbreviaNomeFormazione } from "./giocatori.js";
import {
    mostraAvviso,
    escapeHtml,
    dataOggi,
    catturaECondividi,
    quandoDatiPronti,
    ID_SQUADRA
} from "./utils.js";

const divCampo = document.getElementById("campo");
const selectModulo = document.getElementById("moduloFormazione");
const dataInput = document.getElementById("dataPartita");
const votiContainer = document.getElementById("votiContainer");
const salvaPagellaBtn = document.getElementById("salvaPagella");

/* Il minimo era 1: un giocatore schierato e mai entrato non era
   rappresentabile, e uno 0 gia' salvato (i S.V.) tornava a video come 1'.
   Il valore di partenza di una scheda nuova resta 1. */
const MINUTI_MIN = 0;
const MINUTI_MAX = 50;
const MINUTI_DEFAULT = 1;

/* Voto di partenza di ogni scheda. Era 1: salvando senza toccare gli
   slider si assegnava il minimo a tutta la formazione. */
const VOTO_DEFAULT = 6;

const moduli = {
    "3-2-1": [
        [{ id: "att", label: "PC" }],
        [
            { id: "cen1", label: "CC" },
            { id: "cen2", label: "CC" }
        ],
        [
            { id: "dif3", label: "TS" },
            { id: "dif2", label: "DC" },
            { id: "dif1", label: "TD" }
        ],
        [{ id: "portiere", label: "POR" }]
    ],
    "2-3-1": [
        [{ id: "att", label: "PC" }],
        [
            { id: "cen3", label: "CS" },
            { id: "cen2", label: "CC" },
            { id: "cen1", label: "CD" }
        ],
        [
            { id: "dif2", label: "DS" },
            { id: "dif1", label: "DD" }
        ],
        [{ id: "portiere", label: "POR" }]
    ]
};

const MODULO_DEFAULT = "3-2-1";
const idsPanchina = Array.from({ length: 10 }, (_, i) => "p" + (i + 1));

/* Ordine con cui le partite di primavera 2025 hanno scritto l'array
   `titolari`, preso dal sorgente di allora (formazione.js, poi partite.js:
   `const ids = ["portiere","dif1","dif2","dif3","cen1","cen2","att", ...]`
   e `titolari = ids.slice(0, 7)`).

   E' l'ESATTO CONTRARIO dell'ordine piatto di moduli["3-2-1"], che parte
   dall'attacco. Rileggendo quei record posizione per posizione sull'ordine
   nuovo, ogni partita vecchia usciva con la formazione capovolta: il
   portiere schierato da centravanti e viceversa.

   Lo schema di allora (1 portiere, 3 difensori, 2 centrocampisti, 1
   attaccante) e' proprio il 3-2-1, quindi MODULO_DEFAULT va bene. */
const IDS_LEGACY = ["portiere", "dif1", "dif2", "dif3", "cen1", "cen2", "att"];

/* Identificatore sicuro da usare negli attributi id="".
   Ogni carattere non alfanumerico diventa "_<codice>_" invece di un "_"
   secco: cosi' la trasformazione resta iniettiva e due nomi che
   differiscono solo per un apostrofo o un trattino non si contendono
   lo stesso id. */
function slug(nome) {
    return String(nome).replace(
        /[^a-zA-Z0-9]/g,
        (c) => "_" + c.charCodeAt(0) + "_"
    );
}

/* Le opzioni del <select> le genera la mappa `moduli`: aggiungerne uno
   qui bastava a farlo funzionare ma non a renderlo scegliibile, perche'
   le <option> erano scritte a mano in index.html. */
function riempiModuli() {
    if (!selectModulo) return;
    const corrente = selectModulo.value;
    selectModulo.innerHTML = "";
    Object.keys(moduli).forEach((nome) =>
        selectModulo.appendChild(new Option(nome, nome))
    );
    selectModulo.value = moduli[corrente] ? corrente : MODULO_DEFAULT;
}

function moduloCorrente() {
    const valore = selectModulo ? selectModulo.value : MODULO_DEFAULT;
    return moduli[valore] ? valore : MODULO_DEFAULT;
}

function idsTitolari(modulo) {
    return moduli[modulo || moduloCorrente()].flat().map((s) => s.id);
}

function getIdsCorrenti() {
    return [...idsTitolari(), ...idsPanchina];
}

/* =========================================================
   CAMPO
   ========================================================= */
function raccogliValori() {
    const valori = {};
    getIdsCorrenti().forEach((id) => {
        const el = document.getElementById(id);
        if (el) valori[id] = el.value;
    });
    return valori;
}

function applicaValori(valori) {
    Object.entries(valori).forEach(([id, nome]) => {
        const el = document.getElementById(id);
        if (!el) return;
        // Il valore si puo' assegnare solo se l'opzione esiste gia'
        if (nome && !Array.from(el.options).some((o) => o.value === nome)) return;
        el.value = nome || "";
    });
}

function renderCampo(valoriIniziali) {
    if (!divCampo) return;

    // Se non viene passato nulla si conserva quanto e' gia' schierato:
    // cambiare modulo non deve azzerare la formazione.
    const valori = valoriIniziali || raccogliValori();
    const config = moduli[moduloCorrente()];

    divCampo.innerHTML = "";

    config.forEach((riga) => {
        const divRiga = document.createElement("div");
        divRiga.className = "linea";
        riga.forEach((slot) => {
            const divPos = document.createElement("div");
            divPos.className = "posizione";

            const select = document.createElement("select");
            select.id = slot.id;

            const label = document.createElement("label");
            label.textContent = slot.label;

            divPos.appendChild(select);
            divPos.appendChild(label);
            divRiga.appendChild(divPos);
        });
        divCampo.appendChild(divRiga);
    });

    const btnShare = document.createElement("button");
    btnShare.type = "button";
    btnShare.className = "campo-action-btn btn-pos-left";
    btnShare.id = "actionShare";
    btnShare.title = "Condividi la formazione";
    btnShare.innerHTML = '<i class="fas fa-share-nodes"></i>';
    divCampo.appendChild(btnShare);

    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "campo-action-btn btn-pos-right";
    btnSave.id = "actionSave";
    btnSave.title = "Salva la formazione";
    btnSave.innerHTML = '<i class="fas fa-save"></i>';
    divCampo.appendChild(btnSave);

    // Prima si creano tutte le opzioni, poi si riassegnano i valori:
    // assegnare un valore a una select vuota non avrebbe alcun effetto.
    collegaSelect();
    riempiTutteLeOpzioni(valori);
    applicaValori(valori);
    aggiornaOpzioniSelect();
}

/* Rosa attuale piu' chi e' gia' schierato pur non essendo piu' in rosa.
   Senza questo, riaprendo una partita vecchia gli ex giocatori non
   avrebbero un'opzione da selezionare: sparirebbero dal campo e
   risalvando la formazione verrebbero cancellati dal record. */
function nomiSelezionabili(valoriCorrenti) {
    const nomi = [...giocatori];
    const noti = new Set(nomi);
    valoriCorrenti.forEach((nome) => {
        if (!nome || noti.has(nome)) return;
        noti.add(nome);
        nomi.push(nome);
    });
    return nomi;
}

/* Riempie ogni select con tutti i nomi disponibili (senza filtri) */
function riempiTutteLeOpzioni(valoriIniziali) {
    const nomi = nomiSelezionabili(Object.values(valoriIniziali || {}));
    getIdsCorrenti().forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        const corrente = select.value;
        select.innerHTML = "";
        select.appendChild(new Option("-", ""));
        nomi.forEach((nome) => {
            select.appendChild(new Option(abbreviaNomeFormazione(nome), nome));
        });
        select.value = corrente;
    });
}

/* Nasconde dalle tendine i giocatori gia' schierati altrove */
function aggiornaOpzioniSelect() {
    const ids = getIdsCorrenti();
    const selezionati = new Set();
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.value) selezionati.add(el.value);
    });

    const nomi = nomiSelezionabili([...selezionati]);

    ids.forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;

        const valoreCorrente = select.value;
        select.innerHTML = "";
        select.appendChild(new Option("-", ""));

        nomi.forEach((nome) => {
            if (!selezionati.has(nome) || nome === valoreCorrente) {
                const opt = new Option(abbreviaNomeFormazione(nome), nome);
                if (nome === valoreCorrente) opt.selected = true;
                select.appendChild(opt);
            }
        });
    });

    // Gira a ogni cambio di select: e' il punto giusto per riallineare
    // l'etichetta del bottone flottante allo stato del campo.
    aggiornaStatoBottone();
}

function collegaSelect() {
    getIdsCorrenti().forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.removeEventListener("change", aggiornaOpzioniSelect);
        select.addEventListener("change", aggiornaOpzioniSelect);
    });
}

/* Impronta della formazione a video, per capire se diverge da quella
   scritta sul database. Serve al bottone flottante: una volta comparse le
   pagelle salvava solo i voti, e le modifiche al campo andavano perse. */
function firmaFormazione() {
    const { formazione, panchina } = getFormazioneCorrente();
    const slots = idsTitolari().map((id) => id + ":" + (formazione[id] || ""));
    return moduloCorrente() + "|" + slots.join(",") + "|" + panchina.join(",");
}

/* Impronta dell'ultima formazione letta o scritta sul database */
let formazioneSalvata = null;

function formazioneCambiata() {
    return formazioneSalvata !== null && firmaFormazione() !== formazioneSalvata;
}

/* Formazione salvata come mappa slot -> giocatore.
   Gli array titolari/panchina restano per compatibilita' con i dati
   gia' presenti sul database e con le statistiche esistenti. */
function getFormazioneCorrente() {
    const formazione = {};
    const titolari = [];

    idsTitolari().forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.value) {
            formazione[id] = el.value;
            titolari.push(el.value);
        }
    });

    const panchina = [];
    idsPanchina.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.value) panchina.push(el.value);
    });

    return { formazione, titolari, panchina };
}

/* =========================================================
   PAGELLE
   ========================================================= */
function creaPlayerCardPartita(nome, datiVoto) {
    const dati = datiVoto || {};
    const isSquadra = nome === "Squadra";

    /* Una voce che esiste sul record ma non ha ne' voto ne' S.V. e' un
       convocato mai valutato: nei dati vecchi sono 21, tutte con zero
       minuti e nessun commento. Nell'app quello stato ha gia' un nome ed
       e' S.V. ("presente ma non sceso in campo"), quindi si presenta cosi'.
       Trattarla come una scheda vuota faceva partire lo slider da 6.00 e
       bastava un "Salva Pagella" per trasformare quel 6 di comodo in un
       voto vero, mai assegnato da nessuno.

       Attenzione a `datiVoto` indefinito: li' la voce non esiste proprio
       (giocatore schierato ora e ancora da votare) e la scheda deve
       partire normale, non gia' segnata S.V. */
    const nonValutato =
        Boolean(datiVoto) &&
        dati.voto === undefined &&
        dati.votoFinale === undefined;

    const isSV =
        dati.voto === "S.V." || dati.votoFinale === "S.V." || nonValutato;

    /* Come per gli allenamenti: un record vecchio puo' avere solo
       `votoFinale`. Dove ci sono entrambi vince `voto`, che e' il valore
       grezzo senza bonus e quindi quello dello slider. */
    const votoNumerico = parseFloat(
        dati.voto !== undefined ? dati.voto : dati.votoFinale
    );
    const voto = isNaN(votoNumerico) ? VOTO_DEFAULT : votoNumerico;

    let minuti = parseInt(dati.minuti, 10);
    if (isNaN(minuti)) minuti = MINUTI_DEFAULT;
    if (minuti < MINUTI_MIN) minuti = MINUTI_MIN;
    if (minuti > MINUTI_MAX) minuti = MINUTI_MAX;

    const commento = dati.commento || "";
    const id = slug(nome);
    const nomeAttr = escapeHtml(nome);
    const displayNome = escapeHtml(isSquadra ? "SQUADRA" : nome);
    const displayVoto = isSV ? "S.V." : Number(voto).toFixed(2);
    const nascosto = isSV ? ' style="display:none;"' : "";

    const boxStatus = isSquadra
        ? ""
        : '<div class="pc-switch-box">' +
          '<span class="pc-switch-label">S.V.</span>' +
          '<label class="pc-switch">' +
          '<input type="checkbox" class="cb-sv" data-nome="' + nomeAttr + '"' +
          (isSV ? " checked" : "") + ">" +
          '<span class="pc-slider-switch"></span>' +
          "</label></div>";

    const boxMinuti = isSquadra
        ? ""
        : '<div class="pc-vote-row" style="margin-top:4px;">' +
          '<div class="pc-vote-header">' +
          '<span class="pc-vote-label">Minuti</span>' +
          '<span id="valore-min-' + id + '" class="pc-vote-value pc-valore-minuti">' + minuti + "'</span>" +
          "</div>" +
          '<div class="pc-slider-wrapper">' +
          '<input type="range" class="input-minuti-slider pc-slider" min="' + MINUTI_MIN +
          '" max="' + MINUTI_MAX + '" step="1" value="' + minuti + '" data-nome="' + nomeAttr + '"' +
          (isSV ? " disabled" : "") + ">" +
          "</div></div>";

    return (
        '<div class="pc-card' + (isSV ? " disabled" : "") + '" id="card-' + id + '">' +
        '<div class="pc-header">' +
        '<span class="pc-name">' + displayNome + "</span>" +
        boxStatus +
        "</div>" +
        '<div class="pc-body" id="body-' + id + '"' + nascosto + ">" +
        '<div class="pc-vote-row">' +
        '<div class="pc-vote-header">' +
        '<span class="pc-vote-label">Voto</span>' +
        '<span id="valore-' + id + '" class="pc-vote-value">' + displayVoto + "</span>" +
        "</div>" +
        '<div class="pc-slider-wrapper">' +
        '<input type="range" class="input-voto-slider pc-slider" min="1" max="10" step="0.25" value="' +
        voto + '" data-nome="' + nomeAttr + '"' + (isSV ? " disabled" : "") + ">" +
        "</div></div>" +
        boxMinuti +
        "</div>" +
        '<div class="pc-footer" id="footer-' + id + '"' + nascosto + ">" +
        '<textarea placeholder="Commento..." data-nome="' + nomeAttr +
        '" class="input-commento pc-comment-input">' + escapeHtml(commento) + "</textarea>" +
        "</div></div>"
    );
}

function mostraCampiVoto(titolari, panchina, voti) {
    if (!votiContainer) return;
    const dati = voti || {};
    votiContainer.innerHTML = "";

    const tutti = ["Squadra", ...new Set([...(titolari || []), ...(panchina || [])])];
    tutti.forEach((nome) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = creaPlayerCardPartita(nome, dati[nome]);
        votiContainer.appendChild(wrapper.firstElementChild);
    });
}

/* Legge dal DOM i voti attualmente inseriti, cosi' da non perderli
   quando si risalva la formazione. */
function leggiVotiDalDOM() {
    const voti = {};
    document.querySelectorAll("#votiContainer .pc-card").forEach((card) => {
        const sliderVoto = card.querySelector(".input-voto-slider");
        if (!sliderVoto) return;

        const nome = sliderVoto.dataset.nome;
        const cbSV = card.querySelector(".cb-sv");
        const sliderMinuti = card.querySelector(".input-minuti-slider");
        const commentoInput = card.querySelector(".input-commento");
        const commento = commentoInput ? commentoInput.value : "";

        if (cbSV && cbSV.checked) {
            // S.V. = presente ma non sceso in campo: nessun voto, zero minuti.
            voti[nome] = { voto: "S.V.", votoFinale: "S.V.", commento };
            if (nome !== "Squadra") voti[nome].minuti = 0;
            return;
        }

        const votoVal = parseFloat(sliderVoto.value);
        voti[nome] = { voto: votoVal, votoFinale: votoVal, commento };

        if (nome !== "Squadra" && sliderMinuti) {
            const minuti = parseInt(sliderMinuti.value, 10);
            voti[nome].minuti = isNaN(minuti) ? 0 : minuti;
        }
    });
    return voti;
}

/* =========================================================
   LISTENER DELEGATI
   ========================================================= */
document.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (
        target.classList.contains("input-voto-slider") &&
        !target.classList.contains("input-all")
    ) {
        const span = document.getElementById("valore-" + slug(target.dataset.nome));
        if (span) span.textContent = parseFloat(target.value).toFixed(2);
    }

    if (target.classList.contains("input-minuti-slider")) {
        const span = document.getElementById("valore-min-" + slug(target.dataset.nome));
        if (span) span.textContent = target.value + "'";
    }
});

document.addEventListener("change", (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.classList.contains("cb-sv")) return;

    const attivo = e.target.checked;
    const id = slug(e.target.dataset.nome);
    const card = document.getElementById("card-" + id);
    if (!card) return;

    card.querySelectorAll("input, textarea").forEach((input) => {
        if (!input.classList.contains("cb-sv")) input.disabled = attivo;
    });

    const body = card.querySelector(".pc-body");
    const footer = card.querySelector(".pc-footer");
    if (body) body.style.display = attivo ? "none" : "";
    if (footer) footer.style.display = attivo ? "none" : "block";
    card.classList.toggle("disabled", attivo);

    // Senza voto significa anche senza minuti giocati
    const sliderMinuti = card.querySelector(".input-minuti-slider");
    const spanMinuti = document.getElementById("valore-min-" + id);
    if (attivo && spanMinuti) spanMinuti.textContent = "0'";
    if (!attivo && sliderMinuti && spanMinuti) {
        spanMinuti.textContent = sliderMinuti.value + "'";
    }

    const sliderVoto = card.querySelector(".input-voto-slider");
    const spanVoto = document.getElementById("valore-" + id);
    if (spanVoto && sliderVoto) {
        spanVoto.textContent = attivo ? "S.V." : parseFloat(sliderVoto.value).toFixed(2);
    }
});

/* =========================================================
   RIEPILOGO TITOLARITA'
   ========================================================= */
function mostraStatistichePartite(stats) {
    const esistente = document.querySelector(".statistiche-container");
    if (esistente) esistente.remove();
    if (!votiContainer) return;

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
            const dati = stats[nome] || { titolare: 0, minuti: 0 };

            const tdNome = document.createElement("td");
            tdNome.className = "stat-nome";
            tdNome.textContent = abbreviaNomeFormazione(nome);

            const tdStat = document.createElement("td");
            tdStat.className = "stat-valori";
            tdStat.textContent = "Tit: " + dati.titolare + " - Min: " + dati.minuti;

            tr.appendChild(tdNome);
            tr.appendChild(tdStat);
        });
        table.appendChild(tr);
    }

    div.appendChild(table);
    votiContainer.parentNode.insertBefore(div, votiContainer);
}

/* Calcola il riepilogo su una lista di partite gia' in memoria.
   index.js le ha appena lette per le statistiche: rileggerle da capo
   significava un secondo scaricamento dell'intero ramo a ogni salvataggio,
   con il rischio di mostrare uno stato diverso da quello appena disegnato. */
function riepilogoDaPartite(partite) {
    const stats = {};
    const rec = (nome) => (stats[nome] = stats[nome] || { titolare: 0, minuti: 0 });

    partite.forEach((partita) => {
        if (!partita.giocatori) return;

        const titolari = partita.formazione
            ? Object.values(partita.formazione)
            : partita.titolari || [];
        titolari.forEach((nome) => rec(nome).titolare++);

        Object.entries(partita.giocatori).forEach(([nome, dati]) => {
            const sv = dati.voto === "S.V." || dati.votoFinale === "S.V.";
            if (sv) return; // senza voto, quindi senza minuti
            rec(nome).minuti += Number(dati.minuti) || 0;
        });
    });

    return stats;
}

/* =========================================================
   CARICAMENTO E SALVATAGGIO
   ========================================================= */
/* Cambiando data velocemente le letture possono tornare fuori ordine:
   solo l'ultima richiesta ha il diritto di ridisegnare il campo. */
let letturaCorrente = 0;

async function caricaFormazione(data) {
    if (!data) return;

    const richiesta = ++letturaCorrente;
    let partita = null;
    try {
        const snap = await window.firebaseDB
            .ref(ID_SQUADRA + "/partite/" + data)
            .once("value");
        partita = snap.val();
    } catch (err) {
        console.error("Errore caricamento formazione:", err);
        if (richiesta === letturaCorrente) {
            mostraAvviso("Errore nel caricamento della partita", "error");
        }
        return;
    }

    // Nel frattempo l'utente ha scelto un'altra data: questa risposta e' vecchia
    if (richiesta !== letturaCorrente) return;

    const moduloSalvato = partita && moduli[partita.modulo] ? partita.modulo : MODULO_DEFAULT;
    if (selectModulo) selectModulo.value = moduloSalvato;

    const slots = idsTitolari(moduloSalvato);
    const valori = {};
    [...slots, ...idsPanchina].forEach((id) => (valori[id] = ""));

    if (partita && partita.formazione) {
        // Formato nuovo: mappa posizione -> giocatore
        slots.forEach((id) => {
            if (partita.formazione[id]) valori[id] = partita.formazione[id];
        });
    } else if (partita && Array.isArray(partita.titolari)) {
        // Formato vecchio: array posizionale, nell'ordine di IDS_LEGACY
        partita.titolari.forEach((nome, i) => {
            const id = IDS_LEGACY[i];
            if (id && valori[id] !== undefined) valori[id] = nome;
        });
    }

    const panchinaSalvata =
        partita && Array.isArray(partita.panchina) ? partita.panchina : [];
    panchinaSalvata.forEach((nome, i) => {
        if (idsPanchina[i]) valori[idsPanchina[i]] = nome;
    });

    /* La panchina a video ha 10 posti: se il record ne contiene di piu',
       gli altri non hanno una select in cui finire. Prima sparivano in
       silenzio e il salvataggio successivo riscriveva la lista accorciata. */
    const esclusi = panchinaSalvata.slice(idsPanchina.length).filter(Boolean);
    if (esclusi.length > 0) {
        mostraAvviso(
            "Panchina piu' lunga di " + idsPanchina.length + " posti: " +
            esclusi.join(", ") + " non e' a video. Salvando andrebbe perso.",
            "warning"
        );
    }

    renderCampo(valori);

    // Da qui in poi le modifiche al campo sono divergenze dal database
    formazioneSalvata = firmaFormazione();

    const schierati = Object.values(valori).filter(Boolean);
    if (partita && schierati.length > 0) {
        const titolari = slots.map((id) => valori[id]).filter(Boolean);
        const panchina = idsPanchina.map((id) => valori[id]).filter(Boolean);
        mostraCampiVoto(titolari, panchina, partita.giocatori || {});
    } else if (votiContainer) {
        votiContainer.innerHTML = "";
    }

    aggiornaStatoBottone();
}

/* Restituisce true solo se la scrittura e' andata a buon fine: il bottone
   flottante deve poter interrompere la sequenza formazione -> pagella. */
async function salvaFormazione() {
    const data = dataInput ? dataInput.value : "";
    if (!data) {
        mostraAvviso("Inserisci una data", "error");
        return false;
    }

    const { formazione, titolari, panchina } = getFormazioneCorrente();
    if (titolari.length === 0 && panchina.length === 0) {
        mostraAvviso("Schiera almeno un giocatore", "error");
        return false;
    }

    // I voti gia' inseriti non devono andare persi al risalvataggio
    const votiEsistenti = leggiVotiDalDOM();

    try {
        await window.firebaseDB.ref(ID_SQUADRA + "/partite/" + data).update({
            data,
            timestamp: new Date().toISOString(),
            tipo: "partita",
            modulo: moduloCorrente(),
            // Firebase rifiuta gli oggetti vuoti: si scrive null per cancellare il nodo
            formazione: Object.keys(formazione).length > 0 ? formazione : null,
            titolari,
            panchina
        });
    } catch (err) {
        console.error("Errore salvataggio formazione:", err);
        mostraAvviso("Errore nel salvataggio della formazione", "error");
        return false;
    }

    formazioneSalvata = firmaFormazione();
    mostraCampiVoto(titolari, panchina, votiEsistenti);
    mostraAvviso("Formazione salvata");
    document.dispatchEvent(new Event("data-update"));
    return true;
}

async function salvaPagella() {
    const data = dataInput ? dataInput.value : "";
    if (!data) return mostraAvviso("Inserisci una data", "error");

    const voti = leggiVotiDalDOM();
    if (Object.keys(voti).length === 0) {
        return mostraAvviso("Nessuna pagella da salvare", "error");
    }

    try {
        await window.firebaseDB
            .ref(ID_SQUADRA + "/partite/" + data + "/giocatori")
            .set(voti);
        mostraAvviso("Partita salvata");
        document.dispatchEvent(new Event("data-update"));
    } catch (err) {
        console.error("Errore salvataggio pagella:", err);
        mostraAvviso("Errore nel salvataggio della pagella", "error");
    }
}

/* =========================================================
   BOTTONI E EVENTI
   ========================================================= */
if (divCampo) {
    divCampo.addEventListener("click", (e) => {
        if (e.target.closest("#actionSave")) return salvaFormazione();
        if (!e.target.closest("#actionShare")) return;

        // Le <select> non vengono rese bene da html2canvas: si sostituiscono
        // temporaneamente con dei div di solo testo.
        const sostituzioni = [];
        catturaECondividi(
            divCampo,
            "formazione_" + ((dataInput && dataInput.value) || dataOggi()) + ".png",
            {
                prima: () => {
                    divCampo.querySelectorAll("select").forEach((sel) => {
                        const div = document.createElement("div");
                        div.className = "screenshot-replacement";
                        div.textContent = sel.options[sel.selectedIndex]
                            ? sel.options[sel.selectedIndex].text
                            : "-";
                        sel.parentNode.insertBefore(div, sel);
                        sel.style.display = "none";
                        sostituzioni.push({ select: sel, div });
                    });
                },
                dopo: () => {
                    sostituzioni.forEach((item) => {
                        item.div.remove();
                        item.select.style.display = "";
                    });
                }
            }
        );
    });
}

/* Finche' non c'e' una data non si mostra nulla che dipenda da essa:
   il campo data si evidenzia e al suo posto compare un invito discreto. */
function aggiornaStatoData() {
    const pagina = document.getElementById("page-partita");
    if (pagina) pagina.classList.toggle("attesa-data", !(dataInput && dataInput.value));
}

if (dataInput) {
    // Un solo evento: "input" e "change" insieme causavano due letture
    // concorrenti su Firebase a ogni selezione della data.
    dataInput.addEventListener("change", () => {
        aggiornaStatoData();
        if (dataInput.value) {
            caricaFormazione(dataInput.value);
        } else if (votiContainer) {
            votiContainer.innerHTML = "";
            formazioneSalvata = null;
        }
    });
}

if (selectModulo) {
    selectModulo.addEventListener("change", () => {
        const prima = raccogliValori();
        renderCampo();
        const dopo = raccogliValori();

        const persi = Object.values(prima).filter(
            (n) => n && !Object.values(dopo).includes(n)
        );
        if (persi.length > 0) {
            mostraAvviso("Modulo cambiato: rischiera " + persi.join(", "), "warning");
        }
    });
}

/* Il bottone flottante cambia funzione a seconda dello stato:
   senza pagelle a video salva la formazione, altrimenti i voti. Se il campo
   e' stato ritoccato dopo la comparsa delle pagelle salva entrambe le cose:
   prima faceva solo i voti e la formazione nuova spariva senza dirlo. */
function aggiornaStatoBottone() {
    const txt = document.getElementById("salvaPagellaText");
    if (!txt || !votiContainer) return;

    if (votiContainer.children.length === 0) {
        txt.textContent = "Salva Formazione";
        return;
    }
    txt.textContent = formazioneCambiata() ? "Salva Tutto" : "Salva Pagella";
}

if (salvaPagellaBtn) {
    salvaPagellaBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (votiContainer && votiContainer.children.length === 0) {
            await salvaFormazione();
        } else {
            // Se la formazione non e' andata a buon fine ci si ferma: salvare
            // i voti di una formazione mai scritta lascerebbe i due disallineati.
            if (formazioneCambiata() && !(await salvaFormazione())) {
                return aggiornaStatoBottone();
            }
            await salvaPagella();
        }
        aggiornaStatoBottone();
    });
}

if (votiContainer) {
    new MutationObserver(aggiornaStatoBottone).observe(votiContainer, {
        childList: true
    });
}

/* =========================================================
   AVVIO
   ========================================================= */
quandoDatiPronti(() => {
    // Nessuna data preimpostata: la sceglie l'utente, cosi' non si rischia
    // di salvare per sbaglio sulla giornata di oggi.
    aggiornaStatoData();
    riempiModuli();
    renderCampo({});
    formazioneSalvata = firmaFormazione();
    // Il riepilogo lo riempie l'evento "dati-ricaricati", che index.js
    // emette appena finita la lettura iniziale.
    aggiornaStatoBottone();

    if (dataInput && dataInput.value) caricaFormazione(dataInput.value);
});

/* Il riepilogo titolarita'/minuti deve seguire i salvataggi, non restare
   fermo ai dati letti all'apertura della pagina. I dati arrivano gia' letti
   da index.js: nessuna lettura in piu'. */
document.addEventListener("dati-ricaricati", (e) => {
    const partite = e.detail && e.detail.partite;
    if (partite) mostraStatistichePartite(riepilogoDaPartite(partite));
});
