export const giocatori = [
  "Alessandro Botrous",
  "Alessandro Tawadrous",
  "Amir Atef",
  "Antonios Girgis",
  "Armia Rezk",
  "Arsanios Rezk",
  "Bisho Karim",
  "Ishak Salib",
  "Kirollos Youssef",
  "Kirolos Shehata",
  "Kirullos Soliman",
  "Marco Salib",
  "Matteo Boles",
  "Mina Makram",
  "Mino Basem",
  "Peter Melek",
  "Tamer Mekkar",
];

export function abbreviaNome(nome) {
  if (nome === "Kirolos Shehata") return "Kiro She";
  if (nome === "Kirullos Soliman") return "Kiro Sol";
  if (nome === "Kirollos Youssef") return "Kiro You";

  const [nomeG, cognome] = nome.split(" ");
  if (!cognome) return nomeG; // es. "Squadra"
  return `${nomeG} ${cognome.charAt(0)}`;
}

export function abbreviaNomeFormazione(nome) {
  if (nome === "Alessandro Botrous") return "Ale B";
  if (nome === "Alessandro Tawadrous") return "Ale T";
  if (nome === "Amir Atef") return "Amir";
  if (nome === "Antonios Girgis") return "Anto";
  if (nome === "Armia Rezk") return "Armia";
  if (nome === "Arsanios Rezk") return "Arso";
  if (nome === "Bisho Karim") return "Bisho";
  if (nome === "Ishak Salib") return "Ishak";
  if (nome === "Kirolos Shehata") return "Kiro She";
  if (nome === "Kirullos Soliman") return "Kiro Sol";
  if (nome === "Kirollos Youssef") return "Kiro You";
  if (nome === "Marco Salib") return "Marco";
  if (nome === "Matteo Boles") return "Matteo";
  if (nome === "Mina Makram") return "Mina";
  if (nome === "Mino Basem") return "Mino";
  if (nome === "Peter Melek") return "Peter";
  if (nome === "Tamer Mekkar") return "Tamer";

  const [nomeG, cognome] = nome.split(" ");
  if (!cognome) return nomeG; // es. "Squadra"
  return `${nomeG} ${cognome.charAt(0)}`;
}
