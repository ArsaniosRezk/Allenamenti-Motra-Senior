// statistiche.js - motore di calcolo, senza dipendenze dal DOM.
// Tenuto separato dal rendering: prima si calcola, poi si disegna.
// Essendo puro e' verificabile anche fuori dal browser.

/* =========================================================
   PARAMETRI
   ---------------------------------------------------------
   MV allenamenti = mediaVoti x (PESO_BASE + PESO_PRESENZA x tassoPresenza)
   Il risultato resta sempre nella scala 1-10: chi c'e' sempre tiene il
   voto pieno, chi non si presenta mai perde al massimo il 30%.
   La vecchia formula (bonus 5% per presenza, penalita' 10% per assenza)
   cresceva senza limite: a 20 allenamenti la media raddoppiava e a 10
   assenze si azzerava.

   MV partite = media pura dei voti effettivamente presi.
   S.V. = presente ma non sceso in campo: conta come presenza, non entra
   nella media e non porta minuti.

   Il tasso di presenza parte dal primo evento in cui il giocatore compare,
   cosi' chi si aggrega a stagione iniziata non eredita assenze altrui.
   ========================================================= */
export const PESO_BASE = 0.7;
export const PESO_PRESENZA = 0.3;
export const VOTI_MV3 = 3;

/* =========================================================
   HELPER SUGLI EVENTI
   ========================================================= */
export function dataEvento(ev) {
  if (ev.data) return ev.data;
  const t = new Date(ev.timestamp);
  return isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
}

export function tempoEvento(ev) {
  const t = new Date(ev.timestamp);
  return isNaN(t.getTime()) ? 0 : t.getTime();
}

/* Ordina per data dell'evento, non per momento del salvataggio:
   inserire in ritardo una partita vecchia non la manda in cima. */
export function confrontaCrescente(a, b) {
  const da = dataEvento(a);
  const db = dataEvento(b);
  if (da !== db) return da < db ? -1 : 1;
  return tempoEvento(a) - tempoEvento(b);
}

export function estraiVoto(dati) {
  const raw = dati && (dati.votoFinale !== undefined ? dati.votoFinale : dati.voto);
  if (raw === "S.V.") return { sv: true, valore: NaN };
  const n = parseFloat(raw);
  return { sv: false, valore: isNaN(n) ? NaN : n };
}

/* Nomi da considerare per un evento: la rosa attuale piu' eventuali
   giocatori presenti nello storico ma non piu' in rosa (altrimenti le
   loro presenze sparirebbero dalle statistiche e dalla cronologia). */
export function nomiEvento(ev, tipo, rosa) {
  const base = tipo === "allenamento" ? [...rosa] : [...rosa, "Squadra"];
  const noti = new Set(base);
  const extra = Object.keys(ev.giocatori || {}).filter(
    (n) => !noti.has(n) && !(tipo === "allenamento" && n === "Squadra")
  );
  return [...base, ...extra];
}

export function nuovoRecord() {
  return {
    presenze: 0,
    disponibili: 0, // eventi dal primo in cui il giocatore compare
    iniziato: false,
    sommaVoti: 0,
    conteggioVoti: 0,
    minuti: 0,
    sv: 0,
    storico: [] // ordine crescente
  };
}

/* =========================================================
   CALCOLO
   ---------------------------------------------------------
   Gli eventi vanno passati in ordine CRESCENTE (dal piu' vecchio):
   serve sia per le frecce di miglioramento sia per l'MV3.
   Come effetto collaterale annota su ogni evento `_frecce`.
   ========================================================= */
export function calcolaStatistiche(allenamentiCrescenti, partiteCrescenti, rosa) {
  const statsAll = {};
  const statsPar = {};
  const rec = (obj, nome) => (obj[nome] = obj[nome] || nuovoRecord());

  // Tutta la rosa compare in tabella anche senza presenze
  rosa.forEach((n) => {
    rec(statsAll, n);
    rec(statsPar, n);
  });
  rec(statsPar, "Squadra");

  const ultimoVotoAll = {};
  const ultimoVotoPar = {};

  allenamentiCrescenti.forEach((ev) => {
    ev._frecce = {};
    nomiEvento(ev, "allenamento", rosa).forEach((nome) => {
      if (nome === "Squadra") return;
      const r = rec(statsAll, nome);
      const dati = ev.giocatori && ev.giocatori[nome];

      if (dati) r.iniziato = true;
      if (r.iniziato) r.disponibili++;
      if (!dati) return;

      r.presenze++;
      const { valore, sv } = estraiVoto(dati);
      if (sv) r.sv++;

      if (!isNaN(valore)) {
        r.sommaVoti += valore;
        r.conteggioVoti++;
        const prec = ultimoVotoAll[nome];
        if (prec !== undefined && valore !== prec) {
          ev._frecce[nome] = valore > prec ? "su" : "giu";
        }
        ultimoVotoAll[nome] = valore;
      }

      r.storico.push({
        tipo: "allenamento",
        data: dataEvento(ev),
        voto: valore,
        sv,
        commento: dati.commento || ""
      });
    });
  });

  partiteCrescenti.forEach((ev) => {
    ev._frecce = {};
    // Una partita con la sola formazione salvata non produce statistiche
    if (!ev.giocatori || Object.keys(ev.giocatori).length === 0) return;

    nomiEvento(ev, "partita", rosa).forEach((nome) => {
      const r = rec(statsPar, nome);
      const dati = ev.giocatori[nome];

      if (dati) r.iniziato = true;
      if (r.iniziato) r.disponibili++;
      if (!dati) return;

      r.presenze++;
      const { valore, sv } = estraiVoto(dati);

      if (sv) {
        // Presente ma senza voto: nessun contributo a media e minuti.
        // Il controllo vale anche per i vecchi record, dove i S.V.
        // erano salvati con 1 minuto.
        r.sv++;
      } else {
        if (!isNaN(valore)) {
          r.sommaVoti += valore;
          r.conteggioVoti++;
          const prec = ultimoVotoPar[nome];
          if (prec !== undefined && valore !== prec) {
            ev._frecce[nome] = valore > prec ? "su" : "giu";
          }
          ultimoVotoPar[nome] = valore;
        }
        r.minuti += Number(dati.minuti) || 0;
      }

      r.storico.push({
        tipo: "partita",
        data: dataEvento(ev),
        voto: valore,
        sv,
        minuti: sv ? 0 : Number(dati.minuti) || 0,
        commento: dati.commento || ""
      });
    });
  });

  return { statsAll, statsPar };
}

/* =========================================================
   MEDIE
   ========================================================= */
export function mediaVoti(r) {
  return r.conteggioVoti > 0 ? r.sommaVoti / r.conteggioVoti : 0;
}

export function tassoPresenza(r) {
  return r.disponibili > 0 ? r.presenze / r.disponibili : 0;
}

export function mediaFinale(r, tipo) {
  const base = mediaVoti(r);
  if (base === 0) return 0;
  if (tipo === "partita") return base; // media pura, nessuna correzione
  return base * (PESO_BASE + PESO_PRESENZA * tassoPresenza(r));
}

export function mediaUltimi(r, quanti) {
  const n = quanti || VOTI_MV3;
  const validi = r.storico.filter((v) => !v.sv && !isNaN(v.voto)).slice(-n);
  if (validi.length === 0) return NaN;
  return validi.reduce((acc, v) => acc + v.voto, 0) / validi.length;
}

export function classeMedia(valore, soft) {
  if (isNaN(valore) || valore <= 0) return "";
  const suffisso = soft ? "-soft" : "";
  if (valore < 6) return "media-bassa" + suffisso;
  if (valore < 7) return "media-media" + suffisso;
  if (valore < 8) return "media-buona" + suffisso;
  return "media-alta" + suffisso;
}
