const storicoDiv = document.getElementById("storicoContainer");
const statsDiv = document.getElementById("statisticheContainer");

// Giocatori fissi
const giocatori = [
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
  "Mino Basem",
  "Peter Melek",
  "Tamer Mekkar",
  "Squadra",
];

// Statistiche separate
const statsAllenamento = {};
const statsPartita = {};
const ultimoVotoAllenamento = {};
const ultimoVotoPartita = {};
let numeroAllenamenti = 0;
const assenzeAllenamento = {};

const eccezioniAssenze = [];

const giocatoriSenzaSquadra = giocatori.filter((g) => g !== "Squadra");

giocatori.forEach((nome) => {
  statsAllenamento[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
  statsPartita[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
  assenzeAllenamento[nome] = 0;
});

firebaseDB.ref("allenamenti").once("value", (snapshot) => {
  const allenamenti = snapshot.val();
  if (!allenamenti) {
    storicoDiv.innerHTML = "<p>Nessun allenamento o partita registrata.</p>";
    return;
  }

  const chiaviAllenamenti = Object.keys(allenamenti);
  const allenamentiArray = chiaviAllenamenti
    .map((key) => ({ id: key, ...allenamenti[key] }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const titoloCrono = document.createElement("h3");
  titoloCrono.textContent = "Cronologia";

  allenamentiArray.forEach((all) => {
    const tipo = all.tipo || "allenamento";
    if (tipo === "allenamento") numeroAllenamenti++;

    const tipoCapitalizzato = tipo.charAt(0).toUpperCase() + tipo.slice(1);

    let data = all.data || new Date(all.timestamp).toLocaleDateString("it-IT");
    if (all.data) {
      const [yyyy, mm, dd] = all.data.split("-");
      data = `${dd}/${mm}/${yyyy}`;
    }

    const container = document.createElement("div");
    container.style.padding = "8px 0";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "5px 0";
    header.style.cursor = "pointer";

    const label = document.createElement("span");
    label.textContent = `${tipoCapitalizzato} ${data}`;

    const toggleIcon = document.createElement("span");
    toggleIcon.textContent = "+";
    toggleIcon.style.marginLeft = "10px";
    toggleIcon.style.pointerEvents = "auto";

    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";
    leftGroup.style.gap = "10px";
    leftGroup.style.flex = "1";
    leftGroup.appendChild(label);
    leftGroup.appendChild(toggleIcon);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Elimina";
    deleteBtn.style.marginTop = "10px";
    deleteBtn.style.backgroundColor = "#ffe5e5";
    deleteBtn.style.border = "1px solid #ff9999";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.padding = "6px 12px";
    deleteBtn.style.color = "#a30000";
    deleteBtn.style.fontSize = "14px";
    deleteBtn.style.cursor = "pointer";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Sei sicuro di voler eliminare questo elemento?")) {
        firebaseDB
          .ref("allenamenti")
          .child(all.id)
          .remove()
          .then(() => location.reload());
      }
    });

    header.appendChild(leftGroup);

    const dettaglio = document.createElement("div");
    dettaglio.style.display = "none";
    dettaglio.style.paddingLeft = "0";

    const ul = document.createElement("ul");
    ul.style.paddingLeft = "0";

    giocatori.forEach((nome) => {
      if (tipo === "allenamento" && nome === "Squadra") return;
      const presente = all.giocatori && all.giocatori[nome] !== undefined;
      const voto =
        all.giocatori?.[nome]?.votoFinale ?? all.giocatori?.[nome]?.voto;
      const commento = all.giocatori?.[nome]?.commento || "";
      const li = document.createElement("li");
      li.style.listStylePosition = "inside";

      let nomeFinale;
      if (nome === "Kirolos Shehata") nomeFinale = "Kiro She";
      else if (nome === "Kirullos Soliman") nomeFinale = "Kiro Sol";
      else if (nome === "Kirollos Youssef") nomeFinale = "Kiro You";
      else {
        const cognome = nome.split(" ")[1] || "";
        const abbreviazione = `${nome.split(" ")[0]} ${cognome.slice(0, 1)}`;
        const omonimi = giocatori.filter(
          (g) => g.split(" ")[0] === nome.split(" ")[0]
        );
        nomeFinale =
          omonimi.length > 1
            ? `${nome.split(" ")[0]} ${cognome.slice(0, 1)}`
            : abbreviazione;
      }

      if (presente) {
        const ultimoVoti =
          tipo === "partita" ? ultimoVotoPartita : ultimoVotoAllenamento;
        const votoPrecedente = ultimoVoti[nome];

        let freccia = "";
        let colore = "black";

        if (!isNaN(voto) && !isNaN(votoPrecedente)) {
          if (voto > votoPrecedente) {
            freccia = "⬆︎";
            colore = "green";
          } else if (voto < votoPrecedente) {
            freccia = "⬇︎";
            colore = "red";
          }
        }

        ultimoVoti[nome] = voto;

        li.innerHTML = `<strong>${nomeFinale}</strong> ${
          isNaN(voto) ? "-" : voto
        } <span style="color:${colore}; font-family: monospace; font-weight: bold;">${freccia}</span>: ${commento}`;

        const targetStats =
          tipo === "partita" ? statsPartita[nome] : statsAllenamento[nome];
        targetStats.presenze += 1;
        if (!isNaN(voto)) {
          targetStats.sommaVoti += voto;
        }
      } else {
        li.innerHTML = `<strong>${nomeFinale}</strong>: assente`;
        if (tipo === "allenamento") assenzeAllenamento[nome]++;
      }

      ul.appendChild(li);
    });

    dettaglio.appendChild(ul);
    dettaglio.appendChild(deleteBtn);

    header.addEventListener("click", () => {
      const aperto = dettaglio.style.display === "block";
      dettaglio.style.display = aperto ? "none" : "block";
      toggleIcon.textContent = aperto ? "+" : "−";
    });

    container.appendChild(header);
    container.appendChild(dettaglio);
    storicoDiv.prepend(container);
  });

  storicoDiv.prepend(titoloCrono);

  const buildStatsTable = (statsObj, titolo) => {
    const ordinati = Object.entries(statsObj)
      .filter(
        ([nome]) => nome !== "Squadra" || titolo !== "Statistiche Allenamenti"
      )
      .map(([nome, dati]) => {
        const mediaBase =
          dati.presenze > 0 ? dati.sommaVoti / dati.presenze : 0;
        let penalita = 0;
        if (nome !== "Squadra") {
          const assenze = assenzeAllenamento[nome] || 0;
          penalita =
            Math.max(0, assenze - (eccezioniAssenze.includes(nome) ? 1 : 0)) *
            0.1;
        }

        const mediaPenalizzata = mediaBase * (1 - penalita);
        const bonus = dati.presenze * 0.05 * mediaBase;
        const media = mediaPenalizzata + bonus;

        return { nome, ...dati, media };
      })
      .sort((a, b) => b.media - a.media);

    let html = `<h3>${titolo}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 15px; border-radius: 5px; overflow: hidden;">
        <thead style="background-color: #e0e0e0;">
          <tr>
            <th style="text-align: left; padding: 10px;">Giocatore</th>
            <th style="text-align: center; padding: 10px;">Presenze</th>
            <th style="text-align: center; padding: 10px;">Media Voto</th>
          </tr>
        </thead>
        <tbody>`;

    ordinati.forEach((dati, i) => {
      const colore =
        dati.presenze === 0
          ? ""
          : dati.media < 6
          ? "#f8c1c1"
          : dati.media < 7
          ? "#fff6c1"
          : dati.media < 8
          ? "#d0f2c1"
          : "#a0f2a0";
      html += `
        <tr style="background-color: ${i % 2 === 0 ? "#f9f9f9" : "#fff"};">
          <td style="padding: 10px;">${dati.nome}</td>
          <td style="text-align: center;">${dati.presenze}</td>
          <td style="text-align: center; background-color: ${colore};">${
        dati.presenze === 0 ? "-" : dati.media.toFixed(2)
      }</td>
        </tr>`;
    });

    html += "</tbody></table><br/>";
    return html;
  };

  statsDiv.innerHTML =
    buildStatsTable(statsAllenamento, "Statistiche Allenamenti") +
    buildStatsTable(statsPartita, "Statistiche Partite");
});
