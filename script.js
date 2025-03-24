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

const firebaseDB = window.firebaseDB; // 👉 QUESTA È ESSENZIALE

const giocatoriListDiv = document.getElementById("giocatoriList");

// Crea dinamicamente la lista dei giocatori
giocatori.forEach((nome, index) => {
  const div = document.createElement("div");
  div.className = "giocatore";
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.marginBottom = "10px";

  let options = '<option value="">-</option>';
  for (let v = 1.0; v <= 10.0; v += 0.25) {
    const voto = v.toFixed(2).replace(".00", ""); // mostra 6 invece di 6.00
    options += `<option value="${voto}">${voto}</option>`;
  }

  div.innerHTML = `
    <span style="flex: 1;">${nome}</span>
    <label class="switch">
      <input type="checkbox" name="presenza" data-index="${index}">
      <span class="slider round"></span>
    </label>
    <select name="voto" data-index="${index}" style="margin-left: 10px;">
      ${options}
    </select>
  `;

  giocatoriListDiv.appendChild(div);
});

document
  .getElementById("allenamentoForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const presenze = document.querySelectorAll('input[name="presenza"]');
    const voti = document.querySelectorAll('input[name="voto"]');
    const dataAllenamento = document.getElementById("dataAllenamento").value;

    const allenamento = {
      data: dataAllenamento,
      timestamp: new Date().toISOString(), // utile se vuoi comunque tenerlo
      giocatori: {},
    };

    giocatori.forEach((nome, index) => {
      const presenzaInput = document.querySelector(
        `input[name="presenza"][data-index="${index}"]`
      );
      const votoSelect = document.querySelector(
        `select[name="voto"][data-index="${index}"]`
      );

      if (presenzaInput && presenzaInput.checked) {
        const voto = parseFloat(votoSelect?.value);

        allenamento.giocatori[nome] = {
          voto: isNaN(voto) ? null : voto,
        };
      }
    });

    // Verifica che ci sia almeno un giocatore presente
    if (Object.keys(allenamento.giocatori).length === 0) {
      document.getElementById("messaggio").textContent =
        "Nessun giocatore presente: allenamento non salvato.";
      return;
    }

    // Salva su Firebase
    try {
      await firebaseDB.ref("allenamenti").push(allenamento);
      document.getElementById("messaggio").textContent = "Allenamento salvato!";
      document.getElementById("allenamentoForm").reset();
    } catch (err) {
      console.error("Errore nel salvataggio:", err);
      document.getElementById("messaggio").textContent =
        "Errore nel salvataggio.";
    }
  });
