/* sw.js - service worker della PWA
   Strategia:
   - HTML / JS / CSS  -> network-first (la versione online vince sempre,
     la cache serve solo da rete di sicurezza offline).
     Con il vecchio cache-first ogni deploy restava invisibile sui
     telefoni che avevano gia' aperto l'app almeno una volta.
   - immagini, font e librerie da CDN -> cache-first (non cambiano mai).
   - richieste al Realtime Database -> mai intercettate.
*/

const VERSIONE = "v4";  // v4: icona ridisegnata, va invalidata la cache statica
const CACHE_SHELL = "motra-shell-" + VERSIONE;
const CACHE_STATICI = "motra-statici-" + VERSIONE;
const CACHE_ATTUALI = [CACHE_SHELL, CACHE_STATICI];

const SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./colors.css",
    "./index.js",
    "./router.js",
    "./statistiche.js",
    "./partita_spa.js",
    "./allenamenti_spa.js",
    "./giocatori.js",
    "./utils.js",
    "./manifest.json",
    "./manifest-sant-antonio.json",
    "./manifest-santa-maria.json"
];

/* Va nella cache dei STATICI, non in quella della shell: il fetch handler
   smista le immagini per estensione e le cerca solo li'. Metterla nella
   shell equivarrebbe a non precaricarla affatto. */
const STATICI = ["./immagini/favicon.svg"];

// Host esterni di cui vale la pena tenere una copia locale
const CDN_CONSENTITI = [
    "cdnjs.cloudflare.com",
    "www.gstatic.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com"
];

// addAll fallisce in blocco se un solo file non risponde: meglio uno per uno
function precarica(nomeCache, urls) {
    return caches.open(nomeCache).then((cache) =>
        Promise.all(
            urls.map((url) =>
                cache.add(url).catch((err) => console.warn("[SW] salto", url, err))
            )
        )
    );
}

/* Niente skipWaiting: il nuovo worker resta in attesa finche' la pagina
   non viene ricaricata. E' quello che index.js promette all'utente con
   "Aggiornamento disponibile: ricarica la pagina" - attivandolo subito
   la pagina finiva controllata dal worker nuovo mentre eseguiva ancora
   il JavaScript vecchio. */
self.addEventListener("install", (event) => {
    event.waitUntil(
        Promise.all([
            precarica(CACHE_SHELL, SHELL),
            precarica(CACHE_STATICI, STATICI)
        ])
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((chiavi) =>
                Promise.all(
                    chiavi
                        .filter((k) => !CACHE_ATTUALI.includes(k))
                        .map((k) => caches.delete(k))
                )
            )
        ])
    );
});

function isStatico(url) {
    return /\.(svg|png|jpe?g|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname);
}

async function networkFirst(request, nomeCache) {
    const cache = await caches.open(nomeCache);
    try {
        const risposta = await fetch(request);
        if (risposta && risposta.ok) cache.put(request, risposta.clone());
        return risposta;
    } catch (err) {
        const salvata = await cache.match(request);
        if (salvata) return salvata;
        // Navigazione offline verso una rotta qualsiasi: si serve la shell
        if (request.mode === "navigate") {
            const shell = await cache.match("./index.html");
            if (shell) return shell;
        }
        throw err;
    }
}

async function cacheFirst(request, nomeCache) {
    const cache = await caches.open(nomeCache);
    const salvata = await cache.match(request);
    if (salvata) return salvata;

    const risposta = await fetch(request);
    // Le risposte opache (CDN senza CORS) hanno status 0 ma sono comunque utili
    if (risposta && (risposta.ok || risposta.type === "opaque")) {
        cache.put(request, risposta.clone());
    }
    return risposta;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    let url;
    try {
        url = new URL(request.url);
    } catch (err) {
        return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return;

    const stessaOrigine = url.origin === self.location.origin;

    if (!stessaOrigine) {
        // Firebase e qualunque altro host non elencato passano diretti
        if (!CDN_CONSENTITI.includes(url.hostname)) return;
        event.respondWith(cacheFirst(request, CACHE_STATICI));
        return;
    }

    if (isStatico(url)) {
        event.respondWith(cacheFirst(request, CACHE_STATICI));
        return;
    }

    event.respondWith(networkFirst(request, CACHE_SHELL));
});
