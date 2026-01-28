export function mostraAvviso(msg, tipo = "success") {
  if (!document.getElementById("avviso")) {
    const avviso = document.createElement("div");
    avviso.id = "avviso";
    document.body.appendChild(avviso);
  }

  const avviso = document.getElementById("avviso");
  avviso.textContent = msg;

  avviso.classList.remove("success", "error");
  avviso.classList.add(tipo);
  avviso.style.display = "block";

  setTimeout(() => {
    avviso.style.display = "none";
  }, 2000);
}

export async function condividiImmagine(blob, nomeFile = "immagine.png") {
  const file = new File([blob], nomeFile, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Condividi Immagine",
        text: "Ecco le statistiche!",
      });
      mostraAvviso("Condiviso con successo", "success");
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Errore condivisione:", error);
        mostraAvviso("Errore condivisione, provo a copiare...", "error");
        copiaInClipboard(blob);
      }
    }
  } else {
    copiaInClipboard(blob);
  }
}

function copiaInClipboard(blob) {
  navigator.clipboard
    .write([new ClipboardItem({ "image/png": blob })])
    .then(() => mostraAvviso("Copiato come immagine", "success"))
    .catch(() => mostraAvviso("Errore nella copia", "error"));
}
