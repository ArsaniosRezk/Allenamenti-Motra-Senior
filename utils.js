// utils.js

/* =========================================================
   1. CONFIGURAZIONE SQUADRE
   ---------------------------------------------------------
   Un solo database Firebase, un ramo di primo livello per
   squadra (es. "sant-antonio/rosa", "sant-antonio/partite", ...).
   Tutto il resto del codice usa ID_SQUADRA.

   A decidere quali squadre sono attive e' il DATABASE, non un
   elenco scritto qui: una squadra alla radice e' consultabile,
   una spostata sotto "archivio/" non lo e' piu'. Il blocco qui
   sotto serve solo a dare nome e colori alle squadre che hanno
   un sito dedicato; qualunque altra resta comunque raggiungibile
   con ?team=<id> e riceve nome e colori predefiniti.
   ========================================================= */

const PRESENTAZIONE = {
    "sant-antonio": {
        nome: "Motra Sant'Antonio",             // titolo pagina e nome della PWA
        tema: "#1f2937",                        // colore barra browser (theme-color)
        manifest: "manifest-sant-antonio.json"  // manifest PWA dedicato
    },

    "santa-maria": {
        nome: "Motra Santa Maria",
        tema: "#1e3a8a",
        manifest: "manifest-santa-maria.json"
    }
};

export const RAMO_ARCHIVIO = "archivio";

const SQUADRA_DEFAULT = "santa-maria";
const TEMA_PREDEFINITO = "#1f2937";  // usato dalle squadre senza sito dedicato
const MANIFEST_PREDEFINITO = "manifest.json";

/* Mappa dominio -> squadra.
   Quando pubblicherai i due siti su Netlify basta aggiungere qui i loro
   hostname: nessuna altra modifica, nessuno step di build. */
const SQUADRA_PER_HOST = {
    "motra-sant-antonio.netlify.app": "sant-antonio",
    "motra-santa-maria.netlify.app": "santa-maria"
};

/* Gli id sono chiavi Firebase: minuscole, numeri e trattini */
const idValido = (id) => typeof id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(id);

/* "senior" -> "Motra Senior", "under-21" -> "Motra Under 21".
   Per i nomi che meritano di meglio (apostrofi, accenti) si usa
   una voce in PRESENTAZIONE. */
function nomePredefinito(id) {
    const parole = id
        .split("-")
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
    return "Motra " + parole.join(" ");
}

function componiSquadra(id) {
    const scheda = PRESENTAZIONE[id] || {};
    return {
        id,
        nome: scheda.nome || nomePredefinito(id),
        tema: scheda.tema || TEMA_PREDEFINITO,
        manifest: scheda.manifest || MANIFEST_PREDEFINITO,
        dedicata: Boolean(PRESENTAZIONE[id])
    };
}

/* Priorita di risoluzione:
   1. ?team=xxx        -> per vedere una qualunque squadra del database
   2. window.TEAM_ID   -> se un giorno userai una variabile d'ambiente Netlify
   3. hostname         -> il meccanismo previsto per i siti in produzione
   4. default          -> la squadra predefinita */
function risolviSquadra() {
    const candidati = [
        new URLSearchParams(window.location.search).get("team"),
        window.TEAM_ID,
        SQUADRA_PER_HOST[window.location.hostname],
        SQUADRA_DEFAULT
    ];

    for (const id of candidati) {
        if (idValido(id)) return componiSquadra(id);
    }
    return componiSquadra(SQUADRA_DEFAULT);
}

export const SQUADRA = risolviSquadra();
export const ID_SQUADRA = SQUADRA.id;

/* Applica titolo, colore barra e manifest della squadra corrente. */
export function applicaIdentitaSquadra() {
    document.title = SQUADRA.nome;

    const metaTema = document.querySelector('meta[name="theme-color"]');
    if (metaTema) metaTema.setAttribute("content", SQUADRA.tema);

    const linkManifest = document.querySelector('link[rel="manifest"]');
    if (linkManifest && SQUADRA.manifest) {
        linkManifest.setAttribute("href", SQUADRA.manifest);
    }

    document.documentElement.dataset.squadra = SQUADRA.id;
}

/* =========================================================
   2. UTILITY GENERICHE
   ========================================================= */

/* I nomi e i commenti arrivano dal database e finiscono dentro
   template HTML: vanno sempre passati da qui prima di essere
   interpolati in innerHTML. */
export function escapeHtml(valore) {
    if (valore === null || valore === undefined) return "";
    return String(valore)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function formattaData(iso) {
    if (!iso || typeof iso !== "string") return "";
    const [yyyy, mm, dd] = iso.split("-");
    if (!yyyy || !mm || !dd) return iso;
    return `${dd}/${mm}/${yyyy}`;
}

/* Data di oggi in formato compatibile con <input type="date"> */
export function dataOggi() {
    const oggi = new Date();
    const offset = oggi.getTimezoneOffset() * 60000;
    return new Date(oggi.getTime() - offset).toISOString().slice(0, 10);
}

let timerAvviso = null;

export function mostraAvviso(messaggio, tipo = "success") {
    const avviso = document.getElementById("avviso");
    if (!avviso) return;

    avviso.textContent = messaggio;
    avviso.className = tipo; // 'success' | 'error' | 'warning' definiti in CSS
    avviso.style.display = "block";

    if (timerAvviso) clearTimeout(timerAvviso);
    timerAvviso = setTimeout(() => {
        avviso.style.display = "none";
        timerAvviso = null;
    }, 3000);
}

export function condividiImmagine(blob, nomeFile) {
    if (!blob) return mostraAvviso("Impossibile generare l'immagine", "error");

    const file = new File([blob], nomeFile, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator
            .share({ files: [file], title: "Condividi Immagine" })
            .catch((err) => {
                // L'utente che annulla la condivisione non e' un errore
                if (err && err.name === "AbortError") return;
                console.error("Errore condivisione:", err);
                mostraAvviso("Condivisione non riuscita", "error");
            });
    } else {
        // Fallback: download diretto
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

/* Cattura un elemento come PNG e lo condivide.
   Centralizza la gestione della classe .screenshot-mode e degli errori. */
export async function catturaECondividi(elemento, nomeFile, opzioni = {}) {
    if (!elemento || typeof html2canvas !== "function") {
        return mostraAvviso("Condivisione non disponibile offline", "error");
    }

    const { prima, dopo } = opzioni;
    elemento.classList.add("screenshot-mode");
    if (typeof prima === "function") prima();

    try {
        const canvas = await html2canvas(elemento, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true
        });
        canvas.toBlob((blob) => condividiImmagine(blob, nomeFile));
    } catch (err) {
        console.error("Errore screenshot:", err);
        mostraAvviso("Errore nella generazione dell'immagine", "error");
    } finally {
        elemento.classList.remove("screenshot-mode");
        if (typeof dopo === "function") dopo();
    }
}

/* =========================================================
   3. SEGNALE "DATI PRONTI"
   ---------------------------------------------------------
   Le pagine Partita e Allenamento si inizializzano solo quando
   la rosa e' stata letta dal database. Un semplice evento non
   basterebbe: se un modulo venisse valutato dopo la lettura non
   lo riceverebbe mai. Qui il segnale resta "acceso", quindi chi
   arriva in ritardo parte subito.
   ========================================================= */
let datiPronti = false;

export function segnalaDatiPronti() {
    datiPronti = true;
    document.dispatchEvent(new Event("dati-pronti"));
}

export function quandoDatiPronti(callback) {
    if (datiPronti) callback();
    else document.addEventListener("dati-pronti", callback, { once: true });
}
