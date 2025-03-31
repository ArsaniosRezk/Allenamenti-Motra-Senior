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
