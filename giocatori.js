import { ID_SQUADRA } from "./utils.js";

// Mutable array exported - importers will see updates to this binding
export let giocatori = [];

export async function caricaGiocatori() {
  try {
    const snapshot = await firebaseDB.ref(`${ID_SQUADRA}/rosa`).once('value');
    const data = snapshot.val();

    if (data) {
      // Convert object/list to array of names
      const lista = Object.values(data);
      // Sort alphabetically
      lista.sort();

      // Clear and populate array
      giocatori.length = 0;
      giocatori.push(...lista);
      console.log("Rosa caricata:", giocatori.length, "giocatori");
    } else {
      console.warn("Nessun giocatore trovato nel database (senior/rosa). Usare lista vuota.");
      giocatori.length = 0;
    }
    return giocatori;
  } catch (error) {
    console.error("Errore caricamento rosa:", error);
    return [];
  }
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

// 2. Funzione che calcola la "Radice" del nome
function getNomeBase(fullName) {
  const [nomeReal, cognome] = fullName.split(" ");
  if (!cognome) return nomeReal; // Case "Squadra"

  // Check manual exceptions first
  if (NICKNAMES[nomeReal]) return NICKNAMES[nomeReal];

  // Automatic Rule:
  // - Length <= 5: Keep full name (e.g. "Mina", "Bisho", "Marco", "Amir")
  // - Length > 5: Truncate to 4 chars (e.g. "Riccardo" -> "Ricc")
  if (nomeReal.length <= 5) {
    return nomeReal;
  } else {
    return nomeReal.substring(0, 3);
  }
}

// 3. Logica "Smart" per calcolare l'abbreviazione unica
function getUniqueAbbreviation(targetFullName, mode = "formazione") {
  const targetBase = getNomeBase(targetFullName);
  const [targetName, targetSurname] = targetFullName.split(" ");

  // Find collisions
  const others = giocatori.filter(g => g !== targetFullName).map(g => {
    return {
      fullName: g,
      base: getNomeBase(g),
      surname: g.split(" ")[1] || ""
    };
  });

  // Level 1: Check if Base Name is unique
  // (In "formazione" mode, we want the shortest possible. In "standard" mode, we want Name + Initial usually)
  const exactBaseMatches = others.filter(o => o.base === targetBase);

  if (mode === "formazione") {
    // If strict uniqueness is found just with the name, return it
    if (exactBaseMatches.length === 0) return targetBase;
  }

  // Level 2: Try Base + 1st letter of Surname
  const myLevel2 = `${targetBase} ${targetSurname.charAt(0)}`;
  const level2Conflicts = exactBaseMatches.filter(o =>
    `${o.base} ${o.surname.charAt(0)}` === myLevel2
  );

  if (level2Conflicts.length === 0) {
    if (mode === "formazione") return `${targetBase} ${targetSurname.charAt(0)}`;
    // In standard mode, we prefer "Name S" style always, unless we forced a nickname that implies uniqueness?
    // Actually, standard usually prefers "Ale B", "Mina M". 
    // If the user wants "Mina" for formation but "Mina M" for lists, we handle it here.
    return `${targetBase} ${targetSurname.charAt(0)}`;
  }

  // Level 3: Base + 3 letters of Surname (e.g. "Kiro You")
  const surname3 = targetSurname.substring(0, 3);
  return `${targetBase} ${surname3}`;
}

export function abbreviaNome(nome) {
  if (!nome) return "";
  if (nome === "Squadra") return "Squadra";

  // Per la cronologia vogliamo "Nome Intero + Cognome Puntato"
  // Es. "Matteo Boles" -> "Matteo B"
  const [nomeReal, cognome] = nome.split(" ");
  if (!cognome) return nomeReal;

  return `${nomeReal} ${cognome.charAt(0)}`;
}

export function abbreviaNomeFormazione(nome) {
  if (!nome) return "";
  if (nome === "Squadra") return "Squadra";
  return getUniqueAbbreviation(nome, "formazione");
}
