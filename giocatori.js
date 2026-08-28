import { ID_SQUADRA } from "./utils.js";

// Array mutabile esportato: gli import vedono gli aggiornamenti
export let giocatori = [];

export async function caricaGiocatori() {
  try {
    const snapshot = await window.firebaseDB.ref(`${ID_SQUADRA}/rosa`).once("value");
    const data = snapshot.val();

    giocatori.length = 0;

    if (data) {
      const lista = Object.values(data)
        .filter((n) => typeof n === "string" && n.trim() !== "")
        .map((n) => n.trim());
      lista.sort((a, b) => a.localeCompare(b, "it"));
      giocatori.push(...lista);
    } else {
      console.warn(`Nessun giocatore trovato in ${ID_SQUADRA}/rosa. Lista vuota.`);
    }
    return giocatori;
  } catch (error) {
    console.error("Errore caricamento rosa:", error);
    giocatori.length = 0;
    return giocatori;
  }
}

/* Divide un nome completo in nome proprio + cognome.
   Gestisce anche i nomi composti: "Anna Maria Rossi" -> ["Anna", "Maria Rossi"] */
function separaNome(nomeCompleto) {
  const parti = String(nomeCompleto || "").trim().split(/\s+/);
  const nome = parti[0] || "";
  const cognome = parti.slice(1).join(" ");
  return [nome, cognome];
}

// 1. Dizionario per le eccezioni manuali (Soprannomi)
const NICKNAMES = {
  "Antonio": "Anto",
  "Antonios": "Anto",
  "Kirollos": "Kiro",
  "Kirolos": "Kiro",
  "Kirullos": "Kiro",
  "Matteo": "Teo",
  "Arsanios": "Arso"
};

// 2. Funzione che calcola la "radice" del nome
function getNomeBase(fullName) {
  const [nomeReal, cognome] = separaNome(fullName);
  if (!cognome) return nomeReal; // Caso "Squadra" o giocatore senza cognome

  // Prima le eccezioni manuali
  if (NICKNAMES[nomeReal]) return NICKNAMES[nomeReal];

  // Regola automatica:
  // - fino a 5 lettere: nome intero (es. "Mina", "Bisho", "Marco", "Amir")
  // - oltre 5 lettere: troncato a 3 (es. "Riccardo" -> "Ric")
  return nomeReal.length <= 5 ? nomeReal : nomeReal.substring(0, 3);
}

// 3. Logica "smart" per calcolare l'abbreviazione piu corta ma univoca
function getUniqueAbbreviation(targetFullName, mode = "formazione") {
  const targetBase = getNomeBase(targetFullName);
  const [, targetSurname] = separaNome(targetFullName);

  // Senza cognome non c'e' nulla da disambiguare
  if (!targetSurname) return targetBase;

  const others = giocatori
    .filter((g) => g !== targetFullName)
    .map((g) => ({
      base: getNomeBase(g),
      surname: separaNome(g)[1]
    }));

  // Livello 1: la sola radice del nome e' gia' univoca
  const collisioni = others.filter((o) => o.base === targetBase);
  if (mode === "formazione" && collisioni.length === 0) return targetBase;

  // Livello 2: radice + iniziale del cognome
  const livello2 = `${targetBase} ${targetSurname.charAt(0)}`;
  const conflitti2 = collisioni.filter(
    (o) => `${o.base} ${o.surname.charAt(0)}` === livello2
  );
  if (conflitti2.length === 0) return livello2;

  // Livello 3: radice + prime 3 lettere del cognome (es. "Kiro You")
  return `${targetBase} ${targetSurname.substring(0, 3)}`;
}

/* Per cronologia e tabelle: "Nome Intero + iniziale cognome"
   Es. "Matteo Boles" -> "Matteo B" */
export function abbreviaNome(nome) {
  if (!nome) return "";
  if (nome === "Squadra") return "Squadra";

  const [nomeReal, cognome] = separaNome(nome);
  if (!cognome) return nomeReal;

  return `${nomeReal} ${cognome.charAt(0)}`;
}

/* Per il campo di gioco: la forma piu corta possibile che resti univoca */
export function abbreviaNomeFormazione(nome) {
  if (!nome) return "";
  if (nome === "Squadra") return "Squadra";
  return getUniqueAbbreviation(nome, "formazione");
}
