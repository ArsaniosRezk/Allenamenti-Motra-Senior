const CACHE_NAME = "motra-v1";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./colors.css",
    "./index.js",
    "./partita_spa.js",
    "./allenamenti_spa.js",
    "./giocatori.js",
    "./utils.js",
    "./manifest.json",
    "./immagini/favicon.svg"
];

// Install Event: Cache assets
// Install Event: Cache assets
self.addEventListener("install", (event) => {
    // Force waiting service worker to become active
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Caching assets");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event: Cleanup old caches
self.addEventListener("activate", (event) => {
    // Claim clients immediately
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keyList) => {
                return Promise.all(
                    keyList.map((key) => {
                        if (key !== CACHE_NAME) {
                            console.log("[SW] Removing old cache", key);
                            return caches.delete(key);
                        }
                    })
                );
            })
        ])
    );
});

// Fetch Event: Cache first, fallback to network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
