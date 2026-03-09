// Service Worker: Ermöglicht die Installation der App als PWA.
// Cacht statische Dateien für schnelleres Laden,
// holt API-Daten aber immer frisch vom Server (network-first).

'use strict';

const CACHE_NAME = 'foodplan-v1';
const STATIC_ASSETS = [
    '/',
    '/css/main.css',
    '/js/main.js',
    '/manifest.json',
];

// install: Statische Dateien im Cache speichern
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// activate: Alte Caches löschen wenn sich CACHE_NAME ändert
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// fetch: API-Anfragen immer vom Netzwerk holen,
// statische Dateien aus dem Cache bedienen (mit Netzwerk-Fallback)
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // API-Requests immer vom Netzwerk
    if (request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            return cached || fetch(request);
        })
    );
});
