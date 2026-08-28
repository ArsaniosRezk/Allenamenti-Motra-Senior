/* Mostra l'effetto reale dei parametri di calcolo, cosi' da poterli
 * regolare guardando dei numeri invece che a intuito.
 *
 *   node verifica-parametri.mjs
 *   node verifica-parametri.mjs 7.5 25    (media voti 7.5, stagione di 25 allenamenti)
 *
 * Legge i valori da statistiche.js: cambia le costanti li' e rilancia
 * questo comando per vedere subito come si sposta la classifica.
 */

import {
    PESO_BASE,
    PESO_PRESENZA,
    VOTI_MV3,
    calcolaStatistiche,
    mediaFinale,
    mediaUltimi,
    classeMedia
} from "./statistiche.js";

const media = Number(process.argv[2]) || 7;
const stagione = Number(process.argv[3]) || 20;

const riga = (c) => c.join("").trimEnd();
const col = (v, n) => String(v).padEnd(n);
const num = (v, n) => String(v).padStart(n);

console.log("\nPARAMETRI ATTUALI (statistiche.js)");
console.log("  PESO_BASE      " + PESO_BASE + "   quota di voto che non dipende dalla presenza");
console.log("  PESO_PRESENZA  " + PESO_PRESENZA + "   quota che la presenza puo' far guadagnare");
console.log("  VOTI_MV3       " + VOTI_MV3 + "     quanti voti recenti entrano nell'MV3");

if (Math.abs(PESO_BASE + PESO_PRESENZA - 1) > 1e-9) {
    console.log("\n  ATTENZIONE: PESO_BASE + PESO_PRESENZA = " +
        (PESO_BASE + PESO_PRESENZA).toFixed(2) +
        ", diverso da 1.\n  Con presenza piena la MV non coincidera' con la media dei voti.");
}

/* ---------- effetto della presenza sulla MV ---------- */
console.log("\nMV ALLENAMENTI  (media voti " + media.toFixed(2) +
    ", stagione di " + stagione + " allenamenti)\n");
console.log(riga([col("Presenze", 12), col("Tasso", 9), num("MV", 7), "   Fascia colore"]));
console.log("  " + "-".repeat(46));

for (let p = stagione; p >= 0; p -= Math.max(1, Math.round(stagione / 5))) {
    const record = {
        presenze: p,
        disponibili: stagione,
        sommaVoti: media * Math.max(p, 1),
        conteggioVoti: Math.max(p, 1),
        storico: []
    };
    const mv = p === 0 ? 0 : mediaFinale(record, "allenamento");
    const fascia = classeMedia(mv).replace("media-", "") || "nessuna";
    console.log(riga([
        col("  " + p + "/" + stagione, 12),
        col(Math.round((p / stagione) * 100) + "%", 9),
        num(p === 0 ? "-" : mv.toFixed(2), 7),
        "   " + fascia
    ]));
}

/* ---------- quanto pesa una singola seduta ---------- */
const pesoSeduta = (PESO_PRESENZA * media) / stagione;
console.log("\nPESO DI UNA SINGOLA SEDUTA");
console.log("  venire o non venire sposta la MV di " + pesoSeduta.toFixed(3) +
    " punti (" + ((pesoSeduta / media) * 100).toFixed(1) + "% del voto)");
console.log("  formula: PESO_PRESENZA x mediaVoti / numeroAllenamenti");
console.log("  su una stagione piu' lunga la singola assenza pesa meno: e' un rapporto");

/* ---------- verifica sul motore vero, non sulla formula riscritta ---------- */
console.log("\nCONTROLLO SUL MOTORE DI CALCOLO");
const rosa = ["Sempre Presente", "Meta Presente"];
const eventi = [];
for (let i = 0; i < stagione; i++) {
    const giocatori = { "Sempre Presente": { voto: media, votoFinale: media } };
    if (i % 2 === 0) giocatori["Meta Presente"] = { voto: media, votoFinale: media };
    eventi.push({
        id: "a" + i,
        data: "2026-01-" + String((i % 28) + 1).padStart(2, "0"),
        timestamp: "2026-01-01T20:00:00.000Z",
        giocatori
    });
}
const { statsAll } = calcolaStatistiche(eventi, [], rosa);

rosa.forEach((nome) => {
    const r = statsAll[nome];
    console.log("  " + col(nome, 18) +
        "presenze " + col(r.presenze + "/" + r.disponibili, 8) +
        "MV " + num(mediaFinale(r, "allenamento").toFixed(2), 6) +
        "   MV" + VOTI_MV3 + " " + mediaUltimi(r).toFixed(2));
});

const pieno = mediaFinale(statsAll["Sempre Presente"], "allenamento");
console.log("\n  Con presenza piena la MV deve coincidere con la media dei voti: " +
    (Math.abs(pieno - media) < 1e-9 ? "OK" : "NO (" + pieno.toFixed(4) + " invece di " + media + ")"));
console.log("  La MV non deve mai superare la media dei voti: " +
    (pieno <= media + 1e-9 ? "OK" : "NO"));
console.log("");
