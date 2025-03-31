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
