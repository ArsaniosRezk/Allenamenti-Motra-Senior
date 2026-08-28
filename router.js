// router.js - routing via hash, cosi' il tasto Indietro del telefono
// torna alla sezione precedente invece di uscire dall'app.

const ROTTE = {
    stats: { pagina: "page-stats", titolo: "STATISTICHE" },
    cronologia: { pagina: "page-storico", titolo: "CRONOLOGIA" },
    partita: { pagina: "page-partita", titolo: "PARTITA" },
    allenamento: { pagina: "page-allenamento", titolo: "ALLENAMENTO" }
};

const ROTTA_DEFAULT = "stats";

function nomeRotta() {
    const chiave = (window.location.hash || "").replace(/^#\/?/, "");
    return ROTTE[chiave] ? chiave : ROTTA_DEFAULT;
}

function mostraRotta(chiave) {
    const rotta = ROTTE[chiave];
    if (!rotta) return;

    document.querySelectorAll(".page-container").forEach((p) => {
        p.classList.toggle("hidden", p.id !== rotta.pagina);
    });

    document.querySelectorAll(".nav-item").forEach((n) => {
        n.classList.toggle("active", n.dataset.rotta === chiave);
    });

    const titolo = document.getElementById("titolo-pagina");
    if (titolo) titolo.textContent = rotta.titolo;

    // Ogni cambio pagina riparte dall'alto
    window.scrollTo({ top: 0 });

    document.dispatchEvent(
        new CustomEvent("rotta-cambiata", { detail: { rotta: chiave } })
    );
}

export function initRouter() {
    // La navbar usa href reali: funzionano anche senza JS e
    // popolano correttamente la cronologia del browser.
    document.querySelectorAll(".nav-item").forEach((link) => {
        const chiave = link.dataset.rotta;
        if (chiave) link.setAttribute("href", `#${chiave}`);
    });

    window.addEventListener("hashchange", () => mostraRotta(nomeRotta()));

    // Normalizza l'URL al primo avvio (es. apertura da home screen PWA)
    if (!ROTTE[(window.location.hash || "").replace(/^#\/?/, "")]) {
        window.history.replaceState(null, "", `#${ROTTA_DEFAULT}`);
    }
    mostraRotta(nomeRotta());
}

