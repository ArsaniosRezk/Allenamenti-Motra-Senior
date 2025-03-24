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
  "Ishak Salib",
  "Kirollos Salib",
  "Kirolos Shehata",
  "Kirullos Soliman",
  "Matteo Boles",
  "Peter Melek",
  "Tamer Mekkar",
];

// Statistiche da calcolare
const stats = {};
giocatori.forEach((nome) => {
  stats[nome] = { presenze: 0, sommaVoti: 0, media: 0 };
});

firebaseDB.ref("allenamenti").once("value", (snapshot) => {
  const allenamenti = snapshot.val();
  if (!allenamenti) {
    storicoDiv.innerHTML = "<p>Nessun allenamento registrato.</p>";
    return;
  }

  // Ottieni chiavi + dati
  const chiaviAllenamenti = Object.keys(allenamenti);
  const allenamentiArray = chiaviAllenamenti
    .map((key) => ({
      id: key,
      ...allenamenti[key],
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  allenamentiArray.forEach((all, idx) => {
    const isFirst = false; // Nessun allenamento aperto di default

    const data = new Date(all.timestamp).toLocaleDateString("it-IT");

    const container = document.createElement("div");
    container.className = "allenamento";
    container.style.borderTop = "1px solid #ccc";
    container.style.padding = "8px 0";

    // HEADER
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "5px 0";
    header.style.cursor = "pointer";

    // Data
    const label = document.createElement("span");
    label.textContent = data;

    // Toggle ➕/➖
    const toggleIcon = document.createElement("span");
    toggleIcon.textContent = isFirst ? "−" : "+";
    toggleIcon.style.marginLeft = "10px";
    toggleIcon.style.pointerEvents = "auto";

    // LeftGroup = data + toggle
    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";
    leftGroup.style.gap = "10px";
    leftGroup.style.flex = "1";
    leftGroup.appendChild(label);
    leftGroup.appendChild(toggleIcon);

    // Bottone Elimina 🗑️
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Elimina allenamento";
    deleteBtn.style.marginTop = "10px";
    deleteBtn.style.backgroundColor = "#ffe5e5"; // rosso chiarissimo
    deleteBtn.style.border = "1px solid #ff9999";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.padding = "6px 12px";
    deleteBtn.style.color = "#a30000";
    deleteBtn.style.fontSize = "14px";
    deleteBtn.style.cursor = "pointer";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita apertura toggle
      if (confirm("Sei sicuro di voler eliminare questo allenamento?")) {
        firebaseDB
          .ref("allenamenti")
          .child(all.id)
          .remove()
          .then(() => location.reload());
      }
    });

    // Header completo
    header.appendChild(leftGroup);

    // Dettaglio
    const dettaglio = document.createElement("div");
    dettaglio.style.display = isFirst ? "block" : "none";
    dettaglio.style.paddingLeft = "10px";

    const ul = document.createElement("ul");

    giocatori.forEach((nome) => {
      const presente = all.giocatori && all.giocatori[nome] !== undefined;
      const voto = all.giocatori?.[nome]?.voto;
      const li = document.createElement("li");

      if (presente) {
        li.textContent = `${nome}: Voto ${isNaN(voto) ? "-" : voto}`;
        stats[nome].presenze += 1;
        if (!isNaN(voto)) {
          stats[nome].sommaVoti += voto;
        }
      } else {
        li.textContent = `${nome}: assente`;
      }

      ul.appendChild(li);
    });

    dettaglio.appendChild(ul);
    dettaglio.appendChild(deleteBtn);

    // Toggle mostra/nascondi
    header.addEventListener("click", () => {
      const aperto = dettaglio.style.display === "block";
      dettaglio.style.display = aperto ? "none" : "block";
      toggleIcon.textContent = aperto ? "+" : "−";
    });

    container.appendChild(header);
    container.appendChild(dettaglio);
    storicoDiv.appendChild(container);
  });

  // Calcola e mostra statistiche
  let statsHTML = `
    <table border="1" cellpadding="6" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>Giocatore</th>
          <th>Presenze</th>
          <th>Media Voto</th>
        </tr>
      </thead>
      <tbody>
  `;

  giocatori.forEach((nome) => {
    const s = stats[nome];
    s.media = s.presenze > 0 ? (s.sommaVoti / s.presenze).toFixed(2) : "-";
    statsHTML += `
      <tr>
        <td>${nome}</td>
        <td>${s.presenze}</td>
        <td>${s.media}</td>
      </tr>
    `;
  });

  statsHTML += "</tbody></table>";
  statsDiv.innerHTML = statsHTML;
});
