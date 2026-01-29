// utils.js

export function mostraAvviso(messaggio, tipo = "success") {
    const avviso = document.getElementById("avviso");
    if (!avviso) return;

    avviso.textContent = messaggio;
    avviso.className = tipo; // 'success' o 'error' definito in CSS
    avviso.style.display = "block";

    setTimeout(() => {
        avviso.style.display = "none";
    }, 3000);
}

export function condividiImmagine(blob, nomeFile) {
    const file = new File([blob], nomeFile, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator
            .share({
                files: [file],
                title: "Condividi Immagine",
                text: "Ecco l'immagine!",
            })
            .catch((err) => console.error("Errore condivisione:", err));
    } else {
        // Fallback download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = nomeFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
