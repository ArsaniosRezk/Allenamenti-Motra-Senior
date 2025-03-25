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
  "Bisho Ekram",
  "Ishak Salib",
  "Kirollos Salib",
  "Kirolos Shehata",
  "Kirullos Soliman",
  "Marco Salib",
  "Matteo Boles",
  "Mino Basem",
  "Peter Melek",
  "Tamer Mekkar",
];

// Statistiche separate
const statsAllenamento = {};
const statsPartita = {};

giocatori.forEach((nome) => {
  statsAllenamento[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
  statsPartita[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
});

firebaseDB.ref("allenamenti").once("value", (snapshot) => {
  const allenamenti = snapshot.val();
  if (!allenamenti) {
    storicoDiv.innerHTML = "<p>Nessun allenamento o partita registrata.</p>";
    return;
  }

  // Ordina per data
  const chiaviAllenamenti = Object.keys(allenamenti);
  const allenamentiArray = chiaviAllenamenti
    .map((key) => ({
      id: key,
      ...allenamenti[key],
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Sezione CRONOLOGIA (tutti)
  const titoloCrono = document.createElement("h3");
  titoloCrono.textContent = "Cronologia";
  storicoDiv.appendChild(titoloCrono);

  allenamentiArray.forEach((all) => {
    const tipo = all.tipo || "allenamento";
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
    dettaglio.style.paddingLeft = "10px";

    const ul = document.createElement("ul");
    giocatori.forEach((nome) => {
      const presente = all.giocatori && all.giocatori[nome] !== undefined;
      const voto = all.giocatori?.[nome]?.voto;
      const li = document.createElement("li");

      if (presente) {
        li.textContent = `${nome}: Voto ${isNaN(voto) ? "-" : voto}`;

        // Statistiche separate
        const targetStats =
          tipo === "partita" ? statsPartita[nome] : statsAllenamento[nome];
        targetStats.presenze += 1;
        if (!isNaN(voto)) {
          targetStats.sommaVoti += voto;
        }
      } else {
        li.textContent = `${nome}: assente`;
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
    storicoDiv.appendChild(container);
  });

  // Tabelle statistiche
  const buildStatsTable = (statsObj, titolo) => {
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

    giocatori.forEach((nome) => {
      const s = statsObj[nome];
      s.media = s.presenze > 0 ? (s.sommaVoti / s.presenze).toFixed(2) : "-";
      html += `
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 10px;">${nome}</td>
          <td style="text-align: center;">${s.presenze}</td>
          <td style="text-align: center;">${s.media}</td>
        </tr>`;
    });

    html += "</tbody></table><br/>";
    return html;
  };

  statsDiv.innerHTML =
    buildStatsTable(statsAllenamento, "Statistiche Allenamenti") +
    buildStatsTable(statsPartita, "Statistiche Partite");
});
