// Minimal service worker — exists to satisfy the PWA installability
// requirement. Chrome/Android require a manifest AND a *registered fetch
// handler* before showing "Install app"; without this, manifest.json and
// the real icon PNGs were doing nothing (see docs/REDESIGN-PLAN.md's
// mobile pass — the app was never actually installable).
//
// Deliberately NOT a caching layer for API data. TickerTrace's entire
// value is same-day institutional holdings — a service worker serving a
// cached signal from yesterday because it thought it was helping would be
// worse than showing nothing. Every API request (same-origin /api/* via
// the Next.js rewrite, and any direct cross-origin call to
// api.tickertrace.pro) passes straight through to the network, untouched.
//
// What it does cache: the static app shell, so opening the installed app
// with no connection shows a real page instead of the browser's offline
// error screen.

const SHELL_CACHE = 'tickertrace-shell-v1';
const SHELL_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever intercept same-origin GETs. Everything else — API calls,
  // POSTs, cross-origin requests — is left completely alone: returning
  // without calling respondWith() lets the browser handle it normally.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Opportunistically keep the shell cache warm with static assets
        // that load successfully, so an offline reopen has more than
        // just the pages listed in SHELL_URLS above.
        const isCacheable = response.ok &&
          (request.mode === 'navigate' || /\.(png|svg|ico|css|js)$/.test(url.pathname));
        if (isCacheable) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
